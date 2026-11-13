# Saiyan Fight NOVO — plano de migração para Phaser 3 + TypeScript

> **v0.121: a troca foi feita (fase 8, ver "Fase 8" no fim).** O site e o app agora são o jogo novo; o antigo
> fica em `/Saiyan-Fight/antigo/`.

O jogo antigo (raiz do repositório, HTML/CSS/JS puro, ~22,5 mil linhas) ficou no ar sem mudança no
GitHub Pages e no APK até o Jefferson decidir trocar (fase 8). O novo mora em `novo/`.

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
- **VERSUS** melhor de 3 (feito na fase 2: 16 personagens, transformação, choque de raios, Zenkai, efeitos, sons).
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
| 2 | **Luta completa** | todos os 16 personagens e 47 formas em atlas, transformação, auras e efeitos de `efeitos/`, choque de raios, Zenkai, alturas, sons | feito (ver abaixo) |
| 3 | **Modo história** | ondas, Saibamans/Cell Jr. (com a regra nova do arremesso ao transformar), itens (cápsula = escudo), vilão com IA e padrões, 3 modos por fase, mapa de fases | 1ª versão jogável (ver abaixo) |
| 4 | **Arenas** | as 11 arenas portadas (primeiro o mesmo desenho em canvas, depois camadas com cache) | 1ª versão: o desenho do antigo (ver abaixo) |
| 5 | **Menus e progresso** | opções, idiomas (todas as linhas), conquistas, ranking, tutorial, pausa, teste de controles, editor de HUD, controle (gamepad) | 1–2 semanas |
| 6 | **Editores** | editor de personagens (sprite sheet) e editor de arenas, importar/exportar | 2–3 semanas |
| 7 | **APK + atualização** | setinha ATUALIZAR com o capgo (só no botão), progresso salvo continua | feito junto com a 8 (o Capacitor continua na raiz) |
| 8 | **Troca** | o novo vira o site e o APK; o antigo fica em `/antigo/` | feito na v0.121 (ver abaixo) |

Total: **~2 a 3 meses** de trabalho, em PRs pequenas; o jogo antigo continua jogável o tempo todo.

## Fase 2 — o que foi feito

- **Personagens**: os 16 jogáveis e as 47 formas (`dados/personagens.ts`), cada forma com o seu atlas
  (`npm run atlas`), alturas pelo `ALTURAS_PADRAO`, tela de **seleção** (J1, J2 ou CPU).
- **Regras do jogo antigo** em `logica/luta.ts` (com testes): transformação (ki cheio, +1 de velocidade por 15 s
  que renova e não acumula, caixa pela altura mantendo os pés), Zenkai 1x por partida, parry instantâneo
  (tryReflect), especial de 3 que acerta sempre, choque de raios (apertos de ATAQUE, resolveClashDamage).
- **Carregamento por cena**: a luta mantém só a forma atual + a próxima de cada lutador e libera o resto; a
  seleção só baixa os retratos; os efeitos vêm uma vez.
- **Efeitos** (`npm run efeitos` → atlas `efeitos`, 33 animações): auras pela cor (AURA_EFEITOS) e a labareda
  desenhada para gelo/rosa, raios de ki de quem está transformado, tiros, raios animados e o raio na cor do golpe,
  sol do Freeza com explosão, choque com o raio de duas pontas, onda do parry, escudo azul na proteção da Zenkai.
- **Som** (`audio/som.ts` + `logica/musica.ts`): os 9 efeitos sintetizados e as **11 trilhas** do `audio.js`,
  tela TRILHAS SONORAS, botão SOM no menu (salvo). Como no antigo, a música só toca na luta; a luta usa a trilha
  do Torneio ("classico", a fase padrão do VERSUS antigo) porque ainda não há escolha de arena (fase 4).

### Diferenças do jogo antigo — confirmadas pelo Jefferson (13/11/2026)

Ficam **ligadas por padrão**; cada uma ainda tem uma chave em `REGRAS` (`logica/constantes.ts`: `true` = regra
nova, `false` = como no antigo), com testes dos dois jeitos.

