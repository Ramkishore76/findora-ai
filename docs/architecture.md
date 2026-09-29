# FINDORA AI — Technical Architecture Specification

> **Autonomous Lost & Found Intelligence, Verification & Recovery Network**
> *"Find the connection. Verify the owner. Recover it safely."*

---

## 1. System Overview & Architecture

FINDORA AI replaces manual, fragmented lost-and-found processes with an end-to-end autonomous intelligence network combining multimodal retrieval, zero-leak ownership verification, and secure custody transfer.

```text
                    FINDORA AI
                        │
                        ▼
              ┌─────────────────┐
              │ React Frontend  │ (Vite + Tailwind v4 + Lucide + Recharts)
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ Express API     │ (REST, JWT, Multer, SQLite WAL)
              └────────┬────────┘
                       │
        ┌──────────────┼───────────────┐
        │              │               │
        ▼              ▼               ▼
     Items          Claims          Admin
        │              │               │
        └──────────────┼───────────────┘
                       │
                       ▼
                MATCHING ENGINE
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
     Image            Text          Metadata
    Similarity      Similarity       Signals
       │               │               │
       └───────────────┼───────────────┘
                       ▼
                Candidate Retrieval (Stage 1)
                       │
                       ▼
             Multimodal Re-Ranking (Stage 2)
                       │
                       ▼
                Explainable Match (93%)
                       │
                       ▼
           Blind Ownership Challenge (Vault)
                       │
                       ▼
              Fraud Shield Risk Engine
                       │
                       ▼
                Human Approval
                       │
                       ▼
            Recovery Case (FR-2026-00091)
                       │
                       ▼
                 Item Recovered
```

---

## 2. Core Differentiators

Unlike generic keyword search boards, FINDORA AI delivers:

1. **Multimodal Candidate Retrieval**: Integrates visual signatures, semantic text embeddings, geospatial campus coordinates, and exponential time decay.
2. **Hard Negative Protection**: Differentiates items sharing broad categories (e.g. Dell XPS vs HP Spectre laptops) through brand reconciliation and visual texture conflict penalties.
3. **Explainable AI Matching**: Displays multi-signal progress bars with grounded evidence ("Why this match?") and explicit uncertainty warnings.
4. **Blind-Match Ownership Protocol**: Prevents false claiming by concealing private item traits (scratches, stickers, serial numbers) and generating zero-knowledge challenge questions.
5. **Fraud Shield Risk Engine**: Detects high-velocity claiming, contradictory descriptions, and suspicious activity, scoring risk from 0 to 100 with clear explainable factors.
6. **Immutable Custody Handover**: Generates verifiable recovery cases (`FR-2026-XXXXX`), secure secret handover codes (`FND-XXXX`), and QR codes.

---

## 3. Mathematical Foundations of Matching Engine

### A. Multimodal Composite Score
$$\text{Score}_{\text{final}} = \sum_{i} w_i \cdot S_i - P_{\text{conflict}}$$

Where the default weights are configurable:
* $w_{\text{visual}} = 0.30$
* $w_{\text{text}} = 0.25$
* $w_{\text{location}} = 0.15$
* $w_{\text{time}} = 0.10$
* $w_{\text{category}} = 0.10$
* $w_{\text{attributes}} = 0.10$

### B. Spatial Proximity Function
$$\text{Score}_{\text{location}} = \frac{1}{1 + \left(\frac{d_{\text{effective}}}{250}\right)^{1.6}}$$
Where $d_{\text{effective}} = \sqrt{\Delta x^2 + \Delta y^2} + 15 \cdot |\Delta \text{floor}|$.

### C. Temporal Decay Function
$$\text{Score}_{\text{time}} = \exp(-\lambda \cdot \max(0, \Delta t_{\text{hours}}))$$
With decay factor $\lambda = 0.015$ (half-life $\approx 46$ hours). If found time precedes loss time by $>2$ hours, a penalty is applied.

### D. Semantic Text Cosine Similarity
$$\text{Cosine}(A, B) = \frac{\vec{A} \cdot \vec{B}}{\|\vec{A}\| \|\vec{B}\|} + \text{Overlap Bonus}$$

---

## 4. Blind-Match Ownership Protocol

```text
Found Item Registered
         ↓
Private Attributes Saved in Encrypted Vault
         ↓
AI Generates Non-Leaking Questions:
- "What unique sticker or decal is attached to the item or base?"
- "Describe any unique scratches, damage, or loose keys."
         ↓
Claimant Submits Knowledge Answers
         ↓
Verification Engine Computes Token Intersections & Levenshtein Tolerances
         ↓
Ownership Confidence Score (e.g. 94%)
```

---

## 5. Relational Database Schema

* `users`: `id`, `name`, `email`, `password_hash`, `role`, `avatar`, `created_at`
* `items`: `id`, `type`, `title`, `description`, `category`, `color`, `brand`, `model`, `image`, `location`, `building`, `floor`, `event_time`, `status`, `owner_id`
* `item_private_attributes`: `id`, `item_id`, `serial_number`, `unique_marks`, `damage_details`, `hidden_features`
* `matches`: `id`, `lost_item_id`, `found_item_id`, `final_score`, `visual_score`, `text_score`, `location_score`, `time_score`, `category_score`, `attribute_score`, `explanation`
* `claims`: `id`, `match_id`, `lost_item_id`, `found_item_id`, `claimant_id`, `status`, `verification_score`, `risk_score`, `risk_level`, `risk_factors`
* `claim_questions`: `id`, `claim_id`, `found_item_id`, `question_key`, `prompt`
* `claim_answers`: `id`, `claim_id`, `question_id`, `claimant_answer`, `confidence_score`, `matched`
* `fraud_alerts`: `id`, `claim_id`, `claimant_id`, `risk_score`, `severity`, `alert_type`, `reasons`
* `recovery_cases`: `id`, `claim_id`, `item_id`, `claimant_id`, `pickup_location`, `handover_code`, `status`, `timeline`
* `notifications`: `id`, `user_id`, `title`, `message`, `type`, `data`, `read`
* `audit_logs`: `id`, `user_id`, `action`, `target_type`, `target_id`, `details`
