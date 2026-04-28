#!/usr/bin/env python3
"""Database Connection & Sequence Check"""

import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, inspect
from pathlib import Path

# Load .env
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)

DATABASE_URL = os.getenv("DATABASE_URL")
print(f"📍 DATABASE_URL: {DATABASE_URL[:60]}...")

# ─── Test 1: Raw Connection ───────────────────────────────────────────────────
print("\n✅ TEST 1: Raw PostgreSQL Connection")
try:
    engine = create_engine(DATABASE_URL,pool_pre_ping=True, echo=False)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print(f"   ✓ Connection successful: {result.fetchone()}")
except Exception as e:
    print(f"   ✗ Connection failed: {e}")
    sys.exit(1)

# ─── Test 2: Database Exists ───────────────────────────────────────────────────
print("\n✅ TEST 2: Check Database & Tables")
try:
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"   ✓ Tables found: {tables}")
except Exception as e:
    print(f"   ✗ Failed: {e}")

# ─── Test 3: Users Table Sequence ───────────────────────────────────────────────
print("\n✅ TEST 3: Check 'users' Table & Sequence")
try:
    with engine.connect() as conn:
        # Check if table exists
        result = conn.execute(text("""
            SELECT EXISTS(
                SELECT 1 FROM information_schema.tables 
                WHERE table_name='users'
            )
        """))
        exists = result.fetchone()[0]
        
        if not exists:
            print("   ✗ 'users' table does NOT exist")
        else:
            print("   ✓ 'users' table exists")
            
            # Get current max ID
            result = conn.execute(text("SELECT MAX(id) FROM users"))
            max_id = result.fetchone()[0]
            print(f"   ✓ Max user ID: {max_id}")
            
            # Get sequence value
            result = conn.execute(text("""
                SELECT last_value FROM pg_sequences WHERE sequencename='users_id_seq'
            """))
            seq_row = result.fetchone()
            if seq_row:
                seq_val = seq_row[0]
                print(f"   ✓ Sequence current value: {seq_val}")
                
                # Compare
                if max_id is None:
                    print("   ℹ Table is empty - sequence should be 1")
                elif max_id >= seq_val:
                    print(f"   ✗ PROBLEM: Sequence ({seq_val}) <= Max ID ({max_id})")
                    print(f"   💡 Fix: Run this SQL:")
                    print(f"      SELECT setval('users_id_seq', {max_id + 1});")
                else:
                    print(f"   ✓ Sequence is OK")
            else:
                print("   ✗ Sequence 'users_id_seq' not found")
                
except Exception as e:
    print(f"   ✗ Failed: {e}")

# ─── Test 4: Try Insert ───────────────────────────────────────────────────────
print("\n✅ TEST 4: Test Insert (without commit)")
try:
    with engine.begin() as conn:
        # Try to insert a test user
        conn.execute(text("""
            INSERT INTO users (name, email, password, role)
            VALUES (:name, :email, :password, :role)
        """), {
            "name": "test_user",
            "email": f"test_{os.urandom(4).hex()}@example.com",
            "password": "hashedpw_test",
            "role": "user"
        })
        print("   ✓ Insert successful (will rollback)")
except Exception as e:
    print(f"   ✗ Insert failed: {e}")

print("\n" + "="*60)
print("Database check complete!")