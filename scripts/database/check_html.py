import requests

r = requests.get('https://rcdb.com/775.htm')
html = r.text

# Find Height in HTML
idx = html.find('<th>Height')
if idx >= 0:
    print("Found <th>Height at position", idx)
    print("Raw HTML around Height:")
    print(repr(html[idx:idx+200]))
else:
    print("NOT FOUND: <th>Height")
    # Try lowercase
    idx = html.find('<th>height')
    if idx >= 0:
        print("Found <th>height (lowercase)")
        print(repr(html[idx:idx+200]))
    else:
        print("Also not found in lowercase")
        # Show what th tags exist
        print("\nAll <th> occurrences:")
        start = 0
        for i in range(20):
            idx = html.find('<th>', start)
            if idx < 0:
                break
            print(f"  {i+1}. {repr(html[idx:idx+50])}")
            start = idx + 1
