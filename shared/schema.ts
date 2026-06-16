import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, real, serial, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").unique(),
  stripeCustomerId: text("stripe_customer_id").unique(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  stripeCustomerId: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ---------------------------------------------------------------------------
// Consent records for voice cloning
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Voice records
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Synthesis history records
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Stripe idempotency — deduplicates incoming webhook events
// ---------------------------------------------------------------------------
export const stripeEvents = pgTable("stripe_events", {
  id: serial("id").primaryKey(),
  stripeEventId: text("stripe_event_id").notNull().unique(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at").defaultNow(),
});

export const insertStripeEventSchema = createInsertSchema(stripeEvents).omit({
  id: true,
  processedAt: true,
});
export type InsertStripeEvent = z.infer<typeof insertStripeEventSchema>;
export type StripeEvent = typeof stripeEvents.$inferSelect;

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  planTier: text("plan_tier").notNull(),
  status: text("status").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

// ---------------------------------------------------------------------------
// Usage records — for metered billing
// ---------------------------------------------------------------------------
export const usageRecords = pgTable("usage_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  metric: text("metric").notNull(),
  quantity: numeric("quantity").notNull(),
  stripeUsageRecordId: text("stripe_usage_record_id"),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

export const insertUsageRecordSchema = createInsertSchema(usageRecords).omit({
  id: true,
  recordedAt: true,
});
export type InsertUsageRecord = z.infer<typeof insertUsageRecordSchema>;
export type UsageRecord = typeof usageRecords.$inferSelect;

// ---------------------------------------------------------------------------
// Emotion types for TTS
// ---------------------------------------------------------------------------
export const emotionTypes = [
  "neutral", "joyful", "sad", "angry", "empathetic",
  "serious", "excited", "calm",
] as const;
export type EmotionType = (typeof emotionTypes)[number];

// ---------------------------------------------------------------------------
// Audio format types
// ---------------------------------------------------------------------------
export const audioFormats = ["wav", "mp3", "m4a"] as const;
export type AudioFormat = (typeof audioFormats)[number];

// ---------------------------------------------------------------------------
// Language options
// ---------------------------------------------------------------------------
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
