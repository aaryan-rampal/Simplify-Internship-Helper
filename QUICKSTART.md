# Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1️⃣ Create the Environment

```bash
conda env create -f environment.yml
conda activate internship-tracker
```

### 2️⃣ Start the Server

```bash
./start.sh
```

The backend will start at `http://localhost:8000`

### 3️⃣ Open the Web App

Simply open `frontend/index.html` in your browser, or:

```bash
cd frontend
python -m http.server 8080
```

Then visit `http://localhost:8080`

---

## 📋 What You Can Do

### ✅ Track Applications
- Check the box next to jobs you've applied to
- Filter by category, location, company, date
- See FAANG+ companies marked with 🔥

### 📄 Manage Resumes
- Upload resumes (automatically detects duplicates)
- Associate resumes with specific applications
- Content-based deduplication using SHA-256

### 🔗 Access URLs
- **Direct Link**: Clean application URL
- **Apply (Simplify)**: Simplify autofill link

### 🔄 Refresh Data
- Click "Refresh Data" button
- Automatically runs `git pull` in data/internships submodule
- Re-parses all CSV files

### 📝 Add Notes
- Click "Notes" button on any job
- Add interview dates, follow-ups, etc.

---

## 🎯 Key Features

| Feature | Description |
|---------|-------------|
| **5 Categories** | Software Engineering, Data Science/ML, Quantitative Finance, Product Management, Hardware Engineering |
| **Smart Filtering** | By category, location, company, date range, FAANG+ status |
| **Resume Management** | Upload once, use everywhere with automatic deduplication |
| **URL Cleaning** | Separate Simplify tracking URLs from direct application links |
| **Git Integration** | One-click data refresh via git pull |
| **Persistent Storage** | SQLite database tracks all your applications |

---

## 🛠️ Troubleshooting

**Backend won't start?**
- Make sure conda environment is activated: `conda activate internship-tracker`
- Check if port 8000 is already in use: `lsof -i :8000`

**Frontend shows "Failed to load internships"?**
- Ensure backend is running at `http://localhost:8000`
- Check browser console (F12) for errors

**Refresh button doesn't work?**
- Make sure data/internships submodule is initialized
- Try manual refresh: `cd data/internships && git pull && python parse_internships.py`

---

## 📊 API Endpoints

If you want to integrate with other tools:

- `GET /api/internships` - Get all internships (with filters)
- `POST /api/internships/{job_id}/apply` - Mark as applied
- `POST /api/resumes/upload` - Upload resume
- `GET /api/resumes` - List resumes
- `POST /api/refresh` - Refresh from GitHub
- `GET /api/stats` - Get statistics

Full API docs: `http://localhost:8000/docs` (when server is running)

---

## 🎨 Customization

### Change Port
Edit `backend/main.py`, line at bottom:
```python
uvicorn.run(app, host="0.0.0.0", port=8000)  # Change 8000 to your port
```

### Change Date Filter
Edit `data/internships/parse_internships.py`, line ~250:
```python
seven_days_ago = datetime.now() - timedelta(days=7)  # Change 7 to your preference
```

### Frontend Theme
Edit `frontend/styles.css` to customize colors and styling

---

## 💡 Tips

1. **Upload your resume first** - Makes it easier to track which resume you used for each application
2. **Use the date filter** - Focus on recent postings (last 3-7 days)
3. **Filter by FAANG+** - Quickly find top companies
4. **Add notes liberally** - Track interview dates, recruiter emails, etc.
5. **Refresh daily** - Keep your data up-to-date with the latest postings

---

Enjoy tracking your internships! 🎉
