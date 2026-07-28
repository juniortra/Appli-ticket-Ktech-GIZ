from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from io import BytesIO
from datetime import datetime

# K-Technology brand colors
PRIMARY_COLOR = HexColor('#2563EB')
SECONDARY_COLOR = HexColor('#4A6FA5')
DARK_COLOR = HexColor('#1E3A5F')
LIGHT_GRAY = HexColor('#F1F5F9')
BORDER_GRAY = HexColor('#CBD5E1')


def _get_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name='CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=DARK_COLOR,
        spaceAfter=12,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    ))
    styles.add(ParagraphStyle(
        name='SectionHeader',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=white,
        backColor=PRIMARY_COLOR,
        spaceAfter=6,
        spaceBefore=12,
        leftIndent=6,
        rightIndent=6,
        borderPadding=6,
        fontName='Helvetica-Bold'
    ))
    styles.add(ParagraphStyle(
        name='FieldLabel',
        parent=styles['Normal'],
        fontSize=9,
        textColor=SECONDARY_COLOR,
        fontName='Helvetica-Bold'
    ))
    styles.add(ParagraphStyle(
        name='FieldValue',
        parent=styles['Normal'],
        fontSize=10,
        textColor=black,
        fontName='Helvetica'
    ))
    return styles


def _header_footer(canvas, doc):
    canvas.saveState()
    # Header
    canvas.setFillColor(PRIMARY_COLOR)
    canvas.rect(0, A4[1] - 1.5 * cm, A4[0], 1.5 * cm, fill=1, stroke=0)
    canvas.setFillColor(white)
    canvas.setFont('Helvetica-Bold', 14)
    canvas.drawString(2 * cm, A4[1] - 1 * cm, 'K-TECHNOLOGY')
    canvas.setFont('Helvetica', 9)
    canvas.drawRightString(A4[0] - 2 * cm, A4[1] - 1 * cm, 'Expertise & Innovation')

    # Footer
    canvas.setFillColor(SECONDARY_COLOR)
    canvas.setFont('Helvetica', 8)
    canvas.drawString(2 * cm, 1 * cm, 'Abidjan Cocody - Djibi lot 2409 - Ilot 275 - 21 BP 606 Abidjan 21')
    canvas.drawRightString(A4[0] - 2 * cm, 1 * cm, f'Page {doc.page}')
    canvas.restoreState()


