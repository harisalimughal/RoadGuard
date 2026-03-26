from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .data_store import RoadGuardDataStore
from .nlu_service import NLUService
from .response_service import ResponseComposer


class TextRequest(BaseModel):
    text: str = Field(min_length=1)
    city: str | None = None
    address: str | None = None


class IncidentRequest(BaseModel):
    incident_key: str = Field(min_length=1)
    city: str | None = None


backend_root = Path(__file__).resolve().parents[1]
store = RoadGuardDataStore(backend_root)
nlu = NLUService(backend_root)
composer = ResponseComposer(backend_root)

app = FastAPI(title="RoadGuard Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    nlu.load_or_train()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/nlu/train")
def train_nlu() -> dict[str, Any]:
    result = nlu.train()
    return {
        "status": "trained",
        "trained_at": result.trained_at,
        "train_rows": result.train_rows,
        "val_rows": result.val_rows,
        "accuracy": result.accuracy,
        "intents": result.intents,
    }


@app.get("/api/nlu/status")
def nlu_status() -> dict[str, Any]:
    return nlu.get_status()


@app.post("/api/nlu/predict")
def predict_nlu(payload: TextRequest) -> dict[str, Any]:
    return nlu.predict(payload.text)


@app.get("/api/incidents")
def incidents(
    city: str | None = None,
    incident_type: str | None = None,
    severity: str | None = None,
    days: int = Query(default=30, ge=1, le=3650),
    limit: int = Query(default=100, ge=1, le=500),
) -> dict[str, Any]:
    data = store.get_incidents(city=city, incident_type=incident_type, severity=severity, days=days, limit=limit)
    return {"count": len(data), "items": data}


@app.get("/api/alerts")
def alerts(
    city: str | None = None,
    limit: int = Query(default=10, ge=1, le=100),
) -> dict[str, Any]:
    data = store.get_safety_alerts(city=city, limit=limit)
    return {"count": len(data), "items": data}


@app.get("/api/quick-fix/{incident_key}")
def quick_fix(incident_key: str) -> dict[str, Any]:
    result = store.resolve_quick_fix(incident_key)
    if not result:
        raise HTTPException(status_code=404, detail="No quick-fix found for incident key")
    return result


@app.post("/api/contact")
def emergency_contact(payload: IncidentRequest) -> dict[str, Any]:
    result = store.resolve_contact(payload.incident_key, payload.city)
    if not result:
        raise HTTPException(status_code=404, detail="No contact found for incident key")
    return result


