# RoadGuard Backend

Backend API for dataset-driven chatbot, safety alerts, and map incidents.

## Response Architecture

Chat responses now use a 3-layer professional flow:

1. NLU model classifies intent + entities (`app/nlu_service.py`).
2. Backend fetches factual data from datasets (`app/data_store.py`).
3. Response composer builds natural replies from a template catalog (`app/response_catalog.json`) and local style-polishing rules (`app/response_service.py`).

This keeps routing deterministic while improving conversational quality.

## Setup

1. Create and activate a Python environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Run server from `backend` folder:

```bash
uvicorn app.main:app --reload --port 8000
```

## What this backend does

- Trains NLU intent model from:
  - `trafficbot_datasets/nlu_rasa/nlu/nlu_utterances_train.csv`
  - `trafficbot_datasets/nlu_rasa/nlu/nlu_utterances_urdu_aug.csv`
  - `trafficbot_datasets/nlu_rasa/nlu/nlu_utterances_ood_negatives.csv`
- Uses your dataset to serve:
  - incidents for map markers (`incidents_master_20k.csv`)
  - safety alerts (`driver_alerts_5000.csv`, `weather_emergencies_5000.csv`, `road_condition_5000.csv`)
  - quick fixes (`incident_to_quick_fix.csv`, `quick_fix_guides_expanded.csv`)
  - emergency contacts (`contact_routing_rules.csv`, `emergency_contacts.csv`, city contact files)

## Core endpoints

- `GET /health`
- `POST /api/nlu/train`
- `POST /api/nlu/predict`
- `GET /api/incidents?city=Lahore&incident_type=accident&days=30&limit=50`
- `GET /api/alerts?city=Karachi&limit=10`
- `GET /api/quick-fix/{incident_key}`
- `POST /api/contact`
- `POST /api/chat`

## Example request bodies

### NLU predict

```json
{
  "text": "urgent help needed near liberty chowk lahore"
}
```

### Emergency contact

```json
{
  "incident_key": "accident",
  "city": "Lahore"
}
```

### Chat

```json
{
  "text": "I saw a wrong-way driver near F-10 Islamabad"
}
```

## Notes

- Incident markers include deterministic pseudo-coordinates based on city + incident id/location, so your map can render points immediately.
- Trained model artifacts are stored in `backend/models/`.
