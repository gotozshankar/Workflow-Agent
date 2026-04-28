from flask import Flask, request, jsonify
from werkzeug.exceptions import UnsupportedMediaType, BadRequest
from typing import Dict, List, Any
import os
import re
import difflib  # <--- Itha add pannunga!
import requests
import traceback
import json
from langchain_core.output_parsers import JsonOutputParser
from openai import AzureOpenAI
from datetime import timedelta
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
)

try:
    from langchain_openai import ChatOpenAI
    from langchain_openai import AzureOpenAI as LangChainAzureOpenAI
except ImportError as e:
    print(f"[WARN] Could not import langchain_openai: {e}")
    ChatOpenAI = None
    LangChainAzureOpenAI = None
from langchain_core.output_parsers import *
from pydantic import Field
from logger_config import setup_logger

logger = setup_logger(__name__)
from dotenv import load_dotenv
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from database import db, ChatFlow, User, ChatMessage, Agent, SecurityPolicy, AuditEvent

# Files imports
# from workflow_generator_v2 import WorkflowGeneratorV2

from node_retriever import get_nodes_hybrid


# Path-ah force panni load pannuvom
from pathlib import Path

# Path-ah force panni load pannuvom
current_dir = Path(__file__).parent
print("DEBUG: Current directory is:", current_dir)
env_path = Path(__file__).parent / ".env"
print("DEBUG: Loading .env from:", env_path)
# Ippadi load panni paarunga

import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from workflow_generator_v2 import *
# === LANGCHAIN IMPORTS ===
from langchain_openai import AzureOpenAI as LangChainAzureOpenAI
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field


app = Flask(__name__)

# load_dotenv(dotenv_path=env_path, override=True)
# database_url = os.getenv("DATABASE_URL")
# # ─── Config ───────────────────────────────────────────────
# app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
#     "DATABASE_URL",
#     "postgresql://postgres:eFa-GFvn1a4-rTkAoqbyb@postgresql-yz7i9-u71020.vm.elestio.app:25432/aibackend"
#     # "postgresql://postgresdb_ppzt_user:OmtbKXZhwoBY1YbzmYiikAWFTa6HGPON@dpg-d78c4vidbo4c7382nnag-a.oregon-postgres.render.com:5432/postgresdb_ppzt",  # ← change this
# )
# app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
# app.config["JWT_SECRET_KEY"] = os.getenv(
#     "JWT_SECRET_KEY", "super-secret-change-in-prod"
# )
# app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)

# jwt = JWTManager(app)
# bcrypt = Bcrypt(app)

# # Remove the cors_origins_check function entirely. 
# # Pass the regex list directly to Flask-CORS.

# CORS(
#     app,
#     origins=[
#         r"^http://localhost:\d+$",
#         r"^http://127\.0\.0\.1:\d+$",
#         r"^https://.*\.netlify\.app$",
#         r"^https://agentautomatio\.netlify\.app$", # This is technically covered by the regex above
#         r"^https://.*\.railway\.app$",
#         r"^https://aiagentfr\.azurewebsites\.net$" # இதை add பண்ணு
#     ],
#     supports_credentials=True,
#     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
#     allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
# )
# ROLES = ["super_admin", "admin", "user"]

# app.config["SECRET_KEY"] = "your-secret-key"  # Required for SocketIO sessions
# load_dotenv()

# database_url = os.getenv("DATABASE_URL")

# if database_url:
#     app.config["SQLALCHEMY_DATABASE_URI"] = database_url
#     logger.info(f"📡 Using remote database: {database_url[:50]}...")
# else:
#     app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///./agentflow.db"
#     logger.info("📦 Using local SQLite database")
# db.init_app(app)
# with app.app_context():
#     try:
#         db.create_all()
#         print("✅ Database tables created")
#     except Exception as e:
#         print(f"⚠️ DB init failed: {e}")


# ✅ Load environment variables ONCE at the top
load_dotenv(dotenv_path=env_path, override=True)

# ✅ Get configuration from environment
DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET = os.getenv("JWT_SECRET_KEY", "super-secret-change-in-prod")
N8N_HOST = os.getenv("N8N_HOST")
N8N_API_KEY = os.getenv("N8N_API_KEY")
AZURE_OPENAI_KEY = os.getenv("AZURE_OPENAI_KEY")
AZURE_ENDPOINT = os.getenv("AZURE_ENDPOINT")
DEPLOYMENT_NAME = os.getenv("DEPLOYMENT_NAME", "gpt-4o")

# ✅ Validate required environment variables
print("\n" + "="*60)
print("🔍 ENVIRONMENT CHECK")
print("="*60)
print(f"✓ DATABASE_URL: {DATABASE_URL[:50]}..." if DATABASE_URL else "✗ DATABASE_URL: NOT SET")
print(f"✓ N8N_HOST: {N8N_HOST}" if N8N_HOST else "✗ N8N_HOST: NOT SET")
print(f"✓ N8N_API_KEY: Set" if N8N_API_KEY else "✗ N8N_API_KEY: NOT SET")
print(f"✓ AZURE_ENDPOINT: {AZURE_ENDPOINT}" if AZURE_ENDPOINT else "✗ AZURE_ENDPOINT: NOT SET")
print("="*60 + "\n")

# ✅ Flask App Configuration (single place)
app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL or "sqlite:///./agentflow.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = JWT_SECRET
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)
app.config["SECRET_KEY"] = JWT_SECRET  # For session management

# ✅ CONNECTION POOLING - FIX FOR "server closed the connection" ERROR
if DATABASE_URL and "postgresql" in DATABASE_URL:
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_size": 5,
        "pool_recycle": 280,         # ⬅ shorter than most managed DB idle timeouts (~300s)
        "pool_pre_ping": True,
        "pool_timeout": 30,
        "max_overflow": 10,
        "connect_args": {
            "keepalives": 1,          # ⬅ enable TCP keepalives
            "keepalives_idle": 60,    # ⬅ send keepalive after 60s idle
            "keepalives_interval": 10,# ⬅ retry every 10s
            "keepalives_count": 5,    # ⬅ drop after 5 failed keepalives
            "connect_timeout": 10,    # ⬅ fail fast if DB unreachable
        },
    }
    print("🔌 PostgreSQL connection pooling enabled (pool_size=5, pool_recycle=300s, pool_pre_ping=True)")
else:
    print("📦 Using SQLite or custom DB - minimal pooling")

# ✅ Initialize extensions
jwt = JWTManager(app)
bcrypt = Bcrypt(app)

# ✅ CORS Configuration
CORS(
    app,
    origins=[
    "http://localhost:3000",   # React default
    "http://localhost:5000",   # Vite local dev
    "http://localhost:5001",   # Docker host port
    "http://127.0.0.1:5000",
    "http://127.0.0.1:3000",
    "https://aiagentfr.azurewebsites.net"
],
    
    supports_credentials=True,
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)
ROLES = ["super_admin", "admin", "user"]

# ✅ Initialize Database
db.init_app(app)

# ✅ Create tables on app startup
with app.app_context():
    try:
        db.create_all()
        print("✅ Database tables created/verified")
    except Exception as e:
        print(f"⚠️ DB initialization warning: {e}")
        logger.warning(f"DB init issue: {e}")

    # ── Ensure agents table exists with all required columns ────────────
    try:
        with db.engine.connect() as _conn:
            _conn.execute(db.text("""
                CREATE TABLE IF NOT EXISTS agents (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    system_prompt TEXT,
                    model VARCHAR(100) NOT NULL DEFAULT 'gpt-4o',
                    tools JSONB NOT NULL DEFAULT '[]',
                    status VARCHAR(50) NOT NULL DEFAULT 'offline',
                    n8n_workflow_id VARCHAR(128),
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            """))
            # Add column if table existed before this column was introduced
            _conn.execute(db.text(
                "ALTER TABLE agents ADD COLUMN IF NOT EXISTS n8n_workflow_id VARCHAR(128);"
            ))
            _conn.commit()
            print("✅ agents table and columns ensured")
    except Exception as e:
        print(f"⚠️ agents table migration warning: {e}")

    # ── Ensure security_policies table ──────────────────────────────────
    try:
        with db.engine.connect() as _conn:
            _conn.execute(db.text("""
                CREATE TABLE IF NOT EXISTS security_policies (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    policies JSONB NOT NULL DEFAULT '{}',
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            """))
            _conn.commit()
            print("✅ security_policies table ensured")
    except Exception as e:
        print(f"⚠️ security_policies migration warning: {e}")

    # ── Ensure audit_events table ────────────────────────────────────────
    try:
        with db.engine.connect() as _conn:
            _conn.execute(db.text("""
                CREATE TABLE IF NOT EXISTS audit_events (
                    id SERIAL PRIMARY KEY,
                    event_type VARCHAR(100) NOT NULL,
                    action VARCHAR(255) NOT NULL,
                    resource VARCHAR(255),
                    resource_id VARCHAR(255),
                    actor VARCHAR(255),
                    user_id INTEGER REFERENCES users(id),
                    severity VARCHAR(20) NOT NULL DEFAULT 'info',
                    status VARCHAR(50) NOT NULL DEFAULT 'success',
                    extra JSONB DEFAULT '{}',
                    ip_address VARCHAR(64),
                    created_at TIMESTAMP DEFAULT NOW()
                );
            """))
            _conn.commit()
            print("✅ audit_events table ensured")
    except Exception as e:
        print(f"⚠️ audit_events migration warning: {e}")

    # ── Seed default security policies if none exist ─────────────────────
    try:
        if SecurityPolicy.query.count() == 0:
            _default_policies = {
                "bias_detection": True,
                "data_privacy": True,
                "ai_transparency": True,
                "accountability": True,
                "pii_redaction": True,
                "human_in_the_loop": True,
                "eu_data_residency": False,
                "audit_logging": True,
                "data_encryption": True,
                "mfa_enforcement": True,
                "webhook_signature": True,
                "rate_limiting": True,
                "key_rotation": False,
                "session_timeout_minutes": 30,
                "ip_allowlist": "",
            }
            db.session.add(SecurityPolicy(policies=_default_policies))
            db.session.commit()
            print("✅ Default security policies seeded")
    except Exception as e:
        db.session.rollback()
        print(f"⚠️ Security policy seed failed: {e}")

    # ── Seed default agents if none exist ───────────────────────────────
    try:
        if Agent.query.count() == 0:
            _seed_user = User.query.first()
            if _seed_user:
                _sample_agents = [
                    Agent(
                        name="Support Specialist",
                        description="Handles customer queries, classifies intent, and drafts replies using the knowledge base.",
                        system_prompt="You are a friendly customer support specialist. Understand the customer's issue, retrieve relevant information from the knowledge base, and respond clearly and empathetically.",
                        model="gpt-4o",
                        tools=["Email", "Knowledge Base", "Sentiment Analysis"],
                        status="online",
                        user_id=_seed_user.id,
                    ),
                    Agent(
                        name="Data Analyst",
                        description="Executes SQL queries, analyses datasets, and produces charts and summaries.",
                        system_prompt="You are a data analyst. Write SQL queries to answer business questions, interpret results, and produce clear visualisations and summaries.",
                        model="gpt-4o",
                        tools=["SQL", "Python", "Charting"],
                        status="online",
                        user_id=_seed_user.id,
                    ),
                    Agent(
                        name="Research Assistant",
                        description="Searches the web, reads documents, and writes structured research reports.",
                        system_prompt="You are a thorough research assistant. Search for up-to-date information, cross-reference sources, and deliver well-structured, cited reports.",
                        model="gpt-4o",
                        tools=["Web Search", "Summarization", "Report Writing"],
                        status="online",
                        user_id=_seed_user.id,
                    ),
                ]
                for ag in _sample_agents:
                    db.session.add(ag)
                db.session.commit()
                print(f"✅ Seeded {len(_sample_agents)} default agents")
    except Exception as e:
        db.session.rollback()
        print(f"⚠️ Agent seed failed: {e}")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
N8N_BASE_URL = os.getenv("N8N_HOST")
N8N_API_KEY = os.getenv("N8N_API_KEY")  # If your n8n instance requires an API key


# ── Audit logging helper ───────────────────────────────────────────────────────
def log_audit_event(
    event_type: str,
    action: str,
    resource: str = "",
    resource_id: str = "",
    actor: str = "system",
    user_id: int = None,
    severity: str = "info",
    status: str = "success",
    metadata: dict = None,
):
    """Append one immutable row to audit_events. Swallows exceptions so it never
    breaks the calling request."""
    try:
        ip = request.remote_addr if request else None
        event = AuditEvent(
            event_type=event_type,
            action=action,
            resource=resource,
            resource_id=str(resource_id) if resource_id else "",
            actor=actor,
            user_id=user_id,
            severity=severity,
            status=status,
            extra=metadata or {},
            ip_address=ip,
        )
        db.session.add(event)
        db.session.commit()
    except Exception as _e:
        try:
            db.session.rollback()
        except Exception:
            pass
        print(f"⚠️ audit log failed (non-fatal): {_e}")


def get_active_policies() -> dict:
    """Return the global security policy dict (cached from DB)."""
    try:
        row = SecurityPolicy.query.first()
        return row.policies if row else {}
    except Exception:
        return {}


def is_db_connection_error(error: Exception) -> bool:
    """Check if error is a database connection issue that should trigger a retry."""
    error_msg = str(error).lower()
    connection_keywords = [
        "connection",
        "server closed",
        "terminated abnormally",
        "timeout",
        "pool",
        "connection lost",
        "connection refused",
        "too many connections",
        "connection reset",
    ]
    return any(keyword in error_msg for keyword in connection_keywords)


def reset_db_connection():
    """Reset database session to recover from connection errors."""
    try:
        db.session.rollback()
        db.session.close()
        print("🔄 Database session reset")
    except Exception as e:
        print(f"⚠️ Failed to reset session: {e}")


# DEBUG PRINT: Server start aagum pothe terminal-la ithu kanpikanum
print(f"--- Environment Debug ---")
print(f"Looking for .env at: {env_path}")
print(f"File exists? {env_path.exists()}")
print(f"AZURE_ENDPOINT: {os.getenv('AZURE_ENDPOINT')}")
print(f"-------------------------")

# base_url = "https://n8n-1-123-5-kjot.onrender.com"  # Your n8n base URL
N8N_API_KEY = os.getenv("N8N_API_KEY")  # N8N API authentication key
AZURE_OPENAI_KEY = os.getenv("AZURE_OPENAI_KEY")
AZURE_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
DEPLOYMENT_NAME = os.getenv("DEPLOYMENT_NAME")
API_VERSION = "2024-02-01"

endpoint = "https://openai-chan-dev-5521.cognitiveservices.azure.com/"
model_name = "  "
deployment = "gpt-4o"

subscription_key = AZURE_OPENAI_KEY
api_version = "2024-12-01-preview"

client = AzureOpenAI(
    api_version=api_version,
    azure_endpoint=endpoint,
    api_key=subscription_key,
)


# ====================================================================
# ======================== WORKFLOW GENERATION LOGIC ========================



# =====================================================================
# DASHBOARD STATS API - WORKING VERSION
# =====================================================================


# ════════════════════════════════════════════════════════════════════════════════
# SECURITY POLICY ENDPOINTS
# ════════════════════════════════════════════════════════════════════════════════

@app.route('/health')
def health():
    return 'OK', 200

@app.route("/api/security/policies", methods=["GET", "OPTIONS"])
def get_security_policies():
    if request.method == "OPTIONS":
        return "", 204
    try:
        row = SecurityPolicy.query.first()
        if not row:
            return jsonify({"success": True, "policies": {}})
        return jsonify({"success": True, "policies": row.policies, "updated_at": str(row.updated_at)})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/security/policies", methods=["PUT"])
