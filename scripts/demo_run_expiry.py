"""Demo hết hạn (cần DEMO_MODE=true): python scripts/demo_run_expiry.py 2026-12-01 [base_url]"""
import os
import sys

import requests

date = sys.argv[1]
base = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:8000"
tok = requests.post(f"{base}/api/identity/auth/login", timeout=10,
                    json={"email": os.environ.get("SEED_ADMIN_EMAIL", "admin@example.com"),
                          "password": os.environ["SEED_ADMIN_PASSWORD"]}).json()["accessToken"]
h = {"Authorization": f"Bearer {tok}"}
print(requests.put(f"{base}/api/core/demo/date", json={"date": date}, headers=h, timeout=10).json())
print(requests.post(f"{base}/api/core/demo/run-expiry", headers=h, timeout=30).json())
