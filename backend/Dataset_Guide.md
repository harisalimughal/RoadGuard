# FYP Traffic Safety Chatbot — Dataset & Project Guide
**Last updated:** 2025-09-24T17:53:49.410223Z

This document explains the purpose of every file delivered for your FYP chatbot, why both a **single 20k incidents file** and **four 5k category files** are included, and how to use them for **NLU training**, **retrieval**, and **conversation logic** (Rasa/Dialogflow/custom).

---

## 1) Incident Datasets (Ground Truth Knowledge)
### A. `incidents_master_20k.csv` (Production-friendly, single file)
**Purpose:** Unified incident knowledge base for search/retrieval in production.
- **Why single file?** Easier to index (single table or single vector index), simpler analytics, one source of truth.
- **Columns:** `id, type, title, description, location, severity, date, source`
- **Use-cases:**
  - Answer “recent accidents in Lahore” / “potholes near Kalma Chowk” by filtering `type`, `location`, and `date`.
  - Rank by recency/severity. Display `title + description + source` to users.
  - Power a “safe route” heuristic by counting incidents along candidate paths.

### B. Four category datasets (Balanced training & evaluation)
1. `accidents.csv`  
2. `road_condition.csv`  
3. `driver_alerts.csv`  
4. `weather_emergencies.csv`  

**Purpose:** Same schema as master, but split by category (each ≈5,000 rows).
- **Why provide four files as well?**
  - **Balanced training:** If you train a classifier to auto-label `type`, stratify/evaluate per category.
  - **Leak-free validation:** Hold out one category slice or do stratified splits to check generalization.
  - **Data generation:** Easier to synthesize more class-specific utterances or examples if needed.

**How to use:**
- For ML classification of `type`: train with concatenation of the four files and do **stratified train/val/test splits**.
- For retrieval in prod: keep using `incidents_master_20k.csv` (fewer moving parts).

---

## 2) Action & Safety Knowledge
### A. `quick_fix_guides_expanded.csv`
**Purpose:** What a user can safely do until help arrives (mapped to every incident type we generated).
- **Columns:** `condition, quick_fix_title, instructions`
- **Usage:**
  - When intent is “how to fix” or after a report confirmation, look up the **best-matching condition** and return instructions.
  - Use together with `incident_to_quick_fix.csv` mapping.

### B. `incident_to_quick_fix.csv`
**Purpose:** Routing table to connect incident keys → quick-fix `condition` names.
- **Usage:** Given a detected `incident_type` (e.g., “pothole”), look up the corresponding quick-fix condition (“Potholes”), then fetch the row from `quick_fix_guides_expanded.csv`.

### C. `emergency_contacts.csv` (+ city-wise contacts)
**Purpose:** Who to call, numbers, and **when to contact** each service (including NGOs).
- **Columns:** `service, phone_number, when_to_contact, notes`
- **City-wise files:** `lahore_contacts.csv`, `karachi_contacts.csv`, `islamabad_contacts.csv` add a `city` column for local responses.
- **Usage:** After deciding the primary service, fetch the number and show “when to contact” guidance.

### D. `contact_routing_rules.csv`
**Purpose:** Given an incident key (e.g., “accident_pileup” or “broken_signal”), suggest the **primary service** and notes.
- **Usage:** Detect incident → map to quick-fix + primary service → fetch contact number.

---

## 3) NLU / NLP Training Assets
### A. Core utterance sets
- `nlu_utterances_train.csv` — training set (intents + paraphrases + entities as JSON)  
- `nlu_utterances_val.csv` — holdout/validation set  
- `nlu_utterances_ood_negatives.csv` — **1,000** out-of-domain/negative queries to reduce false triggers  
- `nlu_utterances_urdu_aug.csv` — **Urdu-script** augmentations for key intents (~1,750 rows)

**Why needed:** Incident rows don’t teach the bot how users speak; utterances teach the model to understand messy queries (English, Roman-Urdu, Urdu, typos, emoji).

### B. Entities & synonyms
- Lookups: `lookup_city.txt`, `lookup_landmark.txt`, `lookup_incident_type.txt`, `lookup_service.txt`, `lookup_issue.txt`, `lookup_severity.txt`  
- Synonyms: `entity_synonyms.csv` (canonical value → synonyms; includes Roman‑Urdu spellings & severity words)

