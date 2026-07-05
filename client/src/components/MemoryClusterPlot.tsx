/**
 * MemoryClusterPlot.tsx
 * Neural Vault - Memory Embedding Visualization
 *
 * Ported from Google AI Studio prototype to production stack.
 * Replaces Firestore with REST API calls via useQuery.
 *
 * Features:
 * - Client-side PCA (power iteration, 2D projection of 1024D embeddings)
 * - K-Means clustering (auto-k based on data density)
 * - Interactive SVG canvas with zoom/pan
 * - Neon glow cluster centroids with cyberpunk color scheme
 * - Click node to inspect memory text, category, mood
 *
 * Backend required: GET /api/memories
 * Response: { memories: Memory[] }
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Memory {
  id: number;
  content: string;
  category: "episodic" | "semantic";
  mood: string | null;
  embedding: number[] | null;
  source: string;
  createdAt: string;
}

interface ClusterPoint {
  x: number;
  y: number;
  memory: Memory;
  cluster: number;
}

interface Centroid {
  x: number;
  y: number;
  label: string;
  color: string;
}

function computePCA(embeddings: number[][]): [number, number][] {
  if (!embeddings.length || !embeddings[0]?.length) return [];
  const n = embeddings.length;
  const d = embeddings[0].length;
  const mean = Array(d).fill(0);
  for (const vec of embeddings) {
    for (let j = 0; j < d; j++) mean[j] += vec[j] / n;
  }
  const centered = embeddings.map((vec) => vec.map((v, j) => v - mean[j]));
  const powerIterate = (data: number[][], iters = 20): number[] => {
    let v = Array(d).fill(0).map(() => Math.random() - 0.5);
    for (let i = 0; i < iters; i++) {
      const Av = Array(d).fill(0);
      for (const row of data) {
        const dot = row.reduce((s, x, j) => s + x * v[j], 0);
        for (let j = 0; j < d; j++) Av[j] += dot * row[j];
      }
      const norm = Math.sqrt(Av.reduce((s, x) => s + x * x, 0)) || 1;
      v = Av.map((x) => x / norm);
    }
    return v;
  };
  const pc1 = powerIterate(centered);
  const deflated = centered.map((row) => {
    const proj = row.reduce((s, x, j) => s + x * pc1[j], 0);
    return row.map((x, j) => x - proj * pc1[j]);
  });
  const pc2 = powerIterate(deflated);
  return centered.map((row) => [
    row.reduce((s, x, j) => s + x * pc1[j], 0),
    row.reduce((s, x, j) => s + x * pc2[j], 0),
  ]);
}

function kMeans(points: [number, number][], k: number, iters = 50): number[] {
  if (points.length < k) return points.map((_, i) => i % k);
  let centroids = points.slice().sort(() => Math.random() - 0.5).slice(0, k);
  let assignments = Array(points.length).fill(0);
  for (let iter = 0; iter < iters; iter++) {
    assignments = points.map((p) => {
      let best = 0; let bestDist = Infinity;
      centroids.forEach((c, ci) => {
        const d = Math.hypot(p[0] - c[0], p[1] - c[1]);
        if (d < bestDist) { bestDist = d; best = ci; }
      });
      return best;
    });
    centroids = Array.from({ length: k }, (_, ci) => {
      const pts = points.filter((_, i) => assignments[i] === ci);
      if (!pts.length) return centroids[ci];
      return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length] as [number, number];
    });
  }
  return assignments;
}

const CLUSTER_NAMES = ["Alpha Core","Beta Node","Gamma Loop","Delta State","Epsilon Flux","Zeta Matrix"];
const CLUSTER_COLORS = ["#00FFFF","#FF00FF","#00FF88","#FF6600","#AA00FF","#FFD700"];

export function MemoryClusterPlot() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedPoint, setSelectedPoint] = useState<ClusterPoint | null>(null);
  const [plotPoints, setPlotPoints] = useState<ClusterPoint[]>([]);
  const [centroids, setCentroids] = useState<Centroid[]>([]);
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  const { data, isLoading, isError } = useQuery<{ memories: Memory[] }>({
    queryKey: ["/api/memories"],
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const memories = data?.memories ?? [];
    const withEmbeddings = memories.filter((m) => m.embedding && m.embedding.length > 0);
    if (withEmbeddings.length < 2) return;
    const projections = computePCA(withEmbeddings.map((m) => m.embedding as number[]));
    const k = Math.min(6, Math.max(2, Math.round(Math.sqrt(withEmbeddings.length / 2))));
    const assignments = kMeans(projections, k);
    const xs = projections.map((p) => p[0]);
    const ys = projections.map((p) => p[1]);
    const xMin = Math.min(...xs); const xMax = Math.max(...xs);
    const yMin = Math.min(...ys); const yMax = Math.max(...ys);
    const xRange = xMax - xMin || 1; const yRange = yMax - yMin || 1;
    const normalize = (v: number, min: number, range: number) => ((v - min) / range) * 2 - 1;
    const points: ClusterPoint[] = withEmbeddings.map((m, i) => ({
      x: normalize(projections[i][0], xMin, xRange),
      y: normalize(projections[i][1], yMin, yRange),
      memory: m, cluster: assignments[i],
    }));
    const centroidData: Centroid[] = Array.from({ length: k }, (_, ci) => {
      const clusterPts = points.filter((p) => p.cluster === ci);
      const cx = clusterPts.reduce((s, p) => s + p.x, 0) / (clusterPts.length || 1);
      const cy = clusterPts.reduce((s, p) => s + p.y, 0) / (clusterPts.length || 1);
      return { x: cx, y: cy, label: CLUSTER_NAMES[ci] ?? `Cluster ${ci}`, color: CLUSTER_COLORS[ci] ?? "#FFFFFF" };
    });
    setPlotPoints(points);
    setCentroids(centroidData);
  }, [data]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isPanning.current = true;
    panStart.current = { x: e.clientX - viewOffset.x, y: e.clientY - viewOffset.y };
  }, [viewOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    setViewOffset({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  }, []);

  const handleMouseUp = useCallback(() => { isPanning.current = false; }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => Math.max(0.3, Math.min(5, s - e.deltaY * 0.001)));
  }, []);

  const SVG_W = 600; const SVG_H = 400;
  const toSVG = (nx: number, ny: number) => ({ x: ((nx + 1) / 2) * SVG_W, y: ((ny + 1) / 2) * SVG_H });

  if (isLoading) return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-6 w-48 bg-slate-700" />
      <Skeleton className="h-64 w-full bg-slate-700" />
    </div>
  );

  if (isError) return (
    <div className="p-4 text-red-400 text-sm">
      Failed to load memory vectors. Ensure /api/memories endpoint is available.
    </div>
  );

  const memories = data?.memories ?? [];
  if (memories.length === 0) return (
    <div className="p-8 text-center text-slate-400 text-sm">
      <p className="text-slate-500 mb-2">No memory vectors indexed yet.</p>
      <p>Memories are captured after each synthesis session.</p>
    </div>
  );

  return (
    <div className="flex gap-4 h-full">
      <div className="flex-1 min-w-0">
        <div
          className="relative rounded-lg overflow-hidden border border-slate-700 bg-slate-900"
          style={{ cursor: isPanning.current ? "grabbing" : "grab" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <svg ref={svgRef} width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="select-none">
            <defs>
              {centroids.map((c, i) => (
                <radialGradient key={i} id={`glow-${i}`}>
                  <stop offset="0%" stopColor={c.color} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={c.color} stopOpacity="0" />
                </radialGradient>
              ))}
            </defs>
            <g transform={`translate(${viewOffset.x},${viewOffset.y}) scale(${scale})`}>
              <line x1={SVG_W/2} y1={0} x2={SVG_W/2} y2={SVG_H} stroke="#1C2A3A" strokeWidth={1} />
              <line x1={0} y1={SVG_H/2} x2={SVG_W} y2={SVG_H/2} stroke="#1C2A3A" strokeWidth={1} />
              {centroids.map((c, i) => {
                const { x, y } = toSVG(c.x, c.y);
                return <circle key={`halo-${i}`} cx={x} cy={y} r={60} fill={`url(#glow-${i})`} opacity={0.6} />;
              })}
              {plotPoints.map((pt, i) => {
                const { x, y } = toSVG(pt.x, pt.y);
                const color = CLUSTER_COLORS[pt.cluster] ?? "#FFFFFF";
                const isSelected = selectedPoint?.memory.id === pt.memory.id;
                return (
                  <circle key={i} cx={x} cy={y} r={isSelected ? 8 : 5} fill={color}
                    opacity={isSelected ? 1 : 0.7} stroke={isSelected ? "#FFFFFF" : "transparent"}
                    strokeWidth={2} style={{ cursor: "pointer", filter: `drop-shadow(0 0 4px ${color})` }}
                    onClick={() => setSelectedPoint(pt)} />
                );
              })}
              {centroids.map((c, i) => {
                const { x, y } = toSVG(c.x, c.y);
                return (
                  <g key={`centroid-${i}`}>
                    <polygon points={`${x},${y-10} ${x-8},${y+6} ${x+8},${y+6}`}
                      fill={c.color} opacity={0.9} style={{ filter: `drop-shadow(0 0 6px ${c.color})` }} />
                    <text x={x} y={y-14} textAnchor="middle" fill={c.color} fontSize={9} fontFamily="monospace">
                      {c.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
          <div className="absolute bottom-2 right-2 flex gap-1">
            <Button size="sm" variant="outline" className="h-6 w-6 p-0 text-xs border-slate-600"
              onClick={() => setScale((s) => Math.min(5, s + 0.25))}>+</Button>
            <Button size="sm" variant="outline" className="h-6 w-6 p-0 text-xs border-slate-600"
              onClick={() => setScale((s) => Math.max(0.3, s - 0.25))}>-</Button>
            <Button size="sm" variant="outline" className="h-6 px-2 text-xs border-slate-600"
              onClick={() => { setScale(1); setViewOffset({ x: 0, y: 0 }); }}>Reset</Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {centroids.map((c, i) => (
            <Badge key={i}
              style={{ backgroundColor: c.color + "22", borderColor: c.color, color: c.color }}
              className="text-xs border">
              {c.label} ({plotPoints.filter((p) => p.cluster === i).length})
            </Badge>
          ))}
        </div>
      </div>
      <div className="w-64 flex-shrink-0">
        <Card className="bg-slate-900 border-slate-700 h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Memory Inspector
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedPoint ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500">Category</span>
                  <Badge className="ml-2 text-xs" style={{
                    backgroundColor: selectedPoint.memory.category === "episodic" ? "#1A3F8F33" : "#F5A62333",
                    color: selectedPoint.memory.category === "episodic" ? "#60A5FA" : "#F5A623",
                  }}>{selectedPoint.memory.category}</Badge>
                </div>
                {selectedPoint.memory.mood && (
                  <div>
                    <span className="text-slate-500">Mood</span>
                    <span className="ml-2 text-slate-300">{selectedPoint.memory.mood}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500">Cluster</span>
                  <span className="ml-2 font-mono" style={{ color: CLUSTER_COLORS[selectedPoint.cluster] }}>
                    {CLUSTER_NAMES[selectedPoint.cluster]}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Content</span>
                  <p className="text-slate-300 leading-relaxed bg-slate-800 rounded p-2">
                    {selectedPoint.memory.content.slice(0, 200)}
                    {selectedPoint.memory.content.length > 200 ? "…" : ""}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Source</span>
                  <span className="ml-2 text-slate-400">{selectedPoint.memory.source}</span>
                </div>
                <div>
                  <span className="text-slate-500">Projection</span>
                  <span className="ml-2 text-slate-400 font-mono">
                    ({selectedPoint.x.toFixed(3)}, {selectedPoint.y.toFixed(3)})
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-xs">
                Click a node to inspect its memory content, cluster assignment,
                and 2D projection coordinates.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
