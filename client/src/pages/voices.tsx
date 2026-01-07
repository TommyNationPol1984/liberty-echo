import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  Mic,
  Plus,
  MoreHorizontal,
  Trash2,
  Play,
  Activity,
  AudioWaveform,
  Upload,
  Globe,
  Clock,
  Search,
} from "lucide-react";
import type { Voice } from "@shared/schema";
import { languages } from "@shared/schema";

export default function Voices() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [voiceName, setVoiceName] = useState("");
  const [language, setLanguage] = useState("en");
  const { toast } = useToast();

  const { data: voices, isLoading } = useQuery<Voice[]>({
    queryKey: ["/api/voices"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/voices/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voices"] });
      setIsUploadOpen(false);
      setSelectedFile(null);
      setVoiceName("");
      toast({
        title: "Voice uploaded",
        description: "Your voice sample has been uploaded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (voiceId: string) => {
      await apiRequest("DELETE", `/api/voices/${voiceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voices"] });
      toast({
        title: "Voice deleted",
        description: "The voice has been removed from your library.",
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Could not delete the voice. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleUpload = () => {
    if (!selectedFile || !voiceName.trim()) return;

    const formData = new FormData();
    formData.append("sample", selectedFile);
    formData.append("name", voiceName.trim());
    formData.append("language", language);
    formData.append("userId", "demo_user");

    uploadMutation.mutate(formData);
  };

  const filteredVoices = voices?.filter((voice) =>
    voice.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-voices-title">
            Voice Library
          </h1>
          <p className="text-muted-foreground">
            Manage your cloned voices for synthesis
          </p>
        </div>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-voice">
              <Plus className="mr-2 h-4 w-4" />
              Add Voice
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Voice Sample</DialogTitle>
              <DialogDescription>
                Upload a clean audio recording (30s-10min) to create a voice clone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="voiceName">Voice Name</Label>
                <Input
                  id="voiceName"
                  placeholder="e.g., Professional Narrator"
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  data-testid="input-voice-name"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="language">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger data-testid="select-language">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Audio File</Label>
                <div
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:border-primary/50"
                  onClick={() => document.getElementById("fileInput")?.click()}
                  role="button"
                  tabIndex={0}
                  data-testid="dropzone-audio"
                >
                  <input
                    id="fileInput"
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                  {selectedFile ? (
                    <div className="flex items-center gap-2">
                      <AudioWaveform className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">{selectedFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-medium">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        WAV, MP3, or M4A (max 50MB)
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsUploadOpen(false)}
                data-testid="button-cancel-upload"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || !voiceName.trim() || uploadMutation.isPending}
                data-testid="button-confirm-upload"
              >
                {uploadMutation.isPending ? "Uploading..." : "Upload Voice"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search voices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-voices"
          />
        </div>
        <Badge variant="secondary" className="text-xs">
          {filteredVoices?.length ?? 0} voices
        </Badge>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="mt-2 h-4 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredVoices?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Mic className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No voices found</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              {searchQuery
                ? "No voices match your search. Try a different query."
                : "Upload your first voice sample to start creating AI voice clones."}
            </p>
            {!searchQuery && (
              <Button className="mt-6" onClick={() => setIsUploadOpen(true)} data-testid="button-upload-first">
                <Plus className="mr-2 h-4 w-4" />
                Upload Voice
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVoices?.map((voice) => (
            <Card key={voice.id} className="group hover-elevate" data-testid={`voice-card-${voice.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <AudioWaveform className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="truncate font-semibold" data-testid={`voice-name-${voice.id}`}>
                      {voice.name}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {voice.language?.toUpperCase()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {voice.duration}s
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100"
                        data-testid={`button-voice-menu-${voice.id}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem data-testid={`menu-play-${voice.id}`}>
                        <Play className="mr-2 h-4 w-4" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/synthesis" data-testid={`menu-use-${voice.id}`}>
                          <Activity className="mr-2 h-4 w-4" />
                          Use in Synthesis
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate(voice.id)}
                        data-testid={`menu-delete-${voice.id}`}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(voice.createdAt)}
                  </span>
                  <Link href="/synthesis">
                    <Button variant="outline" size="sm" data-testid={`button-synthesize-${voice.id}`}>
                      <Activity className="mr-1 h-3 w-3" />
                      Synthesize
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
