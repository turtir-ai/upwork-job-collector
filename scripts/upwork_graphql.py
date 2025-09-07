#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Upwork GraphQL API Scraper
Upwork'in gerçek API'lerini kullanarak veri çeker
"""

import json
import time
import requests
from typing import List, Dict, Optional
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class UpworkGraphQLScraper:
    """Upwork GraphQL API kullanarak veri çeker"""
    
    def __init__(self):
        self.base_url = "https://www.upwork.com/api/graphql/v1"
        self.session = requests.Session()
        
        # Gerçek browser headers - Upwork'in CloudFlare korumasını bypass etmek için
        self.session.headers.update({
            'accept': '*/*',
            'accept-language': 'en-US,en;q=0.9,tr;q=0.8',
            'content-type': 'application/json',
            'origin': 'https://www.upwork.com',
            'referer': 'https://www.upwork.com/nx/find-work/best-matches',
            'sec-ch-ua': '"Google Chrome";v="140", "Not_A Brand";v="24", "Chromium";v="140"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
            'x-odesk-user-agent': 'oDesk LM',
            'x-requested-with': 'XMLHttpRequest',
            'x-upwork-accept-language': 'en-US'
        })
    
    def get_job_search_query(self) -> str:
        """İş arama GraphQL query'si"""
        return """
        query searchJobs($query: String!, $first: Int, $after: String) {
            search(query: $query, type: JOB, first: $first, after: $after) {
                edges {
                    node {
                        ... on Job {
                            id
                            title
                            description
                            budget {
                                amount
                                currency
                            }
                            hourlyBudgetMin
                            hourlyBudgetMax
                            duration
                            workload
                            experienceLevel
                            skills {
                                name
                            }
                            client {
                                id
                                location {
                                    country
                                }
                                totalSpent
                                paymentVerificationStatus
                                jobsPosted
                                hireRate
                            }
                            proposalsTier
                            totalApplicants
                            createdOn
                            publishedOn
                            renewedOn
                            isLocal
                            preferredFreelancerLocation
                            contractorTier
                        }
                    }
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
                totalCount
            }
        }
        """
    
    def search_jobs_via_api(self, keywords: str, limit: int = 20) -> List[Dict]:
        """API üzerinden iş arama"""
        jobs = []
        
        try:
            # Önce normal web sayfasını ziyaret ederek cookie'leri al
            self.session.get("https://www.upwork.com/nx/find-work/")
            time.sleep(1)
            
            query = self.get_job_search_query()
            
            variables = {
                "query": keywords,
                "first": limit,
                "after": None
            }
            
            payload = {
                "query": query,
                "variables": variables
            }
            
            logger.info(f"GraphQL API'den iş çekiliyor: {keywords}")
            
            response = self.session.post(
                self.base_url,
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if 'data' in data and 'search' in data['data']:
                    edges = data['data']['search'].get('edges', [])
                    
                    for edge in edges:
                        job = self._parse_graphql_job(edge.get('node', {}))
                        if job:
                            jobs.append(job)
                    
                    logger.info(f"{len(jobs)} iş bulundu (GraphQL)")
                else:
                    logger.warning("GraphQL response'da veri yok")
            else:
                logger.error(f"GraphQL hatası: {response.status_code}")
                
        except Exception as e:
            logger.error(f"GraphQL API hatası: {e}")
        
        return jobs
    
    def _parse_graphql_job(self, node: Dict) -> Optional[Dict]:
        """GraphQL job node'unu parse et"""
        try:
            job = {
                'id': node.get('id', ''),
                'title': node.get('title', ''),
                'description': node.get('description', ''),
                'url': f"https://www.upwork.com/jobs/~{node.get('id', '')}",
                'source': 'graphql'
            }
            
            # Bütçe bilgisi
            if node.get('budget'):
                job['budget'] = {
                    'amount': node['budget'].get('amount', 0),
                    'currency': node['budget'].get('currency', 'USD'),
                    'type': 'fixed'
                }
            elif node.get('hourlyBudgetMin') or node.get('hourlyBudgetMax'):
                job['budget'] = {
                    'min': node.get('hourlyBudgetMin', 0),
                    'max': node.get('hourlyBudgetMax', 0),
                    'type': 'hourly',
                    'currency': 'USD'
                }
                if job['budget']['min'] and job['budget']['max']:
                    job['budget']['amount'] = (job['budget']['min'] + job['budget']['max']) / 2
            
            # Beceriler
            job['skills'] = [skill.get('name', '') for skill in node.get('skills', [])]
            
            # İş detayları
            job['duration'] = node.get('duration', '')
            job['workload'] = node.get('workload', '')
            job['experience_level'] = node.get('experienceLevel', '')
            job['total_applicants'] = node.get('totalApplicants', 0)
            job['proposals_tier'] = node.get('proposalsTier', '')
            job['contractor_tier'] = node.get('contractorTier', '')
            
            # Müşteri bilgisi
            if node.get('client'):
                client = node['client']
                job['client'] = {
                    'country': client.get('location', {}).get('country', ''),
                    'total_spent': client.get('totalSpent', 0),
                    'payment_verified': client.get('paymentVerificationStatus', False),
                    'jobs_posted': client.get('jobsPosted', 0),
                    'hire_rate': client.get('hireRate', 0)
                }
            
            # Tarihler
            job['created_on'] = node.get('createdOn', '')
            job['published_on'] = node.get('publishedOn', '')
            
            return job
            
        except Exception as e:
            logger.error(f"Job parse hatası: {e}")
            return None
    
    def save_results(self, jobs: List[Dict], filename: str = None):
        """Sonuçları kaydet"""
        if not filename:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"upwork_graphql_jobs_{timestamp}.json"
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(jobs, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Sonuçlar kaydedildi: {filename}")
        return filename


# Alternative: Direct API endpoints kullan
class UpworkDirectAPIScraper:
    """Upwork'in direkt API endpoint'lerini kullanır"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.upwork.com/',
            'Origin': 'https://www.upwork.com',
            'X-Requested-With': 'XMLHttpRequest'
        })
    
    def search_talent_cloud(self, keywords: str, limit: int = 20) -> List[Dict]:
        """Talent Cloud API kullanarak arama"""
        jobs = []
        
        try:
            # Talent Cloud API endpoint
            url = "https://www.upwork.com/ab/services/search/jobs"
            
            params = {
                'q': keywords,
                'page': 0,
                'per_page': limit,
                'sort': 'recency',
                'api_params': '1',
                't': '0',
                'workload': 'as_needed,part_time,full_time',
                'duration_v3': 'week,month,semester,ongoing',
                'experience_level': 'entry_level,intermediate,expert',
                'proposals': '0-4,5-9,10-14,15-19,20-49,50',
                'client_hires': '0,1-9,10-',
                'client_info': 'payment_verified',
                'budget': '0-',
                'hourly_rate': '0-'
            }
            
            logger.info(f"Talent Cloud API'den iş çekiliyor: {keywords}")
            
            response = self.session.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if 'results' in data:
                    for job_data in data['results']:
                        job = self._parse_talent_cloud_job(job_data)
                        if job:
                            jobs.append(job)
                    
                    logger.info(f"{len(jobs)} iş bulundu (Talent Cloud)")
            else:
                logger.warning(f"Talent Cloud API hatası: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Talent Cloud API hatası: {e}")
        
        return jobs
    
    def _parse_talent_cloud_job(self, data: Dict) -> Optional[Dict]:
        """Talent Cloud job verisini parse et"""
        try:
            job = {
                'id': data.get('id', ''),
                'title': data.get('title', ''),
                'description': data.get('description', ''),
                'url': data.get('url', ''),
                'skills': data.get('skills', []),
                'budget': {
                    'amount': data.get('amount', {}).get('amount', 0),
                    'currency': data.get('amount', {}).get('currencyCode', 'USD')
                },
                'client': {
                    'country': data.get('client', {}).get('location', {}).get('country', ''),
                    'payment_verified': data.get('client', {}).get('paymentVerified', False),
                    'rating': data.get('client', {}).get('totalFeedback', 0)
                },
                'created_time': data.get('createdTime', ''),
                'duration': data.get('duration', ''),
                'workload': data.get('engagement', ''),
                'source': 'talent_cloud'
            }
            
            return job
            
        except Exception as e:
            logger.error(f"Talent Cloud job parse hatası: {e}")
            return None


# Extension için uygun formatta veri hazırla
def prepare_for_extension(jobs: List[Dict]) -> List[Dict]:
    """İşleri extension'ın beklediği formata dönüştür"""
    formatted_jobs = []
    
    for job in jobs:
        formatted_job = {
            'title': job.get('title', ''),
            'description': job.get('description', ''),
            'url': job.get('url', ''),
            'skills': job.get('skills', []),
            'budget': str(job.get('budget', {}).get('amount', 0)) if job.get('budget') else '0',
            'currency': job.get('budget', {}).get('currency', 'USD'),
            'duration': job.get('duration', ''),
            'client_rating': job.get('client', {}).get('rating', 0),
            'client_country': job.get('client', {}).get('country', ''),
            'posted_date': job.get('created_on', job.get('created_time', '')),
            'source': job.get('source', 'unknown')
        }
        formatted_jobs.append(formatted_job)
    
    return formatted_jobs


if __name__ == "__main__":
    # GraphQL scraper'ı dene
    graphql_scraper = UpworkGraphQLScraper()
    
    # Direct API scraper'ı dene
    direct_scraper = UpworkDirectAPIScraper()
    
    keywords = [
        "web scraping",
        "automation",
        "python developer",
        "javascript",
        "react developer"
    ]
    
    all_jobs = []
    
    for keyword in keywords:
        logger.info(f"\n=== Aranıyor: {keyword} ===")
        
        # GraphQL ile dene
        graphql_jobs = graphql_scraper.search_jobs_via_api(keyword, limit=5)
        all_jobs.extend(graphql_jobs)
        
        # Direct API ile dene
        if not graphql_jobs:
            direct_jobs = direct_scraper.search_talent_cloud(keyword, limit=5)
            all_jobs.extend(direct_jobs)
        
        time.sleep(2)  # Rate limiting
    
    if all_jobs:
        # Extension için formatla
        formatted_jobs = prepare_for_extension(all_jobs)
        
        # Sonuçları kaydet
        filename = f"upwork_jobs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(formatted_jobs, f, ensure_ascii=False, indent=2)
        
        logger.info(f"\nToplam {len(formatted_jobs)} iş bulundu ve {filename} dosyasına kaydedildi")
        
        # İstatistikler
        logger.info("\n=== İstatistikler ===")
        for i, job in enumerate(formatted_jobs[:5], 1):
            logger.info(f"{i}. {job['title'][:50]}... - ${job['budget']}")
