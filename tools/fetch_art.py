#!/usr/bin/env python3
"""Fetch the period art and music listed in docs/art_manifest.json from Wikimedia Commons, and write the credits.

Each manifest entry names a Commons file and where it goes:
  {"use": "portrait" | "event" | "music", "id": "<advisor or event id>", "title": "File:..."}
Images are fetched as Commons thumbnails (portraits 360px wide, event pictures 640px wide), audio as the original file.
Only files whose Commons licence is public domain, CC0 or CC BY / CC BY-SA are accepted; the licence, author and source
page of each go into credits_images.txt / credits_music.txt. Run it again to fetch anything that is missing.

usage: python3 tools/fetch_art.py [--dry-run]
"""
import json, os, re, socket, sys, time, html, urllib.parse, urllib.request

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'out', 'html')
API = 'https://commons.wikimedia.org/w/api.php'
UA = {'User-Agent': 'RedOctoberGame/0.1 (https://github.com/evarnimtb-netizen/red-october; fetching credited public-domain art)'}
WIDTH = {'portrait': 360, 'event': 640}
DIRS = {'portrait': 'img/portraits', 'event': 'img/events', 'music': 'music'}
OK_LICENCES = re.compile(r'^(public domain|pd\b|cc0|cc by(-sa)? [0-9.]+|no restrictions)', re.I)
socket.setdefaulttimeout(30)


def clean(s):
    return html.unescape(re.sub(r'<[^>]+>', '', s or '')).strip()


def info(title, width=None):
    params = {'action': 'query', 'titles': title, 'prop': 'imageinfo', 'iiprop': 'url|size|extmetadata|mime', 'format': 'json'}
    if width:
        params['iiurlwidth'] = width
    with urllib.request.urlopen(urllib.request.Request(API + '?' + urllib.parse.urlencode(params), headers=UA)) as r:
        page = list(json.load(r)['query']['pages'].values())[0]
    ii = page['imageinfo'][0]
    m = ii.get('extmetadata', {})
    return {'url': ii.get('thumburl') or ii['url'], 'mime': ii.get('mime', ''),
            'license': clean(m.get('LicenseShortName', {}).get('value')),
            'artist': clean(m.get('Artist', {}).get('value')) or 'Unknown author',
            'date': clean(m.get('DateTimeOriginal', {}).get('value'))[:40],
            'page': 'https://commons.wikimedia.org/wiki/' + urllib.parse.quote(title.replace(' ', '_'))}


def ext_for(entry, meta):
    if entry['use'] == 'music':
        return os.path.splitext(meta['url'])[1].lower() or '.ogg'
    return '.png' if meta['url'].lower().endswith('.png') else '.jpg'


def main():
    dry = '--dry-run' in sys.argv
    manifest = json.load(open(os.path.join(ROOT, 'docs', 'art_manifest.json'), encoding='utf-8'))
    credits = {'image': [], 'music': []}
    placed = {}
    for e in manifest:
        meta = info(e['title'], WIDTH.get(e['use']))
        if not OK_LICENCES.match(meta['license']):
            print('SKIP (licence %r): %s' % (meta['license'], e['title']))
            continue
        rel = '%s/%s%s' % (DIRS[e['use']], e['id'], ext_for(e, meta))
        dest = os.path.join(OUT, rel)
        if not os.path.exists(dest) and not dry:
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with urllib.request.urlopen(urllib.request.Request(meta['url'], headers=UA)) as r, open(dest, 'wb') as f:
                f.write(r.read())
            time.sleep(0.5)
        placed['%s:%s' % (e['use'], e['id'])] = rel
        line = '%s: %s. %s%s. Wikimedia Commons, %s. %s' % (
            rel, meta['artist'][:120], e['title'][5:], (', ' + meta['date']) if meta['date'] else '', meta['page'], meta['license'])
        credits['music' if e['use'] == 'music' else 'image'].append(line)
        print('ok   %-40s %s' % (rel, meta['license']))
    if dry:
        return
    head = '= Images\n\nPeriod photographs and posters, from Wikimedia Commons. Each line: file in out/html, author, title, date, source, licence.\n\n'
    open(os.path.join(ROOT, 'credits_images.txt'), 'w', encoding='utf-8').write(head + '\n\n'.join(credits['image']) + '\n')
    head = 'Music credits (recordings from Wikimedia Commons):\n\n'
    open(os.path.join(ROOT, 'credits_music.txt'), 'w', encoding='utf-8').write(head + '\n\n'.join(credits['music']) + '\n')
    json.dump(placed, open(os.path.join(ROOT, 'docs', 'art_placed.json'), 'w'), indent=1, sort_keys=True)
    print('%d files placed; credits written' % len(placed))


main()
