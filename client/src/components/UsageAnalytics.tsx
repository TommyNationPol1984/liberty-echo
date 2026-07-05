import React, { useState, useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import { motion, AnimatePresence } from "motion/react";
import { 
  BarChart3, Activity, Clock, FileText, Sparkles, Sliders, Check, 
  AlertTriangle, RotateCcw, Plus, Search, Calendar, ChevronRight, 
  HelpCircle, ShieldCheck, Zap, ArrowUpRight
} from "lucide-react";

interface UsageAnalyticsProps {
  currentUserTier: string;
  charsUsed: number;
  onUpdateCharsUsed: (chars: number) => void;
  sttUsed: number;
  onUpdateSttUsed: (minutes: number) => void;
}

interface UsageLog {
  id: string;
  timestamp: string; // ISO String
  type: "tts" | "stt";
  name: string;
  amount: number; // Chars for tts, Minutes for stt
  status: "Completed" | "Failed" | "Processing";
  voiceOrLanguage: string;
}

// Map tiers to limits
const TIER_LIMITS: { [key: string]: { tts: number; stt: number } } = {
  free: { tts: 10000, stt: 0 },
  starter: { tts: 30000, stt: 0 },
  creator: { tts: 100000, stt: 300 }, // 5 hours * 60 min
  pro: { tts: 500000, stt: 1200 }, // 20 hours * 60 min
  scale: { tts: 2000000, stt: 6000 }, // 100 hours * 60 min
  business: { tts: 10000000, stt: 30000 } // 500 hours * 60 min
};

export function UsageAnalytics({
  currentUserTier = "free",
  charsUsed = 0,
  onUpdateCharsUsed,
  sttUsed = 0,
  onUpdateSttUsed
}: UsageAnalyticsProps) {
  // References for D3 charts
  const ttsChartRef = useRef<SVGSVGElement | null>(null);
  const sttChartRef = useRef<SVGSVGElement | null>(null);

  // States
  const [activeChartTab, setActiveChartTab] = useState<"tts" | "stt">("tts");
  const [searchQuery, setSearchQuery] = useState("");
  const [logTypeFilter, setLogTypeFilter] = useState<"all" | "tts" | "stt">("all");
  const [hoveredDataPoint, setHoveredDataPoint] = useState<{ date: string; amount: number } | null>(null);
  
  // Simulated logs
  const [logs, setLogs] = useState<UsageLog[]>([]);

  // Simulator state controls
  const [simJobName, setSimJobName] = useState("");
  const [simTtsChars, setSimTtsChars] = useState(1200);
  const [simSttMinutes, setSimSttMinutes] = useState(15);
  const [showSimSuccess, setShowSimSuccess] = useState<string | null>(null);

  // Get active limits based on selected tier
  const activeLimits = useMemo(() => {
    return TIER_LIMITS[currentUserTier] || TIER_LIMITS.free;
  }, [currentUserTier]);

  // Dynamic calculation for billing period
  const billingPeriod = useMemo(() => {
    const start = new Date();
    start.setDate(1); // First day of current month
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0); // Last day of current month
    
    // Days remaining
    const today = new Date();
    const diffTime = Math.max(0, end.getTime() - today.getTime());
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      startDate: start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      endDate: end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      daysRemaining: daysLeft
    };
  }, []);

  // Initialize logs on mount and populate past 30 days of data if empty
  useEffect(() => {
    const storedLogs = localStorage.getItem("liberty_echo_usage_logs");
    if (storedLogs) {
      try {
        setLogs(JSON.parse(storedLogs));
      } catch (e) {
        generateDefaultLogs();
      }
    } else {
      generateDefaultLogs();
    }
  }, [currentUserTier]);

  // Generate realistic default historical log data over the past 30 days
  const generateDefaultLogs = (forceReset = false) => {
    const defaultLogs: UsageLog[] = [];
    const now = new Date();
    
    // Scale pre-populated historical usage according to their current tier
    const ttsLimit = TIER_LIMITS[currentUserTier]?.tts || 10000;
    const sttLimit = TIER_LIMITS[currentUserTier]?.stt || 0;

    const baseTtsUsage = Math.floor(ttsLimit * 0.45); // 45% of limit used pre-populated
    const baseSttUsage = Math.floor(sttLimit * 0.35); // 35% of limit used pre-populated

    // Let's generate ~15-20 historical entries distributed over the last 30 days
    const jobNamesTts = [
      "Political Speech Transcript",
      "Podcast Episode Promo #1",
      "Interactive Audio Manual v2",
      "Daily Liberty News Briefing",
      "Automated Editorial Reading",
      "Integrity Campaign Ad Output",
      "Social Media Audio Soundbite",
      "Studio Pitch Calibration Sample",
      "Weekly Policy Review Summarizer",
      "Narrated Blog Article Synthesis"
    ];

    const jobNamesStt = [
      "Transcribed Town Hall Panel",
      "Policy Debate Interview Audio",
      "Microphone Dictation Test",
      "STT Transcript - Strategy Sync",
      "Broadcast Recording Transcription",
      "Legal Brief Dictation File"
    ];

    const voices = ["Liberty Voice Alpha", "Liberty Voice Beta", "Freedom Echo Prime", "Custom Cloned Voice"];
    const languages = ["English (US)", "English (UK)", "Spanish (ES)", "German (DE)"];

    let tempTtsAccumulator = 0;
    let tempSttAccumulator = 0;

    for (let i = 28; i >= 1; i--) {
      const dayOffset = new Date(now);
      dayOffset.setDate(now.getDate() - i);
      
      // Randomly distribute logs
      const hasTts = Math.random() > 0.4;
      const hasStt = sttLimit > 0 && Math.random() > 0.6;

      if (hasTts && tempTtsAccumulator < baseTtsUsage) {
        const chars = Math.floor(500 + Math.random() * (ttsLimit / 15));
        tempTtsAccumulator += chars;
        defaultLogs.push({
          id: `log_tts_${Math.random().toString(36).substring(2, 9)}`,
          timestamp: dayOffset.toISOString(),
          type: "tts",
          name: jobNamesTts[Math.floor(Math.random() * jobNamesTts.length)],
          amount: chars,
          status: "Completed",
          voiceOrLanguage: voices[Math.floor(Math.random() * voices.length)]
        });
      }

      if (hasStt && tempSttAccumulator < baseSttUsage) {
        const mins = Math.floor(5 + Math.random() * (sttLimit / 10));
        tempSttAccumulator += mins;
        defaultLogs.push({
          id: `log_stt_${Math.random().toString(36).substring(2, 9)}`,
          timestamp: dayOffset.toISOString(),
          type: "stt",
          name: jobNamesStt[Math.floor(Math.random() * jobNamesStt.length)],
          amount: mins,
          status: "Completed",
          voiceOrLanguage: languages[Math.floor(Math.random() * languages.length)]
        });
      }
    }

    // Sort logs by newest first
    defaultLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Save to state and storage
    setLogs(defaultLogs);
    localStorage.setItem("liberty_echo_usage_logs", JSON.stringify(defaultLogs));

    // Update parent states
    if (onUpdateCharsUsed && (charsUsed === 0 || forceReset)) {
      onUpdateCharsUsed(tempTtsAccumulator);
    }
    if (onUpdateSttUsed && (sttUsed === 0 || forceReset)) {
      onUpdateSttUsed(tempSttAccumulator);
    }
  };

  // Aggregated usage over past 30 days for visual charts
  const aggregatedData = useMemo(() => {
    const dataTtsMap: { [key: string]: number } = {};
    const dataSttMap: { [key: string]: number } = {};
    
    // Seed past 30 days with 0
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dataTtsMap[label] = 0;
      dataSttMap[label] = 0;
    }

    // Populate from active logs
    logs.forEach(log => {
      const logDate = new Date(log.timestamp);
      const label = logDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (label in dataTtsMap) {
        if (log.type === "tts") {
          dataTtsMap[label] += log.amount;
        } else if (log.type === "stt") {
          dataSttMap[label] += log.amount;
        }
      }
    });

    const ttsSeries = Object.keys(dataTtsMap).map(key => ({
      date: key,
      amount: dataTtsMap[key]
    }));

    const sttSeries = Object.keys(dataSttMap).map(key => ({
      date: key,
      amount: dataSttMap[key] / 60.0 // Convert minutes to hours for the visual STT chart
    }));

    return { ttsSeries, sttSeries };
  }, [logs]);

  // Render TTS area chart using D3
  useEffect(() => {
    if (!ttsChartRef.current || aggregatedData.ttsSeries.length === 0) return;

    const svgElement = d3.select(ttsChartRef.current);
    svgElement.selectAll("*").remove();

    const width = 640;
    const height = 180;
    const margin = { top: 15, right: 15, bottom: 25, left: 45 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const svg = svgElement
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const data = aggregatedData.ttsSeries;

    // X scale
    const xScale = d3.scalePoint()
      .domain(data.map(d => d.date))
      .range([0, chartWidth]);

    // Y scale
    const maxAmount = d3.max(data, d => d.amount) || 1000;
    const yScale = d3.scaleLinear()
      .domain([0, maxAmount * 1.15])
      .range([chartHeight, 0]);

    // Gridlines
    svg.append("g")
      .attr("class", "grid text-slate-800 opacity-20")
      .attr("transform", `translate(0, ${chartHeight})`)
      .call(d3.axisBottom(xScale).tickValues(data.filter((_, i) => i % 5 === 0).map(d => d.date)).tickSize(-chartHeight).tickFormat(() => ""));

    svg.append("g")
      .attr("class", "grid text-slate-800 opacity-20")
      .call(d3.axisLeft(yScale).ticks(4).tickSize(-chartWidth).tickFormat(() => ""));

    // Axes
    const xAxis = d3.axisBottom(xScale).tickValues(data.filter((_, i) => i % 5 === 0).map(d => d.date));
    const yAxis = d3.axisLeft(yScale).ticks(4).tickFormat(d => d >= 1000 ? `${(d as number) / 1000}k` : `${d}`);

    svg.append("g")
      .attr("transform", `translate(0, ${chartHeight})`)
      .attr("class", "text-[8px] text-slate-500 font-mono select-none")
      .call(xAxis)
      .selectAll("path, line").attr("stroke", "#1e293b");

    svg.append("g")
      .attr("class", "text-[8px] text-slate-500 font-mono select-none")
      .call(yAxis)
      .selectAll("path, line").attr("stroke", "#1e293b");

    // Area generator
    const area = d3.area<{ date: string; amount: number }>()
      .x(d => xScale(d.date) || 0)
      .y0(chartHeight)
      .y1(d => yScale(d.amount))
      .curve(d3.curveMonotoneX);

    // Gradient definition
    const defs = svgElement.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", "tts-area-gradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "0%").attr("y2", "100%");

    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#f59e0b")
      .attr("stop-opacity", 0.45);

    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#f59e0b")
      .attr("stop-opacity", 0.0);

    // Render Area
    svg.append("path")
      .datum(data)
      .attr("class", "area")
      .attr("d", area)
      .attr("fill", "url(#tts-area-gradient)");

    // Line generator
    const line = d3.line<{ date: string; amount: number }>()
      .x(d => xScale(d.date) || 0)
      .y(d => yScale(d.amount))
      .curve(d3.curveMonotoneX);

    // Render Line
    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#f59e0b")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Tooltip overlay points
    svg.append("g")
      .selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", d => xScale(d.date) || 0)
      .attr("cy", d => yScale(d.amount))
      .attr("r", 3)
      .attr("fill", "#020617")
      .attr("stroke", "#f59e0b")
      .attr("stroke-width", 1.5)
      .attr("class", "cursor-pointer hover:scale-150 transition-transform duration-100")
      .on("mouseenter", (event, d) => {
        setHoveredDataPoint({ date: d.date, amount: d.amount });
      })
      .on("mouseleave", () => {
        setHoveredDataPoint(null);
      });

  }, [aggregatedData, activeChartTab]);

  // Render STT bar chart using D3
  useEffect(() => {
    if (!sttChartRef.current || aggregatedData.sttSeries.length === 0) return;

    const svgElement = d3.select(sttChartRef.current);
    svgElement.selectAll("*").remove();

    const width = 640;
    const height = 180;
    const margin = { top: 15, right: 15, bottom: 25, left: 45 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const svg = svgElement
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const data = aggregatedData.sttSeries;

    // X scale
    const xScale = d3.scaleBand()
      .domain(data.map(d => d.date))
      .range([0, chartWidth])
      .padding(0.25);

    // Y scale
    const maxHours = d3.max(data, d => d.amount) || 0.1;
    const yScale = d3.scaleLinear()
      .domain([0, Math.max(0.5, maxHours * 1.15)])
      .range([chartHeight, 0]);

    // Gridlines
    svg.append("g")
      .attr("class", "grid text-slate-800 opacity-20")
      .call(d3.axisLeft(yScale).ticks(4).tickSize(-chartWidth).tickFormat(() => ""));

    // Axes
    const xAxis = d3.axisBottom(xScale).tickValues(data.filter((_, i) => i % 5 === 0).map(d => d.date));
    const yAxis = d3.axisLeft(yScale).ticks(4).tickFormat(d => `${(d as number).toFixed(2)}h`);

    svg.append("g")
      .attr("transform", `translate(0, ${chartHeight})`)
      .attr("class", "text-[8px] text-slate-500 font-mono select-none")
      .call(xAxis)
      .selectAll("path, line").attr("stroke", "#1e293b");

    svg.append("g")
      .attr("class", "text-[8px] text-slate-500 font-mono select-none")
      .call(yAxis)
      .selectAll("path, line").attr("stroke", "#1e293b");

    // Render Bars
    svg.selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar fill-cyan-500 hover:fill-cyan-400 cursor-pointer transition-colors duration-100")
      .attr("x", d => xScale(d.date) || 0)
      .attr("y", d => yScale(d.amount))
      .attr("width", xScale.bandwidth())
      .attr("height", d => Math.max(0, chartHeight - yScale(d.amount)))
      .attr("rx", 1.5)
      .on("mouseenter", (event, d) => {
        // Convert hours back to minutes for a cleaner hover tooltip display
        setHoveredDataPoint({ date: d.date, amount: Math.round(d.amount * 60) });
      })
      .on("mouseleave", () => {
        setHoveredDataPoint(null);
      });

  }, [aggregatedData, activeChartTab]);

  // Handle Simulation inputs trigger
  const handleSimulateJob = (type: "tts" | "stt") => {
    const now = new Date();
    const isTts = type === "tts";
    const jobName = simJobName.trim() || (isTts ? "Custom API Synthesis Batch" : "Microphone Transcription Loop");
    const amount = isTts ? simTtsChars : simSttMinutes;

    // Quota Limit checks
    if (isTts) {
      if (charsUsed + amount > activeLimits.tts) {
        alert(`⚠️ Prototyping Quota Alert: Simulating this TTS job (${amount.toLocaleString()} chars) will push your usage (${(charsUsed + amount).toLocaleString()}) past your active tier limit (${activeLimits.tts.toLocaleString()}). Update your tier in 'Pricing & Billing' if needed!`);
      }
    } else {
      if (activeLimits.stt === 0) {
        alert(`⚠️ Transcription Lock: Your current plan (${currentUserTier.toUpperCase()}) does not support Speech-to-Text translation. Please upgrade in 'Pricing & Billing' to gain STT access!`);
        return;
      }
      if (sttUsed + amount > activeLimits.stt) {
        alert(`⚠️ Prototyping Quota Alert: Simulating this STT job (${amount} min) will push your usage (${sttUsed + amount} min) past your active tier limit (${activeLimits.stt} min). Upgrade in 'Pricing & Billing' if needed!`);
      }
    }

    const newLog: UsageLog = {
      id: `log_${type}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: now.toISOString(),
      type,
      name: jobName,
      amount,
      status: "Completed",
      voiceOrLanguage: isTts ? "Liberty Voice Beta" : "English (US)"
    };

    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem("liberty_echo_usage_logs", JSON.stringify(updatedLogs));

    if (isTts && onUpdateCharsUsed) {
      onUpdateCharsUsed(charsUsed + amount);
    } else if (!isTts && onUpdateSttUsed) {
      onUpdateSttUsed(sttUsed + amount);
    }

    setSimJobName("");
    setShowSimSuccess(`Successfully logged: "${jobName}" (+${amount.toLocaleString()} ${isTts ? "characters" : "minutes"})`);
    setTimeout(() => setShowSimSuccess(null), 4000);
  };

  // Reset simulated consumption values back to 0
  const handleResetConsumption = () => {
    if (window.confirm("Confirm reset? This will clear your custom usage logs and reset active consumption to zero for prototyping.")) {
      if (onUpdateCharsUsed) onUpdateCharsUsed(0);
      if (onUpdateSttUsed) onUpdateSttUsed(0);
      setLogs([]);
      localStorage.setItem("liberty_echo_usage_logs", JSON.stringify([]));
      setShowSimSuccess("Usage and logs reset to zero.");
      setTimeout(() => setShowSimSuccess(null), 3000);
    }
  };

  // Quota usage percents
  const ttsPercent = Math.min(100, (charsUsed / (activeLimits.tts || 1)) * 100);
  const sttPercent = activeLimits.stt > 0 ? Math.min(100, (sttUsed / activeLimits.stt) * 100) : 0;

  // Filter logs list based on query and action type
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = log.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            log.voiceOrLanguage.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = logTypeFilter === "all" || log.type === logTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [logs, searchQuery, logTypeFilter]);

  return (
    <div className="space-y-6">
      
      {/* Overview stats layout cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Plan & Cycle status card */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden shadow-xl">
          <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/5 blur-3xl rounded-full pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">
                Active Subscription
              </span>
              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                {currentUserTier} Tier
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <h3 className="text-2xl font-black text-slate-100 flex items-center gap-2">
                <span>Liberty Echo</span>
                <span className="text-sm text-slate-400 font-normal">Core SDK</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                You are currently sub-licensed for {currentUserTier === "free" ? "evaluation cloning & limited synthesis" : "commercial outputs & priority transcribing"}. All quotas automatically replenish on renewal.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-4 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-amber-500" />
                <span>Billing Period:</span>
              </span>
              <span className="text-slate-200 font-bold">
                {billingPeriod.startDate} - {billingPeriod.endDate}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <span>Days Until Reset:</span>
              </span>
              <span className="text-amber-400 font-black">
                {billingPeriod.daysRemaining} days left
              </span>
            </div>

            <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 transition-all duration-500" 
                style={{ width: `${Math.max(5, Math.min(100, (30 - billingPeriod.daysRemaining) / 30 * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* TTS Progress Card */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
                TTS Characters
              </span>
            </div>
            <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
              ttsPercent > 90 
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse" 
                : ttsPercent > 60 
                  ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" 
                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            }`}>
              {ttsPercent > 90 ? "Quota Alert" : ttsPercent > 60 ? "Heavy Use" : "Healthy"}
            </span>
          </div>

          <div className="my-3">
            <span className="text-3xl font-black text-slate-100 font-mono tracking-tight">
              {charsUsed.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 font-bold ml-1.5 uppercase font-mono">
              / {activeLimits.tts.toLocaleString()} characters
            </span>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>CONSUMED BUDGET</span>
              <span className="text-slate-300 font-bold">{ttsPercent.toFixed(1)}%</span>
            </div>
            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  ttsPercent > 90 ? "bg-rose-500" : ttsPercent > 60 ? "bg-amber-400" : "bg-amber-500"
                }`}
                style={{ width: `${ttsPercent}%` }}
              />
            </div>
            <p className="text-[9px] text-slate-500 font-medium">
              Each character typed in Synthesis Studio subtracts from this monthly quota.
            </p>
          </div>
        </div>

        {/* STT Progress Card */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Clock className="h-3.5 w-3.5 text-cyan-400" />
              </div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
                STT Audio Hours
              </span>
            </div>
            <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
              activeLimits.stt === 0
                ? "bg-slate-950 text-slate-500 border border-slate-800"
                : sttPercent > 90 
                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                  : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
            }`}>
              {activeLimits.stt === 0 ? "Locked" : "Active"}
            </span>
          </div>

          <div className="my-3">
            <span className="text-3xl font-black text-slate-100 font-mono tracking-tight">
              {(sttUsed / 60.0).toFixed(2)}
            </span>
            <span className="text-xs text-slate-500 font-bold ml-1.5 uppercase font-mono">
              / {(activeLimits.stt / 60.0).toFixed(0)} hours
            </span>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>CONSUMED BUDGET</span>
              <span className="text-slate-300 font-bold">{sttPercent.toFixed(1)}%</span>
            </div>
            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
              <div 
                className="h-full bg-cyan-500 transition-all duration-500" 
                style={{ width: `${sttPercent}%` }}
              />
            </div>
            {activeLimits.stt === 0 ? (
              <p className="text-[9px] text-amber-500/80 font-bold flex items-center gap-1">
                <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                <span>Requires Creator Plan or higher to unlock STT transcription.</span>
              </p>
            ) : (
              <p className="text-[9px] text-slate-500 font-medium">
                Tracks minutes recorded in Synthesis Studio transcription pipelines.
              </p>
            )}
          </div>
        </div>

      </div>

      {/* Main visual consumption charts */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-100 uppercase tracking-wider">
                Visual Consumption Charts
              </h3>
              <p className="text-[10px] text-slate-500 font-mono uppercase">
                Historical usage logs aggregated over the last 30 days
              </p>
            </div>
          </div>

          {/* Toggle buttons between TTS and STT charts */}
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[9px] font-bold uppercase tracking-wider">
            <button
              onClick={() => {
                setActiveChartTab("tts");
                setHoveredDataPoint(null);
              }}
              className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 ${
                activeChartTab === "tts"
                  ? "bg-amber-500 text-slate-950 font-black"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sparkles className="h-3 w-3" />
              <span>TTS Character Runs</span>
            </button>
            <button
              onClick={() => {
                if (activeLimits.stt === 0) {
                  alert("⚠️ Speech-to-Text analytics is locked on your current plan. Please upgrade to Creator, Pro, or Scale tiers to activate transcription logs!");
                  return;
                }
                setActiveChartTab("stt");
                setHoveredDataPoint(null);
              }}
              className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 ${
                activeLimits.stt === 0 
                  ? "opacity-40 cursor-not-allowed text-slate-600" 
                  : activeChartTab === "stt"
                    ? "bg-cyan-500 text-slate-950 font-black"
                    : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Clock className="h-3 w-3" />
              <span>STT Transcribed Hours</span>
            </button>
          </div>
        </div>

        {/* Dynamic D3 Plot Frame */}
        <div className="w-full bg-slate-950 rounded-xl p-4 border border-slate-950/80 relative min-h-[200px] flex items-center justify-center overflow-hidden">
          
          <AnimatePresence mode="wait">
            {activeChartTab === "tts" ? (
              <motion.div
                key="tts-chart"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="w-full flex flex-col items-center"
              >
                <svg ref={ttsChartRef} className="w-full max-w-[640px] h-[180px] block" />
              </motion.div>
            ) : (
              <motion.div
                key="stt-chart"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="w-full flex flex-col items-center"
              >
                <svg ref={sttChartRef} className="w-full max-w-[640px] h-[180px] block" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Glowing hovered value tooltip overlay */}
          <AnimatePresence>
            {hoveredDataPoint && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-4 right-4 bg-slate-900/95 border border-slate-800 p-2.5 rounded-lg shadow-2xl backdrop-blur-sm pointer-events-none text-right font-mono text-[9px] z-10"
              >
                <div className="text-slate-500 uppercase font-black text-[8px] tracking-wider mb-0.5">
                  Point Calibration
                </div>
                <div className="text-slate-200 font-bold">
                  Date: {hoveredDataPoint.date}
                </div>
                <div className={activeChartTab === "tts" ? "text-amber-400 font-black" : "text-cyan-400 font-black"}>
                  {activeChartTab === "tts" 
                    ? `Chars: ${hoveredDataPoint.amount.toLocaleString()}` 
                    : `Transcription: ${hoveredDataPoint.amount} mins`}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer help tip */}
        <div className="mt-3 flex items-center justify-between text-[9px] font-mono text-slate-500 uppercase">
          <span>• Past 30 Days interval</span>
          <span>Hover coordinates to inspect precise values •</span>
        </div>
      </div>

      {/* Prototyping simulator & detailed job audit table double-column */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        
        {/* Prototyping simulator controls panel */}
        <div className="xl:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/60">
              <h3 className="text-xs font-black text-slate-100 flex items-center gap-1.5 uppercase tracking-wide">
                <Sliders className="h-3.5 w-3.5 text-amber-500" />
                <span>Simulation Controls</span>
              </h3>
              <span className="text-[7px] bg-amber-500/10 border border-amber-500/25 text-amber-500 px-1.5 py-0.5 rounded uppercase font-black font-mono">
                Prototype Mode
              </span>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed mb-4 font-medium">
              Simulate bulk Text-to-Speech synthesis and Speech-to-Text transcription jobs to test limit behaviors, trigger quota gates, and watch D3 charts recalculate live.
            </p>

            <div className="space-y-4">
              {/* Job label input */}
              <div>
                <label className="block text-[8px] font-mono text-slate-500 uppercase tracking-widest mb-1 font-bold">
                  Custom Job Description / Title
                </label>
                <input
                  type="text"
                  value={simJobName}
                  onChange={(e) => setSimJobName(e.target.value)}
                  placeholder="e.g. Political Campaign Script synthesis"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-600 font-mono focus:outline-none focus:border-amber-500/55"
                />
              </div>

              {/* TTS Job parameters block */}
              <div className="bg-slate-950/40 border border-slate-950 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                    Text-To-Speech Simulator
                  </span>
                  <span className="text-[9px] font-mono font-bold text-amber-500">
                    {simTtsChars.toLocaleString()} chars
                  </span>
                </div>
                
                <input
                  type="range"
                  min={100}
                  max={50000}
                  step={100}
                  value={simTtsChars}
                  onChange={(e) => setSimTtsChars(parseInt(e.target.value))}
                  className="w-full accent-amber-500 bg-slate-900 rounded-lg cursor-pointer h-1"
                />

                <button
                  type="button"
                  onClick={() => handleSimulateJob("tts")}
                  className="w-full bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-400 text-[8px] font-mono uppercase font-black py-2 rounded-lg transition tracking-widest flex items-center justify-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>Synthesize Simulated Job</span>
                </button>
              </div>

              {/* STT Job parameters block */}
              <div className={`bg-slate-950/40 border border-slate-950 rounded-xl p-3 space-y-2 ${activeLimits.stt === 0 ? "opacity-35 pointer-events-none" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                    Speech-To-Text Simulator
                  </span>
                  <span className="text-[9px] font-mono font-bold text-cyan-400">
                    {simSttMinutes} minutes
                  </span>
                </div>
                
                <input
                  type="range"
                  min={1}
                  max={120}
                  step={1}
                  value={simSttMinutes}
                  onChange={(e) => setSimSttMinutes(parseInt(e.target.value))}
                  className="w-full accent-cyan-500 bg-slate-900 rounded-lg cursor-pointer h-1"
                />

                <button
                  type="button"
                  onClick={() => handleSimulateJob("stt")}
                  className="w-full bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500 hover:text-slate-950 text-cyan-400 text-[8px] font-mono uppercase font-black py-2 rounded-lg transition tracking-widest flex items-center justify-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>Transcribe Simulated Job</span>
                </button>
              </div>
            </div>
          </div>

          {/* Reset / Seed Controls */}
          <div className="border-t border-slate-800/85 mt-4 pt-4 flex gap-2">
            <button
              type="button"
              onClick={() => generateDefaultLogs(true)}
              className="flex-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-[8px] font-mono uppercase font-bold py-2 rounded-lg transition tracking-wide flex items-center justify-center gap-1.5"
              title="Populates realistic, mock-historical data for testing charts."
            >
              <RotateCcw className="h-3 w-3" />
              <span>Regen History</span>
            </button>
            <button
              type="button"
              onClick={handleResetConsumption}
              className="flex-1 bg-slate-950 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/30 text-slate-400 hover:text-red-400 text-[8px] font-mono uppercase font-bold py-2 rounded-lg transition tracking-wide flex items-center justify-center gap-1.5"
            >
              <span>Reset Values</span>
            </button>
          </div>
        </div>

        {/* Detailed job logs / consumption audit trail table */}
        <div className="xl:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            {/* Header controls inside table */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-3 mb-4">
              <div>
                <h3 className="text-xs font-black text-slate-100 flex items-center gap-1.5 uppercase tracking-wide">
                  <FileText className="h-3.5 w-3.5 text-amber-500" />
                  <span>Consumption Audit Trail</span>
                </h3>
                <p className="text-[10px] text-slate-500 font-mono uppercase">
                  Details of synthesis and transcription jobs in current cycle
                </p>
              </div>

              {/* Filters list */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-600" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search logs..."
                    className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-[10px] text-slate-100 placeholder-slate-600 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <select
                  value={logTypeFilter}
                  onChange={(e) => setLogTypeFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-lg text-[10px] font-mono text-slate-400 px-2 py-1.5 focus:outline-none uppercase"
                >
                  <option value="all">ALL TYPES</option>
                  <option value="tts">TTS ONLY</option>
                  <option value="stt">STT ONLY</option>
                </select>
              </div>
            </div>

            {/* Table wrapper */}
            <div className="overflow-x-auto select-text scrollbar-thin scrollbar-thumb-slate-800 max-h-[290px]">
              <table className="w-full text-left font-mono text-[10px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider text-[9px]">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-2">Type</th>
                    <th className="py-2.5 px-3">Job Name</th>
                    <th className="py-2.5 px-3 text-right">Consumed</th>
                    <th className="py-2.5 px-3">Calibrations</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/55">
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-950/40 transition">
                        {/* ISO string formatting to human-readable date */}
                        <td className="py-2.5 px-3 text-slate-500 text-[9px] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}
                        </td>
                        <td className="py-2.5 px-2">
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                            log.type === "tts" 
                              ? "bg-amber-500/10 text-amber-500" 
                              : "bg-cyan-500/10 text-cyan-400"
                          }`}>
                            {log.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 max-w-[140px] truncate" title={log.name}>
                          {log.name}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-100 whitespace-nowrap">
                          {log.type === "tts" 
                            ? `${log.amount.toLocaleString()} ch` 
                            : `${log.amount} min`}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[9px] max-w-[120px] truncate" title={log.voiceOrLanguage}>
                          {log.voiceOrLanguage}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="text-emerald-500 bg-emerald-500/10 border border-emerald-500/15 text-[8px] font-black px-1.5 py-0.5 rounded">
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-600">
                        No consumption logs matched the active filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table summary stats */}
          <div className="border-t border-slate-800/80 mt-4 pt-3 flex items-center justify-between text-[9px] font-mono text-slate-500 uppercase">
            <span>Showing {filteredLogs.length} of {logs.length} jobs in audit trail</span>
            <span>Liberty Echo Cryptographic Timestamp verified</span>
          </div>
        </div>

      </div>

      {/* Simulated toast notifier */}
      <AnimatePresence>
        {showSimSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/40 p-3.5 rounded-xl shadow-2xl backdrop-blur-md max-w-sm"
          >
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                <Check className="h-3.5 w-3.5 text-emerald-500 stroke-[3px]" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                  Simulation Status Update
                </span>
                <p className="text-[11px] text-slate-200 mt-1 leading-relaxed">
                  {showSimSuccess}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
