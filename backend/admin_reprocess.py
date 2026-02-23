import requests
import json

# Login as admin
login_res = requests.post("http://127.0.0.1:8000/api/v1/auth/login", 
                         data={"username": "admin@invoiceai.com", "password": "Admin123!"})
token = login_res.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# List all to find the ID
list_res = requests.get("http://127.0.0.1:8000/api/v1/admin/invoices", headers=headers)
invoices = list_res.json().get("items", [])

target_id = None
for inv in invoices:
    # Match by partial ID or status if needed, but let's look for the one from the screenshot
    if inv['id'].startswith("7bac35e6"):
        target_id = inv['id']
        break

if not target_id:
    print("Could not find the target invoice in the list.")
    # Print the first few for debugging
    for inv in invoices[:3]:
        print(f"ID: {inv['id']}")
    exit()

print(f"Found target invoice: {target_id}. Triggering auto-review...")

res = requests.post(f"http://127.0.0.1:8000/api/v1/admin/invoices/{target_id}/auto-review", headers=headers)
print("Status Code:", res.status_code)
print("Result:", json.dumps(res.json(), indent=2))
