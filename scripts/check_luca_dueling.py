import json
from pathlib import Path

# Read Luca's profile
luca_path = Path(__file__).parent.parent / 'database' / 'profiles' / 'luca.json'
with open(luca_path, 'r', encoding='utf-8') as f:
    luca_profile = json.load(f)

# Read master database
master_path = Path(__file__).parent.parent / 'database' / 'data' / 'coasters_master.json'
with open(master_path, 'r', encoding='utf-8') as f:
    master_db = json.load(f)

print("=" * 80)
print("CHECKING WHICH IDs ARE USED IN LUCA'S PROFILE")
print("=" * 80)

dueling_coasters = [
    'C0310310033121',  # YoY Thrill
    'C0310310033122',  # YoY Chill
    'C031031001401',   # Joris Water
    'C031031001402',   # Joris Vuur
    'C049049011601',   # Winja's Force
    'C049049011602',   # Winja's Fear
    'C034034002701',   # Stampida Red
    'C034034002702',   # Stampida Blue
    'C031031001403',   # Max
    'C031031001404',   # Moritz
]

print("\nDueling coasters in Luca's profile:")
for coaster_id in dueling_coasters:
    in_profile = any(c['coasterId'] == coaster_id for c in luca_profile['coasters'])
    if in_profile:
        if coaster_id in master_db:
            coaster_data = master_db[coaster_id]
            print(f"✓ {coaster_id} → {coaster_data['name']}")
            if coaster_data['id'] != coaster_id:
                print(f"  ⚠️  WARNING: id field is '{coaster_data['id']}' (MISMATCH!)")
        else:
            print(f"✗ {coaster_id} → NOT FOUND IN MASTER DB")
    else:
        print(f"  {coaster_id} → Not in profile")

print("\n" + "=" * 80)
print("CONCLUSION:")
print("=" * 80)
print("Luca's profile uses the OBJECT KEY (correct unique ID).")
print("But the 'id' field inside those objects is WRONG/INCONSISTENT.")
print("\nThis needs to be fixed in the database generation script!")
print("=" * 80)
