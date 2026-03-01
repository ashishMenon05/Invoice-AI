import boto3
import uuid
import os
import pathlib
from fastapi import UploadFile, HTTPException
from core.config import settings

# Local storage fallback path (used when R2 is not configured)
LOCAL_STORAGE_DIR = pathlib.Path("./local_uploads")

def _is_r2_configured() -> bool:
    return bool(settings.R2_ACCESS_KEY and settings.R2_SECRET_KEY and settings.R2_ENDPOINT_URL)

def get_s3_client():
    """Initializes the boto3 client connecting to Cloudflare R2"""
    if not _is_r2_configured():
        raise HTTPException(status_code=500, detail="Storage credentials not configured.")
    return boto3.client(
        "s3",
        endpoint_url=settings.R2_ENDPOINT_URL.strip(),
        aws_access_key_id=settings.R2_ACCESS_KEY.strip(),
        aws_secret_access_key=settings.R2_SECRET_KEY.strip(),
        region_name="auto"
    )

async def upload_invoice_to_r2(file: UploadFile, org_id: str) -> str:
    """
    Uploads invoice to R2 if configured, otherwise saves to local filesystem.
    Returns the storage key/path for DB persistence.
    """
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    s3_key = f"organizations/{org_id}/invoices/{unique_filename}"

    file_contents = await file.read()

    if _is_r2_configured():
        # Production: Upload to Cloudflare R2
        s3 = get_s3_client()
        bucket_name = settings.R2_BUCKET_NAME
        try:
            s3.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=file_contents,
                ContentType=file.content_type
            )
        except Exception as e:
            print(f"R2 Upload Exception: {e}")
            raise HTTPException(status_code=500, detail="Failed to upload file to cloud storage.")
    else:
        # Local dev fallback: save to ./local_uploads/
        local_path = LOCAL_STORAGE_DIR / s3_key
        local_path.parent.mkdir(parents=True, exist_ok=True)
        local_path.write_bytes(file_contents)

    await file.seek(0)
    return s3_key

def save_bytes_to_storage(file_bytes: bytes, filename: str, org_id: str) -> str:
    """
    Saves raw bytes to storage (R2 or local).
    Used for email attachments where we don't have a FastAPI UploadFile object.
    Returns the storage key.
    """
    unique_filename = f"{uuid.uuid4()}_{filename}"
    s3_key = f"organizations/{org_id}/invoices/{unique_filename}"

    if _is_r2_configured():
        s3 = get_s3_client()
        bucket_name = settings.R2_BUCKET_NAME
        try:
            # Heuristically determine content-type
            ext = filename.lower().split('.')[-1]
            content_type = "application/octet-stream"
            if ext == "pdf": content_type = "application/pdf"
            elif ext in ["png"]: content_type = "image/png"
            elif ext in ["jpg", "jpeg"]: content_type = "image/jpeg"

            s3.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=file_bytes,
                ContentType=content_type
            )
        except Exception as e:
            print(f"R2 Upload Exception: {e}")
            raise Exception("Failed to upload bytes to cloud storage.")
    else:
        # Local dev fallback
        local_path = LOCAL_STORAGE_DIR / s3_key
        local_path.parent.mkdir(parents=True, exist_ok=True)
        local_path.write_bytes(file_bytes)

    return s3_key

def get_file_from_storage(s3_key: str) -> tuple[bytes, str]:
    """
    Retrieves a file payload directly from R2 or the local dev fallback.
    Returns (file_bytes, content_type).
    """
    if _is_r2_configured():
        s3 = get_s3_client()
        bucket_name = settings.R2_BUCKET_NAME
        try:
            response = s3.get_object(Bucket=bucket_name, Key=s3_key)
            file_bytes = response['Body'].read()
            content_type = response.get('ContentType', 'application/octet-stream')
            return file_bytes, content_type
        except Exception as e:
            print(f"R2 Download Exception: {e}")
            raise HTTPException(status_code=404, detail="File not found in cloud storage.")
    else:
        # Local dev fallback
        local_path = LOCAL_STORAGE_DIR / s3_key
        if not local_path.exists():
            raise HTTPException(status_code=404, detail="File not found on local disk.")
            
        file_bytes = local_path.read_bytes()
        
        # Heuristically determine local content-type matching upload constraints
        content_type = "application/octet-stream"
        ext = str(local_path).lower().split('.')[-1]
        if ext == "pdf": content_type = "application/pdf"
        elif ext in ["png"]: content_type = "image/png"
        elif ext in ["jpg", "jpeg"]: content_type = "image/jpeg"
        elif ext in ["csv"]: content_type = "text/csv"
        elif ext in ["xlsx", "xls"]: content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            
        return file_bytes, content_type

def delete_from_storage(s3_key: str) -> None:
    """Deletes a file from R2 or the local dev fallback."""
    if _is_r2_configured():
        s3 = get_s3_client()
        bucket_name = settings.R2_BUCKET_NAME
        s3.delete_object(Bucket=bucket_name, Key=s3_key)
    else:
        local_path = LOCAL_STORAGE_DIR / s3_key
        if local_path.exists():
            local_path.unlink()
