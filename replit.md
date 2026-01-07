# LibertyEcho - AI Voice Clone Generator

## Overview

LibertyEcho is a professional AI voice clone generator platform that enables users to create, manage, and synthesize voice clones with natural prosody, emotion control, and multilingual support. The application provides a complete workflow for voice cloning including consent management, voice sample uploads, text-to-speech synthesis, and generation history tracking.

The platform is designed for content creators needing branded voices, podcast narration, multilingual voiceovers, and character voice creation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming (light/dark mode support)
- **Build Tool**: Vite for development and production builds

**Key Frontend Patterns**:
- Component-based architecture with reusable UI primitives in `client/src/components/ui/`
- Page components in `client/src/pages/` following a simple flat structure
- Custom hooks for common functionality (`use-toast`, `use-mobile`)
- Theme provider context for dark/light mode switching
- Sidebar navigation pattern for main application layout

### Backend Architecture (Dual-Service)

#### Node.js API Server (Port 5000)
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful API endpoints under `/api/` prefix
- **File Handling**: Multer for multipart form uploads with disk storage
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Role**: Handles UI, authentication, database operations, proxies synthesis requests to Python

**Key Backend Patterns**:
- Storage abstraction layer (`server/storage.ts`) implementing `IStorage` interface
- Route registration pattern in `server/routes.ts`
- Development mode uses Vite middleware for HMR
- Production mode serves static files from `dist/public`
- Proxies `/api/synthesize` to Python TTS Engine (falls back gracefully if unavailable)

#### Python TTS Engine (Port 8000)
- **Framework**: FastAPI with Uvicorn ASGI server
- **Location**: `api/main.py`
- **Role**: Handles actual TTS synthesis, speaker embedding extraction, WebSocket streaming

**Key Python Modules**:
- `engine/models/tts_model.py` - TTS model wrapper (stub ready for real model integration)
- `engine/models/speaker_encoder.py` - Speaker embedding extraction
- `engine/inference/tts_inference.py` - Synthesis functions
- `api/services/job_queue.py` - Async job processing
- `config/settings.py` - Configuration via pydantic-settings

**Running Both Services**:
- Node.js: `npm run dev` (runs automatically via workflow)
- Python: `python run_tts_engine.py` (run manually in shell, or use `./start_all.sh`)

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` (shared between client and server)
- **Key Entities**:
  - `users` - User accounts
  - `voices` - Voice clone profiles with sample audio references
  - `consents` - Consent verification records for voice cloning
  - `synthesisRecords` - Text-to-speech generation history

### Shared Code
- Schema definitions and TypeScript types in `shared/` directory
- Zod schemas generated from Drizzle schemas using `drizzle-zod`
- Constants like `languages`, `emotionTypes`, `audioFormats` exported for frontend/backend use

### Build System
- Custom build script (`script/build.ts`) using esbuild for server bundling
- Vite for client-side bundling
- Server dependencies allowlisted for bundling to improve cold start times

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **Drizzle Kit**: Database migrations and schema push via `drizzle-kit push`

### UI Framework Dependencies
- **Radix UI**: Accessible component primitives (dialogs, dropdowns, tooltips, etc.)
- **Lucide React**: Icon library
- **Embla Carousel**: Carousel component
- **React Day Picker**: Calendar component
- **Recharts**: Charting library for data visualization
- **Vaul**: Drawer component

### Form & Validation
- **React Hook Form**: Form state management
- **Zod**: Schema validation
- **@hookform/resolvers**: Zod integration with React Hook Form

### Audio Processing
The Python TTS Engine provides:
- **Speaker Embedding**: `SpeakerEncoder` extracts 256-dim embeddings from audio samples (stub - ready for real model)
- **TTS Synthesis**: `TTSModel.generate()` creates audio from text with emotion/style control (stub - generates test tones)
- **Voice Cloning**: Upload reference audio, extract embedding, synthesize new speech in that voice
- **WebSocket Streaming**: `/ws/synthesize` for real-time audio streaming

**Integration Ready For**:
- Real TTS models (F5-TTS, OpenVoice, Coqui, etc.)
- Speaker encoders (ECAPA-TDNN, ResNetSE)
- Object storage (S3/Blob) for audio files

### Development Tools
- **Replit Plugins**: Dev banner, cartographer, runtime error overlay for Replit environment