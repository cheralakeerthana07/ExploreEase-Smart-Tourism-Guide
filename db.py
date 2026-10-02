import hashlib
import os
import secrets
from typing import Optional
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

# Load environment variables from .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


def get_db_url() -> Optional[str]:
    """Retrieve and normalize the Neon PostgreSQL connection string."""
    url = os.getenv("DATABASE_URL")
    if not url:
        return None
    # Fix potential postgres:// scheme to postgresql:// for SQLAlchemy/psycopg compatibility
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


def get_connection():
    """Establish a connection to the Neon PostgreSQL database."""
    url = get_db_url()
    if not url:
        raise ValueError(
            "DATABASE_URL is not set. Please add your NeonDB connection string to the .env file."
        )
    return psycopg2.connect(url, cursor_factory=RealDictCursor)


def init_db() -> bool:
    """Initialize the required database tables if they do not exist."""
    url = get_db_url()
    if not url:
        print("[NeonDB] DATABASE_URL is not configured in .env. Skipping table creation.")
        return False

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS users (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        email VARCHAR(255) UNIQUE NOT NULL,
                        password_hash VARCHAR(255) NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
                    """
                )
                conn.commit()
        print("[NeonDB] 'users' table is ready.")
        return True
    except Exception as exc:
        print(f"[NeonDB Error] Failed to initialize database: {exc}")
        return False


def hash_password(password: str) -> str:
    """Hash a password using secure PBKDF2-HMAC-SHA256 with a unique salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}${key.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify a plain password against the stored PBKDF2 hash."""
    try:
        salt, key = stored_hash.split("$", 1)
        test_key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
        return secrets.compare_digest(test_key.hex(), key)
    except Exception:
        return False


def find_user_by_email(email: str) -> Optional[dict]:
    """Retrieve a user by their email address."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name, email, password_hash, created_at FROM users WHERE LOWER(email) = LOWER(%s);", (email.strip(),))
            return cur.fetchone()


def create_user(name: str, email: str, password: str) -> dict:
    """Insert a new user record into Neon PostgreSQL."""
    pwd_hash = hash_password(password)
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (name, email, password_hash)
                VALUES (%s, LOWER(%s), %s)
                RETURNING id, name, email, created_at;
                """,
                (name.strip(), email.strip(), pwd_hash),
            )
            new_user = cur.fetchone()
            conn.commit()
            return new_user
