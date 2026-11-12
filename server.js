// Server statico per provare la pagina sul PC: npm start → http://localhost:3000
// (la pagina non funziona aprendo index.html con doppio clic: i moduli JS
// vanno serviti via http). Online basta un hosting statico.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const TIPI = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function gestisci(req, res) {
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch { res.writeHead(400); return res.end(); }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(ROOT, rel);
  // Niente file fuori dalla cartella del progetto, né node_modules
  if (!file.startsWith(ROOT + path.sep) || rel.includes('node_modules')) {
    res.writeHead(403); return res.end();
  }
  fs.readFile(file, (err, dati) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Non trovato'); }
    res.writeHead(200, {
      'Content-Type': TIPI[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(dati);
  });
}

/** Avvia il server; porta 0 = porta libera a caso. */
function avviaServer(porta = 3000) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(gestisci);
    server.on('error', reject);
    // Solo localhost: il server non è raggiungibile da altri dispositivi
    server.listen(porta, '127.0.0.1', () => {
      resolve({ server, url: `http://localhost:${server.address().port}/` });
    });
  });
}

module.exports = { avviaServer };

if (require.main === module) {
  avviaServer(Number(process.env.PORT) || 3000)
    .then(({ url }) => console.log('Pronto: apri ' + url))
    .catch(err => { console.error(err.message); process.exit(1); });
}
