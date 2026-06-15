# api/main.py
# LibertyEcho TTS Engine - FastAPI Backend

from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
from typing import Optional, Dict, List
import uuid
import asyncio
import logging
import time
import os
import threading
import numpy as np
import httpx

from api.services.storage import Storage
from api.services.job_queue import create_job, get_job, set_job_result
from api.schemas.tts_schema import (
    TTSRequest, TTSJobResponse, VoiceUploadResponse,
    VoiceInfo, SynthesizeRequest, SynthesizeResponse
)
from engine.models.speaker_encoder import SpeakerEncoder
from engine.inference.tts_inference import synthesize_to_bytes, float32_to_wav_bytes
from workers.tasks.tts_task import run_tts_job

# PATCH 1 — CORS: restrict origins via env var
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5000")

app = FastAPI(title="LibertyEcho TTS Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5000", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# PATCH 2 — Persist embeddings to disk
EMBED_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "embeddings")
os.makedirs(EMBED_DIR, exist_ok=True)

def save_embedding(voice_id: str, embedding: np.ndarray) -> None:
    np.save(os.path.join(EMBED_DIR, f"{voice_id}.npy"), embedding)

def load_embedding(voice_id: str) -> Optional[np.ndarray]:
    path = os.path.join(EMBED_DIR, f"{voice_id}.npy")
    return np.load(path) if os.path.exists(path) else None

storage = Storage()
speaker_encoder = SpeakerEncoder.load("checkpoints/speaker_encoder.pt")

logger = logging.getLogger("libertyecho")
logging.basicConfig(level=logging.INFO)

VOICES: Dict[str, dict] = {}
EMBEDDINGS: Dict[str, np.ndarray] = {}

@app.on_event("startup")
async def load_embeddings_on_startup():
    if os.path.exists(EMBED_DIR):
        for fname in os.listdir(EMBED_DIR):
            if fname.endswith(".npy"):
                vid = fname[:-4]
                EMBEDDINGS[vid] = np.load(os.path.join(EMBED_DIR, fname))
        logger.info("Loaded %d voice embeddings from disk", len(EMBEDDINGS))

class ConsentSubmit(BaseModel):
    name: str
    user_id: str

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "libertyecho-tts"}

@app.post("/api/voices/upload", response_model=VoiceUploadResponse)
async def upload_voice(user_id: str, voice_name: str, language: str = "en", voice_id: Optional[str] = None, sample: UploadFile = File(...)):
    data = await sample.read()
    if not voice_id:
        voice_id = uuid.uuid4().hex
    key = f"voices/{user_id}/{voice_id}_{sample.filename}"
    await storage.put_file(key, data)
    embedding = speaker_encoder.embed_utterance_bytes(data)
    EMBEDDINGS[voice_id] = embedding
    save_embedding(voice_id, embedding)
    VOICES[voice_id] = {"voice_id": voice_id, "user_id": user_id, "name": voice_name, "language": language, "sample_key": key, "created_at": time.time()}
    logger.info("Voice uploaded: %s by user %s", voice_id, user_id)
    return VoiceUploadResponse(voice_id=voice_id, message="Voice uploaded and embedding extracted.")

@app.get("/api/voices", response_model=List[VoiceInfo])
async def list_voices():
    return [VoiceInfo(voice_id=v["voice_id"], name=v["name"], user_id=v["user_id"], language=v.get("language", "en")) for v in VOICES.values()]

@app.get("/api/voices/{voice_id}")
async def get_voice(voice_id: str):
    voice = VOICES.get(voice_id)
    if not voice:
        raise HTTPException(status_code=404, detail="Voice not found")
    return voice

@app.delete("/api/voices/{voice_id}")
async def delete_voice(voice_id: str, user_id: str):
    voice = VOICES.get(voice_id)
    if not voice or voice["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Voice not found or unauthorized")
    await storage.delete_key(voice["sample_key"])
    VOICES.pop(voice_id, None)
    EMBEDDINGS.pop(voice_id, None)
    emb_path = os.path.join(EMBED_DIR, f"{voice_id}.npy")
    if os.path.exists(emb_path):
        os.remove(emb_path)
    logger.info("Voice deleted: %s", voice_id)
    return {"status": "deleted"}

