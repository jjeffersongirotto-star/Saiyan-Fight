// Novidades de cada versão (a janela UPDATES do jogo antigo, agora a tela ATUALIZAÇÕES). A mais nova primeiro;
// a primeira é sempre a versão do package.json (tests/atualizacao.test.ts confere). Como no jogo antigo, as notas
// ficam só em português.
export interface Novidade { versao: string; titulo: string; itens: string[] }

export const NOVIDADES: Novidade[] = [
  {
    versao: '0.6',
    titulo: 'EDITORES DO JOGO NOVO E TUTORIAL LIVRE',
    itens: [
      'EDITOR DE PERSONAGENS refeito no jogo novo (não abre mais o jogo antigo): nome, alinhamento, cor da aura, ataque especial, cor e animação do tiro e do especial, altura; animação de cada movimento por sprite sheet (arquivo, link ou imagens soltas), com grade, apagar o fundo, escolher quadros, mover, clonar, espelhar e copiar de outro movimento; e as transformações, cada uma com nome, aura, altura e quadros.',
      'EDITOR DE ARENAS refeito no jogo novo: prévia 3D girando, planta para colocar, arrastar e girar as peças (construção, nave, natureza, chão, pincel, planícies, céu, efeitos, enfeites), dados da arena (céu, chão, hora, clima, câmera, música, minion), desfazer/refazer, grade, ver a peça de perto, usar como capa e TESTAR numa luta.',
      'O que você cria agora fica guardado no jogo novo. Os personagens e arenas feitos no jogo antigo aparecem nos editores e nas lutas; ao editar, uma cópia fica no novo e o antigo não muda. EXPORTAR e IMPORTAR ARQUIVO usam o mesmo arquivo do jogo antigo.',
      'TUTORIAL: antes de começar, escolha o lutador e a forma; no passo TRANSFORMAR você se transforma nela.',
      'TUTORIAL LIVRE: uma arena de treino sem passos e sem adversário para testar os botões à vontade (não conta conquistas). Para sair: PAUSA → SAIR PARA MENU.',
    ],
  },
  {
    versao: '0.5',
    titulo: 'TUTORIAL INTERATIVO',
    itens: [
      'TUTORIAL no menu: 7 passos (mover, atacar, carregar, rebater, transformar, especial e pausar), como no jogo antigo. Cada passo só conta quando você faz o comando de verdade.',
      'As instruções mostram as teclas, os botões do controle ou os botões de toque que você usa agora; PULAR passa o passo (no controle, o botão CRIAR).',
      'No fim, VOLTAR AO MENU; até lá dá para continuar treinando à vontade.',
    ],
  },
  {
    versao: '0.4',
    titulo: 'MAPA DE FASES IGUAL AO DO JOGO ANTIGO',
    itens: [
      'O mapa da história agora é o caminho em perspectiva do jogo antigo: céu, horizonte, árvores, pedras e construções de cada trecho, e a estrada dourada até a última fase liberada.',
      'Cada fase mostra a foto da arena, o número, o nome, NORMAL/DIFÍCIL completos e o recorde de onda; as fases futuras aparecem com cadeado e a placa ADVERSÁRIOS MAIS FORTES VIRÃO!.',
      'Arraste o mapa ou use as setas ‹ › para rolar; toque numa fase para escolher NORMAL (ONDAS 1-5), DIFÍCIL ou SEM LIMITE. Ao liberar uma fase, o cadeado abre e cai.',
    ],
  },
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
