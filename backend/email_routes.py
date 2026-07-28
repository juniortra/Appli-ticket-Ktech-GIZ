import os
import asyncio
import base64
import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
import resend

from auth_utils import get_any_authenticated_user
from pdf_generator import generate_form_pdf

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/email", tags=["email"])


class SendReportRequest(BaseModel):
    form_type: str  # 'frm', 'fdi', 'rdd', 'rdi'
    form_id: str
    recipients: List[EmailStr]
    cc: Optional[List[EmailStr]] = []
    bcc: Optional[List[EmailStr]] = []
    subject: str
    message: str
    include_pdf: bool = True


def get_db(request: Request):
    return request.app.state.db


def _build_html_body(user_name: str, message: str, form_type: str, form_data: dict) -> str:
    """Build the HTML email body"""
    titles = {
        'frm': 'Fiche de Réception de Matériel',
        'fdi': "Fiche d'Intervention",
        'rdd': 'Rapport de Diagnostic',
        'rdi': "Rapport d'Incident"
    }
    form_title = titles.get(form_type.lower(), 'Rapport')

    # Format the personal message for display
    formatted_message = message.replace('\n', '<br/>')

    # Build a summary based on form type
    summary_rows = []
    if form_type.lower() == 'frm':
        summary_rows = [
            ('N° Fiche', form_data.get('numero_fiche', '-')),
            ('Date', form_data.get('date', '-')),
            ('Projet / Site', form_data.get('projet_site', '-')),
            ('Fournisseur', form_data.get('fournisseur', '-')),
        ]
    elif form_type.lower() == 'fdi':
        summary_rows = [
            ('N° Fiche', form_data.get('numero_fiche', '-')),
            ('Date', form_data.get('date', '-')),
            ('Projet / Site', form_data.get('projet_site', '-')),
            ('Priorité', form_data.get('priorite', '-').upper()),
            ('Statut', form_data.get('statut', '-').replace('_', ' ').upper()),
        ]
    elif form_type.lower() == 'rdd':
        summary_rows = [
            ('Date', form_data.get('date', '-')),
            ('Projet', form_data.get('projet', '-')),
            ('Utilisateur', form_data.get('utilisateur', '-')),
            ('Matériel', f"{form_data.get('marque', '')} {form_data.get('modele', '')}"),
        ]
    elif form_type.lower() == 'rdi':
        summary_rows = [
            ("Date de l'incident", form_data.get('date_incident', '-')),
            ('Lieu', form_data.get('lieu', '-')),
            ('Objet', form_data.get('objet', '-')),
            ('Statut', form_data.get('statut', '-').replace('_', ' ').upper()),
        ]

    summary_html = ''.join([
        f'<tr><td style="padding:8px;border:1px solid #E2E8F0;background:#F1F5F9;font-weight:bold;color:#1E3A5F;">{label}</td>'
        f'<td style="padding:8px;border:1px solid #E2E8F0;color:#334155;">{value}</td></tr>'
        for label, value in summary_rows
    ])

    return f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#F1F5F9;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F1F5F9;padding:20px 0;">
        <tr>
            <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background-color:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color:#2563EB;padding:24px;text-align:center;">
                            <h1 style="color:#FFFFFF;margin:0;font-size:24px;font-weight:bold;">K-TECHNOLOGY</h1>
                            <p style="color:#DBEAFE;margin:4px 0 0 0;font-size:12px;">Expertise & Innovation</p>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding:32px 24px;">
                            <h2 style="color:#1E3A5F;margin:0 0 16px 0;font-size:20px;">{form_title}</h2>
                            <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px 0;">
                                Bonjour,<br/><br/>
                                {formatted_message}
                            </p>
                            <div style="background-color:#F8FAFC;border-left:4px solid #2563EB;padding:12px 16px;margin:20px 0;">
                                <p style="color:#64748B;font-size:12px;margin:0 0 4px 0;">Envoyé par :</p>
                                <p style="color:#1E3A5F;font-size:14px;font-weight:bold;margin:0;">{user_name}</p>
                            </div>
                            <h3 style="color:#1E3A5F;margin:24px 0 12px 0;font-size:16px;">Résumé de la fiche</h3>
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;font-size:13px;">
                                {summary_html}
                            </table>
                            <p style="color:#64748B;font-size:12px;margin:24px 0 0 0;font-style:italic;">
                                📎 Le rapport complet est joint à ce message en pièce jointe (PDF).
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#1E3A5F;padding:20px 24px;text-align:center;">
                            <p style="color:#CBD5E1;margin:0;font-size:12px;">
                                K-Technology | Abidjan Cocody - Djibi lot 2409<br/>
                                21 BP 606 Abidjan 21 - République de la Côte d'Ivoire
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""


