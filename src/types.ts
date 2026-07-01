/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ApplicantStatus {
  PENDING_CONTACT = "pending_contact",
  SCHEDULED = "scheduled",
  ARRIVED = "arrived",
  IN_CONSULTATION = "in_consultation",
  IN_MIDDLE_ROOM = "in_middle_room",
  IN_TEST = "in_test",
  IN_RESULT = "in_result",
  COMPLETED = "completed",
  NO_SHOW = "no_show"
}

export enum QueueStage {
  CONTACT = "contact",
  RECEPTION = "reception",
  WAITING_1 = "waiting_1",
  CONSULTATION = "consultation",
  WAITING_2 = "waiting_2",
  MIDDLE_ROOM = "middle_room",
  WAITING_3 = "waiting_3",
  TEST = "test",
  WAITING_4 = "waiting_4",
  RESULT = "result",
  DONE = "done"
}

export enum UserRole {
  ADMIN = "ADMIN",
  CONTACT_OP = "CONTACT_OP",
  RECEPTION = "RECEPTION",
  CONSULTANT = "CONSULTANT",
  MIDDLE_ROOM = "MIDDLE_ROOM",
  PRESENTER_A = "PRESENTER_A",
  PRESENTER_B = "PRESENTER_B",
  JUDGE = "JUDGE"
}

export enum WarningSeverity {
  INFO = "info",
  WARNING = "warning",
  CRITICAL = "critical"
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: string; // ISO DateTime in IRST
  createdAt: string;
}

export interface Applicant {
  id: string;
  fullName: string;
  nationalId: string; // 10 chars
  phone: string;
  age: number;
  gender: "male" | "female";
  educationLevel: string;
  occupation: string;
  city: string;
  digiformSubmissionId?: string;
  registrationDate: string; // IRST
  status: ApplicantStatus;
  notesGeneral?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null; // soft delete support
  aiCategory?: string;
  aiClassification?: string;
  aiScore?: number;
  aiTags?: string[];
  aiAnalysis?: string;
  isFlagged?: boolean;
  flagReason?: string;
  appointmentDate?: string;
  appointmentTime?: string;
}

export interface ContactLog {
  id: string;
  applicantId: string;
  operatorId: string;
  contactAttemptNumber: number;
  contactedAt: string;
  phoneUsed: string;
  appointmentDate?: string; // YYYY/MM/DD (Jalali)
  appointmentTime?: string; // HH:MM
  operatorNotes: string;
  aiAnalysis?: string; // Raw JSON from Gemini
  aiCategory?: string; // e.g., 'Highly Motivated'
  aiScore?: number;
  createdAt: string;
}

export interface ReceptionLog {
  id: string;
  applicantId: string;
  operatorId: string;
  checkInTime: string;
  evaluationFormGiven: boolean;
  questionnaireGiven: boolean;
  waitingStartTime: string;
  operatorNotes: string;
  aiBehaviorAnalysis?: string; // Raw JSON from Gemini
  aiWaitAnalysis?: string;
  createdAt: string;
}

export interface ConsultationLog {
  id: string;
  applicantId: string;
  consultantId: string;
  sessionStart: string;
  sessionEnd?: string;
  durationMinutes?: number;
  questionnaireAnswers: Record<string, string>; // Q&A key values
  consultantNotes: string;
  aiAnalysis?: string; // Deep analysis JSON
  aiPersonalityCategory?: string;
  consultationSkipped: boolean;
  skipReason?: string;
  createdAt: string;
}

export interface MiddleRoomLog {
  id: string;
  applicantId: string;
  operatorId: string;
  entryTime: string;
  exitTime?: string;
  briefingNotes: string;
  aiBriefingAnalysis?: string;
  promotionNotes?: string;
  createdAt: string;
}

