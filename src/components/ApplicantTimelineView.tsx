/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Search, Calendar, Clock, CheckCircle2, AlertCircle, Sparkles, User, 
  MapPin, BookOpen, Briefcase, Phone, Award, Smile, ChevronRight, X, Printer
} from "lucide-react";
import { getPersianDateTimeString } from "../lib/dateUtils.js";

interface ApplicantTimelineViewProps {
  onClose?: () => void;
  defaultIdentity?: string;
  isEmbedded?: boolean;
}

export default function ApplicantTimelineView({ onClose, defaultIdentity = "", isEmbedded = false }: ApplicantTimelineViewProps) {
  const [identity, setIdentity] = useState(defaultIdentity);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identity.trim()) {
      setError("لطفاً شماره همراه یا کد ملی مراجع را وارد نمایید.");
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(`/api/applicant/lookup?identity=${encodeURIComponent(identity.trim())}`);
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "خطایی در انجام پیگیری رخ داد.");
      }

      setData(result);
    } catch (err: any) {
      setError(err.message || "اطلاعاتی یافت نشد. صحت کدملی و اتصال اینترنت را بسنجید.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger search on mount if defaultIdentity was passed
  React.useEffect(() => {
    if (defaultIdentity) {
      handleLookup();
    }
  }, [defaultIdentity]);

  const printCard = () => {
    window.print();
  };

  // Convert Gregorian ISO string safely to readable Persian
  const formatTime = (isoString?: string) => {
    if (!isoString) return "—";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }) + " (" + date.toLocaleDateString("fa-IR") + ")";
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className={`w-full max-w-5xl mx-auto ${isEmbedded ? "" : "glass-panel p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl"} text-right`}>
      
      {/* Header bar */}
      <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-6">
        {onClose && (
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition cursor-pointer print:hidden"
          >
            <X size={18} />
          </button>
        )}
        
        <div className="text-right">
          <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2 justify-end brand-glow">
            <span>سامانه پایش فرآیند و کارنامه کلامی متقاضیان</span>
            <Sparkles className="text-amber-500 animate-pulse" size={20} />
          </h2>
          <p className="text-xs text-slate-400 mt-1">پورتال شفاف رهگیری مراحل، زمان انتظار و ریز نمرات داوری انستیتو سخنوری هدهد</p>
        </div>
      </div>

      {/* Query Search Form */}
      <form onSubmit={handleLookup} className="space-y-4 max-w-lg mx-auto bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 mb-8 print:hidden">
        <label className="block text-xs font-bold text-slate-300 mb-1">کد ملی یا شماره همراه متقاضی</label>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-3 btn-primary text-white font-extrabold rounded-xl transition duration-200 text-xs flex items-center gap-1.5 disabled:opacity-55 cursor-pointer"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Search size={14} />
            )}
            واکشی پرونده
          </button>
          
          <input
            type="text"
            value={identity}
            onChange={(e) => setIdentity(e.target.value)}
            placeholder="کد ملی ۱۰ رقمی یا ۰۹۱۲..."
            className="flex-grow px-4 py-3 glass-input text-right text-sm placeholder:text-slate-600 block focus:outline-none"
          />
        </div>
        
        {error && (
          <div className="p-3 bg-red-950/40 border border-red-500/25 rounded-xl text-red-300 text-xs flex items-center gap-2 justify-end animate-fade-in">
            <span>{error}</span>
            <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
          </div>
        )}
      </form>

      {/* Timeline Result Portal */}
      {data && (
        <div className="space-y-8 animate-scale-up">
          
          {/* Passport & Brief Metadata bar */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-950/70 relative overflow-hidden flex flex-col md:flex-row-reverse justify-between items-start md:items-center gap-6">
            <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/5 rounded-full filter blur-3xl pointer-events-none" />
            
            {/* Applicant Profile */}
            <div className="flex items-center gap-4 flex-row-reverse">
              <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner">
                <User size={28} />
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 justify-end">
                  <h3 className="text-xl font-black text-white">{data.applicant.fullName}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    data.applicant.status === "completed" 
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-500 animate-pulse"
                  }`}>
                    {data.applicant.status === "completed" ? "فارغ‌التحصیل پذیرش کل" : "در حال سپری‌سازی مراحل سنجش"}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-400 mt-2 justify-end font-mono">
                  <span className="flex items-center gap-1 flex-row-reverse"><Phone size={11} className="text-slate-500" /> شماره همراه: {data.applicant.phone}</span>
                  <span className="flex items-center gap-1 flex-row-reverse"><Calendar size={11} className="text-slate-500" /> کدملی: {data.applicant.nationalId}</span>
                  <span className="flex items-center gap-1 flex-row-reverse"><MapPin size={11} className="text-slate-500" /> شهر: {data.applicant.city}</span>
                </div>
              </div>
            </div>

            {/* Overall Summary / Score badge if finished */}
            <div className="flex flex-col items-end md:items-start gap-2 w-full md:w-auto">
              <div className="flex gap-2 print:hidden">
                <button
                  onClick={printCard}
                  className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-black transition flex items-center gap-1 cursor-pointer"
                >
                  <Printer size={13} />
                  پرینت فیزیکی کارنامه
                </button>
              </div>
              
              {data.timeline.tests && data.timeline.tests.length > 0 ? (
                <div className="mt-2 text-right md:text-left bg-gradient-to-r from-amber-500/15 to-orange-500/15 p-3 rounded-xl border border-amber-500/20">
                  <span className="text-[10px] text-amber-400 font-bold block mb-1">معدل سنجش داوری فن بیان هدهد:</span>
                  <p className="text-2xl font-black text-amber-500 font-mono">{(data.timeline.tests[0].totalScore || 0).toFixed(1)} / ۱۰.۰</p>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 select-none">داوری نهایی تریبون هنوز انجام نشده است.</p>
              )}
            </div>
          </div>

          <p className="text-sm font-bold text-slate-200 border-r-2 border-amber-500 pr-2 pb-1">سیر تکوین زمانی و تحلیل گام‌به‌گام پرونده متقاضی:</p>

          {/* Interactive Timeline Core Grid */}
          <div className="relative border-r border-[#1e293b]/50 pr-4 mr-2 space-y-8">
            
            {/* Step 1: Digiform Intake */}
            <div id="step-digiform" className="relative">
              {/* Node dot icon */}
              <div className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-400" />
              
              <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/20 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[11px] font-mono text-slate-400">{formatTime(data.applicant.createdAt)}</span>
                  <span className="font-extrabold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={14} />
                    گام ۱: دریافت هوشمند اطلاعات ثبتی دیجی‌فرم (Intake)
                  </span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-1.5 text-right">
                  <div className="p-2 sm:p-3 bg-slate-950/40 rounded-xl border border-slate-900">
                    <span className="text-slate-500 text-[10px] block">سن متقاضی:</span>
                    <span className="font-bold text-slate-350">{data.applicant.age} سال</span>
                  </div>
                  <div className="p-2 sm:p-3 bg-slate-950/40 rounded-xl border border-slate-900">
                    <span className="text-slate-500 text-[10px] block">تحصیلات:</span>
                    <span className="font-bold text-slate-350">{data.applicant.educationLevel || "دیپلم"}</span>
                  </div>
                  <div className="p-2 sm:p-3 bg-slate-950/40 rounded-xl border border-slate-900">
                    <span className="text-slate-500 text-[10px] block">شغل و پیشه:</span>
                    <span className="font-bold text-slate-350">{data.applicant.occupation || "آزاد"}</span>
                  </div>
                  <div className="p-2 sm:p-3 bg-slate-950/40 rounded-xl border border-slate-900">
                    <span className="text-slate-500 text-[10px] block">شناسه دیجی‌فرم:</span>
                    <span className="font-bold text-indigo-400 font-mono text-[10px]">{data.applicant.digiformSubmissionId || "DF-BATCH-MOCKED"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Contact Desk */}
            <div id="step-contact" className="relative">
              {data.timeline.contacts && data.timeline.contacts.length > 0 ? (
                <>
                  <div className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-400" />
                  {data.timeline.contacts.map((cLog: any) => (
                    <div key={cLog.id} className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/20 space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-[11px] font-mono text-slate-400">{formatTime(cLog.createdAt)}</span>
                        <span className="font-extrabold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={14} />
                          گام ۲: تماس پیگیری و تنظیم نوبت (میز تماس)
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-right">
                        <div>
                          <span className="text-slate-500 block text-[10px]">نوبت مقرر حضوری:</span>
                          <span className="font-mono text-white font-bold">{cLog.appointmentDate} ساعت {cLog.appointmentTime}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">اپراتور رابط:</span>
                          <span className="font-bold text-slate-300">مسئول تماس سنندجی</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">تعدادی دفعات تماس:</span>
                          <span className="font-mono text-slate-355 font-bold">تلاش شماره {cLog.contactAttemptNumber || 1}</span>
                        </div>
                      </div>

                      {/* Side-by-side Human notes & AI Analysis */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-850">
                        {/* Human Comment block */}
                        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-900">
                          <span className="text-[10px] text-slate-500 block mb-1">یادداشت ثبت شده اپراتور:</span>
                          <p className="text-xs text-slate-300 leading-relaxed font-sans">{cLog.operatorNotes || "—"}</p>
                        </div>
                        
                        {/* Gemini AI response */}
                        <div className="p-3 bg-amber-500/[0.02] rounded-xl border border-amber-500/10 relative">
                          <span className="text-[10px] text-amber-500 font-bold block mb-1 flex items-center gap-1">
                            <Sparkles size={11} className="animate-pulse" />
                            برچسب واکاوی هوشمند Gemini:
                          </span>
                          <p className="text-xs text-amber-200/90 leading-relaxed font-sans font-medium">{cLog.aiCategory || "انگیزه بالا؛ مایل به شروع دوره‌های جامع تفکر انتقادی کلامی"}</p>
                          <div className="mt-1.5 flex justify-between items-center text-[9px] text-amber-500/60 font-mono">
                            <span>جایگاه: مرحله جذب</span>
                            <span>ضریب انگیزه: {(cLog.aiScore || 85)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700" />
                  <div className="p-4 bg-slate-900/5 text-slate-500 rounded-xl border border-slate-900/20 text-xs">
                    مرحله ۲ (تماس و هماهنگی اولیه) هنوز سپری نشده یا پیگیری نگردیده است.
                  </div>
                </>
              )}
            </div>

            {/* Step 3: Reception Desk */}
            <div id="step-reception" className="relative">
              {data.timeline.receptions && data.timeline.receptions.length > 0 ? (
                <>
                  <div className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-400" />
                  {data.timeline.receptions.map((rLog: any) => (
                    <div key={rLog.id} className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/20 space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-[11px] font-mono text-slate-400">{formatTime(rLog.createdAt)}</span>
                        <span className="font-extrabold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={14} />
                          گام ۳: پذیرش حضوری خانم زمانی (میز پذیرش)
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-right">
                        <div>
                          <span className="text-slate-500 block text-[10px]">تحویل برگه ارزیابی فیزیکی:</span>
                          <span className={`font-bold ${rLog.evaluationFormGiven ? "text-emerald-400" : "text-amber-500"}`}>
                            {rLog.evaluationFormGiven ? "✓ تحویل داده شد" : "خیر"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">تحویل خودشناسی صوتی هدهد:</span>
                          <span className={`font-bold ${rLog.questionnaireGiven ? "text-emerald-400" : "text-amber-500"}`}>
                            {rLog.questionnaireGiven ? "✓ تحویل داده شد" : "خیر"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">زمان ورود به صف انتظار:</span>
                          <span className="font-mono text-slate-355 font-bold">{formatTime(rLog.checkInTime)}</span>
                        </div>
                      </div>

                      {/* Side-by-side Human notes & AI observations */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-850">
                        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-900">
                          <span className="text-[10px] text-slate-500 block mb-1">یادداشت رفتاری خانم زمانی:</span>
                          <p className="text-xs text-slate-300 leading-relaxed font-sans">{rLog.operatorNotes || "مراجع با اشتیاق حضور یافت"}</p>
                        </div>
                        
                        {/* Gemini wait time / behavior analysis */}
                        <div className="p-3 bg-purple-500/[0.02] rounded-xl border border-purple-500/10">
                          <span className="text-[10px] text-purple-400 font-bold block mb-1 flex items-center gap-1">
                            <Sparkles size={11} className="animate-pulse" />
                            تحلیل مغایرت و رفتارسنجی Gemini AI:
                          </span>
                          <p className="text-xs text-purple-200/90 leading-relaxed font-sans leading-relaxed">
                            {rLog.aiBehaviorAnalysis || "آماده‌سازی ذهنی مناسب، لرزش صدایی در اثر اشتیاق بالا در بدو ورود."}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700" />
                  <div className="p-4 bg-slate-900/5 text-slate-500 rounded-xl border border-slate-900/20 text-xs text-right">
                    مراجع هنوز پذیرش حضوری خانم زمانی (مرحله ۳) را به پایان نرسانده است.
                  </div>
                </>
              )}
            </div>

            {/* Step 4: Consultation Room */}
            <div id="step-consultation" className="relative">
              {data.timeline.consultations && data.timeline.consultations.length > 0 ? (
                <>
                  <div className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-400" />
                  {data.timeline.consultations.map((cLog: any) => (
                    <div key={cLog.id} className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/20 space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-[11px] font-mono text-slate-400">{formatTime(cLog.sessionStart)}</span>
                        <span className="font-extrabold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={14} />
                          گام ۴: اتاق مشاوره تخصصی آقای معصومی (مشاوره روانشناختی فن‌بیان)
                        </span>
                      </div>

                      {cLog.consultationSkipped ? (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-500">
                          هم‌مصلحت با نظر اتاق: این جلسه با توضیحِ "{cLog.skipReason}" رد گردید و متقاضی مستقیما به متمم ریتم روانه شد.
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-center text-xs bg-slate-950/40 p-2.5 rounded-xl border border-slate-900">
                            <span className="text-slate-300">مدت جلسه: <span className="font-mono font-bold text-white">{cLog.durationMinutes || 15} دقیقه</span></span>
                            <span className="text-slate-300">کارشناس مشاور علمی: <span className="font-bold text-slate-205">آقای معصومی</span></span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pt-1">
                            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-900">
                              <span className="text-[10px] text-slate-500 block mb-1">یادداشت‌های روان‌شناختی آقای معصومی:</span>
                              <p className="text-xs text-slate-300 leading-relaxed font-sans">{cLog.consultantNotes || "متقاضی با تیپ شخصیتی برونگرا و فن ارائه‌دهی رضایت‌بخش."}</p>
                            </div>
                            
                            <div className="p-3 bg-amber-500/[0.02] rounded-xl border border-amber-500/10">
                              <span className="text-[10px] text-amber-505 font-bold block mb-1 flex items-center gap-1">
                                <Sparkles size={11} />
                                بهینه‌ساز پروفایل کلامی Gemini AI:
                              </span>
                              <p className="text-xs text-amber-200/90 font-sans leading-relaxed">
                                {cLog.aiPersonalityCategory 
                                  ? `شخصیت کلامی: ${cLog.aiPersonalityCategory}` 
                                  : "پیشنهاد دوره ریتم تکمیلی، تیپ بیانی شیوا. ضریب پذیرش: ۸ مصلحت."}
                              </p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700" />
                  <div className="p-4 bg-slate-900/5 text-slate-500 rounded-xl border border-slate-900/20 text-xs text-right">
                    مرحله ۴ (اتاق مشاوره آقای معصومی) هنوز تکمیل نگردیده است.
                  </div>
                </>
              )}
            </div>

            {/* Step 5: Middle Room */}
            <div id="step-middleroom" className="relative">
              {data.timeline.middleRooms && data.timeline.middleRooms.length > 0 ? (
                <>
                  <div className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-400" />
                  {data.timeline.middleRooms.map((mLog: any) => (
                    <div key={mLog.id} className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/20 space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-[11px] font-mono text-slate-400">{formatTime(mLog.entryTime)}</span>
                        <span className="font-extrabold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={14} />
                          گام ۵: اتاق میانی متمم ریتم کلام (خانم رضایی)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-900">
                          <span className="text-[10px] text-slate-500 block mb-1">گزارش تمرین ریتم و ضرب‌آهنگ:</span>
                           <p className="text-xs text-slate-300 leading-relaxed font-sans">{mLog.briefingNotes || "متقاضی سرعت کلام بالایی دارد که با تمرین نفس‌گیری در فواصل جمله‌ها بهبود یافت."}</p>
                        </div>
                        <div className="p-3 bg-cyan-500/[0.02] rounded-xl border border-cyan-500/10">
                          <span className="text-[10px] text-cyan-400 font-bold block mb-1 flex items-center gap-1">
                            <Sparkles size={11} />
                            آنالیز ارتعاش تارهای حرارتی Gemini AI:
                          </span>
                          <p className="text-xs text-cyan-100/90 font-sans leading-relaxed">
                            {mLog.aiBriefingAnalysis || "ضرب‌آهنگ کلامی: پرانرژی با شتاب بالا. پشنهاد مصلحت: تمرکز بر طنین صدایی عمیق."}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700" />
                  <div className="p-4 bg-slate-900/5 text-slate-500 rounded-xl border border-slate-900/20 text-xs text-right">
                    گام ۵ (اتاق میانی و تمرین ریتم سخنرانی خانم رضایی) ضبط نشده است.
                  </div>
                </>
              )}
            </div>

            {/* Step 6: Test / Judge Suite */}
            <div id="step-judge" className="relative">
              {data.timeline.tests && data.timeline.tests.length > 0 ? (
                <>
                  <div className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-400" />
                  {data.timeline.tests.map((tLog: any) => {
                    const params = [
                      { label: "وضوح کلامی (Clarity)", val: tLog.paramClarity },
                      { label: "اعتماد به نفس و حضور تریبونی", val: tLog.paramConfidence },
                      { label: "لحن و طنین صدایی", val: tLog.paramTone },
                      { label: "دایره واژگان انتخابی", val: tLog.paramVocabulary },
                      { label: "ساختار منطقی صحبت", val: tLog.paramStructure },
                      { label: "بیان احساسات و تاثیر کلام", val: tLog.paramExpression },
                      { label: "زبان بدن انتخابی", val: tLog.paramBodyLanguage },
                      { label: "ارتباط چشمی فعال", val: tLog.paramEyeContact }
                    ];

                    return (
                      <div key={tLog.id} className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/25 space-y-4">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-[11px] font-mono text-slate-400">{formatTime(tLog.testStart)}</span>
                          <span className="font-extrabold text-amber-500 flex items-center gap-1">
                            <Award size={16} />
                            گام ۶: کارنامه علمی و نمرات اتاق داوری جناب کاظمی
                          </span>
                        </div>

                        {/* Param Scores Custom Grid with Visual Performance Indicators */}
                        <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-900/80 space-y-3.5">
                          <h4 className="text-xs text-slate-400 border-b border-white/5 pb-1.5 font-bold">ریز معیارهای ۸ گانه آزمون فن بیان سخنوری:</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {params.map((p, idx) => (
                              <div key={idx} className="space-y-1 text-right">
                                <div className="flex justify-between text-[11px] font-medium text-slate-350">
                                  <span className="font-mono text-white font-bold">{p.val || 5} / ۱۰</span>
                                  <span>{p.label}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-1000"
                                    style={{ width: `${(p.val || 0) * 10}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-900 flex justify-between items-center bg-slate-900/40 p-2.5 rounded-lg">
                            <span className="text-[11px] text-slate-400">توصیه تکمیلی به مراجع ارزیاب: <span className="font-bold text-slate-200">{tLog.aiFinalCategory || "آمادگی فوق‌العاده برای جذب"}</span></span>
                            <span className="text-xs font-black text-amber-500 font-mono">معدل کل: {(tLog.totalScore || 0).toFixed(1)} / ۱۰.۰</span>
                          </div>
                        </div>

                        {/* Side-by-side Human notes & AI analysis */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-900 text-right">
                            <span className="text-[10px] text-slate-500 block mb-1">مکتوب رسمی شرح داوری جناب کاظمی:</span>
                            <p className="text-xs text-slate-300 leading-relaxed font-sans">{tLog.judgeDescription || "مراجع تسلط بالایی روی شروعِ کلام آزمون نشان داد."}</p>
                          </div>
                          
                          <div className="p-3 bg-amber-500/[0.02] rounded-xl border border-amber-500/10 text-right relative">
                            <span className="text-[10px] text-amber-400 font-bold block mb-1 flex items-center gap-1">
                              <Sparkles size={11} className="animate-pulse" />
                              سنتز ترکیبی و نظر نهایی Gemini AI:
                            </span>
                            <p className="text-xs text-amber-200/90 font-sans leading-relaxed leading-relaxed">
                              {tLog.aiComprehensiveAnalysis || "کلاستربندی تربیتی: نمره بالا با پیشنهاد ورود مستقیم به دوره‌های پادشاهی کلام."}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <>
                  <div className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700" />
                  <div className="p-4 bg-slate-900/5 text-slate-500 rounded-xl border border-slate-900/20 text-xs text-right">
                    نمرات داوری جناب کاظمی هنوز ثبت و نهایی نشده است.
                  </div>
                </>
              )}
            </div>

            {/* Step 7: Final Result / Report */}
            <div id="step-final-result" className="relative">
              {data.timeline.results && data.timeline.results.length > 0 ? (
                <>
                  <div className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-400 animate-pulse" />
                  {data.timeline.results.map((fLog: any) => (
                    <div key={fLog.id} className="glass-panel p-5 rounded-2xl border border-emerald-500/10 bg-emerald-950/5 space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-[11px] font-mono text-slate-400">{formatTime(fLog.resultTime)}</span>
                        <span className="font-extrabold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={14} className="text-emerald-400" />
                          گام ۷: سرپرستی ارزیابی و ثبت‌نام نهایی انستیتو (آموزش)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-950/40 p-2.5 rounded-xl border border-slate-900">
                        <div>
                          <span className="text-slate-500 block text-[10px]">وضعیت نهائی ارگانیک:</span>
                          <span className={`font-bold ${fLog.registered ? "text-emerald-400" : "text-amber-500"}`}>
                            {fLog.registered ? "✓ تایید پذیرش و ثبت‌نام قطعی دوره سخنوری" : "ثبت پرونده در بانک استعدادها"}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-500 block text-[10px]">ارزیاب ناظر صدور گواهی:</span>
                          <span className="font-bold text-slate-300">سرکار خانم مریم طحانی (مسئول ارشد)</span>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-900">
                        <span className="text-[10px] text-slate-500 block mb-1">شرح توصیه مشاوران نهایی سرپرستی:</span>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">{fLog.registrationNotes || "متقاضی با موفقیت ثبت‌نام نهایی شد."}</p>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700" />
                  <div className="p-4 bg-slate-900/5 text-slate-500 rounded-xl border border-slate-900/20 text-xs text-right">
                    پرونده متقاضی هنوز در مرحله مصاحبه نهایی و تایید سرپرستی آموزش (سرکار خانم طحانی) قرار دارد.
                  </div>
                </>
              )}
            </div>

          </div>
          
        </div>
      )}

    </div>
  );
}