def update_security_policies():
    try:
        data = request.get_json(silent=True) or {}
        policies = data.get("policies", {})
        actor = data.get("actor", "system")
        user_id = data.get("user_id")

        row = SecurityPolicy.query.first()
        old_policies = row.policies.copy() if row else {}

        if row:
            row.policies = policies
            from datetime import datetime as _dt
            row.updated_at = _dt.utcnow()
        else:
            row = SecurityPolicy(policies=policies)
            db.session.add(row)
        db.session.commit()

        # Audit: log which policies changed
        changed = [k for k, v in policies.items() if old_policies.get(k) != v]
        log_audit_event(
            event_type="security.policy_update",
            action="Security policies updated",
            resource="Security Policies",
            actor=actor,
            user_id=user_id,
            severity="warning" if changed else "info",
            status="success",
            metadata={"changed_keys": changed, "policies": policies},
        )
        return jsonify({"success": True, "policies": row.policies})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


# ════════════════════════════════════════════════════════════════════════════════
# AUDIT LOG ENDPOINTS
# ════════════════════════════════════════════════════════════════════════════════

@app.route("/api/audit/events", methods=["GET", "OPTIONS"])
def get_audit_events():
    if request.method == "OPTIONS":
        return "", 204
    try:
        page     = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 50))
        search   = request.args.get("search", "").strip()
        severity = request.args.get("severity", "")
        event_type = request.args.get("event_type", "")

        query = AuditEvent.query.order_by(AuditEvent.created_at.desc())

        if search:
            like = f"%{search}%"
            query = query.filter(
                db.or_(
                    AuditEvent.action.ilike(like),
                    AuditEvent.actor.ilike(like),
                    AuditEvent.resource.ilike(like),
                    AuditEvent.event_type.ilike(like),
                )
            )
        if severity:
            query = query.filter(AuditEvent.severity == severity)
        if event_type:
            query = query.filter(AuditEvent.event_type.ilike(f"%{event_type}%"))

        total = query.count()
        events = query.offset((page - 1) * per_page).limit(per_page).all()
        return jsonify({
            "success": True,
            "events": [e.to_dict() for e in events],
            "total": total,
            "page": page,
            "per_page": per_page,
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/stats", methods=["GET", "OPTIONS"])
def get_stats():
    """
    Get dashboard statistics from N8N API.
    Returns: [{"label": "...", "value": ...}, ...]
    """
    # Handle CORS preflight
    if request.method == "OPTIONS":
        return "", 204

    try:
        # 🔧 Configuration
        N8N_BASE_URL = os.getenv("N8N_HOST")
        N8N_API_KEY = os.getenv(
            "N8N_API_KEY",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiOTJmNzQzMC03YTY5LTRiMjYtYjk1Yy1mNDgxNzA4MzdmMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDM4ZGVlZmMtZjc0YS00OGQxLWFkYjAtNTA0MjNlN2IwYWJmIiwiaWF0IjoxNzc1NjI0ODY2fQ.WObhNkvAUoAArxg_WIK4W1shT8nEaFGh33wj5fBN5Us",
        )

        headers = {"X-N8N-API-KEY": N8N_API_KEY, "Content-Type": "application/json"}

        logger.info(f"📊 Fetching stats from: {N8N_BASE_URL}")

        # ==========================================
        # 1️⃣ FETCH WORKFLOWS
        # ==========================================
        total_workflows = 0
        try:
            workflow_url = f"{N8N_BASE_URL}/api/v1/workflows"
            logger.info(f"📥 GET {workflow_url}")

            workflows_response = requests.get(workflow_url, headers=headers, timeout=10)
            logger.info(f"📤 Status: {workflows_response.status_code}")

            if workflows_response.status_code == 200:
                # ✅ Parse JSON first
                workflows_data = workflows_response.json()
                logger.info(f"📋 Raw response type: {type(workflows_data)}")

                # Handle both formats: list or {data: [...]}
                if isinstance(workflows_data, list):
                    workflows = workflows_data
                    logger.info(f"✅ Got list with {len(workflows)} workflows")
                elif isinstance(workflows_data, dict) and "data" in workflows_data:
                    workflows = workflows_data["data"]
                    logger.info(f"✅ Got 'data' key with {len(workflows)} workflows")
                else:
                    workflows = []
                    logger.warning(f"⚠️ Unknown response format: {workflows_data}")

                total_workflows = len(workflows)
            else:
                logger.error(
                    f"❌ Failed to fetch workflows: {workflows_response.status_code}"
                )
                logger.error(f"   Response: {workflows_response.text[:200]}")
                total_workflows = 0

        except requests.exceptions.Timeout:
            logger.error("⏱️ Workflows request timed out")
            total_workflows = 0
        except Exception as e:
            logger.error(f"❌ Error fetching workflows: {str(e)}")
            total_workflows = 0

        # ==========================================
        # 2️⃣ FETCH EXECUTIONS
        # ==========================================
        total_active = 0
        success_rate = "0%"
        try:
            execution_url = f"{N8N_BASE_URL}/api/v1/executions"
            logger.info(f"📥 GET {execution_url}")

            executions_response = requests.get(
                execution_url, headers=headers, timeout=10
            )
            logger.info(f"📤 Status: {executions_response.status_code}")

            if executions_response.status_code == 200:
                # ✅ Parse JSON first
                executions_data = executions_response.json()
                logger.info(f"📋 Raw response type: {type(executions_data)}")

                # Handle both formats: list or {data: [...]}
                if isinstance(executions_data, list):
                    executions = executions_data
                    logger.info(f"✅ Got list with {len(executions)} executions")
                elif isinstance(executions_data, dict) and "data" in executions_data:
                    executions = executions_data["data"]
                    logger.info(f"✅ Got 'data' key with {len(executions)} executions")
                else:
                    executions = []
                    logger.warning(f"⚠️ Unknown response format: {executions_data}")

                # Calculate metrics
                total_active = sum(1 for e in executions if not e.get("finished"))
                total_success = sum(
                    1 for e in executions if e.get("status") == "success"
                )
                total_error = sum(1 for e in executions if e.get("status") == "error")

                total = total_success + total_error
                success_rate = (
                    f"{(total_success / total * 100):.1f}%" if total > 0 else "0%"
                )

                logger.info(
                    f"✅ Active: {total_active}, Success: {total_success}, Error: {total_error}, Rate: {success_rate}"
                )
            else:
                logger.error(
                    f"❌ Failed to fetch executions: {executions_response.status_code}"
                )
                total_active = 0
                success_rate = "0%"

        except requests.exceptions.Timeout:
            logger.error("⏱️ Executions request timed out")
            total_active = 0
        except Exception as e:
            logger.error(f"❌ Error fetching executions: {str(e)}")
            total_active = 0

        # ==========================================
        # 3️⃣ FETCH CREDENTIALS (MODELS)
        # ==========================================
        models_count = 0
        try:
            creds_url = f"{N8N_BASE_URL}/api/v1/credentials"
            logger.info(f"📥 GET {creds_url}")

            creds_response = requests.get(creds_url, headers=headers, timeout=10)
            logger.info(f"📤 Status: {creds_response.status_code}")

            if creds_response.status_code == 200:
                # ✅ Parse JSON first
                creds_data = creds_response.json()

                if isinstance(creds_data, list):
                    creds = creds_data
                    logger.info(f"✅ Got list with {len(creds)} credentials")
                elif isinstance(creds_data, dict) and "data" in creds_data:
                    creds = creds_data["data"]
                    logger.info(f"✅ Got 'data' key with {len(creds)} credentials")
                else:
                    creds = []

                models_count = len(creds)
            else:
                logger.warning(
                    f"⚠️ Credentials endpoint returned: {creds_response.status_code}"
                )
                models_count = 0

        except Exception as e:
            logger.warning(f"⚠️ Could not fetch credentials: {str(e)}")
            models_count = 0

        # ==========================================
        # 4️⃣ BUILD RESPONSE
        # ==========================================
        stats = [
            {
                "label": "Total Workflows",
                "value": total_workflows,
                "change": f"+{max(1, total_workflows // 5)} this week",
                "bg": "bg-blue-100",
                "icon": "Workflow",
                "color": "text-blue-600",
            },
            {
                "label": "Active Executions",
                "value": total_active,
                "change": f"+{total_active} today",
                "bg": "bg-green-100",
                "icon": "Activity",
                "color": "text-green-600",
            },
            {
                "label": "Success Rate",
                "value": success_rate,
                "change": "maintained",
                "bg": "bg-purple-100",
                "icon": "TrendingUp",
                "color": "text-purple-600",
            },
            {
                "label": "Models",
                "value": models_count,
                "change": f"{models_count} available",
                "bg": "bg-orange-100",
                "icon": "Cpu",
                "color": "text-orange-600",
            },
        ]

        logger.info(f"✅ Stats compiled successfully")
        for stat in stats:
            logger.info(f"   {stat['label']}: {stat['value']}")

        return jsonify(stats), 200

    except Exception as e:
        logger.error(f"❌ FATAL Error in /api/stats: {str(e)}", exc_info=True)
        import traceback

        traceback.print_exc()

        # Return fallback stats with zeros
        fallback_stats = [
            {
                "label": "Total Workflows",
                "value": 0,
                "change": "Error fetching",
                "bg": "bg-blue-100",
                "icon": "Workflow",
                "color": "text-blue-600",
            },
            {
                "label": "Active Executions",
                "value": 0,
                "change": "Error fetching",
                "bg": "bg-green-100",
                "icon": "Activity",
                "color": "text-green-600",
            },
            {
                "label": "Success Rate",
                "value": "0%",
                "change": "Error fetching",
                "bg": "bg-purple-100",
                "icon": "TrendingUp",
                "color": "text-purple-600",
            },
            {
                "label": "Models",
                "value": 0,
                "change": "Error fetching",
                "bg": "bg-orange-100",
                "icon": "Cpu",
                "color": "text-orange-600",
            },
        ]

        return jsonify(fallback_stats), 200  # Return 200 so frontend doesn't error


@app.route("/api/models", methods=["GET", "OPTIONS"])
def get_models():
    """Get credentials (models) from N8N"""
    if request.method == "OPTIONS":
        return "", 204

    try:
        N8N_HOST = os.getenv(
            "N8N_HOST", "https://n8n-1-123-5-kjot.onrender.com"
        ).rstrip("/")
        N8N_API_KEY = os.getenv("N8N_API_KEY", "").strip('"').strip()

        headers = {"X-N8N-API-KEY": N8N_API_KEY}

        # Fetch all credentials from N8N
        try:
            response = requests.get(
                f"{N8N_HOST}/rest/credentials", headers=headers, timeout=10
            )
            # response = requests.get(f"{N8N_HOST}/api/v1/credentials", headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                credentials = data.get("data", []) if isinstance(data, dict) else data

                # Transform credentials to models format
                models = []
                for cred in credentials:
                    models.append(
                        {
                            "id": cred.get("id"),
                            "name": cred.get("name", "Unknown"),
                            "type": cred.get("type", "credential"),
                            "status": "Compliant",
                        }
                    )

                return jsonify(models)
            else:
                # Fallback to empty list if API fails
                return jsonify([])
        except Exception as e:
            print(f"Error fetching credentials from N8N: {e}")
            return jsonify([])
    except Exception as e:
        print(f"Error in get_models: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/activity", methods=["GET", "OPTIONS"])
def get_activity():
    """Get recent activity from N8N executions"""
    if request.method == "OPTIONS":
        return "", 204

    try:
        N8N_HOST = os.getenv(
            "N8N_HOST", "https://n8n-1-123-5-kjot.onrender.com"
        ).rstrip("/")
        N8N_API_KEY = os.getenv("N8N_API_KEY", "").strip('"').strip()

        headers = {"X-N8N-API-KEY": N8N_API_KEY}

        # Fetch recent executions from N8N
        try:
            response = requests.get(
                f"{N8N_HOST}/api/v1/executions?limit=10", headers=headers, timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                executions = data.get("data", []) if isinstance(data, dict) else data

                # Transform executions to activity format
                activity = []
                for idx, exec_data in enumerate(executions[:10]):
                    status = exec_data.get("status", "unknown")
                    activity_type = "execution"

                    if status == "success":
                        title = f"Workflow executed successfully (ID: {exec_data.get('id')})"
                    elif status == "error":
                        title = f"Workflow execution failed (ID: {exec_data.get('id')})"
                    else:
                        title = f"Workflow {status} (ID: {exec_data.get('id')})"

                    activity.append(
                        {
                            "id": str(exec_data.get("id")),
                            "type": activity_type,
                            "title": title,
                            "status": status,
                            "time": exec_data.get("startedAt", "Unknown"),
                        }
                    )

                return jsonify(activity)
            else:
                return jsonify([])
        except Exception as e:
            print(f"Error fetching executions from N8N: {e}")
            return jsonify([])
    except Exception as e:
        print(f"Error in get_activity: {e}")
        return jsonify({"error": str(e)}), 500


# ====================================================================

# =======================================================================
# AUTHORIZE


# ─── Helper ───────────────────────────────────────────────────────────────────
def role_required(*allowed_roles):
    """Decorator: checks JWT + role. (jwt_required already included inside)"""
    from functools import wraps

    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            if claims.get("role") not in allowed_roles:
                return jsonify({"error": "Forbidden – insufficient role"}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator


@app.route("/api/auth/me", methods=["GET"])
@jwt_required()
def me():
    user_id = get_jwt_identity()

    try:
        user_id = int(user_id)
    except:
        return jsonify({"error": "Invalid token"}), 401

    # user = User.query.get(user_id)
    user = db.session.get(User, int(user_id)) 
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify(user.to_dict()), 200

# ─── Users ────────────────────────────────────────────────────────────────────


# GET /api/users
@app.route("/api/users", methods=["GET"])
@jwt_required()
def list_users():
    try:
        users = User.query.order_by(User.created_at.asc()).all()
        return jsonify([u.to_dict() for u in users]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# PATCH /api/users/<id>/role  — role மட்டும் மாத்த (legacy endpoint)
@app.route("/api/users/<int:user_id>/role", methods=["PATCH"])
@role_required(
    "super_admin"
)  # ✅ @jwt_required() தனியா வேண்டாம் — role_required-க்குள்ளே இருக்கு
def change_role(user_id):
    data = request.get_json()
    new_role = (data.get("role") or "").strip()

    if new_role not in ROLES:
        return jsonify({"error": f"Invalid role. Choose from: {ROLES}"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    requester_id = int(get_jwt_identity())
    if requester_id == user_id and new_role != "super_admin":
        return jsonify({"error": "You cannot demote yourself"}), 400

    user.role = new_role
    db.session.commit()
    return jsonify({"message": "Role updated", "user": user.to_dict()}), 200


# DELETE /api/users/<id>
@app.route("/api/users/<int:user_id>", methods=["DELETE"])
@role_required("super_admin")
def delete_user(user_id):
    requester_id = int(get_jwt_identity())
    if requester_id == user_id:
        return jsonify({"error": "Cannot delete your own account"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "User deleted"}), 200


class WorkflowGenerator:
    def __init__(self, nodes_by_category: List[Dict], credentials: List[Dict]):
        """
        Initialize with node categories and available credentials
        """
        self.nodes_by_category = nodes_by_category
        self.credentials = credentials
        self.node_registry = self._build_node_registry()
        self.credential_map = self._build_credential_map()
        self.client = AzureOpenAI(
            api_key=os.getenv("AZURE_OPENAI_KEY"),
            api_version="2024-02-01",
            azure_endpoint=os.getenv("AZURE_ENDPOINT"),
        )
        self.deployment_name = os.getenv("DEPLOYMENT_NAME")
        # 🚀 LOAD MASTER NODES FOR AUTO-CORRECTION
        self.master_nodes = []
        self.node_lookup_by_display = {}
        self.node_lookup_by_type = {}
        try:
            print("try .....")
            master_file_path = os.path.join(current_dir, "clean_nodes.json")
            print("clean.json fetching .....")
            with open(master_file_path, "r", encoding="utf-8") as f:
                self.master_nodes = json.load(f)

            # Create lookups for fast searching
            for node in self.master_nodes:
                info = {
                    "type": node[
                        "name"
                    ],  # Note: In your JSON, "name" holds the internal type
                    "typeVersion": node["typeVersion"],
                    "is_trigger": node.get("is_trigger", False),
                }
                # Lookup by display name (e.g. "Webhook Response")
                self.node_lookup_by_display[node["displayName"].lower()] = info
                # Lookup by internal type (e.g. "n8n-nodes-base.respondToWebhook")
                self.node_lookup_by_type[node["name"].lower()] = info

            print(
                f"✅ Loaded {len(self.master_nodes)} master nodes for auto-correction"
            )
        except Exception as e:
            print(f"⚠️ Could not load clean_nodes.json: {e}")

    def _build_node_registry(self) -> Dict[str, List[str]]:
        print("Building node registry...")
        registry = {"nodes": []}
        if isinstance(self.nodes_by_category, list):
            # Ippo dynamic-aa retrieve aana nodes-ah registry-la add panrom
            registry["nodes"] = self.nodes_by_category
            print("😎😎/n", registry["nodes"], "😐😐😍😍😐")
        return registry

    def _build_llm_context_new(
        self, user_prompt: str, retrieved_nodes: List[Dict]
    ) -> str:
        nodes_info = ""
        for node in retrieved_nodes:
            schema = node.get("metadata", {}).get("schema", node)

            # Available actions format panna
            actions = schema.get("available_actions", [])
            actions_str = ""
            if actions:
                action_names = [
                    a.get("actionName", "") for a in actions if a.get("actionName")
                ]
                actions_str = f"  OPERATIONS: {', '.join(action_names)}\n"

            nodes_info += (
                f"- DISPLAY NAME: {schema.get('displayName')}\n"
                f"  INTERNAL TYPE: {schema.get('name')}\n"
                f"  VERSION: {schema.get('typeVersion')}\n"
                f"  DESCRIPTION: {schema.get('description', '')}\n"
                f"{actions_str}\n"  # ✅ Operations add pannirukkom
            )

        return f"""
    # MISSION
    Generate a valid n8n workflow JSON based on the user request.

    # STRICT NODE RULES
    1. For the 'type' field: ONLY use the 'INTERNAL TYPE' provided in the list below.
    2. For 'typeVersion': Use the EXACT 'VERSION' number from the list.
    3. Every node must have a unique 'id' (UUID) and a 'name'.
    4. Use the OPERATIONS list to set correct 'parameters.operation' or 'parameters.resource' values.

    # STRICT CONNECTION RULES
    1. All nodes MUST be connected in a logical flow.
    2. Connection format: "connections": {{"Source Node Name": {{"main": [ [ {{"node": "Target", "type": "main", "index": 0}} ] ] }}}}
    3. For IF nodes: Index 0 = TRUE path, Index 1 = FALSE path.

    # AVAILABLE NODES FOR THIS REQUEST
    {nodes_info}

    USER REQUEST: {user_prompt}
    """

    def _build_credential_map(self) -> Dict[str, Dict]:
        """
        Build a map of credential types to their details
        """
        cred_map = {}
        for cred in self.credentials:
            cred_type = cred.get("type")
            if cred.get("available") and cred_type:
                names = cred.get("names", [])
                if names:
                    cred_map[cred_type] = {
                        "name": names[0],
                        "type": cred_type,
                        "available": True,
                    }
        return cred_map
    def _call_azure_openai(self, context: str) -> str:
        try:
            system_instruction = """You are an Expert Enterprise n8n Architect.
            Your goal is to build correct, working n8n workflow JSON.

            ============================================================
            RULE 1 — CONNECTIONS STRUCTURE (MOST IMPORTANT)
            ============================================================
            Connections MUST be at the TOP LEVEL of the JSON only.
            NEVER put "connections" inside a node object.

            CORRECT FORMAT:
            {
              "nodes": [ ...all nodes without connections... ],
              "connections": {
                "Source Node Name": {
                  "main": [ [ { "node": "Target Node Name", "type": "main", "index": 0 } ] ]
                }
              }
            }

            WRONG FORMAT (NEVER DO THIS):
            {
              "nodes": [
                { "name": "NodeA", "connections": { ... } }
              ]
            }

            ============================================================
            RULE 2 — AI ARCHITECTURE (RAG / Chat with Documents)
            ============================================================
            For any request involving Files, Documents, PDFs, or Q&A:

            CORRECT NODE FLOW:
              Webhook
                └─[main]──► AI Agent (@n8n/n8n-nodes-langchain.agent)
                                ├─[ai_languageModel]──► Chat Model
                                ├─[ai_memory]─────────► Memory Node
                                └─[ai_tool]───────────► Vector Store Retriever
                                                            ├─[ai_embedding]──► Embeddings
                                                            └─[ai_document]───► Document Loader
                                                                                    └─[ai_textSplitter]──► Text Splitter

            CORRECT CONNECTIONS EXAMPLE for RAG:
            "connections": {
              "Webhook": {
                "main": [ [ { "node": "AI Agent", "type": "main", "index": 0 } ] ]
              },
              "Chat Model": {
                "ai_languageModel": [ [ { "node": "AI Agent", "type": "ai_languageModel", "index": 0 } ] ]
              },
              "Memory": {
                "ai_memory": [ [ { "node": "AI Agent", "type": "ai_memory", "index": 0 } ] ]
              },
              "Vector Store Retriever": {
                "ai_tool": [ [ { "node": "AI Agent", "type": "ai_tool", "index": 0 } ] ]
              },
              "Embeddings": {
                "ai_embedding": [ [ { "node": "Vector Store Retriever", "type": "ai_embedding", "index": 0 } ] ]
              },
              "Document Loader": {
                "ai_document": [ [ { "node": "Vector Store Retriever", "type": "ai_document", "index": 0 } ] ]
              },
              "Text Splitter": {
                "ai_textSplitter": [ [ { "node": "Document Loader", "type": "ai_textSplitter", "index": 0 } ] ]
              }
            }

            ============================================================
            RULE 3 — CORRECT NODE TYPES (use ONLY these for RAG)
            ============================================================
            - Webhook:           n8n-nodes-base.webhook  (typeVersion: 2)
            - AI Agent:          @n8n/n8n-nodes-langchain.agent  (typeVersion: 1.7)
            - Chat Model:        @n8n/n8n-nodes-langchain.lmChatOpenAi  (typeVersion: 1)
            - Memory:            @n8n/n8n-nodes-langchain.memoryBufferWindow  (typeVersion: 1.3)
            - Vector Store:      @n8n/n8n-nodes-langchain.vectorStoreInMemory  (typeVersion: 1.1)
            - Embeddings:        @n8n/n8n-nodes-langchain.embeddingsOpenAi  (typeVersion: 1)
            - Document Loader:   @n8n/n8n-nodes-langchain.documentDefaultDataLoader  (typeVersion: 1)
            - Text Splitter:     @n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter  (typeVersion: 1)
            - Respond:           n8n-nodes-base.respondToWebhook  (typeVersion: 1.1)

            OVERRIDE: If AVAILABLE NODES list has a better match, use that instead.

            ============================================================
            RULE 4 — typeVersion MUST be a single number, never an array
            ============================================================
            CORRECT:   "typeVersion": 1
            WRONG:     "typeVersion": [1, 1.1, 1.2]

            ============================================================
            RULE 5 — AI AGENT NODE: REQUIRED PROMPT PARAMETER
            ============================================================
            The AI Agent node (@n8n/n8n-nodes-langchain.agent) ALWAYS requires:
            "parameters": {
              "promptType": "auto"
            }
            Without "promptType": "auto", n8n throws "No prompt specified" error.
            NEVER leave the parameters empty {} for the AI Agent node.

            ============================================================
            RULE 6 — OUTPUT FORMAT
            ============================================================
            - Return ONLY raw JSON. No markdown. No explanation text.
            - Every node needs: id (UUID), name, type, typeVersion, position [x,y], parameters {}
            - Positions must be spaced 300px apart horizontally.
            """

            response = self.client.chat.completions.create(
                model=self.deployment_name,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {
                        "role": "user",
                        "content": f"Context & Available Nodes:\n{context}\n\nTask: Generate a complete n8n workflow JSON that solves the user request perfectly.",
                    },
                ],
                max_tokens=8000,  # Periya logic-ku token extra venum
                timeout=180,        # ← Azure OpenAI ku 180 seconds குடு

                temperature=0.1,
            )

            content = response.choices[0].message.content

            # Clean up markdown
            content = content.replace("```json", "").replace("```", "").strip()

            # Ensure we return only the JSON structure
            try:
                parsed = json.loads(content)
                # Oruvela AI 'workflow' illa 'data' nu wrap panniruntha atha remove pannuvom
                if isinstance(parsed, dict):
                    if "nodes" in parsed:
                        return json.dumps(parsed)
                    for key in ["workflow", "data"]:
                        if key in parsed and "nodes" in parsed[key]:
                            return json.dumps(parsed[key])
            except:
                pass
            return content
        except Exception as e:
            print(f"❌ Azure SDK Error: {e}")
            raise Exception(f"Azure API call failed: {str(e)}")

    def _extract_json(self, content: str) -> Dict:
        """
        Extract JSON from response, handling markdown code blocks and thinking tags
        """
        # DEBUG: Terminal-la enna response varudhu-nu check panna
        print(f"--- RAW LLM CONTENT START ---\n{content}\n--- RAW LLM CONTENT END ---")

        if not content or content.strip() == "":
            raise Exception(
                "LLM returned an empty response. Possible API timeout or Credit issue."
            )

        # 1. DeepSeek Reasoning tags-ah clean panna (Irundha thookidhum)
        content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL)

        # 2. Markdown code blocks extract panna
        json_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", content, re.DOTALL)
        if json_match:
            content = json_match.group(1)

        content = content.strip()

        try:
            # Direct-aa parse panna try pannunga
            return json.loads(content)
        except json.JSONDecodeError:
            # 3. Text kulla JSON irukka nu search panna
            print("Standard JSON parse failed. Searching for { } structure...")
            json_start = content.find("{")
            json_end = content.rfind("}") + 1

            if json_start != -1 and json_end > json_start:
                final_json_str = content[json_start:json_end]
                try:
                    return json.loads(final_json_str)
                except Exception as e:
                    # Oru vaela JSON kulla unga AI extra comma (,) potta ithu fix pannum
                    print(f"Sub-string JSON parse failed: {e}")

            raise Exception(
                f"Failed to parse JSON. Raw content was: {content[:100]}..."
            )

    def _validate_workflow(self, workflow: Dict) -> Dict:
        # ── 1. Basic structure ──────────────────────────────────────
        if "nodes" not in workflow:
            workflow["nodes"] = []
        if "connections" not in workflow:
            workflow["connections"] = {}
        if "settings" not in workflow:
            workflow["settings"] = {"executionOrder": "v1"}

        # ── 2. Node type auto-correct (fuzzy match) ─────────────────
        all_valid_types = list(self.node_lookup_by_type.keys())
        for index, node in enumerate(workflow["nodes"]):
            current_type = node.get("type", "")
            node_type_lower = current_type.lower()
            # typeVersion array fix
            if isinstance(node.get("typeVersion"), list):
                node["typeVersion"] = node["typeVersion"][0]

            # Node கிட்ட connections இருந்தா remove பண்ணு (top-level மட்டும் வேணும்)
            node.pop("connections", None)
            if (
                current_type
                and all_valid_types
                and node_type_lower not in all_valid_types
            ):
                closest = difflib.get_close_matches(
                    node_type_lower, all_valid_types, n=1, cutoff=0.4
                )
                if closest:
                    correct_info = self.node_lookup_by_type[closest[0]]
                    print(
                        f"🪄 AUTO-CORRECT: '{current_type}' ➡️ '{correct_info['type']}'"
                    )
                    node["type"] = correct_info["type"]
                    node["typeVersion"] = correct_info["typeVersion"]
                else:
                    FALLBACK_MAP = {
                        "llm": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
                        "agent": "@n8n/n8n-nodes-langchain.agent",
                        "webhook": "n8n-nodes-base.webhook",
                        "document": "@n8n/n8n-nodes-langchain.documentDefaultDataLoader",
                    }
                    for kw, off_type in FALLBACK_MAP.items():
                        if kw in node_type_lower:
                            node["type"] = off_type
                            node["typeVersion"] = 1
                            break

            if isinstance(node.get("position"), dict):
                pos = node["position"]
                node["position"] = [pos.get("x", 100 + index * 250), pos.get("y", 150)]
            if "parameters" not in node:
                node["parameters"] = {}

            # ── AI Agent node: inject required prompt params if missing ──
            node_type = node.get("type", "")
            if "langchain.agent" in node_type:
                params = node["parameters"]
                # promptType must be set — "auto" reads input automatically from chat/webhook
                if not params.get("promptType"):
                    params["promptType"] = "auto"
                # If promptType is "define" but text is empty, switch to auto
                if params.get("promptType") == "define" and not params.get("text", "").strip():
                    params["promptType"] = "auto"
                print(f"✅ AI Agent '{node.get('name')}' promptType set to '{params['promptType']}'")

        # ── 3. Connection auto-fixer ────────────────────────────────
        # Source node-ஓட type பாத்து correct port assign பண்றோம்
        node_types_by_name = {n["name"]: n["type"] for n in workflow["nodes"]}

        # AI port mapping: source node type → correct connection port
        AI_PORT_MAP = {
            "langchain.lm": "ai_languageModel",
            "langchain.memory": "ai_memory",
            "langchain.embeddings": "ai_embedding",
            "embeddings": "ai_embedding",
            "dataloader": "ai_document",
            "textsplitter": "ai_textSplitter",
        }

        # Vector store → ai_tool (only when connecting TO agent)
        VECTORSTORE_TYPES = [
            "vectorstore",
            "vectorStore",
            "pinecone",
            "qdrant",
            "weaviate",
            "supabase",
        ]

        new_connections = {}
        for source_name, source_conn in workflow["connections"].items():
            source_type = node_types_by_name.get(source_name, "").lower()

            # Correct port detect பண்றோம்
            correct_port = "main"
            for keyword, port in AI_PORT_MAP.items():
                if keyword in source_type:
                    correct_port = port
                    break

            # Vector store check
            if correct_port == "main":
                for vs_kw in VECTORSTORE_TYPES:
                    if vs_kw.lower() in source_type:
                        correct_port = "ai_tool"
                        break

            # Text splitter check
            if "textsplitter" in source_type or "text_splitter" in source_type:
                correct_port = "ai_textSplitter"

            # Connection rebuild
            rebuilt = {}
            for port_key, outputs in source_conn.items():
                # "main" wrong port-ஆ இருந்தா correct port-க்கு மாத்து
                use_port = (
                    correct_port
                    if port_key == "main" and correct_port != "main"
                    else port_key
                )
                fixed_outputs = []
                for output_list in outputs:
                    fixed_list = []
                    for conn in output_list:
                        conn["type"] = use_port
                        fixed_list.append(conn)
                    fixed_outputs.append(fixed_list)
                rebuilt[use_port] = fixed_outputs
            new_connections[source_name] = rebuilt

        workflow["connections"] = new_connections
        print(
            f"✅ Validated: {len(workflow['nodes'])} nodes, {len(workflow['connections'])} connections"
        )
        return workflow

    def generate_workflow(self, user_prompt: str) -> Dict[str, Any]:
        print(f"Generating workflow for prompt: {user_prompt}")

        # 1. IMPORTANT FIX: self.nodes_by_category ippo relevant nodes-ah thaan irukku (init-la irunthu)
        # relevant_nodes-ah context function-ku anupunga
        context = self._build_llm_context_new(user_prompt, self.nodes_by_category)

        print("Sending updated context to LLM...")
        # print("Context:", context) # Debug panna idha use pannunga

        # 2. Call LLM
        raw_response = self._call_azure_openai(context)
        print("LLM Response received.")

        # 3. Extract and parse JSON
        workflow = self._extract_json(raw_response)

        # 4. Validate and fix
        workflow = self._validate_workflow(workflow)
        return workflow


# ─── Auth ─────────────────────────────────────────────────────────────────────
@app.route("/api/auth/logout", methods=["POST"])
@jwt_required()
def logout():
    # Optional: Add token to blacklist in Redis/DB
    return jsonify({"message": "Logged out successfully"}), 200

# # POST /api/auth/register
@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json()
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not name or not email or not password:
        return jsonify({"error": "name, email and password are required"}), 400

    max_retries = 3
    retry_count = 0

    while retry_count < max_retries:
        try:
            # ✅ db.session — Flask-SQLAlchemy (consistent everywhere)
            existing = User.query.filter_by(email=email).first()
            if existing:
                return jsonify({"error": "Email already registered"}), 409

            user_count = User.query.count()
            role = "super_admin" if user_count == 0 else "user"
            hashed_pw = bcrypt.generate_password_hash(password).decode("utf-8")
            new_user = User(name=name, email=email, password=hashed_pw, role=role)
            db.session.add(new_user)
            db.session.commit()

            token = create_access_token(
                identity=str(new_user.id),
                additional_claims={"role": new_user.role, "name": new_user.name},
            )
            print(f"✅ Registration successful for {email}, User ID: {new_user.id}")
            return jsonify({"token": token, "user": new_user.to_dict()}), 201

        except Exception as e:
            error_msg = str(e)
            if is_db_connection_error(e):
                retry_count += 1
                if retry_count < max_retries:
                    print(f"⚠️ Database connection error during registration (attempt {retry_count}): {error_msg}")
                    reset_db_connection()
                    continue  # Retry
                else:
                    print(f"❌ Max retries reached for registration")
                    return jsonify({
                        "error": "Database connection error. Please try again.",
                        "details": "Server is temporarily unable to process your request."
                    }), 503
            else:
                # Non-retryable error
                db.session.rollback()
                return jsonify({"error": error_msg}), 500
    
    return jsonify({"error": "Registration failed after multiple retries"}), 500


# POST /api/auth/login
# @app.route("/api/auth/login", methods=["POST"])
# def login():
#     data = request.get_json()
#     email = (data.get("email") or "").strip().lower()
#     password = (data.get("password") or "").strip()
#     user = User.query.filter_by(email=email).first()
#     if not user:
#         print(f"DEBUG: User with email {email} not found.") # Check console
#         return jsonify({"error": "Invalid email or password"}), 401
#     if not bcrypt.check_password_hash(user.password, password):
#         print(f"DEBUG: Password mismatch for {email}.") # Check console
#         return jsonify({"error": "Invalid email or password"}), 401

#     if not email or not password:
#         return jsonify({"error": "email and password are required"}), 400

#     try:
#         user = User.query.filter_by(email=email).first()
#         if not user or not bcrypt.check_password_hash(user.password, password):
#             return jsonify({"error": "Invalid email or password"}), 401

#         token = create_access_token(
#             identity=str(user.id),
#             additional_claims={"role": user.role, "name": user.name},
#         )
#         return jsonify({"token": token, "user": user.to_dict()}), 200

#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON body"}), 400

    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    RETRYABLE_ERRORS = ["connection", "server closed", "terminated", "timeout", "pool", "ssl", "eof"]
    max_retries = 3

    for attempt in range(1, max_retries + 1):
        try:
            print(f"🔍 Login attempt {attempt}/{max_retries} for: {email}")

            user = User.query.filter_by(email=email).first()

            if not user or not bcrypt.check_password_hash(user.password, password):
                return jsonify({"error": "Invalid email or password"}), 401

            token = create_access_token(
                identity=str(user.id),
                additional_claims={"role": user.role, "name": user.name},
            )

            log_audit_event(
                event_type="user.login",
                action="User logged in",
                resource="Authentication",
                actor=user.email,
                user_id=user.id,
                severity="info",
                status="success",
                metadata={"role": user.role},
            )

            print(f"✅ Login successful for {email}")
            return jsonify({"token": token, "user": user.to_dict()}), 200

        except Exception as e:
            error_msg = str(e).lower()
            is_retryable = any(err in error_msg for err in RETRYABLE_ERRORS)

            print(f"{'⚠️ Retryable' if is_retryable else '❌ Fatal'} error (attempt {attempt}): {e}")

            # Always clean up the session on error
            try:
                db.session.rollback()
                db.session.remove()   # ⬅ .remove() is safer than .close() with scoped sessions
            except Exception:
                pass

            if not is_retryable or attempt == max_retries:
                if not is_retryable:
                    import traceback; traceback.print_exc()
                    return jsonify({"error": "An unexpected error occurred"}), 500
                break  # exhausted retries

    return jsonify({
        "error": "Database temporarily unavailable. Please try again.",
    }), 503
# ===========================================================


# rolde based login # POST /api/users/<id>/impersonate
@app.route("/api/users/<int:user_id>/impersonate", methods=["POST"])
@role_required("super_admin")
def impersonate_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    token = create_access_token(
        identity=str(user.id), additional_claims={"role": user.role, "name": user.name}
    )
    return jsonify({"token": token, "user": user.to_dict()}), 200

# ═════════════════════════════════════════════════════════════════════════════
# WORKFLOW TEMPLATE IMPORT ENDPOINTS
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/api/workflows/templates", methods=["GET", "OPTIONS"])
def list_workflow_templates():
    """List available workflow templates from local templates directory."""
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    
    try:
        import os
        import json as json_lib
        
        templates_dir = os.path.join(os.path.dirname(__file__), "workflows", "templates")
        templates = []
        
        if not os.path.exists(templates_dir):
            return jsonify({"templates": [], "message": "No templates directory found"}), 200
        
        for filename in os.listdir(templates_dir):
            if filename.endswith(".json"):
                filepath = os.path.join(templates_dir, filename)
                try:
                    with open(filepath, "r") as f:
                        template_data = json_lib.load(f)
                    
                    templates.append({
                        "filename": filename,
                        "name": template_data.get("name", filename.replace(".json", "")),
                        "description": template_data.get("meta", {}).get("description", ""),
                        "nodeCount": len(template_data.get("nodes", [])),
                        "keywords": template_data.get("meta", {}).get("keywords", [])
                    })
                except Exception as e:
                    logger.warning(f"Failed to load template {filename}: {e}")
        
        return jsonify({"success": True, "templates": templates}), 200
    
    except Exception as e:
        logger.error(f"Error listing templates: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/workflows/templates/<template_name>", methods=["GET", "OPTIONS"])
def get_workflow_template(template_name):
    """Load a specific workflow template from local file."""
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    
    try:
        import os
        import json as json_lib
        
        # Sanitize template name to prevent directory traversal
        template_name = os.path.basename(template_name)
        if not template_name.endswith(".json"):
            template_name += ".json"
        
        templates_dir = os.path.join(os.path.dirname(__file__), "workflows", "templates")
        template_path = os.path.join(templates_dir, template_name)
        
        # Verify the path is within templates directory
        if not os.path.abspath(template_path).startswith(os.path.abspath(templates_dir)):
            return jsonify({"success": False, "error": "Invalid template path"}), 400
        
        if not os.path.exists(template_path):
            return jsonify({"success": False, "error": f"Template '{template_name}' not found"}), 404
        
        with open(template_path, "r") as f:
            workflow = json_lib.load(f)
        
        logger.info(f"✅ Loaded template: {template_name}")
        return jsonify({"success": True, "workflow": workflow}), 200
    
    except Exception as e:
        logger.error(f"Error loading template: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/workflows/templates/suggest", methods=["POST", "OPTIONS"])
def suggest_workflow_template():
    """Suggest the best matching template based on user prompt keywords."""
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    
    try:
        import os
        import json as json_lib
        
        data = request.get_json() or {}
        prompt = data.get("prompt", "").lower()
        
        if not prompt:
            return jsonify({"success": False, "error": "Prompt is required"}), 400
        
        templates_dir = os.path.join(os.path.dirname(__file__), "workflows", "templates")
        best_match = None
        best_score = 0
        
        if not os.path.exists(templates_dir):
            return jsonify({"success": True, "suggestion": None, "message": "No templates available"}), 200
        
        # Check each template for keyword matches
        for filename in os.listdir(templates_dir):
            if filename.endswith(".json"):
                filepath = os.path.join(templates_dir, filename)
                try:
                    with open(filepath, "r") as f:
                        template_data = json_lib.load(f)
                    
                    keywords = template_data.get("meta", {}).get("keywords", [])
                    description = template_data.get("meta", {}).get("description", "").lower()
                    
                    # Score based on keyword matches
                    score = 0
                    for keyword in keywords:
                        if keyword.lower() in prompt:
                            score += 2
                    
                    # Score based on description matches
                    for word in prompt.split():
                        if word in description:
                            score += 1
                    
                    if score > best_score:
                        best_score = score
                        best_match = {
                            "filename": filename,
                            "name": template_data.get("name", filename.replace(".json", "")),
                            "description": description,
                            "nodeCount": len(template_data.get("nodes", [])),
                            "score": score
                        }
                
                except Exception as e:
                    logger.warning(f"Failed to process template {filename}: {e}")
        
        if best_match and best_score > 0:
            logger.info(f"✅ Suggested template: {best_match['filename']} (score: {best_score})")
            return jsonify({"success": True, "suggestion": best_match, "score": best_score}), 200
        else:
            return jsonify({"success": True, "suggestion": None, "message": "No matching templates found"}), 200
    
    except Exception as e:
        logger.error(f"Error suggesting template: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/workflows/import-template", methods=["POST", "OPTIONS"])
def import_template_workflow():
    """Import a template and optionally customize it with user prompt."""
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    
    try:
        import os
        import json as json_lib
        
        data = request.get_json() or {}
        template_name = data.get("templateName")
        user_prompt = data.get("prompt", "")
        
        if not template_name:
            return jsonify({"success": False, "error": "Template name is required"}), 400
        
        # Load the template
        template_name = os.path.basename(template_name)
        if not template_name.endswith(".json"):
            template_name += ".json"
        
        templates_dir = os.path.join(os.path.dirname(__file__), "workflows", "templates")
        template_path = os.path.join(templates_dir, template_name)
        
        if not os.path.exists(template_path):
            return jsonify({"success": False, "error": f"Template '{template_name}' not found"}), 404
        
        with open(template_path, "r") as f:
            workflow = json_lib.load(f)
        
        # Customize the workflow with user prompt if provided
        if user_prompt:
            workflow["name"] = f"{workflow.get('name', 'Workflow')} - {user_prompt[:50]}"
            
            # Update any AI Agent nodes with user context
            for node in workflow.get("nodes", []):
                if "agent" in node.get("type", "").lower() and "parameters" in node:
                    text_param = node["parameters"].get("text", "")
                    if text_param and user_prompt not in text_param:
                        node["parameters"]["text"] = f"{text_param}\n\nUser Request: {user_prompt}"
        
        logger.info(f"✅ Imported template: {template_name}")
        return jsonify({
            "success": True,
            "workflow": workflow,
            "nodeCount": len(workflow.get("nodes", [])),
            "message": f"Template '{template_name}' loaded successfully"
        }), 200
    
    except Exception as e:
        logger.error(f"Error importing template: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

# ────────────────────────────────────────────────────────────────────────────
# QB INVOICE INTENT DETECTION WITH AI
# ────────────────────────────────────────────────────────────────────────────

def detect_qb_invoice_intent(user_prompt: str) -> tuple[bool, str]:
    """
    Use Azure OpenAI to detect if user wants to create QB invoice from Gmail attachment.
    
    Returns: (is_qb_invoice: bool, email_address: str or None)
    
    The AI will analyze the prompt for intent and extract email if present.
    Response format: {"isQBInvoice": true/false, "email": "email@example.com" or null}
    """
    print(f"\n{'='*80}")
    print(f"🔍 [DETECT_QB_INTENT] Called with prompt: {user_prompt[:100]}...")
    print(f"🔍 [DETECT_QB_INTENT] Using DEPLOYMENT_NAME: {DEPLOYMENT_NAME}")
    print(f"🔍 [DETECT_QB_INTENT] Using Azure endpoint: {endpoint}")
    print(f"{'='*80}\n")
    
    if not user_prompt:
        print("❌ [DETECT_QB_INTENT] Empty prompt, returning False")
        return False, None
    
    try:
        # System prompt for the AI to analyze QB invoice intent
        system_prompt = """You are an expert workflow analyzer. Your task is to determine if a user prompt indicates they want to:
1. Create a QuickBooks invoice
2. Extract data from a PDF/Gmail attachment
3. Process customer information

Analyze the prompt and respond with ONLY a JSON object (no markdown, no explanation):
{"isQBInvoice": true/false, "email": "extracted@email.com" or null}

Examples:
- "Create a quickbooks invoice from gmail pdf attachment to sales@company.com" → {"isQBInvoice": true, "email": "sales@company.com"}
- "Process QB invoices from Gmail attachments for customers" → {"isQBInvoice": true, "email": null}
- "Send invoice emails to customers" → {"isQBInvoice": false, "email": null}
- "Generate a workflow that extracts PDFs" → {"isQBInvoice": false, "email": null}

Consider variations like:
- "QB", "QuickBooks", "Quickbook"
- "invoice", "bill", "receipt"
- "gmail", "email", "mail attachment", "PDF"
- "customer", "client", "vendor"

Be lenient with phrasing but require BOTH QB/invoice context AND PDF/email context.
"""
        
        response = client.chat.completions.create(
            model=DEPLOYMENT_NAME,  # Use existing Azure OpenAI client
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Analyze this prompt: {user_prompt}"}
            ],
            max_tokens=100,
            temperature=0.1,  # Low temperature for consistent decisions
        )
        
        response_text = response.choices[0].message.content.strip()
        print(f"🤖 AI Intent Detection Response: {response_text}")
        
        # Parse JSON response
        result = json.loads(response_text)
        print(f"✅ Parsed AI Result: {result}")
        is_qb_invoice = result.get("isQBInvoice", False)
        email = result.get("email")
        
        print(f"✅ QB Invoice Intent: {is_qb_invoice}, Email: {email}")
        return is_qb_invoice, email
        
    except json.JSONDecodeError as je:
        print(f"⚠️ Failed to parse AI response as JSON: {je}")
        # Fallback: try to extract email anyway
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        matches = re.findall(email_pattern, user_prompt)
        email = matches[0] if matches else None
        return False, email
        
    except Exception as e:
        print(f"⚠️ AI intent detection failed: {e}")
        # Fallback to regex email extraction
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        matches = re.findall(email_pattern, user_prompt)
        email = matches[0] if matches else None
        return False, email


def customize_template_for_email(workflow: dict, email_address: str) -> dict:
    """
    Customize template by injecting email address into Gmail-related nodes.
    Only modifies email parameters, preserves all other nodes/connections.
    """
    if not email_address or not workflow:
        return workflow
    
    nodes = workflow.get("nodes", [])
    
    for node in nodes:
        node_type = node.get("type", "")
        node_name = node.get("name", "").lower()
        
        # Gmail Send node – matches any node that is used to send emails
        if "gmail" in node_type and node_type.endswith(".gmail"):
            # This is a "gmail" node (which can send, reply, etc.)
            if "parameters" not in node:
                node["parameters"] = {}
            node["parameters"]["sendTo"] = email_address
            print(f"✅ Updated Gmail Send node '{node.get('name')}' email to: {email_address}")
        
        # Also check by common send-related names (optional)
        elif any(keyword in node_name for keyword in ["send", "reply"]):
            if "parameters" not in node:
                node["parameters"] = {}
            node["parameters"]["sendTo"] = email_address
            print(f"✅ Updated node '{node.get('name')}' (type {node_type}) email to: {email_address}")
        
        # Gmail Trigger – no change needed, just log
        elif "gmailtrigger" in node_type.lower():
            print(f"✅ Found Gmail Trigger node: {node.get('name')}")
    
    return workflow

@app.route("/api/generate-workflow-new", methods=["POST", "OPTIONS"])
def generate_workflow_new():
    """
    V2: N8N Cloud style — LangGraph + N8N live validation loop.
    Supports both normal and invoice workflow types.
    """
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    try:
        # ── Input validation ─────────────────────────────────────────
        try:
            data = request.get_json()
            print("✅ Received request data:", data)
        except UnsupportedMediaType:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Content-Type must be application/json",
                        "workflow": None,
                    }
                ),
                415,
            )
        except BadRequest:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Invalid JSON in request",
                        "workflow": None,
                    }
                ),
                400,
            )

        user_prompt = data.get("prompt")
        workflow_type = data.get("workflowType", "normal")
        
        if not user_prompt:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Prompt is required",
                        "workflow": None,
                    }
                ),
                400,
            )

        print(f"\n{'='*60}\nRequest: {user_prompt}\nWorkflow Type: {workflow_type}\n{'='*60}")

        # ── Route based on workflow type ──────────────────────────────
        workflow = None
        
        # ── CRITICAL: Check QB invoice intent FIRST (AI-powered) ──────
        print(f"🔍 Analyzing prompt for QB invoice intent using AI...")
        is_qb_invoice, extracted_email = detect_qb_invoice_intent(user_prompt)
        
        if is_qb_invoice:
            print("🎯 QB Invoice Intent Detected by AI! Loading template directly...")
            try:
                import os
                import json as json_lib
                
                template_path = os.path.join(
                    os.path.dirname(__file__), 
                    "workflows", 
                    "templates", 
                    "quickbooks-invoice-from-gmail.json"
                )
                
                if not os.path.exists(template_path):
                    raise FileNotFoundError(f"QB Invoice template not found at {template_path}")
                
                with open(template_path, "r") as f:
                    workflow = json_lib.load(f)
                
                print(f"✅ QB Invoice template loaded with {len(workflow.get('nodes', []))} nodes")
                
                # Use email extracted by AI, or fallback to None
                if extracted_email:
                    workflow = customize_template_for_email(workflow, extracted_email)
                    print(f"✅ Template customized with email: {extracted_email}")
                else:
                    print("ℹ️ No email found in prompt - template loaded without email customization")
                
                # Update workflow name with user context
                if user_prompt:
                    workflow["name"] = f"QB Invoice from Gmail - {user_prompt[:40]}"
                
                print("✅ QB Invoice workflow loaded and customized")
                
                # Return immediately - SKIP all other processing
                return jsonify(
                    {
                        "success": True,
                        "workflow": workflow,
                        "workflow_type": "quickbooks-invoice",
                        "template_used": True,
                        "email_extracted": extracted_email,
                        "validation": {"success": True, "valid_types": [], "invalid_types": []},
                        "attempts": 1,
                    }
                )
                
            except Exception as qb_err:
                print(f"⚠️ QB Invoice intent detected but template error: {qb_err}")
                import traceback
                traceback.print_exc()
                # Fall through to normal processing
        else:
            print("ℹ️ No QB invoice intent detected - proceeding with normal workflow generation")
        
        if workflow_type == "invoice":
            # Load invoice template and enhance it
            print("📋 Loading invoice workflow template...")
            try:
                import os
                import json as json_lib
                
                template_path = os.path.join(os.path.dirname(__file__), "workflows", "quickbook_invoice.json")
                
                if not os.path.exists(template_path):
                    raise FileNotFoundError(f"Invoice template not found at {template_path}")
                
                with open(template_path, "r") as f:
                    workflow = json_lib.load(f)
                
                print(f"✅ Template loaded with {len(workflow.get('nodes', []))} nodes")
                
                # Enhance the template based on user description
                # Update workflow name with user context
                if user_prompt:
                    workflow["name"] = f"Invoice Processing - {user_prompt[:50]}"
                
                # Update AI Agent node prompt to include user description
                for node in workflow.get("nodes", []):
                    if node.get("name") == "AI Agent5" and "parameters" in node:
                        # Enhance the AI prompt with user context
                        original_text = node["parameters"].get("text", "")
                        if user_prompt and "based on" not in original_text.lower():
                            node["parameters"]["text"] = original_text + f"\n\nUser Request: {user_prompt}"
                            print(f"  🔧 Enhanced AI Agent prompt with user context")
                
                print("✅ Invoice workflow template enhanced successfully")
                
            except Exception as template_err:
                print(f"❌ Invoice template error: {template_err}")
                import traceback
                traceback.print_exc()
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": f"Failed to load invoice template: {str(template_err)}",
                            "workflow": None,
                        }
                    ),
                    500,
                )
        else:
            # Default: Normal workflow generation
            # ── STEP 1: Try to find matching template (silent, hidden from user) ──
            template_used = False
            try:
                import os
                import json as json_lib
                
                templates_dir = os.path.join(os.path.dirname(__file__), "workflows", "templates")
                best_match = None
                best_score = 0
                
                if os.path.exists(templates_dir):
                    print(f"🔍 Checking {len(os.listdir(templates_dir))} templates for match...")
                    
                    for filename in os.listdir(templates_dir):
                        if filename.endswith(".json"):
                            filepath = os.path.join(templates_dir, filename)
                            try:
                                with open(filepath, "r") as f:
                                    template_data = json_lib.load(f)
                                
                                keywords = template_data.get("meta", {}).get("keywords", [])
                                description = template_data.get("meta", {}).get("description", "").lower()
                                prompt_lower = user_prompt.lower()
                                
                                # Score based on keyword matches
                                score = 0
                                for keyword in keywords:
                                    if keyword.lower() in prompt_lower:
                                        score += 2
                                
                                # Score based on description matches
                                for word in prompt_lower.split():
                                    if word in description:
                                        score += 1
                                
                                if score > best_score:
                                    best_score = score
                                    best_match = {
                                        "path": filepath,
                                        "filename": filename,
                                        "data": template_data,
                                        "score": score
                                    }
                            
                            except Exception as e:
                                logger.debug(f"Could not load template {filename}: {e}")
                
                # ── STEP 2: Use template if good match (score >= 3) ──
                if best_match and best_score >= 3:
                    try:
                        workflow = best_match["data"]
                        
                        # Customize with user prompt
                        if user_prompt:
                            workflow["name"] = f"{workflow.get('name', 'Workflow')} - {user_prompt[:50]}"
                            
                            # Enhance AI Agent nodes with user context
                            for node in workflow.get("nodes", []):
                                if "agent" in node.get("type", "").lower() and "parameters" in node:
                                    text_param = node["parameters"].get("text", "")
                                    if text_param and user_prompt not in text_param:
                                        # Add user request to system message instead
                                        system_msg = node["parameters"].get("options", {}).get("systemMessage", "")
                                        if system_msg:
                                            node["parameters"]["options"]["systemMessage"] = system_msg + f"\n\nUser Request: {user_prompt}"
                        
                        template_used = True
                        print(f"✅ Template match found (score: {best_score}) - using '{best_match['filename']}'")
                    
                    except Exception as template_err:
                        logger.warning(f"Failed to use template, falling back to LLM: {template_err}")
                        template_used = False
            
            except Exception as template_scan_err:
                logger.debug(f"Template scanning skipped: {template_scan_err}")
            
            # ── STEP 3: If no template matched, use LangGraph generation ──
            if not template_used:
                print("🚀 Generating with LangGraph (no template matched)...")
                try:
                    generator = WorkflowGeneratorV2()
                    workflow = generator.generate(user_prompt)
                    print("✅ Workflow generated successfully")

                    # ── Final safety pass: ensure AI Agent nodes have promptType ──
                    for node in workflow.get("nodes", []):
                        if "langchain.agent" in node.get("type", ""):
                            if "parameters" not in node:
                                node["parameters"] = {}
                            if not node["parameters"].get("promptType"):
                                node["parameters"]["promptType"] = "auto"
                                print(f"  🔧 Post-gen: injected promptType=auto for '{node.get('name')}'")

                except Exception as gen_err:
                    print(f"❌ Generation error: {gen_err}")
                    import traceback

                    traceback.print_exc()
                    return (
                        jsonify(
                            {
                                "success": False,
                                "error": f"Workflow generation failed: {str(gen_err)}",
                                "workflow": None,
                            }
                        ),
                        500,
                    )

        # ── Response ─────────────────────────────────────────────────
        if not workflow:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Failed to generate or load workflow",
                        "workflow": None,
                    }
                ),
                500,
            )
        
        return jsonify(
            {
                "success": True,
                "workflow": workflow,
                "workflow_type": workflow_type,
                "validation": {"success": True, "valid_types": [], "invalid_types": []},
                "attempts": 1,
            }
        )

    except Exception as e:
        print(f"❌ Server Error: {str(e)}")
        import traceback

        traceback.print_exc()
        return (
            jsonify(
                {
                    "success": False,
                    "error": f"Server error: {str(e)}",
                    "workflow": None,
                }
            ),
            500,
        )


