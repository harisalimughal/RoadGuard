from __future__ import annotations

import hashlib
import re
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import pandas as pd

CITY_CENTERS: dict[str, tuple[float, float]] = {
    "islamabad": (33.6844, 73.0479),
    "rawalpindi": (33.5651, 73.0169),
    "lahore": (31.5497, 74.3436),
    "karachi": (24.8607, 67.0011),
    "peshawar": (34.0151, 71.5249),
    "quetta": (30.1798, 66.9750),
    "multan": (30.1575, 71.5249),
    "faisalabad": (31.4504, 73.1350),
    "gujranwala": (32.1877, 74.1945),
    "hyderabad": (25.3960, 68.3578),
    "sialkot": (32.4945, 74.5229),
    "sukkur": (27.7139, 68.8481),
}

# Sub-sector centers for large cities — incidents get pinned to a sector first,
# then a small local jitter is applied so they spread naturally across the city.
CITY_SECTORS: dict[str, list[tuple[float, float]]] = {
    "islamabad": [
        (33.7294, 72.9826),  # F-6
        (33.7192, 73.0478),  # F-7 / Blue Area
        (33.7104, 73.0498),  # Abpara
        (33.7079, 73.0700),  # F-8
        (33.6937, 73.0580),  # G-9
        (33.6808, 73.0748),  # G-10
        (33.6705, 73.1038),  # I-10
        (33.6601, 73.0969),  # I-11
        (33.6493, 73.1148),  # I-12
        (33.6946, 73.0666),  # International Islamic University Islamabad
        (33.6610, 73.0510),  # H-8
        (33.6730, 73.0290),  # H-9
        (33.6850, 73.0100),  # G-7 / Zero Point
        (33.7000, 73.0600),  # G-8
    ],
    "lahore": [
        (31.5497, 74.3436),  # City centre
        (31.5204, 74.3587),  # Gulberg
        (31.5651, 74.3153),  # Anarkali
        (31.4697, 74.4069),  # DHA Phase 5
        (31.5293, 74.4069),  # Model Town
        (31.4893, 74.3586),  # Johar Town
    ],
    "karachi": [
        (24.8607, 67.0011),  # City centre
        (24.8200, 67.0300),  # Clifton
        (24.9000, 67.0800),  # North Nazimabad
        (24.9300, 67.1200),  # Gulshan-e-Iqbal
        (24.8600, 66.9900),  # PECHS
    ],
}


