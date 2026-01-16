import json
import csv
from pathlib import Path

# Read master database
master_path = Path(__file__).parent.parent / 'database' / 'data' / 'coasters_master.json'
with open(master_path, 'r', encoding='utf-8') as f:
    master_db = json.load(f)

# Read CSV file
csv_path = Path(r'C:\Users\Wouter Termaat\Downloads\Top List Coasters v Luca - List of Coaster.csv')
csv_coasters = []
with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        csv_coasters.append(row)

# Try to match each coaster
matched = []
unmatched = []

def normalize_name(name):
    """Normalize coaster name for comparison"""
    return name.strip().lower().replace('  ', ' ')

def find_coaster(naam, park, manufacturer):
    """Find coaster in master database"""
    naam_norm = normalize_name(naam)
    park_norm = normalize_name(park) if park else ""
    manu_norm = normalize_name(manufacturer) if manufacturer else ""
    
    # Special case mappings
    special_cases = {
        'the ride to happiness': 'ride to happiness',
        'cancan coaster': 'eurosat - cancan coaster',
        'wodan timber coaster': 'wodan timbur coaster',
        'anubis the ride': 'anubis: the ride',
        'turbine': 'jumbo jet',  # Turbine was the previous name
        'euro-mir': 'euro mir',
        'swiss bob run': 'schweizer bobbahn',
        'eurosat': 'eurosat - cancan coaster',
        'matterhorn-blitz': 'matterhorn blitz',
        'tiki waka': 'tiki-waka',
        'the milky way express': 'mælkevejen',
        'formula': 'formuła',  # Polish spelling
        'temple of the night hawk': 'crazy bats',  # Renamed
        'mp-xpress': 'iron claw',  # Renamed at Moviepark
        'viking rollercoaster': 'viking roller coaster',
        'vogelrok': 'vogel rok',
        "winja's - fear": "winja's fear",
        "winja's - force": "winja's force",
        'light explores': 'light explorers',
        'ba-a-a express': 'ba-a-a-express',
        'fryda': 'frida',
        'energus': 'energuś',
        'loup garou': 'loup-garou',
        'dragon rollercoaster': 'dragon',
        'yoy thrill': 'yoy - thrill',
        'yoy chill': 'yoy - chill',
    }
    
    search_name = special_cases.get(naam_norm, naam_norm)
    
    # Try exact match first
    for coaster_id, coaster in master_db.items():
        if normalize_name(coaster['name']) == search_name:
            if park_norm and park_norm in normalize_name(coaster['park']):
                return coaster_id, coaster
            elif not park_norm:
                return coaster_id, coaster
    
    # Try partial match
    for coaster_id, coaster in master_db.items():
        if normalize_name(coaster['name']) == search_name:
            return coaster_id, coaster
    
    # Try contains match for name
    for coaster_id, coaster in master_db.items():
        if search_name in normalize_name(coaster['name']) or normalize_name(coaster['name']) in search_name:
            if park_norm and park_norm in normalize_name(coaster['park']):
                return coaster_id, coaster
    
    return None, None

for row in csv_coasters:
    naam = row['Naam'].strip()
    park = row['Park'].strip()
    manufacturer = row['Fabrikant'].strip()
    operatief = row['Operatief'] == '1'
    rank = int(row['ax']) if row['ax'] else None
    
    coaster_id, coaster = find_coaster(naam, park, manufacturer)
    
    if coaster_id:
        matched.append({
            'csv_name': naam,
            'csv_park': park,
            'csv_manufacturer': manufacturer,
            'csv_rank': rank,
            'csv_operational': operatief,
            'matched_id': coaster_id,
            'matched_name': coaster['name'],
            'matched_park': coaster['park'],
            'matched_manufacturer': coaster['manufacturer']
        })
    else:
        unmatched.append({
            'csv_name': naam,
            'csv_park': park,
            'csv_manufacturer': manufacturer,
            'csv_rank': rank,
            'csv_operational': operatief
        })

print("=" * 80)
print(f"MATCHED COASTERS ({len(matched)}):")
print("=" * 80)
for m in matched:
    print(f"{m['csv_rank']:3d}. {m['csv_name']:40s} -> {m['matched_id']} ({m['matched_name']})")

print("\n" + "=" * 80)
print(f"UNMATCHED COASTERS ({len(unmatched)}):")
print("=" * 80)
for u in unmatched:
    print(f"{u['csv_rank']:3d}. {u['csv_name']:40s} at {u['csv_park']}")

print("\n" + "=" * 80)
print(f"SUMMARY: {len(matched)}/{len(csv_coasters)} matched ({len(matched)/len(csv_coasters)*100:.1f}%)")
print("=" * 80)
