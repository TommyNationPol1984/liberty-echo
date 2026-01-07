import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";

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

  app.get("/api/voices", async (req, res) => {
    try {
      const voices = await storage.getVoices();
      res.json(voices);
    } catch (error) {
      console.error("Error fetching voices:", error);
      res.status(500).json({ message: "Failed to fetch voices" });
    }
  });

  app.get("/api/voices/:id", async (req, res) => {
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

  app.post("/api/voices/upload", upload.single("sample"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file provided" });
      }

      const { name, language, userId } = req.body;
      if (!name || !userId) {
        return res.status(400).json({ message: "Name and userId are required" });
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

      res.json({ voice_id: voice.id, message: "Voice uploaded successfully" });
    } catch (error) {
      console.error("Error uploading voice:", error);
      res.status(500).json({ message: "Failed to upload voice" });
    }
  });

  app.delete("/api/voices/:id", async (req, res) => {
    try {
      const voice = await storage.getVoice(req.params.id);
      if (!voice) {
        return res.status(404).json({ message: "Voice not found" });
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

  app.get("/api/consents", async (req, res) => {
    try {
      const consents = await storage.getConsents();
      res.json(consents);
    } catch (error) {
      console.error("Error fetching consents:", error);
      res.status(500).json({ message: "Failed to fetch consents" });
    }
  });

  app.post("/api/consents", upload.single("document"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No document provided" });
      }

      const { name, userId } = req.body;
      if (!name || !userId) {
        return res.status(400).json({ message: "Name and userId are required" });
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

  app.patch("/api/consents/:id/verify", async (req, res) => {
    try {
      const consent = await storage.getConsent(req.params.id);
      if (!consent) {
        return res.status(404).json({ message: "Consent not found" });
      }

      await storage.updateConsentStatus(req.params.id, true);
      res.json({ status: "verified" });
    } catch (error) {
      console.error("Error verifying consent:", error);
      res.status(500).json({ message: "Failed to verify consent" });
    }
  });

  app.get("/api/history", async (req, res) => {
    try {
      const records = await storage.getSynthesisRecords();
      res.json(records);
    } catch (error) {
      console.error("Error fetching history:", error);
      res.status(500).json({ message: "Failed to fetch history" });
    }
  });

  app.post("/api/synthesize", async (req, res) => {
    try {
      const { voiceId, text, emotion, intensity, rate, pitch, format } = req.body;

      if (!voiceId || !text) {
        return res.status(400).json({ message: "voiceId and text are required" });
      }

      const voice = await storage.getVoice(voiceId);
      if (!voice) {
        return res.status(404).json({ message: "Voice not found" });
      }

      const estimatedDuration = Math.ceil(text.length / 15);

      const record = await storage.createSynthesisRecord({
        userId: "demo_user",
        voiceId,
        voiceName: voice.name,
        text,
        emotion: emotion || "neutral",
        intensity: intensity || 0.5,
        rate: rate || 1.0,
        pitch: pitch || 1.0,
        format: format || "mp3",
        duration: estimatedDuration,
        audioKey: null,
        status: "completed",
        createdAt: Date.now(),
      });

      await storage.updateSynthesisStatus(record.id, "completed", `audio_${record.id}.${format || "mp3"}`);

      res.json({
        synthesis_id: record.id,
        status: "completed",
        duration: estimatedDuration,
        audioUrl: `/api/audio/${record.id}`,
        message: "Synthesis completed successfully",
      });
    } catch (error) {
      console.error("Error synthesizing:", error);
      res.status(500).json({ message: "Failed to synthesize audio" });
    }
  });

  app.get("/api/audio/:id", async (req, res) => {
    try {
      const record = await storage.getSynthesisRecord(req.params.id);
      if (!record) {
        return res.status(404).json({ message: "Audio not found" });
      }

      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": "0",
      });
      res.end();
    } catch (error) {
      console.error("Error fetching audio:", error);
      res.status(500).json({ message: "Failed to fetch audio" });
    }
  });

  app.delete("/api/history/:id", async (req, res) => {
    try {
      const record = await storage.getSynthesisRecord(req.params.id);
      if (!record) {
        return res.status(404).json({ message: "Record not found" });
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
