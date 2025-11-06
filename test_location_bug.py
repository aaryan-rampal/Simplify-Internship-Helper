#!/usr/bin/env python3
"""
Test script to verify the location parsing bug with Marvell job
"""
from pathlib import Path
from bs4 import BeautifulSoup
import re

def test_location_bug():
    """Test the location parsing bug"""
    print("=== Testing Location Parsing Bug ===")
    
    # Read the README
    readme_path = Path("data/internships/README-Off-Season.md")
    with open(readme_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find Hardware Engineering section
    section_marker = '## 🔧 Hardware Engineering Internship Roles'
    section_start = content.find(section_marker)
    table_start = content.find('<table>', section_start)
    table_end = content.find('</table>', table_start)
    table_html = content[table_start:table_end + 8]

    # Parse with BeautifulSoup
    soup = BeautifulSoup(table_html, 'html.parser')
    tbody = soup.find('tbody')
    rows = tbody.find_all('tr')

    # Get raw rows with current buggy regex
    raw_rows = re.findall(r'<tr[^>]*>.*?</tr>', table_html, re.DOTALL)

    print(f"BeautifulSoup rows: {len(rows)}")
    print(f"Raw regex rows: {len(raw_rows)}")
    print()

    # Find Marvell Coherent DSP row
    for i, row in enumerate(rows):
        cells = row.find_all('td')
        if len(cells) >= 3:
            company_text = cells[0].get_text(strip=True)
            role_text = cells[1].get_text(strip=True)
            
            if 'Coherent DSP' in role_text and 'Marvell' in company_text:
                print(f"Found Marvell Coherent DSP at BeautifulSoup row {i}")
                print(f"  Company: {company_text}")
                print(f"  Role: {role_text}")
                print(f"  BS Location: {cells[2].get_text(strip=True)}")
                
                # Test current buggy extraction
                if i < len(raw_rows):
                    raw_row = raw_rows[i]
                    raw_cells = re.findall(r'<td[^>]*>.*?</td>', raw_row, re.DOTALL)
                    if len(raw_cells) >= 3:
                        raw_location = re.sub(r'<[^>]+>', '', raw_cells[2]).strip()
                        print(f"  OLD RAW Location: {raw_location}")
                        print(f"  OLD BUG: {'✓ CORRECT' if raw_location == cells[2].get_text(strip=True) else '✗ WRONG'}")
                
                # Test new fixed extraction
                filtered_raw_rows = []
                for raw_row in raw_rows:
                    raw_cells = re.findall(r'<td[^>]*>.*?</td>', raw_row, re.DOTALL)
                    if len(raw_cells) >= 3:
                        filtered_raw_rows.append(raw_row)
                
                if i < len(filtered_raw_rows):
                    fixed_raw_row = filtered_raw_rows[i]
                    fixed_raw_cells = re.findall(r'<td[^>]*>.*?</td>', fixed_raw_row, re.DOTALL)
                    if len(fixed_raw_cells) >= 3:
                        fixed_raw_location = re.sub(r'<[^>]+>', '', fixed_raw_cells[2]).strip()
                        print(f"  NEW RAW Location: {fixed_raw_location}")
                        print(f"  NEW BUG: {'✓ CORRECT' if fixed_raw_location == cells[2].get_text(strip=True) else '✗ WRONG'}")
                print()
                return True
    
    print("Marvell Coherent DSP not found!")
    return False

if __name__ == "__main__":
    test_location_bug()