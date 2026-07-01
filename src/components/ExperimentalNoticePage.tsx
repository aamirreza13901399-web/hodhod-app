import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, Globe, Award, Sparkles, User, HelpCircle, ArrowLeft, ArrowRight, 
  Layers, Cpu, Zap, Calendar, CheckCircle2, ShieldX, Terminal, 
  Activity, Star, FileText, Info, Code, Compass, Printer, Moon, Sun, Send, MessageSquare
} from "lucide-react";

interface ExperimentalNoticePageProps {
  onEnterApp: () => void;
  isCollapsed?: boolean;
  onExpand?: () => void;
}

type LangType = "fa" | "en" | "zh";

export default function ExperimentalNoticePage({ 
  onEnterApp, 
  isCollapsed = false, 
  onExpand 
}: ExperimentalNoticePageProps) {
  const [lang, setLang] = useState<LangType>("fa");
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  
  // Confirmed state tracking for local storage persistence
  const [hasConfirmed, setHasConfirmed] = useState<boolean>(() => {
    return localStorage.getItem("hasConfirmedOfficialNotice_v1_4") === "true";
  });

  // User Opinion/Feedback State
  const [rating, setRating] = useState<number>(5);
  const [feedbackComment, setFeedbackComment] = useState<string>("");
  const [visitorName, setVisitorName] = useState<string>("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<boolean>(false);

  // Mouse Parallax Track Effect (Subtle depth displacement for dark mode)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 40,
        y: (e.clientY / window.innerHeight - 0.5) * 40,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Check if client IP has previously seen/acknowledged notice or sent feedback
  useEffect(() => {
    const checkIpStatus = async () => {
      try {
        const res = await fetch("/api/notice-status");
        if (res.ok) {
          const data = await res.json();
          if (data.hasSeen) {
            setHasConfirmed(true);
            localStorage.setItem("hasConfirmedOfficialNotice_v1_4", "true");
          }
        }
      } catch (err) {
        console.error("IP notice status check failed", err);
      }
    };
    checkIpStatus();
  }, []);

  // Submit Feedback Handler
  const handleSubmitFeedback = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmittingFeedback(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          comment: feedbackComment || "تایید سریع از پنجره گلس‌مورفیسم ارزیابی",
          name: visitorName || "بازدیدکننده سامانه"
        })
      });
      if (response.ok) {
        setFeedbackSuccess(true);
        setTimeout(() => {
          handleDismissNotice();
        }, 1500);
      } else {
        // Fallback dismiss on error
        handleDismissNotice();
      }
    } catch (err) {
      console.error("Feedback submit failed", err);
      handleDismissNotice();
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Perform permanent dismissal (for consecutive loads)
  const handleDismissNotice = async () => {
    localStorage.setItem("hasConfirmedOfficialNotice_v1_4", "true");
    setHasConfirmed(true);
    try {
      await fetch("/api/notice-dismiss", { method: "POST" });
    } catch (err) {
      console.error("Error logging notice dismissal for IP", err);
    }
    onEnterApp();
  };

  // Launch full-screen official decree
  const handleLaunchDecree = () => {
    if (onExpand) onExpand();
  };

  // Multi-Language content holding both segmented statements & overall system notices
  const content = {
    fa: {
      dir: "rtl",
      font: "font-sans",
      title: "بیانیه رسمی و ضوابط ارزیابی سامانه هوشمند فاحم (موسسه هدهد صبا)",
      subHeader: "سند تبیین اهداف اجرایی، مأموریت‌های سازمانی و شفاف‌سازی فرآیندهای نظارت آزمایشی مصوب سال ۱۴۰۵ هجری شمسی.",
      badgeExperimental: "سند مصوب آزمایشی",
      badgePrivate: "کنسول بازخورد و ارزیابی",
      badgeNoPublic: "غیر قابل توزیع عمومی",
      versionLabel: "نسخه پایداری v1.4.0",
      
      statementTitle: "متن کامل بیانیه رسمی مأموریت و وضعیت فنی سامانه",
      conditionsTitle: "شرایط ویژه زیرساختی و منطقه‌ای",
      conditionsDetail: "با توجه به محدودیت‌های ارتباطی، شرایط خاص منطقه‌ای، اختلالات احتمالی اینترنت و سایر عوامل خارج از کنترل تیم توسعه، ممکن است برخی قابلیت‌ها به‌صورت موقت با محدودیت مواجه شوند. این موارد بخشی از فرآیند آزمایش و ارزیابی سامانه است.",
      
      developerCardTitle: "شناسنامه معمار سیستم",
      developerName: "امیررضا ریحانی‌نیا",
      developerRole: "طراح، توسعه‌دهنده کل سامانه و هوش مصنوعی",
      developerAge: "۱۵ ساله",
      badgeFounder: "بنیانگذار پروژه",
      badgeCreator: "مدیر نوآوری",
      badgeTech: "طراح کاربری فاحم",
      signatureText: "A. Reyhani Nia",
      
      warningTitle: "هشدار امنیتی بسیار مهم",
      warningItem1: "این سامانه در حال حاضر نسخه نهایی و پایدار نیست و در فاز Sandbox قرار دارد.",
      warningItem2: "این بستر آزمودنی فاقد هرگونه تأییدیه استقرار تجاری یا عملیات تعهدآور مالی است.",
      warningItem3: "آثار هرگونه کپی‌برداری ساختاری فاحم در خارج از این کارتابل بر عهده استفاده‌کننده است.",
      warningItem4: "پرونده‌های موقت و اطلاعات متقاضیان صرفاً فرضی، شبیه‌سازی‌شده یا جهت آزمودن است.",

      footerTitle: "طراحی و توسعه با عشق توسط امیررضا ریحانی نیا — کلیه حقوق معنوی سازه محفوظ است",
      footerInstitution: "© ۱۴۰۵ موسسه فرهنگی آموزشی هدهد صبا",
      footerNotApproved: "این بستر صرفاً سندی آزمایشی جهت ارزیابی است و نباید به عنوان پیاده‌سازی تجاری یا سیستم نهایی تایید شده تلقی شود.",
      ctaEnterButton: "تایید فرآیند و ورود به کارتابل هدهد صبا",
      ctaBack: "ترخیص امن و خروج سیستم",
      tooltipExpand: "نمایش اطلاعیه آزمایشی",
      collapsedNoticeText: "بیانیه آزمایشی کلامی هدهد صبا (۱۴۰۵)",

      // The unified full text statements formatted for reading & printing
      unfiedDecreeHeader: "سند مصوب نظارت و مدیریت فرآیندهای ارزیابی کلامی",
      fullDecreeText: [
        "به نام خدا",
        "مقدمه و مأموریت کلی: سامانه حاضر در سال ۱۴۰۵ با هدف طراحی، توسعه و هوشمندسازی فرآیندهای اجرایی، مدیریتی و تحلیلی موسسه هدهد صبا توسط امیررضا ریحانی‌نیا طراحی و پیاده‌سازی شده است. این پروژه با هدف پیاده‌سازی یک ماتریکس یکپارچه برای مدیریت فرآیندهای سنجش آموزشی، ارزیابی تگ‌های کلامی، مشاوره روان‌بنیان، داوری متمرکز مراجعین، تحلیل گراف داده‌ها و گزارش‌گیری هوشمند توسعه یافته است و با تمام منابع در حال تکمیل، آزمایش فنی و بهینه‌سازی مداوم است.",
        "قوانین نسخه آزمایشی (Experimental Workspace): نسخه‌ای که هم‌اکنون در بخش آزمایشی در اختیار شما قرار دارد، صرفاً یک نسخه ارزیابی (Experimental Sandbox Build) محسوب شده و تنها با هدف بررسی رفتارهای همزمانی داوران، شناسایی گره‌های تراکنشی و توسعه امکانات آینده راه‌اندازی گردیده است. از آنجا که پروتکل‌های این نسخه در حال توسعه مداوم می‌باشند، احتمال دارد بخش‌هایی از سیستم به‌منظور اصلاح یا بازطراحی کلی، در به‌روزرسانی‌های بعدی دستخوش موازنه و جابجایی گردند تا پایداری نهایی زیرساخت تضمین گردد.",
        "سیگنال‌دهی و عدم تأییدیه رسمی نهایی: تاکید اکید می‌گردد که این نسخه فاقد هرگونه تاییدیه نهایی برای استقرار تجاری، عملیات جاری، یا ادغام نهایی در سیستم مرکزی هدهد صبا است و نباید به عنوان بستر مرجع تصمیم‌گیری مالی یا پرسنلی قلمداد شود. از تمامی کاربران ارشد، روان‌شناسان و داوران ارجمند تقاضا می‌گردد از هرگونه بازنشر فایل‌ها، انتشار فایل اکسل مراجعین در سایر پلتفرم‌ها یا کپی‌برداری ساختار فاحم در خارج از این کارتابل آزمایشی خودداری فرمایند."
      ]
    },
    en: {
      dir: "ltr",
      font: "font-sans",
      title: "Official Regulatory Statement & Experimental Assessment Guidelines",
      subHeader: "The official framework governing trial deployment models, organizational mission, and administrative evaluation stages (2026 / 1405 Solar Hijri).",
      badgeExperimental: "Trial Approved Build",
      badgePrivate: "Feedback & Control Bench",
      badgeNoPublic: "No Public Distribution",
      versionLabel: "Patch Build v1.4.0",

      statementTitle: "Complete Statement of Missions & Technical Parameters",
      conditionsTitle: "Regional Environmental Constraints",
      conditionsDetail: "Due to server location factors, network limitations, and unpredictable packet loss, some real-time components may experience transient latency drops. This is normal behavior during the Sandbox evaluation window.",

      developerCardTitle: "Core System Architect Profile",
      developerName: "Amirreza Reyhani Nia",
      developerRole: "Founder & Full Stack System Engineer",
      developerAge: "15 Years Old",
      badgeFounder: "Project Founder",
      badgeCreator: "Innovation Lead",
      badgeTech: "UX/UI Craftsman",
      signatureText: "A. Reyhani Nia",

      warningTitle: "Critical Security Disclaimer",
      warningItem1: "This application is currently in active Sandbox Preview stage.",
      warningItem2: "No system certification or operations warranty is certified for financial/legal records.",
      warningItem3: "Unauthorized reconstruction or duplication of the proprietary styling is audited.",
      warningItem4: "Dummy registers are populated for transaction stress testing only.",

      footerTitle: "Designed and Developed with Pride by Amirreza Reyhani Nia. All rights reserved.",
      footerInstitution: "© 2026 Hodhod Saba Institute Co.",
      footerNotApproved: "This sandbox remains strictly in technical evaluation mode and is not authorized for corporate production usage.",
      ctaEnterButton: "Authorize Protocols & Open Workspace",
      ctaBack: "Secure Host Disconnect",
      tooltipExpand: "View Experimental Notice",
      collapsedNoticeText: "Hodhod Saba Assessment Sandbox (2026)",

      unfiedDecreeHeader: "OFFICIAL MEMORANDUM OF INTEGRATED VERIFICATION WORKFLOWS",
      fullDecreeText: [
        "In the Name of God",
        "Introduction & Core Mission: This application was design-engineered and coded in 2026 (1405 Solar Hijri) exclusively for Hodhod Saba Institute by Amirreza Reyhani Nia. The project aims to synthesize registration workflows, speech assessments, real-time consultation records, judge panels, data visualization matrices, and Gemini API capabilities into a cohesive, highly accessible, secure localized sandbox.",
        "Scope of the Experimental Builds: This environment is deployed strictly as a Sandbox testing system. Our testing routines analyze database response speeds under high concurrent judge submissions and observe the stability of asynchronous state managers. These modules are evaluated iteratively and are subject to code restructuring to guarantee eventual system resilience.",
        "Exemplar Clause & Certification: This trial software has received no administrative, operating, or institutional production certificate. It must not be held as a live source of corporate authority. Directors, assessment leads, and clinical staff are strictly instructed not to distribute data templates outside this secure workspace."
      ]
    },
    zh: {
      dir: "ltr",
      font: "font-sans",
      title: "萨巴霍德霍德智能评估信息治理与合规评估官方声明",
      subHeader: "本智能诊断界面展示了萨巴霍德霍德研究所内部应用系统的设计理念、战略使命以及当前测试阶段的系统架构指标。",
      badgeExperimental: "官方沙盒实例",
      badgePrivate: "意见采集工作台",
      badgeNoPublic: "严禁公开传播",
      versionLabel: "迭代代号 v1.4.0",

      statementTitle: "建设宗旨及就绪状态官方说明全文",
      conditionsTitle: "特定区域基础设施与网络限制说明",
      conditionsDetail: "鉴于区域网络波动的复杂性、临时性断网以及不可抗力的多重制约，系统的某些功能在特定的测试阶段可能偶发高延迟或断联现象，此乃评估和网络测试常态。",

      developerCardTitle: "核心架构师与项目奠基人",
      developerName: "Amirreza Reyhani Nia",
      developerRole: "项目独立设计师兼核心开发主管",
      developerAge: "15岁",
      badgeFounder: "项目发起人",
      badgeCreator: "创新总监",
      badgeTech: "交互体验大匠",
      signatureText: "A. Reyhani Nia",

      warningTitle: "极重要的安全性警告声明",
      warningItem1: "当前发布的版本并非最终稳定版产品，处于沙盒状态。",
      warningItem2: "该沙盒实例未获取任何适用于正式合规生产运营的官方签章认证。",
      warningItem3: "严禁恶意提取、克隆或以任何媒介逆向工程解剖该系统核心资产。",
      warningItem4: "测试数据和模拟考生信息仅作为评估目的，不具备实际法律效益。",

      footerTitle: "由 Amirreza Reyhani Nia 独立设计与构建 — 保留所有技术专利与最终解释权",
      footerInstitution: "© 2026 萨巴霍德霍德研究所 · 软件工程分部",
      footerNotApproved: "本构建实例专供验证、实验分析和安全评测使用，绝不充当商用合规部署及交付依据。",
      ctaEnterButton: "认可章程并登录数据工作台",
      ctaBack: "沙盒安全卸载退出",
      tooltipExpand: "查看系统说明通知",
      collapsedNoticeText: "萨巴实验沙盒总控制窗口 (2026)",

      unfiedDecreeHeader: "萨巴智能言语评测信息管理运行备忘录",
      fullDecreeText: [
        "奉至仁至慈的天主之名",
        "基本背景与使命: 本系统由 15 岁的系统架构师 Amirreza Reyhani Nia 于公元 2026 年（波斯历 1405 年）为萨巴霍德霍德研究所独家设计、研发与独立编码。本项目的核心目标是开发一个智能化矩阵系统，实现招生登记、言语特质快速智能标记、深度心理筛查、联合线上评审、动态散点数据分析图表及人工智能辅助诊断在同一平台下的闭环流转。",
        "沙盒运行限制与性能调试说明: 当前部署的版本属于完全非生产环境下的沙盒测试程序。开发组正在利用该版本测试高并发环境下的数据读写瓶颈，并评估多个心理咨询模块间的延迟适配情况。在此期间，所有接口、交互面板权限以及底层存储配置均有可能根据调试需求进行重构，以便为后期云端高可用迁移排除架构故障点。",
        "保密与生产豁免权声明: 本系统目前尚未通过萨巴霍德霍德研究所官方的管理授权或商业级合规签署。测试数据及流程逻辑绝不可用于实际财务决算、人事调整或正式评奖依据。所有入驻测试的心理分析师、行政干事及学科专家必须严格保守数据机密，严禁将包含学员名单的表格复制、分发或在公共网络环境中公开分享。"
      ]
    }
  };

  const current = content[lang];

  // =========================================================================
  // STATE 1: COLLAPSED SMALL ORB STATE (PINNED ON THE BOTTOM-LEFT & MINI SIZE)
  // =========================================================================
  if (isCollapsed && hasConfirmed) {
    return (
      <div 
        id="experimental-floating-orb"
        className="fixed bottom-6 left-6 z-50 group pointer-events-auto print:hidden"
        style={{ direction: current.dir as any }}
      >
        {/* Soft warning pulse backdrop glow */}
        <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-400/20 via-cyan-400/20 to-blue-500/20 rounded-full blur-lg group-hover:blur-xl transition-all duration-500 scale-110 leading-none" />
        
        {/* Glowing surrounding orbit track border */}
        <div className="absolute inset-0 bg-transparent rounded-full border border-teal-400/20 animate-spin-slow opacity-60 scale-105 pointer-events-none" />

        {/* Small Elegant Leftwise Trigger Orb (shrunk size & left-aligned as requested) */}
        <button
          onClick={handleLaunchDecree}
          className="relative w-12 h-12 flex items-center justify-center rounded-full bg-slate-900/80 hover:bg-slate-900 text-[#E6EDF6] hover:text-emerald-300 border border-emerald-400/30 hover:border-emerald-400/60 backdrop-blur-3xl shadow-2xl transition-all duration-500 hover:scale-110 active:scale-95 cursor-pointer"
          aria-label={current.tooltipExpand}
          title={current.tooltipExpand}
        >
          <div className="absolute top-0 right-1/4 w-[1px] h-full bg-gradient-to-b from-white/20 to-transparent transform -skew-x-12 opacity-40 group-hover:opacity-100 transition-opacity duration-300" />
          
          <ShieldAlert className="text-emerald-400 group-hover:text-emerald-300 animate-pulse" size={20} />

          {/* Active core flashing ping beacon */}
          <span className="absolute -top-0.5 -left-0.5 w-3 h-3 bg-emerald-500 rounded-full border border-[#020205] flex items-center justify-center shadow-lg">
            <span className="w-1 h-1 bg-white rounded-full animate-ping" />
          </span>
        </button>

        {/* Dynamic info sheet sliding rightwards (since it is placed on the bottom-LEFT, slider moves to the right!) */}
        <div className="absolute bottom-1.5 left-12 ml-3 pointer-events-none opacity-0 -translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 ease-out flex items-center gap-1.5 whitespace-nowrap bg-slate-950/95 border border-white/10 px-3 py-1.5 rounded-xl backdrop-blur-3xl shadow-xl">
          <Terminal size={11} className="text-emerald-400" />
          <span className="text-[10px] font-bold tracking-wider text-[#93A5C4] font-sans">
            {current.collapsedNoticeText}
          </span>
          <span className="text-[9px] text-emerald-400 font-mono bg-emerald-500/15 py-0.5 px-1.5 rounded-md">
            v1.4.0
          </span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STATE 2: FROSTED GLASS MINI-NOTICE DIALOG CARD POPUP (Overlay on First Visit)
  // =========================================================================
  if (isCollapsed && !hasConfirmed) {
    return (
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto print:hidden">
        
        {/* Soft surrounding neon backdrop sphere representation */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-gradient-to-br from-cyan-500/15 to-blue-600/5 rounded-full blur-[90px] mix-blend-screen pointer-events-none animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-gradient-to-tr from-purple-500/10 to-emerald-600/5 rounded-full blur-[90px] mix-blend-screen pointer-events-none" />

        {/* Mini dialogue glassmorphic wrapper */}
        <div 
          className="relative w-full max-w-lg bg-slate-900/80 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 backdrop-blur-3xl shadow-2xl flex flex-col space-y-6 text-[#E6EDF6] animate-fade-in transition-all"
          style={{ direction: current.dir as any }}
        >
          {/* Header area */}
          <div className="flex items-center gap-3.5 border-b border-white/10 pb-4">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 rounded-2xl animate-pulse">
              <ShieldAlert size={22} />
            </div>
            <div>
              <span className="text-[9px] text-emerald-400 font-mono tracking-widest uppercase block">HODHOD SABA OPERATIONAL CODES</span>
              <h3 className="text-base font-black text-white">
                {lang === "fa" ? "اطلاعیه و بازخورد نسخه آزمایشی" : "Experimental Platform Sandbox Notice"}
              </h3>
            </div>
          </div>

          {/* Quick Notice Wording */}
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed text-justify">
            {lang === "fa" 
              ? "کاربر گرامی، این سامانه مدیریت فرآیند ارزیابی در فاز شبیه‌سازی و ارزیابی رفتاری (v1.4.0) قرار دارد. لطفاً جهت کمک به توسعه پایدار و مستندسازی نظرات، میزان رضایت خویش را ثبت کرده و جهت مطالعه عمیق‌تر ضوابط، سند رسمی را کلیک نمایید."
              : "Warning: This platform is deployed inside a regulated technical sandbox (v1.4.0) for evaluation. Please rate your experience to register your audit feedback or access the unified memorandum decree."}
          </p>

          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-4">
            
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-semibold flex items-center gap-1.5">
                <MessageSquare size={13} className="text-emerald-450" />
                <span>{lang === "fa" ? "ثبت نظر و ارزیابی شما" : "Sandbox Visitor Feedback"}</span>
              </span>
              <span className="font-mono text-[10px] text-emerald-400 select-none bg-emerald-500/10 py-0.5 px-2 rounded-md">REQUIRED_AUDIT</span>
            </div>

            {/* Form Fields inside the dialog popup */}
            <form onSubmit={handleSubmitFeedback} className="space-y-4 font-sans text-xs">
              
              {/* Star Rating Selectors */}
              <div className="flex items-center gap-2 bg-black/30 p-2.5 rounded-xl border border-white/5 justify-between">
                <span className="text-slate-400 font-medium">
                  {lang === "fa" ? "میزان رضایت:" : "Rating:"}
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((starVal) => (
                    <button
                      type="button"
                      key={starVal}
                      onClick={() => setRating(starVal)}
                      className="p-1 cursor-pointer transition transform hover:scale-125"
                    >
                      <Star 
                        size={18} 
                        className={starVal <= rating ? "fill-amber-400 text-amber-400" : "text-slate-600"} 
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Visitor Name Field */}
              <input
                type="text"
                placeholder={lang === "fa" ? "نام کامل یا سمت همکار ارجمند" : "Your Name / Organization Title"}
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                className="w-full bg-black/40 text-xs text-white border border-white/10 focus:border-emerald-500/40 outline-none p-2.5 rounded-xl transition"
                required
              />

              {/* Feedback Comment File */}
              <textarea
                placeholder={lang === "fa" ? "نظرات، پیشنهادات یا مشکلات احتمالی..." : "Your suggestions or technical observations..."}
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                className="w-full bg-black/40 text-xs text-white border border-white/10 focus:border-emerald-500/40 outline-none p-2.5 rounded-xl h-20 resize-none transition"
              />

              {feedbackSuccess ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs text-center p-2.5 rounded-xl flex items-center justify-center gap-2">
                  <CheckCircle2 size={14} className="animate-bounce" />
                  <span>{lang === "fa" ? "بازخورد شما با موفقیت ثبت شد. انتقال مستقیم..." : "Feedback recorded. Entering..."}</span>
                </div>
              ) : null}

              {/* Actions Box */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingFeedback || feedbackSuccess}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-40 text-white font-bold py-2.5 px-4 rounded-xl transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-md text-xs"
                >
                  <Send size={13} className="animate-pulse" />
                  <span>{lang === "fa" ? "ثبت نظر و ورود به سامانه" : "Register Opinion & Enter"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleLaunchDecree}
                  className="bg-slate-800 hover:bg-slate-750 border border-white/10 text-[#C7D4E7] hover:text-white font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                >
                  <FileText size={13} className="text-cyan-400" />
                  <span>{lang === "fa" ? "مطالعه بیانیه کامل رسمی" : "Read Full Official Statement"}</span>
                </button>
              </div>

            </form>
          </div>

          <div className="flex items-center justify-between text-[9px] text-[#5F718B] font-mono select-none pt-2 border-t border-white/5">
            <span>MD5_SIGN: HODHOD_SANDBOX_V1</span>
            <div className="flex items-center gap-1 bg-[#121634]/50 py-0.5 px-1.5 rounded-md text-emerald-400">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
              <span>{current.versionLabel}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STATE 3: FULL SCREEN EXALTED ROYAL OFFICIAL DECREE EXPERIENCE
  // =========================================================================
  return (
    <div 
      id="executive-announcement-universe" 
      className={`min-h-screen relative flex flex-col justify-between items-center overflow-x-hidden py-8 px-4 sm:px-6 md:px-12 transition-colors duration-500 select-none ${current.font} ${isDarkMode ? 'bg-[#040409] text-[#E6EDF6]' : 'bg-[#FAF9F5] text-slate-900'}`}
      style={{ direction: current.dir as any }}
    >
      
      {/* 1. PRINTOUT @media COMPATIBLE CSS STYLE OVERRIDES COHESION */}
      <style>{`
        @media print {
          body, #executive-announcement-universe, .min-h-screen {
            background-color: #FFFFFF !important;
            color: #000000 !important;
            font-family: "Times New Roman", "B Nazanin", serif !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print\\:hidden, header, footer, button, .no-print {
            display: none !important;
          }
          #printable-decree-element {
            border: 4px double #000000 !important;
            padding: 2.5cm !important;
            margin: 0 !important;
            box-shadow: none !important;
            background: none !important;
            color: #000000 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            z-index: 999999 !important;
          }
          #print-watermark-official {
            opacity: 0.1 !important;
            color: #000000 !important;
            border: 2px solid #000000 !important;
          }
          .decree-paragraph {
            text-align: justify !important;
            line-height: 1.8 !important;
            font-size: 13pt !important;
            color: #000000 !important;
            margin-bottom: 20px !important;
            text-indent: 1cm !important;
          }
          .decree-header-print {
            display: block !important;
            text-align: center !important;
            margin-bottom: 2cm !important;
            border-bottom: 1px solid #000000 !important;
            padding-bottom: 10px !important;
          }
          .decree-signature-print {
            display: flex !important;
            justify-content: space-between !important;
            margin-top: 3cm !important;
          }
        }
      `}</style>

      {/* 2. REGULATED COSMOS LIGHT ENGINE (Ignored in printable ivory modes) */}
      {isDarkMode && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden print:hidden">
          {/* Deep Grid Backdrop */}
          <div 
            className="absolute inset-0 bg-transparent opacity-25 select-none pointer-events-none transition-transform duration-700 ease-out"
            style={{
              backgroundImage: `
                radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.04) 1px, transparent 0),
                linear-gradient(rgba(255,255,255,0.01) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.01) 1px, transparent 1px)
              `,
              backgroundSize: "24px 24px, 96px 96px, 96px 96px",
              transform: `translate3d(${mousePos.x * 0.1}px, ${mousePos.y * 0.1}px, 0)`
            }}
          />
          {/* Floating Glassmorphic Orb 1 - Aurora Cyan */}
          <div 
            className="absolute top-[6%] left-[12%] w-[480px] h-[480px] bg-gradient-to-tr from-cyan-500/10 to-blue-600/5 rounded-full blur-[110px] mix-blend-screen animate-pulse"
            style={{ transform: `translate3d(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px, 0)` }}
          />
          {/* Floating Glassmorphic Orb 2 - Royal Purple */}
          <div 
            className="absolute bottom-[18%] right-[8%] w-[580px] h-[580px] bg-gradient-to-tr from-purple-600/10 to-teal-600/5 rounded-full blur-[140px] mix-blend-screen"
            style={{ transform: `translate3d(${-mousePos.x * 0.3}px, ${-mousePos.y * 0.3}px, 0)` }}
          />
        </div>
      )}

      {/* 3. ULTIMATE OFFICIAL GLASS HEADER DECK (print:hidden) */}
      <header className={`w-full max-w-6xl z-20 flex flex-col md:flex-row justify-between items-center gap-4 p-4 rounded-2xl border backdrop-blur-3xl shadow-xl mb-12 print:hidden ${isDarkMode ? 'bg-[#0B0F21]/70 border-white/[0.08]' : 'bg-white/80 border-slate-200 shadow-md'}`}>
        
        {/* Brand/Administrative Seal Logo */}
        <div className="flex items-center gap-3.5">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-tr from-yellow-500 via-emerald-500 to-teal-600 rounded-xl blur-lg opacity-40 group-hover:opacity-75 transition duration-500" />
            <div className={`relative p-2.5 rounded-xl shadow-inner border ${isDarkMode ? 'bg-[#0A0D1A] border-white/20 text-emerald-400' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
              <Layers className="animate-spin-slow" size={24} />
            </div>
          </div>
          <div>
            <h1 className={`text-xs font-black tracking-wider uppercase font-sans flex items-center gap-1.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              <span>HODHOD SABA COGNITIVE DIVISION</span>
              <Sparkles size={11} className="text-amber-400 animate-pulse" />
            </h1>
            <p className="text-[9px] text-[#5F718B] font-mono tracking-widest uppercase mt-0.5">
              Secure Operations Sandbox Memorandum
            </p>
          </div>
        </div>

        {/* High-End Diagnostic Info Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider relative overflow-hidden flex items-center gap-1.5 shadow-sm border ${isDarkMode ? 'bg-emerald-500/10 border-emerald-400/35 text-emerald-400' : 'bg-emerald-500/5 border-emerald-400/20 text-emerald-800'}`}>
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
            {current.badgeExperimental}
          </span>

          <span className={`text-[9px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider border ${isDarkMode ? 'bg-amber-500/10 border-amber-400/25 text-amber-300' : 'bg-amber-500/5 border-amber-400/20 text-amber-800'}`}>
            {current.badgePrivate}
          </span>

          <span className={`text-[9px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider border animate-pulse ${isDarkMode ? 'bg-rose-500/10 border-rose-500/25 text-rose-450' : 'bg-rose-500/5 border-rose-500/20 text-rose-800'}`}>
            {current.badgeNoPublic}
          </span>

          <span className={`text-[9px] font-mono px-2.5 py-1 rounded-lg border ${isDarkMode ? 'bg-white/5 border-white/10 text-white/60' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
            {current.versionLabel}
          </span>
        </div>

        {/* Interactive Controls Bar: Theme Toggle + Language + Print */}
        <div className="flex items-center gap-2">
          
          {/* Print Button */}
          <button
            onClick={() => window.print()}
            title="چاپ باکیفیت استاندارد اداری"
            className={`p-2.5 rounded-xl border transition-all active:scale-90 cursor-pointer flex items-center justify-center ${isDarkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'}`}
          >
            <Printer size={15} />
          </button>

          {/* Theme Switcher Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={isDarkMode ? "تغییر به پوسته روشن" : "تغییر به پوسته تیره"}
            className={`p-2.5 rounded-xl border transition-all active:scale-90 cursor-pointer flex items-center justify-center ${isDarkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'}`}
          >
            {isDarkMode ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-slate-800" />}
          </button>

          {/* Language select cards */}
          <div className="flex items-center gap-0.5 bg-black/40 p-0.5 rounded-xl border border-white/10 backdrop-blur-2xl">
            {(["fa", "en", "zh"] as LangType[]).map((ln) => (
              <button
                key={ln}
                onClick={() => setLang(ln)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${lang === ln ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md font-black scale-[1.03]' : 'text-slate-400 hover:text-white'}`}
              >
                {ln === "fa" ? "فارس" : ln === "en" ? "EN" : "中"}
              </button>
            ))}
          </div>

        </div>

      </header>

      {/* 4. CHANCE GALAXY TITLES (print:hidden) */}
      <section className="w-full max-w-6xl z-10 text-center mb-10 px-2 relative print:hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className={`inline-flex items-center gap-2 px-3.5 py-1 border rounded-full text-xs font-semibold mb-6 shadow-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-cyan-300' : 'bg-[#FAF1D6]/70 border-amber-300/40 text-amber-800'}`}>
          <Calendar size={13} className="text-amber-500 animate-pulse animate-spin-slow" />
          <span>{lang === "fa" ? "تاریخ انتشار رسمی سند: مرداد ۱۴۰۵" : "Memorandum Release: August 2026"}</span>
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black leading-tight tracking-tight drop-shadow-2xl">
          <span className={isDarkMode ? 'bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent' : 'text-slate-900'}>
            {current.title}
          </span>
        </h2>
        
        <p className={`text-xs sm:text-sm max-w-3xl mx-auto mt-4 leading-relaxed font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          {current.subHeader}
        </p>

        {/* Double-layered glowing separator */}
        <div className="flex justify-center items-center gap-3 mt-6">
          <div className="w-16 h-[1px] bg-gradient-to-r from-transparent to-amber-500/50" />
          <Star size={12} className="text-amber-400 animate-pulse" />
          <div className="w-16 h-[1px] bg-gradient-to-l from-transparent to-amber-500/50" />
        </div>
      </section>

      {/* 5. MAIN INTEGRATED DECREE DOCUMENT (Perfect administrative paper design & fully printable!) */}
      <main className="w-full max-w-4xl z-10 space-y-10 mb-12 relative">
        
        <article 
          id="printable-decree-element"
          className={`relative overflow-hidden rounded-3xl border transition-all duration-300 shadow-2xl p-6 sm:p-10 md:p-12 ${isDarkMode ? 'bg-gradient-to-b from-[#0B0E1E] to-[#05060D] border-white/10' : 'bg-white border-slate-300 text-slate-900 border-2 shadow-lg'}`}
          style={{ direction: current.dir as any }}
        >
          
          {/* A4 PRINT HEADINGS ONLY SHOWN ON PHYSICAL PAPER PRINT */}
          <div className="hidden print:block decree-header-print font-sans text-center border-b-2 border-black pb-4 mb-8">
            <h2 className="text-xl font-bold tracking-widest uppercase">موسسه فرهنگی آموزشی هدهد صبا</h2>
            <p className="text-xs font-semibold mt-1">سامانه جامع نظارت و هوشمندسازی فرآیندهای تحلیل کلامی (فاحم)</p>
            <div className="flex justify-between text-[11px] font-mono mt-4">
              <span>طبقه بندی: سند ارزیابی آزمایشی محرمانه</span>
              <span>تاریخ ابلاغ: سال ۱۴۰۵ هجری شمسی</span>
              <span>ویرایش: v1.4.0</span>
            </div>
          </div>

          {/* Luxury Watermark Seal Representation in administrative background */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none z-0">
            <div id="print-watermark-official" className="rounded-full border-8 border-cyan-400 p-24 text-center transform -rotate-12">
              <h1 className="text-5xl font-black tracking-widest leading-none font-sans">هدهد صبا</h1>
              <p className="text-sm font-bold uppercase mt-2">مهر رسمی نسخه آزمایشی</p>
            </div>
          </div>

          <div className="relative z-10 space-y-8 font-sans">
            
            {/* Header Title inside article */}
            <div className="flex items-center gap-3 border-b pb-4 border-dashed border-slate-200/20">
              <div className="p-2 bg-amber-500/15 text-amber-500 border border-amber-400/20 rounded-xl">
                <FileText size={20} />
              </div>
              <div>
                <h3 className={`text-base sm:text-lg font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                  {current.unfiedDecreeHeader}
                </h3>
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">ADMINISTRATIVE OFFICIAL MEMO</span>
              </div>
            </div>

            {/* INTEGRATED FULL TEXT DECREE FLOW (One comprehensive continuous piece as requested!) */}
            <div className="space-y-6 text-sm sm:text-base leading-relaxed text-justify">
              
              {current.fullDecreeText.map((paragraph, index) => {
                const isHeading = index === 0 || paragraph.includes(":") || paragraph.startsWith("به");
                return (
                  <p 
                    key={index} 
                    className={`decree-paragraph transition-all duration-200 border-r-4 pr-4 border-transparent pl-2 ${
                      index === 0 
                      ? 'text-center text-lg font-black text-amber-400' 
                      : isDarkMode 
                        ? 'text-slate-200 hover:text-white hover:border-amber-400/30' 
                        : 'text-slate-800 hover:border-amber-500/60'
                    }`}
                  >
                    {paragraph}
                  </p>
                );
              })}

            </div>

            {/* Warn Panel & Special conditions bundled into the administrative layout */}
            <div className={`rounded-2xl p-5 border ${isDarkMode ? 'bg-[#180A0E]/60 border-red-500/20 text-slate-300' : 'bg-red-500/[0.02] border-red-200 text-slate-800'}`}>
              <div className="flex items-center gap-2 border-b pb-2 mb-3 border-red-500/10">
                <ShieldAlert className="text-red-500" size={16} />
                <h4 className="text-xs font-black text-red-500">{current.warningTitle}</h4>
              </div>
              <ul className="space-y-2 text-xs list-disc pr-4 pl-2 leading-relaxed">
                <li>{current.warningItem1}</li>
                <li>{current.warningItem2}</li>
                <li>{current.warningItem3}</li>
                <li>{current.warningItem4}</li>
              </ul>
            </div>

            {/* Environmental notice section */}
            <div className={`p-4 rounded-xl border text-xs leading-relaxed text-justify ${isDarkMode ? 'bg-[#0E1225]/40 border-cyan-500/10' : 'bg-slate-50 border-slate-200'}`}>
              <span className="font-extrabold text-cyan-500 block mb-1">{current.conditionsTitle}</span>
              <p className="opacity-95">{current.conditionsDetail}</p>
            </div>

            {/* DEVELOPER SIGNATURE DECK FOR ADMINISTRATIVE VERBAL BINDING */}
            <div className="pt-8 border-t border-slate-200/10 flex flex-col sm:flex-row justify-between items-center gap-6 decree-signature-print">
              
              {/* Creator details */}
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full border flex items-center justify-center relative ${isDarkMode ? 'bg-[#040611] border-white/20' : 'bg-slate-100 border-slate-200'}`}>
                  <User size={20} className="text-amber-500" />
                </div>
                <div>
                  <h4 className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{current.developerName}</h4>
                  <p className="text-[10px] text-slate-500 font-semibold">{current.developerRole}</p>
                </div>
              </div>

              {/* Digital signature stamp space */}
              <div className="text-center sm:text-left">
                <span className="text-[8px] text-slate-500 tracking-wider font-mono block uppercase">DIG_VERIFIED_MEMORANDUM_CAPITAL_KEY</span>
                <span className="font-mono text-xs italic font-extrabold text-[#7A8C9E] block mt-1 tracking-wider">
                  SIGNED // {current.signatureText}
                </span>
                <span className="text-[8px] text-[#A6C0D9]/40 font-mono block">1405-HODHOD-COGNITIVE-DECREE-AUTH_OK</span>
              </div>

            </div>

          </div>

        </article>

      </main>

      {/* 6. PROCEED TO SAMANAH WORKSPACE ACTIONS (print:hidden) */}
      <section className="w-full max-w-4xl z-10 flex flex-col sm:flex-row items-center justify-center p-4 gap-4 print:hidden">
        
        {/* Print Decree Action Button */}
        <button
          onClick={() => window.print()}
          className="px-6 py-4 bg-slate-750 hover:bg-slate-700 text-white font-extrabold rounded-2xl transition duration-200 text-xs sm:text-sm border border-white/10 active:scale-95 flex items-center gap-2 cursor-pointer shadow-lg"
        >
          <Printer size={16} className="text-amber-400 animate-pulse" />
          <span>{lang === "fa" ? "🖨️ چاپ باکیفیت نسخه رسمی بیانیه" : "Print Official Corporate Memorandum"}</span>
        </button>

        {/* Proceed Entry button */}
        <button
          onClick={handleDismissNotice}
          className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black rounded-2xl transition duration-200 text-xs sm:text-sm shadow-xl active:scale-95 flex items-center gap-2 cursor-pointer hover:shadow-emerald-500/10"
        >
          <CheckCircle2 size={16} className="animate-bounce" />
          <span>{current.ctaEnterButton}</span>
          {current.dir === "rtl" ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
        </button>

      </section>

      {/* 7. HIGH-CLASS ADMINISTRATIVE FOOTER (print:hidden) */}
      <footer className="w-full max-w-6xl z-20 border-t pt-8 pb-4 text-center mt-auto space-y-4 print:hidden border-slate-200/10">
        <p className="text-[10px] opacity-70 block max-w-4xl mx-auto leading-relaxed">
          {current.footerNotApproved}
        </p>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] text-[#5F718B] font-mono border-t pt-4 border-slate-200/10">
          <div>
            <span>{current.footerInstitution}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>PREVIEW_LEVEL: VERBOSE_CLASSIFIED</span>
            <span>•</span>
            <span className="text-amber-500">{current.versionLabel}</span>
          </div>
          <div>
            <span>{current.footerTitle}</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
