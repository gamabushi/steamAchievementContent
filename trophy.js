// Disegna il popup del trofeo su canvas e crea l'mp4 direttamente nel browser
// (WebCodecs + Mediabunny). Nessun server: funziona anche da telefono.
import {
  Output, Mp4OutputFormat, BufferTarget, CanvasSource, QUALITY_HIGH, canEncodeVideo
} from './lib/mediabunny.min.mjs';

// ── Impostazioni del video ────────────────────────────────────────────────
// 1080×1920 (9:16) a 30 fps: il formato di Reels, TikTok e Shorts.
// Il video è senza audio: il suono si aggiunge in fase di montaggio.
// "attesa" = secondi prima che il popup inizi a entrare (lì va il suono).
export const VIDEO = { larghezza: 1080, altezza: 1920, fps: 30, durata: 5, attesa: 0.3 };
const ANIM = { entrata: 500, pausa: 3500, uscita: 400 }; // millisecondi
const VERDE = '#00FF00';

// Il disegno è in "unità" su una larghezza di 360: a 1080 px 1 unità = 3 px
const BASE_W = 360;
export const DIMENSIONI = { piccolo: 0.7, medio: 0.85, grande: 1 };
// y = frazione dell'altezza; margineDx = frazione della larghezza (per non
// finire sotto la colonna di icone a destra di TikTok/Reels)
export const POSIZIONI = {
  alto:   { y: 0.14, ancora: 'top',    margineDx: 0 },
  centro: { y: 0.50, ancora: 'center', margineDx: 0.15 }
};

const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif';
const FONT_EMOJI = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
const T = {
  W: 331, padT: 10, padR: 14, padB: 10, padL: 10, icona: 54, bordo: 2, iconaMr: 12,
  titolo: { size: 14.72, lh: 18.4, peso: 600, colore: '#e8e8e8' },
  desc:   { size: 11.52, lh: 14.98, peso: 400, colore: '#8a8a8a', mt: 3 },
  footer: { size: 10.4, lh: 13.9, padT: 5, padB: 6, padX: 14 }
};

// ── Utilità di disegno ────────────────────────────────────────────────────
function vaACapo(ctx, testo, maxW) {
  const righe = [];
  let riga = '';
  for (const parola of String(testo).split(/\s+/).filter(Boolean)) {
    const prova = riga ? riga + ' ' + parola : parola;
    if (!riga || ctx.measureText(prova).width <= maxW) riga = prova;
    else { righe.push(riga); riga = parola; }
  }
  if (riga) righe.push(riga);
  return righe;
}

// Come object-fit: cover
function disegnaCover(ctx, img, x, y, w, h) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const s = Math.max(w / iw, h / ih);
  const sw = w / s, sh = h / s;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
}

// Sfondo sfocato, scurito e saturato (come blur(14px) brightness(.22) saturate(1.8)).
// Senza ctx.filter, che Safari non supporta: si rimpicciolisce l'immagine e la si
// riallarga, così il risultato è uguale su ogni telefono.
function sfondoSfocato(img, wUnita, hUnita) {
  const sw = Math.max(2, Math.round(wUnita / 9)), sh = Math.max(2, Math.round(hUnita / 9));
  const mid = document.createElement('canvas');
  mid.width = sw * 4; mid.height = sh * 4;
  disegnaCover(mid.getContext('2d'), img, 0, 0, mid.width, mid.height);
  const c = document.createElement('canvas');
  c.width = sw; c.height = sh;
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(mid, 0, 0, sw, sh);
  const dati = g.getImageData(0, 0, sw, sh), p = dati.data, s = 1.8, b = 0.22;
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i] * b, v = p[i + 1] * b, bl = p[i + 2] * b;
    p[i]     = (0.213 + 0.787 * s) * r + (0.715 - 0.715 * s) * v + (0.072 - 0.072 * s) * bl;
    p[i + 1] = (0.213 - 0.213 * s) * r + (0.715 + 0.285 * s) * v + (0.072 - 0.072 * s) * bl;
    p[i + 2] = (0.213 - 0.213 * s) * r + (0.715 - 0.715 * s) * v + (0.072 + 0.928 * s) * bl;
  }
  g.putImageData(dati, 0, 0);
  return c;
}

