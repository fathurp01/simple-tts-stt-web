import os
import sys
import librosa

try:
    import imageio_ffmpeg
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    ffmpeg_dir = os.path.dirname(ffmpeg_exe)
    if ffmpeg_dir not in os.environ["PATH"]:
        os.environ["PATH"] += os.pathsep + ffmpeg_dir
except ImportError:
    pass

try:
    print('Loading with librosa...')
    y, sr = librosa.load('o:\\PTU\\speech-tech-app\\final.m4a', sr=16000)
    print(f'Success! Loaded {len(y)} samples at {sr} Hz')
except Exception as e:
    print(f'Error: {e}')
