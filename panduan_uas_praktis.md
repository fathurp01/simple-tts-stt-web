# Panduan Praktis Langkah-Langkah UAS
## Dari Pengumpulan Dataset hingga Integrasi ke Aplikasi

Berikut adalah panduan langkah demi langkah tentang apa yang harus Anda **lakukan secara fisik** (praktis) dari awal hingga model berjalan di dalam aplikasi lokal Anda.

---

## LANGKAH 1: Pengumpulan & Pembuatan Dataset Suara (Data Collection)

Anda harus merekam suara Anda sendiri dan membuat label teks yang cocok. Dataset ini akan digunakan untuk melatih STT (Wav2Vec2) dan TTS (VITS/SpeechT5).

### 1.1 Persiapan Naskah (Script)
Tulis daftar kalimat yang ingin Anda ucapkan. Model deep learning mempelajari **fonem (suku kata)**, sehingga Anda **TIDAK perlu** merekam semua angka dari 10 sampai 100 secara terpisah. Cukup rekam komponen-komponen suara berikut:

* **Angka satuan dasar (0-9)**: `"nol"`, `"satu"`, `"dua"`, `"tiga"`, `"empat"`, `"lima"`, `"enam"`, `"tujuh"`, `"delapan"`, `"sembilan"`.
* **Kata penunjuk nilai/puluhan (Fonem Kunci)**: `"belas"`, `"puluh"`, `"ratus"`.
* **Beberapa contoh kombinasi (Cukup rekam beberapa sampel saja)**:
  * Belasan: `"sepuluh"`, `"sebelas"`, `"dua belas"`, `"lima belas"`.
  * Puluhan: `"dua puluh"`, `"tiga puluh"`, `"lima puluh"`, `"delapan puluh"`.
  * Ratusan: `"seratus"`, `"dua ratus"`.
* **Operator matematika**: `"tambah"`, `"kurang"`, `"kali"`, `"bagi"`, `"sama dengan"`.
* **Persamaan utuh**: 
  * `"satu tambah satu sama dengan dua"`
  * `"dua kali tiga sama dengan enam"`
  * `"tiga kurang satu sama dengan dua"`
* **Frasa target khusus**: `"satu dua tiga sayang semuanya"`.
* **Kalimat umum bahasa Indonesia** (misal 50-100 kalimat acak agar model mengenali intonasi vokal Anda secara alami).

### 1.2 Proses Perekaman Audio
* **Format Rekaman**: Wajib disimpan sebagai file `.wav`, Mono (1-channel).
* **Sample Rate**:
  * Untuk STT (Wav2Vec2): Direkomendasikan **16.000 Hz** (16kHz).
  * Untuk TTS (VITS/SpeechT5): Direkomendasikan **22.050 Hz** (22kHz) atau **24.000 Hz** (24kHz) agar suara kloning berkualitas tinggi.
  * *Tips*: Rekam langsung di sample rate 22.050 Hz, nanti untuk STT bisa di-resample otomatis menggunakan kode Python (`librosa`).
* **Lingkungan**: Gunakan ruangan sunyi dan mikrofon berkualitas (hindari gema dan noise latar belakang).

### 1.3 Struktur Folder & Aturan Penamaan Dataset
Anda akan menggunakan **file `.wav` yang sama** untuk melatih model STT dan TTS. Yang membedakan hanyalah cara penulisan berkas metadatanya.

#### A. Aturan Penamaan File Audio (`.wav`)
* **Sangat disarankan** menggunakan penamaan berurutan (sekuensial) seperti `audio_001.wav`, `audio_002.wav`, dst.
* **Hindari** menamai file berdasarkan teks yang diucapkan (seperti `satu_tambah_satu.wav`) untuk mencegah error spasi, karakter tidak dikenal, atau masalah panjang nama file pada sistem operasi.

#### B. Struktur Folder Proyek Dataset
Kelompokkan seluruh data dalam sebuah folder terstruktur seperti ini:
```text
my_voice_dataset/
├── wavs/
│   ├── audio_001.wav   (Ucapkan angka dasar: "nol")
│   ├── audio_002.wav   (Ucapkan angka dasar: "satu")
│   ├── audio_011.wav   (Ucapkan operator: "tambah")
│   ├── audio_012.wav   (Ucapkan operator: "sama dengan")
│   ├── audio_016.wav   (Ucapkan belasan/puluhan: "sebelas")
│   ├── audio_020.wav   (Ucapkan puluhan: "dua puluh")
│   ├── audio_025.wav   (Ucapkan persamaan: "satu tambah satu sama dengan dua")
│   └── audio_030.wav   (Ucapkan frasa target: "satu dua tiga sayang semuanya")
├── metadata_stt.csv    (File indeks untuk latihan STT Wav2Vec2)
└── metadata_tts.txt    (File indeks untuk latihan TTS VITS/SpeechT5)
```

#### C. Format Penulisan Berkas Metadata
Berkas metadata ini memberi tahu program AI tentang teks apa yang ada di dalam masing-masing file audio.

* **1. Format CSV untuk STT (`metadata_stt.csv`)**
  Menggunakan koma `,` sebagai pemisah. Kolom pertama menunjukkan *relatif path* ke file audio, kolom kedua menunjukkan transkripsi teks alfabet kecil (lowercase):
  ```csv
  file_name,transcription
  wavs/audio_001.wav,nol
  wavs/audio_002.wav,satu
  wavs/audio_011.wav,tambah
  wavs/audio_012.wav,sama dengan
  wavs/audio_016.wav,sebelas
  wavs/audio_020.wav,dua puluh
  wavs/audio_025.wav,satu tambah satu sama dengan dua
  wavs/audio_030.wav,satu dua tiga sayang semuanya
  ```

