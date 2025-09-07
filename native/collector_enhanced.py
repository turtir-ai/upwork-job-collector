# -*- coding: utf-8 -*-
"""
Enhanced Chrome Native Messaging host for Upwork AI Assistant.
- Name: com.upwork.ai.collector
- Purpose: Run Playwright collector OR read from HAR file

Protocol: read length-prefixed JSON from stdin, write length-prefixed JSON to stdout.

Input example from extension:
{
  "action": "run_collector",  // or "read_har"
  "mode": "attach",
  "list_scroll": 4,
  "details": 5
}

Output example:
{"ok": true, "jobs": [...], "out_dir": ""}
"""
from __future__ import annotations
import io
import os
import sys
import json
import struct
import subprocess
from typing import Any, Dict, List
from pathlib import Path
import base64
import gzip
import time
from datetime import datetime

# ------------- Native messaging helpers -------------

def _read_message() -> Dict[str, Any]:
    raw_len = sys.stdin.buffer.read(4)
    if not raw_len:
        return {}
    (msg_len,) = struct.unpack('<I', raw_len)
    data = sys.stdin.buffer.read(msg_len)
    try:
        return json.loads(data.decode('utf-8'))
    except Exception:
        return {}


def _write_message(obj: Dict[str, Any]) -> None:
    data = json.dumps(obj, ensure_ascii=False).encode('utf-8')
    sys.stdout.buffer.write(struct.pack('<I', len(data)))
    sys.stdout.buffer.write(data)
    sys.stdout.buffer.flush()


# ------------- HAR processing -------------

def _extract_jobs_from_json(obj: Any) -> List[Dict[str, Any]]:
    """Recursively extract job-like dicts with (title, description/snippet)."""
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
    for prefix in (")]}',\n", ")]}',", ")]}'\n", ")]}'\n\n"):
        if s.startswith(prefix):
            s = s[len(prefix):]
    # Try direct parse
    try:
        return json.loads(s)
    except Exception:
        pass
    # Heuristic: slice to first { or [ and last } or ]
    first = min([i for i in [s.find('{'), s.find('[')] if i >= 0] or [-1])
    last_brace = s.rfind('}')
    last_bracket = s.rfind(']')
    last = max(last_brace, last_bracket)
    if first >= 0 and last > first:
        candidate = s[first:last+1]
        try:
            return json.loads(candidate)
        except Exception:
            return None
    return None


def _load_jobs_from_har(har_path: str) -> List[Dict[str, Any]]:
    if not os.path.isfile(har_path):
        return []
    try:
        with io.open(har_path, 'r', encoding='utf-8') as f:
            har = json.load(f)
    except Exception:
        # Sometimes HAR is huge; if failed, try reading and json.loads
        data = io.open(har_path, 'rb').read()
        try:
            har = json.loads(data.decode('utf-8', 'ignore'))
        except Exception:
            return []

    jobs: List[Dict[str, Any]] = []
    entries = (har.get('log') or {}).get('entries') or []
    
    for ent in entries[:2000]:
        try:
            resp = (ent.get('response') or {})
            cont = (resp.get('content') or {})
            mime = (cont.get('mimeType') or '').lower()
            text = cont.get('text') or ''
            if not text:
                continue
            # If base64 encoded, decode (and gunzip if needed)
            if cont.get('encoding') == 'base64':
                try:
                    raw = base64.b64decode(text)
                    try:
                        text = raw.decode('utf-8', 'ignore')
                    except Exception:
                        # try gzip
                        try:
                            text = gzip.decompress(raw).decode('utf-8', 'ignore')
                        except Exception:
                            text = ''
                except Exception:
                    text = ''
            # Skip if still empty
            if not text:
                continue
            # Accept even if mimeType not json as long as content looks like JSON
            if ('json' not in mime) and not (text.strip().startswith('{') or text.strip().startswith('[')):
                # not JSON-like
                continue
            payload = _try_parse_json(text)
            if payload is None:
                continue
            jobs.extend(_extract_jobs_from_json(payload))
        except Exception:
            continue
    return jobs[:200]


# ------------- Playwright collector integration -------------

