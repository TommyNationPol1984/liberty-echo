# api/main.py
# LibertyEcho TTS Engine - FastAPI Backend

from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import uuid
import asyncio
import logging
import time
import os
import threading
import numpy as np

from api.services.storage import Storage
from api.services.job_queue import create_job, get_job, set_job_result
from api.schemas.tts_schema import (
    TTSRequest, TTSJobResponse, VoiceUploadResponse,
    VoiceInfo, SynthesizeRequest, SynthesizeResponse
)
from engine.models.speaker_encoder import SpeakerEncoder
from engine.inference.tts_inference import synthesize_to_bytes, float32_to_wav_bytes
from workers.tasks.tts_task import run_tts_job

app = FastAPI(title="LibertyEcho TTS Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

storage = Storage()
speaker_encoder = SpeakerEncoder.load("checkpoints/speaker_encoder.pt")

logger = logging.getLogger("libertyecho")
logging.basicConfig(level=logging.INFO)

# In-memory stores for demo (in production, use shared DB)
VOICES: Dict[str, dict] = {}
EMBEDDINGS: Dict[str, np.ndarray] = {}


class ConsentSubmit(BaseModel):
    name: str
    user_id: str


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "libertyecho-tts"}


@app.post("/api/voices/upload", response_model=VoiceUploadResponse)
async def upload_voice(
    user_id: str,
    voice_name: str,
    language: str = "en",
    voice_id: Optional[str] = None,
    sample: UploadFile = File(...)
):
    """
    Upload a sample audio clip for voice cloning.
    Extracts speaker embedding for later synthesis.
    Accepts optional voice_id from Node.js to maintain ID consistency.
    """
    data = await sample.read()
    
    # Use provided voice_id or generate new one
    if not voice_id:
        voice_id = uuid.uuid4().hex
    
    # Save audio file
    key = f"voices/{user_id}/{voice_id}_{sample.filename}"
    await storage.put_file(key, data)
    
    # Extract speaker embedding
    embedding = speaker_encoder.embed_utterance_bytes(data)
    EMBEDDINGS[voice_id] = embedding
    
    # Store voice metadata
    VOICES[voice_id] = {
        "voice_id": voice_id,
        "user_id": user_id,
        "name": voice_name,
        "language": language,
        "sample_key": key,
        "created_at": time.time(),
    }
    
    logger.info("Voice uploaded: %s by user %s", voice_id, user_id)
    return VoiceUploadResponse(voice_id=voice_id, message="Voice uploaded and embedding extracted.")


@app.get("/api/voices", response_model=List[VoiceInfo])
async def list_voices():
    """List all available voices."""
    return [
        VoiceInfo(
            voice_id=v["voice_id"],
            name=v["name"],
            user_id=v["user_id"],
            language=v.get("language", "en"),
        )
        for v in VOICES.values()
    ]


@app.get("/api/voices/{voice_id}")
async def get_voice(voice_id: str):
    """Get voice details."""
    voice = VOICES.get(voice_id)
    if not voice:
        raise HTTPException(status_code=404, detail="Voice not found")
    return voice


@app.delete("/api/voices/{voice_id}")
async def delete_voice(voice_id: str, user_id: str):
    """Delete a voice."""
    voice = VOICES.get(voice_id)
    if not voice or voice["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Voice not found or unauthorized")
    
    # Delete storage objects
    await storage.delete_key(voice["sample_key"])
    VOICES.pop(voice_id, None)
    EMBEDDINGS.pop(voice_id, None)
    
    logger.info("Voice deleted: %s", voice_id)
    return {"status": "deleted"}