| Chave | Regra nova (padrão) | Como era no antigo |
|---|---|---|
| `j2IgualAoJ1` | J2 com as mesmas regras do J1 | J2 andava a 4, sem invulnerabilidade depois de apanhar, transformar não dava velocidade |
| `danoDoEspecialNaChegada` | o dano entra quando o raio chega (18 quadros; sol 62); responder antes vira choque | dano na hora do disparo; responder com o raio na tela ainda virava choque |
| `transformacaoTravaMovimento` | a pose de transformar (45 quadros) trava o movimento | dava para andar |
| `guardaGatilho` | ESPECIAL/PARRY/TRANSFORMAR apertado enquanto não pode fica guardado 8 quadros | só valia no quadro do aperto |

### Regras novas do Jefferson (13/11/2026)

- **Invulnerável na pose de transformar**: enquanto a pose dura (movimento travado), o lutador não leva dano
  nenhum — tiro encosta e some, especial e choque não machucam (`podeApanhar` em `logica/luta.ts`, testado).
- **Minion agarrado é arremessado ao transformar**: o gancho já existe — `arremessarAgarrados()` em
  `logica/minions.ts` é chamado na transformação (solta, joga para longe e um pouco para cima, 60 quadros sem
  poder agarrar de novo; o evento `transformou` diz quantos voaram). No VERSUS a lista `minions` é vazia; os
  minions de verdade (andar, agarrar, explodir) entram na **fase 3**. (No antigo, só o especial soltava.)
- **No VERSUS, as regras do herói da história valem para os DOIS** (pedido do Jefferson, 13/11/2026). Auditoria de
  `gameplay.js`/`menu.js`/`game-logic-core.js` e como ficou (testado para J1 e J2 em `tests/luta.test.ts`):

| Regra do herói (história) | No antigo | No novo (J1 e J2) |
|---|---|---|
| Vida | 3 na história; 4 para os dois no VERSUS (`VERSUS_FIGHTER_HP`) | 4 para os dois |
| Velocidade | 4,5; +1 por 15 s ao transformar (renova) | igual para os dois (`j2IgualAoJ1`) |
| Invulnerável depois de apanhar | 30 quadros (tiro, especial, choque) só o herói | 30 quadros para os dois |
| Invulnerável no começo da rodada / Zenkai | 60 / 90 quadros, Zenkai 1x por partida | igual para os dois |
| Apanhar | o herói **não** ficava preso nem era empurrado (o `hitTimer` do J2 só mudava o desenho) | ninguém fica preso nem é empurrado; sobra só a pose de "apanhou" (15 quadros, `poseAtingido`). Saiu o `EMPURRAO` e a ação `atingido` |
| Carregar ki | parado, +0,8 por quadro | igual para os dois (o J2 antigo andava carregando) |
| Tiro | aperto NOVO atira sempre que o intervalo passou (até carregando); SEGURAR só repete fora da carga, do brilho do parry (10 quadros) e sem raio na tela (`beamActive`) | igual para os dois |
| Durante o próprio especial | o herói andava, carregava, rebatia e transformava; não soltava outro com o raio na tela | igual para os dois (pose de especial enquanto o raio dura, `emEspecial`); antes o novo travava quem soltou |
| Choque de raios | o herói andava; aperto de ATAQUE conta | os dois andam; cada aperto novo conta; sem tiro nem outro especial |
| Combo de parry | só o herói: +1 por rebatida, zera com 90 quadros sem rebater ou ao apanhar; +2 ki no 3º, +5 no 6º, +10 no 10º (`getParryComboBonus`) | para os dois (`bonusDoComboDeParry`, evento `parry.bonusKi`) |
| Parry errado | espera 30 quadros (os dois) | igual |
| Transformar | ki cheio, a qualquer hora | igual; a pose trava e protege (regras confirmadas acima) |
| Especial destrói os agarrados | só o herói (`destruirSaibamansAgarrados`) | gancho `destruirAgarrados()` para os dois (evento `especial.agarradosDestruidos`); minions na fase 3 |
| Não ser agarrado invulnerável | só o herói | `podeSerAgarrado()` para os dois (também na pose de transformar); usado na fase 3 |
| Protegido depois de vencer | `protegerHeroiAposVitoria` | os dois, fora da fase `luta` |
| Vibrar ao apanhar | 140 ms no herói | 140 ms em qualquer jogador humano |

  **Fica de fora (não existe no VERSUS):** itens da história (cápsula/escudo que segura um golpe, nuvem, bastão
  com o super ataque, senzu), minions/ondas/chefes (fase 3), pontos/conquistas/estatísticas, o ki 1,4 do
  tutorial, a agressividade da CPU e o tiro automático do toque (camada de entrada). **Diferença que sobra, não é
  do herói:** no antigo o círculo do parry crescia com a aura desenhada (`getParryCircle`, para os dois); no novo
  era fixo (56) — **corrigido**: agora `circuloDoParry()` cresce com a aura como no antigo (veja abaixo).

