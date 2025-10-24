#!/usr/bin/env python3
"""
Migration script to update existing job_ids to use content-based hash
This ensures application status persists across data refreshes
"""

import asyncio
import hashlib
import aiosqlite
from pathlib import Path

# Database file path
DB_PATH = Path(__file__).parent.parent / "data.db"


def generate_new_job_id(company: str, role: str, location: str, application_url: str) -> str:
    """Generate new job_id using content-based hash"""
    content_for_hash = f"{company}|{role}|{location}|{application_url}"
    return hashlib.sha256(content_for_hash.encode()).hexdigest()[:16]


async def migrate_job_ids():
    """Migrate existing job_ids to new format"""
    print("Starting job_id migration...")
    
    db = await aiosqlite.connect(str(DB_PATH))
    db.row_factory = aiosqlite.Row
    
    # Get all existing applications
    cursor = await db.execute("SELECT * FROM applications")
    existing_apps = await cursor.fetchall()
    
    print(f"Found {len(existing_apps)} applications to migrate")
    
    migrated = 0
    skipped = 0
    
    for app in existing_apps:
        old_job_id = app['job_id']
        
        # Parse old job_id format: "company|role|location|date_posted"
        parts = old_job_id.split('|')
        if len(parts) >= 3:
            company = parts[0]
            role = parts[1] 
            location = parts[2]
            
            # For old records, we don't have application_url, use empty string
            new_job_id = generate_new_job_id(company, role, location, "")
            
            # Update the job_id if it's different
            if new_job_id != old_job_id:
                await db.execute(
                    "UPDATE applications SET job_id = ? WHERE job_id = ?",
                    (new_job_id, old_job_id)
                )
                migrated += 1
                print(f"Migrated: {old_job_id[:30]}... -> {new_job_id}")
            else:
                skipped += 1
        else:
            print(f"Skipping malformed job_id: {old_job_id}")
            skipped += 1
    
    await db.commit()
    await db.close()
    
    print(f"\nMigration complete!")
    print(f"Migrated: {migrated} applications")
    print(f"Skipped: {skipped} applications")


if __name__ == "__main__":
    asyncio.run(migrate_job_ids())