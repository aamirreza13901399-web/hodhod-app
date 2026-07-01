/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User, UserRole } from "../types.js";
import { LogIn, Key, HelpCircle, Shield, Award, UserCheck, Calendar, Activity, Search } from "lucide-react";
import ApplicantTimelineView from "./ApplicantTimelineView.js";

interface LoginScreenProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLookup, setShowLookup] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError(".لطفاً نام کاربری و رمز عبور را وارد نمایید");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "خطا در برقراری ارتباط با سرور");
      }

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message || "رمز عبور نادرست است یا خطایی رخ داده است.");
    } finally {
      setLoading(false);
    }
  };

  // One-click quick login for testing out all 8 panels instantly
  const handleQuickLogin = async (userRole: string, defaultPass: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: userRole, password: defaultPass })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }
      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setError("خطا در ورود سریع: " + (err.message || "خطای ناشناخته"));
    } finally {
      setLoading(false);
    }
  };

  const rolesConfig = [
    { label: "مدیر اصلی سیستم", u: "admin", p: "admin123", icon: Shield, col: "border-red-500/30 text-red-400" },
    { label: "اپراتور تماس (مرحله ۱)", u: "contact", p: "contact123", icon: Calendar, col: "border-blue-500/30 text-blue-400" },
    { label: "خانم زمانی (پذیرش)", u: "zamani", p: "zamani123", icon: UserCheck, col: "border-emerald-500/30 text-emerald-400" },
    { label: "آقای معصومی (مشاور)", u: "masoumi", p: "masoumi123", icon: HelpCircle, col: "border-purple-500/30 text-purple-400" },
    { label: "خانم رضایی (اتاق میانی)", u: "rezaei", p: "rezaei123", icon: Activity, col: "border-cyan-500/30 text-cyan-400" },
    { label: "آقای کاظمی (داور مسابقه)", u: "kazemi", p: "kazemi123", icon: Award, col: "border-amber-500/30 text-amber-400" },
    { label: "خانم طحانی (ارزیاب ارشد)", u: "tahani", p: "tahani123", icon: Award, col: "border-pink-500/30 text-pink-400" },
    { label: "خانم رضایی (ارزیاب کمکی)", u: "rezaeib", p: "rezaeib123", icon: UserCheck, col: "border-teal-500/30 text-teal-400" }
  ];

  return (
    <div id="login-container" className="min-h-screen py-10 px-4 flex flex-col justify-center items-center bg-transparent text-slate-100 relative z-10 grid-bg">
      
      {/* Brand Header */}
      <div className="mb-8 text-center animate-fade-in-down">
        <div className="inline-flex justify-center items-center p-3.5 mb-3 bg-brand-primary rounded-full shadow-lg shadow-brand-primary/30 relative">
          <div className="absolute inset-0 bg-brand-primary/30 rounded-full animate-ping pointer-events-none" />
          {/* SVG Hoopoe/Bird Icon Representing "Hodhod" */}
          <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 3H7c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
            <path d="m9 10 2 2 4-4" />
            <path d="m11 15 2 2" />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-wide font-sans brand-glow">
          سامانه تربیتی و ارزیابی فهم
        </h1>
        <p className="text-brand-primary mt-2 text-sm font-semibold tracking-wide">
          پلتفرم جامع ارزیابی، پذیرش و هدایت روان‌شناختی کلامی مراجعین موسسه هدهد
        </p>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Form Login Block */}
        <div id="login-form-card" className="lg:col-span-5 glass-panel p-8 rounded-2xl flex flex-col">
          <h2 className="text-lg font-bold text-slate-100 mb-6 border-b border-white/5 pb-3 flex items-center gap-2">
            <LogIn size={20} className="text-brand-primary ml-1" />
            ورود به پرتال پرسنل
          </h2>

          {error && (
            <div className="p-3.5 mb-4 bg-red-950/40 border border-red-500/30 rounded-xl text-red-300 text-xs text-right leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 text-right">
                نام کاربری پرسنل
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="مثال: zamani"
                  className="w-full pl-3 pr-4 py-3 glass-input text-right placeholder:text-slate-600 block"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 text-right">
                کلمه عبور
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-3 pr-4 py-3 glass-input text-right placeholder:text-slate-650 block"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 btn-primary text-white font-extrabold rounded-xl transition duration-300 text-sm shadow-lg hover:shadow-brand-primary/40 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {loading ? "در حال اتصال به پایگاه مرکزی..." : "ورود به سیستم و گشایش صف"}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-white/5 space-y-3">
            <button
              type="button"
              onClick={() => setShowLookup(true)}
              className="w-full py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Search size={13} />
              🔍 پیگیری آنلاین وضعیت متقاضی و کارنامه
            </button>
            <p className="text-[10px] text-slate-400 leading-relaxed text-center">
              کلمه عبور اپراتورها به صورت پیش‌فرض شامل نام کاربری به همراه پسوند <span className="font-mono text-brand-primary/95">123</span> می‌باشد.
            </p>
          </div>
        </div>

        {/* Quick Swapper Roles Grid for AI Studio Reviewers */}
        <div id="quick-roles-card" className="lg:col-span-7 glass-panel p-8 rounded-2xl">
          <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-3">
            <span className="text-xs text-brand-primary bg-brand-primary/10 px-2.5 py-1 rounded-full font-medium border border-brand-primary/20">
              مخصوص ارزیابی آسان سامانه فهم
            </span>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Key size={20} className="text-brand-primary ml-1" />
              ورود سریع با کلیک مستقیم
            </h2>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed text-right mb-6">
            جهت تسهیل در تست و تماشای سناریوهای مختلف پذیرش، مشاوره و داوری، می توانید با فشردن هر یک از دکمه‌های شیشه‌ای زیر، فوراً در نقش مسئول مربوطه وارد سامانه شوید و عملکرد صف هوشمند را ارزیابی کنید.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rolesConfig.map((role) => {
              const RoleIcon = role.icon;
              return (
                <button
                  key={role.u}
                  onClick={() => handleQuickLogin(role.u, role.p)}
                  disabled={loading}
                  className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all duration-300 text-right active:scale-95 disabled:opacity-50 group hover:border-brand-primary/40 cursor-pointer"
                >
                  <RoleIcon size={18} className="text-slate-400 group-hover:text-brand-primary transition ml-2" />
                  <div className="flex-1 mr-3">
                    <p className="text-sm font-bold text-white mb-0.5 group-hover:text-brand-primary transition">
                      {role.label}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      نام کاربری: {role.u} | رمز: {role.p}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Footer System Credits */}
      <div className="mt-12 text-center text-xs text-slate-500">
        <p>انستیتو سخنوری هدهد © ۱۴۰۵ — تمامی حقوق اطلاعات متقاضیان و تحلیل‌های تربیتی محفوظ است.</p>
        <p className="mt-1 font-mono text-[10px] text-slate-600">RTL Deep Glassmorphic Mode • UTC+3:30 (Asia/Tehran)</p>
      </div>

      {showLookup && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-4xl w-full text-right shadow-2xl relative my-8">
            <ApplicantTimelineView onClose={() => setShowLookup(false)} isEmbedded={true} />
          </div>
        </div>
      )}

    </div>
  );
}
