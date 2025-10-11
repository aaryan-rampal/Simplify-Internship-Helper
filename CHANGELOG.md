# Changelog

## [2.1.0] - 2025-10-11

### ✨ UI Enhancements
- **Advanced Filter Controls**: Replaced simple checkboxes with radio button groups for FAANG+, PhD/Graduate, and Clearance filters
  - Added positive/negative filtering options: All, Only [Type], Exclude [Type]
  - Improved visual design with button-style toggles and hover effects
  - Filters now organized on separate row for better layout

- **Job Role Display**: Removed emojis from job role names for cleaner text presentation
  - Emojis still displayed in dedicated Emojis column
  - Added `stripEmojis()` utility function for text cleaning

- **Header Alignment**: Fixed vertical alignment of Refresh Data and Upload Resume buttons

### 📚 Documentation Updates
- **QUICKSTART.md**: Updated to reflect new filtering capabilities and emoji indicators

### Commits
- `7cc6776` feat: Enhance filter UI with positive/negative options and remove emojis from job names

---

## [2.0.0] - 2025-10-11

### 🚀 Major Refactoring
- **Git Submodule Architecture**: Converted `Summer2026-Internships` directory to `data/internships` git submodule
  - Improved dependency management and explicit data source tracking
  - Better project organization with clear separation of code vs. data
  - Enables reproducible builds with pinned data versions

- **Parser Script Overhaul**: Created `parse_internships.py` to generate CSV files from README.md HTML tables
  - Parses all 5 categories from both README.md and README-Off-Season.md
  - Extracts company names, roles, locations, URLs, and calculates dates
  - Handles FAANG+ indicators, emoji extraction, and URL cleaning
  - Generates 2,859 internships across 5 CSV files

### ✨ New Features
- **Emoji Extraction & Filtering**: Automatically extract and filter by job role characteristics
  - 🎓 **PhD/Graduate Filter**: Find positions requiring advanced degrees
  - 🛂 **Clearance Required Filter**: Find positions needing security clearance
  - **Emojis Column**: Visual indicators in the internships table
  - Backend regex extraction from role titles

- **Advanced Multi-Select Filters**: Enhanced filtering capabilities
  - Multi-select category dropdown (static options)
  - Dynamic location dropdown with search (populated from current results)
  - Dynamic company dropdown with search (populated from current results)
  - Real-time search within dropdowns for large lists
  - Selected count indicators in filter headers

### 🔧 Technical Improvements
- **Fixed Array Index Issues**: Apply button now works correctly with active filters
  - Changed from `data-job-index` to `data-job-id` for stable element tracking
  - Updated event listeners to find internships by `job_id` instead of array position
  - Prevents 404 errors when filters change the displayed results

- **Table Layout Enhancements**: Improved responsive design and readability
  - Fixed column widths to prevent layout breaking from long text
  - Word wrapping for location fields and other content
  - Horizontal scrolling for better mobile experience
  - Added Emojis column with proper styling

### 📊 Data & Performance
- **Internship Counts**: 2,859 total internships (up from 5,749 in v1.1.0)
  - Software Engineering: 939 (was: 2,362)
  - Data Science/ML: 1,204 (was: 2,077)
  - Quantitative Finance: 108 (was: 289)
  - Product Management: 227 (was: 324)
  - Hardware Engineering: 381 (was: 697)
  - **Total: 2,859 internships** (was: 5,749)

### 🏗️ Architecture Changes
- **Project Structure**: Cleaner organization with `data/` directory for external data
- **Git Submodules**: Explicit dependency management for internships data
- **Parser Pipeline**: README.md → CSV → Backend loading workflow
- **Emoji Metadata**: Enhanced job role classification and filtering

### 📚 Documentation Updates
- **README.md**: Updated for submodule usage and new features
- **QUICKSTART.md**: Updated paths and troubleshooting for new architecture
- **Setup Instructions**: Added submodule initialization steps

### Commits
- `1ae26c1` feat: Update submodule to include parser script
- `9bb9038` refactor: Convert Summer2026-Internships to git submodule
- `5ef946c` feat: Add emoji extraction and filtering for job roles
- `0faf630` fix: Improve table layout with fixed column widths and word wrapping
- `56a5666` fix: Use job_id for tracking internships instead of array indices

---

## [1.1.0] - 2025-10-10

### Fixed
- **404 Error on Apply Button**: Resolved issue where clicking the apply checkbox resulted in 404 errors
  - Root cause: `escapeHtml()` was converting pipe characters (`|`) in job_id to HTML entities
  - Solution: Replaced inline onclick handlers with data attributes and event delegation
  - Job IDs now properly encoded using `encodeURIComponent()` without HTML escaping

- **Website Layout Issues**: Improved centering and overall layout
  - Increased container max-width from 1400px to 1600px for better space utilization
  - Added proper margins and padding to container
  - Fixed table cell alignment with vertical-align: middle
  - Centered checkbox column with proper width (60px)

### Changed
- **Removed 7-Day Pre-filtering**: Parser now shows ALL internships instead of just last 7 days
  - Previous: 488 internships (filtered to 7 days)
  - Current: 5,749 internships (complete dataset)
  - Users can still filter by date using the UI date range picker

### Added
- Proper HTML escaping for display text (company names, roles, locations, URLs)
- XSS protection while maintaining functionality

### Internship Counts
- Software Engineering: 2,362 (was: 154)
- Data Science/ML: 2,077 (was: 240)
- Quantitative Finance: 289 (was: 13)
- Product Management: 324 (was: 35)
- Hardware Engineering: 697 (was: 46)
- **Total: 5,749 internships** (was: 488)

### Commits
- `1b8e0f2` Fix: Resolve 404 errors and improve UI layout
- `c779900` feat: Update parser to extract all 5 categories without date filtering

---

## [1.0.0] - 2025-10-10

### Initial Release
- Full-stack internship tracker web application
- FastAPI backend with SQLite database
- Frontend with filtering by category, location, company, date, FAANG+ status
- Resume upload with SHA-256 content-based deduplication
- Application tracking with checkboxes and notes
- Git pull integration for one-click data refresh
- Support for 5 internship categories
- URL cleaning (Simplify vs direct links)
