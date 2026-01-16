"""
Database Merger
Intelligently merges scraped RCDB data with existing coaster database
Preserves split coasters and assigns new IDs following C+xxx+xxxx+xx format
"""

import json
from typing import Dict, List, Optional, Set, Tuple
from pathlib import Path


class DatabaseMerger:
    """Merges scraped coaster data with existing database"""
    
    def __init__(self, database_path: str):
        """
        Initialize merger
        
        Args:
            database_path: Path to coasters_master.json
        """
        self.database_path = Path(database_path)
        self.database: List[Dict] = []
        self.rcdb_to_id: Dict[int, List[str]] = {}  # Maps rcdbId to list of coaster IDs (for splits)
        self.next_id_map: Dict[str, int] = {}  # Maps "C+country+park" to next available number
        
        self._load_database()
        self._build_indices()
    
    def _load_database(self):
        """Load existing database"""
        if self.database_path.exists():
            with open(self.database_path, 'r', encoding='utf-8') as f:
                self.database = json.load(f)
            print(f"Loaded {len(self.database)} coasters from database")
        else:
            print("No existing database found - will create new one")
    
    def _build_indices(self):
        """Build indices for fast lookups"""
        # Map rcdbId to coaster IDs
        for coaster in self.database:
            rcdb_id = coaster.get('rcdbId')
            coaster_id = coaster.get('id')
            
            if rcdb_id and coaster_id:
                if rcdb_id not in self.rcdb_to_id:
                    self.rcdb_to_id[rcdb_id] = []
                self.rcdb_to_id[rcdb_id].append(coaster_id)
        
        # Build next ID map (tracks highest ID number per park)
        for coaster in self.database:
            coaster_id = coaster.get('id', '')
            if len(coaster_id) == 10 and coaster_id.startswith('C'):
                # Extract C+country+park prefix
                prefix = coaster_id[:7]  # C + xxx + xxxx
                # Extract number (last 2 digits)
                try:
                    number = int(coaster_id[7:9])
                    if prefix not in self.next_id_map or number >= self.next_id_map[prefix]:
                        self.next_id_map[prefix] = number + 1
                except ValueError:
                    pass
    
    def merge_coaster(self, scraped_data: Dict, country_code: str, park_id: str, 
                     preview: bool = False) -> Dict:
        """
        Merge a scraped coaster into the database
        
        Args:
            scraped_data: Coaster data from RCDB scraper
            country_code: 3-digit country code (e.g., "049" for Germany)
            park_id: 4-digit park ID (e.g., "0116" for Phantasialand)
            preview: If True, only return changes without modifying database
            
        Returns:
            Dictionary with merge result:
            {
                "action": "added" | "updated" | "preserved",
                "id": "C049011601",
                "changes": {...}
            }
        """
        rcdb_id = scraped_data.get('rcdbId')
        
        if not rcdb_id:
            return {"action": "error", "message": "No RCDB ID in scraped data"}
        
        # Check if this RCDB ID already exists in database
        existing_ids = self.rcdb_to_id.get(rcdb_id, [])
        
        if existing_ids:
            # Coaster already exists - update it
            return self._update_existing(scraped_data, existing_ids[0], preview)
        else:
            # New coaster - add it
            return self._add_new(scraped_data, country_code, park_id, preview)
    
    def merge_split_coasters(self, scraped_data_list: List[Dict], country_code: str, 
                            park_id: str, preview: bool = False) -> List[Dict]:
        """
        Merge split coasters (dueling/racing) into database
        
        This handles the special case where RCDB has one entry but we split it into multiple.
        Preserves existing split coaster IDs if they already exist.
        
        Args:
            scraped_data_list: List of coaster dicts from scraper (one per track)
            country_code: 3-digit country code
            park_id: 4-digit park ID
            preview: If True, only return changes without modifying
            
        Returns:
            List of merge results
        """
        if not scraped_data_list:
            return []
        
        # All tracks share same RCDB ID
        rcdb_id = scraped_data_list[0].get('rcdbId')
        
        if not rcdb_id:
            return [{"action": "error", "message": "No RCDB ID in scraped data"}]
        
        # Check if this split coaster already exists
        existing_ids = self.rcdb_to_id.get(rcdb_id, [])
        
        results = []
        
        if existing_ids:
            # Split coaster already exists - preserve IDs and update data
            for i, scraped in enumerate(scraped_data_list):
                if i < len(existing_ids):
                    result = self._update_existing(scraped, existing_ids[i], preview)
                    results.append(result)
                else:
                    # More tracks than we have IDs (shouldn't happen, but handle it)
                    result = self._add_new(scraped, country_code, park_id, preview)
                    results.append(result)
        else:
            # New split coaster - assign consecutive IDs
            for scraped in scraped_data_list:
                result = self._add_new(scraped, country_code, park_id, preview)
                results.append(result)
        
        return results
    
    def _update_existing(self, scraped_data: Dict, existing_id: str, 
                        preview: bool) -> Dict:
        """Update an existing coaster with new data"""
        # Find the coaster in database
        coaster_idx = None
        for i, c in enumerate(self.database):
            if c.get('id') == existing_id:
                coaster_idx = i
                break
        
        if coaster_idx is None:
            return {"action": "error", "message": f"Coaster {existing_id} not found in database"}
        
        old_data = self.database[coaster_idx].copy()
        changes = {}
        
        # Fields to update from RCDB (preserve our custom ID and other fields)
        update_fields = [
            'name', 'parkName', 'city', 'country', 'status', 'opened',
            'manufacturer', 'model', 'type', 'design',
            'height', 'speed', 'length', 'inversions', 'elements', 'duration'
        ]
        
        for field in update_fields:
            old_value = old_data.get(field)
            new_value = scraped_data.get(field)
            
            # Only update if new value exists and differs from old
            if new_value and new_value != old_value:
                changes[field] = {"old": old_value, "new": new_value}
                if not preview:
                    self.database[coaster_idx][field] = new_value
        
        # Always update rcdbId to ensure it's set
        if scraped_data.get('rcdbId'):
            if not preview:
                self.database[coaster_idx]['rcdbId'] = scraped_data['rcdbId']
        
        action = "updated" if changes else "preserved"
        
        return {
            "action": action,
            "id": existing_id,
            "changes": changes
        }
    
    def _add_new(self, scraped_data: Dict, country_code: str, park_id: str, 
                preview: bool) -> Dict:
        """Add a new coaster to the database"""
        # Generate new ID
        prefix = f"C{country_code}{park_id}"
        
        # Get next number for this park
        if prefix not in self.next_id_map:
            self.next_id_map[prefix] = 1
        
        number = self.next_id_map[prefix]
        new_id = f"{prefix}{number:02d}"
        
        # Increment for next coaster at this park
        self.next_id_map[prefix] = number + 1
        
        # Build new coaster object
        new_coaster = {
            "id": new_id,
            "countryCode": country_code,
            "parkId": park_id,
            **scraped_data
        }
        
        # Add to database
        if not preview:
            self.database.append(new_coaster)
            
            # Update index
            rcdb_id = scraped_data.get('rcdbId')
            if rcdb_id:
                if rcdb_id not in self.rcdb_to_id:
                    self.rcdb_to_id[rcdb_id] = []
                self.rcdb_to_id[rcdb_id].append(new_id)
        
        return {
            "action": "added",
            "id": new_id,
            "data": new_coaster
        }
    
    def save_database(self, output_path: Optional[str] = None):
        """
        Save database to file
        
        Args:
            output_path: Optional different path (default: overwrite original)
        """
        path = Path(output_path) if output_path else self.database_path
        
        # Sort by ID for consistency
        sorted_db = sorted(self.database, key=lambda x: x.get('id', ''))
        
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(sorted_db, f, indent=2, ensure_ascii=False)
        
        print(f"Saved {len(sorted_db)} coasters to {path}")
    
    def get_statistics(self) -> Dict:
        """Get database statistics"""
        stats = {
            "total_coasters": len(self.database),
            "unique_rcdb_ids": len(self.rcdb_to_id),
            "split_coasters": sum(1 for ids in self.rcdb_to_id.values() if len(ids) > 1),
            "countries": len(set(c.get('country', '') for c in self.database)),
            "parks": len(set(c.get('parkName', '') for c in self.database))
        }
        return stats