### Polimento da noite de 13/11/2026 (QA)

- **Círculo do parry como no antigo** (`getParryCircle`): centro e raio pela forma da aura desenhada
  (`auraForma`), mínimo 56; calmo ≈ 75, carregando/transformado maior, menor para quem é baixo (Gotenks). O nível
  da aura (`nivelAura`) passou para a lógica, e o desenho usa o mesmo número. Vale para os dois.
- **Choque com os dois andando**: o raio de duas pontas agora liga as duas mãos (gira se estão em alturas
  diferentes) e o encontro fica na fração do caminho pelo empurrão (`pontoDoChoque`).
- **Aperto rápido não se perde**: ATAQUE apertado e solto entre duas leituras conta (teclado e toque); antes o
  toque curto no choque podia não contar.
- **Toque**: dedo que escorrega de um botão para outro (ex.: ATAQUE → ESPECIAL) aperta o novo sem levantar.
- **Pausa**: botão II no meio de cima e ESC (antes ESC saía direto para o menu). CONTINUAR / MENU. Trocar de app
  ou apagar a tela no celular pausa sozinho. Apertos feitos durante a pausa não valem.
- **Desempenho**: as faíscas de impacto são um emissor de partículas só (antes 12–20 retângulos + tweens novos a
  cada acerto); o texto do choque só é redesenhado quando muda. Medido no navegador: 60 fps no celular emulado.
- **Simulação CPU x CPU** (`tests/simulacao.test.ts`): 16 partidas inteiras, todas terminam, ninguém congela.

## Fase 3 — modo história (branch `phaser-historia`, 1ª versão)

Lógica pura em `src/logica/historia.ts` (+ `ondas.ts`, `itens.ts`, `minions.ts`, `progresso.ts`), reaproveitando
`passoLuta` (o vilão é o `p2`, comandado por `entradaDoVilao`). Telas: Menu → **MODO HISTÓRIA** → `Mapa` (11 fases,
cadeados, NORMAL / DIFÍCIL / SEM LIMITE) → `Selecao` (só o herói) → `Luta` → `FimHistoria`.

Igual ao antigo (`gameplay.js` / `game-logic-core.js`):
- 5 lutas por modo; NORMAL = ondas 1-5, DIFÍCIL = 2-4-6-8-10, SEM LIMITE = 1, 2, 3… sem fim. O vilão derrotado sai
  voando e volta mais forte (vida 4 + onda − 1, tiros mais rápidos, padrões novos a partir da onda 2, transforma da
  onda 3 em diante). Herói com 3 de vida, sem Zenkai. Pontos: +5 vilão no tiro, +3 no especial, +1 minion.
- Saibaman / Cell Jr. (na fase do Cell): brotam do chão, voam, dão o bote, agarram 40 quadros e explodem (a explosão
  ignora escudo e piscada). CARREGAR solta fraco, PARRY arremessa até o vilão (tira 1 dele). Especial destrói os
  agarrados; transformar arremessa (regra nova da fase 2).
