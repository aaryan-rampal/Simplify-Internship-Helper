#!/usr/bin/env python3
"""
Parser for SimplifyJobs Summer2026-Internships repository
Converts HTML tables in README files to CSV format for backend consumption
"""

from bs4 import BeautifulSoup
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path
import re
import sys
import json

# Configuration for location parsing
EXCLUDED_LOCATION_PATTERNS = [
    '50 locations', 'Multiple locations', '32 locations', '14 locations', 
    '13 locations', '11 locations', '5 locations', '4 locations'
]

EXCLUDED_LOCATION_PREFIXES = [
    'locations', '50 locations', '32 locations', '14 locations', 
    '13 locations', '11 locations', '5 locations', '4 locations'
]


def parse_age(age_str):
    """Convert age string like '0d', '1mo', '2mo' to number of days"""
    age_str = age_str.strip()
    match = re.match(r'(\d+)([dmo]+)', age_str)
    if not match:
        return 0
    
    num, unit = match.groups()
    num = int(num)
    
    if unit == 'd':
        return num
    elif unit == 'mo':
        return num * 30
    return 0


def calculate_date(age_str):
    """Calculate ISO timestamp from age string"""
    days = parse_age(age_str)
    date = datetime.now() - timedelta(days=days)
    return date.isoformat()


def clean_url(url):
    """Remove tracking parameters from URL"""
    if not url:
        return ''
    url = re.sub(r'[?&](utm_source|ref)=[^&]*', '', url)
    url = url.rstrip('?&')
    return url


def extract_company(html):
    """Extract company name and detect FAANG+ flag"""
    soup = BeautifulSoup(html, 'html.parser')
    text = soup.get_text(strip=True)
    is_faang = '🔥' in html
    company = text.replace('🔥', '').strip()
    return company, is_faang


def extract_urls(html):
    """Extract application URLs from cell HTML"""
    soup = BeautifulSoup(html, 'html.parser')
    links = soup.find_all('a', href=True)
    
    direct_url = ''
    simplify_url = ''
    
    for link in links:
        href = link.get('href', '')
        if 'simplify.jobs/p/' in str(href):
            simplify_url = href
        elif href and not str(href).startswith('#'):
            direct_url = href
    
    return clean_url(direct_url), simplify_url

def extract_locations(html):
    """Extract locations from HTML, handling collapsible details and br-separated locations"""
    
    # First check for br-separated locations BEFORE BeautifulSoup processing
    # since BeautifulSoup removes </br> tags and concatenates text
    if '<br' in html or '</br>' in html:
        # Split by both <br> and </br> tags and clean up
        locations = []
        for part in re.split(r'</?br\s*/?>', html):
            # Remove HTML tags and clean whitespace
            clean_part = re.sub(r'<[^>]+>', '', part).strip()
            if clean_part and clean_part not in EXCLUDED_LOCATION_PATTERNS and not clean_part.startswith(tuple(EXCLUDED_LOCATION_PREFIXES)):
                locations.append(clean_part)
        
        if locations:
            # Return both display format and full locations array
            if len(locations) == 1:
                return locations[0], [locations[0]]
            else:
                display_location = f"{locations[0]} +{len(locations)-1} more"
                return display_location, locations
    
    # If no br tags, process with BeautifulSoup for details elements
    soup = BeautifulSoup(html, 'html.parser')
    
    # Check if this is a collapsible details element
    details = soup.find('details')
    if details:
        # Extract all text content including br tags
        content = str(details)
        
        # Split by both <br> and </br> tags and clean up
        locations = []
        for part in re.split(r'</?br\s*/?>', content):
            # Remove HTML tags and clean whitespace
            clean_part = re.sub(r'<[^>]+>', '', part).strip()
            if clean_part and clean_part not in EXCLUDED_LOCATION_PATTERNS and not clean_part.startswith(tuple(EXCLUDED_LOCATION_PREFIXES)):
                locations.append(clean_part)
        
        if locations:
            # Return both display format and full locations array
            if len(locations) == 1:
                return locations[0], [locations[0]]
            else:
                display_location = f"{locations[0]} +{len(locations)-1} more"
                return display_location, locations
    
    # Fallback to simple text extraction
    fallback_text = soup.get_text(strip=True)
    return fallback_text, [fallback_text]


