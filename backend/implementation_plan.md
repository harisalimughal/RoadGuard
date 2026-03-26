# Chatbot Architecture Implementation Plan

## Overview
Implement a retrieval-augmented (RAG) + NLU chatbot using local datasets for efficient, cost-effective routing and answering in mixed languages (English, Roman-Urdu, Urdu).

## Architecture Decisions (Step 1)
- **RAG**: Vector database for `incidents_master_20k.csv`
- **NLU**: Intent classification using `nlu_utterances_train.csv` and entity extraction using lookups.
- **Action Logic**: Rule-based routing using `incident_to_quick_fix.csv`, `quick_fix_guides_expanded.csv`, and `emergency_contacts.csv`.
- **Generation**: No expensive LLM APIs; optionally use local models.

## Data Preprocessing (Step 2)
### A. Incidents
Combine `title`, `description`, and `location` columns into a single `text` column in `incidents_master_20k.csv` for effective vector embedding and search.

### B. Routing Data
Load mapping and guides into structure:
- `quick_fix_guides_expanded.csv`
- `incident_to_quick_fix.csv`
- `emergency_contacts.csv`

### C. NLU Data
- Train intent classifier using `nlu_utterances_train.csv`. 
- Use lookup files (`lookup_city.txt`, `lookup_landmark.txt`, etc.) for robust entity extraction.

## NLU Implementation (Step 4)
Implement a free, fast intent and entity detector:
- **Intent Classification**: Use `sklearn` (`TfidfVectorizer` + `LogisticRegression`) trained on user utterances and intents.
- **Entity Extraction**: Use simple substring matching with the lookup tables to detect entities (e.g., cities).

## Action Logic (Step 5)
Implement routing logic using fast pandas lookups:
- **Quick Fixes**: Map the extracted `incident_type` to a condition via `incident_to_quick_fix.csv`, then retrieve actionable instructions from `quick_fix_guides_expanded.csv`.
- **Contacts**: Filter `emergency_contacts.csv` by the detected city entity to provide localized help.

## Frontend Integration (Step 6)
Integrate the backend logic with the frontend application:
- **API Endpoint**: Create a RESTful `/chat` endpoint that accepts the user prompt and returns a structured payload (intent, entities, retrieved incidents, and any quick-fix/contact actions).
- **UI Alignment**: Build and align the chat UI professionally, ensuring responses are displayed clearly to the user.

## Retrieval Index (Step 3)
Build a free and efficient local retrieval index directly in memory:
- **Model**: Use `sentence-transformers` with 'all-MiniLM-L6-v2' (CPU-friendly, local, free).
- **Index**: Use `faiss-cpu` with `IndexFlatL2` for fast vector similarity search.
- **Process**: Encode the augmented `text` column of the incidents dataset into numpy embeddings and load them into FAISS.
- **Querying**: Embed user queries and use `index.search` to return the top K relevant incidents for context.

## LoRA Fine-Tuning (Step 7 - Optional)
Enhance generation and internal knowledge representation using Parameter-Efficient Fine-Tuning:
- **Model Training**: Fine-tune a pretrained LLM (e.g., LLaMA-2 7B or similar) using LoRA on the combined NLU and incidents data.
- **Hybrid Architecture**: Combine the fine-tuned capabilities (which internalize knowledge) with the FAISS retrieval index to achieve the best results with zero hallucination.
