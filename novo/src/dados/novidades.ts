// Novidades de cada versão (a janela UPDATES do jogo antigo, agora a tela ATUALIZAÇÕES). A mais nova primeiro;
// a primeira é sempre a versão do package.json (tests/atualizacao.test.ts confere). Como no jogo antigo, as notas
// ficam só em português. Embaixo, a tela mostra todo o histórico do jogo antigo (0.1 a 0.120).
// As prévias do jogo novo (0.1 a 0.6 dentro de novo/, antes de ele entrar no ar) estão resumidas na 0.121.
export interface Novidade { versao: string; titulo: string; itens: string[] }

export const NOVIDADES: Novidade[] = [
  {
    versao: '0.126',
    titulo: 'ESCOLHA SEU CAMINHO MAIS ARRUMADA',
    itens: [
      'Os botões SINGLEPLAYER, VERSUS e 1 JOGADOR x CPU subiram para perto do título e ficaram centralizados no quadro.',
    ],
  },
  {
    versao: '0.125',
    titulo: 'LUTAS A 60 FPS EM QUALQUER FASE',
    itens: [
      'O jogo mede o FPS de verdade e, se o aparelho não segura 60, baixa a resolução sozinho (2x → 1,5x → 1x; bem lento, vai direto a 1x) em cerca de 1 segundo. Não volta a subir enquanto o jogo estiver aberto.',
      'O cenário 3D das fases é desenhado em resolução 1x: mandar uma imagem 4 vezes maior para a placa de vídeo a cada quadro era o que mais travava no celular.',
      'Se mesmo assim faltar FPS, o cenário passa a ser atualizado a cada 2 ou 3 quadros (a câmera anda devagar, quase não se nota).',
      'Medido nas 11 fases com Goku, Broly, Freeza e Gotenks, e com formas transformadas: 57 a 60 FPS.',
    ],
  },
  {
    versao: '0.124',
    titulo: 'SPRITES SEM CORTES E SEM PISCAR',
    itens: [
      'Nenhum sprite passa mais da moldura: voos e o Freeza 3ª forma apareciam com a cabeça cortada.',
      'Saíram 10 quadros quebrados (só pedaços) que faziam personagens piscarem: Freeza ciborgue parado, Broly, Buu, Cell, Gohan, Piccolo, Vegetto e outros.',
      'Linhas soltas que sobravam na borda de alguns voos (Piccolo, Vegeta) foram apagadas.',
    ],
  },
  {
    versao: '0.123',
    titulo: 'SUPER 17, KIBITOSHIN E SPRITES REFEITOS',
    itens: [
      'Androide 17 ganhou a transformação Super 17 e o Supremo Sr. Kaio ganhou a fusão Kibitoshin, com todos os movimentos.',
      'Freeza 3ª forma redesenhado (sem nariz e com a postura certa) e as transformações do Freeza sem quadros cortados ao meio.',
      'Voos refeitos sem os braços para cima em vários personagens; Trunks Fúria com a aura azul rente ao corpo; Gohan criança e os últimos movimentos do Piccolo redesenhados.',
      'Tiras limpas: sumiram as linhas que apareciam entre os quadros e os quadros com dois bonecos ou só pedaços.',
    ],
  },
  {
    versao: '0.122',
    titulo: 'FASES DO MODO HISTÓRIA ABREM NO CELULAR',
    itens: [
      'No celular, tocar numa fase do mapa (SINGLE PLAYER) não abria a escolha do modo: o toque era lido no dobro do lugar por causa da tela de alta resolução. Agora tocar e arrastar o mapa funcionam em qualquer celular.',
      'Na tela ATUALIZAÇÕES, arrastar a lista também rola na velocidade certa no celular.',
    ],
  },
  {
    versao: '0.121',
    titulo: 'O JOGO NOVO ENTROU NO AR',
    itens: [
      'O Saiyan Fight agora é o jogo refeito (Phaser + TypeScript): carrega mais rápido, imagens em atlas e funciona sem internet no app.',
      'Modo história com as 11 fases, o mapa em perspectiva igual ao do jogo antigo, ondas, minions e itens; 1 jogador contra a CPU e VERSUS com as 11 arenas.',
      'Menus, OPÇÕES (controles PC, touch e joystick, áudio, trilhas, idiomas, TV), PERSONAGENS, ARENAS, RANKING e as 57 CONQUISTAS iguais aos do jogo antigo.',
      'EDITOR DE PERSONAGENS e EDITOR DE ARENAS refeitos no jogo novo (não abrem mais o jogo antigo): sprite sheet, quadros de cada movimento, transformações, cores; planta e prévia 3D da arena, céu, chão, clima, música, desfazer/refazer e TESTAR.',
      'Os personagens e arenas que você criou no jogo antigo aparecem nos editores e nas lutas; ao editar, uma cópia fica no novo e o original não muda. EXPORTAR e IMPORTAR usam o mesmo arquivo do jogo antigo.',
      'TUTORIAL com escolha do lutador e da forma, e TUTORIAL LIVRE: uma arena de treino sem passos para testar os botões à vontade (sai por PAUSA → SAIR PARA MENU).',
      'As escolhas, conquistas, ranking e fases vencidas no jogo antigo continuam valendo aqui; o jogo antigo não é alterado.',
      'A setinha ATUALIZAR continua aqui: o app só se atualiza quando você aperta.',
      'O jogo antigo continua no site: botão JOGO ANTIGO no menu (e em ATUALIZAÇÕES).',
    ],
  },
];
