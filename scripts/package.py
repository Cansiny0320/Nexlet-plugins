import json
import pathlib
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
index = json.loads((ROOT / 'index.json').read_text(encoding='utf-8'))
assert index['schemaVersion'] == 1
dist = ROOT / 'dist'
dist.mkdir(exist_ok=True)
seen = set()
for entry in index['plugins']:
    assert entry['id'] not in seen, 'Duplicate plugin ID'
    seen.add(entry['id'])
    candidates = [p for p in (ROOT / 'plugins').glob('*/plugin.json') if json.loads(p.read_text(encoding='utf-8'))['id'] == entry['id']]
    assert len(candidates) == 1, 'Missing or ambiguous plugin source'
    source = candidates[0].parent
    manifest = json.loads(candidates[0].read_text(encoding='utf-8'))
    assert manifest['version'] == entry['version']
    assert (source / manifest['main']).is_file()
    assert (source / manifest['icon']).is_file()
    asset = entry['download'].rsplit('/', 1)[1]
    assert asset.endswith('.nexlet') and '/' not in asset
    with zipfile.ZipFile(dist / asset, 'w', zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(source.rglob('*')):
            assert not file.is_symlink()
            if file.is_file():
                assert file.stat().st_size <= 10 * 1024 * 1024
                info = zipfile.ZipInfo(file.relative_to(source).as_posix(), date_time=(2026, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o100644 << 16
                archive.writestr(info, file.read_bytes())
    print(f"Packaged {entry['id']} {entry['version']}: {asset}")

if len(sys.argv) > 1:
    tag = sys.argv[1]
    # Unchanged plugins may keep their existing, published download URLs.
    assert any('/' + tag + '/' in e['download'] for e in index['plugins']), 'Release tag must match at least one index download URL'
