# 🛡️ FINDORA AI

### Autonomous Lost & Found Intelligence, Multimodal Verification & Secure Custody Network
[![System Status](https://img.shields.io/badge/System-ONLINE-10B981?style=for-the-badge&logo=statuspage&logoColor=white)](https://findoravsbec.vercel.app)
[![Cloud Database](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Media Storage](https://img.shields.io/badge/Storage-Cloudinary%20CDN-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)](https://cloudinary.com)
[![AI Engine](https://img.shields.io/badge/AI%20Engine-Gemini%202.5%20Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![Telegram Bot](https://img.shields.io/badge/Telegram-@findoravsb__bot-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/findoravsb_bot)

> **Tagline**: *"Find the connection. Verify the owner. Recover it safely."*

---

## 📌 Executive Summary

**FINDORA AI** is an institutional-grade, privacy-first intelligent Lost & Found ecosystem engineered for universities, corporate campuses, research complexes, and large-scale facilities. Traditional lost-and-found operations suffer from low recovery rates (below 18%), rampant identity fraud, manual logbook overhead, and privacy leaks.

FINDORA AI completely automates the incident lifecycle through:
1. **Zero-Leak Optical Evidence**: Live camera capture with cryptographic Location Tag geo-timestamp watermarking stored in Cloudinary CDN.
2. **Multimodal Candidate Retrieval**: Combines semantic embeddings, token TF-IDF, visual attributes, spatial distance decay, and exponential temporal decay.
3. **Blind Ownership Verification Protocol**: Eliminates fraudulent claiming by generating blind challenge questions from encrypted private item traits.
4. **Fraud Risk Anomaly Shield**: Analyzes claimant velocity, contradictory answers, and behavioral telemetry to protect campus assets.
5. **Zero-Knowledge Handover**: Closes custody via secret 1-Time Handover Codes verified by authorized Campus Security Officers.
6. **Real-Time Cloud Ledger**: Dynamic data persistence across Supabase PostgreSQL with real-time analytics.

---

## 🏛️ System Architecture

```mermaid
flowchart TB
    subgraph ClientLayer["🖥️ Frontend & Client Ecosystem"]
        direction TB
        WebApp["React 19 + Vite Web Application<br/>(Tailwind CSS v4 & Recharts)"]
        CamModule["LiveCameraCapture Module<br/>(GPS Stamping & Watermarking)"]
        TgBotClient["Telegram App<br/>(@findoravsb_bot & Campus Supergroups)"]
    end

    subgraph CDNLayer["☁️ Cloud Media & Storage"]
        Cloudinary["Cloudinary CDN Storage<br/>(Folder: findora_items)"]
    end

    subgraph GatewayLayer["⚡ Backend API Gateway (Node.js & Express)"]
        direction TB
        Server["Express Router & Security Middleware<br/>(JWT, CORS, Multer Memory Storage)"]
        AuthRoute["/api/auth — Role-Based Auth"]
        ItemsRoute["/api/items — Item Lifecycle"]
        MatchesRoute["/api/matches — Candidate Retrieval"]
        ClaimsRoute["/api/claims — Blind Verification"]
        AdminRoute["/api/admin — Command Center"]
        AnalyticsRoute["/api/analytics — Spatial Telemetry"]
        TgRoute["/api/telegram — Webhook Dispatcher"]
    end

    subgraph AIEngine["🧠 Autonomous AI Intelligence Layer"]
        direction TB
        Gemini["Google Gemini 2.5 Flash<br/>(Multimodal Classification & Query Parsing)"]
        MatchEngine["Multimodal Matching Engine<br/>(Semantic, Visual, Spatial & Temporal Decay)"]
        FraudEngine["Fraud Shield Risk Engine<br/>(Velocity Graphs & Anomaly Scoring)"]
        VerifyEngine["Blind Verification Engine<br/>(Zero-Knowledge Challenge Generator)"]
    end

    subgraph PersistenceLayer["🗄️ Resilient Dual-Layer Persistence"]
        direction TB
        Supabase[("Supabase PostgreSQL Cloud DB<br/>(Primary Authority & Pooler)")]
        LocalCache[("SQLite / In-Memory WAL Cache<br/>(Sub-Millisecond Read Acceleration)")]
        SyncManager["Bi-Directional Sync Manager<br/>(Write-Through Dual Engine)"]
    end

    subgraph NotificationLayer["📬 Automated Notification Network"]
        BrevoSMTP["Brevo SMTP Service<br/>(Handover Codes & Receipts)"]
        TgService["Telegram Bot Poller & Broadcaster"]
    end

    WebApp -->|Live Photo Buffer| Server
    Server -->|Buffer Stream Upload| Cloudinary
    Cloudinary -->|Secure CDN URL| Server
    CamModule --> WebApp

    WebApp -->|REST API Requests| Server
    TgBotClient -->|Bot Commands & Updates| TgService
    TgService --> Server

    Server --> AuthRoute & ItemsRoute & MatchesRoute & ClaimsRoute & AdminRoute & AnalyticsRoute & TgRoute

    ItemsRoute & MatchesRoute --> MatchEngine
    ItemsRoute --> Gemini
    ClaimsRoute --> VerifyEngine & FraudEngine

    Server --> SyncManager
    SyncManager -->|Transactional Pool| Supabase
    SyncManager -->|Instant Cache| LocalCache

    ClaimsRoute & AdminRoute --> BrevoSMTP
    ItemsRoute & AdminRoute --> TgService
```

---

## 🔄 Autonomous End-to-End Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Owner as 👤 Student (Item Owner)
    actor Finder as 🙋 Citizen / Finder
    participant App as 📱 FINDORA Web Portal
    participant API as ⚙️ Express Backend
    participant Cloud as ☁️ Cloudinary CDN
    participant AI as 🧠 AI Matching Engine
    participant DB as 🗄️ Supabase PostgreSQL
    actor Officer as 👮 Security Officer

    rect rgb(240, 248, 255)
        note over Owner, App: Phase 1: Lost Item Registration
        Owner->>App: Report Lost Item (Title, Category, Location)
        Owner->>App: Input Secret Ownership Clues (Serial No, Scratches)
        App->>API: POST /api/items/lost
        API->>DB: Store Item & Encrypt Private Vault
        API-->>Owner: Issued Secret 1-Time Handover Code (e.g., LOST-ABC1)
    end

    rect rgb(245, 255, 245)
        note over Finder, Cloud: Phase 2: Found Item Optical Reporting
        Finder->>App: Capture Live Optical Evidence
        App->>Cloud: Stream Live Frame with Location Tag Watermark
        Cloud-->>App: Return Permanent Secure CDN Image URL
        Finder->>App: Submit Found Report with Geo-Coordinates
        App->>API: POST /api/items/found
        API->>DB: Save Found Item with Cloudinary Image
    end

    rect rgb(255, 250, 240)
        note over API, AI: Phase 3: Multimodal Candidate Retrieval
        API->>AI: Trigger Rank Candidates (Lost Pool vs Found)
        AI->>AI: Compute Visual + Semantic + Spatial + Temporal Alignment
        AI-->>API: Match Ranked (e.g. 89% Confidence Match)
        API->>DB: Insert AI Match Record & Alert Notification
        API-->>Owner: Dispatch Instant Telegram & In-App Match Alert
    end

    rect rgb(253, 242, 248)
        note over Owner, API: Phase 4: Blind-Match Verification Challenge
        Owner->>App: Inspect Match & Initiate Claim
        App->>API: POST /api/claims/initiate
        API->>API: Generate Blind Questions from Private Vault
        API-->>Owner: Present Challenge (e.g., "Describe sticker on lid")
        Owner->>App: Submit Blind Answers
        App->>API: POST /api/claims/:id/verify
        API->>AI: Evaluate Answers & Run Fraud Risk Scoring
        API->>DB: Update Claim (Status: UNDER_REVIEW, Risk: LOW)
    end

    rect rgb(240, 253, 250)
        note over Officer, Owner: Phase 5: Custody Transfer & Handover
        Officer->>App: Review Claim in Admin Command Center
        Officer->>App: Approve Claim & Generate Pickup Case
        App->>API: POST /api/admin/claims/:id/approve
        API->>DB: Create Recovery Case & Handover Record
        Owner->>Officer: Arrives at Campus Security Desk
        Owner->>Officer: Recites Secret 1-Time Code
        Officer->>App: Enter Code into "Close Search by Code"
        App->>API: POST /api/items/close-search
        API->>DB: Set Item Status = 'RECOVERED' & Audit Log Recorded
        API-->>Owner: Email & Telegram Resolution Certificate Dispatched
    end
```

---

## 🧮 AI Mathematical Scoring Engine

The FINDORA candidate ranking score $S(L, F)$ between a reported lost item $L$ and found item $F$ is a multi-signal weighted score bounded within $[0, 1]$:

$$S(L, F) = w_v \cdot S_{\text{visual}} + w_t \cdot S_{\text{text}} + w_s \cdot S_{\text{spatial}} + w_\tau \cdot S_{\text{temporal}} + w_a \cdot S_{\text{attribute}} - P_{\text{conflict}}$$

```mermaid
graph TD
    subgraph Inputs["Item Attributes (Lost vs Found)"]
        L_Item["Reported Lost Item (L)"]
        F_Item["Reported Found Item (F)"]
    end

    subgraph SignalProcessors["Multi-Signal Similarity Evaluators"]
        Visual["Visual Similarity (S_visual)<br/>Color, Brand, Model & Optical Embeddings<br/>Weight: 0.25"]
        Text["Semantic Text Similarity (S_text)<br/>TF-IDF Token Cosine Similarity<br/>Weight: 0.25"]
        Spatial["Spatial Coordinate Decay (S_spatial)<br/>Haversine Distance Decay: e^(-alpha * dist)<br/>Weight: 0.20"]
        Temporal["Temporal Proximity Decay (S_temporal)<br/>Chronological Decay: e^(-lambda * delta_t)<br/>Weight: 0.15"]
        Attr["Structural Attributes (S_attr)<br/>Category & Condition Match<br/>Weight: 0.15"]
    end

    subgraph PenaltyGate["Hard Negative & Conflict Penalty"]
        Gate{"Category Match Check"}
        Penalty["Brand / Model Conflict Penalty (P_conflict)<br/>Penalizes opposing brands (e.g. Dell vs HP)"]
    end

    subgraph Synthesis["Scoring & Decision Gauge"]
        Score["Aggregate Match Confidence: S(L,F) in [0, 1]"]
        Triage{"Confidence Triage"}
        High["🟢 HIGH (Score >= 0.85)<br/>Instant Push Notification"]
        Med["🟡 MEDIUM (0.65 <= Score < 0.85)<br/>Assisted Review"]
        Low["🔴 LOW (Score < 0.65)<br/>Passive Discovery"]
    end

    L_Item & F_Item --> Gate
    Gate -->|Different Category| Discard["Hard Negative Filter (Score = 0.0)"]
    Gate -->|Same Category| Visual & Text & Spatial & Temporal & Attr
    Visual & Text & Spatial & Temporal & Attr --> Penalty
    Penalty --> Score
    Score --> Triage
    Triage --> High & Med & Low
```

---

## 📊 Database Schema & Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    USERS ||--o{ ITEMS : reports
    USERS ||--o{ CLAIMS : files
    USERS ||--o{ RECOVERY_CASES : receives
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ AUDIT_LOGS : triggers

    ITEMS ||--o| ITEM_PRIVATE_ATTRIBUTES : has_secret_vault
    ITEMS ||--o{ MATCHES : lost_in
    ITEMS ||--o{ MATCHES : found_in
    ITEMS ||--o{ CLAIMS : claimed_as_found
    ITEMS ||--o{ RECOVERY_CASES : recovered_as

    CLAIMS ||--o{ CLAIM_QUESTIONS : contains
    CLAIMS ||--o{ CLAIM_ANSWERS : receives
    CLAIMS ||--o| FRAUD_ALERTS : audited_by
    CLAIMS ||--o| RECOVERY_CASES : authorizes

    USERS {
        text id PK
        text name
        text email UK
        text password_hash
        text role
        text avatar
        timestamp created_at
    }

    ITEMS {
        text id PK
        text type
        text title
        text description
        text category
        text color
        text brand
        text model
        text image
        text location
        text building
        integer floor
        real latitude
        real longitude
        timestamp event_time
        text status
        text owner_id FK
        text condition
        text close_code
        timestamp closed_at
        text closed_by
        timestamp created_at
    }

    ITEM_PRIVATE_ATTRIBUTES {
        text id PK
        text item_id FK, UK
        text serial_number
        text unique_marks
        text damage_details
        text hidden_features
        timestamp created_at
    }

    MATCHES {
        text id PK
        text lost_item_id FK
        text found_item_id FK
        real final_score
        real visual_score
        real text_score
        real location_score
        real time_score
        real category_score
        real attribute_score
        text explanation
        text status
        timestamp created_at
    }

    CLAIMS {
        text id PK
        text match_id FK
        text lost_item_id FK
        text found_item_id FK
        text claimant_id FK
        text status
        real verification_score
        real risk_score
        text risk_level
        text risk_factors
        text admin_notes
        timestamp created_at
        timestamp updated_at
    }

    CLAIM_QUESTIONS {
        text id PK
        text claim_id FK
        text found_item_id
        text question_key
        text prompt
        timestamp created_at
    }

    CLAIM_ANSWERS {
        text id PK
        text claim_id FK
        text question_id FK
        text claimant_answer
        real confidence_score
        integer matched
        timestamp created_at
    }

    FRAUD_ALERTS {
        text id PK
        text claim_id FK
        text claimant_id FK
        real risk_score
        text severity
        text alert_type
        text reasons
        text status
        timestamp created_at
    }

    RECOVERY_CASES {
        text id PK
        text claim_id FK
        text item_id FK
        text claimant_id FK
        text pickup_location
        text handover_code
        text status
        text timeline
        text admin_id
        timestamp created_at
        timestamp recovered_at
    }

    NOTIFICATIONS {
        text id PK
        text user_id FK
        text type
        text title
        text message
        text data
        integer read
        timestamp created_at
    }

    AUDIT_LOGS {
        text id PK
        text user_id FK
        text action
        text target_type
        text target_id
        text details
        timestamp created_at
    }
```

---

## 🌟 Key Functional Features

| Capability | Engineering Implementation | Institutional Impact |
| :--- | :--- | :--- |
| **Live Optical Evidence & Anti-Spoof** | Real-time browser hardware camera access with Canvas-rendered dynamic Location Tag banner and GPS stamp. | Eliminates outdated web images and prevents false stock photo uploads. |
| **Cloudinary CDN Integration** | Multi-tenant cloud media storage via in-memory stream buffer uploads (Vercel-compatible). | Provides fast, global CDN image delivery with automated format optimization. |
| **Multimodal Matching Console** | Visual alignment gauge, category hard filter, signal radar bars, and explainable AI reason tags. | Gives campus security officers 100% explainability behind every AI suggestion. |
| **Zero-Knowledge Challenge** | Automatic generation of blind test prompts based on encrypted attributes (serial number, scratches). | Protects legitimate owners; fraudsters cannot guess what they cannot see. |
| **Fraud Shield Telemetry** | Automated risk scoring engine analyzing claim velocity, previous rejections, and location divergence. | Flags fraudulent claim attempts with severity alerts (`LOW`, `MEDIUM`, `HIGH`). |
| **1-Time Code Custody Closure** | Secret random tokens generated at report time (`LOST-XXXX` / `FIND-XXXX`) recited during in-person pickup. | Guarantees physical proof of ownership before releasing high-value items. |
| **Campus Spatial Telemetry** | Interactive SVG campus zone map with hotspot clusters, hourly incident distributions, and category share charts. | Enables campus security to deploy proactive patrols in high-loss zones. |
| **Telegram Community Hub** | Integrated bot (`@findoravsb_bot`) with slash commands (`/summary`, `/status`, `/code`) and group broadcasts. | Keeps the entire campus community informed through existing social channels. |

---

## 📡 REST API Reference

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/register` | `POST` | Public | Register new campus account (`student`, `verification_officer`, `admin`) |
| `/api/auth/login` | `POST` | Public | Authenticate user and receive 7-day JWT token |
| `/api/auth/me` | `GET` | Bearer | Retrieve authenticated profile and permissions |
| `/api/items` | `GET` | Public | Filter registered items by type, category, building, and status |
| `/api/items/:id` | `GET` | Bearer | View single item details (private attributes redacted for non-owners) |
| `/api/items/upload` | `POST` | Bearer | Upload camera photo directly to Cloudinary CDN storage |
| `/api/items/lost` | `POST` | Bearer | Report lost item, generate 1-Time Code, and auto-scan candidates |
| `/api/items/found` | `POST` | Bearer | Turn in found item with live optical evidence |
| `/api/items/close-search` | `POST` | Officer/Admin | Close search and finalize recovery using owner's 1-Time Code |
| `/api/matches` | `GET` | Bearer | Fetch AI-ranked candidate matches |
| `/api/matches/:id` | `GET` | Bearer | Fetch deep match telemetry for Hero Inspection view |
| `/api/claims/initiate` | `POST` | Bearer | Start blind ownership challenge on a found item |
| `/api/claims/:id/verify` | `POST` | Bearer | Submit answers to blind challenge questions |
| `/api/admin/dashboard` | `GET` | Officer/Admin | Fetch real-time command center telemetry, counts, and fraud alerts |
| `/api/admin/claims/:id/approve` | `POST` | Officer/Admin | Authorize claim and generate official Recovery Case |
| `/api/admin/claims/:id/reject` | `POST` | Officer/Admin | Reject fraudulent or unverified claim |
| `/api/recovery/:caseId/handover`| `POST` | Officer/Admin | Complete physical custody handover and record audit trail |
| `/api/analytics` | `GET` | Public | Fetch campus spatial hotspots, hourly telemetry, and recovery rate |
| `/api/notifications` | `GET` | Bearer | Retrieve real-time user notification feed |
| `/api/telegram/status` | `GET` | Public | Check health of campus Telegram bot and linked groups |

---

## ⚙️ Environment Configuration

Ensure the following environment variables are set in `backend/.env`:

```env
# Server Port & Mode
PORT=5000
NODE_ENV=production

# Supabase PostgreSQL Cloud Database
DATABASE_URL=postgresql://postgres.dmuyeotwwvquxtchmbcg:[YOUR_PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres

# Cloudinary CDN Image Storage
CLOUDINARY_CLOUD_NAME=dalevih1d
CLOUDINARY_API_KEY=315998851513196
CLOUDINARY_API_SECRET=DJ89EpZWukmempsVlYM5QSiiVsI

# Google Gemini AI Engine
GEMINI_API_KEY=AIzaSy...

# Authentication & Security
JWT_SECRET=findora_ai_jwt_secret_key_2026_secure_auth
ADMIN_REGISTRATION_SECRET=FindoraAdmin2026!

# Telegram Community Bot
TELEGRAM_BOT_TOKEN=8427909325:AAF...
TELEGRAM_BOT_USERNAME=findoravsb_bot

# Brevo SMTP Transactional Email
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=campusconnectvsb@gmail.com
SMTP_PASS=...
```

---

## 🚀 Quick Start Guide

### Automated 1-Click Launch (Windows)
Double-click or run `run.bat` in the root workspace:
```cmd
run.bat
```
This automatically verifies dependencies, initializes the local cache from Supabase, starts the Express backend on port `5000`, launches the Vite frontend on port `3000`, and opens your browser.

### Manual Launch
```bash
# 1. Start Backend API
cd backend
npm install
node server.js

# 2. Start Frontend UI (in a new terminal)
cd frontend
npm install
npm run dev
```

Visit **`http://localhost:3000`** in your browser.

---

## 👥 Engineering Team & Attribution

| Contributor | GitHub | Role |
| :--- | :--- | :--- |
| **Tharun Kumar** | [@Tharun4743](https://github.com/Tharun4743) | System Architecture, Supabase Schema, Cloudinary Integration & Lead Engineer |
| **Tamilselvan** | [@admin963703](https://github.com/admin963703) | AI Retrieval Algorithms, Fraud Risk Engine & Handover Lifecycle |
| **RAMKISHORE SM** | [@Ramkishore76](https://github.com/Ramkishore76) | React 19 Frontend, Match Hero Console & Campus Spatial Telemetry |
| **VSB IT Department** | [@VSBECIT](https://github.com/VSBECIT) | Institutional Deployment, Telegram Bot Integration & Campus Network |

---

## 📄 License
FINDORA AI is released under the **MIT License**. Built for autonomous campus intelligence.
