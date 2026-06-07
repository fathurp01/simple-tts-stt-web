import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
import sys
import time

# Monkeypatch torchaudio before any other imports to bypass TorchCodec/FFmpeg on Windows
print("Applying torchaudio monkeypatch...")
import torch
import torchaudio
import soundfile as sf

def custom_torchaudio_load(uri, frame_offset=0, num_frames=-1, normalize=True, channels_first=True, **kwargs):
    # print(f"[Monkeypatch] loading audio from: {uri}")
    data, samplerate = sf.read(uri, dtype='float32')
    tensor = torch.from_numpy(data)
    if tensor.ndim == 1:
        tensor = tensor.unsqueeze(0)
    elif tensor.ndim == 2 and channels_first:
        tensor = tensor.T
    if frame_offset > 0 or num_frames > -1:
        if channels_first:
            if num_frames > -1:
                tensor = tensor[:, frame_offset:frame_offset + num_frames]
            else:
                tensor = tensor[:, frame_offset:]
        else:
            if num_frames > -1:
                tensor = tensor[frame_offset:frame_offset + num_frames, :]
            else:
                tensor = tensor[frame_offset:, :]
    return tensor, samplerate

torchaudio.load = custom_torchaudio_load
torchaudio.load_with_torchcodec = custom_torchaudio_load
if hasattr(torchaudio, '_torchcodec'):
    torchaudio._torchcodec.load_with_torchcodec = custom_torchaudio_load

import librosa
from huggingface_hub import hf_hub_download

# Define paths
backend_dir = os.path.abspath(os.path.dirname(__file__))
project_dir = os.path.abspath(os.path.join(backend_dir, ".."))
model_dir = os.path.join(project_dir, "f5_models")
os.makedirs(model_dir, exist_ok=True)

print("=== F5-TTS Indonesian Voice Cloning Experiment (Python Native) ===")
print(f"Device: {'CUDA (GPU)' if torch.cuda.is_available() else 'CPU'}")

# 1. Check/Download model weights
ckpt_path = os.path.join(model_dir, "f5_tts_indo_v2.pt")
vocab_path = os.path.join(model_dir, "vocab.txt")

if not os.path.exists(ckpt_path) or not os.path.exists(vocab_path):
    print("Downloading weights from Hugging Face...")
    hf_hub_download(repo_id="Eempostor/F5-TTS-INDO-FINETUNE-V2", filename="f5_tts_indo_v2.pt", local_dir=model_dir)
    hf_hub_download(repo_id="Eempostor/F5-TTS-INDO-FINETUNE-V2", filename="vocab.txt", local_dir=model_dir)
else:
    print("Model weights found locally.")

# 2. Preprocess reference audio
ref_audio_orig = os.path.join(backend_dir, "suara_saya.wav")
ref_audio_trimmed = os.path.join(backend_dir, "suara_saya_trimmed_24k.wav")

if not os.path.exists(ref_audio_orig):
    print(f"ERROR: Reference audio '{ref_audio_orig}' not found!")
    sys.exit(1)

try:
    print("Preprocessing reference audio (mono, 24kHz, 10s)...")
    y, sr = librosa.load(ref_audio_orig, sr=24000, mono=True)
    duration_s = min(10.0, len(y) / 24000)
    y_trimmed = y[:int(24000 * duration_s)]
    sf.write(ref_audio_trimmed, y_trimmed, 24000)
except Exception as e:
    print(f"ERROR preprocessing audio: {e}")
    sys.exit(1)

# 3. Load Vocoder and Model using F5-TTS API
print("Importing F5-TTS models and utilities...")
try:
    from f5_tts.infer.utils_infer import load_model, load_vocoder, infer_process
    from f5_tts.model import DiT
except ImportError as e:
    print(f"ERROR importing F5-TTS: {e}")
    sys.exit(1)

device = "cuda" if torch.cuda.is_available() else "cpu"

print("Loading Vocoder...")
try:
    vocoder = load_vocoder(device=device)
except Exception as e:
    print(f"Vocoder load failed: {e}. Trying to load vocoder with cpu...")
    vocoder = load_vocoder(device="cpu")

print("Loading DiT Model...")
# F5-TTS Base model configurations
model_cfg = dict(
    dim=1024,
    depth=22,
    heads=16,
    ff_mult=2,
    text_dim=512,
    conv_layers=4
)

try:
    model = load_model(
        model_cls=DiT,
        model_cfg=model_cfg,
        ckpt_path=ckpt_path,
        vocab_file=vocab_path,
        device=device
    )
    print("Model loaded successfully!")
except Exception as e:
    print(f"Failed to load model: {e}")
    sys.exit(1)

# 4. Perform inference
ref_text = "Selanjutnya, dilakukan pengujian menggunakan mikrofon bawaan laptop. Hasil pengujian ini dibandingkan antara platform Econoise dan sound desibel meter dengan durasi pengujian yaitu tiga"
gen_text = "dua tambah tiga"
output_audio = os.path.join(backend_dir, "experiment_f5_out.wav")

print(f"\nGenerating text: '{gen_text}'")
print(f"Reference text: '{ref_text}'")

start_time = time.time()
try:
    # infer_process synthesizes and returns wave data
    # ref_audio parameter in infer_process can be a string path to reference wav
    # we call infer_process with target texts
    wav, sr, spect = infer_process(
        ref_audio=ref_audio_trimmed,
        ref_text=ref_text,
        gen_text=gen_text,
        model_obj=model,
        vocoder=vocoder,
        device=device
    )
    elapsed = time.time() - start_time
    print(f"\nSUCCESS! Synthesis completed in {elapsed:.2f} seconds.")
    
    # Save the output wav file (wav is returned as a numpy array or torch tensor)
    if isinstance(wav, torch.Tensor):
        wav = wav.cpu().numpy()
        
    sf.write(output_audio, wav, sr)
    print(f"Audio output saved successfully to: {output_audio}")
    
except Exception as e:
    print(f"ERROR during synthesis: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
