import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  History,
  Play,
  Download,
  Trash2,
  MoreHorizontal,
  Search,
  Activity,
  Clock,
  AudioWaveform,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { SynthesisRecord } from "@shared/schema";

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { toast } = useToast();

  const { data: history, isLoading } = useQuery<SynthesisRecord[]>({
    queryKey: ["/api/history"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/history/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/history"] });
      toast({
        title: "Record deleted",
        description: "The synthesis record has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Could not delete the record. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredHistory = history?.filter(
    (record) =>
      record.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.voiceName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil((filteredHistory?.length ?? 0) / itemsPerPage);
  const paginatedHistory = filteredHistory?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Completed</Badge>;
      case "processing":
        return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400">Processing</Badge>;
      case "failed":
        return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400">Failed</Badge>;
      default:
        return <Badge className="bg-gray-500/10 text-gray-600 dark:text-gray-400">Pending</Badge>;
    }
  };

  const totalDuration = history?.reduce((acc, h) => acc + (h.duration || 0), 0) ?? 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-history-title">
            Synthesis History
          </h1>
          <p className="text-muted-foreground">
            View and manage your generated audio files
          </p>
        </div>
        <Link href="/synthesis">
          <Button data-testid="button-new-synthesis">
            <Activity className="mr-2 h-4 w-4" />
            New Synthesis
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
              <History className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{history?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Total Generations</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
              <Clock className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {Math.floor(totalDuration / 60)}m {totalDuration % 60}s
              </p>
              <p className="text-sm text-muted-foreground">Total Duration</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
              <AudioWaveform className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {history?.filter((h) => h.status === "completed").length ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Generation History</CardTitle>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by text or voice..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9"
              data-testid="input-search-history"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="mt-1 h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : paginatedHistory?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <History className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No history found</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                {searchQuery
                  ? "No records match your search. Try a different query."
                  : "Your synthesis history will appear here after you generate audio."}
              </p>
              {!searchQuery && (
                <Link href="/synthesis">
                  <Button className="mt-6" data-testid="button-first-synthesis">
                    <Activity className="mr-2 h-4 w-4" />
                    Start Synthesis
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Text</TableHead>
                      <TableHead>Voice</TableHead>
                      <TableHead>Emotion</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedHistory?.map((record) => (
                      <TableRow key={record.id} data-testid={`history-row-${record.id}`}>
                        <TableCell className="max-w-xs truncate font-medium">
                          {record.text.slice(0, 50)}...
                        </TableCell>
                        <TableCell>{record.voiceName}</TableCell>
                        <TableCell className="capitalize">{record.emotion}</TableCell>
                        <TableCell>{record.duration}s</TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(record.createdAt)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-history-menu-${record.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem data-testid={`menu-play-${record.id}`}>
                                <Play className="mr-2 h-4 w-4" />
                                Play
                              </DropdownMenuItem>
                              <DropdownMenuItem data-testid={`menu-download-${record.id}`}>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteMutation.mutate(record.id)}
                                data-testid={`menu-delete-${record.id}`}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-3 md:hidden">
                {paginatedHistory?.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-start gap-3 rounded-lg border p-3"
                    data-testid={`history-card-${record.id}`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Activity className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">
                        {record.text.slice(0, 40)}...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {record.voiceName} • {record.emotion} • {record.duration}s
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        {getStatusBadge(record.status)}
                        <span className="text-xs text-muted-foreground">
                          {formatDate(record.createdAt)}
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Play className="mr-2 h-4 w-4" />
                          Play
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate(record.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                    {Math.min(currentPage * itemsPerPage, filteredHistory?.length ?? 0)} of{" "}
                    {filteredHistory?.length ?? 0}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      data-testid="button-next-page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
