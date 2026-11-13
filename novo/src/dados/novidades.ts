// Novidades de cada versão (a janela UPDATES do jogo antigo, agora a tela ATUALIZAÇÕES). A mais nova primeiro;
// a primeira é sempre a versão do package.json (tests/atualizacao.test.ts confere). Como no jogo antigo, as notas
// ficam só em português.
export interface Novidade { versao: string; titulo: string; itens: string[] }

export const NOVIDADES: Novidade[] = [
  {
    versao: '0.3',
    titulo: 'EDITORES DE PERSONAGENS E DE ARENAS',
    itens: [
      'Na esfera do menu, EDITOR DE PERSONAGENS e EDITOR DE ARENAS abrem os editores do jogo antigo, completos, por cima do jogo novo. Toque em VOLTAR AO JOGO NOVO ou saia do editor para voltar.',
      'Os personagens criados no editor (com as formas e transformações) aparecem em PERSONAGENS, na escolha do lutador e na luta.',
      'As arenas criadas no editor aparecem no VERSUS, em ARENAS, no mapa da história (sempre liberadas) e no ranking.',
    ],
  },
  {
    versao: '0.2',
    titulo: 'MENUS E OPÇÕES IGUAIS AOS DO JOGO ANTIGO',
    itens: [
      'Menu principal com o mesmo painel do jogo antigo (JOGAR, PERSONAGENS, ARENAS, OPÇÕES, RANKING, CONQUISTAS, TUTORIAL) e a esfera de 4 estrelas com o perfil e o APELIDO.',
      'OPÇÕES completas: controles PC (trocar teclas, modo mouse), touch (analógico ou deslizar, duplo toque parry, vibração, tiro contínuo, reorganizar botões), joystick (trocar botões, sensibilidade), teste de controles, áudio, trilhas, idiomas e transmitir para a TV.',
      'PERSONAGENS com as formas de cada um, ARENAS (posição da fase, vilão e forma, minion), RANKING geral e por fase e as 57 CONQUISTAS, com o aviso de conquista na tela.',
      'Na luta: controle (gamepad), pausa com OPÇÕES e contagem 3-2-1 no celular.',
      'As escolhas que você já fez no jogo antigo (teclas, volume, idioma, conquistas, ranking, vilões das fases) aparecem aqui na primeira vez; o jogo antigo não é alterado.',
    ],
  },
  {
    versao: '0.1',
    titulo: 'PRÉVIA DO JOGO NOVO',
    itens: ['Base em Phaser + TypeScript, luta VERSUS e contra a CPU, modo história com as 11 fases e as arenas do jogo antigo.'],
  },
];
