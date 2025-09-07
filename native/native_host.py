#!/usr/bin/env python3
"""
Native messaging host for Upwork AI Assistant Chrome Extension
Handles job collection and analysis through native messaging protocol
"""

import sys
import json
import struct
import logging
import traceback
from pathlib import Path
from datetime import datetime
import time
import os
import io
import base64
import gzip
from typing import Any, Dict, List

# Setup logging to a file since we can't use stdout
log_dir = Path(__file__).parent / "logs"
log_dir.mkdir(exist_ok=True)
log_file = log_dir / f"native_host_{datetime.now().strftime('%Y%m%d')}.log"

logging.basicConfig(
    filename=str(log_file),
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# ------------------ HAR utilities (inline, no external script needed) ------------------

def _iter_entries(har: Dict[str, Any]):
    try:
        entries = (har.get('log') or {}).get('entries') or []
    except AttributeError:
        entries = []
    for e in entries[:2000]:
        yield e


def _extract_jobs_from_json(obj: Any) -> List[Dict[str, Any]]:
    """Recursively extract job-like dicts: require title and description/snippet."""
    out: List[Dict[str, Any]] = []

    def visit(v: Any):
        if isinstance(v, dict):
            title = v.get('title') or v.get('jobTitle')
            desc = v.get('description') or v.get('snippet') or v.get('jobDescription')
            if title and desc:
                out.append({
                    'title': str(title),
                    'description': str(desc),
                    'skills': v.get('skills') or v.get('requiredSkills') or [],
                    'budget': v.get('budget') or v.get('pay') or v.get('price') or '',
                    'url': v.get('url') or v.get('jobUrl') or v.get('link') or ''
                })
            for vv in v.values():
                visit(vv)
        elif isinstance(v, list):
            for item in v:
                visit(item)

    visit(obj)
    # de-dup
    seen = set()
    uniq: List[Dict[str, Any]] = []
    for j in out:
        key = (j.get('url') or '') + '|' + (j.get('title') or '')
        if key in seen:
            continue
        seen.add(key)
        uniq.append(j)
    return uniq[:200]


def _try_parse_json(text: str) -> Any:
    s = text.strip()
    # Trim common XSSI prefixes
    for prefix in ("')]}\n", ")]}'\n", ")]}'", ")]}\n\n"):
        if s.startswith(prefix):
            s = s[len(prefix):]
    # Direct parse
    try:
        return json.loads(s)
    except Exception:
        pass
    # Heuristic slice
    first_candidates = [s.find('{'), s.find('[')]
    first = min([i for i in first_candidates if i >= 0] or [-1])
    last = max(s.rfind('}'), s.rfind(']'))
    if first >= 0 and last > first:
        candidate = s[first:last+1]
        try:
            return json.loads(candidate)
        except Exception:
            return None
    return None


def load_jobs_from_har(har_path: str) -> List[Dict[str, Any]]:
    if not har_path or not os.path.isfile(har_path):
        return []
    try:
        with io.open(har_path, 'r', encoding='utf-8') as f:
            har = json.load(f)
    except Exception:
        try:
            data = io.open(har_path, 'rb').read()
            har = json.loads(data.decode('utf-8', 'ignore'))
        except Exception:
            return []

    jobs: List[Dict[str, Any]] = []
    for ent in _iter_entries(har):
        try:
            resp = (ent.get('response') or {})
            cont = (resp.get('content') or {})
            mime = (cont.get('mimeType') or '').lower()
            text = cont.get('text') or ''
            if not text:
                continue
            if cont.get('encoding') == 'base64':
                try:
                    raw = base64.b64decode(text)
                    try:
                        text = raw.decode('utf-8', 'ignore')
                    except Exception:
                        try:
                            text = gzip.decompress(raw).decode('utf-8', 'ignore')
                        except Exception:
                            text = ''
                except Exception:
                    text = ''
            if not text:
                continue
            # Accept JSON-like content
            if ('json' not in mime) and not (text.strip().startswith('{') or text.strip().startswith('[')):
                continue
            payload = _try_parse_json(text)
            if payload is None:
                continue
            jobs.extend(_extract_jobs_from_json(payload))
        except Exception:
            continue

    return jobs[:200]


def find_latest_har() -> str:
    """Try to find the most recent Upwork HAR in common locations (Downloads, project)."""
    candidates: List[Path] = []
    try:
        downloads = Path.home() / 'Downloads'
        if downloads.exists():
            candidates.extend(sorted(downloads.glob('*.har'), key=lambda p: p.stat().st_mtime, reverse=True)[:10])
    except Exception:
        pass
    try:
        project_dir = Path(__file__).parent.parent
        candidates.extend(sorted(project_dir.glob('*.har'), key=lambda p: p.stat().st_mtime, reverse=True)[:10])
        candidates.extend(sorted((project_dir / 'native').glob('*.har'), key=lambda p: p.stat().st_mtime, reverse=True)[:10])
    except Exception:
        pass

    # Prefer filenames containing 'upwork'
    candidates_sorted = sorted(candidates, key=lambda p: p.stat().st_mtime, reverse=True)
    for p in candidates_sorted:
        if 'upwork' in p.name.lower():
            return str(p)
    return str(candidates_sorted[0]) if candidates_sorted else ''

def import_jobs_from_har(har_path: str) -> List[Dict[str, Any]]:
    """Import jobs from a HAR file path. No mock fallback."""
    try:
        if not har_path or not os.path.isfile(har_path):
            logging.warning(f"HAR path not found: {har_path}")
            return []
        jobs = load_jobs_from_har(har_path)
        logging.info(f"Parsed {len(jobs)} jobs from HAR: {har_path}")
        return jobs
    except Exception as e:
        logging.error(f"Error importing from HAR: {e}")
        logging.error(traceback.format_exc())
        return []

def collect_jobs_from_page(url):
    """Placeholder for live collection; returns empty to avoid mock data."""
    try:
        logging.info(f"collect_jobs_from_page called for URL={url}; live collector not implemented.")
        return []
    except Exception as e:
        logging.error(f"Error collecting jobs: {e}")
        return []

def get_mock_jobs():
    """Return mock job data for testing"""
    return [
        {
            'id': 'job1',
            'title': 'Web Scraping Expert Needed - Python/Playwright',
            'description': 'Looking for experienced Python developer for web scraping project using Playwright',
            'budget': '$500-1000',
            'url': 'https://www.upwork.com/jobs/~job1',
            'skills': ['Python', 'Web Scraping', 'Playwright', 'BeautifulSoup'],
            'posted': datetime.now().isoformat(),
            'client': {'country': 'United States', 'rating': 4.8},
            'proposals': '10-15'
        },
        {
            'id': 'job2',
            'title': 'Browser Automation Script Development',
            'description': 'Need help with browser automation using Puppeteer or Playwright',
            'budget': '$1000-2500',
            'url': 'https://www.upwork.com/jobs/~job2',
            'skills': ['JavaScript', 'Puppeteer', 'Automation', 'Node.js'],
            'posted': datetime.now().isoformat(),
            'client': {'country': 'Canada', 'rating': 5.0},
            'proposals': '5-10'
        },
        {
            'id': 'job3',
            'title': 'Data Extraction from Multiple Websites',
            'description': 'Extract product data from e-commerce sites using Python',
            'budget': '$30-50/hr',
            'url': 'https://www.upwork.com/jobs/~job3',
            'skills': ['Python', 'Scrapy', 'Data Extraction', 'APIs'],
            'posted': datetime.now().isoformat(),
            'client': {'country': 'United Kingdom', 'rating': 4.5},
            'proposals': '20+'
        }
    ]

def read_message():
    """Read a message from Chrome using native messaging protocol"""
    try:
        # Read the message length (first 4 bytes)
        raw_length = sys.stdin.buffer.read(4)
        if not raw_length or len(raw_length) != 4:
            logging.error("Could not read message length")
            return None
            
        # Unpack message length
        message_length = struct.unpack('I', raw_length)[0]
        logging.debug(f"Reading message of length {message_length}")
        
        # Read the message content
        message = sys.stdin.buffer.read(message_length).decode('utf-8')
        return json.loads(message)
    except Exception as e:
        logging.error(f"Error reading message: {e}")
        logging.error(traceback.format_exc())
        return None

def send_message(message):
    """Send a message to Chrome using native messaging protocol"""
    try:
        # Encode message as JSON
        encoded_message = json.dumps(message).encode('utf-8')
        
        # Send message length (4 bytes)
        sys.stdout.buffer.write(struct.pack('I', len(encoded_message)))
        
        # Send the message
        sys.stdout.buffer.write(encoded_message)
        sys.stdout.buffer.flush()
        
        logging.debug(f"Sent message: {message}")
        return True
    except Exception as e:
        logging.error(f"Error sending message: {e}")
        logging.error(traceback.format_exc())
        return False

def process_message(message):
    """Process incoming message and return response"""
    try:
        # Log the entire message for debugging
        logging.info(f"Received full message: {json.dumps(message)}")
        
        action = message.get('action', '')
        
        # Handle empty or missing action by inferring intent from payload
        if not action:
            # Accept common alternatives or infer 'run_collector' when options-like keys are present
            action = message.get('type', '') or message.get('cmd', '')
            if not action:
                # If it looks like the service worker sent collector options directly, default to run_collector
                option_keys = {"mode", "list_scroll", "details", "har_path", "url"}
                if any(k in message for k in option_keys):
                    action = 'run_collector'
                else:
                    # Optional env override
                    action = os.environ.get('UPAI_DEFAULT_ACTION', '')
            if not action:
                logging.warning("No action specified in message; unable to infer")
                return {
                    'ok': False,
                    'success': False,
                    'error': 'No action specified. Please specify an action field.',
                    'timestamp': datetime.now().isoformat()
                }
        
        logging.info(f"Processing action: {action}")
        
        if action == 'ping':
            return {
                'ok': True,
                'success': True,
                'action': 'pong',
                'timestamp': datetime.now().isoformat()
            }
            
        elif action in ['collect_jobs', 'run_collector', 'collect']:
            # Prefer explicit HAR path; if missing, try env or best-effort discovery.
            har_path = message.get('har_path') or os.environ.get('UPAI_HAR_PATH') or r"C:\\Users\\TT\\upwork2\\www.upwork.com.har"
            url = message.get('url', '')

            jobs: List[Dict[str, Any]] = []
            tried_paths: List[str] = []

            if har_path:
                tried_paths.append(har_path)
                logging.info(f"Importing jobs from HAR: {har_path}")
                jobs = import_jobs_from_har(har_path)

            if not jobs:
                # Try to discover newest HAR automatically
                auto_har = find_latest_har()
                if auto_har:
                    tried_paths.append(auto_har)
                    logging.info(f"Trying latest discovered HAR: {auto_har}")
                    jobs = import_jobs_from_har(auto_har)

            if not jobs and url:
                logging.info(f"Falling back to page collector for URL: {url}")
                jobs = collect_jobs_from_page(url)

            ok = len(jobs) > 0
            response = {
                'ok': ok,
                'success': ok,
                'action': 'jobs_collected' if ok else 'no_jobs',
                'jobs': jobs,
                'count': len(jobs),
                'tried_har_paths': tried_paths,
                'timestamp': datetime.now().isoformat()
            }
            if not ok:
                response['error'] = (
                    'No jobs parsed. Capture a HAR on an Upwork jobs/search page (XHR/Fetch), '
                    'ensure GraphQL/search endpoints are present, then click Run Collector again.'
                )
            return response
            
        elif action == 'import_har':
            har_path = message.get('har_path', '')
            if not har_path:
                # Try to find HAR file in known location
                default_har = r"C:\Users\TT\upwork2\www.upwork.com.har"
                if os.path.exists(default_har):
                    har_path = default_har
                else:
                    return {
                        'success': False,
                        'error': 'HAR file path not provided',
                        'timestamp': datetime.now().isoformat()
                    }
            
            logging.info(f"Importing HAR file: {har_path}")
            jobs = import_jobs_from_har(har_path)
            ok = len(jobs) > 0
            
            return {
                'ok': ok,
                'success': ok,
                'action': 'har_imported' if ok else 'no_jobs',
                'jobs': jobs,
                'count': len(jobs),
                'source': har_path,
                'timestamp': datetime.now().isoformat()
            }
            
        elif action == 'analyze_job':
            job_data = message.get('job', {})
            logging.info(f"Analyzing job: {job_data.get('title', 'Unknown')}")
            
            # Mock analysis result
            return {
                'ok': True,
                'success': True,
                'action': 'job_analyzed',
                'analysis': {
                    'score': 8.5,
                    'match_percentage': 85,
                    'recommendation': 'Highly Recommended',
                    'reasoning': 'Strong match with your web scraping expertise'
                },
                'timestamp': datetime.now().isoformat()
            }
            
        else:
            logging.warning(f"Unknown action: {action}")
            return {
                'ok': False,
                'success': False,
                'error': f'Unknown action: {action}',
                'timestamp': datetime.now().isoformat()
            }
            
    except Exception as e:
        logging.error(f"Error processing message: {e}")
        logging.error(traceback.format_exc())
        return {
            'ok': False,
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }

def main():
    """Main loop for native messaging host"""
    logging.info("Native host started")
    
    try:
        while True:
            # Read message from Chrome
            message = read_message()
            
            if message is None:
                logging.warning("Received null message, exiting")
                break
                
            logging.debug(f"Received message: {message}")
            
            # Process the message
            response = process_message(message)
            
            # Send response back to Chrome
            if not send_message(response):
                logging.error("Failed to send response")
                break
                
            # Small delay to prevent CPU spinning
            time.sleep(0.01)
            
    except KeyboardInterrupt:
        logging.info("Native host interrupted by user")
    except Exception as e:
        logging.error(f"Fatal error in main loop: {e}")
        logging.error(traceback.format_exc())
    finally:
        logging.info("Native host terminated")

if __name__ == "__main__":
    main()
