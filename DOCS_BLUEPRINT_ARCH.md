# HODHOD SPEECH INSTITUTE: ENTERPRISE AI-POWERED WORKFLOW PLATFORM
## 📄 COMPLETE SYSTEMS ARCHITECTURE, DATABASE BLUEPRINT, AI LAYERS & PRODUCTION BLUEPRINT

This blueprint outlines the complete production-grade architecture of the **Hodhod Speech & Communication Assessment Platform**. Underpinned by a secure Express/Vite full-stack core, Gemini AI-powered psychometric profiling, concurrent queue controls, and an immutable system register, this architecture is designed to handle thousands of concurrently managed applicants across multi-role administrative queues.

---

## TABLE OF CONTENTS
1. [Product Requirements Document (PRD)](#1-product-requirements-document-prd)
2. [Complete System Architecture](#2-complete-system-architecture)
3. [Database Architecture](#3-database-architecture)
4. [Entity Relationship Diagram (ERD)](#4-entity-relationship-diagram-erd)
5. [UI/UX Wireframes & Core Patterns](#5-uiux-wireframes--core-patterns)
6. [Dashboard Designs](#6-dashboard-designs)
7. [Admin Panel Designs](#7-admin-panel-designs)
8. [Queue Engine Logic](#8-queue-engine-logic)
9. [AI Architecture](#9-ai-architecture)
10. [RBAC Architecture (Role-Based Access Control)](#10-rbac-architecture-role-based-access-control)
11. [API Documentation (RESTful Specification)](#11-api-documentation-restful-specification)
12. [Backend Structure](#12-backend-structure)
13. [Frontend Structure](#13-frontend-structure)
14. [Deployment Architecture](#14-deployment-architecture)
15. [Security Architecture & Defensive Hardening](#15-security-architecture--defensive-hardening)
16. [Logging & Immutable Audit Trail Architecture](#16-logging--immutable-audit-trail-architecture)
17. [Real-time System Architecture](#17-real-time-system-architecture)
18. [Database Backup & Restore Strategy](#18-database-backup--restore-strategy)
19. [Scaling Strategy](#19-scaling-strategy)
20. [Full Implementation Roadmap](#20-full-implementation-roadmap)
21. [Suggested Directory Tree](#21-suggested-directory-tree)
22. [Coding & Linting Standards](#22-coding--linting-standards)
23. [DevOps Pipeline Specification](#23-devops-pipeline-specification)
24. [Operational Edge-Case Handling](#24-operational-edge-case-handling)
25. [Production Launch Checklist](#25-production-launch-checklist)

---

### 1. Product Requirements Document (PRD)

#### 1.1 Objective & Purpose
The Hodhod Speech Institute automates its Free Speech & Communication Assessment Program. The platform coordinates a 6-stage funnel, taking leads from their intake forms through call-center scheduling, reception arrival, professional counseling, branding exposition chambers, multi-weighted speech jury judging, and registration checkout.

#### 1.2 Core Business Requirements
- **RTL Persian User Interface**: Clean typography pairing (Inter + Vazirmatn/Space Grotesk style) and 100% compliant Jalali-Gregorian date tracking.
- **Strict Funnel Progression**: Applicants are organized in queues; double-booking or room occupancy friction is forbidden.
- **AI-Enhanced Assessments**: Each stage transition automatically triggers an evaluation payload mapped to the Gemini-3.5-Flash model.
- **Multi-Tenant Concurrent Operations**: Real-time progress updates, operator status locks, capacity limitations, and active workspace alerts.

---

### 2. Complete System Architecture

```
           +---------------------------------------+
           |       INTAKE CHANNELS & LEADS         |
           |   (Digiform, CSV/Excel Bulks, Sheet)  |
           +-------------------+-------------------+
                               |
                               v
               +---------------+---------------+
               |      EXPRESS API ROUTER       |  <---+ Rate Limiting & JWT Auth
               +---------------+---------------+
                               |
         +---------------------+---------------------+
         |                                           |
         v                                           v
+--------+--------+                         +--------+--------+
| QUEUE ENGINE    |                         |  GEMINI PROFILES|
| (Mutex Hooks &  |                         |  (JSON MimeType |
| Stage Blocks)   |                         |   Mappers)      |
+--------+--------+                         +--------+--------+
         |                                           |
         +---------------------+---------------------+
                               |
                               v
                     +---------+---------+
                     |    DATASTORE COR    |  (JSON Local Transaction / Real DB)
                     +---------+---------+
```

#### 2.1 Backend Core
A Node.js/Express server configured with native TypeScript support (`tsx` in developmental environments, bundled to ES5/CommonJS via `esbuild` for containerized runs). Host port binding is strictly hardcoded to `3000` under a binding host of `0.0.0.0`.

#### 2.2 Client SPA Application
React 19 running Vite configured with Tailwind CSS utility classes and `motion` (by Framer) animations to create smooth structural transitions between operational views.

---

### 3. Database Architecture

#### 3.1 Relational Schema & Tables
1. **`users`**: Master operators registry with hashed passwords, user state, and RBAC roles mapping (e.g. `Super Admin`, `Call Operator`, `Receptionist`, `Consultant`, `Judge`).
2. **`applicants`**: Holds biographical state, current funnel status, soft-delete logs, and generic timeline fields.
3. **`contact_logs`**: Call-center tracking with date-time scheduling, results indices, and scheduled slots.
4. **`reception_logs`**: Arrival logs, bottleneck counters, and pre-assessment form handoffs.
5. **`consultation_logs`**: Contains session checkpoints, duration metrics, and counselor observation summaries.
6. **`middle_room_logs`**: Exposition room markers tracking body language notes and promotional objection tags.
7. **`test_logs`**: Speech core indices containing 8 weighted parameters, judge comments, and performance coefficients.
8. **`final_result_logs`**: Transaction indices tracking closed sales, financial details, and presenter outcomes.
9. **`queue_states`**: Active tracking table locking applicants to specific operators and estimating room waits.
10. **`system_logs`**: Immutable, non-volatile database storing changes in full JSON payloads.
11. **`warnings`**: Operational warnings emitted from admins to specific call operators for non-compliance.

---

### 4. Entity Relationship Diagram (ERD)

```
  +--------------+               +------------------+               +------------------+
  |    users     |               |    applicants    |               |   queue_states   |
  +--------------+               +------------------+               +------------------+
  | PK  id       |<---+          | PK  id           |<---+          | PK  id           |
  |     username |    |          |     fullName     |    |          | FK  applicantId  |
  |     p_hash   |    |          |     nationalId   |    |          |     currentStage |
  |     role     |    |          |     status       |    |          |     isWaiting    |
  |     fullName |    |          |     phone        |    +--------->| FK  operatorId   |
  +--------------+    |          +------------------+    |          +------------------+
         |            |                   |              |
         |            |                   v              |
         |            |          +------------------+    |
         |            +--------->|   contact_logs   |    |
         |                       +------------------+    |
         |                       | PK  id           |    |
         |                       | FK  applicantId  |----+
         |                       | FK  operatorId   |
         |                       +------------------+
         |                                |
         v                                v
  +--------------+               +------------------+
  | system_logs  |               |    test_logs     |
  +--------------+               +------------------+
  | PK  id       |               | PK  id           |
  | FK  actorId  |               | FK  applicantId  |
  |     action   |               | FK  judgeId      |
  |     payload  |               |     paramScores  |
  +--------------+               +------------------+
```

---

### 5. UI/UX Wireframes & Core Patterns

- **Theme Spectrum**: Clean, modern dark and light modes with soft slate colors, high contrast visual elements, and fully RTL layouts.
- **RTL Gradients**: Margins, drawers, inputs, and card elements conform to standard CSS properties (`dir="rtl"`) to achieve correct alignments.
- **Tactile Inputs**: Crucial buttons—such as "Finish Consultation"—require a **5-second press-and-hold** gesture powered by CSS transforms and timing loops, completely bypassing accidental submissions.

---

### 6. Dashboard Designs

- **Stage Cards**: Display real-time telemetry metrics—such as average queue times, wait trends, and stage bottlenecks—alongside critical status flags.
- **Active Queues Table**: High-fidelity tracking displaying current stage wait lists. Simple drag-and-drop actions easily update applicant stages.

---

### 7. Admin Panel Designs

- **Admin Control Room**: Admins can monitor live stats (conversion rates, queue pressure, and active bottlenecks), manage roles and permissions, and oversee system health logs:
  - **User & Shift Management**: Create, edit, suspend, and configure operators.
  - **Compliance Monitor**: Monitor warnings issued to specific operational workspaces.
  - **AI Logger & API Health**: Monitor live Gemini API latencies and parse states.

---

### 8. Queue Engine Logic

#### 8.1 Safety Mutex & Overflows
- **Lock Check**: Before transitioning an applicant into an active processing room (e.g. `CONSULTATION`, `TEST`), the engine checks for current occupants:
  ```typescript
  const blocker = queue.find(q => q.currentStage === nextStage && !q.isWaiting);
  if (blocker) throw new Error("محل مربوطه در حال حاضر توسط متقاضی دیگری اشغال است.");
  ```
- **Sequential Boundaries**: The system prevents skipping active stages, maintaining chronological consistency across all stages.

---

### 9. AI Architecture

Every stage completion triggers a comprehensive structured request to Gemini.

```
Incoming Data Payload -----------> JSON Prompt Mapper -----------> Gemini-3.5-Flash
                                                                         |
                                                                         v
                                                                 JSON Response Validate
                                                                         |
                                                                         v
Fallback Module <----------- Exception caught? <----------- (Valid Persian JSON?)
```

#### 9.1 Default prompt schema validation configuration
```typescript
{
  model: "gemini-3.5-flash",
  config: {
    responseMimeType: "application/json",
    temperature: 0.7
  }
}
```

---

### 10. RBAC Architecture (Role-Based Access Control)

| User Role | Contact View | Reception View | Consultation View | Middle Room View | Test Jury View | Final Results View | Admin Center | Modify System Settings |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Super Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **System Admin**| ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Contact Op** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Receptionist**| ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Consultant**  | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Judge**       | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Final Staff** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |

---

### 11. API Documentation (RESTful Specification)

- **`POST /api/auth/login`**: Authenticate operator credentials.
- **`GET /api/applicants`**: Retrieve all current applicant profiles (excluding soft-deleted cases).
- **`POST /api/applicants/import`**: Perform bulk imports from CSV or Excel data.
- **`POST /api/queue/transition`**: Perform stage transition handshakes while executing security mutex evaluations and launching Gemini analysis pipelines.
- **`POST /api/queue/pull`**: Pull an applicant from the wait list, locking their profile to the active operator.
- **`POST /api/queue/release`**: Release an applicant back to the stage's wait list.
- **`GET /api/logs`**: Export non-volatile audit register logs in JSON format.

---

### 12. Backend Structure

Consists of a modular, type-safe Express server:
- **`server.ts`**: Initial server router mapping API endpoints and initializing directories.
- **`src/db/datastore.ts`**: Simple, transactional-safe file datastore simulating SQL properties.
- **`src/lib/gemini.ts`**: Interface layer for GoogleGenAI with built-in sandbox fallbacks.

---

### 13. Frontend Structure

A React application structured into modular functional components:
- **`src/App.tsx`**: Central application manager handling system states, route views, and RBAC authentication guards.
- **`src/components/`**: Modular sub-directory containing stage-specific layouts:
  - `AdminPanel.tsx`
  - `ContactPanel.tsx`
  - `ReceptionPanel.tsx`
  - `ConsultPanel.tsx`
  - `MiddleRoomPanel.tsx`
  - `JudgePanel.tsx`
  - `ResultPanel.tsx`
  - `LoginScreen.tsx`

---

### 14. Deployment Architecture

#### 14.1 Production Deployment Options
- **Container Deployment (Docker + Cloud Run)**: The platform is packaged as a lightweight container using a multi-stage Docker build:
  ```dockerfile
  FROM node:22-alpine AS builder
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci
  COPY . .
  RUN npm run build

  FROM node:22-alpine
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci --only=production
  COPY --from=builder /app/dist ./dist
  COPY --from=builder /app/db.json ./db.json
  ENV NODE_ENV=production
  EXPOSE 3000
  CMD ["node", "dist/server.cjs"]
  ```

- **Shared Hosting Integration (cPanel / MariaDB)**:
  To deploy the platform on traditional hosting with dedicated MySQL databases:
  1. Set up a Node.js Application within cPanel.
  2. Map the database credentials in `.env`:
     ```env
     MYSQL_HOST="127.0.0.1"
     MYSQL_USER="cpanel_user"
     MYSQL_PASS="secure_password"
     MYSQL_DB="cpanel_hodhod_db"
     ```
  3. Replace the local file-based datastore with a database client (like Knex or Drizzle ORM) in production settings.

---

### 15. Security Architecture & Defensive Hardening

- **SQL Mitigation**: Use Parameterized queries across all database drivers.
- **XSS & Injection Protection**: Sanitize incoming user payloads before parsing.
- **JWT Authorization**: Enforce JWT authentication with cookie-based configurations.
- **Strict Frame Policies**: Secure frame and frame-ancestors policies to protect the operational canvas.

---

### 16. Logging & Immutable Audit Trail Architecture

- **Immutable Registers**: Actions such as logins, stage changes, deleted files, and API statuses write directly to `system_logs`.
- **Log Payload Mapping**:
  ```typescript
  export interface SystemLog {
    id: string;
    actorId: string;
    actorName: string;
    actionType: "STAGE_ADVANCE" | "AI_ANALYSIS_RUN" | "LOGIN" | "EXCEL_IMPORT";
    applicantId?: string;
    payload: string; // Full stringified JSON metadata
    ipAddress: string;
    createdAt: string; // ISO DateTime
  }
  ```

---

### 17. Real-time System Architecture

The client executes lightweight poll calls every 5 seconds to synchronize active statuses across operators:
```typescript
useEffect(() => {
  const interval = setInterval(fetchQueueState, 5000);
  return () => clearInterval(interval);
}, []);
```
This guarantees that changes made across different workstations are propagated instantly, preventing data overlaps.

---

### 18. Database Backup & Restore Strategy

#### 18.1 File Backups
- **Automatic Backups**: Execute nightly cron backup scripts to sweep `db.json` and generate timestamps:
  ```bash
  tar -czf /backups/hodhod-db-$(date +%F).tar.gz /app/db.json
  ```
- **Offsite Sync**: Encrypted database archives are synced directly to secure Cloud Storage buckets (like Google Cloud Storage or AWS S3).

---

### 19. Scaling Strategy

- **Horizontally Scalable App Instances**: Deploy behind a managed load balancer (e.g. Cloud Run, GKE) to scale instances from zero to infinity based on active CPU loads.
- **Structured Database Clusters**: Shift from flat file stores to dedicated, high-availability Cloud SQL (PostgreSQL) clusters equipped with read replicas.
- **Durable Cache Injections**: Inject Redis instances to accelerate high-frequency session token checks and rate limiters.

---

### 20. Full Implementation Roadmap

```
Phase 1: Foundation (Req Drafts, Schema Designs & Core Types)
                  |
                  v
Phase 2: Backend Development (Express API, Mutex Queue Controls & JWT Core)
                  |
                  v
Phase 3: Frontend Integration (Tailwind Layouts, RTL Support & Motion)
                  |
                  v
Phase 4: AI Pipeline Setup (Gemini Prompts, Parsing Layers & Fallbacks)
                  |
                  v
Phase 5: Performance Tuning (Stress Tests, Security Scans & Prod Release)
```

---

### 21. Suggested Directory Tree

```
├── .env.example
├── .gitignore
├── db.json                   # Backup database storage
├── metadata.json             # System options and permissions
├── package.json              # System package scripts
├── server.ts                 # Backend Express Gateway router
├── tsconfig.json             # Code configurations
├── vite.config.ts            # Bundler rules
├── src/
│   ├── App.tsx               # Main frontend manager
│   ├── index.css             # Global CSS style rules
│   ├── main.tsx              # React compiler anchor
│   ├── types.ts              # Declarations and system types
│   ├── components/           # Subpage panels and views
│   │   ├── AdminPanel.tsx
│   │   ├── ConsultPanel.tsx
│   │   ├── ContactPanel.tsx
│   │   ├── JudgePanel.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── MiddleRoomPanel.tsx
│   │   ├── ReceptionPanel.tsx
│   │   └── ResultPanel.tsx
│   └── lib/                  # Services and helper libraries
│       ├── dateUtils.ts      # Shamlali Gregorian dates
│       └── gemini.ts         # Gemini API connections and fallbacks
```

---

### 22. Coding & Linting Standards

- **Strict TypeScript Policies**: Avoid the use of `any` types; prefer creating interface mappers for all API responses.
- **Hook Optimization**: Prevent unnecessary parent component re-renders by wrapping heavy data transformations in `useMemo` hooks.
- **Lint Enforcement**: Run `npm run lint` (tsc `--noEmit`) before any builds to maintain code consistency and quality.

---

### 23. DevOps Pipeline Specification

#### 23.1 Continuous Integration (CI)
- Triggered on every commit:
  - Run linting checks (`npm run lint`).
  - Run test suites to catch breaking changes.

#### 23.2 Continuous Deployment (CD)
- Once merged to main, build and push to container registries, triggering direct zero-downtime updates to production engines.

---

### 24. Operational Edge-Case Handling

#### 24.1 Mid-stage Dropouts & Absences
If a scheduled applicant fails to check in:
- The operator marks the applicant's status as `NO_SHOW`.
- This releases the current workspace queues, transitioning the applicant to a historic state.

#### 24.2 Network Interruptions & Cache Guards
The client caches form input progress in browser local storage. In the event of a network dropout, operators can safely resume evaluations without losing progress.

---

### 25. Production Launch Checklist

- [ ] Confirm `GEMINI_API_KEY` is securely set in production host environments.
- [ ] Establish nightly automatic backup patterns for database components.
- [ ] Seed base super-administrator login credentials.
- [ ] Set rate-limiting rules across the Express backend.
- [ ] Enable CORS rules limiting incoming requests exclusively to verified domain sources.
- [ ] Perform a full end-to-end rehearsal run tracking dummy candidates through all 6 stages.

---

### 26. Complete Prisma Relational Schema
This relational scheme supports high-concurrency operations, atomic record tracing, and ensures that no applicant history is dropped or lost after Mr. Masoumi's Consultation stage.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  CONTACT_OP
  RECEPTION
  CONSULTANT
  MIDDLE_ROOM
  JUDGE
  PRESENTER_A
  PRESENTER_B
}

enum ApplicantStatus {
  PENDING_CONTACT
  SCHEDULED
  ARRIVED
  IN_CONSULTATION
  IN_MIDDLE_ROOM
  IN_TEST
  IN_RESULT
  COMPLETED
  NO_SHOW
}

model User {
  id           String    @id @default(uuid())
  username     String    @unique
  passwordHash String
  fullName     String
  role         Role      @default(CONTACT_OP)
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  // Auditor and operator link relations
  contactLogs    ContactLog[]
  receptionLogs  ReceptionLog[]
  consultLogs    ConsultationLog[]
  middleRoomLogs MiddleRoomLog[]
  testLogs       TestLog[]
  resultLogs     FinalResultLog[]
  warningsSent   Warning[]         @relation("WarningsSent")
  warningsRecv   Warning[]         @relation("WarningsReceived")
}

model Applicant {
  id             String          @id @default(uuid())
  fullName       String
  nationalId     String          @unique
  phone          String
  age            Int
  gender         String
  educationLevel String
  occupation     String
  city           String
  status         ApplicantStatus @default(PENDING_CONTACT)
  notesGeneral   String?         @db.Text
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  deletedAt      DateTime?

  // Funnel operational records trace
  queueState      QueueState?
  contactLogs     ContactLog[]
  receptionLogs   ReceptionLog[]
  consultLogs     ConsultationLog[]
  middleRoomLogs  MiddleRoomLog[]
  testLogs        TestLog[]
  resultLogs      FinalResultLog[]
  immutableLogs   ImmutableAuditLog[]

  @@index([nationalId])
  @@index([status])
}

model QueueState {
  id                 String    @id @default(uuid())
  applicantId        String    @unique
  applicant          Applicant @relation(fields: [applicantId], references: [id], onDelete: Cascade)
  currentStage       String    // e.g., 'contact', 'reception', 'waiting_2', 'middle_room'
  stageEnteredAt     DateTime  @default(now())
  isWaiting          Boolean   @default(true)
  queuePosition      Int       @default(1)
  assignedOperatorId String?
  updatedAt          DateTime  @updatedAt

  @@index([currentStage, isWaiting])
}

model ContactLog {
  id                   String    @id @default(uuid())
  applicantId          String
  applicant            Applicant @relation(fields: [applicantId], references: [id], onDelete: Cascade)
  operatorId           String
  operator             User      @relation(fields: [operatorId], references: [id])
  contactAttemptNumber Int       @default(1)
  phoneUsed            String
  appointmentDate      String?   // Jalali String YYYY/MM/DD
  appointmentTime      String?
  operatorNotes        String    @db.Text
  aiAnalysis           String?   @db.Text
  aiCategory           String?
  aiScore              Float?
  createdAt            DateTime  @default(now())

  @@index([applicantId])
}

model ReceptionLog {
  id                  String    @id @default(uuid())
  applicantId         String
  applicant           Applicant @relation(fields: [applicantId], references: [id], onDelete: Cascade)
  operatorId          String
  operator            User      @relation(fields: [operatorId], references: [id])
  checkInTime         DateTime  @default(now())
  evaluationFormGiven Boolean   @default(true)
  questionnaireGiven  Boolean   @default(true)
  waitingStartTime    DateTime  @default(now())
  operatorNotes       String    @db.Text
  aiBehaviorAnalysis  String?   @db.Text
  aiWaitAnalysis      String?   @db.Text
  createdAt           DateTime  @default(now())

  @@index([applicantId])
}

model ConsultationLog {
  id                   String    @id @default(uuid())
  applicantId          String
  applicant            Applicant @relation(fields: [applicantId], references: [id], onDelete: Cascade)
  consultantId         String
  consultant           User      @relation(fields: [consultantId], references: [id])
  sessionStart         DateTime
  sessionEnd           DateTime  @default(now())
  durationMinutes      Int
  questionnaireAnswers Json      // Stores structured Q&A
  consultantNotes      String    @db.Text
  aiAnalysis           String?   @db.Text
  aiPersonalityCategory String?
  consultationSkipped  Boolean   @default(false)
  skipReason           String?   @db.Text
  createdAt            DateTime  @default(now())

  @@index([applicantId])
}

model MiddleRoomLog {
  id                  String    @id @default(uuid())
  applicantId         String
  applicant           Applicant @relation(fields: [applicantId], references: [id], onDelete: Cascade)
  operatorId          String
  operator            User      @relation(fields: [operatorId], references: [id])
  entryTime           DateTime
  exitTime            DateTime  @default(now())
  briefingNotes       String    @db.Text
  aiBriefingAnalysis  String?   @db.Text
  promotionNotes      String?   @db.Text
  createdAt           DateTime  @default(now())

  @@index([applicantId])
}

model TestLog {
  id                        String    @id @default(uuid())
  applicantId               String
  applicant                 Applicant @relation(fields: [applicantId], references: [id], onDelete: Cascade)
  judgeId                   String
  judge                     User      @relation(fields: [judgeId], references: [id])
  testStart                 DateTime
  testEnd                   DateTime  @default(now())
  paramClarity              Int
  paramConfidence           Int
  paramTone                 Int
  paramVocabulary           Int
  paramStructure            Int
  paramExpression           Int
  paramBodyLanguage         Int
  paramEyeContact           Int
  totalScore                Float     @default(5.0)
  judgeDescription          String    @db.Text
  aiComprehensiveAnalysis   String?   @db.Text
  aiFinalCategory           String?
  aiRecommendation          String?   @db.Text
  createdAt                 DateTime  @default(now())

  @@index([applicantId])
}

model FinalResultLog {
  id                     String    @id @default(uuid())
  applicantId            String
  applicant              Applicant @relation(fields: [applicantId], references: [id], onDelete: Cascade)
  presenterTahaniId      String
  presenterTahani        User      @relation(fields: [presenterTahaniId], references: [id])
  resultTime             DateTime  @default(now())
  registered             Boolean   @default(false)
  registrationNotes      String    @db.Text
  tahaniAnalysis         String    @db.Text
  consultationPanelNotes String?   @db.Text
  aiFinalSynthesis       String?   @db.Text
  createdAt              DateTime  @default(now())

  @@index([applicantId])
}

model ImmutableAuditLog {
  id            String    @id @default(uuid())
  applicantId   String
  applicant     Applicant @relation(fields: [applicantId], references: [id], onDelete: Cascade)
  operatorId    String
  operatorName  String
  actionType    String    // e.g. 'STATUS_CHANGE', 'NOTE_UPDATE', 'AI_DECISION'
  stageName     String
  fieldName     String
  beforeState   String    @db.Text
  afterState    String    @db.Text
  ipAddress     String
  createdAt     DateTime  @default(now())

  @@index([applicantId])
  @@index([actionType])
}

model Warning {
  id         String    @id @default(uuid())
  issuedById String
  issuedBy   User      @relation("WarningsSent", fields: [issuedById], references: [id])
  issuedToId String
  issuedTo   User      @relation("WarningsReceived", fields: [issuedToId], references: [id])
  reason     String    @db.Text
  severity   String    @default("warning") // info, warning, critical
  readAt     DateTime?
  createdAt  DateTime  @default(now())

  @@index([issuedToId])
}

---

### 27. NestJS Architecture Modules Mappings

A production-grade modular setup decomposes systems into decoupled domains with explicit dependency injection.

#### 27.1 Module Map
- **`AppModule`**: Core initialization root importing `DatabaseModule`, `AuthModule`, `ApplicantModule`, `QueueModule`, `AiProfilingModule`, and `LoggerModule`.
- **`DatabaseModule`**: Exports a globally accessible `PrismaService` connection wrapper.
- **`QueueModule`**: Implements custom state locks, mutex rules, and manages transition validations.
- **`AiProfilingModule`**: Direct proxy layer sending system logs to Gemini for real-time profiling.

#### 27.2 Queue Controller Handoff Sample
```typescript
// src/queue/queue.controller.ts
import { Controller, Post, Body, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { QueueService } from './queue.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/queue')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post('transition')
  @Roles('ADMIN', 'CONSULTANT', 'MIDDLE_ROOM', 'RECEPTION', 'JUDGE')
  async transitionApplicantQueue(
    @Body() transitionDto: { applicantId: string; currentStage: string; nextStage: string; operatorId: string; operatorNotes: string; payload: any }
  ) {
    try {
      return await this.queueService.executeTransition(
        transitionDto.applicantId,
        transitionDto.currentStage,
        transitionDto.nextStage,
        transitionDto.operatorId,
        transitionDto.operatorNotes,
        transitionDto.payload
      );
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.CONFLICT);
    }
  }
}
```

---

### 28. Next.js 15 Routing Directories
For high fidelity implementation, a Next.js 15 React application organizes multi-role workspaces using nested routing structures with custom group layout policies:

```
src/
├── app/
│   ├── layout.tsx                # Master HTML layout with dir="rtl" and Inter/Vazirmatn styles
│   ├── page.tsx                  # Splash entry gateway and secure session authentication page
│   ├── login/
│   │   └── page.tsx              # Translucent Glassmorphic dynamic staff login page
│   └── dashboard/
│       ├── layout.tsx            # Translucent Navigation header, Jalali digital clock, and role badges
│       ├── page.tsx              # Router that renders appropriate desk panels based on JWT claims
│       ├── admin/
│       │   └── page.tsx          # Real-time SVG throughput graphs, DB check tools, operator warning panels
│       ├── contact/
│       │   └── page.tsx          # Excel bulk parsing sheets & phone calling scripts panel
│       ├── reception/
│       │   └── page.tsx          # Physical attendance checklists & waiting queue allocation board
│       ├── consult/
│       │   └── page.tsx          # Specialist Mr. Masoumi's consulting workspace & 5-sec submit trigger
│       ├── middle-room/
│       │   └── page.tsx          # خانم رضایی commercial hook generator & branding assessment room
│       ├── test/
│       │   └── page.tsx          # جناب کاظمی performance scores sliders & acoustic parameter metrics
│       └── checkout/
│           └── page.tsx          # Tahani comprehensive agreement signing & financial enrollment log
```

---

### 29. Workflow Engine State-Machine Specifications
The transition rules can be mapped mathematically to prevent state collision or applicant record isolation.

#### 29.1 Direct Node Map
```
[CONTACT (1)] ──> [RECEPTION / WAITING_1 (2)] ──> [CONSULTATION (3)] 
                                                        │
                      +─────────────────────────────────+
                      v
         [WAITING_2 / MIDDLE_ROOM (4)] ──> [WAITING_3 / TEST (5)] ──> [WAITING_4 / RESULT (6)] ──> [DONE]
```

#### 29.2 Concurrency Locks and Mutexes
1. **Dynamic Workspace Lockdown**: When an applicant is pulled by a desk operator, the node's `isWaiting` attribute immediately flips to `false`, assigning `assignedOperatorId = userId`.
2. **Double Handoff Protection Check**: Any transition query executes under transaction-locks. If a second operator requests a stage upgrade for an already-occupied desk, the database yields a `409 Conflict` reject warning specifying the blocking occupant's details.
3. **Draft Recovery Engine**: Textareas automatically capture draft notes in real time using local storage. When an operator resumes an active session after an unplanned restart, the system safely restores their workspace state to minimize disruptions.

---
