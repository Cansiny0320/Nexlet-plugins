# Batch rename

Requires Nexlet 0.2.47+. Find/replace, add prefixes/suffixes and numbering, or use a `{name}-{n}{ext}` template. Preview before execution. Files stay in their original folders.

Execution rechecks file identity, contents and target collisions. Journals are stored in plugin data. Recover original names after cancellation/partial failure, or undo a completed operation. Recovery stops if files were changed externally or original names are occupied. Journals remain available when the plugin is reopened.

The UI accepts up to 100 regular files, 256 MiB each and 1 GiB total. Folders and symbolic links are unsupported. Safe moves require filesystem hard-link support; unsupported volumes report errors. Avoid external edits during the operation. No network permission is requested.