@app.post("/api/synthesize", response_model=SynthesizeResponse)
async def synthesize(request: SynthesizeRequest):
    voice = VOICES.get(request.voice_id)
    if not voice:
        raise HTTPException(status_code=404, detail="Voice not found")
    embedding = EMBEDDINGS.get(request.voice_id)
    wav_bytes, duration_ms = synthesize_to_bytes(text=request.text, speaker_embedding=embedding, language=voice.get("language", "en"), style=request.emotion)
    synthesis_id = uuid.uuid4().hex
    out_key = f"outputs/{synthesis_id}.wav"
    await storage.put_file(out_key, wav_bytes)
    logger.info("Synthesis completed: %s, duration: %dms", synthesis_id, duration_ms)
    return SynthesizeResponse(synthesis_id=synthesis_id, status="completed", duration_ms=duration_ms, audio_url=f"/api/audio/{synthesis_id}")

@app.post("/tts", response_model=TTSJobResponse)
async def create_tts(req: TTSRequest):
    payload = req.model_dump()
    job_id = create_job(payload)
    threading.Thread(target=run_tts_job, args=(job_id, payload), daemon=True).start()
    return TTSJobResponse(job_id=job_id, status="queued", audio_url=None)

@app.get("/tts/{job_id}", response_model=TTSJobResponse)
async def get_tts(job_id: str):
    job = get_job(job_id)
    if not job:
        return TTSJobResponse(job_id=job_id, status="not_found", audio_url=None)
    audio_url = f"/api/audio/job/{job_id}" if job.get("audio_path") else None
    return TTSJobResponse(job_id=job_id, status=job["status"], audio_url=audio_url, duration_ms=job.get("duration_ms"))

@app.get("/api/audio/{synthesis_id}")
async def get_audio(synthesis_id: str):
    audio_path = storage.get_path(f"outputs/{synthesis_id}.wav")
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="Audio not found")
    return FileResponse(audio_path, media_type="audio/wav")

@app.get("/api/audio/job/{job_id}")
async def get_job_audio(job_id: str):
    job = get_job(job_id)
    if not job or not job.get("audio_path"):
        raise HTTPException(status_code=404, detail="Audio not found")
    return FileResponse(job["audio_path"], media_type="audio/wav")

@app.websocket("/ws/synthesize")
async def ws_synthesize(ws: WebSocket):
    await ws.accept()
    try:
        init = await ws.receive_json()
        voice_id = init.get("voice_id")
        text = init.get("text")
        emotion = init.get("emotion", "neutral")
        if not voice_id or not text:
            await ws.send_json({"error": "voice_id and text required"})
            await ws.close()
            return
        voice = VOICES.get(voice_id)
        if not voice:
            await ws.send_json({"error": "voice not found"})
            await ws.close()
            return
        embedding = EMBEDDINGS.get(voice_id)
        wav_bytes, duration_ms = synthesize_to_bytes(text=text, speaker_embedding=embedding, language=voice.get("language", "en"), style=emotion)
        chunk_size = 4096
        total_chunks = (len(wav_bytes) + chunk_size - 1) // chunk_size
        for i in range(total_chunks):
            start = i * chunk_size
            end = min(start + chunk_size, len(wav_bytes))
            chunk = wav_bytes[start:end]
            await ws.send_json({"meta": {"chunk_index": i, "total_chunks": total_chunks, "progress": (i + 1) / total_chunks}})
            await ws.send_bytes(chunk)
            await asyncio.sleep(0.01)
        await ws.send_json({"meta": {"done": True, "duration_ms": duration_ms}})
        await ws.close()
    except WebSocketDisconnect:
        logger.info("Client disconnected during synthesis")
    except Exception as e:
        logger.exception("Synthesis error: %s", e)
        try:
            await ws.send_json({"error": "internal server error"})
            await ws.close()
        except Exception:
            pass

# PATCH 3 — Music generation proxy (ElevenLabs server-side, key never exposed to client)
class MusicGenerateRequest(BaseModel):
    prompt: str
    duration: int = 30

@app.post("/api/music/generate")
async def music_generate(request: MusicGenerateRequest):
    """Proxy music generation to ElevenLabs. ELEVENLABS_API_KEY must be set server-side."""
    api_key = os.getenv("ELEVENLABS_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="Music generation not configured")
    duration_s = max(1, min(request.duration, 120))
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            "https://api.elevenlabs.io/v1/sound-generation",
            headers={"xi-api-key": api_key, "Content-Type": "application/json"},
            json={"text": request.prompt, "duration_seconds": duration_s, "prompt_influence": 0.3},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=f"ElevenLabs error: {resp.text}")
    return Response(content=resp.content, media_type="audio/mpeg")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
