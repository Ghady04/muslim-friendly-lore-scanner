import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scannerDir = path.dirname(fileURLToPath(import.meta.url));
const lexicon = JSON.parse(fs.readFileSync(path.join(scannerDir, 'sensitivity_lexicon.json'), 'utf8'));

function usage() {
  return `Muslim-Friendly Lore Scanner — text candidate review\n\n` +
    `Usage:\n  node scanner/index.js [options] <inventory.csv> [inventory2.csv ...]\n\n` +
    `Options:\n  --out <directory>       Report output directory (default: candidate-review)\n` +
    `  --proposals <file.csv>  Optional CSV with proposed_text/status/rationale fields\n` +
    `  --help                  Show this help\n\n` +
    `Input CSV needs one text column: source_text, text, content, or string.\n` +
    `Recognized optional columns include file, source_file, entry_id, id, bundle_id, and category.\n`;
}

function parseArgs(argv) {
  const inputs = [];
  let outDir;
  let proposalsPath;
  let help = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') help = true;
    else if (arg === '--out' || arg === '-o') {
      if (!argv[i + 1]) throw new Error(`${arg} requires a directory path.`);
      outDir = argv[++i];
    } else if (arg === '--proposals') {
      if (!argv[i + 1]) throw new Error('--proposals requires a CSV path.');
      proposalsPath = argv[++i];
    } else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    else inputs.push(arg);
  }
  return { inputs, outDir, proposalsPath, help };
}

