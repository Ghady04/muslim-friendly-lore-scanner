# Scanner architecture

## Shared contract

The scanner accepts CSV inventories from any extractor that supplies one text column (`source_text`, `text`, `content`, or `string`). Optional file, entry, bundle, and category fields preserve context in the report. It normalizes file separators for proposal matching and writes a candidate CSV plus a JSON coverage summary.

The lexicon is an editable JSON file organized by severity and topic. Named concepts and broad language are leads only. Every candidate requires human context review. Proposal status is informational and never authorizes an automatic edit.

## Game-specific boundary

An adapter must be developed and validated for each game/version. It needs to identify supported builds, extract text without losing identifiers or control codes, round-trip data safely, and validate its output. Visuals, audio, animations, and scripts need separate capability-specific tooling. The shared scanner does not infer a safe binary patch format.

Unknown games begin in read-only reconnaissance. An adapter should declare maturity (`recon`, `read`, `preview`, `installable`, `verified`) and supported build IDs. “Verified” requires an actual in-game check, not just successful parsing.

## Safety and privacy

The tool reads only paths explicitly passed as inventory inputs (or the legacy local DSR defaults when run without paths) and writes only its report directory. The public release uses an allowlist `.gitignore`; do not add game archives, extracted inventories, saves, binaries, loader files, or generated reports to source control. No network access or telemetry is used by the scanner.

## Known technical limits

- English lexical matching only; no morphology beyond explicit terms and no semantic model.
- CSV only; archive extraction and other formats belong to adapters.
- The simple CSV reader handles quoted fields and embedded line breaks but does not provide spreadsheet-specific dialect detection.
- Contextual matches remain imperfect; short names may be ambiguous.
- No patch writer, installer, automatic rewriter, or ban-safety mechanism is included.
