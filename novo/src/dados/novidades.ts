// Novidades de cada versão (a janela UPDATES do jogo antigo, agora a tela ATUALIZAÇÕES). A mais nova primeiro;
// a primeira é sempre a versão do package.json (tests/atualizacao.test.ts confere). Como no jogo antigo, as notas
// ficam só em português.
export interface Novidade { versao: string; titulo: string; itens: string[] }

export const NOVIDADES: Novidade[] = [
  {
    versao: '0.121',
    titulo: 'O JOGO NOVO ENTROU NO AR',
    itens: [
      'O Saiyan Fight agora é o jogo refeito (Phaser + TypeScript): carrega mais rápido, imagens em atlas e funciona sem internet no app.',
      'Modo história com as 11 fases, ondas, minions e itens; 1 jogador contra a CPU e VERSUS com as 11 arenas.',
      'A setinha ATUALIZAR continua aqui: o app só se atualiza quando você aperta.',
      'O jogo antigo continua no site, no botão JOGO ANTIGO (no site, os personagens e o progresso dele continuam lá). As fases que você já venceu no jogo antigo continuam vencidas no novo.',
    ],
  },
  {
    versao: '0.120',
    titulo: 'ÚLTIMA VERSÃO DO JOGO ANTIGO',
    itens: ['Correção da tela preta quando o vilão caía com minions na tela.'],
  },
];
