# Système de Gestion de Maintenance K-Technology

## Vue d'ensemble

Application complète de gestion de maintenance technique comprenant :
- 4 types de formulaires (FRM, FDI, RDD, RDI)
- Tableau de bord analytique avec graphiques
- Planificateur de tâches
- Génération de rapports
- Gestion des utilisateurs (Admin/User)

## Architecture Technique

### Backend
- **Framework**: FastAPI (Python)
- **Base de données**: MongoDB
- **Authentification**: JWT + Google OAuth (Emergent Auth)
- **API**: Routes RESTful avec préfixe `/api`

### Frontend
- **Framework**: React 19
- **UI Library**: Shadcn/UI + Tailwind CSS
- **Routing**: React Router v7
- **Charts**: Recharts
- **État**: Context API

### Stack complet
```
Frontend (React) → Backend (FastAPI) → MongoDB
     ↓                    ↓
  Port 3000          Port 8001
```

## Credentials par défaut

### Compte Administrateur
- **Email**: admin@ktechnology.ci
- **Mot de passe**: Admin@2026
- **Rôle**: admin

## Tutoriel d'implémentation

### 1. Prérequis

- Node.js 18+ et Yarn
- Python 3.11+
- MongoDB 5.0+
- Git

### 2. Installation Backend

```bash
cd backend

# Créer l'environnement virtuel
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows

# Installer les dépendances
pip install -r requirements.txt

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos valeurs
```

#### Configuration `.env` Backend

```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="ktechnology_db"
CORS_ORIGINS="http://localhost:3000"
JWT_SECRET="votre-secret-jwt-64-caracteres-hex"
ADMIN_EMAIL="admin@ktechnology.ci"
ADMIN_PASSWORD="Admin@2026"
FRONTEND_URL="http://localhost:3000"
```

#### Démarrer le backend

```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Le backend sera accessible sur `http://localhost:8001`

### 3. Installation Frontend

```bash
cd frontend

# Installer les dépendances
yarn install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos valeurs
```

#### Configuration `.env` Frontend

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

#### Démarrer le frontend

```bash
yarn start
```

Le frontend sera accessible sur `http://localhost:3000`

### 4. Structure des Données MongoDB

#### Collection `users`
```javascript
{
  user_id: "user_abc123",
  email: "user@example.com",
  password_hash: "$2b$12$...",
  name: "Nom Utilisateur",
  role: "user" | "admin",
  picture: "https://...",
  created_at: ISODate("...")
}
```

#### Collection `fdi_forms` (Fiches d'Intervention)
```javascript
{
  form_id: "fdi_abc123",
  numero_fiche: "FDI-001",
  date: "2026-01-15",
  projet_site: "Bureau GIZ",
  intervenants: "Jean Dupont",
  utilisateurs: "Marie Martin",
  service_departement: "IT Support",
  types_intervention: ["Installation logiciel", "Configuration réseau"],
  autre_intervention: "",
  priorite: "urgent" | "normal" | "faible",
  statut: "en_cours" | "termine" | "en_attente",
  observations: "...",
  created_by: "user_abc123",
  created_at: "2026-01-15T10:30:00Z"
}
```

#### Collection `tasks`
```javascript
{
  task_id: "task_abc123",
  title: "Titre de la tâche",
  description: "Description...",
  assigned_to: "user_abc123",
  priority: "urgent" | "normal" | "faible",
  status: "todo" | "in_progress" | "completed",
  due_date: "2026-01-20",
  related_form_type: "fdi",
  related_form_id: "fdi_abc123",
  created_by: "admin_001",
  created_at: "2026-01-15T10:30:00Z",
  completed_at: null
}
```

### 5. Endpoints API Principaux

#### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Profil utilisateur
- `POST /api/auth/logout` - Déconnexion
- `POST /api/auth/google/callback` - OAuth Google

#### Formulaires
- `GET /api/forms/fdi` - Liste des FDI
- `POST /api/forms/fdi` - Créer FDI
- `GET /api/forms/fdi/{id}` - Détail FDI
- `PUT /api/forms/fdi/{id}` - Modifier FDI

*Même structure pour FRM, RDD, RDI*

#### Tâches
- `GET /api/tasks` - Liste des tâches
- `POST /api/tasks` - Créer tâche
- `PUT /api/tasks/{id}` - Modifier tâche
- `DELETE /api/tasks/{id}` - Supprimer tâche

#### Dashboard
- `GET /api/dashboard/stats` - Statistiques complètes

#### Admin
- `GET /api/users` - Liste utilisateurs (admin only)
- `PUT /api/users/{id}` - Modifier utilisateur (admin only)
- `DELETE /api/users/{id}` - Supprimer utilisateur (admin only)

### 6. Fonctionnalités Implémentées

#### ✅ Authentification
- Inscription/Connexion classique (JWT)
- Connexion Google OAuth
- Sessions sécurisées (httpOnly cookies)
- Gestion des rôles (User/Admin)

