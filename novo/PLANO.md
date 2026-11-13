# Saiyan Fight NOVO — plano de migração para Phaser 3 + TypeScript

O jogo atual (raiz do repositório, HTML/CSS/JS puro, ~22,5 mil linhas) **continua no ar sem mudança** no
GitHub Pages e no APK até o novo ter tudo o que o antigo tem. O novo mora em `novo/` e só sai para os
jogadores quando a gente decidir trocar (fase 8).

Ferramentas, iguais às do Ki-Clash: **Vite 5 + TypeScript estrito + Vitest**, **Phaser 3.90** para desenhar
e **Capacitor 8 + @capgo/capacitor-updater** (o mesmo esquema do APK atual: a setinha ATUALIZAR baixa o pacote
do jogo dentro do app, só quando o jogador aperta). O Phaser 4 já saiu (4.2), mas ficamos no 3 por enquanto:
é o mais documentado e estável; dá para subir depois (risco R6).

## Regras do projeto novo

- Lógica do jogo em **TypeScript puro** (`src/logica/`): sem Phaser, sem DOM, sem `Math.random` (sorteio com
  semente). Roda em **passo fixo de 1/60 s** (`RelogioFixo`): o jogo se comporta igual a 30, 60 ou 120 Hz.
  Tudo ali tem teste no Vitest (`tests/`).
- Cenas do Phaser (`src/cenas/`) só **desenham** o estado e tocam os efeitos dos eventos que a lógica devolve.
- Tela lógica **800x350** (a mesma do jogo antigo). O canvas real tem até 2x mais pixels (`ESCALA_RENDER`) e a
  câmera dá zoom — textos e desenhos nítidos no celular sem mudar nenhuma conta (igual ao `renderScale` antigo).
- Textos sempre em **PT/EN/ES** (`src/logica/idioma.ts`, chave salva `saiyan_idioma`, a mesma do jogo antigo).
- Imagens: **atlas WebP** por personagem/forma, carregados **por cena** (só o que a tela vai usar).

## Inventário do jogo antigo → onde fica no novo

| Jogo antigo (arquivo, linhas) | O que faz | No novo (cena / módulo) |
|---|---|---|
| `game-logic-core.js` (994) | contas puras: ondas, hitbox, padrões do chefe, mapa, alturas, VERSUS | `src/logica/*.ts` (portar função por função com os testes de `tests/game-logic-core.test.js`) |
| `gameplay.js` (2344) | laço da luta, tiros, parry, especial, transformação, ondas, Saibamans, itens | `logica/luta.ts` (já tem VERSUS básico) + `logica/ondas.ts`, `logica/minions.ts`, `logica/itens.ts`, `logica/transformacao.ts`; cena `Luta` |
| `menu.js` (7603) | todos os menus, HUD de toque, editor do HUD, teste de controles, mapa, pausa, entrada | cenas `Menu`, `Mapa`, `Selecao`, `Pausa`, `Opcoes`, `Controles`, `EditorHud`; `entrada/` (teclado, toque, controle) |
| `database.js` (2678) | banco de personagens, editor de sprite sheet, janelas | `dados/personagens.ts` + cena/DOM `EditorPersonagem` (fica em HTML por cima do canvas, como hoje) |
| `conjuntos.js` (742) + `conjuntos/` (34 MB) | pacotes de sprites (16 personagens, 47 formas, 5264 quadros) | **atlas WebP** gerados por `scripts/gerar-atlas.py`; `dados/formas.ts` |
| `minions.js` (100) + `minions/` | Saibaman e Cell Jr. (imagens) | atlas `minions` + `logica/minions.ts` |
| `cenarios3d.js` (1972) + `mapa.js` (499) | 11 arenas desenhadas em "3D" com canvas 2D, mapa de fases | cenas `Arena*` com o mesmo desenho em canvas → textura (primeiro portar como está; otimizar depois) |
| `arenas.js` (2970) | EDITOR DE ARENAS (peças, pincel, clima, desfazer...) | por último; fica como tela HTML + canvas sobre o Phaser |
| `fases.js` + `fases/` | arquivos de cada arena, ordem das fases | `dados/fases.ts` lendo os mesmos `.json` |
| `audio.js` (467) | sintetizador Web Audio, 11 trilhas compostas, efeitos | `audio/` (mesmo sintetizador portado para TS; o Phaser só controla o volume/destrava no 1º toque) |
| `progress.js` (357) | conquistas, ranking local, apelido | `logica/progresso.ts` + `salvar.ts` (mesmas chaves do localStorage: o progresso do jogador continua) |
| `idiomas.js` (1138) | PT/EN/ES | `logica/idioma.ts` (importar as linhas `IDIOMA_LINHAS` de uma vez, com script) |
| `storage.js` (31) | localStorage protegido | `salvar.ts` |
| `arquivos.js` (269) | exportar/importar personagem `.saiyan.json` | `dados/arquivos.ts` (mesmo formato, mesmos exemplos de `formatos/`) |
| `atualizacao.js` (328) | setinha ATUALIZAR (site e APK) | `ui/atualizar.ts`, como o `update.ts` do Ki-Clash |
| `index.html` (UPDATES, editor, janelas) | notas de versão e janelas HTML | `public/` + cena `Updates` |
| `efeitos/` (1,2 MB) | auras, tiros, raios, escudo, explosão (tiras PNG) | atlas `efeitos` (WebP) + animações do Phaser |
| `tests/` (76 arquivos) | harness com DOM simulado | Vitest na lógica pura; Playwright para 2–3 testes de tela |

