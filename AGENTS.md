# AGENTS.md

## Project snapshot
Saiyan Fight is a Dragon Ball–style fighting game. **The whole game lives in [novo/](novo/)**: Vite + TypeScript strict + Phaser 3.90 + Vitest, own `package.json` with `"type": "module"` (never add that to the root one). It is published on GitHub Pages and inside the Android APK (Capacitor). The old HTML/JS game that used to sit at the repo root was **deleted in v0.128** after everything it had was ported (inventory in [novo/PLANO.md](novo/PLANO.md), which is history); never reintroduce it. Players' data saved by the old game in the browser (`saiyan_db_v8_8bit`, `saiyan_conjuntos`, `saiyan_arenas`, `saiyan_stage_progress`, `saiyan_ordem_fases`, old options/ranking keys) is still READ by the new game — keep reading it, never write those keys.

Repo layout:
- [novo/](novo/): the game. `src/` code, `tests/` Vitest, `public/` shipped assets (atlases, effects, icons, minions, buttons, manifest, tv.html), `fontes/` source assets that are NOT shipped (`fontes/conjuntos/<nome>/<forma>.json` sprite packs, `fontes/efeitos/*.png` effect strips, `fontes/capa-original.webp` icon art), `scripts/` offline asset builders, `formatos/` docs/examples of the `.saiyan.json` / `.arena.json` files.
- [android/](android/), [capacitor.config.json](capacitor.config.json), root `package.json` (only Capacitor packages), [scripts/android/](scripts/android/): the APK.
- [.github/workflows/](.github/workflows/): `testes.yml` (job `testes`, REQUIRED by the main branch protection — keep the job name; tsc + Vitest of novo), `novo.yml` (tests + build + preview on every push/PR), `pages.yml` (site), `android.yml` (APK + web bundle).

## Code map (novo/src)
- `logica/`: pure game logic — no Phaser/DOM/`Math.random`, fixed 1/60 s step — always with Vitest tests in `novo/tests/`. Fight `luta.ts` (`criarLuta`/`passoLuta`, events for the scenes), story `historia.ts` (`criarHistoria`/`passoHistoria`, villain = `p2` via `entradaDoVilao`), waves `ondas.ts`, items `itens.ts`, minions `minions.ts`, AI `ia.ts`, tutorial `tutorial.ts`, map geometry `mapa.ts`, options `opcoes.ts`, controls `controle.ts`, achievements/ranking `conquistas.ts`, progress `progresso.ts` (writes ONLY `saiyan-novo-progresso`/`saiyan-novo-recordes`), languages `idioma.ts`, music `musica.ts`, updater decision `atualizacao.ts`, performance `desempenho.ts`, editors' pure parts `editorPersonagem.ts`/`editorArena.ts`. Rule differences from the old game are switches in `REGRAS`/`REGRAS_HISTORIA` (`constantes.ts`).
- `cenas/`: Phaser scenes — they only draw and react to the events the logic returns (Boot, Preload, Menu, Telas, Mapa, Selecao, Arenas, Luta, Vitoria, FimHistoria, Opcoes, Trilhas, Atualizacoes, AvisoConquista).
- `ui/`: drawing helpers (buttons/panels `telas.ts`, HUD, touch controls, effects, forms/atlases `formas.ts`, arenas `arena.ts`, alerts `janela.ts`, resolution `resolucao.ts`).
- `dados/`: characters (`personagens.ts`: forms, auras, heights), stages (`fases.ts`), effects table, music themes (`temas.ts`), version notes (`novidades.ts`).
- `editor/`: EDITOR DE PERSONAGENS / EDITOR DE ARENAS (HTML layer over the paused game; `ui/editores.ts` disables Phaser input while open). They save to `saiyan-novo` (IndexedDB, store `personagens`), `saiyan-novo-arenas`, `saiyan-novo-ocultos`; old-game items are read-only (editing saves a copy with the same id).
- `app/`: platform glue — `plataforma.ts` (APK updater through `window.Capacitor.Plugins`, never imported: `avisarQueOJogoAbriu` = notifyAppReady, called by Menu — without it the plugin rolls back in 15 s; `procurarAtualizacao`, `baixarEAtualizar`), `tv.ts` (TRANSMITIR PARA A TV).
- `legado/`: code and data that came from the old game, generated once from it and now **edited directly** (no generators anymore): `cenarios-legado.js` (+ `.d.ts`) draws the 11 3D arenas, the 3D stage map and the arena editor's views/validation (canvas 2D, drawn into a Phaser canvas texture by `ui/arena.ts`); `idiomas-legado.ts` (old translation lines), `conquistas-legado.ts`, `updates-legado.ts` (history 0.1–0.120 shown in ATUALIZAÇÕES).

