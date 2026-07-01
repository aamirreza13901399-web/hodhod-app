/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, Applicant, QueueState, QueueStage, ApplicantStatus } from "../types.js";
import { 
  UserCheck, Search, Clock, CheckSquare, FileText, CheckCircle, 
  HelpCircle, AlertCircle, RefreshCw, AlertOctagon, HeartHandshake, ShieldAlert, X
} from "lucide-react";
import { getPersianDateTimeString } from "../lib/dateUtils.js";

interface ReceptionPanelProps {
  user: User;
}

export default function ReceptionPanel({ user }: ReceptionPanelProps) {
  const [queue, setQueue] = useState<any[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedQueueItem, setSelectedQueueItem] = useState<any | null>(null);

  // Form check-in action states
  const [formGiven, setFormGiven] = useState(false);
  const [questGiven, setQuestGiven] = useState(false);
  const [receptionNotes, setReceptionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [blockingError, setBlockingError] = useState<string | null>(null);

  // Time discrepancy & printing states
  const [editingAppointmentTime, setEditingAppointmentTime] = useState("");
  const [discrepancyReason, setDiscrepancyReason] = useState("");
  const [isAnalyzingDiscrepancy, setIsAnalyzingDiscrepancy] = useState(false);
  const [aiDiscrepancyResult, setAiDiscrepancyResult] = useState<{
    psychologicalProfile: string;
    iceBreakerTip: string;
  } | null>(null);

  const [showPrintModal, setShowPrintModal] = useState(false);

  const fetchQueueData = async () => {
    try {
      const res = await fetch("/api/queue");
      const data = await res.json();
      setQueue(data);

      if (selectedQueueItem) {
        // Keep selected item refreshed
        const updated = data.find((q: any) => q.applicantId === selectedQueueItem.applicantId);
        if (updated) setSelectedQueueItem(updated);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchQueueData();
    const interval = setInterval(fetchQueueData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedQueueItem) {
      setEditingAppointmentTime(selectedQueueItem.applicant?.appointmentTime || "");
      setDiscrepancyReason("");
      setAiDiscrepancyResult(null);
    }
  }, [selectedQueueItem?.applicantId]);

  const handlePullToReception = async (item: any) => {
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
        fetchQueueData();
        const updated = { ...item, isWaiting: false, assignedOperatorId: user.id };
        setSelectedQueueItem(updated);
        setBlockingError(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRelease = async (item: any) => {
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
        fetchQueueData();
        setSelectedQueueItem(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Stage transition with safety blocks
  const handleTransition = async (nextStage: QueueStage) => {
    if (!selectedQueueItem) return;
    setIsSubmitting(true);
    setBlockingError(null);

    try {
      const payload = {
        evaluationFormGiven: formGiven,
        questionnaireGiven: questGiven
      };

      const res = await fetch("/api/queue/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantId: selectedQueueItem.applicantId,
          currentStage: selectedQueueItem.currentStage,
          nextStage,
          operatorId: user.id,
          operatorNotes: receptionNotes,
          payload
        })
      });

      const outcome = await res.json();
      if (res.ok) {
        fetchQueueData();
        setSelectedQueueItem(null);
        setReceptionNotes("");
        setFormGiven(false);
        setQuestGiven(false);
      } else if (res.status === 409) {
        // TACKLE COLLISION ERROR
        setBlockingError(outcome.message || "گلوگاه شلوغ است.");
      } else {
        alert(outcome.error || "خطایی رخ داد.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filters Arrived physical scheduled meetings (either Stage.CONTACT done or Stage.RECEPTION active)
  const arrivedList = queue.filter(q => {
    // If they are in the CONTACT stage, they must have a scheduled appointment time to appear in Mrs. Zamani's Reception Panel
    if (q.currentStage === QueueStage.CONTACT && !q.applicant?.appointmentTime) {
      return false;
    }
    const isMatchedStage = q.currentStage === QueueStage.CONTACT || q.currentStage === QueueStage.RECEPTION || q.currentStage === QueueStage.WAITING_1;
    const matchesSearch = q.applicant?.fullName.includes(searchText) || q.applicant?.phone.includes(searchText) || q.applicant?.nationalId.includes(searchText);
    return isMatchedStage && matchesSearch;
  });

  return (
    <div id="reception-panel" className="space-y-6 animate-fade-in text-right">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <button
          type="button"
          onClick={() => setShowPrintModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 shadow-lg shadow-emerald-500/10 cursor-pointer"
        >
          <span>🖨️ چاپ شکیل فرآیند حضور امروز</span>
        </button>

        <div className="text-right">
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2 justify-end">
            پذیرش مراجعین حضوری و پایش سالن انتظار (خانم زمانی)
            <UserCheck className="text-emerald-500" size={22} />
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            ثبت ورود زمان‌بندی شده، تحویل فیزیکی پرسشنامه‌های خودارزیابی فن‌بیان و هدایت هوشمند صف به مشاورین آزاد
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Arrived Today Queue list */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 self-start">
              <Clock size={16} className="text-emerald-500" />
              مراجعین قرار ملاقات امروز ({arrivedList.length} نفر)
            </h3>
            
            <div className="relative w-full sm:max-w-xs self-end">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-600 pointer-events-none" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="جستجو با نام و کدملی..."
                className="w-full pl-8 pr-3 py-1.5 glass-input text-xs focus:outline-none text-right placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="space-y-3">
            {arrivedList.map((item) => {
              const app = item.applicant;
              const isLockedByMe = item.assignedOperatorId === user.id;
              const isLockedByOther = item.assignedOperatorId && item.assignedOperatorId !== user.id;

              // Calculate timer duration since arrival
              const waitDuration = Math.round((Date.now() - new Date(item.stageEnteredAt).getTime()) / 65000);
              const isLateColor = waitDuration > 15 ? 'text-red-400 bg-red-500/10 border-red-500/20' : waitDuration > 5 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

              return (
                <div key={item.id} className="bg-slate-950 p-4 rounded-xl border border-slate-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-800 transition">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      {app.fullName}
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-sans border ${isLateColor}`}>
                        {waitDuration > 0 ? `انتظار: ${waitDuration} دقیقه` : 'تازه ورود'}
                      </span>
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">
                      کد ملی: {app.nationalId} | موبایل: {app.phone} | مبدا: {app.city}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {/* Handoff actions */}
                    {item.currentStage === QueueStage.CONTACT ? (
                      <button 
                        onClick={() => handlePullToReception(item)}
                        className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-emerald-405 transition active:scale-95"
                      >
                        کلیک جهت ورود و پذیرش
                      </button>
                    ) : isLockedByMe ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRelease(item)}
                          className="px-3 py-2 bg-slate-900 border border-slate-800 hover:text-white rounded-xl text-xs text-slate-400 transition"
                        >
                          خروج ویرایش
                        </button>
                        <button
                          onClick={() => setSelectedQueueItem(item)}
                          className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-450 transition active:scale-95"
                        >
                          ثبت چک‌لیست پذیرش
                        </button>
                      </div>
                    ) : isLockedByOther ? (
                      <span className="text-[10px] text-slate-600 bg-slate-900/60 px-3 py-1 rounded-lg">
                        توسط همکار قفل شده
                      </span>
                    ) : (
                      <button 
                        onClick={() => handlePullToReception(item)}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-850 hover:border-emerald-500 text-slate-350 rounded-lg text-xs"
                      >
                        شروع پرونده‌پذیرش خانم زمانی
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {arrivedList.length === 0 && (
              <p className="text-xs text-slate-600 py-10 text-center">مراجع زمان‌بندی شده جدیدی در سالن انتظار ثبت نگردیده</p>
            )}
          </div>
        </div>

        {/* Right Side Check-in action drawer */}
        <div className="lg:col-span-5">
          {selectedQueueItem ? (
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6 animate-slide-up">
              
              <div className="border-b border-slate-850 pb-3">
                <h3 className="text-sm font-bold text-white">اقلام چک‌لیست پرونده {selectedQueueItem.applicant?.fullName}</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">ثبت فرم‌ها، رفتار مراجع و توزیع صف</p>
              </div>

              {/* APPOINTMENT MANUAL EDITOR & DISCREPANCY ANALYSIS PANEL */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 space-y-3.5">
                <div className="flex flex-row-reverse justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-300">ساعت حضور فیزیکی:</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {(() => {
                      try {
                        return new Date(selectedQueueItem.stageEnteredAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
                      } catch (e) {
                        return "نامشخص";
                      }
                    })()}
                  </span>
                </div>

                <div className="space-y-1.5 pt-1.5 border-t border-white/5">
                  <div className="flex justify-between items-center flex-row-reverse text-[11px] font-bold text-slate-300">
                    <span>ثبت/ویرایش ساعت مقرر نوبت:</span>
                    <span className="text-[10px] text-slate-500">(فرمت HH:MM مثلاً ۱۰:۳۰)</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/applicants/${selectedQueueItem.applicantId}/update-appointment`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              appointmentTime: editingAppointmentTime
                            })
                          });
                          if (res.ok) {
                            alert("ساعت مقرر نوبت مراجع با موفقیت بروزرسانی شد.");
                            fetchQueueData();
                          }
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="px-3 py-1 bg-brand-primary text-white text-[10px] font-bold rounded-lg transition active:scale-95 cursor-pointer"
                    >
                      ذخیره ساعت
                    </button>
                    <input
                      type="text"
                      placeholder="HH:MM"
                      value={editingAppointmentTime}
                      onChange={e => setEditingAppointmentTime(e.target.value)}
                      className="w-20 bg-slate-900 text-white border border-slate-800 rounded-lg px-2 py-1 text-center font-mono text-xs focus:border-brand-primary outline-none"
                    />
                  </div>
                </div>

                {/* DISCREPANCY LOGIC GAUGE */}
                {(() => {
                  const sTime = selectedQueueItem.applicant?.appointmentTime || "";
                  if (!sTime) return null;
                  
                  // Calculate diff minutes
                  const [h, m] = sTime.split(":").map(Number);
                  const schedMinutes = (h || 0) * 60 + (m || 0);

                  const entDate = new Date(selectedQueueItem.stageEnteredAt);
                  const actMinutes = entDate.getHours() * 60 + entDate.getMinutes();
                  const diff = actMinutes - schedMinutes;

                  // Exceeds 15 minutes limit either early or late
                  const hasDisc = Math.abs(diff) > 15;
                  if (!hasDisc) {
                    return (
                      <p className="text-[10px] bg-emerald-500/10 text-emerald-400 p-2 rounded-lg border border-emerald-500/10 text-right">
                        ✔ تطابق زمانی عالی: حضور منظم مراجع در محدوده مقرر نوبت.
                      </p>
                    );
                  }

                  return (
                    <div className="p-3 bg-amber-950/20 border border-amber-500/15 rounded-xl space-y-3 text-right">
                      <p className="text-[10px] text-amber-400 font-bold leading-relaxed">
                        ⚠️ اختلاف نوبت: این مراجع {Math.abs(diff)} دقیقه {diff > 0 ? "دیرتر (تأخیر)" : "زودتر (تعجیل)"} از نوبت مقرر حضور یافته است!
                      </p>

                      <div className="space-y-1.5 pt-1.5 border-t border-white/5">
                        <label className="block text-[9px] text-slate-400">علت اختلاف زمانی از زبان مراجع (یا نظر خانم زمانی):</label>
                        <textarea
                          value={discrepancyReason}
                          onChange={e => setDiscrepancyReason(e.target.value)}
                          placeholder="ترافیک سنگین، تداخل با شیفت کاری، مایل به حضور زودتر و مطالعه و غیره..."
                          rows={2}
                          className="w-full text-[10px] p-2 bg-slate-900 border border-slate-800 text-white rounded-lg focus:border-amber-400 outline-none leading-relaxed resize-none text-right"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={isAnalyzingDiscrepancy || !discrepancyReason}
                        onClick={async () => {
                          setIsAnalyzingDiscrepancy(true);
                          try {
                            const res = await fetch("/api/reception/analyze-discrepancy", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                applicantName: selectedQueueItem.applicant?.fullName,
                                scheduledTime: sTime,
                                actualTime: entDate.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
                                diffMinutes: diff,
                                reasonGiven: discrepancyReason
                              })
                            });
                            if (res.ok) {
                              const outcome = await res.json();
                              setAiDiscrepancyResult(outcome);
                              
                              // Auto Append to Mrs. Zamani's General Notes
                              const appendedText = `\n[تحلیل مغایرت نوبت هوش مصنوعی]: \nعلت حضور با تفاوت زمانی: "${discrepancyReason}" \nتحلیل روانشناختی: ${outcome.psychologicalProfile} \nتوصیه یخ‌شکنی ارزیاب‌ها: ${outcome.iceBreakerTip}`;
                              setReceptionNotes(prev => (prev ? prev + appendedText : appendedText.trim()));
                            }
                          } catch (err) {
                            console.error(err);
                          } finally {
                            setIsAnalyzingDiscrepancy(false);
                          }
                        }}
                        className="w-full py-1.5 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white text-[10px] font-black rounded-lg transition active:scale-95 disabled:opacity-40 flex justify-center items-center gap-1 cursor-pointer"
                      >
                        {isAnalyzingDiscrepancy ? <RefreshCw className="animate-spin" size={10} /> : "🧠 تحلیل عمیق روان‌شناختی تعجیل/تأخیر مراجع (AI)"}
                      </button>

                      {aiDiscrepancyResult && (
                        <div className="bg-slate-950 p-2.5 rounded-lg border border-white/5 space-y-2 text-[9px] animate-scale-up">
                          <p className="text-slate-300 leading-relaxed font-sans text-right">
                            <span className="text-amber-400 font-bold block mb-1">🔍 پروفایل واکاوی رفتار مراجع:</span>
                            {aiDiscrepancyResult.psychologicalProfile}
                          </p>
                          <p className="text-slate-350 leading-relaxed font-sans text-right border-t border-white/5 pt-1.5">
                            <span className="text-emerald-400 font-bold block mb-1">💬 تکنیک یخ‌شکنی ارائل‌شده به‌همکاران:</span>
                            {aiDiscrepancyResult.iceBreakerTip}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {blockingError && (
                <div className="p-3.5 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs leading-relaxed text-right flex items-start gap-2 animate-pulse">
                  <ShieldAlert size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold">خطای رزرو و همپوشانی اتاق:</p>
                    <p className="mt-0.5">{blockingError}</p>
                  </div>
                </div>
              )}

              {/* Checklist form checkboxes */}
              <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-900">
                <h4 className="text-xs font-bold text-amber-500">تاییدیه‌های تحویل بروشورهای سخنوری</h4>
                
                <label className="flex items-center gap-3 cursor-pointer group text-right">
                  <input
                    type="checkbox"
                    checked={formGiven}
                    onChange={(e) => setFormGiven(e.target.checked)}
                    className="w-4 h-4 bg-slate-900 border-slate-800 rounded focus:ring-emerald-500"
                  />
                  <span className="text-xs text-slate-300 group-hover:text-white select-none">
                    ۱. برگۀ ارزیابی فیزیکی (۸ معیار فن بیان) تحویل مراجع شد ✅
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group text-right pt-2 border-t border-slate-900">
                  <input
                    type="checkbox"
                    checked={questGiven}
                    onChange={(e) => setQuestGiven(e.target.checked)}
                    className="w-4 h-4 bg-slate-900 border-slate-800 rounded focus:ring-emerald-500"
                  />
                  <span className="text-xs text-slate-300 group-hover:text-white select-none">
                    ۲. فرم پرسشنامه خودشناسی صوتی هدهد تحویل مراجع شد ✅
                  </span>
                </label>
              </div>

              {/* Behavior Observations notes */}
              <div className="space-y-2">
                <label className="block text-xs text-slate-400">یادداشت‌های رفتاری اولیه پذیرش (خانم زمانی)</label>
                <textarea
                  value={receptionNotes}
                  onChange={(e) => setReceptionNotes(e.target.value)}
                  rows={4}
                  placeholder="متقاضی بسیار مشتاق و محترم است؛ هرچند لرزش جزئی دست در اثر هیجان و استرس هنگام ثبت نام مشهود بود..."
                  className="w-full px-3 py-2 glass-input text-xs focus:outline-none leading-relaxed text-right"
                />
              </div>

              {/* Actions transition */}
              <div className="space-y-3 pt-3 border-t border-slate-850/60">
                <button
                  onClick={() => handleTransition(QueueStage.CONSULTATION)}
                  disabled={isSubmitting || !receptionNotes || !formGiven || !questGiven}
                  className="w-full py-3 btn-primary glow-on-hover font-bold rounded-xl transition text-xs flex justify-center items-center gap-1 active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  {isSubmitting ? <RefreshCw className="animate-spin" size={12} /> : null}
                  هدایت به مشاور ارشد (آقای معصومی)
                </button>
                <button
                  onClick={() => handleTransition(QueueStage.WAITING_1)}
                  disabled={isSubmitting || !receptionNotes}
                  className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-200 rounded-xl text-xs transition active:scale-95 disabled:opacity-40"
                >
                  حفظ در سالن انتظار (شماره ۱)
                </button>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg text-[10px] text-slate-600 leading-relaxed text-center">
                * دکمه ثبت مشاور بررسی می‌کند که جناب آقای معصومی فارغ از ارباب رجوع قبلی بوده و مراجعین مجاز به همپوشانی غرفه نخواهند بود.
              </div>

            </div>
          ) : (
            <div className="glass-panel p-10 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs">
              یکی از همکاران یا ترازهای صف در انتظار امروز را کلیک کرده، گزینۀ پذیرش بروشورها را چک نهایی نموده و به مشاورین هدایت کنید.
            </div>
          )}
        </div>

      </div>

      {/* FLOATING DAILY SCHEDULE PRINT MODAL */}
      {showPrintModal && (
        <div 
          onClick={() => setShowPrintModal(false)}
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto cursor-zoom-out"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white text-slate-900 rounded-3xl p-8 max-w-4xl w-full text-right shadow-2xl relative border border-slate-200 my-8 cursor-default"
          >
            
            {/* Top Right 'X' Close Button */}
            <button
              onClick={() => setShowPrintModal(false)}
              className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 print:hidden transition cursor-pointer"
              title="بستن"
            >
              <X size={20} />
            </button>

            {/* Control buttons (hidden during print) */}
            <div className="absolute left-6 top-6 flex gap-2 print:hidden z-10">
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md"
              >
                <span>🖨️ تایید و پرینت نوبت‌ها</span>
              </button>
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                بستن پیش‌نمایش
              </button>
            </div>

            {/* Print Header */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6 pt-6">
              <div className="flex justify-between items-center flex-row-reverse">
                <div className="text-right">
                  <h2 className="text-2xl font-black text-slate-900">موسسه آموزشی و ارزیابی هدهد ایران</h2>
                  <p className="text-xs text-slate-500 mt-1 font-sans font-bold">جدول اختصاصی (A4) زمان‌بندی نوبت‌های متقاضیان امروز</p>
                </div>
                <div className="text-left text-xs font-mono text-slate-600 space-y-1">
                  <p className="font-bold">کدرق تبار: HOD-ZAMANI-RECEPTION</p>
                  <p>زمان چاپ گزارش کتبی: <span className="font-semibold">{getPersianDateTimeString()}</span></p>
                  <p className="text-[10px] text-slate-400">شناسه سیستم: {Math.random().toString(36).substr(2, 6).toUpperCase()}-A4</p>
                </div>
              </div>
            </div>

            {/* Info Metrics Table */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 text-right">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block">تاریخ پایش:</span>
                <span className="text-xs font-bold text-slate-800 font-mono">امروز ({getPersianDateTimeString().split(" ")[0]})</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block">اپراتور صادرکننده:</span>
                <span className="text-xs font-bold text-emerald-700">{user.fullName} (میز پذیرش)</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block">تعداد ملاقات فعال صف:</span>
                <span className="text-xs font-bold text-slate-800 font-mono">
                  {queue.filter(q => {
                    if (q.currentStage === QueueStage.CONTACT && !q.applicant?.appointmentTime) return false;
                    return q.currentStage === QueueStage.CONTACT || q.currentStage === QueueStage.RECEPTION || q.currentStage === QueueStage.WAITING_1;
                  }).length} نفر
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block">مغایرت غیرمجاز زمانی:</span>
                <span className="text-xs font-bold text-red-600 font-mono">
                  {queue.filter(q => {
                    if (!q.applicant?.appointmentTime) return false;
                    const parts = q.applicant.appointmentTime.split(":");
                    const sch = (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0);
                    const entDate = new Date(q.stageEnteredAt);
                    const act = entDate.getHours() * 60 + entDate.getMinutes();
                    return Math.abs(act - sch) > 15;
                  }).length} مراجع
                </span>
              </div>
            </div>

            {/* List Table */}
            <div className="overflow-x-auto border-2 border-slate-900 rounded-2xl mb-6">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-white border-b-2 border-slate-900 text-xs font-black">
                    <th className="p-3 text-center w-12 border-l border-slate-800">ردیف</th>
                    <th className="p-3 border-l border-slate-800">نام متقاضی (فرد)</th>
                    <th className="p-3 border-l border-slate-800 text-center">ساعت دقیق نوبت</th>
                    <th className="p-3 border-l border-slate-800 text-center">تنظیم‌کننده نوبت</th>
                    <th className="p-3 border-l border-slate-800 text-center">کد ملی</th>
                    <th className="p-3 border-l border-slate-800 text-center">زمان مراجعه حضوری</th>
                    <th className="p-3 border-l border-slate-800 text-center">وضعیت تأخیر</th>
                    <th className="p-3 text-center">توضیح اولیه</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs text-slate-900">
                  {queue.filter(item => {
                    if (item.currentStage === QueueStage.CONTACT && !item.applicant?.appointmentTime) {
                      return false;
                    }
                    return item.currentStage === QueueStage.CONTACT || item.currentStage === QueueStage.RECEPTION || item.currentStage === QueueStage.WAITING_1;
                  }).map((item, index) => {
                    const app = item.applicant;
                    const sTime = app?.appointmentTime || "-";
                    let aTime = "-";
                    let diffText = "-";
                    let diffColor = "text-slate-500 font-medium";

                    if (app?.appointmentTime && item.stageEnteredAt) {
                      try {
                        const parts = app.appointmentTime.split(":");
                        const sch = (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0);
                        const entDate = new Date(item.stageEnteredAt);
                        const act = entDate.getHours() * 60 + entDate.getMinutes();
                        const diffMin = act - sch;
                        
                        aTime = entDate.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
                        
                        if (Math.abs(diffMin) <= 15) {
                          diffText = "منظم (بقا)";
                          diffColor = "text-emerald-600 font-black";
                        } else {
                          diffText = `${Math.abs(diffMin)} دقیقه ${diffMin > 0 ? "تأخیر" : "تعجیل"}`;
                          diffColor = "text-amber-600 font-black";
                        }
                      } catch (err) {
                        console.error(err);
                      }
                    }

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition border-b border-slate-200">
                        <td className="p-3 text-center border-l border-slate-200 font-mono font-bold text-slate-850">{index + 1}</td>
                        <td className="p-3 border-l border-slate-200 font-semibold text-slate-950">{app?.fullName}</td>
                        <td className="p-3 border-l border-slate-200 text-center font-mono font-bold text-slate-900 bg-slate-50/50">{sTime}</td>
                        <td className="p-3 border-l border-slate-200 text-center font-bold text-blue-800">{app?.appointmentScheduledBy || "سیستم هدهد"}</td>
                        <td className="p-3 border-l border-slate-200 text-center font-mono text-slate-700">{app?.nationalId}</td>
                        <td className="p-3 border-l border-slate-200 text-center font-mono text-slate-800">{aTime}</td>
                        <td className={`p-3 border-l border-slate-200 text-center ${diffColor}`}>{diffText}</td>
                        <td className="p-3 text-slate-600 max-w-xs leading-relaxed text-right text-[10px]">
                          {item.operatorNotes || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Signatures block */}
            <div className="mt-12 flex justify-between items-center flex-row-reverse text-xs pt-8 border-t border-dashed border-slate-400">
              <div className="text-center w-52 space-y-4">
                <p className="font-extrabold text-slate-900">مهر و تایید سرپرست ارشد:</p>
                <div className="text-[10px] text-slate-500 font-sans font-bold">(سرکار خانم مریم طحانی)</div>
              </div>
              <div className="text-center w-52 space-y-4">
                <p className="font-extrabold text-slate-900">اپراتور تنظیم‌کننده گزارش:</p>
                <div className="text-[10px] text-emerald-700 font-sans font-bold">({user.fullName} - میز پذیرش)</div>
              </div>
              <div className="text-center w-52 space-y-4">
                <p className="font-extrabold text-slate-900">حوزه نظارت و بازرسی:</p>
                <div className="text-[10px] text-slate-500 font-sans font-bold">انستیتو روانشناختی کلامی هدهد</div>
              </div>
            </div>

            {/* Bottom Actions for easy dismissal */}
            <div className="mt-10 flex justify-center gap-3 print:hidden border-t border-slate-100 pt-6">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="px-6 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
              >
                خروج و بازگشت به پنل پذیرش خانم زمانی
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition active:scale-95 cursor-pointer shadow-md"
              >
                🖨️ چاپ نهایی گزارش (سند A4)
              </button>
            </div>

            {/* Print CSS override */}
            <style>{`
              @media print {
                html, body {
                  background: white !important;
                  color: black !important;
                  font-size: 11px !important;
                }
                #app-root, header, footer, .print\\:hidden {
                  display: none !important;
                }
                .fixed {
                  position: static !important;
                  background: transparent !important;
                  backdrop-filter: none !important;
                  box-shadow: none !important;
                  padding: 0 !important;
                  margin: 0 !important;
                }
                .bg-white {
                  background: transparent !important;
                  border: none !important;
                  padding: 1cm !important;
                  box-shadow: none !important;
                }
                table {
                  border-collapse: collapse !important;
                  width: 100% !important;
                }
                th, td {
                  border: 1px solid #1e293b !important;
                  color: black !important;
                }
              }
            `}</style>
          </div>
        </div>
      )}

    </div>
  );
}
