import argparse
import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

# ------------- Helpers -------------

def ts():
    return datetime.now().strftime('%Y%m%d-%H%M%S')


def safe_name(s: str) -> str:
    s = re.sub(r'[^a-zA-Z0-9_.-]+', '_', s)
    return s[:200]


def write_text(path: Path, content: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding='utf-8')


def json_dumps(obj):
    return json.dumps(obj, ensure_ascii=False, indent=2)


def extract_jobs_from_json_obj(obj):
    jobs = []
    def walk(n):
        if n is None:
            return
        if isinstance(n, list):
            for x in n:
                walk(x)
            return
        if isinstance(n, dict):
            title = n.get('title') or n.get('jobTitle')
            desc = n.get('description') or n.get('snippet') or n.get('jobDescription')
            if title and desc:
                jobs.append({
                    'title': str(title),
                    'description': str(desc),
                    'skills': n.get('skills') or n.get('requiredSkills') or [],
                    'budget': n.get('budget') or n.get('pay') or n.get('price') or '',
                    'url': n.get('url') or n.get('jobUrl') or n.get('link') or ''
                })
            for v in n.values():
                walk(v)
    walk(obj)
    return jobs


# ------------- Main collector -------------

def run_collect(args):
    out_dir = Path(args.out or f'scripts/data/session-{ts()}').resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    har_path = out_dir / 'session.har'
    api_dir = out_dir / 'api_responses'
    pages_dir = out_dir / 'pages'

    all_json_paths = []

    with sync_playwright() as p:
        browser = None
        context = None

        if args.mode == 'attach':
            if not args.cdp:
                print('ERROR: --cdp ws/http endpoint is required for attach mode. Example: http://localhost:9222')
                sys.exit(1)
            browser = p.chromium.connect_over_cdp(args.cdp)
            # Create a separate context for navigation if needed
            context = browser.contexts[0] if browser.contexts else browser.new_context()
            print('[*] Connected to existing Chrome via CDP')
        else:
            browser = p.chromium.launch(headless=args.headless == 'true')
            context = browser.new_context(
                record_har_path=str(har_path),
                record_har_omit_content=False,
                ignore_https_errors=True,
            )
            page = context.new_page()
            page.goto('https://www.upwork.com/nx/find-work/', wait_until='domcontentloaded')
            print('[*] Opened Find Work. Please log in if required.')
            if not args.no_pause:
                input('    Press Enter after you are logged in and the feed is visible...')

        page = context.pages[0] if context.pages else context.new_page()

        # Response capture (for attach mode and general JSON harvesting)
        def on_response(resp):
            try:
                url = resp.url
                ctype = (resp.headers.get('content-type') or '').lower()
                
                # Focus on Upwork-specific API endpoints
                is_relevant = any([
                    'graphql' in url.lower(),
                    '/api/' in url,
                    '/search/' in url,
                    '/jobs/' in url,
                    'talent-search' in url,
                    'job-details' in url,
                    'ab/find-work' in url
                ])
                
                if 'json' in ctype and is_relevant:
                    text = resp.text()
                    if text and len(text) > 100:  # Skip tiny responses
                        parsed = urlparse(url)
                        fname = safe_name(f"api_{ts()}_{parsed.path.replace('/', '_')}")
                        fpath = api_dir / f'{fname}.json'
                        write_text(fpath, text)
                        all_json_paths.append(str(fpath))
                        print(f'[+] Captured: {parsed.path[:50]}...')
            except Exception:
                pass
        context.on('response', on_response)

        # --- Scroll Find Work with Smart Waiting ---
        try:
            print('[*] Waiting for job tiles to load...')
            # Wait for job tiles to appear (the main job cards on the page)
            page.wait_for_selector('[data-test="job-tile"], [data-qa="job-tile"], article', 
                                   state='visible', timeout=20000)
            print('[*] Job tiles found. Starting to scroll...')
            
            # Initial wait for network to settle
            page.wait_for_load_state('networkidle', timeout=10000)
            
            for i in range(int(args.list_scroll)):
                print(f'[*] Scrolling... ({i + 1}/{args.list_scroll})')
                # Scroll more aggressively to trigger lazy loading
                page.mouse.wheel(0, 3000)
                # Wait for network activity to complete after each scroll
                try:
                    page.wait_for_load_state('networkidle', timeout=5000)
                except:
                    pass  # Don't fail if network doesn't settle, just continue
                # Additional wait for content to render
                page.wait_for_timeout(1500)
            
            print('[*] Final wait for all data to load...')
            # Final network idle wait to ensure all API calls are complete
            page.wait_for_load_state('networkidle', timeout=10000)
            
        except Exception as e:
            print(f'[!] Scroll or wait error: {e}. Continuing anyway...')

        # Save list page snapshot
        try:
            html = page.content()
            write_text(pages_dir / 'find_work_page.html', html)
            page.screenshot(path=str(pages_dir / 'find_work_page.png'), full_page=True)
        except Exception:
            pass

        # Collect first N job links from the list
        links = []
        try:
            anchors = page.eval_on_selector_all('a[href*="/jobs/"]', 'els => els.map(e => e.getAttribute("href"))')
            for href in anchors:
                if not href:
                    continue
                if not href.startswith('http'):
                    href = f'{page.url.split("/")[0]}//{urlparse(page.url).netloc}{href}'
                if '/jobs/' in href and href not in links:
                    links.append(href)
            links = links[:int(args.details)]
            write_text(out_dir / 'job_list_links.json', json_dumps(links))
        except Exception:
            pass

        # Visit a few job detail pages
        for idx, url in enumerate(links, start=1):
            try:
                p2 = context.new_page()
                p2.goto(url, wait_until='domcontentloaded')
                p2.wait_for_timeout(1200)
                write_text(pages_dir / f'job_detail_{idx}.html', p2.content())
                p2.screenshot(path=str(pages_dir / f'job_detail_{idx}.png'), full_page=True)
                p2.close()
            except Exception as e:
                print('[!] Job detail error:', e)

        # Close & flush HAR
        if args.mode != 'attach':
            context.close()
            browser.close()

    # Build jobs-extracted.json from captured JSON files
    jobs = []
    for f in all_json_paths:
        try:
            data = json.loads(Path(f).read_text(encoding='utf-8'))
            jobs.extend(extract_jobs_from_json_obj(data))
        except Exception:
            pass

    # Deduplicate
    seen = set()
    dedup = []
    for j in jobs:
        key = f"{j.get('url','')}|{j.get('title','')}"
        if key not in seen and (j.get('title') or j.get('description')):
            seen.add(key)
            dedup.append(j)

    write_text(out_dir / 'jobs-extracted.json', json_dumps(dedup[:200]))

    summary = {
        'out_dir': str(out_dir),
        'har': str(har_path) if har_path.exists() else None,
        'api_responses_dir': str(api_dir),
        'pages_dir': str(pages_dir),
        'jobs_extracted_count': len(dedup[:200]),
        'json_files_captured': len(all_json_paths)
    }
    write_text(out_dir / 'summary.json', json_dumps(summary))
    print('\n[OK] Done. Summary:', summary)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Collect Upwork data (HAR, JSON API, list & details) for AI ranking/calibration.')
    parser.add_argument('--mode', choices=['fresh', 'attach'], default='fresh', help='fresh launches Chromium & records HAR, attach connects via CDP')
    parser.add_argument('--cdp', help='CDP endpoint for attach mode, e.g., http://localhost:9222')
    parser.add_argument('--out', help='Output directory (default: scripts/data/session-<ts>)')
    parser.add_argument('--list-scroll', default='3', help='Number of scroll steps on Find Work')
    parser.add_argument('--details', default='5', help='How many job detail pages to open')
    parser.add_argument('--headless', choices=['true','false'], default='false')
    parser.add_argument('--no-pause', action='store_true', help='Do not pause for manual login in fresh mode')

    args = parser.parse_args()
    run_collect(args)