class RoadGuardDataStore:
    def __init__(self, backend_root: Path) -> None:
        self.backend_root = backend_root
        self.dataset_root = backend_root / "trafficbot_datasets" / "datasets"
        self.nlu_root = backend_root / "trafficbot_datasets" / "nlu_rasa" / "nlu"

        self.incidents = self._read_csv("incidents_master_20k.csv")
        self.accidents = self._read_csv("accidents_5000.csv")
        self.road_conditions = self._read_csv("road_condition_5000.csv")
        self.driver_alerts = self._read_csv("driver_alerts_5000.csv")
        self.weather_alerts = self._read_csv("weather_emergencies_5000.csv")

        self.quick_fix_guides = self._read_csv("quick_fix_guides_expanded.csv")
        self.incident_to_quick_fix = self._read_csv("incident_to_quick_fix.csv")
        self.contact_routing_rules = self._read_csv("contact_routing_rules.csv")
        self.emergency_contacts = self._read_csv("emergency_contacts.csv")

        self.city_contacts = pd.concat(
            [
                self._read_csv("lahore_contacts.csv"),
                self._read_csv("karachi_contacts.csv"),
                self._read_csv("islamabad_contacts.csv"),
            ],
            ignore_index=True,
        )

        self.city_lookup = self._read_lookup("lookup_city.txt")

        self._normalize_incident_dates()

    def _read_csv(self, file_name: str) -> pd.DataFrame:
        path = self.dataset_root / file_name
        if not path.exists():
            return pd.DataFrame()
        return pd.read_csv(path)

    def _read_lookup(self, file_name: str) -> list[str]:
        path = self.nlu_root / file_name
        if not path.exists():
            return []
        return [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]

    def _normalize_incident_dates(self) -> None:
        if self.incidents.empty or "date" not in self.incidents.columns:
            return
        self.incidents["date_parsed"] = pd.to_datetime(self.incidents["date"], errors="coerce", utc=True)

    @staticmethod
    def _normalize_key(value: str | None) -> str:
        if not value:
            return ""
        normalized = re.sub(r"[^a-z0-9]+", "_", value.strip().lower())
        return normalized.strip("_")

    def infer_city(self, location: str | None) -> str | None:
        if not location:
            return None
        location_lower = location.lower()
        for city in self.city_lookup:
            if city.lower() in location_lower:
                return city
        for city in CITY_CENTERS:
            if city in location_lower:
                return city.title()
        return None

    def _coordinates_for_row(self, row: dict[str, Any]) -> tuple[float, float]:
        city = self.infer_city(str(row.get("location", "")))
        city_key = city.lower() if city else "islamabad"

        seed_str = str(row.get("id") or row.get("title") or row.get("location") or "0")
        digest = hashlib.md5(seed_str.encode("utf-8")).hexdigest()

        sectors = CITY_SECTORS.get(city_key)
        if sectors:
            # Use bytes 8-12 of the hash to deterministically pick a sector
            sector_idx = int(digest[8:12], 16) % len(sectors)
            base_lat, base_lng = sectors[sector_idx]
            # Small local jitter within the sector (~800 m)
            lat_jitter = (int(digest[:4], 16) / 65535 - 0.5) * 0.016
            lng_jitter = (int(digest[4:8], 16) / 65535 - 0.5) * 0.016
        else:
            base_lat, base_lng = CITY_CENTERS.get(city_key, CITY_CENTERS["islamabad"])
            lat_jitter = (int(digest[:4], 16) / 65535 - 0.5) * 0.08
            lng_jitter = (int(digest[4:8], 16) / 65535 - 0.5) * 0.08

        return base_lat + lat_jitter, base_lng + lng_jitter

    def get_incidents(
        self,
        city: str | None,
        incident_type: str | None,
        severity: str | None,
        days: int,
        limit: int,
    ) -> list[dict[str, Any]]:
        if self.incidents.empty:
            return []

        data = self.incidents.copy()

        if city:
            city_lower = city.lower()
            data = data[data["location"].fillna("").str.lower().str.contains(city_lower)]

        if incident_type:
            incident_type_lower = incident_type.lower()
            data = data[data["type"].fillna("").str.lower().str.contains(incident_type_lower)]

        if severity:
            severity_lower = severity.lower()
            data = data[data["severity"].fillna("").str.lower() == severity_lower]

        if "date_parsed" in data.columns:
            cutoff = datetime.now(UTC) - timedelta(days=max(1, days))
            data = data[data["date_parsed"].fillna(pd.Timestamp(0, tz="UTC")) >= cutoff]
            data = data.sort_values(by="date_parsed", ascending=False)

        rows: list[dict[str, Any]] = []
        for _, row in data.head(max(1, min(limit, 200))).iterrows():
            row_dict = row.to_dict()
            lat, lng = self._coordinates_for_row(row_dict)
            rows.append(
                {
                    "id": row_dict.get("id"),
                    "type": row_dict.get("type"),
                    "title": row_dict.get("title"),
                    "description": row_dict.get("description"),
                    "location": row_dict.get("location"),
                    "severity": row_dict.get("severity"),
                    "date": row_dict.get("date"),
                    "source": row_dict.get("source"),
                    "lat": round(lat, 6),
                    "lng": round(lng, 6),
                }
            )
        return rows

    def get_safety_alerts(self, city: str | None, limit: int) -> list[dict[str, Any]]:
        frames: list[tuple[str, pd.DataFrame]] = [
            ("driver", self.driver_alerts),
            ("weather", self.weather_alerts),
            ("road", self.road_conditions),
        ]
        merged_rows: list[dict[str, Any]] = []

        for alert_domain, frame in frames:
            if frame.empty:
                continue
            sample = frame.copy()
            if city:
                sample = sample[sample["location"].fillna("").str.lower().str.contains(city.lower())]
            for _, row in sample.head(limit).iterrows():
                row_dict = row.to_dict()
                merged_rows.append(
                    {
                        "domain": alert_domain,
                        "type": row_dict.get("type"),
                        "title": row_dict.get("title"),
                        "description": row_dict.get("description"),
                        "location": row_dict.get("location"),
                        "severity": row_dict.get("severity"),
                        "date": row_dict.get("date"),
                    }
                )

        merged_rows.sort(key=lambda r: str(r.get("date", "")), reverse=True)
        return merged_rows[: max(1, min(limit, 100))]

    def resolve_quick_fix(self, incident_key: str) -> dict[str, Any] | None:
        if self.incident_to_quick_fix.empty or self.quick_fix_guides.empty:
            return None

        normalized_key = self._normalize_key(incident_key)
        mapping = self.incident_to_quick_fix.copy()
        mapping["incident_key_normalized"] = mapping["incident_key"].fillna("").map(self._normalize_key)

        mapped_rows = mapping[mapping["incident_key_normalized"] == normalized_key]
        if mapped_rows.empty:
            return None

        quick_fix_condition = str(mapped_rows.iloc[0].get("quick_fix_condition", ""))
        guide_rows = self.quick_fix_guides[
            self.quick_fix_guides["condition"].fillna("").str.lower() == quick_fix_condition.lower()
        ]
        if guide_rows.empty:
            return None

        best = guide_rows.iloc[0].to_dict()
        return {
            "incident_key": incident_key,
            "condition": best.get("condition"),
            "quick_fix_title": best.get("quick_fix_title"),
            "instructions": best.get("instructions"),
        }

    def resolve_contact(self, incident_key: str, city: str | None) -> dict[str, Any] | None:
        if self.contact_routing_rules.empty:
            return None

        normalized_key = self._normalize_key(incident_key)
        routes = self.contact_routing_rules.copy()
        routes["incident_key_normalized"] = routes["incident_key"].fillna("").map(self._normalize_key)
        selected = routes[routes["incident_key_normalized"] == normalized_key]

        if selected.empty:
            return None

        route_row = selected.iloc[0].to_dict()
        service = str(route_row.get("primary_service", "")).strip()

        contacts = self.city_contacts if city and not self.city_contacts.empty else self.emergency_contacts
        if city and not self.city_contacts.empty:
            contacts = contacts[contacts["city"].fillna("").str.lower() == city.lower()]

        if contacts.empty:
            contacts = self.emergency_contacts

        match = contacts[contacts["service"].fillna("").str.lower().str.contains(service.lower(), regex=False)]
        if match.empty:
            match = contacts[contacts["service"].fillna("").str.lower() == service.lower()]

        if match.empty:
            return {
                "incident_key": incident_key,
                "service": service,
                "phone_number": None,
                "when_to_contact": route_row.get("notes"),
                "notes": route_row.get("notes"),
                "city": city,
            }

        row = match.iloc[0].to_dict()
        return {
            "incident_key": incident_key,
            "service": row.get("service"),
            "phone_number": row.get("phone_number"),
            "when_to_contact": row.get("when_to_contact"),
            "notes": row.get("notes") or route_row.get("notes"),
            "city": row.get("city") or city,
        }
