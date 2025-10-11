"""
FastAPI application for internship tracker
"""
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional, List
import csv
import hashlib
import shutil
import subprocess
from pathlib import Path
from datetime import datetime

from database import init_db, get_application, update_application, save_resume, get_resume, list_resumes
from models import InternshipWithStatus, ApplicationUpdate, ResumeInfo, RefreshResponse

app = FastAPI(title="Internship Tracker API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
BASE_DIR = Path(__file__).parent.parent
INTERNSHIPS_DIR = BASE_DIR / "Summer2026-Internships"
RESUMES_DIR = BASE_DIR / "resumes"
RESUMES_DIR.mkdir(exist_ok=True)


def compute_file_hash(file_path: Path) -> str:
    """Compute SHA-256 hash of a file"""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def load_internships_from_csv(csv_path: Path, category: str) -> List[dict]:
    """Load internships from a CSV file"""
    internships = []
    if not csv_path.exists():
        return internships

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            internship = dict(row)
            internship['category'] = category
            # Create unique job_id based on company, role, and location
            job_id = f"{internship['company']}|{internship['role']}|{internship['location']}|{internship['date_posted']}"
            internship['job_id'] = job_id
            internships.append(internship)

    return internships


async def load_all_internships() -> List[dict]:
    """Load all internships from all CSV files"""
    categories = {
        "software_engineering": "software_engineering_internships.csv",
        "data_science": "data_science_ml_internships.csv",
        "quant_finance": "quantitative_finance_internships.csv",
        "product_management": "product_management_internships.csv",
        "hardware_engineering": "hardware_engineering_internships.csv",
    }

    all_internships = []
    for category, filename in categories.items():
        csv_path = INTERNSHIPS_DIR / filename
        internships = load_internships_from_csv(csv_path, category)
        all_internships.extend(internships)

    return all_internships


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    await init_db()


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Internship Tracker API", "version": "1.0.0"}


@app.get("/api/internships", response_model=List[InternshipWithStatus])
async def get_internships(
    category: Optional[str] = Query(None, description="Filter by category"),
    date_from: Optional[str] = Query(None, description="Filter by start date (ISO format)"),
    date_to: Optional[str] = Query(None, description="Filter by end date (ISO format)"),
    location: Optional[str] = Query(None, description="Filter by location (partial match)"),
    company: Optional[str] = Query(None, description="Filter by company (partial match)"),
    is_faang_plus: Optional[bool] = Query(None, description="Filter FAANG+ companies"),
):
    """Get all internships with optional filters"""
    try:
        # Load all internships
        internships = await load_all_internships()

        # Apply filters
        if category:
            internships = [i for i in internships if i['category'] == category]

        if date_from:
            internships = [i for i in internships if i['date_posted'] >= date_from]

        if date_to:
            internships = [i for i in internships if i['date_posted'] <= date_to]

        if location:
            location_lower = location.lower()
            internships = [i for i in internships if location_lower in i['location'].lower()]

        if company:
            company_lower = company.lower()
            internships = [i for i in internships if company_lower in i['company'].lower()]

        if is_faang_plus is not None:
            internships = [i for i in internships if i['is_faang_plus'] == str(is_faang_plus)]

        # Enrich with application status
        enriched_internships = []
        for internship in internships:
            job_id = internship['job_id']
            app_status = await get_application(job_id)

            enriched = {
                **internship,
                'applied': app_status['applied'] if app_status else False,
                'resume_hash': app_status.get('resume_hash') if app_status else None,
                'applied_date': app_status.get('applied_date') if app_status else None,
                'notes': app_status.get('notes') if app_status else None,
            }
            enriched_internships.append(enriched)

        return enriched_internships

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/internships/{job_id}/apply")
async def mark_application(job_id: str, update: ApplicationUpdate):
    """Mark a job as applied/not applied"""
    try:
        await update_application(
            job_id=job_id,
            applied=update.applied,
            resume_hash=update.resume_hash,
            notes=update.notes
        )
        return {"success": True, "message": "Application status updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/resumes/upload")
async def upload_resume(file: UploadFile = File(...)):
    """Upload a resume with content-based hashing"""
    try:
        # Save temporarily to compute hash
        temp_path = RESUMES_DIR / f"temp_{file.filename}"
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Compute hash
        file_hash = compute_file_hash(temp_path)

        # Check if resume with same hash already exists
        existing_resume = await get_resume(file_hash)
        if existing_resume:
            # Delete temp file and return existing resume info
            temp_path.unlink()
            return {
                "success": True,
                "message": "Resume already exists (duplicate detected)",
                "hash": file_hash,
                "filename": existing_resume['original_filename'],
                "duplicate": True
            }

        # Rename file using hash
        final_path = RESUMES_DIR / f"{file_hash}{Path(file.filename).suffix}"
        temp_path.rename(final_path)

        # Save to database
        await save_resume(
            hash_value=file_hash,
            original_filename=file.filename,
            file_path=str(final_path)
        )

        return {
            "success": True,
            "message": "Resume uploaded successfully",
            "hash": file_hash,
            "filename": file.filename,
            "duplicate": False
        }

    except Exception as e:
        # Clean up temp file if it exists
        if temp_path.exists():
            temp_path.unlink()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/resumes", response_model=List[ResumeInfo])
async def get_resumes():
    """Get list of all uploaded resumes"""
    try:
        resumes = await list_resumes()
        return resumes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/refresh", response_model=RefreshResponse)
async def refresh_data():
    """Refresh internship data by pulling from git and re-parsing"""
    try:
        # Git pull in the Summer2026-Internships directory
        result = subprocess.run(
            ["git", "pull"],
            cwd=INTERNSHIPS_DIR,
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            raise Exception(f"Git pull failed: {result.stderr}")

        # Re-run the parser
        parser_script = INTERNSHIPS_DIR / "parse_internships.py"
        result = subprocess.run(
            ["python3", str(parser_script)],
            cwd=INTERNSHIPS_DIR,
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            raise Exception(f"Parser failed: {result.stderr}")

        # Count internships
        internships = await load_all_internships()
        count = len(internships)

        return RefreshResponse(
            success=True,
            message="Data refreshed successfully",
            internships_count=count
        )

    except Exception as e:
        return RefreshResponse(
            success=False,
            message=f"Refresh failed: {str(e)}",
            internships_count=0
        )


@app.get("/api/categories")
async def get_categories():
    """Get list of available categories"""
    return {
        "categories": [
            {"id": "software_engineering", "name": "Software Engineering"},
            {"id": "data_science", "name": "Data Science & ML"},
            {"id": "quant_finance", "name": "Quantitative Finance"},
            {"id": "product_management", "name": "Product Management"},
            {"id": "hardware_engineering", "name": "Hardware Engineering"},
        ]
    }


@app.get("/api/stats")
async def get_stats():
    """Get statistics about internships"""
    try:
        internships = await load_all_internships()

        # Calculate stats
        total = len(internships)
        by_category = {}
        faang_plus = 0

        for internship in internships:
            category = internship['category']
            by_category[category] = by_category.get(category, 0) + 1
            if internship['is_faang_plus'] == 'True':
                faang_plus += 1

        return {
            "total": total,
            "by_category": by_category,
            "faang_plus_count": faang_plus,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