function parseCsv(input, label) {
  const source = input.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let justClosedQuote = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (c === '"' && source[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { quoted = false; justClosedQuote = true; }
      else field += c;
    } else if (justClosedQuote) {
      if (c === ',') { row.push(field); field = ''; justClosedQuote = false; }
      else if (c === '\n' || c === '\r') {
        row.push(field); field = ''; justClosedQuote = false;
        if (c === '\r' && source[i + 1] === '\n') i++;
        if (row.some(value => value !== '')) rows.push(row);
        row = [];
      } else if (c !== ' ' && c !== '\t') throw new Error(`Unexpected character after a quoted CSV field in ${label}, offset ${i}.`);
    } else if (c === '"') {
      if (field.length) throw new Error(`Unexpected quote inside an unquoted CSV field in ${label}, offset ${i}.`);
      quoted = true;
    } else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      row.push(field); field = '';
      if (c === '\r' && source[i + 1] === '\n') i++;
      if (row.some(value => value !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  if (quoted) throw new Error(`Unclosed quoted CSV field in ${label}.`);
  if (justClosedQuote || field.length || row.length) {
    row.push(field);
    if (row.some(value => value !== '')) rows.push(row);
  }
  const headers = (rows.shift() || []).map((header, index) => (index === 0 ? header.replace(/^\uFEFF/, '') : header).trim());
  if (!headers.length) throw new Error(`CSV has no header row: ${label}`);
  return rows.map((values, lineIndex) => {
    if (values.length > headers.length) throw new Error(`CSV row ${lineIndex + 2} has more fields than its header in ${label}.`);
    return Object.fromEntries(headers.map((header, i) => [header, values[i] ?? '']));
  });
}

function toCsvCell(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function portableBasename(value) {
  return String(value || '').replaceAll('\\', '/').split('/').filter(Boolean).at(-1)?.toLowerCase() || '';
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
}

const rules = [
  ['high', 'explicit_deity_or_worship', /\b(gods?|goddess(?:es)?|deit(?:y|ies)|worship(?:s|ed|ping)?|prayers?|pray(?:s|ed|ing)?|blasphem(?:y|ies)|godhood|allah|qur['']?an|muhammad|mohammed|isa|musa|ibrahim|nuh|jesus|moses|abraham)\b/gi, null],
  ['medium', 'religious_language_or_practice', /\b(divine|divinity|holy|holiness|sacred|bless(?:ing|ed|es)?|miracle(?:s)?|faith|grace|prophet(?:s)?|messenger(?:s)?|scripture(?:s)?|revelation(?:s)?|religion(?:s)?|religious|temple|altar|shrine|priest(?:s|ess(?:es)?)?|clergy|saint(?:s)?|monk(?:s)?|cleric(?:s)?|pilgrim(?:s|age)?|ritual(?:s)?|sacrament(?:s)?|covenant|relic(?:s)?|salvation|sins?|theolog(?:y|ical))\b/gi, null],
  ['low', 'mythic_being_or_afterlife', /\b(angel(?:s|ic)?|demon(?:s|ic)?|spirit(?:s)?|soul(?:s)?|heaven(?:s|ly)?|hell(?:ish)?|afterlife|immortal(?:s|ity)?|creator|creation|prophe(?:t|cy|cies)|mytholog(?:y|ical)|legend(?:s|ary)?|ancient|eternal|blessed|miraculous|faithful|lord(?:s)?|divine|grace)\b/gi, null],
];

for (const group of lexicon.groups || []) {
  const alternatives = [...new Set(group.terms || [])].sort((a, b) => b.length - a.length).map(escapeRegex).join('|');
  if (alternatives) rules.push([group.severity, group.category, new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives})(?![\\p{L}\\p{N}])`, 'giu'), null]);
  for (const item of group.contextual_terms || []) {
    const name = escapeRegex(item.term);
    const context = new RegExp(`(?<![\\p{L}\\p{N}])(?:${item.context.map(escapeRegex).join('|')})(?![\\p{L}\\p{N}])`, 'iu');
    rules.push([group.severity, group.category, new RegExp(`(?<![\\p{L}\\p{N}])${name}(?![\\p{L}\\p{N}])`, 'giu'), { context, radius: item.radius || 120 }]);
  }
}

function collectMatches(text) {
  const found = [];
  for (const [severity, category, expression, filter] of rules) {
    expression.lastIndex = 0;
    for (const match of text.matchAll(expression)) {
      if (filter) {
        const start = Math.max(0, match.index - filter.radius);
        const end = Math.min(text.length, match.index + match[0].length + filter.radius);
        filter.context.lastIndex = 0;
        if (!filter.context.test(text.slice(start, end))) continue;
      }
      found.push({ severity, category, term: match[0], index: match.index });
    }
  }
  return found;
}

function scan(inventories, proposalRows) {
  const proposals = new Map();
  for (const row of proposalRows) {
    const key = `${portableBasename(row.file)}|${row.entry_id}`;
    const list = proposals.get(key) || [];
    list.push(row);
    proposals.set(key, list);
  }
  const findings = [];
  const coverage = [];
  for (const { label, rows, textField } of inventories) {
    let matched = 0;
    for (const row of rows) {
      const sourceText = row[textField] || '';
      const matches = collectMatches(sourceText);
      if (!matches.length) continue;
      matched++;
      const file = portableBasename(row.file || row.source_file || label);
      const id = row.entry_id || row.id || '';
      const proposed = proposals.get(`${file}|${id}`) || [];
      const severity = matches.some(match => match.severity === 'high') ? 'high'
        : matches.some(match => match.severity === 'medium') ? 'medium' : 'low';
      const states = proposed.map(item => item.status).filter(Boolean);
      const review = states.includes('planned') ? 'planned'
        : states.includes('reviewed_no_change') ? 'reviewed_no_change' : 'unreviewed';
      findings.push({
        severity,
        input: label,
        file,
        entry_id: id,
        bundle_id: row.bundle_id || '',
        category: row.category || '',
        matched_concepts: [...new Set(matches.map(match => `${match.category}:${match.term}`))].join('; '),
        source_text: sourceText,
        proposed_text: proposed.map(item => item.proposed_text).filter(Boolean).join(' || '),
        proposal_status: states.join(' || '),
        rationale: proposed.map(item => item.rationale).filter(Boolean).join(' || '),
        review,
      });
    }
    coverage.push({ inventory: label, scanned_entries: rows.length, candidate_entries: matched });
  }
  const severityRank = { high: 0, medium: 1, low: 2 };
  findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]
    || a.input.localeCompare(b.input) || a.file.localeCompare(b.file)
    || Number(a.entry_id) - Number(b.entry_id));
  return { findings, coverage };
}

function loadInventory(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Inventory not found: ${filePath}`);
  const rows = parseCsv(fs.readFileSync(filePath, 'utf8'), path.basename(filePath));
  const first = rows[0] || {};
  const textField = ['source_text', 'text', 'content', 'string'].find(key => Object.hasOwn(first, key));
  if (!textField) throw new Error(`No recognized text column in ${filePath}. Expected source_text, text, content, or string.`);
  return { label: path.basename(filePath), rows, textField };
}

const args = parseArgs(process.argv.slice(2));
if (args.help) { console.log(usage()); process.exit(0); }
const inputPaths = args.inputs.map(value => path.resolve(process.cwd(), value));
if (!inputPaths.length) throw new Error(`No inventories supplied and no local default inventories exist.\n\n${usage()}`);

let proposals = [];
if (args.proposalsPath) {
  const proposalsFile = path.resolve(process.cwd(), args.proposalsPath);
  if (!fs.existsSync(proposalsFile)) throw new Error(`Proposal CSV not found: ${proposalsFile}`);
  proposals = parseCsv(fs.readFileSync(proposalsFile, 'utf8'), path.basename(proposalsFile));
}

const inventories = inputPaths.map(loadInventory);
const { findings, coverage } = scan(inventories, proposals);
const outputDir = path.resolve(process.cwd(), args.outDir || 'candidate-review');
fs.mkdirSync(outputDir, { recursive: true });
const columns = ['severity', 'input', 'file', 'entry_id', 'bundle_id', 'category', 'matched_concepts', 'source_text', 'proposed_text', 'proposal_status', 'rationale', 'review'];
const csv = [columns.join(','), ...findings.map(row => columns.map(key => toCsvCell(row[key])).join(','))].join('\r\n') + '\r\n';
const csvPath = path.join(outputDir, 'candidate-review.csv');
const summaryPath = path.join(outputDir, 'scan-summary.json');
fs.writeFileSync(csvPath, csv, 'utf8');
const uniqueTerms = new Set((lexicon.groups || []).flatMap(group => [
  ...(group.terms || []), ...(group.contextual_terms || []).map(item => item.term),
]));
const summary = {
  scanner: 'Muslim-Friendly Lore Scanner',
  version: '0.1.0',
  lexicon_version: lexicon.version,
  lexicon_groups: (lexicon.groups || []).length,
  lexicon_unique_terms: uniqueTerms.size,
  generated_at: new Date().toISOString(),
  scope: 'English lexical review leads from user-supplied extracted text inventories. This tool does not extract arbitrary game formats or inspect unprovided scripts, audio, images, video, models, animations, or other languages. Matches are not religious rulings and a clean scan is not proof of completeness.',
  coverage,
  candidate_rows: findings.length,
  by_severity: Object.fromEntries(['high', 'medium', 'low'].map(severity => [severity, findings.filter(row => row.severity === severity).length])),
  output: path.relative(process.cwd(), csvPath).replaceAll('\\', '/') || path.basename(csvPath),
};
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ...summary, summary_file: path.relative(process.cwd(), summaryPath).replaceAll('\\', '/') || path.basename(summaryPath) }, null, 2));\n