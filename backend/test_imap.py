from core.config import settings
from services.email_service import connect_imap

mail = connect_imap()
if mail:
    print("IMAP Connection successful!")
    try:
        mail.logout()
    except:
        pass
else:
    print("IMAP Connection failed!")
