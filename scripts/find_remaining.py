import json

# Read master database
with open(r'c:\Users\Wouter Termaat\OneDrive - Topicus\Documenten\Privé\CoasterRanker\database\data\coasters_master.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

search_terms = [
    ('Cancan', 'Europa'),
    ('Can-Can', 'Europa'),
    ('CanCan', 'Europa'),
    ('Wodan', 'Europa'),
    ('Anubis', 'Plopsaland'),
    ('Turbine', 'Walibi'),
    ('Euro-Mir', 'Europa'),
    ('Mir', 'Europa'),
    ('Swiss Bob', 'Europa'),
    ('Bob Run', 'Europa'),
    ('Schweizer Bob', 'Europa'),
    ('Eurosat', 'Europa'),
    ('EuroSat', 'Europa'),
    ('Matterhorn', 'Europa'),
    ('Milky Way', 'Tivoli'),
    ('Formula', 'Energylandia'),
    ('Night Hawk', 'Phantasialand'),
    ('Nighthawk', 'Phantasialand'),
    ('Temple', 'Phantasialand'),
    ('MP-Xpress', 'Moviepark'),
    ('MP Xpress', 'Moviepark'),
    ('Xpress', 'Moviepark'),
    ('Viking', 'Energylandia')
]

for name_term, park_term in search_terms:
    matches = [c for c in db.values() if name_term.lower() in c['name'].lower() and park_term.lower() in c['park'].lower()]
    if matches:
        for m in matches:
            print(f"{m['id']} - {m['name']} at {m['park']}")
