// Novidades de cada versão (a janela UPDATES do jogo antigo, agora a tela ATUALIZAÇÕES). A mais nova primeiro;
// a primeira é sempre a versão do package.json (tests/atualizacao.test.ts confere). Como no jogo antigo, as notas
// ficam só em português. Embaixo, a tela mostra todo o histórico do jogo antigo (0.1 a 0.120).
// As prévias do jogo novo (0.1 a 0.6 dentro de novo/, antes de ele entrar no ar) estão resumidas na 0.121.
export interface Novidade { versao: string; titulo: string; itens: string[] }

export const NOVIDADES: Novidade[] = [
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
