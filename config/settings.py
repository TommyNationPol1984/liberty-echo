# config/settings.py

import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MODEL_CHECKPOINT: str = "checkpoints/tts_model.pt"
    SPEAKER_ENCODER_CHECKPOINT: str = "checkpoints/speaker_encoder.pt"
    OUTPUT_DIR: str = "storage/outputs"
    UPLOAD_DIR: str = "storage/uploads"
    VOICES_DIR: str = "storage/voices"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    class Config:
        env_file = ".env"


settings = Settings()
