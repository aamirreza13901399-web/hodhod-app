/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import { getPersianDateTimeString } from "../lib/dateUtils.js";
import {
  User,
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
  UserRole,
  ApplicantStatus,
  QueueStage,
  ImmutableAuditLog,
  Message,
  Room,
  UserStatus
} from "../types.js";

const DB_FILE = path.resolve(process.cwd(), "db.json");

interface DatabaseSchema {
  users: User[];
  applicants: Applicant[];
  contactLogs: ContactLog[];
  receptionLogs: ReceptionLog[];
  consultationLogs: ConsultationLog[];
  immutableAuditLogs: ImmutableAuditLog[];
  middleRoomLogs: MiddleRoomLog[];
  testLogs: TestLog[];
  finalResultLogs: FinalResultLog[];
  queueStates: QueueState[];
  systemLogs: SystemLog[];
  warnings: Warning[];
  messages: Message[];
  rooms: Room[];
  userStatuses: UserStatus[];
}

const DEFAULT_USERS: User[] = [
  {
    id: "u-admin",
    username: "admin",
    passwordHash: "admin123", // Plain text check/bcrypt simulated for simple reliable sandbox auth
    fullName: "مدیر اصلی سیستم (ادمین)",
    role: UserRole.ADMIN,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "u-contact",
    username: "contact",
    passwordHash: "contact123",
    fullName: "اپراتور تماس (مرحله ۱)",
    role: UserRole.CONTACT_OP,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "u-zamani",
    username: "zamani",
    passwordHash: "zamani123",
    fullName: "خانم زمانی (پذیرش)",
    role: UserRole.RECEPTION,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "u-masoumi",
    username: "masoumi",
    passwordHash: "masoumi123",
    fullName: "آقای معصومی (مشاور)",
    role: UserRole.CONSULTANT,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "u-rezaei",
    username: "rezaei",
    passwordHash: "rezaei123",
    fullName: "خانم رضایی (اتاق میانی)",
    role: UserRole.MIDDLE_ROOM,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "u-tahani",
    username: "tahani",
    passwordHash: "tahani123",
    fullName: "خانم طحانی (ارزیاب ارشد)",
    role: UserRole.PRESENTER_A,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "u-rezaei-b",
    username: "rezaeib",
    passwordHash: "rezaeib123",
    fullName: "خانم رضایی ارزیاب کمکی",
    role: UserRole.PRESENTER_B,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "u-kazemi",
    username: "kazemi",
    passwordHash: "kazemi123",
    fullName: "آقای کاظمی (داور)",
    role: UserRole.JUDGE,
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

const INITIAL_DB: DatabaseSchema = {
  users: DEFAULT_USERS,
  applicants: [
    {
      id: "app-1",
      fullName: "امیررضا علوی",
      nationalId: "1271234567",
      phone: "09121234567",
      age: 24,
      gender: "male",
      educationLevel: "لیسانس مهندسی کامپیوتر",
      occupation: "برنامه‌نویس",
      city: "تهران",
      digiformSubmissionId: "submission-101",
      registrationDate: new Date().toISOString(),
      status: ApplicantStatus.PENDING_CONTACT,
      notesGeneral: "علاقه‌مند به بهبود سخنرانی و اعتماد به نفس در پرزنت‌های کاری.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "app-2",
      fullName: "سارا حسینی",
      nationalId: "0027654321",
      phone: "09199876543",
      age: 19,
      gender: "female",
      educationLevel: "دیپلم تجربی",
      occupation: "دانشجو",
      city: "اصفهان",
      digiformSubmissionId: "submission-102",
      registrationDate: new Date().toISOString(),
      status: ApplicantStatus.ARRIVED,
      notesGeneral: "بسیار پرانرژی، می‌خواهد برای المپیاد فن بیان آماده شود جیتر شدید در سخنرانی دارد.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  contactLogs: [],
  receptionLogs: [],
  consultationLogs: [],
  middleRoomLogs: [],
  testLogs: [],
  finalResultLogs: [],
  queueStates: [
    {
      id: "q-1",
      applicantId: "app-1",
      currentStage: QueueStage.CONTACT,
      stageEnteredAt: new Date().toISOString(),
      isWaiting: true,
      queuePosition: 1,
      updatedAt: new Date().toISOString()
    },
    {
      id: "q-2",
      applicantId: "app-2",
      currentStage: QueueStage.CONSULTATION,
      stageEnteredAt: new Date().toISOString(),
      isWaiting: true,
      queuePosition: 2,
      updatedAt: new Date().toISOString()
    }
  ],
  systemLogs: [
    {
      id: "syslog-1",
      actorId: "u-admin",
      actorName: "مدیر سیستم",
      actionType: "INIT_SYSTEM",
      payload: JSON.stringify({ message: "پایگاه داده هدهد راه‌اندازی شد" }),
      ipAddress: "127.0.0.1",
      createdAt: new Date().toISOString()
    }
  ],
  warnings: [],
  immutableAuditLogs: [],
  messages: [],
  rooms: [
    {
      id: "room-all",
      name: "گروه کلی پرسنل هدهد",
      type: "GROUP",
      description: "گپ و گفتگوی کاری تمام همکاران موسسه بیان هدهد صبا",
      color: "#1D9BF0",
      members: ["u-admin", "u-contact", "u-zamani", "u-masoumi", "u-rezaei", "u-tahani", "u-rezaei-b", "u-kazemi"],
      pinnedBy: [],
      mutedBy: [],
      archivedBy: [],
      avatarUrl: null,
      isDissolved: false,
      createdAt: new Date().toISOString()
    },
    {
      id: "room-broadcast",
      name: "کانال اطلاعیه‌های مدیریتی",
      type: "BROADCAST",
      description: "کانال رسمی ارسال اخبار، بخشنامه‌ها و هشدارهای اداری موسسه",
      color: "#8B5CF6",
      members: ["u-admin", "u-contact", "u-zamani", "u-masoumi", "u-rezaei", "u-tahani", "u-rezaei-b", "u-kazemi"],
      pinnedBy: [],
      mutedBy: [],
      archivedBy: [],
      avatarUrl: null,
      isDissolved: false,
      createdAt: new Date().toISOString()
    }
  ],
  userStatuses: []
};

export class Datastore {
  private static cache: DatabaseSchema | null = null;

  private static load(): DatabaseSchema {
    if (this.cache) return this.cache;
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        this.cache = JSON.parse(raw);
        // Ensure keys exist in loaded JSON
        if (this.cache) {
          this.cache.users = this.cache.users || DEFAULT_USERS;
          this.cache.applicants = this.cache.applicants || [];
          this.cache.contactLogs = this.cache.contactLogs || [];
          this.cache.receptionLogs = this.cache.receptionLogs || [];
          this.cache.consultationLogs = this.cache.consultationLogs || [];
          this.cache.middleRoomLogs = this.cache.middleRoomLogs || [];
          this.cache.testLogs = this.cache.testLogs || [];
          this.cache.finalResultLogs = this.cache.finalResultLogs || [];
          this.cache.queueStates = this.cache.queueStates || [];
          this.cache.systemLogs = this.cache.systemLogs || [];
          this.cache.warnings = this.cache.warnings || [];
          this.cache.immutableAuditLogs = this.cache.immutableAuditLogs || [];
          this.cache.messages = this.cache.messages || [];
          this.cache.rooms = this.cache.rooms || [];
          this.cache.userStatuses = this.cache.userStatuses || [];
          return this.cache;
        }
      }
    } catch (e) {
      console.error("خطا در بارگذاری دیتابیس لوکال، بازنشانی به داده اولیه", e);
    }


    // Write default if not exist
    this.cache = INITIAL_DB;
    this.save();
    return this.cache;
  }

  private static save(): void {
    if (!this.cache) return;
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.cache, null, 2), "utf-8");
    } catch (e) {
      console.error("خطا در نوشتن دیتابیس لوکال", e);
    }
  }

  // --- Core CRUD API ---

  public static getUsers(): User[] {
    return this.load().users;
  }

  public static addUser(user: User): void {
    const db = this.load();
    db.users.push(user);
    this.save();
  }

  public static updateUser(id: string, updates: Partial<User>): User | null {
    const db = this.load();
    const idx = db.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    db.users[idx] = { ...db.users[idx], ...updates };
    this.save();
    return db.users[idx];
  }

  public static getApplicants(): Applicant[] {
    // Only return non-deleted applicants to enforce Soft Delete
    return this.load().applicants.filter(a => !a.deletedAt);
  }

  public static getAllApplicantsWithDeleted(): Applicant[] {
    return this.load().applicants;
  }

  public static addApplicant(applicant: Applicant): void {
    const db = this.load();
    db.applicants.push(applicant);
    this.save();
  }

  public static updateApplicant(id: string, updates: Partial<Applicant>): Applicant | null {
    const db = this.load();
    const idx = db.applicants.findIndex(a => a.id === id);
    if (idx === -1) return null;
    db.applicants[idx] = { ...db.applicants[idx], ...updates, updatedAt: new Date().toISOString() };
    this.save();
    return db.applicants[idx];
  }

  public static softDeleteApplicant(id: string): boolean {
    const db = this.load();
    const idx = db.applicants.findIndex(a => a.id === id);
    if (idx === -1) return false;
    db.applicants[idx].deletedAt = new Date().toISOString();
    this.save();
    return true;
  }

  public static getContactLogs(): ContactLog[] {
    return this.load().contactLogs;
  }

  public static addContactLog(log: ContactLog): void {
    const db = this.load();
    db.contactLogs.push(log);
    this.save();
  }

  public static getReceptionLogs(): ReceptionLog[] {
    return this.load().receptionLogs;
  }

  public static addReceptionLog(log: ReceptionLog): void {
    const db = this.load();
    db.receptionLogs.push(log);
    this.save();
  }

  public static getConsultationLogs(): ConsultationLog[] {
    return this.load().consultationLogs;
  }

  public static addConsultationLog(log: ConsultationLog): void {
    const db = this.load();
    db.consultationLogs.push(log);
    this.save();
  }

  public static getMiddleRoomLogs(): MiddleRoomLog[] {
    return this.load().middleRoomLogs;
  }

  public static addMiddleRoomLog(log: MiddleRoomLog): void {
    const db = this.load();
    db.middleRoomLogs.push(log);
    this.save();
  }

  public static getTestLogs(): TestLog[] {
    return this.load().testLogs;
  }

  public static addTestLog(log: TestLog): void {
    const db = this.load();
    db.testLogs.push(log);
    this.save();
  }

  public static updateTestLog(id: string, updates: Partial<TestLog>): TestLog | null {
    const db = this.load();
    const idx = db.testLogs.findIndex(t => t.id === id);
    if (idx === -1) return null;
    db.testLogs[idx] = { ...db.testLogs[idx], ...updates };
    this.save();
    return db.testLogs[idx];
  }

  public static updateContactLog(id: string, updates: Partial<ContactLog>): ContactLog | null {
    const db = this.load();
    const idx = db.contactLogs.findIndex(c => c.id === id);
    if (idx === -1) return null;
    db.contactLogs[idx] = { ...db.contactLogs[idx], ...updates };
    this.save();
    return db.contactLogs[idx];
  }

  public static updateReceptionLog(id: string, updates: Partial<ReceptionLog>): ReceptionLog | null {
    const db = this.load();
    const idx = db.receptionLogs.findIndex(r => r.id === id);
    if (idx === -1) return null;
    db.receptionLogs[idx] = { ...db.receptionLogs[idx], ...updates };
    this.save();
    return db.receptionLogs[idx];
  }

  public static updateConsultationLog(id: string, updates: Partial<ConsultationLog>): ConsultationLog | null {
    const db = this.load();
    const idx = db.consultationLogs.findIndex(c => c.id === id);
    if (idx === -1) return null;
    db.consultationLogs[idx] = { ...db.consultationLogs[idx], ...updates };
    this.save();
    return db.consultationLogs[idx];
  }

  public static updateMiddleRoomLog(id: string, updates: Partial<MiddleRoomLog>): MiddleRoomLog | null {
    const db = this.load();
    const idx = db.middleRoomLogs.findIndex(m => m.id === id);
    if (idx === -1) return null;
    db.middleRoomLogs[idx] = { ...db.middleRoomLogs[idx], ...updates };
    this.save();
    return db.middleRoomLogs[idx];
  }

  public static updateFinalResultLog(id: string, updates: Partial<FinalResultLog>): FinalResultLog | null {
    const db = this.load();
    const idx = db.finalResultLogs.findIndex(f => f.id === id);
    if (idx === -1) return null;
    db.finalResultLogs[idx] = { ...db.finalResultLogs[idx], ...updates };
    this.save();
    return db.finalResultLogs[idx];
  }

  public static getFinalResultLogs(): FinalResultLog[] {
    return this.load().finalResultLogs;
  }

  public static addFinalResultLog(log: FinalResultLog): void {
    const db = this.load();
    db.finalResultLogs.push(log);
    this.save();
  }

  public static getQueueStates(): QueueState[] {
    return this.load().queueStates;
  }

  public static updateQueueState(applicantId: string, updates: Partial<QueueState>): QueueState {
    const db = this.load();
    let idx = db.queueStates.findIndex(q => q.applicantId === applicantId);
    if (idx === -1) {
      const newState: QueueState = {
        id: `queue-${Math.random().toString(36).substr(2, 9)}`,
        applicantId,
        currentStage: QueueStage.CONTACT,
        stageEnteredAt: new Date().toISOString(),
        isWaiting: true,
        queuePosition: db.queueStates.length + 1,
        updatedAt: new Date().toISOString()
      };
      db.queueStates.push(newState);
      idx = db.queueStates.length - 1;
    }
    db.queueStates[idx] = {
      ...db.queueStates[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return db.queueStates[idx];
  }

  public static deleteQueueState(applicantId: string): void {
    const db = this.load();
    db.queueStates = db.queueStates.filter(q => q.applicantId !== applicantId);
    this.save();
  }

  public static getSystemLogs(): SystemLog[] {
    return this.load().systemLogs;
  }

  // Immutable: NO UPDATE, NO DELETE
  public static addSystemLog(log: SystemLog): void {
    const db = this.load();
    db.systemLogs.push(log);
    this.save();
  }

  public static getWarnings(): Warning[] {
    return this.load().warnings;
  }

  public static addWarning(warning: Warning): void {
    const db = this.load();
    db.warnings.push(warning);
    this.save();
  }

  public static markWarningRead(warningId: string): void {
    const db = this.load();
    const idx = db.warnings.findIndex(w => w.id === warningId);
    if (idx !== -1) {
      db.warnings[idx].readAt = new Date().toISOString();
      this.save();
    }
  }

  public static getImmutableAuditLogs(): ImmutableAuditLog[] {
    return this.load().immutableAuditLogs;
  }

  // Pure Immutable append only log
  public static addImmutableAuditLog(log: Omit<ImmutableAuditLog, "id" | "timestampGregorian" | "timestampJalali">): void {
    const db = this.load();
    const gregorian = new Date().toISOString();
    const jalali = getPersianDateTimeString(gregorian);
    const fullLog: ImmutableAuditLog = {
      ...log,
      id: `audit-${Math.random().toString(36).substr(2, 9)}`,
      timestampGregorian: gregorian,
      timestampJalali: jalali,
    };
    db.immutableAuditLogs.push(fullLog);
    this.save();
  }

  // --- messenger methods ---
  public static getMessages(): Message[] {
    return this.load().messages;
  }

  public static addMessage(msg: Message): void {
    const db = this.load();
    db.messages.push(msg);
    this.save();
  }

  public static updateMessage(id: string, updates: Partial<Message>): Message | null {
    const db = this.load();
    const idx = db.messages.findIndex(m => m.id === id);
    if (idx === -1) return null;
    db.messages[idx] = { ...db.messages[idx], ...updates };
    this.save();
    return db.messages[idx];
  }

  public static getRooms(): Room[] {
    return this.load().rooms;
  }

  public static addRoom(room: Room): void {
    const db = this.load();
    db.rooms.push(room);
    this.save();
  }

  public static updateRoom(id: string, updates: Partial<Room>): Room | null {
    const db = this.load();
    const idx = db.rooms.findIndex(r => r.id === id);
    if (idx === -1) return null;
    db.rooms[idx] = { ...db.rooms[idx], ...updates };
    this.save();
    return db.rooms[idx];
  }

  public static getUserStatuses(): UserStatus[] {
    return this.load().userStatuses;
  }

  public static pingUserStatus(userId: string, data: Partial<UserStatus>): UserStatus {
    const db = this.load();
    let idx = db.userStatuses.findIndex(u => u.userId === userId);
    const now = new Date().toISOString();
    if (idx === -1) {
      const newStatus: UserStatus = {
        userId,
        status: data.status || "online",
        statusText: data.statusText || "",
        typingRoomId: data.typingRoomId !== undefined ? data.typingRoomId : null,
        lastActive: now,
        deviceType: data.deviceType || "desktop",
        browser: data.browser || "Unknown",
        os: data.os || "Unknown",
        ip: data.ip || "127.0.0.1",
        screenResolution: data.screenResolution || "1920x1080",
        fingerprint: data.fingerprint || ""
      };
      db.userStatuses.push(newStatus);
      idx = db.userStatuses.length - 1;
    } else {
      db.userStatuses[idx] = {
        ...db.userStatuses[idx],
        ...data,
        lastActive: now
      };
    }
    this.save();
    return db.userStatuses[idx];
  }

  // --- Encapsulated Command Center admin helper functions ---
  public static mergeDuplicateApplicants(primaryId: string, duplicateId: string): boolean {
    const db = this.load();
    const primary = db.applicants.find(a => a.id === primaryId);
    const duplicate = db.applicants.find(a => a.id === duplicateId);
    if (!primary || !duplicate) return false;

    // 1. Transfer any notesGeneral
    if (duplicate.notesGeneral) {
      primary.notesGeneral = (primary.notesGeneral || "") + "\n\n[یادداشت انتقال پرونده همزاد]: " + duplicate.notesGeneral;
    }

    // 2. Map all log applicantId records to the primary dossier
    db.contactLogs.forEach(c => { if (c.applicantId === duplicateId) c.applicantId = primaryId; });
    db.receptionLogs.forEach(r => { if (r.applicantId === duplicateId) r.applicantId = primaryId; });
    db.consultationLogs.forEach(c => { if (c.applicantId === duplicateId) c.applicantId = primaryId; });
    db.middleRoomLogs.forEach(m => { if (m.applicantId === duplicateId) m.applicantId = primaryId; });
    db.testLogs.forEach(t => { if (t.applicantId === duplicateId) t.applicantId = primaryId; });
    db.finalResultLogs.forEach(f => { if (f.applicantId === duplicateId) f.applicantId = primaryId; });
    db.immutableAuditLogs.forEach(i => { if (i.applicantId === duplicateId) i.applicantId = primaryId; });

    // Remove the duplicate record from applicants
    db.applicants = db.applicants.filter(a => a.id !== duplicateId);
    // Remove duplicate queueState record
    db.queueStates = db.queueStates.filter(q => q.applicantId !== duplicateId);

    primary.updatedAt = new Date().toISOString();
    this.save();
    return true;
  }

  public static flagApplicant(id: string, isFlagged: boolean, reason: string): boolean {
    const db = this.load();
    const applicant = db.applicants.find(a => a.id === id);
    if (!applicant) return false;

    applicant.isFlagged = isFlagged;
    applicant.flagReason = reason;
    applicant.updatedAt = new Date().toISOString();
    this.save();
    return true;
  }

  public static recoverStuckApplicant(id: string, targetStage: QueueStage): boolean {
    const db = this.load();
    const qState = db.queueStates.find(q => q.applicantId === id);
    if (!qState) return false;

    qState.currentStage = targetStage;
    qState.isWaiting = true;
    qState.assignedOperatorId = undefined;
    qState.updatedAt = new Date().toISOString();
    this.save();
    return true;
  }

  public static correctQueueStage(id: string, stage: QueueStage): boolean {
    const db = this.load();
    const qState = db.queueStates.find(q => q.applicantId === id);
    if (!qState) return false;

    qState.currentStage = stage;
    qState.updatedAt = new Date().toISOString();
    this.save();
    return true;
  }
}

