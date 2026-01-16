import sys
import json

data = json.load(sys.stdin)
print(f"Credits in previous version: {len(data['coasters'])}")

# Show some details about dueling coasters
dueling_ids = [
    'C034034002701', 'C034034002702',  # Stampida
    'C031031001403', 'C031031001404',  # Max + Moritz
    'C0310310033121', 'C0310310033122', # YoY
]

ids_in_prev = [cid for cid in dueling_ids if any(c['coasterId'] == cid for c in data['coasters'])]
print(f"\nDueling coaster credits in previous version:")
for cid in dueling_ids:
    has_it = any(c['coasterId'] == cid for c in data['coasters'])
    print(f"  {cid}: {'✓' if has_it else '✗'}")
