import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Consent records for voice cloning
export const consents = pgTable("consents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  documentKey: text("document_key").notNull(),
  timestamp: integer("timestamp").notNull(),
  verified: boolean("verified").default(false),
});

export const insertConsentSchema = createInsertSchema(consents).omit({ id: true });
export type InsertConsent = z.infer<typeof insertConsentSchema>;
export type Consent = typeof consents.$inferSelect;

// Voice records
export const voices = pgTable("voices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  sampleKey: text("sample_key").notNull(),
  language: text("language").default("en"),
  duration: integer("duration").default(0),
  createdAt: integer("created_at").notNull(),
});

export const insertVoiceSchema = createInsertSchema(voices).omit({ id: true });
export type InsertVoice = z.infer<typeof insertVoiceSchema>;
export type Voice = typeof voices.$inferSelect;

// Synthesis history records
export const synthesisRecords = pgTable("synthesis_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  voiceId: varchar("voice_id").notNull(),
  voiceName: text("voice_name").notNull(),
  text: text("text").notNull(),
  emotion: text("emotion").default("neutral"),
  intensity: real("intensity").default(0.5),
  rate: real("rate").default(1.0),
  pitch: real("pitch").default(1.0),
  format: text("format").default("mp3"),
  duration: integer("duration").default(0),
  audioKey: text("audio_key"),
  status: text("status").default("pending"),
  createdAt: integer("created_at").notNull(),
});

export const insertSynthesisSchema = createInsertSchema(synthesisRecords).omit({ id: true });
export type InsertSynthesis = z.infer<typeof insertSynthesisSchema>;
export type SynthesisRecord = typeof synthesisRecords.$inferSelect;

// Emotion types for TTS
export const emotionTypes = [
  "neutral",
  "joyful",
  "sad",
  "angry",
  "empathetic",
  "serious",
  "excited",
  "calm",
] as const;

export type EmotionType = (typeof emotionTypes)[number];

// Audio format types
export const audioFormats = ["wav", "mp3", "m4a"] as const;
export type AudioFormat = (typeof audioFormats)[number];

// Language options
export const languages = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "ru", name: "Russian" },
] as const;

export type LanguageCode = (typeof languages)[number]["code"];
