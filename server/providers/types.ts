/**
 * Abstract interface for TTS provider implementations
 * Supports pluggable backends (Google Cloud TTS, ElevenLabs, etc.)
 */
export interface TTSProvider {
  /**
   * Synthesize text to speech
   * @param text - Text to synthesize
   * @param voiceId - Provider-specific voice identifier
   * @param options - Synthesis options (speed, pitch, etc.)
   * @returns WAV audio buffer
   */
  synthesize(
    text: string,
    voiceId: string,
    options?: SynthesisOptions
  ): Promise<Buffer>;

  /**
   * Get available voices for this provider
   * @returns List of voice metadata
   */
  getVoices(): Promise<Voice[]>;

  /**
   * Validate voice ID exists in this provider
   */
  validateVoiceId(voiceId: string): Promise<boolean>;
}

export interface SynthesisOptions {
  speed?: number; // 0.5 - 2.0
  pitch?: number; // -20 to 20
  volume?: number; // 0 - 1
}

export interface Voice {
  id: string;
  name: string;
  language: string;
  gender?: "male" | "female" | "neutral";
  naturalness?: "natural" | "expressive";
}

/**
 * WAV-only output enforcer
 * Ensures all synthesis output is WAV format
 */
export class WAVOnly {
  static validateFormat(format: string): boolean {
    return format.toLowerCase() === "wav";
  }

  static enforceWAVOutput(buffer: Buffer): Buffer {
    // Validate WAV header (RIFF)
    if (!buffer.toString("ascii", 0, 4).includes("RIFF")) {
      throw new Error("Output is not valid WAV format");
    }
    return buffer;
  }
}
