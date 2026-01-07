# api/services/job_queue.py

import uuid
from typing import Dict, Optional

# In-memory job store for starter; replace with Redis/Celery in production
_jobs: Dict[str, dict] = {}


def create_job(payload: dict) -> str:
    """Create a new job and return job_id."""
    job_id = str(uuid.uuid4())
    _jobs[job_id] = {
        "status": "queued",
        "payload": payload,
        "audio_path": None,
        "duration_ms": None,
    }
    return job_id


def set_job_result(job_id: str, audio_path: str, duration_ms: int = 0):
    """Mark job as completed with result."""
    if job_id in _jobs:
        _jobs[job_id]["status"] = "completed"
        _jobs[job_id]["audio_path"] = audio_path
        _jobs[job_id]["duration_ms"] = duration_ms


def set_job_error(job_id: str, error: str):
    """Mark job as failed."""
    if job_id in _jobs:
        _jobs[job_id]["status"] = "failed"
        _jobs[job_id]["error"] = error


def get_job(job_id: str) -> Optional[dict]:
    """Get job info by ID."""
    return _jobs.get(job_id)


def get_all_jobs() -> Dict[str, dict]:
    """Get all jobs."""
    return _jobs.copy()
