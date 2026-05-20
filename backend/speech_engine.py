import io
import os
import tempfile
import numpy as np
import librosa
from gtts import gTTS
from fastdtw import fastdtw
from scipy.spatial.distance import euclidean
from num2words import num2words

# Create template directory
TEMPLATE_DIR = os.path.join(tempfile.gettempdir(), "speech_templates")
os.makedirs(TEMPLATE_DIR, exist_ok=True)

WORDS = {
    "1": "satu", "2": "dua", "3": "tiga", "4": "empat", "5": "lima",
    "6": "enam", "7": "tujuh", "8": "delapan", "9": "sembilan",
    "+": "tambah", "-": "kurang", "*": "kali", "/": "bagi"
}

# Generate templates if they don't exist
TEMPLATES = {}
def init_templates():
    print("Initializing TTS templates for DTW...")
    for symbol, word in WORDS.items():
        path = os.path.join(TEMPLATE_DIR, f"{word}.wav")
        if not os.path.exists(path):
            tts = gTTS(text=word, lang='id')
            tts.save(path)
        y, sr = librosa.load(path, sr=16000)
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        TEMPLATES[symbol] = mfcc.T

init_templates()

def get_euclidean_matrix(mfcc1, mfcc2):
    import numpy as np
    from scipy.spatial.distance import cdist
    return cdist(mfcc1, mfcc2, metric='euclidean')

def get_dtw_cost_matrix(mfcc1, mfcc2):
    import numpy as np
    from fastdtw import fastdtw
    from scipy.spatial.distance import euclidean
    distance, path = fastdtw(mfcc1, mfcc2, dist=euclidean)
    
    # Reconstruct the accumulated cost matrix manually since fastdtw doesn't return it
    # We will build a simple dense cost matrix for the UI
    r, c = len(mfcc1), len(mfcc2)
    cost = np.zeros((r, c))
    for i in range(r):
        for j in range(c):
            cost[i][j] = euclidean(mfcc1[i], mfcc2[j])
            
    # Accumulate
    for i in range(1, r): cost[i][0] += cost[i-1][0]
    for j in range(1, c): cost[0][j] += cost[0][j-1]
    for i in range(1, r):
        for j in range(1, c):
            cost[i][j] += min(cost[i-1][j], cost[i][j-1], cost[i-1][j-1])
            
    return cost.tolist(), path