## Key rules
- Logical screen is always 800x350. Sharpness comes from `ESCALA_RENDER` + camera zoom (`ui/resolucao.ts`, call `ajustarCamera` in every scene's `create`). Pointer coordinates: use `p.worldX`/`p.worldY`, never `p.x`/`p.y` (those are canvas pixels × zoom).
- Performance (v0.125): `vigiarDesempenho` measures real frame time in 30-frame windows and lowers `ESCALA_RENDER` (mutable export; `mudarEscala` → `scale.setGameSize` + every scene camera) 2 → 1.5 → 1 (straight to 1 below ~40 fps), then calls `aoFaltarDesempenho` reliefs (the arena updates every 2/3 frames). Never goes back up in the session. The arena canvas is 1x on touch devices and 2x on PC when ESCALA_RENDER ≥ 2. On PC (no touch) the initial ESCALA_RENDER follows the real screen size (Full HD = 2.4, max 3; `escalaInicial`), so the game is drawn at monitor resolution instead of stretched (v0.137). Never size things from `ESCALA_RENDER` after creation — read the texture's own size.
- Visible text goes through `T()` / `TF()` (`logica/idioma.ts`, PT key → EN/ES, plus `legado/idiomas-legado.ts`). **Every new or changed visible text needs its EN and ES** in the same PR. Character, form and attack names are never translated. `NOVIDADES` notes stay in Portuguese only.
- HTML alerts (`ui/janela.ts`) must stop pointer/touch/mouse events: Phaser also listens outside the canvas, so a tap on OK used to press the button behind it (v0.127).
- Sprites: `novo/scripts/gerar-atlas.py` turns `novo/fontes/conjuntos/<nome>/<forma>.json` (frame = `[x, y, w, h, webp b64]`, placement `gx = 48 + (x − centroX)/k`, `gy = 103 + (y − pesY)/k` in a 96x112 cell, idle ≈ 88 units) into `novo/public/atlas/<nome>-<forma>.webp/.json` (cells 144x168) plus `retratos`; rerun it whenever a pack changes. A form's `transform` strip is the PREVIOUS form's TRANSFORMAR strip. After rebuilding packs, check that no frame leaves the 96x112 frame and that no frame is only fragments (v0.124). A new form = pack file + `variantes` in the pack + entry in `dados/personagens.ts` (`f(forma, nome, aura, altura)`) + atlas; `tests/atlas.test.ts` counts the forms.
- Effects: `novo/scripts/gerar-efeitos.py` packs `novo/fontes/efeitos/*.png` (table in `dados/efeitos.ts`) into the `efeitos` multiatlas; drawing `ui/efeitos.ts`, math `logica/efeitos.ts`. Sound is synthesized (`audio/som.ts` + `logica/musica.ts` + `dados/temas.ts`); never transcribe real songs' melodies.
- Updates (v0.129): `app/aviso.ts` (`verificarAtualizacao`, at most every 10 min, called by Menu/Atualizacoes) only CHECKS — app: the same latest.json decision; site: `versao.json` emitted by the `versao-json` plugin in `vite.config.ts` vs `__BUILD__` — and lights a red "!" dot on the 4-star sphere and on UPDATES; on the site ATUALIZAÇÕES shows RECARREGAR (`recarregarSite`). Nothing is downloaded automatically; the app updates only from the ⟳ ATUALIZAR button (latest.json from the `app-bundle` prerelease, through native `CapacitorHttp`, sha256-checked download). In an Android browser the button is BAIXAR APP.

- APK 1.1 (v0.133): `scripts/android/ajustar-updater.js` runs as the ROOT `postinstall` and patches the Android code of @capgo/capacitor-updater so the download progress is real: bytes map linearly to 10..70 and every point is reported (the plugin reported only every 10% and clamped at 70). `faseDoDownload` (logica/atualizacao.ts) reads it: 10..70 = bytes, 71..99 = INSTALANDO, 100 = done. The script throws if the plugin code changes — re-check it whenever the plugin version is bumped.

## Version notes (UPDATES)
Every PR that changes the game bumps the minor of `novo/package.json` (+ `package-lock.json`, `npm version 0.X.0 --no-git-tag-version`) and adds its entry on top of `NOVIDADES` in `novo/src/dados/novidades.ts` (Portuguese; the test checks the first entry matches package.json). Native changes (android/, Capacitor plugins, capacitor.config.json) also bump the ROOT `package.json` minor (1.0.0 → 1.1.0): that is `nativoMinimo`, so old APKs are offered the new APK instead of a bundle they can't run.

## Android APK and site
- Site: `pages.yml` builds `novo` and publishes `novo/dist` (Vite `base: './'`).
- App: `android.yml` → `cd novo && npm ci && npm run build` → [scripts/android/copiar-web.js](scripts/android/copiar-web.js) copies `novo/dist` into `www/` (gitignored, Capacitor `webDir`) and writes `versao-apk.js/json` (game version = major.minor of `novo/package.json`, build = commit count) → `npx cap sync android` → `gradlew assembleRelease`; `scripts/android/pacote-web.py` makes the web bundle + latest.json. App icons come from `novo/public/icons/icon-512.png` (`scripts/android/icones.py`). Never commit the keystore (`*.jks`/`*.keystore`).

## Working conventions
- All communication with the user is in Portuguese.
- Keep changes small and in the file that owns the behaviour; pure logic in `logica/` with a test. Respect the Portuguese naming style.
- Verify proportionally: `cd novo && npx tsc --noEmit -p . && npx vitest run` always; `npm run build` when imports/assets change; a real browser (Playwright, preinstalled) only for visual work — at most 1–2 screenshots. FPS/stress runs only when asked.
- **Big requests** (new stage/mode, visual/architecture change across many files, performance): first a short plan in Portuguese (what changes, files, look, risks on phones), implement after approval. Small clear requests go straight to implementation.

## Saving tokens (the user pays per use)
- **Batch mode:** when the user says "espera eu falar", only note each request in 1–2 lines; start on "fazer todas as alterações", then one test run and one PR.
- Default verification: automated tests + one quick check of what changed. Keep replies short.
- After a PR is merged, suggest starting the next batch in a new conversation.
- PR flow (the user's choice): after opening a PR, turn on GitHub auto-merge (`enable_pr_auto_merge`); never merge directly. After the merge, reset the work branch: `git fetch -q origin main && git checkout -qB claude/repository-verification-pacq7h origin/main && git push -qf origin claude/repository-verification-pacq7h`.

## Before you finish
- Do not hand the user file copies or bundles; commit and push to the branch.
- Changed visible text? EN/ES added.
- Changed the game? `novo/package.json` minor + `NOVIDADES` entry.
- Changed a sprite pack? Atlases regenerated.
