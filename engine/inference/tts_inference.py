# engine/inference/tts_inference.py

import os
import wave
import struct
from typing import Optional, Tuple
import numpy as np

from engine.models.tts_model import TTSModel
from engine.models.speaker_encoder import SpeakerEncoder

# Global model instances (lazy loaded)
_tts_model: Optional[TTSModel] = None
_speaker_encoder: Optional[SpeakerEncoder] = None


def get_tts_model() -> TTSModel:
    global _tts_model
    if _tts_model is None:
        checkpoint = os.environ.get("TTS_MODEL_CHECKPOINT", "checkpoints/tts_model.pt")
        _tts_model = TTSModel.load(checkpoint)
    return _tts_model


def get_speaker_encoder() -> SpeakerEncoder:
    global _speaker_encoder
    if _speaker_encoder is None:
        checkpoint = os.environ.get("SPEAKER_ENCODER_CHECKPOINT", "checkpoints/speaker_encoder.pt")
        _speaker_encoder = SpeakerEncoder.load(checkpoint)
    return _speaker_encoder


def float32_to_wav_bytes(audio: np.ndarray, sample_rate: int) -> bytes:
    """Convert float32 audio to WAV bytes."""
    # Normalize and convert to int16
    audio = np.clip(audio, -1.0, 1.0)
    audio_int16 = (audio * 32767).astype(np.int16)
    
    # Create WAV in memory
    import io
    buffer = io.BytesIO()
    with wave.open(buffer, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(audio_int16.tobytes())
    
    return buffer.getvalue()


def synthesize_to_file(
    text: str,
    reference_audio: Optional[str],
    out_path: str,
    language: str = "en",
    style: str = "neutral",
) -> str:
    """
    Synthesize text to speech and save to file.
    
    Args:
        text: Text to synthesize
        reference_audio: Path to reference audio for voice cloning (optional)
        out_path: Output file path
        language: Language code
        style: Emotion/style (neutral, joyful, sad, angry, etc.)
    
    Returns:
        Path to generated audio file
    """
    tts_model = get_tts_model()
    speaker_encoder = get_speaker_encoder()
    
    if reference_audio and os.path.exists(reference_audio):
        speaker_embedding = speaker_encoder.embed_utterance(reference_audio)
    else:
        speaker_embedding = np.zeros(256, dtype=np.float32)

    audio, sr = tts_model.generate(
        text=text,
        speaker_embedding=speaker_embedding,
        language=language,
        style=style,
    )
    
    # Save as WAV
    wav_bytes = float32_to_wav_bytes(audio, sr)
    os.makedirs(os.path.dirname(out_path) if os.path.dirname(out_path) else '.', exist_ok=True)
    with open(out_path, 'wb') as f:
        f.write(wav_bytes)
    
    return out_path


def synthesize_to_bytes(
    text: str,
    speaker_embedding: Optional[np.ndarray] = None,
    language: str = "en",
    style: str = "neutral",
) -> Tuple[bytes, int]:
    """
    Synthesize text to speech and return audio bytes.
    
    Returns:
        Tuple of (wav_bytes, duration_ms)
    """
    tts_model = get_tts_model()
    
    if speaker_embedding is None:
        speaker_embedding = np.zeros(256, dtype=np.float32)

    audio, sr = tts_model.generate(
        text=text,
        speaker_embedding=speaker_embedding,
        language=language,
        style=style,
    )
    
    wav_bytes = float32_to_wav_bytes(audio, sr)
    duration_ms = int(len(audio) / sr * 1000)
    
    return wav_bytes, duration_ms
