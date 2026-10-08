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
| `aura` | não | `gelo` (branca), `amarelo`, `vermelho`, `rosa`, `azul`, `verde`, `preto`, `roxo`. |
| `special` | não | Nome do ataque especial. |
| `projColor` | não | Cor do tiro, `#rrggbb`. |
| `projSize` | não | `small`, `normal` ou `large`. |
| `altura` | não | Altura em cm (50 a 500; 175 = tamanho normal). |
| `transformations` | não | Lista de transformações (veja abaixo). |
| **desenho** | sim | **Um só** destes: `builderAppearance`, `minionClassico`, `animations` ou `folha`. |

## Os 4 jeitos de desenhar

### 1. `builderAppearance`: personagem do CONSTRUTOR

As peças do construtor. O jogo desenha e anima tudo sozinho, então o arquivo fica pequeno. Exemplo completo: [`exemplo-construtor.saiyan.json`](exemplo-construtor.saiyan.json) (o Goku exportado).

Campo que faltar fica com o padrão. Cores são `#rrggbb` (`skinColor` vazio = cor da raça; também `hairColor`, `hairColor2`, `irisColor`, `scleraColor`, `primaryColor`, `secondaryColor`, `accentColor`, `shirtColor`, `pantsColor`, `capeColor`, `kiColor`, `minionColor`, `clawColor`). Valores aceitos das peças:

| Campo | Valores |
|---|---|
| `gender` | `masculino`, `feminino` |
| `race` | `Saiyajin`, `Humano`, `Namekuseijin`, `Raça Freeza`, `Majin`, `Android`, `Bio-Androide`, `Kaioshin`, `Alienígena`, `Minion` |
| `build` | `normal`, `magro`, `musculoso`, `gigante`, `jovem`, `gordo`, `minion` |
| `hairStyle` | `careca`, `goku`, `vegeta`, `gohan`, `gohan_ssj2`, `cell_crista`, `bardock`, `raditz`, `broly`, `gotenks`, `gotenks_bicolor`, `vegetto`, `vegeta_sprite`, `broly_lssj`, `trunks_futuro`, `trunks_kid`, `android17`, `android18`, `kaioshin_moicano`, `ssj_longo`, `ssj_solto`, `ssj_volumoso`, `ssj_vegeta`, `blue_goku`, `blue_vegeta` |
| `eyeType` | `normal`, `gentil`, `serio`, `bravo`, `wide`, `freeza`, `android`, `fechado`, `vazio` |
| `earType` | `normal`, `pontuda`, `majin`, `nenhuma` |
| `headFeature` | `none`, `antenas`, `majin_antena`, `chifres`, `capacete_freeza`, `capacete_chifres`, `cabeca_longa`, `meia_cabeca_metal`, `antena_longa`, `capacete_cell1`, `capacete_cell2`, `capacete_cell3`, `cabeca_saibaman`, `crista_celljr` |
| `bodyMarks` | `none`, `namek`, `cell`, `freeza`, `listras_freeza`, `carapaca_freeza`, `metal_freeza`, `majin`, `cell_imperfeito`, `cell_semi`, `cell_perfeito`, `aneis_minion`, `manchas_minion` |
| `mouthType` | `smile`, `serio`, `grito`, `maligno`, `risada`, `sadico`, `alegre` |
| `scar` | `none`, `olho`, `bochecha`, `peito`, `lendario` |
| `accessory` | `none`, `potara`, `scouter`, `scouter_vermelho`, `potara_amarelo`, `coleira` |
| `hat` | `none`, `turbante`, `faixa` |
| `symbol` | `none`, `kame`, `kai`, `go`, `cc`, `redribbon`, `saiyajin` |
| `outerShirt` | `none`, `kimono`, `gi_piccolo`, `gi_rasgado`, `roupa_kaioshin`, `armadura_saiyajin`, `armadura_exercito`, `armadura_curta`, `armadura_broly`, `jaqueta_trunks`, `colete_fusao`, `colete_buu`, `colete_metamoran`, `faixa_majin`, `traje_android`, `armadura_cell`, `armadura_freeza` |
| `innerShirt` | `camiseta`, `regata`, `malha`, `malha_gola`, `macacao`, `nenhuma` |
| `pants` | `larga`, `justa`, `bufante`, `nenhuma` |
| `shoes` | `botas_artes`, `botas_saiyajin`, `botas_trunks`, `botas_dobradas`, `botas_kaioshin`, `botas_marrons`, `botas_cell`, `descalco`, `pes_garras`, `sapato_cell`, `sapato_ponta`, `caneleiras_freeza`, `botas_vegetto`, `botas_broly`, `botas_majin`, `botas_douradas`, `sapatilhas_faixa`, `botas_ponta_dourada`, `garras_minion` |
| `gloves` | `pulseiras`, `luvas_saiyajin`, `luvas_pretas`, `bracadeiras_freeza`, `munhequeiras_borda`, `munhequeiras_escuras`, `bracadeiras_majin`, `luvas_douradas`, `luvas_punho_largo`, `garras_minion`, `nenhuma` |
| `cape` | `none`, `capa`, `ombreiras`, `capa_ombreiras`, `capa_no`, `manto_cintura` |
| `tail` | `none`, `saiyajin`, `cinto_saiyajin`, `freeza`, `cell` |
| `wings` | `none`, `cell`, `cell_abertas`, `cell_capa`, `morcego`, `anjo` |
| `backWeapon` | `none`, `espada_trunks`, `bastao` |
| `armPose` | `guarda`, `cruzados` |

`transformations` (só faz sentido aqui): lista em ordem, cada uma com `name`, `diff` (só os campos da aparência que mudam na transformação, por exemplo `{ "hairStyle": "ssj_longo", "hairColor": "#ffe34d" }`), `ssj` (`true` = cabelo de Super Saiyajin) e `aura`. Opcional: `altura`.

### 2. `minionClassico`: Saibaman / Cell Jr. originais

O desenho e os movimentos originais dos minions, com as cores que quiser. Exemplo: [`exemplo-minion.saiyan.json`](exemplo-minion.saiyan.json).

- `modelo`: `saibaman` ou `celljr`.
- `cores` (opcional, `#rrggbb`):
  - Saibaman: `pele`, `olhos`, `boca`, `garras`, `linha` (contorno).
  - Cell Jr.: `azul` (pele), `mancha`, `marinho` (armadura), `asas`, `rosto`, `olhos`, `marcas`, `queixeira`, `maos`, `botas`, `linha`.

### 3. `animations`: quadros soltos (imagens)

Uma lista de imagens para cada movimento. Exemplo: [`exemplo-quadros.saiyan.json`](exemplo-quadros.saiyan.json).

- Cada imagem é **o nome de um arquivo** (`parado1.png`), anexado junto com o `.json`, ou a imagem já dentro do texto (`data:image/png;base64,...`, como o jogo exporta).
- Formatos: PNG (recomendado, com fundo transparente), JPG, GIF, WEBP ou SVG. O personagem olhando para a **direita**, de pé, com os pés embaixo da imagem.
- `idle` (parado) é obrigatório. Movimento que faltar usa o `idle`.
- `fpsSettings` (opcional): quadros por segundo de cada movimento (1 a 60; padrão 12).

### 4. `folha`: uma folha de sprites

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
- "USE SÓ UM DESENHO POR ARQUIVO": tem mais de um entre `builderAppearance`, `minionClassico`, `animations` e `folha`.
- "MOVIMENTO DESCONHECIDO": o nome do movimento está escrito diferente da tabela acima.
- Os conjuntos de sprites (aba ANIMAÇÕES) não vão no arquivo: só o desenho original do personagem.
