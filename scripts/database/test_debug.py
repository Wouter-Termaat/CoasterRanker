import requests
from bs4 import BeautifulSoup

url = "https://rcdb.com/775.htm"
response = requests.get(url)
soup = BeautifulSoup(response.text, 'html.parser')

print("=" * 60)
print("ALL TABLES AND THEIR ROWS:")
print("=" * 60)

for i, table in enumerate(soup.find_all('table')):
    print(f"\nTABLE #{i+1}:")
    for j, row in enumerate(table.find_all('tr')):
        cells = row.find_all(['td', 'th'])
        if len(cells) >= 1:
            if len(cells) == 1:
                print(f"  Row {j+1}: Single cell = '{cells[0].get_text(strip=True)}'")
            elif len(cells) >= 2:
                label = cells[0].get_text(strip=True)
                value = cells[1].get_text(strip=True)
                print(f"  Row {j+1}: '{label}' = '{value}'")
