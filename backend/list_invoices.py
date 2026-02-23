import requests

# Login as admin
login_res = requests.post("http://127.0.0.1:8000/api/v1/auth/login", 
                         data={"username": "admin@invoiceai.com", "password": "Admin123!"})
if login_res.status_code != 200:
    print("Login failed:", login_res.text)
    exit()
token = login_res.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

res = requests.get("http://127.0.0.1:8000/api/v1/invoices/my", headers=headers)
if res.status_code != 200:
    print("Fetch failed:", res.text)
    exit()
invoices = res.json()
print("Total invoices found:", len(invoices))
for inv in invoices[:10]:
    print(f"ID: {inv['id']}, Status: {inv['status']}")
