# Arquivos de personagem (`.saiyan.json`)

Todo personagem do jogo pode virar um arquivo, e um arquivo pode virar um personagem.

- **Exportar:** no EDITOR DE PERSONAGENS, abra o personagem e toque em **EXPORTAR ARQUIVO** (aba DADOS). O jogo baixa `nome-do-personagem.saiyan.json`.
- **Anexar:** no editor (de qualquer personagem, ou em + CRIAR NOVO), toque em **ANEXAR ARQUIVO** e escolha o `.saiyan.json`. Se o personagem usa imagens com nome (veja abaixo), escolha **o .json e as imagens juntos**. Se estiver tudo certo, o personagem entra no jogo como qualquer outro (aparece em PERSONAGENS, nas lutas, nas arenas...). Se tiver algum erro, o jogo mostra qual é e não muda nada.

É um arquivo de **dados** (JSON, texto), não de programação: nada dele é executado. Dá para escrever num editor de texto qualquer (Bloco de Notas, VS Code...). Limite: 4 MB no total (arquivo + imagens).

## Estrutura

```json
{
  "formato": "saiyan-fight-personagem",
  "versao": 1,
  "personagem": { ... }
}
```

### Campos do `personagem`

| Campo | Obrigatório | O que é |
|---|---|---|
| `name` | sim | Nome (até 30 letras; vira MAIÚSCULAS). |
| `alignment` | não | `HERÓI`, `ANTI-HERÓI`, `VILÃO` ou `MINION` (padrão `HERÓI`). |
| `aura` | não | `gelo` (branca), `amarelo`, `vermelho`, `rosa`, `azul`, `verde`, `preto`, `roxo`, `blue` (chama azul do Super Saiyajin Blue), `azul_escuro`. |
| `special` | não | Nome do ataque especial. |
| `projColor` | não | Cor do tiro, `#rrggbb`. |
| `projSize` | não | `small`, `normal` ou `large`. |
| `altura` | não | Altura em cm (50 a 500; 175 = tamanho normal). |
| `efeitoTiro` | não | Animação do tiro: `cor` (desenho antigo pela cor), `tiro_pixel`, `tiro_freeza`, `tiro_vermelho`, `tiro_laranja`, `tiro_amarelo`, `cometa_azul`, `bola_azul`, `tiro_verde`, `esfera_roxa`, `esfera_rosa`, `bola_eletrica`, `cometa_fogo`, `esfera_fogo`. Sem o campo = padrão do personagem (`tiro_pixel`). |
| `efeitoEspecial` | não | Animação do especial: `cor` (raio desenhado), `kamehameha`, `raio_azul`, `raio_verde`, `raio_vermelho`, `sol_freeza`. |
| `efeitoAura` | não | Animação da aura: `aura_amarela`, `aura_amarela_forte`, `aura_chama_amarela`, `aura_azul`, `aura_azul_chama`, `aura_azul_escura`, `aura_verde`, `aura_verde_forte`, `aura_vermelha`, `aura_vermelha_forte`, `aura_roxa`. Sem o campo = pela cor da aura. |
| `transformations` | não | Lista de transformações em ordem, cada uma com `name`, `aura` e (opcional) `altura`. |
| **desenho** | sim | **Um só** destes: `minionClassico`, `animations` ou `folha`. |

## Os 3 jeitos de desenhar

(v0.113: o antigo `builderAppearance`, do CONSTRUTOR, não existe mais — o jogo usa só sprites.)

### 1. `minionClassico`: Saibaman / Cell Jr.

Os sprites dos minions do jogo. Exemplo: [`exemplo-minion.saiyan.json`](exemplo-minion.saiyan.json).

- `modelo`: `saibaman` ou `celljr`.

### 2. `animations`: quadros soltos (imagens)

Uma lista de imagens para cada movimento. Exemplo: [`exemplo-quadros.saiyan.json`](exemplo-quadros.saiyan.json).

- Cada imagem é **o nome de um arquivo** (`parado1.png`), anexado junto com o `.json`, ou a imagem já dentro do texto (`data:image/png;base64,...`, como o jogo exporta).
- Formatos: PNG (recomendado, com fundo transparente), JPG, GIF, WEBP ou SVG. O personagem olhando para a **direita**, de pé, com os pés embaixo da imagem.
- `idle` (parado) é obrigatório. Movimento que faltar usa o `idle`.
- `fpsSettings` (opcional): quadros por segundo de cada movimento (1 a 60; padrão 12).

### 3. `folha`: uma folha de sprites

Uma imagem só, com todos os quadros do mesmo tamanho em grade, numerados da esquerda para a direita e de cima para baixo, a partir do 0. Exemplo: [`exemplo-folha.saiyan.json`](exemplo-folha.saiyan.json).

- `imagem`: nome da imagem anexada junto (ou `data:image/...`).
- `largura` / `altura`: tamanho de **um** quadro em pixels.
- `espaco` (opcional): pixels vazios entre os quadros.
- `movimentos`: os números dos quadros de cada movimento. `idle` é obrigatório.

## Movimentos

| Nome | Movimento |
|---|---|
| `idle` | parado |
| `flyRight` / `flyLeft` | voando para frente / para trás |
| `flyUp` / `flyDown` | subindo / descendo |
| `flyUpRight`, `flyUpLeft`, `flyDownRight`, `flyDownLeft` | diagonais |
| `parry` | defesa |
| `attackKi` | tiro |
| `chargeKi` | carregando ki |
| `transform` | transformando |
| `special` | ataque especial |

## Erros comuns

- "IMAGEM NÃO ENCONTRADA": o nome no `.json` não bate com a imagem anexada (o jogo não diferencia maiúsculas de minúsculas), ou a imagem não foi escolhida junto.
- "USE SÓ UM DESENHO POR ARQUIVO": tem mais de um entre `minionClassico`, `animations` e `folha`.
- "MOVIMENTO DESCONHECIDO": o nome do movimento está escrito diferente da tabela acima.
- Os conjuntos de sprites (aba ANIMAÇÕES) não vão no arquivo: só o desenho original do personagem.
