import json
import csv
import sys
from pathlib import Path

# Force UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

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
    
    # Special case mappings
    special_cases = {
        'the ride to happiness': 'ride to happiness',
        'cancan coaster': 'eurosat - cancan coaster',
        'wodan timber coaster': 'wodan timbur coaster',
        'anubis the ride': 'anubis: the ride',
        'turbine': 'jumbo jet',
        'euro-mir': 'euro mir',
        'swiss bob run': 'schweizer bobbahn',
        'eurosat': 'eurosat - cancan coaster',
        'matterhorn-blitz': 'matterhorn blitz',
        'tiki waka': 'tiki-waka',
        'the milky way express': 'mælkevejen',
        'formula': 'formuła',
        'temple of the night hawk': 'crazy bats',
        'mp-xpress': 'iron claw',
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
    
    coaster_id, coaster = find_coaster(naam, park, manufacturer)
    
    if coaster_id:
        matched.append({
            'coasterId': coaster_id,
            'rank': None,  # We don't import rankings
            'operational': operatief
        })
    else:
        unmatched.append(f"{naam} at {park}")

# Output as JSON
print(json.dumps({
    'matched': matched,
    'matched_count': len(matched),
    'unmatched': unmatched,
    'unmatched_count': len(unmatched),
    'total': len(csv_coasters)
}, indent=2, ensure_ascii=False))
