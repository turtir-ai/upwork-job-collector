#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Upwork Job Scraper - Tersine Mühendislik ile Authentication Bypass
RSS ve Web scraping yöntemlerini birleştirerek Upwork iş ilanlarını çeker
"""

import json
import time
import re
import feedparser
import requests
from bs4 import BeautifulSoup
from urllib.parse import quote, urljoin
from datetime import datetime
from typing import List, Dict, Optional
import logging

# Logging ayarları
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class UpworkRSSScraper:
    """RSS beslemesi kullanarak authentication gerektirmeden veri çeker"""
    
    def __init__(self):
        self.base_url = "https://www.upwork.com/ab/feed/jobs/rss"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }
    
    def search_jobs(self, keywords: str, limit: int = 20) -> List[Dict]:
        """RSS ile iş arama - Authentication gerektirmez"""
        jobs = []
        
        try:
            # RSS URL'sini oluştur
            params = {
                'q': keywords,
                'sort': 'recency',
                'paging': f'0;{limit}'
            }
            
            url = f"{self.base_url}?q={quote(keywords)}&sort=recency"
            
            logger.info(f"RSS'den iş çekiliyor: {keywords}")
            
            # RSS feed'i parse et
            feed = feedparser.parse(url)
            
            for entry in feed.entries[:limit]:
                job = self._parse_rss_entry(entry)
                if job:
                    jobs.append(job)
            
            logger.info(f"{len(jobs)} iş bulundu (RSS)")
            
        except Exception as e:
            logger.error(f"RSS hatası: {e}")
        
        return jobs
    
    def _parse_rss_entry(self, entry) -> Dict:
        """RSS entry'sini parse et"""
        try:
            # İş ID'sini çıkar
            job_id = ""
            if hasattr(entry, 'id'):
                job_id = entry.id.split('_')[-1] if '_' in entry.id else entry.id
            
            # Özet metninden detayları çıkar
            description = entry.summary if hasattr(entry, 'summary') else ""
            
            # Becerileri çıkar
            skills = []
            if hasattr(entry, 'tags'):
                skills = [tag.term for tag in entry.tags]
            
            # Bütçe bilgisini çıkar
            budget = self._extract_budget(description)
            
            # Süre bilgisini çıkar
            duration = self._extract_duration(description)
            
            # Ülke bilgisini çıkar
            country = self._extract_country(description)
            
            return {
                'id': job_id,
                'title': entry.title,
                'url': entry.link,
                'description': description,
                'skills': skills,
                'budget': budget,
                'duration': duration,
                'country': country,
                'posted_date': entry.published if hasattr(entry, 'published') else "",
                'source': 'rss'
            }
        except Exception as e:
            logger.error(f"RSS entry parse hatası: {e}")
            return None
    
    def _extract_budget(self, text: str) -> Dict:
        """Metinden bütçe bilgisini çıkar"""
        budget = {'amount': 0, 'type': 'unknown', 'currency': 'USD'}
        
        text_lower = text.lower()
        
        # Saatlik ücret
        hourly_match = re.search(r'\$(\d+(?:\.\d+)?)\s*-\s*\$(\d+(?:\.\d+)?)\s*/?\s*hr', text)
        if hourly_match:
            budget['type'] = 'hourly'
            budget['min'] = float(hourly_match.group(1))
            budget['max'] = float(hourly_match.group(2))
            budget['amount'] = (budget['min'] + budget['max']) / 2
        else:
            # Sabit ücret
            fixed_match = re.search(r'budget[:\s]+\$?(\d+(?:,\d+)?(?:\.\d+)?)', text_lower)
            if fixed_match:
                budget['type'] = 'fixed'
                amount_str = fixed_match.group(1).replace(',', '')
                budget['amount'] = float(amount_str)
        
        return budget
    
    def _extract_duration(self, text: str) -> str:
        """Metinden süre bilgisini çıkar"""
        text_lower = text.lower()
        
        if 'less than 1 month' in text_lower:
            return 'less_than_month'
        elif '1 to 3 months' in text_lower:
            return '1_to_3_months'
        elif '3 to 6 months' in text_lower:
            return '3_to_6_months'
        elif 'more than 6 months' in text_lower:
            return 'more_than_6_months'
        elif 'hourly' in text_lower:
            return 'hourly'
        
        return 'unknown'
    
    def _extract_country(self, text: str) -> str:
        """Metinden ülke bilgisini çıkar"""
        # Yaygın ülke kodları
        countries = {
            'united states': 'US',
            'united kingdom': 'UK',
            'canada': 'CA',
            'australia': 'AU',
            'germany': 'DE',
            'france': 'FR',
            'india': 'IN',
            'pakistan': 'PK',
            'philippines': 'PH',
            'ukraine': 'UA'
        }
        
        text_lower = text.lower()
        for country, code in countries.items():
            if country in text_lower:
                return code
        
        return 'unknown'


