
from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
import pandas as pd
from pathlib import Path

DATA_DIR = Path("/mnt/data")

INCIDENTS = DATA_DIR / "incidents_master_20k.csv"
CONTACTS = DATA_DIR / "emergency_contacts.csv"
QUICKFIX = DATA_DIR / "quick_fix_guides_expanded.csv"
ROUTING = DATA_DIR / "contact_routing_rules.csv"

class ActionSaveIncident(Action):
    def name(self) -> Text:
        return "action_save_incident"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        city = tracker.get_slot("city")
        landmark = tracker.get_slot("landmark")
        incident_type = tracker.get_slot("incident_type")
        severity = tracker.get_slot("severity") or "Medium"
        dispatcher.utter_message(text=f"Saved incident: {incident_type} @ {landmark}, {city} [{severity}]")
        return []

class ActionLookupContact(Action):
    def name(self) -> Text:
        return "action_lookup_contact"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        service = tracker.get_slot("service") or "Rescue 1122"
        df = pd.read_csv(CONTACTS)
        match = df[df["service"].str.contains(service, case=False, na=False)].head(1)
        if match.empty:
            dispatcher.utter_message(text="Couldn’t find a direct number. Try Rescue 1122 (1122) or Police (15).")
            return []
        row = match.iloc[0]
        dispatcher.utter_message(text=f"{row['service']}: {row['phone_number']} — {row['when_to_contact']}")
        return []