### Funções do jogo (o que precisa existir de novo)

- **Modo história**: mapa com 11 fases (Ilha do Kame, Torneio, Planeta do Sr. Kaioh, Namek, Nave do Freeza,
  Namek explodindo, Sala do Tempo, Jogos do Cell, Planeta Supremo Kaioh, Plataforma Celestial, Capital do Oeste),
  3 modos por fase (NORMAL, DIFÍCIL, SEM LIMITE), ondas com Saibamans/Cell Jr., vilão por fase, itens.
- **VERSUS** melhor de 3 (feito na fatia, falta transformação, choque de raios e Zenkai).
- **Tutorial** passo a passo (toque, teclado e controle).
- **Personagens**: 16 jogáveis + 2 minions, com transformações (47 formas), alturas, efeitos de tiro/especial/aura.
- **Editor de personagens** (sprite sheet, conjuntos/grupos, cadeado de quadros, exportar/importar).
- **Editor de arenas**.
- **Trilhas sonoras** (11 temas próprios) e efeitos.
- **UPDATES** + setinha ATUALIZAR.
- **Progresso**: conquistas (bronze → diamante), ranking por fase, apelido.
- **Idiomas** PT/EN/ES, **controles** (toque com editor de HUD, teclado, controle PS/Xbox com sensibilidade),
  tela cheia, transmitir para TV.

## Fases (ordem e esforço aproximado)

| # | Fase | O que entra | Esforço |
|---|---|---|---|
| 1 | **Base + fatia jogável** (esta PR) | Vite/TS/Phaser/Vitest, Boot/Preload com barra, menu, VERSUS Goku x Vegeta (andar/voar, tiro, carregar, especial, parry, vida, rodadas, vitória), teclado + toque, CPU simples, atlas WebP, CI | feito |
| 2 | **Luta completa** | todos os 16 personagens e 47 formas em atlas, transformação, auras e efeitos de `efeitos/`, choque de raios, Zenkai, alturas, sons | 1–2 semanas |
| 3 | **Modo história** | ondas, Saibamans/Cell Jr., itens, vilão com IA e padrões, 3 modos por fase, mapa de fases, seleção de personagem | 2 semanas |
| 4 | **Arenas** | as 11 arenas portadas (primeiro o mesmo desenho em canvas, depois camadas com cache) | 1–2 semanas |
| 5 | **Menus e progresso** | opções, idiomas (todas as linhas), conquistas, ranking, tutorial, pausa, teste de controles, editor de HUD, controle (gamepad) | 1–2 semanas |
| 6 | **Editores** | editor de personagens (sprite sheet) e editor de arenas, importar/exportar | 2–3 semanas |
| 7 | **APK + atualização** | Capacitor dentro de `novo/`, setinha ATUALIZAR com o capgo (só no botão), progresso salvo continua | 3–5 dias |
| 8 | **Troca** | testes no celular de verdade, o novo vira o site e o APK; o antigo fica numa pasta/branch de arquivo | 2–3 dias |

Total: **~2 a 3 meses** de trabalho, em PRs pequenas; o jogo antigo continua jogável o tempo todo.

## Plano das imagens (medido nesta PR)

O que pesa hoje (arquivos do repositório):

| Pasta | Peso |
|---|---|
| `conjuntos/` (sprites dos personagens) | **34,4 MB** (47 arquivos JSON, 5264 quadros) |
| `efeitos/` | 1,2 MB |
| `icons/` | 0,8 MB |
| `minions/` | 0,1 MB |
| código `.js` na raiz | 1,5 MB |

Os maiores arquivos (cada um é UMA forma de um personagem):

