"""
Full validation script for EduLingo — Upload + Translate modules.
Run with:  python _test_translate.py
"""
import io
import sys
import json

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

# ── Helper: upload a TXT file, return parsed JSON ─────────────────────────
def upload_txt(content=b"Hello world. This is a test document for EduLingo translation testing."):
    resp = client.post(
        "/api/upload",
        data={"file": (io.BytesIO(content), "test.txt")},
        content_type="multipart/form-data",
    )
    return resp.get_json()

# ═════════════════════════════════════════════════════════════════════════════
print("-- Page routes --")
for route in ["/", "/translate", "/summarize", "/explain",
              "/quiz", "/ask", "/chat", "/history"]:
    code = client.get(route).status_code
    check(f"GET {route:<12} -> {code}", code == 200)

# ═════════════════════════════════════════════════════════════════════════════
print("\n-- /api/translate guards --")

# No body
resp = client.post("/api/translate", data="{}", content_type="application/json")
j = resp.get_json()
check("Missing session_id -> 400", resp.status_code == 400 and not j["success"])

# Bad language
up = upload_txt()
check("Upload for guard test succeeded", up["success"])
resp = client.post(
    "/api/translate",
    data=json.dumps({"session_id": up["session_id"], "target_language": "Klingon"}),
    content_type="application/json",
)
j = resp.get_json()
check("Bad language -> 400", resp.status_code == 400 and not j["success"])

# Unknown session
resp = client.post(
    "/api/translate",
    data=json.dumps({"session_id": "nonexistent-uuid", "target_language": "Hindi"}),
    content_type="application/json",
)
j = resp.get_json()
check("Unknown session_id -> 404", resp.status_code == 404 and not j["success"])

# ═════════════════════════════════════════════════════════════════════════════
print("\n-- Translation for each language (demo mode) --")

for lang in ["English", "Hindi", "Telugu", "Tamil",
             "Kannada", "Malayalam", "Marathi", "Bengali"]:
    up = upload_txt()
    assert up["success"], f"Upload failed before {lang} test"
    resp = client.post(
        "/api/translate",
        data=json.dumps({"session_id": up["session_id"], "target_language": lang}),
        content_type="application/json",
    )
    j = resp.get_json()
    check(
        f"Translate -> {lang:<12}  words={j.get('word_count','?')}  mode={j.get('mode','?')}",
        j.get("success") and j.get("target_language") == lang and len(j.get("translated_text","")) > 0,
        j if not j.get("success") else "",
    )

# ═════════════════════════════════════════════════════════════════════════════
print("\n-- History API --")

resp = client.get("/api/history")
j = resp.get_json()
check("GET /api/history -> 200", resp.status_code == 200 and j["success"])
count = len(j.get("history", []))
check(f"/api/history has {count} entries (expected >= 8)", count >= 8)
if count:
    first = j["history"][0]
    check("History entry has required fields",
          all(k in first for k in ["id","type","filename","target_language","word_count","mode","timestamp","preview"]))

# ═════════════════════════════════════════════════════════════════════════════
print("\n-- Translated files saved to disk --")

import os
tf = a.app.config["TRANSLATED_FOLDER"]
saved = os.listdir(tf)
check(f"translated/ folder has >= 8 .txt files (has {len(saved)})", len(saved) >= 8)

# ═════════════════════════════════════════════════════════════════════════════
print()
if errors:
    print(f"FAILED — {len(errors)} error(s):")
    for e in errors:
        print("  ", e)
    sys.exit(1)
else:
    print("All checks passed.")
