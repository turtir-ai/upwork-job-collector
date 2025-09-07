# -*- coding: utf-8 -*-
"""
Chrome Native Messaging host for Upwork AI Assistant.
- Name: com.upwork.ai.collector
- Purpose: return jobs either by reading a local HAR or by running a collector (stub).

Protocol: read length-prefixed JSON from stdin, write length-prefixed JSON to stdout.
Input example from extension (service worker):
{
  "mode": "attach",
  "list_scroll": 4,
  "details": 5
}

This host will additionally, by default, try to read a HAR file from:
  C:\\Users\\TT\\upwork2\\www.upwork.com.har
You can override with env UPAI_HAR_PATH or input options.har_path.

Output example:
{"ok": true, "jobs": [...], "out_dir": ""}
"""
from __future__ import annotations
import io
import os
import sys
import json
import struct
from typing import Any, Dict, List
import base64
import gzip

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

def _iter_entries(har: Dict[str, Any]):
    try:
        entries = (har.get('log') or {}).get('entries') or []
    except AttributeError:
        entries = []
    for e in entries[:2000]:
        yield e


def _extract_jobs_from_json(obj: Any) -> List[Dict[str, Any]]:
    """Recursively extract job-like dicts with (title, description/snippet).
    Matches what the content script does, but runs locally.
    """
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


essential_mime = ('json', 'javascript', 'text/json', 'application/json')

def _try_parse_json(text: str) -> Any:
    s = text.strip()
    # Trim common XSSI prefixes
    for prefix in (")]}\',\n", ")]}\',", ")]}\n", ")]}\n\n"):
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
    for ent in _iter_entries(har):
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


# ------------- Main -------------

def main():
    try:
        msg = _read_message() or {}
        options = msg if isinstance(msg, dict) else {}
        # Preferred HAR path order: options.har_path > env > default
        har_path = (
            options.get('har_path')
            or os.environ.get('UPAI_HAR_PATH')
            or r"C:\\Users\\TT\\upwork2\\www.upwork.com.har"
        )

        jobs = _load_jobs_from_har(har_path)
        if not jobs:
            # Return mock data for testing
            jobs = [
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
                },
                {
                    "title": "Mobile App Developer - Flutter",
                    "description": "Seeking Flutter developer for cross-platform mobile app. Features: user auth, payment integration, real-time chat.",
                    "budget": "$8000",
                    "skills": ["Flutter", "Dart", "Firebase", "Mobile Development"],
                    "url": "https://www.upwork.com/jobs/~01234567893"
                },
                {
                    "title": "AI/ML Engineer for Computer Vision Project",
                    "description": "Need ML engineer experienced with computer vision and deep learning. Project involves object detection and image classification.",
                    "budget": "$10000",
                    "skills": ["Python", "TensorFlow", "Computer Vision", "Deep Learning"],
                    "url": "https://www.upwork.com/jobs/~01234567894"
                }
            ]
            # Still write to output with mock data
            _write_message({'ok': True, 'jobs': jobs, 'out_dir': '', 'note': 'Using mock data for testing'})
            return

        _write_message({'ok': True, 'jobs': jobs, 'out_dir': ''})
    except Exception as exc:
        _write_message({'ok': False, 'error': str(exc)})


if __name__ == '__main__':
    main()

