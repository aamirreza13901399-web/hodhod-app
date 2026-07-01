/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, QueueState, QueueStage, ApplicantStatus } from "../types.js";
import { 
  Activity, Clock, RefreshCw, Sparkles, CheckCircle2, ShieldAlert, AlertCircle 
} from "lucide-react";
import { getPersianDateTimeString } from "../lib/dateUtils.js";

interface MiddleRoomPanelProps {
  user: User;
}

export default function MiddleRoomPanel({ user }: MiddleRoomPanelProps) {
  const [queue, setQueue] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // Form states
  const [behaviorRemarks, setBehaviorRemarks] = useState("");
  const [promoNotes, setPromoNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [blockingError, setBlockingError] = useState<string | null>(null);
  const [aiReport, setAiReport] = useState<any>(null);
  const [sessionStartTime, setSessionStartTime] = useState("");

  const fetchMiddleQueue = async () => {
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
    fetchMiddleQueue();
    const interval = setInterval(fetchMiddleQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePullItem = async (item: any) => {
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
        fetchMiddleQueue();
        const updated = { ...item, isWaiting: false, assignedOperatorId: user.id };
        setSelectedItem(updated);
        setBehaviorRemarks("");
        setPromoNotes("");
        setAiReport(null);
        setBlockingError(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReleaseItem = async (item: any) => {
    try {
      const res = await fetch("/api/queue/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantId: item.applicantId,
          operatorId: user.id
        })
      });
      if (res.ok) {
        fetchQueueAndClose();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchQueueAndClose = () => {
    fetchMiddleQueue();
    setSelectedItem(null);
  };

  const handleSubmitMiddleRoom = async (nextStage: QueueStage) => {
    if (!selectedItem) return;
    setIsSubmitting(true);
    setBlockingError(null);

    try {
      const payload = {
        entryTime: sessionStartTime,
        promotionNotes: promoNotes
      };

      const res = await fetch("/api/queue/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantId: selectedItem.applicantId,
          currentStage: selectedItem.currentStage,
          nextStage,
          operatorId: user.id,
          operatorNotes: behaviorRemarks,
          payload
        })
      });

      const outcome = await res.json();
      if (res.ok) {
        setAiReport(outcome.aiAnalysis);
        fetchMiddleQueue();
        setSelectedItem(null);
        setBehaviorRemarks("");
        setPromoNotes("");
      } else if (res.status === 409) {
        setBlockingError(outcome.message || "اتاق داوری شلوغ است.");
      } else {
        alert(outcome.error || "خطایی رخ داد.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const middleRoomQueue = queue.filter(q => q.currentStage === QueueStage.MIDDLE_ROOM || q.currentStage === QueueStage.WAITING_2);

  return (
    <div id="middle-room-panel" className="space-y-6 animate-fade-in text-right">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Activity className="text-cyan-500 ml-1" size={22} />
            اتاق آموزش متمم و معرفی خدمات انستیتو (خانم رضایی)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            ارزیابی رفتاری در حاشیه انتظار، ثبت علایق آموزشی متقاضی صوتی و بهینه‌سازی قلاب‌های تبلیغاتی مراجع
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column: Waiting Queue for step 4 */}
        <div className="lg:col-span-4 glass-panel p-6 rounded-2xl border border-slate-800">
          <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3 mb-4 flex items-center gap-1.5">
            <Clock size={16} className="text-cyan-400" />
            صف مراجعین در انتظار سالن متمم ({middleRoomQueue.length} پرونده)
          </h3>

          <div className="space-y-2">
            {middleRoomQueue.map((item) => {
              const app = item.applicant;
              const isMe = item.assignedOperatorId === user.id;
              const isOther = item.assignedOperatorId && item.assignedOperatorId !== user.id;

              return (
                <div key={item.id} className="bg-slate-950 p-4 rounded-xl border border-slate-900 flex justify-between items-center hover:border-slate-800 transition">
                  <div>
                    <h4 className="text-xs font-bold text-white">{app?.fullName}</h4>
                    <p className="text-[10px] text-slate-550 mt-1 font-mono">شهر: {app?.city} | سن: {app?.age}</p>
                  </div>
                  {isMe ? (
                    <button onClick={() => setSelectedItem(item)} className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs">
                      ویرایش
                    </button>
                  ) : isOther ? (
                    <span className="text-[10px] text-slate-650">همکار قفل</span>
                  ) : (
                    <button onClick={() => handlePullItem(item)} className="px-3 py-1 bg-slate-900 border border-slate-850 text-cyan-400 text-xs rounded-lg transition active:scale-95">
                      ثبت و شروع
                    </button>
                  )}
                </div>
              );
            })}
            {middleRoomQueue.length === 0 && (
              <p className="text-xs text-slate-650 text-center py-6">متقاضی جدید در صف متمم وجود ندارد.</p>
            )}
          </div>
        </div>

        {/* Right column: Form entry and AI Marketing Hook Display */}
        <div className="lg:col-span-8">
          {selectedItem ? (
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6 animate-slide-up">
              
              <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                <span className="text-xs text-cyan-400 font-bold">اتاق میانی خانم رضایی</span>
                <div>
                  <h3 className="text-sm font-bold text-white">پرونده توجیهی متمم: {selectedItem.applicant?.fullName}</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-mono">کنترل زمان زنده تالار عمومی انتظار</p>
                </div>
              </div>

              {blockingError && (
                <div className="p-3.5 bg-red-950/40 border border-red-800/65 rounded-xl text-red-300 text-xs flex items-start gap-2">
                  <ShieldAlert size={14} className="mt-0.5 text-red-400" />
                  <div>
                    <p className="font-bold">تداخل در انتقال اتاق مسابقه صوتی:</p>
                    <p className="mt-0.5">{blockingError}</p>
                  </div>
                </div>
              )}

              {/* Behavior observations */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs text-slate-400">توضیحات رفتاری دقیق متقاضی (مثال: میزان پذیرش کلامی)</label>
                  <textarea
                    value={behaviorRemarks}
                    onChange={e => setBehaviorRemarks(e.target.value)}
                    rows={3}
                    placeholder="مقتدر به نظر می‌رسد، اما به محض گفتگو در مورد سخنرانی بداهه، واکنش‌های اضطرابی نشان داد..."
                    className="w-full px-3 py-2 glass-input text-xs focus:outline-none leading-relaxed text-right"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs text-slate-400">یادداشت‌های تبلیغاتی متمم (رویکردهای جذب و ترجیحات فروش)</label>
                  <textarea
                    value={promoNotes}
                    onChange={e => setPromoNotes(e.target.value)}
                    rows={3}
                    placeholder="بسیار علاقه‌مند به پکیج پرستیژ کلام؛ تاکید روی تخفیف‌های زمان‌دار ثبت نام حضوری فلوچارت طلایی انستیتو هدهد تاثیر شگرفی دارد..."
                    className="w-full px-3 py-2 glass-input text-xs focus:outline-none leading-relaxed text-right"
                  />
                </div>
              </div>

              {/* Gemini marketing Hook response */}
              {aiReport && (
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs space-y-2 animate-slide-up">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <Sparkles size={14} />
                    تحلیل قلاب فروش هوش مصنوعی (Gemini-AI):
                  </div>
                  <div className="text-slate-300 grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-right">
                    <div>
                      <span className="text-[10px] text-slate-500 block">انگیزه روانی اصلی:</span>
                      <p className="mt-0.5 text-slate-300 leading-relaxed">{aiReport.behavioralTrigger || "تسلط کاری و تایید شغلی"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">قلاب کلامی متمم:</span>
                      <p className="mt-0.5 text-slate-300 leading-relaxed">{aiReport.marketingHook || "ورود به ترم نخبگان کاریزما"}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Transition buttons */}
              <div className="space-y-3 pt-3 border-t border-slate-850/60">
                <button
                  onClick={() => handleSubmitMiddleRoom(QueueStage.TEST)}
                  disabled={isSubmitting || !behaviorRemarks || !promoNotes}
                  className="w-full py-3 btn-primary glow-on-hover font-bold rounded-xl text-xs flex justify-center items-center gap-1 transition active:scale-95 disabled:opacity-45 cursor-pointer"
                >
                  {isSubmitting ? <RefreshCw className="animate-spin" size={12} /> : null}
                  ارسال پرونده به اتاق داوری (آقای کاظمی)
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReleaseItem(selectedItem)}
                    className="flex-1 py-2 bg-slate-900 border border-slate-850 text-slate-400 rounded-xl text-xs text-center"
                  >
                    رهاسازی به انتظار متمم
                  </button>
                  <button
                    onClick={() => handleSubmitMiddleRoom(QueueStage.WAITING_2)}
                    disabled={isSubmitting || !behaviorRemarks}
                    className="flex-1 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 rounded-xl text-xs text-center"
                  >
                    ارسال به سالن انتظار صوتی دوم
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="glass-panel p-10 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs">
              متقاضی جدیدی جهت توجیه متمم و بارگذاری قلاب تبلیغاتی انتخاب نشده است؛ لطفا پرونده‌ای را از صف سمت چپ انتخاب نمایید.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
