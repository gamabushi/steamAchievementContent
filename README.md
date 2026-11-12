# Steam Achievement Content

**👉 Sito: https://gamabushi.github.io/steamAchievementContent/**

Crea video MP4 verticali (1080×1920, 9:16, 30 fps) con il popup di un finto obiettivo Steam sbloccato, su sfondo verde. Sono pronti da sovrapporre ai tuoi video in CapCut per Reels, TikTok e Shorts.

Il video viene creato **direttamente nel browser** (anche da telefono), senza server: la pagina disegna il popup su canvas e lo codifica in H.264 con WebCodecs e [Mediabunny](https://mediabunny.dev).

Il video è **senza audio**: il suono si aggiunge in fase di montaggio.

## Uso da telefono
1. Apri il sito, compila titolo, descrizione, rarità ed eventuale icona.
2. Scegli posizione e dimensione: l'anteprima mostra in scuro le zone coperte dall'interfaccia di TikTok/Reels.
3. Premi **🎬 Crea video**, poi **📲 Salva / Condividi** (su iPhone: "Salva video") o **⬇️ Scarica mp4**.
4. In CapCut: aggiungi il video come **Sovrapposizione** → **Rimuovi sfondo → Chroma key** e tocca il verde.
5. Aggiungi il suono che preferisci: il popup inizia a entrare a **0,3 s** dall'inizio della clip.

Serve un browser che supporti WebCodecs: Chrome (anche Android) o Safari 16.4+ (iOS 16.4+).

## Provarlo sul PC
```bash
npm start
```
Poi apri http://localhost:3000. Aprire `index.html` con doppio clic non funziona: i moduli JS vanno serviti via http.

## Uso da terminale (opzionale)
```bash
npm run setup
```
```bash
npm run generate
```
Legge `data.json` e salva l'mp4 in `output`. Usa la stessa pagina del sito dentro Edge o Chrome invisibile, quindi il video è identico.

| Chiave in `data.json` | Significato |
|---|---|
| `titolo`, `descrizione`, `rarita` | Testi del popup |
| `immagine` | Icona (percorso file, opzionale) |
| `sbloccatoIl` | Testo della data (vuoto = data attuale) |
| `posizione` | `alto` o `centro` |
| `dimensione` | `piccolo`, `medio` o `grande` |
| `output` | Nome del file mp4 |

## File
- `index.html`: la pagina (form, anteprima, download)
- `trophy.js`: disegno del popup e creazione dell'mp4
- `lib/mediabunny.min.mjs`: libreria per scrivere l'mp4 (licenza MPL-2.0)
- `server.js`, `generate.js`: server locale e generatore da terminale

Durata, fps e tempi dell'animazione sono in cima a `trophy.js`.
