# Database Simplification Refactoring

## Overview
Simplified the database architecture to reduce complexity and improve maintainability by merging two tables into one and using URL-based deduplication.

## Changes Made

### 1. Database Schema Simplification
**File: `backend/database.py`**
- Merged `internships` and `applications` tables into a single `internships` table
- Application fields (`applied`, `resume_hash`, `applied_date`, `notes`) are now embedded in the internship record
- Removed separate `applications` table entirely (JOIN operations no longer needed)
- Changed primary key from auto-increment `id` to URL hash-based `id` (first 16 chars of SHA256)
- Made `application_url` UNIQUE to prevent duplicate URLs in database
- Simplified query logic by eliminating LEFT JOIN

### 2. Models Update
**File: `backend/models.py`**
- Merged `Internship` and `InternshipWithStatus` into a single `Internship` model
- Removed `job_id` field, replaced with `id` (the URL-based hash)
- Application status fields are now part of the core model

### 3. Main Application Updates
**File: `backend/main.py`**
- Removed job_id generation logic from `load_internships_from_csv()`
- Updated `parse_and_update_internships()` to track URLs instead of job_ids
- Simplified `/api/internships` endpoint response model
- Updated `/api/internships/{internship_id}/apply` endpoint parameter name

### 4. Database Update Script
**File: `update_db.py`**
- Changed duplicate detection from job_id-based to URL-based
- Tracks `active_urls` instead of `active_job_ids`
- Passes URL list to `mark_missing_internships_inactive()`

### 5. Frontend Updates
**File: `frontend/app.js`**
- Replaced all `job_id` references with `id`
- Updated variable names: `jobId` → `internshipId`
- Updated data attributes: `data-job-id` → `data-internship-id`
- All API calls now use `internship_id` parameter

## Benefits

1. **Simpler Schema**: Single table instead of two eliminates JOIN logic
2. **Automatic Deduplication**: URL uniqueness constraint prevents duplicate entries at DB level
3. **Cleaner Code**: Removed `get_application()` function, simplified `upsert_internship()` logic
4. **Better ID Strategy**: URL-based hashes are stable and meaningful
5. **Fewer Operations**: No need to query and update separate tables

## Migration Notes

- Old database files will have stale data; they should be removed (`rm data.db`)
- Database will auto-initialize on first run with new schema
- No data migration script needed since all application state is preserved in the single table

## SQL Schema Changes

### Before
- Two tables with foreign key relationship
- Complex JOIN queries
- Auto-increment IDs separate from business logic

### After
- Single `internships` table with embedded application status
- Simpler, more direct queries
- URL-based IDs that are deterministic and meaningful