export interface TestLog {
  id: string;
  applicantId: string;
  judgeId: string;
  testStart: string;
  testEnd?: string;
  paramClarity: number; // 1-10
  paramConfidence: number; // 1-10
  paramTone: number; // 1-10
  paramVocabulary: number; // 1-10
  paramStructure: number; // 1-10
  paramExpression: number; // 1-10
  paramBodyLanguage: number; // 1-10
  paramEyeContact: number; // 1-10
  totalScore: number; // Computed weighted average
  judgeDescription: string;
  aiComprehensiveAnalysis?: string; // Gemini synthesis XML/JSON
  aiFinalCategory?: string;
  aiRecommendation?: string;
  messageToTahani?: string; // Judge private message to Tahani
  createdAt: string;
}

export interface FinalResultLog {
  id: string;
  applicantId: string;
  presenterTahaniId: string;
  presenterRezaeiId: string;
  resultTime: string;
  registered: boolean;
  registrationNotes: string;
  tahaniAnalysis: string;
  aiFinalSynthesis?: string;
  consultationPanelNotes?: string;
  createdAt: string;
}

export interface QueueState {
  id: string;
  applicantId: string;
  currentStage: QueueStage;
  stageEnteredAt: string;
  assignedOperatorId?: string;
  isWaiting: boolean;
  queuePosition: number;
  blockedBy?: string | null; // Applicant ID that is currently occupying
  updatedAt: string;
}

export interface SystemLog {
  id: string;
  actorId: string;
  actorName: string;
  actionType: string; // e.g. "STAGE_ADVANCE", "AI_ANALYSIS_RUN", "LOGIN", "EXCEL_IMPORT"
  applicantId?: string;
  payload: string; // JSON payload string
  ipAddress: string;
  createdAt: string;
}

export interface Warning {
  id: string;
  issuedBy: string; // Admin ID
  issuedTo: string; // Target Operator ID
  reason: string;
  severity: WarningSeverity;
  createdAt: string;
  readAt?: string | null;
}

export interface ImmutableAuditLog {
  id: string;
  applicantId: string;
  applicantName: string;
  operatorId: string;
  operatorName: string;
  actionType: "STATUS_CHANGE" | "NOTE_UPDATE" | "AI_DECISION" | "STAGE_CORRECTION" | "SECURITY_BLOCK";
  stageName: string; // e.g. "CONTACT", "RECEPTION", "CONSULTATION", "MIDDLE_ROOM", "TEST", "RESULT"
  fieldName: string; // e.g. "status", "notes", "aiAnalysis", "consultantNotes"
  beforeState: string; // stringified JSON or text
  afterState: string; // stringified JSON or text
  timestampGregorian: string; // ISO DateTime
  timestampJalali: string; // Jalali formatted date-time
  ipAddress?: string;
}

export interface Message {
  id: string;
  senderId: string;
  roomId: string;
  text: string;
  replyToId: string | null;
  reactions: { [userId: string]: string }; // Map of userId to reaction emoji (e.g., "👍")
  isDeleted: boolean;
  isEdited: boolean;
  originalText: string | null;
  aiTopic: string | null;
  aiSuggestion: {
    type: "age" | "date" | "yes_no" | "name" | "phone" | "education" | "gender" | "star_rating" | "time" | "number" | "schedule" | "file";
    label: string;
    options?: string[];
    confidence: number;
  } | null;
  createdAt: string;
  deliveredAt: string | null;
  readBy: { [userId: string]: string }; // Map of userId to read ISO string
  fileAttachment: {
    name: string;
    url: string;
    size: number;
    mimeType: string;
  } | null;
}

export interface Room {
  id: string;
  name: string;
  type: "DIRECT" | "GROUP" | "BROADCAST";
  description: string;
  color: string;
  members: string[]; // User IDs in this room
  pinnedBy: string[]; // User IDs who pinned this room
  mutedBy: string[]; // User IDs who muted this room
  archivedBy: string[]; // User IDs who archived this room
  avatarUrl: string | null;
  isDissolved: boolean;
  createdAt: string;
}

export interface UserStatus {
  userId: string;
  status: "online" | "away" | "busy" | "offline";
  statusText: string | null;
  typingRoomId: string | null;
  lastActive: string;
  deviceType: string;
  browser: string;
  os: string;
  ip: string;
  screenResolution: string;
  fingerprint: string;
}

