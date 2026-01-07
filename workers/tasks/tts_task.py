# workers/tasks/tts_task.py

import os
from engine.inference.tts_inference import synthesize_to_file
from api.services.job_queue import set_job_result, set_job_error

OUTPUT_DIR = "storage/outputs"


def run_tts_job(job_id: str, payload: dict):
    """
    Execute TTS synthesis job.
    
    Args:
        job_id: Unique job identifier
        payload: Job parameters including text, reference_audio, language, style
    """
    try:
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        out_path = os.path.join(OUTPUT_DIR, f"{job_id}.wav")

        synthesize_to_file(
            text=payload["text"],
            reference_audio=payload.get("reference_audio_path"),
            out_path=out_path,
            language=payload.get("language", "en"),
            style=payload.get("style", "neutral"),
        )

        # Estimate duration from text length
        duration_ms = int(len(payload["text"]) / 15 * 1000)
        set_job_result(job_id, out_path, duration_ms)
        
    except Exception as e:
        set_job_error(job_id, str(e))
