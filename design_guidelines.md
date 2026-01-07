# LibertyEcho AI Voice Clone Generator - Design Guidelines

## Brand Identity
**Tone:** Confident, modern, and trustworthy — "Freedom's voice" aesthetic

## Design Tokens

### Color Palette
| Token | Hex | HSL | Usage |
|-------|-----|-----|-------|
| **Primary (Deep Indigo)** | #1F2A6B | 230 55% 27% | Brand headers, CTAs, primary buttons |
| **Accent (Warm Amber)** | #FFB84D | 38 100% 65% | Action highlights, emotion indicators, active states |
| **Neutral-1 (Soft Gray)** | #F5F7FA | 216 33% 97% | Surfaces, cards, backgrounds |
| **Neutral-2 (Mid Gray)** | #9AA3B2 | 218 14% 65% | Secondary text, borders |
| **Danger** | #E24B4B | 0 73% 59% | Error states, destructive actions |
| **Success** | #2EA86A | 149 57% 42% | Verified states, completion |

### Typography
| Role | Font | Size/Line Height |
|------|------|------------------|
| **UI Text** | Inter | 16px/20px |
| **Headings** | Inter (semibold/bold) | 28px/36px |
| **Code/SSML** | JetBrains Mono | 13px/18px |

### Spacing Scale
Base 8px scale: 4, 8, 16, 24, 32, 48

### Elevation
- **Card shadow:** 0 4px 12px rgba(16,24,40,0.06)
- **Modal shadow:** 0 12px 40px rgba(16,24,40,0.12)

### Motion
- **Micro interactions:** 160ms ease-out
- **Panel transitions:** 320ms ease-in-out

---

## Core Design Principles
1. **Clarity over decoration** - Every element serves a functional purpose
2. **Efficient workflows** - Minimize clicks to core actions
3. **Professional grade** - Broadcast-quality aesthetic matching audio output standards
4. **Trust and transparency** - Clear consent flows and processing states

---

## Component Library

### Navigation
**Primary Sidebar:**
- Fixed left navigation (w-64 to w-72)
- Sections: Dashboard, Voices, Consent, Synthesis, History
- Active state: Deep Indigo background with Amber left border accent
- Icons: 20px size from Lucide (outline style)

**Top Bar:**
- User profile dropdown (right)
- Theme toggle
- Quick action button (+ New Voice)

### Core Components
| Component | Description |
|-----------|-------------|
| **TopNav** | Logo, global search, notifications, user menu |
| **SideNav** | Icon + label, collapsible, active state highlight |
| **PrimaryButton** | Deep Indigo filled, rounded-md, disabled state |
| **SecondaryButton** | Outline style, subtle hover |
| **FileUploader** | Drag area, progress bar, quality meter (SNR, sample rate) |
| **WaveformPlayer** | Zoom, loop, stem mute/solo, export menu |
| **SSMLEditor** | Syntax highlighting, inline phoneme preview, validation badges |
| **SliderGroup** | Emotion, intensity, pitch, rate, energy; numeric input and reset |
| **ConsentModal** | Signature pad, ID upload, checklist with required items |
| **CloneCard** | Thumbnail, fidelity badge, verification status, quick-play |
| **QueuePanel** | Job list, status chips, retry/delete actions |

### Component States
- **Loading:** Skeleton screens for voice cards
- **Error:** Inline error text with suggested fixes
- **Success:** Toast with download link
- **Disabled:** Low-contrast controls with tooltip

### Voice Management Cards
- Card design with voice waveform preview thumbnail
- Voice name (font-semibold, text-lg)
- Metadata row: Duration, Language, Created date (text-sm)
- Action buttons: Play, Edit, Clone, Delete (icon buttons)
- Hover: Subtle elevation increase

### Synthesis Interface
**Main Control Panel:**
- Large text input area (textarea min-h-48, rounded-lg border)
- Voice selector dropdown with avatar thumbnails
- Emotion/style slider controls (8 emotions: neutral, joyful, sad, angry, empathetic, serious, excited, calm)
- Intensity slider (0.0 to 1.0)
- Pitch and Rate controls
- Format selector: WAV/MP3/M4A pills
- Large "Generate" CTA button with Warm Amber accent

**Real-time Monitor:**
- Waveform visualization canvas
- Progress bar with percentage
- Audio player controls below waveform

### Status Badges
| Badge | Color | Usage |
|-------|-------|-------|
| **Fidelity High** | Success green | Voice quality indicator |
| **Fidelity Medium** | Amber | Voice quality indicator |
| **Fidelity Low** | Warning | Voice quality indicator |
| **Watermark On** | Primary | Security indicator |
| **Verified** | Success | Consent status |
| **Pending** | Amber | Consent status |

---

## Key Screens

### 1. Home Dashboard
- Quick actions: Create Clone, Synthesize Text, Dubbing Project, Singing Project
- Recent activity: Recent clones, recent synths, usage quota
- Safety panel: Consent status, watermarking toggle, abuse filter status

### 2. Create Clone Wizard
- **Step 1 Consent:** Upload consent docs, checkbox summary of permitted uses
- **Step 2 Samples:** Upload audio or record in-browser; live quality meter
- **Step 3 Metadata:** Voice name, language tags, region, intended use
- **Step 4 Review:** Consent audit log preview, estimated fidelity, create button

### 3. Synthesize Text Screen
- Input: Text/SSML editor with inline phoneme preview
- Voice selector: Dropdown with search, preview play, fidelity badge
- Controls: Emotion slider, intensity, pitch, rate, energy
- Output: Streaming player, download/export options

### 4. Dubbing Project (Future)
- Upload: Source audio/video with transcript
- Alignment view: Waveform with forced-alignment markers
- Target voice: Select clone and mapping rules

### 5. Singing Studio (Future)
- Inputs: MIDI upload, lyrics editor with phoneme mapping
- Pitch editor: Note-level F0 curves, vibrato controls
- Render: Preview with separate stems

### 6. Admin and Audit (Future)
- Consent logs: Tamper-evident records, download proof
- Abuse dashboard: Blocked requests, flagged keywords
- Model management: Clone lifecycle

---

## Layout System
**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16
- Tight spacing: p-2, gap-2 (within cards)
- Standard spacing: p-4, gap-4 (between elements)
- Section spacing: p-8, py-12 (major areas)

**Grid System:** 
- Main app: Two-column split (sidebar 280px + main content)
- Content grids: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 for voice cards
- Forms: Single column max-w-2xl for optimal scanning

---

## Responsive Behavior
**Breakpoints:**
- Mobile-first approach
- sm: 640px (stack to single column)
- md: 768px (introduce two-column layouts)
- lg: 1024px (full sidebar, three-column grids)
- xl: 1280px (wider content containers)

**Mobile Adaptations:**
- Sidebar collapses to bottom tab navigation
- Cards stack vertically with full width
- Sliders become larger touch targets

---

## Accessibility Standards
- Minimum contrast ratio: 4.5:1 for body text, 3:1 for large text
- Focus indicators: 2px solid ring on all interactive elements
- ARIA labels on icon-only buttons
- Keyboard navigation support for all controls
- Screen reader announcements for synthesis progress

---

## Interactions
- Subtle transforms on hover (extremely subtle, just noticeable)
- Use hover-elevate and active-elevate-2 utility classes
- No layout changes on hover
- Progressive disclosure: Show basic controls by default, reveal advanced under toggle
