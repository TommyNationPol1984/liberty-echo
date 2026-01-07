import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  Mic,
  Activity,
  History,
  FileCheck,
  Plus,
  ArrowRight,
  AudioWaveform,
  TrendingUp,
} from "lucide-react";
import type { Voice, SynthesisRecord, Consent } from "@shared/schema";

export default function Dashboard() {
  const { data: voices, isLoading: voicesLoading } = useQuery<Voice[]>({
    queryKey: ["/api/voices"],
  });

  const { data: history, isLoading: historyLoading } = useQuery<SynthesisRecord[]>({
    queryKey: ["/api/history"],
  });

  const { data: consents, isLoading: consentsLoading } = useQuery<Consent[]>({
    queryKey: ["/api/consents"],
  });

  const stats = [
    {
      title: "Voice Clones",
      value: voices?.length ?? 0,
      icon: Mic,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      href: "/voices",
    },
    {
      title: "Generations",
      value: history?.length ?? 0,
      icon: Activity,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      href: "/history",
    },
    {
      title: "Verified Consents",
      value: consents?.filter((c) => c.verified).length ?? 0,
      icon: FileCheck,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      href: "/consent",
    },
    {
      title: "Audio Duration",
      value: `${Math.round((history?.reduce((acc, h) => acc + (h.duration || 0), 0) ?? 0) / 60)}m`,
      icon: History,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      href: "/history",
    },
  ];

  const recentVoices = voices?.slice(0, 3) ?? [];
  const recentHistory = history?.slice(0, 5) ?? [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-dashboard-title">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome to LibertyEcho. Create, manage, and synthesize AI voice clones.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {voicesLoading || historyLoading || consentsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold" data-testid={`stat-${stat.title.toLowerCase().replace(/\s/g, "-")}`}>
                    {stat.value}
                  </span>
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Voice Library</CardTitle>
              <p className="text-sm text-muted-foreground">
                Your cloned voices ready for synthesis
              </p>
            </div>
            <Link href="/voices">
              <Button variant="ghost" size="sm" data-testid="button-view-all-voices">
                View all
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {voicesLoading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="mt-1 h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentVoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Mic className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-sm font-medium">No voices yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Upload your first voice sample to get started
                </p>
                <Link href="/voices">
                  <Button className="mt-4" size="sm" data-testid="button-upload-first-voice">
                    <Plus className="mr-1 h-3 w-3" />
                    Upload Voice
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {recentVoices.map((voice) => (
                  <div
                    key={voice.id}
                    className="flex items-center gap-3 rounded-lg p-2 hover-elevate"
                    data-testid={`voice-card-${voice.id}`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <AudioWaveform className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{voice.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {voice.language?.toUpperCase()} • {voice.duration}s
                      </p>
                    </div>
                    <Link href="/synthesis">
                      <Button variant="ghost" size="sm" data-testid={`button-use-voice-${voice.id}`}>
                        Use
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <p className="text-sm text-muted-foreground">
                Your latest synthesis generations
              </p>
            </div>
            <Link href="/history">
              <Button variant="ghost" size="sm" data-testid="button-view-all-history">
                View all
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="mt-1 h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Activity className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-sm font-medium">No generations yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create your first synthesis to see it here
                </p>
                <Link href="/synthesis">
                  <Button className="mt-4" size="sm" data-testid="button-create-first-synthesis">
                    <Activity className="mr-1 h-3 w-3" />
                    Start Synthesis
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {recentHistory.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center gap-3 rounded-lg p-2 hover-elevate"
                    data-testid={`history-item-${record.id}`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                      <Activity className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">
                        {record.text.slice(0, 40)}...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {record.voiceName} • {record.emotion}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {record.duration}s
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <CardContent className="flex flex-col items-start gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <AudioWaveform className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Ready to create?</h3>
              <p className="text-sm text-muted-foreground">
                Start generating professional-quality AI voice content in seconds.
              </p>
            </div>
          </div>
          <Link href="/synthesis">
            <Button size="lg" data-testid="button-quick-synthesis">
              <Activity className="mr-2 h-4 w-4" />
              Quick Synthesis
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
