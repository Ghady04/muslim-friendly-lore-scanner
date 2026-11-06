# Contributing

Contributions should improve the scanner while preserving its review-first design.

## Useful contributions

- Report false positives and missed English terms with a short, non-copyrighted example.
- Add alternative spellings or transliterations to the appropriate lexicon category.
- Improve CSV handling and documentation.
- Propose adapter contracts without including proprietary game data or claiming unsupported titles are safe to modify.

## Lexicon changes

For each term, identify its category and explain ambiguity. Prefer a contextual term rule for common words or short names. Use public references for factual cultural/name claims. Do not label a term as prohibited or permissible for all Muslims; the tool is not a religious authority.

## Safety and data

Do not submit copyrighted game text, extracted inventories, game assets, saves, executables, loaders, credentials, or private user paths. Keep examples fictional. Do not add DRM/anti-cheat bypasses, online play instructions for modified files, or claims that a mod cannot cause account action.

## Before opening a change

Run the scanner against the fictional example and confirm it writes only to the chosen output directory. Include the command and observed result in your change description. Review generated files before committing; reports can contain source text supplied by the operator.
