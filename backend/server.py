from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from datetime import datetime, timezone

from auth_routes import router as auth_router
from form_routes import router as form_router
from task_routes import router as task_router
from dashboard_routes import router as dashboard_router
from user_routes import router as user_router
from search_routes import router as search_router
from auth_utils import hash_password, verify_password

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="K-Technology Maintenance System")

# Store db in app state
app.state.db = db

# Create API router with /api prefix
api_router = APIRouter(prefix="/api")

# Include all routers
api_router.include_router(auth_router)
api_router.include_router(form_router)
api_router.include_router(task_router)
api_router.include_router(dashboard_router)
api_router.include_router(user_router)
api_router.include_router(search_router)

@api_router.get("/")
async def root():
    return {"message": "K-Technology Maintenance System API"}

# Include the API router in the main app
app.include_router(api_router)

# CORS configuration
frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def seed_admin():
    """Seed admin user on startup"""
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@ktechnology.ci")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@2026")
    
    existing = await db.users.find_one({"email": admin_email})
    
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "user_id": "admin_001",
            "email": admin_email,
            "password_hash": hashed,
            "name": "Administrateur",
            "role": "admin",
            "created_at": datetime.now(timezone.utc)
        })
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        logger.info(f"Admin password updated: {admin_email}")
    
    # Write test credentials
    Path("/app/memory").mkdir(exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# Test Credentials\n\n")
        f.write("## Admin Account\n")
        f.write(f"- Email: {admin_email}\n")
        f.write(f"- Password: {admin_password}\n")
        f.write(f"- Role: admin\n\n")
        f.write("## Auth Endpoints\n")
        f.write("- POST /api/auth/register\n")
        f.write("- POST /api/auth/login\n")
        f.write("- GET /api/auth/me\n")
        f.write("- POST /api/auth/logout\n")
        f.write("- POST /api/auth/google/callback\n\n")
        f.write("## Form Endpoints\n")
        f.write("- /api/forms/frm\n")
        f.write("- /api/forms/fdi\n")
        f.write("- /api/forms/rdd\n")
        f.write("- /api/forms/rdi\n")

async def create_indexes():
    """Create MongoDB indexes"""
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("user_id", unique=True)
        await db.frm_forms.create_index("form_id", unique=True)
        await db.fdi_forms.create_index("form_id", unique=True)
        await db.rdd_forms.create_index("form_id", unique=True)
        await db.rdi_forms.create_index("form_id", unique=True)
        await db.tasks.create_index("task_id", unique=True)
        await db.user_sessions.create_index("session_token")
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.error(f"Error creating indexes: {e}")

@app.on_event("startup")
async def startup_event():
    await create_indexes()
    await seed_admin()
    logger.info("Application startup complete")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    logger.info("Database connection closed")