# ===============================================================
# Fetch all Workflow from n8n


# ====================================================================
# ============================ AGENTS API ============================
# ====================================================================

@app.route("/api/agents", methods=["GET", "OPTIONS"])
@jwt_required()
def list_agents():
    if request.method == "OPTIONS":
        return "", 204
    try:
        agents = Agent.query.order_by(Agent.created_at.desc()).all()
        return jsonify({"success": True, "agents": [a.to_dict() for a in agents]}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/agents", methods=["POST"])
@jwt_required()
def create_agent():
    try:
        user_id = int(get_jwt_identity())
        body = request.get_json() or {}
        name = (body.get("name") or "").strip()
        if not name:
            return jsonify({"success": False, "error": "name is required"}), 400
        agent = Agent(
            name=name,
            description=(body.get("description") or "").strip(),
            system_prompt=(body.get("system_prompt") or "").strip(),
            model=body.get("model", "gpt-4o"),
            tools=body.get("tools", []),
            status="online",
            user_id=user_id,
        )
        db.session.add(agent)
        db.session.commit()
        log_audit_event(
            event_type="agent.create",
            action=f"Agent created: {agent.name}",
            resource=agent.name,
            resource_id=str(agent.id),
            actor=str(user_id),
            user_id=user_id,
            severity="info",
            status="success",
            metadata={"model": agent.model, "tools": agent.tools},
        )
        return jsonify({"success": True, "agent": agent.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/agents/<agent_id>", methods=["PATCH", "OPTIONS"])
@jwt_required()
def update_agent(agent_id):
    if request.method == "OPTIONS":
        return "", 204
    try:
        agent = db.session.get(Agent, agent_id)
        if not agent:
            return jsonify({"success": False, "error": "Agent not found"}), 404
        body = request.get_json() or {}
        if "status" in body:
            agent.status = body["status"]
        if "name" in body:
            agent.name = body["name"]
        if "description" in body:
            agent.description = body["description"]
        if "system_prompt" in body:
            agent.system_prompt = body["system_prompt"]
        if "model" in body:
            agent.model = body["model"]
        if "tools" in body:
            agent.tools = body["tools"]
        db.session.commit()
        uid = int(get_jwt_identity())
        log_audit_event(
            event_type="agent.update",
            action=f"Agent updated: {agent.name}",
            resource=agent.name,
            resource_id=str(agent.id),
            actor=str(uid),
            user_id=uid,
            severity="info",
            status="success",
            metadata={"fields_changed": list(body.keys())},
        )
        return jsonify({"success": True, "agent": agent.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/agents/<agent_id>", methods=["DELETE", "OPTIONS"])
@jwt_required()
def delete_agent(agent_id):
    if request.method == "OPTIONS":
        return "", 204
    try:
        agent = db.session.get(Agent, agent_id)
        if not agent:
            return jsonify({"success": False, "error": "Agent not found"}), 404
        agent_name = agent.name
        uid = int(get_jwt_identity())
        db.session.delete(agent)
        db.session.commit()
        log_audit_event(
            event_type="agent.delete",
            action=f"Agent deleted: {agent_name}",
            resource=agent_name,
            resource_id=agent_id,
            actor=str(uid),
            user_id=uid,
            severity="warning",
            status="success",
        )
        return jsonify({"success": True}), 200
    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/agents/<agent_id>/publish", methods=["POST", "OPTIONS"])
@jwt_required()
def publish_agent(agent_id):
    """Activate (publish) an already-deployed agent workflow in n8n."""
    if request.method == "OPTIONS":
        return "", 204
    try:
        agent = db.session.get(Agent, agent_id)
        if not agent:
            return jsonify({"success": False, "error": "Agent not found"}), 404
        if not agent.n8n_workflow_id:
            return jsonify({"success": False, "error": "Agent has not been deployed yet. Deploy first."}), 400
        headers = {"X-N8N-API-KEY": N8N_API_KEY, "Content-Type": "application/json"}
        res = requests.post(
            f"{N8N_BASE_URL}/api/v1/workflows/{agent.n8n_workflow_id}/activate",
            headers=headers, timeout=10,
        )
        print(f"[PUBLISH] agent={agent.name} wf={agent.n8n_workflow_id} status={res.status_code}")
        uid = int(get_jwt_identity())
        if res.status_code in (200, 201):
            agent.status = "online"
            db.session.commit()
            log_audit_event(
                event_type="agent.publish",
                action=f"Agent published to n8n: {agent.name}",
                resource=agent.name,
                resource_id=agent_id,
                actor=str(uid),
                user_id=uid,
                severity="info",
                status="success",
                metadata={"n8n_workflow_id": agent.n8n_workflow_id},
            )
            return jsonify({"success": True, "message": "Workflow published and active"}), 200
        log_audit_event(
            event_type="agent.publish",
            action=f"Agent publish failed: {agent.name}",
            resource=agent.name,
            resource_id=agent_id,
            actor=str(uid),
            user_id=uid,
            severity="warning",
            status="failed",
            metadata={"n8n_status": res.status_code},
        )
        return jsonify({"success": False, "error": f"n8n returned {res.status_code}: {res.text[:200]}"}), 400
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


# ====================================================================
# ======================== N8N CREDENTIALS API ========================
# ====================================================================

@app.route("/api/n8n/credentials", methods=["GET", "OPTIONS"])
@jwt_required()
def list_n8n_credentials():
    if request.method == "OPTIONS":
        return "", 204
    try:
        headers = {"X-N8N-API-KEY": N8N_API_KEY, "Content-Type": "application/json"}
        res = requests.get(f"{N8N_BASE_URL}/api/v1/credentials", headers=headers, timeout=10)
        data = res.json()
        print(f"[N8N CREDS] raw response keys: {list(data.keys()) if isinstance(data, dict) else 'list'}")
        # n8n returns { data: [...], nextCursor: null } OR a plain list
        if isinstance(data, list):
            creds = data
        else:
            creds = data.get("data", [])
        print(f"[N8N CREDS] found {len(creds)} credentials, types: {[c.get('type') for c in creds]}")
        safe = [{"id": c.get("id"), "name": c.get("name"), "type": c.get("type"),
                 "createdAt": c.get("createdAt"), "updatedAt": c.get("updatedAt")} for c in creds]
        return jsonify({"success": True, "credentials": safe}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/n8n/credentials", methods=["POST"])
@jwt_required()
def create_n8n_credential():
    try:
        body = request.get_json() or {}
        name = body.get("name", "").strip()
        cred_type = body.get("type", "").strip()
        cred_data = body.get("data", {})
        if not name or not cred_type or not cred_data:
            return jsonify({"success": False, "error": "name, type and data are required"}), 400
        headers = {"X-N8N-API-KEY": N8N_API_KEY, "Content-Type": "application/json"}
        payload = {"name": name, "type": cred_type, "data": cred_data}
        res = requests.post(f"{N8N_BASE_URL}/api/v1/credentials", json=payload, headers=headers, timeout=10)
        result = res.json()
        uid = int(get_jwt_identity())
        if res.status_code in (200, 201):
            log_audit_event(
                event_type="credential.create",
                action=f"Credential created: {name}",
                resource=name,
                resource_id=result.get("id", ""),
                actor=str(uid),
                user_id=uid,
                severity="info",
                status="success",
                metadata={"type": cred_type},
            )
            return jsonify({"success": True, "id": result.get("id"), "name": result.get("name")}), 200
        return jsonify({"success": False, "error": result.get("message", "n8n error")}), res.status_code
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/n8n/credentials/<cred_id>", methods=["DELETE", "OPTIONS"])
@jwt_required()
def delete_n8n_credential(cred_id):
    if request.method == "OPTIONS":
        return "", 204
    try:
        headers = {"X-N8N-API-KEY": N8N_API_KEY, "Content-Type": "application/json"}
        res = requests.delete(f"{N8N_BASE_URL}/api/v1/credentials/{cred_id}", headers=headers, timeout=10)
        uid = int(get_jwt_identity())
        if res.status_code in (200, 204):
            log_audit_event(
                event_type="credential.delete",
                action=f"Credential deleted: {cred_id}",
                resource="Credential",
                resource_id=cred_id,
                actor=str(uid),
                user_id=uid,
                severity="warning",
                status="success",
            )
            return jsonify({"success": True}), 200
        return jsonify({"success": False, "error": f"n8n returned {res.status_code}"}), res.status_code
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

# ====================================================================
# ================= N8N WORKFLOW ACTIVATE / DEACTIVATE ===============
# ====================================================================

@app.route("/api/n8n/workflows/<workflow_id>/activate", methods=["POST", "OPTIONS"])
@jwt_required()
def activate_n8n_workflow(workflow_id):
    if request.method == "OPTIONS":
        return "", 204
    try:
        headers = {"X-N8N-API-KEY": N8N_API_KEY, "Content-Type": "application/json"}
        uid = int(get_jwt_identity())
        res = requests.post(f"{N8N_BASE_URL}/api/v1/workflows/{workflow_id}/activate", headers=headers, timeout=10)
        if res.status_code in (200, 201):
            log_audit_event(
                event_type="workflow.activate",
                action=f"Workflow activated: {workflow_id}",
                resource="Workflow",
                resource_id=workflow_id,
                actor=str(uid),
                user_id=uid,
                severity="info",
                status="success",
            )
            return jsonify({"success": True}), 200
        return jsonify({"success": False, "error": f"n8n returned {res.status_code}: {res.text}"}), res.status_code
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/n8n/workflows/<workflow_id>/deactivate", methods=["POST", "OPTIONS"])
@jwt_required()
def deactivate_n8n_workflow(workflow_id):
    if request.method == "OPTIONS":
        return "", 204
    try:
        headers = {"X-N8N-API-KEY": N8N_API_KEY, "Content-Type": "application/json"}
        uid = int(get_jwt_identity())
        res = requests.post(f"{N8N_BASE_URL}/api/v1/workflows/{workflow_id}/deactivate", headers=headers, timeout=10)
        if res.status_code in (200, 201):
            log_audit_event(
                event_type="workflow.deactivate",
                action=f"Workflow deactivated: {workflow_id}",
                resource="Workflow",
                resource_id=workflow_id,
                actor=str(uid),
                user_id=uid,
                severity="info",
                status="success",
            )
            return jsonify({"success": True}), 200
        return jsonify({"success": False, "error": f"n8n returned {res.status_code}: {res.text}"}), res.status_code
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


# ====================================================================
# ======================== AGENT DEPLOY TO N8N =======================
# ====================================================================

@app.route("/api/agents/<agent_id>/deploy", methods=["POST", "OPTIONS"])
@jwt_required()
def deploy_agent(agent_id):
    """Push an AI Agent workflow to n8n and return the webhook/chat URL."""
    if request.method == "OPTIONS":
        return "", 204
    try:
        agent = db.session.get(Agent, agent_id)
        if not agent:
            return jsonify({"success": False, "error": "Agent not found"}), 404

        n8n_headers = {"X-N8N-API-KEY": N8N_API_KEY, "Content-Type": "application/json"}

        # ── Step 1: Find the Azure OpenAI credential in n8n and bind it ──
        azure_cred = None
        try:
            creds_res = requests.get(f"{N8N_BASE_URL}/api/v1/credentials", headers=n8n_headers, timeout=10)
            creds_data = creds_res.json()
            all_creds = creds_data if isinstance(creds_data, list) else creds_data.get("data", [])
            azure_types = {"azureopenaiapi", "azureopenai", "azureopenai"}
            for c in all_creds:
                if c.get("type", "").lower().replace("_", "") in azure_types or \
                   "azure" in c.get("type", "").lower():
                    azure_cred = {"id": c["id"], "name": c["name"]}
                    break
            print(f"[DEPLOY] Azure OpenAI credential: {azure_cred}")
        except Exception as e:
            print(f"[DEPLOY] Could not fetch credentials: {e}")

        # ── Step 2: Build the Azure OpenAI model node with bound credential ─
        webhook_path = str(agent.id)

        azure_node = {
            "id": "node-azure-openai-model",
            "name": "Azure OpenAI Chat Model",
            "type": "@n8n/n8n-nodes-langchain.lmChatAzureOpenAi",
            "typeVersion": 1,
            "position": [300, 220],
            "parameters": {"model": agent.model or "gpt-4o"},
        }
        if azure_cred:
            azure_node["credentials"] = {"azureOpenAiApi": azure_cred}

        workflow_payload = {
            "name": f"Agent: {agent.name}",
            "nodes": [
                {
                    "id": "node-chat-trigger",
                    "name": "Chat Trigger",
                    "type": "@n8n/n8n-nodes-langchain.chatTrigger",
                    "typeVersion": 1,
                    "position": [0, 0],
                    "parameters": {"public": True, "path": webhook_path, "options": {}},
                    "webhookId": webhook_path,
                },
                {
                    "id": "node-ai-agent",
                    "name": "AI Agent",
                    "type": "@n8n/n8n-nodes-langchain.agent",
                    "typeVersion": 1.7,
                    "position": [300, 0],
                    "parameters": {
                        "systemMessage": agent.system_prompt or f"You are {agent.name}. {agent.description}",
                        "options": {},
                    },
                },
                azure_node,
            ],
            "connections": {
                "Chat Trigger": {
                    "main": [[{"node": "AI Agent", "type": "main", "index": 0}]]
                },
                "Azure OpenAI Chat Model": {
                    "ai_languageModel": [[{"node": "AI Agent", "type": "ai_languageModel", "index": 0}]]
                },
            },
            "settings": {"executionOrder": "v1"},
        }

        # ── Step 3: Create or update workflow ───────────────────────────────
        if agent.n8n_workflow_id:
            res = requests.put(
                f"{N8N_BASE_URL}/api/v1/workflows/{agent.n8n_workflow_id}",
                json=workflow_payload, headers=n8n_headers, timeout=15,
            )
        else:
            res = requests.post(
                f"{N8N_BASE_URL}/api/v1/workflows",
                json=workflow_payload, headers=n8n_headers, timeout=15,
            )

        if res.status_code not in (200, 201):
            return jsonify({"success": False, "error": f"n8n error {res.status_code}: {res.text}"}), 400

        wf_data = res.json()
        wf_id = wf_data.get("id")
        print(f"[DEPLOY] workflow created/updated: {wf_id}")

        # ── Step 4: Activate (publish) the workflow ──────────────────────────
        act_res = requests.post(
            f"{N8N_BASE_URL}/api/v1/workflows/{wf_id}/activate",
            headers=n8n_headers, timeout=10,
        )
        activated = act_res.status_code in (200, 201)
        print(f"[DEPLOY] activation: {act_res.status_code} — {act_res.text[:300]}")

        # ── Step 5: Persist and respond ──────────────────────────────────────
        agent.n8n_workflow_id = wf_id
        agent.status = "online"
        db.session.commit()

        uid = int(get_jwt_identity())
        chat_url = f"{N8N_BASE_URL}/webhook/{webhook_path}/chat"
        n8n_editor_url = f"{N8N_BASE_URL}/workflow/{wf_id}"

        log_audit_event(
            event_type="agent.deploy",
            action=f"Agent deployed to n8n: {agent.name}",
            resource=agent.name,
            resource_id=agent_id,
            actor=str(uid),
            user_id=uid,
            severity="info",
            status="success",
            metadata={"n8n_workflow_id": wf_id, "activated": activated, "chat_url": chat_url},
        )

        return jsonify({
            "success": True,
            "workflow_id": wf_id,
            "workflow_name": wf_data.get("name"),
            "chat_url": chat_url,
            "n8n_url": n8n_editor_url,
            "activated": act_res.status_code in (200, 201),
        }), 200

    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


# ====================================================================


@app.route("/api/n8n/workflows", methods=["GET", "OPTIONS"])
def get_n8n_workflows():
    """Get all workflows from N8N API - returns array compatible with frontend"""
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        origin = request.headers.get("Origin")
        allowed_origins = [
            "http://localhost:5173",
            "http://localhost:7001",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            " http://127.0.0.1:7000",
            "http://127.0.0.1:3000",
        ]

        if origin in allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
        else:
            response.headers["Access-Control-Allow-Origin"] = "*"

        response.headers["Access-Control-Allow-Methods"] = (
            "GET, POST, PUT, DELETE, OPTIONS"
        )
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response

    try:
        # Get N8N configuration
        n8n_base_url = os.getenv(
            "N8N_BASE_URL", "https://n8n-5loq6-u71020.vm.elestio.app"
        ).rstrip("/")
        api_key = os.getenv("N8N_API_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiOTJmNzQzMC03YTY5LTRiMjYtYjk1Yy1mNDgxNzA4MzdmMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDM4ZGVlZmMtZjc0YS00OGQxLWFkYjAtNTA0MjNlN2IwYWJmIiwiaWF0IjoxNzc1NjI0ODY2fQ.WObhNkvAUoAArxg_WIK4W1shT8nEaFGh33wj5fBN5Us").strip().strip('"').strip("'")

        if not api_key:
            logger.warning("N8N_API_KEY not configured")
            # Return empty array on error for frontend compatibility
            return jsonify([]), 200

        # Fetch workflows from N8N API
        headers = {"Content-Type": "application/json", "X-N8N-API-KEY": api_key}

        logger.info(f"📡 Fetching workflows from N8N: {n8n_base_url}/api/v1/workflows")

        n8n_response = requests.get(
            f"{n8n_base_url}/api/v1/workflows", headers=headers, timeout=30
        )

        logger.info(f"📊 N8N Response Status: {n8n_response.status_code}")

        if n8n_response.status_code == 200:
            n8n_data = n8n_response.json()
            workflows = []

            # Handle both list and paginated responses
            if isinstance(n8n_data, list):
                workflows_list = n8n_data
            elif isinstance(n8n_data, dict) and "data" in n8n_data:
                workflows_list = n8n_data.get("data", [])
            else:
                workflows_list = []

            for workflow in workflows_list:
                workflows.append(
                    {
                        "id": str(workflow.get("id", "")),
                        "name": workflow.get("name", "Untitled"),
                        "active": workflow.get("active", False),
                        "createdAt": workflow.get("createdAt", ""),
                        "updatedAt": workflow.get("updatedAt", ""),
                        "nodes_count": (
                            len(workflow.get("nodes", []))
                            if isinstance(workflow.get("nodes"), list)
                            else 0
                        ),
                        "type": "n8n",
                    }
                )

            logger.info(f"✅ Retrieved {len(workflows)} workflows from N8N")

            # Return array directly for frontend compatibility
            return jsonify(workflows), 200
        else:
            logger.error(f"N8N API returned {n8n_response.status_code}")
            # Return empty array on error for frontend compatibility
            return jsonify([]), 200

    except requests.exceptions.Timeout:
        logger.error("N8N request timeout (30 seconds)")
        return jsonify([]), 200
    except requests.exceptions.ConnectionError as e:
        logger.error(f"Cannot connect to N8N: {e}")
        return jsonify([]), 200
    except Exception as e:
        logger.error(f"Error fetching N8N workflows: {str(e)}", exc_info=True)
        return jsonify([]), 200


# ===================================================
# get and delte workflow
# SPECIFIC ROUTES - Must come BEFORE generic /api/n8n/workflows route
@app.route("/api/n8n/workflows/<workflow_id>", methods=["GET", "DELETE"])
def get_n8n_workflow_details(workflow_id: str):
    """Get details of a specific n8n workflow"""
    if request.method == "DELETE":
        return get_workflow_by_id(workflow_id)

    # Handle GET
    try:
        n8n_base_url = os.getenv("N8N_HOST", "https://n8n-5loq6-u71020.vm.elestio.app").rstrip("/")
        api_key = os.getenv("N8N_API_KEY", "").strip('"')

        logger.info(f"Fetching workflow {workflow_id} from {n8n_base_url}")

        headers = {
            "Accept": "application/json",
            "X-N8N-API-KEY": api_key
        }

        # Try N8N API
        try:
            response = requests.get(
                f"{n8n_base_url}/api/v1/workflows/{workflow_id}",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                workflow_data = response.json()
                return jsonify({
                    "success": True,
                    "workflow": workflow_data
                }), 200
            elif response.status_code == 404:
                logger.warning(f"Workflow {workflow_id} not found in N8N")
        except Exception as e:
            logger.warning(f"N8N API failed: {e}")

        # Fallback: Try database
        try:
            chatflow = ChatFlow.query.filter(
                (ChatFlow.id == workflow_id) | 
                (ChatFlow.n8n_workflow_id == workflow_id)
            ).first()
            
            if chatflow and chatflow.flow_json:
                return jsonify({
                    "success": True,
                    "workflow": chatflow.flow_json
                }), 200
        except Exception as e:
            logger.warning(f"DB fallback failed: {e}")

        return jsonify({
            "success": False,
            "error": f"Workflow '{workflow_id}' not found"
        }), 404

    except Exception as e:
        logger.error(f"Error fetching workflow {workflow_id}: {str(e)}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


# =======================================================
# Get workflow by ID
@app.route("/api/workflows/<workflow_id>", methods=["GET", "DELETE", "OPTIONS"])
def get_workflow_by_id(workflow_id: str):
    """Universal workflow endpoint - GET/DELETE from N8N or database"""
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, Accept"
        return response

    if request.method == "DELETE":
        try:
            n8n_base_url = os.getenv("N8N_HOST", "https://n8n-5loq6-u71020.vm.elestio.app").rstrip("/")
            api_key = os.getenv("N8N_API_KEY", "").strip('"')

            deleted_from_n8n = False
            if api_key:
                try:
                    resp = requests.delete(
                        f"{n8n_base_url}/api/v1/workflows/{workflow_id}",
                        headers={
                            "Content-Type": "application/json",
                            "X-N8N-API-KEY": api_key,
                        },
                        timeout=15,
                    )
                    if resp.status_code in [200, 204]:
                        deleted_from_n8n = True
                except Exception as e:
                    logger.warning(f"N8N deletion failed: {e}")

            # Try database deletion
            deleted_from_db = False
            try:
                from uuid import UUID as _UUID
                _UUID(workflow_id)
                chatflow = ChatFlow.query.filter_by(id=workflow_id).first()
                if chatflow:
                    ChatMessage.query.filter_by(chatflow_id=workflow_id).delete()
                    db.session.delete(chatflow)
                    db.session.commit()
                    deleted_from_db = True
            except ValueError:
                pass
            except Exception as e:
                db.session.rollback()
                logger.warning(f"DB deletion failed: {e}")

            if deleted_from_db or deleted_from_n8n:
                return jsonify({
                    "success": True,
                    "message": "Workflow deleted",
                    "id": workflow_id,
                }), 200
            else:
                return jsonify({"success": False, "error": "Workflow not found"}), 404

        except Exception as e:
            logger.error(f"Delete error: {str(e)}", exc_info=True)
            return jsonify({"success": False, "error": str(e)}), 500

    # GET - Try N8N first, then database
    try:
        n8n_base_url = os.getenv("N8N_HOST", "https://n8n-5loq6-u71020.vm.elestio.app").rstrip("/")
        api_key = os.getenv("N8N_API_KEY", "").strip('"')

        headers = {
            "Accept": "application/json",
            "X-N8N-API-KEY": api_key
        }

        # Try N8N
        try:
            resp = requests.get(
                f"{n8n_base_url}/api/v1/workflows/{workflow_id}",
                headers=headers,
                timeout=10
            )
            if resp.status_code == 200:
                return jsonify({
                    "success": True,
                    "workflow": resp.json()
                }), 200
        except Exception as e:
            logger.warning(f"N8N fetch failed: {e}")

        # Fallback: Database
        chatflow = ChatFlow.query.filter(
            (ChatFlow.id == workflow_id) | 
            (ChatFlow.n8n_workflow_id == workflow_id)
        ).first()
        
        if chatflow:
            return jsonify({
                "success": True,
                "workflow": chatflow.flow_json or {
                    "id": str(chatflow.id),
                    "name": chatflow.name,
                    "flow_code": chatflow.flow_code,
                }
            }), 200

    except Exception as e:
        logger.error(f"Get error: {str(e)}", exc_info=True)

    return jsonify({
        "success": False,
        "error": f"Workflow '{workflow_id}' not found"
    }), 404

# # SPECIFIC ROUTES - Must come BEFORE generic /api/n8n/workflows route
# @app.route("/api/n8n/workflows/<workflow_id>", methods=["GET", "DELETE"])
# def get_n8n_workflow_details(workflow_id: str):
#     """Get details of a specific n8n workflow, or delete it"""
#     # Handle DELETE - delegate to the main delete endpoint
#     if request.method == "DELETE":
#         return get_workflow_by_id(workflow_id)

#     # Handle GET
#     try:
#         from n8n_integration import get_n8n_session
#         import os as _os

#         logger.info(f"Fetching n8n workflow details for ID: {workflow_id}")

#         n8n_session = get_n8n_session()

#         # Add API key authentication for Render n8n
#         headers = {"Accept": "application/json"}
#         api_key = _os.getenv("N8N_API_KEY")
#         logger.info(
#             f"[CHECK] N8N_API_KEY check - exists: {bool(api_key)}, length: {len(api_key) if api_key else 0}"
#         )
#         if api_key:
#             api_key_clean = api_key.strip('"')
#             headers["X-N8N-API-KEY"] = api_key_clean
#             logger.info("Added N8N_API_KEY to workflow fetch headers")
#         else:
#             logger.warning("[WARN] N8N_API_KEY is not set")

#         response = n8n_session.get(
#             f"{N8N_BASE_URL}/workflows/{workflow_id}", headers=headers, timeout=10
#         )

#         if response.status_code == 200:
#             workflow_data = response.json()
#             logger.info(f"[OK] Retrieved workflow {workflow_id}")
#             # Wrap in workflow object to match frontend expectations
#             return (
#                 jsonify(
#                     {
#                         "authenticated": True,
#                         "success": True,
#                         "workflow": {
#                             "id": workflow_data.get("id"),
#                             "name": workflow_data.get("name"),
#                             "nodes": workflow_data.get("nodes", []),
#                             "connections": workflow_data.get("connections", {}),
#                             "settings": workflow_data.get("settings", {}),
#                             "active": workflow_data.get("active", False),
#                             "createdAt": workflow_data.get("createdAt"),
#                             "updatedAt": workflow_data.get("updatedAt"),
#                         },
#                     }
#                 ),
#                 200,
#             )
#         elif response.status_code == 404:
#             logger.warning(f"Workflow {workflow_id} not found in n8n")
#             return (
#                 jsonify(
#                     {
#                         "success": False,
#                         "error": f"Workflow {workflow_id} not found in n8n",
#                     }
#                 ),
#                 404,
#             )
#         else:
#             logger.error(
#                 f"Failed to fetch workflow {workflow_id}: {response.status_code}"
#             )
#             return (
#                 jsonify(
#                     {
#                         "success": False,
#                         "error": f"N8n returned status {response.status_code}",
#                         "details": response.text,
#                     }
#                 ),
#                 response.status_code,
#             )

#     except Exception as e:
#         logger.error(
#             f"Error fetching n8n workflow {workflow_id}: {str(e)}", exc_info=True
#         )
#         return jsonify({"success": False, "error": str(e)}), 500


# # =======================================================
# # Get workflow by ID
# @app.route("/api/workflows/<workflow_id>", methods=["GET", "DELETE", "OPTIONS"])
# def get_workflow_by_id(workflow_id: str):
#     if request.method == "OPTIONS":
#         response = app.make_default_options_response()
#         response.headers["Access-Control-Allow-Origin"] = "*"
#         response.headers["Access-Control-Allow-Methods"] = (
#             "GET, POST, PUT, DELETE, OPTIONS, PATCH"
#         )
#         response.headers["Access-Control-Allow-Headers"] = (
#             "Content-Type, Authorization, X-Requested-With, Accept"
#         )
#         return response

#     if request.method == "DELETE":
#         try:
#             n8n_base_url = os.getenv(
#                 "N8N_BASE_URL", "https://n8n-1-123-5-kjot.onrender.com"
#             ).rstrip("/")
#             api_key = os.getenv("N8N_API_KEY", "").strip('"')

#             deleted_from_n8n = False
#             if api_key:
#                 try:
#                     resp = requests.delete(
#                         f"{n8n_base_url}/api/v1/workflows/{workflow_id}",
#                         headers={
#                             "Content-Type": "application/json",
#                             "X-N8N-API-KEY": api_key,
#                         },
#                         timeout=15,
#                     )
#                     if resp.status_code in [200, 204]:
#                         deleted_from_n8n = True
#                 except Exception as e:
#                     logger.warning(f"n8n deletion failed: {e}")

#             deleted_from_db = False
#             try:
#                 from uuid import UUID as _UUID

#                 _UUID(workflow_id)
#                 chatflow = ChatFlow.query.filter_by(id=workflow_id).first()
#                 if chatflow:
#                     ChatMessage.query.filter_by(chatflow_id=workflow_id).delete()
#                     db.session.delete(chatflow)
#                     db.session.commit()
#                     deleted_from_db = True
#             except ValueError:
#                 pass
#             except Exception as e:
#                 db.session.rollback()
#                 logger.warning(f"DB deletion failed: {e}")

#             if deleted_from_db or deleted_from_n8n:
#                 return (
#                     jsonify(
#                         {
#                             "success": True,
#                             "message": "Workflow deleted",
#                             "id": workflow_id,
#                         }
#                     ),
#                     200,
#                 )
#             else:
#                 return jsonify({"success": False, "error": "Workflow not found"}), 404

#         except Exception as e:
#             return jsonify({"success": False, "error": str(e)}), 500

#     # GET
#     try:
#         from n8n_integration import get_n8n_session, N8N_BASE_URL

#         n8n_session = get_n8n_session()
#         api_key = os.getenv("N8N_API_KEY", "").strip('"')
#         headers = {"Accept": "application/json", "X-N8N-API-KEY": api_key}

#         resp = n8n_session.get(
#             f"{N8N_BASE_URL}/workflows/{workflow_id}", headers=headers, timeout=10
#         )
#         if resp.status_code == 200:
#             d = resp.json()
#             return jsonify({"success": True, "workflow": d}), 200

#     except Exception as e:
#         logger.warning(f"N8N fetch failed: {e}")

#     # DB fallback
#     try:
#         chatflow = ChatFlow.query.filter(
#             (ChatFlow.id == workflow_id) | (ChatFlow.n8n_workflow_id == workflow_id)
#         ).first()
#         if chatflow:
#             return (
#                 jsonify(
#                     {
#                         "success": True,
#                         "workflow": {
#                             "id": str(chatflow.id),
#                             "name": chatflow.name,
#                             "flow_code": chatflow.flow_code,
#                         },
#                     }
#                 ),
#                 200,
#             )
#     except Exception as e:
#         logger.warning(f"DB fetch failed: {e}")

#     return (
#         jsonify({"success": False, "error": f"Workflow '{workflow_id}' not found"}),
#         404,
#     )


# ========================================================
# DElete workflow


@app.route("/api/n8n/delete-workflow/<workflow_id>", methods=["DELETE"])
def delete_n8n_workflow(workflow_id):
    """
    Delete a workflow from the remote n8n instance.
    """
    try:
        headers = {
            "Content-Type": "application/json",
            "X-N8N-API-KEY": N8N_API_KEY,  # Add this line
        }
        # If your n8n instance requires an API key, add it here:
        # headers["X-N8N-API-KEY"] = N8N_API_KEY

        url = f"{N8N_BASE_URL}/workflows/{workflow_id}"
        response = requests.delete(url, headers=headers, timeout=15)
        if response.status_code == 200:
            return jsonify({"success": True, "message": "Workflow deleted"}), 200
        else:
            return (
                jsonify({"success": False, "error": response.text}),
                response.status_code,
            )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ─── HELPER: Get or Create Default User ───────────────────────────────────────
def get_or_create_default_user():
    """Ensure a default user exists for workflows (user_id=1)"""
    try:
        user = User.query.filter_by(id=1).first()
        if not user:
            # Create default user if it doesn't exist
            hashed_pw = bcrypt.generate_password_hash("default_password").decode(
                "utf-8"
            )
            user = User(
                id=1,
                name="System User",
                email="system@aiagent.local",
                password=hashed_pw,
                role="user",
            )
            db.session.add(user)
            db.session.commit()
            logger.info("✅ Created default user (ID=1)")
        return user.id
    except Exception as e:
        logger.warning(f"⚠️ Could not ensure default user: {e}")
        return 1  # Return 1 as fallback


# ─── HELPER: Get User ID from JWT or Default ───────────────────────────────────
def get_user_id_for_workflow():
    """Get user ID from JWT token, or use default user (ID=1)"""
    try:
        from flask_jwt_extended import get_jwt_identity

        user_id = get_jwt_identity()
        if user_id:
            return int(user_id)
    except:
        pass

    # Fallback to default user
    return get_or_create_default_user()


# ====================================================================
# Save workflow with nodes


@app.route("/api/save-workflow", methods=["POST", "OPTIONS"])
def save_workflow():
    """
    Save a generated N8N workflow to the database AND create it in N8N
    """
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    try:
        # 1. INPUT VALIDATION
        try:
            data = request.get_json()
        except UnsupportedMediaType:
            return (
                jsonify(
                    {"success": False, "error": "Content-Type must be application/json"}
                ),
                415,
            )
        except BadRequest:
            return jsonify({"success": False, "error": "Invalid JSON in request"}), 400

        workflow = data.get("workflow")
        workflow_name = data.get("name", "Untitled Workflow")

        if not workflow:
            return (
                jsonify({"success": False, "error": "Workflow JSON is required"}),
                400,
            )

        if not isinstance(workflow, dict):
            return (
                jsonify(
                    {"success": False, "error": "Workflow must be a valid JSON object"}
                ),
                400,
            )

        print(f"\n{'='*60}\nSaving Workflow: {workflow_name}\n{'='*60}")

        # 2. CREATE IN N8N FIRST
        n8n_workflow_id = None
        n8n_success = False
        n8n_error = None

        try:
            print(f"📤 Pushing workflow to N8N: {N8N_BASE_URL}/api/v1/workflows")

            # Convert positions from object format {x, y} to array format [x, y] for N8N API
            nodes_for_n8n = []
            for node in workflow.get("nodes", []):
                node_copy = node.copy() if isinstance(node, dict) else node
                if isinstance(node_copy, dict) and "position" in node_copy:
                    pos = node_copy["position"]
                    # Convert {x: 250, y: 300} -> [250, 300]
                    if isinstance(pos, dict) and "x" in pos and "y" in pos:
                        node_copy["position"] = [pos["x"], pos["y"]]
                        print(
                            f"  📍 Converted {node_copy.get('name', 'Node')}: {pos} → {node_copy['position']}"
                        )

                # ── AI Agent node: ensure promptType is set ──────────────
                node_type = node_copy.get("type", "") if isinstance(node_copy, dict) else ""
                if "langchain.agent" in node_type:
                    if "parameters" not in node_copy:
                        node_copy["parameters"] = {}
                    params = node_copy["parameters"]
                    if not params.get("promptType"):
                        params["promptType"] = "auto"
                        print(f"  🔧 Injected promptType=auto into AI Agent '{node_copy.get('name')}'")
                    # If promptType is 'define' but text is blank, fall back to auto
                    if params.get("promptType") == "define" and not str(params.get("text", "")).strip():
                        params["promptType"] = "auto"
                        print(f"  🔧 Switched AI Agent '{node_copy.get('name')}' from define→auto (empty text)")

                nodes_for_n8n.append(node_copy)

            # Prepare workflow for N8N API
            n8n_payload = {
                "name": workflow_name,
                "nodes": nodes_for_n8n,
                "connections": workflow.get("connections", {}),
                "settings": workflow.get("settings", {}),
                "staticData": workflow.get("staticData", {}),
            }

            # Add N8N API headers
            headers = {
                "Content-Type": "application/json",
            }
            if N8N_API_KEY:
                headers["X-N8N-API-KEY"] = N8N_API_KEY
            else:
                print(
                    "⚠️ WARNING: N8N_API_KEY not set in environment - API authentication will fail"
                )

            print(f"📤 Calling N8N API with headers: {list(headers.keys())}")

            n8n_response = requests.post(
                f"{N8N_BASE_URL}/api/v1/workflows",
                json=n8n_payload,
                headers=headers,
                timeout=30,
            )

            if n8n_response.status_code in [200, 201]:
                n8n_data = n8n_response.json()
                n8n_workflow_id = str(n8n_data.get("id"))
                n8n_success = True
                print(f"✅ Workflow created in N8N with ID: {n8n_workflow_id}")
            else:
                n8n_error = (
                    f"N8N API returned {n8n_response.status_code}: {n8n_response.text}"
                )
                print(f"⚠️ N8N creation failed: {n8n_error}")

        except requests.exceptions.Timeout:
            n8n_error = "N8N request timeout (30 seconds)"
            print(f"⚠️ {n8n_error}")
        except requests.exceptions.ConnectionError as e:
            n8n_error = f"Cannot connect to N8N at {N8N_BASE_URL}"
            print(f"⚠️ {n8n_error}: {str(e)}")
        except Exception as e:
            n8n_error = str(e)
            print(f"⚠️ N8N push failed: {n8n_error}")
        print("N8N URL:", f"{N8N_BASE_URL}/api/v1/workflows")
        print("Status:", n8n_response.status_code)
        print("Response:", n8n_response.text[:200])
        # 3. DATABASE SAVE
        db_workflow_id = None
        try:
            # Get user ID (from JWT or default)
            user_id = get_user_id_for_workflow()

            # Create ChatFlow object for storage
            chat_flow = ChatFlow(
                name=workflow_name,
                flow_json=workflow,
                flow_code="",
                user_id=user_id,  # Use actual user ID
                n8n_workflow_id=n8n_workflow_id,  # Store the N8N workflow ID
            )

            db.session.add(chat_flow)
            db.session.commit()

            db_workflow_id = str(chat_flow.id)
            print(
                f"✅ Workflow saved to database with ID: {db_workflow_id} (user_id={user_id})"
            )
            log_audit_event(
                event_type="workflow.create",
                action=f"Workflow saved: {workflow_name}",
                resource=workflow_name,
                resource_id=db_workflow_id,
                actor=str(user_id),
                user_id=user_id,
                severity="info",
                status="success",
                metadata={
                    "n8n_workflow_id": n8n_workflow_id,
                    "node_count": len(workflow.get("nodes", [])),
                },
            )

        except Exception as db_err:
            db.session.rollback()
            print(f"⚠️  Database save failed: {db_err}")
            traceback.print_exc()

        # 4. PREPARE RESPONSE
        success = n8n_success or db_workflow_id is not None

        if n8n_success:
            message = f"✅ Workflow '{workflow_name}' created in N8N and saved!"
        elif db_workflow_id:
            message = f"⚠️ Saved to database but N8N creation failed: {n8n_error}"
        else:
            message = f"❌ Failed to save workflow"

        return jsonify(
            {
                "success": success,
                "message": message,
                "database_id": db_workflow_id,
                "n8n_workflow_id": n8n_workflow_id,
                "n8n_created": n8n_success,
                "workflow_name": workflow_name,
                "n8n_url": (
                    f"{N8N_BASE_URL}/workflows/{n8n_workflow_id}"
                    if n8n_workflow_id
                    else None
                ),
                "error": n8n_error if not n8n_success else None,
            }
        ), (
            200 if success else 206
        )  # 206 Partial Content if partial success

    except Exception as e:
        print(f"❌ Save Workflow Error: {str(e)}")
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


# ====================================================================
# ======================== DOCUMENT CHAT (RAG) ========================
# Uses Azure OpenAI embeddings for both storage and retrieval
# ====================================================================

import uuid as _uuid
import io as _io
import hashlib as _hashlib

# ── Configuration ────────────────────────────────────────────────────────────
_EMBEDDING_DEPLOYMENT = os.getenv("EMBEDDING_DEPLOYMENT", "text-embedding-3-small")
_EMBEDDING_ENDPOINT   = os.getenv("EMBEDDING_ENDPOINT", "https://openai-chan-dev-5521.services.ai.azure.com")
_EMBEDDING_KEY        = os.getenv("EMBEDDING_KEY", os.getenv("AZURE_OPENAI_KEY", ""))
_CHROMA_DIR           = os.path.join(os.path.dirname(__file__), "chroma_db")
_COLLECTION_NAME      = "chat_docs_azure_v3"   # new collection — proper Azure embeddings

# ── Dedicated Azure OpenAI client for embeddings (separate endpoint) ──────────
_embed_client = AzureOpenAI(
    api_version="2024-02-01",
    azure_endpoint=_EMBEDDING_ENDPOINT,
    api_key=_EMBEDDING_KEY,
)

# ── ChromaDB-compatible embedding function ────────────────────────────────────
class _AzureEmbeddingFunction:
    def name(self) -> str:
        return "azure-openai-embedding-v3"

    def _embed(self, input: list) -> list:
        response = _embed_client.embeddings.create(
            input=input,
            model=_EMBEDDING_DEPLOYMENT,
        )
        return [item.embedding for item in response.data]

    def __call__(self, input: list) -> list:
        return self._embed(input)

    def embed_documents(self, input: list) -> list:
        return self._embed(input)

    def embed_query(self, input: list) -> list:
        return self._embed(input if isinstance(input, list) else [input])

_azure_ef = _AzureEmbeddingFunction()

def _get_chroma_docs_collection():
    import chromadb
    os.makedirs(_CHROMA_DIR, exist_ok=True)
    chroma_client = chromadb.PersistentClient(path=_CHROMA_DIR)
    print(f"[RAG] Using Azure OpenAI embedding: {_EMBEDDING_DEPLOYMENT} @ {_EMBEDDING_ENDPOINT}")
    return chroma_client.get_or_create_collection(
        name=_COLLECTION_NAME,
        embedding_function=_azure_ef,
        metadata={"hnsw:space": "cosine"},
    )

# ── Text Extraction ───────────────────────────────────────────────────────────
def _extract_text(file_bytes: bytes, filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext == "pdf":
        # pdfplumber: best for real-world PDFs (tables, columns, mixed layouts)
        try:
            import pdfplumber
            with pdfplumber.open(_io.BytesIO(file_bytes)) as pdf:
                pages = [page.extract_text() or "" for page in pdf.pages]
            text = "\n\n".join(p.strip() for p in pages if p.strip())
            if text.strip():
                print(f"[RAG] PDF extracted via pdfplumber: {len(text)} chars")
                return text
        except Exception as e:
            print(f"[RAG] pdfplumber failed: {e}")

        # pypdf fallback
        try:
            import pypdf
            reader = pypdf.PdfReader(_io.BytesIO(file_bytes))
            pages = [reader.pages[i].extract_text() or "" for i in range(len(reader.pages))]
            text = "\n\n".join(p.strip() for p in pages if p.strip())
            if text.strip():
                print(f"[RAG] PDF extracted via pypdf: {len(text)} chars")
                return text
        except Exception as e:
            print(f"[RAG] pypdf failed: {e}")

        # If all PDF extractors fail, raise so the user gets a clear error
        raise ValueError(
            "Could not extract text from PDF. "
            "The file may be scanned/image-based. Please use a text-based PDF."
        )

    elif ext == "docx":
        try:
            import docx as _docx
            doc = _docx.Document(_io.BytesIO(file_bytes))
            return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        except ImportError:
            pass

    # Plain text formats: txt, md, csv, json, etc.
    return file_bytes.decode("utf-8", errors="ignore")

# ── Chunking (word-boundary aware) ────────────────────────────────────────────
def _chunk_text(text: str, chunk_size: int = 600, overlap: int = 80) -> list:
    words = text.split()
    chunks, current, length = [], [], 0
    for word in words:
        current.append(word)
        length += len(word) + 1
        if length >= chunk_size:
            chunks.append(" ".join(current))
            # keep overlap words for context continuity
            overlap_words = current[-max(1, overlap // 6):]
            current = overlap_words
            length = sum(len(w) + 1 for w in current)
    if current:
        chunks.append(" ".join(current))
    return [c.strip() for c in chunks if c.strip()]

# ── RAG Answer via Azure OpenAI GPT ─────────────────────────────────────────
def _rag_answer(question: str, context_chunks: list) -> str:
    context = "\n\n".join(context_chunks)
    response = client.chat.completions.create(
        model=deployment,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a helpful document assistant. "
                    "The user has uploaded a document and is asking questions about it. "
                    "The full document text (or the most relevant parts) is provided below. "
                    "Answer the user's question accurately based on the document content. "
                    "For summary requests, provide a clear structured summary of the document. "
                    "For specific questions, give precise answers with relevant details from the document. "
                    "Always base your answer on the document content provided."
                ),
            },
            {
                "role": "user",
                "content": f"Document content:\n\n{context}\n\n---\n\nUser question: {question}",
            },
        ],
        max_tokens=1500,
        temperature=0.2,
    )
    return response.choices[0].message.content


# ── API Endpoints ─────────────────────────────────────────────────────────────

@app.route("/api/chat/upload", methods=["POST", "OPTIONS"])
@jwt_required()
def chat_upload_document():
    if request.method == "OPTIONS":
        return "", 204
    try:
        if "file" not in request.files:
            return jsonify({"success": False, "error": "No file provided"}), 400

        file = request.files["file"]
        filename = file.filename or "document"
        file_bytes = file.read()
        file_hash = _hashlib.md5(file_bytes).hexdigest()

        # Extract text
        text = _extract_text(file_bytes, filename)
        if not text.strip():
            return jsonify({"success": False, "error": "Could not extract text from document"}), 400

        doc_id = str(_uuid.uuid4())
        chunks = _chunk_text(text)

        collection = _get_chroma_docs_collection()

        # Remove any previous version of this exact file
        try:
            existing = collection.get(where={"file_hash": file_hash})
            if existing["ids"]:
                collection.delete(ids=existing["ids"])
        except Exception:
            pass

        import time as _time
        uploaded_at = int(_time.time())
        file_size_bytes = len(file_bytes)
        ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "doc_id": doc_id,
                "filename": filename,
                "file_hash": file_hash,
                "chunk_index": i,
                "characters": len(text),
                "file_size_bytes": file_size_bytes,
                "uploaded_at": uploaded_at,
            }
            for i in range(len(chunks))
        ]
        collection.add(ids=ids, documents=chunks, metadatas=metadatas)

        print(f"[RAG] Uploaded '{filename}': {len(chunks)} chunks embedded via Azure OpenAI ({_EMBEDDING_DEPLOYMENT})")
        return jsonify({
            "success": True,
            "doc_id": doc_id,
            "filename": filename,
            "chunks": len(chunks),
            "characters": len(text),
        }), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/chat/documents", methods=["GET", "OPTIONS"])
@jwt_required()
def chat_list_documents():
    if request.method == "OPTIONS":
        return "", 204
    try:
        collection = _get_chroma_docs_collection()
        result = collection.get(include=["metadatas"])
        seen = {}
        for meta in (result.get("metadatas") or []):
            doc_id = meta.get("doc_id", "")
            if not doc_id:
                continue
            if doc_id not in seen:
                seen[doc_id] = {
                    "doc_id": doc_id,
                    "filename": meta.get("filename", ""),
                    "file_hash": meta.get("file_hash", ""),
                    "file_size_bytes": meta.get("file_size_bytes", 0),
                    "characters": meta.get("characters", 0),
                    "uploaded_at": meta.get("uploaded_at", 0),
                    "chunks": 0,
                }
            seen[doc_id]["chunks"] += 1
        docs = sorted(seen.values(), key=lambda d: d.get("uploaded_at", 0), reverse=True)
        return jsonify({"success": True, "documents": docs}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/chat/stats", methods=["GET", "OPTIONS"])
@jwt_required()
def chat_stats():
    if request.method == "OPTIONS":
        return "", 204
    try:
        collection = _get_chroma_docs_collection()
        result = collection.get(include=["metadatas"])
        metadatas = result.get("metadatas") or []
        total_chunks = len(metadatas)
        seen_docs = {}
        total_bytes = 0
        for meta in metadatas:
            doc_id = meta.get("doc_id", "")
            if doc_id and doc_id not in seen_docs:
                seen_docs[doc_id] = True
                total_bytes += meta.get("file_size_bytes", 0)
        total_docs = len(seen_docs)
        # Format storage
        if total_bytes >= 1_073_741_824:
            storage = f"{total_bytes/1_073_741_824:.1f} GB"
        elif total_bytes >= 1_048_576:
            storage = f"{total_bytes/1_048_576:.1f} MB"
        elif total_bytes >= 1024:
            storage = f"{total_bytes/1024:.1f} KB"
        else:
            storage = f"{total_bytes} B"
        return jsonify({
            "success": True,
            "total_documents": total_docs,
            "total_chunks": total_chunks,
            "storage_used": storage,
            "storage_bytes": total_bytes,
        }), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/chat/documents/<doc_id>", methods=["DELETE", "OPTIONS"])
@jwt_required()
def chat_delete_document(doc_id):
    if request.method == "OPTIONS":
        return "", 204
    try:
        collection = _get_chroma_docs_collection()
        existing = collection.get(where={"doc_id": doc_id})
        if not existing["ids"]:
            return jsonify({"success": False, "error": "Document not found"}), 404
        collection.delete(ids=existing["ids"])
        return jsonify({"success": True, "deleted": len(existing["ids"])}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/chat/query", methods=["POST", "OPTIONS"])
@jwt_required()
def chat_query_documents():
    if request.method == "OPTIONS":
        return "", 204
    try:
        data = request.get_json() or {}
        question = (data.get("question") or "").strip()
        doc_ids = data.get("doc_ids")  # list of doc_ids selected in UI, or None/[]
        if not question:
            return jsonify({"success": False, "error": "Question is required"}), 400

        collection = _get_chroma_docs_collection()
        if collection.count() == 0:
            return jsonify({"success": True, "answer": "No documents have been uploaded yet. Please upload a document first."}), 200

        total = collection.count()
        if total == 0:
            return jsonify({"success": True, "answer": "No documents uploaded yet. Please upload a document first."}), 200

        # ── Pure RAG: Azure embeddings for both query and retrieval ───────────
        # Retrieve top-K semantically similar chunks, then generate answer.
        # If specific docs are selected, restrict search to those docs only.
        n_results = min(8, total)
        query_kwargs: dict = {"query_texts": [question], "n_results": n_results}
        if doc_ids and len(doc_ids) > 0:
            where = {"doc_id": {"$in": doc_ids}} if len(doc_ids) > 1 else {"doc_id": doc_ids[0]}
            query_kwargs["where"] = where

        results = collection.query(**query_kwargs)
        chunks_found = results.get("documents", [[]])[0]

        if not chunks_found:
            return jsonify({"success": True, "answer": "No relevant content found. Try rephrasing your question."}), 200

        answer = _rag_answer(question, chunks_found)
        return jsonify({"success": True, "answer": answer, "sources": len(chunks_found)}), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


# ====================================================================

# if __name__ == "__main__":
#     PORT = 7000
#     HOST = "127.0.0.1"
#     debug = True
#     # db.create_all()
#     print("✅ Database tables created")
#     app.run(host=HOST, port=PORT, debug=debug)

if __name__ == "__main__":
    PORT = int(os.environ.get("PORT", 10000))
    HOST = "0.0.0.0"
    debug = True
    print("✅ Database tables created")
    app.run(host=HOST, port=PORT, debug=debug)