class UpworkWebScraper:
    """Web scraping ile detaylı veri çeker - Authentication bypass teknikleri kullanır"""
    
    def __init__(self):
        self.base_url = "https://www.upwork.com"
        self.session = requests.Session()
        
        # Browser-like headers - CloudFlare ve bot korumasını bypass etmek için
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"'
        })
    
    def search_jobs_via_url(self, keywords: str, limit: int = 20) -> List[Dict]:
        """URL manipülasyonu ile iş arama - Login gerektirmez"""
        jobs = []
        
        try:
            # Arama URL'sini oluştur
            search_url = f"{self.base_url}/search/jobs/?q={quote(keywords)}"
            
            logger.info(f"Web scraping ile iş çekiliyor: {keywords}")
            
            # Sayfayı çek
            response = self.session.get(search_url, timeout=10)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # İş kartlarını bul - Farklı selector'lar dene
                job_cards = soup.find_all('section', {'data-test': 'job-tile'})
                
                if not job_cards:
                    # Alternatif selector'lar
                    job_cards = soup.find_all('div', class_=re.compile('job-tile'))
                
                if not job_cards:
                    # JSON-LD yapılandırılmış verisini ara
                    jobs.extend(self._extract_json_ld_jobs(soup))
                
                for card in job_cards[:limit]:
                    job = self._parse_job_card(card)
                    if job:
                        jobs.append(job)
                
                logger.info(f"{len(jobs)} iş bulundu (Web)")
            else:
                logger.warning(f"HTTP {response.status_code}: {search_url}")
        
        except Exception as e:
            logger.error(f"Web scraping hatası: {e}")
        
        return jobs
    
    def _parse_job_card(self, card) -> Optional[Dict]:
        """İş kartını parse et"""
        try:
            job = {}
            
            # Başlık
            title_elem = card.find('h4', {'data-test': 'job-title'}) or card.find('a', class_=re.compile('job-title'))
            if title_elem:
                job['title'] = title_elem.get_text(strip=True)
                
                # URL
                link = title_elem.find('a') if title_elem.name != 'a' else title_elem
                if link and link.get('href'):
                    job['url'] = urljoin(self.base_url, link['href'])
                    # ID'yi URL'den çıkar
                    job['id'] = self._extract_job_id(job['url'])
            
            # Açıklama
            desc_elem = card.find('span', {'data-test': 'job-description-text'}) or card.find('div', class_=re.compile('description'))
            if desc_elem:
                job['description'] = desc_elem.get_text(strip=True)
            
            # Bütçe
            budget_elem = card.find('span', {'data-test': 'budget'}) or card.find('span', class_=re.compile('budget'))
            if budget_elem:
                job['budget'] = self._parse_budget_element(budget_elem.get_text(strip=True))
            
            # Beceriler
            skills = []
            skill_elems = card.find_all('span', {'data-test': 'skill'}) or card.find_all('a', class_=re.compile('skill'))
            for skill_elem in skill_elems:
                skills.append(skill_elem.get_text(strip=True))
            job['skills'] = skills
            
            # Zaman
            time_elem = card.find('span', {'data-test': 'posted-time'}) or card.find('time')
            if time_elem:
                job['posted_time'] = time_elem.get_text(strip=True)
            
            job['source'] = 'web'
            
            return job if job.get('title') else None
            
        except Exception as e:
            logger.error(f"İş kartı parse hatası: {e}")
            return None
    
    def _extract_json_ld_jobs(self, soup) -> List[Dict]:
        """Sayfadaki JSON-LD yapılandırılmış verisinden işleri çıkar"""
        jobs = []
        
        try:
            # JSON-LD script'lerini bul
            scripts = soup.find_all('script', type='application/ld+json')
            
            for script in scripts:
                try:
                    data = json.loads(script.string)
                    
                    # JobPosting tipindeki verileri ara
                    if isinstance(data, dict):
                        if data.get('@type') == 'JobPosting':
                            jobs.append(self._parse_json_ld_job(data))
                        elif data.get('@graph'):
                            for item in data['@graph']:
                                if item.get('@type') == 'JobPosting':
                                    jobs.append(self._parse_json_ld_job(item))
                    elif isinstance(data, list):
                        for item in data:
                            if item.get('@type') == 'JobPosting':
                                jobs.append(self._parse_json_ld_job(item))
                
                except json.JSONDecodeError:
                    continue
        
        except Exception as e:
            logger.error(f"JSON-LD parse hatası: {e}")
        
        return jobs
    
    def _parse_json_ld_job(self, data: Dict) -> Dict:
        """JSON-LD JobPosting verisini parse et"""
        job = {
            'title': data.get('title', ''),
            'description': data.get('description', ''),
            'url': data.get('url', ''),
            'id': self._extract_job_id(data.get('url', '')),
            'posted_date': data.get('datePosted', ''),
            'valid_through': data.get('validThrough', ''),
            'employment_type': data.get('employmentType', ''),
            'source': 'json-ld'
        }
        
        # Organizasyon bilgisi
        if data.get('hiringOrganization'):
            org = data['hiringOrganization']
            job['client'] = {
                'name': org.get('name', ''),
                'url': org.get('sameAs', '')
            }
        
        # Lokasyon
        if data.get('jobLocation'):
            loc = data['jobLocation']
            if isinstance(loc, dict):
                job['location'] = loc.get('name', '')
        
        # Maaş bilgisi
        if data.get('baseSalary'):
            salary = data['baseSalary']
            if isinstance(salary, dict):
                job['budget'] = {
                    'currency': salary.get('currency', 'USD'),
                    'value': salary.get('value', {})
                }
        
        return job
    
    def _extract_job_id(self, url: str) -> str:
        """URL'den iş ID'sini çıkar"""
        # Upwork URL formatları:
        # /jobs/~01234567890abcdef
        # /job/_~01234567890abcdef
        match = re.search(r'[~_]([0-9a-f]{16,})', url)
        if match:
            return match.group(1)
        return ""
    
    def _parse_budget_element(self, text: str) -> Dict:
        """Bütçe metnini parse et"""
        budget = {'amount': 0, 'type': 'unknown', 'currency': 'USD'}
        
        # Saatlik ücret
        if '/hr' in text or 'hour' in text.lower():
            budget['type'] = 'hourly'
            numbers = re.findall(r'\$?(\d+(?:\.\d+)?)', text)
            if len(numbers) >= 2:
                budget['min'] = float(numbers[0])
                budget['max'] = float(numbers[1])
                budget['amount'] = (budget['min'] + budget['max']) / 2
            elif numbers:
                budget['amount'] = float(numbers[0])
        else:
            # Sabit ücret
            budget['type'] = 'fixed'
            match = re.search(r'\$?(\d+(?:,\d+)?(?:\.\d+)?)', text)
            if match:
                amount_str = match.group(1).replace(',', '')
                budget['amount'] = float(amount_str)
        
        return budget


