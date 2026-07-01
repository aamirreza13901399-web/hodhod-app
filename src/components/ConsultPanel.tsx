/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { User, QueueState, QueueStage, ApplicantStatus } from "../types.js";
import { 
  HelpCircle, Sparkles, Clock, AlertCircle, Play, CheckCircle, 
  RefreshCw, X, ShieldAlert, FileMinus, ToggleLeft
} from "lucide-react";
import { getPersianDateTimeString } from "../lib/dateUtils.js";

interface ConsultPanelProps {
  user: User;
}

export default function ConsultPanel({ user }: ConsultPanelProps) {
  const [queue, setQueue] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // Auto-saved notes states
  const [consultNotes, setConsultNotes] = useState("");
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [lastAutoSaved, setLastAutoSaved] = useState<string | null>(null);

  // Questionnaire answers states
  const [answers, setAnswers] = useState<Record<string, string>>({
    fearOfPublicSpeaking: "5",
    clutteringSpeechSpeed: "متوسط",
    stutterCues: "خیر",
    breathControlStamina: "خوب",
    targetGoal: "مدیریت جلسات کاری و نفوذ کلام"
  });

  // Skip Consult States
  const [isSkipped, setIsSkipped] = useState(false);
  const [skipReason, setSkipReason] = useState("");

  // 5-second Hold-to-Submit States
  const [progress, setProgress] = useState(0); // 0 to 100
  const [isHolding, setIsHolding] = useState(false);
  const [holdMessage, setHoldMessage] = useState("شاسی تایید خروجی را نگه دارید (۵ ثانیه)");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<string>("");

  const holdTimerRef = useRef<any>(null);
  const progressIntervalRef = useRef<any>(null);

  const fetchConsultQueue = async () => {
    try {
      const res = await fetch("/api/queue");
      const data = await res.json();
      setQueue(data);

      if (selectedItem) {
        const fresh = data.find((q: any) => q.applicantId === selectedItem.applicantId);
        if (fresh) setSelectedItem(fresh);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchConsultQueue();
    const interval = setInterval(fetchConsultQueue, 5000);
    return () => {
      clearInterval(interval);
      clearHoldTimers();
    };
  }, []);

  // Autosave simulation on keypresses
  useEffect(() => {
    if (!consultNotes) return;
    const timeout = setTimeout(() => {
      setIsSavingDraft(true);
      setTimeout(() => {
        setIsSavingDraft(false);
        setLastAutoSaved(new Date().toLocaleTimeString("fa-IR"));
      }, 800);
    }, 3000);
    return () => clearTimeout(timeout);
  }, [consultNotes]);

  const handlePull = async (item: any) => {
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
        fetchConsultQueue();
        const updated = { ...item, isWaiting: false, assignedOperatorId: user.id };
        setSelectedItem(updated);
        // Reset form values
        setConsultNotes("");
        setIsSkipped(false);
        setSkipReason("");
        setAnswers({
          fearOfPublicSpeaking: "5",
          clutteringSpeechSpeed: "متوسط",
          stutterCues: "خیر",
          breathControlStamina: "خوب",
          targetGoal: "مدیریت جلسات کاری"
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- 5-SECOND PRESS-AND-HOLD INTERACTION HANDLERS ---
  const handleStartHold = () => {
    if (!selectedItem) return;
    if (!isSkipped && !consultNotes) {
      setHoldMessage("⚠️ خطا: نوشتن گزارش مشاوره الزامی است.");
      return;
    }
    if (isSkipped && !skipReason) {
      setHoldMessage("⚠️ خطا: علت عدم حضور ثبت شود.");
      return;
    }

    setIsHolding(true);
    setHoldMessage("در حال آماده‌سازی...");
    let elapsed = 0;
    const totalMs = 5000;
    const intervalMs = 50;

    progressIntervalRef.current = setInterval(() => {
      elapsed += intervalMs;
      const computedPercent = Math.min((elapsed / totalMs) * 100, 100);
      setProgress(computedPercent);
      setHoldMessage(`نگه دارید... ${Math.ceil((totalMs - elapsed) / 1000)} ثانیه`);

      if (computedPercent >= 100) {
        clearHoldTimers();
        setIsHolding(false);
        setProgress(100);
        setHoldMessage("قفل باز شد! پرونده آماده تایید است.");
        setShowConfirmModal(true);
      }
    }, intervalMs);
  };

  const clearHoldTimers = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    progressIntervalRef.current = null;
    holdTimerRef.current = null;
  };

  const handleCancelHold = () => {
    if (!isHolding) return;
    clearHoldTimers();
    setIsHolding(false);
    setProgress(0);
    setHoldMessage("نگه دارید (۵ ثانیه) برای آزادباش نهایی");
  };

  const executeTransition = async () => {
    if (!selectedItem) return;
    setIsSubmitting(true);
    setShowConfirmModal(false);

    try {
      const payload = {
        sessionStart: sessionStartTime,
        questionnaireAnswers: answers,
        consultationSkipped: isSkipped,
        skipReason
      };

      const res = await fetch("/api/queue/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantId: selectedItem.applicantId,
          currentStage: selectedItem.currentStage,
          nextStage: isSkipped ? QueueStage.DONE : QueueStage.WAITING_2, // if skip complete otherwise Waiting room 2
          operatorId: user.id,
          operatorNotes: consultNotes,
          payload
        })
      });

      if (res.ok) {
        setSelectedItem(null);
        setConsultNotes("");
        setProgress(0);
        setHoldMessage("شاسی تایید خروجی را نگه دارید (۵ ثانیه)");
        fetchConsultQueue();
      } else {
        const d = await res.json();
        alert(d.message || d.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // active queue items scheduled for CONSULTATION or WAITING_1
  const consultList = queue.filter(q => q.currentStage === QueueStage.CONSULTATION || q.currentStage === QueueStage.WAITING_1);

  return (
    <div id="consult-panel" className="space-y-6 animate-fade-in text-right">
      
      {/* Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <HelpCircle className="text-purple-500 ml-1" size={22} />
            اتاق مشاوره راهبردی و آنالیز سخنوری (آقای معصومی)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            ارزیابی تخصصی ترجیحات کلامی، رفع موانع ذهنی و ثبت پاسخ‌های نظرسنجی از فن‌بیان مراجع با تاییدیه ایمن ۵ ثانیه‌ای
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Consult queue waiting list */}
        <div className="lg:col-span-4 glass-panel p-6 rounded-2xl border border-slate-800">
          <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3 mb-4 flex items-center gap-1.5">
            <Clock size={16} className="text-purple-400" />
            مراجعین در صف انتظار مشاوره ({consultList.length} نفر)
          </h3>

          <div className="space-y-2">
            {consultList.map((item) => {
              const isMe = item.assignedOperatorId === user.id;
              const isOther = item.assignedOperatorId && item.assignedOperatorId !== user.id;

              return (
                <div key={item.id} className="bg-slate-950 p-4 rounded-xl border border-slate-900 flex justify-between items-center hover:border-slate-800 transition text-right">
                  <div>
                    <h4 className="text-xs font-bold text-white">{item.applicant?.fullName}</h4>
                    <p className="text-[10px] text-slate-550 mt-1 font-mono">سن: {item.applicant?.age} / تحصیلات: {item.applicant?.educationLevel}</p>
                  </div>
                  {isMe ? (
                    <button 
                      onClick={() => setSelectedItem(item)}
                      className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs"
                    >
                      ویرایش فرم
                    </button>
                  ) : isOther ? (
                    <span className="text-[10px] text-slate-600 bg-slate-900/60 px-2 py-0.5 rounded">همکار قفل</span>
                  ) : (
                    <button 
                      onClick={() => handlePull(item)}
                      className="px-3 py-1 bg-slate-900 hover:border-purple-500 border border-slate-800 text-purple-400 text-xs rounded-lg active:scale-95 transition"
                    >
                      پذیرش مراجع
                    </button>
                  )}
                </div>
              );
            })}
            {consultList.length === 0 && (
              <p className="text-xs text-slate-650 text-center py-6">هیچ مراجعی در این صف بارگذاری نشده است.</p>
            )}
          </div>
        </div>

        {/* Right Side: Active Client Consultation Form */}
        <div className="lg:col-span-8">
          {selectedItem ? (
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6 animate-slide-up">
              
              <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                <span className="text-xs text-purple-400 font-bold flex items-center gap-1">
                  <Clock size={12} className="animate-pulse" />
                  تحت مشاوره آقای معصومی
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">پرونده فعال مشاوره: {selectedItem.applicant?.fullName}</h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">تاریخ ورود به این غرفه: {getPersianDateTimeString(selectedItem.stageEnteredAt)}</p>
                </div>
              </div>

              {/* Skip consult switch */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-900 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={isSkipped} 
                    onChange={e => setIsSkipped(e.target.checked)} 
                    className="w-4 h-4 text-purple-500 accent-purple-500 rounded focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="text-xs text-red-400 font-bold">متقاضی حضور نیافت (عدم حضور در مشاوره)</span>
                </div>
                <span className="text-[10px] text-slate-600">پذیرش ترک مشاوره بدون نمره</span>
              </div>

              {isSkipped ? (
                <div className="space-y-2 animate-slide-up">
                  <label className="block text-xs text-slate-400">شرح علت غیبت یا انصراف متقاضی</label>
                  <textarea
                    value={skipReason}
                    onChange={e => setSkipReason(e.target.value)}
                    rows={3}
                    placeholder="مثال: تماس مکرر صورت گرفت ولی به علت مشغله کاری از غرفه خارج شدند..."
                    className="w-full px-3 py-2 glass-input text-xs focus:outline-none focus:border-red-500/50"
                  />
                </div>
              ) : (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Dynamic Questionnaire Q&A List */}
                  <div className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-slate-900">
                    <h4 className="text-xs font-bold text-purple-400 border-b border-slate-900 pb-2 flex items-center gap-1.5">
                      <HelpCircle size={14} />
                      پاسخ‌های ثبت‌شده مراجع در پرسشنامه روانشناختی فن‌بیان
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block text-slate-500 mb-1.5">آیا ترس از سخنرانی عمومی دارید؟ (۱ تا ۱۰)</label>
                        <select 
                          value={answers.fearOfPublicSpeaking}
                          onChange={e => setAnswers({ ...answers, fearOfPublicSpeaking: e.target.value })}
                          className="w-full px-3 py-2 glass-input text-xs focus:outline-none"
                        >
                          <option value="1">۱ - بدون ترس (فوق‌العاده با اعتماد به نفس)</option>
                          <option value="4">۴ - اضطراب کنترل شده خفیف</option>
                          <option value="7">۷ - ترس محسوس هنگام لرزیدن صدا</option>
                          <option value="10">۱۰ - ترس افراطی (ترس شدید اجتماعی)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-500 mb-1.5">سرعت سخنرانی متقاضی (ریتم ادا کردن)</label>
                        <select 
                          value={answers.clutteringSpeechSpeed}
                          onChange={e => setAnswers({ ...answers, clutteringSpeechSpeed: e.target.value })}
                          className="w-full px-3 py-2 glass-input text-xs focus:outline-none"
                        >
                          <option value="خیلی یواش">بسیار شمرده و با افول انرژی</option>
                          <option value="متوسط">متعادل و طبیعی</option>
                          <option value="تندباران">خیلی سریع (جیتر و لکنت دار)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-500 mb-1.5">وجود نشانه‌های من‌من کردن یا کش لغات</label>
                        <select 
                          value={answers.stutterCues}
                          onChange={e => setAnswers({ ...answers, stutterCues: e.target.value })}
                          className="w-full px-3 py-2 glass-input text-xs focus:outline-none"
                        >
                          <option value="خیر">خیر - روان بدون سایش صوت</option>
                          <option value="بله تارهای وکال">بله - جیتر کلامی تکرار حروف دارد</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-500 mb-1.5">استقامت تنفسی و کنترل دیافراگم</label>
                        <select 
                          value={answers.breathControlStamina}
                          onChange={e => setAnswers({ ...answers, breathControlStamina: e.target.value })}
                          className="w-full px-3 py-2 glass-input text-xs focus:outline-none"
                        >
                          <option value="عالی">عالی - صحبت روی بازدم بدون قطع تنفس</option>
                          <option value="خوب">متوسط - قطع گهگاهی جمله در اثر کمبود هوا</option>
                          <option value="ضعیف کلامی">ضعیف - خسته‌کننده به همراه حبس دم فیزیکی</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Coach Notes with Autosave feedback */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-slate-400">
                        {isSavingDraft ? "در حال پشتیبان‌گیری..." : lastAutoSaved ? `ذخیره موقت موفق در ساعت ${lastAutoSaved}` : ""}
                      </span>
                      <label className="block text-xs text-slate-350">شرح عمیق مشاوره و علایق متقاضی (آقای معصومی)</label>
                    </div>
                    <textarea
                      value={consultNotes}
                      onChange={e => setConsultNotes(e.target.value)}
                      rows={5}
                      placeholder="مراجع بر کلمات تسلط خوبی دارد اما ترس جدی از قضاوت کارفرمایان مانع انتقال لحن حماسی می‌گردد. تمرینات دیافراگم و تصویرسازی ذهنی مکرر اکیدا نیاز است..."
                      className="w-full px-3 py-2.5 glass-input text-xs focus:outline-none text-right leading-relaxed"
                    />
                  </div>

                </div>
              )}

              {/* 5-SECOND PRESS-AND-HOLD SECURE SUBMIT COMPONENT */}
              <div className="pt-4 border-t border-slate-850 flex flex-col items-center justify-center space-y-3 w-full">
                
                {/* Dynamic Hold Notification Header */}
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isHolding ? 'bg-purple-500 animate-ping' : 'bg-slate-700'}`} />
                  <span className={`text-xs font-bold font-sans transition-all duration-300 ${isHolding ? 'text-purple-400' : 'text-slate-400'}`}>
                    {holdMessage}
                  </span>
                </div>
                
                <div className="relative w-32 h-32 flex items-center justify-center group select-none touch-none">
                  
                  {/* Glowing Pulse Rings backdrops */}
                  <div className={`absolute inset-1 rounded-full bg-purple-500/5 transition-all duration-300 ${isHolding ? 'scale-110 opacity-100 blur-md' : 'scale-95 opacity-0'}`} />
                  <div className={`absolute inset-3 rounded-full bg-purple-500/10 transition-all duration-300 ${isHolding ? 'scale-125 opacity-30 blur' : 'scale-90 opacity-0'}`} />

                  {/* Scientific background ticks */}
                  <div className="absolute inset-0 border border-dashed border-slate-850 rounded-full opacity-65 animate-spin-slow pointer-events-none" />

                  {/* Background SVG Circle */}
                  <svg className="absolute w-full h-full -rotate-90 pointer-events-none select-none">
                    <circle cx="64" cy="64" r="50" stroke="#121827" strokeWidth="8" fill="transparent" />
                    <circle 
                      cx="64" 
                      cy="64" 
                      r="50" 
                      stroke={progress >= 100 ? "#22C55E" : "#A855F7"} 
                      strokeWidth="8" 
                      fill="transparent" 
                      strokeDasharray="314"
                      strokeDashoffset={314 - (314 * progress) / 100}
                      className="transition-all duration-75 ease-out"
                      strokeLinecap="round"
                    />
                  </svg>

                  {/* Hold Trigger Button */}
                  <button
                    type="button"
                    onMouseDown={handleStartHold}
                    onMouseUp={handleCancelHold}
                    onMouseLeave={handleCancelHold}
                    onTouchStart={handleStartHold}
                    onTouchEnd={handleCancelHold}
                    className={`w-24 h-24 bg-slate-950 border rounded-full font-black text-xs select-none shadow-2xl flex flex-col justify-center items-center gap-1.5 focus:outline-none transition-all duration-200 cursor-pointer pointer-events-auto ${
                      isHolding 
                        ? 'border-purple-500 bg-slate-1000 text-purple-300 scale-95 shadow-purple-500/10' 
                        : 'border-purple-500/30 text-purple-400 hover:border-purple-500 shadow-slate-950/80 hover:shadow-purple-500/5'
                    }`}
                  >
                    {isHolding ? (
                      <div className="text-center">
                        <span className="text-2xl font-mono block leading-none text-white animate-bounce">
                          {Math.max(1, Math.ceil((5000 - (progress * 50)) / 1000))}
                        </span>
                        <span className="text-[9px] text-purple-400 mt-1 font-sans block">ثانیه دیگر</span>
                      </div>
                    ) : (
                      <>
                        <Clock size={18} className="text-purple-400 animate-pulse" />
                        <span className="text-[10px] tracking-tight">{progress > 0 ? "رها شد" : "نگه دارید"}</span>
                      </>
                    )}
                  </button>

                  {/* Percentage Floating Indicator */}
                  <div className="absolute -bottom-1 bg-slate-900 border border-slate-800 text-white font-mono text-[9px] px-2 py-0.5 rounded-full shadow-lg font-bold">
                    {Math.ceil(progress)}%
                  </div>

                </div>
                <p className="text-[10px] text-slate-550 leading-relaxed text-center max-w-sm pointer-events-none">
                  * سوئیچ محافظ ارگانیک: جهت تایید نهایی و بازکردن زبانه هماهنگ متمم، انگشت خود را روی کلید بنفش قرار داده و به مدت ۵ ثانیه کامل نگه دارید.
                </p>
              </div>

            </div>
          ) : (
            <div className="glass-panel p-10 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs">
              در صف مشاورین متقاضی جدیدی تعبیه نشده است؛ لطفا از کارد سمت چپ پرونده جدیدی را جهت مشاوره و تحلیل روانشناختی بارگیری بفرمایید.
            </div>
          )}
        </div>

      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-filter backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800-80 max-w-sm w-full space-y-4 text-center animate-scale-up">
            <div className="inline-flex p-3 bg-purple-500/10 rounded-full text-purple-400">
              <CheckCircle size={30} />
            </div>
            <h3 className="text-md font-bold text-white">تایید و آزادسازی پرونده به اتاق میانی</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              آیا ارزیابی‌های روانشناختی و اولویت مراجع {selectedItem?.applicant?.fullName} به پایان رسیده و مایلید پرونده وارد فاز متمم انستیتو شود؟
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2 bg-slate-900 border border-slate-800 text-slate-400 text-xs rounded-xl hover:text-white"
              >
                لغو خروجی
              </button>
              <button
                onClick={executeTransition}
                disabled={isSubmitting}
                className="flex-1 py-2.5 btn-primary glow-on-hover rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                {isSubmitting ? <RefreshCw className="animate-spin" size={12} /> : null}
                تایید همه‌چیز و انتقال
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
