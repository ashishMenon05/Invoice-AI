import requests

# Login as admin
login_res = requests.post("http://127.0.0.1:8000/api/v1/auth/login", 
                         data={"username": "admin@invoiceai.com", "password": "Admin123!"})
token = login_res.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

res = requests.get("http://127.0.0.1:8000/api/v1/admin/invoices", headers=headers)
data = res.json()
print("Response type:", type(data))
if isinstance(data, dict):
    print("Keys:", data.keys())
    # Many paginated APIs return {"items": [], "total": ...}
    invoices = data.get("items", [])
elif isinstance(data, list):
    invoices = data
else:
    invoices = []

print("Total invoices found:", len(invoices))
for inv in invoices[:10]:
    print(f"ID: {inv['id']}, Status: {inv['status']}, OrgID: {inv['organization_id']}")
