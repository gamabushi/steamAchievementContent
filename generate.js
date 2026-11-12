// Uso da terminale: node generate.js [data.json]
// Apre la stessa pagina del telefono in un browser invisibile e salva l'mp4:
// il video è identico a quello creato dal sito.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { avviaServer } = require('./server');

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };

// Serve un browser che sappia codificare H.264: Edge (sempre presente su
// Windows) o Chrome; il Chromium di Playwright come ultima scelta.
async function apriBrowser() {
  for (const channel of ['msedge', 'chrome', undefined]) {
    try { return await chromium.launch(channel ? { channel } : {}); } catch { /* prova il prossimo */ }
  }
  throw new Error('Nessun browser disponibile: installa Edge o Chrome, oppure lancia npm run setup');
}

async function main() {
  const cfgPath = path.resolve(process.argv[2] || 'data.json');
  const base = path.dirname(cfgPath);
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));

  let immagine = '';
  if (cfg.immagine) {
    const p = path.resolve(base, cfg.immagine);
    if (!fs.existsSync(p)) throw new Error('Immagine non trovata: ' + p);
    const tipo = MIME[path.extname(p).toLowerCase()];
    if (!tipo) throw new Error('Formato immagine non supportato: ' + p);
    immagine = `data:${tipo};base64,` + fs.readFileSync(p).toString('base64');
  }
  const outPath = path.resolve(base, cfg.output || 'trophy.mp4');

  const { server, url } = await avviaServer(0);
  const browser = await apriBrowser();
  try {
    const page = await browser.newPage();
    page.on('pageerror', err => console.error('Errore nella pagina:', err.message));
    await page.exposeFunction('__progresso', (i, tot) => {
      if (i % 30 === 0 || i === tot) process.stdout.write(`\rFrame ${i}/${tot}`);
    });
    await page.goto(url);
    await page.waitForFunction(() => window.trofeo);

    const base64 = await page.evaluate(async (c) => {
      const t = window.trofeo;
      const blob = await t.creaVideo({
        titolo: c.titolo || 'Obiettivo sbloccato',
        descrizione: c.descrizione || '',
        rarita: String(c.rarita || ''),
        sbloccato: c.sbloccatoIl || t.dataSblocco(),
        immagine: c.immagine ? await t.caricaImmagine(c.immagine) : null,
        posizione: c.posizione || 'alto',
        dimensione: c.dimensione || 'medio'
      }, { onProgress: (i, tot) => window.__progresso(i, tot) });
      const dataUrl = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
      return dataUrl.slice(dataUrl.indexOf(',') + 1);
    }, { ...cfg, immagine });

    fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
    console.log('\nFatto:', outPath);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(err => { console.error('\nErrore:', err.message); process.exit(1); });