def _build_info_table(data_rows):
    """Build a two-column info table"""
    table_data = []
    for label, value in data_rows:
        table_data.append([
            Paragraph(f'<b>{label}</b>', getSampleStyleSheet()['Normal']),
            Paragraph(str(value) if value else '-', getSampleStyleSheet()['Normal'])
        ])
    table = Table(table_data, colWidths=[5 * cm, 12 * cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
        ('TEXTCOLOR', (0, 0), (0, -1), DARK_COLOR),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    return table


def generate_form_pdf(form_type: str, form_data: dict) -> bytes:
    """Generate PDF for any form type. Returns PDF as bytes."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=2 * cm, leftMargin=2 * cm,
        topMargin=2.5 * cm, bottomMargin=1.5 * cm
    )
    styles = _get_styles()
    elements = []

    # Title based on form type
    titles = {
        'frm': 'FICHE DE RÉCEPTION DE MATÉRIEL',
        'fdi': "FICHE D'INTERVENTION",
        'rdd': 'RAPPORT DE DIAGNOSTIC',
        'rdi': "RAPPORT D'INCIDENT"
    }
    title = titles.get(form_type.lower(), 'RAPPORT')
    elements.append(Paragraph(title, styles['CustomTitle']))
    elements.append(Spacer(1, 0.3 * cm))

    if form_type.lower() == 'frm':
        elements.append(Paragraph('Informations générales', styles['SectionHeader']))
        elements.append(Spacer(1, 0.2 * cm))
        elements.append(_build_info_table([
            ('N° Fiche', form_data.get('numero_fiche')),
            ('Date', form_data.get('date')),
            ('Projet / Site', form_data.get('projet_site')),
            ('Département', form_data.get('departement')),
            ('Intervenant(s)', form_data.get('intervenants')),
            ('Fournisseur', form_data.get('fournisseur')),
        ]))
        elements.append(Spacer(1, 0.5 * cm))

        elements.append(Paragraph('Vérification et validation', styles['SectionHeader']))
        elements.append(Spacer(1, 0.2 * cm))
        elements.append(_build_info_table([
            ('Vérification commande', form_data.get('verification_status')),
            ('Vérification quantité', form_data.get('validation_quantite')),
            ('Vérification spécifications', form_data.get('validation_specifications')),
            ('Tests de fonctionnement', form_data.get('tests_fonctionnement')),
            ('Défauts constatés', form_data.get('defauts')),
        ]))

        if form_data.get('validation_observations'):
            elements.append(Spacer(1, 0.3 * cm))
            elements.append(Paragraph('Observations', styles['SectionHeader']))
            elements.append(Spacer(1, 0.2 * cm))
            elements.append(Paragraph(form_data.get('validation_observations'), styles['Normal']))

    elif form_type.lower() == 'fdi':
        elements.append(Paragraph('Informations générales', styles['SectionHeader']))
        elements.append(Spacer(1, 0.2 * cm))
        elements.append(_build_info_table([
            ('N° Fiche', form_data.get('numero_fiche')),
            ('Date', form_data.get('date')),
            ('Projet / Site', form_data.get('projet_site')),
            ('Intervenant(s)', form_data.get('intervenants')),
            ('Utilisateur(s)', form_data.get('utilisateurs')),
            ('Service / Département', form_data.get('service_departement')),
            ('Priorité', form_data.get('priorite', '').upper()),
            ('Statut', form_data.get('statut', '').replace('_', ' ').upper()),
        ]))
        elements.append(Spacer(1, 0.5 * cm))

        elements.append(Paragraph("Types d'intervention", styles['SectionHeader']))
        elements.append(Spacer(1, 0.2 * cm))
        types_str = ', '.join(form_data.get('types_intervention', [])) or 'Aucun'
        elements.append(Paragraph(types_str, styles['Normal']))

        if form_data.get('observations'):
            elements.append(Spacer(1, 0.3 * cm))
            elements.append(Paragraph('Observations', styles['SectionHeader']))
            elements.append(Spacer(1, 0.2 * cm))
            elements.append(Paragraph(form_data.get('observations'), styles['Normal']))

    elif form_type.lower() == 'rdd':
        elements.append(Paragraph('Informations générales', styles['SectionHeader']))
        elements.append(Spacer(1, 0.2 * cm))
        elements.append(_build_info_table([
            ('Date', form_data.get('date')),
            ('Projet', form_data.get('projet')),
            ('Utilisateur', form_data.get('utilisateur')),
        ]))
        elements.append(Spacer(1, 0.5 * cm))

        elements.append(Paragraph('Identification du matériel', styles['SectionHeader']))
        elements.append(Spacer(1, 0.2 * cm))
        elements.append(_build_info_table([
            ('Marque', form_data.get('marque')),
            ('Modèle', form_data.get('modele')),
            ('N° de série', form_data.get('numero_serie')),
            ('Processeur', form_data.get('processeur')),
            ('Mémoire RAM', form_data.get('ram')),
            ('Stockage', form_data.get('stockage')),
            ("Système d'exploitation", form_data.get('systeme_exploitation')),
        ]))
        elements.append(Spacer(1, 0.5 * cm))

        elements.append(Paragraph('Diagnostic', styles['SectionHeader']))
        elements.append(Spacer(1, 0.2 * cm))
        elements.append(_build_info_table([
            ('Problème constaté', form_data.get('probleme_constate')),
            ('Cause probable', form_data.get('cause_probable')),
            ('Solution recommandée', form_data.get('solution_recommandee')),
            ('Technicien(s)', form_data.get('techniciens')),
            ('Contact(s)', form_data.get('contacts')),
        ]))

    elif form_type.lower() == 'rdi':
        elements.append(Paragraph("Informations sur l'incident", styles['SectionHeader']))
        elements.append(Spacer(1, 0.2 * cm))
        elements.append(_build_info_table([
            ("Date de l'incident", form_data.get('date_incident')),
            ('Lieu', form_data.get('lieu')),
            ('Rédigé par', form_data.get('redige_par')),
            ('Objet', form_data.get('objet')),
            ('Statut', form_data.get('statut', '').replace('_', ' ').upper()),
        ]))
        elements.append(Spacer(1, 0.5 * cm))

        elements.append(Paragraph('Résumé', styles['SectionHeader']))
        elements.append(Spacer(1, 0.2 * cm))
        elements.append(Paragraph(form_data.get('resume', '-'), styles['Normal']))
        elements.append(Spacer(1, 0.3 * cm))

        elements.append(Paragraph('Analyse de la cause racine', styles['SectionHeader']))
        elements.append(Spacer(1, 0.2 * cm))
        elements.append(Paragraph(form_data.get('analyse_cause', '-'), styles['Normal']))
        elements.append(Spacer(1, 0.3 * cm))

        elements.append(Paragraph('Conclusion', styles['SectionHeader']))
        elements.append(Spacer(1, 0.2 * cm))
        elements.append(Paragraph(form_data.get('conclusion', '-'), styles['Normal']))

    # Footer info
    elements.append(Spacer(1, 1 * cm))
    elements.append(Paragraph(
        f'<i>Document généré le {datetime.now().strftime("%d/%m/%Y à %H:%M")}</i>',
        styles['Normal']
    ))

    doc.build(elements, onFirstPage=_header_footer, onLaterPages=_header_footer)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