def test_merger():
    """Test the merger with example data"""
    import tempfile
    import os
    
    # Create temporary test database
    test_db = [
        {
            "id": "C049011609",
            "countryCode": "049",
            "parkId": "0116",
            "name": "Winjas - Force",
            "rcdbId": 1235,
            "parkName": "Phantasialand",
            "status": "Operating",
            "height": "17.4"
        },
        {
            "id": "C049011610",
            "countryCode": "049",
            "parkId": "0116",
            "name": "Winjas - Fear",
            "rcdbId": 1235,
            "parkName": "Phantasialand",
            "status": "Operating",
            "height": "17.4"
        }
    ]
    
    # Save to temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(test_db, f, indent=2)
        temp_path = f.name
    
    try:
        # Test updating existing split coaster
        merger = DatabaseMerger(temp_path)
        
        print("Initial stats:")
        print(json.dumps(merger.get_statistics(), indent=2))
        print()
        
        # Simulate updating Winjas with new data
        updated_data = [
            {
                "name": "Winjas - Force",
                "rcdbId": 1235,
                "parkName": "Phantasialand",
                "status": "Operating",
                "height": "17.4",
                "speed": "60"  # New field
            },
            {
                "name": "Winjas - Fear",
                "rcdbId": 1235,
                "parkName": "Phantasialand",
                "status": "Operating",
                "height": "17.4",
                "speed": "66"  # New field
            }
        ]
        
        print("Merging updated Winjas data (preview mode)...")
        results = merger.merge_split_coasters(updated_data, "049", "0116", preview=True)
        for result in results:
            print(json.dumps(result, indent=2))
        print()
        
        # Test adding new coaster
        new_coaster = {
            "name": "Taron",
            "rcdbId": 11255,
            "parkName": "Phantasialand",
            "status": "Operating",
            "type": "Steel",
            "manufacturer": "Intamin"
        }
        
        print("Adding new coaster (preview mode)...")
        result = merger.merge_coaster(new_coaster, "049", "0116", preview=True)
        print(json.dumps(result, indent=2))
        print()
        
        print("Final stats:")
        print(json.dumps(merger.get_statistics(), indent=2))
        
    finally:
        # Clean up temp file
        os.unlink(temp_path)


if __name__ == "__main__":
    test_merger()
