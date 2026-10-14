#!/usr/bin/env python3
"""Push PETFORGE to GitHub (public repo) + enable GitHub Pages, via Git Data API."""
import sys, json, base64, os, subprocess, urllib.request, urllib.error

sys.path.insert(0, '/opt/hatch/skills/skill-creator/bin')
from dynamic_credentials import add_surrogate_to_request, read_json_response

HOSTS = ['api.github.com']
CRED = 'custom.github'
OWNER = 'jorgelmr01'
REPO = 'petforge'
WORK = '/home/hatch/workspace/petforge'


def api(method, path, data=None, retries=4):
    url = 'https://api.github.com' + path
    body = json.dumps(data).encode() if data is not None else None
    last = None
    for attempt in range(retries):
        req = urllib.request.Request(url, data=body, method=method)
        req.add_header('Accept', 'application/vnd.github+json')
        if body:
            req.add_header('Content-Type', 'application/json')
        add_surrogate_to_request(req, CRED, allowed_hosts=HOSTS)
        try:
            resp = urllib.request.urlopen(req, timeout=60)
            return resp.status, read_json_response(resp)
        except urllib.error.HTTPError as e:
            try:
                eb = e.read().decode()
                payload = json.loads(eb) if eb else {}
            except Exception:
                payload = {}
            if 500 <= e.code < 600 and attempt < retries - 1:
                last = e
                import time
                time.sleep(2 * (attempt + 1))
                continue  # transient server error — retry
            return e.code, payload
        except Exception as e:  # transient network failure — retry
            last = e
            import time
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f'api {method} {path} failed after {retries} tries: {last}')


def get_files(base, rel_paths):
    items = []
    for rel in rel_paths:
        full = os.path.join(base, rel)
        with open(full, 'rb') as f:
            items.append((rel, f.read()))
    return items


def push_branch(branch, files, message, parents=None):
    # 1. create blobs
    tree = []
    import time as _time
    for i, (path, content) in enumerate(files):
        b64 = base64.b64encode(content).decode()
        for battempt in range(3):
            s, blob = api('POST', f'/repos/{OWNER}/{REPO}/git/blobs',
                          {'content': b64, 'encoding': 'base64'})
            if s == 201:
                break
            _time.sleep(2 * (battempt + 1))
        assert s == 201, f'blob failed for {path}: {s} {blob}'
        tree.append({'path': path, 'mode': '100644', 'type': 'blob', 'sha': blob['sha']})
        if (i + 1) % 25 == 0:
            print(f'  blobs {i + 1}/{len(files)}', flush=True)
            _time.sleep(1)
    # 2. tree
    s, t = api('POST', f'/repos/{OWNER}/{REPO}/git/trees', {'tree': tree})
    assert s == 201, f'tree failed: {s} {t}'
    # 3. commit
    payload = {'message': message, 'tree': t['sha']}
    if parents:
        payload['parents'] = parents
    s, c = api('POST', f'/repos/{OWNER}/{REPO}/git/commits', payload)
    assert s == 201, f'commit failed: {s} {c}'
    # 4. ref
    s, r = api('POST', f'/repos/{OWNER}/{REPO}/git/refs',
               {'ref': f'refs/heads/{branch}', 'sha': c['sha']})
    if s == 422:  # ref exists — fast-forward it
        s, r = api('PATCH', f'/repos/{OWNER}/{REPO}/git/refs/heads/{branch}',
                   {'sha': c['sha'], 'force': True})
    assert s in (200, 201), f'ref failed: {s} {r}'
    print(f'  branch {branch}: {c["sha"][:7]} ({len(files)} files)', flush=True)


def seed_empty_repo():
    """Contents API works on empty repos; creates the initial commit."""
    s, r = api('PUT', f'/repos/{OWNER}/{REPO}/contents/.seed',
               {'message': 'seed initial commit',
                'content': base64.b64encode(b'petforge').decode()})
    assert s in (200, 201), f'seed failed: {s} {r}'
    sha = r['commit']['sha']
    print('seeded:', sha[:7], flush=True)
    return sha


def main():
    # 0. verify identity
    s, me = api('GET', '/user')
    assert s == 200, f'auth failed: {s} {me}'
    login = me['login']
    print('authenticated as:', login, flush=True)
    assert login.lower() == OWNER, f'unexpected user {login}'

    # 1. create repo (or reuse)
    s, repo = api('POST', '/user/repos', {
        'name': REPO,
        'description': '🥚⚒️ PETFORGE — Raise your critter. Forge its legend. A 2010s-style virtual-pet iPhone game.',
        'private': False,
        'auto_init': False,
    })
    if s == 201:
        print('repo created:', repo['html_url'], flush=True)
    elif s == 422:
        s, repo = api('GET', f'/repos/{OWNER}/{REPO}')
        assert s == 200, f'get repo failed: {s} {repo}'
        print('repo already exists:', repo['html_url'], flush=True)
    else:
        raise SystemExit(f'repo create failed: {s} {repo}')

    # 2. push source -> main (resume-safe: reuse existing main as parent)
    s, ref = api('GET', f'/repos/{OWNER}/{REPO}/git/refs/heads/main')
    if s == 200:
        parent = ref['object']['sha']
        print('resuming: main already at', parent[:7], flush=True)
    else:
        parent = seed_empty_repo()
    out = subprocess.run(['git', 'ls-files'], cwd=WORK, capture_output=True, text=True)
    src_files = get_files(WORK, [p for p in out.stdout.splitlines() if p])
    print(f'pushing {len(src_files)} source files -> main', flush=True)
    push_branch('main', src_files, 'PETFORGE v1.0 — ship-ready iPhone virtual-pet game',
                parents=[parent])

    # 3. push dist -> gh-pages
    dist = os.path.join(WORK, 'app', 'dist')
    rels = []
    for root, _, fns in os.walk(dist):
        for fn in fns:
            rels.append(os.path.relpath(os.path.join(root, fn), dist))
    dist_files = get_files(dist, sorted(rels))
    print(f'pushing {len(dist_files)} built files -> gh-pages', flush=True)
    push_branch('gh-pages', dist_files, 'Deploy PETFORGE web build')

    # 4. default branch -> main
    s, _ = api('PATCH', f'/repos/{OWNER}/{REPO}', {'default_branch': 'main'})
    print('default_branch -> main:', s, flush=True)

    # 5. enable Pages (PUT returns 204 empty on success — tolerate non-JSON)
    s, pg = api('POST', f'/repos/{OWNER}/{REPO}/pages',
                {'source': {'branch': 'gh-pages', 'path': '/'}})
    if s == 409:
        try:
            api('PUT', f'/repos/{OWNER}/{REPO}/pages',
                {'source': {'branch': 'gh-pages', 'path': '/'}})
        except Exception as e:
            print('pages PUT note:', str(e)[:120], flush=True)
    s, pg = api('GET', f'/repos/{OWNER}/{REPO}/pages')
    print('pages enable:', s, flush=True)
    html_url = pg.get('html_url', '') if isinstance(pg, dict) else ''
    print('pages url:', html_url, flush=True)

    # 6. homepage + topics
    api('PATCH', f'/repos/{OWNER}/{REPO}', {'homepage': html_url})
    api('PUT', f'/repos/{OWNER}/{REPO}/topics',
        {'names': ['game', 'virtual-pet', 'pixel-art', 'capacitor', 'ios', 'typescript']})
    print('DONE', flush=True)
    print('REPO_URL=' + repo['html_url'])
    print('PAGES_URL=' + html_url)


if __name__ == '__main__':
    main()
