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

print("=" * 80)
print("ANALYZING THE CREDIT COUNT DIFFERENCE")
print("=" * 80)
print()
print(f"CSV file has: {len(csv_coasters)} coaster entries")
print()

# Count dueling/split coasters in the CSV
dueling_in_csv = [
    'Joris en de draak - Water',
    'Joris en de draak - Vuur',
    'Stampida',
]

print("Checking for split/dueling coasters in CSV:")
csv_names = [row['Naam'].strip() for row in csv_coasters]
for name in csv_names:
    if 'joris' in name.lower() or 'stampida' in name.lower() or 'max' in name.lower() and 'moritz' in name.lower():
        print(f"  • {name}")

print()
print("=" * 80)
print("BREAKDOWN:")
print("=" * 80)
print()
print("In the CSV:")
print("  • Joris en de draak entries: 2 (Water + Vuur)")
joris_count = sum(1 for name in csv_names if 'joris' in name.lower())
print(f"    Found: {joris_count}")

print("  • Stampida entries: ?")
stampida_count = sum(1 for name in csv_names if 'stampida' in name.lower())
print(f"    Found: {stampida_count}")

print("  • Max entries: ?")
max_count = sum(1 for name in csv_names if 'max' in name.lower() and not 'imax' in name.lower())
print(f"    Found: {max_count}")

print()
print("In the DATABASE (what we matched):")
print("  • Joris en de Draak: 2 credits (Water + Vuur)")
print("  • Stampida: 2 credits (Red + Blue)")
print("  • Max + Moritz: 2 credits (Max + Moritz)")
print()
print("This means:")
print("  - If CSV has 1 'Stampida' entry, database created 2 credits")
print("  - If CSV has 1 'Max' entry, database created 2 credits")
print()
print("Let's check what actually happened...")
