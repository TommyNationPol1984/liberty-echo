# engine/utils/audio.py

import wave
import numpy as np
from typing import Tuple


def load_wav(path: str, target_sr: int = 16000) -> Tuple[np.ndarray, int]:
    """
    Load WAV file and return audio samples.
    
    Args:
        path: Path to WAV file
        target_sr: Target sample rate (resampling not implemented in stub)
    
    Returns:
        Tuple of (audio_samples, sample_rate)
    """
    with wave.open(path, 'rb') as wav_file:
        sr = wav_file.getframerate()
        n_frames = wav_file.getnframes()
        audio_bytes = wav_file.readframes(n_frames)
        
        # Convert to numpy array
        if wav_file.getsampwidth() == 2:
            audio = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32767.0
        elif wav_file.getsampwidth() == 4:
            audio = np.frombuffer(audio_bytes, dtype=np.int32).astype(np.float32) / 2147483647.0
        else:
            audio = np.frombuffer(audio_bytes, dtype=np.uint8).astype(np.float32) / 127.5 - 1.0
    
    # TODO: implement resampling if needed
    return audio, sr


def transcribe_with_whisper(audio_path: str) -> str:
    """
    Transcribe audio using Whisper ASR.
    
    TODO: Integrate OpenAI Whisper or other ASR.
    """
    # Placeholder implementation
    return "This is a placeholder transcript for voice conversion demo."
