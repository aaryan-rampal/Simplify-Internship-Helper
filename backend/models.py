"""
Pydantic models for request/response validation
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class Internship(BaseModel):
    """Internship data model"""
    id: str
    company: str
    role: str
    location: str
    full_locations: List[str] = []
    terms: str = ""
    is_faang_plus: bool
    application_url: str
    base_url: str
    age_raw: str
    date_posted: str
    source_file: str
    category: str
    emojis: str = ""
    has_phd_emoji: bool = False
    has_clearance_emoji: bool = False
    applied: bool = False
    resume_hash: Optional[str] = None
    applied_date: Optional[str] = None
    notes: Optional[str] = None


class ApplicationUpdate(BaseModel):
    """Application status update"""
    applied: bool
    resume_hash: Optional[str] = None
    notes: Optional[str] = None


class InternshipResponse(Internship):
    """Internship response model (same as Internship now)"""
    pass


class ResumeInfo(BaseModel):
    """Resume metadata"""
    hash: str
    original_filename: str
    file_path: str
    upload_date: str


class InternshipFilter(BaseModel):
    """Filter parameters for internships"""
    category: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    location: Optional[str] = None
    company: Optional[str] = None
    is_faang_plus: Optional[bool] = None


class RefreshResponse(BaseModel):
    """Response from refresh endpoint"""
    success: bool
    message: str
    internships_count: int
