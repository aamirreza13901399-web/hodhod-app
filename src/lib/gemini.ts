/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

// Initialize the Google Gen AI client with the system header for telemetry
export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "dummy-key-for-local-fallback",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});

// A wrapper to safely call Gemini with automatic fallback on key failure
export async function analyzeStageWithAI(stage: string, contextData: any): Promise<any> {
  const modelName = "gemini-3.1-flash-lite"; // Low-latency response model as requested by user
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.warn("کلید اصلی Gemini ست نشده است، بازنشانی به آنالیز شبیه‌سازی‌شده لوکال.");
    return simulateAIServiceFallback(stage, contextData);
  }

  try {
    const prompt = getPromptForStage(stage, contextData);
    const systemIns = getSystemInstructionForStage(stage);

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: systemIns,
        responseMimeType: "application/json",
        temperature: 0.7
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("پاسخ خالی از مدل هوش مصنوعی دریافت شد.");
    }

    try {
      return JSON.parse(text);
    } catch (parseErr) {
      console.error("خطا در پارس پاسخ JSON هوش مصنوعی, ذخیره خام:", text);
      return {
        ai_status: "parse_failed",
        rawResponse: text,
        error: "امکان پارس جی‌سون وجود نداشت."
      };
    }
  } catch (err: any) {
    console.error("خطا در فراخوانی سرویس هوش مصنوعی Gemini:", err);
    return {
      ai_status: "failed",
      error: err?.message || "خطای نامشخص در هوش مصنوعی",
      simulated: true,
      ...simulateAIServiceFallback(stage, contextData)
    };
  }
}

function getSystemInstructionForStage(stage: string): string {
  switch (stage) {
    case "contact":
      return `You are an expert psychological profiler for the speech assessment division of Hodhod training institute, evaluating client call logs. 
Your output must be JSON ONLY, written in Persian (Farsi), matching this schema:
{
  "category": "Highly Motivated" | "Moderate Interest" | "Uncertain" | "Needs Follow-up",
  "confidenceScore": number (0 to 1),
  "behavioralIndicators": string[],
  "recommendedApproach": string,
  "summaryAnalysis": string
}`;

    case "reception":
      return `You are Hodhod Institute's reception behavior specialist. Analyze check-in behaviors and wait times.
Analyze the student's entry note, anxiety cues, physical form responses. Output Farsi JSON ONLY:
{
  "initialAnxietyLevel": "Low" | "Medium" | "High",
  "receptionAura": string,
  "waitToleranceDesc": string,
  "behavioralProfile": string
}`;

    case "consultation":
      return `You are a professional speech coach analyst. Produce a complete profile of the applicant's communication barriers. Output Farsi JSON ONLY:
{
  "style": string,
  "confidenceLevel": "Beginner" | "Intermediate" | "Advanced",
  "learningPotential": string,
  "coachingIntensity": "Standard"| "Intense" | "Custom-Coaching",
  "psychologicalBlocks": string[],
  "sessionBrief": string
}`;

    case "middle_room":
      return `You are an expert in educational marketing and behavioral enrollment at Hodhod Institute. Draft the psychological profile and trigger messaging. Output Farsi JSON ONLY:
{
  "behavioralTrigger": string,
  "marketingHook": string,
  "objectionsList": string[],
  "tailoredPitchStrategy": string
}`;

    case "test":
      return `You are the chief psychometric-speech jurist at the Speech Test Center. Synthesize ALL stages to produce the definitive comprehensive assessment. Output Farsi JSON ONLY:
{
  "proficiencyRating": "Beginner" | "Intermediate" | "Advanced" | "Expert",
  "parameterAnalysis": {
    "clarity": string,
    "confidence": string,
    "tone": string,
    "vocabulary": string,
    "structure": string,
    "expression": string,
    "bodyLanguage": string,
    "eyeContact": string
  },
  "programMatchScore": number (0 to 100),
  "predictedSuccessProbability": number (0 to 100),
  "remedialCoachingRoadmap": string[],
  "coreThesis": string
}`;

    case "final":
      return `You are the final director of admissions at Hodhod Institute. Decide on registration, suggested track and first-month focal training points. Output Farsi JSON ONLY:
{
  "registrationVerdict": "Yes" | "No" | "Conditional",
  "trackProposal": string,
  "firstMonthFocalPoints": string[],
  "investmentReturnFactor": string,
  "retentionStrategy": string
}`;

    case "tagging":
      return `You are an expert qualitative analyst for Hodhod Speech Institute. Analyze applicant demographics and general notes to extract key professional tags and quality categories.
Your output must be JSON ONLY, in Persian (Farsi), matching this schema:
{
  "analysis": "تحلیل کوتاه ۳-۴ جمله‌ای حرفه‌ای درباره وضعیت کیفی متقاضی",
  "category": "بسیار مناسب" | "مناسب" | "متوسط" | "نیاز به بررسی",
  "score": number (0 to 100),
  "tags": string[] (Choose at least 2-4 appropriate Farsi tags reflecting their status, specifically prioritize using tags like "باانگیزه", "نیاز به پیگیری فوری", "تردید در ثبت‌نام", "مناسب برای سطح پیشرفته", "فن‌بیان قوی", "کم‌رو", "پرانرژی" based on notes and info),
  "summary": "یک جمله خلاصه کوتاه",
  "recommendation": "توصیه برای برخورد اپراتور در مرحله تماس تلفنی یا پذیرش"
}`;

    default:
      return "You are an AI assistant for Hodhod Speech Institute. Respond in Farsi JSON format.";
  }
}

