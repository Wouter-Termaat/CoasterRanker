import json

# Read master database
with open(r'c:\Users\Wouter Termaat\OneDrive - Topicus\Documenten\Privé\CoasterRanker\database\data\coasters_master.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

# Specific searches
searches = {
    "Turbine at Walibi Belgium - OPERATED (no match in current DB)": lambda c: 'walibi' in c['park'].lower() and 'belgium' in c['park'].lower() and c['status'] == 'Operated' and 'schwarzkopf' in c['manufacturer'].lower(),
    "Milky Way at Tivoli": lambda c: c['id'] == 'C045001806',
    "Formula at Energylandia": lambda c: 'energylandia' in c['park'].lower() and c['manufacturer'] == 'Vekoma' and 'formula' in c['name'].lower(),
    "Temple of Night Hawk at Phantasialand": lambda c: c['id'] == 'C049011603',
    "MP-Xpress at Moviepark": lambda c: 'movie' in c['park'].lower() and 'xpress' in c['name'].lower()
}

for desc, search_func in searches.items():
    print(f"\n{desc}:")
    matches = [c for c in db.values() if search_func(c)]
    for m in matches[:5]:
        print(f"  {m['id']} - {m['name']} ({m['status']})")
