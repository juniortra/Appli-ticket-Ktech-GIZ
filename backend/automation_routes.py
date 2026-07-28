"""
Automation Rules System for K-Technology
Manages automatic SMS/WhatsApp alerts based on triggers and conditions.
"""
import os
import logging
import asyncio
import uuid
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

from auth_utils import get_any_authenticated_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/automation", tags=["automation"])


class AutomationRule(BaseModel):
    rule_id: Optional[str] = None
    name: str
    trigger: Literal[
        "task_created",       # New task created
        "task_urgent_created", # New urgent task created
        "task_due_soon",      # Task due within 24h
        "task_overdue",       # Task past due date
        "incident_created",   # New RDI created
        "fdi_urgent_created", # New urgent FDI created
    ]
    channels: List[Literal["sms", "whatsapp"]]
    recipients: List[str]
    priority_filter: Optional[List[Literal["urgent", "moyen", "faible"]]] = None
    enabled: bool = True


def get_db(request: Request):
    return request.app.state.db


def _get_twilio_client():
    account_sid = os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
    if not account_sid or account_sid == "your_twilio_account_sid_here":
        return None
    if not auth_token or auth_token == "your_twilio_auth_token_here":
        return None
    return Client(account_sid, auth_token)


def _normalize_phone(phone: str, channel: str) -> str:
    phone = phone.strip().replace(" ", "").replace("-", "")
    if phone.startswith("whatsapp:"):
        phone = phone[9:]
    if not phone.startswith("+"):
        phone = "+" + phone
    if channel == "whatsapp":
        return f"whatsapp:{phone}"
    return phone


async def send_automated_alert(db, rule: dict, trigger_data: dict):
    """Send an automated alert based on a rule and trigger data"""
    client = _get_twilio_client()
    if not client:
        logger.warning(f"Cannot send auto-alert: Twilio not configured (rule: {rule.get('name')})")
        return {"skipped": True, "reason": "Twilio not configured"}

    results = {"success": [], "failed": [], "rule_id": rule.get("rule_id")}

    # Build the message based on trigger type
    message = _build_automated_message(rule, trigger_data)

    for channel in rule.get("channels", []):
        if channel == "sms":
            sender = os.environ.get("TWILIO_PHONE_NUMBER", "").strip()
            if not sender or sender == "+1234567890":
                continue
        else:
            sender = os.environ.get("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886").strip()
            if not sender.startswith("whatsapp:"):
                sender = f"whatsapp:{sender}"

        for recipient in rule.get("recipients", []):
            try:
                normalized = _normalize_phone(recipient, channel)

                def _send():
                    return client.messages.create(body=message, from_=sender, to=normalized)

                msg = await asyncio.to_thread(_send)
                results["success"].append({
                    "channel": channel,
                    "recipient": recipient,
                    "message_sid": msg.sid,
                })

                # Log
                await db.automation_logs.insert_one({
                    "rule_id": rule.get("rule_id"),
                    "rule_name": rule.get("name"),
                    "trigger": rule.get("trigger"),
                    "channel": channel,
                    "recipient": recipient,
                    "message_sid": msg.sid,
                    "trigger_data": {k: str(v) for k, v in trigger_data.items() if k != "created_at"},
                    "sent_at": datetime.now(timezone.utc).isoformat(),
                })
            except TwilioRestException as e:
                logger.error(f"Auto-alert Twilio error: {e}")
                results["failed"].append({
                    "channel": channel,
                    "recipient": recipient,
                    "error": e.msg if hasattr(e, 'msg') else str(e),
                })
            except Exception as e:
                logger.error(f"Auto-alert error: {e}")
                results["failed"].append({
                    "channel": channel,
                    "recipient": recipient,
                    "error": str(e),
                })

    return results


def _build_automated_message(rule: dict, data: dict) -> str:
    """Build the automated alert message"""
    trigger = rule.get("trigger", "")

    lines = ["🔔 K-TECHNOLOGY - Alerte Automatique", ""]

    if trigger == "task_created" or trigger == "task_urgent_created":
        priority = data.get("priority", "moyen")
        emoji = {"urgent": "🔴", "moyen": "🟡", "faible": "🟢"}.get(priority, "🟡")
        lines.append(f"📋 Nouvelle tâche {emoji} {priority.upper()}")
        lines.append(f"Titre: {data.get('title', '-')}")
        if data.get("due_date"):
            lines.append(f"📅 Échéance: {data['due_date']}")
        if data.get("assigned_to"):
            lines.append(f"👤 Assigné à: {data['assigned_to']}")

    elif trigger == "task_due_soon":
        lines.append("⏰ Tâche à échéance proche (< 24h)")
        lines.append(f"📋 {data.get('title', '-')}")
        lines.append(f"📅 Échéance: {data.get('due_date', '-')}")

    elif trigger == "task_overdue":
        lines.append("⚠️ Tâche en retard!")
        lines.append(f"📋 {data.get('title', '-')}")
        lines.append(f"📅 Était due le: {data.get('due_date', '-')}")

    elif trigger == "incident_created":
        lines.append("🚨 Nouveau rapport d'incident (RDI)")
        lines.append(f"Objet: {data.get('objet', '-')}")
        lines.append(f"Lieu: {data.get('lieu', '-')}")
        if data.get("date_incident"):
            lines.append(f"Date: {data['date_incident']}")

    elif trigger == "fdi_urgent_created":
        lines.append("🚨 Nouvelle intervention URGENTE (FDI)")
        lines.append(f"N° {data.get('numero_fiche', '-')}")
        lines.append(f"Projet: {data.get('projet_site', '-')}")
        types = data.get("types_intervention", [])
        if types:
            lines.append(f"Type: {', '.join(types[:2])}")

    lines.append("")
    lines.append("— Alerte automatique K-Technology")
    return "\n".join(lines)


