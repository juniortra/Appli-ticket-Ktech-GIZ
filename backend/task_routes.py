from fastapi import APIRouter, HTTPException, Request
from typing import List
from models import Task
from auth_utils import get_any_authenticated_user
from datetime import datetime

router = APIRouter(prefix="/tasks", tags=["tasks"])

def get_db(request: Request):
    return request.app.state.db

@router.post("", response_model=Task)
async def create_task(task: Task, request: Request):
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)
    
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create tasks")
    
    task.created_by = user.get("user_id") or user.get("email")
    task_dict = task.model_dump()
    task_dict["created_at"] = task_dict["created_at"].isoformat()
    if task_dict.get("completed_at"):
        task_dict["completed_at"] = task_dict["completed_at"].isoformat()
    
    await db.tasks.insert_one(task_dict)
    return task

@router.get("", response_model=List[Task])
async def get_tasks(request: Request):
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)
    
    if user["role"] == "admin":
        tasks = await db.tasks.find({}, {"_id": 0}).to_list(1000)
    else:
        user_id = user.get("user_id") or user.get("email")
        tasks = await db.tasks.find(
            {"$or": [{"assigned_to": user_id}, {"created_by": user_id}]},
            {"_id": 0}
        ).to_list(1000)
    
    return tasks

@router.put("/{task_id}")
async def update_task(task_id: str, updates: dict, request: Request):
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)
    
    task = await db.tasks.find_one({"task_id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    user_id = user.get("user_id") or user.get("email")
    if user["role"] != "admin" and task.get("assigned_to") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if updates.get("status") == "completed" and "completed_at" not in updates:
        updates["completed_at"] = datetime.utcnow().isoformat()
    
    await db.tasks.update_one({"task_id": task_id}, {"$set": updates})
    return {"message": "Task updated successfully"}

@router.delete("/{task_id}")
async def delete_task(task_id: str, request: Request):
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)
    
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete tasks")
    
    result = await db.tasks.delete_one({"task_id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"message": "Task deleted successfully"}