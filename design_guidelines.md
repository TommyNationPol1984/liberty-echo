# LibertyEcho AI Voice Clone Generator - Design Guidelines

## Design Approach
**System-Based Approach** using Material Design principles adapted for professional audio production workflows. Drawing inspiration from Linear's clean layouts and professional audio tools like Descript and Riverside.fm for information-dense, utility-focused interfaces.

## Core Design Principles
1. **Clarity over decoration** - Every element serves a functional purpose
2. **Efficient workflows** - Minimize clicks to core actions
3. **Professional grade** - Broadcast-quality aesthetic matching audio output standards
4. **Trust and transparency** - Clear consent flows and processing states

---

## Typography System
**Font Stack:** Inter (primary), JetBrains Mono (code/technical)

**Hierarchy:**
- **Headings:** font-semibold to font-bold, leading-tight
- **H1:** text-3xl to text-4xl
- **H2:** text-2xl to text-3xl  
- **H3:** text-xl to text-2xl
- **Body:** text-base, font-normal, leading-relaxed
- **Labels:** text-sm, font-medium, tracking-tight
- **Captions/metadata:** text-xs to text-sm, font-normal

---

## Layout System
**Spacing Primitives:** Tailwind units of **2, 4, 6, 8, 12, 16**
- Tight spacing: p-2, gap-2 (within cards)
- Standard spacing: p-4, gap-4 (between elements)
- Section spacing: p-8, py-12 (major areas)
- Page margins: px-6 to px-8

**Grid System:** 
- Main app: Two-column split (sidebar navigation 280px + main content area)
- Content grids: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 for voice cards
- Forms: Single column max-w-2xl for optimal scanning

---

## Component Library

### Navigation
**Primary Sidebar:**
- Fixed left navigation (w-64 to w-72)
- Sections: Dashboard, Voices, Consent, Synthesis, History
- Active state: Subtle background fill with left border accent
- Icons: 20px size from Heroicons (outline style)

**Top Bar:**
- User profile dropdown (right)
- Current workspace/project indicator (left)
- Quick action button (+ New Voice)

### Voice Management Cards
**Voice Library Grid:**
- Card design with voice waveform preview thumbnail
- Voice name (font-semibold, text-lg)
- Metadata row: Duration • Language • Created date (text-sm)
- Action buttons: Play • Edit • Clone • Delete (icon buttons)
- Hover: Subtle elevation increase (shadow-md to shadow-lg)

### Consent Flow
**Multi-step Form:**
- Progress indicator: Stepped dots at top showing (1) Identity → (2) Upload → (3) Verification
- Clear section headers with descriptive subtext
- File upload zone: Dashed border, drag-and-drop area with icon
- Document preview after upload
- Status badges: Pending • Verified • Rejected (rounded-full, px-3, py-1)

### Synthesis Interface
**Main Control Panel:**
- Large text input area (textarea min-h-48, rounded-lg border)
- Voice selector dropdown with avatar thumbnails
- Emotion/style slider controls (horizontal sliders with labels)
- Format selector: Pills/tabs for WAV/MP3/M4A
- Large "Generate" CTA button (w-full on mobile, fixed width on desktop)

**Real-time Monitor:**
- Waveform visualization canvas (live updating during synthesis)
- Progress bar with percentage and time remaining
- Audio player controls below waveform (custom styled)

### Data Display
**Voice History Table:**
- Columns: Timestamp • Text Preview • Voice • Duration • Status • Actions
- Row hover: Background highlight
- Sortable headers with caret indicators
- Pagination: Minimal style with page numbers + arrows

### Forms & Inputs
**Input Fields:**
- Border style: border rounded-lg focus:ring-2 focus:ring-offset-2
- Label positioning: Above input, text-sm font-medium mb-2
- Helper text: Below input, text-xs
- Error states: Red border + icon + message

**File Upload:**
- Dropzone: Dashed border-2, rounded-lg, p-8
- Center-aligned icon + "Drag & drop or click to browse"
- File preview cards with remove button
- Progress bar for uploads

**Sliders:**
- Range inputs for emotion intensity, pitch, rate
- Value labels updating in real-time
- Tick marks for preset values

### Modals & Overlays
**Modal Structure:**
- Centered overlay with backdrop blur
- max-w-2xl container with rounded-xl
- Header: Title + close button, border-b
- Body: Scrollable content with py-6
- Footer: Action buttons right-aligned with gap-3

**Toast Notifications:**
- Fixed positioning top-right
- Slide-in animation
- Auto-dismiss after 5s
- Icon + message + close button
- Types: Success • Error • Warning • Info

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
- Tables convert to stacked card views

---

## Images & Visual Assets

**No Large Hero Image** - This is a web application, not a marketing site.

**Icon Usage:**
- Heroicons throughout (24px for headers, 20px for navigation, 16px inline)
- Microphone icon for voice recording
- Waveform icon for audio files
- Shield icon for consent/security
- Globe icon for multilingual features

**Waveform Visualizations:**
- Canvas-based real-time audio waveforms
- Spectral visualizations for voice analysis
- Subtle grid background for reference

**Avatar Placeholders:**
- Circular avatars for voice profiles (w-10 h-10 to w-12 h-12)
- Initials or voice icon when no custom image

---

## Accessibility Standards
- Minimum contrast ratio: 4.5:1 for body text, 3:1 for large text
- Focus indicators: 2px solid ring on all interactive elements
- ARIA labels on icon-only buttons
- Keyboard navigation support for all controls
- Screen reader announcements for synthesis progress
- Form validation messages associated with inputs

---

## Application States
**Loading States:**
- Skeleton screens for voice cards during load
- Spinner overlays for synthesis in progress
- Progress bars with percentage for uploads

**Empty States:**
- Illustration + heading + descriptive text + CTA
- "No voices yet" → Upload your first voice sample
- "No synthesis history" → Generate your first audio

**Error States:**
- Error boundary fallbacks
- Inline error messages with recovery actions
- Network error banner with retry button