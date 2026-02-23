from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def health_check():
    """Phase 11: Monitoring & Uptime"""
    return {
        "status": "healthy",
        "service": "invoice-ai-cloud",
        "dependencies": {
            "database": "unverified",
            "llm": "unverified",
            "storage": "unverified"
        }
    }
