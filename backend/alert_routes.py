import os
import asyncio
import logging
from typing import List, Optional, Literal
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from datetime import datetime, timezone

from auth_utils import get_any_authenticated_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/alerts", tags=["alerts"])


class TaskAlertRequest(BaseModel):
    task_id: str
    channel: Literal["sms", "whatsapp"]
    recipients: List[str]  # Phone numbers in E.164 format
    custom_message: Optional[str] = None


class BulkAlertRequest(BaseModel):
    priorities: List[Literal["urgent", "moyen", "faible"]]  # Filter by these priorities
    channel: Literal["sms", "whatsapp"]
    recipients: List[str]
    only_pending: bool = True  # Only send for tasks not yet completed
    custom_message: Optional[str] = None


def get_db(request: Request):
    return request.app.state.db


def _get_twilio_client():
    account_sid = os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN", "").strip()

    if not account_sid or account_sid == "your_twilio_account_sid_here":
        raise HTTPException(
            status_code=500,
            detail="Le service Twilio n'est pas configuré. Veuillez ajouter votre TWILIO_ACCOUNT_SID dans le fichier .env"
        )
    if not auth_token or auth_token == "your_twilio_auth_token_here":
        raise HTTPException(
            status_code=500,
            detail="Le service Twilio n'est pas configuré. Veuillez ajouter votre TWILIO_AUTH_TOKEN dans le fichier .env"
        )

    return Client(account_sid, auth_token)


def _build_task_message(task: dict, custom_message: Optional[str], sender_name: str) -> str:
    """Build the alert message for a task"""
    priority_label = {
        "urgent": "🔴 URGENT",
        "moyen": "🟡 MOYEN",
        "faible": "🟢 FAIBLE"
    }.get(task.get("priority", "moyen"), "MOYEN")
    status_label = {"todo": "À faire", "in_progress": "En cours", "completed": "Terminé"}.get(
        task.get("status", "todo"), "À faire"
    )

    message_parts = [
        "🔔 K-TECHNOLOGY - Alerte Tâche",
        "",
        f"Priorité: {priority_label}",
        f"Statut: {status_label}",
        f"📋 {task.get('title', 'Sans titre')}",
    ]

    if task.get("description"):
        desc = task["description"][:150] + ("..." if len(task["description"]) > 150 else "")
        message_parts.append(f"📝 {desc}")

    if task.get("due_date"):
        message_parts.append(f"📅 Échéance: {task['due_date']}")

    if task.get("assigned_to"):
        message_parts.append(f"👤 Assigné à: {task['assigned_to']}")

    if custom_message:
        message_parts.extend(["", f"💬 {custom_message}"])

    message_parts.extend(["", f"— {sender_name}"])

    return "\n".join(message_parts)


def _normalize_phone(phone: str, channel: str) -> str:
    """Normalize phone number to E.164 format with WhatsApp prefix if needed"""
    phone = phone.strip().replace(" ", "").replace("-", "")

    # Remove existing whatsapp: prefix if any
    if phone.startswith("whatsapp:"):
        phone = phone[9:]

    # Ensure + prefix
    if not phone.startswith("+"):
        phone = "+" + phone

    if channel == "whatsapp":
        return f"whatsapp:{phone}"
    return phone


