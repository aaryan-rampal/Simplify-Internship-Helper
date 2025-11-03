#!/usr/bin/env python3
"""
Simple script to update database with parsed internship data
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.append('backend')

from database import upsert_internship, mark_missing_internships_inactive, init_db
from main import load_internships_from_csv

async def update_database():
    """Update database with all parsed internship data"""
    # Initialize database tables first
    await init_db()
    categories = {
        "software_engineering": "software_engineering_internships.csv",
        "data_science": "data_science_ml_internships.csv", 
        "quant_finance": "quantitative_finance_internships.csv",
        "product_management": "product_management_internships.csv",
        "hardware_engineering": "hardware_engineering_internships.csv",
    }

    all_internships = []
    active_urls = []
    seen_urls = set()
    PARSED_DATA_DIR = Path('data/parsed')

    for category, filename in categories.items():
        csv_path = PARSED_DATA_DIR / filename
        if not csv_path.exists():
            print(f"Skipping {filename} (not found)")
            continue
            
        internships = load_internships_from_csv(csv_path, category)
        print(f"Processing {len(internships)} internships from {filename}")
        
        for internship in internships:
            url = internship['application_url']
            if url in seen_urls:
                print(f"  Skipping duplicate URL: {internship['company']} - {internship['role'][:50]}")
                continue
            
            seen_urls.add(url)
            await upsert_internship(internship)
            active_urls.append(url)
            all_internships.append(internship)

    # Mark missing internships as inactive
    await mark_missing_internships_inactive(active_urls)
    
    print(f"✓ Updated {len(all_internships)} internships in database")
    return len(all_internships)

if __name__ == "__main__":
    asyncio.run(update_database())