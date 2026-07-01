/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { User, QueueState, QueueStage, ApplicantStatus } from "../types.js";
import { 
  Award, Clock, Sliders, Play, RefreshCw, CheckCircle2, ChevronDown, 
  ChevronUp, Sparkles, AlertCircle, ShieldAlert, Mic, Square
} from "lucide-react";
import { getPersianDateTimeString } from "../lib/dateUtils.js";

interface JudgePanelProps {
  user: User;
}

export default function JudgePanel({ user }: JudgePanelProps) {
  const [queue, setQueue] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // Parameter sliders (1 to 10 each, default to 5)
  const [params, setParams] = useState({
    clarity: 5,
    confidence: 5,
    tone: 5,
    vocabulary: 5,
    structure: 5,
    expression: 5,
    bodyLanguage: 5,
    eyeContact: 5
  });

  // Calculate weighted score in real-time
  const totalScore = parseFloat(
    (
      (params.clarity * 0.15) +
      (params.confidence * 0.15) +
      (params.tone * 0.15) +
      (params.vocabulary * 0.1) +
      (params.structure * 0.1) +
      (params.expression * 0.15) +
      (params.bodyLanguage * 0.1) +
      (params.eyeContact * 0.1)
    ).toFixed(2)
  );

  const [judgeDesc, setJudgeDesc] = useState("");
  const [messageToTahani, setMessageToTahani] = useState("");
  const [sessionStartTime, setSessionStartTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [prevHistory, setPrevHistory] = useState<any>(null);

  // --- Audio Recording & Gemini conversion States ---
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState("");
  const [recordingError, setRecordingError] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);

  const startVoiceRecording = async () => {
    try {
      setRecordingError("");
      setAudioBlob(null);
      setTranscriptionResult("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let mimeType = "audio/webm";
      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType });
      } catch (e) {
        mediaRecorder = new MediaRecorder(stream);
      }
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const type = mediaRecorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("شروع ضبط صوتی با خطا مواجه شد:", err);
      setRecordingError("دسترسی به میکروفون داده نشده یا دستگاه صوتی یافت نشد.");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const transcribeAudioNote = async () => {
    if (!audioBlob) return;
    setIsTranscribing(true);
    setRecordingError("");
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        try {
          const base64Data = (reader.result as string).split(",")[1];
          const response = await fetch("/api/judge/transcribe-audio", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              audio: base64Data,
              mimeType: audioBlob.type || "audio/webm"
            })
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "خطای نامشخص در تبدیل صوت");
          }

          const data = await response.json();
          setTranscriptionResult(data.text);
        } catch (errIn: any) {
          console.error(errIn);
          setRecordingError(errIn.message || "خطا در برقراری ارتباط با سرور هوش مصنوعی.");
        } finally {
          setIsTranscribing(false);
        }
      };
    } catch (err: any) {
      console.error(err);
      setRecordingError("خطا در خواندن فایل صوتی.");
      setIsTranscribing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 5-second Hold-to-Submit States
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [holdMsg, setHoldMsg] = useState("شاسی ثبت داوری صوتی را نگه دارید (۵ ثانیه)");
  const [showConfirm, setShowConfirm] = useState(false);

  const keyTimerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);

  const fetchJudgeQueue = async () => {
    try {
      const res = await fetch("/api/queue");
      const d = await res.json();
      setQueue(d);

      if (selectedItem) {
        const item = d.find((q: any) => q.applicantId === selectedItem.applicantId);
        if (item) setSelectedItem(item);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchJudgeQueue();
    const interval = setInterval(fetchJudgeQueue, 5000);
    return () => {
      clearInterval(interval);
      clearHoldStates();
    };
  }, []);

  const clearHoldStates = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (keyTimerRef.current) clearTimeout(keyTimerRef.current);
    intervalRef.current = null;
    keyTimerRef.current = null;
  };

  const handlePullJudge = async (item: any) => {
    try {
      const res = await fetch("/api/queue/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantId: item.applicantId,
          operatorId: user.id
        })
      });

      if (res.ok) {
        setSessionStartTime(new Date().toISOString());
        fetchJudgeQueue();
        const updated = { ...item, isWaiting: false, assignedOperatorId: user.id };
        setSelectedItem(updated);
        // Reset Judge form
        setParams({
          clarity: 5,
          confidence: 5,
          tone: 5,
          vocabulary: 5,
          structure: 5,
          expression: 5,
          bodyLanguage: 5,
          eyeContact: 5
        });
        setJudgeDesc("");
        setHoldProgress(0);
        setHoldMsg("شاسی ثبت داوری صوتی را نگه دارید (۵ ثانیه)");

        // Fetch cumulative stages folder history
        const hRes = await fetch(`/api/applicants/${item.applicantId}/timeline`);
        const hObj = await hRes.json();
        setPrevHistory(hObj);
      }
    } catch (er) {
      console.error(er);
    }
  };

  // --- 5 SECONDS HOLD SUBMIT GESTURES ---
  const handleHoldStart = () => {
    if (!selectedItem) return;
    if (!judgeDesc) {
      setHoldMsg("⚠️ گزارش قضاوت و شرح سناریوی تریبون صوتی الزامی است.");
      return;
    }

    setIsHolding(true);
    setHoldMsg("سیستم داوری در حال سنجش تراکنش...");
    let elapsed = 0;
    const totalMs = 5000;
    const stepMs = 50;

    intervalRef.current = setInterval(() => {
      elapsed += stepMs;
      const pct = Math.min((elapsed / totalMs) * 100, 100);
      setHoldProgress(pct);
      setHoldMsg(`در حال قفل‌گشایی... ${Math.ceil((totalMs - elapsed) / 1000)} ثانیه`);

      if (pct >= 100) {
        clearHoldStates();
        setIsHolding(false);
        setHoldProgress(100);
        setHoldMsg("سیستم باز شد! آماده برای تحویل.");
        setShowConfirm(true);
      }
    }, stepMs);
  };

  const handleHoldEnd = () => {
    if (!isHolding) return;
    clearHoldStates();
    setIsHolding(false);
    setHoldProgress(0);
    setHoldMsg("ثبت ارزیابی صوتی را نگه دارید (۵ ثانیه)");
  };

  const executeHandoff = async () => {
    if (!selectedItem) return;
    setIsSubmitting(true);
    setShowConfirm(false);

    try {
      const payload = {
        testStart: sessionStartTime,
        paramClarity: params.clarity,
        paramConfidence: params.confidence,
        paramTone: params.tone,
        paramVocabulary: params.vocabulary,
        paramStructure: params.structure,
        paramExpression: params.expression,
        paramBodyLanguage: params.bodyLanguage,
        paramEyeContact: params.eyeContact,
        totalScore,
        messageToTahani
      };

      const res = await fetch("/api/queue/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantId: selectedItem.applicantId,
          currentStage: selectedItem.currentStage,
          nextStage: QueueStage.RESULT, // transition to final results Stage 6
          operatorId: user.id,
          operatorNotes: judgeDesc,
          payload
        })
      });

      if (res.ok) {
        setSelectedItem(null);
        setJudgeDesc("");
        setMessageToTahani("");
        setHoldProgress(0);
        setHoldMsg("ثبت ارزیابی صوتی را نگه دارید (۵ ثانیه)");
        fetchJudgeQueue();
      } else {
        const d = await res.json();
        alert(d.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const judgeQueueItems = queue.filter(q => q.currentStage === QueueStage.TEST || q.currentStage === QueueStage.WAITING_3);

  const parameterListFA = [
    { key: "clarity", name: "وضوح کلامی و تارهای صوتی (وزن %۱۵)" },
    { key: "confidence", name: "اعتماد به نفس و کنترل استرس بدنی (وزن %۱۵)" },
    { key: "tone", name: "لحن و فراز و فرود آهنگ صدا (وزن %۱۵)" },
    { key: "vocabulary", name: "گستره دایره لغات ادبیات (وزن %۱۰)" },
    { key: "structure", name: "ساختار منظم سناریوی بداهه (وزن %۱۰)" },
    { key: "expression", name: "قدرت تعبیر، تصویرسازی و مکاتبات (وزن %۱۵)" },
    { key: "bodyLanguage", name: "زبان بدن و حرکات چشمگیر (وزن %۱۰)" },
    { key: "eyeContact", name: "ارتباط چشمی مستقیم با هیئت داوری (وزن %۱۰)" }
  ];

  return (
    <div id="judge-panel" className="space-y-6 animate-fade-in text-right">
      
      {/* Banner Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Award className="text-amber-500 ml-1" size={22} />
            اتاق سنجش و تریبون مسابقه داوری اصلی (آقای کاظمی)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            سنجش تخصصی ۸ پارامتر سخنوری، محاسبه هوشمند معدل بیان و فراخوانی موتور هوش مصنوعی ترکیب ممیزی
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column: Waiting Queue for step 5 */}
        <div className="lg:col-span-4 glass-panel p-6 rounded-2xl border border-slate-800">
          <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3 mb-4 flex items-center gap-1.5">
            <Clock size={16} className="text-amber-500" />
            صف مراجعین جلو تریبون مسابقه ({judgeQueueItems.length} نفر)
          </h3>

          <div className="space-y-2">
            {judgeQueueItems.map((item) => {
              const isLockedByMe = item.assignedOperatorId === user.id;
              const isLockedByOther = item.assignedOperatorId && item.assignedOperatorId !== user.id;

              return (
                <div key={item.id} className="bg-slate-950 p-4 rounded-xl border border-slate-900 flex justify-between items-center hover:border-slate-800 transition">
                  <div>
                    <h4 className="text-xs font-bold text-white">{item.applicant?.fullName}</h4>
                    <p className="text-[10px] text-slate-550 mt-1 font-mono">کد ملی: {item.applicant?.nationalId}</p>
                  </div>
                  {isLockedByMe ? (
                    <button onClick={() => setSelectedItem(item)} className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-amber-450">
                      ثبت نمرات
                    </button>
                  ) : isLockedByOther ? (
                    <span className="text-[10px] text-slate-650">همکار قفل</span>
                  ) : (
                    <button onClick={() => handlePullJudge(item)} className="px-3 py-1 bg-slate-900 hover:border-amber-500 border border-slate-800 text-amber-500 text-xs rounded-lg transition active:scale-95">
                      شروع آزمون
                    </button>
                  )}
                </div>
              );
            })}
            {judgeQueueItems.length === 0 && (
              <p className="text-xs text-slate-650 text-center py-6">متقاضی معلقی در آزمون تریبون یافت نشد.</p>
            )}
          </div>
        </div>

        {/* Right column: Speech param sliders, dynamic gold Circular gauge, and holding secure key */}
        <div className="lg:col-span-8">
          {selectedItem ? (
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6 animate-slide-up">
              
              <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                <span className="text-sm font-extrabold text-amber-500 font-sans flex items-center gap-1.5">
                  <Award size={16} />
                  داور صوتی: جناب کاظمی
                </span>
                <div>
                  <h3 className="text-md font-bold text-white">آزمون صوتی متقاضی: {selectedItem.applicant?.fullName}</h3>
                  <p className="text-[10px] text-slate-550 font-mono mt-0.5">آکادمی هدهد • تفکیک کلامی</p>
                </div>
              </div>

              {/* Accordion timeline history (calls, reception notes, consultation logs) */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-900">
                <button 
                  onClick={() => setHistoryOpen(!historyOpen)}
                  className="w-full flex justify-between items-center text-xs font-bold text-slate-350"
                >
                  {historyOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  <span>بررسی سوابق تراز سنجش‌های قبلی این مراجع</span>
                </button>
                {historyOpen && prevHistory && (
                  <div className="mt-4 pt-3 border-t border-slate-900/60 text-xs space-y-3 max-h-56 overflow-y-auto leading-relaxed text-slate-400">
                    <div>
                      <span className="text-amber-500 font-bold block">۱. یادداشت تماس صوتی اولیه:</span>
                      <p className="mt-1">{prevHistory.contacts?.[0]?.operatorNotes || "بدون شرح تماس"}</p>
                    </div>
                    <div>
                      <span className="text-emerald-400 font-bold block">۲. یادداشت پذیرش رفتار:</span>
                      <p className="mt-1">{prevHistory.receptions?.[0]?.operatorNotes || "بدون یادداشت فیزیکی"}</p>
                    </div>
                    <div>
                      <span className="text-purple-400 font-bold block">۳. گزارش پرسشنامه مشاور (معصومی):</span>
                      <p className="mt-1 font-sans">{prevHistory.consultations?.[0]?.consultantNotes || "بدون یادداشت مشاوره"}</p>
                    </div>
                    <div>
                      <span className="text-cyan-400 font-bold block">۴. یادداشت متمم اتاق انتظار تبلیغاتی:</span>
                      <p className="mt-1">{prevHistory.middleRooms?.[0]?.briefingNotes || "بدون یادداشت متمم"}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Sliders Grid & Score circular indicator */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                
                {/* Sliders block (8 parameters) */}
                <div className="md:col-span-8 space-y-4">
                  {parameterListFA.map((item) => {
                    const k = item.key as keyof typeof params;
                    return (
                      <div key={item.key} className="space-y-1 bg-slate-900/30 p-2.5 rounded-xl border border-slate-850/40 text-right">
                        <div className="flex justify-between items-center">
                          <span className="text-amber-400 font-mono font-bold">{params[k]} از ۱۰</span>
                          <span className="text-xs text-slate-300 font-medium">{item.name}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="1"
                          value={params[k]}
                          onChange={(e) => setParams({ ...params, [k]: Number(e.target.value) })}
                          className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Score circular indicators (glowing gold gauge) */}
                <div className="md:col-span-4 flex flex-col items-center justify-center p-6 bg-slate-950/60 rounded-2xl border border-slate-900 text-center space-y-3 h-full">
                  <span className="text-[10px] text-slate-500 block">معدل سنجش هوش سخنوری</span>
                  
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    {/* SVG Gauge circle */}
                    <svg className="absolute w-full h-full -rotate-90">
                      <circle cx="64" cy="64" r="50" stroke="#101827" strokeWidth="8" fill="transparent" />
                      <circle 
                        cx="64" 
                        cy="64" 
                        r="50" 
                        stroke="#C9A84C" 
                        strokeWidth="8" 
                        fill="transparent" 
                        strokeDasharray="314"
                        strokeDashoffset={314 - (314 * totalScore) / 10}
                        className="transition-all duration-300 ease-out"
                      />
                    </svg>

                    <div className="flex flex-col items-center">
                      <span className="text-3xl font-extrabold text-white font-mono">{totalScore}</span>
                      <span className="text-[10px] text-amber-500 mt-1">از ۱۰</span>
                    </div>
                  </div>

                  <span className="text-xs text-slate-400 font-bold font-sans mt-2 block">
                    {totalScore >= 8 ? "سطح فوق‌العاده و پیشرفته" : totalScore >= 6 ? "سطح متوسط و مستعد رشد" : "بخش مقدماتی و نیاز مبرم به آموزش"}
                  </span>
                </div>

              </div>

              {/* Judge's Narrative notes block */}
              <div className="space-y-4 mt-4 text-right">
                
                {/* Voice Note Recording & Gemini Auto-Transcribe */}
                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-900 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                      <Sparkles size={11} className="animate-pulse" />
                      موتور پردازش صوتی هوشمند Gemini
                    </span>
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Mic size={14} className={isRecording ? "text-red-500 animate-pulse" : "text-amber-500"} />
                      ضبط یادداشت صوتی داور (تبدیل به متن)
                    </label>
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    {/* Recording controls */}
                    <div className="flex items-center gap-2">
                      {!isRecording ? (
                        <button
                          type="button"
                          onClick={startVoiceRecording}
                          disabled={isTranscribing}
                          className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Mic size={13} className="text-rose-500" />
                          شروع ضبط
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={stopVoiceRecording}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Square size={13} className="text-red-500 animate-pulse" />
                          توقف ضبط
                        </button>
                      )}

                      {audioBlob && !isRecording && (
                        <button
                          type="button"
                          onClick={transcribeAudioNote}
                          disabled={isTranscribing}
                          className="px-3 py-1.5 bg-amber-500 text-slate-950 hover:bg-amber-450 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {isTranscribing ? (
                            <RefreshCw size={13} className="animate-spin" />
                          ) : (
                            <Sparkles size={13} />
                          )}
                          تبدیل صوت به متن با Gemini ✨
                        </button>
                      )}
                    </div>

                    {/* Audio Status Indicator */}
                    <div className="flex items-center gap-2 font-mono text-xs">
                      {isRecording && (
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                          <span className="text-red-400 font-bold">{formatDuration(recordingDuration)}</span>
                        </div>
                      )}
                      {!isRecording && audioBlob && (
                        <span className="text-slate-400">فایل صوتی ضبط شد ({audioBlob.size > 1024 ? `${(audioBlob.size / 1024).toFixed(1)} KB` : `${audioBlob.size} B`})</span>
                      )}
                      {!isRecording && !audioBlob && (
                        <span className="text-slate-500 text-[11px]">میکروفون آماده است</span>
                      )}
                    </div>
                  </div>

                  {recordingError && (
                    <p className="text-[11px] text-red-500 bg-red-500/10 p-2 rounded-lg border border-red-500/20">{recordingError}</p>
                  )}

                  {/* Transcription result display and utilities */}
                  {transcriptionResult && (
                    <div className="space-y-2 bg-slate-900/40 p-3 rounded-xl border border-slate-850 animate-fade-in">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-1.5 mb-1.5">
                        <span className="text-[10px] text-emerald-400 font-bold">✓ تبدیل موفق با هوش مصنوعی</span>
                        <span className="text-[11px] text-slate-400">متن استخراج‌شده از صوت شما:</span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed text-right bg-slate-950 p-2.5 rounded border border-slate-900">{transcriptionResult}</p>
                      
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setJudgeDesc(prev => prev ? `${prev}\n${transcriptionResult}` : transcriptionResult);
                            setTranscriptionResult("");
                          }}
                          className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-bold transition cursor-pointer"
                        >
                          ➕ الحاق به انتهای شرح داوری
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setJudgeDesc(transcriptionResult);
                            setTranscriptionResult("");
                          }}
                          className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-[10px] font-bold transition cursor-pointer"
                        >
                          🔄 جایگزین کردن شرح داوری
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-slate-500">مکتوب شرح داوری رسمی کاظمی (ثبت دائم)</span>
                    <label className="block text-xs text-slate-400">شرح داوری و نقاط قوت/ضعف بیانی متقاضی</label>
                  </div>
                  <textarea
                    value={judgeDesc}
                    onChange={(e) => setJudgeDesc(e.target.value)}
                    rows={4}
                    placeholder="در سخنرانی بداهه، مدیریت تپق متوسط بود. لرزش صدا شدید و عدم قفل چشم‌ها روی هیئت داوران مشهود است. دامنه لغات گسترده است اما نیازمند ارتقاء زبان بدن است..."
                    className="w-full px-4 py-3 glass-input text-xs focus:outline-none leading-relaxed text-right placeholder:text-slate-500 text-slate-200"
                  />
                </div>

                <div className="space-y-2 border-t border-white/5 pt-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-pink-500">🔒 محرمانه و بدون رویت متقاضی</span>
                    <label className="block text-xs text-pink-400 font-bold">پیام خصوصی و فوری داور به خانم طحانی (سرارزیابی)</label>
                  </div>
                  <textarea
                    value={messageToTahani}
                    onChange={(e) => setMessageToTahani(e.target.value)}
                    rows={2}
                    placeholder="خانم طحانی عزیز، این مراجع پتانسیل شدیدی دارد اما استرس مالی کلام دارد. آفر دوره نخبگان را با تخفیف ویژه به او ارائه کنید..."
                    className="w-full px-4 py-2.5 bg-pink-950/10 border border-pink-500/20 text-[11px] focus:border-pink-500 rounded-2xl outline-none leading-relaxed text-right placeholder:text-slate-600 text-pink-100"
                  />
                </div>
              </div>

              {/* 5-SECOND PRESS-AND-HOLD SECURE SYSTEM */}
              <div className="pt-4 border-t border-slate-855 flex flex-col items-center justify-center space-y-3 w-full">
                
                {/* Dynamic Hold Notification Header */}
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isHolding ? 'bg-amber-500 animate-ping' : 'bg-slate-700'}`} />
                  <span className={`text-xs font-bold font-sans transition-all duration-300 ${isHolding ? 'text-amber-400' : 'text-slate-400'}`}>
                    {holdMsg}
                  </span>
                </div>
                
                <div className="relative w-32 h-32 flex items-center justify-center group select-none touch-none">
                  
                  {/* Glowing Pulse Rings backdrops */}
                  <div className={`absolute inset-1 rounded-full bg-amber-500/5 transition-all duration-300 ${isHolding ? 'scale-110 opacity-100 blur-md' : 'scale-95 opacity-0'}`} />
                  <div className={`absolute inset-3 rounded-full bg-amber-500/10 transition-all duration-300 ${isHolding ? 'scale-125 opacity-30 blur' : 'scale-90 opacity-0'}`} />

                  {/* Scientific background ticks */}
                  <div className="absolute inset-0 border border-dashed border-slate-850 rounded-full opacity-65 animate-spin-slow pointer-events-none" />

                  {/* Background SVG Circle */}
                  <svg className="absolute w-full h-full -rotate-90 pointer-events-none select-none">
                    <circle cx="64" cy="64" r="50" stroke="#121827" strokeWidth="8" fill="transparent" />
                    <circle 
                      cx="64" 
                      cy="64" 
                      r="50" 
                      stroke={holdProgress >= 100 ? "#22C55E" : "#C9A84C"} 
                      strokeWidth="8" 
                      fill="transparent" 
                      strokeDasharray="314"
                      strokeDashoffset={314 - (314 * holdProgress) / 100}
                      className="transition-all duration-75 ease-out"
                      strokeLinecap="round"
                    />
                  </svg>

                  {/* Hold Trigger Button */}
                  <button
                    type="button"
                    onMouseDown={handleHoldStart}
                    onMouseUp={handleHoldEnd}
                    onMouseLeave={handleHoldEnd}
                    onTouchStart={handleHoldStart}
                    onTouchEnd={handleHoldEnd}
                    className={`w-24 h-24 bg-slate-950 border rounded-full font-black text-xs select-none shadow-2xl flex flex-col justify-center items-center gap-1.5 focus:outline-none transition-all duration-200 cursor-pointer pointer-events-auto ${
                      isHolding 
                        ? 'border-amber-500 bg-slate-1000 text-amber-300 scale-95 shadow-amber-500/10' 
                        : 'border-amber-500/30 text-amber-400 hover:border-amber-500 shadow-slate-950/80 hover:shadow-amber-500/5'
                    }`}
                  >
                    {isHolding ? (
                      <div className="text-center">
                        <span className="text-2xl font-mono block leading-none text-white animate-bounce">
                          {Math.max(1, Math.ceil((5000 - (holdProgress * 50)) / 1000))}
                        </span>
                        <span className="text-[9px] text-amber-400 mt-1 font-sans block">ثانیه دیگر</span>
                      </div>
                    ) : (
                      <>
                        <Clock size={18} className="text-amber-400 animate-pulse" />
                        <span className="text-[10px] tracking-tight">{holdProgress > 0 ? "رها شد" : "نگه دارید"}</span>
                      </>
                    )}
                  </button>

                  {/* Percentage Floating Indicator */}
                  <div className="absolute -bottom-1 bg-slate-900 border border-slate-800 text-white font-mono text-[9px] px-2 py-0.5 rounded-full shadow-lg font-bold">
                    {Math.ceil(holdProgress)}%
                  </div>

                </div>
                <p className="text-[10px] text-slate-550 leading-relaxed text-center max-w-sm pointer-events-none">
                  * سوئیچ محافظ ارگانیک: جهت تایید نهایی و ثبت داوری، انگشت خود را روی کلید طلایی قرار داده و به مدت ۵ ثانیه کامل نگه دارید.
                </p>
              </div>

            </div>
          ) : (
            <div className="glass-panel p-10 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs">
              متقاضی برای سنجش در این غرفه بارگذاری نشده است؛ لطفا از کاردار انتظار تریبون مسابقه یک پرونده را کلیک نمایید.
            </div>
          )}
        </div>

      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-filter backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 max-w-sm w-full space-y-4 text-center animate-scale-up">
            <div className="inline-flex p-3 bg-amber-500/10 rounded-full text-amber-400">
              <CheckCircle2 size={30} />
            </div>
            <h3 className="text-md font-bold text-white">ترخیص مراجع و پالس هوش مصنوعی</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              با تایید خروجی، معدل کل {totalScore} از ۱۰ مراجع {selectedItem?.applicant?.fullName} در سیستم کوئری دیتابیس ثبت شده و تحلیلگر Gemini آنالیز صوتی نهایی را فورا می‌سازد.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 bg-slate-900 border border-slate-800 text-slate-450 rounded-xl text-xs hover:text-white"
              >
                لغو
              </button>
              <button
                onClick={executeHandoff}
                disabled={isSubmitting}
                className="flex-1 py-2.5 btn-primary glow-on-hover rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer font-bold"
              >
                {isSubmitting ? <RefreshCw className="animate-spin" size={12} /> : null}
                آزادسازی و سنتز هوش مصنوعی
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
