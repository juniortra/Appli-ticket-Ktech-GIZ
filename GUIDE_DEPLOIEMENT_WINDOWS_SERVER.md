# Guide de Déploiement sur Windows Server

## Configuration Système Recommandée

- **OS**: Windows Server 2019/2022
- **RAM**: Minimum 4 GB (8 GB recommandé)
- **Disque**: 50 GB minimum
- **Serveur Web**: IIS 10+ ou nginx pour Windows

---

## Étape 1 : Installation des Prérequis

### 1.1 Installer Python 3.11+

1. Télécharger Python depuis https://www.python.org/downloads/windows/
2. Exécuter l'installeur **en tant qu'administrateur**
3. ✅ **IMPORTANT**: Cocher "Add Python to PATH"
4. Choisir "Customize installation"
5. Cocher toutes les options (pip, tcl/tk, py launcher)
6. Installer dans `C:\Python311`

**Vérifier l'installation:**
```cmd
python --version
pip --version
```

### 1.2 Installer Node.js et Yarn

1. Télécharger Node.js 18+ LTS depuis https://nodejs.org/
2. Installer avec les options par défaut
3. Ouvrir PowerShell **en tant qu'administrateur**:

```powershell
# Vérifier Node.js
node --version
npm --version

# Installer Yarn globalement
npm install -g yarn
yarn --version
```

### 1.3 Installer MongoDB

#### Option A: MongoDB Community (Recommandé pour production)

1. Télécharger MongoDB Community Server depuis https://www.mongodb.com/try/download/community
2. Choisir la version Windows (.msi)
3. Installer avec "Complete Setup"
4. Cocher "Install MongoDB as a Service" (important!)
5. Service Name: `MongoDB`
6. Data Directory: `C:\Program Files\MongoDB\Server\7.0\data`
7. Log Directory: `C:\Program Files\MongoDB\Server\7.0\log`

**Vérifier MongoDB:**
```cmd
# Ouvrir l'invite de commande
sc query MongoDB
# Doit afficher "RUNNING"

# Tester la connexion
mongosh
# Dans le shell mongo:
show dbs
exit
```

#### Option B: MongoDB Atlas (Cloud - Plus simple)

Si vous préférez une solution cloud sans installation locale:
1. Créer un compte sur https://www.mongodb.com/cloud/atlas/register
2. Créer un cluster gratuit (M0)
3. Configurer l'accès réseau (IP Whitelist: autoriser 0.0.0.0/0 pour test)
4. Créer un utilisateur de base de données
5. Récupérer la connection string: `mongodb+srv://user:password@cluster.mongodb.net/`

### 1.4 Installer Git (Optionnel mais recommandé)

Télécharger depuis https://git-scm.com/download/win et installer

---

## Étape 2 : Déploiement de l'Application

### 2.1 Créer la Structure de Dossiers

```cmd
# Créer le dossier principal
mkdir C:\inetpub\ktechnology
cd C:\inetpub\ktechnology

# Créer les sous-dossiers
mkdir backend
mkdir frontend
mkdir logs
```

### 2.2 Copier les Fichiers de l'Application

**Option 1: Avec Git**
```cmd
cd C:\inetpub\ktechnology
git clone <votre-repository-url> .
```

**Option 2: Copie Manuelle**
1. Copier tous les fichiers du dossier `/app/backend` vers `C:\inetpub\ktechnology\backend`
2. Copier tous les fichiers du dossier `/app/frontend` vers `C:\inetpub\ktechnology\frontend`

### 2.3 Configuration Backend

```cmd
cd C:\inetpub\ktechnology\backend

# Créer l'environnement virtuel Python
python -m venv venv

# Activer l'environnement virtuel
venv\Scripts\activate

# Installer les dépendances
pip install -r requirements.txt

# Désactiver pour l'instant
deactivate
```

### 2.4 Configuration du fichier .env Backend

