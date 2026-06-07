import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
import sys
import traceback

print("1. Monkeypatching torchaudio...")
import torch
import torchaudio
import soundfile as sf

def custom_torchaudio_load(uri, frame_offset=0, num_frames=-1, normalize=True, channels_first=True, **kwargs):
    data, samplerate = sf.read(uri, dtype='float32')
    tensor = torch.from_numpy(data)
    if tensor.ndim == 1:
        tensor = tensor.unsqueeze(0)
    elif tensor.ndim == 2 and channels_first:
        tensor = tensor.T
    return tensor, samplerate

torchaudio.load = custom_torchaudio_load
torchaudio.load_with_torchcodec = custom_torchaudio_load

print("2. Importing F5-TTS...")
from f5_tts.infer.utils_infer import load_model, load_vocoder, infer_process
from f5_tts.model import DiT

print("3. Loading Vocoder...")
try:
    vocoder = load_vocoder(device="cpu")
    print("Vocoder loaded successfully!")
except BaseException as e:
    print("VOCoder Loading CRASHED:")
    traceback.print_exc()
    sys.exit(1)

print("4. Loading Model...")
try:
    model = load_model(
        model_cls=DiT,
        model_cfg=dict(dim=1024, depth=22, heads=16, ff_mult=2, text_dim=512, conv_layers=4),
        ckpt_path="o:\\PTU\\speech-tech-app\\f5_models\\f5_tts_indo_v2.pt",
        vocab_file="o:\\PTU\\speech-tech-app\\f5_models\\vocab.txt",
        device="cpu"
    )
    print("Model loaded successfully!")
except BaseException as e:
    print("MODEL Loading CRASHED:")
    traceback.print_exc()
    sys.exit(1)

print("ALL SUCCESSFUL!")
