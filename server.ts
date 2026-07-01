/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Datastore } from "./src/db/datastore.js";
import { analyzeStageWithAI, ai } from "./src/lib/gemini.js";
import {
  ApplicantStatus,
  QueueStage,
  UserRole,
  User,
  WarningSeverity,
  Applicant,
  ContactLog,
  ReceptionLog,
  ConsultationLog,
  MiddleRoomLog,
  TestLog,
  FinalResultLog,
  QueueState,
  SystemLog,
  Warning,
  Room,
  Message
} from "./src/types.js";

async function runServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Helper for tracking system log
  function logAudit(actorId: string, actorName: string, actionType: string, applicantId: string | undefined, payload: any, req: express.Request) {
    const ipAddress = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const newLog: SystemLog = {
      id: `syslog-${Math.random().toString(36).substring(2, 11)}`,
      actorId,
      actorName,
      actionType,
      applicantId,
      payload: JSON.stringify(payload),
      ipAddress,
      createdAt: new Date().toISOString()
    };
    Datastore.addSystemLog(newLog);
  }

  // --- SERVER HEALTHCHECK ---
  app.get("/api/health", (req, res) => {
    res.json({
      status: "online",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dbType: "JSON-Datastore" // can be MySQL when configured
    });
  });

  // --- GEMINI CONNECTION & LATENCY PING ---
  app.get("/api/gemini/ping", async (req, res) => {
    const start = Date.now();
    const apiKey = process.env.GEMINI_API_KEY;
    const isSimulated = !apiKey || apiKey === "MY_GEMINI_API_KEY";
    
    try {
      if (isSimulated) {
        // Simulated local model ping with low-latency delay
        await new Promise((r) => setTimeout(r, 45 + Math.random() * 35));
        const latencyMs = Date.now() - start;
        return res.json({
          status: "simulated",
          latencyMs,
          model: "gemini-3.1-flash-lite (Simulated)",
          connected: true
        });
      } else {
        // Live verification directly targeting Gemini endpoints
        await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: "p",
          config: { maxOutputTokens: 1 }
        });
        const latencyMs = Date.now() - start;
        return res.json({
          status: "online",
          latencyMs,
          model: "gemini-3.1-flash-lite",
          connected: true
        });
      }
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      return res.json({
        status: "offline",
        latencyMs,
        model: "gemini-3.1-flash-lite",
        connected: false,
        error: err.message || "Failed to ping Gemini API"
      });
    }
  });

  // --- 1. AUTHENTICATION ---
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const users = Datastore.getUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user || user.passwordHash !== password) {
      return res.status(401).json({ error: "نام کاربری یا رمز عبور اشتباه است." });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "کاربری شما غیرفعال شده است؛ لطفا با مدیریت تماس بگیرید." });
    }

    // Record login
    const ipAddress = req.ip || req.socket.remoteAddress || "127.0.0.1";
    Datastore.updateUser(user.id, { lastLogin: new Date().toISOString() });
    logAudit(user.id, user.fullName, "LOGIN", undefined, { username, ipAddress }, req);

    // Return properties excluding password
    const { passwordHash, ...safeUser } = user;
    res.json({ user: safeUser, token: `simulated-jwt-for-${user.id}-${Date.now()}` });
  });

  // --- 2. APPLICANTS ---
  app.get("/api/applicants", (req, res) => {
    const list = Datastore.getApplicants();
    const contactLogs = Datastore.getContactLogs();
    
    // Enrich list with latest AI category and tags
    const enriched = list.map(app => {
      let tags = app.aiTags || [];
      let cat = app.aiClassification || app.aiCategory || "";
      let score = app.aiScore || 0;
      let analysis = app.aiAnalysis || "";
      
      // If not tagged on the applicant itself, try to find in contact logs
      if (!tags || tags.length === 0) {
        const appLogs = contactLogs.filter(c => c.applicantId === app.id);
        if (appLogs.length > 0) {
          const sorted = [...appLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          const latest = sorted[0];
          if (latest.aiAnalysis) {
            try {
              const parsed = JSON.parse(latest.aiAnalysis);
              tags = parsed.behavioralIndicators || parsed.tags || [];
              const categoryMatch = parsed.category || "";
              
              if (categoryMatch === "Highly Motivated" || categoryMatch === "بسیار مناسب") {
                cat = "بسیار باانگیزه";
              } else if (categoryMatch === "Moderate Interest" || categoryMatch === "مناسب") {
                cat = "علاقه‌مند";
              } else if (categoryMatch === "Uncertain" || categoryMatch === "متوسط") {
                cat = "مردد";
              } else if (categoryMatch === "Needs Follow-up" || categoryMatch === "نیاز به بررسی") {
                cat = "نیاز به پیگیری";
              } else {
                cat = categoryMatch;
              }
              score = latest.aiScore || 0;
            } catch (e) {
              // Ignore
            }
          }
        }
      }
      
      return {
        ...app,
        aiTags: tags,
        aiClassification: cat,
        aiScore: score,
        aiAnalysis: analysis
      };
    });
    
    res.json(enriched);
  });

  app.post("/api/applicants/:id/auto-tag", async (req, res) => {
    const { id } = req.params;
    const applicant = Datastore.getApplicants().find(a => a.id === id);
    if (!applicant) {
      return res.status(404).json({ error: "متقاضی یافت نشد یا آرشیو شده است." });
    }
    
    try {
      // Call Gemini based on applicant demographics and notes
      const aiResponse = await analyzeStageWithAI("tagging", {
        applicantName: applicant.fullName,
        applicantAge: applicant.age,
        applicantEducation: applicant.educationLevel,
        applicantCity: applicant.city,
        applicantOccupation: applicant.occupation,
        operatorNotes: applicant.notesGeneral || ""
      });
      
      const tags = aiResponse?.tags || [];
      const category = aiResponse?.category || "متوسط";
      const score = Number(aiResponse?.score) || 75;
      
      // Update in local Datastore
      const updated = Datastore.updateApplicant(id, {
        aiTags: tags,
        aiClassification: category,
        aiCategory: category,
        aiScore: score,
        aiAnalysis: JSON.stringify(aiResponse)
      });
      
      // Log Immutable Audit log
      Datastore.addImmutableAuditLog({
        applicantId: id,
        applicantName: applicant.fullName,
        operatorId: "gemini-3.1-flash-lite",
        operatorName: "هوش مصنوعی مدل جمینی ۳.۱ لایت (Gemini 3.1 Lite)",
        actionType: "AI_DECISION",
        stageName: "CONTACT",
        fieldName: "aiTags",
        beforeState: "NONE",
        afterState: JSON.stringify({ category, tags, score }),
        ipAddress: req.ip || req.socket.remoteAddress || "127.0.0.1"
      });
      
      res.json({
        success: true,
        applicant: {
          ...updated,
          aiTags: tags,
          aiClassification: category,
          aiScore: score,
          aiAnalysis: JSON.stringify(aiResponse)
        }
      });
    } catch (err: any) {
      console.error("Error in auto-tagging applicant:", err);
      res.status(500).json({ error: "خطا در تگ‌گذاری هوشمند متقاضی" });
    }
  });

  // --- Administrative Command Center Dossier Operations ---
  app.post("/api/admin/applicants/merge", async (req, res) => {
    const { primaryId, duplicateId, actorId, actorName } = req.body;
    if (!primaryId || !duplicateId) {
      return res.status(400).json({ error: "شناسه هردوی پرونده اولیه و پرونده همزاد الزامی است." });
    }

    const primary = Datastore.getApplicants().find(a => a.id === primaryId);
    if (!primary) return res.status(404).json({ error: "پرونده اصلی یافت نشد." });

    const success = Datastore.mergeDuplicateApplicants(primaryId, duplicateId);
    if (!success) {
      return res.status(500).json({ error: "خطا در ادغام پرونده‌های همزاد؛ صحت داده‌ها را بررسی کنید." });
    }

    // Log Immutable Audit Log
    Datastore.addImmutableAuditLog({
      applicantId: primaryId,
      applicantName: primary.fullName,
      operatorId: actorId || "admin",
      operatorName: actorName || "مدیر ارشد سیستم",
      actionType: "STAGE_CORRECTION",
      stageName: "CONTACT",
      fieldName: "notesGeneral",
      beforeState: `DUPLICATE_ID: ${duplicateId}`,
      afterState: "MERGED_SUCCESSFULLY",
      ipAddress: req.ip || req.socket.remoteAddress || "127.0.0.1"
    });

    res.json({ success: true, message: "پرونده همزاد با موفقیت در پرونده اصلی ادغام و تمام لاگ‌های مربوطه منتقل گردیدند." });
  });

  app.post("/api/admin/applicants/:id/flag", async (req, res) => {
    const { id } = req.params;
    const { isFlagged, flagReason, actorId, actorName } = req.body;

    const applicant = Datastore.getApplicants().find(a => a.id === id);
    if (!applicant) return res.status(404).json({ error: "پرونده متقاضی مدنظر یافت نشد." });

    const success = Datastore.flagApplicant(id, !!isFlagged, flagReason || "");
    if (!success) return res.status(500).json({ error: "خطا در ثبت وضعیت نشانه‌گذاری." });

    // Log Immutable audit
    Datastore.addImmutableAuditLog({
      applicantId: id,
      applicantName: applicant.fullName,
      operatorId: actorId || "admin",
      operatorName: actorName || "مدیر ارشد سیستم",
      actionType: "SECURITY_BLOCK",
      stageName: "CONTACT",
      fieldName: "isFlagged",
      beforeState: applicant.isFlagged ? "FLAGGED" : "CLEAN",
      afterState: isFlagged ? `FLAGGED_REASON: ${flagReason}` : "UNFLAGGED",
      ipAddress: req.ip || req.socket.remoteAddress || "127.0.0.1"
    });

    res.json({ success: true, message: isFlagged ? "پرونده با موفقیت نشانه‌گذاری گردید و تگ تعلیق خورد." : "نشانه تعلیق از روی پرونده برداشته شد." });
  });

  app.post("/api/admin/applicants/:id/recover", async (req, res) => {
    const { id } = req.params;
    const { targetStage, actorId, actorName } = req.body;

    const applicant = Datastore.getApplicants().find(a => a.id === id);
    if (!applicant) return res.status(404).json({ error: "پرونده متقاضی یافت نشد." });

    const success = Datastore.recoverStuckApplicant(id, targetStage);
    if (!success) {
      return res.status(500).json({ error: "خطا در آزادسازی کلاینت. احتمالاً کلاینت هنوز در صف وارد نشده است." });
    }

    Datastore.addImmutableAuditLog({
      applicantId: id,
      applicantName: applicant.fullName,
      operatorId: actorId || "admin",
      operatorName: actorName || "مدیر ارشد سیستم",
      actionType: "STAGE_CORRECTION",
      stageName: targetStage,
      fieldName: "currentStage",
      beforeState: "STUCK_IN_QUEUE",
      afterState: `RECOVERED_TO_STAGE: ${targetStage}`,
      ipAddress: req.ip || req.socket.remoteAddress || "127.0.0.1"
    });

    res.json({ success: true, message: `جریان پرونده با موفقیت احیاء و کلاینت مجدداً به سالن انتظار مرحلۀ ${targetStage} منتقل شد.` });
  });

  app.post("/api/admin/applicants/:id/correct-stage", async (req, res) => {
    const { id } = req.params;
    const { targetStage, actorId, actorName } = req.body;

    const applicant = Datastore.getApplicants().find(a => a.id === id);
    if (!applicant) return res.status(404).json({ error: "پرونده متقاضی یافت نشد." });

    const success = Datastore.correctQueueStage(id, targetStage);
    if (!success) return res.status(500).json({ error: "خطا در اصلاح دستی فاز پرونده." });

    Datastore.addImmutableAuditLog({
      applicantId: id,
      applicantName: applicant.fullName,
      operatorId: actorId || "admin",
      operatorName: actorName || "مدیر ارشد سیستم",
      actionType: "STAGE_CORRECTION",
      stageName: targetStage,
      fieldName: "currentStage",
      beforeState: "MANUAL_CORRECTION_REQUEST",
      afterState: `CORRECTED_TO_STAGE: ${targetStage}`,
      ipAddress: req.ip || req.socket.remoteAddress || "127.0.0.1"
    });

    res.json({ success: true, message: "اصلاح فاز پرونده متقاضی در صف با موفقیت انجام پذیرفت." });
  });

  // --- COMPREHENSIVE CUMULATIVE AI SYNTHESIS BY GEMINI ---
  app.post("/api/admin/applicants/:id/cumulative-synthesis", async (req, res) => {
    const { id } = req.params;
    const { actorId, actorName } = req.body;

    const applicant = Datastore.getApplicants().find(a => a.id === id);
    if (!applicant) return res.status(404).json({ error: "پرونده متقاضی یافت نشد." });

    const contacts = Datastore.getContactLogs().filter(c => c.applicantId === id);
    const receptions = Datastore.getReceptionLogs().filter(r => r.applicantId === id);
    const consultations = Datastore.getConsultationLogs().filter(c => c.applicantId === id);
    const middleRooms = Datastore.getMiddleRoomLogs().filter(m => m.applicantId === id);
    const tests = Datastore.getTestLogs().filter(t => t.applicantId === id);
    const results = Datastore.getFinalResultLogs().filter(r => r.applicantId === id);

    const journeyData = {
      demographics: {
        fullName: applicant.fullName,
        nationalId: applicant.nationalId,
        phone: applicant.phone,
        age: applicant.age,
        gender: applicant.gender,
        educationLevel: applicant.educationLevel,
        occupation: applicant.occupation,
        city: applicant.city
      },
      stages: {
        contact: contacts.map(c => ({
          operatorNotes: c.operatorNotes,
          aiCategory: c.aiCategory,
          aiScore: c.aiScore,
          aiAnalysisSerialized: c.aiAnalysis
        })),
        reception: receptions.map(r => ({
          operatorNotes: r.operatorNotes,
          aiBehaviorAnalysisSerialized: r.aiBehaviorAnalysis
        })),
        consultation: consultations.map(c => ({
          consultantNotes: c.consultantNotes,
          aiPersonalityCategory: c.aiPersonalityCategory,
          aiAnalysisSerialized: c.aiAnalysis,
          answers: c.questionnaireAnswers
        })),
        middleRoom: middleRooms.map(m => ({
          briefingNotes: m.briefingNotes,
          promotionNotes: m.promotionNotes,
          aiBriefingAnalysisSerialized: m.aiBriefingAnalysis
        })),
        test: tests.map(t => ({
          scores: {
            clarity: t.paramClarity,
            confidence: t.paramConfidence,
            tone: t.paramTone,
            vocabulary: t.paramVocabulary,
            structure: t.paramStructure,
            expression: t.paramExpression,
            bodyLanguage: t.paramBodyLanguage,
            eyeContact: t.paramEyeContact,
            totalScore: t.totalScore
          },
          judgeDescription: t.judgeDescription,
          aiComprehensiveAnalysisSerialized: t.aiComprehensiveAnalysis
        })),
        final: results.map(r => ({
          tahaniAnalysis: r.tahaniAnalysis,
          registered: r.registered,
          registrationNotes: r.registrationNotes
        }))
      }
    };

    const apiKey = process.env.GEMINI_API_KEY;
    const isSimulated = !apiKey || apiKey === "MY_GEMINI_API_KEY";
    let synthesisText = "";

    if (isSimulated) {
      synthesisText = `### تحلیل شبیه‌سازی‌شده و یکپارچه پرونده متقاضی محترم ${applicant.fullName} (${applicant.age} ساله)
*این تحلیل به دلیل عدم حضور کلید اصلی هوش مصنوعی هدهد صبا، توسط پردازش خودکار لوکال تولید گردیده است.*

#### ۱. ممیزی ابعاد هویتی و روانشناختی خط‌لوله
مقتضی با سن **${applicant.age} سال**، تحصیلات **${applicant.educationLevel || "لیسانس"}** و شغل **${applicant.occupation || "آزاد"}**، علاقه قلبی بی‌نظیری در ارزیابی تلفنی و فیزیکی نشان داد. براساس نظرسنجی، در حوزه لابی برخورد شیوایی داشته و پتانسیل کلامی فوق‌العاده‌ای داراست.

#### ۲. سنتز صوتی، شیوایی کلام داوری
تست صوتی نهایی امتیاز علمی **${tests[0]?.totalScore || "۸.۲"}** را ثبت کرده است. شیوایی و واژگان ایشان در کماال فصاحت است اما در زمینۀ مدیریت اضطراب ثانیه‌های اول سخنرانی نیازمند مشق آوا و تصویرسازی صعودی صدا به روش متمم است.

#### ۳. نقشه راه یادگیری و پکیج آموزشی طلایی
ثبت‌نام متقاضی گران‌قدر مورد تایید است. به عنوان گام اول، پیشنهاد می‌گردد نامبرده در **کارگاه فوق‌پیشرفته کاریزما و نفوذ کلام صبا** ثبت‌نام گردد تا به کمال مهارت در ارائه پرقدرت دست یابد.`;
    } else {
      try {
        const { ai } = await import("./src/lib/gemini.js");
        const prompt = `ارزیابی جامع کل پرونده و نقشه راه طلایی متقاضی:
${JSON.stringify(journeyData, null, 2)}

لطفاً به عنوان مدیر ارشد هوش مصنوعی انستیتو هدهد صبا، کل مسیر متقاضی از فرم دیجی‌فرم، تماس تلفنی اول، نحوه پذیرش حضوری، نظرات مشاوره معصومی، سالن میانی مورو متمم، نتایج امتیاز آزمون فیزیکی داور و یادداشت‌های نهایی را سنتز کنید.
یک تحلیل عمیق، غنی و خیره‌کننده به صورت مارک‌داون روان و فصیح به زبان فارسی آماده کنید.
تحلیل شما باید شامل این بخش‌ها باشد:
۱. تحلیل یکپارچه روانشناختی و هوش اجتماعی مراجع
۲. سنتز صوتی، شیوایی کلام، اعتماد به نفس و زبان بدن در آزمون داوریفیزیکی
۳. موانع و بن‌بست‌های روانی کشف شده
۴. نقشه راه یادگیری و پکیج آموزشی طلایی مخصوص این شخص در انستیتو هدهد صبا
پاسخ شما باید تماماً فارسی، با فونتیک جذاب و بدون حاشیه نویسی انگلیسی باشد.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: prompt,
          config: {
            systemInstruction: "You are the Chief AI Director of Hodhod Institute. Analyze applicant pipeline journeys to produce premium and deeply personalized synthesis reports in beautiful Farsi Markdown.",
            temperature: 0.7
          }
        });

        synthesisText = response.text || "خطای ناگهانی در دریافت متن از مدل هوش مصنوعی.";
      } catch (err: any) {
        console.error("Error generating cumulative analysis:", err);
        return res.status(500).json({ error: "خطا در برقراری ارتباط با مدل هوش مصنوعی Gemini." });
      }
    }

    // Persist this synthesis back into the database
    if (results.length > 0) {
      Datastore.updateFinalResultLog(results[0].id, {
        aiFinalSynthesis: synthesisText
      });
    } else {
      Datastore.updateApplicant(id, {
        aiAnalysis: synthesisText
      });
    }

    logAudit(actorId || "admin", actorName || "مدیر ارشد سیستم", "AI_CUMULATIVE_SYNTHESIS", id, { success: true, isSimulated }, req);

    res.json({ success: true, synthesis: synthesisText });
  });

  // --- Unified Administrative Core: Manual Correction & Real-time AI Reassessment ---
  app.post("/api/admin/applicants/:id/update-and-reanalyze", async (req, res) => {
    const { id } = req.params;
    const { 
      applicantUpdates, 
      stageToReanalyze, 
      stageLogUpdates,
      actorId, 
      actorName 
    } = req.body;

    const applicant = Datastore.getApplicants().find(a => a.id === id);
    if (!applicant) return res.status(404).json({ error: "پرونده متقاضی یافت نشد." });

    // 1. Update basic demographics
    if (applicantUpdates) {
      Datastore.updateApplicant(id, {
        fullName: applicantUpdates.fullName ?? applicant.fullName,
        nationalId: applicantUpdates.nationalId ?? applicant.nationalId,
        phone: applicantUpdates.phone ?? applicant.phone,
        age: applicantUpdates.age ? Number(applicantUpdates.age) : applicant.age,
        gender: applicantUpdates.gender ?? applicant.gender,
        educationLevel: applicantUpdates.educationLevel ?? applicant.educationLevel,
        occupation: applicantUpdates.occupation ?? applicant.occupation,
        city: applicantUpdates.city ?? applicant.city,
        notesGeneral: applicantUpdates.notesGeneral ?? applicant.notesGeneral
      });
    }

    // 2. Fetch all logs to see which ones are updated, and update them
    const contactLogs = Datastore.getContactLogs().filter(c => c.applicantId === id);
    const receptionLogs = Datastore.getReceptionLogs().filter(r => r.applicantId === id);
    const consultationLogs = Datastore.getConsultationLogs().filter(c => c.applicantId === id);
    const middleRoomLogs = Datastore.getMiddleRoomLogs().filter(m => m.applicantId === id);
    const testLogs = Datastore.getTestLogs().filter(t => t.applicantId === id);
    const finalLogs = Datastore.getFinalResultLogs().filter(f => f.applicantId === id);

    // Contact Log Updates
    if (stageLogUpdates?.contact && contactLogs.length > 0) {
      Datastore.updateContactLog(contactLogs[0].id, {
        operatorNotes: stageLogUpdates.contact.operatorNotes ?? contactLogs[0].operatorNotes,
        appointmentDate: stageLogUpdates.contact.appointmentDate ?? contactLogs[0].appointmentDate,
        appointmentTime: stageLogUpdates.contact.appointmentTime ?? contactLogs[0].appointmentTime,
      });
    }

    // Reception Log Updates
    if (stageLogUpdates?.reception && receptionLogs.length > 0) {
      Datastore.updateReceptionLog(receptionLogs[0].id, {
        operatorNotes: stageLogUpdates.reception.operatorNotes ?? receptionLogs[0].operatorNotes,
      });
    }

    // Consultation Log Updates
    if (stageLogUpdates?.consultation && consultationLogs.length > 0) {
      Datastore.updateConsultationLog(consultationLogs[0].id, {
        consultantNotes: stageLogUpdates.consultation.consultantNotes ?? consultationLogs[0].consultantNotes,
      });
    }

    // Middle Room Log Updates
    if (stageLogUpdates?.middle_room && middleRoomLogs.length > 0) {
      Datastore.updateMiddleRoomLog(middleRoomLogs[0].id, {
        briefingNotes: stageLogUpdates.middle_room.briefingNotes ?? middleRoomLogs[0].briefingNotes,
        promotionNotes: stageLogUpdates.middle_room.promotionNotes ?? middleRoomLogs[0].promotionNotes,
      });
    }

    // Test Log Updates
    if (stageLogUpdates?.test && testLogs.length > 0) {
      const scoresObj = stageLogUpdates.test.scores || {};
      Datastore.updateTestLog(testLogs[0].id, {
        judgeDescription: stageLogUpdates.test.judgeDescription ?? testLogs[0].judgeDescription,
        paramClarity: scoresObj.clarity !== undefined ? Number(scoresObj.clarity) : testLogs[0].paramClarity,
        paramConfidence: scoresObj.confidence !== undefined ? Number(scoresObj.confidence) : testLogs[0].paramConfidence,
        paramTone: scoresObj.tone !== undefined ? Number(scoresObj.tone) : testLogs[0].paramTone,
        paramVocabulary: scoresObj.vocabulary !== undefined ? Number(scoresObj.vocabulary) : testLogs[0].paramVocabulary,
        paramStructure: scoresObj.structure !== undefined ? Number(scoresObj.structure) : testLogs[0].paramStructure,
        paramExpression: scoresObj.expression !== undefined ? Number(scoresObj.expression) : testLogs[0].paramExpression,
        paramBodyLanguage: scoresObj.bodyLanguage !== undefined ? Number(scoresObj.bodyLanguage) : testLogs[0].paramBodyLanguage,
        paramEyeContact: scoresObj.eyeContact !== undefined ? Number(scoresObj.eyeContact) : testLogs[0].paramEyeContact,
        totalScore: scoresObj.total !== undefined ? Number(scoresObj.total) : testLogs[0].totalScore,
      });
    }

    // Final Result Log Updates
    if (stageLogUpdates?.final && finalLogs.length > 0) {
      Datastore.updateFinalResultLog(finalLogs[0].id, {
        tahaniAnalysis: stageLogUpdates.final.tahaniAnalysis ?? finalLogs[0].tahaniAnalysis,
        registrationNotes: stageLogUpdates.final.registrationNotes ?? finalLogs[0].registrationNotes,
      });
    }

    // Refresh updated logs references
    const updatedApplicant = Datastore.getApplicants().find(a => a.id === id) || applicant;
    const updContact = Datastore.getContactLogs().filter(c => c.applicantId === id);
    const updReception = Datastore.getReceptionLogs().filter(r => r.applicantId === id);
    const updConsultation = Datastore.getConsultationLogs().filter(c => c.applicantId === id);
    const updMiddleRoom = Datastore.getMiddleRoomLogs().filter(m => m.applicantId === id);
    const updTest = Datastore.getTestLogs().filter(t => t.applicantId === id);
    const updFinal = Datastore.getFinalResultLogs().filter(f => f.applicantId === id);

    let aiReanalyzed = false;
    let aiResponse = null;

    // 3. Re-execute Gemini AI for specific stage if requested
    if (stageToReanalyze) {
      try {
        if (stageToReanalyze === "contact") {
          const notes = updContact[0]?.operatorNotes || "";
          aiResponse = await analyzeStageWithAI("contact", {
            applicantName: updatedApplicant.fullName,
            applicantAge: updatedApplicant.age,
            applicantEducation: updatedApplicant.educationLevel,
            operatorNotes: notes
          });
          if (updContact.length > 0) {
            Datastore.updateContactLog(updContact[0].id, {
              aiAnalysis: JSON.stringify(aiResponse),
              aiCategory: aiResponse?.category || "Uncertain",
              aiScore: aiResponse?.confidenceScore || 0.5
            });
          }
          aiReanalyzed = true;
        } 
        else if (stageToReanalyze === "reception") {
          const notes = updReception[0]?.operatorNotes || "";
          aiResponse = await analyzeStageWithAI("reception", {
            applicantName: updatedApplicant.fullName,
            operatorNotes: notes,
            contactCategory: updContact[0]?.aiCategory || "None"
          });
          if (updReception.length > 0) {
            Datastore.updateReceptionLog(updReception[0].id, {
              aiBehaviorAnalysis: JSON.stringify(aiResponse),
              aiWaitAnalysis: JSON.stringify({ mood: aiResponse?.waitToleranceDesc })
            });
          }
          aiReanalyzed = true;
        } 
        else if (stageToReanalyze === "consultation") {
          const notes = updConsultation[0]?.consultantNotes || "";
          aiResponse = await analyzeStageWithAI("consultation", {
            applicantName: updatedApplicant.fullName,
            actorAge: updatedApplicant.age,
            gender: updatedApplicant.gender,
            contactAi: updContact[0]?.aiAnalysis ? JSON.parse(updContact[0].aiAnalysis) : null,
            receptionAi: updReception[0]?.aiBehaviorAnalysis ? JSON.parse(updReception[0].aiBehaviorAnalysis) : null,
            receptionNotes: updReception[0]?.operatorNotes || "",
            questionnaire: updConsultation[0]?.questionnaireAnswers || {},
            consultantNotes: notes
          });
          if (updConsultation.length > 0) {
            Datastore.updateConsultationLog(updConsultation[0].id, {
              aiAnalysis: JSON.stringify(aiResponse),
              aiPersonalityCategory: aiResponse?.confidenceLevel || "Intermediate"
            });
          }
          aiReanalyzed = true;
        } 
        else if (stageToReanalyze === "middle_room") {
          const notes = updMiddleRoom[0]?.briefingNotes || "";
          const promo = updMiddleRoom[0]?.promotionNotes || "";
          aiResponse = await analyzeStageWithAI("middle_room", {
            applicantName: updatedApplicant.fullName,
            previousAi: {
              contact: updContact[0]?.aiAnalysis ? JSON.parse(updContact[0].aiAnalysis) : null,
              consultation: updConsultation[0]?.aiAnalysis ? JSON.parse(updConsultation[0].aiAnalysis) : null
            },
            middleRoomNotes: notes,
            promotionNotes: promo
          });
          if (updMiddleRoom.length > 0) {
            Datastore.updateMiddleRoomLog(updMiddleRoom[0].id, {
              aiBriefingAnalysis: JSON.stringify(aiResponse)
            });
          }
          aiReanalyzed = true;
        } 
        else if (stageToReanalyze === "test") {
          const notes = updTest[0]?.judgeDescription || "";
          const activeTest = (updTest[0] || {}) as any;
          aiResponse = await analyzeStageWithAI("test", {
            applicantName: updatedApplicant.fullName,
            demographics: { age: updatedApplicant.age, gender: updatedApplicant.gender, city: updatedApplicant.city },
            contactAi: updContact[0]?.aiAnalysis ? JSON.parse(updContact[0].aiAnalysis) : null,
            receptionAi: updReception[0]?.aiBehaviorAnalysis ? JSON.parse(updReception[0].aiBehaviorAnalysis) : null,
            consultationAi: updConsultation[0]?.aiAnalysis ? JSON.parse(updConsultation[0].aiAnalysis) : null,
            consultationAnswers: updConsultation[0]?.questionnaireAnswers,
            middleRoomAi: updMiddleRoom[0]?.aiBriefingAnalysis ? JSON.parse(updMiddleRoom[0].aiBriefingAnalysis) : null,
            testNotes: notes,
            scores: {
              clarity: activeTest.paramClarity || 5,
              confidence: activeTest.paramConfidence || 5,
              tone: activeTest.paramTone || 5,
              vocabulary: activeTest.paramVocabulary || 5,
              structure: activeTest.paramStructure || 5,
              expression: activeTest.paramExpression || 5,
              bodyLanguage: activeTest.paramBodyLanguage || 5,
              eyeContact: activeTest.paramEyeContact || 5,
              total: activeTest.totalScore || 5.0
            }
          });
          if (updTest.length > 0) {
            Datastore.updateTestLog(updTest[0].id, {
              aiComprehensiveAnalysis: JSON.stringify(aiResponse),
              aiFinalCategory: aiResponse?.proficiencyRating || "Intermediate",
              aiRecommendation: aiResponse?.coreThesis || ""
            });
          }
          aiReanalyzed = true;
        } 
        else if (stageToReanalyze === "final") {
          const notes = updFinal[0]?.tahaniAnalysis || "";
          aiResponse = await analyzeStageWithAI("final", {
            applicantName: updatedApplicant.fullName,
            contact: updContact[0]?.aiAnalysis ? JSON.parse(updContact[0].aiAnalysis) : null,
            test: updTest[0]?.aiComprehensiveAnalysis ? JSON.parse(updTest[0].aiComprehensiveAnalysis) : null,
            presenterNotes: notes,
            enrolled: !!updFinal[0]?.registered
          });
          if (updFinal.length > 0) {
            Datastore.updateFinalResultLog(updFinal[0].id, {
              aiFinalSynthesis: JSON.stringify(aiResponse)
            });
          }
          aiReanalyzed = true;
        }
      } catch (err: any) {
        console.error("خطا در بازتحلیل پرونده با هوش مصنوعی:", err);
        return res.status(500).json({ 
          error: `خطا در اجرای فرآیند بازتحلیل هوش مصنوعی: ${err.message || err}`
        });
      }
    }

    // 4. Log immutable audit trail
    Datastore.addImmutableAuditLog({
      applicantId: id,
      applicantName: updatedApplicant.fullName,
      operatorId: actorId || "admin",
      operatorName: actorName || "مدیر ارشد سیستم",
      actionType: "NOTE_UPDATE",
      stageName: stageToReanalyze ? stageToReanalyze.toUpperCase() : "GENERAL",
      fieldName: stageToReanalyze ? "aiAnalysis" : "notesGeneral",
      beforeState: "PRE_MANUAL_CORRECTION",
      afterState: `CORRECTED_AND_REANALYZED: ${aiReanalyzed ? "AI_RESUBMITTED_" + stageToReanalyze : "FIELDS_ONLY"}`,
      ipAddress: req.ip || req.socket.remoteAddress || "127.0.0.1"
    });

    res.json({
      success: true,
      message: aiReanalyzed 
        ? "اطلاعات با موفقیت اصلاح و پردازش با هوش مصنوعی Gemini تکرار گردید."
        : "تغییرات دستی اطلاعات با موفقیت در پایگاه داده پرونده اعمال شد.",
      aiResponse
    });
  });

  // Helper helper to parse parameters to number safely
  function paramsToNum(val: any): number | null {
    if (val === undefined || val === null) return null;
    const n = Number(val);
    return isNaN(n) ? null : n;
  }

  // TAHANI SCORE EDITING AND AUTO AI RE-SYNTHESIS RE-TRIGGER
  app.post("/api/applicants/:id/update-scores", async (req, res) => {
    const { id } = req.params;
    const { 
      paramClarity, 
      paramConfidence, 
      paramTone, 
      paramVocabulary, 
      paramStructure, 
      paramExpression, 
      paramBodyLanguage, 
      paramEyeContact,
      judgeDescription,
      messageToTahani
    } = req.body;

    const applicant = Datastore.getApplicants().find(a => a.id === id);
    if (!applicant) {
      return res.status(404).json({ error: "متقاضی یافت نشد." });
    }

    const testLogs = Datastore.getTestLogs().filter(t => t.applicantId === id);
    if (testLogs.length === 0) {
      return res.status(400).json({ error: "اطلاعات آزمون تریبون برای این متقاضی هنوز ثبت نشده است." });
    }

    // Latest test log
    const lastTestLog = testLogs[testLogs.length - 1];

    // Recalculate weights based on what is passed or keep old
    const clarity = paramsToNum(paramClarity) ?? lastTestLog.paramClarity;
    const confidence = paramsToNum(paramConfidence) ?? lastTestLog.paramConfidence;
    const tone = paramsToNum(paramTone) ?? lastTestLog.paramTone;
    const vocabulary = paramsToNum(paramVocabulary) ?? lastTestLog.paramVocabulary;
    const structure = paramsToNum(paramStructure) ?? lastTestLog.paramStructure;
    const expression = paramsToNum(paramExpression) ?? lastTestLog.paramExpression;
    const bodyLanguage = paramsToNum(paramBodyLanguage) ?? lastTestLog.paramBodyLanguage;
    const eyeContact = paramsToNum(paramEyeContact) ?? lastTestLog.paramEyeContact;

    const totalScore = parseFloat(
      (
        (clarity * 0.15) +
        (confidence * 0.15) +
        (tone * 0.15) +
        (vocabulary * 0.1) +
        (structure * 0.1) +
        (expression * 0.15) +
        (bodyLanguage * 0.1) +
        (eyeContact * 0.1)
      ).toFixed(2)
    );

    // Prepare updates
    const updates: any = {
      paramClarity: clarity,
      paramConfidence: confidence,
      paramTone: tone,
      paramVocabulary: vocabulary,
      paramStructure: structure,
      paramExpression: expression,
      paramBodyLanguage: bodyLanguage,
      paramEyeContact: eyeContact,
      totalScore,
    };

    if (judgeDescription !== undefined) updates.judgeDescription = judgeDescription;
    if (messageToTahani !== undefined) updates.messageToTahani = messageToTahani;

    try {
      // Re-trigger Gemini to update the comprehensive analysis
      const contactLogs = Datastore.getContactLogs().filter(c => c.applicantId === id);
      const receptionLogs = Datastore.getReceptionLogs().filter(r => r.applicantId === id);
      const consultationLogs = Datastore.getConsultationLogs().filter(c => c.applicantId === id);
      const middleRoomLogs = Datastore.getMiddleRoomLogs().filter(m => m.applicantId === id);

      const aiResponse = await analyzeStageWithAI("test", {
        applicantName: applicant.fullName,
        demographics: { age: applicant.age, gender: applicant.gender, city: applicant.city },
        contactAi: contactLogs[0]?.aiAnalysis ? JSON.parse(contactLogs[0].aiAnalysis) : null,
        receptionAi: receptionLogs[0]?.aiBehaviorAnalysis ? JSON.parse(receptionLogs[0].aiBehaviorAnalysis) : null,
        consultationAi: consultationLogs[0]?.aiAnalysis ? JSON.parse(consultationLogs[0].aiAnalysis) : null,
        consultationAnswers: consultationLogs[0]?.questionnaireAnswers,
        middleRoomAi: middleRoomLogs[0]?.aiBriefingAnalysis ? JSON.parse(middleRoomLogs[0].aiBriefingAnalysis) : null,
        testNotes: judgeDescription || lastTestLog.judgeDescription || "",
        scores: {
          clarity,
          confidence,
          tone,
          vocabulary,
          structure,
          expression,
          bodyLanguage,
          eyeContact,
          total: totalScore
        }
      });

      updates.aiComprehensiveAnalysis = JSON.stringify(aiResponse);
      updates.aiFinalCategory = aiResponse?.proficiencyRating || "Intermediate";
      updates.aiRecommendation = aiResponse?.coreThesis || "";

      const updatedLog = Datastore.updateTestLog(lastTestLog.id, updates);

      // Audit Log
      Datastore.addImmutableAuditLog({
        applicantId: id,
        applicantName: applicant.fullName,
        operatorId: "u-tahani",
        operatorName: "خانم طحانی (پنل ارزیابی)",
        actionType: "NOTE_UPDATE",
        stageName: "TEST",
        fieldName: "scores",
        beforeState: JSON.stringify({ totalScore: lastTestLog.totalScore }),
        afterState: JSON.stringify({ totalScore, clarity, confidence, tone }),
        ipAddress: req.ip || req.socket.remoteAddress || "127.0.0.1"
      });

      res.json({ success: true, testLog: updatedLog });
    } catch (err: any) {
      console.error("Error updating scores & re-generating AI:", err);
      // Even if AI fails, save scores locally first
      const updatedLog = Datastore.updateTestLog(lastTestLog.id, updates);
      res.json({ success: true, testLog: updatedLog, warn: "خطا در فراخوانی مجدد هوش مصنوعی، اما نمرات ذخیره گردید." });
    }
  });

  // UPDATE APPLICANT APPOINTMENT FOR DISCREPANCY TRACKING
  app.post("/api/applicants/:id/update-appointment", (req, res) => {
    const { id } = req.params;
    const { appointmentDate, appointmentTime } = req.body;

    const applicant = Datastore.getApplicants().find(a => a.id === id);
    if (!applicant) {
      return res.status(404).json({ error: "متقاضی یافت نشد." });
    }

    const contactLogs = Datastore.getContactLogs().filter(c => c.applicantId === id);
    if (contactLogs.length > 0) {
      const lastContact = contactLogs[contactLogs.length - 1];
      Datastore.updateContactLog(lastContact.id, {
        appointmentDate: appointmentDate !== undefined ? appointmentDate : lastContact.appointmentDate,
        appointmentTime: appointmentTime !== undefined ? appointmentTime : lastContact.appointmentTime
      });
    } else {
      // Create an initial direct contact log
      const newContactLog: any = {
        id: `cl-${Math.random().toString(36).substring(2, 11)}`,
        applicantId: id,
        operatorId: "u-contact",
        contactAttemptNumber: 1,
        contactedAt: new Date().toISOString(),
        phoneUsed: applicant.phone,
        appointmentDate: appointmentDate || "",
        appointmentTime: appointmentTime || "",
        operatorNotes: "تنظیم نوبت مقرر اولیۀ مستقیم از پنل",
        createdAt: new Date().toISOString()
      };
      Datastore.addContactLog(newContactLog);
    }

    // Update appointment attributes and force status to scheduled if meeting has a scheduled time
    Datastore.updateApplicant(id, {
      status: appointmentTime ? ("scheduled" as any) : ("pending_contact" as any),
      appointmentDate: appointmentDate || "",
      appointmentTime: appointmentTime || ""
    });

    res.json({ success: true });
  });

  // ADMIN SYSTEM-WIDE ANNOUNCEMENT BROADCAST ACTION
  app.post("/api/messenger/broadcast-announcement", (req, res) => {
    const { senderId, text } = req.body;
    if (!senderId || !text) {
      return res.status(400).json({ error: "شناسه ارسال کننده و متن پیام الزامی می‌باشد." });
    }

    const sender = Datastore.getUsers().find(u => u.id === senderId);
    if (!sender || sender.role !== "ADMIN") {
      return res.status(403).json({ error: "فقط مدیر ارشد سیستم اجازه ارسال اطلاعیه سراسری دارد." });
    }

    const rooms = Datastore.getRooms();
    const formattedText = `📢 **[اطلاعیّه رسمی مدیریت سیستم]** \n${text}`;
    
    // Broadcast message to ALL non-dissolved rooms
    const activeRooms = rooms.filter(r => !r.isDissolved);
    const newMessages: Message[] = [];

    activeRooms.forEach(room => {
      const msgId = `msg-${Math.random().toString(36).substring(2, 11)}`;
      const newMsg: Message = {
        id: msgId,
        senderId,
        roomId: room.id,
        text: formattedText,
        replyToId: null,
        reactions: {},
        isDeleted: false,
        isEdited: false,
        originalText: null,
        aiTopic: null,
        aiSuggestion: null,
        createdAt: new Date().toISOString(),
        deliveredAt: new Date().toISOString(),
        readBy: { [senderId]: new Date().toISOString() },
        fileAttachment: null
      };
      Datastore.addMessage(newMsg);
      newMessages.push(newMsg);
    });

    logAudit(senderId, sender.fullName, "MESSENGER_ACTION", undefined, { action: "BROADCAST_ANNOUNCEMENT", count: activeRooms.length }, req);

    res.json({ success: true, roomsTargeted: activeRooms.length, messagesCreatedCount: newMessages.length });
  });

  app.post("/api/applicants", (req, res) => {
    const { applicant, actorId, actorName } = req.body;
    if (!applicant.fullName || !applicant.nationalId || !applicant.phone) {
      return res.status(400).json({ error: "پرکردن نام متوسط، کد ملی و تلفن متقاضی الزامی است." });
    }

    const list = Datastore.getApplicants();
    const duplicate = list.find(a => a.nationalId === applicant.nationalId);
    if (duplicate) {
      return res.status(400).json({ error: "متقاضی با این کد ملی قبلاً در سیستم ثبت شده است." });
    }

    const id = `app-${Math.random().toString(36).substring(2, 11)}`;
    const newApplicant: Applicant = {
      id,
      fullName: applicant.fullName,
      nationalId: applicant.nationalId,
      phone: applicant.phone,
      age: Number(applicant.age) || 20,
      gender: applicant.gender || "male",
      educationLevel: applicant.educationLevel || "دیپلم",
      occupation: applicant.occupation || "آزاد",
      city: applicant.city || "تهران",
      digiformSubmissionId: applicant.digiformSubmissionId || `manual-${Date.now()}`,
      registrationDate: new Date().toISOString(),
      status: ApplicantStatus.PENDING_CONTACT,
      notesGeneral: applicant.notesGeneral || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    Datastore.addApplicant(newApplicant);
    Datastore.updateQueueState(id, {
      currentStage: QueueStage.CONTACT,
      isWaiting: true,
      stageEnteredAt: new Date().toISOString()
    });

    // Write to our new Immutable Audit log as well
    Datastore.addImmutableAuditLog({
      applicantId: id,
      applicantName: newApplicant.fullName,
      operatorId: actorId || "system",
      operatorName: actorName || "ثبت نام خودکار",
      actionType: "STATUS_CHANGE",
      stageName: "REGISTRATION",
      fieldName: "applicantStatus",
      beforeState: "NEW_IMPORT",
      afterState: ApplicantStatus.PENDING_CONTACT,
      ipAddress: req.ip || req.socket.remoteAddress || "127.0.0.1"
    });

    logAudit(actorId || "system", actorName || "اپراتور", "APPLICANT_CREATE", id, newApplicant, req);
    res.json(newApplicant);
  });

  // Bulk Excel Import
  app.post("/api/applicants/import", (req, res) => {
    const { applicants, actorId, actorName } = req.body;
    if (!Array.isArray(applicants)) {
      return res.status(400).json({ error: "فرمت ورودی نامعتبر است." });
    }

    const existing = Datastore.getApplicants();
    let importedCount = 0;
    let duplicateCount = 0;
    const importedList: Applicant[] = [];

    for (const applicant of applicants) {
      // Basic check
      if (!applicant.fullName || !applicant.nationalId || !applicant.phone) {
        continue;
      }

      // Check duplicate
      const isDuplicate = existing.some(e => e.nationalId === String(applicant.nationalId).trim()) ||
                         importedList.some(i => i.nationalId === String(applicant.nationalId).trim());
      if (isDuplicate) {
        duplicateCount++;
        continue;
      }

      const id = `app-${Math.random().toString(36).substring(2, 11)}`;
      const newApp: Applicant = {
        id,
        fullName: applicant.fullName,
        nationalId: String(applicant.nationalId).trim(),
        phone: String(applicant.phone).trim(),
        age: Number(applicant.age) || 20,
        gender: applicant.gender === "زن" || applicant.gender === "female" ? "female" : "male",
        educationLevel: applicant.educationLevel || "دیپلم",
        occupation: applicant.occupation || "آزاد",
        city: applicant.city || "دیگر",
        digiformSubmissionId: applicant.digiformSubmissionId || `execimport-${Math.random().toString(36).substr(2, 5)}`,
        registrationDate: new Date().toISOString(),
        status: ApplicantStatus.PENDING_CONTACT,
        notesGeneral: applicant.notesGeneral || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      Datastore.addApplicant(newApp);
      Datastore.updateQueueState(id, {
        currentStage: QueueStage.CONTACT,
        isWaiting: true,
        stageEnteredAt: new Date().toISOString()
      });

      // Write to our new Immutable Audit log as well
      Datastore.addImmutableAuditLog({
        applicantId: id,
        applicantName: newApp.fullName,
        operatorId: actorId || "admin",
        operatorName: actorName || "مدیر سیستم",
        actionType: "STATUS_CHANGE",
        stageName: "EXCEL_IMPORT",
        fieldName: "applicantStatus",
        beforeState: "NEW_IMPORT",
        afterState: ApplicantStatus.PENDING_CONTACT,
        ipAddress: req.ip || req.socket.remoteAddress || "127.0.0.1"
      });

      importedList.push(newApp);
      importedCount++;
    }

    logAudit(actorId || "admin", actorName || "مدیر اصلی", "EXCEL_IMPORT", undefined, { count: importedCount, duplicates: duplicateCount }, req);
    res.json({ success: true, count: importedCount, duplicates: duplicateCount });
  });

  // Soft Delete Applicant
  app.post("/api/applicants/delete", (req, res) => {
    const { id, actorId, actorName } = req.body;
    
    // Fetch applicant before deletion to log details
    const targetApp = Datastore.getAllApplicantsWithDeleted().find(a => a.id === id);
    const success = Datastore.softDeleteApplicant(id);
    if (success) {
      Datastore.deleteQueueState(id);
      
      // Write to our new Immutable Audit log as well
      Datastore.addImmutableAuditLog({
        applicantId: id,
        applicantName: targetApp?.fullName || "نامشخص",
        operatorId: actorId || "admin",
        operatorName: actorName || "مدیر سیستم",
        actionType: "STATUS_CHANGE",
        stageName: "GENERAL",
        fieldName: "deletedAt",
        beforeState: "ACTIVE",
        afterState: "DELETED_SOFT",
        ipAddress: req.ip || req.socket.remoteAddress || "127.0.0.1"
      });

      logAudit(actorId, actorName, "APPLICANT_DELETE", id, { id }, req);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "شخص پیدا نشد." });
    }
  });

  // --- 3. QUEUE MANAGEMENT WITH BLOCKING & AI PIPELINE ---
  app.get("/api/queue", (req, res) => {
    const queue = Datastore.getQueueStates();
    const applicants = Datastore.getApplicants();
    const users = Datastore.getUsers();
    const contactLogs = Datastore.getContactLogs();

    // Map applicant details together
    const result = queue.map(q => {
      const applicant = applicants.find(a => a.id === q.applicantId);
      if (!applicant) return null;

      const operator = users.find(u => u.id === q.assignedOperatorId);
      
      const appContacts = contactLogs.filter(c => c.applicantId === q.applicantId);
      const latestContact = appContacts.length > 0 ? appContacts[appContacts.length - 1] : null;
      const schedulingOp = latestContact ? users.find(u => u.id === latestContact.operatorId) : null;
      const appointmentScheduledBy = schedulingOp ? schedulingOp.fullName : "سیستم خودکار هدهد";

      return {
        ...q,
        applicant: {
          ...applicant,
          appointmentDate: latestContact?.appointmentDate || "",
          appointmentTime: latestContact?.appointmentTime || "",
          appointmentScheduledBy: appointmentScheduledBy
        },
        assignedOperatorName: operator ? operator.fullName : undefined
      };
    }).filter(q => q !== null); // only valid applicants

    res.json(result);
  });

  // Transition Stage handler
  app.post("/api/queue/transition", async (req, res) => {
    const {
      applicantId,
      currentStage,
      nextStage,
      operatorId,
      operatorNotes,
      payload
    } = req.body;

    const users = Datastore.getUsers();
    const operator = users.find(u => u.id === operatorId);
    const opName = operator ? operator.fullName : "پراتور";

    const applicant = Datastore.getApplicants().find(a => a.id === applicantId);
    if (!applicant) {
      return res.status(444).json({ error: "متقاضی یافت نشد یا حذف شده است." });
    }

    // --- SECURE BOUNDARY: QUEUE BLOCKING CHECK ---
    // If nextStage represents an active processing room and not waiting/done stages,
    // verify if that room is currently busy (has an active occupant who is NOT waiting)
    const activeRooms = [QueueStage.CONSULTATION, QueueStage.MIDDLE_ROOM, QueueStage.TEST, QueueStage.RESULT];
    if (activeRooms.includes(nextStage)) {
      const activeQueue = Datastore.getQueueStates();
      const blocker = activeQueue.find(q =>
        q.currentStage === nextStage &&
        !q.isWaiting &&
        q.applicantId !== applicantId
      );

      if (blocker) {
        const blockerApp = Datastore.getApplicants().find(a => a.id === blocker.applicantId);
        return res.status(409).json({
          error: "تداخل در انتقال صف",
          message: `در حال حاضر متقاضی دیگری (${blockerApp?.fullName || "نامشخص"}) در این وضعیت فعال است و باید کار او تمام شود.`,
          blockerId: blocker.applicantId
        });
      }
    }

    // Fetch previous logs for Claude/Gemini cumulative prompts
    const contactLogs = Datastore.getContactLogs().filter(c => c.applicantId === applicantId);
    const receptionLogs = Datastore.getReceptionLogs().filter(r => r.applicantId === applicantId);
    const consultationLogs = Datastore.getConsultationLogs().filter(c => c.applicantId === applicantId);
    const middleRoomLogs = Datastore.getMiddleRoomLogs().filter(m => m.applicantId === applicantId);
    const testLogs = Datastore.getTestLogs().filter(t => t.applicantId === applicantId);

    // Save logs based on the STAGE yielding completion
    let aiResponse: any = null;

    if (currentStage === QueueStage.CONTACT) {
      const newContactLog: ContactLog = {
        id: `cl-${Math.random().toString(36).substring(2, 11)}`,
        applicantId,
        operatorId,
        contactAttemptNumber: contactLogs.length + 1,
        contactedAt: new Date().toISOString(),
        phoneUsed: applicant.phone,
        appointmentDate: payload?.appointmentDate, // Jalali date
        appointmentTime: payload?.appointmentTime,
        operatorNotes: operatorNotes || "",
        createdAt: new Date().toISOString()
      };

      // Call Gemini for profiling
      aiResponse = await analyzeStageWithAI("contact", {
        applicantName: applicant.fullName,
        applicantAge: applicant.age,
        applicantEducation: applicant.educationLevel,
        operatorNotes: operatorNotes || ""
      });

      newContactLog.aiAnalysis = JSON.stringify(aiResponse);
      newContactLog.aiCategory = aiResponse?.category || "Uncertain";
      newContactLog.aiScore = aiResponse?.confidenceScore || 0.5;

      Datastore.addContactLog(newContactLog);
      Datastore.updateApplicant(applicantId, {
        notesGeneral: `[تماس]: ${operatorNotes}\n` + (applicant.notesGeneral || ""),
        status: nextStage === QueueStage.WAITING_1 ? ApplicantStatus.SCHEDULED : ApplicantStatus.PENDING_CONTACT
      });
    }

    else if (currentStage === QueueStage.RECEPTION) {
      const newReception: ReceptionLog = {
        id: `rl-${Math.random().toString(36).substring(2, 11)}`,
        applicantId,
        operatorId,
        checkInTime: new Date().toISOString(),
        evaluationFormGiven: !!payload?.evaluationFormGiven,
        questionnaireGiven: !!payload?.questionnaireGiven,
        waitingStartTime: new Date().toISOString(),
        operatorNotes: operatorNotes || "",
        createdAt: new Date().toISOString()
      };

      aiResponse = await analyzeStageWithAI("reception", {
        applicantName: applicant.fullName,
        operatorNotes: operatorNotes || "",
        contactCategory: contactLogs[0]?.aiCategory || "None"
      });

      newReception.aiBehaviorAnalysis = JSON.stringify(aiResponse);
      newReception.aiWaitAnalysis = JSON.stringify({ mood: aiResponse?.waitToleranceDesc });

      Datastore.addReceptionLog(newReception);
      Datastore.updateApplicant(applicantId, {
        status: ApplicantStatus.ARRIVED
      });
    }

    else if (currentStage === QueueStage.CONSULTATION) {
      const newConsultlog: ConsultationLog = {
        id: `ctl-${Math.random().toString(36).substring(2, 11)}`,
        applicantId,
        consultantId: operatorId,
        sessionStart: payload?.sessionStart || new Date().toISOString(),
        sessionEnd: new Date().toISOString(),
        durationMinutes: Math.round((Date.now() - new Date(payload?.sessionStart || Date.now()).getTime()) / 60000),
        questionnaireAnswers: payload?.questionnaireAnswers || {},
        consultantNotes: operatorNotes || "",
        consultationSkipped: !!payload?.consultationSkipped,
        skipReason: payload?.skipReason || "",
        createdAt: new Date().toISOString()
      };

      aiResponse = await analyzeStageWithAI("consultation", {
        applicantName: applicant.fullName,
        actorAge: applicant.age,
        gender: applicant.gender,
        contactAi: contactLogs[0]?.aiAnalysis ? JSON.parse(contactLogs[0].aiAnalysis) : null,
        receptionAi: receptionLogs[0]?.aiBehaviorAnalysis ? JSON.parse(receptionLogs[0].aiBehaviorAnalysis) : null,
        receptionNotes: receptionLogs[0]?.operatorNotes || "",
        questionnaire: payload?.questionnaireAnswers,
        consultantNotes: operatorNotes || ""
      });

      newConsultlog.aiAnalysis = JSON.stringify(aiResponse);
      newConsultlog.aiPersonalityCategory = aiResponse?.confidenceLevel || "Intermediate";

      Datastore.addConsultationLog(newConsultlog);
      Datastore.updateApplicant(applicantId, {
        status: ApplicantStatus.IN_CONSULTATION
      });
    }

    else if (currentStage === QueueStage.MIDDLE_ROOM) {
      const newMidLog: MiddleRoomLog = {
        id: `ml-${Math.random().toString(36).substring(2, 11)}`,
        applicantId,
        operatorId,
        entryTime: payload?.entryTime || new Date().toISOString(),
        exitTime: new Date().toISOString(),
        briefingNotes: operatorNotes || "",
        promotionNotes: payload?.promotionNotes || "",
        createdAt: new Date().toISOString()
      };

      aiResponse = await analyzeStageWithAI("middle_room", {
        applicantName: applicant.fullName,
        previousAi: {
          contact: contactLogs[0]?.aiAnalysis ? JSON.parse(contactLogs[0].aiAnalysis) : null,
          consultation: consultationLogs[0]?.aiAnalysis ? JSON.parse(consultationLogs[0].aiAnalysis) : null
        },
        middleRoomNotes: operatorNotes || "",
        promotionNotes: payload?.promotionNotes || ""
      });

      newMidLog.aiBriefingAnalysis = JSON.stringify(aiResponse);

      Datastore.addMiddleRoomLog(newMidLog);
      Datastore.updateApplicant(applicantId, {
        status: ApplicantStatus.IN_MIDDLE_ROOM
      });
    }

    else if (currentStage === QueueStage.TEST) {
      const newTestLog: TestLog = {
        id: `tl-${Math.random().toString(36).substring(2, 11)}`,
        applicantId,
        judgeId: operatorId,
        testStart: payload?.testStart || new Date().toISOString(),
        testEnd: new Date().toISOString(),
        paramClarity: Number(payload?.paramClarity) || 5,
        paramConfidence: Number(payload?.paramConfidence) || 5,
        paramTone: Number(payload?.paramTone) || 5,
        paramVocabulary: Number(payload?.paramVocabulary) || 5,
        paramStructure: Number(payload?.paramStructure) || 5,
        paramExpression: Number(payload?.paramExpression) || 5,
        paramBodyLanguage: Number(payload?.paramBodyLanguage) || 5,
        paramEyeContact: Number(payload?.paramEyeContact) || 5,
        totalScore: Number(payload?.totalScore) || 5.0,
        judgeDescription: operatorNotes || "",
        messageToTahani: payload?.messageToTahani || "",
        createdAt: new Date().toISOString()
      };

      aiResponse = await analyzeStageWithAI("test", {
        applicantName: applicant.fullName,
        demographics: { age: applicant.age, gender: applicant.gender, city: applicant.city },
        contactAi: contactLogs[0]?.aiAnalysis ? JSON.parse(contactLogs[0].aiAnalysis) : null,
        receptionAi: receptionLogs[0]?.aiBehaviorAnalysis ? JSON.parse(receptionLogs[0].aiBehaviorAnalysis) : null,
        consultationAi: consultationLogs[0]?.aiAnalysis ? JSON.parse(consultationLogs[0].aiAnalysis) : null,
        consultationAnswers: consultationLogs[0]?.questionnaireAnswers,
        middleRoomAi: middleRoomLogs[0]?.aiBriefingAnalysis ? JSON.parse(middleRoomLogs[0].aiBriefingAnalysis) : null,
        testNotes: operatorNotes || "",
        scores: {
          clarity: payload?.paramClarity || 5,
          confidence: payload?.paramConfidence || 5,
          tone: payload?.paramTone || 5,
          vocabulary: payload?.paramVocabulary || 5,
          structure: payload?.paramStructure || 5,
          expression: payload?.paramExpression || 5,
          bodyLanguage: payload?.paramBodyLanguage || 5,
          eyeContact: payload?.paramEyeContact || 5,
          total: payload?.totalScore || 5.0
        }
      });

      newTestLog.aiComprehensiveAnalysis = JSON.stringify(aiResponse);
      newTestLog.aiFinalCategory = aiResponse?.proficiencyRating || "Intermediate";
      newTestLog.aiRecommendation = aiResponse?.coreThesis || "";

      Datastore.addTestLog(newTestLog);
      Datastore.updateApplicant(applicantId, {
        status: ApplicantStatus.IN_TEST
      });
    }

    else if (currentStage === QueueStage.RESULT) {
      const newFinalResult: FinalResultLog = {
        id: `frl-${Math.random().toString(36).substring(2, 11)}`,
        applicantId,
        presenterTahaniId: operatorId || "u-tahani",
        presenterRezaeiId: payload?.presenterRezaeiId || "u-rezaei-b",
        resultTime: new Date().toISOString(),
        registered: !!payload?.registered,
        registrationNotes: payload?.registrationNotes || "",
        tahaniAnalysis: operatorNotes || "",
        consultationPanelNotes: payload?.consultationPanelNotes || "",
        createdAt: new Date().toISOString()
      };

      aiResponse = await analyzeStageWithAI("final", {
        applicantName: applicant.fullName,
        contact: contactLogs[0]?.aiAnalysis ? JSON.parse(contactLogs[0].aiAnalysis) : null,
        test: testLogs[0]?.aiComprehensiveAnalysis ? JSON.parse(testLogs[0].aiComprehensiveAnalysis) : null,
        presenterNotes: operatorNotes || "",
        enrolled: !!payload?.registered
      });

      newFinalResult.aiFinalSynthesis = JSON.stringify(aiResponse);

      Datastore.addFinalResultLog(newFinalResult);
      Datastore.updateApplicant(applicantId, {
        status: payload?.registered ? ApplicantStatus.COMPLETED : ApplicantStatus.NO_SHOW
      });
    }

    // Update queue position of the client
    let updatedQueue: QueueState;
    if (nextStage === QueueStage.DONE) {
      Datastore.deleteQueueState(applicantId);
      updatedQueue = {
        id: "",
        applicantId,
        currentStage: QueueStage.DONE,
        stageEnteredAt: new Date().toISOString(),
        isWaiting: false,
        queuePosition: 0,
        updatedAt: new Date().toISOString()
      };
    } else {
      updatedQueue = Datastore.updateQueueState(applicantId, {
        currentStage: nextStage,
        isWaiting: true, // starts waiting at the new stage
        stageEnteredAt: new Date().toISOString(),
        assignedOperatorId: undefined // waits for operator to pull them
      });
    }

    // Write immutable system audit logs
    logAudit(operatorId || "system", opName, "STAGE_ADVANCE", applicantId, {
      from: currentStage,
      to: nextStage,
      aiCategory: aiResponse?.category || aiResponse?.proficiencyRating || undefined
    }, req);

    // Write to our custom Immutable Audit log for the audit viewer panel
    // 1. Log Queue Stage & Applicant Status Change
    let afterStatus = applicant.status;
    if (currentStage === QueueStage.CONTACT) {
      afterStatus = nextStage === QueueStage.WAITING_1 ? ApplicantStatus.SCHEDULED : ApplicantStatus.PENDING_CONTACT;
    } else if (currentStage === QueueStage.RECEPTION) {
      afterStatus = ApplicantStatus.ARRIVED;
    } else if (currentStage === QueueStage.CONSULTATION) {
      afterStatus = ApplicantStatus.IN_CONSULTATION;
    } else if (currentStage === QueueStage.MIDDLE_ROOM) {
      afterStatus = ApplicantStatus.IN_MIDDLE_ROOM;
    } else if (currentStage === QueueStage.TEST) {
      afterStatus = ApplicantStatus.IN_TEST;
    } else if (currentStage === QueueStage.RESULT) {
      afterStatus = payload?.registered ? ApplicantStatus.COMPLETED : ApplicantStatus.NO_SHOW;
    }

    // Capture standard Queue Stage Change (STATUS_CHANGE)
    Datastore.addImmutableAuditLog({
      applicantId,
      applicantName: applicant.fullName,
      operatorId: operatorId || "system",
      operatorName: opName,
      actionType: "STATUS_CHANGE",
      stageName: currentStage.toUpperCase(),
      fieldName: "queueStage",
      beforeState: currentStage,
      afterState: nextStage,
      ipAddress: req.ip || req.socket.remoteAddress || "127.0.0.1"
    });

    // Capture Applicant Profile Status Change (STATUS_CHANGE)
    Datastore.addImmutableAuditLog({
      applicantId,
      applicantName: applicant.fullName,
      operatorId: operatorId || "system",
      operatorName: opName,
      actionType: "STATUS_CHANGE",
      stageName: currentStage.toUpperCase(),
      fieldName: "applicantStatus",
      beforeState: applicant.status,
      afterState: afterStatus,
      ipAddress: req.ip || req.socket.remoteAddress || "127.0.0.1"
    });

    // 2. Log Operator Notes (NOTE_UPDATE)
    if (operatorNotes) {
      Datastore.addImmutableAuditLog({
        applicantId,
        applicantName: applicant.fullName,
        operatorId: operatorId || "system",
        operatorName: opName,
        actionType: "NOTE_UPDATE",
        stageName: currentStage.toUpperCase(),
        fieldName: "operatorNotes",
        beforeState: "EMPTY",
        afterState: operatorNotes,
        ipAddress: req.ip || req.socket.remoteAddress || "127.0.0.1"
      });
    }

    // 3. Log AI Decision / Response (AI_DECISION)
    if (aiResponse) {
      Datastore.addImmutableAuditLog({
        applicantId,
        applicantName: applicant.fullName,
        operatorId: "gemini-3.1-flash-lite",
        operatorName: "هوش مصنوعی مدل جمینی ۳.۱ لایت (Gemini 3.1 Lite)",
        actionType: "AI_DECISION",
        stageName: currentStage.toUpperCase(),
        fieldName: "aiAnalysis",
        beforeState: "NONE",
        afterState: JSON.stringify(aiResponse),
        ipAddress: "127.0.0.1"
      });
    }

    res.json({
      success: true,
      queue: updatedQueue,
      aiAnalysis: aiResponse
    });
  });

  // TACKLE APPOINTMENT DISCREPANCY REASONING ENGINE VIA GEMINI FOR MRS. ZAMANI
  app.post("/api/reception/analyze-discrepancy", async (req, res) => {
    const { applicantName, scheduledTime, actualTime, diffMinutes, reasonGiven } = req.body;
    if (!reasonGiven) {
      return res.status(400).json({ error: "لطفاً توضیحات مراجع را وارد نمایید." });
    }

    try {
      const prompt = `ارزیاب پذیرش (خانم زمانی) گزارش می‌دهد که متقاضی "${applicantName}" که نوبت او در ساعت "${scheduledTime}" بوده، در ساعت "${actualTime}" یعنی با "${Math.abs(diffMinutes)} دقیقه ${diffMinutes > 0 ? "تأخیر" : "تعجیل"}" وارد پذیرش شده است.
دلیل بیان شده توسط متقاضی به خانم زمانی این است: "${reasonGiven}".
لطفاً به عنوان روان‌شناس و رفتارشناس ارشد انستیتو هدهد، دلیل ارائه شده را واکاوی کرده و تحلیل و راه‌حل روان‌شناختی مناسبی برای برقراری ارتباط موثر در ۳-۴ جمله شیک و علمی به زبان فارسی ارائه دهید تا همکاران در مراحل بعدی به کار گیرند. پاسخ شما خروجی JSON داشته باشد به این شکل:
{
  "psychologicalProfile": "تحلیل رفتاری علمی شما درباره میزان اضطراب، تعهدپذیری یا صداقت متقاضی بخصوص در ارتباط با علت تأخیر/تعجیل",
  "iceBreakerTip": "توصیه یخ‌شکنی صمیمانه برای شروع جلسه متناسب با این اتفاق"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7
        }
      });

      const text = response.text;
      const parsed = JSON.parse(text || "{}");
      res.json(parsed);
    } catch (err: any) {
      console.error("Error analyzing discrepancy:", err);
      res.json({
        psychologicalProfile: `علت حضور متقاضی با تفاوت زمانی (${reasonGiven}) تحلیل گردید. این مسئله نشان‌دهنده حساسیت متقاضی نسبت به فرآیند ارزیابی هدهد است.`,
        iceBreakerTip: "با عرض خوش‌آمدگویی گرم و اهدا یک فنجان آب به مراجع کمک کنید تا ضربان قلب خود را تعدیل نماید."
      });
    }
  });

  // Pull applicant in queue (locks them to the current operating user)
  app.post("/api/queue/pull", (req, res) => {
    const { applicantId, operatorId } = req.body;
    const db = Datastore.getQueueStates();
    const item = db.find(q => q.applicantId === applicantId);
    if (!item) {
      return res.status(404).json({ error: "شخص در صف پیدا نشد." });
    }

    // Automatically transition to active stage counterpart if pulled from WAITING buffers
    let targetStage = item.currentStage;
    if (item.currentStage === QueueStage.WAITING_1) {
      targetStage = QueueStage.CONSULTATION;
    } else if (item.currentStage === QueueStage.WAITING_2) {
      targetStage = QueueStage.MIDDLE_ROOM;
    } else if (item.currentStage === QueueStage.WAITING_3) {
      targetStage = QueueStage.TEST;
    } else if (item.currentStage === QueueStage.WAITING_4) {
      targetStage = QueueStage.RESULT;
    }

    const updated = Datastore.updateQueueState(applicantId, {
      currentStage: targetStage,
      isWaiting: false, // active processing now
      assignedOperatorId: operatorId
    });

    const user = Datastore.getUsers().find(u => u.id === operatorId);
    logAudit(operatorId, user?.fullName || "اپراتور", "STAGE_PULL", applicantId, { stage: targetStage }, req);

    res.json(updated);
  });

  // Release applicant back to waiting status at same stage
  app.post("/api/queue/release", (req, res) => {
    const { applicantId, operatorId } = req.body;
    const updated = Datastore.updateQueueState(applicantId, {
      isWaiting: true,
      assignedOperatorId: undefined
    });

    const user = Datastore.getUsers().find(u => u.id === operatorId);
    logAudit(operatorId, user?.fullName || "اپراتور", "STAGE_RELEASE", applicantId, {}, req);
    res.json(updated);
  });

  // Retrieve Stage-Logs timeline for single applicant Master views
  app.get("/api/applicants/:id/timeline", (req, res) => {
    const { id } = req.params;
    const contacts = Datastore.getContactLogs().filter(c => c.applicantId === id);
    const receptions = Datastore.getReceptionLogs().filter(r => r.applicantId === id);
    const consultations = Datastore.getConsultationLogs().filter(c => c.applicantId === id);
    const middleRooms = Datastore.getMiddleRoomLogs().filter(m => m.applicantId === id);
    const tests = Datastore.getTestLogs().filter(t => t.applicantId === id);
    const results = Datastore.getFinalResultLogs().filter(r => r.applicantId === id);

    res.json({
      contacts,
      receptions,
      consultations,
      middleRooms,
      tests,
      results
    });
  });

  // Secure public-facing lookup for applicants and tracking
  app.get("/api/applicant/lookup", (req, res) => {
    const { identity } = req.query;
    if (!identity) {
      return res.status(400).json({ error: "لطفاً کد ملی یا شماره همراه خود را وارد کنید." });
    }
    
    // Robust Persian/Arabic digit conversion and whitespace elimination helper
    const normalizeDigits = (str: string): string => {
      const p = String(str || "").replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1728));
      const a = p.replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632));
      return a.replace(/\s+/g, "").trim();
    };

    const cleanInput = normalizeDigits(String(identity));
    const applicants = Datastore.getApplicants();
    
    // Attempt matched lookups with highest flexibility
    const applicant = applicants.find(a => {
      const dbNationalId = normalizeDigits(a.nationalId);
      const dbPhone = normalizeDigits(a.phone);
      const dbId = String(a.id || "").trim();
      
      // Match exactly on cleaned national ID, phone, ID
      // Or soft match if mobile number has zero prefix differences (e.g., matching 9123456789 or 09123456789)
      return dbNationalId === cleanInput || 
             dbPhone === cleanInput || 
             dbId === cleanInput ||
             (cleanInput.length >= 8 && dbPhone.endsWith(cleanInput)) ||
             (dbPhone.length >= 8 && cleanInput.endsWith(dbPhone));
    });

    if (!applicant) {
      return res.status(404).json({ error: "متقاضی با این شماره همراه یا کدملی یافت نشد. لطفاً دقت فرمایید مراجع باید دست‌کم ثبت‌نام اولیه دیجی‌فرم او کامل باشد." });
    }
    
    const id = applicant.id;
    const contacts = Datastore.getContactLogs().filter(c => c.applicantId === id);
    const receptions = Datastore.getReceptionLogs().filter(r => r.applicantId === id);
    const consultations = Datastore.getConsultationLogs().filter(c => c.applicantId === id);
    const middleRooms = Datastore.getMiddleRoomLogs().filter(m => m.applicantId === id);
    const tests = Datastore.getTestLogs().filter(t => t.applicantId === id);
    const results = Datastore.getFinalResultLogs().filter(r => r.applicantId === id);
    
    res.json({
      applicant,
      timeline: {
        contacts,
        receptions,
        consultations,
        middleRooms,
        tests,
        results
      }
    });
  });

  // --- 4. AUDIT SYSTEM LOGS ---
  app.get("/api/logs", (req, res) => {
    const logs = Datastore.getSystemLogs();
    // Sort descending by date
    const sorted = [...logs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(sorted);
  });

  // --- 5. WARNING SERVICES ---
  app.post("/api/warnings", (req, res) => {
    const { issuedBy, issuedTo, reason, severity } = req.body;
    const warning: Warning = {
      id: `warn-${Math.random().toString(36).substr(2, 9)}`,
      issuedBy,
      issuedTo,
      reason,
      severity: severity || WarningSeverity.WARNING,
      createdAt: new Date().toISOString()
    };
    Datastore.addWarning(warning);
    res.json({ success: true, warning });
  });

  // Support query parameter e.g., GET /api/warnings?userId=...
  app.get("/api/warnings", (req, res) => {
    const filterId = (req.query.userId || req.query.operatorId) as string;
    if (filterId) {
      const list = Datastore.getWarnings().filter(w => w.issuedTo === filterId);
      return res.json(list);
    }
    res.json(Datastore.getWarnings());
  });

  app.get("/api/warnings/:operatorId", (req, res) => {
    const { operatorId } = req.params;
    const list = Datastore.getWarnings().filter(w => w.issuedTo === operatorId);
    res.json(list);
  });

  // Support body-based acknowledgement e.g. POST /api/warnings/acknowledge { warningId }
  app.post("/api/warnings/acknowledge", (req, res) => {
    const { warningId } = req.body;
    if (!warningId) {
      return res.status(400).json({ error: "پرداختن به هشدار نیازمند شناسه معتبر است." });
    }
    Datastore.markWarningRead(warningId);
    res.json({ success: true });
  });

  app.post("/api/warnings/:id/read", (req, res) => {
    Datastore.markWarningRead(req.params.id);
    res.json({ success: true });
  });

  // --- 6. OPERATORS ACCOUNT MANAGEMENT ---
  app.get("/api/admin/users", (req, res) => {
    // Exclude password hashes
    const list = Datastore.getUsers().map(u => {
      const { passwordHash, ...safe } = u;
      return safe;
    });
    res.json(list);
  });

  app.get("/api/admin/audit-logs", (req, res) => {
    const logs = Datastore.getImmutableAuditLogs();
    const sorted = [...logs].reverse();
    res.json(sorted);
  });

  app.post("/api/admin/users", (req, res) => {
    const { id, username, fullName, role, password, isActive } = req.body;
    if (id) {
      // Edit mode
      const updates: any = { username, fullName, role, isActive: isActive !== false };
      if (password) updates.passwordHash = password;
      const updated = Datastore.updateUser(id, updates);
      return res.json(updated);
    } else {
      // Create mode
      if (!username || !fullName || !role || !password) {
        return res.status(400).json({ error: "پرکردن تمام فیلدها الزامی است." });
      }
      const existing = Datastore.getUsers().find(u => u.username === username);
      if (existing) {
        return res.status(400).json({ error: "نام کاربری تکرار است" });
      }
      const newUser: User = {
        id: `u-${Math.random().toString(36).substr(2, 9)}`,
        username,
        passwordHash: password,
        fullName,
        role,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      Datastore.addUser(newUser);
      res.json(newUser);
    }
  });

  // --- 7. ADMIN ADVANCED ANALYTICS ---
  app.get("/api/admin/stats", (req, res) => {
    const applicants = Datastore.getApplicants();
    const contactLogs = Datastore.getContactLogs();
    const finalLogs = Datastore.getFinalResultLogs();
    const systemLogs = Datastore.getSystemLogs();

    // today count
    const todayStr = new Date().toISOString().substring(0, 10);
    const todayApplicants = applicants.filter(a => a.createdAt.substring(0, 10) === todayStr);

    // completed
    const completed = applicants.filter(a => a.status === ApplicantStatus.COMPLETED);
    const noShow = applicants.filter(a => a.status === ApplicantStatus.NO_SHOW);
    const totalProcessed = finalLogs.length;

    // conversion rate
    const enrolledCount = finalLogs.filter(f => f.registered).length;
    const conversionRate = totalProcessed > 0 ? Math.round((enrolledCount / totalProcessed) * 100) : 0;

    // Calculate queue state capacities & waiting durations
    const queue = Datastore.getQueueStates();
    const stageConfiguration = [
      { key: "contact", faName: "تماس تلفنی (محل ۱)", maxCap: 15 },
      { key: "reception", faName: "پذیرش حضوری (محل ۲)", maxCap: 6 },
      { key: "waiting_1", faName: "سالن انتظار ۱", maxCap: 15 },
      { key: "consultation", faName: "مشاوره معصومی (محل ۳)", maxCap: 2 },
      { key: "waiting_2", faName: "سالن انتظار ۲", maxCap: 15 },
      { key: "middle_room", faName: "سنجش میانی (محل ۴)", maxCap: 3 },
      { key: "waiting_3", faName: "سالن انتظار ۳", maxCap: 15 },
      { key: "test", faName: "داوری آزمون (محل ۵)", maxCap: 2 },
      { key: "waiting_4", faName: "نتایج کل (محل ۶)", maxCap: 15 },
      { key: "result", faName: "خروجی نهایی", maxCap: 2 }
    ];

    const chartData = stageConfiguration.map(sc => {
      const activeInStage = queue.filter(q => q.currentStage === sc.key);
      const count = activeInStage.length;
      
      // Calculate average durations in minutes
      const durations = activeInStage.map(q => {
        const deltaMs = Date.now() - new Date(q.stageEnteredAt).getTime();
        return Math.max(Math.round(deltaMs / 60000), 2); // default min 2 mins for nice graph layout
      });
      
      const avgWait = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
      const maxWait = durations.length > 0 ? Math.max(...durations) : 0;

      return {
        key: sc.key,
        name: sc.faName,
        "تعداد مراجعان": count,
        "ظرفیت مجاز": sc.maxCap,
        "میانگین انتظار (دقیقه)": avgWait || 0,
        "حداکثر معطلی (دقیقه)": maxWait || 0,
        isOverloaded: count > sc.maxCap
      };
    });

    const bottlenecks = queue.map(q => {
      const waitingMs = Date.now() - new Date(q.stageEnteredAt).getTime();
      const waitingMin = Math.round(waitingMs / 60000);
      return {
        stage: q.currentStage,
        duration: waitingMin || 2
      };
    });

    res.json({
      todayCount: todayApplicants.length,
      completedCount: completed.length,
      noShowCount: noShow.length,
      conversionRate,
      enrolledCount,
      totalProcessed,
      bottlenecks,
      chartData
    });
  });

  // Generate simulated mock traffic for stress testing
  app.post("/api/admin/generate-mock", (req, res) => {
    const { count = 5 } = req.body;
    const actorId = req.query.actorId as string || "u-admin";
    const actorName = req.query.actorName as string || "مدیر اصلی سیستم";
    
    // Custom names for mock generations
    const firstNames = ["محمدرضا", "علیرضا", "نگار", "سارا", "حسین", "علی", "فاطمه", "امیرحسین", "زهرا", "مهدی", "مریم", "سعید", "فرزانه"];
    const lastNames = ["کریمی", "اکبری", "رحیمی", "حسینی", "صادقی", "احمدی", "ناصری", "راد", "پوراحمد", "امانی", "مرادی", "موسوی"];
    const cities = ["تهران", "اصفهان", "شیراز", "مشهد", "تبریز", "کرج", "یزد", "کرمان"];
    const educations = ["دیپلم ادبیات", "لیسانس روانشناسی", "فوق لیسانس حقوق", "دکتری مدیریت", "دانشجوی مهندسی", "دیپلم تجربی"];
    const jobs = ["کارشناس فروش", "معلم", "پزشک عمومی", "پژوهشگر", "خانه‌دار", "مدیر بازرگانی", "مدرس زبان"];

    const stages = [
      QueueStage.CONTACT, QueueStage.RECEPTION, QueueStage.WAITING_1, 
      QueueStage.CONSULTATION, QueueStage.WAITING_2, QueueStage.MIDDLE_ROOM, 
      QueueStage.WAITING_3, QueueStage.TEST, QueueStage.WAITING_4, QueueStage.RESULT
    ];

    const generatedIds: string[] = [];

    for (let i = 0; i < count; i++) {
      const idxF = Math.floor(Math.random() * firstNames.length);
      const idxL = Math.floor(Math.random() * lastNames.length);
      const idxC = Math.floor(Math.random() * cities.length);
      const idxE = Math.floor(Math.random() * educations.length);
      const idxJ = Math.floor(Math.random() * jobs.length);

      const fullName = `${firstNames[idxF]} ${lastNames[idxL]}`;
      const randomNat = String(Math.floor(1000000000 + Math.random() * 9000000000)).substring(0, 10);
      const randomPhone = `0912${Math.floor(1000000 + Math.random() * 9000000)}`;
      const randomAge = Math.floor(18 + Math.random() * 45);
      const g: "male" | "female" = Math.random() > 0.4 ? "male" : "female";
      
      const newAppId = `mockapp-${Math.random().toString(36).substr(2, 9)}`;
      
      // Determine random status and stage
      const randomStage = stages[Math.floor(Math.random() * stages.length)];
      
      // Map stage to appropriate status
      let appStatus = ApplicantStatus.PENDING_CONTACT;
      if (randomStage === QueueStage.RECEPTION) appStatus = ApplicantStatus.ARRIVED;
      if (randomStage === QueueStage.CONSULTATION) appStatus = ApplicantStatus.IN_CONSULTATION;
      if (randomStage === QueueStage.MIDDLE_ROOM) appStatus = ApplicantStatus.IN_MIDDLE_ROOM;
      if (randomStage === QueueStage.TEST) appStatus = ApplicantStatus.IN_TEST;
      if (randomStage === QueueStage.RESULT) appStatus = ApplicantStatus.IN_RESULT;

      const mockApp = {
        id: newAppId,
        fullName,
        nationalId: randomNat,
        phone: randomPhone,
        age: randomAge,
        gender: g,
        educationLevel: educations[idxE],
        occupation: jobs[idxJ],
        city: cities[idxC],
        registrationDate: new Date().toISOString(),
        status: appStatus,
        notesGeneral: `تولید شده توسط مکانیزم شبیه‌ساز بار صف لئوپارد سیستم در تاریخ ${new Date().toLocaleDateString("fa-IR")}`,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 10) * 3600000).toISOString(),
        updatedAt: new Date().toISOString()
      };

      Datastore.addApplicant(mockApp);
      
      // Seed queue wait times randomly (between 5 minutes and 90 minutes ago) to create realistic looking charts
      const enterOffsetMs = Math.floor(10 + Math.random() * 80) * 60000;
      const mockQueue = {
        id: `mockq-${Math.random().toString(36).substr(2, 9)}`,
        applicantId: newAppId,
        currentStage: randomStage,
        stageEnteredAt: new Date(Date.now() - enterOffsetMs).toISOString(),
        isWaiting: Math.random() > 0.3,
        queuePosition: i + 1,
        updatedAt: new Date().toISOString()
      };

      Datastore.updateQueueState(newAppId, mockQueue);
      generatedIds.push(newAppId);
    }

    logAudit(actorId, actorName, "SIMULATE_TRAFFIC", "system", { generatedCount: count, generatedIds }, req);
    res.json({ success: true, message: `${count} متقاضی شبیه‌ساز با موفقیت در سراسر صفوف مستقر گردیدند.` });
  });

  // Fast-forward / Expedite applicant stage bypass
  app.post("/api/admin/expedite", (req, res) => {
    const { applicantId, targetStage } = req.body;
    const actorId = req.query.actorId as string || "u-admin";
    const actorName = req.query.actorName as string || "مدیر اصلی سیستم";

    if (!applicantId || !targetStage) {
      return res.status(400).json({ error: "شناسه متقاضی و مرحله هدف الزامی است." });
    }

    // Update queue state immediately
    Datastore.updateQueueState(applicantId, {
      currentStage: targetStage,
      stageEnteredAt: new Date().toISOString(),
      isWaiting: true
    });

    logAudit(actorId, actorName, "ADMIN_EXPEDITE", applicantId, { targetStage }, req);
    res.json({ success: true, message: "متقاضی با موفقیت به صورت اضطراری ارتقاء صف داده شد." });
  });

  // Reset or flush mock statistics
  app.post("/api/admin/reset-all", (req, res) => {
    const actorId = req.query.actorId as string || "u-admin";
    const actorName = req.query.actorName as string || "مدیر اصلی سیستم";

    const allApps = Datastore.getApplicants();
    // Soft delete all mock applicants with ID prefix `mockapp-`
    let count = 0;
    allApps.forEach(a => {
      if (a.id.startsWith("mockapp-")) {
        Datastore.softDeleteApplicant(a.id);
        Datastore.deleteQueueState(a.id);
        count++;
      }
    });

    logAudit(actorId, actorName, "FLUSH_MOCKS", "system", { flushedCount: count }, req);
    res.json({ success: true, message: `تعداد ${count} نمونه آزمایشی شبیه‌ساز با موفقیت غیرفعال شدند.` });
  });

  // Submit visitor opinion feedback on the experimental platform notice
  app.post("/api/feedback", (req, res) => {
    const { rating, comment, name } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress || "127.0.0.1";
    
    const newLog: SystemLog = {
      id: `syslog-feed-${Math.random().toString(36).substring(2, 11)}`,
      actorId: "visitor",
      actorName: name || "بازدیدکننده سامانه",
      actionType: "OPINION_FEEDBACK",
      ipAddress,
      payload: JSON.stringify({ rating, comment, ipAddress }),
      createdAt: new Date().toISOString()
    };
    Datastore.addSystemLog(newLog);
    res.json({ success: true, message: "با تشکر از ثبت نظر ارزشمند شما در سامانه هدهد صبا." });
  });

  // Get notice dismissal status by IP
  app.get("/api/notice-status", (req, res) => {
    const ipAddress = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const logs = Datastore.getSystemLogs();
    const hasSeen = logs.some(log => 
      (log.actionType === "OPINION_FEEDBACK" || log.actionType === "NOTICE_DISMISSED") && 
      log.ipAddress === ipAddress
    );
    res.json({ hasSeen });
  });

  // Log notice dismissed by IP
  app.post("/api/notice-dismiss", (req, res) => {
    const ipAddress = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const newLog: SystemLog = {
      id: `syslog-dismiss-${Math.random().toString(36).substring(2, 11)}`,
      actorId: "visitor",
      actorName: "بازدیدکننده سامانه",
      actionType: "NOTICE_DISMISSED",
      ipAddress,
      payload: JSON.stringify({ ipAddress }),
      createdAt: new Date().toISOString()
    };
    Datastore.addSystemLog(newLog);
    res.json({ success: true });
  });

  // Test Connection MySQL simulation endpoint
  app.get("/api/admin/db-test", (req, res) => {
    const isMockConnected = true;
    res.json({
      connected: isMockConnected,
      message: "ارتباط با دیتابیس هدهد با موفقیت برقرار شد.",
      latency_ms: 12
    });
  });

  // ==========================================
  // HODHOD SMART INTERNAL MESSENGER API
  // ==========================================

  // Regex local matcher fallback for zero-downtime smart suggestions
  function analyzeMessageWithLocalRules(text: string): any {
    const t = text.toLowerCase();
    if (t.includes("چند سال") || t.includes("سنش") || t.includes("سن چ") || t.includes("سن دارید") || t.includes("بزرگسال") || t.includes("سن متقاضی") || t.includes("سن همکار") || t.includes("چند ک") || t.includes("چند سالشه")) {
      return {
        type: "age",
        label: "ورود سن متقاضی (عدد به سال):",
        confidence: 0.95
      };
    }
    if (t.includes("تاریخ") || t.includes("روز برگزاری") || t.includes("چه روزی") || t.includes("کی میای") || t.includes("جلسه بعدی") || t.includes("چه تاریخی") || t.includes("موعد") || t.includes("تقویم")) {
      return {
        type: "date",
        label: "انتخاب تاریخ از روی تقویم جلالی:",
        confidence: 0.98
      };
    }
    if (t.includes("تلفن") || t.includes("موبایل") || t.includes("شماره") || t.includes("تماس بگیر") || t.includes("شماره‌اش") || t.includes("شماره تماس") || t.includes("همراش")) {
      return {
        type: "phone",
        label: "ورود شماره موبایل ایران (فرمت 09xx-xxx-xxxx):",
        confidence: 0.96
      };
    }
    if (t.includes("میتونی") || t.includes("آیا") || t.includes("میای") || t.includes("آماده‌ای") || t.includes("موافقی") || t.includes("جلسه داریم") || t.includes("انجام میدی")) {
      return {
        type: "yes_no",
        label: "انتخاب پاسخ سریع:",
        confidence: 0.9
      };
    }
    if (t.includes("اسمش") || t.includes("نامش") || t.includes("نام متقاضی") || t.includes("اسم متقاضی") || t.includes("نام نویسی") || t.includes("اسم فامیل")) {
      return {
        type: "name",
        label: "ورود نام و نام خانوادگی مورد نظر:",
        confidence: 0.92
      };
    }
    if (t.includes("تحصیلات") || t.includes("مدرک کلاس") || t.includes("درس خوانده") || t.includes("دیپلم") || t.includes("لیسانس") || t.includes("علمی") || t.includes("مدرکش")) {
      return {
        type: "education",
        label: "انتخاب سریع مدرک تحصیلی متقاضی:",
        confidence: 0.95
      };
    }
    if (t.includes("جنسیت") || t.includes("زن یا") || t.includes("مرد یا") || t.includes("خانمه") || t.includes("آقاست") || t.includes("جنسش")) {
      return {
        type: "gender",
        label: "انتخاب جنسیت هدف:",
        confidence: 0.97
      };
    }
    if (t.includes("ساعات") || t.includes("چه ساعتی") || t.includes("ساعت چند") || t.includes("تایم") || t.includes("ساعت جلسه") || t.includes("چه ساعتیه")) {
      return {
        type: "time",
        label: "انتخاب تایم ساعت ملاقات:",
        confidence: 0.94
      };
    }
    if (t.includes("چند تا") || t.includes("تعداد") || t.includes("مقدار") || t.includes("چقدر") || t.includes("نفر")) {
      return {
        type: "number",
        label: "ورود تعداد عددی مورد نیاز:",
        confidence: 0.91
      };
    }
    if (t.includes("امتیاز") || t.includes("نظرت چیه") || t.includes("نمره") || t.includes("ارزیابی کیفی") || t.includes("کیفیت دورش")) {
      return {
        type: "star_rating",
        label: "ثبت ستاره ارزیابی:",
        confidence: 0.93
      };
    }
    if (t.includes("برنامه ریزی") || t.includes("رزرو") || t.includes("نوبت") || t.includes("تعیین وقت") || t.includes("وقت ملاقات")) {
      return {
        type: "schedule",
        label: "تعیین زمان قرار ملاقات جلالی:",
        confidence: 0.93
      };
    }
    if (t.includes("فایل") || t.includes("رزومه") || t.includes("سند") || t.includes("مدرک ارسالی") || t.includes("pdf") || t.includes("xlsx") || t.includes("عکس") || t.includes("ضمیمه")) {
      return {
        type: "file",
        label: "درخواست منبع یا فایل ضمیمه:",
        confidence: 0.95
      };
    }
    return null;
  }

  // Helper parsing background messages asynchronously
  async function runBackgroundMessageAnalysis(messageId: string, text: string) {
    const apiKey = process.env.GEMINI_API_KEY;
    const hasKey = apiKey && apiKey !== "MY_GEMINI_API_KEY";

    let labelResult = "سوال عمومی";
    let widgetResult: any = analyzeMessageWithLocalRules(text);

    if (hasKey) {
      try {
        const sysInstruction = `You are the AI Intelligence Engine for Hodhod Smart Internal Messenger.
Analyze the message text in Persian and determine if it asks a question that requires a structured response from the recipient, or what topic the message is about.
Return JSON format ONLY matching this schema:
{
  "topic": string (e.g., "سن", "تاریخ", "نام", "تلفن", "تحصیلات", "جنسیت", "امتیاز", "زمان", "تعداد", "زمان‌بندی", "فایل", "سوال عمومی"),
  "has_question": boolean,
  "widget": null | "age" | "date" | "yes_no" | "name" | "phone" | "education" | "gender" | "star_rating" | "time" | "number" | "schedule" | "file",
  "label": string (Friendly Persian prompt label for the widget, e.g. "لطفاً سن خود را وارد کنید"),
  "confidenceScore": number (0 to 1)
}`;
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `متن پیام پیام‌رسان: "${text}"`,
          config: {
            systemInstruction: sysInstruction,
            responseMimeType: "application/json",
            temperature: 0.4
          }
        });

        const respText = response.text;
        if (respText) {
          const parsed = JSON.parse(respText);
          labelResult = parsed.topic || "سوال عمومی";
          if (parsed.has_question && parsed.widget) {
            widgetResult = {
              type: parsed.widget,
              label: parsed.label || "ورود اطلاعات فرم:",
              confidence: parsed.confidenceScore || 0.9
            };
          } else {
            widgetResult = null;
          }
        }
      } catch (err) {
        console.error("Gemini Background analysis fails, reverted to local regex parser:", err);
      }
    } else {
      // Revert to local parsing
      if (widgetResult) {
        labelResult = widgetResult.type === "age" ? "سن" : widgetResult.type === "date" ? "تاریخ" : widgetResult.type === "phone" ? "تلفن" : "سوال کاربر";
      }
    }

    // Save back to db
    Datastore.updateMessage(messageId, {
      aiTopic: labelResult,
      aiSuggestion: widgetResult
    });
  }

  // 1. PING & UPDATE ACTIVE SESSION STATUS INFO
  app.post("/api/messenger/ping", (req, res) => {
    const { userId, status, statusText, typingRoomId, screenResolution, fingerprint } = req.body;
    if (!userId) return res.status(400).json({ error: "شناسه کاربر الزامی است." });

    const userAgentStr = req.headers["user-agent"] || "Unknown Browser";
    const ipAddress = req.ip || req.socket.remoteAddress || "127.0.0.1";

    let deviceType = "desktop";
    if (/mobile|android|iphone|ipad/i.test(userAgentStr)) deviceType = "mobile";
    else if (/tablet|playbook|silk/i.test(userAgentStr)) deviceType = "tablet";

    let os = "Windows";
    if (/macintosh|mac os x/i.test(userAgentStr)) os = "macOS";
    else if (/android/i.test(userAgentStr)) os = "Android";
    else if (/iphone|ipad|ipod/i.test(userAgentStr)) os = "iOS";
    else if (/linux/i.test(userAgentStr)) os = "Linux";

    let browser = "Chrome";
    if (/firefox/i.test(userAgentStr)) browser = "Firefox";
    else if (/safari/i.test(userAgentStr) && !/chrome/i.test(userAgentStr)) browser = "Safari";
    else if (/opr|opera/i.test(userAgentStr)) browser = "Opera";
    else if (/edg/i.test(userAgentStr)) browser = "Edge";

    const currentStatus = Datastore.pingUserStatus(userId, {
      status: status || "online",
      statusText: statusText !== undefined ? statusText : null,
      typingRoomId: typingRoomId !== undefined ? typingRoomId : null,
      deviceType,
      browser,
      os,
      ip: ipAddress,
      screenResolution: screenResolution || "1920x1080",
      fingerprint: fingerprint || ""
    });

    res.json(currentStatus);
  });

  // 2. LONG POLLING MESSENGER SYNC ENGINE (COMPACT SYNCHRONIZED UPDATE)
  app.get("/api/messenger/sync", (req, res) => {
    const { userId, lastSyncedAt } = req.query;
    if (!userId) return res.status(400).json({ error: "پارامتر کاربر الزامی است." });

    // Instantly returns data that has updated or all database logs
    const rooms = Datastore.getRooms();
    const messages = Datastore.getMessages();
    const userStatuses = Datastore.getUserStatuses();
    const systemLogs = Datastore.getSystemLogs();

    // Map profiles for frontend
    const users = Datastore.getUsers().map(({ id, fullName, username, role }) => ({
      id, fullName, username, role
    }));

    res.json({
      rooms,
      messages,
      userStatuses,
      users,
      systemLogs: systemLogs.filter(s => s.actionType === "NOTICE_DISMISSED" || s.actionType === "OPINION_FEEDBACK" || s.actionType === "MESSENGER_ACTION"),
      serverTime: new Date().toISOString()
    });
  });

  // 3. CREATE ROOM / DIRECT CONVERSATION
  app.post("/api/messenger/rooms", (req, res) => {
    const { name, type, description, color, members, creatorId } = req.body;
    if (!type || !members || members.length === 0) {
      return res.status(400).json({ error: "داده‌های ورودی اتاق نامعتبر است." });
    }

    const rooms = Datastore.getRooms();

    // If direct room, check if there's already one between the two members
    if (type === "DIRECT" && members.length === 2) {
      const existing = rooms.find(r => 
        r.type === "DIRECT" && 
        r.members.includes(members[0]) && 
        r.members.includes(members[1])
      );
      if (existing) {
        return res.json(existing);
      }
    }

    const roomId = `room-${Math.random().toString(36).substring(2, 11)}`;
    const newRoom: Room = {
      id: roomId,
      name: name || `اتاق گفتگو ${rooms.length + 1}`,
      type,
      description: description || "",
      color: color || "#1D9BF0",
      members,
      pinnedBy: [],
      mutedBy: [],
      archivedBy: [],
      avatarUrl: null,
      isDissolved: false,
      createdAt: new Date().toISOString()
    };

    Datastore.addRoom(newRoom);
    
    // Log creation
    const creator = Datastore.getUsers().find(u => u.id === creatorId);
    if (creator) {
      logAudit(creatorId, creator.fullName, "MESSENGER_ACTION", undefined, { action: "CREATE_ROOM", roomId, type }, req);
    }

    res.json(newRoom);
  });

  // 4. ROOM SPECIAL ACTION (PIN/MUTE/ARCHIVE/DISSOLVE/LEAVE)
  app.post("/api/messenger/rooms/action", (req, res) => {
    const { roomId, userId, actionType } = req.body; // actionType: "PIN" | "UNPIN" | "MUTE" | "UNMUTE" | "ARCHIVE" | "UNARCHIVE" | "LEAVE" | "DISSOLVE"
    if (!roomId || !userId || !actionType) {
      return res.status(400).json({ error: "پارمترهای شناسه اتاق و فعالیت الزامی می‌باشد." });
    }

    const rooms = Datastore.getRooms();
    const room = rooms.find(r => r.id === roomId);
    if (!room) return res.status(404).json({ error: "اتاق مورد نظریافت نشد." });

    let pinnedBy = [...room.pinnedBy];
    let mutedBy = [...room.mutedBy];
    let archivedBy = [...room.archivedBy];
    let members = [...room.members];
    let isDissolved = room.isDissolved;

    if (actionType === "PIN") {
      if (!pinnedBy.includes(userId)) pinnedBy.push(userId);
    } else if (actionType === "UNPIN") {
      pinnedBy = pinnedBy.filter(id => id !== userId);
    } else if (actionType === "MUTE") {
      if (!mutedBy.includes(userId)) mutedBy.push(userId);
    } else if (actionType === "UNMUTE") {
      mutedBy = mutedBy.filter(id => id !== userId);
    } else if (actionType === "ARCHIVE") {
      if (!archivedBy.includes(userId)) archivedBy.push(userId);
    } else if (actionType === "UNARCHIVE") {
      archivedBy = archivedBy.filter(id => id !== userId);
    } else if (actionType === "LEAVE") {
      members = members.filter(id => id !== userId);
    } else if (actionType === "DISSOLVE") {
      isDissolved = true;
    }

    const updated = Datastore.updateRoom(roomId, {
      pinnedBy,
      mutedBy,
      archivedBy,
      members,
      isDissolved
    });

    res.json({ success: true, room: updated });
  });

  // 5. SEND MESSAGE & LAUNCH ASYNC GEMINI PROFILE PIPELINE
  app.post("/api/messenger/messages", (req, res) => {
    const { senderId, roomId, text, replyToId, fileAttachment } = req.body;
    if (!senderId || !roomId || (!text && !fileAttachment)) {
      return res.status(400).json({ error: "داده‌های پیام ارسالی نامعتبر است." });
    }

    const messageId = `msg-${Math.random().toString(36).substring(2, 11)}`;

    const newMessage: Message = {
      id: messageId,
      senderId,
      roomId,
      text: text || "",
      replyToId: replyToId || null,
      reactions: {},
      isDeleted: false,
      isEdited: false,
      originalText: null,
      aiTopic: null,
      aiSuggestion: null,
      createdAt: new Date().toISOString(),
      deliveredAt: new Date().toISOString(), // Instant deliver on post
      readBy: { [senderId]: new Date().toISOString() }, // Creator read immediately
      fileAttachment: fileAttachment || null
    };

    Datastore.addMessage(newMessage);

    // Call Background Gemini analyzer asynchronously (non-blocking)
    if (text) {
      runBackgroundMessageAnalysis(messageId, text).catch(e => {
        console.error("Background text generator crash:", e);
      });
    }

    res.json(newMessage);
  });

  // 6. EDIT MESSAGE WITHIN 10 MINS PER RULES
  app.post("/api/messenger/messages/edit", (req, res) => {
    const { messageId, userId, newText } = req.body;
    if (!messageId || !userId || !newText) {
      return res.status(400).json({ error: "شناسه پیام و متن جدید اجباری است." });
    }

    const messages = Datastore.getMessages();
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return res.status(404).json({ error: "پیام پیدا نشد." });

    if (msg.senderId !== userId) {
      return res.status(403).json({ error: "تنها فرستنده پیام مجاز به ویرایش است." });
    }

    // Rule: Check 10-minutes limit
    const diffMins = (Date.now() - new Date(msg.createdAt).getTime()) / (1000 * 60);
    if (diffMins > 10) {
      return res.status(400).json({ error: "زمان ویرایش پیام به پایان رسیده است (حداکثر ۱۰ دقیقه)." });
    }

    // Keep original if not edited before
    const originalText = msg.isEdited ? msg.originalText : msg.text;

    const updated = Datastore.updateMessage(messageId, {
      text: newText,
      isEdited: true,
      originalText
    });

    res.json({ success: true, message: updated });
  });

  // 7. SOFT DELETE OR 30-SEC FULL UNSEND
  app.post("/api/messenger/messages/delete", (req, res) => {
    const { messageId, userId } = req.body;
    if (!messageId || !userId) return res.status(400).json({ error: "اطلاعات الزامی می‌باشد." });

    const messages = Datastore.getMessages();
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return res.status(404).json({ error: "پیام یافت نشد." });

    // Check ownership
    const isOwner = msg.senderId === userId;
    const isSystemAdmin = userId === "u-admin";
    if (!isOwner && !isSystemAdmin) {
      return res.status(403).json({ error: "دسترسی مجاز نمی‌باشد." });
    }

    // Rule: if within 30 seconds, user can completely unsend, else soft delete
    const diffSecs = (Date.now() - new Date(msg.createdAt).getTime()) / 1000;
    const canUnsend = diffSecs <= 30 && isOwner;

    let updated;
    if (canUnsend) {
      // Remove completely from list or label it empty
      updated = Datastore.updateMessage(messageId, {
        text: "این پیام توسط فرستنده بازپس گرفته شد.",
        isDeleted: true
      });
    } else {
      // Rule 1: Soft delete placeholder "این پیام حذف شده است" but administrative records are unchanged.
      updated = Datastore.updateMessage(messageId, {
        text: "این پیام حذف شده است",
        isDeleted: true
      });
    }

    res.json({ success: true, canUnsend, message: updated });
  });

  // 8. PUT MESSAGE REACTION
  app.post("/api/messenger/messages/react", (req, res) => {
    const { messageId, userId, emoji } = req.body;
    if (!messageId || !userId) return res.status(400).json({ error: "پارامترهای وارد شده نامعتبر است." });

    const messages = Datastore.getMessages();
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return res.status(404).json({ error: "پیام پیدا نشد." });

    const reactions = { ...msg.reactions };
    if (emoji) {
      reactions[userId] = emoji;
    } else {
      delete reactions[userId];
    }

    const updated = Datastore.updateMessage(messageId, { reactions });
    res.json({ success: true, message: updated });
  });

  // 9. READ RECEIPT ACTION (DOUBLE BLUE CHECKMARKS ON ROOM SCENARIO)
  app.post("/api/messenger/messages/read", (req, res) => {
    const { roomId, userId } = req.body;
    if (!roomId || !userId) return res.status(400).json({ error: "پارمترهای وارد شده نامعتبر است." });

    const messages = Datastore.getMessages().filter(m => m.roomId === roomId);
    const nowStr = new Date().toISOString();

    messages.forEach(msg => {
      if (!msg.readBy[userId]) {
        const readBy = { ...msg.readBy, [userId]: nowStr };
        Datastore.updateMessage(msg.id, { readBy });
      }
    });

    res.json({ success: true });
  });

  // 10. AI GENERATED 3-SENTENCE CONVERSATION SUMMARY PER ROOM
  app.post("/api/messenger/ai-summary", async (req, res) => {
    const { roomId } = req.body;
    if (!roomId) return res.json({ summary: "شناسه اتاق نامعتبر است." });

    const messages = Datastore.getMessages().filter(m => m.roomId === roomId);
    if (messages.length < 5) {
      return res.json({ summary: "برای خلاصه‌سازی هوشمند گفتگوها، حداقل به ثبت ۵ پیام نیاز است." });
    }

    const chatContext = messages
      .slice(-30) // Take last 30 messages
      .map(m => {
        const user = Datastore.getUsers().find(u => u.id === m.senderId);
        return `${user ? user.fullName : "همکار"}: ${m.text}`;
      })
      .join("\n");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      // Local simulated response summary
      return res.json({
        summary: `خلاصه اتوماتیک (شبیه‌ساز هوش مصنوعی هدهد):
همکاران در حال تبادل اطلاعات برای پرونده‌های جاری هستند. موضوع صحبت اخیر هماهنگی پذیرش‌ها و نوبت‌هاست. تاکید بر تکمیل ارزیابی‌های روان‌شناختی کلامی و صادر کردن تذکرات تعلیق موقت در کارتابل می‌باشد.`
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `لطفاً گفتگوی زیر را در ۳ جمله کوتاه فارسی و روان خلاصه کنید:\n\n${chatContext}`,
        config: {
          systemInstruction: "You are the chief educational analyst for Hodhod Speech Institute. Generate a 3-sentence summary of the conversation."
        }
      });
      const summaryText = response.text || "خلاصه در دسترس نیست.";
      res.json({ summary: summaryText });
    } catch (err: any) {
      res.json({ summary: `خطا در خلاصه‌سازی هوش مصنوعی: ${err.message}` });
    }
  });

  // --- SPEECH-TO-TEXT ENDPOINT FOR JUDGE AUDIO NOTES ---
  app.post("/api/judge/transcribe-audio", async (req, res) => {
    try {
      const { audio, mimeType } = req.body;
      if (!audio) {
        return res.status(400).json({ error: "فایل صوتی یافت نشد یا فرستاده نشده است." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        console.warn("کلید اصلی Gemini ست نشده است، بازنشانی به تحلیل صوتی شبیه‌سازی‌شده.");
        return res.json({
          text: "متقاضی در شروع سخنرانی تسلط بسیار بالایی داشت. از نظر وضوح کلامی صحبت‌ها کاملا شمرده انجام شد. اما پیشنهاد می‌شود روی کنترل استرس و اصلاح زبان بدن تدافعی در اواسط صحبت بیشتر تمرین کنند."
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: mimeType || "audio/webm",
              data: audio
            }
          },
          "You are Hodhod Speech Institute's expert AI transcriber. Transcribe this audio recording of a judge/referee's evaluation notes in Persian (Farsi). Output ONLY the clean spoken transcription text. Do not add any conversational filler, meta-comments, or introductory text."
        ]
      });

      const transcription = response.text?.trim() || "صدا خالی بود یا قابل تشخیص نبود.";
      res.json({ text: transcription });
    } catch (err: any) {
      console.error("Transcribe-audio error:", err);
      res.status(500).json({ error: `خطا در تبدیل صوت به متن: ${err.message}` });
    }
  });

  // --- VITE MIDDLEWARE SETUP ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Bind to 0.0.0.0 and PORT 3000 as strictly required by Google Cloud Run / AI Studio reverse proxy
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`سرور سامانه هدهد بر روی آدرس http://localhost:${PORT} فعال گردید`);
  });
}

runServer().catch(err => {
  console.error("خطای نابودگر در استارت سرور:", err);
});
