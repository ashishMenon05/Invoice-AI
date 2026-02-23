from dependencies import SessionLocal
from models.all import User
db = SessionLocal()
users = db.query(User).all()
for u in users:
    print(f"Email: {u.email}, OrgID: {u.organization_id}, Role: {u.role}")
db.close()
