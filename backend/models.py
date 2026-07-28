from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime
import uuid

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str = Field(default_factory=lambda: f"user_{uuid.uuid4().hex[:12]}")
    email: str
    name: str
    role: Literal["user", "admin"] = "user"
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class FRMForm(BaseModel):
    model_config = ConfigDict(extra="ignore")
    form_id: str = Field(default_factory=lambda: f"frm_{uuid.uuid4().hex[:12]}")
    numero_fiche: str
    projet_site: str
    departement: str
    date: str
    intervenants: str
    fournisseur: str
    materiel_items: List[dict]
    verification_status: Literal["conforme", "non_conforme"]
    verification_observations: Optional[str] = None
    validation_quantite: Literal["conforme", "non_conforme"]
    validation_specifications: Literal["conforme", "non_conforme"]
    tests_fonctionnement: Literal["valide", "non_valide"]
    defauts: Literal["aucun", "a_notifier"]
    validation_observations: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: Literal["draft", "submitted", "approved", "rejected"] = "submitted"

class FDIForm(BaseModel):
    model_config = ConfigDict(extra="ignore")
    form_id: str = Field(default_factory=lambda: f"fdi_{uuid.uuid4().hex[:12]}")
    numero_fiche: str
    date: str
    projet_site: str
    intervenants: str
    utilisateurs: str
    service_departement: str
    types_intervention: List[str]
    autre_intervention: Optional[str] = None
    priorite: Literal["urgent", "normal", "faible"]
    statut: Literal["en_cours", "termine", "en_attente"]
    observations: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class RDDForm(BaseModel):
    model_config = ConfigDict(extra="ignore")
    form_id: str = Field(default_factory=lambda: f"rdd_{uuid.uuid4().hex[:12]}")
    date: str
    projet: str
    utilisateur: str
    marque: str
    modele: str
    numero_serie: str
    processeur: str
    ram: str
    stockage: str
    systeme_exploitation: str
    probleme_constate: str
    cause_probable: str
    solution_recommandee: str
    techniciens: str
    contacts: str
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class RDIForm(BaseModel):
    model_config = ConfigDict(extra="ignore")
    form_id: str = Field(default_factory=lambda: f"rdi_{uuid.uuid4().hex[:12]}")
    date_incident: str
    lieu: str
    redige_par: str
    objet: str
    resume: str
    analyse_cause: str
    conclusion: str
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    statut: Literal["ouvert", "en_cours", "resolu", "ferme"] = "ouvert"

class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    task_id: str = Field(default_factory=lambda: f"task_{uuid.uuid4().hex[:12]}")
    title: str
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: Literal["urgent", "normal", "faible"]
    status: Literal["todo", "in_progress", "completed"]
    due_date: str
    related_form_type: Optional[str] = None
    related_form_id: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None