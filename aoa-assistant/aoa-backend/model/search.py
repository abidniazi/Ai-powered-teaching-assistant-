import json
import pickle
import sys
import os
import re
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "tfidf_model.pkl")
DATA_PATH  = os.path.join(BASE_DIR, "qa_data.pkl")

_model   = None
_qa_data = None

def load():
    global _model, _qa_data
    if _model is None:
        with open(MODEL_PATH, "rb") as f:
            _model = pickle.load(f)
        with open(DATA_PATH, "rb") as f:
            _qa_data = pickle.load(f)
    return _model, _qa_data

# ── Detect what user actually wants ──────────────────
def detect_intent(query):
    q = query.lower()
    if re.search(r'pseudocode|code|write|implement|algorithm for', q):
        return 'procedural'
    if re.search(r't\(n\)|recurrence|solve|master theorem', q):
        return 'mathematical'
    if re.search(r'complexity|big.?o|time|space|how (fast|slow)', q):
        return 'complexity'
    if re.search(r'vs|versus|compare|differ|better|worse|between', q):
        return 'comparative'
    if re.search(r'example|trace|show|demonstrate|illustrate', q):
        return 'example'
    if re.search(r'why|prove|proof|correctness|invariant', q):
        return 'proof'
    if re.search(r'how (does|do|to|can)|steps|process|work|explain', q):
        return 'procedural'
    if re.search(r'what is|what are|define|meaning|overview', q):
        return 'conceptual'
    return 'conceptual'

# ── Extract topic from query ──────────────────────────
def extract_topic_hint(query):
    q = query.lower()
    topics = [
        "insertion sort", "merge sort", "quick sort", "heap sort",
        "bubble sort", "selection sort", "counting sort", "radix sort",
        "bucket sort", "binary search", "dijkstra", "bellman ford",
        "bellman-ford", "bfs", "breadth first", "dfs", "depth first",
        "dynamic programming", "greedy", "huffman", "activity selection",
        "master theorem", "big o", "big-o", "asymptotic", "recurrence",
        "red black", "red-black", "binary search tree", "bst",
        "minimum spanning tree", "kruskal", "prim", "topological sort",
        "divide and conquer", "strassen", "heapsort", "quicksort",
        "mergesort", "lcs", "longest common", "rod cutting",
        "matrix chain", "order statistics", "median", "randomized",
        "substitution method", "recursion tree", "indicator random",
        "hiring problem", "loop invariant",
    ]
    for t in topics:
        if t in q:
            return t
    return None

# ── Score boost based on intent matching ─────────────
def intent_score_boost(item, user_intent):
    item_type = item.get("type", "conceptual").lower()
    boost_map = {
        ("procedural",   "procedural"):   0.3,
        ("mathematical", "mathematical"): 0.3,
        ("complexity",   "mathematical"): 0.2,
        ("complexity",   "complexity"):   0.3,
        ("comparative",  "comparative"):  0.3,
        ("example",      "example"):      0.3,
        ("proof",        "proof"):        0.3,
        ("conceptual",   "conceptual"):   0.1,
    }
    return boost_map.get((user_intent, item_type), 0.0)

def search(query, top_k=5, min_score=0.03):
    model, qa_data = load()
    vectorizer     = model["vectorizer"]
    tfidf_matrix   = model["tfidf_matrix"]

    user_intent  = detect_intent(query)
    topic_hint   = extract_topic_hint(query)

    # TF-IDF similarity
    query_vec    = vectorizer.transform([query])
    similarities = cosine_similarity(query_vec, tfidf_matrix).flatten()

    # Apply intent boost + topic boost
    boosted = []
    for idx, base_score in enumerate(similarities):
        item  = qa_data[idx]
        score = float(base_score)

        # Intent matching boost
        score += intent_score_boost(item, user_intent)

        # Topic hint boost
        if topic_hint:
            item_q = item.get("question", "").lower()
            item_t = item.get("topic", "").lower()
            if topic_hint in item_q or topic_hint in item_t:
                score += 0.25

        boosted.append((idx, score))

    # Sort by boosted score
    boosted.sort(key=lambda x: -x[1])

    results = []
    seen_answers = set()

    for idx, score in boosted[:top_k * 3]:
        if score < min_score:
            continue
        item   = qa_data[idx]
        answer = item.get("answer", "")

        # Skip duplicate answers
        answer_key = answer[:50]
        if answer_key in seen_answers:
            continue
        seen_answers.add(answer_key)

        results.append({
            "topic":    item.get("topic", ""),
            "question": item.get("question", ""),
            "answer":   answer,
            "type":     item.get("type", "conceptual"),
            "score":    round(score, 4),
            "intent":   user_intent,
        })

        if len(results) >= top_k:
            break

    return results

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No query provided"}))
        sys.exit(1)

    query = " ".join(sys.argv[1:])
    results = search(query)
    print(json.dumps(results, indent=2))