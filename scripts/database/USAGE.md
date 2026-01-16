# RCDB Database Update System - Usage Guide

Complete guide to updating your CoasterRanker database from RCDB.

---

## 📋 Prerequisites

### Python Installation
1. **Install Python 3.8+** (if not already installed)
   ```powershell
   # Check if Python is installed
   python --version
   ```

2. **Install required packages**
   ```powershell
   cd "c:\Users\Wouter Termaat\OneDrive - Topicus\Documenten\Privé\CoasterRanker\scripts\database"
   python -m pip install requests beautifulsoup4
   ```

---

## 🧪 Step 1: Test the System (IMPORTANT!)

Before updating your entire database, test with a small sample:

### Test the Scraper
```powershell
# Test single coaster
python test_single_coaster.py 775

# Test batch of 10 coasters (mix of single & split)
python test_batch.py
```

**Expected output:**
- ✓ Single coasters extracted correctly
- ✓ Split coasters detected and separated (e.g., Joris en de Draak → Water & Vuur)
- ✓ All stats populated (height, speed, length, inversions)

### Test the Database Merger
```powershell
python test_merger.py
```

**What it does:**
1. Creates TEST copies of your database files
2. Scrapes 4 test coasters (including split coasters)
3. Shows exactly what would be updated/added
4. Performs merge on TEST database (not your real one!)
5. Shows merge results

**Review carefully:**
- ✓ Existing split coasters preserved (your 246 manual splits)
- ✓ Stats updated correctly
- ✓ No duplicates created
- ✓ Custom IDs maintained

**If test looks good:** Proceed to Step 2
**If issues found:** Stop and fix before continuing

---

## 🚀 Step 2: Run Your First Real Batch

Start with a small batch (200 coasters = ~1 hour):

```powershell
python update_coasters.py --start 1 --end 200
```

**What happens:**
1. Scrapes RCDB IDs 1-200 (will skip non-existent IDs)
2. Detects split coasters automatically
3. Saves progress every 10 coasters to `scraped_data.json`
4. Creates backup of your database
5. Merges new data into `coasters_master.json`
6. Shows summary of updates/additions

**Monitor the output:**
- Watch for error patterns
- Check split coaster detection is working
- Verify stats look reasonable

---

## 📊 Step 3: Review the Results

### Check Scraped Data
```powershell
# View the raw scraped data
notepad scraped_data.json
```

Look for:
- ✓ Coaster names look correct
- ✓ Stats are populated (not all empty)
- ✓ Split coasters have different track names

### Check Merged Database
```powershell
# Open your updated database
notepad "..\..\database\data\coasters_master.json"
```

Spot-check a few coasters to verify:
- ✓ Stats updated correctly
- ✓ No weird characters or encoding issues
- ✓ Your manual splits still intact

---

## 🔁 Step 4: Continue with More Batches

If first batch looks good, continue:

```powershell
# Second batch
python update_coasters.py --start 201 --end 400

# Third batch  
python update_coasters.py --start 401 --end 600

# And so on...
```

### Batch Size Recommendations

**Batch Size = 200 coasters (~1 hour)**
- Good for: Active monitoring, frequent review
- Total batches needed: ~65 batches for full database (13,000 coasters)
- Pros: Can stop/review frequently
- Cons: More manual work

**Batch Size = 500 coasters (~2.5 hours)**
- Good for: Less frequent review, overnight runs
- Total batches needed: ~26 batches
- Pros: Fewer manual steps
- Cons: Longer recovery if issues occur

**Batch Size = 1000 coasters (~5 hours)**
- Good for: Long overnight runs
- Total batches needed: ~13 batches
- Pros: Fastest to complete full update
- Cons: Larger risk window

---

## 🤖 Step 5: Automated Batch Processing (Optional)

For hands-off operation, use the batch runner:

### Configure Batch Runner
Edit `run_batches.py` and uncomment/modify one of these:

```python
# Small test: first 1000 coasters
run_batches((1, 1000), batch_size=200, delay=3.0)

# Medium: first 5000 coasters  
run_batches((1, 5000), batch_size=200, delay=3.0)

# Full database
run_batches((1, 25000), batch_size=200, delay=3.0)
```

### Run Automated Batches
```powershell
python run_batches.py
```

**What it does:**
- Runs multiple batches automatically
- Pauses 60 seconds between batches
- Shows progress for each batch
- Asks if should continue after failures

**Best for:**
- Overnight processing
- Weekend bulk updates
- When you can't monitor actively

---

## ⚠️ Error Handling

### If Scraping Interrupted (Network/Crash)

Resume from last saved position:
```powershell
python update_coasters.py --resume
```

This reads `progress.json` and continues from where it stopped.

### If Merge Fails

Your original database is backed up automatically:
```
database/data/coasters_master.json.backup_TIMESTAMP
```

To restore:
```powershell
# Find the backup
dir "..\..\database\data\coasters_master.json.backup_*"

# Restore it (replace TIMESTAMP with actual timestamp)
copy "..\..\database\data\coasters_master.json.backup_TIMESTAMP" "..\..\database\data\coasters_master.json"
```

### Common Issues

**"pip not recognized"**
```powershell
python -m pip install requests beautifulsoup4
```

**"Too many requests" / Rate limiting**
- Increase delay: `--delay 5.0` (slower but safer)
- Pause and resume later with `--resume`

**Coaster stats look wrong**
- Check `scraped_data.json` - is data from RCDB correct?
- If RCDB is wrong, that's their data issue
- You can manually fix in your database later

**Split coasters not detected**
- This is normal - RCDB only shows split data for actual dueling/racing coasters
- Your manual 246 splits are preserved by the mapping file

