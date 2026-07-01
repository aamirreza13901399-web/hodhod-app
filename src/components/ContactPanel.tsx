/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { User, Applicant, QueueStage, ApplicantStatus } from "../types.js";
import { 
  Phone, Calendar, Upload, FileSpreadsheet, Search, CheckCircle, 
  Trash2, Eye, UserPlus, Sparkles, RefreshCw, X, ChevronRight, Copy,
  AlertTriangle, HelpCircle, Activity, Star, Clock, Sparkle, AlertCircle, 
  Volume2, VolumeX, List, Grid, Award, ShieldAlert, CheckCircle2, Check, Moon,
  CalendarRange, Printer
} from "lucide-react";
import { getPersianDateTimeString } from "../lib/dateUtils.js";
import * as XLSX from "xlsx";

interface ContactPanelProps {
  user: User;
}

// Quick Audio synthesizer for beautiful physical beep alerts
const playBeep = (volume: number, frequency: number = 800, duration: number = 0.15) => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    // Nice volume decay
    gain.gain.setValueAtTime(volume * 0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    console.warn("Audio Context playback barred by browser policy:", err);
  }
};

export default function ContactPanel({ user }: ContactPanelProps) {
  // Global Application State
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedApp, setSelectedApp] = useState<Applicant | null>(null);
  const [layoutMode, setLayoutMode] = useState<"table" | "grid">("table");
  
  // Filtering & Advanced states
  const [activeTab, setActiveTab] = useState<"all" | "new" | "pending" | "no_answer" | "callback" | "scheduled">("all");
  const [schedulerDate, setSchedulerDate] = useState<string>("");
  const [showA4PrintModal, setShowA4PrintModal] = useState<boolean>(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterGender, setFilterGender] = useState<"all" | "male" | "female">("all");
  const [filterInterest, setFilterInterest] = useState<number | null>(null);
  const [filterPriority, setFilterPriority] = useState<"all" | "normal" | "high" | "vip">("all");
  const [filterEducation, setFilterEducation] = useState("all");
  
  // Pagination system
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Reset pagination on filter or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search, filterGender, filterEducation]);
  
  // Audio settings
  const [isMuted, setIsMuted] = useState(false);
  const [alertVolume, setAlertVolume] = useState(0.5);

  // Network Status simulation states
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [simulateOffline, setSimulateOffline] = useState(false);
  const [offlineRetryCount, setOfflineRetryCount] = useState(0);

  // Short Keyboard shortcut dialog
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Form states inside applicant card
  const [opNotes, setOpNotes] = useState("");
  const [aptDate, setAptDate] = useState(""); // YYYY/MM/DD (Jalali)
  const [aptTime, setAptTime] = useState(""); // HH:MM
  const [selectedCallResult, setSelectedCallResult] = useState<string>("answered");
  const [aiResult, setAiResult] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [callHistory, setCallHistory] = useState<any[]>([]);
  
  // Form draft auto-save states
  const [lastSavedDraftMessage, setLastSavedDraftMessage] = useState<string | null>(null);

  // Excel importing progress
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState<{
    total: number;
    success: number;
    duplicates: number;
    errors: number;
    details: string[];
  } | null>(null);
  
  // Single manual registration form
  const [showManualForm, setShowManualForm] = useState(false);
  const [mFullName, setMFullName] = useState("");
  const [mNationalId, setMNationalId] = useState("");
  const [mPhone, setMPhone] = useState("");
  const [mAge, setMAge] = useState(24);
  const [mGender, setMGender] = useState<"male" | "female">("male");
  const [mEducation, setMEducation] = useState("لیسانس");
  const [mOccupation, setMOccupation] = useState("آزاد");
  const [mCity, setMCity] = useState("تهران");
  const [mPriority, setMPriority] = useState<"normal" | "high" | "vip">("normal");
  const [mNotes, setMNotes] = useState("");

  const prevApplicantsLength = useRef<number>(0);

  // 1. Core Data fetcher
  const loadData = async () => {
    // If user selected simulated offline, skip API requests
    if (simulateOffline) {
      setOfflineRetryCount(prev => prev + 1);
      return;
    }

    try {
      const appRes = await fetch("/api/applicants");
      if (!appRes.ok) throw new Error("HTTP connection error");
      const appData = await appRes.json();
      
      // Filter out soft-deleted applicants
      const activeApps = appData.filter((a: any) => !a.deletedAt);
      
      // Sound cue if new applicants arrived
      if (prevApplicantsLength.current > 0 && activeApps.length > prevApplicantsLength.current) {
        if (!isMuted) {
          playBeep(alertVolume, 920, 0.25);
        }
      }
      prevApplicantsLength.current = activeApps.length;
      setApplicants(activeApps);

      const qRes = await fetch("/api/queue");
      if (qRes.ok) {
        const qData = await qRes.json();
        setQueue(qData);
      }
      setIsOnline(true);
    } catch (e) {
      console.warn("Failed to contact the backend platform server", e);
      setIsOnline(false);
    }
  };

  // Poll for data every 3 seconds (as requested: "بروزرسانی زنده با polling هر 3 ثانیه")
  useEffect(() => {
    if (!schedulerDate) {
      setSchedulerDate(getShamsiDateString());
    }
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [simulateOffline, isMuted, alertVolume, schedulerDate]);

  // Keep track of native navigator status
  useEffect(() => {
    const goOnline = () => { if (!simulateOffline) setIsOnline(true); };
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [simulateOffline]);

  // Custom visual toast system
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Keyboard Shortcuts dispatcher
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      // Avoid firing when writing in inputs
      if (
        document.activeElement?.tagName === "INPUT" || 
        document.activeElement?.tagName === "TEXTAREA" || 
        document.activeElement?.tagName === "SELECT"
      ) {
        if (e.key === "Escape") {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      if (e.key === "Escape") {
        setSelectedApp(null);
        setShowShortcutsHelp(false);
        setShowManualForm(false);
      } else if (e.key === " ") {
        e.preventDefault();
        // Custom hotkey: select the next applicant in line
        if (applicants.length > 0) {
          const currentIndex = selectedApp ? applicants.findIndex(a => a.id === selectedApp.id) : -1;
          const nextIndex = (currentIndex + 1) % applicants.length;
          openApplicantProfile(applicants[nextIndex]);
          triggerToast(`انتخاب پرونده بعدی: ${applicants[nextIndex].fullName}`);
        }
      } else if (e.key === "?") {
        setShowShortcutsHelp(true);
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [applicants, selectedApp]);

  // Draft Autosave loop (every 15 seconds for reactive drafts)
  useEffect(() => {
    if (!selectedApp) return;

    const saveDraftTimer = setInterval(() => {
      if (!opNotes.trim() && !aptDate && !aptTime) return;
      
      const draftObj = {
        opNotes,
        aptDate,
        aptTime,
        selectedCallResult,
        timestamp: Date.now()
      };
      
      localStorage.setItem(`fahm_contact_draft_${selectedApp.id}`, JSON.stringify(draftObj));
      setLastSavedDraftMessage(`پیش‌نویس ذخیره شد ✓ ${new Date().toLocaleTimeString("fa-IR")}`);
      
      setTimeout(() => {
        setLastSavedDraftMessage(null);
      }, 3000);
    }, 15000);

    return () => clearInterval(saveDraftTimer);
  }, [selectedApp, opNotes, aptDate, aptTime, selectedCallResult]);

  // 2. Draft recovery
  const loadDraftForApplicant = (appId: string) => {
    const stored = localStorage.getItem(`fahm_contact_draft_${appId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setOpNotes(parsed.opNotes || "");
        setAptDate(parsed.aptDate || "");
        setAptTime(parsed.aptTime || "");
        setSelectedCallResult(parsed.selectedCallResult || "answered");
        triggerToast("پیش‌نویس ذخیره شده بازیابی شد 💾");
      } catch (err) {
        console.error(err);
      }
    }
  };

  const clearDraftForApplicant = (appId: string) => {
    localStorage.removeItem(`fahm_contact_draft_${appId}`);
    setOpNotes("");
    setAptDate("");
    setAptTime("");
    setSelectedCallResult("answered");
    triggerToast("پیش‌نویس مراجع پاک گردید 🧹");
  };

  // Convert Gregorian JS Date instance or text into Jalali solar string
  const getShamsiDateString = (date = new Date()) => {
    const gy = date.getFullYear();
    const gm = date.getMonth() + 1;
    const gd = date.getDate();
    
    // Simple but reliable mathematical conversion formula
    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 335];
    let jy: number, jm: number, jd: number;
    let gy2 = (gm > 2) ? (gy + 1) : gy;
    let g_day_no = 365 * (gy - 1600) + Math.floor((gy2 - 1600) / 4) - Math.floor((gy2 - 1600) / 100) + Math.floor((gy2 - 1600) / 400) + gd + g_d_m[gm - 1] - 1;
    let j_day_no = g_day_no - 79;
    let j_np = Math.floor(j_day_no / 12053);
    j_day_no %= 12053;
    jy = 979 + 33 * j_np + 4 * Math.floor(j_day_no / 1461);
    j_day_no %= 1461;
    if (j_day_no >= 366) {
      jy += Math.floor((j_day_no - 1) / 365);
      j_day_no = (j_day_no - 1) % 365;
    }
    for (let i = 0; i < 11 && j_day_no >= [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29][i]; i++) {
      j_day_no -= [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29][i];
    }
    jm = 1;
    while (j_day_no >= (jm <= 6 ? 31 : 30)) {
      j_day_no -= jm <= 6 ? 31 : 30;
      jm++;
    }
    jd = j_day_no + 1;
    return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
  };

  // Handlers for interactive calendar slot updates
  const setTodayDate = () => {
    setAptDate(getShamsiDateString());
  };

  const setTomorrowDate = () => {
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    setAptDate(getShamsiDateString(tmr));
  };

  // Visual Scheduler Hourly Slots configuration configuration
  const SHIFTS = [
    { id: "slot1", label: "اسلات اول: صبح (۰۹:۰۰ - ۱۱:۰۰)", defaultTime: "09:00" },
    { id: "slot2", label: "اسلات دوم: ظهر (۱۱:۰۰ - ۱۳:۰۰)", defaultTime: "11:00" },
    { id: "slot3", label: "اسلات سوم: بعدازظهر (۱۴:۰۰ - ۱۶:۰۰)", defaultTime: "14:00" },
    { id: "slot4", label: "اسلات چهارم: عصر (۱۶:۰۰ - ۱۸:۰۰)", defaultTime: "16:00" }
  ];

  const getAppointmentDate = (app: Applicant) => {
    const qItem = queue.find(q => q.applicantId === app.id);
    return qItem?.applicant?.appointmentDate || "";
  };

  const getAppointmentTime = (app: Applicant) => {
    const qItem = queue.find(q => q.applicantId === app.id);
    return qItem?.applicant?.appointmentTime || "";
  };

  const getSlotIdForTime = (time: string): string => {
    if (!time) return "";
    const [hourStr] = time.split(":");
    const h = parseInt(hourStr) || 9;
    if (h >= 9 && h < 11) return "slot1";
    if (h >= 11 && h < 14) return "slot2";
    if (h >= 14 && h < 16) return "slot3";
    if (h >= 16) return "slot4";
    return "slot4";
  };

  const handleMoveApplicantSlot = async (appId: string, defaultTime: string) => {
    try {
      const res = await fetch(`/api/applicants/${appId}/update-appointment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentDate: schedulerDate || getShamsiDateString(),
          appointmentTime: defaultTime
        })
      });
      if (res.ok) {
        triggerToast("نوبت مراجع با موفقیت منتقل و تغییر یافت! 🔄");
        // Update local state directly so it's instantly reflected
        setApplicants(prev => prev.map(a => {
          if (a.id === appId) {
            return { ...a, status: ApplicantStatus.SCHEDULED };
          }
          return a;
        }));
        setQueue(prev => prev.map(q => {
          if (q.applicantId === appId) {
            return {
              ...q,
              applicant: {
                ...q.applicant,
                appointmentDate: schedulerDate || getShamsiDateString(),
                appointmentTime: defaultTime
              }
            };
          }
          return q;
        }));
        if (!isMuted) {
          playBeep(alertVolume, 700, 0.2);
        }
        loadData();
      } else {
        triggerToast("خطا در جابه‌جایی نوبت مراجع.");
      }
    } catch (err) {
      console.error(err);
      triggerToast("خطا در ارتباط با سرور صف نوبت‌ها.");
    }
  };

  // Digiform Excel Parser (Indexed column mappings with Farsi string cleaners parsing as requested)
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress(10);
    setImportStats(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        setImportProgress(35);
        const wb = XLSX.read(bstr, { type: "binary" });
        setImportProgress(60);
        
        // Match sheet by Farsi name "Digiform" or fall back to first index
        const wsname = wb.SheetNames.find(name => name.toLowerCase().includes("digiform")) || wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Parse rows as raw subarrays to map exact index positions precisely
        const rawRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
        setImportProgress(80);

        if (rawRows.length <= 1) {
          throw new Error("صفحه گسترده حاوی سطر داده معتبر برای درون‌ریزی نیست.");
        }

        // Success statistics trackers
        let parsedCount = 0;
        let duplicateCount = 0;
        let errorRowsCount = 0;
        const errDetails: string[] = [];
        const validApplicants: any[] = [];

        // Loop rows (row 0 is header row, row 1 is start of data)
        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;

          // Column mappings by precise Excel Indices positions:
          // 0 -> Name full_name
          // 1 -> birth_date_jalali (Jalali Birth Year/Date)
          // 2 -> gender ('مرد' or 'زن')
          // 3 -> phone_1
          // 4 -> phone_2 (secondary/emergency digits)
          // 5 -> education_level
          // 6 -> school_university
          // 7 -> interest_label (خیلی زیاد / زیاد / متوسط / کم / خیلی کم)
          // 8 -> has_experience (بله / خیر)
          // 9 -> experience_description
          // 10 -> digiform_code (Unique Digiform tracing code e.g. TL9095JMZP8907)
          // 11 -> registered_at
          // 12 -> accepted_at
          // 13 -> registration_status

          const fullName = String(row[0] || "").trim();
          const birthDateJalali = String(row[1] || "").trim();
          const rawGender = String(row[2] || "").trim();
          const phone1 = String(row[3] || "").trim();
          const phone2 = String(row[4] || "").trim();
          const education = String(row[5] || "").trim();
          const university = String(row[6] || "").trim();
          const interestLabel = String(row[7] || "").trim();
          const hasExpStr = String(row[8] || "").trim();
          const expDesc = String(row[9] || "").trim();
          const digiformCode = String(row[10] || "").trim();

          if (!fullName || !phone1) {
            errorRowsCount++;
            errDetails.push(`ردیف ${i + 1}: نام کامل یا شماره تماس اجباری خام است.`);
            continue;
          }

          // Calculate age dynamically from Shamsh year (Standard fallback current 1405 date)
          let calculatedAge = 24;
          if (birthDateJalali) {
            const birthYearMatch = birthDateJalali.match(/\b(13\d\d)\b/);
            if (birthYearMatch) {
              const birthYear = parseInt(birthYearMatch[1]);
              calculatedAge = 1405 - birthYear;
              if (calculatedAge <= 0 || calculatedAge > 100) calculatedAge = 24;
            }
          }

          // Convert gender
          const normalizedGender = rawGender === "زن" || rawGender.toLowerCase() === "female" ? "female" : "male";

          // Calculate interest level rating (1 to 5)
          let mappedInterest = 3;
          if (interestLabel.includes("خیلی زیاد")) mappedInterest = 5;
          else if (interestLabel.includes("زیاد")) mappedInterest = 4;
          else if (interestLabel.includes("متوسط")) mappedInterest = 3;
          else if (interestLabel.includes("خیلی کم")) mappedInterest = 1;
          else if (interestLabel.includes("کم")) mappedInterest = 2;

          // Mapping prior experience Boolean flag
          const hasExperienceFlag = hasExpStr.includes("بله") || hasExpStr.toLowerCase() === "true" || hasExpStr === "1" ? 1 : 0;

          // Deduplicate based on unique Digiform Tracking Code or Phone numbers
          const isDup = applicants.some(a => a.digiformSubmissionId === digiformCode || (digiformCode && a.digiformSubmissionId === digiformCode));
          if (isDup) {
            duplicateCount++;
            continue;
          }

          // Map model securely
          const mappedAppObj = {
            fullName,
            nationalId: digiformCode || `digi-${phone1.slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`, // avoid empty National ID validation crash
            phone: phone1,
            age: calculatedAge,
            gender: normalizedGender,
            educationLevel: education || "نامشخص",
            occupation: university || "آزاد",
            city: "تهران",
            digiformSubmissionId: digiformCode || `digi-import-${Date.now()}`,
            notesGeneral: expDesc ? `[سابقه قبلی دیجی‌فرم]: ${expDesc}` : `سطح علاقه: ${interestLabel}. فاقد سابقه فعالیت قبلی.`
          };

          validApplicants.push(mappedAppObj);
          parsedCount++;
        }

        setImportProgress(90);

        if (validApplicants.length === 0) {
          setIsImporting(false);
          setImportStats({
            total: rawRows.length - 1,
            success: 0,
            duplicates: duplicateCount,
            errors: errorRowsCount,
            details: [...errDetails, "هیچ متقاضی جدیدی برای درون‌ریزی وجود نداشت."]
          });
          return;
        }

        // Post validated applicant list directly back to Express backend db
        const res = await fetch("/api/applicants/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicants: validApplicants,
            actorId: user.id,
            actorName: user.fullName
          })
        });

        const outcome = await res.json();
        
        if (res.ok) {
          setImportStats({
            total: rawRows.length - 1,
            success: outcome.count || validApplicants.length,
            duplicates: duplicateCount + (outcome.duplicates || 0),
            errors: errorRowsCount,
            details: errDetails
          });
          
          if (!isMuted) {
            playBeep(alertVolume, 1020, 0.4);
          }
          triggerToast("درون‌ریزی فایل اکسل دیجی‌فرم با موفقیت ثبت شد ✅");
          loadData();
        } else {
          setImportProgress(0);
          throw new Error(outcome.error || "سرور درخواست درون‌ریزی را قبول نکرد.");
        }

      } catch (err: any) {
        setImportStats(prev => ({
          total: 0,
          success: 0,
          duplicates: 0,
          errors: 1,
          details: [`امکان مطالعه فرمت فایل وجود نداشت: ${err.message}`]
        }));
      } finally {
        setIsImporting(false);
        setImportProgress(100);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!mFullName.trim() || !mNationalId.trim() || !mPhone.trim()) {
        triggerToast("پر کردن نام، کدملی و شماره تماس معتبر الزامی است ⚠️");
        return;
      }

      const res = await fetch("/api/applicants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant: {
            fullName: mFullName,
            nationalId: mNationalId,
            phone: mPhone,
            age: mAge,
            gender: mGender,
            educationLevel: mEducation,
            occupation: mOccupation,
            city: mCity,
            priority: mPriority,
            notesGeneral: mNotes
          },
          actorId: user.id,
          actorName: user.fullName
        })
      });

      if (res.ok) {
        setMFullName("");
        setMNationalId("");
        setMPhone("");
        setMNotes("");
        setShowManualForm(false);
        triggerToast(`متقاضی جدید ${mFullName} ثبت و نوبت‌دهی اولیه گردید.`);
        loadData();
      } else {
        const d = await res.json();
        triggerToast(d.error || "خطایی در ثبت مراجع جدید رخ داد.");
      }
    } catch (er) {
      console.error(er);
    }
  };

  const openApplicantProfile = async (app: Applicant) => {
    setSelectedApp(app);
    // Reset specific states
    setOpNotes("");
    setAptDate("");
    setAptTime("");
    setSelectedCallResult("answered");
    setAiResult(null);
    setCallHistory([]);
    
    // Check if a local draft exists for this applicant
    loadDraftForApplicant(app.id);

    // Fetch call history logs
    try {
      const res = await fetch(`/api/applicants/${app.id}/timeline`);
      const d = await res.json();
      setCallHistory(d.contacts || []);
      
      if (d.contacts && d.contacts.length > 0) {
        const last = d.contacts[d.contacts.length - 1];
        if (last.aiAnalysis) {
          try {
            setAiResult(JSON.parse(last.aiAnalysis));
          } catch (pe) {
            console.warn("JSON parse on AI analysis failed", pe);
          }
        }
        // Prefill from matching database record if draft didn't populate it
        setAptDate(prev => prev || last.appointmentDate || "");
        setAptTime(prev => prev || last.appointmentTime || "");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteApplicantFromFahm = async (id: string, name: string) => {
    if (!window.confirm(`آیا از حذف پرونده مراجع ${name} از کل چرخه‌های سیستم اطمینان کامل دارید؟`)) {
      return;
    }

    try {
      const res = await fetch("/api/applicants/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          actorId: user.id,
          actorName: user.fullName
        })
      });

      if (res.ok) {
        triggerToast(`متقاضی ${name} با موفقیت آرشیو گردید.`);
        setSelectedApp(null);
        loadData();
      } else {
        triggerToast("حذف پرونده صورت نپذیرفت.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const triggerAutoTag = async (appId: string) => {
    triggerToast("در حال موازنه و پردازش تگ‌های مراجع با جمینی... 🤖");
    window.dispatchEvent(new CustomEvent("gemini-active-start"));
    try {
      const res = await fetch(`/api/applicants/${appId}/auto-tag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast("پرونده با تگ‌های کیفی زنده پیوست گردید! 🪄");
        loadData();
        
        if (selectedApp?.id === appId) {
          setSelectedApp(prev => prev ? { ...prev, ...data.applicant } : prev);
          if (data.applicant.aiAnalysis) {
            setAiResult(JSON.parse(data.applicant.aiAnalysis));
          }
        }
      } else {
        triggerToast(data.error || "تگ‌گذاری هوشمند انجام نشد.");
      }
    } catch (e) {
      console.error(e);
      triggerToast("خطا در بهینه‌سازی ارتباط تگ‌گذاری با دیتابیس.");
    } finally {
      window.dispatchEvent(new CustomEvent("gemini-active-end"));
    }
  };

  // Triggers call log save and transitions the step
  const executeContactTransition = async (sendToWaitingRoom: boolean) => {
    if (!selectedApp) return;
    if (!opNotes.trim()) {
      triggerToast("لطفاً شرح یا یادداشت مکالمه صورت گرفته را ابتدا یادداشت نمائید! (حداقل ۵۰ کاراکتر)");
      return;
    }

    setLoadingAi(true);
    try {
      const payload = {
        appointmentDate: aptDate,
        appointmentTime: aptTime,
        callResult: selectedCallResult
      };

      const res = await fetch("/api/queue/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantId: selectedApp.id,
          currentStage: QueueStage.CONTACT,
          nextStage: sendToWaitingRoom ? QueueStage.WAITING_1 : QueueStage.CONTACT,
          operatorId: user.id,
          operatorNotes: `${opNotes} [نتیجه تماس: ${selectedCallResult}]`,
          payload
        })
      });

      const d = await res.json();
      if (res.ok) {
        setAiResult(d.aiAnalysis);
        
        // Remove locally cached draft
        localStorage.removeItem(`fahm_contact_draft_${selectedApp.id}`);
        
        // Refetch timeline
        const timelineRes = await fetch(`/api/applicants/${selectedApp.id}/timeline`);
        const tObj = await timelineRes.json();
        setCallHistory(tObj.contacts || []);

        triggerToast(sendToWaitingRoom ? "نوبت تثبیت گردید و با موفقیت به کارتابل پذیرش خانم زمانی ارسال شد ✅" : "مکالمه ذخیره و تحلیل هوش مصنوعی با موفقیت اعمال گردید 🤖");
        loadData();
      } else {
        alert(d.message || d.error || "خطا در برقراری با پایگاه فرعی داده.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAi(false);
    }
  };

  // Helper calculating booked slots of specific date & time to reflect capacity
  const getSlotCapacityDetails = (time: string) => {
    if (!aptDate) return { booked: 0, max: 4, label: "انتخاب تاریخ الزامی است" };
    // count
    const bookedCount = applicants.filter(a => {
      // Look in queue states matching scheduled or scheduled status
      const isScheduled = a.status === ApplicantStatus.SCHEDULED;
      const matchingDate = a.notesGeneral?.includes(aptDate) || a.notesGeneral?.includes(time);
      return isScheduled && matchingDate;
    }).length;

    const remaining = Math.max(0, 4 - bookedCount);
    let colorClass = "text-emerald-400";
    if (remaining === 0) colorClass = "text-rose-500 font-extrabold";
    else if (remaining === 1) colorClass = "text-amber-500 font-bold";

    return {
      booked: bookedCount,
      max: 4,
      remaining,
      colorClass,
      label: `ظرفیت اسلات: ${remaining} جای خالی از ۴`
    };
  };

  // Filter pipeline according to active status tabs
  const filteredApplicants = applicants.filter(app => {
    const qItem = queue.find(q => q.applicantId === app.id);
    const matchesStage = qItem ? qItem.currentStage === QueueStage.CONTACT : false;
    
    // Skip if doesn't match baseline Step-1 list
    if (!matchesStage) return false;

    // Search query matches (Names, phones, code, custom national ID check)
    const matchesSearch = 
      app.fullName.includes(search) || 
      app.phone.includes(search) || 
      app.nationalId.includes(search) ||
      (app.digiformSubmissionId && app.digiformSubmissionId.includes(search));

    if (!matchesSearch) return false;

    // Filter Tabs
    if (activeTab === "new") {
      // New / uncalled has no contact logs yet
      const logCount = callHistory.length; // wait, inline list has no callHistory fetched. Let's filter on status or custom tags
      const isNew = app.status === ApplicantStatus.PENDING_CONTACT && !app.notesGeneral?.includes("[تماس]");
      if (!isNew) return false;
    }
    else if (activeTab === "pending") {
      if (app.status !== ApplicantStatus.PENDING_CONTACT) return false;
    }
    else if (activeTab === "scheduled") {
      if (app.status !== ApplicantStatus.SCHEDULED) return false;
    }
    else if (activeTab === "no_answer") {
      const isNoAnswer = app.notesGeneral?.includes("جواب نداد") || app.notesGeneral?.includes("busy");
      if (!isNoAnswer) return false;
    }
    else if (activeTab === "callback") {
      const isCallback = app.notesGeneral?.includes("مجدد") || app.notesGeneral?.includes("callback");
      if (!isCallback) return false;
    }

    // Advanced drop-down Filters
    if (filterGender !== "all" && app.gender !== filterGender) return false;
    if (filterEducation !== "all" && !app.educationLevel.includes(filterEducation)) return false;

    return true;
  });

  const totalItems = filteredApplicants.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedApplicants = filteredApplicants.slice(startIndex, endIndex);

  // Helper function to render AI labels elegantly with color options requested by user
  const renderAiTagBadges = (app: Applicant) => {
    const tags = (app as any).aiTags || [];
    const classification = (app as any).aiClassification || "";
    
    if (tags.length === 0 && !classification) {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            triggerAutoTag(app.id);
          }}
          className="inline-flex items-center gap-1 bg-purple-500/5 hover:bg-purple-500/15 text-purple-300 border border-purple-500/25 hover:border-purple-500/40 text-[9px] py-1 px-2 rounded-xl transition cursor-pointer font-bold"
          title="تحلیل کیفی و تگ‌گذاری خودکار مراجع با هوش مصنوعی"
        >
          <Sparkle size={8} className="animate-pulse text-purple-400" />
          <span>تگ‌گذاری خودکار هوشمند</span>
        </button>
      );
    }

    const getBadgeStyle = (tag: string) => {
      if (tag.includes("باانگیزه") || tag.includes("پرانرژی")) {
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      }
      if (tag.includes("پیگیری فوری") || tag.includes("فوری") || tag.includes("بحرانی")) {
        return "bg-rose-500/15 text-rose-400 border-rose-500/30 font-bold animate-pulse";
      }
      if (tag.includes("تردید") || tag.includes("مردد") || tag.includes("پیگیری")) {
        return "bg-amber-500/15 text-amber-400 border-amber-500/30 font-semibold";
      }
      if (tag.includes("پیشرفته") || tag.includes("قوی") || tag.includes("بسیار مناسب")) {
        return "bg-purple-500/15 text-purple-400 border-purple-500/30 font-bold";
      }
      return "bg-slate-800 text-slate-300 border-slate-700/60";
    };

    return (
      <div className="flex flex-col items-center justify-center gap-1">
        {classification && (
          <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 shrink-0 whitespace-nowrap">
            <Sparkles size={8} className="animate-pulse" />
            {classification}
          </span>
        )}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center max-w-[180px]">
            {tags.map((tag: string, idx: number) => (
              <span key={idx} className={`text-[8.5px] px-1.5 py-0.2 rounded font-sans border ${getBadgeStyle(tag)}`}>
                #{tag}
              </span>
            ))}
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerAutoTag(app.id);
              }}
              className="text-slate-500 hover:text-purple-300 duration-200 text-[8px] self-center ml-1 cursor-pointer font-black"
              title="به‌روزرسانی تگ با جمینی"
            >
              ↻
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render colored pill badge for status
  const renderStatusBadge = (status: ApplicantStatus, notes: string = "") => {
    switch (status) {
      case ApplicantStatus.PENDING_CONTACT:
        if (notes.includes("جواب نداد")) {
          return <span className="px-2 py-1 rounded-full text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">🟠 جواب نداد</span>;
        }
        if (notes.includes("مجدد")) {
          return <span className="px-2 py-1 rounded-full text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20">🟣 تماس مجدد</span>;
        }
        return <span className="px-2 py-1 rounded-full text-[10px] bg-blue-500/10 text-brand-primary border border-brand-primary/20">🔵 جدید</span>;
      case ApplicantStatus.SCHEDULED:
        return <span className="px-2 py-1 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">✅ وقت تنظیم شد</span>;
      case ApplicantStatus.ARRIVED:
        return <span className="px-2 py-1 rounded-full text-[10px] bg-teal-500/10 text-teal-400 border border-teal-500/20">🟢 حاضر در سالن</span>;
      case ApplicantStatus.NO_SHOW:
        return <span className="px-2 py-1 rounded-full text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20">🔴 غایب</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-[10px] bg-slate-500/10 text-slate-400 border border-slate-500/20">متقاضی</span>;
    }
  };

  // Render Gold Stars for interest levels
  const renderInterestStars = (notes: string = "") => {
    let starCount = 3;
    if (notes.includes("خیلی زیاد")) starCount = 5;
    else if (notes.includes("زیاد")) starCount = 4;
    else if (notes.includes("متوسط")) starCount = 3;
    else if (notes.includes("خیلی کم")) starCount = 1;
    else if (notes.includes("کم")) starCount = 2;

    return (
      <div className="flex items-center gap-0.5 justify-end">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star 
            key={s} 
            size={11} 
            className={s <= starCount ? "text-amber-400 fill-amber-400" : "text-slate-700"} 
          />
        ))}
      </div>
    );
  };

  return (
    <div id="contact-panel-root" className="space-y-6 text-right select-none animate-fade-in relative">
      
      {/* Floating Network Offline Simulation Warn system */}
      {(!isOnline || simulateOffline) && (
        <div className="fixed top-4 left-4 right-4 z-50 glass-panel-heavy border-rose-500/30 text-rose-400 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-2xl animate-shake">
          <div className="flex items-center gap-3">
            <ShieldAlert className="text-rose-500 shrink-0" size={24} />
            <div>
              <p className="text-sm font-black">پلتفرم سنجش فهم در وضعیت بدون شبکه (آفلاین) قرار گرفت!</p>
              <p className="text-[11px] text-slate-400 mt-0.5">کش موقت ایمن فورا راه‌اندازی گردید. تعداد تلاشهای موازنه مجدد به پایگاه مرکزی: {offlineRetryCount} بار صادر شده.</p>
            </div>
          </div>
          <button 
            onClick={() => {
              setSimulateOffline(false);
              setIsOnline(true);
              setOfflineRetryCount(0);
              loadData();
              triggerToast("اتصال شبکه با موفقیت بازسازی شد 🌐");
            }}
            className="px-4 py-1.5 bg-rose-500 text-white rounded-lg text-xs font-black hover:bg-rose-400 active:scale-95 transition cursor-pointer"
          >
            اتصال مجدد دستی سیستم به شبکه
          </button>
        </div>
      )}

      {/* Elegant Custom Toast HUD */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-40 glass-panel border-brand-primary/30 p-3 rounded-xl text-xs flex items-center gap-2 text-brand-primary shadow-xl shadow-brand-primary/5 animate-slide-up">
          <CheckCircle2 size={14} className="text-brand-primary shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Keyboard Shortcut Cheat-Sheet modal */}
      {showShortcutsHelp && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel-heavy p-6 max-w-sm w-full rounded-2xl border border-white/10 space-y-4 text-right">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <button onClick={() => setShowShortcutsHelp(false)} className="text-slate-400 hover:text-white"><X size={16} /></button>
              <h3 className="font-extrabold text-sm text-brand-primary flex items-center gap-1.5">
                <HelpCircle size={16} /> Keyboard Shortcuts کلیدهای میانبر سریع
              </h3>
            </div>
            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                <span className="bg-slate-950 px-2 py-1 rounded font-mono border border-white/10 text-white">Space</span>
                <span>انتخاب پرونده بعدی مراجع صوتی</span>
              </div>
              <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                <span className="bg-slate-950 px-2 py-1 rounded font-mono border border-white/10 text-white">Esc</span>
                <span>بستن پنجره‌های باز و خروج</span>
              </div>
              <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                <span className="bg-slate-950 px-2 py-1 rounded font-mono border border-white/10 text-white">?</span>
                <span>نمایش این راهنما</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 text-center">انستیتو سخن‌سنجی و تربیت کلامی هدهد</p>
          </div>
        </div>
      )}

      {/* Main Admin / Status Sub Header bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/3 p-4 rounded-xl border border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-primary/10 rounded-xl text-brand-primary">
            <Phone size={18} />
          </div>
          <div>
            <span className="text-[10px] text-brand-primary block font-mono font-bold uppercase tracking-widest">مؤسسه هدهد • کارتابل همکاران</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs font-black text-slate-100">کارابر فعال: {user.fullName}</span>
              <span className="text-[10px] text-slate-500">({user.role === "ADMIN" ? "مدیر کل" : "اپراتور تماس"})</span>
            </div>
          </div>
        </div>

        {/* Dynamic status utilities */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          
          {/* Shortcuts helpful button */}
          <button 
            onClick={() => setShowShortcutsHelp(true)}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-400 hover:text-white transition flex items-center gap-1 cursor-pointer"
            title="کلیدهای میانبر"
          >
            <HelpCircle size={14} />
            <span className="text-[10px] hidden sm:inline">کلیدها (?)</span>
          </button>

          {/* Sound Mute/Volume controls */}
          <div className="flex items-center gap-1.5 bg-slate-950/40 p-1.5 rounded-xl border border-white/5">
            <button 
              onClick={() => {
                setIsMuted(!isMuted);
                triggerToast(isMuted ? "صدا هشدارهای کارتابل فعال گردید" : "هشدارهای صوتی بی‌صدا شدند");
              }}
              className="p-1 hover:text-white transition text-slate-400 cursor-pointer"
            >
              {isMuted ? <VolumeX size={14} className="text-rose-400" /> : <Volume2 size={14} className="text-emerald-400" />}
            </button>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.1" 
              value={alertVolume} 
              onChange={e => {
                setAlertVolume(parseFloat(e.target.value));
                playBeep(parseFloat(e.target.value), 440, 0.1);
              }}
              className="w-12 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-primary" 
              disabled={isMuted}
            />
          </div>

          {/* Connectedness indicator with Simulation toggle */}
          <button 
            onClick={() => {
              setSimulateOffline(!simulateOffline);
              if (!simulateOffline) {
                setIsOnline(false);
                triggerToast("شبیه‌سازی ارتباط آفلاین سیستم فعال شد 🚨");
              } else {
                setIsOnline(true);
                setOfflineRetryCount(0);
                triggerToast("سیستم به صورت نرمال سینک شد");
                loadData();
              }
            }}
            className="px-3 py-1.5 bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 rounded-xl text-xs transition flex items-center gap-1.5 active:scale-95 cursor-pointer text-slate-350"
          >
            <span className={`w-2 h-2 rounded-full ${simulateOffline ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'} inline-block`}></span>
            <span>{simulateOffline ? "آفلاین شبیه‌سازی‌شده" : "وضعیت آنلاین سیستم"}</span>
          </button>

          {/* Manual reload widget */}
          <button 
            onClick={() => {
              loadData();
              playBeep(0.2, 700, 0.1);
              triggerToast("لیست انتظار مراجعین همگام شد 🔄");
            }}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 text-brand-primary rounded-xl cursor-pointer"
          >
            <RefreshCw size={13} />
          </button>

        </div>
      </div>

      {/* Interactive Main Board Header with Import Utilities */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h1 className="text-lg font-black text-white flex items-center gap-2 brand-glow">
            <FileSpreadsheet className="text-brand-primary ml-1" size={20} />
            پنل اپراتور تماس و نوبت‌دهی (مرحله ۱)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            ورود ایمن اکسل‌های دیجی‌فرم، فیلترینگ هوشمند، مانیتورینگ آنلاین صف مراجعان و ثبت و انتقال مراجع در انستیتو هدهد
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
          {/* Quick Scheduler link */}
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent("switch-tab", { detail: "appointments" }));
              triggerToast("افتتاح سیستم نوبت‌دهی هوشمند 🗓️");
            }}
            className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 hover:border-emerald-500/45 text-emerald-400 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 cursor-pointer ml-1"
          >
            <CalendarRange size={14} />
            <span>مدیریت هوشمند نوبت‌ها (Drag & Drop)</span>
          </button>

          {/* Manual Register Trigger */}
          <button
            onClick={() => setShowManualForm(!showManualForm)}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/15 text-brand-primary rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 cursor-pointer ml-1"
          >
            <UserPlus size={14} />
            ثبت پرونده منفرد جدید
          </button>

          {/* Gorgeous Dotted Drag & Drop Excel Trigger */}
          <label className="px-4 py-2.5 btn-primary glow-on-hover rounded-xl text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 active:scale-95 relative overflow-hidden">
            {isImporting ? <RefreshCw className="animate-spin ml-1" size={14} /> : <Upload className="ml-1" size={14} />}
            <span>ورود دسته‌جمعی از اکسل دیجی‌فرم</span>
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={handleExcelUpload} 
              className="hidden" 
              disabled={isImporting}
            />
          </label>
        </div>
      </div>

      {/* Manual Creation Form Popover */}
      {showManualForm && (
        <form onSubmit={handleManualCreate} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 animate-slide-up text-right">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <button onClick={() => setShowManualForm(false)} className="text-slate-400 hover:text-white"><X size={15} /></button>
            <h3 className="text-sm font-black text-slate-200 flex items-center gap-1">
              <UserPlus size={15} className="text-brand-primary" /> فرم ثبت نام مراجع جدید انستیتو هدهد
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">نام و نام خانوادگی</label>
              <input required placeholder="علی احمدی" value={mFullName} onChange={e => setMFullName(e.target.value)} className="w-full px-3 py-2 glass-input text-xs text-right" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">کد ملی (۱۰ رقم)</label>
              <input required placeholder="1234567890" value={mNationalId} onChange={e => setMNationalId(e.target.value)} className="w-full px-3 py-2 glass-input text-xs font-mono text-center" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">شماره تماس اصلی</label>
              <input required placeholder="09123456789" value={mPhone} onChange={e => setMPhone(e.target.value)} className="w-full px-3 py-2 glass-input text-xs font-mono text-center" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">سن متقاضی (سال)</label>
              <input placeholder="24" type="number" value={mAge} onChange={e => setMAge(Number(e.target.value))} className="w-full px-3 py-2 glass-input text-xs text-center" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">جنسیت مراجع</label>
              <select value={mGender} onChange={e => setMGender(e.target.value as any)} className="w-full px-3 py-2 glass-input text-xs text-right">
                <option value="male">👨 مرد</option>
                <option value="female">👩 زن</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">مقطع تحصیلی</label>
              <input placeholder="لیسانس" value={mEducation} onChange={e => setMEducation(e.target.value)} className="w-full px-3 py-2 glass-input text-xs text-right" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">شغل تجاری</label>
              <input placeholder="کارمند" value={mOccupation} onChange={e => setMOccupation(e.target.value)} className="w-full px-3 py-2 glass-input text-xs text-right" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">اولویت پرونده</label>
              <select value={mPriority} onChange={e => setMPriority(e.target.value as any)} className="w-full px-3 py-2 glass-input text-xs text-right">
                <option value="normal">عادی (Normal)</option>
                <option value="high">📌 بالا (High Priority)</option>
                <option value="vip">⭐ ویژه (VIP)</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">شهر محل سکونت</label>
              <input placeholder="تهران" value={mCity} onChange={e => setMCity(e.target.value)} className="w-full px-3 py-2 glass-input text-xs text-right" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">ملاحظات و سابقه فعالیت قبلی سخنوری مراجع</label>
              <input placeholder="دوره سخنوری مقدماتی رفته است..." value={mNotes} onChange={e => setMNotes(e.target.value)} className="w-full px-3 py-2 glass-input text-xs text-right" />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <button type="submit" className="px-6 py-2.5 btn-primary glow-on-hover rounded-xl text-xs select-none cursor-pointer font-bold">
              تایید و افزودن به لیست صف مراجعین
            </button>
          </div>
        </form>
      )}

      {/* Live Excel Import Statistics feedback system */}
      {isImporting && (
        <div className="glass-panel p-4 rounded-xl border border-brand-primary/20 space-y-2 animate-pulse">
          <div className="flex justify-between items-center text-xs">
            <span className="text-brand-primary font-bold">{importProgress}% در حال درون‌ریزی اکسل...</span>
            <span className="text-slate-400">لطفاً شکیبا باشید</span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-brand-primary transition-all duration-300" style={{ width: `${importProgress}%` }}></div>
          </div>
        </div>
      )}

      {importStats && (
        <div className="glass-panel p-4 rounded-xl border border-slate-800 text-xs space-y-3 animate-slide-up">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <button onClick={() => setImportStats(null)} className="text-slate-500 hover:text-white"><X size={14} /></button>
            <span className="font-extrabold text-slate-200 flex items-center gap-1"><CheckCircle2 className="text-emerald-400" size={14} /> دستاورد درون‌ریزی اکسل دیجی‌فرم</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="bg-slate-900/40 p-2.5 rounded-lg border border-white/5">
              <span className="text-[10px] text-slate-500 block">کل پرونده‌ها</span>
              <span className="text-sm font-bold text-slate-100">{importStats.total} ردیف</span>
            </div>
            <div className="bg-slate-900/40 p-2.5 rounded-lg border border-white/5">
              <span className="text-[10px] text-slate-500 block">ثبت موفق جدید</span>
              <span className="text-sm font-bold text-emerald-400">{importStats.success} مراجع</span>
            </div>
            <div className="bg-slate-900/40 p-2.5 rounded-lg border border-white/5">
              <span className="text-[10px] text-slate-500 block">کدملی‌های تکراری</span>
              <span className="text-sm font-bold text-amber-500">{importStats.duplicates} مورد</span>
            </div>
            <div className="bg-slate-900/40 p-2.5 rounded-lg border border-white/5">
              <span className="text-[10px] text-slate-500 block">سطر‌های ناقص/خطا</span>
              <span className="text-sm font-bold text-rose-500">{importStats.errors} ردیف</span>
            </div>
          </div>

          {importStats.details.length > 0 && (
            <div className="bg-slate-950 p-2 rounded-lg border border-white/5 max-h-20 overflow-y-auto space-y-1 font-mono text-[10px] text-rose-300">
              {importStats.details.map((d, ind) => <p key={ind}>• {d}</p>)}
            </div>
          )}
        </div>
      )}

      {/* Main Panel section layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Paginated List table & Tab selectors */}
        <div className="lg:col-span-7 space-y-4">
          
          <div className="glass-panel p-4 rounded-2xl space-y-4">
            {/* Quick Filter tabs with dynamic counts */}
            <div className="flex flex-wrap gap-2 border-b border-white/5 pb-3">
              <button 
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold select-none cursor-pointer transition flex items-center gap-1 ${activeTab === "all" ? 'bg-brand-primary text-white font-extrabold shadow-sm' : 'bg-white/5 text-slate-450 hover:bg-white/10'}`}
              >
                👥 همه ({applicants.length})
              </button>
              <button 
                onClick={() => setActiveTab("new")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold select-none cursor-pointer transition flex items-center gap-1 ${activeTab === "new" ? 'bg-indigo-600 text-white font-extrabold shadow-sm' : 'bg-white/5 text-slate-450 hover:bg-white/10'}`}
              >
                ✨ جدید ({applicants.filter(a => a.status === ApplicantStatus.PENDING_CONTACT && !a.notesGeneral?.includes("[تماس]")).length})
              </button>
              <button 
                onClick={() => setActiveTab("pending")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold select-none cursor-pointer transition flex items-center gap-1 ${activeTab === "pending" ? 'bg-brand-primary text-white font-extrabold shadow-sm' : 'bg-white/5 text-slate-450 hover:bg-white/10'}`}
              >
                📞 باید تماس گرفته شوند ({applicants.filter(a => a.status === ApplicantStatus.PENDING_CONTACT).length})
              </button>
              <button 
                onClick={() => setActiveTab("no_answer")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold select-none cursor-pointer transition flex items-center gap-1 ${activeTab === "no_answer" ? 'bg-rose-600 text-white font-extrabold shadow-sm' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
              >
                ❌ بی‌پاسخ ({applicants.filter(a => a.notesGeneral?.includes("جواب نداد") || a.notesGeneral?.includes("busy")).length})
              </button>
              <button 
                onClick={() => setActiveTab("callback")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold select-none cursor-pointer transition flex items-center gap-1 ${activeTab === "callback" ? 'bg-amber-600 text-white font-extrabold shadow-sm' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
              >
                🔁 تماس مجدد ({applicants.filter(a => a.notesGeneral?.includes("مجدد") || a.notesGeneral?.includes("callback")).length})
              </button>
              <button 
                onClick={() => setActiveTab("scheduled")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold select-none cursor-pointer transition flex items-center gap-1 ${activeTab === "scheduled" ? 'bg-emerald-600 text-white font-extrabold shadow-md scale-102 ring-2 ring-emerald-500/20' : 'bg-white/5 text-emerald-400 hover:bg-emerald-500/10'}`}
              >
                📅 نوبت‌دهی شده ({applicants.filter(a => a.status === ApplicantStatus.SCHEDULED).length})
              </button>
            </div>

            {/* Quick Inline Search Actions & Sort modifiers */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="relative w-full sm:max-w-xs">
                <Search size={14} className="absolute left-3 top-3 text-slate-600 animate-pulse" />
                <input 
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="جستجوی مراجع با نام، موبایل، کدپیگیری..."
                  className="w-full pl-8 pr-3 py-2 glass-input text-xs text-right placeholder:text-slate-500"
                />
              </div>

              {/* View layout toggle & Advanced popover trigger */}
              <div className="flex items-center gap-2 justify-end w-full sm:w-auto">
                <button 
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`px-3 py-2 border rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${showAdvancedFilters ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}
                >
                  <Activity size={12} />
                  فیلترهای پیشرفته
                </button>

                <div className="bg-white/5 p-1 rounded-xl border border-white/5 flex gap-1">
                  <button onClick={() => setLayoutMode("table")} className={`p-1.5 rounded-lg transition ${layoutMode === "table" ? 'bg-brand-primary text-white' : 'text-slate-500 hover:text-white'}`} title="نمایش کارتابل فشرده"><List size={14} /></button>
                  <button onClick={() => setLayoutMode("grid")} className={`p-1.5 rounded-lg transition ${layoutMode === "grid" ? 'bg-brand-primary text-white' : 'text-slate-500 hover:text-white'}`} title="نمایش بورد پورتفولیو مراجع"><Grid size={14} /></button>
                </div>
              </div>
            </div>

            {/* Dropdown containing advanced filters layout */}
            {showAdvancedFilters && (
              <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs animate-slide-up">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">فیلتر جنسیت</label>
                  <select value={filterGender} onChange={e => setFilterGender(e.target.value as any)} className="w-full px-2.5 py-1.5 glass-input text-right">
                    <option value="all">همه جنسیت‌ها</option>
                    <option value="male">👨 آقایان</option>
                    <option value="female">👩 بانوان</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">فیلتر مقطع تحصیلی</label>
                  <select value={filterEducation} onChange={e => setFilterEducation(e.target.value)} className="w-full px-2.5 py-1.5 glass-input text-right">
                    <option value="all">همه مقاطع</option>
                    <option value="دیپلم">دیپلم</option>
                    <option value="لیسانس">کارشناسی (لیسانس)</option>
                    <option value="فوق">کاردانی یا فوق دیپلم</option>
                  </select>
                </div>
                {/* Clean filter triggers */}
                <div className="flex items-end justify-end">
                  <button 
                    onClick={() => {
                      setFilterGender("all");
                      setFilterEducation("all");
                      triggerToast("تنظیمات فیلتر بازنشانی شد 🧹");
                    }}
                    className="px-4 py-2 border border-slate-700 hover:border-slate-600 text-[10px] text-slate-400 hover:text-white rounded-lg transition duration-200"
                  >
                    پاکسازی همه فیلترها
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Compact Listing Views: Table Layout */}
          {layoutMode === "table" ? (
            <div className="glass-panel p-6 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-500 text-[11px]">
                      <th className="pb-3 pr-2">نام متقاضی در صف</th>
                      <th className="pb-3 text-center">مشخصات دموگرافیک</th>
                      <th className="pb-3 text-left font-mono">موبایل مستقیم</th>
                      <th className="pb-3 text-center">مستوى علاقه</th>
                      <th className="pb-3 text-center bg-purple-550/5">تگ‌های وضعیت AI</th>
                      <th className="pb-3 text-center">وضعیت پرونده</th>
                      <th className="pb-3">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/2">
                    {paginatedApplicants.map((app) => (
                      <tr 
                        key={app.id} 
                        className={`transition-all duration-155 hover:bg-white/3 ${selectedApp?.id === app.id ? "bg-brand-primary/5 border-r-2 border-brand-primary" : ""}`}
                      >
                        <td className="py-3.5 pr-2">
                          <div className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                            {app.fullName}
                            {app.notesGeneral?.includes("VIP") && <span className="bg-amber-400 text-slate-950 font-black text-[9px] px-1 rounded">VIP</span>}
                          </div>
                          {!app.notesGeneral?.includes("[تماس]") && app.status === ApplicantStatus.PENDING_CONTACT && (
                            <span className="inline-block mt-1 text-[8px] bg-blue-500/10 text-brand-primary px-1.5 py-0.2 rounded-full font-bold">● تماس نگرفته</span>
                          )}
                          {app.notesGeneral?.includes("[تماس]") && (
                            <span className="inline-block mt-1 text-[8px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded-full font-medium">تماس گرفته شده</span>
                          )}
                        </td>
                        <td className="py-3.5 text-center">
                          <span className="bg-slate-950/80 px-2 py-0.5 rounded text-[10px] font-mono text-slate-400">
                            {app.age} ساله / {app.city}
                          </span>
                        </td>
                        <td className="py-3.5 font-mono text-left select-all text-slate-400">
                          {app.phone}
                        </td>
                        <td className="py-3.5 text-center">
                          {renderInterestStars(app.notesGeneral)}
                        </td>
                        <td className="py-3.5 text-center bg-purple-550/2">
                          {renderAiTagBadges(app)}
                        </td>
                        <td className="py-3.5 text-center">
                          {renderStatusBadge(app.status, app.notesGeneral)}
                        </td>
                        <td className="py-3.5">
                          <button
                            onClick={() => openApplicantProfile(app)}
                            className={`px-3 py-1 border rounded-lg transition text-[10px] font-semibold cursor-pointer ${selectedApp?.id === app.id ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-400'}`}
                          >
                            بررسی و تماس
                          </button>
                        </td>
                      </tr>
                    ))}

                    {paginatedApplicants.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500 italic">
                          هیچ موردی مطابق فیلتر و جستجوی بالا یافت نشد.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            
            /* Bento Portfolio Visual Grid Layout (Viraasty style cards) */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {paginatedApplicants.map((app) => (
                <div 
                  key={app.id} 
                  onClick={() => openApplicantProfile(app)}
                  className={`glass-card-interactive p-5 rounded-2xl border cursor-pointer hover:scale-95 transition-all text-right space-y-4 ${selectedApp?.id === app.id ? 'border-brand-primary ring-1 ring-brand-primary/30 bg-brand-primary/5' : 'border-white/5'}`}
                >
                  <div className="flex justify-between items-start">
                    {renderStatusBadge(app.status, app.notesGeneral)}
                    <div>
                      <h3 className="font-bold text-slate-100 text-sm flex items-center gap-1.5 justify-end flex-wrap">
                        {(app as any).aiClassification && (
                          <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[8px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 whitespace-nowrap">
                            <Sparkles size={7} />
                            {(app as any).aiClassification}
                          </span>
                        )}
                        {app.notesGeneral?.includes("VIP") && <span className="bg-amber-400 text-slate-950 text-[9px] font-bold px-1 rounded">VIP</span>}
                        {app.fullName}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">شناسه: {app.id}</p>
                    </div>
                  </div>

                  {/* Qualitative Tags block */}
                  {(app as any).aiTags && ((app as any).aiTags as string[]).length > 0 ? (
                    <div className="flex flex-wrap gap-1 justify-end pt-1">
                      {((app as any).aiTags as string[]).map((tag: string, idx: number) => (
                        <span key={idx} className="bg-purple-500/5 text-purple-300 border border-purple-500/10 text-[9px] px-1.5 py-0.5 rounded-lg">
                          #{tag}
                        </span>
                      ))}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerAutoTag(app.id);
                        }}
                        className="text-[8px] text-slate-500 hover:text-purple-300 self-center transition ml-1 cursor-pointer font-bold"
                        title="بروزرسانی تگ ها"
                      >
                        ↻ بروزرسانی
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerAutoTag(app.id);
                        }}
                        className="flex items-center gap-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 hover:border-purple-500/40 text-[9px] py-1 px-2.5 rounded-lg transition"
                      >
                        <Sparkle size={8} />
                        <span>تگ‌گذاری خودکار هوشمند</span>
                      </button>
                    </div>
                  )}

                  <div className="text-xs text-slate-450 space-y-1 bg-slate-950/40 p-3 rounded-xl border border-white/2">
                    <p className="flex justify-between"><span>{app.age} ساله ({app.gender === "male" ? "آقا" : "خانم"})</span><span className="text-slate-500">مشخصات فرعی:</span></p>
                    <p className="flex justify-between"><span>{app.educationLevel}</span><span className="text-slate-500">تحصیلات:</span></p>
                    <p className="flex justify-between"><span className="text-brand-primary font-mono">{app.phone}</span><span className="text-slate-500">شماره مستقیم:</span></p>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button className="text-[10px] text-brand-primary font-bold flex items-center gap-0.5 hover:underline">
                      شروع ارزیابی و موازنه تماس <ChevronRight size={10} />
                    </button>
                    {renderInterestStars(app.notesGeneral)}
                  </div>
                </div>
              ))}

              {filteredApplicants.length === 0 && (
                <div className="col-span-1 sm:col-span-2 py-12 text-slate-500 text-center glass-panel rounded-2xl">
                  هیچ موردی موافق با انتخاب شما یافت نشد!
                </div>
              )}
            </div>
          )}

          {/* Elegant Pagination Footer */}
          {totalItems > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/3 p-4 rounded-xl border border-white/5 mt-4 text-xs font-sans text-right">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-400">تعداد نماینده در صفحه:</span>
                <select 
                  value={pageSize} 
                  onChange={(e) => {
                    const newSize = Number(e.target.value);
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-brand-primary"
                >
                  <option value={20}>۲۰ نفر در صفحه</option>
                  <option value={50}>۵۰ نفر در صفحه</option>
                  <option value={100}>۱۰۰ نفر در صفحه</option>
                </select>
                <span className="text-slate-500">
                  (نمایش ردیف‌های {startIndex + 1} تا {Math.min(endIndex, totalItems)} از کل {totalItems} متقاضی)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 disabled:opacity-30 transition select-none cursor-pointer"
                >
                  صفحه قبل ▶
                </button>

                <div className="flex items-center gap-1 font-mono">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                    // Helper limits displaying adjacent indices to keep spacing clean
                    if (pg === 1 || pg === totalPages || Math.abs(pg - currentPage) <= 1) {
                      return (
                        <button
                          key={pg}
                          onClick={() => setCurrentPage(pg)}
                          className={`w-7 h-7 rounded-md transition font-bold text-xs cursor-pointer select-none ${pg === currentPage ? 'bg-brand-primary text-white font-extrabold shadow-md' : 'bg-white/5 hover:bg-white/10 text-slate-400'}`}
                        >
                          {pg}
                        </button>
                      );
                    }
                    if (pg === 2 || pg === totalPages - 1) {
                      return <span key={pg} className="px-0.5 text-slate-600">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 disabled:opacity-30 transition select-none cursor-pointer"
                >
                  ◀ صفحه بعد
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Right Side Drawer / Modal: call actions & scheduling controls */}
        <div className="lg:col-span-5 h-full">
          {selectedApp ? (
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5 animate-slide-up sticky top-6">
              
              {/* Profile Card Header with inline Delete buttons */}
              <div className="flex justify-between items-start border-b border-white/5 pb-3">
                <div className="flex gap-2">
                  <button 
                    onClick={() => deleteApplicantFromFahm(selectedApp.id, selectedApp.fullName)}
                    className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-white/5 rounded-lg transition active:scale-95 cursor-pointer"
                    title="حذف کامل پرونده"
                  >
                    <Trash2 size={13} />
                  </button>
                  <button 
                    onClick={() => setSelectedApp(null)} 
                    className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-white/5 rounded-lg transition"
                  >
                    <X size={13} />
                  </button>
                </div>

                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    {selectedApp.fullName}
                    {selectedApp.notesGeneral?.includes("VIP") ? <span className="bg-amber-400 text-slate-900 text-[9px] px-1 font-extrabold rounded">VIP</span> : null}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">
                    کدملی: {selectedApp.nationalId} | شناسه: {selectedApp.id}
                  </p>
                </div>
              </div>

              {/* Informational Specs Matrix inside dark card */}
              <div className="bg-slate-950/40 p-3.5 rounded-xl border border-white/5 text-xs space-y-2">
                <div className="flex justify-between items-center text-[11px]">
                  <a 
                    href={`tel:${selectedApp.phone}`} 
                    className="font-mono text-brand-primary p-1 bg-white/5 rounded-lg hover:underline flex items-center gap-1.5 font-bold"
                  >
                    {selectedApp.phone}
                    <Copy size={11} className="text-slate-500 cursor-pointer" onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(selectedApp.phone); triggerToast(`تلفن همراه مراجع کپی گردید 📋`); }} />
                  </a>
                  <span className="text-slate-450">:شماره تماس مستقیم</span>
                </div>

                <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-white/2">
                  <span className="text-slate-200">
                    {selectedApp.age} سال ({selectedApp.gender === "male" ? "آقا" : "بانو"} - {selectedApp.occupation})
                  </span>
                  <span className="text-slate-500">:اطلاعات دموگرافیکی</span>
                </div>

                <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-white/2">
                  <span className="text-slate-200">{selectedApp.educationLevel}</span>
                  <span className="text-slate-500">:مدرک تحصیلی</span>
                </div>

                {selectedApp.notesGeneral && (
                  <div className="text-[10.5px] bg-white/2 p-2 rounded-lg text-slate-350 leading-relaxed text-right mt-1.5 border-r-2 border-slate-700">
                    <span className="text-slate-500 block text-[9px] mb-0.5">ملاحظات و علاقه مراجع:</span>
                    {selectedApp.notesGeneral}
                  </div>
                )}
              </div>

              {/* Immutable Call Attempts History Audit Log List */}
              <div className="space-y-2 text-right">
                <span className="text-[10px] font-bold text-slate-400 block flex items-center gap-1 justify-end">
                  <Clock size={11} /> سابقه ارزیابی و تلاشهای مکالمه صوتی ({callHistory.length} مورد ثبت شده)
                </span>
                
                <div className="max-h-24 overflow-y-auto space-y-1.5 rounded-xl">
                  {callHistory.map((cl, i) => (
                    <div key={cl.id ?? i} className="bg-slate-950/60 p-2.5 border border-white/5 rounded-lg text-[10px] space-y-1 text-right">
                      <div className="flex justify-between text-slate-500 font-mono">
                        <span>ساعت: {cl.appointmentTime || "--"} | تاریخ: {cl.appointmentDate || "--"}</span>
                        <span className="text-brand-primary">تلاش شماره {cl.contactAttemptNumber || (i + 1)}</span>
                      </div>
                      <p className="text-slate-300 truncate max-w-full">گزارش: {cl.operatorNotes}</p>
                    </div>
                  ))}

                  {callHistory.length === 0 && (
                    <p className="text-[10px] text-slate-500 italic text-center py-4 bg-slate-950/20 rounded-xl">
                      تلاش تماسی در سابقه این مراجع قید نگردیده
                    </p>
                  )}
                </div>
              </div>

              {/* Form Input Section for logging the outcome */}
              <div className="pt-3 border-t border-white/5 space-y-3">
                <h4 className="text-xs font-bold text-slate-200">داشبورد نتایج مکالمات و ارزیابی</h4>
                
                {/* Result of direct Call Selection */}
                <div>
                  <label className="block text-[10.5px] text-slate-450 mb-1">نتیجه تماس برقرار شده صوتی:</label>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] font-semibold text-center">
                    <button 
                      type="button" 
                      onClick={() => setSelectedCallResult("answered")}
                      className={`py-1.5 px-2 rounded-lg border transition ${selectedCallResult === "answered" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40" : "bg-white/2 border-white/5 text-slate-400"}`}
                    >
                      🟢 برقرار شد (مشاوره نوبت)
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setSelectedCallResult("no_answer")}
                      className={`py-1.5 px-2 rounded-lg border transition ${selectedCallResult === "no_answer" ? "bg-rose-500/10 text-rose-400 border-rose-500/40" : "bg-white/2 border-white/5 text-slate-400"}`}
                    >
                      🔴 جواب نداد / مشغول بود
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setSelectedCallResult("callback_requested")}
                      className={`py-1.5 px-2 rounded-lg border transition ${selectedCallResult === "callback_requested" ? "bg-purple-500/10 text-purple-400 border-purple-500/40" : "bg-white/2 border-white/5 text-slate-400"}`}
                    >
                      🟣 درخواست زمان مجدد تماس
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setSelectedCallResult("wrong_number")}
                      className={`py-1.5 px-2 rounded-lg border transition ${selectedCallResult === "wrong_number" ? "bg-slate-500/20 text-slate-400 border-white/10" : "bg-white/2 border-white/5 text-slate-400"}`}
                    >
                      ⚫ شماره اشتباه بود
                    </button>
                  </div>
                </div>

                {/* Form Inputs */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-mono">حداقل ۵۰ کاراکتر</span>
                    <label className="block text-[10.5px] text-slate-450">ملاحظات و خلاصه بیو مراجع (نحوه گفتگو و تمایل کلامی):</label>
                  </div>
                  <textarea 
                    rows={2}
                    value={opNotes}
                    onChange={e => setOpNotes(e.target.value)}
                    placeholder="تمایل شدید به غلبه بر خستگی کلامی و من‌من کردن در جلسات کاری شرکت..."
                    className="w-full px-3 py-2 glass-input text-xs text-right leading-relaxed focus:outline-none"
                  />
                  {opNotes.length > 0 && (
                    <span className="text-[9px] text-brand-primary block text-left">
                      {opNotes.length} کاراکتر قید شد
                    </span>
                  )}
                </div>

                {/* Appointment Slots visual layout */}
                <div className="bg-slate-900/40 p-3.5 rounded-xl border border-white/5 space-y-3">
                  <span className="text-[10.5px] font-black text-slate-100 block">انتخاب یا رزرو نوبت بررسی حضوری انستیتو هدهد:</span>
                  
                  {/* Jalali pickers and fast buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-0.5">ساعت مقرر (تایپ یا انتخاب)</label>
                      <input 
                        type="text" 
                        list="apt-times-list-contact"
                        placeholder="مثلا ۱۶:۳۰ یا 16:30"
                        value={aptTime} 
                        onChange={e => setAptTime(e.target.value)}
                        className="w-full px-2 py-1.5 glass-input text-xs font-mono text-center text-white focus:outline-none"
                      />
                      <datalist id="apt-times-list-contact">
                        <option value="09:00" />
                        <option value="10:00" />
                        <option value="11:00" />
                        <option value="14:00" />
                        <option value="15:00" />
                        <option value="16:00" />
                      </datalist>
                    </div>

                    <div>
                      <label className="text-[9px] text-slate-400 block mb-0.5">تاریخ حضور (شمسی)</label>
                      <input 
                        type="text" 
                        placeholder="1405/03/24"
                        value={aptDate}
                        onChange={e => setAptDate(e.target.value)}
                        className="w-full px-2 py-1.5 glass-input text-xs font-mono text-center text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Quick toggle dates and SAVE action */}
                  <div className="flex justify-between items-center gap-1 text-[9px] pt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!selectedApp) return;
                        if (!aptTime && !aptDate) {
                          triggerToast("لطفاً ابتدا ساعت یا تاریخ را تعیین نمایید.");
                          return;
                        }
                        try {
                          const res = await fetch(`/api/applicants/${selectedApp.id}/update-appointment`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              appointmentDate: aptDate,
                              appointmentTime: aptTime
                            })
                          });
                          if (res.ok) {
                            triggerToast("نوبت مقرر کلاینت با موفقیت ثبت/بروزرسانی شد! 💾");
                            selectedApp.status = "SCHEDULED" as any;
                            // Optionally trigger list reload by custom event
                            window.dispatchEvent(new CustomEvent("refresh-applicants"));
                          } else {
                            triggerToast("خطا در ذخیره‌سازی نوبت مقرر.");
                          }
                        } catch (err) {
                          console.error(err);
                          triggerToast("خطا در ارتباط با سرور جهت بروزرسانی نوبت.");
                        }
                      }}
                      className="bg-brand-primary/20 hover:bg-brand-primary border border-brand-primary/30 hover:border-brand-primary text-brand-primary hover:text-white px-2 py-1 rounded transition font-bold cursor-pointer"
                    >
                      💾 ثبت و تغییر سریع نوبت
                    </button>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={setTomorrowDate} className="bg-white/5 border border-white/5 hover:bg-white/10 px-2 py-1 rounded-md text-slate-300">نوبت فردا</button>
                      <button type="button" onClick={setTodayDate} className="bg-white/5 border border-white/5 hover:bg-white/10 px-2 py-1 rounded-md text-slate-300">نوبت امروز</button>
                      <span className="text-slate-500 self-center hidden sm:inline">تنظیم سریع:</span>
                    </div>
                  </div>

                  {/* Capacity warnings displays */}
                  {aptTime && (
                    <div className="bg-slate-950 p-2 rounded-lg border border-white/2 text-[10px] space-y-1">
                      <div className="flex justify-between">
                        <span className={getSlotCapacityDetails(aptTime).colorClass}>{getSlotCapacityDetails(aptTime).label}</span>
                        <span className="text-slate-500">ساعت {aptTime}:</span>
                      </div>
                      {getSlotCapacityDetails(aptTime).remaining === 0 && (
                        <p className="text-rose-400 font-extrabold text-[9px] mt-1 blinking flex items-center gap-1">
                          <AlertTriangle size={10} /> ظرفیت این اسلات کلاسی تکمیل است! احتمال تداخل یا سربار کلاسی.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Draft Status and local recover operations */}
                {lastSavedDraftMessage && (
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <button type="button" onClick={() => clearDraftForApplicant(selectedApp.id)} className="text-rose-400 hover:text-rose-300 hover:underline">پاکسازی پیش‌نویس</button>
                    <span>{lastSavedDraftMessage}</span>
                  </div>
                )}

                {/* Premium Claude AI / Gemini Profiler dynamic responses displays */}
                {aiResult && (
                  <div className="p-4 bg-purple-500/5 text-xs border border-purple-500/20 rounded-xl text-slate-200 flex flex-col space-y-3 animate-slide-up">
                    <div className="flex justify-between items-center text-purple-400 font-bold">
                      <div className="flex items-center gap-1 font-mono uppercase bg-purple-950/40 p-1 rounded text-[10px]">
                        <Activity size={10} />
                        اطمینان: {aiResult.confidenceScore ? `${Math.round(aiResult.confidenceScore * 100)}%` : "92%"}
                      </div>
                      <span className="flex items-center gap-1 font-bold">
                        <Sparkles size={13} className="text-purple-400" />
                        رده انتخابی هوش مصنوعی: {
                          aiResult.category === "Highly Motivated" || aiResult.category === "بسیار مناسب"
                            ? "بسیار عالی 🌟 (فن بیان طلایی)"
                            : aiResult.category === "Moderate Interest" || aiResult.category === "مناسب"
                            ? "متوسط (نیازمند انگیزه)"
                            : "نیاز به پیگیری مکرر ⚠️"
                        }
                      </span>
                    </div>

                    <p className="leading-relaxed text-slate-300 text-right text-[11px]">
                      {aiResult.summaryAnalysis || aiResult.analysis}
                    </p>

                    {aiResult.recommendedApproach && (
                      <div className="pt-2 border-t border-white/5 space-y-1">
                        <span className="text-[10px] text-purple-300 font-bold block">بهترین رویکرد پیشنهادی برای پذیرش:</span>
                        <p className="text-[10.5px] leading-relaxed text-slate-400">{aiResult.recommendedApproach}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Submit operations */}
                <div className="flex gap-2 pt-2">
                  <button 
                    type="button"
                    onClick={() => executeContactTransition(false)}
                    disabled={loadingAi || !opNotes.trim()}
                    className="flex-1 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 rounded-xl font-bold text-xs transition active:scale-95 flex justify-center items-center gap-1 disabled:opacity-40 select-none cursor-pointer"
                  >
                    {loadingAi ? <RefreshCw className="animate-spin" size={12} /> : null}
                    ذخیره و آنالیز هوش مصنوعی
                  </button>

                  <button 
                    type="button"
                    onClick={() => executeContactTransition(true)}
                    disabled={loadingAi || !opNotes.trim() || !aptDate || !aptTime}
                    className="flex-1 py-2.5 btn-primary glow-on-hover rounded-xl text-xs font-black transition active:scale-95 flex justify-center items-center gap-1 disabled:opacity-40 select-none cursor-pointer"
                  >
                    تثبیت نوبت و انتقال به پذیرش خانم زمانی
                  </button>
                </div>

              </div>

            </div>
          ) : (
            <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center text-slate-550 text-xs flex flex-col justify-content-center items-center space-y-3">
              <Moon className="text-slate-700 font-bold animate-pulse" size={32} />
              <p className="leading-relaxed">
                جهت شروع تماس، ویرایش یادداشت‌ها، تنظیم نوبت مراجع حضور فیزیکی یا دریافت پرسونالیتی هوش مصنوعی، یک متقاضی را از لیست مراجعین در صف تماس انتخاب نمائید.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
