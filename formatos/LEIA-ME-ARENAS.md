# Arquivos de arena (`.arena.json`)

Toda arena feita no **EDITOR DE ARENAS** (esfera de 4 estrelas no menu) pode virar um arquivo, e um arquivo pode virar uma arena.

- **Exportar:** no editor, escolha a arena e toque em **EXPORTAR ARQUIVO**. O jogo baixa `nome-da-arena.arena.json`.
- **Anexar:** no editor, toque em **ANEXAR ARQUIVO** e escolha o `.arena.json`. Se estiver tudo certo, a arena entra no jogo como qualquer outra fase: aparece em ARENAS, no mapa e no ranking, sempre liberada. Se tiver algum erro, o jogo mostra qual é e não muda nada.

É um arquivo de **dados** (JSON, texto), não de programação: nada dele é executado. Dá para escrever num editor de texto qualquer. Limites: 7 arenas criadas e 80 peças por arena. Exemplo completo: [`exemplo-arena.arena.json`](exemplo-arena.arena.json).

## Estrutura

```json
{
  "formato": "saiyan-fight-arena",
  "versao": 1,
  "arena": {
    "nome": "TEMPLO NAS NUVENS",
    "cor": "#7dd3fc",
    "musica": "kami",
    "minion": "saibaman",
    "camera": "media",
    "ceu": { "topo": "#3d7fd6", "horizonte": "#d8ecfb" },
    "chao": { "tipo": "nuvens", "cor": "#e8f1fb" },
    "pecas": [
      { "t": "ringue", "x": 0, "z": 0, "r": 0, "e": 1, "c": "#e9e2d0" },
      { "t": "sol", "a": 40, "h": 0.7, "e": 1, "c": "#fff3b0" }
    ]
  }
}
```

| Campo | Obrigatório | O que é |
|---|---|---|
| `nome` | sim | Nome da arena (até 24 letras). |
| `cor` | não | Cor da arena nos menus e no mapa, `#rrggbb`. |
| `musica` | não | Trilha sonora (veja a lista abaixo). |
| `minion` | não | `saibaman`, `celljr` ou a chave de um minion criado no editor. |
| `camera` | não | `baixa`, `media` ou `alta` (altura da câmera que dá a volta). |
| `ceu` | não | Cores do céu: `topo` (em cima) e `horizonte`. |
| `chao` | não | `tipo` do chão (lista abaixo) e `cor`. |
| `pecas` | não | Lista de peças (até 80). |

## Peças

Cada peça tem `t` (o tipo), `e` (tamanho, 0.3 a 3; 1 = normal) e `c` (cor `#rrggbb`).

- **Peças do chão e de pé:** `x` e `z` dizem onde ela fica na planta, de -420 a 420. O centro (0, 0) é onde a luta acontece; `z` positivo é a frente. `r` é o giro em graus (0 a 359). Peças muito perto da câmera somem enquanto ela passa, para não tampar a luta.
- **Peças do céu** (aba CÉU): `a` é a posição em volta, em graus (0 a 359), e `h` a altura no céu (0 = horizonte, 1 = no alto).
- **Placa e símbolo:** `txt` é o texto escrito (até 16 letras; no símbolo aparecem as 2 primeiras).

### CONSTRUÇÃO

| `t` | Peça | Cor padrão |
|---|---|---|
| `bloco` | BLOCO QUADRADO | `#d9dee6` |
| `parede` | PAREDE | `#e6e2d6` |
| `parede_janelas` | PAREDE COM JANELAS | `#eef2f7` |
| `parede_porta` | PAREDE COM PORTA | `#f2d9b8` |
| `predio` | PRÉDIO | `#3b82f6` |
| `casa_domo` | CASINHA REDONDA | `#60a5fa` |
| `domo` | DOMO | `#ffd447` |
| `torre` | TORRE REDONDA | `#e8edf3` |
| `torre_mirante` | TORRE MIRANTE | `#f4f7fb` |
| `pilar` | PILAR | `#cfc6b8` |
| `escada` | ESCADA | `#e2ddd2` |
| `ringue` | RINGUE DE LUTA | `#d8d4cc` |
| `portao` | PORTÃO | `#d9342b` |

### NAVE

| `t` | Peça | Cor padrão |
|---|---|---|
| `casco_nave` | CASCO DE NAVE | `#e9edf3` |
| `perna_aco` | PERNA DE AÇO | `#9aa5b5` |
| `parede_metal` | PAREDE DE METAL COM JANELAS OVAIS | `#b8c2d0` |
| `painel_botoes` | PAINEL DE BOTÕES | `#5b6577` |
| `antena` | ANTENA | `#ef4444` |
| `capsula` | CÁPSULA ESPACIAL | `#e9edf3` |
| `luz_pista` | LUZ DE PISTA | `#7dd3fc` |

