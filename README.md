# Saiyan Fight

Jogo de luta no estilo Dragon Ball, feito para jogar direto no navegador do celular ou do computador. Não precisa instalar nada.

## ▶️ Jogar

**https://jjeffersongirotto-star.github.io/Saiyan-Fight/**

No celular dá para deixar o jogo na tela inicial, como um aplicativo: abra o link no Chrome, toque nos três pontinhos (⋮) e escolha **"Adicionar à tela inicial"** ou **"Instalar app"**. No iPhone, use o botão de compartilhar e depois **"Adicionar à Tela de Início"**.

O jogo se atualiza sozinho: quando sai uma versão nova, ele percebe e recarrega assim que você estiver num menu (nunca no meio da luta). Não precisa instalar de novo.

Abrindo pelo ícone, o jogo já abre **deitado e em tela cheia**, sem o aviso do navegador ("Para sair da tela cheia...") que aparece quando se usa a tela cheia dentro do Chrome.

## 🎮 Modos

- **Modo história:** 8 fases em sequência, do Torneio de Artes Marciais ao Planeta Supremo Kaioh. Cada fase tem 3 modos:
  - **NORMAL:** 5 ondas. Vencer libera a próxima fase.
  - **DIFÍCIL:** 5 ondas mais fortes. Libera depois do NORMAL da mesma fase.
  - **SEM LIMITE:** ondas sem fim. Libera depois do DIFÍCIL da mesma fase.
- **VERSUS (2 jogadores no mesmo aparelho):** o jogador 2 controla o rival. A partida é em **melhor de 3 rodadas**: quem vencer 2 rodadas ganha.
- **Tutorial:** ensina cada comando passo a passo.

## 🕹️ Controles

| Ação | Jogador 1 (teclado) | Jogador 2 (teclado) | Controle PS5 |
|---|---|---|---|
| Mover | W A S D | Setas | Analógico esquerdo ou direcional |
| Ataque de ki | F | Enter | ✕ |
| Rebater (parry) | Espaço | Numpad 2 | ○ |
| Carregar ki | C | Numpad 0 | □ |
| Transformar | T | Numpad 1 | △ |
| Especial | E | Numpad 3 | R1, R2 ou touchpad |
| Pausar | Esc ou P | — | Options |

- **No celular:** use o analógico na esquerda da tela e os botões na direita. Por padrão, rebater é um **toque duplo** em qualquer lugar livre da tela.
- Tudo pode ser trocado em **OPÇÕES → CONTROLES**, inclusive a posição e o tamanho dos botões na tela.

## 🧍 Personagens

O jogo já vem com 15 personagens: Goku, Vegeta, Piccolo, Freeza, Trunks, Gohan, Supremo Sr. Kaio, Gogeta, Bardock, Androides 17 e 18, Majin Buu, Raditz, Broly e Cell.

Em **DATABASE** você cria personagens novos de duas formas:
- **Construtor:** monta o personagem juntando partes, como cabelo, roupa, cauda, asas e acessórios.
- **Sprite sheet:** usa uma imagem sua, recortando os quadros de cada movimento.

Na aba **TRANSFORMAÇÃO** do editor, cada personagem pode ter várias transformações, na ordem que você escolher. Elas são editadas no próprio construtor, guardando só o que muda. Na luta, cada **TRANSFORMAR** com o ki cheio leva à próxima.

Tudo fica salvo no próprio navegador.

## 🛠️ Para quem mexe no código

É HTML, CSS e JavaScript puro, sem nenhuma instalação. As regras do projeto estão em [`AGENTS.md`](AGENTS.md). Para conferir se nada quebrou (é preciso ter o Node 18 ou mais novo):

```bash
node --test tests/game-logic-core.test.js
for t in tests/*.test.js; do node "$t"; done
```

Os mesmos testes rodam automaticamente no GitHub a cada alteração.
