import json
import pathlib
import argparse
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent


def package(source, target):
    assert not any((source / file).exists() for file in ('src/main.ts', 'src/backend.ts')), 'TypeScript plugin must be built first; run npm run build and package .build output'
    assert source.resolve() not in target.resolve().parents, 'Output archive must be outside the plugin directory'
    manifest = json.loads((source / 'plugin.json').read_text(encoding='utf-8'))
    assert (source / manifest['main']).is_file()
    if manifest.get('icon'):
        assert (source / manifest['icon']).is_file()
    target.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(source.rglob('*')):
            assert not file.is_symlink()
            if file.is_file():
                assert file.stat().st_size <= 10 * 1024 * 1024
                info = zipfile.ZipInfo(file.relative_to(source).as_posix(), date_time=(2026, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o100644 << 16
                archive.writestr(info, file.read_bytes())
    print(f"Packaged {manifest['id']} {manifest['version']}: {target.name}")


parser = argparse.ArgumentParser(description='Package built Nexlet plugins')
parser.add_argument('tag', nargs='?')
parser.add_argument('--source-root', default='plugins', help='Directory of catalog plugins, relative to the repository')
parser.add_argument('--plugin-dir', help='Package one built plugin without adding it to the marketplace index')
parser.add_argument('--output', help='Output .nexlet file for --plugin-dir')
parser.add_argument('--index', default='index.json', help='Catalog index to package; CI uses the unpublished candidate index')
args = parser.parse_args()
if args.plugin_dir:
    if not args.output or args.tag:
        parser.error('--plugin-dir requires --output and cannot be combined with a release tag')
    assert args.output.endswith('.nexlet'), 'Output must end with .nexlet'
    package(ROOT / args.plugin_dir, ROOT / args.output)
else:
    if args.output:
        parser.error('--output requires --plugin-dir')
    index = json.loads((ROOT / args.index).read_text(encoding='utf-8'))
    assert index['schemaVersion'] == 1
    if args.tag:
        # Unchanged plugins may keep their existing, published download URLs.
        assert any('/' + args.tag + '/' in e['download'] for e in index['plugins']), 'Release tag must match at least one index download URL'
    seen = set()
    for entry in index['plugins']:
        assert entry['id'] not in seen, 'Duplicate plugin ID'
        seen.add(entry['id'])
        candidates = [p for p in (ROOT / args.source_root).glob('*/plugin.json') if json.loads(p.read_text(encoding='utf-8'))['id'] == entry['id']]
        assert len(candidates) == 1, 'Missing or ambiguous plugin source'
        manifest = json.loads(candidates[0].read_text(encoding='utf-8'))
        assert manifest['version'] == entry['version']
        asset = entry['download'].rsplit('/', 1)[1]
        assert asset.endswith('.nexlet') and '/' not in asset
        package(candidates[0].parent, ROOT / 'dist' / asset)
