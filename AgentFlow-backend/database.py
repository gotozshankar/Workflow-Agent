import os
import uuid
from sqlalchemy.ext.mutable import MutableDict, MutableList
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
from sqlalchemy.orm import relationship
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import UUID, JSONB

load_dotenv()

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"

    id         = db.Column(Integer, primary_key=True, autoincrement=True)
    name       = db.Column(String(120), nullable=False)
    email      = db.Column(String(255), unique=True, nullable=False)
    password   = db.Column(String(255), nullable=False)
    role       = db.Column(String(50), default="user", nullable=False)
    created_at = db.Column(DateTime, server_default=func.now())

    chatflows = db.relationship("ChatFlow", back_populates="user")
    chat_messages = db.relationship("ChatMessage", back_populates="user")

    def to_dict(self):
        return {
            "id":         self.id,
            "name":       self.name,
            "email":      self.email,
            "role":       self.role,
            "created_at": str(self.created_at),
        }


class ChatFlow(db.Model):
    __tablename__ = 'chatflows'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(String(255), nullable=True)
    flow_code = db.Column(Text, nullable=False)
    flow_json = db.Column(MutableDict.as_mutable(JSONB), nullable=False)
    n8n_workflow_id = db.Column(String(128), nullable=True)
    user_id = db.Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = db.Column(DateTime, default=datetime.utcnow)
    updated_at = db.Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="chatflows")
    chat_messages = relationship("ChatMessage", back_populates="chatflow")
    
    def __repr__(self):
        return f"<ChatFlow(id={self.id}, name='{self.name}', user_id={self.user_id})>"


class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'
    
    id = db.Column(Integer, primary_key=True, autoincrement=True)
    role = db.Column(String(50), nullable=False)
    content = db.Column(MutableDict.as_mutable(JSONB), nullable=False)
    session_id = db.Column(String(255), nullable=False)
    execution_id = db.Column(String(255), nullable=True)
    chatflow_id = db.Column(UUID(as_uuid=True), ForeignKey('chatflows.id'), nullable=False)
    user_id = db.Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = db.Column(DateTime, default=datetime.utcnow)
    updated_at = db.Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    chatflow = db.relationship("ChatFlow", back_populates="chat_messages")
    user = db.relationship("User", back_populates="chat_messages")
    
    def __repr__(self):
        return f"<ChatMessage(id={self.id}, role='{self.role}', session_id='{self.session_id}')>"


class Agent(db.Model):
    __tablename__ = "agents"

    id            = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name          = db.Column(String(255), nullable=False)
    description   = db.Column(Text, nullable=True)
    system_prompt = db.Column(Text, nullable=True)
    model         = db.Column(String(100), nullable=False, default="gpt-4o")
    tools            = db.Column(MutableList.as_mutable(JSONB), nullable=False, default=list)
    status           = db.Column(String(50), nullable=False, default="offline")
    n8n_workflow_id  = db.Column(String(128), nullable=True)
    user_id          = db.Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at    = db.Column(DateTime, default=datetime.utcnow)
    updated_at    = db.Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", backref="agents")

    def to_dict(self):
        return {
            "id":            str(self.id),
            "name":          self.name,
            "description":   self.description or "",
            "system_prompt": self.system_prompt or "",
            "model":         self.model,
            "tools":            self.tools or [],
            "status":           self.status,
            "n8n_workflow_id":  self.n8n_workflow_id,
            "user_id":          self.user_id,
            "created_at":       str(self.created_at),
        }


# ── Security & Compliance ──────────────────────────────────────────────────────

class SecurityPolicy(db.Model):
    """Stores all AI governance / guardrail toggle states and config."""
    __tablename__ = "security_policies"

    id         = db.Column(Integer, primary_key=True, autoincrement=True)
    # One row per user (or one global row when user_id is None)
    user_id    = db.Column(Integer, ForeignKey("users.id"), nullable=True)
    policies   = db.Column(MutableDict.as_mutable(JSONB), nullable=False, default=dict)
    updated_at = db.Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id":         self.id,
            "user_id":    self.user_id,
            "policies":   self.policies or {},
            "updated_at": str(self.updated_at),
        }


class AuditEvent(db.Model):
    """Immutable compliance audit log — every significant action is appended here."""
    __tablename__ = "audit_events"

    id          = db.Column(Integer, primary_key=True, autoincrement=True)
    event_type  = db.Column(String(100), nullable=False)   # e.g. "workflow.create"
    action      = db.Column(String(255), nullable=False)   # human-readable label
    resource    = db.Column(String(255), nullable=True)    # workflow/agent/credential name
    resource_id = db.Column(String(255), nullable=True)
    actor       = db.Column(String(255), nullable=True)    # email / "system"
    user_id     = db.Column(Integer, ForeignKey("users.id"), nullable=True)
    severity    = db.Column(String(20), nullable=False, default="info")  # info|warning|critical|success
    status      = db.Column(String(50), nullable=False, default="success")
    extra       = db.Column(MutableDict.as_mutable(JSONB), nullable=True, default=dict)
    ip_address  = db.Column(String(64), nullable=True)
    created_at  = db.Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id":          self.id,
            "event_type":  self.event_type,
            "action":      self.action,
            "resource":    self.resource or "",
            "resource_id": self.resource_id or "",
            "actor":       self.actor or "system",
            "user_id":     self.user_id,
            "severity":    self.severity,
            "status":      self.status,
            "metadata":    self.extra or {},
            "ip_address":  self.ip_address or "",
            "created_at":  str(self.created_at),
        }