@router.post("/task")
async def send_task_alert(alert_data: TaskAlertRequest, request: Request):
    """Send SMS or WhatsApp alert for a task"""
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)

    # Fetch the task
    task = await db.tasks.find_one({"task_id": alert_data.task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")

    # Authorization
    user_id = user.get("user_id") or user.get("email")
    if user["role"] != "admin" and task.get("created_by") != user_id and task.get("assigned_to") != user_id:
        raise HTTPException(status_code=403, detail="Non autorisé")

    # Get Twilio client
    client = _get_twilio_client()

    # Get sender number based on channel
    if alert_data.channel == "sms":
        sender_number = os.environ.get("TWILIO_PHONE_NUMBER", "").strip()
        if not sender_number or sender_number == "+1234567890":
            raise HTTPException(
                status_code=500,
                detail="Veuillez configurer TWILIO_PHONE_NUMBER dans le fichier .env"
            )
    else:  # whatsapp
        sender_number = os.environ.get("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886").strip()
        if not sender_number.startswith("whatsapp:"):
            sender_number = f"whatsapp:{sender_number}"

    # Build the message
    sender_name = user.get("name", user.get("email", "K-Technology"))
    message_body = _build_task_message(task, alert_data.custom_message, sender_name)

    # Send to all recipients
    results = {"success": [], "failed": []}

    for recipient in alert_data.recipients:
        try:
            normalized_to = _normalize_phone(recipient, alert_data.channel)

            def _send():
                return client.messages.create(
                    body=message_body,
                    from_=sender_number,
                    to=normalized_to
                )

            msg = await asyncio.to_thread(_send)
            results["success"].append({
                "recipient": recipient,
                "message_sid": msg.sid,
                "status": msg.status
            })

            # Log the alert
            await db.alert_logs.insert_one({
                "sent_by": user_id,
                "task_id": alert_data.task_id,
                "channel": alert_data.channel,
                "recipient": recipient,
                "message_sid": msg.sid,
                "status": msg.status,
                "sent_at": datetime.now(timezone.utc).isoformat()
            })

        except TwilioRestException as e:
            logger.error(f"Twilio error for {recipient}: {str(e)}")
            results["failed"].append({
                "recipient": recipient,
                "error": e.msg if hasattr(e, 'msg') else str(e)
            })
        except Exception as e:
            logger.error(f"Error sending to {recipient}: {str(e)}")
            results["failed"].append({
                "recipient": recipient,
                "error": str(e)
            })

    if not results["success"] and results["failed"]:
        # All failed
        error_msg = results["failed"][0]["error"] if results["failed"] else "Envoi échoué"
        raise HTTPException(status_code=500, detail=f"Échec de l'envoi: {error_msg}")

    return {
        "status": "success" if not results["failed"] else "partial",
        "message": f"Alerte {alert_data.channel.upper()} envoyée à {len(results['success'])} destinataire(s)",
        "channel": alert_data.channel,
        "results": results
    }


@router.get("/logs/{task_id}")
async def get_alert_logs(task_id: str, request: Request):
    """Get alert history for a task"""
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)

    logs = await db.alert_logs.find(
        {"task_id": task_id},
        {"_id": 0}
    ).sort("sent_at", -1).limit(50).to_list(50)

    return {"logs": logs, "total": len(logs)}


def _build_bulk_summary_message(tasks: List[dict], priorities: List[str], custom_message: Optional[str], sender_name: str) -> str:
    """Build a summary message for multiple tasks grouped by priority"""
    priority_emoji = {"urgent": "🔴", "moyen": "🟡", "faible": "🟢"}
    priority_order = ["urgent", "moyen", "faible"]

    # Group tasks by priority
    grouped = {p: [] for p in priority_order}
    for t in tasks:
        p = t.get("priority", "moyen")
        if p in grouped:
            grouped[p].append(t)

    lines = ["🔔 K-TECHNOLOGY - Alertes Tâches", ""]

    total = len(tasks)
    priorities_label = ", ".join([f"{priority_emoji.get(p, '')} {p.upper()}" for p in priorities])
    lines.append(f"📊 {total} tâche(s) à traiter")
    lines.append(f"Sévérité: {priorities_label}")
    lines.append("")

    for p in priority_order:
        items = grouped.get(p, [])
        if not items or p not in priorities:
            continue
        lines.append(f"{priority_emoji[p]} {p.upper()} ({len(items)})")
        for task in items[:5]:  # Limit to 5 per priority to keep message short
            title = task.get("title", "")[:60]
            due = task.get("due_date", "")
            lines.append(f"  • {title}" + (f" (📅{due})" if due else ""))
        if len(items) > 5:
            lines.append(f"  ... et {len(items) - 5} autre(s)")
        lines.append("")

    if custom_message:
        lines.extend([f"💬 {custom_message}", ""])

    lines.append(f"— {sender_name}")
    return "\n".join(lines)


@router.post("/bulk")
async def send_bulk_alerts(alert_data: BulkAlertRequest, request: Request):
    """Send bulk SMS/WhatsApp alerts for tasks filtered by priority"""
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)

    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Seuls les administrateurs peuvent envoyer des alertes groupées")

    # Build task filter
    task_filter = {"priority": {"$in": alert_data.priorities}}
    if alert_data.only_pending:
        task_filter["status"] = {"$ne": "completed"}

    tasks = await db.tasks.find(task_filter, {"_id": 0}).sort("priority", 1).to_list(100)

    if not tasks:
        raise HTTPException(
            status_code=404,
            detail=f"Aucune tâche trouvée avec les sévérités: {', '.join(alert_data.priorities)}"
        )

    # Get Twilio client
    client = _get_twilio_client()

    if alert_data.channel == "sms":
        sender_number = os.environ.get("TWILIO_PHONE_NUMBER", "").strip()
        if not sender_number or sender_number == "+1234567890":
            raise HTTPException(status_code=500, detail="TWILIO_PHONE_NUMBER non configuré")
    else:
        sender_number = os.environ.get("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886").strip()
        if not sender_number.startswith("whatsapp:"):
            sender_number = f"whatsapp:{sender_number}"

    sender_name = user.get("name", user.get("email", "K-Technology"))
    message_body = _build_bulk_summary_message(
        tasks, alert_data.priorities, alert_data.custom_message, sender_name
    )

    results = {"success": [], "failed": []}
    user_id = user.get("user_id") or user.get("email")

    for recipient in alert_data.recipients:
        try:
            normalized_to = _normalize_phone(recipient, alert_data.channel)

            def _send():
                return client.messages.create(
                    body=message_body,
                    from_=sender_number,
                    to=normalized_to
                )

            msg = await asyncio.to_thread(_send)
            results["success"].append({
                "recipient": recipient,
                "message_sid": msg.sid,
                "status": msg.status
            })

            await db.alert_logs.insert_one({
                "sent_by": user_id,
                "task_id": "bulk",
                "priorities": alert_data.priorities,
                "task_count": len(tasks),
                "channel": alert_data.channel,
                "recipient": recipient,
                "message_sid": msg.sid,
                "status": msg.status,
                "sent_at": datetime.now(timezone.utc).isoformat()
            })
        except TwilioRestException as e:
            results["failed"].append({"recipient": recipient, "error": e.msg if hasattr(e, 'msg') else str(e)})
        except Exception as e:
            results["failed"].append({"recipient": recipient, "error": str(e)})

    if not results["success"] and results["failed"]:
        raise HTTPException(status_code=500, detail=f"Échec de l'envoi: {results['failed'][0]['error']}")

    return {
        "status": "success" if not results["failed"] else "partial",
        "message": f"Alerte {alert_data.channel.upper()} envoyée à {len(results['success'])} destinataire(s) pour {len(tasks)} tâche(s)",
        "task_count": len(tasks),
        "channel": alert_data.channel,
        "results": results
    }
