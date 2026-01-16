# RCDB Database Update System - Implementation Complete

## ✅ Created Files

All files created in `scripts/database/`:

1. **database_merger_simple.py** - Merges scraped data into your database
   - Preserves your existing split coasters using mapping file
   - Creates automatic backups before saving
   - Handles both single and split coasters

2. **update_coasters_simple.py** - Main update script
   - Command-line interface with all options
   - Progress tracking for resume capability
   - Saves database every 50 coasters (configurable)
   - Auto-creates backups

3. **test_merger.py** - Safe testing on database copies
   - Tests with 4 real coasters (including splits)
   - Shows preview before merging
   - Works on COPIES - won't touch your real database

4. **run_batches.py** - Automated batch runner
   - Configure and run overnight
   - Handles multiple batches with pauses
   - Shows progress and time estimates

5. **USAGE.md** - Complete documentation
   - Step-by-step guide with PowerShell commands
   - Troubleshooting section
   - Command reference
   - Best practices

## 🚀 Quick Start

### 1. Install Dependencies

```powershell
cd "C:\Users\Wouter Termaat\OneDrive - Topicus\Documenten\Privé\CoasterRanker\scripts\database"
pip install requests beautifulsoup4
```

### 2. Test the System (SAFE)

```powershell
python test_merger.py
```

This scrapes 4 coasters and merges into TEST database copies. Review the output!

### 3. Clean Up Test Files

```powershell
cd ..\..\database\data
Remove-Item test_database.json, test_mapping.json
cd ..\..\scripts\database
```

### 4. Run Your First Real Batch

```powershell
python update_coasters_simple.py --start 1 --end 200
```

This updates RCDB 1-200 (takes ~10-15 minutes).

### 5. Review Results

Check the output and look at the backups created:

```powershell
cd ..\..\database\data
Get-ChildItem *.backup* | Sort-Object LastWriteTime -Descending | Select-Object -First 2
```

### 6. Continue with More Batches

```powershell
cd ..\..\scripts\database
python update_coasters_simple.py --start 201 --end 400
python update_coasters_simple.py --start 401 --end 600
# etc.
```

### 7. Or Use Automated Batches

Edit `run_batches.py` to configure your range, then:

```powershell
python run_batches.py
```

## 📋 What the Scripts Do

### database_merger_simple.py

- Loads your existing `coasters_master.json` and `rcdb_to_custom_mapping.json`
- Takes scraped coaster data (from scraper)
- For each scraped coaster:
  - If RCDB ID exists in mapping → UPDATE existing coaster (preserves your custom ID)
  - If RCDB ID is new → ADD new coaster (assigns new custom ID)
- Preserves your manually split coasters (Joris, Winjas, etc.)
- Creates automatic backups before saving
- Returns stats: updated, added, preserved splits

### update_coasters_simple.py

Main runner script:
- Takes command-line args: `--start`, `--end`, `--delay`, `--preview`, `--resume`
- Loops through RCDB ID range
- Scrapes each coaster (handles single and split)
- Batches scraped data and calls merger every 50 coasters
- Tracks progress in `update_progress.json` for resume capability
- Shows live progress: `[42/200] RCDB 42: Scraping... ✓ Kingda Ka`
- Creates backups automatically before each save

### test_merger.py

Safe testing script:
- Creates COPIES: `test_database.json`, `test_mapping.json`
- Scrapes 4 test coasters (775, 4526, 1697, 20549)
- Shows preview of what will change
- Merges into TEST database
- Shows results
- You can inspect test files before running on real database

### run_batches.py

Automated batch runner:
- Configure in the file: `total_start`, `total_end`, `batch_size`, `delay`, `pause_between`
- Divides range into batches (e.g., 1-200, 201-400, ...)
- Runs each batch using `update_coasters_simple.py`
- Pauses between batches
- Handles failures with user prompts
- Good for overnight runs

## 🎯 Recommended Strategy

### Phase 1: Testing (1 hour)
```powershell
# Test on copies
python test_merger.py

# Small real batch
python update_coasters_simple.py --start 1 --end 100
```

### Phase 2: Initial Batches (few hours)
```powershell
# Run a few 200-coaster batches manually
python update_coasters_simple.py --start 1 --end 200
python update_coasters_simple.py --start 201 --end 400
python update_coasters_simple.py --start 401 --end 600
```

