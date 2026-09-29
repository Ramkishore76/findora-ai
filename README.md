# FINDORA AI

### Autonomous Lost & Found Intelligence, Verification & Recovery Network

> **Tagline**: *"Find the connection. Verify the owner. Recover it safely."*

FINDORA AI is a privacy-first intelligent Lost & Found platform designed for universities, corporate campuses, hostels, and large facilities. It transforms traditional manual lost-and-found operations into an autonomous AI-assisted recovery network.

---

## 🌟 Key Highlights & Innovations

1. **Multimodal Candidate Retrieval**: Combines visual appearance, tokenized semantic embeddings, campus coordinate distance decay, and exponential time decay ($e^{-\lambda \Delta t}$).
2. **Hard Negative Protection**: Distinguishes items sharing categories (e.g. Dell XPS vs HP Spectre laptops) through brand reconciliation and feature conflict penalties.
3. **Explainable AI Matching**: Displays a flagship hero comparison console with an animated match gauge (93%), multi-signal alignment bars, grounded evidence checkmarks, and uncertainty factors.
4. **Blind-Match Ownership Protocol**: Prevents false claiming by encrypting private traits (scratches, stickers, serial numbers) and generating zero-knowledge challenge questions.
5. **Fraud Shield Risk Engine**: Detects suspicious claim velocity, contradictory descriptions, and abnormal pattern graphs (e.g., Dave Miller flagged with Risk: 76/100, HIGH RISK).
6. **Immutable Recovery & Secure Handover**: Generates official Case IDs (`FR-2026-00088`), secure random Handover Codes (`FND-8492`), interactive QR codes, and a full 8-step custody timeline.
7. **Campus Intelligence & Hotspot Map**: Interactive SVG campus zone map (🔴 High, 🟡 Medium, 🟢 Low), hourly loss distribution charts (Peak: 4 PM - 6 PM), and category share metrics.
8. **Grounded AI Search Assistant**: Natural language query parser (⌘K) grounded in live registry data without hallucinations.
9. **Dual Light & Obsidian Stealth Dark Design System**: Ultra-sleek UI matching modern B2B dashboard aesthetics with an interactive Theme Toggle.

---

## 🚀 Quick Start Guide (Windows 1-Click)

### Option A: 1-Click Launch (Recommended)
Simply double-click or run **`run.bat`** from the project root:
```cmd
run.bat
```
This automated launcher will:
1. Verify Node.js installation.
2. Automatically install any missing backend or frontend dependencies.
3. Start the Backend API server on `http://localhost:5000`.
4. Start the Frontend development server on `http://localhost:3000`.
5. Automatically open your default web browser to `http://localhost:3000`.

To stop both servers at any time, run:
```cmd
stop.bat
```

---

### Option B: Manual Startup

#### 1. Backend Server
```bash
cd backend
npm install
node server.js          # Starts Express API server on http://localhost:5000
```

#### 2. Frontend Application
```bash
cd frontend
npm install
npm run dev             # Starts Vite development server on http://localhost:3000
```

Visit **`http://localhost:3000`** in your browser.

---

## 🧭 Live System Walkthrough

FINDORA AI provides a fully autonomous lost & found lifecycle:
* **Registry & Reporting**: Users report lost or found items with zero-leak private vault attributes (scratches, serial numbers, hidden contents).
* **Multimodal AI Match Console**: Real-time explainable matching combining visual tokens, semantics, spatial coordinates, and temporal decay.
* **Zero-Knowledge Ownership Challenge**: Claimants must prove ownership through blind verification questions generated from encrypted private attributes.
* **Admin Command Center**: Campus security officers audit claims, review risk scores, and approve handover.
* **Secure Custody Transfer**: Generates verifiable Handover Codes and QR codes, tracking the complete custody chain to final recovery.
* **Campus Spatial Telemetry**: Interactive campus incident hotspot maps and recovery turnaround telemetry.

---

## 🏗️ Tech Stack

* **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide Icons, Recharts, `clsx`, `tailwind-merge`.
* **Backend**: Node.js, Express, REST API, JWT, Multer, `better-sqlite3` (WAL mode enabled).
* **AI Algorithms**: Token TF-IDF Cosine Similarity, Feature Vector Hamming Distance, Haversine Spatial Distance Decay, Exponential Temporal Decay, Fuzzy Levenshtein Distance, Graph-based Fraud Velocity Analysis.

---

## 🤖 Telegram Bot & Official Campus Community Group

FINDORA AI features real-time notifications, interactive status lookups, and visual summaries via Telegram:
* **Personal 1-on-1 Student Bot**: [@findoravsb_bot](https://t.me/findoravsb_bot)
  * `/code <item_id>`: Safely reveals confidential 1-Time Handover Codes.
  * `/myreports`: Lists reports filed by the student and secret claim codes.
  * `/status <item_id>`: Real-time search status lookup.
* **Campus Community Group**: [Join Findora Group](https://t.me/+V_U9BauJqKQ2NzE1)
  * `/summary`: Comprehensive visual campus lost & found breakdown with photos, locations & GPS coordinates.
  * `/lost` & `/found`: Instant campus registry browsing.

---

## 👥 Core Contributors & Engineering Team

| Contributor | GitHub | Role |
| :--- | :--- | :--- |
| **Tharun Kumar** | [@Tharun4743](https://github.com/Tharun4743) | System Architecture, Database Schema & Lead Engineer |
| **Tamilselvan** | [@admin963703](https://github.com/admin963703) | AI Candidate Retrieval, Fraud Risk Engine & Handover Lifecycle |
| **RAMKISHORE SM** | [@Ramkishore76](https://github.com/Ramkishore76) | React Frontend, Match Hero Console & Campus Spatial Telemetry |
| **VSB IT Department** | [@VSBECIT](https://github.com/VSBECIT) | Telegram Bot Integration, Group Visual Summaries & Campus Hub |

---

## 📄 License & Attribution
Developed for the Autonomous Lost & Found Hackathon MVP. 2026.
