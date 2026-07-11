"""
Regression test: session persistence across Flask restart simulation.
Run with:  python _test_persistence.py
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

# ── 1. Upload a document ──────────────────────────────────────────────────
print("-- Upload --")
content = (
    b"Python is a high-level programming language. "
    b"It was created by Guido van Rossum in 1991. "
    b"Python emphasizes code readability and simplicity. "
    b"It supports multiple paradigms including procedural and object-oriented. "
    b"Python has a vast ecosystem of libraries and frameworks. "
    b"Flask and Django are widely used Python web frameworks."
)
resp = client.post(
    "/api/upload",
    data={"file": (io.BytesIO(content), "persist_test.txt")},
    content_type="multipart/form-data",
)
up = resp.get_json()
check("Upload succeeded", up["success"], up)
sid = up.get("session_id", "")
check("session_id returned", bool(sid))

# ── 2. Confirm JSON sidecar written ──────────────────────────────────────
print("\n-- Disk persistence --")
store_path = os.path.join(a.app.config["UPLOAD_FOLDER"], ".document_store.json")
check(".document_store.json created", os.path.isfile(store_path))

with open(store_path, encoding="utf-8") as fh:
    stored = json.load(fh)
check("session_id in sidecar JSON", sid in stored)

# ── 3. Simulate Flask restart ─────────────────────────────────────────────
print("\n-- Flask restart simulation --")
a.document_store.clear()
check("In-memory store cleared", sid not in a.document_store)

a._load_document_store()
check("session_id restored after _load_document_store()", sid in a.document_store)
restored = a.document_store.get(sid, {})
check("Restored entry has text", bool(restored.get("text", "").strip()))
check("Restored filename matches", restored.get("filename") == "persist_test.txt")

# ── 4. Summarize with restored session ───────────────────────────────────
print("\n-- Summarize after restart --")
resp2 = client.post(
    "/api/summarize",
    data=json.dumps({"session_id": sid}),
    content_type="application/json",
)
sm = resp2.get_json()
check("Summarize -> 200 success", resp2.status_code == 200 and sm.get("success"), sm)
check("summary non-empty", isinstance(sm.get("summary"), str) and len(sm.get("summary", "")) > 0)
check("key_points returned", isinstance(sm.get("key_points"), list))
check("word_count > 0", sm.get("word_count", 0) > 0)

# ── 5. Translate with restored session ───────────────────────────────────
print("\n-- Translate after restart --")
resp3 = client.post(
    "/api/translate",
    data=json.dumps({"session_id": sid, "target_language": "Hindi"}),
    content_type="application/json",
)
tr = resp3.get_json()
check("Translate -> 200 success", resp3.status_code == 200 and tr.get("success"), tr)
check("target_language returned", tr.get("target_language") == "Hindi")

# ── 6. All page routes still return 200 ──────────────────────────────────
print("\n-- Page routes --")
for route in ["/", "/translate", "/summarize", "/explain",
              "/quiz", "/ask", "/chat", "/history"]:
    code = client.get(route).status_code
    check(f"GET {route:<12} -> {code}", code == 200)

# ── 7. Second restart: verify sidecar grows correctly ────────────────────
print("\n-- Second upload + reload --")
resp4 = client.post(
    "/api/upload",
    data={"file": (io.BytesIO(b"Another document with different content here."), "doc2.txt")},
    content_type="multipart/form-data",
)
up2 = resp4.get_json()
check("Second upload succeeded", up2["success"])
sid2 = up2.get("session_id", "")

a.document_store.clear()
a._load_document_store()
check("Both sessions restored after second reload",
      sid in a.document_store and sid2 in a.document_store)

# ─────────────────────────────────────────────────────────────────────────────
print()
if errors:
    print(f"FAILED — {len(errors)} error(s):")
    for e in errors:
        print("  ", e)
    sys.exit(1)
else:
    print("All checks passed.")