Créer le fichier `C:\inetpub\ktechnology\backend\.env`:

```env
# Pour MongoDB Local
MONGO_URL=mongodb://localhost:27017
DB_NAME=ktechnology_production

# Pour MongoDB Atlas
# MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
# DB_NAME=ktechnology_production

# Sécurité
JWT_SECRET=GENERER_UN_SECRET_SECURISE_64_CARACTERES_HEX
ADMIN_EMAIL=admin@votre-domaine.com
ADMIN_PASSWORD=MotDePasseSecurise123!

# URLs
CORS_ORIGINS=http://votre-domaine.com,https://votre-domaine.com
FRONTEND_URL=http://votre-domaine.com
```

**Générer un JWT_SECRET sécurisé:**
```powershell
# Dans PowerShell
$bytes = New-Object byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
[BitConverter]::ToString($bytes).Replace("-","").ToLower()
# Copier le résultat dans JWT_SECRET
```

### 2.5 Build du Frontend

```cmd
cd C:\inetpub\ktechnology\frontend

# Installer les dépendances
yarn install

# Créer le fichier .env de production
echo REACT_APP_BACKEND_URL=http://votre-domaine.com > .env.production

# Ou avec votre IP serveur
echo REACT_APP_BACKEND_URL=http://192.168.1.100 > .env.production

# Build de production
yarn build

# Le dossier 'build' contient maintenant les fichiers statiques
```

---

## Étape 3 : Configuration du Serveur Web

### Option A : IIS (Internet Information Services)

#### 3.1 Activer IIS

1. Ouvrir **Server Manager** → **Add Roles and Features**
2. Cocher **Web Server (IIS)**
3. Fonctionnalités à activer:
   - Static Content
   - Default Document
   - HTTP Errors
   - HTTP Redirection
   - WebSocket Protocol (important!)
   - Application Development → WebSocket Protocol

4. Installer **URL Rewrite Module** depuis: https://www.iis.net/downloads/microsoft/url-rewrite

#### 3.2 Configurer le Site Frontend dans IIS

1. Ouvrir **Internet Information Services (IIS) Manager**
2. Clic droit sur **Sites** → **Add Website**
   - Site name: `KTechnology-Frontend`
   - Physical path: `C:\inetpub\ktechnology\frontend\build`
   - Binding: 
     - Type: http
     - IP: All Unassigned
     - Port: 80
     - Hostname: (vide ou votre-domaine.com)

3. Configuration du web.config pour React Router

Créer `C:\inetpub\ktechnology\frontend\build\web.config`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="React Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <add input="{REQUEST_URI}" pattern="^/(api)" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".woff" mimeType="application/font-woff" />
      <mimeMap fileExtension=".woff2" mimeType="application/font-woff2" />
    </staticContent>
  </system.webServer>
</configuration>
```

#### 3.3 Configurer le Backend comme Service Windows

**Installer NSSM (Non-Sucking Service Manager):**

1. Télécharger depuis https://nssm.cc/download
2. Extraire dans `C:\Program Files\nssm`
3. Ajouter au PATH système

**Créer le Service Backend:**

```cmd
# Ouvrir PowerShell en Administrateur
cd "C:\Program Files\nssm\win64"

# Créer le service
nssm install KTechnology-Backend

# Dans l'interface NSSM:
# Path: C:\inetpub\ktechnology\backend\venv\Scripts\python.exe
# Startup directory: C:\inetpub\ktechnology\backend
# Arguments: -m uvicorn server:app --host 0.0.0.0 --port 8001

# Onglet Details:
# Display name: K-Technology Backend API
# Description: Backend API pour K-Technology Maintenance System

# Onglet I/O:
# Output (stdout): C:\inetpub\ktechnology\logs\backend-out.log
# Error (stderr): C:\inetpub\ktechnology\logs\backend-error.log

# Cliquer "Install service"
```

**Démarrer le Service:**

```cmd
# Démarrer le service
nssm start KTechnology-Backend

