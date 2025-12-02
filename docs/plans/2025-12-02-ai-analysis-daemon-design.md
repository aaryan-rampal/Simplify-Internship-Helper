# AI Job Analysis Daemon Design

**Date:** 2025-12-02
**Status:** Design Complete
**Goal:** Automatically analyze job postings with AI to prioritize applications based on skill match and company culture fit

## Overview

Add automated AI analysis to the job tracking system. A background daemon runs every 3-6 hours to:
1. Refresh job data from upstream (existing workflow)
2. Fetch full job descriptions for unanalyzed positions
3. Analyze job fit using OpenRouter API with cached resume
4. Store analysis results in database for UI display

Focus on **skill matching quality** (transferable skills, learning curves) and **company culture fit** (ambitious missions, startup culture, autonomy) for candidates who value impactful work.

## Architecture

### Three Main Components

**1. Daemon Service**
- Background process running every 3-6 hours
- Orchestrates: git pull → parse → update_db → AI analysis
- Manages API rate limits, resume caching, error recovery
- Script: `backend/daemon.py`
- Runner: `scripts/run_daemon.sh` (start/stop/status)

**2. AI Analysis Engine**
- Extracted from `test_job_parsing.py` with improvements
- Playwright job description fetching (handles JavaScript rendering)
- OpenRouter/Grok API for analysis
- Resume caching (only reload on file changes)
- Batch processing with retry queue

**3. Database Schema Extensions**
- Add to `internships` table:
  - `ai_analysis_json` (TEXT) - full structured analysis
  - `ai_analyzed_date` (TEXT) - timestamp of last analysis
- New `daemon_state` table:
  - `last_run` (TEXT) - timestamp of last cycle start
  - `last_success` (TEXT) - timestamp of last successful completion
  - `jobs_processed` (INTEGER) - running total
- `notes` field remains for user notes (separate from AI analysis)

## Improved AI Analysis Prompt

### Focus Areas

**Skill Matching Depth:**
- Transferable skills detection (e.g., "Java → Kotlin")
- Framework ecosystem mapping (React → Frontend familiarity)
- Skill adjacency scoring (DB design → data modeling)
- Learning curve estimates for gap skills (1 week vs 3 months)

**Company Culture Fit:**
- Startup indicators (size, funding, growth language)
- Autonomy signals ("ownership", "drive projects", "independent")
- Ambitious mission detection ("transforming", "pioneering", "cutting-edge")
- Impact potential (early-stage role vs established team)

### Output Structure (JSON)

```json
{
  "job_details": {
    "title": "Software Engineer",
    "company": "Acme Corp",
    "location": "San Francisco, CA",
    "job_type": "internship"
  },
  "skill_analysis": {
    "required_skills": ["Python", "React", "PostgreSQL"],
    "your_matching_skills": ["Python", "React"],
    "transferable_skills": [
      {"from": "Java", "to": "Backend systems", "confidence": 0.9}
    ],
    "gap_skills": [
      {"skill": "PostgreSQL", "learning_estimate": "1-2 weeks", "difficulty": "low"}
    ],
    "match_percentage": 85
  },
  "company_culture_fit": {
    "startup_score": 75,
    "autonomy_score": 80,
    "ambition_score": 90,
    "impact_potential": "high",
    "signals": ["early-stage", "ownership culture", "transforming industry"]
  },
  "overall_assessment": {
    "fit_score": 88,
    "priority": "apply_now",
    "reasoning": "Strong skill match with transferable experience. High-impact role at ambitious startup."
  }
}
```

## Job Selection & Processing

### Prioritization Logic (up to 100 jobs per run)

**Phase 1 - New Jobs:**
- Query: `created_at >= last_daemon_run AND ai_analysis_json IS NULL`
- Order: `date_posted DESC` (newest first)
- These get analyzed first

**Phase 2 - Backfill:**
- If Phase 1 < 100 jobs, fill quota with oldest unanalyzed jobs
- Query: `ai_analysis_json IS NULL`
- Order: `created_at ASC` (oldest first)

### Processing Flow

1. Process in batches of 10 jobs (manage API rate limits)
2. For each job:
   - Fetch description with Playwright (30s timeout)
   - Analyze with cached resume + improved prompt
   - Store result in `ai_analysis_json` + `ai_analyzed_date`
   - Commit batch to database (checkpoint)
3. Failed jobs → retry queue with reason
4. After main batch, process retry queue (max 3 attempts, 5min delay)

### Resume Caching

- Load resume once at daemon startup
- Store in memory + write to `/tmp/resume_cache.txt` with hash
- On subsequent runs, compare file hash
- Only reload if resume file modified
- Saves tokens by avoiding redundant resume uploads

## Daemon Implementation

### Structure

- **Script:** `backend/daemon.py`
- **Runner:** `scripts/run_daemon.sh` (process management)
- **Scheduling:** Python `schedule` library (simple) or systemd timer (production)
- **Logging:** Structured logs to `logs/daemon.log` with rotation

### Run Cycle (every 3-6 hours)

1. Log cycle start + timestamp
2. Execute existing refresh workflow:
   - `cd data/internships && git pull origin dev`
   - `python3 data/parser/parse_internships.py`
   - `python3 update_db.py`
3. Query jobs for analysis (Phase 1 + Phase 2, up to 100)
4. Load/verify resume cache
5. Process jobs in batches of 10, commit after each batch
6. Process retry queue
7. Log summary:
   - Jobs analyzed (success/failure)
   - API tokens used
   - Top matches found

