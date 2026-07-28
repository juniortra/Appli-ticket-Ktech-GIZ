from fastapi import APIRouter, HTTPException, Request
from auth_utils import get_any_authenticated_user
from datetime import datetime, timedelta

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

def get_db(request: Request):
    return request.app.state.db

@router.get("/stats")
async def get_dashboard_stats(request: Request):
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)
    
    user_id = user.get("user_id") or user.get("email")
    is_admin = user["role"] == "admin"
    
    # Base query filter
    query_filter = {} if is_admin else {"created_by": user_id}
    
    # Count all forms
    total_frm = await db.frm_forms.count_documents(query_filter)
    total_fdi = await db.fdi_forms.count_documents(query_filter)
    total_rdd = await db.rdd_forms.count_documents(query_filter)
    total_rdi = await db.rdi_forms.count_documents(query_filter)
    
    # FDI stats by status
    fdi_by_status = {}
    fdi_forms = await db.fdi_forms.find(query_filter, {"statut": 1, "_id": 0}).to_list(1000)
    for form in fdi_forms:
        status = form.get("statut", "en_attente")
        fdi_by_status[status] = fdi_by_status.get(status, 0) + 1
    
    # FDI stats by priority
    fdi_by_priority = {}
    for form in fdi_forms:
        priority = form.get("priorite", "normal")
        fdi_by_priority[priority] = fdi_by_priority.get(priority, 0) + 1
    
    # RDI stats by status
    rdi_by_status = {}
    rdi_forms = await db.rdi_forms.find(query_filter, {"statut": 1, "_id": 0}).to_list(1000)
    for form in rdi_forms:
        status = form.get("statut", "ouvert")
        rdi_by_status[status] = rdi_by_status.get(status, 0) + 1
    
    # Task stats
    task_filter = {} if is_admin else {"$or": [{"assigned_to": user_id}, {"created_by": user_id}]}
    total_tasks = await db.tasks.count_documents(task_filter)
    completed_tasks = await db.tasks.count_documents({**task_filter, "status": "completed"})
    pending_tasks = total_tasks - completed_tasks
    
    # Tasks by priority
    tasks_by_priority = {}
    tasks = await db.tasks.find(task_filter, {"priority": 1, "_id": 0}).to_list(1000)
    for task in tasks:
        priority = task.get("priority", "normal")
        tasks_by_priority[priority] = tasks_by_priority.get(priority, 0) + 1
    
    # Recent activity (last 30 days)
    thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
    recent_frm = await db.frm_forms.count_documents({**query_filter, "created_at": {"$gte": thirty_days_ago}})
    recent_fdi = await db.fdi_forms.count_documents({**query_filter, "created_at": {"$gte": thirty_days_ago}})
    recent_rdd = await db.rdd_forms.count_documents({**query_filter, "created_at": {"$gte": thirty_days_ago}})
    recent_rdi = await db.rdi_forms.count_documents({**query_filter, "created_at": {"$gte": thirty_days_ago}})
    
    return {
        "totals": {
            "frm": total_frm,
            "fdi": total_fdi,
            "rdd": total_rdd,
            "rdi": total_rdi,
            "all_forms": total_frm + total_fdi + total_rdd + total_rdi
        },
        "fdi_by_status": fdi_by_status,
        "fdi_by_priority": fdi_by_priority,
        "rdi_by_status": rdi_by_status,
        "tasks": {
            "total": total_tasks,
            "completed": completed_tasks,
            "pending": pending_tasks,
            "by_priority": tasks_by_priority
        },
        "recent_activity": {
            "frm": recent_frm,
            "fdi": recent_fdi,
            "rdd": recent_rdd,
            "rdi": recent_rdi
        }
    }