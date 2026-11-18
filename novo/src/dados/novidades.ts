// Novidades de cada versão (a janela UPDATES do jogo antigo, agora a tela ATUALIZAÇÕES). A mais nova primeiro;
// a primeira é sempre a versão do package.json (tests/atualizacao.test.ts confere). Como no jogo antigo, as notas
// ficam só em português. Embaixo, a tela mostra todo o histórico do jogo antigo (0.1 a 0.120).
// As prévias do jogo novo (0.1 a 0.6 dentro de novo/, antes de ele entrar no ar) estão resumidas na 0.121.
export interface Novidade { versao: string; titulo: string; itens: string[] }

export const NOVIDADES: Novidade[] = [
  {
    versao: '0.150',
    titulo: 'PICCOLO SEM CAPA ENCORPADO E QUADROS LIMPOS',
    itens: [
      'Piccolo sem capa: o desenho era bem mais magro que o da primeira forma e parecia esticado. Agora tronco, braços e pernas estão 20% mais largos em todos os quadros (a cabeça e a altura ficam iguais), e o especial sai da mão no lugar certo.',
      'Quadros que atrapalhavam a animação foram tirados: Bardock SSJ (parado), Piccolo (carregar ki, uma pose de pulo no meio), Freeza final (carregar ki, quadros só com pedaços), Trunks Fúria (parry) e Kaioshin (voo).',
    ],
  },
  {
    versao: '0.149',
    titulo: 'ARREMESSADO PELO ÚLTIMO GOLPE',
    itens: [
      'Quem é derrotado agora é arremessado para trás pelo impacto do último golpe, numa curva, e sai da tela (como os minions arremessados, mas sem girar). O especial joga mais forte.',
    ],
  },
  {
    versao: '0.148',
    titulo: 'DERROTA SEM TRANSLÚCIDO',
    itens: [
      'Quem é derrotado não fica mais translúcido: é jogado para trás e sai voando da tela, como o vilão quando uma leva é derrotada.',
    ],
  },
  {
    versao: '0.147',
    titulo: 'QUALIDADE DE VIDA',
    itens: [
      'Pausa com REINICIAR (recomeça a luta ou a fase na hora) e LISTA DE GOLPES (cada ação com a tecla e o botão do controle de agora, e o que ela faz).',
      'A escolha do lutador abre no último que você usou (o adversário também) e a tela de arenas na última arena. Botão ESCOLHER embaixo do lutador grande (tocar nele também escolhe).',
      'Nova tela OPÇÕES → JOGO: DIFICULDADE DA CPU (FÁCIL, NORMAL, DIFÍCIL) no 1 JOGADOR x CPU, TAMANHO DO TEXTO (NORMAL ou GRANDE) e TREMOR E CLARÕES (para desligar o tremor da tela e os clarões da luta).',
      'O volume de efeitos e de música agora mostra uma barra.',
      'Se o controle desconectar no meio da luta, ela pausa sozinha.',
      'Ao liberar uma transformação, o aviso de conquista mostra o lutador: primeiro a silhueta, depois colorido.',
      'O quadro "i" de PERSONAGENS mostra quantas lutas e vitórias você tem com ele e quantas formas já liberou.',
    ],
  },
  {
    versao: '0.146',
    titulo: 'CORREÇÕES DO MENU NOVO',
    itens: [
      'Os botões inclinados do menu só respondiam na parte de cima: o toque parecia não funcionar na primeira vez. Agora o botão inteiro responde.',
      'Ao voltar de uma tela para o menu, o lutador grande sumia. Agora ele continua lá.',
      'Na escolha do lutador (e no tutorial), o lutador em foco não muda mais de tamanho quando começa a animar: fica sempre na altura dele, e os muito altos param no limite do quadro.',
    ],
  },
  {
    versao: '0.145',
    titulo: 'ABERTURA MAIS LEVE',
    itens: [
      'O motor do jogo ficou um terço menor (só com as partes que o jogo usa): menos para baixar e o jogo abre mais rápido no celular.',
      'O histórico das versões antigas só é baixado ao abrir ATUALIZAÇÕES.',
      'Em aparelho que não segura 60 fps, a faixa de transição e as faíscas do menu se desligam junto com a resolução.',
    ],
  },
  {
    versao: '0.144',
    titulo: 'POLIMENTO',
    itens: [
      'Escolha do lutador no mesmo visual das outras telas: a grade à direita e, à esquerda, o lutador em foco grande e animado. O escolhido pelo jogador 1 fica marcado com 1P.',
      'Antes da luta (1 JOGADOR x CPU e VERSUS), uma tela de VERSUS com os dois lutadores. Toque para pular.',
      'Na luta: o pedaço de vida perdido fica branco e escorre, a última vida pulsa, e o golpe que fecha a rodada fica em câmera lenta.',
      'PERSONAGENS com os lutadores maiores; CONQUISTAS com mais contraste nas que faltam e uma barra de progresso; os botões dão um clarão ao tocar.',
    ],
  },
  {
    versao: '0.143',
    titulo: 'MENU NOVO',
    itens: [
      'Menu principal novo: um lutador grande com aura à esquerda (sorteado entre as formas que você já liberou, troca a cada poucos segundos; toque nele para soltar um golpe) e os botões em lâminas inclinadas à direita, com o JOGAR maior. RANKING, CONQUISTAS e OPÇÕES viraram botões redondos com ícone.',
      'ESCOLHA SEU CAMINHO agora tem três cartões altos com os lutadores: SINGLEPLAYER, 1 JOGADOR x CPU e VERSUS.',
      'Ao trocar de tela, uma faixa de energia passa pela tela.',
    ],
  },
  {
    versao: '0.142',
    titulo: 'ATAQUE SEM TRAVAR',
    itens: [
      'Apertando ATAQUE várias vezes, o personagem ficava parado no primeiro quadro do golpe. Agora o movimento do golpe vai até o fim e continua a cada novo tiro, sem travar.',
    ],
  },
  {
    versao: '0.141',
    titulo: 'TRANSFORMAÇÕES PARA DESCOBRIR',
    itens: [
      'As transformações que você ainda não fez numa luta aparecem só como silhueta (com ???) no quadro "i" do personagem. Depois de se transformar a primeira vez, ela aparece.',
      'Cada transformação de cada personagem virou uma conquista (33 novas: bronze na 1ª transformação, prata na 2ª, ouro nas seguintes).',
      'No TUTORIAL e no TUTORIAL LIVRE só dá para escolher e se transformar nas formas já feitas. Sem nenhuma, o passo TRANSFORMAR é pulado.',
      'O botão "i" dos cartões agora é redondo, com contorno laranja como o botão de voltar e o "i" bem no centro. A linha embaixo do nome no quadro das formas ficou maior e mais clara.',
    ],
  },
  {
    versao: '0.140',
    titulo: 'TRILHAS SONORAS SEM TEXTO POR CIMA',
    itens: [
      'Na tela TRILHAS SONORAS, a frase azul do topo e o aviso vermelho de áudio mutado ficavam por cima das músicas. O quadro cresceu e a lista ficou entre os dois, sem nada sobreposto.',
    ],
  },
  {
    versao: '0.139',
    titulo: 'ESCOLHA MAIS LIMPA E SEM PISCAR NO COMEÇO',
    itens: [
      'Na escolha do personagem aparece só o nome (saíram o alinhamento, o golpe e a lista de formas).',
      'Ao começar a luta (e cada rodada) os lutadores não ficam mais piscando: a proteção do começo continua, mas sem piscar. Piscar agora só quando o lutador é atingido.',
    ],
  },
  {
    versao: '0.138',
    titulo: 'APP PARA WINDOWS',
    itens: [
      'Saiu o Saiyan Fight para computador com Windows: um instalador (Saiyan-Fight-PC.exe) que cria o ícone na área de trabalho. O jogo vai dentro do app, abre sem internet, em janela própria (F11 = tela cheia) e com a imagem na resolução do monitor.',
      'O app de PC se atualiza como o do celular: pela setinha ⟳ ATUALIZAR em ATUALIZAÇÕES, baixando só o jogo (com os MB reais em tempo real), sem baixar o instalador de novo. Se uma versão nova não abrir, ele volta sozinho para a anterior.',
      'Jogando pelo site num PC com Windows, a tela ATUALIZAÇÕES mostra o botão BAIXAR APP PC.',
    ],
  },
  {
    versao: '0.137',
    titulo: 'IMAGEM NÍTIDA NO COMPUTADOR (ATÉ FULL HD)',
    itens: [
      'No computador o jogo era desenhado pequeno e esticado para a tela (ficava pixelado). Agora ele é desenhado na resolução do monitor: Full HD (1920 de largura), HD e até 4K (no máximo 3x), com textos, menus, mapa e cenários nítidos.',
      'O cenário 3D das lutas também fica em 2x no computador. Se o PC não segurar 60 FPS, a resolução baixa sozinha, como no celular.',
    ],
  },
  {
    versao: '0.136',
    titulo: 'SEM TEXTO NO MEIO DA LUTA',
    itens: [
      'Saíram os textos que apareciam no meio da tela durante a luta: nome da transformação, ZENKAI!, SUPER ATAQUE!, pontos ao derrubar o vilão, nome do item, AGARRADO!, onda nova, nome da fase no começo, FASE COMPLETA/FIM DE JOGO e TUTORIAL LIVRE. Os efeitos (brilho, tremida, partículas) continuam.',
      'Só o VERSUS e o 1 JOGADOR x CPU continuam mostrando RODADA / LUTEM! e quem venceu a rodada, entre uma rodada e outra.',
    ],
  },
  {
    versao: '0.135',
    titulo: 'KAMEHAMEHA PARA A FRENTE E AURA AMARELA',
    itens: [
      'No TUTORIAL e no TUTORIAL LIVRE o especial (Kamehameha e os outros raios) ia para trás, na direção do adversário escondido fora da tela. Agora, sem adversário, o raio sai reto para a frente.',
      'A aura é sempre a da forma em que o lutador está: o Goku Super Saiyajin 3 ficava com a aura azul da forma normal quando o poder da transformação acabava. Todo Super Saiyajin agora tem aura amarela.',
    ],
  },
  {
    versao: '0.134',
    titulo: 'SÓ UMA VERSÃO NA TELA',
    itens: [
      'A tela ATUALIZAÇÕES mostra só a versão do jogo (ex.: VERSÃO 0.134). O número do build e a versão do app, que confundiam, saíram da tela.',
    ],
  },
  {
    versao: '0.133',
    titulo: 'DOWNLOAD REAL EM TEMPO REAL (APP NOVO)',
    itens: [
      'Ao atualizar, a tela mostra os MB que estão sendo baixados de verdade, em tempo real (antes o app só avisava de 10 em 10% e parava em 70%). Depois do download aparece INSTALANDO... e o jogo reinicia na versão nova.',
      'Para isso o próprio app Android mudou: a setinha ⟳ ATUALIZAR vai oferecer BAIXAR o APK novo uma vez. É só instalar por cima: personagens, progresso e conquistas continuam salvos. Daí em diante as atualizações voltam a vir pela setinha.',
    ],
  },
  {
    versao: '0.132',
    titulo: 'DOWNLOAD EM MB',
    itens: [
      'O progresso da atualização mostra o tamanho na unidade certa: KB até 1 MB, depois MB e, se um dia passar de 1 GB, GB (ex.: BAIXANDO... 4,5 MB DE 22,6 MB (20%)).',
    ],
  },
  {
    versao: '0.131',
    titulo: 'SETA DE VOLTAR CENTRALIZADA',
    itens: [
      'A seta ← dos botões de voltar ficava baixa no botão (a letra da fonte varia em cada celular). Agora ela é desenhada e fica sempre no meio do botão, em todas as telas.',
    ],
  },
  {
    versao: '0.130',
    titulo: 'ATUALIZAR MOSTRA QUANTO JÁ BAIXOU',
    itens: [
      'No app, enquanto a versão nova baixa, a tela ATUALIZAÇÕES mostra os KB já baixados, o total e a porcentagem, mudando conforme baixa (ex.: BAIXANDO... 12.288 KB DE 24.576 KB (50%)).',
      'Vale a partir da próxima atualização depois desta (é a versão nova que mostra o progresso).',
    ],
  },
  {
    versao: '0.129',
    titulo: 'AVISO DE VERSÃO NOVA NA ESFERA',
    itens: [
      'Quando sai uma versão nova, aparece uma bolinha vermelha com "!" na esfera de 4 estrelas do menu e no botão UPDATES.',
      'O jogo confere sozinho ao abrir o menu (no máximo a cada 10 minutos), mas não baixa nada: no app, atualize pela setinha ⟳ ATUALIZAR; no site, a tela ATUALIZAÇÕES mostra o botão RECARREGAR.',
    ],
  },
  {
    versao: '0.128',
    titulo: 'O JOGO NOVO NÃO PRECISA MAIS DO ANTIGO',
    itens: [
      'O jogo antigo (HTML/JS) foi apagado: tudo o que ele tinha já está aqui (história, VERSUS, mapa 3D, arenas, editores, tutorial, conquistas, ranking, opções, controle, TV).',
      'Saíram os botões JOGO ANTIGO do menu e da tela ATUALIZAÇÕES.',
      'O que você salvou no jogo antigo (personagens e arenas criados, fases vencidas, conquistas, ranking, opções) continua aparecendo aqui.',
    ],
  },
  {
    versao: '0.127',
    titulo: 'OK DOS AVISOS NÃO ABRE MAIS OUTRA TELA',
    itens: [
      'Em OPÇÕES, apertar OK no aviso do TRANSMITIR PARA A TV abria a tela de IDIOMAS (o toque passava para o botão que estava embaixo). Agora volta só para as OPÇÕES.',
      'Vale para todos os avisos do jogo: o toque ou clique na janela nunca chega aos botões de trás.',
    ],
  },
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
