from fastapi import APIRouter, HTTPException, Request
from typing import List, Literal, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone
import secrets

from auth_utils import get_any_authenticated_user, hash_password
from models import User

router = APIRouter(prefix="/users", tags=["users"])


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Literal["user", "admin"] = "user"


def get_db(request: Request):
    return request.app.state.db


@router.post("")
async def create_user(user_data: CreateUserRequest, request: Request):
    """Create a new user (admin only)"""
    db = get_db(request)
    current = await get_any_authenticated_user(request, db)

    if current["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accès administrateur requis")

    email = user_data.email.lower()

    # Check if user already exists
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Un utilisateur avec cet email existe déjà")

    # Validate password
    if len(user_data.password) < 6:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caractères")

    # Create user
    user_id = f"user_{secrets.token_hex(6)}"
    user_doc = {
        "user_id": user_id,
        "email": email,
        "name": user_data.name.strip(),
        "password_hash": hash_password(user_data.password),
        "role": user_data.role,
        "created_at": datetime.now(timezone.utc),
        "created_by_admin": current.get("user_id") or current.get("email"),
    }

    await db.users.insert_one(user_doc)
    user_doc.pop("password_hash")
    user_doc.pop("_id", None)

    return {
        "message": f"Utilisateur {email} créé avec succès",
        "user": user_doc,
    }


@router.get("", response_model=List[User])
async def get_users(request: Request):
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)

    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users


class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[Literal["user", "admin"]] = None
    password: Optional[str] = None


@router.put("/{user_id}")
async def update_user(user_id: str, updates: UpdateUserRequest, request: Request):
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)

    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    update_dict = {}
    if updates.name is not None:
        update_dict["name"] = updates.name.strip()
    if updates.role is not None:
        update_dict["role"] = updates.role
    if updates.password is not None:
        if len(updates.password) < 6:
            raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caractères")
        update_dict["password_hash"] = hash_password(updates.password)

    if not update_dict:
        raise HTTPException(status_code=400, detail="Aucune modification fournie")

    result = await db.users.update_one({"user_id": user_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    return {"message": "Utilisateur mis à jour avec succès"}


@router.delete("/{user_id}")
async def delete_user(user_id: str, request: Request):
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)

    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    current_user_id = user.get("user_id") or user.get("email")
    if user_id == current_user_id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte")

    result = await db.users.delete_one({"user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    return {"message": "Utilisateur supprimé avec succès"}