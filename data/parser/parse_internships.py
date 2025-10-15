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
        if 'simplify.jobs/p/' in href:
            simplify_url = href
        elif href and not href.startswith('#'):
            direct_url = href
    
    return clean_url(direct_url), simplify_url


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
    
    for row in rows:
        cells = row.find_all('td')
        if len(cells) < 5:
            continue
        
        company_html = str(cells[0])
        role = cells[1].get_text(strip=True)
        location = cells[2].get_text(strip=True)
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
        
        terms = ''
        if 'Off-Season' in readme_path.name:
            terms_match = re.search(r'(Winter|Spring|Fall)\s+\d{4}', readme_path.name)
            if terms_match:
                terms = terms_match.group(0)
        
        internships.append({
            'source_file': readme_path.name,
            'company': company,
            'role': role,
            'location': location,
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
