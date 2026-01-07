# engine/models/speaker_encoder.py

import numpy as np
from typing import Union
import wave
import io

class SpeakerEncoder:
    def __init__(self, checkpoint_path: str):
        self.checkpoint_path = checkpoint_path
        # TODO: load real encoder (ECAPA-TDNN, ResNetSE, etc.)

    @classmethod
    def load(cls, checkpoint_path: str) -> "SpeakerEncoder":
        return cls(checkpoint_path)

    def embed_utterance(self, audio_path: str) -> np.ndarray:
        """
        Extract speaker embedding from audio file.
        Replace with real model inference.
        """
        # TODO: real embedding logic using torchaudio or librosa
        # For now, generate a deterministic pseudo-embedding based on file content
        try:
            with open(audio_path, 'rb') as f:
                data = f.read()
            # Use hash of file content to generate consistent embedding
            hash_val = hash(data) % (2**32)
            np.random.seed(hash_val)
            embedding = np.random.randn(256).astype(np.float32)
            return embedding
        except Exception:
            return np.random.randn(256).astype(np.float32)

    def embed_utterance_bytes(self, audio_bytes: bytes) -> np.ndarray:
        """
        Extract speaker embedding from audio bytes.
        """
        # Use hash of audio bytes for consistent embedding
        hash_val = hash(audio_bytes) % (2**32)
        np.random.seed(hash_val)
        embedding = np.random.randn(256).astype(np.float32)
        return embedding
