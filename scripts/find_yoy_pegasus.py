import json

# Read master database
with open(r'c:\Users\Wouter Termaat\OneDrive - Topicus\Documenten\Privé\CoasterRanker\database\data\coasters_master.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

print("YOY credits at Walibi Holland:")
yoy = [c for c in db.values() if 'walibi' in c['park'].lower() and 'holland' in c['park'].lower() and 'yoy' in c['name'].lower()]
for c in yoy:
    print(f"  {c['id']} - {c['name']} ({c['status']})")

print("\nPegasus credits:")
pegasus = [c for c in db.values() if 'pegasus' in c['name'].lower()]
for c in pegasus[:10]:
    print(f"  {c['id']} - {c['name']} at {c['park']} ({c['status']})")

print("\nFormuła at Energylandia:")
formula = [c for c in db.values() if 'energylandia' in c['park'].lower() and 'formu' in c['name'].lower()]
for c in formula:
    print(f"  {c['id']} - {c['name']} ({c['status']})")

print("\nIron Claw at Moviepark:")
iron = [c for c in db.values() if 'movie' in c['park'].lower() and ('iron' in c['name'].lower() or 'claw' in c['name'].lower())]
for c in iron:
    print(f"  {c['id']} - {c['name']} ({c['status']})")
