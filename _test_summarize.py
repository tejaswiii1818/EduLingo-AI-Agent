"""
Full validation script for EduLingo — Upload + Translate + Summarize modules.
Run with:  python _test_summarize.py
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

def upload_txt(content=b"Python is a high-level programming language. It was created by Guido van Rossum. "
                       b"Python emphasizes code readability and simplicity. It supports multiple programming paradigms. "
                       b"Python has a large standard library. It is widely used in data science and machine learning. "
                       b"Django and Flask are popular Python web frameworks."):
    resp = client.post(
        "/api/upload",
        data={"file": (io.BytesIO(content), "sample.txt")},
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
print("\n-- /api/summarize guards --")

resp = client.post("/api/summarize",
                   data=json.dumps({}),
                   content_type="application/json")
j = resp.get_json()
check("Missing session_id -> 400", resp.status_code == 400 and not j["success"])

resp = client.post("/api/summarize",
                   data=json.dumps({"session_id": "no-such-uuid"}),
                   content_type="application/json")
j = resp.get_json()
check("Unknown session_id -> 404", resp.status_code == 404 and not j["success"])

# ═════════════════════════════════════════════════════════════════════════════
print("\n-- /api/summarize happy path (demo mode) --")

up = upload_txt()
check("Upload succeeded", up["success"])

resp = client.post("/api/summarize",
                   data=json.dumps({"session_id": up["session_id"]}),
                   content_type="application/json")
j = resp.get_json()
check("summarize -> 200 success",
      resp.status_code == 200 and j.get("success"),
      j if not j.get("success") else "")

check("summary is non-empty string",
      isinstance(j.get("summary"), str) and len(j["summary"]) > 0)

check("key_points is a non-empty list",
      isinstance(j.get("key_points"), list) and len(j["key_points"]) > 0)

check("word_count > 0", isinstance(j.get("word_count"), int) and j["word_count"] > 0)

check("mode returned", j.get("mode") in ("watsonx", "demo"))

check("filename returned", j.get("filename") == "sample.txt")

check("saved_file returned", isinstance(j.get("saved_file"), str) and j["saved_file"].endswith(".txt"))

# ═════════════════════════════════════════════════════════════════════════════
print("\n-- Summary file saved to disk --")
import os
tf = a.app.config["TRANSLATED_FOLDER"]
saved_path = os.path.join(tf, j["saved_file"])
check(f"File exists: {j['saved_file']}", os.path.isfile(saved_path))

with open(saved_path, encoding="utf-8") as fh:
    contents = fh.read()
check("File contains SUMMARY section", "SUMMARY" in contents)
check("File contains KEY POINTS section", "KEY POINTS" in contents)

# ═════════════════════════════════════════════════════════════════════════════
print("\n-- History updated --")

resp = client.get("/api/history")
j2 = resp.get_json()
check("GET /api/history -> 200", resp.status_code == 200 and j2["success"])

types = [e["type"] for e in j2["history"]]
check("history contains a 'summary' entry", "summary" in types)

summary_entry = next((e for e in j2["history"] if e["type"] == "summary"), None)
check("summary entry has required fields",
      summary_entry is not None and
      all(k in summary_entry for k in
          ["id","type","filename","word_count","mode","timestamp","preview"]))

# ═════════════════════════════════════════════════════════════════════════════
print("\n-- _demo_summarize unit-level --")
text_short = "A single sentence."
s, kps = a._demo_summarize(text_short)
check("demo_summarize returns non-empty summary", len(s) > 0)
check("demo_summarize returns at least 1 key point", len(kps) >= 1)

text_long = ". ".join([f"Sentence number {i} with some content" for i in range(20)]) + "."
s2, kps2 = a._demo_summarize(text_long)
check("demo_summarize long text: summary non-empty", len(s2) > 0)
check("demo_summarize long text: key_points <= 5", len(kps2) <= 5)

# ═════════════════════════════════════════════════════════════════════════════
print()
if errors:
    print(f"FAILED — {len(errors)} error(s):")
    for e in errors:
        print("  ", e)
    sys.exit(1)
else:
    print("All checks passed.")
