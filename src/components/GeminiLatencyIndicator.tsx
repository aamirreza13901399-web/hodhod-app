import React, { useState, useEffect } from "react";
import { Sparkles, Activity, CheckCircle, AlertTriangle, HelpCircle } from "lucide-react";

interface PingResponse {
  status: "online" | "simulated" | "offline";
  latencyMs: number;
  model: string;
  connected: boolean;
  error?: string;
}

export default function GeminiLatencyIndicator() {
  const [latency, setLatency] = useState<number | null>(null);
  const [status, setStatus] = useState<"connected" | "simulated" | "offline">("simulated");
  const [isProcessing, setIsProcessing] = useState(false);
  const [modelName, setModelName] = useState("gemini-3.1-flash-lite");
  const [errorCount, setErrorCount] = useState(0);

  // Function to ping the Gemini status endpoint on the server
  const checkStatus = async () => {
    const start = Date.now();
    try {
      const response = await fetch("/api/gemini/ping");
      if (!response.ok) throw new Error("Server returned non-ok");
      const data: PingResponse = await response.json();
      
      setLatency(data.latencyMs);
      
      if (data.status === "online") {
        setStatus("connected");
      } else if (data.status === "simulated") {
        setStatus("simulated");
      } else {
        setStatus("offline");
      }
      
      if (data.model) {
        setModelName(data.model);
      }
      setErrorCount(0);
    } catch (e) {
      const duration = Date.now() - start;
      setLatency(duration);
      setStatus("offline");
      setErrorCount(prev => prev + 1);
    }
  };

  // Set up the polling interval and custom event listeners to detect processing status safely
  useEffect(() => {
    // Initial fetch
    checkStatus();

    // Poll every 12 seconds to keep connection feedback fresh and lightweight
    const interval = setInterval(checkStatus, 12000);

    const handleStart = () => {
      setIsProcessing(true);
    };

    const handleEnd = () => {
      // Keep the visual state active briefly for user feedback even if request finishes instantly
      setTimeout(() => {
        setIsProcessing(false);
        // Immediately refresh status to register new latency
        checkStatus();
      }, 800);
    };

    window.addEventListener("gemini-active-start", handleStart);
    window.addEventListener("gemini-active-end", handleEnd);

    return () => {
      clearInterval(interval);
      window.removeEventListener("gemini-active-start", handleStart);
      window.removeEventListener("gemini-active-end", handleEnd);
    };
  }, []);

  // Rendering styling and label states based on live connection values
  return (
    <div 
      id="gemini-latency-indicator" 
      className="inline-flex items-center gap-3 bg-white/2 hover:bg-white/5 border border-white/5 hover:border-white/10 px-4 py-2 rounded-xl backdrop-blur-md transition-all duration-350 shadow-inner rtl"
    >
      {/* 1. Interactive Pulse State Light */}
      <div className="relative flex items-center justify-center">
        {isProcessing ? (
          <>
            <span className="absolute w-3.5 h-3.5 bg-purple-500 rounded-full animate-ping opacity-75" />
            <span className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-pulse" />
          </>
        ) : status === "connected" ? (
          <>
            <span className="absolute w-3.5 h-3.5 bg-emerald-500 rounded-full animate-ping opacity-45" />
            <span className="w-2h-2 w-2.5 h-2.5 bg-emerald-500 rounded-full" />
          </>
        ) : status === "simulated" ? (
          <>
            <span className="absolute w-3.5 h-3.5 bg-amber-500/50 rounded-full animate-ping opacity-40" />
            <span className="w-2.5 h-2.5 bg-amber-400 rounded-full" />
          </>
        ) : (
          <>
            <span className="absolute w-3.5 h-3.5 bg-rose-500/40 rounded-full animate-ping opacity-40" />
            <span className="w-2.5 h-2.5 bg-rose-500 rounded-full" />
          </>
        )}
      </div>

      {/* 2. Descriptive text state & speed metric */}
      <div className="flex flex-col text-right">
        <div className="flex items-center gap-1.5 justify-end">
          <span className="text-[10px] text-slate-400 font-mono select-none">
            {modelName} (UTC+3.5)
          </span>
          <span className="text-[11px] font-bold text-white leading-none">
            {isProcessing ? (
              <span className="text-purple-300 animate-pulse flex items-center gap-1">
                در حال پردازش هوشمند... 🤖
              </span>
            ) : status === "connected" ? (
              <span className="text-emerald-400">اتصال فیزیکی زنده</span>
            ) : status === "simulated" ? (
              <span className="text-amber-300">موتور شبیه‌ساز ممتاز</span>
            ) : (
              <span className="text-rose-400">خطای اتصال سرور</span>
            )}
          </span>
        </div>

        <div className="flex items-center justify-end gap-1 text-[9px] text-slate-500 font-mono mt-0.5">
          <span>تأخیر رفت و برگشت:</span>
          {latency !== null ? (
            <span className={`font-bold ${status === "connected" ? "text-emerald-400" : status === "simulated" ? "text-amber-300" : "text-rose-400"}`}>
              {status === "simulated" ? `${latency}ms (محلی)` : `${latency}ms`}
            </span>
          ) : (
            <span>در حال سنجش...</span>
          )}
          <Activity size={9} className="text-slate-600 animate-pulse mr-0.5" />
        </div>
      </div>

      {/* 3. Helper status icon */}
      <div className="p-1.5 bg-white/5 rounded-lg border border-white/5 text-slate-400">
        {isProcessing ? (
          <Sparkles size={11} className="text-purple-400 animate-spin" />
        ) : status === "connected" ? (
          <CheckCircle size={11} className="text-emerald-400" />
        ) : status === "simulated" ? (
          <Sparkles size={11} className="text-amber-400" />
        ) : (
          <AlertTriangle size={11} className="text-rose-400 animate-bounce" />
        )}
      </div>
    </div>
  );
}