// ── Il popup ──────────────────────────────────────────────────────────────
/**
 * @param {object} d  { titolo, descrizione, rarita, sbloccato, immagine (HTMLImageElement|null) }
 * @param {number} u  pixel per unità
 * @returns {HTMLCanvasElement}
 */
export function disegnaToast(d, u) {
  const misura = document.createElement('canvas').getContext('2d');
  const font = (f) => `${f.peso || 400} ${f.size * u}px ${FONT}`;
  const testoW = (T.W - T.padL - T.padR - T.icona - T.iconaMr) * u;

  misura.font = font(T.titolo);
  const righeT = vaACapo(misura, d.titolo || 'Obiettivo sbloccato', testoW);
  misura.font = font(T.desc);
  const righeD = d.descrizione ? vaACapo(misura, d.descrizione, testoW) : [];
  const testiH = righeT.length * T.titolo.lh + (righeD.length ? T.desc.mt + righeD.length * T.desc.lh : 0);
  const mainH = T.padT + Math.max(T.icona, testiH) + T.padB;

  const piede = [[d.sbloccato || '', '#8a9aaa']];
  if (d.rarita) piede.push([d.rarita + '% of players have this achievement', '#c8a840']);
  const piedeH = 1 + T.footer.padT + piede.length * T.footer.lh + (piede.length - 1) + T.footer.padB;

  const c = document.createElement('canvas');
  c.width = Math.round(T.W * u);
  c.height = Math.round((mainH + piedeH) * u);
  const g = c.getContext('2d');
  g.textBaseline = 'middle';

  // Parte principale (+ sfondo sfocato dall'immagine). Tutto il canvas viene
  // riempito, così ai bordi tra le zone non trapela mai il verde.
  const yPiede = Math.round(mainH * u);
  g.fillStyle = '#2a2a2a';
  g.fillRect(0, 0, c.width, c.height);
  if (d.immagine) {
    const sf = sfondoSfocato(d.immagine, T.W + 40, mainH + 40);
    g.save();
    g.beginPath(); g.rect(0, 0, c.width, yPiede); g.clip();
    g.imageSmoothingQuality = 'high';
    g.drawImage(sf, -20 * u, -20 * u, (T.W + 40) * u, (mainH + 40) * u);
    g.restore();
  }

  // Icona con bordo dorato
  const ix = T.padL * u, iy = ((mainH - T.icona) / 2) * u, is = T.icona * u, b = T.bordo * u;
  g.fillStyle = '#7a6232'; g.fillRect(ix, iy, is, is);
  g.fillStyle = '#3a3020'; g.fillRect(ix + b, iy + b, is - 2 * b, is - 2 * b);
  if (d.immagine) {
    disegnaCover(g, d.immagine, ix + b, iy + b, is - 2 * b, is - 2 * b);
  } else {
    g.font = `${28 * u}px ${FONT_EMOJI}`;
    g.textAlign = 'center';
    g.fillText('🏆', ix + is / 2, iy + is / 2 + u);
    g.textAlign = 'left';
  }

  // Titolo e descrizione
  const tx = (T.padL + T.icona + T.iconaMr) * u;
  let y = (mainH - testiH) / 2;
  g.font = font(T.titolo); g.fillStyle = T.titolo.colore;
  for (const r of righeT) { g.fillText(r, tx, (y + T.titolo.lh / 2) * u); y += T.titolo.lh; }
  if (righeD.length) {
    y += T.desc.mt;
    g.font = font(T.desc); g.fillStyle = T.desc.colore;
    for (const r of righeD) { g.fillText(r, tx, (y + T.desc.lh / 2) * u); y += T.desc.lh; }
  }

  // Piede: data e rarità
  g.fillStyle = '#1c1c1c'; g.fillRect(0, yPiede, c.width, c.height - yPiede);
  g.fillStyle = '#2a2a2a'; g.fillRect(0, yPiede, c.width, Math.max(1, Math.round(u)));
  g.font = font(T.footer);
  let yy = mainH + 1 + T.footer.padT;
  for (const [testo, colore] of piede) {
    g.fillStyle = colore;
    g.fillText(testo, T.footer.padX * u, (yy + T.footer.lh / 2) * u);
    yy += T.footer.lh + 1;
  }
  return c;
}

