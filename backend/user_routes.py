from fastapi import APIRouter, HTTPException, Request
from typing import List
from auth_utils import get_any_authenticated_user
from models import User

router = APIRouter(prefix="/users", tags=["users"])

def get_db(request: Request):
    return request.app.state.db

@router.get("", response_model=List[User])
async def get_users(request: Request):
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)
    
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@router.put("/{user_id}")
async def update_user(user_id: str, updates: dict, request: Request):
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)
    
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Don't allow updating password_hash directly
    updates.pop("password_hash", None)
    updates.pop("_id", None)
    
    result = await db.users.update_one({"user_id": user_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User updated successfully"}

@router.delete("/{user_id}")
async def delete_user(user_id: str, request: Request):
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)
    
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Don't allow deleting self
    current_user_id = user.get("user_id") or user.get("email")
    if user_id == current_user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    result = await db.users.delete_one({"user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}