# api/schemas/tts_schema.py

from pydantic import BaseModel
from typing import Optional, List


class TTSRequest(BaseModel):
    voice_id: Optional[str] = None
    reference_audio_path: Optional[str] = None
    text: str
    language: str = "en"
    style: str = "neutral"
    intensity: float = 0.5
    rate: float = 1.0
    pitch: float = 1.0


class TTSJobResponse(BaseModel):
    job_id: str
    status: str
    audio_url: Optional[str] = None
    duration_ms: Optional[int] = None


class VoiceUploadResponse(BaseModel):
    voice_id: str
    message: str


class VoiceInfo(BaseModel):
    voice_id: str
    name: str
    user_id: str
    language: str = "en"


class SynthesizeRequest(BaseModel):
    voice_id: str
    text: str
    emotion: str = "neutral"
    intensity: float = 0.5
    rate: float = 1.0
    pitch: float = 1.0
    format: str = "wav"


class SynthesizeResponse(BaseModel):
    synthesis_id: str
    status: str
    duration_ms: int
    audio_url: str
