"""
RCDB Web Scraper - FIXED VERSION
Handles RCDB's malformed HTML with unquoted attributes: class=float (not class="float")
Supports both single coasters and split coasters (dueling/racing)
"""

import requests
from bs4 import BeautifulSoup
import time
import json
import re
from typing import Dict, List, Optional, Union


class RCDBScraper:
    """Scrapes coaster data from RCDB website"""
    
    BASE_URL = "https://rcdb.com"
    
    def __init__(self, delay: float = 3.0):
        self.delay = delay
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def fetch_coaster(self, rcdb_id: int) -> Optional[Union[Dict, List[Dict]]]:
        """
        Fetch coaster data from RCDB
        
        Returns:
            Single coaster dict, or list of dicts for split coasters (dueling/racing)
            None if coaster doesn't exist
        """
        url = f"{self.BASE_URL}/{rcdb_id}.htm"
        
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            time.sleep(self.delay)
            
            soup = BeautifulSoup(response.text, 'html.parser')
            html = response.text
            
            if "not a valid" in html.lower():
                return None
            
            # Check for split coaster (dueling/racing with multiple tracks)
            tracks_html = self._find_tracks_table(html)
            if tracks_html:
                return self._parse_split_coaster(soup, html, rcdb_id, tracks_html)
            else:
                return self._parse_coaster(soup, html, rcdb_id)
                
        except requests.RequestException as e:
            print(f"Error fetching RCDB {rcdb_id}: {e}")
            return None
    
    def _find_tracks_table(self, html: str) -> Optional[str]:
        """
        Find Tracks table HTML indicating split coaster (dueling/racing)
        Returns the raw HTML of the tracks table section
        
        RCDB has malformed HTML - no closing </tr> tags!
        Pattern: <h3>Tracks</h3><table...><tbody><tr><th>Name:<td>Track1<td>Track2<tr>...
        """
        # Find <h3>Tracks</h3> followed by content up to next </section> or <section>
        pattern = r'<h3>Tracks</h3><table[^>]*>(.*?)(?:</section>|<section>)'
        match = re.search(pattern, html, re.IGNORECASE | re.DOTALL)
        if match:
            table_html = match.group(1)
            # Check if first row is Name with multiple values (split coaster)
            # Pattern: <tbody><tr><th>Name<td>TrackName1<td>TrackName2 (NO COLON!)
            if re.search(r'<th>Name<td>[^<]+<td>[^<]+', table_html, re.IGNORECASE):
                return table_html
        return None
    
    def _parse_split_coaster(self, soup: BeautifulSoup, html: str, rcdb_id: int, 
                            tracks_html: str) -> List[Dict]:
        """
        Parse split coaster using regex on raw Tracks table HTML
        Pattern: <tr><th>Name:<td>Track1<td>Track2<tr><th>Length:<td>1234<td>5678...
        """
        # Extract track names from first row: <th>Name<td>Track1<td>Track2 (NO COLON!)
        name_pattern = r'<th>Name<td>([^<]+)<td>([^<]+)'
        name_match = re.search(name_pattern, tracks_html, re.IGNORECASE)
        if not name_match:
            return []
        
        track_names = [name_match.group(1).strip(), name_match.group(2).strip()]
        num_tracks = len(track_names)
        
        # Extract common data
        base_name = self._extract_name(soup)
        park_name = self._extract_park(soup)
        city = self._extract_city(soup)
        country = self._extract_country(soup)
        status = self._extract_status(soup)
        opened = self._extract_opened(soup)
        manufacturer = self._extract_manufacturer(soup)
        model = self._extract_model(soup)
        coaster_type = self._extract_type(soup)
        design = self._extract_design(soup)
        
        # Initialize stats for each track
        track_stats = [{}, {}]
        
        # Parse stats rows - Pattern: <th>StatName:<td>Value1<td>Value2
        stats_map = {
            'Length': 'length',
            'Height': 'height',
            'Drop': 'drop',
            'Speed': 'speed',
            'Inversions': 'inversions',
            'Duration': 'duration',
            'Elements': 'elements'
        }
        
        for stat_label, field_name in stats_map.items():
            # Pattern: <th>StatName<td>VALUE1<td>VALUE2 (NO COLON after stat name!)
            # Values can be: plain number, <span class=float>123.4</span> ft, or links
            pattern = rf'<th>{stat_label}<td>([^<]*(?:<[^>]+>[^<]*</[^>]+>)?[^<]*)<td>([^<]*(?:<[^>]+>[^<]*</[^>]+>)?[^<]*)'
            match = re.search(pattern, tracks_html, re.IGNORECASE)
            if match:
                for track_idx in range(num_tracks):
                    value_html = match.group(track_idx + 1)
                    
                    if field_name == 'elements':
                        # Extract text from links: <a href=...>Element</a>
                        elements = re.findall(r'>([^<]+)</a>', value_html)
                        track_stats[track_idx][field_name] = ' '.join(elements) if elements else ''
                    else:
                        # Extract number from <span class=float>123.4</span> or plain text
                        num_match = re.search(r'<span class=float>([\d.]+)</span>|^([\d.]+)', value_html)
                        if num_match:
                            value = num_match.group(1) or num_match.group(2)
                            track_stats[track_idx][field_name] = value
        
        # Build coaster dict for each track
        coasters = []
        for i, track_name in enumerate(track_names):
            coaster = {
                "name": f"{base_name} - {track_name}",
                "rcdbId": rcdb_id,
                "parkName": park_name,
                "city": city,
                "country": country,
                "status": status,
                "opened": opened,
                "manufacturer": manufacturer,
                "model": model,
                "type": coaster_type,
                "design": design
            }
            coaster.update(track_stats[i])
            coasters.append(coaster)
        
        return coasters
    
    def _parse_coaster(self, soup: BeautifulSoup, html: str, rcdb_id: int) -> Dict:
        """Parse coaster from HTML"""
        return {
            "name": self._extract_name(soup),
            "rcdbId": rcdb_id,
            "parkName": self._extract_park(soup),
            "city": self._extract_city(soup),
            "country": self._extract_country(soup),
            "status": self._extract_status(soup),
            "opened": self._extract_opened(soup),
            "manufacturer": self._extract_manufacturer(soup),
            "model": self._extract_model(soup),
            "type": self._extract_type(soup),
            "design": self._extract_design(soup),
            "height": self._extract_stat(html, "Height"),
            "drop": self._extract_stat(html, "Drop"),
            "speed": self._extract_stat(html, "Speed"),
            "length": self._extract_stat(html, "Length"),
            "inversions": self._extract_stat(html, "Inversions"),
            "duration": self._extract_duration(html),
            "elements": self._extract_elements(html)
        }
    
    def _extract_stat(self, html: str, stat_name: str) -> str:
        """
        Extract stat using regex on raw HTML
        
        CRITICAL FIX: RCDB uses class=float WITHOUT QUOTES!
        Real HTML: <th>Height<td><span class=float>213</span> ft
        NOT: <th>Height<td><span class="float">213</span> ft
        
        This is why previous regex failed - we were looking for quoted attributes
        """
        # Pattern 1: <span class=float>VALUE</span> (NO QUOTES on class attribute!)
        pattern = rf'<th>{stat_name}<td><span class=float>([^<]+)</span>'
        match = re.search(pattern, html, re.IGNORECASE)
        if match:
            return match.group(1)
        
        # Pattern 2: Plain number without span (e.g., inversions)
        pattern = rf'<th>{stat_name}<td>(\d+)'
        match = re.search(pattern, html, re.IGNORECASE)
        if match:
            return match.group(1)
        
        return ""
    
    def _extract_duration(self, html: str) -> str:
        """Extract duration (format like 3:00)"""
        pattern = r'<th>Duration<td>(\d+:\d+)'
        match = re.search(pattern, html, re.IGNORECASE)
        return match.group(1) if match else ""
    
    def _extract_elements(self, html: str) -> str:
        """Extract elements list"""
        pattern = r'<th>Elements<td>(.*?)(?:<tr>|</td>)'
        match = re.search(pattern, html, re.IGNORECASE | re.DOTALL)
        if match:
            elements_html = match.group(1)
            element_pattern = r'>([^<]+)</a>'
            elements = re.findall(element_pattern, elements_html)
            return ' '.join(elements) if elements else ""
        return ""
    
    def _extract_name(self, soup: BeautifulSoup) -> str:
        h1 = soup.find('h1')
        return h1.get_text(strip=True) if h1 else ""
    
    def _extract_park(self, soup: BeautifulSoup) -> str:
        for a in soup.find_all('a', href=True):
            href = a.get('href', '')
            if href and href[0] == '/' and href.endswith('.htm') and href[1:].replace('.htm', '').isdigit():
                text = a.get_text(strip=True)
                if text and len(text) > 2:
                    return text
        return ""
    
    def _extract_city(self, soup: BeautifulSoup) -> str:
        location_links = []
        for a in soup.find_all('a', href=True):
            if 'location.htm?id=' in a.get('href', ''):
                location_links.append(a.get_text(strip=True))
        return location_links[0] if location_links else ""
    
    def _extract_country(self, soup: BeautifulSoup) -> str:
        location_links = []
        for a in soup.find_all('a', href=True):
            if 'location.htm?id=' in a.get('href', ''):
                location_links.append(a.get_text(strip=True))
        return location_links[-1] if location_links else ""
    
    def _extract_status(self, soup: BeautifulSoup) -> str:
        text = soup.get_text()
        if 'Removed' in text:
            return 'Removed'
        elif 'SBNO' in text:
            return 'SBNO'
        elif 'Under Construction' in text:
            return 'Under Construction'
        return "Operating"
    
    def _extract_opened(self, soup: BeautifulSoup) -> str:
        text = soup.get_text()
        match = re.search(r'since\s+(\d+/\d+/\d+)', text)
        return match.group(1) if match else ""
    
    def _extract_manufacturer(self, soup: BeautifulSoup) -> str:
        text = soup.get_text()
        if 'Make:' in text:
            for elem in soup.find_all(string=lambda x: x and 'Make:' in x):
                parent = elem.parent
                if parent:
                    for a in parent.find_all_next('a', limit=5):
                        href = a.get('href', '')
                        if href and href[0] == '/' and href.endswith('.htm'):
                            return a.get_text(strip=True)
        return ""
    
    def _extract_model(self, soup: BeautifulSoup) -> str:
        text = soup.get_text()
        if 'Model:' in text:
            for elem in soup.find_all(string=lambda x: x and 'Model:' in x):
                parent = elem.parent
                if parent:
                    for a in parent.find_all_next('a', limit=5):
                        href = a.get('href', '')
                        if href and href.endswith('.htm'):
                            return a.get_text(strip=True)
        return ""
    
    def _extract_type(self, soup: BeautifulSoup) -> str:
        for a in soup.find_all('a', href=True):
            if 'g.htm?id=' in a.get('href', ''):
                text = a.get_text(strip=True)
                if text in ['Steel', 'Wood']:
                    return text
        return ""
    
    def _extract_design(self, soup: BeautifulSoup) -> str:
        for a in soup.find_all('a', href=True):
            if 'g.htm?id=' in a.get('href', ''):
                text = a.get_text(strip=True)
                if text in ['Sit Down', 'Inverted', 'Flying', 'Stand Up', 'Wing']:
                    return text
        return ""


def test_scraper():
    """Test the scraper with single and split coasters"""
    scraper = RCDBScraper(delay=1.0)
    
    print("TEST 1: Single Coaster - The Big One (RCDB 775)")
    print("=" * 70)
    result = scraper.fetch_coaster(775)
    print(json.dumps(result, indent=2))
    
    expected = {"height": "213", "length": "5497", "speed": "74", "drop": "205"}
    all_good = all(result.get(k) == v for k, v in expected.items())
    print(f"\n{'✓' if all_good else '✗'} Single coaster test")
    
    print("\n\nTEST 2: Split Coaster - Twisted Colossus (RCDB 4521)")
    print("=" * 70)
    result = scraper.fetch_coaster(4521)
    if isinstance(result, list):
        print(f"✓ Detected as split coaster with {len(result)} tracks:")
        for i, track in enumerate(result, 1):
            print(f"\nTrack {i}: {track.get('name')}")
            print(json.dumps(track, indent=2))
    else:
        print("✗ Should be detected as split coaster")
    
    print("\n" + "=" * 70)
    print("🎉 Scraper now supports both single and split coasters!")


if __name__ == "__main__":
    test_scraper()
