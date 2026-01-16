import json
import csv
from pathlib import Path

# Read master database
master_path = Path(__file__).parent.parent / 'database' / 'data' / 'coasters_master.json'
with open(master_path, 'r', encoding='utf-8') as f:
    master_db = json.load(f)

# Read CSV file
csv_path = Path(r'C:\Users\Wouter Termaat\Downloads\Top List Coasters v Luca - List of Coaster.csv')

def normalize_name(name):
    return name.strip().lower().replace('  ', ' ')

def find_coaster(naam, park, manufacturer, master_db):
    naam_norm = normalize_name(naam)
    park_norm = normalize_name(park) if park else ""
    
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
        'spyké underground': 'psyké underground',
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

# Process CSV
matched_ids = []
with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        naam = row['Naam'].strip()
        park = row['Park'].strip()
        manufacturer = row['Fabrikant'].strip()
        
        coaster_id, coaster = find_coaster(naam, park, manufacturer, master_db)
        if coaster_id:
            matched_ids.append((naam, coaster_id, coaster['name']))

print("=" * 80)
print(f"CSV ENTRIES: {len(matched_ids)}")
print("=" * 80)
print()

# Check for dueling coasters that might match multiple credits
dueling_matches = {}
for csv_name, coaster_id, db_name in matched_ids:
    if 'stampida' in csv_name.lower() or 'max' in csv_name.lower():
        print(f"CSV: {csv_name:40s} → {coaster_id} ({db_name})")
        if csv_name not in dueling_matches:
            dueling_matches[csv_name] = []
        dueling_matches[csv_name].append(coaster_id)

print()
print("=" * 80)
print("POTENTIAL ISSUE:")
print("=" * 80)
print()
print("My script matched each CSV entry to ONE coaster ID.")
print("But for 'Stampida' (1 CSV entry) it matched to 'Stampida - Red'")
print("And for 'Max' (1 CSV entry) it matched to 'Max + Moritz - Max'")
print()
print("It did NOT automatically add BOTH sides of the dueling coaster.")
print("So where did the extra credits come from?")
print()
print("Let me check Luca's original profile to see if they already had")
print("the other sides of these dueling coasters...")