@app.post("/api/synthesize", response_model=SynthesizeResponse)
async def synthesize(request: SynthesizeRequest):
    """
    Synthesize text to speech using specified voice.
    Returns audio file URL.
    """
    voice = VOICES.get(request.voice_id)
    if not voice:
        raise HTTPException(status_code=404, detail="Voice not found")
    
    embedding = EMBEDDINGS.get(request.voice_id)
    
    # Generate audio
    wav_bytes, duration_ms = synthesize_to_bytes(
        text=request.text,
        speaker_embedding=embedding,
        language=voice.get("language", "en"),
        style=request.emotion,
    )
    
    # Save to file
    synthesis_id = uuid.uuid4().hex
    out_key = f"outputs/{synthesis_id}.wav"
    await storage.put_file(out_key, wav_bytes)
    
    logger.info("Synthesis completed: %s, duration: %dms", synthesis_id, duration_ms)
    
    return SynthesizeResponse(
        synthesis_id=synthesis_id,
        status="completed",
        duration_ms=duration_ms,
        audio_url=f"/api/audio/{synthesis_id}",
    )


@app.post("/tts", response_model=TTSJobResponse)
async def create_tts(req: TTSRequest):
    """
    Create a TTS job (async processing).
    Poll /tts/{job_id} for status.
    """
    payload = req.model_dump()
    job_id = create_job(payload)

    # Run in background thread (replace with Celery in production)
    threading.Thread(target=run_tts_job, args=(job_id, payload), daemon=True).start()

    return TTSJobResponse(job_id=job_id, status="queued", audio_url=None)


@app.get("/tts/{job_id}", response_model=TTSJobResponse)
async def get_tts(job_id: str):
    """Get TTS job status."""
    job = get_job(job_id)
    if not job:
        return TTSJobResponse(job_id=job_id, status="not_found", audio_url=None)

    audio_url = None
    if job.get("audio_path"):
        audio_url = f"/api/audio/job/{job_id}"

    return TTSJobResponse(
        job_id=job_id,
        status=job["status"],
        audio_url=audio_url,
        duration_ms=job.get("duration_ms"),
    )


@app.get("/api/audio/{synthesis_id}")
async def get_audio(synthesis_id: str):
    """Serve synthesized audio file."""
    audio_path = storage.get_path(f"outputs/{synthesis_id}.wav")
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="Audio not found")
    return FileResponse(audio_path, media_type="audio/wav")


@app.get("/api/audio/job/{job_id}")
async def get_job_audio(job_id: str):
    """Serve audio from a TTS job."""
    job = get_job(job_id)
    if not job or not job.get("audio_path"):
        raise HTTPException(status_code=404, detail="Audio not found")
    return FileResponse(job["audio_path"], media_type="audio/wav")


@app.websocket("/ws/synthesize")
async def ws_synthesize(ws: WebSocket):
    """
    WebSocket streaming synthesis.
    Client sends: {"voice_id": "...", "text": "...", "emotion": "neutral"}
    Server streams binary audio chunks.
    """
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
        
        # Generate audio
        wav_bytes, duration_ms = synthesize_to_bytes(
            text=text,
            speaker_embedding=embedding,
            language=voice.get("language", "en"),
            style=emotion,
        )
        
        # Stream in chunks
        chunk_size = 4096
        total_chunks = (len(wav_bytes) + chunk_size - 1) // chunk_size
        
        for i in range(total_chunks):
            start = i * chunk_size
            end = min(start + chunk_size, len(wav_bytes))
            chunk = wav_bytes[start:end]
            
            meta = {
                "chunk_index": i,
                "total_chunks": total_chunks,
                "progress": (i + 1) / total_chunks,
            }
            await ws.send_json({"meta": meta})
            await ws.send_bytes(chunk)
            await asyncio.sleep(0.01)  # Small delay for streaming effect
        
        await ws.send_json({"meta": {"done": True, "duration_ms": duration_ms}})
        await ws.close()
        
    except WebSocketDisconnect:
        logger.info("Client disconnected during synthesis")
    except Exception as e:
        logger.exception("Synthesis error: %s", e)
        try:
            await ws.send_json({"error": "internal server error"})
            await ws.close()
        except:
            pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
