from fastapi import APIRouter, Request
from auth_utils import get_any_authenticated_user

router = APIRouter(prefix="/search", tags=["search"])

def get_db(request: Request):
    return request.app.state.db

@router.get("")
async def global_search(request: Request, q: str = ""):
    """Global search across all form types"""
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)
    
    if not q or len(q.strip()) < 2:
        return {"results": [], "total": 0}
    
    query = q.strip()
    is_admin = user["role"] == "admin"
    user_id = user.get("user_id") or user.get("email")
    
    # Base filter for user access
    def get_filter(search_fields):
        base_filter = {} if is_admin else {"created_by": user_id}
        search_filter = {
            "$or": [
                {field: {"$regex": query, "$options": "i"}} for field in search_fields
            ]
        }
        if is_admin:
            return search_filter
        return {"$and": [base_filter, search_filter]}
    
    results = []
    
    # Search FRM
    frm_fields = ["numero_fiche", "projet_site", "departement", "intervenants", "fournisseur"]
    frm_results = await db.frm_forms.find(
        get_filter(frm_fields),
        {"_id": 0}
    ).limit(20).to_list(20)
    
    for form in frm_results:
        results.append({
            "type": "FRM",
            "form_id": form.get("form_id"),
            "title": form.get("numero_fiche", "Sans numéro"),
            "subtitle": f"{form.get('projet_site', '')} - {form.get('fournisseur', '')}",
            "date": form.get("date"),
            "route": f"/forms/frm"
        })
    
    # Search FDI
    fdi_fields = ["numero_fiche", "projet_site", "intervenants", "utilisateurs", "service_departement", "observations"]
    fdi_results = await db.fdi_forms.find(
        get_filter(fdi_fields),
        {"_id": 0}
    ).limit(20).to_list(20)
    
    for form in fdi_results:
        results.append({
            "type": "FDI",
            "form_id": form.get("form_id"),
            "title": form.get("numero_fiche", "Sans numéro"),
            "subtitle": f"{form.get('projet_site', '')} - Priorité: {form.get('priorite', 'N/A')}",
            "date": form.get("date"),
            "status": form.get("statut"),
            "priority": form.get("priorite"),
            "route": f"/forms/fdi"
        })
    
    # Search RDD
    rdd_fields = ["projet", "utilisateur", "marque", "modele", "numero_serie", "probleme_constate", "techniciens"]
    rdd_results = await db.rdd_forms.find(
        get_filter(rdd_fields),
        {"_id": 0}
    ).limit(20).to_list(20)
    
    for form in rdd_results:
        results.append({
            "type": "RDD",
            "form_id": form.get("form_id"),
            "title": f"{form.get('marque', '')} {form.get('modele', '')}",
            "subtitle": f"{form.get('utilisateur', '')} - {form.get('probleme_constate', '')[:60]}",
            "date": form.get("date"),
            "route": f"/forms/rdd"
        })
    
    # Search RDI
    rdi_fields = ["lieu", "redige_par", "objet", "resume", "analyse_cause"]
    rdi_results = await db.rdi_forms.find(
        get_filter(rdi_fields),
        {"_id": 0}
    ).limit(20).to_list(20)
    
    for form in rdi_results:
        results.append({
            "type": "RDI",
            "form_id": form.get("form_id"),
            "title": form.get("objet", "Sans objet"),
            "subtitle": f"{form.get('lieu', '')} - {form.get('redige_par', '')}",
            "date": form.get("date_incident"),
            "status": form.get("statut"),
            "route": f"/forms/rdi"
        })
    
    # Search Tasks
    task_filter_base = {} if is_admin else {"$or": [{"assigned_to": user_id}, {"created_by": user_id}]}
    task_search = {
        "$or": [
            {"title": {"$regex": query, "$options": "i"}},
            {"description": {"$regex": query, "$options": "i"}}
        ]
    }
    task_filter = {"$and": [task_filter_base, task_search]} if not is_admin else task_search
    
    task_results = await db.tasks.find(task_filter, {"_id": 0}).limit(20).to_list(20)
    
    for task in task_results:
        results.append({
            "type": "TASK",
            "form_id": task.get("task_id"),
            "title": task.get("title"),
            "subtitle": task.get("description", "")[:80] if task.get("description") else "Sans description",
            "date": task.get("due_date"),
            "status": task.get("status"),
            "priority": task.get("priority"),
            "route": f"/tasks"
        })
    
    return {
        "results": results[:50],
        "total": len(results),
        "query": query
    }
