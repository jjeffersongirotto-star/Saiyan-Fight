# Saiyan Fight

Jogo de luta no estilo Dragon Ball, feito para jogar direto no navegador do celular ou do computador. Não precisa instalar nada.

## ▶️ Jogar

**https://jjeffersongirotto-star.github.io/Saiyan-Fight/**

No celular dá para deixar o jogo na tela inicial, como um aplicativo: abra o link no Chrome, toque nos três pontinhos (⋮) e escolha **"Adicionar à tela inicial"** ou **"Instalar app"**. No iPhone, use o botão de compartilhar e depois **"Adicionar à Tela de Início"**.

O jogo se atualiza sozinho: quando sai uma versão nova, ele percebe e recarrega assim que você estiver num menu (nunca no meio da luta). Não precisa instalar de novo.

Abrindo pelo ícone, o jogo já abre **deitado e em tela cheia**, sem o aviso do navegador ("Para sair da tela cheia...") que aparece quando se usa a tela cheia dentro do Chrome.

## 📱 App Android (APK, funciona sem internet)

Além do site, o jogo também sai como **app Android de verdade** (um arquivo `.apk`). Ele já leva todos os arquivos do jogo dentro, então **abre rápido e roda sem internet**, sempre deitado e em tela cheia.

**Instalar:**
1. No celular, abra **https://github.com/jjeffersongirotto-star/Saiyan-Fight/releases/latest/download/Saiyan-Fight.apk** (ou toque em **UPDATES → BAIXAR APP** jogando pelo Chrome do Android).
2. Abra o arquivo baixado. Na primeira vez o Android pede para **permitir instalar apps desta fonte** (do Chrome ou do gerenciador de arquivos): permita e toque em **Instalar**.
3. Pronto: o ícone **Saiyan Fight** aparece junto dos outros apps.

**Atualizar:** o app **nunca se atualiza sozinho**. Quando quiser, abra **UPDATES** e toque na setinha **ATUALIZAR**: o jogo confere se saiu um APK mais novo e, se tiver, pergunta se você quer baixar. É só instalar por cima: personagens, conquistas e recordes continuam salvos. Sem internet ele avisa **SEM CONEXÃO** e o jogo continua funcionando normal.

> O progresso do app fica separado do progresso do site no navegador (são lugares diferentes do celular).

**Como o APK é feito:** com o [Capacitor](https://capacitorjs.com/) 8. O `scripts/android/copiar-web.js` copia os arquivos do jogo para a pasta `www/` (fora do repositório) e o projeto Android em `android/` empacota essa pasta. A cada push na `main`, o GitHub Actions (`.github/workflows/android.yml`) gera o APK, assina com a chave do jogo (segredos `SAIYAN_KEYSTORE_BASE64` e `SAIYAN_KEYSTORE_PASSWORD`) e publica em **Releases** como `Saiyan-Fight-<versão>.apk` e `Saiyan-Fight.apk`. Nas PRs o APK também é gerado (fica nos artefatos do Actions), mas não é publicado.

A versão do APK é separada da versão do jogo: `1.0.<número de commits>` (sobe sozinha a cada merge). A versão do jogo (0.X da janela UPDATES) vai no título de cada Release.

Para gerar no computador (Node 22, Java 21 e Android SDK):

```bash
npm ci
npm run android   # copia para www/, sincroniza o Capacitor e roda o Gradle
```

Sem as variáveis `SAIYAN_KEYSTORE` / `SAIYAN_KEYSTORE_PASSWORD` o APK sai assinado com a chave de depuração (serve para testar, mas não instala por cima do APK oficial). Os ícones e a tela de abertura do app saem de `icons/icon-512.png` com `python3 scripts/android/icones.py`.

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

É HTML, CSS e JavaScript puro, sem nenhuma instalação (o `package.json` só serve para o APK Android). As regras do projeto estão em [`AGENTS.md`](AGENTS.md). Para conferir se nada quebrou (é preciso ter o Node 18 ou mais novo):

```bash
node --test tests/game-logic-core.test.js
for t in tests/*.test.js; do node "$t"; done
```

Os mesmos testes rodam automaticamente no GitHub a cada alteração.
