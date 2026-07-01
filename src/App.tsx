/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, Warning } from "./types.js";
import LoginScreen from "./components/LoginScreen.js";
import AdminPanel from "./components/AdminPanel.js";
import ContactPanel from "./components/ContactPanel.js";
import ReceptionPanel from "./components/ReceptionPanel.js";
import ConsultPanel from "./components/ConsultPanel.js";
import MiddleRoomPanel from "./components/MiddleRoomPanel.js";
import JudgePanel from "./components/JudgePanel.js";
import ResultPanel from "./components/ResultPanel.js";
import { 
  LogOut, Shield, Clock, AlertOctagon, RefreshCw, Layers, CheckCircle2 
} from "lucide-react";
import { getShamsiClockString } from "./lib/dateUtils.js";
import ExperimentalNoticePage from "./components/ExperimentalNoticePage.js";
import GeminiLatencyIndicator from "./components/GeminiLatencyIndicator.js";
import SmartMessengerPanel from "./components/SmartMessengerPanel.js";
import AppointmentManagerPanel from "./components/AppointmentManagerPanel.js";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"workspace" | "messenger" | "appointments">("workspace");
  const [clockStr, setClockStr] = useState("");
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [blockingWarning, setBlockingWarning] = useState<Warning | null>(null);
  const [isClearingWarning, setIsClearingWarning] = useState(false);
  const [viewNoticeFirst, setViewNoticeFirst] = useState(false);

  // Initialize clock
  useEffect(() => {
    const updateTime = () => {
      setClockStr(getShamsiClockString());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Global tab switching custom event listener
  useEffect(() => {
    const handleSwitchTab = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail === "appointments" || customEvent.detail === "messenger" || customEvent.detail === "workspace") {
        setActiveTab(customEvent.detail);
      }
    };
    window.addEventListener("switch-tab", handleSwitchTab);
    return () => window.removeEventListener("switch-tab", handleSwitchTab);
  }, []);

  // Initialize session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("user_session");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        setCurrentUser(u);
      } catch (e) {
        localStorage.removeItem("user_session");
      }
    }
  }, []);

  // Poll for Operator warnings
  useEffect(() => {
    if (!currentUser) return;
    const checkWarnings = async () => {
      try {
        const res = await fetch(`/api/warnings?userId=${currentUser.id}`);
        if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
          const warnList: Warning[] = await res.json();
          setWarnings(warnList);
          // Check if there's any unacknowledged critical warning blocking action
          const unAcked = warnList.find(w => !w.readAt);
          if (unAcked) {
            setBlockingWarning(unAcked);
          } else {
            setBlockingWarning(null);
          }
        }
      } catch (err) {
        console.error("Warning check failed", err);
      }
    };

    checkWarnings();
    const alertInterval = setInterval(checkWarnings, 5000);
    return () => clearInterval(alertInterval);
  }, [currentUser]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("user_session", JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("user_session");
    setBlockingWarning(null);
  };

  const clearWarningAcknowledge = async () => {
    if (!blockingWarning) return;
    setIsClearingWarning(true);
    try {
      const res = await fetch("/api/warnings/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warningId: blockingWarning.id })
      });
      if (res.ok) {
        setBlockingWarning(null);
        // Refresh warnings list
        const resList = await fetch(`/api/warnings?userId=${currentUser?.id}`);
        if (resList.ok && resList.headers.get("content-type")?.includes("application/json")) {
          const data = await resList.json();
          setWarnings(data);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsClearingWarning(false);
    }
  };

  // Render full screen announcement notice first, or render app with floating notice launcher orb
  if (viewNoticeFirst) {
    return (
      <ExperimentalNoticePage 
        isCollapsed={false} 
        onEnterApp={() => setViewNoticeFirst(false)} 
        onExpand={() => setViewNoticeFirst(true)} 
      />
    );
  }

  if (!currentUser) {
    return (
      <div className="relative min-h-screen bg-[#020205]">
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
        {/* Floating Notice Orb Component rendering in collapsed state */}
        <ExperimentalNoticePage 
          isCollapsed={true} 
          onEnterApp={() => setViewNoticeFirst(false)} 
          onExpand={() => setViewNoticeFirst(true)} 
        />
      </div>
    );
  }

  // Define human Arabic labels for user roles
  const getRoleLabel = (role: string) => {
    switch (role) {
      case "ADMIN": return "مدیریت ارشد بیانی";
      case "CONTACT_OP": return "میز تماس و نوبت‌دهی (مرحله ۱)";
      case "RECEPTION": return "میز پذیرش حضوری خانم زمانی (مرحله ۲)";
      case "CONSULTANT": return "اتاق مشاوره آقای معصومی (مرحله ۳)";
      case "MIDDLE_ROOM": return "اتاق متمم ریتم کلام خانم رضایی (مرحله ۴)";
      case "JUDGE": return "داور اصلی مسابقه صوتی جناب کاظمی (مرحله ۵)";
      case "PRESENTER_A": return "ارائه گزارش و پذیرش نهایی (مرحله ۶)";
      default: return role;
    }
  };

  return (
    <div id="app-root" className="min-h-screen font-sans text-slate-100 flex flex-col justify-between selection:bg-brand-primary/20 selection:text-brand-primary grid-bg relative overflow-x-hidden">
      
      {/* Dynamic Background Premium Mesh Orbs */}
      <div className="bg-gradient-mesh" />

      {/* Main Container Header (Floating Glassmorphism Header inspired by Virasty mobile) */}
      <header id="platform-header" className="relative z-10 glass-panel border border-white/5 mx-4 mt-4 px-4 md:px-8 py-3.5 rounded-2xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* Left info area: clock & operator status details */}
          <div className="flex items-center gap-4 text-left w-full sm:w-auto justify-between sm:justify-start">
            <button 
              onClick={handleLogout}
              className="px-3.5 py-1.5 bg-white/5 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 rounded-full text-xs flex items-center gap-1.5 transition duration-150 cursor-pointer active:scale-95"
            >
              <LogOut size={13} />
              خروج از سیستم
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-bold text-white leading-none">{currentUser.fullName}</p>
                <span className="text-[10px] text-brand-primary font-semibold bg-brand-primary/10 px-2.5 py-0.5 rounded-full mt-1 border border-brand-primary/20 inline-block">
                  {getRoleLabel(currentUser.role)}
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-brand-primary/10 border border-brand-primary/30 flex items-center justify-center text-brand-primary font-black text-sm shadow-xl">
                {currentUser.fullName.charAt(0)}
              </div>
            </div>
          </div>

          {/* Right info area: logo, tagline, Jalali dynamic clock, tab togglers */}
          <div className="flex flex-col md:flex-row items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
            
            {/* Navigation Switch Tabs */}
            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 gap-1 shadow-inner relative z-30">
              <button
                onClick={() => setActiveTab("messenger")}
                className={`px-4.5 py-2 rounded-xl transition duration-200 text-xs font-black select-none cursor-pointer flex items-center gap-1.5 active:scale-95 ${activeTab === "messenger" ? "bg-brand-primary text-white shadow-xl shadow-brand-primary/20" : "text-slate-400 hover:text-white"}`}
              >
                💬 پیام‌رسان هوشمند صبا
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block animate-ping" />
              </button>
              {(currentUser?.role === "ADMIN" || currentUser?.role === "CONTACT_OP") && (
                <button
                  onClick={() => setActiveTab("appointments")}
                  className={`px-4.5 py-2 rounded-xl transition duration-200 text-xs font-black select-none cursor-pointer flex items-center gap-1.5 active:scale-95 ${activeTab === "appointments" ? "bg-brand-primary text-white shadow-xl shadow-brand-primary/20" : "text-slate-400 hover:text-white"}`}
                >
                  🗓️ مدیریت هوشمند نوبت‌ها
                </button>
              )}
              <button
                onClick={() => setActiveTab("workspace")}
                className={`px-4.5 py-2 rounded-xl transition duration-200 text-xs font-black select-none cursor-pointer flex items-center gap-1.5 active:scale-95 ${activeTab === "workspace" ? "bg-brand-primary text-white shadow-xl shadow-brand-primary/20" : "text-slate-400 hover:text-white"}`}
              >
                💼 کارتابل کارگروه‌ها
              </button>
            </div>

            {/* Clock Widget */}
            <div id="jalali-clock" className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10 shadow-inner">
              <span className="text-xs text-slate-300 font-mono text-right tracking-tight leading-none font-medium">
                {clockStr}
              </span>
              <Clock size={14} className="text-brand-primary" />
            </div>

            {/* Platform Brand Info */}
            <div className="text-right hidden md:block">
              <h2 className="text-base font-black text-white flex items-center gap-1.5 justify-end brand-glow">
                سامانه تربیتی و هدایت فهم
                <Layers className="text-brand-primary" size={16} />
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">پلتفرم جامع سنجش، پذیرش و کارتابل روان‌شناختی کلامی (RTL)</p>
            </div>
          </div>

        </div>
      </header>

      {/* Main content body */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 md:px-8 py-6 relative z-10">
        
        {/* Switchable workspaces logic */}
        {activeTab === "messenger" ? (
          <SmartMessengerPanel currentUser={currentUser} onBack={() => setActiveTab("workspace")} />
        ) : activeTab === "appointments" ? (
          <AppointmentManagerPanel currentUser={currentUser} />
        ) : (
          <>
            {/* Dynamic routing rendering berdasarkan user roles */}
            {currentUser.role === "ADMIN" && <AdminPanel adminUser={currentUser} />}
            {currentUser.role === "CONTACT_OP" && <ContactPanel user={currentUser} />}
            {currentUser.role === "RECEPTION" && <ReceptionPanel user={currentUser} />}
            {currentUser.role === "CONSULTANT" && <ConsultPanel user={currentUser} />}
            {currentUser.role === "MIDDLE_ROOM" && <MiddleRoomPanel user={currentUser} />}
            {currentUser.role === "JUDGE" && <JudgePanel user={currentUser} />}
            {currentUser.role === "PRESENTER_A" && <ResultPanel user={currentUser} />}
          </>
        )}

      </main>

      {/* Platform Humble Footer */}
      <footer id="platform-footer" className="relative z-10 border-t border-white/5 bg-white/3 py-5 px-6 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-slate-500 leading-relaxed font-mono text-center md:text-right">
            Fahm Educational and Speech Guidance System v3.0 • Premium Glassmorphic Virasty Aura • Deep Spatial Dark Theme • Localized Jalali Sync
          </p>
          
          <div className="flex items-center gap-3">
            {/* Quick Link to go back to Notice Page */}
            <button
              onClick={() => setViewNoticeFirst(true)}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[10px] text-slate-400 hover:text-slate-200 transition duration-150 cursor-pointer"
            >
              📋 صفحه اطلاعیه آزمایشی
            </button>
            <GeminiLatencyIndicator />
          </div>
        </div>
      </footer>

      {/* Floating Notice Orb Component rendering in collapsed state for logged-in workspaces */}
      <ExperimentalNoticePage 
        isCollapsed={true} 
        onEnterApp={() => setViewNoticeFirst(false)} 
        onExpand={() => setViewNoticeFirst(true)} 
      />

      {/* HIGH-CONTRAST SECURE WARNING DISPATCH OVERLAY (BLOCKS INTERACTIVE WORKSPACE) */}
      {blockingWarning && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-6 text-center shadow-2xl shadow-red-500/5 animate-scale-up text-right">
            
            <div className="flex justify-center mb-2">
              <div className="p-4 bg-red-500/10 rounded-full text-red-500 animate-pulse">
                <AlertOctagon size={48} />
              </div>
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-lg font-black text-red-400">تذکر انضباطی ارشد و اخطار تعلیق موقت فعالیت</h2>
              <p className="text-xs text-slate-500">
                این پیام تذکر انضباطی کتبی از طرف مدیریت ارشد امنیت صادر گرده و طبق آیین‌نامه کاری تا زمان اعلام پذیرفتاری، کارتابل شما قفل است.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-3">
              <span className="text-[10px] text-slate-600 block">شرح علت صدور تخلف برای شما:</span>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">{blockingWarning.reason}</p>
              
              <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                <span>شناسه: {blockingWarning.id}</span>
                <span className="text-red-400 capitalize">شدت: {blockingWarning.severity}</span>
              </div>
            </div>

            <button
              onClick={clearWarningAcknowledge}
              disabled={isClearingWarning}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl transition text-xs flex justify-center items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              {isClearingWarning ? <RefreshCw className="animate-spin" size={14} /> : null}
              اینجانب قوانین همکاری را مجدداً مطالعه نموده و متعهد به عدم تکرار تخلف می‌شوم
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
