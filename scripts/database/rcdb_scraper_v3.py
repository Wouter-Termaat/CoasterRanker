"""
RCDB Web Scraper - Works with malformed HTML
Parses raw HTML with regex since BeautifulSoup can't handle RCDB's broken structure
"""

import requests
from bs4 import BeautifulSoup
import time
import json
import re
from typing import Dict, Optional


class RCDBScraper:
    """Scrapes coaster data from RCDB website"""
    
    BASE_URL = "https://rcdb.com"
    
    def __init__(self, delay: float = 3.0):
        self.delay = delay
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def fetch_coaster(self, rcdb_id: int) -> Optional[Dict]:
        """Fetch coaster data from RCDB"""
        url = f"{self.BASE_URL}/{rcdb_id}.htm"
        
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            time.sleep(self.delay)
            
            soup = BeautifulSoup(response.text, 'html.parser')
            html = response.text
            
            if "not a valid" in html.lower():
                return None
            
            return self._parse_coaster(soup, html, rcdb_id)
                
        except requests.RequestException as e:
            print(f"Error fetching RCDB {rcdb_id}: {e}")
            return None
    
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
            "height": self._extract_stat_regex(html, "Height"),
            "drop": self._extract_stat_regex(html, "Drop"),
            "speed": self._extract_stat_regex(html, "Speed"),
            "length": self._extract_stat_regex(html, "Length"),
            "inversions": self._extract_stat_regex(html, "Inversions"),
            "duration": self._extract_duration(html),
            "elements": self._extract_elements(html)
        }
    
    def _extract_stat_regex(self, html: str, stat_name: str) -> str:
        """
        Extract stat using regex on raw HTML
        Pattern: <th>StatName<td><span class="float">VALUE</span>
        """
        # Look for pattern: <th>Height<td><span class="float">213</span>
        pattern = rf'<th>{stat_name}<td>(?:<span class="float">([^<]+)</span>|(\d+))'
        match = re.search(pattern, html, re.IGNORECASE)
        if match:
            # Return whichever group matched
            return match.group(1) or match.group(2) or ""
        return ""
    
    def _extract_duration(self, html: str) -> str:
        """Extract duration (format like 3:00)"""
        pattern = r'<th>Duration<td>(\d+:\d+)'
        match = re.search(pattern, html, re.IGNORECASE)
        return match.group(1) if match else ""
    
    def _extract_elements(self, html: str) -> str:
        """Extract elements list"""
        # Pattern: <th>Elements<td><a...>Element1</a><br/><a...>Element2</a>
        pattern = r'<th>Elements<td>(.*?)</td>'
        match = re.search(pattern, html, re.IGNORECASE | re.DOTALL)
        if match:
            elements_html = match.group(1)
            # Extract all text from <a> tags
            element_pattern = r'<a[^>]*>([^<]+)</a>'
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
    """Test the scraper"""
    scraper = RCDBScraper(delay=1.0)
    
    print("Testing: The Big One (RCDB 775)")
    print("=" * 60)
    big_one = scraper.fetch_coaster(775)
    print(json.dumps(big_one, indent=2))


if __name__ == "__main__":
    test_scraper()
