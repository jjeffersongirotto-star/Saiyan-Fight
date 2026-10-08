# Arquivos das arenas

Um arquivo `.json` por arena. O `indice.json` lista quais arquivos o jogo lê.

| Campo | O que é |
|---|---|
| `id` | Identificador fixo da arena (o progresso salvo fica ligado a ele). Não mude. |
| `nome` | Nome mostrado no jogo. |
| `posicao` | Número da fase no mapa (1 = primeira). Para reorganizar, troque os números. A ordem escolhida em ARENAS dentro do jogo vale por cima disto. |
| `cor` | Cor tema da arena (`#rrggbb`). |
| `musica` | Tema musical (`kame`, `classico`, `kaio`, `namek`, `freeza`, `explosao`, `gt`, `cell`, `boo`). |
| `cenario` | Qual cenário 3D do jogo esta arena usa (referência). |
| `camera` | Tipo de câmera (`orbita`, `arena`, `planeta`, `anda`) e `volta` (quanto anda por volta). |
| `fundoClaro` | `true` quando o céu é claro (o placar ganha placas escuras atrás). |
| `minion` | Minion padrão (`saibaman` ou `celljr`). Pode ser trocado em ARENAS. |
| `conquista` | Nome e descrição da conquista da arena. |

Se algum arquivo estiver com erro, o jogo usa a cópia embutida para aquela arena.