**Usage:** Improve entity extraction. Import as lookup tables / synonyms (Rasa, Dialogflow, or custom gazetteers).

### C. Evaluation
- `nlu_eval_report.csv` — per-intent precision/recall/F1
- `nlu_eval_summary.txt` — micro P/R/F1, dataset sizes, vocab

**Acceptance targets:** Micro‑F1 ≥ 0.85; all core intents ≥ 0.75 F1.

---

## 4) Rasa Project Scaffolding (Optional but Ready)
- `rasa_nlu.yml` — registers lookup tables + regex (plate, phone)
- `domain.yml` — intents/entities/slots + basic responses
- `rules.yml` — greet/goodbye/fallback
- `stories.yml` — example flows
- `forms_fragment.yml` — **slot-filling forms**:  
  - `report_incident_form` → slots: `city, landmark, incident_type, severity`  
  - `sos_form` → slots: `city, landmark, service`
- `slotting_rules.yml`, `slotting_stories.yml` — run & demo the forms
- `response_templates.json` — ready-to-use bot messages
- `rasa_actions_stub.py` — example custom actions:  
  - `action_save_incident` → (stub) save the report and confirm  
  - `action_lookup_contact` → fetch number from `emergency_contacts.csv`

**How to use in Rasa (quick):**
1. Merge `forms_fragment.yml` contents into your `domain.yml` (forms + slots sections).
2. Include `slotting_rules.yml` and `slotting_stories.yml` in your project.
3. Add `rasa_actions_stub.py` to your actions server and wire endpoints.
4. Train: `rasa train` → run actions server → run bot.

---

## 5) Why both single 20k + four×5k files?
- **Single 20k (`incidents_master_20k.csv`)** → **production retrieval** (simple, fast, one index).  
- **Four×5k** → **balanced ML training & evaluation**, class‑wise analysis, safer experimentation without skew.  
You can keep both: train classifiers with the four splits; deploy retrieval on the master file.

---

## 6) Typical Flow (Putting it together)
1. **NLU detects intent** (e.g., `report_incident`) + entities (`city`, `landmark`, `incident_type`, `severity`).  
2. **Form fills missing slots** (Rasa forms) or Dialogflow parameters.  
3. **Action**:
   - Save incident (DB/log) using the slots.  
   - Use `incident_to_quick_fix.csv` → get **quick fix** from `quick_fix_guides_expanded.csv`.  
   - Use `contact_routing_rules.csv` → choose primary **service** → fetch number from `emergency_contacts.csv` (or city file).  
4. **Retrieval answers:** When user asks about status or risks, query `incidents_master_20k.csv` by `type/location/date` and summarize.  
5. **Fallback/OOD:** Route OOD texts to help or clarification, powered by `nlu_utterances_ood_negatives.csv`.

---

## 7) Practical Tips
- Keep 10–15% validation split; watch **per‑intent** F1 for weak spots and add targeted utterances.  
- Expand **lookups/synonyms** for localities and Roman‑Urdu variants you observe in testing.  
- For route safety, compute incident density around the path (last 7–30 days).  
- Log rejected/OOD messages and build new negatives from them.

---

## 8) Files Checklist
**Incidents:** `incidents_master_20k.csv`, `accidents.csv`, `road_condition.csv`, `driver_alerts.csv`, `weather_emergencies.csv`  
**Safety/Contacts:** `quick_fix_guides_expanded.csv`, `incident_to_quick_fix.csv`, `emergency_contacts.csv`, `contact_routing_rules.csv`, `lahore_contacts.csv`, `karachi_contacts.csv`, `islamabad_contacts.csv`  
**NLU:** `nlu_utterances_train.csv`, `nlu_utterances_val.csv`, `nlu_utterances_urdu_aug.csv`, `nlu_utterances_ood_negatives.csv`, lookups, synonyms, eval report/summary  
**Rasa:** `rasa_nlu.yml`, `domain.yml`, `rules.yml`, `stories.yml`, `forms_fragment.yml`, `slotting_rules.yml`, `slotting_stories.yml`, `response_templates.json`, `rasa_actions_stub.py`

---

## 9) Where to start
- If you want the simple path: **index `incidents_master_20k.csv` + train NLU on the provided pack.**  
- Use the four files only when you need balanced ML training or category-specific experiments.
