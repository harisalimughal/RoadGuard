from __future__ import annotations

import json
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass
class ComposedResponse:
    message: str
    suggestions: list[str]


class ResponseComposer:
    def __init__(self, backend_root: Path) -> None:
        self.backend_root = backend_root
        self.catalog_path = backend_root / "app" / "response_catalog.json"
        self.catalog = self._load_catalog()

    def _load_catalog(self) -> dict[str, Any]:
        if not self.catalog_path.exists():
            return {}
        try:
            return json.loads(self.catalog_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}

    @staticmethod
    def _city_label(city: str | None) -> str:
        return city if city else "your area"

    def _pick_template(self, key: str, variant: str = "templates") -> str:
        section = self.catalog.get(key, {})
        templates = section.get(variant, []) if isinstance(section, dict) else []
        if not isinstance(templates, list) or not templates:
            return ""
        return random.choice([t for t in templates if isinstance(t, str) and t.strip()])

    def _suggestions(self, key: str) -> list[str]:
        section = self.catalog.get(key, {})
        suggestions = section.get("suggestions", []) if isinstance(section, dict) else []
        if not isinstance(suggestions, list):
            return []
        clean = [str(item).strip() for item in suggestions if str(item).strip()]
        return clean[:4]

    @staticmethod
    def _safe_text(value: Any, fallback: str = "not available") -> str:
        text = str(value).strip() if value is not None else ""
        return text if text else fallback

    @staticmethod
    def _polish_message(base: str, style_key: str) -> str:
        if not base:
            return base

        openers = {
            "alerts": [
                "I checked the live feed.",
                "I reviewed the latest safety stream.",
            ],
            "incidents": [
                "I analyzed recent incident records.",
                "I checked the recent incident timeline.",
            ],
            "contact": [
                "I resolved the emergency routing for you.",
                "I matched your request to emergency routing rules.",
            ],
            "quick_fix": [
                "I mapped this to quick-fix guidance.",
                "I found the closest quick-fix playbook.",
            ],
            "clarify": [
                "I want to give you an accurate answer.",
                "I can help quickly once I know your exact need.",
            ],
            "greet": [
                "RoadGuard is active.",
                "Your assistant is ready.",
            ],
            "goodbye": [
                "Anytime you need road support, I am here.",
                "Come back whenever you need safety guidance.",
            ],
        }

        endings = {
            "alerts": "If you want, I can narrow this by severity or alert type.",
            "incidents": "I can also filter this by severity, type, or time range.",
            "contact": "If this is urgent, call now and share your exact landmark.",
            "quick_fix": "If you want, I can also fetch the nearest emergency contact.",
            "clarify": "You can type naturally, for example: accident near me or need SOS contact.",
            "greet": "Tell me your city and I will start with live local data.",
            "goodbye": "Drive safe.",
        }

        opener_choices = openers.get(style_key, [])
        opener = random.choice(opener_choices) if opener_choices else ""
        ending = endings.get(style_key, "")

        parts = [part for part in [opener, base, ending] if part]
        return " ".join(parts)

    def compose_alerts(self, user_text: str, intent: str, alerts: list[dict[str, Any]], city: str | None) -> ComposedResponse:
        city_label = self._city_label(city)
        if not alerts:
            baseline = self._pick_template("alerts", "empty") or (
                f"I checked the latest safety feed for {city_label}, and there are no new alerts right now."
            )
            return ComposedResponse(message=self._polish_message(baseline, "alerts"), suggestions=self._suggestions("alerts"))

        top_titles = [self._safe_text(item.get("title") or item.get("type"), "Alert") for item in alerts[:2]]
        formatted = ", ".join(top_titles)
        template = self._pick_template("alerts", "templates") or "I found {count} safety alerts for {city_label}. Top risks: {top_items}."
        baseline = template.format(count=len(alerts), city_label=city_label, top_items=formatted)
        final = self._polish_message(baseline, "alerts")
        return ComposedResponse(message=final, suggestions=self._suggestions("alerts"))

    def compose_incidents(self, user_text: str, intent: str, incidents: list[dict[str, Any]], city: str | None) -> ComposedResponse:
        city_label = self._city_label(city)
        if not incidents:
            baseline = self._pick_template("incidents", "empty") or (
                f"I could not find recent incident records for {city_label}."
            )
            return ComposedResponse(message=self._polish_message(baseline, "incidents"), suggestions=self._suggestions("incidents"))

        latest = incidents[0]
        latest_label = self._safe_text(latest.get("title") or latest.get("type"), "incident")
        latest_location = self._safe_text(latest.get("location"), city_label)
        latest_item = f"{latest_label} near {latest_location}"
        template = self._pick_template("incidents", "templates") or "I found {count} recent incidents for {city_label}. Most recent: {latest_item}."
        baseline = template.format(count=len(incidents), city_label=city_label, latest_item=latest_item)
        final = self._polish_message(baseline, "incidents")
        return ComposedResponse(message=final, suggestions=self._suggestions("incidents"))

    def compose_contact(self, user_text: str, intent: str, contact: dict[str, Any] | None, city: str | None) -> ComposedResponse:
        city_label = self._city_label(city)
        if not contact:
            baseline = self._pick_template("contact", "empty") or (
                "I could not resolve an emergency number yet. Share incident type and city."
            )
            return ComposedResponse(message=self._polish_message(baseline, "contact"), suggestions=self._suggestions("contact"))

        service = self._safe_text(contact.get("service"), "Emergency Service")
        phone_number = self._safe_text(contact.get("phone_number"), "not available")
        guidance = self._safe_text(contact.get("when_to_contact") or contact.get("notes"), "")
        template = self._pick_template("contact", "templates") or "For {city_label}, contact {service} at {phone_number}. {guidance}"
        baseline = template.format(city_label=city_label, service=service, phone_number=phone_number, guidance=guidance)
        final = self._polish_message(baseline, "contact")
        return ComposedResponse(message=final, suggestions=self._suggestions("contact"))

    def compose_quick_fix(self, user_text: str, intent: str, quick_fix: dict[str, Any] | None) -> ComposedResponse:
        if not quick_fix:
            baseline = self._pick_template("quick_fix", "empty") or (
                "I could not find a verified quick-fix for that issue yet."
            )
            return ComposedResponse(message=self._polish_message(baseline, "quick_fix"), suggestions=self._suggestions("quick_fix"))

        title = self._safe_text(quick_fix.get("quick_fix_title") or quick_fix.get("condition"), "Quick Fix")
        instructions = self._safe_text(quick_fix.get("instructions"), "Follow safety-first steps.")
        if len(instructions) > 280:
            instructions = f"{instructions[:277]}..."
        template = self._pick_template("quick_fix", "templates") or "Recommended quick fix: {title}. Steps: {instructions}."
        baseline = template.format(title=title, instructions=instructions)
        final = self._polish_message(baseline, "quick_fix")
        return ComposedResponse(message=final, suggestions=self._suggestions("quick_fix"))

    def compose_clarify(self, city: str | None) -> ComposedResponse:
        city_label = self._city_label(city)
        template = self._pick_template("clarify", "templates") or (
            "I did not fully understand that yet. Are you asking about alerts, incidents, emergency contacts, or a quick fix in {city_label}?"
        )
        return ComposedResponse(
            message=self._polish_message(template.format(city_label=city_label), "clarify"),
            suggestions=self._suggestions("clarify"),
        )

    def compose_greet(self) -> ComposedResponse:
        message = self._pick_template("greet", "templates") or "I am ready to help with road safety info."
        return ComposedResponse(message=self._polish_message(message, "greet"), suggestions=self._suggestions("greet"))

    def compose_goodbye(self) -> ComposedResponse:
        message = self._pick_template("goodbye", "templates") or "Take care and drive safe."
        return ComposedResponse(message=self._polish_message(message, "goodbye"), suggestions=[])

    def compose_smalltalk(self, user_text: str) -> ComposedResponse:
        t = user_text.lower().strip()

        # Laughing / amused
        if any(w in t for w in ["haha", "hehe", "lol", "lmao", "😂", "😄", "xd"]):
            replies = [
                "Ha! Glad I could bring a smile. Let me know if you need any road safety info! 😄",
                "Haha, love the energy! Anything road-related I can help with?",
                "😄 Good vibes! Ask me anything about alerts, incidents, or emergency contacts whenever you're ready.",
            ]

        # Thanking
        elif any(w in t for w in ["thank", "thanks", "thx", "ty", "appreciate", "grateful"]):
            replies = [
                "You're welcome! Stay safe out there — let me know if you need anything else.",
                "Happy to help! I've got live road data whenever you need it. 🛣️",
                "Anytime! Reach out if the road throws anything your way.",
            ]

        # Surprised / impressed
        elif any(w in t for w in ["wow", "whoa", "omg", "no way", "seriously", "really", "what!", "damn"]):
            replies = [
                "Right?! I try to keep you informed in real time. Anything else you'd like to know?",
                "I know! Road conditions can change fast. Want me to pull up the latest alerts?",
                "Yep, things happen quickly out there. Ask me anything road-safety related!",
            ]

        # Positive affirmations / agreement
        elif any(w in t for w in ["ok", "okay", "alright", "sure", "great", "awesome", "nice", "cool", "perfect", "good", "noted"]):
            replies = [
                "Great! Let me know whenever you need road alerts, incident updates, or emergency contacts.",
                "Got it! I'm here if the road needs attention. 🚗",
                "Perfect — just say the word and I'll pull up live data for you.",
            ]

        # Yes / affirmative
        elif t in {"yes", "yeah", "yep", "yup", "ya", "yea"}:
            replies = [
                "Awesome! What would you like to know — alerts, incidents, or emergency contacts?",
                "Sure! Just tell me your city and what you're looking for.",
                "I'm on it. What road info can I get you?",
            ]

        # No / negative
        elif t in {"no", "nope", "nah", "not really", "nah thanks"}:
            replies = [
                "No worries! I'm here whenever you need road safety information.",
                "All good! Just reach out if anything comes up on your drive. 🛣️",
                "Got it — I'll be right here if you need anything.",
            ]

        # Filler / thinking sounds
        elif any(w in t for w in ["hmm", "hm", "uhh", "umm", "uh", "ah"]):
            replies = [
                "Take your time! I can help with road alerts, incidents, emergency contacts, or quick fixes.",
                "No rush — just let me know what you're thinking about and I'll find the right info.",
                "Whenever you're ready! Ask me about road conditions, alerts, or anything safety-related.",
            ]

        # Interesting / curious
        elif any(w in t for w in ["interesting", "fascinating", "curious", "tell me more"]):
            replies = [
                "Happy to share more! What aspect of road safety are you curious about?",
                "There's a lot I can tell you — want alerts, incident history, or emergency contact info?",
                "I love a curious mind! Ask away — I've got live road data ready.",
            ]

        else:
            replies = [
                "I'm here! Feel free to ask about road alerts, incidents, or emergency help. 🚦",
                "Just say the word — I've got live road safety data ready for you.",
                "Need road info? I can help with alerts, incidents, routes, or emergency contacts!",
            ]

        return ComposedResponse(message=random.choice(replies), suggestions=self._suggestions("greet"))
