import requests
from bs4 import BeautifulSoup

url = "https://rcdb.com/775.htm"
response = requests.get(url)
soup = BeautifulSoup(response.text, 'html.parser')

print("Looking for ALL <th> tags:")
print("=" * 60)

for i, th in enumerate(soup.find_all('th')):
    th_text = th.get_text(strip=True)
    print(f"\nTH #{i+1}: '{th_text}'")
    
    # Try to find next sibling
    td = th.find_next_sibling('td')
    if td:
        print(f"  Found TD sibling!")
        span = td.find('span', class_='float')
        if span:
            print(f"  Has span.float: '{span.get_text(strip=True)}'")
        print(f"  TD text (first 100 chars): '{td.get_text(strip=True)[:100]}'")
    else:
        print(f"  NO TD sibling found")
        # Try find_next instead
        td_next = th.find_next('td')
        if td_next:
            print(f"  Found TD with find_next!")
            print(f"  TD text (first 100 chars): '{td_next.get_text(strip=True)[:100]}'")

print("\n" + "=" * 60)
print("Checking if 'Height' matches:")
for th in soup.find_all('th'):
    th_text = th.get_text(strip=True)
    if th_text.lower() == 'height':
        print(f"MATCH! th_text='{th_text}'")
