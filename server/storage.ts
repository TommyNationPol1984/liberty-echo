import {
  type User,
  type InsertUser,
  type Voice,
  type InsertVoice,
  type Consent,
  type InsertConsent,
  type SynthesisRecord,
  type InsertSynthesis,
  users,
  voices,
  consents,
  synthesisRecords,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getVoices(): Promise<Voice[]>;
  getVoice(id: string): Promise<Voice | undefined>;
  createVoice(voice: InsertVoice): Promise<Voice>;
  deleteVoice(id: string): Promise<void>;

  getConsents(): Promise<Consent[]>;
  getConsent(id: string): Promise<Consent | undefined>;
  createConsent(consent: InsertConsent): Promise<Consent>;
  updateConsentStatus(id: string, verified: boolean): Promise<void>;

  getSynthesisRecords(): Promise<SynthesisRecord[]>;
  getSynthesisRecord(id: string): Promise<SynthesisRecord | undefined>;
  createSynthesisRecord(record: InsertSynthesis): Promise<SynthesisRecord>;
  updateSynthesisStatus(id: string, status: string, audioKey?: string): Promise<void>;
  deleteSynthesisRecord(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getVoices(): Promise<Voice[]> {
    return db.select().from(voices).orderBy(desc(voices.createdAt));
  }

  async getVoice(id: string): Promise<Voice | undefined> {
    const [voice] = await db.select().from(voices).where(eq(voices.id, id));
    return voice || undefined;
  }

  async createVoice(insertVoice: InsertVoice): Promise<Voice> {
    const [voice] = await db.insert(voices).values(insertVoice).returning();
    return voice;
  }

  async deleteVoice(id: string): Promise<void> {
    await db.delete(voices).where(eq(voices.id, id));
  }

  async getConsents(): Promise<Consent[]> {
    return db.select().from(consents).orderBy(desc(consents.timestamp));
  }

  async getConsent(id: string): Promise<Consent | undefined> {
    const [consent] = await db.select().from(consents).where(eq(consents.id, id));
    return consent || undefined;
  }

  async createConsent(insertConsent: InsertConsent): Promise<Consent> {
    const [consent] = await db.insert(consents).values(insertConsent).returning();
    return consent;
  }

  async updateConsentStatus(id: string, verified: boolean): Promise<void> {
    await db.update(consents).set({ verified }).where(eq(consents.id, id));
  }

  async getSynthesisRecords(): Promise<SynthesisRecord[]> {
    return db.select().from(synthesisRecords).orderBy(desc(synthesisRecords.createdAt));
  }

  async getSynthesisRecord(id: string): Promise<SynthesisRecord | undefined> {
    const [record] = await db.select().from(synthesisRecords).where(eq(synthesisRecords.id, id));
    return record || undefined;
  }

  async createSynthesisRecord(insertRecord: InsertSynthesis): Promise<SynthesisRecord> {
    const [record] = await db.insert(synthesisRecords).values(insertRecord).returning();
    return record;
  }

  async updateSynthesisStatus(id: string, status: string, audioKey?: string): Promise<void> {
    const updateData: { status: string; audioKey?: string } = { status };
    if (audioKey) {
      updateData.audioKey = audioKey;
    }
    await db.update(synthesisRecords).set(updateData).where(eq(synthesisRecords.id, id));
  }

  async deleteSynthesisRecord(id: string): Promise<void> {
    await db.delete(synthesisRecords).where(eq(synthesisRecords.id, id));
  }
}

export const storage = new DatabaseStorage();
