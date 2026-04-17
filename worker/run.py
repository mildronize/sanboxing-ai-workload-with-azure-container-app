import os
import sys
import subprocess
import json
from urllib.request import Request, urlopen

code = os.environ.get("CODE", "")
callback_url = os.environ.get("CALLBACK_URL", "")

result = subprocess.run(
    ["python", "-c", code],
    capture_output=True,
    text=True,
    timeout=120,
)

stdout = result.stdout
stderr = result.stderr

payload = json.dumps({"stdout": stdout or stderr}).encode()
req = Request(
    callback_url,
    data=payload,
    headers={"Content-Type": "application/json"},
    method="POST",
)
urlopen(req)
