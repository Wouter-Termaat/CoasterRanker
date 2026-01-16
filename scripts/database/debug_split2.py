import requests

url = "https://rcdb.com/4521.htm"
response = requests.get(url)
html = response.text

# Find the "Tracks" section in raw HTML
idx = html.lower().find('<h3>tracks</h3>')
if idx != -1:
    print("Found <h3>Tracks</h3> at position", idx)
    print("\nRaw HTML around Tracks section:")
    print(repr(html[idx:idx+1000]))
else:
    print("No <h3>Tracks</h3> found")
    
# Also check for <h4>Tracks
idx = html.lower().find('<h4>tracks</h4>')
if idx != -1:
    print("\n\nFound <h4>Tracks</h4> at position", idx)
    print("\nRaw HTML around Tracks section:")
    print(repr(html[idx:idx+1000]))