# Vérifier le statut
nssm status KTechnology-Backend

# Pour configurer le démarrage automatique
sc config KTechnology-Backend start=auto
```

#### 3.4 Configurer le Reverse Proxy IIS pour le Backend

1. Dans IIS Manager, clic droit sur le site Frontend → **URL Rewrite**
2. Ajouter une règle **Reverse Proxy**

Si le module Reverse Proxy n'est pas disponible, installer **Application Request Routing (ARR)**:
- Télécharger depuis: https://www.iis.net/downloads/microsoft/application-request-routing
- Installer, puis redémarrer IIS Manager

3. Dans URL Rewrite, ajouter cette règle:

```xml
<!-- Ajouter dans web.config sous <rules> -->
<rule name="API Proxy" stopProcessing="true">
  <match url="^api/(.*)" />
  <action type="Rewrite" url="http://localhost:8001/api/{R:1}" />
</rule>
```

Le `web.config` complet devient:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <!-- Règle pour le proxy API (AVANT React Routes) -->
        <rule name="API Proxy" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://localhost:8001/api/{R:1}" />
          <serverVariables>
            <set name="HTTP_X_ORIGINAL_HOST" value="{HTTP_HOST}" />
          </serverVariables>
        </rule>
        
        <!-- Règle pour React Router -->
        <rule name="React Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
    </staticContent>
  </system.webServer>
</configuration>
```

### Option B : nginx pour Windows (Alternative)

#### 3.1 Installer nginx

1. Télécharger nginx Windows depuis http://nginx.org/en/download.html
2. Extraire dans `C:\nginx`

#### 3.2 Configuration nginx

Créer `C:\nginx\conf\ktechnology.conf`:

```nginx
server {
    listen 80;
    server_name votre-domaine.com;
    
    # Frontend (fichiers statiques React)
    location / {
        root C:/inetpub/ktechnology/frontend/build;
        try_files $uri $uri/ /index.html;
        
        # Headers CORS
        add_header Access-Control-Allow-Origin *;
    }
    
    # Backend API (proxy vers FastAPI)
    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Modifier `C:\nginx\conf\nginx.conf`:

```nginx
http {
    include mime.types;
    default_type application/octet-stream;
    
    sendfile on;
    keepalive_timeout 65;
    
    # Inclure la configuration K-Technology
    include ktechnology.conf;
}
```

#### 3.3 nginx comme Service Windows

```cmd
# Dans PowerShell Administrateur
cd C:\nginx

# Tester la configuration
nginx -t

# Démarrer nginx
start nginx

# Installer comme service avec NSSM
nssm install nginx C:\nginx\nginx.exe
nssm start nginx
```

---

## Étape 4 : Initialisation de la Base de Données

```cmd
cd C:\inetpub\ktechnology\backend
venv\Scripts\activate

# Lancer Python
python

# Dans le shell Python:
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
from datetime import datetime, timezone
from auth_utils import hash_password

async def init_db():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["ktechnology_production"]
    
    # Créer l'utilisateur admin
    admin_hash = hash_password("MotDePasseSecurise123!")
    await db.users.insert_one({
        "user_id": "admin_001",
        "email": "admin@votre-domaine.com",
        "password_hash": admin_hash,
        "name": "Administrateur",
        "role": "admin",
        "created_at": datetime.now(timezone.utc)
    })
    
    # Créer les index
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    
    print("✓ Base de données initialisée avec succès!")
    client.close()

# Exécuter
asyncio.run(init_db())
exit()
```

---

## Étape 5 : Sécurisation

### 5.1 Pare-feu Windows

```powershell
# Autoriser le port 80 (HTTP)
New-NetFirewallRule -DisplayName "HTTP K-Technology" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow

# Autoriser le port 443 (HTTPS) si configuré
New-NetFirewallRule -DisplayName "HTTPS K-Technology" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow

# Bloquer l'accès direct au backend depuis l'extérieur (optionnel)
# Le backend doit uniquement être accessible via localhost
```

### 5.2 Certificat SSL (HTTPS)

#### Option 1: Certificat Let's Encrypt (Gratuit)

1. Installer **win-acme** depuis https://www.win-acme.com/
2. Exécuter:

```cmd
wacs.exe --target manual --host votre-domaine.com --webroot C:\inetpub\ktechnology\frontend\build
```

#### Option 2: Certificat Commercial

1. Acheter un certificat SSL
2. Installer dans IIS:
   - IIS Manager → Server Certificates → Import
   - Éditer le binding du site → Ajouter binding HTTPS sur port 443

### 5.3 Permissions de Dossiers

```cmd
# Donner les permissions à IIS
icacls "C:\inetpub\ktechnology" /grant "IIS_IUSRS:(OI)(CI)F" /T

# Permissions pour les logs
icacls "C:\inetpub\ktechnology\logs" /grant "SYSTEM:(OI)(CI)F" /T
```

---

## Étape 6 : Monitoring et Maintenance

### 6.1 Créer un Script de Monitoring

Créer `C:\inetpub\ktechnology\scripts\health-check.ps1`:

```powershell
# Health Check Script pour K-Technology

$BackendUrl = "http://localhost:8001/api/"
$FrontendPath = "C:\inetpub\ktechnology\frontend\build\index.html"
$LogFile = "C:\inetpub\ktechnology\logs\health-check.log"

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Vérifier le backend
try {
    $response = Invoke-WebRequest -Uri $BackendUrl -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Add-Content -Path $LogFile -Value "[$timestamp] Backend OK"
    }
} catch {
    Add-Content -Path $LogFile -Value "[$timestamp] Backend ERROR: $_"
    # Redémarrer le service
    nssm restart KTechnology-Backend
}

# Vérifier MongoDB
try {
    $mongoStatus = sc.exe query MongoDB
    if ($mongoStatus -match "RUNNING") {
        Add-Content -Path $LogFile -Value "[$timestamp] MongoDB OK"
    } else {
        net start MongoDB
    }
} catch {
    Add-Content -Path $LogFile -Value "[$timestamp] MongoDB ERROR: $_"
}

# Vérifier le frontend
if (Test-Path $FrontendPath) {
    Add-Content -Path $LogFile -Value "[$timestamp] Frontend files OK"
} else {
    Add-Content -Path $LogFile -Value "[$timestamp] Frontend ERROR: index.html not found"
}
```

### 6.2 Planifier les Tâches

1. Ouvrir **Task Scheduler**
2. Créer une tâche de base:
   - Name: `K-Technology Health Check`
   - Trigger: Daily à 2:00 AM
   - Action: Start a program
   - Program: `powershell.exe`
   - Arguments: `-File C:\inetpub\ktechnology\scripts\health-check.ps1`

### 6.3 Backup MongoDB Automatisé

Créer `C:\inetpub\ktechnology\scripts\backup-mongodb.ps1`:

```powershell
$BackupPath = "C:\Backups\ktechnology"
$Date = Get-Date -Format "yyyy-MM-dd"
$BackupFolder = "$BackupPath\$Date"

# Créer le dossier de backup
New-Item -ItemType Directory -Force -Path $BackupFolder

# Backup MongoDB
mongodump --db ktechnology_production --out $BackupFolder

# Compresser
Compress-Archive -Path $BackupFolder -DestinationPath "$BackupFolder.zip"
Remove-Item -Recurse -Force $BackupFolder

# Supprimer les backups de plus de 30 jours
Get-ChildItem $BackupPath -Filter "*.zip" | Where-Object {$_.CreationTime -lt (Get-Date).AddDays(-30)} | Remove-Item
```

Planifier cette tâche quotidiennement à 1:00 AM.

---

## Étape 7 : Vérification et Tests

### 7.1 Tests de Connectivité

```cmd
# Test du backend
curl http://localhost:8001/api/