class UpworkHybridScraper:
    """RSS ve Web scraping yöntemlerini birleştiren hibrit scraper"""
    
    def __init__(self):
        self.rss_scraper = UpworkRSSScraper()
        self.web_scraper = UpworkWebScraper()
    
    def search_jobs(self, keywords: str, limit: int = 20, use_web: bool = True) -> List[Dict]:
        """Hibrit arama - Önce RSS, sonra web scraping ile zenginleştir"""
        
        # RSS ile başla (hızlı ve güvenilir)
        jobs = self.rss_scraper.search_jobs(keywords, limit)
        
        # Web scraping ile zenginleştir
        if use_web and len(jobs) < limit:
            web_jobs = self.web_scraper.search_jobs_via_url(keywords, limit - len(jobs))
            
            # Tekrarları önle
            existing_ids = {job.get('id') for job in jobs if job.get('id')}
            
            for web_job in web_jobs:
                if web_job.get('id') not in existing_ids:
                    jobs.append(web_job)
        
        return jobs
    
    def save_results(self, jobs: List[Dict], filename: str = None):
        """Sonuçları JSON dosyasına kaydet"""
        if not filename:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"upwork_jobs_{timestamp}.json"
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(jobs, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Sonuçlar kaydedildi: {filename}")
        return filename


# Test ve kullanım
if __name__ == "__main__":
    # Hibrit scraper oluştur
    scraper = UpworkHybridScraper()
    
    # Arama yap
    keywords = [
        "web scraping",
        "automation python",
        "playwright puppeteer",
        "data extraction",
        "bot development"
    ]
    
    all_jobs = []
    
    for keyword in keywords:
        logger.info(f"\nAranıyor: {keyword}")
        jobs = scraper.search_jobs(keyword, limit=10, use_web=True)
        all_jobs.extend(jobs)
        
        # Rate limiting
        time.sleep(2)
    
    # Sonuçları kaydet
    if all_jobs:
        filename = scraper.save_results(all_jobs)
        logger.info(f"\nToplam {len(all_jobs)} iş bulundu ve kaydedildi")
        
        # Özet istatistikler
        hourly_jobs = [j for j in all_jobs if j.get('budget', {}).get('type') == 'hourly']
        fixed_jobs = [j for j in all_jobs if j.get('budget', {}).get('type') == 'fixed']
        
        logger.info(f"Saatlik işler: {len(hourly_jobs)}")
        logger.info(f"Sabit ücretli işler: {len(fixed_jobs)}")
        
        # En yüksek bütçeli işler
        sorted_jobs = sorted(all_jobs, key=lambda x: x.get('budget', {}).get('amount', 0), reverse=True)
        
        logger.info("\nEn yüksek bütçeli 5 iş:")
        for job in sorted_jobs[:5]:
            budget = job.get('budget', {})
            logger.info(f"- {job.get('title', 'N/A')}: ${budget.get('amount', 0):.2f} ({budget.get('type', 'unknown')})")