#### ✅ Formulaires
- **FRM**: Fiche de Réception de Matériel
- **FDI**: Fiche d'Intervention (15 types)
- **RDD**: Rapport de Diagnostic
- **RDI**: Rapport d'Incident

#### ✅ Dashboard
- KPIs en temps réel
- Graphiques interactifs (Recharts)
  - Fiches par type (Bar chart)
  - Statut des interventions (Pie chart)
  - Distribution des priorités
  - Progression des tâches
- Activité récente (30 jours)

#### ✅ Planificateur de Tâches
- Vue en colonnes (À faire, En cours, Terminé)
- Drag & drop (prévu)
- Vue calendrier (interface prête)
- Filtres par priorité et assignation

#### ✅ Rapports
- Export PDF des fiches individuelles
- Rapports d'analyse avec statistiques
- Filtres par période, technicien, type

#### ✅ Admin
- Gestion des utilisateurs
- Modification des rôles
- Suppression de comptes

### 7. Sécurité

- ✅ Hachage des mots de passe (bcrypt)
- ✅ Tokens JWT avec expiration
- ✅ Cookies httpOnly sécurisés
- ✅ CORS configuré
- ✅ Protection CSRF
- ✅ Validation des données (Pydantic)
- ✅ Autorisation par rôle

### 8. Tests

#### Test manuel rapide

```bash
# Tester l'API backend
curl http://localhost:8001/api/

# Tester la connexion
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ktechnology.ci","password":"Admin@2026"}'
```

#### Accès à l'application

1. Ouvrir `http://localhost:3000`
2. Se connecter avec les credentials admin
3. Explorer le dashboard
4. Créer une fiche FDI test
5. Créer une tâche test
6. Vérifier les statistiques

### 9. Déploiement Production

#### Backend

```bash
# Installer les dépendances de production
pip install -r requirements.txt

# Lancer avec Gunicorn
gunicorn server:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8001
```

#### Frontend

```bash
# Build de production
yarn build

# Servir avec nginx ou autre serveur statique
```

### 10. Maintenance

#### Sauvegarde MongoDB

```bash
# Backup
mongodump --db ktechnology_db --out ./backup

# Restore
mongorestore --db ktechnology_db ./backup/ktechnology_db
```

#### Logs

```bash
# Backend logs
tail -f backend.log

# Frontend logs (browser console)
```

### 11. Personnalisation

#### Changer les couleurs

Éditer `/frontend/src/index.css` :

```css
:root {
  --primary: 16 100% 50%;  /* Orange #FF5500 */
  --success: 142 76% 36%;  /* Vert */
  /* ... */
}
```

#### Ajouter un type d'intervention

Éditer `/frontend/src/utils/helpers.js` :

```javascript
export const INTERVENTION_TYPES = [
  'Installation logiciel',
  'Votre nouveau type',
  // ...
];
```

#### Modifier les permissions

Éditer `/backend/auth_utils.py` pour ajuster les règles d'autorisation.

### 12. Support et Documentation

#### Structure du projet

```
/app
├── backend/
│   ├── server.py          # Point d'entrée FastAPI
│   ├── auth_utils.py      # Authentification
│   ├── auth_routes.py     # Routes auth
│   ├── form_routes.py     # Routes formulaires
│   ├── task_routes.py     # Routes tâches
│   ├── dashboard_routes.py # Routes stats
│   ├── user_routes.py     # Routes admin
│   ├── models.py          # Modèles Pydantic
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/         # Pages React
│   │   ├── components/    # Composants réutilisables
│   │   ├── context/       # Context API
│   │   ├── utils/         # Utilitaires
│   │   ├── App.js         # Point d'entrée
│   │   └── index.css      # Styles globaux
│   └── package.json
│
└── README.md
```

#### Liens utiles

- FastAPI Docs: `http://localhost:8001/docs`
- MongoDB Compass: Interface graphique pour MongoDB
- React DevTools: Extension navigateur pour debug

### 13. Troubleshooting

#### Le backend ne démarre pas

```bash
# Vérifier MongoDB
mongosh
# Dans le shell mongo:
show dbs

# Vérifier les ports
lsof -i :8001
```

#### Le frontend ne se connecte pas

1. Vérifier que `REACT_APP_BACKEND_URL` est correct
2. Vérifier CORS dans backend
3. Vérifier les cookies dans les DevTools

#### Erreur d'authentification

1. Vérifier que `JWT_SECRET` est configuré
2. Vérifier les credentials dans MongoDB
3. Vider les cookies du navigateur

## Conclusion

Vous disposez maintenant d'une application complète de gestion de maintenance avec :
- ✅ 4 types de formulaires techniques
- ✅ Dashboard analytique
- ✅ Planificateur de tâches
- ✅ Génération de rapports
- ✅ Gestion utilisateurs
- ✅ Authentification sécurisée

Pour toute question, consultez la documentation des frameworks utilisés ou ouvrez une issue sur le repository Git.

**Bon développement ! 🚀**
