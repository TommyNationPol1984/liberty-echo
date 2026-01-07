import { useEffect, useRef } from "react";

interface WaveformVisualizerProps {
  isAnimating?: boolean;
  className?: string;
}

export function WaveformVisualizer({ isAnimating = false, className = "" }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const bars = 64;
    const barWidth = width / bars - 2;
    let offset = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      const computedStyle = getComputedStyle(document.documentElement);
      const primaryHsl = computedStyle.getPropertyValue("--primary").trim();
      const primaryColor = `hsl(${primaryHsl})`;
      const mutedColor = `hsl(${primaryHsl} / 0.3)`;

      for (let i = 0; i < bars; i++) {
        const x = i * (barWidth + 2);
        
        let barHeight;
        if (isAnimating) {
          const wave = Math.sin((i + offset) * 0.15) * 0.5 + 0.5;
          const noise = Math.sin((i + offset * 2) * 0.3) * 0.3;
          barHeight = (wave + noise) * (height * 0.7) + height * 0.1;
        } else {
          const staticWave = Math.sin(i * 0.2) * 0.3 + 0.4;
          barHeight = staticWave * (height * 0.5) + height * 0.05;
        }

        const gradient = ctx.createLinearGradient(x, height, x, height - barHeight);
        gradient.addColorStop(0, isAnimating ? primaryColor : mutedColor);
        gradient.addColorStop(1, isAnimating ? `hsl(${primaryHsl} / 0.5)` : `hsl(${primaryHsl} / 0.1)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, height - barHeight, barWidth, barHeight, 2);
        ctx.fill();
      }

      if (isAnimating) {
        offset += 0.5;
        animationRef.current = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating]);

  return (
    <div className={`relative rounded-lg bg-muted/30 p-4 ${className}`}>
      <canvas
        ref={canvasRef}
        className="h-24 w-full"
        style={{ width: "100%", height: "96px" }}
        data-testid="canvas-waveform"
      />
      <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-background/20 to-transparent pointer-events-none" />
    </div>
  );
}
