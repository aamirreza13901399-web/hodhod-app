/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, QueueState, QueueStage, ApplicantStatus } from "../types.js";
import { 
  Award, Clock, Sparkles, CheckCircle, RefreshCw, X, Sliders, Play, 
  HelpCircle, ClipboardList, BookOpen, AlertCircle, TrendingUp,
  Printer, Download, FileText
} from "lucide-react";
import { getPersianDateTimeString } from "../lib/dateUtils.js";
import { CONSULTING_CATEGORIES } from "../data/consultingOptions.js";

interface ResultPanelProps {
  user: User;
}

export default function ResultPanel({ user }: ResultPanelProps) {
  const [queue, setQueue] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // Form states
  const [registered, setRegistered] = useState(true);
  const [tahaniCaseNotes, setTahaniCaseNotes] = useState("");
  const [rezaeiSupportNotes, setRezaeiSupportNotes] = useState("");
  const [isFinishing, setIsFinishing] = useState(false);
  const [historyTimeline, setHistoryTimeline] = useState<any>(null);
  const [aiFinalReport, setAiFinalReport] = useState<any>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Score override states for Tahani
  const [isEditingScores, setIsEditingScores] = useState(false);
  const [editClarity, setEditClarity] = useState(5);
  const [editConfidence, setEditConfidence] = useState(5);
  const [editTone, setEditTone] = useState(5);
  const [editVocabulary, setEditVocabulary] = useState(5);
  const [editStructure, setEditStructure] = useState(5);
  const [editExpression, setEditExpression] = useState(5);
  const [editBodyLanguage, setEditBodyLanguage] = useState(5);
  const [editEyeContact, setEditEyeContact] = useState(5);
  const [editJudgeDesc, setEditJudgeDesc] = useState("");
  const [editMessageToTahani, setEditMessageToTahani] = useState("");
  const [isSavingScores, setIsSavingScores] = useState(false);

  // AI Copilot 100 Consulting Options state
  const [selectedConsultCat, setSelectedConsultCat] = useState<string>("cat-branding");
  const [selectedConsultOpt, setSelectedConsultOpt] = useState<string>("brand-1");

  const parsedAiFinalSynthesis = (() => {
    if (aiFinalReport) return aiFinalReport;
    const raw = historyTimeline?.results?.[0]?.aiFinalSynthesis;
    if (!raw) return null;
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (e) {
      return null;
    }
  })();

  const handleDownloadTxt = () => {
    if (!selectedItem) return;
    const applicant = selectedItem.applicant;
    const aiReport = parsedAiFinalSynthesis;
    const testInfo = historyTimeline?.tests?.[0];
    const finalResult = historyTimeline?.results?.[0];
    const currentDate = new Date().toLocaleDateString("fa-IR");

    let content = `====================================================
           انستیتو سخنوری و همگام‌سازی هدهد
         کارنامه فیزیکی و سند تحلیلی روان‌سنجی کلامی
====================================================
تاریخ ارزیابی: ${currentDate}
شناسه متقاضی: ${applicant?.id || "نامشخص"}
نام متقاضی: ${applicant?.fullName || "نامشخص"}
سن: ${applicant?.age || "نامشخص"} سال | سطح تحصیلات: ${applicant?.educationLevel || "نامشخص"}
شهر: ${applicant?.city || "نامشخص"} | شماره تماس: ${applicant?.phone || "نامشخص"}
----------------------------------------------------
۱. نتایج تریبون سنجش و پارامترهای کلامی:
----------------------------------------------------
معدل کلی داوری کلامی: ${testInfo?.totalScore || "نامشخص"} از ۱۰
- وضوح و شیوایی کلامی: ${testInfo?.paramClarity || "نامشخص"} از ۱۰
- اعتماد به نفس در ارائه: ${testInfo?.paramConfidence || "نامشخص"} از ۱۰
- لایه‌های طنین و لحن صوتی: ${testInfo?.paramTone || "نامشخص"} از ۱۰
- غنای دایره واژگان انتخابی: ${testInfo?.paramVocabulary || "نامشخص"} از ۱۰
- مهندسی و ساختار جملات: ${testInfo?.paramStructure || "نامشخص"} از ۱۰
- شیوه انتقال حس و بیان: ${testInfo?.paramExpression || "نامشخص"} از ۱۰
- زبان بدن زنده داور: ${testInfo?.paramBodyLanguage || "نامشخص"} از ۱۰
- تداوم ارتباط چشمی دورادور: ${testInfo?.paramEyeContact || "نامشخص"} از ۱۰

شرح داوری فی‌البداهه (استاد کاظمی):
${testInfo?.judgeDescription || "درج نشده است"}
----------------------------------------------------
۲. سنتز و تحلیل نهایی هوش مصنوعی (GEMINI AI):
----------------------------------------------------
حکم نهایی پذیرش هوش مصنوعی: ${aiReport?.registrationVerdict === "Yes" ? "تایید صلاحیت نهایی متقاضی جهت ثبت‌نام" : aiReport?.registrationVerdict === "Conditional" ? "پذیرش مشروط / زاپاس صندلی" : "عدم انطباق مهارتی فعلی"}
فلوچارت پیشنهادی هدهد: ${aiReport?.trackProposal || "تحلیل در دسترس نیست"}

محورهای تمرین سخنوری هفته‌های اول:
${aiReport?.firstMonthFocalPoints && aiReport.firstMonthFocalPoints.length > 0 
  ? aiReport.firstMonthFocalPoints.map((item: string, idx: number) => `   [${idx + 1}] ${item}`).join("\n") 
  : "موردی ثبت نشده است."}

فاکتور ارزش سرمایه‌گذاری متقاضی: 
${aiReport?.investmentReturnFactor || "محاسبه نشده"}

استراتژی حفظ متقاضی در درگاه موسسه:
${aiReport?.retentionStrategy || "درگاه پیگیری فعال"}
----------------------------------------------------
۳. یادداشت ارزیابان و کادر اجرایی:
----------------------------------------------------
یادداشت غرفه متمم (استاد معصومی):
${historyTimeline?.consultations?.[0]?.consultantNotes || "بدون یادداشت پرونده"}

یادداشت غرفه متمم پشتیبان (خانم رضایی):
${rezaeiSupportNotes || finalResult?.consultationPanelNotes || "یادداشتی درج نشده"}

تحلیل عمیق نهایی پرونده (خانم طحانی - ارزیاب ارشد):
${tahaniCaseNotes || finalResult?.tahaniAnalysis || "یادداشتی درج نشده"}
----------------------------------------------------
۴. تاییدیه صحت انطباق پرونده:
----------------------------------------------------
[ ] مهره تاییدیه هدهد
[ ] امضای سرارزیاب (خانم طحانی)
[ ] امضای مباشر متمم (خانم رضایی)

* کپی قانونی یا دخل و تصرف فیزیکی در این سند کلاستر غیرقانونی بوده و موجب ابطال کارنامه مراجع می‌گردد.
====================================================`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Hodhod_Report_${applicant?.fullName || "Applicant"}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const fetchResultQueue = async () => {
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
    fetchResultQueue();
    const interval = setInterval(fetchResultQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  const selectApplicant = async (item: any) => {
    setSelectedItem(item);
    setAiFinalReport(null);
    try {
      const tRes = await fetch(`/api/applicants/${item.applicantId}/timeline`);
      const tObj = await tRes.json();
      setHistoryTimeline(tObj);
      
      if (tObj.tests?.[0]) {
        const test = tObj.tests[0];
        setEditClarity(test.paramClarity || 5);
        setEditConfidence(test.paramConfidence || 5);
        setEditTone(test.paramTone || 5);
        setEditVocabulary(test.paramVocabulary || 5);
        setEditStructure(test.paramStructure || 5);
        setEditExpression(test.paramExpression || 5);
        setEditBodyLanguage(test.paramBodyLanguage || 5);
        setEditEyeContact(test.paramEyeContact || 5);
        setEditJudgeDesc(test.judgeDescription || "");
        setEditMessageToTahani(test.messageToTahani || "");
      } else {
        setEditClarity(5);
        setEditConfidence(5);
        setEditTone(5);
        setEditVocabulary(5);
        setEditStructure(5);
        setEditExpression(5);
        setEditBodyLanguage(5);
        setEditEyeContact(5);
        setEditJudgeDesc("");
        setEditMessageToTahani("");
      }

      if (tObj.results?.[0]) {
        setTahaniCaseNotes(tObj.results[0].tahaniAnalysis || "");
        setRezaeiSupportNotes(tObj.results[0].consultationPanelNotes || "");
        setRegistered(!!tObj.results[0].registered);
      } else {
        setTahaniCaseNotes("");
        setRezaeiSupportNotes("");
        setRegistered(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePullResult = async (item: any) => {
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
        fetchResultQueue();
        const updated = { ...item, isWaiting: false, assignedOperatorId: user.id };
        await selectApplicant(updated);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReleaseResult = async (item: any) => {
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
        fetchResultQueue();
        setSelectedItem(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveScoresOverride = async () => {
    if (!selectedItem) return;
    setIsSavingScores(true);
    try {
      const res = await fetch(`/api/applicants/${selectedItem.applicantId}/update-scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paramClarity: editClarity,
          paramConfidence: editConfidence,
          paramTone: editTone,
          paramVocabulary: editVocabulary,
          paramStructure: editStructure,
          paramExpression: editExpression,
          paramBodyLanguage: editBodyLanguage,
          paramEyeContact: editEyeContact,
          judgeDescription: editJudgeDesc,
          messageToTahani: editMessageToTahani
        })
      });

      const outcome = await res.json();
      if (res.ok) {
        setIsEditingScores(false);
        // Refresh entire timeline (reloaded AI report and everything!)
        await selectApplicant(selectedItem);
      } else {
        alert(outcome.error || "خطایی رخ داد.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingScores(false);
    }
  };

  const handleCompleteProcess = async () => {
    if (!selectedItem) return;
    setIsFinishing(true);

    try {
      const payload = {
        registered,
        registrationNotes: registered ? "ثبت‌نام قطعی انجام شد." : "انصراف به علت مسائل شخصی",
        presenterRezaeiId: "u-rezaei-b",
        consultationPanelNotes: rezaeiSupportNotes
      };

      const res = await fetch("/api/queue/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantId: selectedItem.applicantId,
          currentStage: selectedItem.currentStage,
          nextStage: QueueStage.DONE, // Mark done and remove from dynamic queues
          operatorId: user.id,
          operatorNotes: tahaniCaseNotes,
          payload
        })
      });

      const outcome = await res.json();
      if (res.ok) {
        setAiFinalReport(outcome.aiAnalysis);
        fetchResultQueue();
        // Do not auto-close! Allow the evaluator to read, download, or print the report.
      } else {
        alert(outcome.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFinishing(false);
    }
  };

  const resultLobbyItems = queue.filter(q => q.currentStage === QueueStage.RESULT || q.currentStage === QueueStage.WAITING_4);

  return (
    <div id="result-panel" className="space-y-6 animate-fade-in text-right">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <ClipboardList className="text-pink-500 ml-1" size={22} />
            ارائه گزارش تفضیلی صوتی و کاتالیزور ثبت‌نام (خانم طحانی + خانم رضایی)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            ارائه سنتز و گزارش نهایی فن‌بیان، پیشنهاد فلوچارت‌های کلماتی شخصی و بستن پرونده‌های ثبت‌نام مراجعین امروز
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side waiting queue */}
        <div className="lg:col-span-4 glass-panel p-6 rounded-2xl border border-slate-800">
          <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3 mb-4 flex items-center gap-1.5">
            <Clock size={16} className="text-pink-400" />
            مراجعین در لابی ترخیص و دریافت نتایج ({resultLobbyItems.length} نفر)
          </h3>

          <div className="space-y-2">
            {resultLobbyItems.map((item) => {
              const isMe = item.assignedOperatorId === user.id;
              const isOther = item.assignedOperatorId && item.assignedOperatorId !== user.id;

              return (
                <div key={item.id} className="bg-slate-950 p-4 rounded-xl border border-slate-900 flex justify-between items-center hover:border-slate-800 transition">
                  <div>
                    <h4 className="text-xs font-bold text-white">{item.applicant?.fullName}</h4>
                    <p className="text-[10px] text-slate-550 mt-1 font-mono">شهر: {item.applicant?.city} | سن: {item.applicant?.age}</p>
                  </div>
                  {isMe ? (
                    <button onClick={() => selectApplicant(item)} className="px-3 py-1 btn-primary rounded-lg text-xs font-semibold cursor-pointer">
                      کارتابل
                    </button>
                  ) : isOther ? (
                    <span className="text-[10px] text-slate-650">همکار قفل</span>
                  ) : (
                    <button onClick={() => handlePullResult(item)} className="px-3 py-1 bg-slate-900 border border-slate-850 text-pink-400 text-xs rounded-lg transition active:scale-95">
                      دریافت پرونده
                    </button>
                  )}
                </div>
              );
            })}
            {resultLobbyItems.length === 0 && (
              <p className="text-xs text-slate-650 text-center py-6">مراجعی برای دریافت خروجی نهایی معلق نمانده است.</p>
            )}
          </div>
        </div>

        {/* Right Side Master synthesis report card and logs accordion timeline */}
        <div className="lg:col-span-8">
          {selectedItem ? (
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6 animate-slide-up">
              
              <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                <span className="text-xs text-pink-400 font-bold">میز ترخیص نتایج نهایی هدهد</span>
                <div>
                  <h3 className="text-md font-bold text-white">تحویل کارنامه سخنوری: {selectedItem.applicant?.fullName}</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">ثبت‌نام رسمی در دوره‌ها</p>
                </div>
              </div>

              {/* Master synthesis history timeline of past logs */}
              {historyTimeline && (
                <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/5 text-xs">
                  <h4 className="font-bold text-slate-200 border-b border-white/5 pb-2 flex items-center gap-1.5 text-brand-primary">
                    <BookOpen size={14} />
                    ریز نمرات و گزارش پارامترهای تریبیون مسابقه
                  </h4>

                  {historyTimeline.tests && historyTimeline.tests.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2 border-b border-white/5 text-right">
                      <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                        <span className="text-[10px] text-slate-400">معدل نهایی بیان کاظمی</span>
                        <p className="mt-1 text-md font-black text-brand-primary font-mono">{historyTimeline.tests[0].totalScore} / ۱۰</p>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-500">وضوح کلامی</span>
                        <p className="mt-1 text-xs text-slate-300 font-mono">{historyTimeline.tests[0].paramClarity} / ۱۰</p>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-500">اعتماد به نفس</span>
                        <p className="mt-1 text-xs text-slate-300 font-mono">{historyTimeline.tests[0].paramConfidence} / ۱۰</p>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-500">زبان بدن داور</span>
                        <p className="mt-1 text-xs text-slate-300 font-mono">{historyTimeline.tests[0].paramBodyLanguage} / ۱۰</p>
                      </div>
                    </div>
                  )}

                  {/* Previous Stages Logs Foldout */}
                  <div className="space-y-2">
                    <span className="font-bold text-slate-300 block">شرح کلان غرفه‌های قبلی:</span>
                    <div className="space-y-1 bg-white/5 p-3 rounded-lg border border-white/5 max-h-36 overflow-y-auto leading-relaxed">
                      <p><span className="text-brand-primary font-bold">تماس اولیه:</span> {historyTimeline.contacts?.[0]?.operatorNotes || "شرح تماسی موجود نیست"}</p>
                      <p className="mt-1.5"><span className="text-emerald-400 font-bold">مشاوره متمم (معصومی):</span> {historyTimeline.consultations?.[0]?.consultantNotes || "بدون مشاوره"}</p>
                      <p className="mt-1.5"><span className="text-cyan-400 font-bold">اتاق متمم (خانم رضایی):</span> {historyTimeline.middleRooms?.[0]?.briefingNotes || "بدون یادداشت رفتاری متمم"}</p>
                      <p className="mt-1.5"><span className="text-pink-400 font-bold">داوری فی‌البداهه (کاظمی):</span> {historyTimeline.tests?.[0]?.judgeDescription || "بدون شرح داوری"}</p>
                    </div>
                  </div>

                </div>
              )}

              {/* Enrollment Trigger Toggle */}
              <div id="enrollment-status-card" className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-right">
                <span className="text-xs text-slate-300 font-bold">تعیین وضعیت نهایی متقاضی امروز:</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-sans text-xs text-slate-200">
                    <input
                      type="radio"
                      name="registered"
                      checked={registered === true}
                      onChange={() => setRegistered(true)}
                      className="w-4 h-4 text-brand-primary accent-brand-primary"
                    />
                    ✅ متقاضی دوره‌ها را ثبت‌نام قطعی کرد
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-sans text-xs text-slate-200">
                    <input
                      type="radio"
                      name="registered"
                      checked={registered === false}
                      onChange={() => setRegistered(false)}
                      className="w-4 h-4 text-red-500 accent-red-500"
                    />
                    ❌ متقاضی انصراف داد (رزرو در لابی پیگیری)
                  </label>
                </div>
              </div>

              {/* Form fields for Presenters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs text-slate-400">تحلیل عمیق نهایی پرونده (خانم طحانی - ارزیاب ارشد)</label>
                  <textarea
                    id="tahani-analysis-textarea"
                    value={tahaniCaseNotes}
                    onChange={e => setTahaniCaseNotes(e.target.value)}
                    rows={6}
                    placeholder="کیفیت ارتباط عالی است؛ پکیج نخبگان کاریزما به ایشان آفر داده شد و به سرعت با پرداخت بیعانه ثبت نام نهایی گردید..."
                    className="w-full px-3 py-2 glass-input text-xs focus:outline-none leading-relaxed text-right font-sans text-white focus:border-brand-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs text-slate-400">یادداشت‌های ارزیاب متمم پشتیبان (خانم رضایی)</label>
                  <textarea
                    value={rezaeiSupportNotes}
                    onChange={e => setRezaeiSupportNotes(e.target.value)}
                    rows={6}
                    placeholder="پاسخ‌ها به خوبی پشتیبانی شدند؛ مراجع به تالار نخبگان فن بیان علاقه شدیدی دارد..."
                    className="w-full px-3 py-2 glass-input text-xs focus:outline-none leading-relaxed text-right font-sans text-white"
                  />
                </div>
              </div>

              {/* 100 OPTIONS DYNAMIC AI CONSULTING COPILOT PANEL */}
              <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4 text-right">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <span className="text-[10px] text-brand-primary font-black animate-pulse-slow">● پایش ۱۰۰ گزینه علمی مربی‌گری</span>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-black text-white">💡 دستیار هوشمند و مشاور ۱۰۰ گزینه سرکار خانم طحانی (Gemini Co-Pilot)</h4>
                    <Sparkles className="text-brand-primary animate-spin-slow" size={16} />
                  </div>
                </div>

                <p className="text-[10px] text-slate-300 leading-relaxed">
                  خانم طحانی گرامی، از میان ۱۰ سرفصل راهبردی و ۱۰۰ ابزار تکنیکی زیر می‌توانید غنی‌ترین کتیبه‌های ارزیابی صوتی را متناسب با شخصیت کلاینت انتخاب کرده و با یک ضرب مستقیم به تحلیل نهایی مراجع الصاق کنید:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pt-2">
                  
                  {/* Category Selection Sidebar: 12-cols span-4 */}
                  <div className="md:col-span-4 space-y-1.5 border-l border-slate-850 pl-2">
                    <span className="block text-[9px] text-slate-500 font-bold mb-1">فهرست سرفصل‌های ده‌گانه مشاوره:</span>
                    {CONSULTING_CATEGORIES.map((cat) => {
                      const isSelected = selectedConsultCat === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setSelectedConsultCat(cat.id);
                            // Auto-select first option in new category
                            if (cat.options.length > 0) {
                              setSelectedConsultOpt(cat.options[0].id);
                            }
                          }}
                          className={`w-full py-2 px-3 text-right text-[10px] rounded-xl font-bold transition flex items-center justify-between cursor-pointer ${
                            isSelected 
                              ? "bg-brand-primary text-slate-950 font-black shadow-lg shadow-brand-primary/10" 
                              : "bg-slate-950 hover:bg-slate-900 border border-slate-850/40 text-slate-300"
                          }`}
                        >
                          <span className="text-[8px] opacity-60">{isSelected ? "◀" : ""}</span>
                          <span className="truncate">
                            {cat.icon} {cat.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Options List Selection of Chosen Category: 12-cols span-5 */}
                  <div className="md:col-span-4 space-y-1.5 border-l border-slate-850 pl-2">
                    <span className="block text-[9px] text-slate-500 font-bold mb-1">نسخه کتیبه‌های ده‌گانه این سرفصل:</span>
                    {CONSULTING_CATEGORIES.find(c => c.id === selectedConsultCat)?.options.map((opt) => {
                      const isSelected = selectedConsultOpt === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedConsultOpt(opt.id)}
                          className={`w-full py-2 px-3 text-right text-[9.5px] rounded-lg font-bold transition truncate flex items-center justify-end gap-1.5 cursor-pointer ${
                            isSelected 
                              ? "bg-slate-800 text-brand-primary border border-brand-primary/50" 
                              : "bg-slate-950 hover:bg-slate-900 border border-slate-900 text-slate-400"
                          }`}
                        >
                          <span>{opt.title}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        </button>
                      );
                    }) || <div className="text-[10px] text-slate-600">سرفصلی انتخاب نشده است.</div>}
                  </div>

                  {/* Core Preview and Injection Action Panel: 12-cols span-4 */}
                  <div className="md:col-span-4 bg-slate-950 p-4 rounded-xl border border-slate-850 text-right space-y-3.5">
                    {(() => {
                      const cat = CONSULTING_CATEGORIES.find(c => c.id === selectedConsultCat);
                      const opt = cat?.options.find(o => o.id === selectedConsultOpt);
                      
                      if (!opt) {
                        return (
                          <div className="text-[10px] text-slate-600 text-center py-6">
                            یک توصیه استراتژیک را انتخاب کنید تا جزئیات کتیبه تفهیم شود.
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          <div>
                            <span className="text-[8px] text-brand-primary font-bold bg-brand-primary/10 px-2 py-0.5 rounded-full">توصیه استراتژیک فعال</span>
                            <h5 className="text-[11px] font-black text-white mt-1.5 leading-snug">{opt.title}</h5>
                          </div>

                          <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-850 text-[10px] text-slate-300 leading-relaxed">
                            <span className="text-[8px] text-slate-500 font-bold block mb-0.5">💡 ترفند کلیدی مشاور:</span>
                            {opt.pithyTip}
                          </div>

                          <div className="text-[10px] text-slate-400 font-sans leading-relaxed">
                            <span className="text-[8px] text-slate-500 font-bold block mb-0.5">📜 متن و کتیبه مشاور آماده الصاق:</span>
                            "{opt.scriptTemplate}"
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              // Direct-append to tahaniCaseNotes textarea state!
                              if (tahaniCaseNotes) {
                                setTahaniCaseNotes(prev => prev + "\n" + opt.scriptTemplate);
                              } else {
                                setTahaniCaseNotes(opt.scriptTemplate);
                              }
                            }}
                            className="w-full py-2 bg-gradient-to-l from-brand-primary to-teal-400 text-slate-950 font-black rounded-xl text-[10px] transition active:scale-95 shadow-md shadow-brand-primary/5 cursor-pointer hover:opacity-90 flex justify-center items-center gap-1.5"
                          >
                            <span>➕ تزریق این کتیبه به پرونده سرارزیاب</span>
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                </div>
              </div>

              {/* Gemini decision engine summary representation */}
              {parsedAiFinalSynthesis && (
                <div className="p-5 bg-brand-primary/5 border border-brand-primary/20 rounded-2xl text-xs space-y-4 animate-slide-up shadow-xl shadow-brand-primary/5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/15 pb-3">
                    <div className="flex items-center gap-1.5 text-brand-primary font-black">
                      <Sparkles size={16} className="animate-spin-slow text-brand-primary" />
                      سنتز تحلیلی هوش مصنوعی هدهد (Gemini-AI)
                    </div>
                    
                    {/* Action buttons list */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPrintModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary hover:bg-brand-hover text-white font-bold rounded-lg text-[10px] transition active:scale-95 shadow-lg shadow-brand-primary/10 cursor-pointer"
                      >
                        <Printer size={12} />
                        چاپ و نسخه فیزیکی
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadTxt}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-brand-primary font-bold rounded-lg text-[10px] transition active:scale-95 cursor-pointer"
                      >
                        <Download size={12} />
                        دانلود فایل متنی (TXT)
                      </button>
                    </div>
                  </div>

                  <div className="leading-relaxed text-slate-300 select-text grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="font-bold text-white text-[12px]">
                        حکم پذیرش نهایی: <span className="text-brand-primary font-black">{parsedAiFinalSynthesis.registrationVerdict === "Yes" ? "تایید نهایی سخنوری" : parsedAiFinalSynthesis.registrationVerdict === "Conditional" ? "پذیرش مشروط / زاپاس صندلی" : "عدم انطباق مهارتی"}</span>
                      </p>
                      <p className="mt-1"><span className="text-slate-400 font-bold">مسیر فلوچارت پیشنهادی:</span> {parsedAiFinalSynthesis.trackProposal}</p>
                      <p className="mt-1"><span className="text-slate-400 font-bold">ارزش سرمایه‌گذاری متقاضی (ROI):</span> {parsedAiFinalSynthesis.investmentReturnFactor}</p>
                      <p className="mt-1"><span className="text-slate-400 font-bold">استراتژی حفظ مراجع:</span> {parsedAiFinalSynthesis.retentionStrategy}</p>
                    </div>

                    <div className="bg-white/5 p-3.5 rounded-xl border border-white/5">
                      <span className="font-bold text-brand-primary text-[11px] block border-b border-white/5 pb-1.5 mb-2">محور گزینش و سخنوری هفته‌های اول:</span>
                      <ul className="list-disc list-inside space-y-1.5 pr-1 mt-1 text-slate-400 text-[11px]">
                        {parsedAiFinalSynthesis.firstMonthFocalPoints?.map((f: string, i: number) => (
                          <li key={i} className="leading-relaxed">{f}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Action completion */}
              <div className="space-y-3 pt-3 border-t border-slate-850/60 font-sans">
                {parsedAiFinalSynthesis ? (
                  <button
                    onClick={() => {
                      setSelectedItem(null);
                      setTahaniCaseNotes("");
                      setRezaeiSupportNotes("");
                      setAiFinalReport(null);
                      setHistoryTimeline(null);
                    }}
                    className="w-full py-3 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs flex justify-center items-center gap-1 transition active:scale-95"
                  >
                    بستن پرونده فعلی و بازگشت به میز کار
                  </button>
                ) : (
                  <button
                    onClick={handleCompleteProcess}
                    disabled={isFinishing || !tahaniCaseNotes || !rezaeiSupportNotes}
                    className="w-full py-3 btn-primary glow-on-hover font-extrabold rounded-xl text-xs flex justify-center items-center gap-1 transition active:scale-95 disabled:opacity-45 cursor-pointer"
                  >
                    {isFinishing ? <RefreshCw className="animate-spin" size={12} /> : null}
                    ثبت پرونده و نهایی‌سازی در دیتابیس هدهد
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleReleaseResult(selectedItem)}
                  className="w-full py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 hover:text-slate-200 transition"
                >
                  حفظ در لابی ترخیص خروجی
                </button>
              </div>

            </div>
          ) : (
            <div className="glass-panel p-10 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs">
              متقاضی برای دور نهایی دریافت نتایج کتبی و کارنامه تریبون انتخاب نشده است؛ لطفا یک پرونده را از صف سمت چپ بردارید.
            </div>
          )}
        </div>

      </div>

      {/* Print Preview Modal */}
      {showPrintModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto select-none print:p-0 print:bg-white print:backdrop-blur-none">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body, html {
                background: white !important;
                color: black !important;
                direction: rtl !important;
              }
              #root, header, nav, footer, .print-hide, button {
                display: none !important;
                visibility: hidden !important;
              }
              .print-target {
                display: block !important;
                visibility: visible !important;
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background: white !important;
                color: black !important;
                padding: 0 !important;
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
              }
            }
          `}} />

          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-6 overflow-y-auto max-h-[90vh] print-target print:max-h-none print:overflow-visible print:bg-white print:text-black print:border-none print:p-0 print:m-0 print:rounded-none">
            
            {/* Modal Header controls */}
            <div className="flex justify-between items-center border-b border-white/5 pb-4 print-hide text-right">
              <div className="flex items-center gap-2">
                <Printer className="text-brand-primary animate-pulse" size={18} />
                <h3 className="text-xs font-black text-white">پیش‌نمایش سند صلاحیت و کارنامه چاپی استاندارد</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-brand-primary to-brand-hover hover:from-brand-hover text-white font-black rounded-lg text-xs shadow-lg shadow-brand-primary/10 transition active:scale-95 font-sans cursor-pointer"
                >
                  <Printer size={14} />
                  چاپ کارنامه (A4)
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="w-8 h-8 flex items-center justify-center bg-slate-950 border border-slate-850 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-white transition"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Print Document container */}
            <div className="bg-white text-slate-950 border border-slate-350 p-8 rounded-2xl shadow-xl shadow-black/20 text-right leading-relaxed font-sans space-y-5 print:p-0 print:m-0 print:border-none print:shadow-none print:rounded-none select-text">
              
              {/* Document Header */}
              <div className="flex justify-between items-center border-b-2 border-slate-950 pb-4">
                <div className="text-[9px] text-slate-500 space-y-0.5 font-mono text-left">
                  <p>شماره ارزیابی: <span className="font-bold">HOD-{selectedItem.applicant?.id?.toUpperCase() || "NEW"}</span></p>
                  <p>تاریخ سنجش: {new Date().toLocaleDateString("fa-IR")}</p>
                  <p>درگاه پرونده: انستیتویی داخلی</p>
                </div>
                <div className="text-center space-y-1 pr-6 flex-1">
                  <h4 className="text-md font-extrabold text-slate-950 tracking-wider">انستیتو سخنوری و روان‌سنجی کلامی هدهد</h4>
                  <p className="text-[12px] font-bold text-slate-700">کارنامه رسمی ارزیابی روان‌شناختی و صلاحیت‌سنجی سخنوری</p>
                  <p className="text-[9px] text-slate-400 italic">مبتنی بر خروجی سنجارهای تریبون مسابقه و هوش مصنوعی پیشرفته Gemini-AI</p>
                </div>
                <div className="w-16 h-16 border-2 border-slate-950 flex flex-col items-center justify-center text-center font-black text-[9px] p-1.5 leading-tight rounded">
                  <span>مهر رسمی</span>
                  <span>انستیتو هدهد</span>
                </div>
              </div>

              {/* Informational table */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-4 bg-slate-50 border border-slate-200 p-4 rounded-xl text-[11px] text-slate-800">
                <div>
                  <span className="text-slate-500 block text-[9px] mb-0.5">نام و نام خانوادگی مراجع:</span>
                  <strong className="text-slate-950">{selectedItem.applicant?.fullName || "نامشخص"}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] mb-0.5">سن متقاضی:</span>
                  <strong className="text-slate-950">{selectedItem.applicant?.age || "نامشخص"} سال</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] mb-0.5">میزان تحصیلات علمی:</span>
                  <strong className="text-slate-950">{selectedItem.applicant?.educationLevel || "نامشخص"}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] mb-0.5">شهر محل پرونده:</span>
                  <strong className="text-slate-950">{selectedItem.applicant?.city || "نامشخص"}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] mb-0.5">شماره تلفن درگاه:</span>
                  <strong className="text-slate-950 font-mono">{selectedItem.applicant?.phone || "نامشخص"}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] mb-0.5">ارزیاب ارشد پرونده:</span>
                  <strong className="text-slate-950">خانم طحانی (+ دستیاری متمم)</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] mb-0.5">تعیین رتبه پذیرش نهایی:</span>
                  <strong className="text-emerald-700">{registered ? "ثبت‌نام نهایی کتبی" : "انصراف / معلق در پیگیری"}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] mb-0.5">کلاس فلوچارت کلماتی:</span>
                  <strong className="text-brand-primary">{parsedAiFinalSynthesis?.trackProposal || "عمومی کاریزما"}</strong>
                </div>
              </div>

              {/* 8 Parameters grid and overall score section */}
              <div className="space-y-3.5 border-t border-slate-200 pt-4">
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    {!isEditingScores ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingScores(true)}
                        className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold rounded-lg text-[10px] transition active:scale-95 cursor-pointer"
                      >
                        ✏️ تغییر و ارتقاء نمرات متقاضی (تصحیح ارزیاب ارشد)
                      </button>
                    ) : (
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={handleSaveScoresOverride}
                          disabled={isSavingScores}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] transition active:scale-95 disabled:opacity-40 cursor-pointer"
                        >
                          {isSavingScores ? "در حال بازسنجی با هوش مصنوعی..." : "ثبت نهایی اصلاحات و آنالیز مجدد"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingScores(false)}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] transition cursor-pointer"
                        >
                          انصراف
                        </button>
                      </div>
                    )}
                  </div>

                  <h5 className="text-[11px] font-black text-slate-950 flex items-center gap-1.5">
                    <span className="w-1.5 h-3 bg-slate-950 inline-block" />
                    نتایج تفکیکی تریبیون مسابقه سخنوری (داور: استاد کاظمی)
                  </h5>
                </div>

                {isEditingScores ? (
                  <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-200 space-y-4 text-right animate-expand-height">
                    <p className="text-[10px] text-amber-800 font-bold leading-normal">
                      ⚠️ شما در حال بازنویسی فرم نمرات داوری هستید. پس از کلیک بر روی دکمه ثبت، کل کارهای سنجش مجدداً توسط هوش مصنوعی دیسیپلین شده و فلوچارت‌های کلامی بازسنجی و اصلاح خواهند گشت.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <div className="flex justify-between font-sans">
                          <span className="font-bold text-slate-900">وضوح کلامی و تلفظ صحیح حروف:</span>
                          <span className="font-mono text-amber-700 font-black">{editClarity} / ۱۰</span>
                        </div>
                        <input
                          type="range" min="1" max="10" step="1"
                          value={editClarity}
                          onChange={e => setEditClarity(Number(e.target.value))}
                          className="w-full accent-amber-600 cursor-ew-resize"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between font-sans">
                          <span className="font-bold text-slate-900">اعتماد به نفس و غلبه بر تریبون:</span>
                          <span className="font-mono text-amber-700 font-black">{editConfidence} / ۱۰</span>
                        </div>
                        <input
                          type="range" min="1" max="10" step="1"
                          value={editConfidence}
                          onChange={e => setEditConfidence(Number(e.target.value))}
                          className="w-full accent-amber-600 cursor-ew-resize"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between font-sans">
                          <span className="font-bold text-slate-900">لحن صوتی و فرکانس بم:</span>
                          <span className="font-mono text-amber-700 font-black">{editTone} / ۱۰</span>
                        </div>
                        <input
                          type="range" min="1" max="10" step="1"
                          value={editTone}
                          onChange={e => setEditTone(Number(e.target.value))}
                          className="w-full accent-amber-600 cursor-ew-resize"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between font-sans">
                          <span className="font-bold text-slate-900">غنای غنی دایره واژگان انتخابی:</span>
                          <span className="font-mono text-amber-700 font-black">{editVocabulary} / ۱۰</span>
                        </div>
                        <input
                          type="range" min="1" max="10" step="1"
                          value={editVocabulary}
                          onChange={e => setEditVocabulary(Number(e.target.value))}
                          className="w-full accent-amber-600 cursor-ew-resize"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between font-sans">
                          <span className="font-bold text-slate-900">مهندسی و ساختار جملات:</span>
                          <span className="font-mono text-amber-700 font-black">{editStructure} / ۱۰</span>
                        </div>
                        <input
                          type="range" min="1" max="10" step="1"
                          value={editStructure}
                          onChange={e => setEditStructure(Number(e.target.value))}
                          className="w-full accent-amber-600 cursor-ew-resize"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between font-sans">
                          <span className="font-bold text-slate-900">انتقال حس و هنر بیان سناریو:</span>
                          <span className="font-mono text-amber-700 font-black">{editExpression} / ۱۰</span>
                        </div>
                        <input
                          type="range" min="1" max="10" step="1"
                          value={editExpression}
                          onChange={e => setEditExpression(Number(e.target.value))}
                          className="w-full accent-amber-600 cursor-ew-resize"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between font-sans">
                          <span className="font-bold text-slate-900">زبان بدن زنده و ژست‌های اقتدار:</span>
                          <span className="font-mono text-amber-700 font-black">{editBodyLanguage} / ۱۰</span>
                        </div>
                        <input
                          type="range" min="1" max="10" step="1"
                          value={editBodyLanguage}
                          onChange={e => setEditBodyLanguage(Number(e.target.value))}
                          className="w-full accent-amber-600 cursor-ew-resize"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between font-sans">
                          <span className="font-bold text-slate-900">تداوم ارتباط چشمی مستقیم:</span>
                          <span className="font-mono text-amber-700 font-black">{editEyeContact} / ۱۰</span>
                        </div>
                        <input
                          type="range" min="1" max="10" step="1"
                          value={editEyeContact}
                          onChange={e => setEditEyeContact(Number(e.target.value))}
                          className="w-full accent-amber-600 cursor-ew-resize"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2 border-t border-amber-200">
                      <div className="space-y-1.5 text-right">
                        <label className="block text-[10px] text-slate-600 font-bold">شرح و فیدبک عمومی مکتوب داور رسمی:</label>
                        <textarea
                          rows={2}
                          value={editJudgeDesc}
                          onChange={e => setEditJudgeDesc(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-amber-300 text-slate-900 text-[11px] focus:outline-none rounded-xl text-right"
                        />
                      </div>
                      <div className="space-y-1.5 text-right">
                        <label className="block text-[10px] text-slate-600 font-bold">پیام محرمانه داور به خانم طحانی:</label>
                        <textarea
                          rows={2}
                          value={editMessageToTahani}
                          onChange={e => setEditMessageToTahani(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-amber-300 text-slate-900 text-[11px] focus:outline-none rounded-xl text-right"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-[10px]">
                      <div className="space-y-1">
                        <div className="flex justify-between text-slate-600 font-sans">
                          <span>وضوح کلامی و تلفظ صحیح حروف</span>
                          <span className="font-bold text-slate-950">{historyTimeline?.tests?.[0]?.paramClarity || "8"} / ۱۰</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-900" style={{ width: `${(historyTimeline?.tests?.[0]?.paramClarity || 8) * 10}%` }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-slate-600 font-sans">
                          <span>اعتماد به نفس و غلبه بر تریبون</span>
                          <span className="font-bold text-slate-950">{historyTimeline?.tests?.[0]?.paramConfidence || "7"} / ۱۰</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-900" style={{ width: `${(historyTimeline?.tests?.[0]?.paramConfidence || 7) * 10}%` }} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-slate-600 font-sans">
                          <span>زبان بدن زنده و ارتباط غیر‌کلامی</span>
                          <span className="font-bold text-slate-950">{historyTimeline?.tests?.[0]?.paramBodyLanguage || "7"} / ۱۰</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-900" style={{ width: `${(historyTimeline?.tests?.[0]?.paramBodyLanguage || 7) * 10}%` }} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-slate-600 font-sans">
                          <span>هندسه و ساختار جملات سخنرانی</span>
                          <span className="font-bold text-slate-950">{historyTimeline?.tests?.[0]?.paramStructure || "8"} / ۱۰</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-900" style={{ width: `${(historyTimeline?.tests?.[0]?.paramStructure || 8) * 10}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-250 rounded-lg text-[10px] text-slate-700 leading-relaxed mt-1">
                      <span className="font-bold text-slate-950 block mb-1">● تحلیل تفصیلی مکتوب داور مسابقه سناریو فی‌البداهه (استاد کاظمی):</span>
                      {historyTimeline?.tests?.[0]?.judgeDescription || "متقاضی با ارائه‌ای پویا، پتانسیل شنیداری بالایی را به تماشا گذاشت. جهت ارتقای سطح، کنترل شتاب در ادای کلمات کلیدی پیشنهاد اول است."}
                    </div>

                    {/* CONFIDENTIAL MESSAGE FROM JUDGE TO TAHANI DISPLAY BLOCK */}
                    {historyTimeline?.tests?.[0]?.messageToTahani && (
                      <div className="p-3 bg-pink-50 border border-pink-200 rounded-lg text-[10px] text-pink-900 leading-relaxed mt-2 animate-pulse-slow">
                        <span className="font-bold text-pink-700 block mb-1">💬 پیام محرمانه و فوری داور به خانم طحانی:</span>
                        {historyTimeline.tests[0].messageToTahani}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Gemini AI synthesis output on printed card */}
              {parsedAiFinalSynthesis && (
                <div className="space-y-3.5 border-t border-slate-200 pt-4">
                  <h5 className="text-[11px] font-black text-slate-950 flex items-center gap-1.5">
                    <span className="w-1.5 h-3 bg-slate-950 inline-block" />
                    تعاملات و توصیه‌نامه سنتزشده مدل Gemini AI
                  </h5>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px]">
                    <div className="p-3.5 border border-slate-200 rounded-xl space-y-1.5 leading-relaxed bg-white text-slate-900">
                      <p><span className="font-bold text-slate-950">حکم تخصصی پذیرش هوش مصنوعی:</span> {parsedAiFinalSynthesis.registrationVerdict === "Yes" ? "موافق ثبتی نهایی" : parsedAiFinalSynthesis.registrationVerdict === "Conditional" ? "پذیرش مشروط" : "عدم انطباق مهارتی فعلی"}</p>
                      <p><span className="font-bold text-slate-950">مسیر دوره پیشنهادی:</span> {parsedAiFinalSynthesis.trackProposal}</p>
                      <p><span className="font-bold text-slate-950">نرخ بازگشت سرمایه‌گذاری (ROI):</span> {parsedAiFinalSynthesis.investmentReturnFactor}</p>
                      <p><span className="font-bold text-slate-950">استراتژی حفظ مراجع:</span> {parsedAiFinalSynthesis.retentionStrategy}</p>
                    </div>

                    <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50 space-y-1 text-slate-900">
                      <span className="font-bold text-slate-950 block mb-1">● اهداف مهارتی سخنوری در هفته‌های اول دوره:</span>
                      <ol className="list-decimal list-inside space-y-1 text-slate-700 font-sans">
                        {parsedAiFinalSynthesis.firstMonthFocalPoints?.map((item: string, idx: number) => (
                          <li key={idx} className="leading-relaxed">{item}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              )}

              {/* Evaluators final remarks section (tahani + rezaei) */}
              <div className="space-y-3 border-t border-slate-200 pt-4 text-[10px] text-slate-750">
                <h5 className="text-[11px] font-black text-slate-950 flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-slate-950 inline-block" />
                  شرح نظر نهایی هیئت صادرکنندگان صلاحیت کارگاه علمی
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 border border-slate-200 rounded-xl bg-white text-slate-900">
                    <span className="font-bold text-slate-950 block mb-1">۱. تحلیل عمیق پرونده (خانم طحانی - سرارزیاب):</span>
                    <p className="leading-normal">{tahaniCaseNotes || historyTimeline?.results?.[0]?.tahaniAnalysis || "کیفیت ارتباط عالی و متقاعدکننده است. پکیج نخبگان فن بیان آفر داده شد."}</p>
                  </div>
                  <div className="p-3 border border-slate-200 rounded-xl bg-white text-slate-900">
                    <span className="font-bold text-slate-950 block mb-1">۲. یادداشت‌های متمم پشتیبان (خانم رضایی):</span>
                    <p className="leading-normal">{rezaeiSupportNotes || historyTimeline?.results?.[0]?.consultationPanelNotes || "مراجع رویکرد فعالی نشان داد؛ مشاق یادگیری مهندسی واژگان برای تریبون‌های عمومی است."}</p>
                  </div>
                </div>
              </div>

              {/* Document signatures footer */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-3 text-center text-[10px] text-slate-600 font-sans gap-4 leading-relaxed pr-6 pl-6">
                <div className="space-y-1">
                  <p className="font-bold text-slate-900">امضای سرارزیاب</p>
                  <p className="text-[8px] text-slate-400">خانم طحانی</p>
                  <div className="h-8 border-b border-dashed border-slate-300 w-24 mx-auto" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-slate-900">مهر صحت انطباق</p>
                  <p className="text-[8px] text-slate-400">دپارتمان آموزش هدهد</p>
                  <div className="h-10 w-10 border border-dashed border-slate-400 rounded-full mx-auto flex items-center justify-center text-[8px] text-slate-400">
                    مهر انستیتو
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-slate-900">امضای مباشر متمم</p>
                  <p className="text-[8px] text-slate-400 font-sans">خانم رضایی</p>
                  <div className="h-8 border-b border-dashed border-slate-300 w-24 mx-auto" />
                </div>
              </div>

            </div>

            {/* Modal Print Footer Controls */}
            <div className="flex justify-end gap-3 pt-4 print-hide border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-slate-400 text-xs transition duration-150 active:scale-95 cursor-pointer"
              >
                بستن پنجره پیش‌نمایش
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-6 py-2 bg-gradient-to-r from-brand-primary to-brand-hover text-white font-black rounded-xl text-xs shadow-lg shadow-brand-primary/25 transition active:scale-95 font-sans cursor-pointer animate-pulse"
              >
                <Printer size={14} />
                ارسال به پرینتر / ذخیره PDF
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
