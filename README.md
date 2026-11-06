# Muslim-Friendly Lore Scanner

**Find potentially sensitive lore in extracted game text, review it with context, and keep a human in control of every decision.**

This is the first reusable component of a longer modding initiative. It is a text review tool, not an automatic game-file editor or universal game mod. It scans CSV inventories produced by a game-specific extractor, flags candidate wording, and writes a review report. It never edits the source CSV or the game.

> **Status:** early prototype, English text only. It has no built-in extractor or validated game adapters. A match is a prompt for human review; a clean scan cannot prove that a game contains no relevant material.

## What it does

- Searches extracted text against a broad, categorized English vocabulary of religious language, practices, and mythological names.
- Reports the matched concept, source file and entry identifiers, original line, and optional proposed replacement.
- Accepts inventories from different games through a shared CSV contract.
- Writes a CSV review queue and JSON coverage summary without changing input files.

## What it does not do

- Read arbitrary game archives, executable files, dialogue systems, textures, animations, audio, or video.
- Automatically decide whether a line is religiously unsuitable or safe. Context and personal boundaries matter; the project does not issue religious rulings.
- Automatically rewrite text, create an installable mod, or support every game. Each title needs a lawful, technically validated extractor and adapter.
- Guarantee a complete scan, a “shirk-free” experience, or protection from bans/account action.

## Quick start

Install a supported [Node.js LTS](https://nodejs.org/en/about/previous-releases) release (Node 22 or newer), download or clone this repository, then open PowerShell or a terminal in the repository folder.

```powershell
node .\scanner\index.js .\examples\sample-inventory.csv --out .\.work\sample-report
```

The report appears in `.work/sample-report/`:

- `candidate-review.csv` — one row per inventory entry that matched one or more terms.
- `scan-summary.json` — input counts, lexicon version, match counts, and scope statement.

For help:

```powershell
node .\scanner\index.js --help
```

## Inventory CSV format

Provide a CSV with a header and one text column named `source_text`, `text`, `content`, or `string`. Identifiers are optional but improve traceability.

```csv
source_file,entry_id,bundle_id,category,source_text
dialogue.csv,42,main,character,"The ancient being watched from the tower."
```

You can supply multiple inventories in one run:

```powershell
node .\scanner\index.js .\exports\items.csv .\exports\dialogue.csv --out .\.work\review
```

Optional `--proposals <file.csv>` joins proposed text to matching rows. The proposal CSV should include `file`, `entry_id`, `proposed_text`, and may include `status` and `rationale`. This is display-only; proposals are not applied.

## How to review findings

The vocabulary intentionally includes broad terms such as *grace*, *faith*, *lord*, and *spirit*, plus named figures and concepts from multiple traditions. Many matches will be ordinary words, fictional names, or mechanics. Start with the full sentence and surrounding story context; do not bulk-replace by keyword. Add missed spellings through a reviewed lexicon change. The severity is a triage aid, not a judgment.

The current vocabulary is a growing English list, not “all myths.” Traditions contain many local beings, epithets, transliterations, and overlapping names. The scanner does not cover other languages unless the user supplies translated text and adds suitable vocabulary. We welcome carefully sourced additions and false-positive reports.

## Making it work with another game

The shared scanner can process text inventories from any title if an extractor converts that game’s text into the CSV format above. Extraction is game-specific: containers, encoding, text IDs, formatting codes, and license/modding permissions vary. Unknown games should begin with read-only inspection. A new title is not supported for patching just because its extracted text can be scanned.

Before building an adapter, check the game’s current official terms and developer policy. Use only files you are authorized to inspect, do not distribute proprietary game data, and do not bypass DRM, anti-cheat, ownership checks, or access controls. If the official policy does not authorize the planned modification, keep the workflow at analysis/review or do not proceed.

### Dark Souls Remastered note

This public repository contains **no DSR game assets, extracted game text, save data, loader, or ready-to-install DSR mod**. The Steam [Dark Souls Remastered EULA](https://store.steampowered.com/eula/570940_eula_0) includes restrictions on reverse engineering, modifying, and creating derivative works. Accordingly, this repository does not represent DSR mod distribution or installation as authorized by the publisher. Review the current official terms before any game-specific work. Offline play is not a guarantee against account or policy consequences, and we make no ban-safety promise.

## Responsible use and online safety

No mod can be promised “ban-proof.” Anti-cheat and publisher policies differ by game, build, mode, and update; offline mode does not automatically make an otherwise prohibited modification permitted. Never use this project to evade or disable protections. Do not load modified files in online or protected multiplayer. For a game whose rules or supported mod route are unclear, do not install a mod; ask the publisher or stay with read-only text analysis. Back up saves before any authorized offline testing, but do not use save manipulation to evade enforcement.

## Project documents

- [Architecture and adapter boundaries](docs/ARCHITECTURE.md)
- [DSR audit scope and limitations](docs/DSR_AUDIT_STATUS.md)
- [Contributing guide](CONTRIBUTING.md)
- [Change log](CHANGELOG.md)

## License

Original scanner code and documentation are released under the MIT License. The vocabulary is a project-authored candidate list; see the repository license and contribution notes. This license does not grant rights to any game, publisher, or third-party assets.