def parse_section(readme_path, section_marker, category):
    """Parse a category section from README file"""
    print(f"Parsing {category} from {readme_path.name}...")
    
    with open(readme_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    section_start = content.find(section_marker)
    if section_start == -1:
        print(f"  ⚠️  Section not found: {section_marker}")
        return []
    
    table_start = content.find('<table>', section_start)
    if table_start == -1:
        print(f"  ⚠️  Table not found in section")
        return []
        
    table_end = content.find('</table>', table_start)
    if table_end == -1:
        print(f"  ⚠️  Table end tag not found")
        return []
        
    table_html = content[table_start:table_end + 8]
    
    soup = BeautifulSoup(table_html, 'html.parser')
    tbody = soup.find('tbody')
    if not tbody:
        print(f"  ⚠️  tbody not found in table")
        return []
    
    rows = tbody.find_all('tr')
    
    internships = []
    last_company = ''
    last_is_faang = False
    
    for i, row in enumerate(rows):
        cells = row.find_all('td')
        if len(cells) < 5:
            continue

        company_html = str(cells[0])
        role = cells[1].get_text(strip=True)
        
        # Extract location from raw table HTML before BeautifulSoup processes it
        # Find the corresponding row in the raw HTML
        raw_rows = re.findall(r'<tr[^>]*>.*?</tr>', table_html, re.DOTALL)
        
        # Filter out empty rows to match BeautifulSoup's behavior
        # BeautifulSoup only counts rows with actual content, not empty <tr> tags
        filtered_raw_rows = []
        for raw_row in raw_rows:
            raw_cells = re.findall(r'<td[^>]*>.*?</td>', raw_row, re.DOTALL)
            if len(raw_cells) >= 3:  # Only keep rows with at least 3 cells (company, role, location)
                filtered_raw_rows.append(raw_row)
        
        if i < len(filtered_raw_rows):
            raw_row = filtered_raw_rows[i]
            # Extract the third <td> from the raw row
            raw_cells = re.findall(r'<td[^>]*>.*?</td>', raw_row, re.DOTALL)
            if len(raw_cells) >= 3:
                location_html = raw_cells[2]
            else:
                location_html = str(cells[2])
        else:
            location_html = str(cells[2])
        
        location_display, full_locations = extract_locations(location_html)

        # Handle both 5-column and 6-column table structures
        # README.md: Company | Role | Location | Application | Age (5 columns)
        # README-Off-Season.md: Company | Role | Location | Terms | Application | Age (6 columns)
        terms = ''
        if len(cells) >= 6:
            # Off-Season table with Terms column
            terms = cells[3].get_text(strip=True)
            application_html = str(cells[4])
            age = cells[5].get_text(strip=True)
        else:
            # Regular table without Terms column
            application_html = str(cells[3])
            age = cells[4].get_text(strip=True)

        if '↳' in company_html:
            company = last_company
            is_faang = last_is_faang
        else:
            company, is_faang = extract_company(company_html)
            last_company = company
            last_is_faang = is_faang

        if not company or not role:
            continue



        base_url, app_url = extract_urls(application_html)
        
        internships.append({
            'source_file': readme_path.name,
            'company': company,
            'role': role,
            'location': location_display,
            'full_locations': json.dumps(full_locations),
            'terms': terms,
            'is_faang_plus': is_faang,
            'application_url': app_url or base_url,
            'base_url': base_url,
            'age_raw': age,
            'date_posted': calculate_date(age)
        })
    
    print(f"  ✓ Found {len(internships)} internships")
    return internships


def main():
    # Parser lives in data/parser/
    # Read from data/internships/ (submodule)
    # Write to data/parsed/
    script_dir = Path(__file__).parent
    source_dir = script_dir.parent / 'internships'
    output_dir = script_dir.parent / 'parsed'

    sections = {
        'software_engineering': {
            'marker': '## 💻 Software Engineering Internship Roles',
            'files': ['README.md', 'README-Off-Season.md'],
            'output': 'software_engineering_internships.csv'
        },
        'product_management': {
            'marker': '## 📱 Product Management Internship Roles',
            'files': ['README.md', 'README-Off-Season.md'],
            'output': 'product_management_internships.csv'
        },
        'data_science': {
            'marker': '## 🤖 Data Science, AI & Machine Learning Internship Roles',
            'files': ['README.md', 'README-Off-Season.md'],
            'output': 'data_science_ml_internships.csv'
        },
        'quant_finance': {
            'marker': '## 📈 Quantitative Finance Internship Roles',
            'files': ['README.md', 'README-Off-Season.md'],
            'output': 'quantitative_finance_internships.csv'
        },
        'hardware_engineering': {
            'marker': '## 🔧 Hardware Engineering Internship Roles',
            'files': ['README.md', 'README-Off-Season.md'],
            'output': 'hardware_engineering_internships.csv'
        }
    }

    print("=" * 60)
    print("SimplifyJobs Internships Parser")
    print("=" * 60)
    print(f"Source: {source_dir}")
    print(f"Output: {output_dir}")
    print("=" * 60)

    for category, config in sections.items():
        all_internships = []

        for readme_file in config['files']:
            readme_path = source_dir / readme_file
            if not readme_path.exists():
                print(f"⚠️  Skipping {readme_file} (not found)")
                continue

            internships = parse_section(readme_path, config['marker'], category)
            all_internships.extend(internships)

        if all_internships:
            df = pd.DataFrame(all_internships)
            output_path = output_dir / config['output']
            df.to_csv(output_path, index=False)
            print(f"✓ Saved {len(all_internships)} internships to {config['output']}")
        else:
            print(f"⚠️  No internships found for {category}")

        print()

    print("=" * 60)
    print("✓ Parsing complete!")
    print("=" * 60)


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
