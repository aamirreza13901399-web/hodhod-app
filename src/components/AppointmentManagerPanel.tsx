/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, Applicant, ApplicantStatus } from "../types.js";
import {
  Clock,
  Calendar,
  UserCheck,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Move,
  ChevronLeft,
  Filter,
  Users
} from "lucide-react";

interface AppointmentManagerPanelProps {
  currentUser: User;
}

// 4 shifts/hourly lanes
const TIME_SLOTS = [
  { id: "09:00", label: "ساعت ۰۹:۰۰ صبح" },
  { id: "10:30", label: "ساعت ۱۰:۳۰ صبح" },
  { id: "12:00", label: "ساعت ۱۲:۰۰ ظهر" },
  { id: "14:00", label: "ساعت ۱۴:۰۰ بعدازظهر" },
  { id: "15:30", label: "ساعت ۱۵:۳۰ بعدازظهر" },
  { id: "17:00", label: "ساعت ۱۷:۰۰ عصر" },
  { id: "18:30", label: "ساعت ۱۸:۳۰ عصر" }
];

export default function AppointmentManagerPanel({ currentUser }: AppointmentManagerPanelProps) {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverLane, setDragOverLane] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Convert Gregorian Date to Jalali String
  const getShamsiDateString = (date = new Date()) => {
    const gy = date.getFullYear();
    const gm = date.getMonth() + 1;
    const gd = date.getDate();
    
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

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Pre-load current date
  useEffect(() => {
    setSelectedDate(getShamsiDateString());
    loadApplicants();
  }, []);

  const loadApplicants = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/applicants");
      if (res.ok) {
        const data = await res.json();
        // filter out deleted ones
        const active = data.filter((a: any) => !a.deletedAt);
        setApplicants(active);
      }
    } catch (err) {
      console.error("Failed to load applicants for scheduler:", err);
      triggerToast("خطا در بارگذاری لیست مراجعین");
    } finally {
      setLoading(false);
    }
  };

  // Move / assign appointment time for applicant
  const handleAssignAppointment = async (appId: string, time: string) => {
    const updatedDate = selectedDate || getShamsiDateString();
    try {
      const res = await fetch(`/api/applicants/${appId}/update-appointment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentDate: updatedDate,
          appointmentTime: time
        })
      });

      if (res.ok) {
        triggerToast("نوبت مراجع با موفقیت تغییر داده شد و وضعیت به 'نوبت‌دهی شده' تغییر یافت ✓");
        
        // Optimistic update
        setApplicants(prev => prev.map(a => {
          if (a.id === appId) {
            // we store time/date in notesGeneral as cached or wait to refetch
            // but the mock timeline holds contact logs. Let's append date/time to general memo or trigger loadData
            return {
              ...a,
              status: ApplicantStatus.SCHEDULED,
              // Cache it locally so it renders immediately in our lanes
              notesGeneral: `${a.notesGeneral || ""} [نوبت: ${updatedDate} ساعت ${time}]`
            };
          }
          return a;
        }));

        loadApplicants();
      } else {
        triggerToast("خطا در به‌روزرسانی نوبت در دیتابيس");
      }
    } catch (e) {
      console.error(e);
      triggerToast("خطا در ارتباط با سرور");
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverLane(null);
  };

  const handleDragOver = (e: React.DragEvent, laneId: string) => {
    e.preventDefault();
    setDragOverLane(laneId);
  };

  const handleDragLeave = () => {
    setDragOverLane(null);
  };

  const handleDrop = async (e: React.DragEvent, laneId: string) => {
    e.preventDefault();
    setDragOverLane(null);
    const appId = e.dataTransfer.getData("text/plain") || draggingId;
    if (!appId) return;

    if (laneId === "unscheduled") {
      // Clear appointment time
      await handleAssignAppointment(appId, "");
    } else {
      await handleAssignAppointment(appId, laneId);
    }
  };

  // Set selected date helper
  const setQuickDate = (daysAhead: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysAhead);
    setSelectedDate(getShamsiDateString(target));
  };

  // Helper to extract appointment date/time from direct fields or notes
  const getAppAppointmentDetails = (app: Applicant) => {
    // 1. Direct fields
    if (app.appointmentTime) {
      return {
        date: app.appointmentDate || "",
        time: app.appointmentTime
      };
    }

    // 2. Fallbacks to notes
    const timeMatch = app.notesGeneral?.match(/\[نوبت:\s*([^\s]+)\s*ساعت\s*([^\]]+)\]/);
    if (timeMatch) {
      return {
        date: timeMatch[1].trim(),
        time: timeMatch[2].trim()
      };
    }
    
    if (app.status === ApplicantStatus.SCHEDULED) {
      for (const slot of TIME_SLOTS) {
        if (app.notesGeneral?.includes(slot.id)) {
          return { date: selectedDate, time: slot.id };
        }
      }
    }
    return { date: "", time: "" };
  };

  // Filter based on search and lanes
  const matchesSearch = (app: Applicant) => {
    const term = search.trim();
    if (!term) return true;
    return (
      app.fullName.includes(term) ||
      app.phone.includes(term) ||
      app.nationalId.includes(term) ||
      app.notesGeneral?.includes(term)
    );
  };

  // Lane categorizations
  const unscheduledApplicants = applicants.filter(app => {
    if (!matchesSearch(app)) return false;
    // Status must be pending_contact or has empty appointment scheduler
    const details = getAppAppointmentDetails(app);
    return !details.time || app.status === ApplicantStatus.PENDING_CONTACT;
  });

  const getLaneApplicants = (timeSlotId: string) => {
    return applicants.filter(app => {
      if (!matchesSearch(app)) return false;
      const details = getAppAppointmentDetails(app);
      // Filter for target date and slotId
      return (
        app.status === ApplicantStatus.SCHEDULED &&
        details.time === timeSlotId &&
        (details.date === selectedDate || !details.date)
      );
    });
  };

  return (
    <div id="appointment-manager-root" className="space-y-6 text-right select-none animate-fade-in relative bg-slate-900/60 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 glass-panel border-emerald-500/30 p-3 rounded-xl text-xs flex items-center gap-2 text-emerald-400 shadow-xl animate-bounce">
          <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Title & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-950/40 p-5 rounded-2xl border border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary">
            <Calendar size={22} className="animate-spin-slow" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              سامانه مدیریت نوبت‌دهی و برنامه‌ریزی مراجعین
              <Sparkles size={16} className="text-brand-primary animate-pulse" />
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              زمان‌بندی هوشمند، تخصیص ساعت و جابه‌جایی مراجعین با کشیدن و رها کردن (Drag & Drop)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 border border-white/5 py-1.5 px-3 rounded-xl">
          <Users size={14} className="text-brand-primary" />
          <span className="text-xs text-slate-300">کل مراجعین ثبت‌شده: <strong className="text-brand-primary font-bold">{applicants.length}</strong> نفر</span>
        </div>
      </div>

      {/* Control Bar: Date selection & Search */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-slate-950/20 p-4 rounded-2xl border border-white/5">
        
        {/* Date Selector */}
        <div className="lg:col-span-5 flex flex-col sm:flex-row gap-2.5 items-start sm:items-center">
          <span className="text-xs text-slate-400 font-bold whitespace-nowrap">تاریخ نمایش کارتابل:</span>
          <div className="flex items-center gap-1.5 w-full">
            <input
              type="text"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              placeholder="مثال: ۱۴۰۵/۰۳/۲۴"
              className="px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-center text-white focus:outline-none focus:border-brand-primary w-28 font-mono"
            />
            <button
              onClick={() => setQuickDate(0)}
              className="px-2.5 py-2 bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 rounded-lg transition"
            >
              امروز
            </button>
            <button
              onClick={() => setQuickDate(1)}
              className="px-2.5 py-2 bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 rounded-lg transition"
            >
              فردا
            </button>
            <button
              onClick={() => setQuickDate(2)}
              className="px-2.5 py-2 bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 rounded-lg transition"
            >
              پس‌فردا
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="lg:col-span-5 relative w-full">
          <span className="absolute right-3 top-2.5 text-slate-500">
            <Search size={14} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی متقاضی (نام، کد ملی، تلفن)..."
            className="w-full pl-3 pr-9 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-primary text-right"
          />
        </div>

        {/* Refresh button */}
        <div className="lg:col-span-2 flex justify-end w-full">
          <button
            onClick={loadApplicants}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl transition duration-150 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            به‌روزرسانی
          </button>
        </div>
      </div>

      {/* Main Drag-and-Drop Arena */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch min-h-[600px] mt-4">
        
        {/* Left Side: Unscheduled Pool (3 Columns span) */}
        <div
          onDragOver={(e) => handleDragOver(e, "unscheduled")}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, "unscheduled")}
          className={`xl:col-span-4 rounded-2xl border p-4 flex flex-col justify-between transition-all duration-200 ${
            dragOverLane === "unscheduled"
              ? "bg-amber-500/10 border-amber-500/50 shadow-2xl"
              : "bg-slate-950/30 border-white/5"
          }`}
        >
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-3">
              <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-bold">
                بدون ساعت مقرر
              </span>
              <h3 className="text-xs font-black text-slate-200 flex items-center gap-1">
                لیست پذیرش اولیه
                <Users size={12} className="text-slate-400" />
              </h3>
            </div>

            {/* Unscheduled List container */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {unscheduledApplicants.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-white/5 rounded-xl">
                  <AlertCircle size={20} className="mx-auto text-slate-600 mb-2" />
                  <p className="text-[11px] text-slate-500">متقاضی بدون نوبت یافت نشد</p>
                </div>
              ) : (
                unscheduledApplicants.map(app => (
                  <div
                    key={app.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, app.id)}
                    onDragEnd={handleDragEnd}
                    className="p-3.5 bg-slate-900/90 border border-white/5 rounded-xl hover:border-brand-primary/40 hover:bg-slate-850 transition duration-150 cursor-grab active:cursor-grabbing group relative shadow-md"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[9px] text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded font-mono">
                        {app.gender === "male" ? "آقا" : "خانم"} • {app.age} ساله
                      </span>
                      <h4 className="text-xs font-bold text-white group-hover:text-brand-primary duration-150">
                        {app.fullName}
                      </h4>
                    </div>
                    
                    <p className="text-[10px] text-slate-400 font-mono mt-1.5 tracking-tight text-right">
                      تلفن: {app.phone}
                    </p>
                    
                    {app.educationLevel && (
                      <p className="text-[9.5px] text-slate-500 mt-1">
                        تحصیلات: {app.educationLevel} | {app.city}
                      </p>
                    )}

                    {/* Accessible drop-down selector built inside the card */}
                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between gap-1.5 text-[10px]">
                      <span className="text-slate-500 text-[9px] flex items-center gap-0.5">
                        <Move size={10} /> تخصیص نوبت:
                      </span>
                      <select
                        onChange={(e) => handleAssignAppointment(app.id, e.target.value)}
                        value=""
                        className="bg-slate-950 text-[10px] text-slate-300 font-bold px-2 py-1 rounded-md border border-white/10 focus:outline-none focus:border-brand-primary cursor-pointer max-w-[130px]"
                      >
                        <option value="">انتخاب اسلات...</option>
                        {TIME_SLOTS.map(slot => (
                          <option key={slot.id} value={slot.id}>
                            {slot.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 mt-3 text-center">
            <span className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
              میتوانید پرونده‌ها را به جدول سمت راست بکشید
              <ArrowRight size={10} className="rotate-180 xl:rotate-0" />
            </span>
          </div>
        </div>

        {/* Right Side: Hourly Lanes Grid (8 Columns span) */}
        <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TIME_SLOTS.map(slot => {
            const laneList = getLaneApplicants(slot.id);
            const isHovered = dragOverLane === slot.id;

            return (
              <div
                key={slot.id}
                onDragOver={(e) => handleDragOver(e, slot.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, slot.id)}
                className={`rounded-2xl border p-3 flex flex-col justify-between transition-all duration-200 min-h-[220px] ${
                  isHovered
                    ? "bg-brand-primary/10 border-brand-primary/50 shadow-xl"
                    : "bg-slate-950/20 border-white/5"
                }`}
              >
                <div>
                  <div className="flex justify-between items-center pb-2 border-b border-white/5 mb-3">
                    <span className="text-[10px] bg-brand-primary/15 text-brand-primary px-2 py-0.5 rounded-full font-mono font-bold">
                      {laneList.length} مراجع
                    </span>
                    <h3 className="text-xs font-black text-slate-300 flex items-center gap-1">
                      <Clock size={12} className="text-brand-primary shrink-0" />
                      {slot.label}
                    </h3>
                  </div>

                  {/* Lane Scroll container */}
                  <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-0.5">
                    {laneList.length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-white/5 rounded-xl bg-slate-950/10">
                        <span className="text-[10px] text-slate-600 block">نوبتی داده نشده است</span>
                        <span className="text-[8.5px] text-slate-700 mt-1 block">پرونده را به اینجا با درگ رها کنید</span>
                      </div>
                    ) : (
                      laneList.map(app => (
                        <div
                          key={app.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, app.id)}
                          onDragEnd={handleDragEnd}
                          className="p-3 bg-slate-900 border border-white/5 rounded-xl hover:border-brand-primary/30 hover:bg-slate-850 duration-150 transition cursor-grab active:cursor-grabbing group shadow-sm text-right"
                        >
                          <div className="flex justify-between items-center gap-1.5">
                            <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 py-0.2 rounded">
                              نوبت‌دهی شده
                            </span>
                            <span className="text-xs font-bold text-white group-hover:text-brand-primary duration-150">
                              {app.fullName}
                            </span>
                          </div>

                          <div className="flex justify-between items-center mt-2 text-[9.5px] text-slate-400">
                            <span className="text-slate-500 font-mono text-[9px]">
                              کد ملی: {app.nationalId}
                            </span>
                            <span className="text-slate-300 font-mono text-[9px]">
                              {app.phone}
                            </span>
                          </div>

                          {/* Alternative drop-down reset option inside slot card */}
                          <div className="mt-2.5 pt-1.5 border-t border-slate-950 flex justify-between items-center text-[9px] text-slate-500">
                            <button
                              onClick={() => handleAssignAppointment(app.id, "")}
                              className="text-rose-400 hover:text-rose-300 transition duration-150"
                            >
                              لغو نوبت
                            </button>
                            <div className="flex items-center gap-1">
                              <span>ساعت نوبت:</span>
                              <select
                                onChange={(e) => handleAssignAppointment(app.id, e.target.value)}
                                value={slot.id}
                                className="bg-slate-950 text-[9px] text-slate-300 px-1 rounded border border-white/10"
                              >
                                {TIME_SLOTS.map(ts => (
                                  <option key={ts.id} value={ts.id}>
                                    {ts.id}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-2 mt-2 border-t border-white/5 flex justify-between items-center text-[8.5px] text-slate-650">
                  <span>آستانه ظرفیت: ۴ مراجع</span>
                  <span className="font-mono">{slot.id}</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}