# Test du frontend
curl http://localhost/

# Test API depuis le frontend
curl http://localhost/api/
```

### 7.2 Vérifier les Services

```cmd
# Statut MongoDB
sc query MongoDB

# Statut Backend
nssm status KTechnology-Backend

# Statut IIS
iisreset /status

# Ou pour nginx
nginx -t
```

### 7.3 Vérifier les Logs

```cmd
# Logs Backend
type C:\inetpub\ktechnology\logs\backend-out.log
type C:\inetpub\ktechnology\logs\backend-error.log

# Logs MongoDB
type "C:\Program Files\MongoDB\Server\7.0\log\mongod.log"

# Logs IIS
# Dans Event Viewer → Windows Logs → Application
```

---

## Étape 8 : Accès à l'Application

1. **Depuis le serveur**: http://localhost
2. **Depuis le réseau local**: http://ADRESSE_IP_SERVEUR
3. **Depuis Internet** (si configuré): http://votre-domaine.com

**Connexion:**
- Email: admin@votre-domaine.com
- Password: MotDePasseSecurise123!

---

## Troubleshooting Commun

### Problème: "Cannot connect to backend"

```cmd
# Vérifier si le backend écoute
netstat -ano | findstr :8001

# Vérifier les logs
type C:\inetpub\ktechnology\logs\backend-error.log

# Redémarrer le service
nssm restart KTechnology-Backend
```

### Problème: "MongoDB connection failed"

```cmd
# Vérifier MongoDB
sc query MongoDB

# Démarrer si arrêté
net start MongoDB

# Vérifier dans mongosh
mongosh
show dbs
```

### Problème: "404 sur les routes React"

Vérifier que le `web.config` est bien présent dans le dossier `build` et contient les règles de réécriture URL.

### Problème: "CORS errors"

Vérifier dans `backend\.env` que `CORS_ORIGINS` contient l'URL correcte du frontend.

---

## Commandes de Gestion Rapides

```powershell
# Redémarrer tous les services
nssm restart KTechnology-Backend
iisreset
# ou
nginx -s reload

# Voir les logs en temps réel (PowerShell)
Get-Content C:\inetpub\ktechnology\logs\backend-out.log -Wait -Tail 50

# Vérifier l'utilisation mémoire
tasklist | findstr python
tasklist | findstr mongod

# Backup manuel rapide
mongodump --db ktechnology_production --out C:\Backups\manual-backup
```

---

## Optimisations Production

1. **Activer la compression IIS**:
   - IIS Manager → Compression → Enable dynamic and static compression

2. **Configurer le cache**:
   - Dans web.config, ajouter des en-têtes de cache pour les fichiers statiques

3. **Limiter les connexions MongoDB**:
   - Dans le backend, configurer `maxPoolSize` dans la connection string

4. **Monitoring avancé**:
   - Installer **Application Insights** ou **New Relic**

5. **CDN pour les assets statiques**:
   - Utiliser Azure CDN ou Cloudflare

---

## Checklist de Déploiement

- [ ] Python, Node.js, MongoDB installés
- [ ] Application copiée dans `C:\inetpub\ktechnology`
- [ ] Fichiers `.env` configurés
- [ ] Frontend build créé (`yarn build`)
- [ ] Backend installé comme service Windows
- [ ] IIS/nginx configuré avec reverse proxy
- [ ] Base de données initialisée avec admin
- [ ] Certificat SSL installé (pour HTTPS)
- [ ] Pare-feu configuré
- [ ] Scripts de backup planifiés
- [ ] Health checks configurés
- [ ] Tests de connectivité réussis
- [ ] Documentation remise au client

---

**🎉 Félicitations ! Votre application K-Technology est maintenant déployée sur Windows Server !**
