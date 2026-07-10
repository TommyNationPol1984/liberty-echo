import { AudioDSP } from './providers/types';

/**
 * WAV-only honest DSP engine.
 * No fake MP3 content-type headers.
 * All output is uncompressed PCM WAV.
 */
export class WavDSPEngine implements AudioDSP {
  async normalizeWAV(buffer: Buffer): Promise<Buffer> {
    // Placeholder: in production, use librosa/soundfile via Python worker
    // For now, return as-is
    return buffer;
  }

  async detectSpeaker(
    ref: Buffer,
    test: Buffer
  ): Promise<{ similarity: number; isSame: boolean }> {
    // Placeholder: in production, use Resemblyzer via Python worker
    // Returns cosine similarity between embeddings
    // threshold 0.82 = likely same speaker
    const similarity = 0.95; // mock high confidence
    return {
      similarity,
      isSame: similarity >= 0.82,
    };
  }
}