def run_playwright_collector(options: Dict[str, Any]) -> Dict[str, Any]:
    """Run the actual Playwright collector script."""
    try:
        # Find the collect_upwork_data.py script
        root = Path(__file__).resolve().parents[1]  # upwork2 directory
        collect_script = root / 'scripts' / 'collect_upwork_data.py'
        
        if not collect_script.exists():
            return {
                'ok': False, 
                'error': f'Collector script not found at {collect_script}'
            }
        
        # Prepare output directory
        ts = datetime.now().strftime('%Y%m%d_%H%M%S')
        out_dir = root / 'scripts' / 'data' / f'session-{ts}'
        out_dir.mkdir(parents=True, exist_ok=True)
        
        # Build command
        python = sys.executable
        
        # If attach mode without CDP, switch to fresh mode
        mode = options.get('mode', 'fresh')
        if mode == 'attach' and not options.get('cdp'):
            mode = 'fresh'  # Fallback to fresh mode if no CDP endpoint
        
        cmd = [
            python, str(collect_script),
            '--mode', mode,
            '--list-scroll', str(options.get('list_scroll', 3)),
            '--details', str(options.get('details', 5)),
            '--out', str(out_dir),
            '--headless', 'false',
            '--no-pause'
        ]
        
        # Add CDP endpoint if in attach mode with valid CDP
        if mode == 'attach' and options.get('cdp'):
            cmd.extend(['--cdp', options['cdp']])
        
        # Run the collector
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120  # 2 minute timeout
        )
        
        if result.returncode != 0:
            return {
                'ok': False,
                'error': f'Collector failed: {result.stderr or result.stdout}'
            }
        
        # Read the extracted jobs
        jobs_file = out_dir / 'jobs-extracted.json'
        if jobs_file.exists():
            try:
                with open(jobs_file, 'r', encoding='utf-8') as f:
                    jobs = json.load(f)
                    return {
                        'ok': True,
                        'jobs': jobs,
                        'out_dir': str(out_dir)
                    }
            except Exception as e:
                return {
                    'ok': False,
                    'error': f'Failed to read jobs: {e}',
                    'out_dir': str(out_dir)
                }
        else:
            # No jobs file, but collector ran successfully
            # This might mean no jobs were found
            return {
                'ok': True,
                'jobs': [],
                'out_dir': str(out_dir),
                'note': 'Collector ran but found no jobs. Try scrolling more or check if logged in.'
            }
            
    except subprocess.TimeoutExpired:
        return {'ok': False, 'error': 'Collector timed out after 2 minutes'}
    except Exception as e:
        return {'ok': False, 'error': f'Unexpected error: {e}'}


def get_mock_jobs() -> List[Dict[str, Any]]:
    """Return mock jobs for testing."""
    return [
        {
            "title": "Full Stack Developer - React & Node.js",
            "description": "We need an experienced full stack developer to build a web application. Requirements: React, Node.js, MongoDB, REST APIs. Must have 5+ years experience.",
            "budget": "$5000",
            "skills": ["React", "Node.js", "MongoDB", "JavaScript"],
            "url": "https://www.upwork.com/jobs/~01234567890"
        },
        {
            "title": "Python Data Analyst", 
            "description": "Looking for a Python expert to analyze large datasets and create visualizations. Experience with pandas, numpy, matplotlib required.",
            "budget": "$50/hr",
            "skills": ["Python", "Pandas", "Data Analysis"],
            "url": "https://www.upwork.com/jobs/~01234567891"
        },
        {
            "title": "WordPress Website Development",
            "description": "Need a WordPress developer to create a business website with custom theme and plugins. Must be responsive and SEO optimized.",
            "budget": "$2000",
            "skills": ["WordPress", "PHP", "CSS", "JavaScript"],
            "url": "https://www.upwork.com/jobs/~01234567892"
        }
    ]


# ------------- Main -------------

def main():
    try:
        msg = _read_message() or {}
        
        # Handle different actions
        action = msg.get('action')
        
        # If no action specified, check if it looks like collector options
        if not action:
            if any(k in msg for k in ['mode', 'list_scroll', 'details', 'cdp']):
                action = 'run_collector'
            else:
                action = 'read_har'
        
        if action == 'run_collector':
            # Try to run Playwright collector
            result = run_playwright_collector(msg)
            if not result['ok']:
                # If collector fails, try HAR as fallback
                har_path = (
                    msg.get('har_path')
                    or os.environ.get('UPAI_HAR_PATH')
                    or r"C:\\Users\\TT\\upwork2\\www.upwork.com.har"
                )
                jobs = _load_jobs_from_har(har_path)
                if jobs:
                    _write_message({
                        'ok': True, 
                        'jobs': jobs, 
                        'out_dir': '',
                        'note': 'Collector failed, using HAR file instead'
                    })
                elif msg.get('use_mock', False):
                    # Use mock data if requested
                    _write_message({
                        'ok': True,
                        'jobs': get_mock_jobs(),
                        'out_dir': '',
                        'note': 'Using mock data for testing'
                    })
                else:
                    _write_message(result)  # Return the original error
            else:
                _write_message(result)
                
        elif action == 'read_har':
            # Read from HAR file
            har_path = (
                msg.get('har_path')
                or os.environ.get('UPAI_HAR_PATH')
                or r"C:\\Users\\TT\\upwork2\\www.upwork.com.har"
            )
            jobs = _load_jobs_from_har(har_path)
            if not jobs and msg.get('use_mock', False):
                jobs = get_mock_jobs()
                _write_message({
                    'ok': True, 
                    'jobs': jobs, 
                    'out_dir': '',
                    'note': 'No jobs in HAR, using mock data'
                })
            else:
                _write_message({
                    'ok': True, 
                    'jobs': jobs, 
                    'out_dir': ''
                })
                
        elif action == 'test':
            # Test mode - return mock data
            _write_message({
                'ok': True,
                'jobs': get_mock_jobs(),
                'out_dir': '',
                'note': 'Test mode - returning mock data'
            })
            
        elif action == 'ping':
            # Ping/pong for connectivity testing
            _write_message({
                'action': 'pong',
                'ok': True,
                'message': 'Native host is running'
            })
            
        else:
            _write_message({
                'ok': False,
                'error': f'Unknown action: {action}'
            })
            
    except Exception as exc:
        _write_message({'ok': False, 'error': str(exc)})


if __name__ == '__main__':
    main()
