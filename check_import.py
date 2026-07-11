import sys
print(f"Python executable: {sys.executable}")
print(f"Python version: {sys.version}")

try:
    from ibm_watsonx_ai import Credentials
    from ibm_watsonx_ai.foundation_models import ModelInference
    print("SUCCESS: ibm-watsonx-ai imported successfully")
except ImportError as e:
    print(f"FAILED: ImportError - {e}")
except Exception as e:
    print(f"FAILED: {type(e).__name__} - {e}")

print("\nInstalled packages (ibm-watsonx related):")
import subprocess
try:
    result = subprocess.run([sys.executable, "-m", "pip", "list"], capture_output=True, text=True)
    for line in result.stdout.split('\n'):
        if 'watsonx' in line.lower() or 'ibm' in line.lower():
            print(line)
except Exception as e:
    print(f"Could not run pip list: {e}")
