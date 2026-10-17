import { access } from 'node:fs/promises';
for (const path of ['public/index.html', 'public/game.js', 'public/game.css', 'worker.mjs', 'lib/api.mjs', 'lib/game.mjs', 'lib/bots.mjs', 'migrations/0001_rooms.sql']) await access(path);
console.log('Terrible Advice assets and multiplayer Worker ready.');
