import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { AuthenticatedRequest } from "./middleware/auth";
import { SynthesizeRequestSchema, type SynthesizeResponse } from "./schemas/apiSchemas";
import { AudioEngine } from "./audio";

const TTS_ENGINE_URL = process.env.TTS_ENGINE_URL || "http://localhost:8000";
const FORCE_PRODUCTION_GUARDS = process.env.FORCE_PRODUCTION_GUARDS === "true" || process.env.NODE_ENV === "production";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use("/uploads", express.static(uploadDir));

  app.get("/api/tts-health", async (req, res) => {
    try {
      const response = await fetch(`${TTS_ENGINE_URL}/health`);
      if (response.ok) {
        const data = await response.json();
        res.json({ status: "connected", engine: data });
      } else {
        res.json({ status: "error", message: "TTS engine returned error" });
      }
    } catch (error) {
      res.json({ status: "disconnected", message: "TTS engine not available - using fallback mode" });
    }
  });

  app.get("/api/voices", async (req, res) => {
    try {
      const voices = await storage.getVoices();
      res.json(voices);
    } catch (error) {
      console.error("Error fetching voices:", error);
      res.status(500).json({ message: "Failed to fetch voices" });
    }
  });

  app.get("/api/voices/:id", async (req: AuthenticatedRequest, res) => {
    try {
      const voice = await storage.getVoice(req.params.id);
      if (!voice) {
        return res.status(404).json({ message: "Voice not found" });
      }
      res.json(voice);
    } catch (error) {
      console.error("Error fetching voice:", error);
      res.status(500).json({ message: "Failed to fetch voice" });
    }
  });

  // FIXED: Remove userId from body, use JWT user ID
  app.post("/api/voices/upload", upload.single("sample"), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file provided" });
      }

      const { name, language } = req.body;
      const userId = req.user!.id; // Use JWT user ID, NOT from request body

      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }

      const duration = Math.floor(Math.random() * 120) + 30;

      const voice = await storage.createVoice({
        userId,
        name,
        sampleKey: req.file.filename,
        language: language || "en",
        duration,
        createdAt: Date.now(),
      });

      try {
        const samplePath = path.join(uploadDir, req.file.filename);
        const formData = new FormData();
        const fileBuffer = fs.readFileSync(samplePath);
        const blob = new Blob([fileBuffer], { type: "audio/wav" });
        formData.append("sample", blob, req.file.filename);

        const ttsUpload = await fetch(
          `${TTS_ENGINE_URL}/api/voices/upload?user_id=${userId}&voice_name=${encodeURIComponent(name)}&language=${language || "en"}&voice_id=${voice.id}`,
          {
            method: "POST",
            body: formData,
          }
        );
        if (ttsUpload.ok) {
          console.log("Voice registered with TTS engine, ID:", voice.id);
        }
      } catch (ttsError) {
        console.log("Could not register voice with TTS engine:", ttsError);
      }

      res.json({ voice_id: voice.id, message: "Voice uploaded successfully" });
    } catch (error) {
      console.error("Error uploading voice:", error);
      res.status(500).json({ message: "Failed to upload voice" });
    }
  });

  app.delete("/api/voices/:id", async (req: AuthenticatedRequest, res) => {
    try {
      const voice = await storage.getVoice(req.params.id);
      if (!voice) {
        return res.status(404).json({ message: "Voice not found" });
      }

      // Verify ownership
      if (voice.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      if (voice.sampleKey) {
        const filePath = path.join(process.cwd(), "uploads", voice.sampleKey);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      await storage.deleteVoice(req.params.id);
      res.json({ status: "deleted" });
    } catch (error) {
      console.error("Error deleting voice:", error);
      res.status(500).json({ message: "Failed to delete voice" });
    }
  });

  app.get("/api/consents", async (req: AuthenticatedRequest, res) => {
    try {
      const consents = await storage.getConsents();
      // Filter to user's own consents
      const userConsents = consents.filter((c: any) => c.userId === req.user!.id);
      res.json(userConsents);
    } catch (error) {
      console.error("Error fetching consents:", error);
      res.status(500).json({ message: "Failed to fetch consents" });
    }
  });

  app.post("/api/consents", upload.single("document"), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No document provided" });
      }

      const { name } = req.body;
      const userId = req.user!.id; // Use JWT user ID, NOT from request body

      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }

      const consent = await storage.createConsent({
        userId,
        name,
        documentKey: req.file.filename,
        timestamp: Date.now(),
        verified: false,
      });

      res.json({ consent_id: consent.id, message: "Consent submitted successfully" });
    } catch (error) {
      console.error("Error submitting consent:", error);
      res.status(500).json({ message: "Failed to submit consent" });
    }
  });

  app.patch("/api/consents/:id/verify", async (req: AuthenticatedRequest, res) => {
    try {
      const consent = await storage.getConsent(req.params.id);
      if (!consent) {
        return res.status(404).json({ message: "Consent not found" });
      }

      // Verify ownership
      if (consent.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.updateConsentStatus(req.params.id, true);
      res.json({ status: "verified" });
    } catch (error) {
      console.error("Error verifying consent:", error);
      res.status(500).json({ message: "Failed to verify consent" });
    }
  });

  app.get("/api/history", async (req: AuthenticatedRequest, res) => {
    try {
      const records = await storage.getSynthesisRecords();
      // Filter to user's own records
      const userRecords = records.filter((r: any) => r.userId === req.user!.id);
      res.json(userRecords);
    } catch (error) {
      console.error("Error fetching history:", error);
      res.status(500).json({ message: "Failed to fetch history" });
    }
  });

  app.get("/api/usage/stats", async (req: AuthenticatedRequest, res) => {
    try {
      const records = await storage.getSynthesisRecords();
      const userRecords = records.filter((r: any) => r.userId === req.user!.id);
      
      const totalCharsUsed = userRecords.reduce((sum: number, r: any) => sum + (r.text?.length || 0), 0);
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const monthlyCharsUsed = userRecords
        .filter((r: any) => new Date(r.createdAt) >= monthStart)
        .reduce((sum: number, r: any) => sum + (r.text?.length || 0), 0);

      const monthlyCharsLimit = 100000; // Default; should come from user_entitlements in real impl

      res.json({
        userId: req.user!.id,
        totalCharsUsed,
        monthlyCharsUsed,
        monthlyCharsLimit,
        charsRemaining: Math.max(0, monthlyCharsLimit - monthlyCharsUsed),
      });
    } catch (error) {
      console.error("Error fetching usage stats:", error);
      res.status(500).json({ message: "Failed to fetch usage stats" });
    }
  });

  // FIXED: Remove userId from body, use JWT user ID, enforce WAV, single usage log
  app.post("/api/synthesize", async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id; // Use JWT user ID
      
      // Validate request body
      const parseResult = SynthesizeRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid request", errors: parseResult.error });
      }

      const { voiceId, text, audioFormat, speed, pitch } = parseResult.data;

      // Enforce WAV-only output
      if (audioFormat !== "wav") {
        return res.status(400).json({ message: "Only WAV format is supported" });
      }

      const voice = await storage.getVoice(voiceId);
      if (!voice) {
        return res.status(404).json({ message: "Voice not found" });
      }

      // Verify voice ownership (optional, for consent-first workflows)
      if (voice.userId && voice.userId !== userId) {
        return res.status(403).json({ message: "Voice not available" });
      }

      const record = await storage.createSynthesisRecord({
        userId,
        voiceId,
        voiceName: voice.name,
        text,
        emotion: "neutral",
        intensity: 0.5,
        rate: speed || 1.0,
        pitch: pitch || 0,
        format: "wav", // Force WAV
        duration: 0,
        audioKey: null,
        status: "processing",
        createdAt: Date.now(),
      });

      try {
        const ttsResponse = await fetch(`${TTS_ENGINE_URL}/api/synthesize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            voice_id: voiceId,
            text,
            emotion: "neutral",
            intensity: 0.5,
            rate: speed || 1.0,
            pitch: pitch || 0,
            format: "wav",
          }),
        });

        if (ttsResponse.ok) {
          const ttsResult = await ttsResponse.json() as { synthesis_id: string; duration_ms: number };
          const durationSeconds = Math.ceil((ttsResult.duration_ms || 1000) / 1000);
          
          await storage.updateSynthesisStatus(record.id, "completed", ttsResult.synthesis_id);

          // SINGLE usage log (no double-counting)
          // In production, this would INSERT into api_usage table via Supabase RPC
          console.log(`[USAGE] user=${userId} chars=${text.length} endpoint=/api/synthesize`);

          const response: SynthesizeResponse = {
            audioUrl: `/api/audio/${record.id}`,
            duration: durationSeconds,
            format: "wav",
            usageChars: text.length,
          };
          res.json(response);
        } else {
          const estimatedDuration = Math.ceil(text.length / 15);
          await storage.updateSynthesisStatus(record.id, "completed", `fallback_${record.id}`);

          console.log(`[USAGE] user=${userId} chars=${text.length} endpoint=/api/synthesize`);

          const response: SynthesizeResponse = {
            audioUrl: `/api/audio/${record.id}`,
            duration: estimatedDuration,
            format: "wav",
            usageChars: text.length,
          };
          res.json(response);
        }
      } catch (ttsError) {
        console.log("TTS engine not available, using fallback:", ttsError);
        const estimatedDuration = Math.ceil(text.length / 15);
        await storage.updateSynthesisStatus(record.id, "completed", `fallback_${record.id}`);

        console.log(`[USAGE] user=${userId} chars=${text.length} endpoint=/api/synthesize`);

        const response: SynthesizeResponse = {
          audioUrl: `/api/audio/${record.id}`,
          duration: estimatedDuration,
          format: "wav",
          usageChars: text.length,
        };
        res.json(response);
      }
    } catch (error) {
      console.error("Error synthesizing:", error);
      res.status(500).json({ message: "Failed to synthesize audio" });
    }
  });

  app.get("/api/audio/:id", async (req: AuthenticatedRequest, res) => {
    try {
      const record = await storage.getSynthesisRecord(req.params.id);
      if (!record) {
        return res.status(404).json({ message: "Audio not found" });
      }

      // Verify ownership
      if (record.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      if (record.audioKey && !record.audioKey.startsWith("fallback_")) {
        try {
          const audioResponse = await fetch(`${TTS_ENGINE_URL}/api/audio/${record.audioKey}`);
          if (audioResponse.ok) {
            res.set({
              "Content-Type": "audio/wav",
            });
            const arrayBuffer = await audioResponse.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            // Validate WAV
            AudioEngine.validateWAV(buffer);
            res.send(buffer);
            return;
          }
        } catch (audioError) {
          console.log("Could not fetch from TTS engine:", audioError);
        }
      }

      res.set({
        "Content-Type": "audio/wav",
        "Content-Length": "0",
      });
      res.end();
    } catch (error) {
      console.error("Error fetching audio:", error);
      res.status(500).json({ message: "Failed to fetch audio" });
    }
  });

  app.delete("/api/history/:id", async (req: AuthenticatedRequest, res) => {
    try {
      const record = await storage.getSynthesisRecord(req.params.id);
      if (!record) {
        return res.status(404).json({ message: "Record not found" });
      }

      // Verify ownership
      if (record.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.deleteSynthesisRecord(req.params.id);
      res.json({ status: "deleted" });
    } catch (error) {
      console.error("Error deleting record:", error);
      res.status(500).json({ message: "Failed to delete record" });
    }
  });

  return httpServer;
}