* **2. Format TXT untuk TTS (`metadata_tts.txt` - Standar LJSpeech)**
  Menggunakan tanda pipa `|` sebagai pemisah. Terdiri dari 3 kolom: `ID_File|Transkripsi_Asli|Transkripsi_Normal` (karena tidak ada singkatan/angka numerik di dataset kita, kolom 2 dan 3 ditulis sama persis):
  ```text
  audio_001|nol|nol
  audio_002|satu|satu
  audio_011|tambah|tambah
  audio_012|sama dengan|sama dengan
  audio_016|sebelas|sebelas
  audio_020|dua puluh|dua puluh
  audio_025|satu tambah satu sama dengan dua|satu tambah satu sama dengan dua
  audio_030|satu dua tiga sayang semuanya|satu dua tiga sayang semuanya
  ```

---

## LANGKAH 2: Pelatihan Model (Fine-Tuning) di Google Colab (GPU)

Karena fine-tuning memerlukan kartu grafis (GPU) yang mumpuni, proses ini sebaiknya dilakukan menggunakan Google Colab.

### 2.1 Mengunggah Data ke Google Drive
1. Kompres folder `my_voice_dataset/` menjadi file `.zip`.
2. Unggah file zip tersebut ke Google Drive Anda agar mudah di-mount dan diunduh di Google Colab.

### 2.2 Bagian A: Fine-Tuning Wav2Vec2 (STT)
Di Google Colab, Anda akan:
1. Hubungkan Google Colab ke GPU (Runtime -> Change runtime type -> T4 GPU).
2. Install dependensi: `pip install transformers datasets accelerate evaluate torchaudio jinja2 soundfile librosa`.
3. Mount Google Drive dan ekstrak dataset zip Anda.
4. Muat model dasar: `indonesian-nlp/wav2vec2-large-xlsr-indonesian`.
5. Buat kamus karakter (`vocab.json`) dari huruf-huruf unik yang ada di transkripsi Anda.
6. Latih menggunakan `Trainer` API dengan objective function **CTC Loss**.
7. Setelah selesai (misal 30-50 epochs), simpan checkpoint model ke Drive Anda, lalu unduh foldernya ke komputer lokal.

### 2.3 Bagian B: Fine-Tuning VITS atau SpeechT5 (TTS)
Di Google Colab yang sama (atau berbeda):
1. **Jika menggunakan SpeechT5**:
   * Ikuti notebook fine-tuning SpeechT5 dari HuggingFace.
   * Ekstrak *speaker embeddings* dari file audio Anda menggunakan model `speechbrain/spkrec-ecapa-voxceleb`.
   * Latih model `microsoft/speecht5_tts` dengan dataset LJSpeech Anda.
2. **Jika menggunakan VITS (Coqui TTS)**:
   * Install Coqui TTS: `pip install TTS`.
   * Jalankan skrip pelatihan bawaan VITS dengan mendefinisikan dataset format `ljspeech` Anda.
3. Unduh hasil checkpoint model terbaik (`pytorch_model.bin` or file `.pth`) ke komputer lokal.

---

## LANGKAH 3: Integrasi Checkpoint Model ke Aplikasi Lokal

Setelah memiliki dua folder model hasil latih, Anda siap memasangnya di aplikasi lokal:

1. **Pindahkan File Checkpoint**:
   * Pindahkan folder hasil latih **Wav2Vec2** ke: `o:\PTU\speech-tech-app\backend\models\wav2vec2_custom\`
   * Pindahkan file checkpoint **VITS/SpeechT5** ke: `o:\PTU\speech-tech-app\backend\models\tts_custom\`

2. **Perbarui Kode di [speech_engine.py](file:///o:/PTU/speech-tech-app/backend/speech_engine.py)**:
   * Arahkan pemuat model di `get_f5_tts()` or buat fungsi baru untuk memuat model VITS/SpeechT5 Anda dari path `./models/tts_custom/`.
   * Ganti logika pencocokan DTW di `process_v2t()` agar memanggil model Wav2Vec2 lokal dari `./models/wav2vec2_custom/`.

3. **Perbarui Logika Validasi**:
   * Sesuaikan `app.py` agar meloloskan kalimat teks non-aritmatika dari STT Wav2Vec2 Anda tanpa menghasilkan error dari `ArithmeticValidator`.

---

## LANGKAH 4: Uji Coba Aplikasi

1. Jalankan Backend FastAPI Anda:
   ```bash
   cd o:\PTU\speech-tech-app\backend
   python -m uvicorn app:app --port 8000 --reload
   ```
2. Jalankan Frontend React Anda:
   ```bash
   cd o:\PTU\speech-tech-app\frontend
   npm run dev
   ```
3. Buka browser ke alamat `http://localhost:5173`.
4. Lakukan pengujian:
   * **STT**: Klik mikrofon, ucapkan *"satu dua tiga sayang semuanya"*, dan periksa apakah teks yang muncul di layar sesuai.
   * **TTS**: Ketik *"1+2=3"* atau *"123 sayang semuanya"*, klik generate, dan dengarkan apakah suara yang keluar adalah kloning suara Anda.
