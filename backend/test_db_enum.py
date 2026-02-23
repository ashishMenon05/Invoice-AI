from sqlalchemy import create_engine
from dependencies import get_db
from models.all import Invoice

db = next(get_db())
# Query raw to see the enum values
engine = db.get_bind()
with engine.connect() as connection:
    result = connection.execute("SELECT enum_range(NULL::invoicestatus)")
    print(result.scalar())