- Itens caindo na metade do herói: feijão (+1 vida), cápsula (escudo que segura um golpe), nuvem (velocidade x1,4),
  bastão (+1 no tiro e especial x2). Nuvem/bastão 8 s por item, até 20 s.
- Herói protegido assim que o vilão cai (mesmo no mesmo quadro: tiro do vilão que chega depois não conta).
- Progresso: lê `saiyan_stage_progress` e `saiyan_ordem_fases` do antigo, mas **grava só em
  `saiyan-novo-progresso`** (e recordes em `saiyan-novo-recordes`): o jogo antigo instalado nunca é estragado.

### Mudanças de propósito (`REGRAS_HISTORIA`, `constantes.ts`)

Confirmadas pelo Jefferson (13/11/2026, America/Sao_Paulo):

| Regra | Antigo | Novo (padrão) | Chave |
|---|---|---|---|
| Vilão usa parry nos seus tiros | não | **não** (a chave existe: chance 8–40% se ligar) | `vilaoUsaParry` |
| Vilão solta especial (e responde ao seu com choque) | não | sim, da onda 3 em diante, dano 2 | `vilaoUsaEspecial` |
| Agressividade do vilão | calculada e nunca usada | avança até 140 px, mais parry/especial | `agressividadeReal` |
| Cura entre ondas (+1 vida) | não | **sim, só no DIFÍCIL, depois de vencer a ONDA 2/5** (não depois da 1ª; não no NORMAL nem no SEM LIMITE) | `curaEntreOndas: { dificuldades:['hard'], aPartirDaOnda: 2 }` |
| Vilão pisca invulnerável depois de apanhar | não | não | `vilaoInvulneravel` |
| Item pousa no chão (3 s, pisca no fim) antes de sumir | atravessava o chão | sim | `itemPousaNoChao` |

No VERSUS, a CPU (`entradaDaIA`) é outra IA e **não** usa `vilaoUsaParry`: ela continua podendo rebater; só o vilão da história ficou sem parry. Os jogadores humanos no VERSUS continuam com parry.

`REGRAS_HISTORIA_ANTIGAS` liga tudo como no antigo. Outras escolhas a confirmar:
- **Vilão de cada fase** (no antigo era escolhido na tela ARENAS, padrão Vegeta): Raditz, Piccolo, Vegeta, Freeza
  (1ª forma), Freeza 3ª forma na nave, Freeza forma final em Namek explodindo, Androide 17, Cell (com Cell Jr.), Buu,
  Androide 18, Broly — tabela em `src/dados/fases.ts`.
- Céu/chão pintados com as cores de cada fase (as arenas de verdade entram na fase 4) e a música de cada fase.
- Tela de fim com números (pontos, onda, tempo, ataques, rebatidas, golpes, minions, itens) e recorde por fase.
- Minion não afunda mais no chão balançando (o antigo podia); brotando, o desenho é cortado na linha do chão.
- HUD no DIFÍCIL: "ONDA 3/5 · NÍVEL 6" (luta do modo + força real); SEM LIMITE: "ONDA 7".

Falta (próximas PRs): arenas desenhadas, diálogos/cutscenes, tutorial, conquistas, ranking, escolher o vilão.

## Fase 4 — arenas (branch `phaser-arenas`, 1ª versão)

- **O mesmo desenho do jogo antigo, sem reescrever**: `scripts/gerar-cenarios-legado.mjs` junta os trechos de
  `game-logic-core.js` (ângulo da câmera), `menu.js` (Sala do Tempo, Torneio de Cell, Nave de Freeza,
  `drawStageBackground`) e `cenarios3d.js` inteiro em `src/legado/cenarios-legado.js` (gerado; rodar de novo quando
  uma arena mudar no antigo — um teste falha se ficar desatualizado). Vem num pedaço separado do jogo (~27 KB
  comprimido), baixado enquanto o jogador está nos menus.
