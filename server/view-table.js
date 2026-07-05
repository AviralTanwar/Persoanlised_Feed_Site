const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'db', 'dashboard.db'), { readonly: true });

// node view-table.js --tables          → all tables + their columns
// node view-table.js <table> [--full]  → all rows in that table
const arg   = process.argv[2];
const full  = process.argv.includes('--full');

if (!arg || arg === '--tables') {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  console.log(`\n${'─'.repeat(60)}`);
  for (const t of tables) {
    const cols = db.prepare(`PRAGMA table_info("${t.name}")`).all().map(c => c.name);
    console.log(`\n  ${t.name}`);
    cols.forEach(c => console.log(`    · ${c}`));
  }
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`${tables.length} table(s)`);
  process.exit(0);
}

const table = arg;
const MAX_LEN = 90;
function trim(val) {
  if (val === null) return 'null';
  const s = String(val);
  if (full || s.length <= MAX_LEN) return s;
  return s.slice(0, MAX_LEN) + '...';
}

let rows;
try {
  rows = db.prepare(`SELECT * FROM "${table}"`).all();
} catch {
  console.error(`Table "${table}" not found.`);
  process.exit(1);
}

if (rows.length === 0) {
  console.log('(no rows)');
  process.exit(0);
}

const cols      = Object.keys(rows[0]);
const labelWidth = Math.max(...cols.map(c => c.length));

rows.forEach((row, i) => {
  console.log(`\n#${i + 1} ${'─'.repeat(50)}`);
  for (const c of cols) {
    console.log(`${c.padEnd(labelWidth)} : ${trim(row[c])}`);
  }
});
console.log(`\n${rows.length} row(s)${full ? '' : '  (add --full to see untruncated text)'}`);
