import Database from 'better-sqlite3';
const db = new Database('./data/screenage.db');
const cols = db.prepare("PRAGMA table_info(articles)").all();
console.log('Columns:', cols.map(c => c.name).join(', '));
const sample = db.prepare("SELECT * FROM articles LIMIT 1").get();
if (sample) console.log('Sample keys:', Object.keys(sample));
db.close();
