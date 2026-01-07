import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  Activity,
  Play,
  Pause,
  Download,
  Mic,
  AudioWaveform,
  Volume2,
  Sparkles,
  RotateCcw,
  Plus,
} from "lucide-react";
import type { Voice, AudioFormat, EmotionType } from "@shared/schema";
import { emotionTypes, audioFormats, languages } from "@shared/schema";
import { WaveformVisualizer } from "@/components/waveform-visualizer";

export default function Synthesis() {
  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("");
  const [emotion, setEmotion] = useState<EmotionType>("neutral");
  const [intensity, setIntensity] = useState([0.5]);
  const [rate, setRate] = useState([1.0]);
  const [pitch, setPitch] = useState([1.0]);
  const [format, setFormat] = useState<AudioFormat>("mp3");
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  const { data: voices, isLoading: voicesLoading } = useQuery<Voice[]>({
    queryKey: ["/api/voices"],
  });

  const synthesizeMutation = useMutation({
    mutationFn: async (data: {
      voiceId: string;
      text: string;
      emotion: string;
      intensity: number;
      rate: number;
      pitch: number;
      format: string;
    }) => {
      const res = await apiRequest("POST", "/api/synthesize", data);
      return res;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/history"] });
      setGeneratedAudio(data.audioUrl || "/placeholder-audio.mp3");
      toast({
        title: "Synthesis complete",
        description: "Your audio has been generated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Synthesis failed",
        description: "Could not generate audio. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSynthesize = () => {
    if (!text.trim() || !selectedVoice) {
      toast({
        title: "Missing input",
        description: "Please enter text and select a voice.",
        variant: "destructive",
      });
      return;
    }

    synthesizeMutation.mutate({
      voiceId: selectedVoice,
      text: text.trim(),
      emotion,
      intensity: intensity[0],
      rate: rate[0],
      pitch: pitch[0],
      format,
    });
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleReset = () => {
    setText("");
    setEmotion("neutral");
    setIntensity([0.5]);
    setRate([1.0]);
    setPitch([1.0]);
    setGeneratedAudio(null);
    setProgress(0);
  };

  useEffect(() => {
    if (synthesizeMutation.isPending) {
      const interval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);
      return () => clearInterval(interval);
    } else if (!synthesizeMutation.isPending && progress > 0) {
      setProgress(100);
      setTimeout(() => setProgress(0), 500);
    }
  }, [synthesizeMutation.isPending, progress]);

  const selectedVoiceData = voices?.find((v) => v.id === selectedVoice);

  const emotionColors: Record<EmotionType, string> = {
    neutral: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
    joyful: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    sad: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    angry: "bg-red-500/10 text-red-600 dark:text-red-400",
    empathetic: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    serious: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
    excited: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    calm: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-synthesis-title">
          Voice Synthesis
        </h1>
        <p className="text-muted-foreground">
          Generate AI speech with custom emotions and prosody
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Text Input
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Textarea
                placeholder="Enter the text you want to synthesize..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-48 resize-none text-base"
                data-testid="textarea-synthesis-text"
              />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{text.length} characters</span>
                <span>~{Math.ceil(text.length / 15)}s estimated</span>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Emotion & Style
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <Label>Emotion</Label>
                <div className="flex flex-wrap gap-2">
                  {emotionTypes.map((e) => (
                    <Button
                      key={e}
                      variant="outline"
                      size="sm"
                      className={`capitalize toggle-elevate ${emotion === e ? `toggle-elevated ${emotionColors[e]}` : ""}`}
                      onClick={() => setEmotion(e)}
                      data-testid={`button-emotion-${e}`}
                    >
                      {e}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <Label>Intensity</Label>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(intensity[0] * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={intensity}
                    onValueChange={setIntensity}
                    min={0}
                    max={1}
                    step={0.1}
                    data-testid="slider-intensity"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <Label>Speed</Label>
                    <span className="text-sm text-muted-foreground">
                      {rate[0].toFixed(1)}x
                    </span>
                  </div>
                  <Slider
                    value={rate}
                    onValueChange={setRate}
                    min={0.5}
                    max={2}
                    step={0.1}
                    data-testid="slider-rate"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <Label>Pitch</Label>
                    <span className="text-sm text-muted-foreground">
                      {pitch[0] > 1 ? "+" : ""}{((pitch[0] - 1) * 12).toFixed(0)}st
                    </span>
                  </div>
                  <Slider
                    value={pitch}
                    onValueChange={setPitch}
                    min={0.5}
                    max={1.5}
                    step={0.05}
                    data-testid="slider-pitch"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {(synthesizeMutation.isPending || generatedAudio) && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5" />
                  Output
                </CardTitle>
              </CardHeader>
              <CardContent>
                {synthesizeMutation.isPending ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>Generating audio...</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} />
                    <WaveformVisualizer isAnimating={true} />
                  </div>
                ) : generatedAudio ? (
                  <div className="flex flex-col gap-4">
                    <WaveformVisualizer isAnimating={isPlaying} />
                    <audio
                      ref={audioRef}
                      src={generatedAudio}
                      onEnded={() => setIsPlaying(false)}
                      className="hidden"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          onClick={togglePlayback}
                          data-testid="button-play-pause"
                        >
                          {isPlaying ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {selectedVoiceData?.name} • {emotion}
                        </span>
                      </div>
                      <Button variant="outline" size="sm" data-testid="button-download">
                        <Download className="mr-1 h-3 w-3" />
                        Download {format.toUpperCase()}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Voice
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {voicesLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : voices?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Mic className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="mt-3 text-sm font-medium">No voices available</p>
                  <p className="text-xs text-muted-foreground">
                    Upload a voice sample first
                  </p>
                  <Link href="/voices">
                    <Button size="sm" className="mt-4" data-testid="button-add-voice-synthesis">
                      <Plus className="mr-1 h-3 w-3" />
                      Add Voice
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger data-testid="select-voice">
                      <SelectValue placeholder="Select a voice" />
                    </SelectTrigger>
                    <SelectContent>
                      {voices?.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          <div className="flex items-center gap-2">
                            <AudioWaveform className="h-4 w-4" />
                            {voice.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedVoiceData && (
                    <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <AudioWaveform className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{selectedVoiceData.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedVoiceData.language?.toUpperCase()} • {selectedVoiceData.duration}s
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Output Format</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={format} onValueChange={(v) => setFormat(v as AudioFormat)}>
                <TabsList className="w-full">
                  {audioFormats.map((f) => (
                    <TabsTrigger
                      key={f}
                      value={f}
                      className="flex-1 uppercase"
                      data-testid={`tab-format-${f}`}
                    >
                      {f}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <div className="mt-4 text-xs text-muted-foreground">
                {format === "wav" && "Uncompressed, highest quality (48kHz/24-bit)"}
                {format === "mp3" && "Compressed, great for distribution (256kbps)"}
                {format === "m4a" && "AAC codec, optimized for web/mobile (192kbps)"}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full"
              onClick={handleSynthesize}
              disabled={!text.trim() || !selectedVoice || synthesizeMutation.isPending}
              data-testid="button-synthesize"
            >
              {synthesizeMutation.isPending ? (
                <>
                  <Activity className="mr-2 h-4 w-4 animate-pulse" />
                  Generating...
                </>
              ) : (
                <>
                  <Activity className="mr-2 h-4 w-4" />
                  Generate Audio
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              data-testid="button-reset"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
