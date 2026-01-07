# engine/inference/voice_changer.py

import os
from typing import Optional
import numpy as np

from engine.inference.tts_inference import get_tts_model, get_speaker_encoder, float32_to_wav_bytes
from engine.utils.audio import transcribe_with_whisper


def change_voice(
    input_audio_path: str,
    target_reference_audio: str,
    out_path: str,
    language: str = "en",
) -> str:
    """
    Change the voice in input audio to match target reference.
    
    This works by:
    1. Transcribing the input audio
    2. Extracting speaker embedding from target reference
    3. Re-synthesizing with new voice
    
    Args:
        input_audio_path: Path to input audio file
        target_reference_audio: Path to target voice reference audio
        out_path: Output file path
        language: Language code
    
    Returns:
        Path to generated audio file
    """
    tts_model = get_tts_model()
    speaker_encoder = get_speaker_encoder()
    
    # Transcribe input audio
    transcript = transcribe_with_whisper(input_audio_path)
    
    # Get target speaker embedding
    target_embedding = speaker_encoder.embed_utterance(target_reference_audio)
    
    # Synthesize with new voice
    audio, sr = tts_model.generate(
        text=transcript,
        speaker_embedding=target_embedding,
        language=language,
        style="neutral",
    )
    
    wav_bytes = float32_to_wav_bytes(audio, sr)
    os.makedirs(os.path.dirname(out_path) if os.path.dirname(out_path) else '.', exist_ok=True)
    with open(out_path, 'wb') as f:
        f.write(wav_bytes)
    
    return out_path
