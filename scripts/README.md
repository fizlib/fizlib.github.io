# Build Scripts

This directory contains build and maintenance scripts for the exercise library.

## update-manifest.js

Automatically sorts exercises by modification date (newest first) in the manifest.

### Usage

```bash
npm run update-manifest
# or
npm run sort-exercises
# or
node scripts/update-manifest.js
```

### What it does

1. Scans all `.json` files in `data/exercises/`
2. Reads their file modification timestamps
3. Sorts them by modification date (newest first)
4. Updates `data/manifest.json` with the sorted order

### When to run

Run this script whenever you:
- Add new exercise files
- Modify existing exercise files
- Want the newest exercises to appear first in the exercise window

### How it works

The exercise window in `index.html` loads exercises in the order specified in `data/manifest.json`. This script ensures that manifest is always sorted by file modification time, so the most recently updated exercises appear at the top of the list.

### Example output

```
Updating manifest.json with exercises sorted by modification date...

✓ Updated manifest.json with 33 exercises
  (sorted by modification date, newest first)

Exercises sorted by modification date (newest first):
──────────────────────────────────────────────────────────────────────

2025-11-26:
  - ex_vbe2025_2_13.json
  - ex_vbe2025_2_12.json
  - ex_vbe2025_2_11.json
  ...
```
