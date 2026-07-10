import { z } from 'zod';

export const SynthesizeRequestSchema = z.object({
  voiceId: z.string().uuid('Invalid voice ID'),
  text: z.string().min(1).max(5000),
  emotion: z.enum(['neutral', 'happy', 'sad', 'angry']).optional(),
  intensity: z.number().min(0).max(1).optional(),
  rate: z.number().min(0.5).max(2.0).optional(),
  pitch: z.number().min(0.5).max(2.0).optional(),
  format: z.literal('wav'),
});

export const VoiceUploadSchema = z.object({
  name: z.string().min(1).max(255),
  language: z.string().default('en'),
  consent_id: z.string().uuid(),
});

export const AuthRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const AuthLoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type SynthesizeRequest = z.infer<typeof SynthesizeRequestSchema>;
export type VoiceUpload = z.infer<typeof VoiceUploadSchema>;
export type AuthRegister = z.infer<typeof AuthRegisterSchema>;
export type AuthLogin = z.infer<typeof AuthLoginSchema>;
