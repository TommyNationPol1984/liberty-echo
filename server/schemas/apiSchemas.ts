import { z } from "zod";

// User & Auth Schemas
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["user", "admin", "premium"]),
  created_at: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

// TTS Synthesis Request
export const SynthesizeRequestSchema = z.object({
  text: z.string().min(1).max(10000),
  voiceId: z.string().uuid(),
  audioFormat: z.literal("wav"), // WAV-only
  speed: z.number().min(0.5).max(2.0).default(1.0),
  pitch: z.number().min(-20).max(20).default(0),
});

export type SynthesizeRequest = z.infer<typeof SynthesizeRequestSchema>;

export const SynthesizeResponseSchema = z.object({
  audioUrl: z.string().url(),
  duration: z.number().positive(),
  format: z.literal("wav"),
  usageChars: z.number().positive(),
});

export type SynthesizeResponse = z.infer<typeof SynthesizeResponseSchema>;

// Usage Stats
export const UsageStatsSchema = z.object({
  userId: z.string().uuid(),
  totalCharsUsed: z.number().nonnegative(),
  monthlyCharsUsed: z.number().nonnegative(),
  monthlyCharsLimit: z.number().positive(),
  charsRemaining: z.number().nonnegative(),
});

export type UsageStats = z.infer<typeof UsageStatsSchema>;

// Voice Profile
export const VoiceProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(255),
  sampleUrl: z.string().url(),
  language: z.string().default("en"),
  created_at: z.string().datetime(),
});

export type VoiceProfile = z.infer<typeof VoiceProfileSchema>;

// Stripe Webhook
export const StripeWebhookSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.object({
      id: z.string(),
      customer: z.string().optional(),
      status: z.string().optional(),
    }),
  }),
});

export type StripeWebhook = z.infer<typeof StripeWebhookSchema>;

// Error Response
export const ErrorResponseSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  details: z.record(z.string()).optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
