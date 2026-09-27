"""Storage service - manages file uploads for resumes."""
import uuid
from pathlib import Path

import aiofiles
from fastapi import UploadFile

from app.core.config import settings


class StorageService:
    def __init__(self) -> None:
        self.upload_dir = Path(settings.UPLOAD_DIR)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def save_file(self, user_id: str, file: UploadFile) -> tuple[str, str]:
        """
        Save uploaded file to user-specific directory.
        Returns (absolute_file_path, relative_safe_name).
        """
        ext = Path(file.filename or "upload").suffix.lower()
        unique_name = f"{uuid.uuid4()}{ext}"
        user_dir = self.upload_dir / user_id
        user_dir.mkdir(parents=True, exist_ok=True)
        file_path = user_dir / unique_name

        content = await file.read()
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(content)

        return str(file_path), f"{user_id}/{unique_name}"

    def delete_file(self, file_path: str) -> bool:
        """Delete a file from storage. Returns True on success."""
        try:
            path = Path(file_path)
            if path.exists():
                path.unlink()
            return True
        except Exception:
            return False

    def get_file_bytes(self, file_path: str) -> bytes:
        """Read file bytes for download."""
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        return path.read_bytes()


storage_service = StorageService()
