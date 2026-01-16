import json

# Load coasters master
with open('database/data/coasters_master.json', 'r', encoding='utf-8') as f:
    coasters = json.load(f)

# Load Wouter's profile
with open('database/profiles/wouter.json', 'r', encoding='utf-8') as f:
    wouter = json.load(f)

# Get Wouter's coaster IDs
wouter_ids = set([c['coasterId'] for c in wouter['coasters']])

# Get Wouter's coaster names
wouter_names = [coasters[cid]['name'] for cid in wouter_ids if cid in coasters]

# User's list
user_list = [
    "Der Schwur des Kärnan",
    "Hyperion",
    "Zadra",
    "The Ride to Happiness",
    "Untamed",
    "Taron",
    "Voltron",
    "Shambhala",
    "Batman Gotham City Escape",
    "Kondaa",
    "Red Force",
    "Troy",
    "Flucht von Novgorod",
    "F.L.Y.",
    "Fēnix",
    "Superman / la Atracción de Acero",
    "Furius Baco",
    "Colossos - Kampf der Giganten",
    "Abyssus",
    "Flug der Dämonen",
    "Dragon Khan",
    "Wodan Timbur Coaster",
    "Black Mamba",
    "Karacho",
    "Anubis The Ride",
    "Hals-über-Kopf",
    "Goliath",
    "Blue fire Megacoaster",
    "Baron 1898",
    "Lost Gravity",
    "Abismo",
    "Shadows of Arkham",
    "Van Helsing's Factory",
    "Gold Rush",
    "Fury",
    "De Vliegende Hollander",
    "Olympia Looping",
    "Joris en de draak - Water",
    "Joris en de draak - Vuur",
    "Formula",
    "Eurosat - CanCan Coaster",
    "YOY Thrill",
    "Silver Star",
    "Stuntfall",
    "Revolution",
    "YOY Chill",
    "Nessie",
    "Uncharted: The Enigma of Penitence",
    "Speed",
    "Tarántula",
    "Heidi The Ride",
    "Xpress: Platform 13",
    "Arthur",
    "Dwervelwind",
    "Colorado Adventure",
    "Winja's - Fear",
    "Winja's - Force",
    "Dragon Roller Coaster",
    "De Bob",
    "G'sengte Sau",
    "Pulsar",
    "Stampida",
    "Krake",
    "Tiki-Waka",
    "Correcaminos Bip, Bip",
    "Tornado",
    "Robin Hood",
    "Falcon",
    "Typhoon",
    "Euro-Mir",
    "Speed of Sound",
    "El Diablo - Tren de la Mina",
    "Crazy Bats",
    "Cobra",
    "Balagos – Flying Flame",
    "Thunder Loop",
    "Bobbahn",
    "Calamity Mine",
    "Poseidon",
    "Max & Moritz",
    "TNT Tren de la Mina",
    "Naga bay",
    "Tomahawk",
    "Raik",
    "Volldampf",
    "Boomerang",
    "Light Explorers",
    "Vogelrok",
    "Vampire",
    "Condor",
    "Roller Coaster Mayan",
    "Limit",
    "Dream catcher",
    "Jimmy Neutron's Atomic Flyer",
    "MP Xpress",
    "Python",
    "Big Loop",
    "Booster Bike",
    "Rioolrat",
    "Pegasus",
    "Coaster Express",
    "Psyché Underground",
    "Royal Scotsman",
    "Mammut",
    "Flying Dutchman Gold Mine",
    "Crazy Mine",
    "Speedy bob",
    "Vertigo",
    "Ghost Chasers",
    "Matterhorn-Blitz",
    "Atlantica SuperSplash",
    "Loup Garou",
    "Bandit",
    "Schweizer Bobbahn",
    "Schlange von Midgard",
    "Mine Train",
    "Frida",
    "Tom y Jerry",
    "Pegasus",
    "Kikkerachtbaan",
    "Rasender Tausendfüßler",
    "Energus",
    "Dragonfly",
    "Jul's RollerSkates",
    "Donderstenen",
    "Oki doki",
    "Fun Pilot",
    "Tami-Tami",
    "Toos-Express",
    "Backyardigans: Misson to Mars",
    "Grottenblitz",
    "Indy-Blitz",
    "Draak",
    "Drako",
    "Kleine Zar",
    "Bob express",
    "Ba-a-a Express",
    "Junior Red Force",
    "Achterbahn",
    "Alpenexpress Enzian",
    "Volare",
    "Viking Roller Coaster"
]

# Normalize function for comparison
def normalize(name):
    return name.lower().strip().replace("'", "'").replace('"', '').replace('"', '').replace('"', '').replace('–', '-').replace('—', '-')

# Create normalized set of Wouter's coasters
wouter_normalized = {normalize(name): name for name in wouter_names}

# Find missing
missing = []
for name in user_list:
    norm_name = normalize(name)
    if norm_name not in wouter_normalized:
        missing.append(name)

print(f'Total in your list: {len(user_list)}')
print(f'Total in app: {len(wouter_names)}')
print(f'Missing from app: {len(missing)}')
print()
print('Missing coasters:')
for i, name in enumerate(missing, 1):
    print(f'{i}. {name}')
