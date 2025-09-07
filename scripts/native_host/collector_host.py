# Native Messaging host for Upwork AI Assistant
# Reads JSON messages from stdin (Chrome Native Messaging), runs the collector,
# returns { ok: true, jobs: [...], out_dir: <path> }

import sys
import json
import struct
import subprocess
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]  # project root
PYTHON = sys.executable  # current python
COLLECT_SCRIPT = ROOT / 'scripts' / 'collect_upwork_data.py'


def send_message(msg):
    encoded = json.dumps(msg).encode('utf-8')
    sys.stdout.write(struct.pack('I', len(encoded)).decode('latin1'))
    sys.stdout.write(encoded.decode('utf-8'))
    sys.stdout.flush()


def get_message():
    raw_length = sys.stdin.buffer.read(4)
    if len(raw_length) == 0:
        sys.exit(0)
    message_length = struct.unpack('I', raw_length)[0]
    message = sys.stdin.buffer.read(message_length).decode('utf-8')
    return json.loads(message)


def run_collector(options):
    out_dir = options.get('out') or str(ROOT / 'scripts' / 'data' / 'session-native')
    args = [PYTHON, str(COLLECT_SCRIPT), '--mode', options.get('mode', 'attach'), '--list-scroll', str(options.get('list_scroll', 3)), '--details', str(options.get('details', 5)), '--out', out_dir, '--headless', 'false', '--no-pause']
    try:
        subprocess.run(args, check=True)
    except subprocess.CalledProcessError as e:
        return { 'ok': False, 'error': f'collector failed: {e}' }

    jobs_path = Path(out_dir) / 'jobs-extracted.json'
    jobs = []
    if jobs_path.exists():
        try:
            jobs = json.loads(jobs_path.read_text(encoding='utf-8'))
        except Exception as e:
            return { 'ok': False, 'error': f'parse jobs error: {e}', 'out_dir': out_dir }
    return { 'ok': True, 'jobs': jobs, 'out_dir': out_dir }


def main():
    while True:
        msg = get_message()
        action = msg.get('action') or 'collect'
        if action == 'collect':
            send_message(run_collector(msg))
        else:
            send_message({ 'ok': False, 'error': 'unknown action' })

if __name__ == '__main__':
    main()

