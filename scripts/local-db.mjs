import { DatabaseSync } from 'node:sqlite';
export function openLocalDb(filename){
 const sqlite=new DatabaseSync(filename);
 // Local startup migration. Hosted schema is owned by Drizzle migrations.
 sqlite.exec('CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL, revision INTEGER DEFAULT 0 NOT NULL, updated INTEGER NOT NULL)');
 return {sqlite,prepare(sql){let args=[];return {bind(...v){args=v;return this},async first(){return sqlite.prepare(sql).get(...args)||null},async run(){const r=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}}}}}};
}
