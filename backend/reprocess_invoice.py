import requests
import json

# Login as admin
login_res = requests.post("http://127.0.0.1:8000/api/v1/auth/login", 
                         data={"username": "admin@invoiceai.com", "password": "Admin123!"})
token = login_res.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

invoice_id = "7bac35e6-7b6c-4ef7-85c3-810f82d4ef05"
print(f"Reprocessing invoice {invoice_id}...")

reprocess_res = requests.post(f"http://127.0.0.1:8000/api/v1/invoices/{invoice_id}/reprocess", headers=headers)
print("Reprocess response:", reprocess_res.status_code, reprocess_res.text)