### Phase 3: Full Update (overnight)
```powershell
# Edit run_batches.py:
#   total_start=601
#   total_end=15000
#   batch_size=500
#   delay=3.0

# Run overnight
python run_batches.py
```

### Phase 4: Incremental Updates (monthly)
```powershell
# Update just new coasters
python update_coasters_simple.py --start 15000 --end 16000
```

## 🔧 Key Features

### ✅ Preserves Your Manual Splits
Your 246 manually split coasters (from `rcdb_to_custom_mapping.json`) are preserved!
- Joris en de Draak: Water (C528023201) & Vuur (C528023202) - KEPT
- Winjas: Force & Fear - KEPT
- All your splits stay intact!

### ✅ Automatic Backups
Before every save:
- `coasters_master.json.backup_TIMESTAMP`
- `rcdb_to_custom_mapping.json.backup_TIMESTAMP`

### ✅ Resume Capability
If interrupted (network, Ctrl+C, crash):
```powershell
python update_coasters_simple.py --start 1 --end 1000 --resume
```

Skips already-completed RCDB IDs (tracked in `update_progress.json`).

### ✅ Safe Testing
`test_merger.py` works on COPIES. Your real database is never touched.

### ✅ Split Coaster Detection
Scraper automatically detects dueling/racing coasters:
- RCDB 4526 → Joris Water & Vuur (2 coasters)
- RCDB 20549 → Stardust Photon & Pulsar (2 coasters)

### ✅ Preview Mode
See what would change without saving:
```powershell
python update_coasters_simple.py --start 1 --end 10 --preview
```

## 📊 Expected Results

### Time Estimates
- 100 coasters: ~5-10 minutes
- 200 coasters: ~10-15 minutes
- 500 coasters: ~30-45 minutes
- 1000 coasters: ~1-1.5 hours
- Full database (15,000): ~10-15 hours

(With 3-second delay between requests)

### Success Rate
- From testing: 10 RCDB IDs → 13 coasters (7 single, 3 split), 0 failures
- Expected "not found" rate: 10-20% (RCDB has gaps)

### Database Growth
- Your database: ~1,200 coasters now
- RCDB total: ~13,000-15,000 coasters
- Expected final size: ~13,000-14,000 coasters

## ⚠️ Important Notes

### Do NOT Run Multiple Updates Simultaneously
One update at a time! Running multiple scripts could corrupt the database.

### Respect RCDB Servers
Default 3-second delay is intentional. Don't go below 2 seconds.

### Check Backups Regularly
Backups are in `database/data/`. Keep recent ones, delete old ones.

### Test First!
Always run `test_merger.py` first to validate the system.

### Monitor First Few Batches
Watch the first 2-3 batches to make sure everything works as expected.

## 🐛 Troubleshooting

### "ModuleNotFoundError"
```powershell
pip install requests beautifulsoup4
```

### "FileNotFoundError"
Make sure you're in the correct directory:
```powershell
cd "C:\Users\Wouter Termaat\OneDrive - Topicus\Documenten\Privé\CoasterRanker\scripts\database"
```

### Database corrupted
Restore from backup:
```powershell
cd ..\..\database\data
$latest = Get-ChildItem coasters_master.json.backup_* | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Copy-Item $latest.FullName coasters_master.json
```

### Want to start over
```powershell
Remove-Item update_progress.json
python update_coasters_simple.py --start 1 --end 200
```

## 📖 Full Documentation

See **USAGE.md** for complete guide with:
- Detailed command reference
- PowerShell examples
- Error handling
- Best practices
- Advanced usage

## 🎉 You're Ready!

Everything is set up. Just follow the Quick Start steps above.

Start with `python test_merger.py` to verify everything works!

---

**Files created:**
- ✅ database_merger_simple.py
- ✅ update_coasters_simple.py  
- ✅ test_merger.py
- ✅ run_batches.py
- ✅ USAGE.md
- ✅ README_IMPLEMENTATION.md (this file)

**System tested:**
- ✅ Single coaster scraping (Big One, Thunder Eagle, Apollo's Chariot)
- ✅ Split coaster detection (Joris, Stardust, Winjas)
- ✅ Batch scraping (10 IDs → 13 coasters, 0 failures)
- ✅ Malformed HTML parsing (RCDB's weird `class=float` without quotes)

**Ready to use!** 🚀