### NATUREZA

| `t` | Peça | Cor padrão |
|---|---|---|
| `coqueiro` | COQUEIRO | `#3fa548` |
| `palmeira` | PALMEIRA PEQUENA | `#43a84c` |
| `cipreste` | CIPRESTE | `#1f5a3a` |
| `arvore` | ÁRVORE REDONDA | `#2f7a32` |
| `arbusto` | ARBUSTO | `#3c9440` |
| `pedra` | PEDRA | `#9aa58a` |
| `mesa_pedra` | MESA DE PEDRA | `#b8875a` |
| `montanha` | MONTANHA | `#7b8794` |
| `cristal` | CRISTAL | `#7dd3fc` |

### CHÃO

| `t` | Peça | Cor padrão |
|---|---|---|
| `gramado` | GRAMADO | `#6fc04e` |
| `lago` | LAGO | `#4aa3df` |
| `areia` | AREIA | `#e8d39a` |
| `terra` | TERRA | `#9c6b3f` |
| `lava` | LAVA | `#ff5a1f` |
| `piso` | PISO DE LADRILHOS | `#d9d4c7` |
| `estrada` | ESTRADA | `#8d96a3` |
| `trilha` | TRILHA | `#efe4c2` |

### CÉU

| `t` | Peça | Cor padrão |
|---|---|---|
| `sol` | SOL | `#fff3b0` |
| `lua` | LUA | `#d6d3cc` |
| `planeta_gasoso` | PLANETA GASOSO | `#d9b48a` |
| `planeta_oceano` | PLANETA OCEANO | `#2f86c9` |
| `planeta_terra` | PLANETA TERRA | `#4a9a5a` |
| `nuvem` | NUVEM | `#ffffff` |
| `estrelas` | ESTRELAS | `#ffffff` |
| `morros` | MORROS NO HORIZONTE | `#6fa86a` |
| `montanhas_neve` | MONTANHAS COM NEVE | `#7b8794` |
| `cidade_longe` | CIDADE AO LONGE | `#e1e8f5` |

### ENFEITES

| `t` | Peça | Cor padrão |
|---|---|---|
| `estatua` | ESTÁTUA | `#b8b2a6` |
| `simbolo` | SÍMBOLO (usa `txt`) | `#ff8c1a` |
| `placa` | PLACA COM TEXTO (usa `txt`) | `#8b5a2b` |
| `bandeira` | BANDEIRA | `#e11d2e` |
| `lampiao` | LAMPIÃO | `#ffe08a` |
| `ampulheta` | AMPULHETA | `#d4a52a` |
| `esfera_dragao` | ESFERA DO DRAGÃO | `#ffb52e` |

## Tipos de chão (`chao.tipo`)

| Tipo | Chão | Cor padrão |
|---|---|---|
| `grama` | GRAMA | `#6fbf4a` |
| `areia` | AREIA | `#e3c98a` |
| `mar` | MAR | `#2f86c9` |
| `ladrilho` | PISO DE LADRILHOS | `#cfd6df` |
| `terra` | TERRA | `#a0703f` |
| `nuvens` | NUVENS | `#e8f1fb` |
| `espaco` | ESPAÇO | `#1b1638` |
| `lava` | LAVA | `#7a1d0c` |
| `neve` | NEVE | `#eef4fb` |

## Músicas (`musica`)

| Chave | Trilha |
|---|---|
| `classico` | AVENTURA NAS NUVENS |
| `kame` | BRISA DA KAME HOUSE |
| `kami` | ACIMA DAS NUVENS |
| `capital` | AVENIDAS DA CAPITAL |
| `freeza` | A AMEAÇA DO IMPERADOR |
| `boo` | VALSA DO MAJIN |
| `gt` | ESTRADA DAS ESTRELAS |
| `kaio` | GALOPE DO PLANETA KAIOH |
| `namek` | BRISA DE NAMEK |
| `explosao` | CONTAGEM FINAL |
| `cell` | TORNEIO DA PERFEIÇÃO |

## Erros comuns

- "PEÇA DESCONHECIDA": o `t` está escrito diferente da tabela.
- "TIPO DE CHÃO DESCONHECIDO" / "CÂMERA DESCONHECIDA": confira as listas acima.
- "LIMITE DE 7 ARENAS CRIADAS": exclua uma arena no editor antes de anexar outra.
- Valores fora dos limites (posição, tamanho, giro) são ajustados para o mais próximo permitido.
