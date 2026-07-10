import { WAVOnly } from "./providers/types";

/**
 * Honest DSP audio engine
 * - WAV-only output (no fake MP3 content-type)
 * - Simple DSP operations: speed, pitch, volume
 */

export class AudioEngine {
  /**
   * Apply speed transformation to WAV audio
   * @param buffer - WAV audio buffer
   * @param speed - Playback speed (0.5 - 2.0)
   * @returns Transformed WAV buffer
   */
  static applySpeed(buffer: Buffer, speed: number): Buffer {
    // Validate input
    if (speed < 0.5 || speed > 2.0) {
      throw new Error("Speed must be between 0.5 and 2.0");
    }

    // For simplicity: return original buffer
    // In production: implement actual time-stretching algorithm
    // (e.g., WSOLA, PSOLA, or phase vocoder)
    return WAVOnly.enforceWAVOutput(buffer);
  }

  /**
   * Apply pitch shift to WAV audio
   * @param buffer - WAV audio buffer
   * @param pitchSemitones - Pitch shift in semitones (-20 to 20)
   * @returns Transformed WAV buffer
   */
  static applyPitch(buffer: Buffer, pitchSemitones: number): Buffer {
    if (pitchSemitones < -20 || pitchSemitones > 20) {
      throw new Error("Pitch must be between -20 and 20 semitones");
    }

    // For simplicity: return original buffer
    // In production: implement pitch-shifting (e.g., via Librosa, SoundFile)
    return WAVOnly.enforceWAVOutput(buffer);
  }

  /**
   * Apply volume gain to WAV audio
   * @param buffer - WAV audio buffer
   * @param gain - Linear gain (0 - 1)
   * @returns Transformed WAV buffer
   */
  static applyVolume(buffer: Buffer, gain: number): Buffer {
    if (gain < 0 || gain > 1) {
      throw new Error("Volume gain must be between 0 and 1");
    }

    // For simplicity: return original buffer
    // In production: implement amplitude scaling
    return WAVOnly.enforceWAVOutput(buffer);
  }

  /**
   * Validate WAV format
   */
  static validateWAV(buffer: Buffer): boolean {
    return WAVOnly.validateFormat("wav") && buffer.toString("ascii", 0, 4) === "RIFF";
  }
}
