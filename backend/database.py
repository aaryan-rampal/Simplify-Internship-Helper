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

    # Create internships table for permanent storage
    await db.execute("""
        CREATE TABLE IF NOT EXISTS internships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id TEXT UNIQUE NOT NULL,
            company TEXT NOT NULL,
            role TEXT NOT NULL,
            location TEXT NOT NULL,
            terms TEXT,
            is_faang_plus BOOLEAN DEFAULT FALSE,
            application_url TEXT,
            base_url TEXT,
            age_raw TEXT,
            date_posted TEXT,
            source_file TEXT,
            category TEXT,
            emojis TEXT,
            has_phd_emoji BOOLEAN DEFAULT FALSE,
            has_clearance_emoji BOOLEAN DEFAULT FALSE,
            position INTEGER,
            is_active BOOLEAN DEFAULT TRUE,
            last_seen TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)

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

    # Create indexes for faster lookups
    await db.execute("""
        CREATE INDEX IF NOT EXISTS idx_job_id ON applications(job_id)
    """)
    
    await db.execute("""
        CREATE INDEX IF NOT EXISTS idx_internship_job_id ON internships(job_id)
    """)
    
    await db.execute("""
        CREATE INDEX IF NOT EXISTS idx_internship_active ON internships(is_active)
    """)
    
    await db.execute("""
        CREATE INDEX IF NOT EXISTS idx_internship_category ON internships(category)
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


async def upsert_internship(internship_data: dict):
    """Insert or update internship, maintaining position and active status"""
    from datetime import datetime
    
    db = await get_db()
    now = datetime.now().isoformat()
    
    # Check if internship exists
    cursor = await db.execute(
        "SELECT * FROM internships WHERE job_id = ?", 
        (internship_data['job_id'],)
    )
    existing = await cursor.fetchone()
    
    if existing:
        # Update existing internship, preserve is_active status
        await db.execute("""
            UPDATE internships SET
                company = ?, role = ?, location = ?, terms = ?, is_faang_plus = ?,
                application_url = ?, base_url = ?, age_raw = ?, date_posted = ?,
                source_file = ?, category = ?, emojis = ?, has_phd_emoji = ?,
                has_clearance_emoji = ?, position = ?, last_seen = ?
            WHERE job_id = ?
        """, (
            internship_data['company'], internship_data['role'], internship_data['location'],
            internship_data.get('terms', ''), internship_data['is_faang_plus'],
            internship_data['application_url'], internship_data['base_url'],
            internship_data['age_raw'], internship_data['date_posted'],
            internship_data['source_file'], internship_data['category'],
            internship_data.get('emojis', ''), internship_data.get('has_phd_emoji', False),
            internship_data.get('has_clearance_emoji', False), internship_data['position'],
            now, internship_data['job_id']
        ))
    else:
        # Insert new internship
        await db.execute("""
            INSERT INTO internships (
                job_id, company, role, location, terms, is_faang_plus,
                application_url, base_url, age_raw, date_posted, source_file,
                category, emojis, has_phd_emoji, has_clearance_emoji,
                position, is_active, last_seen, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            internship_data['job_id'], internship_data['company'], internship_data['role'],
            internship_data['location'], internship_data.get('terms', ''), 
            internship_data['is_faang_plus'], internship_data['application_url'],
            internship_data['base_url'], internship_data['age_raw'],
            internship_data['date_posted'], internship_data['source_file'],
            internship_data['category'], internship_data.get('emojis', ''),
            internship_data.get('has_phd_emoji', False), 
            internship_data.get('has_clearance_emoji', False),
            internship_data['position'], True, now, now
        ))
    
    await db.commit()
    await db.close()


async def mark_missing_internships_inactive(active_job_ids: list):
    """Mark internships as inactive if not in the active list"""
    from datetime import datetime
    
    if not active_job_ids:
        return
    
    db = await get_db()
    now = datetime.now().isoformat()
    
    placeholders = ','.join(['?' for _ in active_job_ids])
    await db.execute(f"""
        UPDATE internships 
        SET is_active = FALSE, last_seen = ?
        WHERE job_id NOT IN ({placeholders}) AND is_active = TRUE
    """, [now] + active_job_ids)
    
    await db.commit()
    await db.close()


async def get_active_internships() -> list:
    """Get all active internships from database"""
    db = await get_db()
    cursor = await db.execute("""
        SELECT * FROM internships 
        WHERE is_active = TRUE 
        ORDER BY category, position
    """)
    results = await cursor.fetchall()
    await db.close()
    return [dict(row) for row in results]
