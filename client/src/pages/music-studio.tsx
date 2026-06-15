import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Music2, Loader2, Play, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

interface GeneratedTrack {
  id: string;
  label: string;
  blobUrl: string;
  createdAt: Date;
}

export default function MusicStudio() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(30);
  const [activeTrack, setActiveTrack] = useState<string | null>(null);
  const [recentTracks, setRecentTracks] = useState<GeneratedTrack[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  const generateMutation = useMutation({
    mutationFn: async ({ prompt, duration }: { prompt: string; duration: number }) => {
      const res = await fetch("/api/music/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt, duration }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Generation failed" }));
        throw new Error(err.detail ?? "Generation failed");
      }
      const arrayBuffer = await res.arrayBuffer();
      const blobUrl = URL.createObjectURL(new Blob([arrayBuffer], { type: "audio/mpeg" }));
      return blobUrl;
    },
    onSuccess: (blobUrl) => {
      const id = crypto.randomUUID();
      const label = prompt.slice(0, 40) + (prompt.length > 40 ? "…" : "");
      const track: GeneratedTrack = { id, label, blobUrl, createdAt: new Date() };
      setRecentTracks((prev) => [track, ...prev].slice(0, 5));
      setActiveTrack(blobUrl);
    },
  });

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    generateMutation.mutate({ prompt: prompt.trim(), duration });
  }

  function playTrack(blobUrl: string) {
    setActiveTrack(blobUrl);
    setTimeout(() => audioRef.current?.play(), 50);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Music2 className="w-7 h-7" style={{ color: "#F5A623" }} />
        <div>
          <h1 className="text-2xl font-bold text-white">Music Studio</h1>
          <p className="text-sm text-white/50">Generate AI music from text prompts</p>
        </div>
      </div>

      {/* Upsell banner */}
      <div className="rounded-xl px-5 py-4 border flex items-start gap-3 text-sm" style={{ borderColor: "#F5A623", backgroundColor: "rgba(245,166,35,0.08)" }}>
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#F5A623" }} />
        <span className="text-white/80">
          <span className="font-semibold" style={{ color: "#F5A623" }}>Music Studio requires Creator plan or higher.</span>{" "}
          <Link href="/pricing"><span className="underline cursor-pointer hover:text-[#F5A623] transition-colors">Upgrade your plan</span></Link>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Generate form */}
        <div className="rounded-2xl border border-white/10 p-6 space-y-5" style={{ backgroundColor: "#23233A" }}>
          <h2 className="text-lg font-semibold text-white">Generate Music</h2>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm text-white/70">Prompt</label>
                <span className="text-xs text-white/30">{prompt.length}/1000</span>
              </div>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, 1000))}
                placeholder="Describe the music you want to generate…"
                rows={4}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/25 resize-none focus:border-[#F5A623]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm text-white/70">Duration</label>
                <span className="text-sm font-medium text-white">{duration}s</span>
              </div>
              <input
                type="range"
                min={5}
                max={120}
                step={5}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full accent-[#F5A623] cursor-pointer"
              />
              <div className="flex justify-between text-xs text-white/30">
                <span>5s</span><span>120s</span>
              </div>
            </div>

            {generateMutation.isError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-400">{generateMutation.error.message}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={generateMutation.isPending || !prompt.trim()}
              className="w-full font-semibold h-11"
              style={{ backgroundColor: "#F5A623", color: "#1C1C2E" }}
            >
              {generateMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating your music…
                </span>
              ) : "Generate"}
            </Button>
          </form>
        </div>

        {/* Right: Player + recent */}
        <div className="space-y-4">
          {/* Active player */}
          {activeTrack && (
            <div className="rounded-2xl border border-white/10 p-6 space-y-3" style={{ backgroundColor: "#23233A" }}>
              <h2 className="text-lg font-semibold text-white">Now Playing</h2>
              <audio
                ref={audioRef}
                controls
                src={activeTrack}
                key={activeTrack}
                className="w-full"
                style={{ accentColor: "#F5A623" }}
              />
            </div>
          )}

          {/* Recent tracks */}
          {recentTracks.length > 0 && (
            <div className="rounded-2xl border border-white/10 p-6 space-y-3" style={{ backgroundColor: "#23233A" }}>
              <h2 className="text-lg font-semibold text-white">Recent Generations</h2>
              <ul className="space-y-2">
                {recentTracks.map((track) => (
                  <li
                    key={track.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-white/5 hover:border-white/10 cursor-pointer transition-colors group"
                    style={{ backgroundColor: activeTrack === track.blobUrl ? "rgba(245,166,35,0.08)" : "rgba(255,255,255,0.02)" }}
                    onClick={() => playTrack(track.blobUrl)}
                  >
                    <Play className="w-4 h-4 shrink-0 group-hover:text-[#F5A623] transition-colors" style={{ color: activeTrack === track.blobUrl ? "#F5A623" : "rgba(255,255,255,0.4)" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 truncate">{track.label}</p>
                      <p className="text-xs text-white/30">{track.createdAt.toLocaleTimeString()}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!activeTrack && recentTracks.length === 0 && (
            <div className="rounded-2xl border border-white/5 p-8 flex flex-col items-center justify-center text-center gap-3" style={{ backgroundColor: "#23233A" }}>
              <Music2 className="w-10 h-10 text-white/20" />
              <p className="text-white/40 text-sm">Your generated music will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}