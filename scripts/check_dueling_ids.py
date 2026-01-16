import json
from pathlib import Path

# Read master database
master_path = Path(__file__).parent.parent / 'database' / 'data' / 'coasters_master.json'
with open(master_path, 'r', encoding='utf-8') as f:
    master_db = json.load(f)

print("=" * 80)
print("CHECKING DUELING/SPLIT COASTERS ID STRUCTURE")
print("=" * 80)

# Check YoY
print("\n1. YoY at Walibi Holland:")
yoy_coasters = {k: v for k, v in master_db.items() if 'yoy' in v['name'].lower() and 'walibi' in v['park'].lower()}
for object_key, data in yoy_coasters.items():
    print(f"   Object Key: {object_key}")
    print(f"   ID Field:   {data['id']}")
    print(f"   Name:       {data['name']}")
    print(f"   RCDB ID:    {data['rcdbId']}")
    print()

# Check Joris en de Draak
print("2. Joris en de Draak at Efteling:")
joris = {k: v for k, v in master_db.items() if 'joris' in v['name'].lower()}
for object_key, data in joris.items():
    print(f"   Object Key: {object_key}")
    print(f"   ID Field:   {data['id']}")
    print(f"   Name:       {data['name']}")
    print(f"   RCDB ID:    {data['rcdbId']}")
    print()

# Check Winja's
print("3. Winja's at Phantasialand:")
winjas = {k: v for k, v in master_db.items() if "winja" in v['name'].lower()}
for object_key, data in winjas.items():
    print(f"   Object Key: {object_key}")
    print(f"   ID Field:   {data['id']}")
    print(f"   Name:       {data['name']}")
    print(f"   RCDB ID:    {data['rcdbId']}")
    print()

# Check Stampida
print("4. Stampida at PortAventura:")
stampida = {k: v for k, v in master_db.items() if 'stampida' in v['name'].lower()}
for object_key, data in stampida.items():
    print(f"   Object Key: {object_key}")
    print(f"   ID Field:   {data['id']}")
    print(f"   Name:       {data['name']}")
    print(f"   RCDB ID:    {data['rcdbId']}")
    print()

# Check Max + Moritz
print("5. Max + Moritz at Efteling:")
max_moritz = {k: v for k, v in master_db.items() if 'max' in v['name'].lower() and 'moritz' in v['name'].lower()}
for object_key, data in max_moritz.items():
    print(f"   Object Key: {object_key}")
    print(f"   ID Field:   {data['id']}")
    print(f"   Name:       {data['name']}")
    print(f"   RCDB ID:    {data['rcdbId']}")
    print()

print("=" * 80)
print("SUMMARY:")
print("=" * 80)
print("If 'Object Key' ≠ 'ID Field', this is a PROBLEM that needs fixing!")
print("All dueling coasters should have unique IDs in both places.")
print("=" * 80)