---

## 📈 Monitoring Progress

### Check Progress File
```powershell
notepad progress.json
```

Shows:
- Last RCDB ID processed
- Total coasters scraped
- Success/failure counts
- Timestamp

### Check Log File
```powershell
notepad update_log.txt
```

Contains:
- All operations performed
- Errors encountered  
- Warnings about data issues

---

## 🎯 Recommended Full Update Strategy

### Conservative Approach (Recommended for First Time)

**Week 1: Test & Small Batches**
```powershell
# Day 1: Test
python test_merger.py

# Day 2-3: First 1000 coasters (5 batches of 200)
python update_coasters.py --start 1 --end 200
python update_coasters.py --start 201 --end 400
python update_coasters.py --start 401 --end 600
python update_coasters.py --start 601 --end 800  
python update_coasters.py --start 801 --end 1000

# Review results after each batch
```

**Week 2-3: Automated Runs**
```powershell
# If Week 1 went well, run larger automated batches
# Edit run_batches.py to configure
python run_batches.py
```

### Aggressive Approach (If Time-Constrained)

```powershell
# Day 1: Test
python test_merger.py

# Day 2: Run full automated update
# Edit run_batches.py for range (1, 25000)
python run_batches.py
```

**Risks:**
- Less review opportunity
- Harder to spot systematic issues early
- Longer rollback if problems found

---

## 🔄 Incremental Updates (Ongoing Maintenance)

After initial full update, keep database current:

### Monthly Update
```powershell
# Update newest coasters (last 500 IDs)
python update_coasters.py --start 24500 --end 25000
```

### Update Specific Coasters
```powershell
# Update a specific range (e.g., coasters 1000-1100)
python update_coasters.py --start 1000 --end 1100
```

### Preview Mode
```powershell
# See what would change without actually merging
python update_coasters.py --start 1 --end 200 --preview
```

---

## 📝 Command Reference

### update_coasters.py

```powershell
# Basic usage
python update_coasters.py --start <START_ID> --end <END_ID>

# With custom delay (slower, more polite to RCDB)
python update_coasters.py --start 1 --end 200 --delay 5.0

# Preview mode (don't merge, just show what would change)
python update_coasters.py --start 1 --end 200 --preview

# Resume from interruption
python update_coasters.py --resume
```

### test_single_coaster.py

```powershell
# Test specific coaster
python test_single_coaster.py <RCDB_ID>

# Examples
python test_single_coaster.py 775      # The Big One
python test_single_coaster.py 4526    # Joris en de Draak (split)
```

### test_batch.py

```powershell
# Test batch of 10 mixed coasters
python test_batch.py
```

### test_merger.py

```powershell
# Test merge logic safely
python test_merger.py
```

### run_batches.py

```powershell
# Run automated batches (edit file first to configure)
python run_batches.py
```

---

## 💾 File Structure

```
CoasterRanker/
├── database/
│   └── data/
│       ├── coasters_master.json          ← Your main database (UPDATED)
│       ├── coasters_master.json.backup_* ← Auto backups
│       └── rcdb_to_custom_mapping.json   ← Preserves your splits
├── scripts/
│   └── database/
│       ├── rcdb_scraper.py               ← Core scraper
│       ├── database_merger.py            ← Merge logic
│       ├── update_coasters.py            ← Main runner
│       ├── run_batches.py                ← Batch automation
│       ├── test_merger.py                ← Safe testing
│       ├── test_single_coaster.py        ← Single coaster test
│       ├── test_batch.py                 ← Batch test
│       ├── scraped_data.json             ← Latest scraped data
│       ├── progress.json                 ← Resume progress
│       ├── update_log.txt                ← Activity log
│       └── USAGE.md                      ← This file
```

---

## 🆘 Troubleshooting

### Script won't run
```powershell
# Make sure you're in the right directory
cd "c:\Users\Wouter Termaat\OneDrive - Topicus\Documenten\Privé\CoasterRanker\scripts\database"

# Check Python is available
python --version

# Try running with explicit path
python "c:\Users\Wouter Termaat\OneDrive - Topicus\Documenten\Privé\CoasterRanker\scripts\database\update_coasters.py" --start 1 --end 10
```

### Database corrupted
```powershell
# Restore from backup
dir "..\..\database\data\coasters_master.json.backup_*"
copy "..\..\database\data\coasters_master.json.backup_<LATEST>" "..\..\database\data\coasters_master.json"
```

### Need to start over
```powershell
# Delete progress file
del progress.json

# Delete scraped data
del scraped_data.json

# Restore database from backup if needed
```

---

## ✅ Final Checklist

Before starting full update:

- [ ] Python installed and working
- [ ] Packages installed (requests, beautifulsoup4)
- [ ] Test scraper works (`python test_batch.py`)
- [ ] Test merger works (`python test_merger.py`)
- [ ] Reviewed test results and they look correct
- [ ] Have backup of database (automatic, but verify exists)
- [ ] Understand how to resume if interrupted
- [ ] Know how to restore from backup if needed
- [ ] Decided on batch size strategy
- [ ] Ready to start!

---

## 🎉 Quick Start (TL;DR)

```powershell
# 1. Install
cd "c:\Users\Wouter Termaat\OneDrive - Topicus\Documenten\Privé\CoasterRanker\scripts\database"
python -m pip install requests beautifulsoup4

# 2. Test
python test_merger.py

# 3. First batch
python update_coasters.py --start 1 --end 200

# 4. Continue
python update_coasters.py --start 201 --end 400
# ... repeat ...
```

That's it! 🎢
