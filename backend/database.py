"""
Database models and connection handling for the internship tracker
"""
import aiosqlite
import os
from pathlib import Path

# Database file path
DB_PATH = Path(__file__).parent.parent / "data.db"


async def get_db():
    """Get database connection"""
    db = await aiosqlite.connect(str(DB_PATH))
    db.row_factory = aiosqlite.Row
    return db


async def init_db():
    """Initialize database tables"""
    db = await get_db()

    # Create applications table
    await db.execute("""
        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id TEXT UNIQUE NOT NULL,
            applied BOOLEAN DEFAULT FALSE,
            resume_hash TEXT,
            applied_date TEXT,
            notes TEXT,
            FOREIGN KEY (resume_hash) REFERENCES resumes(hash)
        )
    """)

    # Create resumes table
    await db.execute("""
        CREATE TABLE IF NOT EXISTS resumes (
            hash TEXT PRIMARY KEY,
            original_filename TEXT NOT NULL,
            file_path TEXT NOT NULL,
            upload_date TEXT NOT NULL
        )
    """)

    # Create index for faster lookups
    await db.execute("""
        CREATE INDEX IF NOT EXISTS idx_job_id ON applications(job_id)
    """)

    await db.commit()
    await db.close()

    print(f"Database initialized at {DB_PATH}")


async def get_application(job_id: str):
    """Get application status for a job"""
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM applications WHERE job_id = ?", (job_id,)
    )
    result = await cursor.fetchone()
    await db.close()
    return dict(result) if result else None


async def update_application(job_id: str, applied: bool, resume_hash: str = None, notes: str = None):
    """Update or create application status"""
    from datetime import datetime

    db = await get_db()
    applied_date = datetime.now().isoformat() if applied else None

    await db.execute("""
        INSERT INTO applications (job_id, applied, resume_hash, applied_date, notes)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(job_id) DO UPDATE SET
            applied = excluded.applied,
            resume_hash = excluded.resume_hash,
            applied_date = excluded.applied_date,
            notes = excluded.notes
    """, (job_id, applied, resume_hash, applied_date, notes))

    await db.commit()
    await db.close()


async def save_resume(hash_value: str, original_filename: str, file_path: str):
    """Save resume metadata to database"""
    from datetime import datetime

    db = await get_db()
    upload_date = datetime.now().isoformat()

    await db.execute("""
        INSERT OR IGNORE INTO resumes (hash, original_filename, file_path, upload_date)
        VALUES (?, ?, ?, ?)
    """, (hash_value, original_filename, file_path, upload_date))

    await db.commit()
    await db.close()


async def get_resume(hash_value: str):
    """Get resume by hash"""
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM resumes WHERE hash = ?", (hash_value,)
    )
    result = await cursor.fetchone()
    await db.close()
    return dict(result) if result else None


async def list_resumes():
    """List all resumes"""
    db = await get_db()
    cursor = await db.execute("SELECT * FROM resumes ORDER BY upload_date DESC")
    results = await cursor.fetchall()
    await db.close()
    return [dict(row) for row in results]
