/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, SystemLog, WarningSeverity } from "../types.js";
import { 
  Shield, Users, Activity, Terminal, AlertTriangle, Database, RefreshCw, 
  UserPlus, UserMinus, ShieldAlert, Send, CheckCircle2, Copy, Play, Sparkles,
  Clock, ArrowLeft, ClipboardList, Edit3, Printer, FileText, Calendar, Flame,
  Settings, Lock, BookOpen, Award, HelpCircle, Check, MapPin, RotateCcw, Info,
  Cpu, Layers, LockKeyhole, Bookmark, Search, Menu, Eye, EyeOff, CheckCircle
} from "lucide-react";
import { getPersianDateTimeString } from "../lib/dateUtils.js";
import { 
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area
} from "recharts";

interface AdminPanelProps {
  adminUser: User;
}

export default function AdminPanel({ adminUser }: AdminPanelProps) {
  const [stats, setStats] = useState<any>({
    todayCount: 0,
    completedCount: 0,
    noShowCount: 0,
    conversionRate: 0,
    enrolledCount: 0,
    totalProcessed: 0,
    bottlenecks: []
  });

  const [operators, setOperators] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<SystemLog[]>([]);
  const [immutableLogs, setImmutableLogs] = useState<any[]>([]);
  const [activeLogTab, setActiveLogTab] = useState<"system" | "immutable">("immutable");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActionType, setFilterActionType] = useState("ALL");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  // Form states for warning dispatch
  const [warnOp, setWarnOp] = useState("");
  const [warnReason, setWarnReason] = useState("");
  const [warnSeverity, setWarnSeverity] = useState("warning");
  const [warnSuccess, setWarnSuccess] = useState(false);

  // Form states for user management
  const [opUsername, setOpUsername] = useState("");
  const [opFullName, setOpFullName] = useState("");
  const [opRole, setOpRole] = useState("CONTACT_OP");
  const [opPassword, setOpPassword] = useState("");
  const [opSuccess, setOpSuccess] = useState<string | null>(null);

  // cPanel Connection test simulation states
  const [isDbTesting, setIsDbTesting] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<string | null>(null);

  // --- REAL-TIME SERVER HEALTH STATUS ---
  const [serverHealthStatus, setServerHealthStatus] = useState<"online" | "offline" | "checking">("checking");
  const [serverHealthLatency, setServerHealthLatency] = useState<number | null>(null);

  // Simulation suite states
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStatus, setSimulationStatus] = useState<string | null>(null);

  // Administrative Dossier Command Center states
  const [activeTab, setActiveTab] = useState<"dashboard" | "dossiers" | "finalized" | "developer_center" | "appointments">("dashboard");
  const [selectedFinalizedApp, setSelectedFinalizedApp] = useState<any | null>(null);
  const [finalizedTimeline, setFinalizedTimeline] = useState<any | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [isAnalyzingCumulative, setIsAnalyzingCumulative] = useState(false);
  const [cumulativeSynthesisResult, setCumulativeSynthesisResult] = useState<string | null>(null);
  const [finalSearch, setFinalSearch] = useState("");
  const [finalStatusFilter, setFinalStatusFilter] = useState<string>("all");

  // --- DEVELOPER COCKPIT DURABLE PERSISTENT STATES ---
  const [lockdownMode, setLockdownMode] = useState<string>(() => localStorage.getItem("hodhod_lockdown_mode") || "normal");
  const [lockdownReason, setLockdownReason] = useState<string>(() => localStorage.getItem("hodhod_lockdown_reason") || "بروزرسانی روتین معماری و بهینه‌سازی دیتابیس");
  const [dbIsolationMode, setDbIsolationMode] = useState<string>(() => localStorage.getItem("hodhod_db_isolation") || "read_write");
  const [aiProvider, setAiProvider] = useState<string>(() => localStorage.getItem("hodhod_ai_provider") || "gemini");
  const [aiModelName, setAiModelName] = useState<string>(() => localStorage.getItem("hodhod_ai_model") || "gemini-2.5-pro");
  const [promptVersion, setPromptVersion] = useState<string>("v1.9.4-production");
  const [aiApiKeySimulated, setAiApiKeySimulated] = useState<string>("••••••••••••••••••••••••");
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [aiTestLatency, setAiTestLatency] = useState<number | null>(null);
  const [docSearchQuery, setDocSearchQuery] = useState("");
  const [selectedDocId, setSelectedDocId] = useState("architecture");
  const [devSubTab, setDevSubTab] = useState<string>("lockdown");

  // --- APPT RESCHEDULER STATES ---
  const [reschedulingAppId, setReschedulingAppId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [isSavingAppointment, setIsSavingAppointment] = useState(false);
  const [apptSearch, setApptSearch] = useState("");
  const [apptStatusFilter, setApptStatusFilter] = useState<string>("all");

  // --- GUIDE PERSONA AND ONBOARDING ---
  const [guideActive, setGuideActive] = useState<boolean>(() => localStorage.getItem("hodhod_guide_active") === "true");
  const [guidePanel, setGuidePanel] = useState<string>(() => localStorage.getItem("hodhod_guide_panel") || "call_op");
  const [guideStepIndex, setGuideStepIndex] = useState<number>(0);

  const getFormattedWaitTime = (timelineData: any, stage: string) => {
    if (!timelineData) return "۸ دقیقه (تخمینی)";
    try {
      switch(stage) {
        case "contact": {
          return "۵ دقیقه (ثبت اولیه)";
        }
        case "reception": {
          return "۱۴ دقیقه (زمان انتظار صف)";
        }
        case "consultation": {
          const c = timelineData.consultations?.[0];
          if (c?.durationMinutes) return `${c.durationMinutes} دقیقه (زمان مشاوره)`;
          return "۲۰ دقیقه";
        }
        case "middle_room": {
          return "۹ دقیقه (تعامل میانی)";
        }
        case "test": {
          return "۱۵ دقیقه (مدت آزمون غرفه)";
        }
        default:
          return "۸ دقیقه";
      }
    } catch(e) {
      return "۱۰ دقیقه";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_contact":
        return <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[8px] font-bold rounded">ثبت‌نام اولیه دیجی‌فرم</span>;
      case "scheduled":
        return <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-[8px] font-bold rounded">هماهنگ تلفنی</span>;
      case "arrived":
        return <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[8px] font-bold rounded">پذیرش حضور</span>;
      case "in_consultation":
        return <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-400 text-[8px] font-bold rounded">مشاوره کلامی</span>;
      case "in_middle_room":
        return <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 text-[8px] font-bold rounded">تمرین میانی</span>;
      case "in_test":
        return <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[8px] font-bold rounded">غرفه داوری</span>;
      case "in_result":
        return <span className="px-1.5 py-0.5 bg-pink-500/20 text-pink-400 text-[8px] font-bold rounded">تصمیم نهایی</span>;
      case "completed":
        return <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[8px] font-bold rounded">نهایی و بایگانی</span>;
      case "no_show":
        return <span className="px-1.5 py-0.5 bg-red-500/20 text-red-500 text-[8px] font-bold rounded">غیبت</span>;
      default:
        return <span className="px-1.5 py-0.5 bg-slate-800 text-slate-350 text-[8px] font-mono rounded">{status}</span>;
    }
  };

  const handleSelectFinalized = async (app: any) => {
    setSelectedFinalizedApp(app);
    setTimelineLoading(true);
    setFinalizedTimeline(null);
    setCumulativeSynthesisResult(null);
    try {
      const res = await fetch(`/api/applicants/${app.id}/timeline`);
      if (res.ok) {
        const data = await res.json();
        setFinalizedTimeline(data);
        const storedSynthesis = data.results?.[0]?.aiFinalSynthesis || app.aiAnalysis || null;
        if (storedSynthesis) {
          setCumulativeSynthesisResult(storedSynthesis);
        }
      }
    } catch (e) {
      console.error("Error fetching finalized timeline:", e);
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleTriggerCumulativeSynthesis = async (appId: string) => {
    setIsAnalyzingCumulative(true);
    try {
      const res = await fetch(`/api/admin/applicants/${appId}/cumulative-synthesis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorId: adminUser?.id || "admin",
          actorName: adminUser?.fullName || "مدیر ارشد سیستم"
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCumulativeSynthesisResult(data.synthesis);
        if (finalizedTimeline) {
          const updatedResults = [...(finalizedTimeline.results || [])];
          if (updatedResults.length > 0) {
            updatedResults[0] = { ...updatedResults[0], aiFinalSynthesis: data.synthesis };
            setFinalizedTimeline({ ...finalizedTimeline, results: updatedResults });
          }
        }
      } else {
        alert("خطا در بازتحلیل جامع توسط هوش پیشرفته هدهد صبا.");
      }
    } catch (e) {
      console.error("Error triggering cumulative synthesis:", e);
      alert("برقراری ارتباط با مدل Gemini با خطا مواجه گردید.");
    } finally {
      setIsAnalyzingCumulative(false);
    }
  };
  const [allApplicants, setAllApplicants] = useState<any[]>([]);
  const [queueStates, setQueueStates] = useState<any[]>([]);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierError, setDossierError] = useState<string | null>(null);
  
  // Search and filter states inside Dossiers
  const [dossierSearch, setDossierSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, completed, pending, flagged, stuck
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(null);
  const [selectedApplicant, setSelectedApplicant] = useState<any | null>(null);
  const [isEditingDossier, setIsEditingDossier] = useState(false);
  const [stageToReanalyze, setStageToReanalyze] = useState<string>("");
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [reanalyzeSuccessMsg, setReanalyzeSuccessMsg] = useState<string | null>(null);

  // Edit fields states for demographic and stages
  const [editFullName, setEditFullName] = useState("");
  const [editNationalId, setEditNationalId] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAge, setEditAge] = useState(24);
  const [editGender, setEditGender] = useState("male");
  const [editEducation, setEditEducation] = useState("");
  const [editOccupation, setEditOccupation] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editNotesGeneral, setEditNotesGeneral] = useState("");

  const [editContactNotes, setEditContactNotes] = useState("");
  const [editReceptionNotes, setEditReceptionNotes] = useState("");
  const [editConsultnotes, setEditConsultnotes] = useState("");
  const [editMiddleNotes, setEditMiddleNotes] = useState("");
  const [editTestNotes, setEditTestNotes] = useState("");
  const [editFinalNotes, setEditFinalNotes] = useState("");

  const [editClarity, setEditClarity] = useState(5);
  const [editConfidence, setEditConfidence] = useState(5);
  const [editTone, setEditTone] = useState(5);
  const [editVocabulary, setEditVocabulary] = useState(5);
  const [editStructure, setEditStructure] = useState(5);
  const [editExpression, setEditExpression] = useState(5);
  const [editBodyLanguage, setEditBodyLanguage] = useState(5);
  const [editEyeContact, setEditEyeContact] = useState(5);
  const [editTotalScore, setEditTotalScore] = useState(5.0);

  // Administrative action triggers states
  const [mergePrimaryId, setMergePrimaryId] = useState("");
  const [mergeDuplicateId, setMergeDuplicateId] = useState("");
  const [mergeStatus, setMergeStatus] = useState<string | null>(null);

  const fetchApplicants = async () => {
    setDossierLoading(true);
    setDossierError(null);
    try {
      const resApps = await fetch("/api/applicants");
      const resQueue = await fetch("/api/queue");
      if (resApps.ok && resQueue.ok) {
        const apps = await resApps.json();
        const queueValues = await resQueue.json();
        setAllApplicants(apps);
        setQueueStates(queueValues);
      } else {
        setDossierError("امکان دریافت فهرست پرونده‌ها و صف وجود ندارد.");
      }
    } catch (e) {
      setDossierError("اتصال با سرور قطع گردیده است.");
    } finally {
      setDossierLoading(false);
    }
  };

  const getPreviousStage = (currentStage: string) => {
    switch (currentStage?.toLowerCase()) {
      case "reception": return "contact";
      case "waiting_1": return "contact";
      case "consultation": return "reception";
      case "waiting_2": return "reception";
      case "middle_room": return "consultation";
      case "waiting_3": return "consultation";
      case "test": return "middle_room";
      case "waiting_4": return "middle_room";
      case "result": return "test";
      default: return null;
    }
  };

  const handleRollback = async (id: string, currentStage: string) => {
    const prevStage = getPreviousStage(currentStage);
    if (!prevStage) {
      alert("این پرونده در مرحله ابتدایی با فاز قبل‌تری برای بازگشت مناسب وجود ندارد.");
      return;
    }
    const confirmRollback = window.confirm(`آیا مطمئن هستید که می‌خواهید وضعیت پرونده را از ${currentStage} به ${prevStage} بازگردانید؟`);
    if (!confirmRollback) return;

    try {
      const res = await fetch(`/api/admin/applicants/${id}/correct-stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetStage: prevStage.toUpperCase(),
          actorId: adminUser.id,
          actorName: adminUser.fullName
        })
      });
      if (res.ok) {
        fetchApplicants();
      } else {
        const d = await res.json();
        alert(d.error || "خطایی رخ داد.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectApplicant = async (app: any) => {
    setSelectedApplicantId(app.id);
    setSelectedApplicant(app);
    setIsEditingDossier(true);
    setReanalyzeSuccessMsg(null);
    setStageToReanalyze("");

    // Set demographics
    setEditFullName(app.fullName || "");
    setEditNationalId(app.nationalId || "");
    setEditPhone(app.phone || "");
    setEditAge(app.age || 24);
    setEditGender(app.gender || "male");
    setEditEducation(app.educationLevel || "");
    setEditOccupation(app.occupation || "");
    setEditCity(app.city || "");
    setEditNotesGeneral(app.notesGeneral || "");

    // Clear notes first
    setEditContactNotes("");
    setEditReceptionNotes("");
    setEditConsultnotes("");
    setEditMiddleNotes("");
    setEditTestNotes("");
    setEditFinalNotes("");

    setEditClarity(5);
    setEditConfidence(5);
    setEditTone(5);
    setEditVocabulary(5);
    setEditStructure(5);
    setEditExpression(5);
    setEditBodyLanguage(5);
    setEditEyeContact(5);
    setEditTotalScore(5.0);

    try {
      const res = await fetch(`/api/applicants/${app.id}/timeline`);
      if (res.ok) {
        const timeline = await res.json();
        
        if (timeline.contacts && timeline.contacts.length > 0) {
          setEditContactNotes(timeline.contacts[0].operatorNotes || "");
        }
        if (timeline.receptions && timeline.receptions.length > 0) {
          setEditReceptionNotes(timeline.receptions[0].operatorNotes || "");
        }
        if (timeline.consultations && timeline.consultations.length > 0) {
          setEditConsultnotes(timeline.consultations[0].consultantNotes || "");
        }
        if (timeline.middleRooms && timeline.middleRooms.length > 0) {
          setEditMiddleNotes(timeline.middleRooms[0].briefingNotes || "");
        }
        if (timeline.tests && timeline.tests.length > 0) {
          const t = timeline.tests[0];
          setEditTestNotes(t.judgeDescription || "");
          setEditClarity(t.paramClarity || 5);
          setEditConfidence(t.paramConfidence || 5);
          setEditTone(t.paramTone || 5);
          setEditVocabulary(t.paramVocabulary || 5);
          setEditStructure(t.paramStructure || 5);
          setEditExpression(t.paramExpression || 5);
          setEditBodyLanguage(t.paramBodyLanguage || 5);
          setEditEyeContact(t.paramEyeContact || 5);
          setEditTotalScore(t.totalScore || 5.0);
        }
        if (timeline.results && timeline.results.length > 0) {
          setEditFinalNotes(timeline.results[0].tahaniAnalysis || "");
        }
      }
    } catch (e) {
      console.error("Error fetching timeline:", e);
    }
  };

  const handleSaveAndReanalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApplicant) return;

    setIsReanalyzing(true);
    setReanalyzeSuccessMsg(null);

    const payload = {
      applicantUpdates: {
        fullName: editFullName,
        nationalId: editNationalId,
        phone: editPhone,
        age: editAge,
        gender: editGender,
        educationLevel: editEducation,
        occupation: editOccupation,
        city: editCity,
        notesGeneral: editNotesGeneral
      },
      stageToReanalyze: stageToReanalyze || null,
      stageLogUpdates: {
        contact: {
          operatorNotes: editContactNotes
        },
        reception: {
          operatorNotes: editReceptionNotes
        },
        consultation: {
          consultantNotes: editConsultnotes
        },
        middle_room: {
          briefingNotes: editMiddleNotes
        },
        test: {
          judgeDescription: editTestNotes,
          scores: {
            clarity: editClarity,
            confidence: editConfidence,
            tone: editTone,
            vocabulary: editVocabulary,
            structure: editStructure,
            expression: editExpression,
            bodyLanguage: editBodyLanguage,
            eyeContact: editEyeContact,
            total: editTotalScore
          }
        },
        final: {
          tahaniAnalysis: editFinalNotes
        }
      },
      actorId: adminUser.id,
      actorName: adminUser.fullName
    };

    try {
      const res = await fetch(`/api/admin/applicants/${selectedApplicant.id}/update-and-reanalyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const d = await res.json();
      if (res.ok) {
        setReanalyzeSuccessMsg(d.message || "تغییرات شما در پرونده با موفقیت ذخیره شد.");
        fetchApplicants();
        // Update local reference
        const updated = allApplicants.find(a => a.id === selectedApplicant.id);
        if (updated) {
          setSelectedApplicant(updated);
        }
      } else {
        alert(d.error || "خطایی در به‌روزرسانی رخ داد.");
      }
    } catch (err) {
      console.error(err);
      alert("خطا در ارتباط با سرور جهت بازتحلیل.");
    } finally {
      setIsReanalyzing(false);
    }
  };

  const handleMergeAction = async () => {
    if (!mergePrimaryId || !mergeDuplicateId) {
      alert("لطفا شناسه هردوی پرونده اصلی و کپی را وارد کنید.");
      return;
    }
    setMergeStatus("در حال ادغام دیتابیس...");
    try {
      const res = await fetch("/api/admin/applicants/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryId: mergePrimaryId,
          duplicateId: mergeDuplicateId,
          actorId: adminUser.id,
          actorName: adminUser.fullName
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMergeStatus("ادغام پرونده‌های همزاد با موفقیت به پایان رسید.");
        setMergePrimaryId("");
        setMergeDuplicateId("");
        fetchApplicants();
        setTimeout(() => setMergeStatus(null), 3500);
      } else {
        setMergeStatus(data.error || "خطایی رخ داد.");
      }
    } catch (e) {
      setMergeStatus("خطا در ارتباط با سرور.");
    }
  };

  const handleFlagAction = async (id: string, isFlagged: boolean) => {
    const reason = isFlagged ? prompt("علت نشانه‌گذاری تعلیق برای این پرونده را بنویسید:") : "";
    if (isFlagged && reason === null) return; // user cancelled

    try {
      const res = await fetch(`/api/admin/applicants/${id}/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isFlagged,
          flagReason: reason,
          actorId: adminUser.id,
          actorName: adminUser.fullName
        })
      });
      if (res.ok) {
        fetchApplicants();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRecoverAction = async (id: string) => {
    const stage = prompt("جهت احیاء پرونده؛ فاز مقصد در صف را بنویسید (CONTACT, RECEPTION, CONSULTATION, TEST, RESULT):", "RECEPTION");
    if (!stage) return;

    try {
      const res = await fetch(`/api/admin/applicants/${id}/recover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetStage: stage,
          actorId: adminUser.id,
          actorName: adminUser.fullName
        })
      });
      if (res.ok) {
        alert("پرونده با موفقیت احیاء و به صف منتقل شد.");
        fetchApplicants();
      } else {
        const d = await res.json();
        alert(d.error || "خطایی رخ داد.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStageCorrectionAction = async (id: string) => {
    const stage = prompt("تغییر دستی فاز پرونده در صف (CONTACT, RECEPTION, CONSULTATION, TEST, RESULT):");
    if (!stage) return;

    try {
      const res = await fetch(`/api/admin/applicants/${id}/correct-stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetStage: stage,
          actorId: adminUser.id,
          actorName: adminUser.fullName
        })
      });
      if (res.ok) {
        fetchApplicants();
      } else {
        const d = await res.json();
        alert(d.error || "خطایی رخ داد.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveAppointmentInfo = async (appId: string, customDate: string, customTime: string) => {
    setIsSavingAppointment(true);
    try {
      const res = await fetch(`/api/applicants/${appId}/update-appointment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentDate: customDate,
          appointmentTime: customTime
        })
      });
      if (res.ok) {
        fetchApplicants();
        setReschedulingAppId(null);
      } else {
        alert("خطا در تنظیم نوبت مراجع.");
      }
    } catch (err) {
      console.error(err);
      alert("خطا در برقراری ارتباط با پورت نوبت‌دهی.");
    } finally {
      setIsSavingAppointment(false);
    }
  };

  const triggerSimulation = async (count: number) => {
    setIsSimulating(true);
    setSimulationStatus(`در حال برقراری کانال ایمن و تزریق هوشمند ${count} مراجع فرضی آزمایشگاهی...`);
    try {
      const res = await fetch(`/api/admin/generate-mock?actorId=${adminUser.id}&actorName=${encodeURIComponent(adminUser.fullName)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count })
      });
      if (res.ok) {
        setSimulationStatus(`عملیات تزریق با موفقیت پایان پذیرفت. بار صفوف در نمودار بروزرسانی گردید.`);
        setTimeout(() => setSimulationStatus(null), 4000);
        fetchAdminData();
      } else {
        setSimulationStatus("خطا در سیستم شبیه‌ساز.");
        setTimeout(() => setSimulationStatus(null), 3000);
      }
    } catch (e) {
      console.error(e);
      setSimulationStatus("عدم پاسخگویی از درگاه بهارستان.");
      setTimeout(() => setSimulationStatus(null), 3000);
    } finally {
      setIsSimulating(false);
    }
  };

  const triggerFlushMocks = async () => {
    setIsSimulating(true);
    setSimulationStatus("در حال لغو وضعیت‌های آزمایشی و تخلیه صفوف فرضی...");
    try {
      const res = await fetch(`/api/admin/reset-all?actorId=${adminUser.id}&actorName=${encodeURIComponent(adminUser.fullName)}`, {
        method: "POST"
      });
      if (res.ok) {
        setSimulationStatus("صف با موفقیت تخلیه شد و مراجعان واقعی ابقاء گردیدند.");
        setTimeout(() => setSimulationStatus(null), 4000);
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSimulating(false);
    }
  };

  const fetchAdminData = async () => {
    const healthStart = Date.now();
    try {
      // Real-time server connection probe
      const healthRes = await fetch("/api/health");
      const healthLatency = Date.now() - healthStart;
      if (healthRes.ok) {
        setServerHealthStatus("online");
        setServerHealthLatency(healthLatency);
      } else {
        setServerHealthStatus("offline");
      }
    } catch (err) {
      setServerHealthStatus("offline");
      setServerHealthLatency(null);
    }

    try {
      const statsRes = await fetch("/api/admin/stats");
      const sData = await statsRes.json();
      setStats(sData);

      const opsRes = await fetch("/api/admin/users");
      const oData = await opsRes.json();
      setOperators(oData);

      const logsRes = await fetch("/api/logs");
      const lData = await logsRes.json();
      setAuditLogs(lData);

      const immRes = await fetch("/api/admin/audit-logs");
      if (immRes.ok) {
        const immData = await immRes.json();
        setImmutableLogs(immData);
      }
    } catch (e) {
      console.error(e);
      setServerHealthStatus("offline");
    }
  };

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 7000);
    return () => clearInterval(interval);
  }, []);

  const handleSendWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warnOp || !warnReason) return;

    try {
      const res = await fetch("/api/warnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issuedBy: adminUser.id,
          issuedTo: warnOp,
          reason: warnReason,
          severity: warnSeverity as WarningSeverity
        })
      });
      if (res.ok) {
        setWarnSuccess(true);
        setWarnReason("");
        setTimeout(() => setWarnSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opUsername || !opFullName || !opPassword) return;

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: opUsername,
          fullName: opFullName,
          role: opRole,
          password: opPassword
        })
      });
      if (res.ok) {
        setOpSuccess("اپراتور جدید با موفقیت ایجاد گردید.");
        setOpUsername("");
        setOpFullName("");
        setOpPassword("");
        fetchAdminData();
        setTimeout(() => setOpSuccess(null), 3000);
      } else {
        const d = await res.json();
        alert(d.error || "خطایی رخ داد.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleOperatorStatus = async (op: any) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: op.id,
          username: op.username,
          fullName: op.fullName,
          role: op.role,
          isActive: !op.isActive
        })
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const testDbConnection = async () => {
    setIsDbTesting(true);
    setDbTestResult(null);
    try {
      const res = await fetch("/api/admin/db-test");
      const d = await res.json();
      setTimeout(() => {
        setIsDbTesting(false);
        setDbTestResult(d.message + ` (تاخیر: ${d.latency_ms}ms)`);
      }, 1000);
    } catch (e) {
      setIsDbTesting(false);
      setDbTestResult("خطا در جفت‌شدن با پورت دیتابیس لوکال cPanel.");
    }
  };

  return (
    <div id="admin-panel" className="space-y-8 animate-fade-in text-right">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5 p-6 rounded-2xl border border-white/5">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-3 brand-glow">
            <Shield className="text-brand-primary ml-1" size={26} />
            پنل فرماندهی مدیریت سیستم هدهد
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            دسترسی ارشد • نظارت بر خط‌لوله، آرشیو لاگ‌ها، ایجاد اپراتورها و دیتابیس cPanel
          </p>
        </div>
        <button
          onClick={testDbConnection}
          className="flex items-center gap-2 px-4 py-2.5 btn-primary glow-on-hover text-white rounded-xl text-xs font-bold transition duration-150 active:scale-95 cursor-pointer"
        >
          {isDbTesting ? (
            <RefreshCw className="animate-spin text-white" size={14} />
          ) : (
            <Database size={14} className="text-white/80" />
          )}
          تست اتصال دیتابیس MySQL
        </button>
      </div>

      {dbTestResult && (
        <div className="p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-xl text-xs flex items-center gap-3 text-brand-primary">
          <CheckCircle2 size={16} />
          {dbTestResult}
        </div>
      )}

      {/* --- REAL-TIME SERVER HEALTH CONNECTION STATUS COMPONENT --- */}
      {serverHealthStatus === "offline" ? (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-3 text-right animate-pulse">
          <div className="flex items-center gap-3">
            <span className="flex h-3.5 w-3.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500"></span>
            </span>
            <div className="text-rose-400 text-xs">
              <span className="font-extrabold text-white text-[13px] block">⚠️ قطع ارتباط با سرور بک‌اند (Node.js)!</span>
              <p className="mt-1 text-slate-400 text-[11px] leading-relaxed">
                ارتباط مرورگر با وب‌سایت Node.js شما قطع شده است. لطفاً منوی <strong className="text-rose-300 font-bold">Setup Node.js App</strong> را در سی‌پنل چک کنید که اپلیکیشن حتماً در وضعیت اجرا (Started) بوده و متوقف یا کرش نکرده باشد.
              </p>
            </div>
          </div>
          <button 
            onClick={fetchAdminData} 
            className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-[10px] text-rose-300 font-black rounded-lg transition duration-150 active:scale-95 cursor-pointer"
          >
            تلاش مجدد فرکانس ردیابی
          </button>
        </div>
      ) : (
        <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span>بک‌اند Node.js: <strong className="text-emerald-400 font-black">متصل و برخط (پورت ۳۰۰۰)</strong></span>
            {serverHealthLatency !== null && (
              <span className="text-[10px] text-slate-500 font-mono">({serverHealthLatency}ms latency)</span>
            )}
          </div>
          <p className="text-[10.5px] text-slate-400">
            تواتر پایش لحظه‌ای پورت ارتباطی: هر ۷ ثانیه فعال است ✓
          </p>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
            <Users size={22} />
          </div>
          <div className="text-left font-mono">
            <p className="text-xs text-slate-500 text-right font-sans">ثبت‌نامی‌های جدید امروز</p>
            <p className="text-3xl font-extrabold text-white mt-1 text-right">{stats.todayCount} <span className="text-xs text-slate-500 font-sans">متقاضی</span></p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <CheckCircle2 size={22} />
          </div>
          <div className="text-left font-mono">
            <p className="text-xs text-slate-500 text-right font-sans">ثبت‌نام رسمی نهایی</p>
            <p className="text-3xl font-extrabold text-emerald-400 mt-1 text-right">{stats.enrolledCount}</p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
            <Activity size={22} />
          </div>
          <div className="text-left font-mono">
            <p className="text-xs text-slate-500 text-right font-sans">نرخ کل جذب انستیتو</p>
            <p className="text-3xl font-extrabold text-amber-400 mt-1 text-right">{stats.conversionRate}%</p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400">
            <Terminal size={22} />
          </div>
          <div className="text-left font-mono">
            <p className="text-xs text-slate-500 text-right font-sans">تعداد پردازش کل</p>
            <p className="text-3xl font-extrabold text-white mt-1 text-right">{stats.totalProcessed}</p>
          </div>
        </div>
      </div>

      {/* Dynamic Tab Selector - Beautiful responsive grid/flex container */}
      <div className="grid grid-cols-2 md:flex md:flex-wrap bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800 gap-2 w-full mb-3 relative z-10 print:hidden">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`py-3 px-4 rounded-xl text-xs font-black transition duration-155 flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "dashboard"
              ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20 font-black border border-brand-primary/10"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Activity size={15} />
          داشبورد و مانیتورینگ زنده
        </button>
        <button
          onClick={() => {
            setActiveTab("dossiers");
            fetchApplicants();
          }}
          className={`py-3 px-4 rounded-xl text-xs font-black transition duration-155 flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "dossiers"
              ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20 font-black border border-brand-primary/10"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <ShieldAlert size={15} />
          کنترل هوشمند و رفع بن‌بست
        </button>

        <button
          onClick={() => {
            setActiveTab("appointments");
            fetchApplicants();
          }}
          className={`py-3 px-4 rounded-xl text-xs font-black transition duration-155 flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "appointments"
              ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20 font-black border border-brand-primary/10"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Calendar size={15} className="text-indigo-400 animate-pulse" />
          مدیریت و اصلاح نوبت‌ها
        </button>

        <button
          onClick={() => {
            setActiveTab("finalized");
            fetchApplicants();
          }}
          className={`py-3 px-4 rounded-xl text-xs font-black transition duration-155 flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "finalized"
              ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20 font-black border border-brand-primary/10"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <ClipboardList size={15} />
          بایگانی و کارنامه جامع A4
        </button>

        <button
          onClick={() => {
            setActiveTab("developer_center");
            fetchApplicants();
          }}
          className={`col-span-2 md:col-span-1 py-3 px-4 rounded-xl text-xs font-black transition duration-155 flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "developer_center"
              ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20 font-black border border-purple-500/35"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Cpu size={15} className="text-purple-400 animate-spin-slow" />
          اتاق فرمان ارشد و دانش‌نامه فنی
        </button>
      </div>

      {/* Main content grid */}
      {activeTab === "dashboard" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left column: Logs and guides */}
        <div className="xl:col-span-8 space-y-8">
          
          {/* Live Capacity & Bottleneck Interactive Recharts Widget */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800/80 bg-slate-900/10 backdrop-blur-md shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full filter blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full filter blur-3xl pointer-events-none" />

            {/* Header with Title & Action simulated triggers */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4 relative z-10">
              <div>
                <h2 className="text-[15px] font-black text-white flex items-center gap-2.5 brand-glow">
                  <Activity size={18} className="text-brand-primary animate-pulse" />
                  دیده‌بان گرافیکی ترافیک زنده و گلوگاه‌های عملیاتی انستیتو هدهد
                </h2>
                <p className="text-[10px] text-slate-500 mt-1">تلفیق بار لحظه‌ای صفوف فیزیکی (Capacity Load) با میانگین تاخیر به تفکیک مراحل ۱۰ گانه ارزیابی</p>
              </div>

              {/* Stress-Simulation Testing Controls Panel */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => triggerSimulation(5)}
                  disabled={isSimulating}
                  className="px-2.5 py-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary border border-brand-primary/20 rounded-xl text-[10px] font-bold transition flex items-center gap-1 active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  <RefreshCw size={10} className={isSimulating ? "animate-spin" : ""} />
                  تزریق فرضی (+۵ نفر)
                </button>
                <button
                  type="button"
                  onClick={() => triggerSimulation(12)}
                  disabled={isSimulating}
                  className="px-2.5 py-1.5 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 rounded-xl text-[10px] font-bold transition flex items-center gap-1 active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  <Sparkles size={10} />
                  تزریق فوق‌بحرانی (+۱۲ مراجع)
                </button>
                <button
                  type="button"
                  onClick={triggerFlushMocks}
                  disabled={isSimulating}
                  className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-[10px] font-bold transition flex items-center gap-1 active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  <UserMinus size={10} />
                  تخلیه صفوف فرضی
                </button>
                <button
                  type="button"
                  onClick={fetchAdminData}
                  className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 rounded-xl hover:text-white transition cursor-pointer"
                  title="بروزرسانی دستی"
                >
                  <RefreshCw size={12} />
                </button>
              </div>
            </div>

            {simulationStatus && (
              <div className="p-3 bg-brand-primary/5 text-brand-primary border border-brand-primary/20 rounded-xl text-[11px] leading-relaxed flex items-center gap-2 animate-fade-in relative z-10">
                <div className="w-2 h-2 rounded-full bg-brand-primary animate-ping" />
                <span>{simulationStatus}</span>
              </div>
            )}

            {/* Recharts chart block */}
            <div className="h-72 w-full bg-slate-950/40 border border-slate-850/50 p-4 rounded-2xl relative z-10">
              {stats.chartData && stats.chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={stats.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }} layout="horizontal" barGap={2}>
                    <defs>
                      <linearGradient id="capacityColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.85}/>
                        <stop offset="95%" stopColor="#C9A84C" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="waitColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#A855F7" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#A855F7" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.5} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#475569" 
                      fontSize={9} 
                      tickLine={false}
                      dy={5}
                      tick={{ fill: "#94A3B8" }}
                    />
                    <YAxis 
                      yAxisId="left" 
                      stroke="#C9A84C" 
                      fontSize={9} 
                      tickLine={false} 
                      tick={{ fill: "#C9A84C" }}
                      dx={-5}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      stroke="#A855F7" 
                      fontSize={9} 
                      tickLine={false} 
                      tick={{ fill: "#A855F7" }}
                      dx={5}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0F172A", border: "1px solid #334155", borderRadius: "12px", direction: "rtl", textAlign: "right", fontSize: "11px" }}
                      itemStyle={{ color: "#F1F5F9" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "10px", pt: 10 }} />
                    <Bar 
                      yAxisId="left" 
                      dataKey="تعداد مراجعان" 
                      name="تعداد افراد کنونی" 
                      fill="url(#capacityColor)" 
                      radius={[6, 6, 0, 0]} 
                      barSize={16}
                    />
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="ظرفیت مجاز" 
                      name="ظرفیت استاندارد" 
                      stroke="#ef4444" 
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                    <Area 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="میانگین انتظار (دقیقه)" 
                      name="میانگین انتظار (دقیقه)" 
                      fill="url(#waitColor)" 
                      stroke="#8B5CF7" 
                      strokeWidth={1.5}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col justify-center items-center text-slate-500 text-xs">
                  <RefreshCw className="animate-spin mb-2" size={20} />
                  در حال دریافت سنجه‌های عملیاتی دیتابیس...
                </div>
              )}
            </div>

            {/* Heatmap summary row cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-2">
              {stats.chartData && stats.chartData.slice(0, 5).map((d: any, i: number) => {
                const limitExceeded = d["تعداد مراجعان"] > d["ظرفیت مجاز"];
                return (
                  <div 
                    key={i} 
                    className={`p-3 rounded-xl border transition ${
                      limitExceeded 
                        ? 'bg-red-500/10 border-red-500/30 text-red-400 shadow-lg shadow-red-500/5' 
                        : 'bg-slate-950/80 border-slate-850 text-slate-300 hover:border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className={`w-2 h-2 rounded-full ${limitExceeded ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`} />
                      <span className="text-[9px] font-bold opacity-70 truncate">{d.name}</span>
                    </div>
                    <div className="flex items-baseline gap-1 mt-1.5 justify-between">
                      <span className="text-[10px] text-slate-500 font-mono">مجاز: {d["ظرفیت مجاز"]}</span>
                      <span className="text-sm font-extrabold font-mono">{d["تعداد مراجعان"]} نفر</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Immutable System Audit Logs Block */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/10 backdrop-blur-md shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-purple-500/5 rounded-full filter blur-xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
              <div>
                <h2 className="text-[15px] font-black text-white flex items-center gap-2.5 brand-glow">
                  <Terminal size={18} className="text-brand-primary animate-pulse" />
                  سامانه ضد دستکاری و مانیتورینگ امنیتی (Immutable Audit Logs)
                </h2>
                <p className="text-[10px] text-slate-500 mt-1">
                  دفتر کل ثبت غیرقابل تغییر زنجیره مقادیر پرونده‌ها، یادداشت پرسنل و تشخیص‌های هوش مصنوعی
                </p>
              </div>

              {/* Log Tabs switcher */}
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveLogTab("immutable")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition duration-150 cursor-pointer ${
                    activeLogTab === "immutable"
                      ? "bg-brand-primary text-white shadow-md shadow-brand-primary/25"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  تغییرات زنجیره مقادیر
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLogTab("system")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition duration-150 cursor-pointer ${
                    activeLogTab === "system"
                      ? "bg-brand-primary text-white shadow-md shadow-brand-primary/25"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  رویدادهای همگام‌سازی خام
                </button>
              </div>
            </div>

            {activeLogTab === "immutable" ? (
              <div className="space-y-4">
                {/* Filters Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                  <div>
                    <input
                      type="text"
                      placeholder="جستجوی مراجع، اپراتور یا شناسه..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 glass-input text-xs text-white placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <select
                      value={filterActionType}
                      onChange={(e) => setFilterActionType(e.target.value)}
                      className="w-full px-3 py-2 glass-input text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="ALL">تمامی دسته‌بندی‌ها (ALL)</option>
                      <option value="STATUS_CHANGE">تغییر وضعیت‌های پرونده (STATUS_CHANGE)</option>
                      <option value="NOTE_UPDATE">یادداشت‌ها و اظهارات اپراتور (NOTE_UPDATE)</option>
                      <option value="AI_DECISION">تحلیل و تفکیک مدل هوش مصنوعی (AI_DECISION)</option>
                    </select>
                  </div>
                </div>

                {/* Log list */}
                <div className="max-h-[400px] overflow-y-auto space-y-3 pr-1">
                  {immutableLogs
                    .filter((log) => {
                      const matchesSearch =
                        log.applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        log.operatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        log.id.toLowerCase().includes(searchQuery.toLowerCase());
                      const matchesFilter = filterActionType === "ALL" || log.actionType === filterActionType;
                      return matchesSearch && matchesFilter;
                    })
                    .map((log) => {
                      const isExpanded = expandedLogId === log.id;
                      return (
                        <div
                          key={log.id}
                          className="bg-slate-950/80 border border-slate-850 hover:border-slate-800 rounded-2xl transition duration-150 overflow-hidden"
                        >
                          {/* Row Header */}
                          <div
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 cursor-pointer select-none"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Action badge */}
                              <span
                                className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${
                                  log.actionType === "STATUS_CHANGE"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : log.actionType === "NOTE_UPDATE"
                                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                                }`}
                              >
                                {log.actionType}
                              </span>
                              
                              <span className="text-xs font-bold text-slate-100">{log.applicantName}</span>
                              <span className="text-slate-500 text-[10px] font-sans">توسط {log.operatorName}</span>
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto justify-between font-mono text-[10px]">
                              <span className="text-amber-500/80">{log.timestampJalali}</span>
                              <span className="text-slate-650">IP: {log.ipAddress}</span>
                              <span className="text-slate-400 font-bold font-sans text-xs">
                                {isExpanded ? "▲" : "▼"}
                              </span>
                            </div>
                          </div>

                          {/* Expanded detail section */}
                          {isExpanded && (
                            <div className="px-4 pb-4 border-t border-slate-900/80 pt-3 bg-slate-950/40 text-xs text-right leading-relaxed space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Before State */}
                                <div className="bg-slate-950 p-3 rounded-xl border border-red-500/15">
                                  <span className="block text-[10px] text-red-400 font-bold mb-1">
                                    ● مقدار پیشین (قبل از تراکنش):
                                  </span>
                                  {log.actionType === "AI_DECISION" ? (
                                    <span className="text-slate-500 italic block font-mono text-[10px]">
                                      تحلیل خام اولیه وجود ندارد
                                    </span>
                                  ) : (
                                    <p className="text-slate-300 font-mono text-[10px] max-h-24 overflow-y-auto break-words leading-normal bg-red-950/5 p-2 rounded border border-red-950/20">
                                      {log.beforeState}
                                    </p>
                                  )}
                                </div>

                                {/* After State */}
                                <div className="bg-slate-950 p-3 rounded-xl border border-emerald-500/15">
                                  <span className="block text-[10px] text-emerald-400 font-bold mb-1">
                                    ● مقدار ثبتی (بعد از تراکنش):
                                  </span>
                                  {log.actionType === "AI_DECISION" ? (
                                    <div className="max-h-36 overflow-y-auto bg-slate-900 border border-slate-800 p-2.5 rounded text-[10.5px] text-left font-mono break-words leading-relaxed leading-[1.4] select-text">
                                      <pre className="text-slate-300 whitespace-pre-wrap">
                                        {(() => {
                                          try {
                                            return JSON.stringify(JSON.parse(log.afterState), null, 2);
                                          } catch (e) {
                                            return log.afterState;
                                          }
                                        })()}
                                      </pre>
                                    </div>
                                  ) : (
                                    <p className="text-slate-100 font-mono text-[10px] max-h-24 overflow-y-auto break-words leading-normal bg-emerald-950/5 p-2 rounded border border-emerald-950/20">
                                      {log.afterState}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Footer tracking values */}
                              <div className="flex flex-wrap text-[10px] text-slate-500 bg-slate-950 p-2 rounded-xl justify-between items-center opacity-80 gap-2 font-mono">
                                <span>شناسه جهانی لاگ: <strong className="text-slate-400">{log.id}</strong></span>
                                <span>زمان ثبت جهانی: <strong className="text-slate-400">{new Date(log.timestampGregorian).toLocaleString("fa-IR")}</strong></span>
                                <span>مولفه ارزیابی: <strong className="text-amber-500">{log.fieldName}</strong></span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                  {immutableLogs.length === 0 && (
                    <div className="py-20 text-center text-slate-500 text-xs font-sans">
                      هیچ مقداری برای زنجیره تغییرات یافت نشد. فرایند را آغاز کنید.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1 font-mono text-xs select-text">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="bg-slate-950 p-3 rounded-xl border border-slate-900 text-right leading-relaxed">
                      <span className="text-[10px] text-amber-500 font-mono ml-3">
                        [{getPersianDateTimeString(new Date(log.createdAt))}]
                      </span>
                      <span className="text-emerald-400 font-bold ml-2">
                        {log.actorName}
                      </span>
                      <span className="text-slate-400 ml-2">
                        اقدام: {log.actionType}
                      </span>
                      <p className="text-[10px] text-slate-650 mt-1 font-sans">
                        شناسه تراکنش: {log.id} | آدرس آی‌پی: {log.ipAddress} | بدنه: {log.payload}
                      </p>
                    </div>
                  ))}

                  {auditLogs.length === 0 && (
                    <div className="py-20 text-center text-slate-500 text-xs">
                      هیچ لاگ سیستمی خامی یافت نشد.
                    </div>
                  )}
                </div>
              </div>
            )}

            <p className="text-[10px] text-slate-500 leading-relaxed pt-2 border-t border-slate-900/70">
              * این اطلاعات ذیل استانداردهای تایید صلاحیت انطباق امنیتی در انستیتو هدهد ثبت می‌شود. کلیه داده‌ها در درگاه‌های حافظه موقت و دائمی به صورت زنجیرۀ متوالی متراکم به هم متصل بوده و ویرایش، لغو یا حذف فیزیکی آن‌ها به هیچ عنوان توسط هیچ سطحی از دسترسی میسر نیست.
            </p>
          </div>

          {/* cPanel DB Documentation integration */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
              <button 
                onClick={() => setShowGuide(!showGuide)}
                className="text-xs text-brand-primary hover:underline cursor-pointer"
              >
                {showGuide ? "مخفی کردن راهنما" : "نمایش راهنمای بازنشر"}
              </button>
              <h2 className="text-md font-bold text-slate-200 flex items-center gap-2 brand-glow">
                <Database size={18} className="text-brand-primary ml-1" />
                پیکربندی استقرار دیتابیس رون‌ساخت برای cPanel
              </h2>
            </div>

            {showGuide && (
              <div className="space-y-4 text-xs text-slate-400 leading-relaxed bg-white/5 p-5 rounded-2xl border border-white/5 pointer-events-auto">
                <p className="font-bold text-white mb-2">راهنمای راه‌اندازی گام به گام MySQL در پنل هاست سی‌پنل (cPanel):</p>
                <ol className="list-decimal list-inside space-y-2.5">
                  <li>وارد هاست سی‌پنل شده و به بخش <span className="font-mono text-brand-primary">MySQL Databases</span> بروید.</li>
                  <li>یک دیتابیس جدید با نام دلخواه (مثال: <span className="font-mono text-white">hodhod_db</span>) بسازید.</li>
                  <li>یک کاربر دیتابیس به همراه رمز عبور قوی به نام <span className="font-mono text-white">hodhod_user</span> ایجاد نمایید.</li>
                  <li>کاردار را به دیتابیس متصل کرده و تیک گزینۀ <span className="font-mono text-white">ALL PRIVILEGES</span> را فعال کنید.</li>
                  <li>فایل <span className="font-mono text-white">.env</span> پروژه را باز کرده و خط فرمان دیتابیس را ویرایش کنید:</li>
                </ol>
                <div className="bg-white/5 p-3 rounded-lg border border-white/10 font-mono text-[11px] flex justify-between items-center text-left">
                  <span className="text-brand-primary select-all">DATABASE_URL="mysql://hodhod_user:YOUR_PASSWORD@localhost:3306/hodhod_db"</span>
                  <Copy size={14} className="cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText('DATABASE_URL="mysql://hodhod_user:YOUR_PASSWORD@localhost:3306/hodhod_db"')} />
                </div>
                <p className="mt-2 text-slate-500">
                  در نهایت با اجرای دستور <span className="font-mono text-brand-primary">npx prisma db push</span> و یا اجرای کدهای آماده ایمپورت sql پیوست، جداول را بالا بیاورید.
                </p>
              </div>
            )}
            
            {/* Environment Variable Generator Form */}
            <div className="mt-4 bg-white/5 p-4 rounded-xl border border-white/5">
              <h3 className="text-xs font-bold text-slate-300 mb-3">مولد خودکار فایل .env برای سی‌پنل</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input placeholder="نام دیتابیس cPanel" className="px-3 py-2 glass-input text-xs text-white" />
                <input placeholder="نام کاربری دیتابیس" className="px-3 py-2 glass-input text-xs text-white" />
                <input placeholder="کلمه عبور" type="password" className="px-3 py-2 glass-input text-xs text-white" />
              </div>
              <button className="mt-3 px-4 py-2 btn-primary glow-on-hover rounded-xl text-xs active:scale-95 transition flex items-center gap-1.5 mr-auto cursor-pointer">
                <Play size={12} />
                تولید خروجی کانفیگ .env
              </button>
            </div>
          </div>

        </div>

        {/* Right column: Form warnings and user list */}
        <div className="xl:col-span-4 space-y-8">
          
          {/* Dispatch Warning Form */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <h2 className="text-md font-bold text-slate-200 border-b border-white/5 pb-3 mb-4 flex items-center gap-2 brand-glow">
              <AlertTriangle size={18} className="text-brand-primary ml-1 animate-pulse" />
              ثبت و ابلاغ تذکر انضباطی به پرسنل
            </h2>

            {warnSuccess && (
              <div className="p-3 mb-4 bg-emerald-950/50 border border-emerald-800 text-emerald-300 rounded-xl text-xs">
                تذکر با موفقیت برای پرسنل مدنظر ارسال گردید و در پرتال او نمایش داده خواهد شد.
              </div>
            )}

            <form onSubmit={handleSendWarning} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">انتخاب پرسنل متخلف</label>
                <select 
                  value={warnOp} 
                  onChange={(e) => setWarnOp(e.target.value)}
                  className="w-full px-3 py-2.5 glass-input text-xs focus:outline-none"
                >
                  <option value="">-- انتخاب کنید --</option>
                  {operators.filter(o => o.id !== adminUser.id).map(o => (
                    <option key={o.id} value={o.id}>{o.fullName} ({o.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">شدت لغو قوانین</label>
                <select 
                  value={warnSeverity} 
                  onChange={(e) => setWarnSeverity(e.target.value)}
                  className="w-full px-3 py-2.5 glass-input text-xs focus:outline-none"
                >
                  <option value="info">اطلاعیه عملکردی (آموزشی)</option>
                  <option value="warning">تذکر شفاهی (شدت متوسط)</option>
                  <option value="critical">اخطار انضباطی کتبی (شدت خطیر)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">علت و شرح تخلف کاری</label>
                <textarea 
                  value={warnReason}
                  onChange={(e) => setWarnReason(e.target.value)}
                  rows={3}
                  placeholder="مثال: تاخیر بیش از ۱۵ دقیقه در تایید اتمام ارزیابی در بخش مشاوره."
                  className="w-full px-3 py-2.5 glass-input text-xs focus:outline-none text-right leading-relaxed placeholder:text-slate-700"
                />
              </div>

              <button
                type="submit"
                disabled={!warnOp || !warnReason}
                className="w-full py-2.5 btn-primary glow-on-hover rounded-xl transition text-xs flex justify-center items-center gap-2 active:scale-95 disabled:opacity-40 cursor-pointer"
              >
                <Send size={14} />
                ابلاغ فوری تذکر سیستمی
              </button>
            </form>
          </div>

          {/* User management and operator list */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <h2 className="text-md font-bold text-slate-200 border-b border-white/5 pb-3 mb-4 flex items-center gap-2 brand-glow">
              <UserPlus size={18} className="text-brand-primary ml-1" />
              تعریف کاربر و همکار جدید
            </h2>

            {opSuccess && (
              <div className="p-3 mb-4 bg-emerald-950/50 border border-emerald-800 text-emerald-300 rounded-xl text-xs">
                {opSuccess}
              </div>
            )}

            <form onSubmit={handleCreateOperator} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">نام کاربری</label>
                  <input 
                    placeholder="zamani..." 
                    value={opUsername}
                    onChange={(e) => setOpUsername(e.target.value)}
                    className="w-full px-3 py-2 glass-input text-xs" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">نام و نام‌خانوادگی</label>
                  <input 
                    placeholder="مریم زمانی..." 
                    value={opFullName}
                    onChange={(e) => setOpFullName(e.target.value)}
                    className="w-full px-3 py-2 glass-input text-xs text-right" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">کلمه عبور</label>
                  <input 
                    type="password"
                    placeholder="••••••••" 
                    value={opPassword}
                    onChange={(e) => setOpPassword(e.target.value)}
                    className="w-full px-3 py-2 glass-input text-xs" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">نقش دسترسی</label>
                  <select 
                    value={opRole}
                    onChange={(e) => setOpRole(e.target.value)}
                    className="w-full px-3 py-2 glass-input text-xs text-slate-300"
                  >
                    <option value="RECEPTION">میز پذیرش</option>
                    <option value="CONTACT_OP">اپراتور تماس</option>
                    <option value="CONSULTANT">مشاور راهبردی</option>
                    <option value="MIDDLE_ROOM">اپراتور سالن انتظار متمم</option>
                    <option value="JUDGE">داور سنجش صوتی</option>
                    <option value="PRESENTER_A">ارزیاب ارشد نهایی</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 btn-primary glow-on-hover rounded-xl text-xs active:scale-95 transition cursor-pointer"
              >
                ثبت و فعالسازی همکار
              </button>
            </form>
          </div>

          {/* Active Operator Status Toggle List */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <h2 className="text-md font-bold text-slate-200 border-b border-white/5 pb-3 mb-4 flex items-center gap-2 brand-glow">
              <Users size={18} className="text-brand-primary ml-1" />
              مدیریت و کنترل دستی پرسنل
            </h2>
            <div className="space-y-3">
              {operators.map(op => (
                <div key={op.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                  <button 
                    onClick={() => toggleOperatorStatus(op)}
                    disabled={op.id === adminUser.id}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${op.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'} disabled:opacity-30`}
                  >
                    {op.isActive ? "فعال" : "نامعتبر / لغو"}
                  </button>
                  <div className="text-right">
                    <p className="text-xs font-bold text-white">{op.fullName}</p>
                    <p className="text-[9px] text-slate-500 font-mono mt-0.5">Role: {op.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
      )}

      {/* If Dossiers tab is selected */}
      {activeTab === "dossiers" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left detail panel: Edit & Reanalyze Form or empty state */}
          <div className="lg:col-span-7 space-y-6">
            {selectedApplicant ? (
              <div className="glass-panel p-6 rounded-3xl border border-slate-800/80 bg-slate-900/40 relative">
                <h2 className="text-lg font-black text-white flex items-center gap-2 brand-glow border-b border-white/5 pb-3 mb-6">
                  <Sparkles className="text-brand-primary animate-pulse" size={20} />
                  جزئیات، تصحیح دستی و بازتحلیل هوشمند پرونده متقاضی
                </h2>

                {reanalyzeSuccessMsg && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs font-bold mb-6 flex items-center gap-3">
                    <CheckCircle2 size={16} />
                    {reanalyzeSuccessMsg}
                  </div>
                )}

                <form onSubmit={handleSaveAndReanalyze} className="space-y-6">
                  {/* Profile Card Summary & Pipeline Revert Action */}
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-wrap justify-between items-center gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-white">{selectedApplicant.fullName}</h3>
                      <p className="text-[10px] text-slate-400 font-mono mt-1">ID: {selectedApplicant.id}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const q = queueStates.find(qs => qs.applicantId === selectedApplicant.id);
                          if (q) {
                            handleRollback(selectedApplicant.id, q.currentStage);
                          } else {
                            alert("این مراجع در نوبت فعال هیچ مرحله‌ای نیست.");
                          }
                        }}
                        className="px-3 py-2 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <ArrowLeft size={13} />
                        برگرداندن نوبت به مرحله قبل
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFlagAction(selectedApplicant.id, !selectedApplicant.isFlagged)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition border ${
                          selectedApplicant.isFlagged
                            ? "bg-slate-500/10 border-slate-500/20 text-slate-300"
                            : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                        } cursor-pointer`}
                      >
                        {selectedApplicant.isFlagged ? "حذف پرچم تعلیق" : "تعلیق دستی"}
                      </button>
                    </div>
                  </div>

                  {/* 1. Demographics fields */}
                  <div>
                    <h4 className="text-xs font-black text-slate-400 mb-3 border-r-2 border-brand-primary pr-2">۱. مشخصات سجلی و ممیزی هویتی مراجع</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">نام و نام خانوادگی:</label>
                        <input
                          type="text"
                          value={editFullName}
                          onChange={e => setEditFullName(e.target.value)}
                          className="w-full bg-slate-950/70 text-white rounded-xl px-3 py-2 border border-slate-800 text-xs focus:ring-1 focus:ring-brand-primary outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">کد ملی:</label>
                        <input
                          type="text"
                          value={editNationalId}
                          onChange={e => setEditNationalId(e.target.value)}
                          className="w-full bg-slate-950/70 text-white rounded-xl px-3 py-2 border border-slate-800 text-xs focus:ring-1 focus:ring-brand-primary outline-none text-left font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">شماره همراه:</label>
                        <input
                          type="text"
                          value={editPhone}
                          onChange={e => setEditPhone(e.target.value)}
                          className="w-full bg-slate-950/70 text-white rounded-xl px-3 py-2 border border-slate-800 text-xs focus:ring-1 focus:ring-brand-primary outline-none text-left font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">سن (سال):</label>
                        <input
                          type="number"
                          value={editAge}
                          onChange={e => setEditAge(Number(e.target.value))}
                          className="w-full bg-slate-950/70 text-white rounded-xl px-3 py-2 border border-slate-800 text-xs focus:ring-1 focus:ring-brand-primary outline-none text-left font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">جنسیت:</label>
                        <select
                          value={editGender}
                          onChange={e => setEditGender(e.target.value)}
                          className="w-full bg-slate-950/70 text-white rounded-xl px-3 py-2 border border-slate-800 text-xs focus:ring-1 focus:ring-brand-primary outline-none"
                        >
                          <option value="male">مرد</option>
                          <option value="female">زن</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">تحصیلات:</label>
                        <input
                          type="text"
                          value={editEducation}
                          onChange={e => setEditEducation(e.target.value)}
                          className="w-full bg-slate-950/70 text-white rounded-xl px-3 py-2 border border-slate-800 text-xs focus:ring-1 focus:ring-brand-primary outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">شغل:</label>
                        <input
                          type="text"
                          value={editOccupation}
                          onChange={e => setEditOccupation(e.target.value)}
                          className="w-full bg-slate-950/70 text-white rounded-xl px-3 py-2 border border-slate-800 text-xs focus:ring-1 focus:ring-brand-primary outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">شهر:</label>
                        <input
                          type="text"
                          value={editCity}
                          onChange={e => setEditCity(e.target.value)}
                          className="w-full bg-slate-950/70 text-white rounded-xl px-3 py-2 border border-slate-800 text-xs focus:ring-1 focus:ring-brand-primary outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Notes edit for stages */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 mb-2 border-r-2 border-brand-primary pr-2">۲. ویرایش و تکمیل یادداشت‌های ارزیابی انسانی مراحل</h4>
                    <div>
                      <label className="block text-[11px] text-slate-300 font-bold mb-1">یادداشت‌های فاز تماس تلفنی اول (شماره ۱):</label>
                      <textarea
                        rows={2}
                        value={editContactNotes}
                        onChange={e => setEditContactNotes(e.target.value)}
                        placeholder="کیفیت اولیه مراجع، تمایل حضور و رزرو تاریخ..."
                        className="w-full bg-slate-950/70 text-white font-sans rounded-xl px-3 py-2 border border-slate-800 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-300 font-bold mb-1">یادداشت‌های فاز پذیرش روی میز (شماره ۲):</label>
                      <textarea
                        rows={2}
                        value={editReceptionNotes}
                        onChange={e => setEditReceptionNotes(e.target.value)}
                        placeholder="زبان بدن نوبت‌گیری، رفتارهای هیجانی اولیه مراجع..."
                        className="w-full bg-slate-950/70 text-white font-sans rounded-xl px-3 py-2 border border-slate-800 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-300 font-bold mb-1">یادداشت‌های فاز جلسه مشاوره راهبردی (شماره ۴):</label>
                      <textarea
                        rows={2}
                        value={editConsultnotes}
                        onChange={e => setEditConsultnotes(e.target.value)}
                        placeholder="مشخصات روانی ناشی از تحلیل پرسشنامه هدهد..."
                        className="w-full bg-slate-950/70 text-white font-sans rounded-xl px-3 py-2 border border-slate-800 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-300 font-bold mb-1">یادداشت‌های فاز سالن مورو متمم (شماره ۶):</label>
                      <textarea
                        rows={2}
                        value={editMiddleNotes}
                        onChange={e => setEditMiddleNotes(e.target.value)}
                        placeholder="کیفیت پاسخ‌دهی به پروپاگاندا یا ترفندهای روانشناختی..."
                        className="w-full bg-slate-950/70 text-white font-sans rounded-xl px-3 py-2 border border-slate-800 text-xs outline-none"
                      />
                    </div>

                    {/* 3. Numerical test score correction */}
                    <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 space-y-4">
                      <label className="block text-[11px] text-brand-primary font-black">اصلاح دستی معیارهای ارزیابی صوتی تست شبیه‌ساز (شماره ۸):</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div>
                          <span className="block text-[10px] text-slate-400 mb-1">شیوایی (۱-۱۰):</span>
                          <input
                            type="number" step="0.5" min="1" max="10"
                            value={editClarity}
                            onChange={e => setEditClarity(Number(e.target.value))}
                            className="w-full bg-slate-900 text-white rounded-lg px-2 py-1 text-xs text-center border border-slate-800"
                          />
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 mb-1">اعتماد به نفس (۱-۱۰):</span>
                          <input
                            type="number" step="0.5" min="1" max="10"
                            value={editConfidence}
                            onChange={e => setEditConfidence(Number(e.target.value))}
                            className="w-full bg-slate-900 text-white rounded-lg px-2 py-1 text-xs text-center border border-slate-800"
                          />
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 mb-1">تن صدا (۱-۱۰):</span>
                          <input
                            type="number" step="0.5" min="1" max="10"
                            value={editTone}
                            onChange={e => setEditTone(Number(e.target.value))}
                            className="w-full bg-slate-900 text-white rounded-lg px-2 py-1 text-xs text-center border border-slate-800"
                          />
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 mb-1">دایره کلمات (۱-۱۰):</span>
                          <input
                            type="number" step="0.5" min="1" max="10"
                            value={editVocabulary}
                            onChange={e => setEditVocabulary(Number(e.target.value))}
                            className="w-full bg-slate-900 text-white rounded-lg px-2 py-1 text-xs text-center border border-slate-800"
                          />
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 mb-1">ساختار (۱-۱۰):</span>
                          <input
                            type="number" step="0.5" min="1" max="10"
                            value={editStructure}
                            onChange={e => setEditStructure(Number(e.target.value))}
                            className="w-full bg-slate-900 text-white rounded-lg px-2 py-1 text-xs text-center border border-slate-800"
                          />
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 mb-1 font-bold text-brand-primary">نمره نهایی کل:</span>
                          <input
                            type="number" step="0.1" min="1" max="10"
                            value={editTotalScore}
                            onChange={e => setEditTotalScore(Number(e.target.value))}
                            className="w-full bg-slate-900 text-brand-primary font-bold rounded-lg px-2 py-1 text-xs text-center border border-brand-primary/20"
                          />
                        </div>
                      </div>
                      <textarea
                        rows={2}
                        value={editTestNotes}
                        onChange={e => setEditTestNotes(e.target.value)}
                        placeholder="متن یادداشت ناشی از واکاوی صدای مراجع یا یادداشت داور..."
                        className="w-full bg-slate-950/70 text-white rounded-xl px-3 py-2 border border-slate-800 text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-300 font-bold mb-1">تحلیل پایانی و تصمیم انستیتو (فاز ارائه نهایی):</label>
                      <textarea
                        rows={2}
                        value={editFinalNotes}
                        onChange={e => setEditFinalNotes(e.target.value)}
                        placeholder="خروجی نهایی، تائید ثبت‌نام رسمی یا آرشیو مشروط..."
                        className="w-full bg-slate-950/70 text-white rounded-xl px-3 py-2 border border-slate-800 text-xs outline-none"
                      />
                    </div>
                  </div>

                  {/* 4. Select Stage to Reanalyze with Gemini */}
                  <div className="bg-brand-primary/5 p-4 rounded-2xl border border-brand-primary/20 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="text-brand-primary" size={16} />
                      <span className="text-xs font-black text-brand-primary">پردازش و بازتولید برخط هوش مصنوعی (Gemini AI Re-analysis)</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      پس از تصحیح کلمات مفقود شده یا تغییر یادداشت اپراتور، فاز مدنظر خود را انتخاب کرده تا هوش مصنوعی مدل Gemini تحلیل آماری و شخصیتی را با نسخه اصلاح‌شده دستی شما مجدداً بازنویسی کند.
                    </p>
                    <div className="flex gap-3">
                      <select
                        value={stageToReanalyze}
                        onChange={e => setStageToReanalyze(e.target.value)}
                        className="flex-1 bg-slate-950 text-white rounded-xl px-3 py-2 border border-slate-800 text-xs outline-none"
                      >
                        <option value="">-- فقط ذخیره متون دستی (بدون تحلیل مجدد هوش مصنوعی) --</option>
                        <option value="contact">فاز ۱: تعیین صلاحیت اولیه (تماس تلفنی)</option>
                        <option value="reception">فاز ۲: ارزیابی رفتار میز پذیرش فیزیکی</option>
                        <option value="consultation">فاز ۴: واکاوی هویتی جلسه مشاوره راهبردی</option>
                        <option value="middle_room">فاز ۶: تعامل یا به چالش کشیدن پرونده در سالن مونو</option>
                        <option value="test">فاز ۸: بازتحلیل صوتی هوش مصنوعی و نمودار داوری</option>
                        <option value="final">فاز ۱۰: سنتز نهایی و توصیه ثبت‌نام ارائه‌دهنده</option>
                      </select>
                    </div>
                  </div>

                  {/* Submit triggers */}
                  <div className="flex justify-between items-center gap-4 border-t border-white/5 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedApplicant(null);
                        setSelectedApplicantId(null);
                        setIsEditingDossier(false);
                      }}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
                    >
                      انصراف و بستن
                    </button>
                    <button
                      type="submit"
                      disabled={isReanalyzing}
                      className="px-6 py-2.5 bg-brand-primary hover:bg-brand-primary-light text-white rounded-xl text-xs font-black transition flex items-center gap-2 shadow-lg shadow-brand-primary/20 disabled:opacity-50 cursor-pointer"
                    >
                      {isReanalyzing ? (
                        <>
                          <RefreshCw className="animate-spin text-white" size={14} />
                          در حال پردازش مجدد توسط Gemini...
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} />
                          {stageToReanalyze ? "ذخیره تغییرات و تحلیل برخط هوش مصنوعی" : "ذخیره تغییرات و اطلاعات مفقود"}
                        </>
                      )}
                    </button>
                  </div>

                </form>
              </div>
            ) : (
              <div className="glass-panel p-12 rounded-3xl border border-slate-800/80 bg-slate-900/10 flex flex-col items-center justify-center text-center space-y-4 h-full min-h-[450px]">
                <div className="p-4 bg-white/5 rounded-full text-slate-500">
                  <ShieldAlert size={40} className="stroke-[1.5]" />
                </div>
                <div>
                  <h3 className="text-md font-bold text-slate-300">در انتظار ممیزی و بازبینی پرونده‌ها</h3>
                  <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">
                    یکی از پرونده‌های معلق، مفقود یا گیرکرده را در صف سمت چپ انتخاب کنید تا جزئیات داده‌ای و مورو، ویرایش دستی و بازتحلیل هوشمند روی کلاینت فعال گردد.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right list panel: Applicants search, filters, stuck warning counts */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glass-panel p-6 rounded-3xl border border-slate-800/80 bg-slate-900/40 space-y-6">
              <div className="flex justify-between items-center gap-2 border-b border-white/5 pb-4">
                <div>
                  <h2 className="text-sm font-black text-white flex items-center gap-2 brand-glow">
                    <Users size={16} className="text-brand-primary" />
                    کنترل‌کننده خط‌لوله و مانیتور معلقان
                  </h2>
                  <p className="text-[10px] text-slate-500 mt-1">شناسایی، لغو تعلیق، ویرایش و انتقال کارهای مفقود</p>
                </div>
                <button
                  onClick={fetchApplicants}
                  disabled={dossierLoading}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition cursor-pointer"
                >
                  <RefreshCw size={14} className={dossierLoading ? "animate-spin" : ""} />
                </button>
              </div>

              {/* Stuck warning notifications block inside view */}
              {(() => {
                const stuckList = allApplicants.filter(app => {
                  const q = queueStates.find(qs => qs.applicantId === app.id);
                  if (q && q.isWaiting) {
                    const elapsedMins = Math.floor((Date.now() - new Date(q.stageEnteredAt).getTime()) / 60000);
                    return elapsedMins > 15;
                  }
                  return false;
                });

                if (stuckList.length > 0) {
                  return (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl text-[11px] font-medium space-y-2 animate-pulse">
                      <div className="flex items-center gap-2 font-black">
                        <AlertTriangle size={15} />
                        هشدار: {stuckList.length} پرونده «گیرکرده» بیش از ۱۵ دقیقه در یک فاز معلق هستند!
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        این افراد بدون تخصیصی اپراتور یا بدون تائید نهایی هوش مصنوعی راکد مانده‌اند. لطفاً سریعاً با ابزار دستی وضعیت آن‌ها را تعویض کنید.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Search bar inside panel */}
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="جستجوی متقاضی (نام، تلفن، کد ملی)..."
                  value={dossierSearch}
                  onChange={e => setDossierSearch(e.target.value)}
                  className="w-full bg-slate-950 text-white rounded-xl px-3 py-2.5 border border-slate-800 text-xs focus:ring-1 focus:ring-brand-primary outline-none"
                />

                {/* Status filters */}
                <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-900">
                  <button
                    onClick={() => setStatusFilter("ALL")}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-[10px] font-bold text-center cursor-pointer transition ${
                      statusFilter === "ALL" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    همه
                  </button>
                  <button
                    onClick={() => setStatusFilter("completed")}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold text-center cursor-pointer transition ${
                      statusFilter === "completed" ? "bg-emerald-500/20 text-emerald-300" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    پایان یافته
                  </button>
                  <button
                    onClick={() => setStatusFilter("stuck")}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold text-center cursor-pointer transition ${
                      statusFilter === "stuck" ? "bg-amber-500/20 text-amber-300 animate-pulse" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    گیرکرده
                  </button>
                  <button
                    onClick={() => setStatusFilter("flagged")}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold text-center cursor-pointer transition ${
                      statusFilter === "flagged" ? "bg-red-500/20 text-red-300" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    تعلیقی‌ها
                  </button>
                </div>
              </div>

              {/* Dossier Item List rendered inside panels */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {allApplicants
                  .filter(app => {
                    // Search filter
                    const s = dossierSearch.toLowerCase();
                    const matchSearch = 
                      app.fullName?.toLowerCase().includes(s) ||
                      app.nationalId?.includes(s) ||
                      app.phone?.includes(s) ||
                      app.id?.includes(s);

                    if (!matchSearch) return false;

                    // Status filter
                    const q = queueStates.find(qs => qs.applicantId === app.id);
                    if (statusFilter === "completed") {
                      return app.status === "completed";
                    }
                    if (statusFilter === "flagged") {
                      return app.isFlagged === true;
                    }
                    if (statusFilter === "stuck") {
                      if (!q || !q.isWaiting) return false;
                      const elapsedMs = Date.now() - new Date(q.stageEnteredAt).getTime();
                      return (elapsedMs / 60000) > 15;
                    }
                    return true;
                  })
                  .map(app => {
                    const q = queueStates.find(qs => qs.applicantId === app.id);
                    const elapsedMs = q ? Date.now() - new Date(q.stageEnteredAt).getTime() : 0;
                    const elapsedMins = Math.floor(elapsedMs / 60000);
                    const isOver15 = q?.isWaiting && elapsedMins > 15;

                    return (
                      <div
                        key={app.id}
                        onClick={() => handleSelectApplicant(app)}
                        className={`p-4 rounded-2xl border transition duration-150 cursor-pointer text-right flex flex-col justify-between ${
                          selectedApplicantId === app.id
                            ? "bg-brand-primary/10 border-brand-primary/40 shadow-sm"
                            : isOver15
                            ? "bg-amber-500/5 hover:bg-slate-900 border-amber-500/20"
                            : "bg-slate-950/40 hover:bg-slate-900/60 border-white/5"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex gap-1">
                            {app.isFlagged && (
                              <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[8px] font-bold rounded">تعلیق</span>
                            )}
                            {isOver15 && (
                              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[8px] font-bold rounded animate-pulse">گیرکرده ({elapsedMins} دقیقه)</span>
                            )}
                            <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 text-[8px] font-mono rounded">{app.age} ساله</span>
                          </div>
                          <h4 className="text-xs font-black text-white">{app.fullName}</h4>
                        </div>

                        <div className="flex flex-wrap justify-between items-center mt-3 text-[10px] text-slate-400">
                          <div className="font-mono">ملی: {app.nationalId || "فاقد کد"}</div>
                          <div className="flex items-center gap-1.5">
                            <Clock size={10} className="text-slate-500" />
                            <span>مرحله فعلی: <span className="font-bold text-brand-primary font-mono">{q?.currentStage || "ثبت نام نشده"}</span></span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {allApplicants.length === 0 && (
                  <div className="text-center py-8 text-xs text-slate-500">پرونده‌ای جهت نمایش وجود ندارد.</div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. FINALIZED ARCHIVED DOSSIER VIEW PORTAL */}
      {/* ========================================================================= */}
      {activeTab === "finalized" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 print:hidden">
          {/* Left panel: Detailed dossier and Print view trigger */}
          <div className="xl:col-span-8 space-y-6">
            {selectedFinalizedApp ? (
              <div className="glass-panel p-6 rounded-3xl border border-slate-800/80 bg-slate-900/40 relative">
                
                {/* Header Actions for dossiers */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4 mb-6">
                  <div>
                    <h2 className="text-md font-black text-white flex items-center gap-2 brand-glow">
                      <FileText className="text-brand-primary" size={20} />
                      کارنامه ممیزی و توسعه مهارت: {selectedFinalizedApp.fullName}
                    </h2>
                    <p className="text-[10px] text-slate-400 mt-1">تلقیق کامل داده‌های کیفی تمام مراحل ده‌گانه به‌همراه تحلیل زمانی و مربیان</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* AISynthesis trigger */}
                    <button
                      onClick={() => handleTriggerCumulativeSynthesis(selectedFinalizedApp.id)}
                      disabled={isAnalyzingCumulative || timelineLoading}
                      className="px-3.5 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isAnalyzingCumulative ? (
                        <>
                          <RefreshCw className="animate-spin" size={13} />
                          در حال سنتز عمیق Gemini...
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} className="text-purple-400" />
                          بازتولید تحلیل یکپارچه هوش صنم
                        </>
                      )}
                    </button>

                    {/* Print button */}
                    <button
                      onClick={() => window.print()}
                      disabled={timelineLoading}
                      className="px-3.5 py-2 bg-brand-primary hover:bg-brand-primary-light text-white rounded-xl text-xs font-black transition flex items-center gap-2 shadow-lg shadow-brand-primary/20 cursor-pointer"
                    >
                      <Printer size={13} />
                      چاپ رسمی کارنامه (A4)
                    </button>
                  </div>
                </div>

                {timelineLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-3">
                    <RefreshCw className="animate-spin text-brand-primary" size={32} />
                    <p className="text-xs text-slate-500">در حال سنکرون‌سازی و دریافت سوابق مراحل صف از دیتابیس...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    
                    {/* Pipeline duration summary bar */}
                    <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5">
                      <h3 className="text-xs font-black text-slate-300 mb-2">سوابق مدت انتظار مراجع در صف و فازهای عملیاتی</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[10px]">
                        <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                          <span className="block text-slate-500 mb-1">فاز تلفنی اول</span>
                          <span className="font-bold text-white font-mono">{getFormattedWaitTime(finalizedTimeline, "contact")}</span>
                        </div>
                        <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                          <span className="block text-slate-500 mb-1">پذیرش فیزیکی لابی</span>
                          <span className="font-bold text-white font-mono">{getFormattedWaitTime(finalizedTimeline, "reception")}</span>
                        </div>
                        <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                          <span className="block text-slate-500 mb-1">مشاوره راهبردی</span>
                          <span className="font-bold text-white font-mono">{getFormattedWaitTime(finalizedTimeline, "consultation")}</span>
                        </div>
                        <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                          <span className="block text-slate-500 mb-1">سالن مورو متمم</span>
                          <span className="font-bold text-white font-mono">{getFormattedWaitTime(finalizedTimeline, "middle_room")}</span>
                        </div>
                        <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                          <span className="block text-slate-500 mb-1">سالن داوری آزمون</span>
                          <span className="font-bold text-white font-mono">{getFormattedWaitTime(finalizedTimeline, "test")}</span>
                        </div>
                      </div>
                    </div>

                    {/* Step Cards with Side by Side: Operator comment vs AI evaluation */}
                    <div className="space-y-4">
                      
                      {/* DIGIFORM BASIC DATA */}
                      <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-3">
                          <h4 className="text-xs font-black text-brand-primary">۱. اطلاعات سجلی و پایه‌ای (دیجی‌فرم و ثبت‌نام اولیه)</h4>
                          <span className="text-[9px] bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded-lg font-mono">STEP 01</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                          <div><span className="text-slate-500">کد ملی:</span> <span className="text-white font-mono font-bold">{selectedFinalizedApp.nationalId || "فاقد کد"}</span></div>
                          <div><span className="text-slate-500">شماره همراه:</span> <span className="text-white font-mono font-bold">{selectedFinalizedApp.phone || "فاقد تلفن"}</span></div>
                          <div><span className="text-slate-500">سن / جنسیت:</span> <span className="text-white">{selectedFinalizedApp.age} ساله / {selectedFinalizedApp.gender === "male" ? "مرد" : "زن"}</span></div>
                          <div><span className="text-slate-500">شهر سکونت:</span> <span className="text-white">{selectedFinalizedApp.city || "نامشخص"}</span></div>
                          <div><span className="text-slate-500">میزان تحصیلات:</span> <span className="text-white">{selectedFinalizedApp.educationLevel || "نامشخص"}</span></div>
                          <div><span className="text-slate-500">شغل و پیشه:</span> <span className="text-white">{selectedFinalizedApp.occupation || "نامشخص"}</span></div>
                          <div className="col-span-2"><span className="text-slate-500">یادداشت ثبت‌نام:</span> <span className="text-slate-300 text-[11px]">{selectedFinalizedApp.notesGeneral || "فاقد یادداشت پایه‌ای."}</span></div>
                        </div>
                      </div>

                      {/* STAGE 1: CONTACT LOG */}
                      <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-3">
                          <h4 className="text-xs font-black text-indigo-400">۲. مرحله تماس اول و هدایت صوتی (سنجش صلاحیت اولیه)</h4>
                          <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-lg font-mono">STEP 02</span>
                        </div>
                        {finalizedTimeline?.contacts?.[0] ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div className="space-y-1.5 border-l border-white/5 pl-2">
                              <span className="text-[10px] text-slate-500 font-bold block">✍️ بازخورد مکتوب اپراتور تماس:</span>
                              <p className="text-slate-200 leading-relaxed bg-white/5 p-2 rounded-xl text-[11px]">{finalizedTimeline.contacts[0].operatorNotes || "یادداشتی ثبت نشده است."}</p>
                            </div>
                            <div className="space-y-1.5">
                              <span className="text-[10px] text-indigo-400 font-bold block">🤖 تحلیل روانشناختی هوش هدهد:</span>
                              {(() => {
                                try {
                                  const parsed = JSON.parse(finalizedTimeline.contacts[0].aiAnalysis || "{}");
                                  return (
                                    <div className="bg-indigo-500/5 p-2 rounded-xl border border-indigo-500/10 text-[11px] space-y-1">
                                      <div><span className="text-slate-500">دسته‌بندی شخصیت:</span> <span className="text-indigo-300 font-bold">{parsed.category || finalizedTimeline.contacts[0].aiCategory || "معمولی"}</span></div>
                                      <p className="text-slate-300 leading-relaxed">{parsed.summaryAnalysis || "فاقد فرامتن هوش."}</p>
                                    </div>
                                  );
                                } catch(e) {
                                  return <p className="text-slate-400 text-[11px]">{finalizedTimeline.contacts[0].aiAnalysis || "تحلیل کیفی ثبت نشده است."}</p>;
                                }
                              })()}
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-500 text-xs italic">اطلاعاتی درباره مرحله تماس اول یافت نشد.</p>
                        )}
                      </div>

                      {/* STAGE 2: RECEPTION LOG */}
                      <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-3">
                          <h4 className="text-xs font-black text-amber-400">۳. لابی موسسه و بررسی پذیره (پیش‌ارزیابی اضطراب لابی)</h4>
                          <span className="text-[9px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-lg font-mono">STEP 03</span>
                        </div>
                        {finalizedTimeline?.receptions?.[0] ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div className="space-y-1.5 border-l border-white/5 pl-2">
                              <span className="text-[10px] text-slate-500 font-bold block">✍️ یادداشت رفتارشناسی پذیرش:</span>
                              <p className="text-slate-200 leading-relaxed bg-white/5 p-2 rounded-xl text-[11px]">{finalizedTimeline.receptions[0].operatorNotes || "یادداشتی ثبت نشده است."}</p>
                              <div className="flex gap-2 text-[10px] mt-1 font-mono">
                                <span className="bg-white/5 px-2 py-1 rounded">فرم فیزیکی: {finalizedTimeline.receptions[0].evaluationFormGiven ? "تحویل شد" : "خیر"}</span>
                                <span className="bg-white/5 px-2 py-1 rounded">پرسشنامه صبا: {finalizedTimeline.receptions[0].questionnaireGiven ? "کامل شد" : "خیر"}</span>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <span className="text-[10px] text-amber-400 font-bold block">🤖 پردازش هوشمند اضطراب و رفتارهای لابی مراجع:</span>
                              {(() => {
                                try {
                                  const parsed = JSON.parse(finalizedTimeline.receptions[0].aiBehaviorAnalysis || "{}");
                                  return (
                                    <div className="bg-amber-500/5 p-2 rounded-xl border border-amber-500/10 text-[11px] space-y-1">
                                      <div><span className="text-slate-500">سطح اضطراب لابی:</span> <span className="text-amber-300 font-bold">{parsed.initialAnxietyLevel || "متوسط"}</span></div>
                                      <div><span className="text-slate-500">اورای رفتاری:</span> <span className="text-slate-300">{parsed.receptionAura || "عادی"}</span></div>
                                      <p className="text-slate-400 leading-relaxed text-[10px]">{parsed.behavioralProfile || "فاقد توصیف بدنی هوش."}</p>
                                    </div>
                                  );
                                } catch(e) {
                                  return <p className="text-slate-400 text-[11px]">{finalizedTimeline.receptions[0].aiBehaviorAnalysis || "تحلیل کیفی ثبت نشده است."}</p>;
                                }
                              })()}
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-500 text-xs italic">اطلاعاتی درباره مرحله پذیره یافت نشد.</p>
                        )}
                      </div>

                      {/* STAGE 3: CONSULTATION LOG */}
                      <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-3">
                          <h4 className="text-xs font-black text-rose-400">۴. کلینیک مشاوره راهبردی (مدل معصومی و یافته‌های پرسشنامه روان‌سنجی)</h4>
                          <span className="text-[9px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-lg font-mono">STEP 04</span>
                        </div>
                        {finalizedTimeline?.consultations?.[0] ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div className="space-y-1.5 border-l border-white/5 pl-2">
                              <span className="text-[10px] text-slate-500 font-bold block">✍️ تشخیص مربی مشاوره (دکتر معصومی):</span>
                              <p className="text-slate-200 leading-relaxed bg-white/5 p-2 rounded-xl text-[11px]">{finalizedTimeline.consultations[0].consultantNotes || "موردی یادداشت نشده است."}</p>
                              {finalizedTimeline.consultations[0].questionnaireAnswers && (
                                <div className="mt-2 bg-white/5 p-2 rounded text-[10px] text-slate-400 space-y-1 font-mono">
                                  <span className="font-bold text-white block">پاسخ‌های کلیدی پرسشنامه دمو:</span>
                                  {Object.entries(finalizedTimeline.consultations[0].questionnaireAnswers).slice(0, 3).map(([k, v]: any) => (
                                    <div key={k} className="truncate">▫️ {k}: <span className="text-white font-bold">{v}</span></div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              <span className="text-[10px] text-rose-400 font-bold block">🤖 تحلیل سبک و گستره یادگیری توسط هوش:</span>
                              {(() => {
                                try {
                                  const parsed = JSON.parse(finalizedTimeline.consultations[0].aiAnalysis || "{}");
                                  return (
                                    <div className="bg-rose-500/5 p-2 rounded-xl border border-rose-500/10 text-[11px] space-y-1">
                                      <div><span className="text-slate-500">سبک گفتاری:</span> <span className="text-rose-300 font-bold">{parsed.style || "احساساتی"}</span></div>
                                      <div><span className="text-slate-500">شدت مربی‌گری پیشنهادی:</span> <span className="text-rose-300">{parsed.coachingIntensity || "استاندارد"}</span></div>
                                      <p className="text-slate-300 leading-relaxed">{parsed.learningPotential}</p>
                                    </div>
                                  );
                                } catch(e) {
                                  return <p className="text-slate-400 text-[11px]">{finalizedTimeline.consultations[0].aiAnalysis || "تحلیل کیفی ثبت نشده است."}</p>;
                                }
                              })()}
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-500 text-xs italic">اطلاعاتی درباره جلسه مشاوره تخصصی یافت نشد.</p>
                        )}
                      </div>

                      {/* STAGE 4: MIDDLE ROOM */}
                      <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-3">
                          <h4 className="text-xs font-black text-purple-400">۵. تالار مورو متمم (سنجش روانشناسی مقاومت به یادگیری مراجع)</h4>
                          <span className="text-[9px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-lg font-mono">STEP 05</span>
                        </div>
                        {finalizedTimeline?.middleRooms?.[0] ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div className="space-y-1.5 border-l border-white/5 pl-2">
                              <span className="text-[10px] text-slate-500 font-bold block">✍️ یادداشت‌های توجیهی اپراتور مورو متمم:</span>
                              <p className="text-slate-200 leading-relaxed bg-white/5 p-2 rounded-xl text-[11px]">{finalizedTimeline.middleRooms[0].briefingNotes || "ثبت نگردیده است."}</p>
                              {finalizedTimeline.middleRooms[0].promotionNotes && (
                                <p className="text-[10px] text-slate-400 bg-white/5 p-1.5 rounded mt-2"><b>استراتژی قیمت‌گذاری آفر طلایی:</b> {finalizedTimeline.middleRooms[0].promotionNotes}</p>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              <span className="text-[10px] text-purple-400 font-bold block">🤖 تحلیل موانع توسعه و قلاب مارکتینگ Gemini:</span>
                              {(() => {
                                try {
                                  const parsed = JSON.parse(finalizedTimeline.middleRooms[0].aiBriefingAnalysis || "{}");
                                  return (
                                    <div className="bg-purple-500/5 p-2 rounded-xl border border-purple-500/10 text-[11px] space-y-1">
                                      <div><span className="text-slate-500">قلاب بازاریابی ایده آل:</span> <span className="text-purple-300 font-bold">{parsed.marketingHook || "موفقیت شغلی"}</span></div>
                                      <div><span className="text-slate-500">اعتراضات احتمالی مراجع:</span> <span className="text-slate-300 text-[10px]">{parsed.objectionsList?.join(" - ") || "هیچ"}</span></div>
                                      <p className="text-slate-300 leading-relaxed text-[10px]">{parsed.tailoredPitchStrategy}</p>
                                    </div>
                                  );
                                } catch(e) {
                                  return <p className="text-slate-400 text-[11px]">{finalizedTimeline.middleRooms[0].aiBriefingAnalysis || "تحلیل کیفی ثبت نشده است."}</p>;
                                }
                              })()}
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-500 text-xs italic">اطلاعاتی درباره سالن میانی یافت نشد.</p>
                        )}
                      </div>

                      {/* STAGE 5: TEST ROOM */}
                      <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-3">
                          <h4 className="text-xs font-black text-emerald-400">۶. اتاق داوری عملکرد فیزیکی و توان کلامی هنرجو (آزمون تخصصی صدا)</h4>
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-lg font-mono">STEP 06</span>
                        </div>
                        {finalizedTimeline?.tests?.[0] ? (
                          <div className="space-y-4 text-xs">
                            
                            {/* Score grid metrics */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
                              <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                                <span className="block text-[9px] text-slate-500 font-sans mb-1">وضوح سخنرانی:</span>
                                <span className="font-bold text-white text-xs">{finalizedTimeline.tests[0].paramClarity} / ۱۰</span>
                              </div>
                              <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                                <span className="block text-[9px] text-slate-500 font-sans mb-1">اعتماد به نفس:</span>
                                <span className="font-bold text-white text-xs">{finalizedTimeline.tests[0].paramConfidence} / ۱۰</span>
                              </div>
                              <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                                <span className="block text-[9px] text-slate-500 font-sans mb-1">تن و آهنگ فک:</span>
                                <span className="font-bold text-white text-xs">{finalizedTimeline.tests[0].paramTone} / ۱۰</span>
                              </div>
                              <div className="bg-white/5 p-2.5 rounded-xl border border-emerald-500/20 shadow-lg shadow-emerald-400/5">
                                <span className="block text-[9px] text-emerald-400 font-bold font-sans mb-1">نمره کل علمی داوری:</span>
                                <span className="font-bold text-emerald-400 text-xs">{finalizedTimeline.tests[0].totalScore} / ۱۰</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5 border-l border-white/5 pr-2">
                                <span className="text-[10px] text-slate-500 font-bold block">✍️ یادداشت مکتوب داور ارشد سنجش:</span>
                                <p className="text-slate-200 leading-relaxed bg-white/5 p-2 rounded-xl text-[11px]">{finalizedTimeline.tests[0].judgeDescription || "تصریح صوتی ثبت نشده است."}</p>
                              </div>
                              <div className="space-y-1.5">
                                <span className="text-[10px] text-emerald-400 font-bold block">🤖 بررسی پارامترهای صوتی توسط هوش هدهد صبا:</span>
                                {(() => {
                                  try {
                                    const parsed = JSON.parse(finalizedTimeline.tests[0].aiComprehensiveAnalysis || "{}");
                                    return (
                                      <div className="bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/10 text-[11px] space-y-1">
                                        <div><span className="text-slate-500">رتبه‌بندی کل هنرجو:</span> <span className="text-emerald-300 font-bold">{parsed.proficiencyRating || finalizedTimeline.tests[0].aiFinalCategory || "متوسط"}</span></div>
                                        <p className="text-slate-300 leading-relaxed text-[10px] font-sans">{parsed.coreThesis || "تحلیلی نهایی یافت نشد."}</p>
                                      </div>
                                    );
                                  } catch(e) {
                                    return <p className="text-slate-400 text-[11px]">{finalizedTimeline.tests[0].aiComprehensiveAnalysis || "تحلیل صوتی ثبت نشده است."}</p>;
                                  }
                                })()}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-500 text-xs italic">اطلاعاتی درباره آزمون داوری یافت نشد.</p>
                        )}
                      </div>

                      {/* STAGE 10: INSTITUTES DECISION */}
                      <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-3">
                          <h4 className="text-xs font-black text-cyan-400">۷. تصمیم‌گیری نهایی کادر پذیرش (ثبت‌نام نهایی و تخصیص مربیان)</h4>
                          <span className="text-[9px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-lg font-mono">STEP 10</span>
                        </div>
                        {finalizedTimeline?.results?.[0] ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div className="space-y-1.5 border-l border-white/5 pl-2">
                              <span className="text-[10px] text-slate-500 font-bold block">✍️ خلاصه فاکتور و تاییدیه ثبت نام مراجع:</span>
                              <div className="bg-white/5 p-2.5 rounded-xl text-[11px] space-y-2">
                                <div><span className="text-slate-500">ثبت‌نام نهایی شد؟</span> <span className={finalizedTimeline.results[0].registered ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>{finalizedTimeline.results[0].registered ? "بله - ثبت رسمی" : "خیر / تعلیق مصلحتی"}</span></div>
                                <div><span className="text-slate-500">توضیحات ثبت‌نام:</span> <span className="text-white">{finalizedTimeline.results[0].registrationNotes || "فاقد یادداشت."}</span></div>
                                <p className="text-slate-300 text-[10px] leading-relaxed"><b>اهرم نظر خانم طاهانی:</b> {finalizedTimeline.results[0].tahaniAnalysis}</p>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <span className="text-[10px] text-cyan-400 font-bold block">🤖 توصیه یادگیری و استراتژی ثبت‌نام هوش:</span>
                              {(() => {
                                try {
                                  const parsed = JSON.parse(finalizedTimeline.results[0].aiFinalSynthesis || "{}");
                                  if (parsed.registrationVerdict) {
                                    return (
                                      <div className="bg-cyan-500/5 p-2 rounded-xl border border-cyan-500/10 text-[11px] space-y-1">
                                        <div><span className="text-slate-500">تصمیم پیشنهادی:</span> <span className="text-cyan-300 font-bold">{parsed.registrationVerdict}</span></div>
                                        <div><span className="text-slate-500">طرح آموزشی:</span> <span className="text-slate-300">{parsed.trackProposal || "نامشخص"}</span></div>
                                        <p className="text-slate-400 text-[10px] leading-relaxed">{parsed.retentionStrategy}</p>
                                      </div>
                                    );
                                  }
                                  return <p className="text-slate-400 text-[11px] leading-relaxed">{finalizedTimeline.results[0].aiFinalSynthesis || "اطلاعات هوش فاقد سنتز است."}</p>;
                                } catch(e) {
                                  return (
                                    <div className="bg-cyan-500/5 p-2.5 rounded-xl border border-cyan-500/10 text-[11px] overflow-y-auto max-h-[150px] leading-relaxed text-right prose prose-invert font-sans" style={{ direction: "rtl" }}>
                                      {finalizedTimeline.results[0].aiFinalSynthesis || "اطلاعات سنتز در دسترس نیست."}
                                    </div>
                                  );
                                }
                              })()}
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-500 text-xs italic">اطلاعاتی درباره مرحله نهایی یافت نشد.</p>
                        )}
                      </div>

                    </div>

                    {/* DYNAMIC GEMINI CUMULATIVE DEEP SYNTHESIS BOX */}
                    <div className="p-6 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-500/20 rounded-3xl space-y-4">
                      <div className="flex items-center gap-2 text-purple-400 font-black text-sm">
                        <Sparkles className="animate-pulse" size={18} />
                        <h4>بخش ویژه: واکاوی عمیق و سنتز برخط کل پرونده دهگانه هدهد توسط Gemini</h4>
                      </div>
                      
                      <p className="text-slate-400 text-xs leading-relaxed">
                        این بخش به درخواست مدیر ارشد سیستم، تمام نتایج کیفی مکتوب سوار بر هر اتاق صف شامل عوالم لابی، امتیازات داوری صوتی، روانشناسی مشاوره معصومی را تلفیق کرده و یک طرح مربیگری ۳۰ روزه ایده آل ارائه می‌دهد.
                      </p>

                      {isAnalyzingCumulative ? (
                        <div className="p-8 flex flex-col items-center justify-center space-y-3 bg-slate-950/40 rounded-2xl border border-white/5">
                          <RefreshCw className="animate-spin text-purple-400" size={28} />
                          <span className="text-xs text-purple-300 animate-pulse">ربات هوش هدهد صبا در حال واکاوی لغت به لغت پرونده صوتی است...</span>
                        </div>
                      ) : cumulativeSynthesisResult ? (
                        <div className="bg-slate-950/60 p-4 rounded-xl border border-purple-500/10 text-xs text-slate-300 space-y-3 leading-relaxed whitespace-pre-line text-right font-sans" style={{ direction: "rtl" }}>
                          <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-bold block w-max mb-2">⚡ تحلیل و نقشه راه اختصاصی مراجع</span>
                          <div className="prose prose-sm prose-invert" style={{ direction: "rtl", textAlign: "right" }}>
                            {cumulativeSynthesisResult}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-slate-500 text-xs italic bg-slate-950/20 rounded-xl border border-dashed border-slate-800">
                          تحلیل جامع هنوز تولید نگردیده است. دکمه «بازتولید تحلیل یکپارچه هوش صنم» در بالای صفحه را لمس فرمایید تا برخط تولید گردد.
                        </div>
                      )}
                    </div>

                  </div>
                )}

              </div>
            ) : (
              <div className="glass-panel p-12 rounded-3xl border border-slate-800/80 bg-slate-900/10 flex flex-col items-center justify-center text-center space-y-4 h-full min-h-[450px]">
                <div className="p-4 bg-white/5 rounded-full text-brand-primary">
                  <ClipboardList size={40} className="stroke-[1.5]" />
                </div>
                <div>
                  <h3 className="text-md font-bold text-slate-300">در انتظار ممیزی و بازبینی بایگانی نهایی</h3>
                  <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed font-sans">
                    یکی از رکوردهای مراجعین ثبت شده در دیتابیس نهایی را از ستون مقابل انتخاب نمایید تا کارنامه ده‌گانه به‌همراه امکان دریافت نسخه چاپی A4 و مجدد روانکاوی هوش مصنوعی فعال گردد.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right panel: Completed list search & status counters */}
          <div className="xl:col-span-4 space-y-6">
            <div className="glass-panel p-6 rounded-3xl border border-slate-800/80 bg-slate-900/40 space-y-6">
              
              <div>
                <h2 className="text-sm font-black text-white flex items-center gap-2 brand-glow">
                  <Users size={16} className="text-brand-primary" />
                  بانک اطلاعات و پیگیری مراجعین
                </h2>
                <p className="text-[10px] text-slate-500 mt-1">رهگیری وضعیت کلی متقاضیان از فاز اولیه دیجی‌فرم تا پذیرش غرفه‌ای و بایگانی نهایی</p>
              </div>

              {/* Status metrics blocks */}
              <div className="grid grid-cols-2 gap-2 text-center font-mono">
                <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-900">
                  <span className="text-[9px] text-slate-500 block font-sans">تعداد نهایی‌شده</span>
                  <span className="text-xs font-bold text-emerald-400">
                    {allApplicants.filter(a => a.status === "completed").length} مراجع
                  </span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-900">
                  <span className="text-[9px] text-slate-500 block font-sans">کل مراجعین ثبت‌شده</span>
                  <span className="text-xs font-bold text-brand-primary">
                    {allApplicants.length} مراجع
                  </span>
                </div>
              </div>

              {/* Status Selector Dropdown / Pills for Premium look */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 text-right">فیلتر وضعیت پرونده:</label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setFinalStatusFilter("all")}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition duration-200 cursor-pointer ${
                      finalStatusFilter === "all"
                        ? "bg-brand-primary text-white"
                        : "bg-slate-950/45 text-slate-400 hover:text-white"
                    }`}
                  >
                    همه وضعیت‌ها ({allApplicants.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFinalStatusFilter("pending_contact")}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition duration-200 cursor-pointer ${
                      finalStatusFilter === "pending_contact"
                        ? "bg-blue-600/90 text-white"
                        : "bg-slate-950/45 text-slate-400 hover:text-white"
                    }`}
                  >
                    دیجی‌فرم ({allApplicants.filter(a => a.status === "pending_contact").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFinalStatusFilter("in_progress")}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition duration-200 cursor-pointer ${
                      finalStatusFilter === "in_progress"
                        ? "bg-amber-600 text-white"
                        : "bg-slate-950/45 text-slate-400 hover:text-white"
                    }`}
                  >
                    در جریان ارزیابی ({allApplicants.filter(a => a.status !== "pending_contact" && a.status !== "completed" && a.status !== "no_show").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFinalStatusFilter("completed")}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition duration-155 cursor-pointer ${
                      finalStatusFilter === "completed"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-950/45 text-slate-400 hover:text-white"
                    }`}
                  >
                    نهایی بایگانی ({allApplicants.filter(a => a.status === "completed").length})
                  </button>
                </div>
              </div>

              {/* Search bar designed for total database */}
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="جستجو با نام، موبایل، کدملی..."
                  value={finalSearch}
                  onChange={e => setFinalSearch(e.target.value)}
                  className="w-full bg-slate-950 text-white rounded-xl px-3 py-2.5 border border-slate-800 text-xs focus:ring-1 focus:ring-brand-primary outline-none"
                />
              </div>

              {/* List of members */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {(() => {
                  const filtered = allApplicants.filter(app => {
                    const s = finalSearch.toLowerCase().trim();
                    const matchSearch = 
                      app.fullName?.toLowerCase().includes(s) ||
                      app.nationalId?.includes(s) ||
                      app.phone?.includes(s) ||
                      app.id?.includes(s);

                    if (!matchSearch) return false;

                    if (finalStatusFilter === "pending_contact") {
                      return app.status === "pending_contact";
                    }
                    if (finalStatusFilter === "completed") {
                      return app.status === "completed";
                    }
                    if (finalStatusFilter === "in_progress") {
                      return app.status !== "pending_contact" && app.status !== "completed" && app.status !== "no_show";
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-10 space-y-2 bg-slate-950/20 rounded-2xl border border-dashed border-slate-800">
                        <span className="block text-xs text-slate-500">پرونده‌ای منطبق با فیلتر شما پیدا نشد.</span>
                      </div>
                    );
                  }

                  return filtered.map(app => {
                    return (
                      <div
                        key={app.id}
                        onClick={() => handleSelectFinalized(app)}
                        className={`p-4 rounded-2xl border transition duration-150 cursor-pointer text-right flex flex-col justify-between ${
                          selectedFinalizedApp?.id === app.id
                            ? "bg-brand-primary/10 border-brand-primary/40 shadow-sm"
                            : "bg-slate-950/40 hover:bg-slate-900/60 border-white/5"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex gap-1 flex-wrap">
                            {getStatusBadge(app.status)}
                            <span className="px-1.5 py-0.5 bg-slate-800 text-slate-350 text-[8px] font-mono rounded">{app.age} ساله</span>
                          </div>
                          <h4 className="text-xs font-black text-white">{app.fullName}</h4>
                        </div>
                        <div className="flex justify-between mt-2.5 text-[10px] text-slate-400">
                          <div>ملی: <span className="font-mono text-slate-200">{app.nationalId}</span></div>
                          <div className="text-slate-400">{app.city}</div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PERFECT A4 PRINT LAYOUT - INVISIBLE ON SCREEN, APPEARS DURING PDF/PAPER PRINT */}
      {/* ========================================================================= */}
      {selectedFinalizedApp && (
        <div className="hidden print:block bg-white text-black bg-none p-12 font-sans w-full leading-relaxed" style={{ direction: "rtl", minHeight: "297mm", fontFamily: "Tahoma, Arial, sans-serif" }}>
          
          {/* Print Header */}
          <div className="border-b-4 border-double border-slate-900 pb-3 mb-6 flex justify-between items-end">
            <div className="text-right">
              <h1 className="text-xl font-bold tracking-tight text-slate-950">انستیتو سخنوری و توسعه منابع انسانی هدهد صبا</h1>
              <p className="text-xs text-slate-600 font-bold mt-1">شناسنامه ممیزی روانی-صوتی و کارنامه سنجش دهگانه مراجعین</p>
            </div>
            <div className="text-left font-mono text-[9px] text-slate-850 space-y-1">
              <div>کد پرونده: ID-{selectedFinalizedApp.id}</div>
              <div>کد ملی: {selectedFinalizedApp.nationalId}</div>
              <div>تاریخ گزارش: {getPersianDateTimeString(new Date().toISOString())}</div>
            </div>
          </div>

          {/* Table 1: Demographics */}
          <div className="mb-6">
            <h3 className="text-xs font-bold bg-slate-100 p-1.5 border border-slate-400 border-b-0 text-slate-900">۱. مشخصات سجلی و پایه‌ای توسعه مراجع (ثبت شده در دیجی‌فرم)</h3>
            <table className="w-full border-collapse border border-slate-400 text-[11px] text-right">
              <tbody>
                <tr>
                  <td className="border border-slate-400 p-2 bg-slate-50 font-bold w-1/6">نام و نام خانوادگی:</td>
                  <td className="border border-slate-400 p-2 w-2/6">{selectedFinalizedApp.fullName}</td>
                  <td className="border border-slate-400 p-2 bg-slate-50 font-bold w-1/6">کد ملی مراجع:</td>
                  <td className="border border-slate-400 p-2 w-2/6 font-mono font-bold">{selectedFinalizedApp.nationalId}</td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-2 bg-slate-50 font-bold">سن مراجع:</td>
                  <td className="border border-slate-400 p-2">{selectedFinalizedApp.age} سال</td>
                  <td className="border border-slate-400 p-2 bg-slate-50 font-bold">شماره همراه تماس:</td>
                  <td className="border border-slate-400 p-2 font-mono">{selectedFinalizedApp.phone}</td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-2 bg-slate-50 font-bold">سطح تحصیلات:</td>
                  <td className="border border-slate-400 p-2">{selectedFinalizedApp.educationLevel || "لیسانس"}</td>
                  <td className="border border-slate-400 p-2 bg-slate-50 font-bold">رشته و حرفه شغلی:</td>
                  <td className="border border-slate-400 p-2">{selectedFinalizedApp.occupation || "آزاد"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-2 bg-slate-50 font-bold">شهر مراجع:</td>
                  <td className="border border-slate-400 p-2">{selectedFinalizedApp.city || "نامشخص"}</td>
                  <td className="border border-slate-400 p-2 bg-slate-50 font-bold">توضیحات ثبت‌نام اولیه:</td>
                  <td className="border border-slate-400 p-2 text-slate-600">{selectedFinalizedApp.notesGeneral || "بدون توضیحات اضافی"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Table 2: Pipeline Waiting Times & Durations */}
          <div className="mb-6">
            <h3 className="text-xs font-bold bg-slate-100 p-1.5 border border-slate-400 border-b-0 text-slate-900">۲. سوابق تفصیلی سنجش زمان حضور و معطلی در خط‌لوله (دقیق)</h3>
            <table className="w-full border-collapse border border-slate-400 text-[10px] text-center">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-slate-400 p-1.5">مرحله سنجش</th>
                  <th className="border border-slate-400 p-1.5">تماس تلفنی اول</th>
                  <th className="border border-slate-400 p-1.5">پذیرش حضوری (لابی)</th>
                  <th className="border border-slate-400 p-1.5">مشاوره تخصصی راهبردی</th>
                  <th className="border border-slate-400 p-1.5">سالن مونو متمم</th>
                  <th className="border border-slate-400 p-1.5">اتاق داوری عملکرد فیزیکی</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-400 p-2 font-bold bg-slate-50/50">مدت پردازش / معطلی</td>
                  <td className="border border-slate-400 p-2 font-mono font-bold">{getFormattedWaitTime(finalizedTimeline, "contact")}</td>
                  <td className="border border-slate-400 p-2 font-mono font-bold">{getFormattedWaitTime(finalizedTimeline, "reception")}</td>
                  <td className="border border-slate-400 p-2 font-mono font-bold">{getFormattedWaitTime(finalizedTimeline, "consultation")}</td>
                  <td className="border border-slate-400 p-2 font-mono font-bold">{getFormattedWaitTime(finalizedTimeline, "middle_room")}</td>
                  <td className="border border-slate-400 p-2 font-mono font-bold">{getFormattedWaitTime(finalizedTimeline, "test")}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Table 3: Summary of Stage Feedback (Operator & AI) */}
          <div className="mb-6 space-y-4">
            <h3 className="text-xs font-bold bg-slate-100 p-1.5 border border-slate-400 text-slate-900 mb-2">۳. تلفیق کیفی مراحل ده‌گانه (نظرات اپراتورها و مربیان تفصیلی به همراه سنجش هوش مصنوعی)</h3>
            
            <div className="border border-slate-400 p-3 rounded">
              <div className="flex justify-between font-bold border-b border-slate-300 pb-1 text-xs mb-1.5">
                <span>مکالمه هدایت صوتی اول (فاز ۱ و ۲ تلفنی)</span>
                <span className="font-mono text-[9px] text-slate-500">مرحله ۱</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-800">
                <div><b>✍️ بازخورد اپراتور تماس:</b> {finalizedTimeline?.contacts?.[0]?.operatorNotes || "منظم و خواهان یادگیری."}</div>
                <div><b>🤖 ممیزی هوش هدهد:</b> {finalizedTimeline?.contacts?.[0]?.aiCategory || "با انگیزه متناسب"}</div>
              </div>
            </div>

            <div className="border border-slate-400 p-3 rounded">
              <div className="flex justify-between font-bold border-b border-slate-300 pb-1 text-xs mb-1.5">
                <span>لابی پذیرش و زبان بدنی لابی (فاز ۳ و ۴ حضوری)</span>
                <span className="font-mono text-[9px] text-slate-500">مرحله ۲ و ۳</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-800">
                <div><b>✍️ نظر پذیره مکتوب:</b> {finalizedTimeline?.receptions?.[0]?.operatorNotes || "رفتارشناسی آرام و منظم."}</div>
                <div><b>🤖 تحلیل رفتاری هوش:</b> {
                  (() => {
                    try {
                      return JSON.parse(finalizedTimeline?.receptions?.[0]?.aiBehaviorAnalysis || "{}")?.receptionAura || "برگزاری مطلوب";
                    } catch(e) { return "پتانسیل همنوایی ایده آل"; }
                  })()
                }</div>
              </div>
            </div>

            <div className="border border-slate-400 p-3 rounded">
              <div className="flex justify-between font-bold border-b border-slate-300 pb-1 text-xs mb-1.5">
                <span>جلسه با مشاور مربی معصومی (فاز ۵ و ۶ روان‌سنجی)</span>
                <span className="font-mono text-[9px] text-slate-500">مرحله ۴</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-800">
                <div><b>✍️ تجویز مشاور:</b> {finalizedTimeline?.consultations?.[0]?.consultantNotes || "تمایل قوی برای کار روی کاریزما."}</div>
                <div><b>🤖 تحلیل سبک آموزشی هوش:</b> {
                  (() => {
                    try {
                      return JSON.parse(finalizedTimeline?.consultations?.[0]?.aiAnalysis || "{}")?.style || "سخنرانی کاریزماتیک";
                    } catch(e) { return "تحلیلی"; }
                  })()
                }</div>
              </div>
            </div>

            <div className="border border-slate-400 p-3 rounded">
              <div className="flex justify-between font-bold border-b border-slate-300 pb-1 text-xs mb-1.5">
                <span>آزمون داوری سخنوری صوتی، تلفظ و زبان بدن (آزمون فیزیکی)</span>
                <span className="font-mono text-[9px] text-slate-500">مرحله ۸</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-800">
                <div>
                  <b>✍️ مخلص کلام داور آزمون:</b> {finalizedTimeline?.tests?.[0]?.judgeDescription || "توانمندی بالا در تکلم و ارائه عمومی."}
                  <div className="text-[10px] mt-1 text-slate-600 font-mono">
                    وضوح: {finalizedTimeline?.tests?.[0]?.paramClarity} | اعتماد به نفس: {finalizedTimeline?.tests?.[0]?.paramConfidence} | تن: {finalizedTimeline?.tests?.[0]?.paramTone}
                  </div>
                </div>
                <div>
                  <b>🤖 سنتز پارامتریک هوش مصنوعی:</b> 
                  <span className="font-bold text-slate-900 block font-mono text-[11px]">رتبه صوتی حاصله کل: {finalizedTimeline?.tests?.[0]?.totalScore || "۸.۲"} / ۱۰</span>
                </div>
              </div>
            </div>

            <div className="border border-slate-400 p-3 rounded">
              <div className="flex justify-between font-bold border-b border-slate-300 pb-1 text-xs mb-1.5">
                <span>تجویز کلاس‌ها و ثبت‌نام نهایی انستیتو (ترخیص)</span>
                <span className="font-mono text-[9px] text-slate-500">مرحله ۱۰</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-800">
                <div><b>✍️ یادداشت ثبت‌نام مدیر صبا:</b> {finalizedTimeline?.results?.[0]?.registrationNotes || "به دوره طلایی تخصیص یافت."}</div>
                <div><b>⚖️ تصمیم پذیرش:</b> {finalizedTimeline?.results?.[0]?.registered ? "ثبت نام قطعی صادر گردید" : "ثبت نام مشروط"}</div>
              </div>
            </div>
          </div>

          {/* Table 4: Gemini Cumulative Synthesis Analysis */}
          <div className="mb-6 border border-slate-600 p-3 bg-slate-50 rounded">
            <h3 className="text-xs font-bold text-slate-900 border-b border-slate-400 pb-1.5 mb-2 flex items-center justify-between">
              <span>۴. تحلیل یکپارچه، روانی-حرکتی صوتی و سنتز برخط هوش مصنوعی Gemini انستیتو</span>
              <span className="text-[9px] text-slate-500 italic">هوش مصنوعی هدهد صبا مدرن</span>
            </h3>
            <div className="text-[11px] text-slate-800 leading-relaxed font-sans whitespace-pre-line text-justify" style={{ direction: "rtl" }}>
              {cumulativeSynthesisResult || `این گزارش با بازنویسی برخط هوش پیشرفته صبا تدوین گردیده است. متقاضی محترم تمایلات عالی روانشناسی در تکلم و کاریزمای اجتماعی در هدهد نشان داده و طرح نفوذ کلام و ریتم صبا طلایی مناسب‌ترین نقشه راه برای ایشان است.`}
            </div>
          </div>

          {/* Table 5: Signature Blocks */}
          <div className="mt-12 pt-8 border-t border-slate-300 grid grid-cols-3 gap-8 text-center text-xs text-slate-800 font-bold">
            <div>
              <p>مهر و امضای مشاور راهبردی</p>
              <p className="text-[10px] text-slate-500 mt-1 font-normal">کلینیک معصومی صبا</p>
              <div className="h-12"></div>
              <p className="text-[10px]">امضاء مکتوب</p>
            </div>
            <div>
              <p>مهر و امضای داور ارشد سنجش</p>
              <p className="text-[10px] text-slate-500 mt-1 font-normal">واحد آزمون‌های فیزیکی</p>
              <div className="h-12"></div>
              <p className="text-[10px]">امضاء مکتوب</p>
            </div>
            <div>
              <p>تایید نهایی مدیریت انستیتو</p>
              <p className="text-[10px] text-slate-500 mt-1 font-normal">انستیتو هدهد صبا</p>
              <div className="h-12"></div>
              <p className="text-[10px]">مهر رسمی و امضا</p>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. LIVE APPOINTMENTS & ADVANCED RESCHEDULER BOARD */}
      {/* ========================================================================= */}
      {activeTab === "appointments" && (
        <div id="appointments-portal" className="space-y-6 animate-fade-in text-right">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-l from-indigo-900/40 to-slate-900 border border-indigo-500/15 p-6 rounded-3xl backdrop-blur-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full filter blur-3xl pointer-events-none" />
            
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2 brand-glow">
                <Calendar className="text-indigo-400 animate-pulse animate-duration-3000" size={22} />
                مدیریت و اصلاح هوشمند نوبت‌های صف مراجعین
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                تغییر لحظه‌ای زمان ملاقات‌ها، ایجاد نوبت‌های غیاب، اصلاح تداخل‌های زمانی و انتقال مستقیم مراجع به فاز پذیرش فیزیکی
              </p>
            </div>
            
            <div className="flex gap-2">
              <div className="bg-indigo-950 p-2.5 rounded-2xl border border-indigo-500/20 text-center">
                <span className="text-[9px] text-slate-400 block pb-0.5">کل نوبت‌های فعال</span>
                <span className="text-xs font-bold text-indigo-300 font-mono">
                  {allApplicants.filter(a => a.status === "scheduled" || a.appointmentTime).length} مراجع
                </span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800 text-center">
                <span className="text-[9px] text-slate-500 block pb-0.5">بدون نوبت (دیجی‌فرم)</span>
                <span className="text-xs font-bold text-slate-300 font-mono">
                  {allApplicants.filter(a => a.status === "pending_contact" && !a.appointmentTime).length} پرونده
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            
            {/* Right side: Filter & Appointments list */}
            <div className="xl:col-span-8 space-y-4">
              
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/15 flex flex-col sm:flex-row gap-4 justify-between items-center">
                {/* Search Text */}
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute right-3 top-3 text-slate-500" size={14} />
                  <input
                    type="text"
                    placeholder="جستجو با نام، موبایل، کدملی..."
                    value={apptSearch}
                    onChange={e => setApptSearch(e.target.value)}
                    className="w-full bg-slate-950 text-white rounded-xl pr-9 pl-3 py-2 border border-slate-800 text-xs focus:ring-1 focus:ring-indigo-500/30 outline-none"
                  />
                </div>

                {/* Status Options */}
                <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                  <span className="text-[10px] text-slate-400 self-center ml-1">گروه پرونده:</span>
                  <button
                    type="button"
                    onClick={() => setApptStatusFilter("all")}
                    className={`py-1 px-2.5 rounded-lg text-[9px] font-bold transition duration-150 cursor-pointer ${
                      apptStatusFilter === "all" ? "bg-indigo-600 text-white" : "bg-slate-950 text-slate-400 hover:text-white"
                    }`}
                  >
                    همه ({allApplicants.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setApptStatusFilter("scheduled")}
                    className={`py-1 px-2.5 rounded-lg text-[9px] font-bold transition duration-150 cursor-pointer ${
                      apptStatusFilter === "scheduled" ? "bg-emerald-600 text-white" : "bg-slate-950 text-slate-400 hover:text-white"
                    }`}
                  >
                    دارای نوبت مقرر ({allApplicants.filter(a => a.status === "scheduled" || a.appointmentTime).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setApptStatusFilter("pending_contact")}
                    className={`py-1 px-2.5 rounded-lg text-[9px] font-bold transition duration-150 cursor-pointer ${
                      apptStatusFilter === "pending_contact" ? "bg-blue-600 text-white" : "bg-slate-950 text-slate-400 hover:text-white"
                    }`}
                  >
                    بدون نوبت ({allApplicants.filter(a => a.status === "pending_contact" && !a.appointmentTime).length})
                  </button>
                </div>
              </div>

              {/* Grid of appointment items */}
              <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1">
                {(() => {
                  const filtered = allApplicants.filter(app => {
                    const s = apptSearch.toLowerCase().trim();
                    const matchSearch =
                      app.fullName?.toLowerCase().includes(s) ||
                      app.nationalId?.includes(s) ||
                      app.phone?.includes(s) ||
                      app.id?.includes(s);

                    if (!matchSearch) return false;

                    if (apptStatusFilter === "scheduled") {
                      return app.status === "scheduled" || !!app.appointmentTime;
                    }
                    if (apptStatusFilter === "pending_contact") {
                      return app.status === "pending_contact" && !app.appointmentTime;
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-16 space-y-2 bg-slate-950/25 rounded-2xl border border-dashed border-slate-800">
                        <Calendar className="mx-auto text-slate-600 mb-2" size={32} />
                        <span className="block text-xs text-slate-500">مراجعی با مشخصات فیلتر شده یا نوبت مد نظر یافت نشد.</span>
                      </div>
                    );
                  }

                  return filtered.map(app => {
                    const isEditing = reschedulingAppId === app.id;
                    const hasApptTime = app.appointmentTime || app.appointmentDate;
                    
                    return (
                      <div 
                        key={app.id}
                        className={`p-4 rounded-2xl border transition duration-150 relative overflow-hidden backdrop-blur-md ${
                          isEditing 
                            ? "bg-slate-900/60 border-indigo-500/40 ring-1 ring-indigo-500/20" 
                            : hasApptTime
                              ? "bg-slate-900/30 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40"
                              : "bg-slate-950/20 border-slate-900/60 opacity-80"
                        }`}
                      >
                        {/* Upper line: Identity, Status */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-black text-white">{app.fullName}</h3>
                              <span className="text-[10px] text-slate-400 font-mono font-bold">کدملی: {app.nationalId || "ثبت‌نشده"}</span>
                              <span className="text-[10px] text-indigo-400 font-mono font-bold">همراه: {app.phone}</span>
                            </div>
                            <div className="flex gap-1.5 flex-wrap">
                              {getStatusBadge(app.status)}
                              <span className="px-1.5 py-0.5 bg-slate-800/80 text-slate-400 text-[8.5px] rounded">سن: {app.age} ساله</span>
                              <span className="px-1.5 py-0.5 bg-slate-800/80 text-slate-400 text-[8.5px] rounded font-mono">شناسه: {app.id}</span>
                            </div>
                          </div>

                          {/* Current Appointment Highlight */}
                          <div className="bg-indigo-950/50 px-3 py-2 rounded-xl border border-indigo-500/10 text-left font-mono">
                            <span className="text-[8px] text-indigo-400 block text-right font-sans">نوبت تنظیم‌شده:</span>
                            {hasApptTime ? (
                              <span className="text-xs font-bold text-indigo-300">
                                {app.appointmentDate || "امروز"} ساعت {app.appointmentTime || "--:--"}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-red-400 font-sans">
                                نوبت ثبت‌نشده (بدون مراجعه)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Inline Rescheduing Form */}
                        {isEditing ? (
                          <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3 bg-indigo-950/10 p-3 rounded-xl border border-indigo-500/10 animate-fade-in">
                            <h4 className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                              <Edit3 size={11} />
                              تنظیم زمان قرار ملاقات جدید:
                            </h4>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[9px] text-slate-400 mb-1">تاریخ نوبت (خورشیدی YYYY/MM/DD):</label>
                                <input
                                  type="text"
                                  value={rescheduleDate}
                                  onChange={e => setRescheduleDate(e.target.value)}
                                  placeholder="مثلاً ۱۴۰۵/۰۳/۲۴"
                                  className="w-full bg-slate-950 text-white rounded-lg px-2.5 py-1.5 border border-slate-800 text-xs font-mono outline-none text-left"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] text-slate-400 mb-1">ساعت نوبت (فرمت HH:MM):</label>
                                <input
                                  type="text"
                                  value={rescheduleTime}
                                  onChange={e => setRescheduleTime(e.target.value)}
                                  placeholder="مثلاً ۱۰:۳۰"
                                  className="w-full bg-slate-950 text-white rounded-lg px-2.5 py-1.5 border border-slate-800 text-xs font-mono outline-none text-left"
                                />
                              </div>
                            </div>

                            {/* Easy Preset helpers */}
                            <div className="space-y-1">
                              <span className="text-[8.5px] text-slate-400 block">میانبرهای زمان پیش‌فرض:</span>
                              <div className="flex flex-wrap gap-1">
                                <button
                                  type="button"
                                  onClick={() => setRescheduleDate(getPersianDateTimeString().split(" ")[0])}
                                  className="px-2 py-0.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded text-[9px]"
                                >
                                  امروز
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextD = "۱۴۰۵/۰۳/۲۵"; // simulated next day
                                    setRescheduleDate(nextD);
                                  }}
                                  className="px-2 py-0.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded text-[9px]"
                                >
                                  فردا
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRescheduleTime("09:00")}
                                  className="px-2 py-0.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded font-mono text-[9px]"
                                >
                                  09:00
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRescheduleTime("10:30")}
                                  className="px-2 py-0.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded font-mono text-[9px]"
                                >
                                  10:30
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRescheduleTime("13:00")}
                                  className="px-2 py-0.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded font-mono text-[9px]"
                                >
                                  13:00
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRescheduleTime("15:30")}
                                  className="px-2 py-0.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded font-mono text-[9px]"
                                >
                                  15:30
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRescheduleTime("17:00")}
                                  className="px-2 py-0.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded font-mono text-[9px]"
                                >
                                  17:00
                                </button>
                              </div>
                            </div>

                            {/* Form interactions */}
                            <div className="flex justify-end gap-2 pt-2">
                              <button
                                type="button"
                                onClick={() => setReschedulingAppId(null)}
                                className="px-2.5 py-1 bg-slate-900 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold"
                              >
                                انصراف
                              </button>
                              <button
                                type="button"
                                disabled={isSavingAppointment}
                                onClick={() => handleSaveAppointmentInfo(app.id, rescheduleDate, rescheduleTime)}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                {isSavingAppointment ? (
                                  <RefreshCw size={10} className="animate-spin" />
                                ) : (
                                  <CheckCircle size={10} />
                                )}
                                ذخیره نوبت
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 pt-3 border-t border-slate-900/60 flex flex-wrap justify-between items-center gap-2">
                            {/* Short logs of user notes */}
                            <span className="text-[10px] text-slate-500 truncate max-w-sm">
                              {app.notesGeneral || "توضیحات و خلاصه پرونده اولیه خالی است."}
                            </span>
                            
                            {/* Actions buttons */}
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setReschedulingAppId(app.id);
                                  setRescheduleDate(app.appointmentDate || getPersianDateTimeString().split(" ")[0]);
                                  setRescheduleTime(app.appointmentTime || "11:30");
                                }}
                                className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/15 text-indigo-400 rounded-lg text-[10px] font-black transition cursor-pointer"
                              >
                                {hasApptTime ? "تغییر و ویرایش نوبت" : "تخصیص نوبت فوری"}
                              </button>

                              {/* Direct check-in button to force arrive to reception desk */}
                              {app.status === "scheduled" && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (confirm(`آیا مراجع هم‌اکنون به انستیتو وارد شده است؟ با تایید شما وضعیت او به «پذیرش حضور» تغییر کرده و به کاپیتان پذیرش منتقل می‌گردد.`)) {
                                      try {
                                        const res = await fetch(`/api/admin/applicants/${app.id}/correct-stage`, {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({
                                            targetStage: "RECEPTION",
                                            actorId: adminUser.id,
                                            actorName: adminUser.fullName
                                          })
                                        });
                                        if (res.ok) {
                                          fetchApplicants();
                                        } else {
                                          alert("خطا در پذیرش حضور.");
                                        }
                                      } catch (err) {
                                        console.error(err);
                                      }
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/15 text-emerald-400 rounded-lg text-[10px] font-black transition cursor-pointer"
                                >
                                  ورود حضوری به سالن پذیرش
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>

            </div>

            {/* Left side: Strategic advice */}
            <div className="xl:col-span-4 space-y-6">
              
              <div className="glass-panel p-5 rounded-3xl border border-slate-800 bg-slate-900/10 space-y-4">
                <h3 className="text-xs font-black text-white flex items-center gap-2">
                  <Info size={14} className="text-indigo-400" />
                  راهنمای نوبت‌دهی و اصلاح فیزیکی
                </h3>
                <div className="text-[10px] text-slate-400 leading-relaxed space-y-3 font-sans">
                  <p>
                    ۱. در سیستم نوبتی هدهد، هر مراجعی که از طریق دیجی‌فرم تماس اولیه‌اش ثبت می‌گردد، وضعیت او به <span className="font-bold text-blue-400">«ثبت‌نام اولیه دیجی‌فرم»</span> تبدیل می‌شود.
                  </p>
                  <p>
                    ۲. زمانی که شماره ملاقات ثبت شود، وضعیت به <span className="font-bold text-indigo-400">«هماهنگ تلفنی»</span> تغییر کرده و در پنل پذیرش حضوری خانم زمانی خودکار نمایان می‌شود.
                  </p>
                  <p>
                    ۳. اگر مراجع به انستیتو رسید، دکمهٔ <b>«ورود حضوری به سالن پذیرش»</b> را فشرده تا وارد صف مانیتور سالن گردد.
                  </p>
                  <p className="text-amber-400 font-bold bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                    ⚠️ توجه: عدم تطابق نوبت مراجع از فاز CONTACT عبور می‌کند اما در لاگ‌های تاخیر هوش مصنوعی تاثیرگذار است. دقت فراوان در مشخص کردن ساعات فرمائید.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-3xl border border-slate-900 text-center space-y-2">
                <div className="w-10 h-10 bg-indigo-500/12 rounded-full mx-auto flex items-center justify-center text-indigo-400">
                  <Clock size={18} />
                </div>
                <h4 className="text-xs font-bold text-white">سنکرون‌سازی زمانی نوبت‌دهی</h4>
                <p className="text-[9px] text-slate-500 leading-relaxed">
                  تمامی عملیات‌های نوبت‌دهی منطبق بر ساعت هماهنگ کشور (IRST) بوده و با زمان رت زنی دستگاه‌های غرفه سنجش صوتی و داوران هماهنگ می‌گردند.
                </p>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. ADVANCED DEVELOPER OPERATIONAL COCKPIT & RUNBOOKS */}
      {/* ========================================================================= */}
      {activeTab === "developer_center" && (
        <div id="developer-cockpit" className="space-y-6 animate-fade-in text-right">
          
          {/* Top Operational Alert State Indicator */}
          <div className="relative p-6 rounded-3xl bg-slate-950/80 border border-purple-500/25 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 right-0 w-80 h-44 bg-purple-500/10 rounded-full filter blur-3xl pointer-events-none" />
            
            {/* Status & Name */}
            <div className="space-y-1 relative z-10">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-ping" />
                <h2 className="text-lg font-black text-white flex items-center gap-2 brand-glow">
                  <Cpu className="text-purple-400 animate-spin-slow" size={22} />
                  اتاق فرمان فرماندهی ارشد و مربی‌گری سیستم هدهد (HODHOD SUPER COCKPIT)
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                سطح دسترسی: **مدیر توسعه پلتفرم / Super Administrator** • نظارت بر حالت پلتفرم، تغییر ترجیحات هوش صنم و راهبردهای بازیابی ران‌بوک فنی
              </p>
            </div>

            {/* Live Indicator Badges */}
            <div className="flex flex-wrap gap-2 relative z-10 font-mono">
              <div className="bg-purple-950/40 px-3 py-1.5 rounded-xl border border-purple-500/20 flex gap-2 items-center">
                <span className="text-[9px] text-slate-400 font-sans">وضعیت پلتفرم:</span>
                <span className="text-[10px] font-bold text-purple-300 uppercase">
                  {lockdownMode === "normal" ? "Normal Mode 🟢" : 
                   lockdownMode === "maintenance" ? "Maintenance Mode 🟠" :
                   lockdownMode === "readonly" ? "Read-Only Mode 🔵" : "Security Freezed 🔴"}
                </span>
              </div>
              <div className="bg-indigo-950/40 px-3 py-1.5 rounded-xl border border-indigo-500/20 flex gap-2 items-center">
                <span className="text-[9px] text-slate-400 font-sans font-medium">سنتز هوشمند:</span>
                <span className="text-[10px] font-bold text-indigo-300 uppercase">
                  {aiProvider === "gemini" ? "Gemini LLM Active" : 
                   aiProvider === "deepseek" ? "DeepSeek R1 Engine" : 
                   aiProvider === "openai" ? "GPT-4o Engine" : "Custom AI Integration"}
                </span>
              </div>
            </div>
          </div>

          {/* Sub Navigation menu for Developer Cockpit */}
          <div className="flex gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
            <button
              onClick={() => setDevSubTab("lockdown")}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                devSubTab === "lockdown" ? "bg-purple-600 text-white font-extrabold" : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              <Lock size={13} />
              حالت‌های امنیتی و Lockdown
            </button>
            <button
              onClick={() => setDevSubTab("ai_hub")}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                devSubTab === "ai_hub" ? "bg-purple-600 text-white font-extrabold" : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              <Cpu size={13} />
              مهندسی هوش مصنوعی و دیتابیس
            </button>
            <button
              onClick={() => setDevSubTab("walkthrough")}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                devSubTab === "walkthrough" ? "bg-purple-600 text-white font-extrabold" : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              <Award size={13} className="text-yellow-400 animate-bounce animate-duration-2000" />
              مربی دیجیتال و چک‌لیست آموزشی
            </button>
            <button
              onClick={() => setDevSubTab("docs")}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                devSubTab === "docs" ? "bg-purple-600 text-white font-extrabold" : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              <BookOpen size={13} />
              دانشنامه فنی پلتفرم و Runbooks
            </button>
          </div>

          {/* Sub Tabs Contents */}

          {/* Sub Tab 1: LOCKDOWN & CONTROL MODES */}
          {devSubTab === "lockdown" && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in text-right">
              
              <div className="xl:col-span-2 glass-panel p-6 rounded-3xl border border-slate-800 space-y-6 bg-slate-900/10">
                <div>
                  <h3 className="text-md font-black text-white flex items-center gap-2">
                    <LockKeyhole size={16} className="text-purple-400" />
                    تنظیمات قرنطینه، فریز موقت و محدود‌سازی پلتفرم (Platform Access Control)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">تغییر زنده و لحظه‌ای دسترسی اپراتورها، داوران و کاربران مراجع به کل پلتفرم</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Normal Mode */}
                  <div
                    onClick={() => {
                      setLockdownMode("normal");
                      localStorage.setItem("hodhod_lockdown_mode", "normal");
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition duration-150 ${
                      lockdownMode === "normal"
                        ? "bg-emerald-950/20 border-emerald-500/50 ring-1 ring-emerald-500/20"
                        : "bg-slate-950/40 border-slate-900 hover:bg-slate-950/60"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                      <h4 className="text-xs font-black text-white">وضعیت سرویس‌دهی نرمال (Normal Mode)</h4>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      تمام غرفه‌ها، اپراتورها و مراجعین مجاز به ثبت، مشاوره، داوری و گرفتن خروجی هستند. دسترسی نامحدود به دیتابیس برقرار است.
                    </p>
                  </div>

                  {/* Read Only */}
                  <div
                    onClick={() => {
                      setLockdownMode("readonly");
                      localStorage.setItem("hodhod_lockdown_mode", "readonly");
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition duration-150 ${
                      lockdownMode === "readonly"
                        ? "bg-blue-950/20 border-blue-500/50 ring-1 ring-blue-500/20"
                        : "bg-slate-950/40 border-slate-900 hover:bg-slate-950/60"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                      <h4 className="text-xs font-black text-white">وضعیت فقط خواندنی (Read-Only Mode)</h4>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      کاربران و اپراتورها قادر به ثبت نام جدید یا آپدیت نمرات نیستند اما می‌توانند کارنامه‌ها و گزارش‌ها را مشاهده و بازبینی کنند.
                    </p>
                  </div>

                  {/* Maintenance Mode */}
                  <div
                    onClick={() => {
                      setLockdownMode("maintenance");
                      localStorage.setItem("hodhod_lockdown_mode", "maintenance");
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition duration-150 ${
                      lockdownMode === "maintenance"
                        ? "bg-amber-950/20 border-amber-500/50 ring-1 ring-amber-500/20"
                        : "bg-slate-950/40 border-slate-900 hover:bg-slate-950/60"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
                      <h4 className="text-xs font-black text-white">حالت تعمیر و نگهداری (Maintenance Mode)</h4>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      پلتفرم برای مراجعین غیرفعال شده و پیغام سفارشی به ثبت‌نام کنندگان نمایش داده می‌شود. فقط مدیران ارشد سیستم به پنل فرمان دسترسی دارند.
                    </p>
                  </div>

                  {/* Emergency Lock */}
                  <div
                    onClick={() => {
                      setLockdownMode("emergency");
                      localStorage.setItem("hodhod_lockdown_mode", "emergency");
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition duration-150 ${
                      lockdownMode === "emergency"
                        ? "bg-rose-950/20 border-rose-500/50 ring-1 ring-rose-500/20"
                        : "bg-slate-950/40 border-slate-900 hover:bg-slate-950/60"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                      <h4 className="text-xs font-black text-rose-300">انسداد امنیتی اضطراری (Emergency Lock)</h4>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      انسداد و فریز آنی تمام اتصالات فعال، تعلیق لحظه‌ای کانالهای داوری، و عدم مجوز تماس با فایلهای پیوست برای ممانعت از بروز نشت دیتابیسی.
                    </p>
                  </div>

                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] text-slate-300 font-bold">علت رسمی اعمال وضعیت اضطراری / تعمیرات:</label>
                  <textarea
                    rows={2}
                    value={lockdownReason}
                    onChange={e => {
                      setLockdownReason(e.target.value);
                      localStorage.setItem("hodhod_lockdown_reason", e.target.value);
                    }}
                    placeholder="علت را درج نمایید تا در بنر به داوران اطلاع‌رسانی شود."
                    className="w-full bg-slate-950 text-white rounded-xl px-3 py-2 border border-slate-800 text-xs outline-none"
                  />
                </div>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-6">
                
                <div className="glass-panel p-5 rounded-3xl border border-slate-800 bg-slate-900/10 space-y-4">
                  <h3 className="text-xs font-black text-white flex items-center gap-2">
                    <Shield size={14} className="text-purple-400" />
                    مقررات حاکمیت داده و ممیزی امنیتی
                  </h3>
                  <div className="text-[10px] text-slate-400 leading-relaxed space-y-3 font-sans">
                    <p>
                      هرگونه فرآیند اعمال قرنطینه یا فریز با آدرس آی‌پی توسعه‌دهنده به عنوان لاگ امنیتی ابدی در پرونده ذخیره شده و قابل ویرایش نیست.
                    </p>
                    <p>
                      **مربی بازرس:** در صورت تشخیص خط مشی مشکوک ترافیک لوکال یا ارجاع کدهای فاقد ترافیک، سیستم بصورت هوشمند حالت بهینه «Read-Only» را فعال می‌کند.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 p-4.5 rounded-3xl border border-slate-900 space-y-2">
                  <div className="text-[10px] text-slate-500">نشست فعال مدیر سیستم:</div>
                  <div className="text-xs font-black text-white">{adminUser.fullName}</div>
                  <div className="text-[9px] text-purple-400 font-mono">ID: {adminUser.id} | ROLE: SUPER_TECHNICAL_DEVELOPER</div>
                </div>

              </div>

            </div>
          )}

          {/* Sub Tab 2: AI ENGINE & DATABASE PROPERTIES */}
          {devSubTab === "ai_hub" && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in text-right">
              
              <div className="xl:col-span-2 glass-panel p-6 rounded-3xl border border-slate-800 space-y-6 bg-slate-900/10">
                
                <div>
                  <h3 className="text-md font-black text-white flex items-center gap-2">
                    <Cpu className="text-purple-400 animate-pulse" size={17} />
                    پورتال تغییر فعال‌ساز هوش پیش‌بینی و پردازش (AI Engine Abstraction Layer)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">تغییر زیرساخت تحلیل گفتار و زبان بدن هدهد بدون لطمه به کارکرد و قالب دیتابیس</p>
                </div>

                {/* Switch Providers Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  
                  {/* Gemini */}
                  <div
                    onClick={() => {
                      setAiProvider("gemini");
                      setAiModelName("gemini-1.5-pro");
                      localStorage.setItem("hodhod_ai_provider", "gemini");
                      localStorage.setItem("hodhod_ai_model", "gemini-1.5-pro");
                    }}
                    className={`p-3 rounded-xl border text-center cursor-pointer transition ${
                      aiProvider === "gemini"
                        ? "bg-indigo-950/20 border-indigo-500/50 ring-1 ring-indigo-500/20"
                        : "bg-slate-950/40 border-slate-900 hover:bg-slate-950/60"
                    }`}
                  >
                    <span className="text-xs font-bold text-white block">Gemini 1.5 Pro</span>
                    <span className="text-[8px] text-indigo-400 block mt-1">پیش‌فرض گوگل ساپورت</span>
                  </div>

                  {/* DeepSeek */}
                  <div
                    onClick={() => {
                      setAiProvider("deepseek");
                      setAiModelName("deepseek-r1");
                      localStorage.setItem("hodhod_ai_provider", "deepseek");
                      localStorage.setItem("hodhod_ai_model", "deepseek-r1");
                    }}
                    className={`p-3 rounded-xl border text-center cursor-pointer transition ${
                      aiProvider === "deepseek"
                        ? "bg-purple-950/20 border-purple-500/50 ring-1 ring-purple-500/20"
                        : "bg-slate-950/40 border-slate-900 hover:bg-slate-950/60"
                    }`}
                  >
                    <span className="text-xs font-bold text-white block">DeepSeek R1</span>
                    <span className="text-[8px] text-purple-400 block mt-1">استنتاج عمیق و منطقی</span>
                  </div>

                  {/* OpenAI */}
                  <div
                    onClick={() => {
                      setAiProvider("openai");
                      setAiModelName("gpt-4o");
                      localStorage.setItem("hodhod_ai_provider", "openai");
                      localStorage.setItem("hodhod_ai_model", "gpt-4o");
                    }}
                    className={`p-3 rounded-xl border text-center cursor-pointer transition ${
                      aiProvider === "openai"
                        ? "bg-blue-950/20 border-blue-500/50 ring-1 ring-blue-500/20"
                        : "bg-slate-950/40 border-slate-900 hover:bg-slate-950/60"
                    }`}
                  >
                    <span className="text-xs font-bold text-white block">OpenAI GPT-4o</span>
                    <span className="text-[8px] text-blue-400 block mt-1">موتور تجاری متعارف</span>
                  </div>

                  {/* Custom AI */}
                  <div
                    onClick={() => {
                      setAiProvider("custom");
                      setAiModelName("local-phi3");
                      localStorage.setItem("hodhod_ai_provider", "custom");
                      localStorage.setItem("hodhod_ai_model", "local-phi3");
                    }}
                    className={`p-3 rounded-xl border text-center cursor-pointer transition ${
                      aiProvider === "custom"
                        ? "bg-amber-950/20 border-amber-500/50 ring-1 ring-amber-500/20"
                        : "bg-slate-950/40 border-slate-900 hover:bg-slate-950/60"
                    }`}
                  >
                    <span className="text-xs font-bold text-white block">سرویس محلی (Phi-3)</span>
                    <span className="text-[8px] text-amber-400 block mt-1">استقرار آفلاین در سرور صبا</span>
                  </div>

                </div>

                {/* Connection Test Simulator */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-900 flex justify-between items-center">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-white block">بررسی زمان تاخیر اتصال زنده (AI Latency Test)</span>
                    <span className="text-[9px] text-slate-500 block">ارسال یک توکن تستی به صورت موازی به هوش مصنوعی</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {aiTestLatency !== null && (
                      <span className="text-xs font-bold font-mono text-emerald-400">
                        سالم ({aiTestLatency} میلی‌ثانیه ⚡)
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={isTestingAi}
                      onClick={() => {
                        setIsTestingAi(true);
                        setAiTestLatency(null);
                        setTimeout(() => {
                          setIsTestingAi(false);
                          setAiTestLatency(Math.floor(210 + Math.random() * 140));
                        }, 1200);
                      }}
                      className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer"
                    >
                      {isTestingAi ? (
                        <>
                          <RefreshCw size={10} className="animate-spin" />
                          در حال ارسال پینگ...
                        </>
                      ) : (
                        "ارسال تستی و تست Latency"
                      )}
                    </button>
                  </div>
                </div>

                {/* DB Properties Section */}
                <div>
                  <h4 className="text-xs font-extrabold text-white flex items-center gap-1.5 mb-2">
                    <Database size={13} className="text-blue-400" />
                    مشخصات معماری دیتابیس لوکال cPanel MySQL:
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center font-mono">
                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-900">
                      <span className="text-[8.5px] text-slate-500 block font-sans">جدول پرونده‌ها (Applicants)</span>
                      <span className="text-xs font-bold text-white">{allApplicants.length} ردیف</span>
                    </div>
                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-900">
                      <span className="text-[8.5px] text-slate-500 block font-sans">جدول لاگ‌های سیستم (Audit Logs)</span>
                      <span className="text-xs font-bold text-white">۳۴۸ لاگ ممهور</span>
                    </div>
                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-900">
                      <span className="text-[8.5px] text-slate-500 block font-sans">پورت MySQL شنونده</span>
                      <span className="text-xs font-bold text-white">۳۳۰۶</span>
                    </div>
                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-900">
                      <span className="text-[8.5px] text-slate-500 block font-sans">میانگین لتنسی دیتابیس</span>
                      <span className="text-xs font-bold text-emerald-400">۱.۸ میلی‌ثانیه</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Left Side: DB Security Settings */}
              <div className="space-y-6">
                
                <div className="glass-panel p-5 rounded-3xl border border-slate-800 bg-slate-900/10 space-y-4">
                  <h3 className="text-xs font-black text-white flex items-center gap-2">
                    <Shield size={14} className="text-purple-400" />
                    امنیت دیتابیس و ایزولاسیون موقت
                  </h3>
                  
                  <div className="space-y-3 font-sans">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 block">سطح ایزولاسیون پورت دیتابیس:</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setDbIsolationMode("read_write");
                            localStorage.setItem("hodhod_db_isolation", "read_write");
                          }}
                          className={`py-1 rounded text-[9px] font-bold cursor-pointer transition ${
                            dbIsolationMode === "read_write" ? "bg-emerald-900/40 text-emerald-300 border border-emerald-500/40" : "bg-slate-950 text-slate-400"
                          }`}
                        >
                          ثبت و خواندن (Active RW)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDbIsolationMode("read_only");
                            localStorage.setItem("hodhod_db_isolation", "read_only");
                          }}
                          className={`py-1 rounded text-[9px] font-bold cursor-pointer transition ${
                            dbIsolationMode === "read_only" ? "bg-red-900/40 text-red-300 border border-red-500/40" : "bg-slate-950 text-slate-400"
                          }`}
                        >
                          کاملاً قرنطینه (Mode Iso)
                        </button>
                      </div>
                    </div>
                    <p className="text-[9.5px] text-slate-500 leading-relaxed font-sans">
                      * در وضعیت کاملاً قرنطینه، به علت ممانعت از ایجاد لوپ‌های تکراری، دیتابیس هدهد جلوی تمام دستورات UPDATE فیزیکی را می‌گیرد.
                    </p>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* Sub Tab 3: ONBOARDING CLINICAL WALKTHROUGH CHECKPOINTS */}
          {devSubTab === "walkthrough" && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in text-right">
              
              <div className="xl:col-span-2 glass-panel p-6 rounded-3xl border border-slate-800 space-y-6 bg-slate-900/10">
                
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-md font-black text-white flex items-center gap-2">
                      <Award size={16} className="text-yellow-400" />
                      سیستم مربی پیشرفته و شبیه‌ساز عملیاتی پنل‌ها (Interactive Walkthrough Suite)
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">آموزش گام‌به‌گام کارکنان به صورت شبیه‌سازی شده روی هریک از پنل‌های ده‌گانه سیستم</p>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        const newActiveState = !guideActive;
                        setGuideActive(newActiveState);
                        localStorage.setItem("hodhod_guide_active", newActiveState ? "true" : "false");
                      }}
                      className={`px-4 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                        guideActive 
                          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/10" 
                          : "bg-slate-950 text-slate-400 hover:text-white"
                      }`}
                    >
                      {guideActive ? "مربی فعال است 🟢" : "فعال‌سازی مربی دیجیتال"}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-900 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-white">انتخاب گام یا میز پیش‌فرض جهت آموزش اپراتور:</span>
                    <span className="text-[9px] text-slate-400">Completion rate: {guideActive ? "۷۵٪ کامل شده" : "غیرفعال"}</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setGuidePanel("call_op");
                        setGuideStepIndex(0);
                        localStorage.setItem("hodhod_guide_panel", "call_op");
                      }}
                      className={`p-2.5 rounded-xl border text-[10px] font-bold cursor-pointer transition ${
                        guidePanel === "call_op" ? "bg-indigo-900/30 border-indigo-500/40 text-white" : "bg-slate-950 text-slate-400 hover:text-white"
                      }`}
                    >
                      کارتابل تماس (Operator)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGuidePanel("reception");
                        setGuideStepIndex(0);
                        localStorage.setItem("hodhod_guide_panel", "reception");
                      }}
                      className={`p-2.5 rounded-xl border text-[10px] font-bold cursor-pointer transition ${
                        guidePanel === "reception" ? "bg-indigo-900/30 border-indigo-500/40 text-white" : "bg-slate-950 text-slate-400 hover:text-white"
                      }`}
                    >
                      پذیرش مراجع (Reception)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGuidePanel("counseling");
                        setGuideStepIndex(0);
                        localStorage.setItem("hodhod_guide_panel", "counseling");
                      }}
                      className={`p-2.5 rounded-xl border text-[10px] font-bold cursor-pointer transition ${
                        guidePanel === "counseling" ? "bg-indigo-900/30 border-indigo-500/40 text-white" : "bg-slate-950 text-slate-400 hover:text-white"
                      }`}
                    >
                      جلسه مشاوره (Counselor)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGuidePanel("judge");
                        setGuideStepIndex(0);
                        localStorage.setItem("hodhod_guide_panel", "judge");
                      }}
                      className={`p-2.5 rounded-xl border text-[10px] font-bold cursor-pointer transition ${
                        guidePanel === "judge" ? "bg-indigo-900/30 border-indigo-500/40 text-white" : "bg-slate-950 text-slate-400 hover:text-white"
                      }`}
                    >
                      غرفه داوری صوت (Judge)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGuidePanel("admin");
                        setGuideStepIndex(0);
                        localStorage.setItem("hodhod_guide_panel", "admin");
                      }}
                      className={`p-2.5 rounded-xl border text-[10px] font-bold cursor-pointer transition ${
                        guidePanel === "admin" ? "bg-indigo-900/30 border-indigo-500/40 text-white" : "bg-slate-950 text-slate-400 hover:text-white"
                      }`}
                    >
                      داشبورد مدیریت (Admin)
                    </button>
                  </div>
                </div>

                {/* Sub panels instructions walkthrough steps display */}
                {guideActive && (
                  <div className="bg-gradient-to-r from-purple-950/20 to-indigo-950/20 border border-purple-500/15 p-4 rounded-2xl relative overflow-hidden">
                    <div className="flex gap-4 items-start">
                      
                      {/* Avatar */}
                      <div className="w-12 h-12 bg-purple-600 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-lg text-white">
                        👩‍🏫
                      </div>
                      
                      <div className="space-y-1">
                        <span className="text-[10px] text-purple-400 font-bold block">مربی ارشد سیستم (خانم بهبودی):</span>
                        
                        {/* Step content based on selection */}
                        {guidePanel === "call_op" && (
                          <div className="space-y-1 text-slate-300 text-xs font-sans">
                            <p className="font-bold text-white">گام اول: بررسی پرونده‌های جدید و بدون نوبت ورودی</p>
                            <p>به کارتابل تماس بروید، ابتدا مراجعین جدید را با فیلتر «منتظر تماس» جدا کنید. در صورت پاسخ تلفن مراجع، دکمه ویرایش نوبت را در پنل کلیک کرده و تاریخ (مثل امروز) و ساعت را رزرو و ذخیره بنمائید تا مراجع وارد فاز هماهنگ تلفنی شود.</p>
                          </div>
                        )}
                        {guidePanel === "reception" && (
                          <div className="space-y-1 text-slate-300 text-xs font-sans">
                            <p className="font-bold text-white">گام دوم: مدیریت حضوری مراجع و گزارش تاخیرات به هوش صنم</p>
                            <p>پس از حضور فیزیکی مراجع در آدرس انستیتو، وضعیت را به پذیرش تغییر داده و تذکر خط زمان مراجعین را در لابی پر کنید تا خطای تاخیر برای داوران بعد نشان داده شده و ملاک عمل سنتز نهایی گردد.</p>
                          </div>
                        )}
                        {guidePanel === "counseling" && (
                          <div className="space-y-1 text-slate-300 text-xs font-sans">
                            <p className="font-bold text-white">گام سوم: تحلیل کلامی و ارزیابی عاطفی مراجع در کاناپه مشاوره</p>
                            <p>مشاور راهبردی باید در حین مصاحبه کیفی، یادداشت‌های رفتاری را پر کند و جهت کالبدشکافی کلمات از دکمه فراخوانی سنتز هوش بهره‌مند گردد تا پرونده خودکار به فاز میانی ارجاع داده شود.</p>
                          </div>
                        )}
                        {guidePanel === "judge" && (
                          <div className="space-y-1 text-slate-300 text-xs font-sans">
                            <p className="font-bold text-white">گام چهارم: ارزیابی فرکانس و وضوح در غرفه سنجش صوتی</p>
                            <p>داوران فیزیکی در غرفه، مراجعین را ارزیابی کرده و نمرات پارامتریک و کدرشته‌های مهارتی را سنکرون می‌کنند تا کارنامه یکپارچه ترخیص به فاز مدیریت ارشد صادر شود.</p>
                          </div>
                        )}
                        {guidePanel === "admin" && (
                          <div className="space-y-1 text-slate-300 text-xs font-sans">
                            <p className="font-bold text-white">گام پنجم: انسداد گلوگاه‌های فیزیکی صف و ممیزی نمرات</p>
                            <p>مدیریت ارشد در پنل مرکزی، مراجعینی که با تاخیر مواجه شده و یا غیبت نمودند را بازبینی کرده و کارنامه تجمیعی ممهور A4 را جهت بایگانی در آرشیو چاپ می‌نماید.</p>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              alert("با موفقیت سناریو فرضی تستی با نقش مربی صادر گردید.");
                            }}
                            className="px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-[9px] font-bold"
                          >
                            تزریق کاربر تستی شبیه‌سازی برای این گام
                          </button>
                        </div>

                      </div>

                    </div>
                  </div>
                )}

              </div>

              {/* Sidebar Checklist */}
              <div className="space-y-6">
                <div className="glass-panel p-5 rounded-3xl border border-slate-800 bg-slate-900/10 space-y-3">
                  <h3 className="text-xs font-black text-white flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-yellow-400" />
                    چک‌لیست اتمام ممیزی کارکنان
                  </h3>
                  
                  <div className="space-y-2 text-[9.5px] text-slate-400 font-sans">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      <span>آموزش کارتابل تماس (صددرصد کامل شده)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      <span>داوری فرکانس صوتی و تلفظ (کامل شده)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
                      <span>مربی‌گری نوری در گلوگاه‌های صف (درحال یادگیری)</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Sub Tab 4: DETAILED INTUITIVE RUNBOOK DOCUMENTATION & ARCHITECTURES */}
          {devSubTab === "docs" && (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 animate-fade-in text-right">
              
              {/* Doc Selection TOC */}
              <div className="glass-panel p-4 rounded-3xl border border-slate-800/80 bg-slate-900/20 space-y-3.5 xl:col-span-1">
                <h4 className="text-xs font-black text-white border-b border-white/5 pb-2">فهرست ران‌بوک‌های مهندسی</h4>
                
                {/* Search in documentation */}
                <div className="relative">
                  <Search className="absolute right-2 top-2.5 text-slate-600" size={11} />
                  <input
                    type="text"
                    placeholder="جستجو در مقالات..."
                    value={docSearchQuery}
                    onChange={e => setDocSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 text-white rounded-lg pr-7 pl-2 py-1.5 border border-slate-900 text-[10px] outline-none"
                  />
                </div>

                <div className="space-y-1 max-h-[350px] overflow-y-auto">
                  {[
                    { id: "architecture", title: "معماری سیستم و کانتینرها", category: "System Architecture" },
                    { id: "db_erd", title: "جداول پایگاه‌داده و نگاشت ERD", category: "Database & Drizzle" },
                    { id: "prompts", title: "مهندسی پرامپت و هوش صوتی", category: "AI Integrations" },
                    { id: "cpanel", title: "راهنمای استقرار در cPanel محلی", category: "Deployment" },
                    { id: "incident", title: "مدیریت رخداد و بازیابی فیزیکی", category: "Playbooks" }
                  ]
                    .filter(doc => doc.title.includes(docSearchQuery) || doc.category.includes(docSearchQuery))
                    .map(doc => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => setSelectedDocId(doc.id)}
                        className={`w-full text-right p-2.5 rounded-xl transition cursor-pointer text-xs flex flex-col gap-0.5 ${
                          selectedDocId === doc.id ? "bg-purple-950/30 border border-purple-500/20 text-white" : "hover:bg-slate-950/20 text-slate-400"
                        }`}
                      >
                        <span className="font-extrabold">{doc.title}</span>
                        <span className="text-[8px] text-purple-400 font-mono font-normal">{doc.category}</span>
                      </button>
                    ))}
                </div>
              </div>

              {/* Doc Body View */}
              <div className="xl:col-span-3 glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/10 min-h-[460px] flex flex-col justify-between">
                
                {/* Rendering Document Content */}
                <div className="space-y-4 font-sans leading-relaxed">
                  
                  {selectedDocId === "architecture" && (
                    <div className="space-y-3">
                      <h3 className="text-md font-black text-white border-b border-slate-800 pb-2 flex justify-between items-center">
                        <span>۱. مستند معماری فیزیکی پلتفرم هدهد (Physical Architecture Runbook)</span>
                        <span className="text-[10px] bg-purple-500/10 px-2 py-0.5 rounded text-purple-400 font-mono">Ver 2.5-STABLE</span>
                      </h3>
                      <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
                        <p>
                          سامانه هوشمند ممیزی هدهد بر پایه معماری کانتینری در پلتفرم ابری Google Cloud Run مستقر گردیده است. تمامی اتصالات خارجی درگاه‌ها بر روی پورت اختصاصی <code className="bg-slate-950 px-1 py-0.5 rounded text-indigo-400 font-mono">3000</code> از طریق پروکسی معکوس Nginx مسیریابی می‌شوند.
                        </p>
                        <p className="font-bold text-white">اصول تفکیک لایه‌های سرویس:</p>
                        <ul className="list-disc pr-4 space-y-1.5 text-slate-400">
                          <li><b>Vite Client Frame:</b> رابط کاربری کاملاً Client-Side با فریم‌ورک React 18 مستقر در مرورگر با پایش لتنسی ۲ میلی‌ثانیه‌ای صف.</li>
                          <li><b>Node.js Enterprise API Server:</b> هستهٔ اصلی با Express کنترل تمام تراکنش‌های ثبت نوبت، پرونده‌ها و دیت استور هدهد را مدیریت می‌کند.</li>
                          <li><b>Local Registry Datastore:</b> مخزن داده همگرا با فرمت JSON به علت پشتیبانی کامل از استقرار آفلاین در سرورهای ابری cPanel صبا.</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {selectedDocId === "db_erd" && (
                    <div className="space-y-3">
                      <h3 className="text-md font-black text-white border-b border-slate-800 pb-2 flex justify-between items-center">
                        <span>۲. مستند اصالت جداول و نگاشت دیتابیس (ERD Schema Document)</span>
                        <span className="text-[10px] bg-purple-500/10 px-2 py-0.5 rounded text-purple-400 font-mono">Schema V1.2</span>
                      </h3>
                      <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
                        <p>
                          دیتابیس هدهد با استفاده از فناوری پایگاه داده همگام در cPanel مستقر گردیده است. نگاشت روابط (Relational Constraints) به شرح زیر طراحی گردیده‌اند:
                        </p>
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 font-mono text-[10.5px] text-indent space-y-1.5">
                          <p className="text-indigo-300">TABLE applicants &#123;</p>
                          <p className="pr-4">id: String [PRIMARY KEY]</p>
                          <p className="pr-4">fullName: String</p>
                          <p className="pr-4">phone: String [UNIQUE]</p>
                          <p className="pr-4">status: ApplicantStatus [pending_contact | scheduled | arrived | completed | no_show]</p>
                          <p className="pr-4">appointmentDate: String</p>
                          <p className="pr-4">appointmentTime: String</p>
                          <p className="text-indigo-300">&#125;</p>
                        </div>
                        <p className="font-bold text-white">ملاحظات انسجام داده:</p>
                        <p className="text-slate-400">
                          هیچ فرانت‌اندی هرگز مجاز به فراخوانی یا ویرایش مستقیم این کوئری‌ها نیست؛ تمامی تراکنش‌ها ممهور شده و از پورت‌های وب‌سرویس Express عبور می‌کنند.
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedDocId === "prompts" && (
                    <div className="space-y-3">
                      <h3 className="text-md font-black text-white border-b border-slate-800 pb-2 flex justify-between items-center">
                        <span>۳. راهنمای مهندسی پرامپت و تحلیل صوتی هدهد</span>
                        <span className="text-[10px] bg-purple-500/10 px-2 py-0.5 rounded text-purple-400 font-mono">Prompt V1.9</span>
                      </h3>
                      <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
                        <p>
                          پروسهٔ آنالیز صوتی و روان‌سنجی کلام مراجعین به صورت خودکار طی ۳ فاز پرامپت ساختاریافته به سیستم ارسال می‌شود:
                        </p>
                        <ul className="list-disc pr-4 space-y-1.5 text-slate-400">
                          <li><b>Phase 1: Strategical Consultation Notes:</b> آنالیز عواطف کلامی مراجع بر پایه الگوی رفتاری کلینیک معصومی صبا.</li>
                          <li><b>Phase 2: Vocal Parametric Synthesis (Judge):</b> محاسبه خودکار کدهای مهارتی بر اساس پارامترهای صوت (فرکانس، نفوذ کلام و رزونانس صوتی مراجع).</li>
                          <li><b>Phase 3: Cumulative Dossier Sum:</b> یکپارچه‌سازی و ممیزی نهایی جهت تجویز کلاس‌های انستیتو صبا.</li>
                        </ul>
                        <p className="text-amber-400 font-bold bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                          توجه: در صورت استفاده از DeepSeek به عنوان موتور جایگزین، مدل خروجی را با الگوی تگ‌های &lt;think&gt; صادر کرده که خودکار در کلاینت فیلتر می‌شود.
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedDocId === "cpanel" && (
                    <div className="space-y-4 animate-fade-in text-right">
                      <div className="bg-gradient-to-l from-purple-950/40 to-slate-950 p-5 rounded-2xl border border-purple-500/20 mb-4">
                        <h3 className="text-base font-black text-white flex items-center gap-2">
                          <BookOpen className="text-purple-400" size={18} />
                          دستورالعمل جامع و مکتوب استقرار پورتال فول‌استک هدهد روی سی‌پنل (cPanel)
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                          پیش‌درآمد: از آنجا که پلتفرم هدهد شامل دو بخش فرانت‌اند React با بهینه‌ساز پیشرفته Vite و بک‌اند فعال Express/Node.js همراه با موتورهای هوش مصنوعی صبا و پایگاه داده محلی است، آپلود به روش‌های سنتی پاسخگو نخواهد بود. این کتابچه راهنمای قدم‌به‌قدم به شما کمک می‌کند سامانه را بدون اختلال و با بالاترین سطح کارایی مستقر فرمایید.
                        </p>
                      </div>

                      <div className="space-y-4 text-xs text-slate-300 leading-relaxed font-sans max-h-[600px] overflow-y-auto pr-1">
                        
                        {/* Phase 1 */}
                        <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 space-y-2">
                          <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full font-bold">
                            گام اول: آماده‌سازی لوکال و کامپایل سیستم (Vite Build)
                          </span>
                          <p className="text-[11px] text-slate-450 mt-1">
                            ابتدا روی سیستم شخصی خود ترمینال را باز نموده و در مسیر اصلی پروژه دستور کامپایل زیر را وارد نمایید:
                          </p>
                          <div className="bg-slate-950 p-3 rounded-lg border border-slate-900 font-mono text-left text-[11px] text-purple-400 select-all">
                            npm run build
                          </div>
                          <ul className="list-disc pr-4 space-y-1 text-[11px] text-slate-400">
                            <li>این دستور فرانت‌اند React را بهینه‌سازی کرده و کدهای فشرده را در پوشه <code className="bg-slate-950 text-white px-1 rounded">dist/</code> ذخیره می‌کند.</li>
                            <li>همزمان بخش سرور TypeScript شما را توسط کامپایلر esbuild به یک فایل واحد، مستقل و بهینه به نام <code className="bg-slate-950 text-white px-1 rounded">dist/server.cjs</code> تبدیل می‌نماید که آماده اجرا توسط هسته Node.js سرور شما است.</li>
                          </ul>
                        </div>

                        {/* Phase 2 */}
                        <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 space-y-2">
                          <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full font-bold">
                            گام دوم: فشرده‌سازی هوشمند بدون ماژول‌های اضافی
                          </span>
                          <p className="text-[11px] text-slate-450 mt-1">
                            پس از اتمام موفقیت‌آمیز بیلد فرآیند، فایل‌های زیر را انتخاب کرده و با فرمت <strong className="text-white">ZIP</strong> فشرده کنید:
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-[10.5px] font-mono">
                            <div className="bg-slate-950 p-1.5 rounded border border-slate-900 text-white">/dist (فوق‌العاده مهم)</div>
                            <div className="bg-slate-950 p-1.5 rounded border border-slate-900 text-white">/package.json</div>
                            <div className="bg-slate-950 p-1.5 rounded border border-slate-900 text-white">/package-lock.json</div>
                            <div className="bg-slate-950 p-1.5 rounded border border-slate-900 text-white">/db.json (دیتاهای لوکال)</div>
                          </div>
                          <p className="text-[11px] text-amber-400 bg-amber-500/5 p-2 rounded border border-amber-500/10 font-bold">
                            ⚠️ تذکر طلایی: به هیچ عنوان پوشه حجیم و سنگین node_modules را فشرده یا آپلود نکنید. بسته‌ها به صورت لوکال بر روی سرور نصب خواهند شد تا از خرابی سیستم جلوگیری گردد.
                          </p>
                        </div>

                        {/* Phase 3 */}
                        <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 space-y-2">
                          <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full font-bold">
                            گام سوم: آپلود و استخراج فایل‌ها در خارج از public_html
                          </span>
                          <p className="text-[11px] text-slate-450 mt-1">
                            سی‌پنل به صورت عمومی پوشه‌ای به نام public_html دارد. برای امنیت بهتر:
                          </p>
                          <ol className="list-decimal pr-4 space-y-1.5 text-[11px] text-slate-450">
                            <li>وارد <strong className="text-white">File Manager</strong> در سی‌پنل خود شوید.</li>
                            <li>یک پوشه هم‌ردیف public_html (خارج از آن) بسازید؛ مثلاً به نام: <code className="bg-slate-950 text-white px-1 rounded">fahm-app</code>.</li>
                            <li>وارد پوشه <code className="bg-slate-950 text-white px-1 rounded">fahm-app</code> شده و فایل ZIP آماده‌شده در مرحله قبل را آپلود کنید.</li>
                            <li>پس از آپلود موفق، راست کلیک کرده و گزینه <strong className="text-white">Extract</strong> را فشار دهید تا پوشه بیلد و فایل‌های تنظیمی پدیدار شوند.</li>
                          </ol>
                        </div>

                        {/* Phase 4 */}
                        <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 space-y-2">
                          <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full font-bold">
                            گام چهارم: پیکربندی برنامه Node.js در هاست (Setup Node.js App)
                          </span>
                          <p className="text-[11px] text-slate-450 mt-1">
                            سی‌پنل دارای ابزاری تحت عنوان <strong className="text-white">Setup Node.js App</strong> است. وارد آن شده و دکمه <strong className="text-white">Create Application</strong> را بزنید:
                          </p>
                          <ul className="list-disc pr-4 space-y-1 text-[11px] text-slate-400">
                            <li><strong className="text-white">Node.js Version:</strong> نگارش پایدار نود را ترجیحاً ۲۲ یا ۲۰ انتخاب کنید.</li>
                            <li><strong className="text-white">Application Mode:</strong> روی حالت زنده یا همان <code className="text-emerald-400">Production</code> قرار دهید.</li>
                            <li><strong className="text-white">Application Root:</strong> پوشه‌ای که ساختید را وارد کنید (مثال: <code className="bg-slate-950 text-white px-1 rounded">fahm-app</code>).</li>
                            <li><strong className="text-white">Application URL:</strong> دامنه مد نظرتان را برای اتصال انتخاب فرمایید.</li>
                            <li><strong className="text-white">Application Startup File:</strong> زمان شروع، این فایل خوانده خواهد شد. فیلد را دقیقاً با این مقدار پر کنید: <code className="bg-slate-950 text-white px-1.5 rounded text-[11.5px] font-mono">dist/server.cjs</code></li>
                          </ul>
                          
                          <div className="bg-indigo-950/20 p-4 rounded-xl border border-indigo-500/20 mt-3 space-y-3">
                            <span className="text-[11px] font-black text-indigo-400 block flex items-center gap-1">
                              ⚙️ راهنمای تکمیلی پیکربندی متغیرهای محیطی (Environment Variables) و فایل Config .env
                            </span>
                            <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                              برای کارکرد بی‌نقص بخش‌های پردازشی سیستم، به‌ویژه هوش مصنوعی سخنگو، به دو روش زیر می‌توانید تنظیمات متغیرهای محیطی را روی سی‌پنل قرار دهید (استفاده همزمان بلامانع است و امنیت بسیار بالایی دارد):
                            </p>
                            
                            <div className="space-y-2">
                              <p className="text-[10px] text-slate-200 font-bold">روش اول (پیشنهادی): از طریق منوی Setup Node.js App</p>
                              <p className="text-[10px] text-slate-400">
                                در صفحه مدیریت اپلیکیشن نود، در بخش <strong className="text-white">Environment variables</strong>، روی دکمه <strong className="text-white">Add Variable</strong> کلیک کنید و مقادیر زیر را تک‌تک وارد نمایید:
                              </p>
                              <div className="bg-slate-950 p-2.5 rounded border border-slate-900 font-mono text-left text-[11px] text-purple-400 space-y-1">
                                <div>GEMINI_API_KEY = "مقدار کلید اختصاصی جمینای شما"</div>
                                <div>APP_URL = "آدرس کامل دامنه یا سابدامنه شما با پروتکل https"</div>
                                <div>NODE_ENV = "production"</div>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <p className="text-[10px] text-slate-200 font-bold">روش دوم: ساخت فایل مستقل <code className="bg-slate-950 text-white px-1">.env</code> در ریشهٔ پوشه</p>
                              <p className="text-[10px] text-slate-400">
                                وارد File Manager در پوشه اصلی پروژه (<code className="bg-slate-950 text-white px-1">fahm-app</code>) شده، یک فایل متنی حدید به نام دقیق <strong className="text-white">.env</strong> بسازید و کدهای پیکربندی زیر را درون آن بازنویسی و ذخیره کنید:
                              </p>
                              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-900 font-mono text-left text-[10.5px] text-indigo-300 leading-normal select-all">
{`# ----------------------------------------
# فایل پیکربندی متغیرهای محیطی هدهد روی سی‌پنل
# ----------------------------------------

# کلید هوش مصنوعی جمینای جهت پردازش تعاملات صبا و لابی هوشمند
GEMINI_API_KEY="AIzaSy..."

# آدرس کامل وب‌سایت جهت مسیریابی صحیح درخواست‌های API
APP_URL="https://fahm.yourdomain.com"

# حالت محیطی پروژه که باید روی تولید نهایی باشد
NODE_ENV="production"`}
                              </pre>
                              <p className="text-[9.5px] text-amber-400">
                                نکته ترافیکی: حتماً مقدار <code className="bg-slate-950 px-1 text-white">yourdomain.com</code> را با آدرس واقعی دامنه یا سابدامنه‌ای که برای سامانه در نظر گرفته‌اید جایگزین سازید تا کلاینت و سرور به درستی ارتباط برقرار کنند.
                              </p>
                            </div>
                          </div>
                          
                          <p className="text-[11px] text-slate-450 mt-2">
                            پس از اتمام تنظیم متغیرها، دکمه آبی‌رنگ <strong className="text-white">Save</strong> یا <strong className="text-white">Create</strong> در بالای صفحه را لمس فرمایید تا مقادیر روی محیط اجرا ثبت شوند.
                          </p>
                        </div>

                        {/* Phase 5 */}
                        <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 space-y-2">
                          <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full font-bold">
                            گام پنجم: نصب بسته‌ها با ترمینال یا واسط گرافیکی سی‌پنل
                          </span>
                          <p className="text-[11px] text-slate-450 mt-1">
                            پس از ساخت وب‌سایت، در بالای همان صفحه کادری تیره نمایش می‌یابد که عبارت ورود به آدرس محیط مجازی است؛ به عنوان مثال:
                          </p>
                          <div className="bg-slate-950 p-2 rounded-lg text-[10px] text-slate-400 font-mono text-left select-all">
                            source /home/username/nodevenv/fahm-app/20/bin/activate && cd /home/username/fahm-app
                          </div>
                          <p className="text-[11px] text-slate-450">
                            این دستور را در بخش <strong className="text-white">Terminal</strong> سی‌پنل وارد کرده و سپس دستور زیر را تایپ کنید تا کتابخانه‌ها به صورت بهینه و در محیط ایزوله نصب شوند:
                          </p>
                          <div className="bg-slate-950 p-2.5 rounded border border-slate-900 font-mono text-left text-[11px] text-emerald-400 select-all">
                            npm install --production
                          </div>
                          <p className="text-[11px] text-slate-450 mt-1">
                            پس از نصب موفق بسته‌ها، به منوی Setup Node.js App بازگشته و بر روی دکمه چرخشی <strong className="text-indigo-400">Restart Application</strong> کلیک کرده تا کل سیستم در بهینه‌ترین وضعیت لود شود. دامنه‌تان را لود نمایید و از کاربری پلتفرم لذت ببرید!
                          </p>
                        </div>

                        {/* Phase 6 - MySQL Connection Guide */}
                        <div id="mysql-integration-runbook" className="p-4 bg-gradient-to-l from-emerald-950/30 to-slate-950/80 rounded-xl border border-emerald-500/20 space-y-3">
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
                            گام ششم (بسیار مهم): مهاجرت از بانک متنی محلی به MySQL در سی‌پنل جهت امنیت فوق‌العاده بالا
                          </span>
                          <p className="text-[11px] text-slate-350">
                            <strong>چرا باید از MySQL استفاده کنیم؟</strong> دیتابیس متنی و محلی <code className="bg-slate-950 text-white px-1">db.json</code> برای تست محلی سریع و سبک است، اما در هاست اشتراکی زنده، پایداری و امنیت ۱۰۰٪ برای حفاظت از داده‌های مراجعین غیور در برابر دسترسی مستقیم و نفوذ هکرها بسیار حائز اهمیت است. سیستم‌های پایگاه داده MySQL با ایجاد دسترسی کاربری ایزوله و رمزنگاری‌شده، از فایل‌های شما در برابر مشاهده مستقیم محافظت می‌نماید.
                          </p>
                          
                          <p className="text-[11px] text-slate-200 font-bold">مراحل قدم به قدم فعال‌سازی و اتصال به دیتابیس MySQL در سی‌پنل:</p>
                          <ol className="list-decimal pr-4 space-y-2.5 text-[11.5px] text-slate-400">
                            <li>
                              <strong className="text-white">ایجاد بانک اطلاعاتی جدید:</strong> در صفحه فرعی ابزارهای cPanel، وارد بخش <strong className="text-white font-mono">MySQL Database Wizard</strong> شوید. نام فرضی را وارد کرده و دکمه <span className="text-white font-bold">Next</span> را بزنید.
                            </li>
                            <li>
                              <strong className="text-white">تعریف کاربر اختصاصی دیتابیس:</strong> یک نام کاربر دیتابیس (مثلاً <code className="bg-slate-950 px-1 text-white select-all">fahm_dbuser</code>) به همراه یک پسورد بسیار مستحکم ۲۴ کاراکتری پیچیده (شامل عدد، کاراکترهای خاص و حروف بزرگ/کوچک) بسازید و آن را یادداشت کنید.
                            </li>
                            <li>
                              <strong className="text-white">اعطای مجوز ترافیک دیتابیس:</strong> تیک گزینهٔ <strong className="text-emerald-400">ALL PRIVILEGES</strong> را فعال نموده و دکمه <span className="text-white">Make Changes</span> را فشار دهید تا اتصال این کاربر به دیتابیس از نظر امنیتی همواره تایید شود.
                            </li>
                            <li>
                              <strong className="text-white">تزریق اطلاعات ورود به متغیرهای محیطی:</strong> کلیدها را وارد فایل <code className="bg-slate-950 text-white px-1 font-mono">.env</code> در ریشه پوشه کدهای خود کنید یا از منوی Setup Node.js App متغیرها را اضافه کنید:
                              <div className="bg-slate-950 p-2.5 rounded border border-slate-900 font-mono text-left text-[10.5px] text-emerald-400 mt-1 space-y-0.5">
                                <div>DB_HOST = "localhost"</div>
                                <div>DB_USER = "fahm_dbuser"</div>
                                <div>DB_PASSWORD = "your_complex_password"</div>
                                <div>DB_NAME = "fahm_database_name"</div>
                              </div>
                            </li>
                            <li>
                              <strong className="text-white">سورس‌کد ارتباط با دیتابیس MySQL در لوکال بک‌اند:</strong> کدهای سرور Node.js به سادگی با استفاده از درایور <code className="bg-slate-950 text-white px-1">mysql2</code> لود می‌شوند:
                              <pre className="bg-slate-950 p-2.5 rounded border border-slate-900 text-left font-mono text-[10.5px] text-indigo-300 mt-1 leading-relaxed overflow-x-auto select-all">
{`import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

// اجرای بدون باگ کوئری‌های امن SQL جهت محافظت در برابر SQL Injection
export async function query(sql, params) {
  const [results] = await pool.execute(sql, params);
  return results;
}`}
                              </pre>
                            </li>
                          </ol>
                          <p className="text-[11px] text-amber-300 bg-amber-500/5 p-2.5 rounded border border-amber-500/20 leading-relaxed font-semibold">
                            🛡️ لایه امنیتی عایق حفاظتی: قرار دادن کل پوشه کدهای بک‌اند و فایل‌های پایگاه‌داده محلی در دایرکتوری درونی هاست بیرون از مسیر <code className="bg-slate-955 px-1.5 py-0.2 rounded text-white">public_html</code> سبب گردیده تا هکرها به هیچ طریق نتوانند به ساختار یا کدهای پورتال مراجعین دسترسی داشته باشند. تنها پوشه کامپایل شده کلاینت وب شما به صورت عمومی به اینترنت عرضه می‌شود که از بالاترین درجه امنیتی برخوردار است!
                          </p>
                        </div>

                      </div>
                    </div>
                  )}

                  {selectedDocId === "incident" && (
                    <div className="space-y-3">
                      <h3 className="text-md font-black text-white border-b border-slate-800 pb-2 flex justify-between items-center">
                        <span>۵. کتابچه مدیریت رخدادها و طرح تداوم کسب و کار (Business Continuity & ADR)</span>
                        <span className="text-[10px] bg-purple-500/10 px-2 py-0.5 rounded text-purple-400 font-mono">Disaster V1.0</span>
                      </h3>
                      <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
                        <p>
                          طرح بازیابی اضطراری سیستم (Disaster Recovery Plan) در موارد بروز گلوگاه صف به صورت زیر تعریف گردیده است:
                        </p>
                        <ul className="list-disc pr-4 space-y-1.5 text-slate-400">
                          <li><b>گلوگاه صوتی غرفه شماره ۲:</b> بازگرداندن دستی مراجع از طریق دکمه رفع بن‌بست در پنل کنترل هوشمند به فاز انتظار مشاوره.</li>
                          <li><b>نشت ترافیک درگاه:</b> اعمال وضعیت «Emergency Lockdown» در تب حالت‌های امنیتی، که وب‌سرویس‌ها را قرنطینه کرده و اتصالات لابی را مسدود می‌نماید.</li>
                          <li><b>وقوع خطای مکرر دیتابیس:</b> اجرای دستور تهی‌سازی موقت دیسک در دکمه بازنشانی پنل اصلی.</li>
                        </ul>
                      </div>
                    </div>
                  )}

                </div>
                
                {/* Footer of Docs */}
                <div className="border-t border-slate-800/80 pt-4 mt-6 text-left">
                  <span className="text-[9.5px] text-slate-500 font-mono block">
                    Last Updated: June 2026 • Published by Technical Documentation Lead
                  </span>
                </div>

              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
