import {db} from './coach';
db.exec('DELETE FROM documents_fts;');
const rows=db.query('SELECT * FROM documents').all() as any[];
db.transaction(()=>{for(const d of rows){const title=d.title.replace(/[\u200b-\u200d\ufeff]/g,'');db.query('UPDATE documents SET title=? WHERE id=?').run(title,d.id);db.query('INSERT INTO documents_fts VALUES(?,?,?)').run(d.id,title,d.kind==='raw_config'?'原始配置字段请用facts检索':d.body)}})();
db.exec("INSERT INTO documents_fts(documents_fts) VALUES('optimize'); PRAGMA wal_checkpoint(TRUNCATE); VACUUM;");console.log(JSON.stringify({documents:rows.length,integrity:db.query('PRAGMA quick_check').all()}));