def process_v2t(audio_bytes: bytes):
    """
    Process raw audio bytes through the full 5-stage V2T pipeline.
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
        f.write(audio_bytes)
        temp_path = f.name

    try:
        y, sr = librosa.load(temp_path, sr=16000)
    finally:
        os.remove(temp_path)

    # 1. Signal Acquisition & Pre-processing
    intervals = librosa.effects.split(y, top_db=45)
    
    target_len = min(1000, len(y))
    indices = np.linspace(0, len(y) - 1, target_len, dtype=int)
    waveform = y[indices].tolist()
    
    y_pre = librosa.effects.preemphasis(y)
    pre_emphasis_waveform = y_pre[indices].tolist()
    
    frame_length = 512
    frames = librosa.util.frame(y_pre, frame_length=frame_length, hop_length=256)
    sample_frame = frames[:, 0].tolist() if frames.shape[1] > 0 else []
    
    # 2. FFT/Mel features
    D = np.abs(librosa.stft(y_pre, n_fft=512, hop_length=256))
    mel_raw = librosa.feature.melspectrogram(S=D**2, sr=sr, n_mels=128)
    mel_log = librosa.power_to_db(mel_raw, ref=np.max)
    mfcc = librosa.feature.mfcc(S=mel_log, n_mfcc=13)
    
    if D.shape[1] > 100:
        idx = np.linspace(0, D.shape[1]-1, 100, dtype=int)
        fft_magnitude = D[:, idx].tolist()
        mel_raw_ui = mel_raw[:, idx].tolist()
        mel_log_ui = mel_log[:, idx].tolist()
        mfcc_ui = mfcc[:, idx].tolist()
    else:
        fft_magnitude = D.tolist()
        mel_raw_ui = mel_raw.tolist()
        mel_log_ui = mel_log.tolist()
        mfcc_ui = mfcc.tolist()
    
    # 3. VQ/Codebook
    from sklearn.cluster import KMeans
    try:
        kmeans = KMeans(n_clusters=min(8, mfcc.shape[1]), n_init=10).fit(mfcc.T)
        centroids = kmeans.cluster_centers_.tolist()
        vq_assignments = kmeans.labels_.tolist()
    except:
        centroids = []
        vq_assignments = []
    
    # 4. DTW and 5. Transcription
    transcription_tokens = []
    cb_cost_matrix = []
    cb_dtw_path = []
    cb_scores = []
    cb_mfcc_shape = []
    cb_euclidean_matrix = []

    for start, end in intervals:
        seg_y = y[start:end]
        if len(seg_y) < 1000: continue
        seg_mfcc = librosa.feature.mfcc(y=librosa.effects.preemphasis(seg_y), sr=sr, n_mfcc=13).T
        
        best_match, min_dist = "", float('inf')
        temp_scores = []
        
        for symbol, ref_mfcc_T in TEMPLATES.items():
            dist, path = fastdtw(seg_mfcc, ref_mfcc_T, dist=euclidean)
            temp_scores.append({"template": symbol, "score": float(dist)})
            if dist < min_dist:
                min_dist, best_match, cb_dtw_path = dist, symbol, path
                cb_cost_matrix, _ = get_dtw_cost_matrix(seg_mfcc, ref_mfcc_T)
                cb_euclidean_matrix = get_euclidean_matrix(seg_mfcc, ref_mfcc_T).tolist()
        
        temp_scores = sorted(temp_scores, key=lambda x: x["score"])
        
        if not cb_scores:
            cb_scores = temp_scores
            cb_mfcc_shape = list(seg_mfcc.shape)
            
        transcription_tokens.append(best_match)

    transcription = " ".join(transcription_tokens)
    if not transcription:
        raise ValueError("Tidak ada kata yang terdeteksi dari audio (terlalu sunyi atau pendek).")

    return {
        "transcription": transcription,
        "transcription_tokens": transcription_tokens,
        "waveform": waveform,
        "pre_emphasis_waveform": pre_emphasis_waveform,
        "sample_frame": sample_frame,
        "fft_magnitude": fft_magnitude,
        "mel_raw": mel_raw_ui,
        "mel_log": mel_log_ui,
        "mfcc_heatmap": mfcc_ui,
        "centroids": centroids,
        "vq_assignments": vq_assignments,
        "euclidean_matrix": cb_euclidean_matrix,
        "cost_matrix": cb_cost_matrix,
        "dtw_path": cb_dtw_path,
        "dtw_scores": cb_scores,
        "mfcc_shape": cb_mfcc_shape
    }

def process_t2v(text: str):
    """
    Process text through the T2V pipeline using real data, returning detailed intermediate steps.
    """
    # Tahap 1: Text Preprocessing
    tokens = [t for t in text if t != " "] # simple char/symbol tokenization
    
    symbol_exp = []
    num_conv = []
    
    for token in tokens:
        if token in WORDS:
            if token.isdigit():
                symbol_exp.append(token)
                num_conv.append(num2words(int(token), lang='id'))
            else:
                symbol_exp.append(WORDS[token])
                num_conv.append(WORDS[token])
        elif token.isdigit():
            symbol_exp.append(token)
            num_conv.append(num2words(int(token), lang='id'))
        else:
            symbol_exp.append(token)
            num_conv.append(token)
            
    normalized_text = " ".join(num_conv)
    
    # Tahap 2: Grapheme-to-Phoneme & Intonasi
    phonemes = []
    prosody_prediction = []
    base_pitch = 200
    
    for i, w in enumerate(num_conv):
        ph = "/" + "-".join(list(w)) + "/"
        phonemes.append(ph)
        # Simulate prosody prediction (pitch contour and duration)
        pitch = base_pitch + (np.sin(i) * 20)
        duration = 0.3 + (len(w) * 0.05)
        prosody_prediction.append({
            "word": w,
            "phoneme": ph,
            "pitch": f"{int(pitch)} Hz",
            "duration": f"{duration:.2f} s"
        })
        
    # Generate mock Alignment Matrix (monotonic diagonal)
    r, c = 50, 100
    alignment = np.zeros((r, c))
    for i in range(r):
        for j in range(c):
            dist_to_diag = abs(j - i * (c/r))
            alignment[i][j] = np.exp(-dist_to_diag**2 / 10.0)
    
    # Tahap 3: Pemodelan Akustik & Tahap 4: Vocoder (using gTTS + librosa)
    tts = gTTS(text=normalized_text, lang='id')
    fp = io.BytesIO()
    tts.write_to_fp(fp)
    fp.seek(0)
    
    audio_bytes = fp.read()
    fp.seek(0)
    y, sr = librosa.load(fp, sr=22050)
    
    target_len = min(1000, len(y))
    indices = np.linspace(0, len(y) - 1, target_len, dtype=int)
    waveform = y[indices].tolist()
    
    S = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128)
    S_dB = librosa.power_to_db(S, ref=np.max)
    
    # Real data for Filterbank visualization (mean energy per mel band)
    mel_filterbank_energies = np.mean(S_dB, axis=1).tolist()
    
    # Real data for Vocoder / IFFT (STFT phase and magnitude)
    D = librosa.stft(y)
    magnitude = np.abs(D)
    phase = np.angle(D)
    
    # Take a small slice for visualization (e.g., frequency bin 10, first 100 time frames)
    stft_magnitude = magnitude[10, :100].tolist() if magnitude.shape[1] > 100 else magnitude[10, :].tolist()
    stft_phase = phase[10, :100].tolist() if phase.shape[1] > 100 else phase[10, :].tolist()
    
    import base64
    audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
    
    return {
        "input_text": text,
        "tokenization": tokens,
        "symbol_expansion": symbol_exp,
        "number_conversion": num_conv,
        "normalized_text": normalized_text,
        "phonemes": " ".join(phonemes),
        "prosody_prediction": prosody_prediction,
        "alignment_matrix": alignment.tolist(),
        "waveform": waveform,
        "mel_spectrogram": S_dB.tolist(),
        "mel_filterbank_energies": mel_filterbank_energies,
        "stft_magnitude": stft_magnitude,
        "stft_phase": stft_phase,
        "audio_b64": audio_b64
    }