- `ui/arena.ts` (`ArenaAntiga`): desenha num canvas que é textura do Phaser. As partes paradas já ficam guardadas
  em imagens pelo próprio código antigo (panoramas de 360°, construções refeitas só a cada 1/4 de grau); por
  quadro só o chão é redesenhado e o canvas vai para a placa de vídeo. A câmera anda 1,5 por quadro de luta, como
  no antigo (para na pausa).
- **60 fps no celular**: mede o custo do cenário; se passar de 5 ms por quadro, baixa a resolução do cenário para
  1x e depois atualiza a cada 2 e 3 quadros (os lutadores continuam a 60). Medido no navegador do computador:
  2–3 ms por quadro nas 11 arenas, 60 fps.
- Todas as lutas têm arena: história = a arena da fase; VERSUS / CPU = tela nova **ESCOLHA A ARENA** (a focada
  aparece ao vivo atrás; ALEATÓRIA sorteia), com a música da arena. O mapa da história mostra a arena da fase
  focada atrás das bolinhas.

A confirmar: no antigo o VERSUS usava a arena escolhida em ARENAS (sem tela na hora da luta); agora a escolha é
logo depois dos lutadores, e a última fica marcada. O mapa 3D de progresso (`mapa.js`) ainda não foi portado.

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
- **R5 — APK**: trocar o jogo dentro do app pela setinha só funciona se a parte nativa for a mesma. Na troca
  (v0.121) não precisou: o jogo novo usa só os plugins que o APK já tem (CapacitorHttp e o capgo), então o
  `nativoMinimo` continua 1.0.0 e o APK instalado recebe o jogo novo pela setinha.
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
npm run efeitos    # refaz o atlas dos efeitos a partir de ../efeitos
```

Controles: J1 setas + F (tiro) + S (carregar) + A (transformar) + Q (especial) + Espaço (parry); J2 IJKL +
U/O/H/Y/P ou teclado numérico (5/2/1/3, Enter, Enter do teclado numérico, 9, 7, 0). No toque, com o ki cheio o
CARREGAR vira TRANSFORMAR. No celular: joystick na metade esquerda e os botões
do jogo antigo à direita. ESC volta ao menu.

## Fase 8 — a troca (v0.121)

- **Site** (`.github/workflows/pages.yml`, o Pages passou a ser publicado pelo GitHub Actions): `novo/dist` na
  raiz e o jogo antigo inteiro em `antigo/` (`scripts/montar-site.js`). Os dois ficam no mesmo endereço, então o
  progresso salvo no navegador continua: o novo grava só `saiyan-novo-*` e lê as chaves antigas.
- **App**: `scripts/android/copiar-web.js` copia `novo/dist` para `www/`; o `android.yml` constrói o novo antes.
  O pacote da setinha (Release `app-bundle`) passou de ~28 MB para ~23 MB. O jogo antigo não vai dentro do app
  (seriam ~51 MB): o botão JOGO ANTIGO abre o site no navegador.
- **Setinha ATUALIZAR** portada (`src/app/plataforma.ts`, `src/logica/atualizacao.ts`, cena `Atualizacoes`):
  mesmo latest.json, mesma decisão (nada / jogo / apk), mesmo download com sha256 + `set`, e o
  `notifyAppReady` ao abrir o menu. Sem mudança nativa: `nativoMinimo` continua 1.0.0, o APK 1.0.278/1.0.301
  recebe o jogo novo pela setinha, e daí em diante as versões novas chegam do mesmo jeito.
- **Versão**: o jogo novo é a 0.121 (`novo/package.json` 0.121.0); as novidades ficam em `src/dados/novidades.ts`.
- **Ainda não tem no novo** (o antigo continua em `/antigo/` para isso): mapa 3D (mapa.js), arenas feitas no
  editor, editores de personagem e de arena, tutorial/diálogos, conquistas, ranking, opções completas (controles,
  editor de HUD, sensibilidade do controle, transmitir para TV), gamepad, tela de personagens com o painel "i".