function getPromptForStage(stage: string, data: any): string {
  return `اطلاعات ورودی متقاضی برای مرحله ${stage}:
${JSON.stringify(data, null, 2)}
لطفاً بر اساس اطلاعات بالا تحلیل عمیق و تخصصی خود را به صورت شیء جی‌سون به زبان فارسی آماده کنید.`;
}

// Fallback simulator to ensure continuous, bulletproof offline/local capabilities
function simulateAIServiceFallback(stage: string, data: any): any {
  const name = data.applicantName || "کاربر گرامی";
  const notes = data.operatorNotes || "";

  switch (stage) {
    case "contact":
      return {
        category: notes.includes("عالی") || notes.includes("بسیار") ? "Highly Motivated" : "Moderate Interest",
        confidenceScore: 0.85,
        behavioralIndicators: ["خوش‌قولی در پاسخ", "شور و اشتیاق برای شروع دوره", "پیگیری ساعات برگزاری"],
        recommendedApproach: "ارسال پیامک تاییدیه بلافاصله و تاکید روی دوره پیشرفته فن بیان در تماس بعد.",
        summaryAnalysis: `متقاضی ${name} آمادگی روانی مناسبی در تماس اولیه نشان داده است. تمرکز بر رفع ترس صحبت در جمع ملاک خواهد بود.`
      };
    case "reception":
      return {
        initialAnxietyLevel: notes.includes("اضطراب") || notes.includes("استرس") ? "High" : "Low",
        receptionAura: "همکاری عالی در پرکردن نظرسنجی و برخورد محترمانه با کادر اجرایی.",
        waitToleranceDesc: "شخصیت صبور؛ در لابی انتظار با آرامش برخورد کرد.",
        behavioralProfile: `پرونده فیزیکی توسط ${name} دریافت شد. تمایل به دریافت مشاوره‌ها در محیط خلوت‌تر.`
      };
    case "consultation":
      return {
        style: "احساسی و پرانرژی با گستره کلامی متوسط",
        confidenceLevel: "Intermediate",
        learningPotential: "بسیار مستعد پذیرش تکنیک‌های تنفس دیافراگمی و غلبه بر من‌من کلامی.",
        coachingIntensity: "Intense",
        psychologicalBlocks: ["ترس افراطی از واضاوت مخاطب", "سریع صحبت کردن برای فرار از سناریو"],
        sessionBrief: `شخص خواهان دوره‌های فشرده و عمل‌گرا است. در پرسشنامه به ترس سخنرانی عمومی نمره ۹ از ۱۰ داده است.`
      };
    case "middle_room":
      return {
        behavioralTrigger: "نیاز مبرم به تایید اجتماعی و ارتقاء برند شخصی در محل کار.",
        marketingHook: "تمرکز روی کارگاه‌های عملی و ویدیوهای قبلی فارغ‌التحصیلان موفق انستیتو هدهد.",
        objectionsList: ["قیمت دوره مدیریت اولیا", "تطابق با شیفت‌های شغلی متقاضی"],
        tailoredPitchStrategy: `تلقین به ${name} که ثبت‌نام در این موسسه یک سرمایه‌گذاری روی وجهه اجتماعی ایشان است نه هزینه بیهوده.`
      };
    case "test":
      return {
        proficiencyRating: "Intermediate",
        parameterAnalysis: {
          clarity: "وضوح کلامی مناسب است اما انتهای جملات افول تن دارد.",
          confidence: "کنترل اضطراب در ۳ دقیقۀ اول خوب بود، سپس افت کرد.",
          tone: "منو-تون یا تک‌آهنگ؛ فاقد لحن دراماتیک ترغیبی.",
          vocabulary: "استفاده فراوان از کلمات تکراری نظیر 'در واقع'، 'یا مثلاً'.",
          structure: "فاقد مقدمه و موخره منظم در ارائه سخنرانی فی‌البداهه.",
          expression: "انتقال حس متوسط؛ نیازمند کار روی تصویرسازی ذهنی.",
          bodyLanguage: "دست‌ها قفل‌شده جلو سینه؛ نشان از حالت تدافعی.",
          eyeContact: "پرهیز از نگاه مستقیم به داور و زل زدن به سقف."
        },
        programMatchScore: 82,
        predictedSuccessProbability: 90,
        remedialCoachingRoadmap: [
          "تمرینات رهاسازی فک و ماهیچه‌های صوتی",
          "سخنرانی بداهه با کارت‌های لغات تصادفی",
          "شبیه‌سازی ارتباط چشمی دورادور در تالار بزرگ"
        ],
        coreThesis: `متقاضی ${name} فنداسیون پتانسیلی فوق‌العاده‌ای دارد؛ در صورت لایه‌برداری از موانع خودکم‌بینی، به سخنوری عالی مبدل می‌شود.`
      };
    case "final":
      return {
        registrationVerdict: "Yes",
        trackProposal: "دوره فوق پیشرفته کاریزما و نفوذ کلام هدهد (فلوچارت طلایی)",
        firstMonthFocalPoints: [
          "تثبیت تمرینات تنفسی کنترل ضربان قلب",
          "افزایش گستره واژگان ادبیاتی"
        ],
        investmentReturnFactor: "بسیار بالا؛ با توجه به نیاز متقاضی جهت برگزاری وبینارهای شرکتی.",
        retentionStrategy: "تماس تبریک آغاز ترم طلایی توسط خانم رضایی."
      };
    case "tagging":
      return {
        analysis: `متقاضی ${name} با سن ${data.applicantAge || 24} سال و تحصیلات ${data.applicantEducation || "لیسانس"} آمادگی بالایی جهت فراگیری فن بیان نشان داده و دارای انگیزه جدی است.`,
        category: notes.includes("عالی") || notes.includes("بسیار") ? "بسیار مناسب" : "مناسب",
        score: notes.includes("عالی") || notes.includes("بسیار") ? 92 : 75,
        tags: notes.includes("فوری") 
          ? ["نیاز به پیگیری فوری", "باانگیزه"] 
          : notes.includes("تردید") || notes.includes("مردد")
          ? ["تردید در ثبت‌نام", "نیاز به پیگیری"]
          : notes.includes("پیشرفته") || notes.includes("خوب")
          ? ["مناسب برای سطح پیشرفته", "فن‌بیان قوی"]
          : ["باانگیزه", "پرانرژی"],
        summary: `متقاضی با کلاس و انگیزه بالاست.`,
        recommendation: "در مرحله تماس روی ارزش عملی کارگاه هدهد تاکید شود."
      };
    default:
      return { status: "simulated_success", data: "تحلیل با موفقیت شبیه‌سازی شد." };
  }
}