### State Tracking

- `daemon_state` table tracks:
  - `last_run`: when cycle started
  - `last_success`: when cycle completed successfully
  - `jobs_processed`: running total
- On startup, check for crashed runs (incomplete batches)
- Resume from last checkpoint if needed

## Frontend Integration

### Display AI Analysis

**New Table Column:**
- "AI Score" showing fit score (0-100)
- Color-coded: green (80+), yellow (50-79), gray (<50)

**Expanded Details Panel (click job row):**
- Priority recommendation (Apply Now / Consider / Skip)
- Matching skills list
- Transferable skills with confidence
- Gap skills with learning estimates
- Company culture scores (ambition/startup/autonomy)

**Filters:**
- Filter by priority level ("Apply Now" / "Consider" / "All")
- Sort by: AI fit score, culture fit, skill match percentage

**Visual Indicators:**
- Badge for "High Priority" jobs (apply_now)
- Startup icon for high startup scores (70+)
- Autonomy icon for high autonomy signals
- "Ambitious Mission" tag for high ambition scores

### User Controls

- Button to manually trigger AI analysis for specific job (re-analyze)
- Toggle to hide/show AI analysis column
- Export filtered results to CSV with AI scores

**Important:** AI analysis stays separate from user `notes` field. User can still add personal thoughts independently.

## Error Handling & Edge Cases

### API Rate Limits

- If 429 response from OpenRouter → retry queue with 15min delay
- Track API usage per run
- Stop processing if approaching daily limits (configurable threshold)
- Daemon continues running even if analysis fails (refresh still works)

### Network/Fetch Failures

- Playwright timeout (30s) → retry queue
- Invalid HTML/parsing errors → log + skip, mark as `parse_failed`
- Jobs behind auth walls → skip with warning

### Resume Issues

- Resume file missing → log error, skip analysis cycle, continue refresh
- Resume corrupt → alert, use last known good cache if available
- Multiple resumes → use most recent by modification time

### Database Integrity

- Batch commits every 10 jobs
- If daemon crashes, only lose current batch (<10 jobs)
- On restart, check for incomplete batches and reprocess
- Foreign key constraints maintained (`resume_hash` → `resumes.hash`)

### Monitoring

- Daily summary (optional): jobs processed, top matches, errors
- Health check endpoint: `GET /api/daemon/status`
  - Returns: last run time, success rate, retry queue depth

## Implementation Checklist

### Database Changes
- [ ] Add `ai_analysis_json` column to `internships` table
- [ ] Add `ai_analyzed_date` column to `internships` table
- [ ] Create `daemon_state` table
- [ ] Update `backend/database.py` with new schema
- [ ] Update `backend/models.py` with new fields
- [ ] Run `python3 update_db.py` to apply changes

### AI Analysis Engine
- [ ] Extract analysis logic from `test_job_parsing.py`
- [ ] Create `backend/ai_analysis.py` module
- [ ] Implement improved prompt with skill/culture focus
- [ ] Add resume caching (file hash + memory cache)
- [ ] Add retry queue logic
- [ ] Add batch processing (10 jobs per batch)

### Daemon Service
- [ ] Create `backend/daemon.py`
- [ ] Implement scheduling (every 3-6 hours)
- [ ] Integrate existing refresh workflow
- [ ] Add job selection logic (Phase 1 + Phase 2)
- [ ] Add state tracking and crash recovery
- [ ] Create `scripts/run_daemon.sh` (start/stop/status)
- [ ] Set up logging to `logs/daemon.log`

### API Endpoints
- [ ] Add `GET /api/daemon/status` health check
- [ ] Add `POST /api/internships/{id}/analyze` manual re-analyze
- [ ] Update `GET /api/internships` to include AI analysis fields
- [ ] Update `InternshipResponse` model

### Frontend
- [ ] Add "AI Score" column to internships table
- [ ] Add expanded details panel with AI analysis
- [ ] Add priority filter ("Apply Now" / "Consider" / "All")
- [ ] Add sort by AI scores
- [ ] Add visual indicators (badges, icons, tags)
- [ ] Add manual re-analyze button
- [ ] Add toggle to hide/show AI column
- [ ] Update CSV export to include AI scores

### Testing
- [ ] Test daemon runs successfully every cycle
- [ ] Test resume caching (only reloads on changes)
- [ ] Test Phase 1 + Phase 2 job selection
- [ ] Test retry queue with failed jobs
- [ ] Test API rate limit handling
- [ ] Test crash recovery (interrupted batches)
- [ ] Test frontend display of AI analysis
- [ ] Test manual re-analyze button

## Configuration

### Environment Variables

Add to `.env`:
```bash
# AI Analysis Configuration
OPENROUTER_API_KEY=your_key_here
DAEMON_INTERVAL_HOURS=3
DAEMON_BATCH_SIZE=10
DAEMON_MAX_JOBS_PER_RUN=100
DAEMON_RETRY_DELAY_MINUTES=5
DAEMON_MAX_RETRIES=3
```

### Resume Location

- Default: `resumes/` directory (existing)
- Daemon uses same logic as `test_job_parsing.py`
- Prefers PDF, uses most recent by modification time

## Future Enhancements (Out of Scope)

- Email/Slack notifications for high-priority matches
- Historical analysis tracking (re-analyze jobs over time)
- A/B testing different prompts
- User feedback loop (thumbs up/down on recommendations)
- Custom scoring weights (user can tune what matters)