async def trigger_automation(db, trigger_name: str, data: dict):
    """Called from other routes to trigger automation rules"""
    # Find matching enabled rules
    rules = await db.automation_rules.find(
        {"trigger": trigger_name, "enabled": True},
        {"_id": 0}
    ).to_list(50)

    # Filter by priority if applicable
    if data.get("priority"):
        rules = [
            r for r in rules
            if not r.get("priority_filter") or data["priority"] in r.get("priority_filter", [])
        ]

    for rule in rules:
        try:
            await send_automated_alert(db, rule, data)
        except Exception as e:
            logger.error(f"Failed to execute rule {rule.get('name')}: {e}")


# ============================
# CRUD Endpoints for Rules
# ============================

@router.post("/rules")
async def create_rule(rule: AutomationRule, request: Request):
    """Create a new automation rule (admin only)"""
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)

    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accès administrateur requis")

    rule_dict = rule.model_dump()
    rule_dict["rule_id"] = f"rule_{uuid.uuid4().hex[:10]}"
    rule_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    rule_dict["created_by"] = user.get("user_id") or user.get("email")

    await db.automation_rules.insert_one(rule_dict)
    rule_dict.pop("_id", None)

    return {"message": "Règle créée avec succès", "rule": rule_dict}


@router.get("/rules")
async def get_rules(request: Request):
    """Get all automation rules (admin only)"""
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)

    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accès administrateur requis")

    rules = await db.automation_rules.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"rules": rules}


@router.put("/rules/{rule_id}")
async def update_rule(rule_id: str, updates: dict, request: Request):
    """Update an automation rule (admin only)"""
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)

    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accès administrateur requis")

    updates.pop("_id", None)
    updates.pop("rule_id", None)

    result = await db.automation_rules.update_one({"rule_id": rule_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Règle non trouvée")

    return {"message": "Règle mise à jour"}


@router.delete("/rules/{rule_id}")
async def delete_rule(rule_id: str, request: Request):
    """Delete an automation rule (admin only)"""
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)

    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accès administrateur requis")

    result = await db.automation_rules.delete_one({"rule_id": rule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Règle non trouvée")

    return {"message": "Règle supprimée"}


@router.get("/logs")
async def get_automation_logs(request: Request, limit: int = 50):
    """Get automation execution logs (admin only)"""
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)

    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accès administrateur requis")

    logs = await db.automation_logs.find({}, {"_id": 0}).sort("sent_at", -1).limit(limit).to_list(limit)
    return {"logs": logs}


@router.post("/check-due-tasks")
async def check_due_tasks(request: Request):
    """Manually trigger check for due/overdue tasks (also called by scheduler)"""
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)

    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accès administrateur requis")

    now = datetime.now(timezone.utc)
    tomorrow = now + timedelta(days=1)
    today_str = now.strftime("%Y-%m-%d")
    tomorrow_str = tomorrow.strftime("%Y-%m-%d")

    # Find tasks due soon (within 24h)
    due_soon = await db.tasks.find({
        "status": {"$ne": "completed"},
        "due_date": {"$in": [today_str, tomorrow_str]}
    }, {"_id": 0}).to_list(100)

    # Find overdue tasks
    overdue = await db.tasks.find({
        "status": {"$ne": "completed"},
        "due_date": {"$lt": today_str}
    }, {"_id": 0}).to_list(100)

    # Trigger automation for each
    for task in due_soon:
        # Prevent duplicate alerts (check if we already sent one in last 12h)
        last_log = await db.automation_logs.find_one({
            "trigger": "task_due_soon",
            "trigger_data.task_id": task.get("task_id"),
            "sent_at": {"$gt": (now - timedelta(hours=12)).isoformat()}
        })
        if not last_log:
            await trigger_automation(db, "task_due_soon", task)

    for task in overdue:
        last_log = await db.automation_logs.find_one({
            "trigger": "task_overdue",
            "trigger_data.task_id": task.get("task_id"),
            "sent_at": {"$gt": (now - timedelta(hours=24)).isoformat()}
        })
        if not last_log:
            await trigger_automation(db, "task_overdue", task)

    return {
        "checked_at": now.isoformat(),
        "due_soon_count": len(due_soon),
        "overdue_count": len(overdue),
    }
