export interface TTSProvider {
  synthesize(input: {
    voiceId: string;
    text: string;
    emotion?: string;
    rate?: number;
    pitch?: number;
  }): Promise<Buffer>;

  uploadVoice(input: {
    audio: Buffer;
    name: string;
    language: string;
  }): Promise<string>; // voice ID

  deleteVoice(voiceId: string): Promise<void>;
}

export interface AudioDSP {
  normalizeWAV(buffer: Buffer): Promise<Buffer>;
  detectSpeaker(ref: Buffer, test: Buffer): Promise<{ similarity: number; isSame: boolean }>;
}