def _set_message_and_data(
    response: dict[str, Any],
    message: str,
    suggestions: list[str] | None = None,
    data_key: str | None = None,
    data_value: Any = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    response["message"] = message

    if data_key and data_value is not None:
        payload[data_key] = data_value
    if suggestions:
        payload["suggestions"] = suggestions

    response["data"] = payload
    return response


@app.post("/api/chat")
def chat(payload: TextRequest) -> dict[str, Any]:
    nlu_result = nlu.predict(payload.text)
    intent = nlu_result.get("intent", "out_of_domain")
    confidence = float(nlu_result.get("confidence") or 0.0)
    entities = nlu_result.get("entities", {})
    text_lower = payload.text.lower()
    resolved_city = entities.get("city") or payload.city
    incident_key = entities.get("incident_type") or entities.get("issue") or "accident"

    print(f"\n--- Chat Request Debug ---")
    print(f"User Input: {payload.text}")
    print(f"Detected Intent: {intent} (Conf: {confidence:.2f})")
    print(f"Extracted Entities: {entities}")
    print(f"Resolved City: {resolved_city}")

    response: dict[str, Any] = {
        "intent": intent,
        "confidence": confidence,
        "entities": entities,
        "message": "",
        "data": {},
    }

    is_uncertain_intent = intent in {"fallback", "ood_negative", "out_of_domain"}
    is_low_confidence = confidence < 0.45
    domain_keywords = [
        "alert",
        "weather",
        "rain",
        "fog",
        "road",
        "condition",
        "incident",
        "accident",
        "crash",
        "traffic",
        "sos",
        "emergency",
        "ambulance",
        "police",
        "help",
        "fix",
        "tip",
        "repair",
        "route",
        "puncture",
        "pothole",
    ]
    has_domain_context = any(keyword in text_lower for keyword in domain_keywords)
    is_vague_prompt = (len(payload.text.strip().split()) <= 3 and not has_domain_context) or any(
        phrase in text_lower for phrase in ["tell me something", "something", "anything"]
    )

    if any(phrase in text_lower for phrase in ["where am i", "my location", "current city", "my city", "what is my location", "what city", "which city"]):
        location_desc = payload.address if payload.address else (payload.city.title() if payload.city else "an unknown location")
        msg = f"📍 Based on your device's GPS signal, your current location is:\n{location_desc}"
        return _set_message_and_data(response, msg, ["Show alerts near me", "Recent incidents"])

    # Small-talk / reaction detector — fires before the vague-prompt guard so casual
    # messages like "haha", "thanks", "wow" get a natural reply instead of a clarify prompt.
    _smalltalk_triggers = [
        "haha", "hehe", "lol", "lmao", "xd",
        "thank", "thanks", "thx", "appreciate",
        "wow", "whoa", "omg", "no way", "seriously",
        "hmm", "hm", "uhh", "umm",
        "interesting", "fascinating", "curious", "tell me more",
        "awesome", "cool", "nice", "great", "perfect", "noted",
    ]
    _smalltalk_exact = {"ok", "okay", "alright", "sure", "yes", "yeah", "yep", "yup", "ya", "no", "nope", "nah"}
    is_smalltalk = (
        text_lower.strip() in _smalltalk_exact
        or any(trigger in text_lower for trigger in _smalltalk_triggers)
    ) and not has_domain_context

    if is_smalltalk:
        smalltalk = composer.compose_smalltalk(payload.text)
        return _set_message_and_data(response, smalltalk.message, smalltalk.suggestions)

    if is_vague_prompt and intent not in {"greet", "smalltalk_bot_ready", "goodbye"}:
        clarify = composer.compose_clarify(resolved_city)
        return _set_message_and_data(response, clarify.message, clarify.suggestions)

    if intent in {"driver_alerts_near_me", "get_weather_alerts", "road_condition_status"}:
        alerts_data = store.get_safety_alerts(city=resolved_city, limit=8)
        composed = composer.compose_alerts(payload.text, intent, alerts_data, resolved_city)
        return _set_message_and_data(response, composed.message, composed.suggestions, "alerts", alerts_data)

    if intent in {"find_quick_tips", "how_to_fix_issue"}:
        quick_fix = store.resolve_quick_fix(incident_key)
        composed = composer.compose_quick_fix(payload.text, intent, quick_fix)
        return _set_message_and_data(response, composed.message, composed.suggestions, "quick_fix", quick_fix)

    if intent in {"ask_emergency_contact", "sos_help", "find_nearby_service"}:
        if "alert" in text_lower or "weather" in text_lower:
            alerts_data = store.get_safety_alerts(city=resolved_city, limit=8)
            composed = composer.compose_alerts(payload.text, intent, alerts_data, resolved_city)
            return _set_message_and_data(response, composed.message, composed.suggestions, "alerts", alerts_data)
        elif "incident" in text_lower or "accident" in text_lower or "traffic" in text_lower:
            incidents_data = store.search_incidents(payload.text, city=resolved_city, limit=5)
            if not incidents_data:
                incidents_data = store.get_incidents(
                    city=resolved_city,
                    incident_type=entities.get("incident_type"),
                    severity=entities.get("severity"),
                    days=30,
                    limit=20,
                )
            composed = composer.compose_incidents(payload.text, intent, incidents_data, resolved_city)
            return _set_message_and_data(response, composed.message, composed.suggestions, "incidents", incidents_data)

        contact = store.resolve_contact(incident_key, resolved_city)
        composed = composer.compose_contact(payload.text, intent, contact, resolved_city)
        return _set_message_and_data(response, composed.message, composed.suggestions, "contact", contact)

    if intent == "status_query" and not any(
        keyword in text_lower
        for keyword in ["traffic", "incident", "accident", "road", "alert", "weather", "safe", "route"]
    ):
        clarify = composer.compose_clarify(resolved_city)
        return _set_message_and_data(response, clarify.message, clarify.suggestions)

    if intent in {"report_incident", "ask_safe_route", "ask_recent_incidents", "status_query"}:
        incidents_data = store.search_incidents(payload.text, city=resolved_city, limit=5)
        if not incidents_data:
            incidents_data = store.get_incidents(
                city=resolved_city,
                incident_type=entities.get("incident_type"),
                severity=entities.get("severity"),
                days=30,
                limit=20,
            )
        print(f"Retrieved Incidents: {len(incidents_data)} items")
        composed = composer.compose_incidents(payload.text, intent, incidents_data, resolved_city)
        return _set_message_and_data(response, composed.message, composed.suggestions, "incidents", incidents_data)

    if intent in {"greet", "smalltalk_bot_ready"}:
        greet = composer.compose_greet()
        return _set_message_and_data(response, greet.message, greet.suggestions)

    if intent in {"goodbye"}:
        goodbye = composer.compose_goodbye()
        return _set_message_and_data(response, goodbye.message)

    if intent in {"confirm", "deny", "cancel_report"}:
        clarify = composer.compose_clarify(resolved_city)
        return _set_message_and_data(response, clarify.message, clarify.suggestions)

    # Keyword fallback improves response quality when intent is uncertain.
    if is_uncertain_intent or is_low_confidence:
        if any(keyword in text_lower for keyword in ["alert", "weather", "rain", "fog", "road condition"]):
            alerts_data = store.get_safety_alerts(city=resolved_city, limit=8)
            composed = composer.compose_alerts(payload.text, intent, alerts_data, resolved_city)
            return _set_message_and_data(response, composed.message, composed.suggestions, "alerts", alerts_data)

        if any(keyword in text_lower for keyword in ["incident", "accident", "crash", "traffic"]):
            incidents_data = store.search_incidents(payload.text, limit=5)
            if not incidents_data:
                incidents_data = store.get_incidents(
                    city=resolved_city,
                    incident_type=entities.get("incident_type"),
                    severity=entities.get("severity"),
                    days=30,
                    limit=20,
                )
            composed = composer.compose_incidents(payload.text, intent, incidents_data, resolved_city)
            return _set_message_and_data(response, composed.message, composed.suggestions, "incidents", incidents_data)

        if any(keyword in text_lower for keyword in ["sos", "emergency", "help", "ambulance", "police"]):
            contact = store.resolve_contact(incident_key, resolved_city)
            composed = composer.compose_contact(payload.text, intent, contact, resolved_city)
            return _set_message_and_data(response, composed.message, composed.suggestions, "contact", contact)

        if any(keyword in text_lower for keyword in ["fix", "tip", "repair", "overheat", "puncher", "puncture"]):
            quick_fix = store.resolve_quick_fix(incident_key)
            composed = composer.compose_quick_fix(payload.text, intent, quick_fix)
            return _set_message_and_data(response, composed.message, composed.suggestions, "quick_fix", quick_fix)

        clarify = composer.compose_clarify(resolved_city)
        return _set_message_and_data(response, clarify.message, clarify.suggestions)

    clarify = composer.compose_clarify(resolved_city)
    return _set_message_and_data(response, clarify.message, clarify.suggestions)