function calcolaPosizione(toast, W, H, posizione) {
  const p = POSIZIONI[posizione] || POSIZIONI.alto;
  const margine = Math.min(p.margineDx * W, W - toast.width);
  const x = Math.round(W - margine - toast.width);
  const y = Math.round(p.ancora === 'top' ? p.y * H : p.y * H - toast.height / 2);
  return { x, y, corsa: (W - x) * 1.05 };
}

// Solo scorrimento, niente dissolvenza: un popup semitrasparente sul verde
// diventerebbe verdastro e il chroma key di CapCut non lo toglierebbe bene.
function spostamento(t) {
  const { entrata: E, pausa: P, uscita: U } = ANIM;
  if (t <= 0 || t >= E + P + U) return null;               // fuori scena
  if (t < E) return Math.pow(1 - t / E, 3);                  // ease-out
  if (t < E + P) return 0;
  return Math.pow((t - E - P) / U, 2);                       // ease-in
}

function disegnaFrame(ctx, W, H, toast, pos, sposta) {
  ctx.fillStyle = VERDE;
  ctx.fillRect(0, 0, W, H);
  if (sposta === null) return;
  ctx.drawImage(toast, Math.round(pos.x + sposta * pos.corsa), pos.y);
}

// Zone coperte dall'interfaccia di TikTok / Reels / Shorts (valori indicativi)
function disegnaZoneCoperte(ctx, W, H) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, W, H * 0.12);                          // schede in alto
  ctx.fillRect(0, H * 0.78, W, H * 0.22);                   // nome, didascalia, musica
  ctx.fillRect(W * 0.86, H * 0.40, W * 0.14, H * 0.38);     // like, commenti, condividi
  ctx.restore();
}

/** Disegna l'anteprima statica (popup fermo) in un canvas qualsiasi. */
export function disegnaAnteprima(canvas, d, mostraZone) {
  const W = canvas.width, H = canvas.height;
  const u = (W / BASE_W) * (DIMENSIONI[d.dimensione] || DIMENSIONI.medio);
  const toast = disegnaToast(d, u);
  const ctx = canvas.getContext('2d');
  disegnaFrame(ctx, W, H, toast, calcolaPosizione(toast, W, H, d.posizione), 0);
  if (mostraZone) disegnaZoneCoperte(ctx, W, H);
}

/** Il browser sa creare video H.264 (quello che vuole CapCut)? */
export async function supportato() {
  return typeof VideoEncoder !== 'undefined'
    && await canEncodeVideo('avc', { width: VIDEO.larghezza, height: VIDEO.altezza });
}

/**
 * Crea l'mp4 del trofeo.
 * @param {object} d  come disegnaToast + { posizione, dimensione }
 * @param {object} [opz]  { onProgress(frame, totale) }
 * @returns {Promise<Blob>}
 */
export async function creaVideo(d, opz = {}) {
  const { larghezza: W, altezza: H, fps, durata, attesa } = VIDEO;
  if (!(await supportato())) {
    throw new Error('Questo browser non sa creare video H.264. Usa Chrome o Safari aggiornati.');
  }
  const u = (W / BASE_W) * (DIMENSIONI[d.dimensione] || DIMENSIONI.medio);
  const toast = disegnaToast(d, u);
  const pos = calcolaPosizione(toast, W, H, d.posizione);
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target: new BufferTarget()
  });
  const video = new CanvasSource(canvas, { codec: 'avc', quality: QUALITY_HIGH });
  output.addVideoTrack(video, { frameRate: fps });
  await output.start();

  const totale = Math.round(durata * fps), dt = 1000 / fps, frameInizio = Math.round(attesa * fps);
  for (let i = 0; i < totale; i++) {
    disegnaFrame(ctx, W, H, toast, pos, spostamento((i + 1 - frameInizio) * dt));
    await video.add(i / fps, 1 / fps);
    if (opz.onProgress) opz.onProgress(i + 1, totale);
  }
  await output.finalize();
  return new Blob([output.target.buffer], { type: 'video/mp4' });
}

/** Data nello stile di Steam: "Unlocked on Nov 12, 2026, 1:14 PM" */
export function dataSblocco(data = new Date()) {
  const mesi = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let h = data.getHours();
  const m = String(data.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `Unlocked on ${mesi[data.getMonth()]} ${data.getDate()}, ${data.getFullYear()}, ${h}:${m} ${ampm}`;
}

export function caricaImmagine(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Immagine non valida'));
    img.src = src;
  });
}
