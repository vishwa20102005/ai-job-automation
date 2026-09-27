import os
from pathlib import Path

BASE_DIR = Path(r"c:\Users\vishw\OneDrive\Desktop\projects\ai job automation\careerpilot-ai\backend")

files = {
    "app/api/__init__.py": "",
    "app/api/deps.py": """from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User
import uuid

bearer_scheme = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
    user = db.query(User).filter(User.id == uuid.UUID(user_id), User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    
    return user""",
    
    "app/api/routes/__init__.py": "",
    "app/core/__init__.py": "",
    "app/models/__init__.py": "",
    "app/schemas/__init__.py": "",
    "app/services/__init__.py": "",
    "app/repositories/__init__.py": "",
    "app/middleware/__init__.py": "",
    "app/utils/__init__.py": "",
    "tests/__init__.py": "",
    "uploads/.gitkeep": "",
    ".env.example": "DATABASE_URL=postgresql://careerpilot:careerpilot123@localhost:5432/careerpilot\n",
    ".env": "DATABASE_URL=postgresql://careerpilot:careerpilot123@localhost:5432/careerpilot\n"
}

def create_files():
    for rel_path, content in files.items():
        full_path = BASE_DIR / rel_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)
    print("Files created successfully.")

if __name__ == "__main__":
    create_files()
