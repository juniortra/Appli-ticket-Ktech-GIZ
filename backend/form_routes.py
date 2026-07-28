from fastapi import APIRouter, HTTPException, Request
from typing import List
from models import FRMForm, FDIForm, RDDForm, RDIForm
from auth_utils import get_any_authenticated_user
from bson import ObjectId

router = APIRouter(prefix="/forms", tags=["forms"])

def get_db(request: Request):
    return request.app.state.db

# FRM Routes
@router.post("/frm", response_model=FRMForm)
async def create_frm(form: FRMForm, request: Request):
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)
    
    form.created_by = user.get("user_id") or user.get("email")
    form_dict = form.model_dump()
    form_dict["created_at"] = form_dict["created_at"].isoformat()
    
    await db.frm_forms.insert_one(form_dict)
    return form

@router.get("/frm", response_model=List[FRMForm])
async def get_frm_forms(request: Request):
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)
    
    if user["role"] == "admin":
        forms = await db.frm_forms.find({}, {"_id": 0}).to_list(1000)
    else:
        user_id = user.get("user_id") or user.get("email")
        forms = await db.frm_forms.find({"created_by": user_id}, {"_id": 0}).to_list(1000)
    
    return forms

@router.get("/frm/{form_id}", response_model=FRMForm)
async def get_frm_form(form_id: str, request: Request):
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)
    
    form = await db.frm_forms.find_one({"form_id": form_id}, {"_id": 0})
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    user_id = user.get("user_id") or user.get("email")
    if user["role"] != "admin" and form["created_by"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return form

# FDI Routes
@router.post("/fdi", response_model=FDIForm)
async def create_fdi(form: FDIForm, request: Request):
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)
    
    form.created_by = user.get("user_id") or user.get("email")
    form_dict = form.model_dump()
    form_dict["created_at"] = form_dict["created_at"].isoformat()
    
    await db.fdi_forms.insert_one(form_dict)
    return form

@router.get("/fdi", response_model=List[FDIForm])
async def get_fdi_forms(request: Request):
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)
    
    if user["role"] == "admin":
        forms = await db.fdi_forms.find({}, {"_id": 0}).to_list(1000)
    else:
        user_id = user.get("user_id") or user.get("email")
        forms = await db.fdi_forms.find({"created_by": user_id}, {"_id": 0}).to_list(1000)
    
    return forms

@router.get("/fdi/{form_id}", response_model=FDIForm)
async def get_fdi_form(form_id: str, request: Request):
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)
    
    form = await db.fdi_forms.find_one({"form_id": form_id}, {"_id": 0})
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    user_id = user.get("user_id") or user.get("email")
    if user["role"] != "admin" and form["created_by"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return form

@router.put("/fdi/{form_id}")
async def update_fdi(form_id: str, updates: dict, request: Request):
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)
    
    form = await db.fdi_forms.find_one({"form_id": form_id}, {"_id": 0})
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    user_id = user.get("user_id") or user.get("email")
    if user["role"] != "admin" and form["created_by"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.fdi_forms.update_one({"form_id": form_id}, {"$set": updates})
    return {"message": "Form updated successfully"}

# RDD Routes
@router.post("/rdd", response_model=RDDForm)
async def create_rdd(form: RDDForm, request: Request):
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)
    
    form.created_by = user.get("user_id") or user.get("email")
    form_dict = form.model_dump()
    form_dict["created_at"] = form_dict["created_at"].isoformat()
    
    await db.rdd_forms.insert_one(form_dict)
    return form

@router.get("/rdd", response_model=List[RDDForm])
async def get_rdd_forms(request: Request):
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)
    
    if user["role"] == "admin":
        forms = await db.rdd_forms.find({}, {"_id": 0}).to_list(1000)
    else:
        user_id = user.get("user_id") or user.get("email")
        forms = await db.rdd_forms.find({"created_by": user_id}, {"_id": 0}).to_list(1000)
    
    return forms

@router.get("/rdd/{form_id}", response_model=RDDForm)
async def get_rdd_form(form_id: str, request: Request):
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)
    
    form = await db.rdd_forms.find_one({"form_id": form_id}, {"_id": 0})
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    user_id = user.get("user_id") or user.get("email")
    if user["role"] != "admin" and form["created_by"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return form

# RDI Routes
@router.post("/rdi", response_model=RDIForm)
async def create_rdi(form: RDIForm, request: Request):
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)
    
    form.created_by = user.get("user_id") or user.get("email")
    form_dict = form.model_dump()
    form_dict["created_at"] = form_dict["created_at"].isoformat()
    
    await db.rdi_forms.insert_one(form_dict)
    return form

@router.get("/rdi", response_model=List[RDIForm])
async def get_rdi_forms(request: Request):
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)
    
    if user["role"] == "admin":
        forms = await db.rdi_forms.find({}, {"_id": 0}).to_list(1000)
    else:
        user_id = user.get("user_id") or user.get("email")
        forms = await db.rdi_forms.find({"created_by": user_id}, {"_id": 0}).to_list(1000)
    
    return forms

@router.get("/rdi/{form_id}", response_model=RDIForm)
async def get_rdi_form(form_id: str, request: Request):
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)
    
    form = await db.rdi_forms.find_one({"form_id": form_id}, {"_id": 0})
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    user_id = user.get("user_id") or user.get("email")
    if user["role"] != "admin" and form["created_by"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return form

@router.put("/rdi/{form_id}")
async def update_rdi(form_id: str, updates: dict, request: Request):
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)
    
    form = await db.rdi_forms.find_one({"form_id": form_id}, {"_id": 0})
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    user_id = user.get("user_id") or user.get("email")
    if user["role"] != "admin" and form["created_by"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.rdi_forms.update_one({"form_id": form_id}, {"$set": updates})
    return {"message": "Form updated successfully"}