@router.post("/send-report")
async def send_report(email_data: SendReportRequest, request: Request):
    """Send a form report by email with PDF attachment"""
    db = get_db(request)
    user = await get_any_authenticated_user(request, db)

    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    if not api_key or api_key == "your_resend_api_key_here":
        raise HTTPException(
            status_code=500,
            detail="Le service d'email n'est pas configuré. Veuillez ajouter votre clé API Resend dans le fichier .env"
        )

    resend.api_key = api_key
    sender_email = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")

    # Fetch the form data
    form_type = email_data.form_type.lower()
    collection_name = f"{form_type}_forms"
    if form_type not in ['frm', 'fdi', 'rdd', 'rdi']:
        raise HTTPException(status_code=400, detail="Type de fiche invalide")

    form_data = await db[collection_name].find_one({"form_id": email_data.form_id}, {"_id": 0})
    if not form_data:
        raise HTTPException(status_code=404, detail="Fiche non trouvée")

    # Authorization check
    user_id = user.get("user_id") or user.get("email")
    if user["role"] != "admin" and form_data.get("created_by") != user_id:
        raise HTTPException(status_code=403, detail="Non autorisé")

    # Build HTML body
    html_content = _build_html_body(
        user_name=user.get("name", user.get("email", "K-Technology")),
        message=email_data.message,
        form_type=form_type,
        form_data=form_data
    )

    # Build email params
    params = {
        "from": sender_email,
        "to": email_data.recipients,
        "subject": email_data.subject,
        "html": html_content,
        "reply_to": user.get("email"),
    }

    if email_data.cc:
        params["cc"] = email_data.cc
    if email_data.bcc:
        params["bcc"] = email_data.bcc

    # Attach PDF if requested
    if email_data.include_pdf:
        try:
            pdf_bytes = generate_form_pdf(form_type, form_data)
            pdf_b64 = base64.b64encode(pdf_bytes).decode('utf-8')
            filename = f"{form_type.upper()}_{form_data.get('form_id', 'rapport')}.pdf"
            params["attachments"] = [{
                "filename": filename,
                "content": pdf_b64,
            }]
        except Exception as e:
            logger.error(f"Failed to generate PDF: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Erreur lors de la génération du PDF: {str(e)}")

    # Send email asynchronously
    try:
        email_result = await asyncio.to_thread(resend.Emails.send, params)

        # Log the email in database
        await db.email_logs.insert_one({
            "sent_by": user_id,
            "form_type": form_type,
            "form_id": email_data.form_id,
            "recipients": email_data.recipients,
            "cc": email_data.cc,
            "bcc": email_data.bcc,
            "subject": email_data.subject,
            "email_id": email_result.get("id") if isinstance(email_result, dict) else None,
            "sent_at": __import__('datetime').datetime.utcnow().isoformat(),
        })

        return {
            "status": "success",
            "message": f"Email envoyé avec succès à {len(email_data.recipients)} destinataire(s)",
            "email_id": email_result.get("id") if isinstance(email_result, dict) else None
        }
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Échec de l'envoi de l'email: {str(e)}")


@router.get("/download-pdf/{form_type}/{form_id}")
async def download_pdf(form_type: str, form_id: str, request: Request):
    """Download a form as PDF"""
    from fastapi.responses import Response

    db = get_db(request)
    user = await get_any_authenticated_user(request, db)

    form_type = form_type.lower()
    if form_type not in ['frm', 'fdi', 'rdd', 'rdi']:
        raise HTTPException(status_code=400, detail="Type de fiche invalide")

    collection_name = f"{form_type}_forms"
    form_data = await db[collection_name].find_one({"form_id": form_id}, {"_id": 0})
    if not form_data:
        raise HTTPException(status_code=404, detail="Fiche non trouvée")

    user_id = user.get("user_id") or user.get("email")
    if user["role"] != "admin" and form_data.get("created_by") != user_id:
        raise HTTPException(status_code=403, detail="Non autorisé")

    pdf_bytes = generate_form_pdf(form_type, form_data)
    filename = f"{form_type.upper()}_{form_id}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
