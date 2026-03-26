from __future__ import annotations

import json
import re
import difflib
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.pipeline import Pipeline


@dataclass
class TrainingResult:
    trained_at: str
    train_rows: int
    val_rows: int
    accuracy: float
    intents: list[str]


class NLUService:
    def __init__(self, backend_root: Path) -> None:
        self.backend_root = backend_root
        self.nlu_root = backend_root / "trafficbot_datasets" / "nlu_rasa" / "nlu"
        self.models_dir = backend_root / "models"
        self.models_dir.mkdir(parents=True, exist_ok=True)

        self.model_path = self.models_dir / "nlu_intent_pipeline.joblib"
        self.metrics_path = self.models_dir / "nlu_training_metrics.json"

        self.pipeline: Pipeline | None = None
        self.entity_vocab = self._build_entity_vocab()

    def _read_csv(self, file_name: str) -> pd.DataFrame:
        path = self.nlu_root / file_name
        if not path.exists():
            return pd.DataFrame(columns=["intent", "text", "entities"])
        return pd.read_csv(path)

    def _build_entity_vocab(self) -> dict[str, dict[str, str]]:
        vocabulary: dict[str, dict[str, str]] = {
            "city": {},
            "service": {},
            "incident_type": {},
            "issue": {},
            "severity": {},
        }

        synonyms_path = self.nlu_root / "entity_synonyms.csv"
        if synonyms_path.exists():
            synonyms_df = pd.read_csv(synonyms_path)
            for _, row in synonyms_df.iterrows():
                entity = str(row.get("entity", "")).strip().lower()
                canonical = str(row.get("value", "")).strip()
                synonym = str(row.get("synonym", "")).strip()
                if entity in vocabulary and canonical and synonym:
                    vocabulary[entity][synonym.lower()] = canonical
                    vocabulary[entity][canonical.lower()] = canonical

        for entity_name, lookup_file in {
            "city": "lookup_city.txt",
            "service": "lookup_service.txt",
            "incident_type": "lookup_incident_type.txt",
            "issue": "lookup_issue.txt",
            "severity": "lookup_severity.txt",
        }.items():
            lookup_path = self.nlu_root / lookup_file
            if not lookup_path.exists():
                continue
            for value in lookup_path.read_text(encoding="utf-8").splitlines():
                clean = value.strip()
                if clean:
                    vocabulary[entity_name][clean.lower()] = clean

        return vocabulary

    def _merge_train_sets(self) -> tuple[pd.DataFrame, pd.DataFrame]:
        train = self._read_csv("nlu_utterances_train.csv")
        urdu = self._read_csv("nlu_utterances_urdu_aug.csv")
        ood = self._read_csv("nlu_utterances_ood_negatives.csv")
        val = self._read_csv("nlu_utterances_val.csv")

        merged_train = pd.concat([train, urdu, ood], ignore_index=True)
        merged_train = merged_train.dropna(subset=["text", "intent"]).copy()
        merged_train["text"] = merged_train["text"].astype(str)
        merged_train["intent"] = merged_train["intent"].astype(str)

        val = val.dropna(subset=["text", "intent"]).copy()
        if not val.empty:
            val["text"] = val["text"].astype(str)
            val["intent"] = val["intent"].astype(str)

        return merged_train, val

    def train(self) -> TrainingResult:
        train_df, val_df = self._merge_train_sets()
        if train_df.empty:
            raise RuntimeError("NLU training data not found.")

        self.pipeline = Pipeline(
            steps=[
                ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=2, max_features=60000)),
                ("clf", LogisticRegression(max_iter=2200, class_weight="balanced")),
            ]
        )

        self.pipeline.fit(train_df["text"], train_df["intent"])
        joblib.dump(self.pipeline, self.model_path)

        accuracy = 0.0
        report: dict[str, Any] = {}
        if not val_df.empty:
            predictions = self.pipeline.predict(val_df["text"])
            accuracy = float(accuracy_score(val_df["intent"], predictions))
            report = classification_report(val_df["intent"], predictions, output_dict=True, zero_division=0)

        trained_at = datetime.now(UTC).isoformat()
        metrics_payload = {
            "trained_at": trained_at,
            "train_rows": int(len(train_df)),
            "val_rows": int(len(val_df)),
            "accuracy": accuracy,
            "intents": sorted(train_df["intent"].unique().tolist()),
            "classification_report": report,
        }
        self.metrics_path.write_text(json.dumps(metrics_payload, indent=2), encoding="utf-8")

        return TrainingResult(
            trained_at=trained_at,
            train_rows=int(len(train_df)),
            val_rows=int(len(val_df)),
            accuracy=accuracy,
            intents=metrics_payload["intents"],
        )

    def get_status(self) -> dict[str, Any]:
        model_exists = self.model_path.exists()
        metrics_exists = self.metrics_path.exists()

        metrics: dict[str, Any] = {}
        if metrics_exists:
            try:
                raw = json.loads(self.metrics_path.read_text(encoding="utf-8"))
                metrics = {
                    "trained_at": raw.get("trained_at"),
                    "train_rows": raw.get("train_rows"),
                    "val_rows": raw.get("val_rows"),
                    "accuracy": raw.get("accuracy"),
                    "intents": raw.get("intents", []),
                }
            except (json.JSONDecodeError, OSError):
                metrics = {}

        return {
            "is_trained": model_exists,
            "model_loaded": self.pipeline is not None,
            "model_exists": model_exists,
            "metrics_exists": metrics_exists,
            "metrics": metrics,
        }

    def load_or_train(self) -> None:
        if self.pipeline is not None:
            return
        if self.model_path.exists():
            self.pipeline = joblib.load(self.model_path)
            return
        self.train()

    def _extract_entities(self, text: str) -> dict[str, str]:
        text_lower = text.lower()
        extracted: dict[str, str] = {}
        words = set(re.findall(r'\b\w+\b', text_lower))

        for entity, term_map in self.entity_vocab.items():
            found_exact = False
            for term, canonical in sorted(term_map.items(), key=lambda item: len(item[0]), reverse=True):
                pattern = rf"(?<!\w){re.escape(term)}(?!\w)"
                if re.search(pattern, text_lower):
                    extracted[entity] = canonical
                    found_exact = True
                    break
            
            if not found_exact:
                terms = list(term_map.keys())
                for word in words:
                    if len(word) > 4:
                        matches = difflib.get_close_matches(word, terms, n=1, cutoff=0.8)
                        if matches:
                            extracted[entity] = term_map[matches[0]]
                            break

        return extracted

    def predict(self, text: str) -> dict[str, Any]:
        self.load_or_train()
        assert self.pipeline is not None

        cleaned_text = text.strip()
        if not cleaned_text:
            return {"intent": "out_of_domain", "confidence": 0.0, "entities": {}}

        predicted_intent = str(self.pipeline.predict([cleaned_text])[0])

        confidence = 0.0
        classifier = self.pipeline.named_steps.get("clf")
        if hasattr(classifier, "predict_proba"):
            probabilities = classifier.predict_proba(self.pipeline.named_steps["tfidf"].transform([cleaned_text]))[0]
            confidence = float(probabilities.max())

        entities = self._extract_entities(cleaned_text)
        if confidence < 0.28:
            predicted_intent = "out_of_domain"

        return {
            "intent": predicted_intent,
            "confidence": round(confidence, 4),
            "entities": entities,
        }

    def get_status(self) -> dict[str, Any]:
        model_exists = self.model_path.exists()
        metrics_exists = self.metrics_path.exists()
        metrics: dict[str, Any] = {}

        if metrics_exists:
            try:
                metrics = json.loads(self.metrics_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                metrics = {}

        return {
            "model_exists": model_exists,
            "metrics_exists": metrics_exists,
            "model_path": str(self.model_path),
            "metrics_path": str(self.metrics_path),
            "trained_at": metrics.get("trained_at"),
            "accuracy": metrics.get("accuracy"),
            "intents": metrics.get("intents", []),
        }
