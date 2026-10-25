# PDF tools

Requires Nexlet 0.2.47+. Merge, split, extract/reorder and rotate PDFs; convert images to PDF or PDF pages to PNG. Pass files or images from the launcher, or add files in the plugin.

Page selection accepts `1-3,5,2` and descending ranges; blank means all pages. Rotation preserves unselected pages. Split and render operate on the first PDF. Images are converted to PNG before embedding.

Limits: 16 MiB per file, 1000 PDF pages, 100 rendered pages per job and 36 million pixels per page. Existing files are never overwritten. Split/render create a new folder. Cancellation retains completed output and shows its paths. Encrypted, damaged and oversized files report errors. Digital signatures and PDF forms are not guaranteed to survive.

Processing is local, with no network permission. Bundles include pdf-lib (MIT) and PDF.js (Apache-2.0) licenses.
