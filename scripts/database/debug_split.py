import requests
from bs4 import BeautifulSoup

url = "https://rcdb.com/4521.htm"
response = requests.get(url)
soup = BeautifulSoup(response.text, 'html.parser')

# Find all headings
print("All headings:")
for heading in soup.find_all(['h3', 'h4']):
    text = heading.get_text(strip=True)
    print(f"  {heading.name}: {text}")
    
    # If it's "Tracks", show the next table
    if 'track' in text.lower():
        print(f"    Found 'Tracks'-related heading!")
        table = heading.find_next('table')
        if table:
            first_row = table.find('tr')
            if first_row:
                cells = first_row.find_all(['th', 'td'])
                print(f"    Table has {len(cells)} cells in first row")
                for i, cell in enumerate(cells):
                    print(f"      Cell {i}: {cell.get_text(strip=True)}")
