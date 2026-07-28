import os
import secrets
from fastapi import APIRouter, HTTPException, Request, Response
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from models import User, UserCreate, UserLogin
from auth_utils import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    get_current_user,
    get_any_authenticated_user
)
import httpx

router = APIRouter(prefix="/auth", tags=["auth"])

def get_db(request: Request):
    return request.app.state.db

@router.post("/register")
async def register(user_data: UserCreate, response: Response, request: Request):
    db = get_db(request)
    email = user_data.email.lower()
    
    existing_user = await db.users.find_one({"email": email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    password_hash = hash_password(user_data.password)
    user_doc = {
        "user_id": f"user_{secrets.token_hex(6)}",
        "email": email,
        "name": user_data.name,
        "password_hash": password_hash,
        "role": "user",
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=900,
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=604800,
        path="/"
    )
    
    user_doc.pop("password_hash")
    user_doc.pop("_id", None)
    return user_doc

@router.post("/login")
async def login(credentials: UserLogin, response: Response, request: Request):
    db = get_db(request)
    email = credentials.email.lower()
    
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=900,
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=604800,
        path="/"
    )
    
    user.pop("password_hash")
    user.pop("_id")
    return user

@router.get("/me")
async def get_me(request: Request):
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)
    return user

@router.post("/logout")
async def logout(response: Response, request: Request):
    db = get_db(request)
    try:
        user = await get_any_authenticated_user(request, db)
        session_token = request.cookies.get("session_token")
        if session_token:
            await db.user_sessions.delete_one({"session_token": session_token})
    except:
        pass
    
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out successfully"}

@router.post("/google/callback")
async def google_callback(request: Request, response: Response):
    db = get_db(request)
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid session_id")
        
        data = resp.json()
    
    email = data["email"].lower()
    session_token = data["session_token"]
    
    user_doc = await db.users.find_one({"email": email}, {"_id": 0})
    
    if not user_doc:
        user_id = f"user_{secrets.token_hex(6)}"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": data.get("name", email.split("@")[0]),
            "role": "user",
            "picture": data.get("picture"),
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(user_doc)
        user_doc.pop("_id", None)
    else:
        user_id = user_doc["user_id"]
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=604800,
        path="/"
    )
    
    user_doc.pop("password_hash", None)
    return user_doc