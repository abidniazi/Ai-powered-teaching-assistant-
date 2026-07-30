import json
import pickle
import os
from sklearn.feature_extraction.text import TfidfVectorizer

# ── Paths ─────────────────────────────────────────────
QA_PATH    = "../data/qa_dataset.jsonl"
MODEL_PATH = "../model/tfidf_model.pkl"
DATA_PATH  = "../model/qa_data.pkl"

print("Loading Q&A dataset...")

qa_data = []

# ✅ FIX: JSONL reading
with open(QA_PATH, "r", encoding="utf-8") as f:
    for i, line in enumerate(f, 1):
        line = line.strip()

        # skip empty lines
        if not line:
            continue

        try:
            qa_data.append(json.loads(line))
        except json.JSONDecodeError:
            print(f"⚠️ Skipping invalid line {i}")
            continue

print(f"Total Q&A pairs: {len(qa_data)}")

# ── Combine question + keywords for better matching ───
documents = []
for item in qa_data:
    keywords = " ".join(item.get("keywords", []))
    topic    = item.get("topic", "")
    question = item.get("question", "")

    combined = f"{question} {topic} {keywords} {topic} {topic}"
    documents.append(combined)

# ── Train TF-IDF Vectorizer ───────────────────────────
print("Training TF-IDF model...")

vectorizer = TfidfVectorizer(
    ngram_range=(1, 3),
    max_features=50000,
    stop_words="english",
    min_df=1,
    sublinear_tf=True,
)

tfidf_matrix = vectorizer.fit_transform(documents)

print(f"TF-IDF matrix shape: {tfidf_matrix.shape}")
print(f"Vocabulary size: {len(vectorizer.vocabulary_)}")

# ── Save Model ────────────────────────────────────────
os.makedirs("../model", exist_ok=True)

with open(MODEL_PATH, "wb") as f:
    pickle.dump({
        "vectorizer": vectorizer,
        "tfidf_matrix": tfidf_matrix,
    }, f)

with open(DATA_PATH, "wb") as f:
    pickle.dump(qa_data, f)

print(f"Model saved to: {MODEL_PATH}")
print(f"Data saved to:  {DATA_PATH}")
print("Training complete!")