| Arquivo | Tamanho |
|---|---|
| `conjuntos/freeza/ciborgue.json` | 890 KB |
| `conjuntos/freeza/f1.json` | 885 KB |
| `conjuntos/freeza/f3.json` | 874 KB |
| `conjuntos/gohan/ssj2.json` | 860 KB |
| `conjuntos/trunks/ssj.json` | 841 KB |
| `conjuntos/freeza/f2.json` | 826 KB |
| `conjuntos/cell/f1.json` | 814 KB |
| `conjuntos/bardock/normal.json` | 814 KB |
| `conjuntos/gotenks/ssj3.json` | 790 KB |
| `conjuntos/freeza/golden.json` | 789 KB |
| `efeitos/escudo_azul.png` | 386 KB |
| `efeitos/aura_vermelha.png` | 157 KB |
| `efeitos/sol_freeza.png` | 131 KB |

Por personagem: Freeza 5,6 MB (7 formas), Goku 4,2 MB (6), Vegeta 3,7 MB (6), Gohan/Trunks/Gotenks/Cell ~2,1 MB.

**Por que demora:** os quadros já são WebP, mas ficam em **texto base64 dentro de JSON** (+33% de peso), cada
quadro é uma imagem separada (5264 decodificações) e o jogo antigo ainda embrulha cada um num SVG antes de
desenhar. Só de dados decodificados são 25,6 MB.

**O que o novo faz:**

1. **Atlas WebP por forma** (`scripts/gerar-atlas.py`): todos os quadros de uma forma numa imagem só (até
   2048 px de largura), cortando o vazio de cada quadro (o Phaser devolve a posição certa, os pés continuam na
   linha 103). Resultado medido: **Goku normal 712 KB → 444 KB (−38%)**, **Vegeta normal 685 KB → 426 KB (−38%)**,
   1 decodificação por forma em vez de ~112, sem SVG. Para os 47 arquivos isso dá ~**21 MB em vez de 34 MB**.
2. **Carregar por cena**: o menu carrega só os botões; a luta carrega só os 2 lutadores (e, na fase 2, a forma
   atual + a próxima de cada um, como `formasDaLutaNecessarias` faz hoje). Uma luta abre com ~0,9 MB de sprites.
3. **Efeitos** (`efeitos/`): juntar as tiras num atlas WebP (o escudo azul de 386 KB em PNG deve cair para
   ~60–90 KB) — fase 2.
4. Próximos ganhos, se precisar: tirar quadros repetidos entre formas, WebP sem perda só nos quadros
   pequenos, e no APK as imagens já vão dentro do app (abre sem internet).

## Riscos

- **R1 — Tamanho do trabalho**: são ~22 mil linhas e muitos detalhes ajustados pelo jogador ao longo de 120
  versões. Mitigação: portar por fase, cada uma com testes, comparando lado a lado com o antigo.
- **R2 — Arenas 3D** (`cenarios3d.js`, `arenas.js`): são desenhadas à mão no canvas 2D, não têm equivalente
  pronto no Phaser. Primeiro portar o desenho como está (canvas → textura), otimizar depois.
- **R3 — Editores** (personagem e arena): muita interface HTML; ficam em HTML por cima do jogo.
- **R4 — Progresso dos jogadores**: o novo tem que ler as mesmas chaves do localStorage (`saiyan_*`) e o
  IndexedDB das formas feitas no editor; testar com um save real antes da troca.
- **R5 — APK**: trocar o jogo dentro do app pela setinha só funciona se a parte nativa for a mesma; a troca
  (fase 8) provavelmente precisa de um APK novo (subir o `nativoMinimo`), uma vez.
- **R6 — Phaser 3 x 4**: ficar no 3.90 agora; a lógica pura não depende do Phaser, então trocar depois afeta
  só as cenas.
- **R7 — Desempenho em celular fraco**: WebGL + atlas é bem mais leve que o canvas 2D atual, mas o canvas a 2x
  pode pesar; se precisar, baixar `ESCALA_RENDER` sozinho como o `vigiarDesempenho` faz hoje.

## Como rodar

```bash
cd novo
npm install
npm run dev        # abre em http://localhost:5173
npm test           # testes da lógica (Vitest)
npm run build      # gera novo/dist (abrir com: npx vite preview)
npm run atlas      # refaz os atlas a partir de ../conjuntos (precisa de Python 3 + Pillow)
```

Controles: J1 setas + F (tiro) + S (carregar) + Q (especial) + Espaço (parry); J2 IJKL + U/O/Y/P ou teclado
numérico (5/2/1/3, Enter, Enter do teclado numérico, 7, 0). No celular: joystick na metade esquerda e os botões
do jogo antigo à direita. ESC volta ao menu.
