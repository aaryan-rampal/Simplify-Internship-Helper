"""
Pydantic models for request/response validation
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class Internship(BaseModel):
    """Internship data model"""
    source_file: str
    company: str
    role: str
    location: str
    terms: str = ""
    is_faang_plus: bool
    application_url: str
    base_url: str
    age_raw: str
    date_posted: str
    category: str  # Added to identify which CSV it came from


class InternshipWithStatus(Internship):
    """Internship with application status"""
    applied: bool = False
    resume_hash: Optional[str] = None
    applied_date: Optional[str] = None
    notes: Optional[str] = None


class ApplicationUpdate(BaseModel):
    """Application status update"""
    applied: bool
    resume_hash: Optional[str] = None
    notes: Optional[str] = None


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
