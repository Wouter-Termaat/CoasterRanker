import requests
from bs4 import BeautifulSoup

url = "https://rcdb.com/775.htm"
response = requests.get(url)
soup = BeautifulSoup(response.text, 'html.parser')

# Find the "Tracks" heading
for heading in soup.find_all(['h3', 'h4']):
    if 'tracks' in heading.get_text(strip=True).lower():
        print(f"Found heading: {heading.get_text(strip=True)}")
        print("=" * 60)
        
        # Get the next table
        table = heading.find_next('table')
        if table:
            print("RAW TABLE HTML (first 2000 chars):")
            print(str(table)[:2000])
            print("\n" + "=" * 60)
            
            print("\nParsing table rows:")
            rows = table.find_all('tr')
            print(f"Found {len(rows)} rows")
            
            for i, row in enumerate(rows[:5]):  # First 5 rows
                print(f"\nRow {i+1} HTML:")
                print(str(row)[:500])
                cells = row.find_all(['td', 'th'])
                print(f"  Found {len(cells)} cells")
                for j, cell in enumerate(cells[:3]):  # First 3 cells
                    print(f"  Cell {j+1}: '{cell.get_text(strip=True)[:100]}'")
        break
