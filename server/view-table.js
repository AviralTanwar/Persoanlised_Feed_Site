const Database = require('better-sqlite3');
const path = require('path');

const table = process.argv[2];
const full  = process.argv.includes('--full');
if (!table) {
  console.log('Usage: node view-table.js <table_name> [--full]');
  process.exit(1);
}

const MAX_LEN = 90;
function trim(val) {
  if (val === null) return 'null';
  const s = String(val);
  if (full || s.length <= MAX_LEN) return s;
  return s.slice(0, MAX_LEN) + '...';
}

const db = new Database(path.join(__dirname, 'db', 'dashboard.db'), { readonly: true });
const rows = db.prepare(`SELECT * FROM "${table}"`).all();

if (rows.length === 0) {
  console.log('(no rows)');
  process.exit(0);
}

const cols = Object.keys(rows[0]);
const labelWidth = Math.max(...cols.map(c => c.length));

rows.forEach((row, i) => {
  console.log(`\n#${i + 1} ${'─'.repeat(50)}`);
  for (const c of cols) {
    console.log(`${c.padEnd(labelWidth)} : ${trim(row[c])}`);
  }
});
console.log(`\n${rows.length} row(s)${full ? '' : '  (run with --full to see untruncated text)'}`);
