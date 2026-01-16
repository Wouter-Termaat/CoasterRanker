import json

luca = json.load(open('database/profiles/luca.json', encoding='utf-8'))
print(f'Total credits: {len(luca["coasters"])}')
print(f'Operational: {sum(1 for c in luca["coasters"] if c["operational"])}')
print(f'Non-operational: {sum(1 for c in luca["coasters"] if not c["operational"])}')

# Show some of the newly added credits
print('\nSample of credits (first 10):')
for i, c in enumerate(luca['coasters'][:10], 1):
    print(f"  {i}. {c['coasterId']} (operational: {c['operational']})")
