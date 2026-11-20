import requests
import os
from dotenv import load_dotenv
from pathlib import Path
import time

ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env.local")

update_key = os.getenv("UPDATE_KEY")

if not update_key:
    raise ValueError("UPDATE_KEY not found")

headers = {
    "X-Update-Secret": update_key,
}

base_url = "http://127.0.0.1:5002/slop-watch/api/update"

for endpoint in ("data", "model"):

    print(f"\nStarting {endpoint} update...", flush=True)

    start = time.perf_counter()

    try:
        response = requests.post(
            f"{base_url}/{endpoint}",
            headers=headers,
            timeout=3600,
        )

        print(f"Finished {endpoint} update", flush=True)
        print(f"Status: {response.status_code}", flush=True)
        print(f"Response: {response.text}", flush=True)
        print(f"Time: {time.perf_counter() - start:.2f}s", flush=True)

        response.raise_for_status()

    except requests.exceptions.Timeout:
        print(f"{endpoint} update timed out", flush=True)
        break

    except requests.exceptions.RequestException as e:
        print(f"{endpoint} update failed: {e}", flush=True)
        break