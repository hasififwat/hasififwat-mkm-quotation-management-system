import io
import json
import os
from pathlib import Path
import secrets
import shutil
import sys
import socket
import subprocess
import tarfile
import time
import urllib.request

root = Path(__file__).resolve().parents[2]
run_dir = Path(os.environ['REVISION_UI_RUN_DIR']).resolve()
if '.next' in run_dir.parts:
    raise SystemExit('REVISION_UI_RUN_DIR must be outside .next')
backend_port = int(os.environ.get('REVISION_UI_BACKEND_PORT', '13865'))
site_port = backend_port + 1
source_dir = run_dir / 'source'
binary = Path(os.environ['FAMILY_BACKEND_BINARY'])
backend_url = f'http://127.0.0.1:{backend_port}'
site_url = f'http://127.0.0.1:{site_port}'

if (run_dir / 'run.json').exists():
    raise SystemExit('A run already exists. Inspect its ownership before preparing another.')

for port in (backend_port, site_port):
    with socket.socket() as probe:
        if probe.connect_ex(('127.0.0.1', port)) == 0:
            raise SystemExit('Verification port is already occupied: ' + str(port))

source_dir.mkdir(parents=True)
commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
archive_bytes = subprocess.check_output(['git', 'archive', commit, 'convex', 'src', 'scripts', 'public', 'package.json', 'tsconfig.json', 'next.config.ts', 'postcss.config.mjs', 'convex.json', 'constants.ts', 'types.ts', 'utils.ts'], cwd=root)
with tarfile.open(fileobj=io.BytesIO(archive_bytes)) as archive:
    archive.extractall(source_dir)
if sys.platform == 'darwin':
    subprocess.run(['cp', '-cR', str(root / 'node_modules'), str(source_dir / 'node_modules')], check=True)
else:
    shutil.copytree(root / 'node_modules', source_dir / 'node_modules', symlinks=True)
instance_name = 'mkm-issue59-verification'
instance_secret = secrets.token_hex(32)
admin_key = subprocess.check_output([str(binary), 'keygen', 'admin-key', '--instance-name', instance_name, '--instance-secret', instance_secret], text=True).strip()
env_text = '\n'.join([
    'CONVEX_SELF_HOSTED_URL=' + backend_url,
    'CONVEX_SELF_HOSTED_ADMIN_KEY=' + admin_key,
    'NEXT_PUBLIC_CONVEX_URL=' + backend_url,
    'NEXT_PUBLIC_CONVEX_SITE_URL=' + site_url,
    'CONVEX_URL=' + backend_url,
    '',
])
env_file = source_dir / '.env.local'
env_file.write_text(env_text)
env_file.chmod(0o600)
auth_file = run_dir / 'fixture-account.json'
auth_file.write_text(json.dumps({'email': 'revision-verification@example.test', 'password': secrets.token_urlsafe(24)}))
auth_file.chmod(0o600)
log = (run_dir / 'backend.log').open('w')
process = subprocess.Popen([str(binary), '--interface', '127.0.0.1', '--port', str(backend_port), '--site-proxy-port', str(site_port), '--instance-name', instance_name, '--instance-secret', instance_secret, '--disable-beacon', '--local-storage', str(run_dir / 'storage'), str(run_dir / 'backend.sqlite3')], cwd=run_dir, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
manifest = {'pid': process.pid, 'owner': 'quotation-revisions-59', 'sourceCommit': commit, 'sourceDir': str(source_dir), 'url': backend_url, 'siteUrl': site_url, 'fixtureAccountPath': str(auth_file), 'binary': str(binary), 'backendIsolation': 'Disposable local SQLite backend. No shared deployment configuration copied.'}
(run_dir / 'run.json').write_text(json.dumps(manifest, indent=2))
for attempt in range(30):
    if process.poll() is not None:
        raise SystemExit('Owned local backend exited. Inspect backend.log.')
    try:
        with urllib.request.urlopen(backend_url + '/version', timeout=1) as response:
            if response.status == 200:
                print(json.dumps(manifest, indent=2))
                break
    except Exception:
        time.sleep(0.2)
else:
    raise SystemExit('Owned local backend did not become ready.')
