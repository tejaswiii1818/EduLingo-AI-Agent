"""
Validation script for the Explain module.
Run with:  python _test_explain.py
"""
import io
import json
import os
import sys

import app as a

client = a.app.test_client()
errors = []

def check(label, condition, detail=""):
    if condition:
        print(f"  OK  {label}")
    else:
        msg = f"FAIL  {label}" + (f": {detail}" if detail else "")
        print(f"  {msg}")
        errors.append(msg)

SAMPLE = (
    b"Machine learning is a subset of artificial intelligence. "
    b"It enables systems to learn from data without being explicitly programmed. "
    b"Supervised learning uses labelled data to train models. "
    b"Unsupervised learning finds hidden patterns in unlabelled data. "
    b"Neural networks are inspired by the human brain structure. "
    b"Deep learning uses multiple layers to extract features automatically. "
    b"Gradient descent is a key optimisation algorithm used in training. "
    b"Overfitting occurs when a model memorises training data instead of generalising. "
    b"Cross-validation helps evaluate model performance on unseen data."
)

def upload_sample():
    resp = client.post(
        "/api/upload",
        data={"file": (io.BytesIO(SAMPLE), "ml_intro.txt")},
        content_type="multipart/form-data",
    )
    return resp.get_json()

# ── Page routes ───────────────────────────────────────────────────────────
print("-- Page routes --")
for route in ["/", "/translate", "/summarize", "/explain",
              "/quiz", "/ask", "/chat", "/history"]:
    code = client.get(route).status_code
    check(f"GET {route:<12} -> {code}", code == 200)

# ── /api/explain guards ───────────────────────────────────────────────────
print("\n-- /api/explain guards --")

resp = client.post("/api/explain",
                   data=json.dumps({}),
                   content_type="application/json")
j = resp.get_json()
check("Missing session_id -> 400", resp.status_code == 400 and not j["success"])

resp = client.post("/api/explain",
                   data=json.dumps({"session_id": "no-such-uuid"}),
                   content_type="application/json")
j = resp.get_json()
check("Unknown session_id -> 404", resp.status_code == 404 and not j["success"])

# ── Happy path ────────────────────────────────────────────────────────────
print("\n-- /api/explain happy path (demo mode) --")

up = upload_sample()
check("Upload succeeded", up["success"], up)
sid = up.get("session_id", "")

resp = client.post("/api/explain",
                   data=json.dumps({"session_id": sid}),
                   content_type="application/json")
j = resp.get_json()
check("explain -> 200 success", resp.status_code == 200 and j.get("success"), j)
check("sections is a non-empty list",
      isinstance(j.get("sections"), list) and len(j["sections"]) >= 1)
check("each section has heading + paragraph",
      all("heading" in s and "paragraph" in s for s in j.get("sections", [])))
check("bullets present in at least one section",
      any(isinstance(s.get("bullets"), list) for s in j.get("sections", [])))
check("word_count > 0", isinstance(j.get("word_count"), int) and j["word_count"] > 0)
check("mode returned", j.get("mode") in ("watsonx", "demo"))
check("filename returned", j.get("filename") == "ml_intro.txt")
check("saved_file returned",
      isinstance(j.get("saved_file"), str) and j["saved_file"].endswith(".txt"))

# ── Output file on disk ───────────────────────────────────────────────────
print("\n-- Output file --")
fpath = os.path.join(a.app.config["TRANSLATED_FOLDER"], j["saved_file"])
check("File exists on disk", os.path.isfile(fpath))
with open(fpath, encoding="utf-8") as fh:
    content = fh.read()
check("File contains section heading", j["sections"][0]["heading"].upper() in content)

# ── History updated ───────────────────────────────────────────────────────
print("\n-- History --")
resp2 = client.get("/api/history")
h = resp2.get_json()
check("GET /api/history -> 200", resp2.status_code == 200 and h["success"])
types = [e["type"] for e in h["history"]]
check("history contains 'explanation' entry", "explanation" in types)
entry = next((e for e in h["history"] if e["type"] == "explanation"), None)
check("explanation entry has all required fields",
      entry and all(k in entry for k in
                    ["id", "type", "filename", "word_count", "mode", "timestamp", "preview"]))

# ── _demo_explain unit tests ──────────────────────────────────────────────
print("\n-- _demo_explain unit tests --")

short = "Only one sentence here"
secs = a._demo_explain(short)
check("demo_explain short text returns at least 1 section", len(secs) >= 1)
check("demo banner prepended to first section", "[DEMO MODE" in secs[0]["paragraph"])

long_text = ". ".join([f"Sentence {i} about topic {i % 3}" for i in range(20)]) + "."
secs2 = a._demo_explain(long_text)
check("demo_explain long text: multiple sections produced", len(secs2) > 1)
check("demo_explain: all sections have heading", all("heading" in s for s in secs2))

# ── _parse_explain_sections unit tests ───────────────────────────────────
print("\n-- _parse_explain_sections unit tests --")

raw_good = (
    "SECTION: Introduction\n"
    "PARAGRAPH: This is the intro.\n"
    "BULLETS:\n- Point one\n- Point two\n\n"
    "SECTION: Details\n"
    "PARAGRAPH: This is the detail section.\n"
    "BULLETS:\n- Detail A\n- Detail B\n"
)
parsed = a._parse_explain_sections(raw_good)
check("Parsed 2 sections from structured output", len(parsed) == 2)
check("First heading correct", parsed[0]["heading"] == "Introduction")
check("First paragraph correct", parsed[0]["paragraph"] == "This is the intro.")
check("First bullets correct", parsed[0]["bullets"] == ["Point one", "Point two"])

raw_fallback = "Some unstructured text without any section markers."
parsed2 = a._parse_explain_sections(raw_fallback)
check("Fallback: single section created", len(parsed2) == 1)
check("Fallback section contains raw text", raw_fallback.strip() in parsed2[0]["paragraph"])

# ─────────────────────────────────────────────────────────────────────────
print()
if errors:
    print(f"FAILED — {len(errors)} error(s):")
    for e in errors:
        print("  ", e)
    sys.exit(1)
else:
    print("All checks passed.")
