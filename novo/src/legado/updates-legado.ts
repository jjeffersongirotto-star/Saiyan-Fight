// GERADO por novo/scripts/gerar-dados-legado.mjs a partir de index.html (#lista-updates, a janela UPDATES do
// jogo antigo) — NÃO EDITAR À MÃO. Histórico das versões 0.x do jogo antigo, mostrado na tela ATUALIZAÇÕES.
export interface UpdateLegado { versao: string; titulo: string; itens: { tag: string; titulo: string; texto: string }[] }
export const UPDATES_LEGADO: UpdateLegado[] = [
 {
  "versao": "0.120",
  "titulo": "Fim da tela preta no meio da luta",
  "itens": [
   {
    "tag": "CORRIGIDO",
    "titulo": "Tela preta e jogo travado",
    "texto": "Quando o vilão era derrotado por um Saibaman lançado com o parry (ou por um tiro com outros tiros e minions na tela), o jogo travava com a tela preta e sem som. Corrigido, e se acontecer algum outro erro numa luta o jogo continua desenhando em vez de apagar a tela."
   }
  ]
 },
 {
  "versao": "0.119",
  "titulo": "Rival sem transparência e sprites sem figura dupla",
  "itens": [
   {
    "tag": "CORRIGIDO",
    "titulo": "Rival transparente no VERSUS",
    "texto": "Depois de usar a Zenkai (voltar com 1 de vida), o rival ficava meio transparente até o fim da partida. Agora ele pisca só por um instante, como o jogador 1, e nesse instante não leva dano."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Dois lutadores no mesmo quadro",
    "texto": "Alguns quadros vieram cortados com a pose vizinha junto, e por um instante parecia ter dois personagens em campo (Vegeta SSJ parado, Trunks SSJ voando, Vegetto SSJ subindo, Gohan SSJ2, Androide 17, Black Freeza e Freeza forma final). Cada quadro agora tem só o lutador, no mesmo lugar dos outros."
   }
  ]
 },
 {
  "versao": "0.118",
  "titulo": "Lutadores sempre prontos: sem piscar, sem travar ao escolher e ao transformar",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Personagens sempre carregados na luta",
    "texto": "O herói, o vilão e o minion da fase ficam prontos antes de a luta começar (aparece CARREGANDO por um instante quando precisa). Cada lutador já fica com a próxima transformação pronta, e ao transformar a seguinte começa a ser preparada na hora: nada carrega no meio da luta."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Personagem piscando na fase",
    "texto": "Quando o jogo ajustava a resolução no meio da luta (ou a tela girava), os desenhos eram refeitos e o personagem piscava ou congelava. Agora ele continua com o desenho pronto até o novo ficar pronto."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Escolher personagem e abrir o jogo mais rápido",
    "texto": "Os sprites de cada personagem agora ficam em um arquivo por forma: o jogo baixa só as formas que vai usar (antes baixava todas, até 6 MB de uma vez). Os desenhos são preparados direto da imagem, mais leve para o celular, e as formas que saem da luta liberam a memória."
   }
  ]
 },
 {
  "versao": "0.117",
  "titulo": "Correções na vitória, no ritmo do tiro e no VERSUS",
  "itens": [
   {
    "tag": "CORRIGIDO",
    "titulo": "Vitória de verdade",
    "texto": "Quando o chefe (ou o rival no VERSUS) já caiu, um tiro atrasado ou um Saibaman não pode mais tirar a sua vitória. Vale em qualquer onda e também no VERSUS."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Tiro no teclado no mesmo ritmo",
    "texto": "Segurar a tecla de ataque (a do jogador 1 ou a do jogador 2) agora atira no mesmo ritmo do toque e do controle, uns 5 tiros por segundo. O clique do mouse continua sendo um tiro por clique."
   },
   {
    "tag": "MELHORADO",
    "titulo": "VERSUS mais justo",
    "texto": "Os dois lutadores começam com a mesma vida, o especial de um não derruba o outro com a vida cheia, e a Zenkai (voltar com 1 de vida uma vez por partida) vale para os dois."
   }
  ]
 },
 {
  "versao": "0.116",
  "titulo": "Gohan criança de verdade e formas novas do Piccolo e do Trunks",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Piccolo sem capa e Piccolo Laranja",
    "texto": "O Piccolo agora tem duas transformações: primeiro ele arranca o turbante e joga a capa pesada fora; depois vira o Piccolo Laranja, maior e mais forte, do filme Super Hero."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Trunks Super Saiyajin Fúria",
    "texto": "O Trunks do Futuro ganhou a forma Super Saiyajin Fúria, do Dragon Ball Super, depois do Super Saiyajin."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Gohan base refeito",
    "texto": "O Gohan na forma base tinha corpo de adulto. Agora é a mesma criança do Super Saiyajin, de cabelo preto e capa, com o mesmo tamanho em todos os movimentos e nas três formas."
   }
  ]
 },
 {
  "versao": "0.115",
  "titulo": "Personagens do mesmo tamanho em todos os movimentos",
  "itens": [
   {
    "tag": "CORRIGIDO",
    "titulo": "Tamanho igual em todos os movimentos",
    "texto": "Em alguns movimentos (voar para cima ou para baixo, ataque, voos na diagonal) o personagem ficava menor do que parado — por exemplo o Vegeta. Todos os personagens e transformações foram conferidos e esses movimentos voltaram ao tamanho certo."
   }
  ]
 },
 {
  "versao": "0.114",
  "titulo": "Gohan do tamanho de criança",
  "itens": [
   {
    "tag": "CORRIGIDO",
    "titulo": "Gohan criança",
    "texto": "O Gohan (saga Cell) agora tem altura de criança (135 cm) em todas as formas: na luta ele fica bem menor que o Goku, o Vegeta e o Broly. O painel \"i\" passou a mostrar a altura de verdade: um personagem baixo aparece menor que um alto, e não mais esticado até o topo da coluna."
   }
  ]
 },
 {
  "versao": "0.113",
  "titulo": "Só sprites, abertura mais rápida",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Só os desenhos novos",
    "texto": "Os bonecos desenhados antigos saíram do jogo: todos os personagens e minions usam só os sprites, e nunca mais aparece o boneco antigo antes do desenho novo. Personagens feitos no antigo construtor saem da lista."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Editor só com sprites",
    "texto": "O editor de personagens não tem mais o CONSTRUTOR nem as cores dos minions: cada personagem é feito com sprites (aba ANIMAÇÕES e conjuntos de sprites). Na aba TRANSFORMAÇÃO cada forma tem nome, aura e altura, e a imagem vem do conjunto de sprites."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "App abre no primeiro toque",
    "texto": "Ao abrir, o jogo não baixa mais os desenhos dos lutadores nem monta bonecos: a tela inicial responde logo. Os desenhos de cada personagem só são preparados quando são usados, sem travar o celular."
   }
  ]
 },
 {
  "versao": "0.112",
  "titulo": "Gohan criança",
  "itens": [
   {
    "tag": "CORRIGIDO",
    "titulo": "Gohan do tamanho certo",
    "texto": "O Gohan Super Saiyajin e Super Saiyajin 2 tinham ficado grandes demais. Voltaram ao tamanho de antes, e o Gohan base agora é menor, com tamanho de criança, como nessa fase do anime."
   }
  ]
 },
 {
  "versao": "0.111",
  "titulo": "Só os desenhos novos",
  "itens": [
   {
    "tag": "CORRIGIDO",
    "titulo": "Goku Super Saiyajin God virado",
    "texto": "Parado, o Goku Super Saiyajin God olhava para o lado contrário das outras formas. Agora olha para o mesmo lado."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Bonecos antigos aparecendo",
    "texto": "Ao abrir o \"i\" de um personagem (ou começar uma luta), os bonecos desenhados antigos apareciam por um instante antes dos desenhos novos. Agora só aparecem os desenhos novos: enquanto carregam, fica a forma base parada ou o espaço vazio."
   }
  ]
 },
 {
  "versao": "0.110",
  "titulo": "Formas novas: God, Instinto Superior, Ego Superior e mais",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Formas novas",
    "texto": "Goku ganhou o Super Saiyajin God (cabelo vermelho) e o Instinto Superior; Vegeta ganhou o Super Saiyajin God e o Ego Superior; Vegetto agora vira Super Saiyajin e Super Saiyajin Blue; Gotenks ganhou o Super Saiyajin 3; e Bardock agora vira Super Saiyajin. Todas com desenhos novos nos 14 movimentos."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Vegeta sem ombreiras",
    "texto": "Só o Vegeta normal usa as ombreiras grandes; nas outras formas ele usa a armadura do Dragon Ball Super. As transformações aparecem com o nome certo (Super Saiyajin, Super Saiyajin 3...)."
   }
  ]
 },
 {
  "versao": "0.109",
  "titulo": "Formas do mesmo tamanho",
  "itens": [
   {
    "tag": "CORRIGIDO",
    "titulo": "Gohan base muito grande",
    "texto": "As formas Super Saiyajin ficavam com o corpo menor que a forma base por causa do cabelo mais alto, e o Freeza forma final, Ciborgue, Golden e Black tinham tamanhos diferentes. Agora Goku, Gohan, Trunks, Gotenks e Broly têm o corpo do mesmo tamanho em todas as formas (o Broly Lendário continua maior) e as últimas formas do Freeza têm a mesma altura, na luta e no painel das formas."
   }
  ]
 },
 {
  "versao": "0.108",
  "titulo": "Janelas inteiras com o celular em pé",
  "itens": [
   {
    "tag": "CORRIGIDO",
    "titulo": "Tela dividida no UPDATES",
    "texto": "Com o celular em pé (jogo girado), a janela de UPDATES e as outras janelas apareciam só pela metade, com o menu aparecendo na outra metade. Agora a janela ocupa a tela inteira do jogo."
   }
  ]
 },
 {
  "versao": "0.107",
  "titulo": "Baixar o app pelo botão",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "BAIXAR APP",
    "texto": "Jogando pelo navegador, o botão de ATUALIZAR da janela UPDATES vira BAIXAR APP e instala o jogo no celular (ou mostra como instalar pelo menu do navegador). Com o app instalado, ele volta a ser ATUALIZAR e baixa só o que mudou, sem instalar de novo."
   }
  ]
 },
 {
  "versao": "0.106",
  "titulo": "Desenhos novos sempre atualizados",
  "itens": [
   {
    "tag": "CORRIGIDO",
    "titulo": "Vegeta com o desenho antigo",
    "texto": "Em alguns aparelhos o Vegeta (e outros personagens) continuava com os desenhos antigos guardados no navegador. Agora o jogo sempre baixa a versão nova dos desenhos."
   }
  ]
 },
 {
  "versao": "0.105",
  "titulo": "Androide 17 voando em pé",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Androide 17 voando para frente",
    "texto": "O Androide 17 agora voa para frente em pé, com as mangas brancas, como nos outros movimentos."
   }
  ]
 },
 {
  "versao": "0.104",
  "titulo": "Voos refeitos em pé",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Voos em pé",
    "texto": "Piccolo (voando para baixo), Freeza 3ª forma (diagonal para baixo), Freeza forma final (voando para frente e para baixo), Androide 17 (diagonal para baixo), Androide 18 e Gotenks (voando para frente) agora voam sempre em pé, sem deitar nem ficar de cabeça para baixo."
   }
  ]
 },
 {
  "versao": "0.103",
  "titulo": "Todos os personagens com desenhos novos",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Desenhos novos para todos",
    "texto": "Vegeta (4 formas), Piccolo, Freeza (as 7 formas, até o Black Freeza), Trunks, Gohan (3 formas), Supremo Sr. Kaio, Vegetto, Bardock, Androide 17, Androide 18, Majin Buu (Kid Buu e Buu gordo), Raditz, Broly (normal e Lendário), Gotenks (normal e Super Saiyajin) e Cell (as 3 formas) ganharam desenhos novos nos 14 movimentos. Já entram em uso; o desenho antigo de cada um continua no editor (conjunto ORIGINAL)."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Especial sai da mão",
    "texto": "Nos personagens com desenhos novos, o raio do especial sai da mão (ou do brilho) do próprio desenho, e a bola do Freeza nasce em cima do dedo levantado dele."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Goku e minions",
    "texto": "O Goku recebeu voos, rajada de ki e Kamehameha refeitos. O Saibaman e o Cell Jr. agora agarram as pernas do herói sozinhos."
   }
  ]
 },
 {
  "versao": "0.102",
  "titulo": "Goku e minions com desenhos novos (teste)",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Goku com desenhos novos",
    "texto": "O Goku ganhou desenhos novos nas 4 formas (normal, Super Saiyajin, Super Saiyajin 3 e Blue), com 8 quadros em cada um dos 14 movimentos: parado, voos, parry com tapa das costas da mão, rajada de ki, carregar ki, transformação e Kamehameha. Já entram em uso; o desenho antigo continua no editor (conjunto ORIGINAL)."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Saibaman e Cell Jr. novos",
    "texto": "Os minions ganharam desenhos novos, virados para o herói: saltando, voando, investindo com as garras e girando quando são arremessados. Quem trocar as cores do minion no editor continua com o desenho antigo."
   }
  ]
 },
 {
  "versao": "0.101",
  "titulo": "Mais especiais animados",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Especiais animados",
    "texto": "O Broly solta o raio verde, o Raditz e o Bardock o raio vermelho, e o Trunks e o Androide 17 o raio azul com cabeça. Dá para trocar no editor (Animação do especial)."
   }
  ]
 },
 {
  "versao": "0.100",
  "titulo": "Rajada de ki do Freeza com a esfera roxa",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Rajada de ki do Freeza",
    "texto": "O tiro do Freeza agora é a esfera roxa brilhante, saindo da ponta do dedo do braço esticado (em todas as formas). O tiro rosa fino continua como opção no editor."
   }
  ]
 },
 {
  "versao": "0.99",
  "titulo": "Sol do Freeza acima do dedo",
  "itens": [
   {
    "tag": "CORRIGIDO",
    "titulo": "Bola de energia do Freeza",
    "texto": "A bola do especial do Freeza agora nasce e cresce inteira acima da ponta do dedo levantado (em qualquer forma), sem cobrir o corpo dele; ao ser empurrada, vai primeiro para a frente e só depois segue até o adversário."
   }
  ]
 },
 {
  "versao": "0.98",
  "titulo": "Poderes e auras novos, ataque do Freeza com o dedo e ordem das fases corrigida",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Poderes animados",
    "texto": "O tiro de ki de todos virou o tiro em pixel azul e laranja; Goku, Gohan, Gotenks, Vegetto e Cell soltam o Kamehameha animado; o PARRY mostra uma onda azul; os minions explodem com a explosão animada; e no choque de especiais do VERSUS um raio de duas pontas liga os dois lutadores."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Freeza ataca com o dedo",
    "texto": "Em todas as formas, o tiro sai da ponta do dedo do braço esticado, com um brilho branco e rosa. No especial ele levanta o dedo, uma bola de energia parecida com um sol nasce pequena em cima dele e cresce, e ele empurra a bola com o dedo até o adversário; o dano entra quando ela chega. Nova opção POSIÇÃO DOS BRAÇOS: Dedo (ataque do Freeza)."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Auras Blue e aura roxa",
    "texto": "O Goku ganhou a forma Super Saiyajin Blue e o Vegeta passou a ter Super Saiyajin, Blue e Blue Evolução, com a aura de chama azul (e azul escura na forma nova do Vegeta). A aura roxa (Freeza, Raditz) voltou animada."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Escolha das animações no editor",
    "texto": "Na aba DADOS do editor de personagens dá para escolher a animação do tiro, do especial e da aura de cada personagem entre todas as do jogo (as novas e as que já existiam). Sem escolha, cada um usa o seu padrão. A escolha também vai no arquivo do personagem."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Pose do especial presa depois do tutorial",
    "texto": "Depois de terminar o tutorial, soltar o especial deixava o personagem preso naquela pose; agora ele volta a se mexer normalmente."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Mudar a fase de lugar",
    "texto": "Em ARENAS, levar uma fase da posição 10 para a 8 agora empurra as outras: a 8 vira 9 e a 9 vira 10 (antes só trocava a 8 com a 10)."
   }
  ]
 },
 {
  "versao": "0.97",
  "titulo": "Editor de Arenas: maquete, sombra da peça, fundir de verdade e clima lava",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Planta virou maquete",
    "texto": "O mapa pequeno mostra cada peça vista de cima com o formato e a cor dela, o chão do tipo da arena, as peças do céu (planetas, sol, nuvens...) num anel em volta, na direção em que aparecem, e para onde a câmera está olhando. Tem zoom: roda do mouse, dois dedos no celular e os botões + − ⟲ (com zoom, arraste com o botão direito ou Shift)."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Sombra do espaço da peça",
    "texto": "Com uma peça pronta para colocar, a sombra do espaço exato que ela vai ocupar segue o mouse (no celular, o dedo) e fica verde se o lugar estiver livre ou vermelha se estiver ocupado; a peça entra ao soltar. A peça escolhida mostra o contorno real dela, não mais um círculo."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Peça pronta sem confirmar",
    "texto": "Tocar numa peça da lista já deixa ela pronta para colocar (saiu o CONFIRMAR PEÇA); dá para girar e ajustar tamanho e cor antes de colocar. CANCELAR desliga. O quadro PEÇA ESCOLHIDA saiu: os ajustes ficam numa barra por cima da tela grande e DADOS DA ARENA ocupa a parte de baixo inteira."
   },
   {
    "tag": "MELHORADO",
    "titulo": "FUNDIR com recorte de verdade",
    "texto": "Só a parte sobreposta das peças fundidas usa a aparência escolhida; o resto de cada peça continua no lugar certo na frente ou atrás."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Clima LAVA",
    "texto": "Céu avermelhado, brasas subindo e gotas de lava caindo, como em Namek prestes a explodir."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Chão, cores e seletor de cor",
    "texto": "O chão some no horizonte como planície (sem a faixa que parecia um muro e tampava os planetas baixos), as cores do chão e do céu ficam iguais às escolhidas, e mexer no seletor de cores não trava mais a tela."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Ataque com as duas mãos",
    "texto": "Na luta, cada ataque continua a sequência de quadros de onde o anterior parou: o Vegeta (e quem tiver ataque alternado nos quadros) volta a atacar com a mão direita e a esquerda."
   }
  ]
 },
 {
  "versao": "0.96",
  "titulo": "Editor de Arenas: pincel de chão, hora do dia e clima",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Pincel de chão",
    "texto": "Aba PINCEL: escolha grama, areia, lava, água, terra ou neve e pinte arrastando na planta ou na tela grande. Cada pincelada conta como 1 peça e pode ter a largura, a cor e o tamanho ajustados, ser espelhada ou desfeita."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Hora do dia",
    "texto": "Em DADOS DA ARENA: DIA, TARDE (céu alaranjado) ou NOITE (céu escuro com estrelas; lampiões, luzes de pista, cristais e lava brilham)."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Clima",
    "texto": "Chuva, neve, neblina ou vento com folhas, na prévia e na luta, com poucas partículas para não pesar no celular."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Tudo também no celular",
    "texto": "Conferido com toques de verdade no celular em pé: escolher várias com o dedo, mover, pintar, arrastar na tela grande e zoom com dois dedos. Os atalhos do PC têm botões equivalentes (inclusive GIRAR -15°)."
   }
  ]
 },
 {
  "versao": "0.95",
  "titulo": "Editor de Arenas: empilhar, fundir, várias peças e conjuntos",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Empilhar e desalinhar",
    "texto": "Uma construção solta em cima de bloco, pilar, prédio ou ringue encaixa sozinha alinhada no topo, sem ficar torta. No quadro da peça, DESALINHAR anda de 10 em 10% (10%, 20%, 30%...) para fazer escadas. Arrastar a peça de baixo leva a pilha junto; tocar de novo na peça de cima escolhe a de baixo."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "FUNDIR (recorte)",
    "texto": "Com FUNDIR ligado, as peças podem se sobrepor e as partes sobrepostas se fundem: você escolhe qual peça dá a cor e a aparência da parte fundida (os números aparecem na planta). Uma peça nova que só encosta na parte fundida segue a escolha; se pegar parte não fundida, o jogo pergunta de novo entre todas."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Várias peças de uma vez",
    "texto": "Arraste um retângulo no vazio da planta para escolher várias peças: arraste para mover todas, GIRAR 15°, DUPLICAR, APAGAR e SALVAR CONJUNTO. ESPELHAR copia a peça ou as escolhidas para o outro lado da arena (↔ lados, ↕ frente/trás ou os dois)."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Conjuntos e lista de peças",
    "texto": "Aba CONJUNTOS com os grupos de peças salvos, para usar de novo em qualquer arena. Aba NA ARENA com todas as peças: 👁 esconde a peça no editor (na luta ela aparece) e 🔒 trava para não mexer sem querer."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Capa da arena",
    "texto": "USAR COMO CAPA guarda a vista atual: a foto do card em ARENAS e o começo da luta mostram a arena desse ângulo."
   }
  ]
 },
 {
  "versao": "0.94",
  "titulo": "Editor de Arenas mais fácil de usar",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Zoom e tela cheia na visualização",
    "texto": "Barra de zoom ao lado de EM MOVIMENTO (que ficou mais baixinha), roda do mouse no PC e dois dedos no celular (afastar aumenta, juntar diminui). Com zoom, arraste o fundo para ver outras partes da arena. MAXIMIZAR deixa a visualização na tela toda e MINIMIZAR volta."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Mexer nas peças direto na tela grande",
    "texto": "Toque numa peça na visualização 3D para escolher e arraste para mover, com a mesma regra da planta (fica vermelha e volta se o lugar estiver ocupado). Com uma peça escolhida na lista, tocar no chão da tela grande coloca ela ali."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Desfazer, refazer e grade",
    "texto": "↶ DESFAZER e ↷ REFAZER guardam os últimos 50 passos (Ctrl+Z e Ctrl+Y no PC). GRADE prende as peças de 20 em 20 e o giro de 15 em 15 graus, para alinhar tudo fácil."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "TESTAR e rascunho",
    "texto": "TESTAR começa uma luta rápida na arena que está sendo editada, sem salvar e sem contar no ranking; ao sair da luta o editor volta como estava. Se o editor fechar sem salvar, a arena fica guardada como rascunho e o jogo pergunta se quer continuar."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Atalhos no PC",
    "texto": "Delete apaga a peça escolhida, R gira (Shift+R para o outro lado), D duplica, G liga a grade e as setas movem a peça (Shift = passo maior)."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Editor de Arenas no celular em pé",
    "texto": "Com o jogo girado para deitado, o editor usa o layout deitado e os toques na planta e na tela grande caem no lugar certo."
   }
  ]
 },
 {
  "versao": "0.93",
  "titulo": "Editor de Arenas em tela inteira, planícies, montes e efeitos",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Editor de Arenas em tela inteira",
    "texto": "A arena aparece grande no canto superior esquerdo; à direita ficam as abas, as peças e a planta; embaixo, os dados da arena e a peça escolhida. No celular cabe tudo na tela, sem barra de rolagem. A caixinha EM MOVIMENTO liga ou para a visualização, e dá para escolher se a arena GIRA ou SEGUE para a frente (também na luta)."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Ver a peça antes de colocar",
    "texto": "Tocar numa peça da lista mostra só ela, grande, com CONFIRMAR PEÇA e CANCELAR. Depois de colocada, a peça escolhida aparece de perto enquanto você ajusta tamanho, giro e cor (VER ARENA volta para a arena inteira)."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Cada peça no seu espaço",
    "texto": "Duas peças não ocupam o mesmo lugar: a peça fica vermelha quando invade outra, não é colocada ali e, se for arrastada para um lugar ocupado, volta para onde estava."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Planícies",
    "texto": "Aba nova com o chão completo de cada fase do jogo: Ilha do Kame, Torneio, Planeta do Sr. Kaioh, Namek, Nave de Freeza, Namek prestes a explodir, Sala do Tempo, Torneio de Cell, Planeta Supremo Kaioh, Plataforma Celestial e Capital do Oeste."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Formatos, montes e efeitos",
    "texto": "Gramado, lago, areia, terra, lava e neve ganham formatos (círculo, oval, feijão, irregular, rio reto e rio em curva) e ALTURA, para fazer montes. Aba EFEITOS com peças que se mexem: coluna de lava, arco de lava, brasas, fumaça, nuvens passando e raio (até 10 por arena). Nova ilha de pedra rachada."
   }
  ]
 },
 {
  "versao": "0.92",
  "titulo": "Editor de Arenas",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "EDITOR DE ARENAS",
    "texto": "No menu da esfera de 4 estrelas: monte sua própria arena com peças tiradas dos cenários do jogo, em abas — CONSTRUÇÃO (paredes, janelas, portas, prédios, domos, torres, pilares, escada, ringue, portão), NAVE (casco, perna de aço, parede com janelas ovais, painel de botões, antena, cápsula, luzes), NATUREZA (coqueiros, ciprestes, árvores, pedras, mesa de pedra, montanha, cristais), CHÃO (gramado, lago, areia, terra, lava, piso, estrada, trilha), CÉU (sol, lua, planetas, nuvens, estrelas, morros, montanhas, cidade ao longe) e ENFEITES (estátua, símbolo, placa com texto, bandeira, lampião, ampulheta, esfera do dragão). Toque na planta para colocar, arraste para mover e ajuste tamanho, giro e cor; a prévia em 3D gira em volta da arena. Escolha também nome, cor, música, minion, altura da câmera, céu e chão."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Arenas criadas no jogo",
    "texto": "A arena salva vira uma fase de verdade: aparece em ARENAS, no mapa e no ranking, sempre liberada, e a câmera dá a volta nela durante a luta, como nas fases 3D. Até 7 arenas criadas, com até 80 peças cada."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Arquivos de arena",
    "texto": "EXPORTAR ARQUIVO baixa a arena num arquivo .arena.json e ANEXAR ARQUIVO coloca no jogo uma arena feita no jogo ou fora dele. Se o arquivo tiver erro, o jogo diz qual. O formato e a lista de peças estão em formatos/LEIA-ME-ARENAS.md, com um exemplo."
   }
  ]
 },
 {
  "versao": "0.91",
  "titulo": "Esfera de 4 estrelas, perfil e arquivos de personagem",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Esfera de 4 estrelas",
    "texto": "No canto superior esquerdo do menu principal, a esfera do dragão de 4 estrelas abre o menu de ajustes: perfil, EDITOR DE PERSONAGENS, EDITOR DE ARENAS (em breve) e UPDATES."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Perfil",
    "texto": "A foto redonda do perfil (por enquanto um lutador carregando ki) e o seu apelido. Tocando na foto aparecem TROCAR FOTO (em breve) e APELIDO."
   },
   {
    "tag": "MELHORADO",
    "titulo": "EDITOR DE PERSONAGENS",
    "texto": "O DATABASE agora se chama EDITOR DE PERSONAGENS e fica no menu da esfera, junto com o UPDATES."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Arquivos de personagem",
    "texto": "No editor, EXPORTAR ARQUIVO baixa o personagem num arquivo .saiyan.json e ANEXAR ARQUIVO coloca no jogo um personagem feito no jogo ou fora dele (do construtor, Minion clássico, quadros soltos ou folha de sprites). Se o arquivo tiver erro, o jogo diz qual. O formato está explicado em formatos/LEIA-ME.md, com exemplos."
   }
  ]
 },
 {
  "versao": "0.90",
  "titulo": "Minions clássicos de volta",
  "itens": [
   {
    "tag": "CORRIGIDO",
    "titulo": "Saibaman e Cell Jr. originais",
    "texto": "Os Minions voltaram a ser os desenhos originais do jogo, com a aparência e os movimentos de antes (brotar da terra, saltar, voar, investir, agarrar e ser arremessado), na luta, no gerenciador e no editor. Quem tinha as versões do construtor recebe os originais de volta, com o mesmo nome."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Editar os Minions clássicos",
    "texto": "No editor, a aba DADOS de um Minion clássico mostra as cores dele (pele, olhos, garras, armadura...) e o botão VOLTAR ÀS CORES ORIGINAIS. Sem trocar nada ele fica exatamente o original."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Novos Minions a partir dos clássicos",
    "texto": "Em \"COMEÇAR A PARTIR DE...\" aparecem Saibaman (clássico) e Cell Jr. (clássico): o Minion novo copia o desenho e os movimentos originais, e você escolhe nome, cores, aura e especial. As peças de minion do construtor continuam disponíveis para outros personagens."
   }
  ]
 },
 {
  "versao": "0.89",
  "titulo": "Capital do Oeste refeita",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Capital do Oeste",
    "texto": "A arena agora é só o quarteirão da Corporação Cápsula: o prédio-domo amarelo alongado com luz e sombra, topo branco com a cúpula pequena, duas fileiras de janelas azuis, porta e letreiro CAPSULE na frente, torrinhas e domos brancos anexos. Em volta, gramado com trilhas e árvores, casinhas redondas, o prédio de teto azul e prédios brancos com janelas, e a rua cercando o quarteirão. Saíram os prédios altos, as torres com esfera e o monotrilho."
   }
  ]
 },
 {
  "versao": "0.88",
  "titulo": "Plataforma Celestial, Capital do Oeste e ranking completo",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Plataforma Celestial",
    "texto": "Nova arena em 3D: o disco flutuando nas nuvens com piso de ladrilhos, borda vinho com triângulos, casco dourado com janelas e a escada com a corda, o palácio de cúpulas douradas, torres-mirante, ciprestes, canteiros e coqueiros. A luta dá a volta ao redor da plataforma, com as nuvens passando embaixo. Música própria."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Capital do Oeste",
    "texto": "Nova arena em 3D: o domo amarelo da Corporação Cápsula com o letreiro CAPSULE no meio do jardim, prédios de teto colorido, casinhas-domo, torres com esfera, o monotrilho azul, ruas e campo com morros. Os lutadores voam por cima e dão a volta na Corporação Cápsula. Música própria."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Ranking completo",
    "texto": "O ranking continua ordenado pela pontuação, mas agora mostra também o tempo total da partida e os golpes sofridos. As abas POR FASE ficam em duas fileiras para caber todas as fases."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Minions do tamanho certo",
    "texto": "Novo porte físico Minion no construtor (baixinho, cabeça grande), usado por Saibaman, Cell Jr. e pela raça Minion, para os minions criados caberem nos movimentos. No gerenciador, Saibaman e Cell Jr. aparecem como no gameplay."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Retrato do vilão da fase",
    "texto": "No quadro da arena e no cartão da fase, o vilão aparece na forma escolhida (por exemplo, o Freeza na forma final), e não mais na forma base."
   }
  ]
 },
 {
  "versao": "0.87",
  "titulo": "Minions no editor",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Criar minions",
    "texto": "No editor, a nova raça Minion e o alinhamento MINION. Peças de minion para qualquer personagem: cabeça de Saibaman, crista de Cell Jr., anéis, manchas e garras nas mãos e nos pés, com cor das veias/manchas e cor das garras à sua escolha."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Minions no gerenciador",
    "texto": "No gerenciador de personagens, os minions ficam embaixo de uma divisão MINIONS. Saibaman e Cell Jr. já vêm prontos para editar. Minions não aparecem para escolher herói ou vilão."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Minion da arena",
    "texto": "O campo MINION das arenas também lista os minions que você criar, e na luta eles aparecem com o próprio desenho, com a mesma mecânica de brotar, agarrar e explodir. Saibaman e Cell Jr. sem edição continuam com o desenho de sempre."
   }
  ]
 },
 {
  "versao": "0.86",
  "titulo": "Arenas configuráveis",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Quadro da arena",
    "texto": "Em ARENAS, tocar numa arena abre um quadro com 3 campos: FASE (o número dela no mapa — ao trocar, ela troca de lugar com a fase que estava naquele número), PERSONAGEM (o vilão e a forma dele) e MINION (Saibaman ou Cell Jr.). SALVAR aplica tudo; CANCELAR desfaz."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Ordem das fases",
    "texto": "A nova ordem vale no mapa, em ARENAS, na liberação das fases, no ranking e nas trilhas. Fase em que você já completou o NORMAL continua liberada, em qualquer posição."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Arquivos das arenas",
    "texto": "Cada arena agora tem o seu arquivo com nome, posição, cor, música, cenário e minion — base para o futuro editor de fases e para anexar fases criadas."
   }
  ]
 },
 {
  "versao": "0.85",
  "titulo": "Ilha do Mestre Kame e mapa em 3D",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Ilha do Mestre Kame",
    "texto": "Nova 1ª fase, em 3D: a Kame House rosa com telhado vinho, letreiro KAME HOUSE, janelinha no telhado, cata-vento de galo e alpendre, coqueiros, arbustos, pedras e a praia. Os lutadores dão a volta na casa enquanto lutam, o mar tem ondinhas e espuma indo e voltando e as nuvens passam devagar. Tem música própria. Quem já tinha progresso ganha a ilha como completada."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Mapa de progresso em 3D",
    "texto": "O mapa agora é visto em perspectiva: céu, horizonte com montanhas e o chão com árvores, casas e pedras em várias distâncias, que passam em velocidades diferentes ao rolar. A estrada fica deitada no chão e as fases flutuam sobre ela. A troca de ambiente acontece aos poucos, ao longo de algumas fases, sem corte."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Forma do vilão da fase com imagens",
    "texto": "Em ARENAS, a escolha da forma do vilão mostra a imagem de cada forma. Com muitas transformações, o quadro rola para o lado (arrastando, com a roda do mouse ou com o controle)."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Piccolo nos VILÕES",
    "texto": "O Piccolo agora é anti-herói e aparece também na aba VILÕES."
   }
  ]
 },
 {
  "versao": "0.84",
  "titulo": "Mapa de progresso e vilão de cada fase",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Mapa de progresso",
    "texto": "A escolha de fase virou um caminho longo no estilo Dragon Ball, que rola para os lados (arrastando, com a roda do mouse, com as setas ou com o controle) e abre na sua fase atual. O cenário muda a cada 10 fases: Terra, Namek, espaço, deserto do Cell, planeta Kaioshin e planeta do Bills. As próximas fases já aparecem escuras, com cadeado, e a primeira delas avisa: ADVERSÁRIOS MAIS FORTES VIRÃO! PREPARE-SE."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Vilão de cada fase",
    "texto": "Em ARENAS, tocar numa fase abre a escolha do vilão dela (só vilões e anti-heróis) e em qual forma ele aparece. Cada fase guarda o seu vilão, mostrado no cartão da fase."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Quadro \"i\" mais limpo",
    "texto": "A altura em cm não aparece mais no quadro de formas; ela fica só nos dados do personagem, no editor."
   }
  ]
 },
 {
  "versao": "0.83",
  "titulo": "Altura dos personagens",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Altura dos personagens",
    "texto": "No editor, a ESCALA virou ALTURA (cm), e cada transformação tem a sua. Na luta o lutador fica do tamanho da sua altura (175 cm = normal), sem esticar e com limite para não ficar grande ou pequeno demais. Vale também para personagens de sprites."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Alturas oficiais",
    "texto": "Os personagens do jogo vêm com a altura de cada um: Piccolo, Broly e Raditz são maiores; Freeza começa pequeno, fica enorme na 2ª forma e menor na 3ª; Cell e Majin Buu mudam de tamanho ao se transformar."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Quadro \"i\" em escala",
    "texto": "No quadro de formas do personagem, cada forma aparece do seu tamanho, com a altura embaixo."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Vegeta voando para trás na diagonal",
    "texto": "Nas diagonais para trás, o Vegeta de sprites agora recua de frente para o inimigo, em vez de ficar de cabeça para baixo."
   }
  ]
 },
 {
  "versao": "0.82",
  "titulo": "Idiomas, minion agarrado e cores do Freeza",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Idiomas",
    "texto": "Em OPÇÕES > IDIOMAS dá para jogar em português, inglês ou espanhol: menus, botões, telas, conquistas, avisos, tutorial e editor. Nomes de personagens e de golpes continuam iguais, e a tradução é adaptada a cada idioma."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Minion agarrado",
    "texto": "Soltar o especial com um Saibaman/Cell Jr. agarrado nas pernas destrói o minion. Com PARRY ele é lançado com força para a frente e, se acertar o vilão, explode e tira 1 de vida dele."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Cores do Golden e do Black Freeza",
    "texto": "No quadro \"i\" dos personagens, o Golden Freeza e o Black Freeza apareciam com as cores da forma final. Agora cada forma mostra suas próprias cores."
   }
  ]
 },
 {
  "versao": "0.81",
  "titulo": "Seleção antes da luta, vilão de frente e escudo maior",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Seleção antes da luta",
    "texto": "Depois de escolher a fase e o modo, abre a SELEÇÃO DE PERSONAGEM para escolher herói e vilão e tocar em LUTAR!. No VERSUS, primeiro o JOGADOR 1 escolhe e em seguida o JOGADOR 2."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Anti-herói ou vilão",
    "texto": "Na aba VILÕES, um vilão pode ser escolhido como ANTI-HERÓI (você joga com ele) ou como VILÃO. Quem já é anti-herói no cadastro aparece aqui só como VILÃO; para jogar com ele, use a aba HERÓIS."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Tela PERSONAGENS",
    "texto": "A tela do menu agora se chama PERSONAGENS e é só para ver. O \"i\" no canto de cada cartão mostra a forma base e todas as transformações em sequência, cada uma com o nome em cima."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Vilão de sprites de frente",
    "texto": "O vilão feito de sprites recortados agora olha para o herói, em vez de ficar de costas."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Vilão parado no canto",
    "texto": "O vilão não fica mais preso no canto só atirando: ele sobe, desce e muda de lugar pela metade dele da arena."
   },
   {
    "tag": "MELHORADO",
    "titulo": "VERSUS: cada um na sua metade",
    "texto": "No VERSUS, o JOGADOR 1 vai só até o meio da tela e o JOGADOR 2 só até o meio vindo da direita."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Escudo maior que a aura",
    "texto": "O escudo da cápsula mede a aura que está sendo desenhada (normal, forte, da transformação ou qualquer outra maior) e fica sempre um pouco maior que ela."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Cadeados do Vegeta",
    "texto": "No conjunto VEGETA SPRITES, transformar repete já a partir do Vegeta transformado, e carregar ki repete os quadros de força sem voltar à pose em pé."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Aura roxa",
    "texto": "A aura roxa (Freeza, Raditz) voltou a ser a labareda desenhada."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Mais leve",
    "texto": "O fundo dos menus é desenhado uma vez só, e os desenhos dos lutadores ficam prontos mais rápido antes da luta."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Trunks de teste removido",
    "texto": "O \"Trunks do Futuro\" com o visual do Goku, criado como teste, foi apagado do jogo."
   }
  ]
 },
 {
  "versao": "0.80",
  "titulo": "Auras, escudo e tiros animados",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Auras animadas",
    "texto": "As auras verde, azul, amarela, vermelha e roxa agora usam animações novas; carregando ki ou com o poder da transformação, aparece a versão forte (maior). As outras cores continuam como antes."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Escudo da cápsula",
    "texto": "A bolha de proteção virou uma esfera azul com raios, animada."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Tiros animados",
    "texto": "Tiros vermelhos/rosa viram uma bola de energia vermelha, os laranja uma bola de fogo e os amarelos um raio amarelo, sempre apontados para onde vão."
   }
  ]
 },
 {
  "versao": "0.79",
  "titulo": "Movimento ESPECIAL e o Galick Ho do Vegeta",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Movimento ESPECIAL",
    "texto": "Na aba ANIMAÇÕES do editor há o movimento ESPECIAL, com tudo o que os outros têm: adicionar, inverter, duplicar, clonar, apagar, arrastar, cadeado, FPS e prévia, também nas formas e conjuntos. Na luta, o lutador usa essa animação ao soltar o especial, tocada do começo ao fim e parando no disparo."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Pose de especial em todos",
    "texto": "Os personagens do jogo e os feitos no construtor ganharam uma animação de especial (mãos juntas, bola de ki crescendo e disparo com os braços esticados), também transformados. Personagens de sprite sheet sem quadros de especial usam os do ATAQUE."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Galick Ho do Vegeta",
    "texto": "O conjunto VEGETA SPRITES ganhou o Galick Ho em 5 quadros, normal e Super Saiyajin."
   }
  ]
 },
 {
  "versao": "0.78",
  "titulo": "Cadeado de repetição e editor de quadros mais fácil",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Cadeado nos quadros",
    "texto": "Toque no cadeadinho no canto de um quadro: a animação toca inteira na 1ª vez e depois repete a partir desse quadro, até o lutador fazer outro movimento. Voltando ao movimento, começa do 1º quadro de novo."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Arrastar quadros",
    "texto": "Segure um quadro e arraste para mudar a posição dele entre os outros (no celular, segure um instante antes de arrastar)."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Duplicar e clonar",
    "texto": "DUPLICAR e DUPLICAR INVERTIDO acrescentam os quadros no fim do movimento de destino, sem apagar os que já estavam lá. CLONAR põe a cópia na última posição."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Quadro escolhido",
    "texto": "O quadro selecionado tem um contorno só (não aparece mais um quadrado dentro do outro)."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Imagem do personagem no editor",
    "texto": "Escolher um conjunto de sprites troca na hora a imagem da aba DADOS, sem precisar fechar e abrir o editor."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Sair da edição de uma forma",
    "texto": "Saindo sem salvar, nada muda; salvando, as mudanças ficam. Nos dois casos, a forma de um conjunto volta para dentro dele (fechado)."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Tamanho dos sprites do Vegeta",
    "texto": "Os quadros maiores (fim da transformação e voo na diagonal, para os lados e para baixo) foram reduzidos: o Vegeta tem o mesmo tamanho em todos os movimentos."
   }
  ]
 },
 {
  "versao": "0.77",
  "titulo": "Conjuntos de sprites valendo na hora",
  "itens": [
   {
    "tag": "CORRIGIDO",
    "titulo": "Escolher um conjunto",
    "texto": "Tocar num conjunto e confirmar já troca o personagem na hora: prévia do editor, cartões do DATABASE e da seleção e a luta (não precisa mais SALVAR PERSONAGEM)."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Formas agrupadas",
    "texto": "As formas que já estão num conjunto azul saem da linha de baixo. Para ver ou editar, toque no ✎ ao lado do conjunto."
   }
  ]
 },
 {
  "versao": "0.76",
  "titulo": "Conjuntos de sprites, Vegeta em sprites e braços cruzados",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Conjuntos de sprites",
    "texto": "Na aba ANIMAÇÕES do editor: o botão dourado ORIGINAL guarda as animações do jogo; monte formas (base e transformações, em ordem), agrupe uma base com a transformação 1 num botão azul e escolha qual usar. O conjunto em uso fica destacado e a luta usa a base e cada transformação dele."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Vegeta em sprites",
    "texto": "O Vegeta ganhou o conjunto azul VEGETA SPRITES, com todos os movimentos desenhados em sprites e o Super Saiyajin de cabelo amarelo e olhos azuis. Ative no editor do Vegeta, aba ANIMAÇÕES."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Posição dos braços",
    "texto": "Nova opção no construtor: braços cruzados, parado e voando, como o Vegeta."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Peças novas no construtor",
    "texto": "Cabelo em chama jogada para trás, armadura curta de ombreiras pequenas, macacão justo, luvas brancas de punho largo e botas brancas de bico dourado."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Lista de quadros",
    "texto": "A fileira de quadros só aparece montando ou editando uma forma, para não mexer sem querer nas animações originais."
   }
  ]
 },
 {
  "versao": "0.75",
  "titulo": "Vegetto, Broly Lendário, Kid Buu, Gotenks e cabelos de Super Saiyajin",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Gotenks",
    "texto": "Personagem novo: cabelo espetado preto no centro e lilás nas laterais, colete Metamoran com gola e ombreiras douradas, calça branca bufante, faixa verde-água e especial SUPER GHOST KAMIKAZE."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Broly Super Saiyajin Lendário",
    "texto": "A transformação do Broly: cabelo verde-limão, olhos brancos, sem armadura e coleira, músculos enormes e cicatrizes."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Buu gordo",
    "texto": "O Majin Buu começa como Kid Buu e se transforma no Buu gordo: capa com nó, colete curto, luvas e botas douradas."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Gogeta virou Vegetto",
    "texto": "Cabelo alto com reflexo vermelho e duas mechas na testa, brincos Potara amarelos, gi azul-escuro sobre camiseta laranja, calça azul-escura, luvas e botas brancas."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Broly (Super)",
    "texto": "Cabelo preto longo e denso, coleira de metal, armadura com gema e ombreiras verdes, calça roxa, manto felpudo na cintura e botas brancas."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Kid Buu",
    "texto": "Pequeno e definido, antena longa, furinhos, sorriso sádico, cinto com fivela M, braçadeiras pretas e calça bufante."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Cabelos de Super Saiyajin no construtor",
    "texto": "5 formatos com mechas contornadas (solto, volumoso, chama compacta e dois Blue). A transformação usa a cor de cabelo escolhida nela (Blue, verde...) em vez do amarelo fixo."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Peças novas no construtor",
    "texto": "Malha gola alta, calça bufante, cor 2 do cabelo, coleira, Potara amarelos, manto na cintura, capa com nó, olhos sem pupila, sorriso sádico, novas botas, luvas e braçadeiras."
   }
  ]
 },
 {
  "versao": "0.74",
  "titulo": "Goku, Vegeta, Trunks e Gohan fiéis às referências",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Gohan com Super Saiyajin e Super Saiyajin 2",
    "texto": "Transformação 1: cabelo amarelo, sem capa e ombreiras. Transformação 2: Super Saiyajin 2 com mechas finas, gi rasgado sem mangas, mais musculoso e raios azulados em volta do cabelo."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Goku",
    "texto": "Kanji 悟 no peito, camiseta azul-marinho com faixa e munhequeiras azul-royal, botas azul-marinho com costura vermelha e cordão amarelo."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Vegeta",
    "texto": "Armadura Saiyajin com ombreiras grandes douradas arqueadas, barriga e abas sobre as coxas, cauda enrolada na cintura e scouter de lente vermelha."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Trunks do Futuro",
    "texto": "Cabelo curto repartido ao meio, jaqueta curta azul-violeta, regata preta, cinto amarelo com fivela, calça preta folgada, botas amarelas e alça turquesa da espada no peito."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Gohan",
    "texto": "Gi roxo sem mangas, faixa e munhequeiras azul-royal, capa com sombra azul-clara e botas de pano dobradas."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Cabeça e tronco do Cell",
    "texto": "Carapaça da cabeça com o mesmo volume dos dois lados, cobrindo as orelhas; no perfeito a placa preta cobre todo o alto da cabeça. Contornos mais suaves no peito e na barriga da 1ª forma e do semi-perfeito."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Peças novas no construtor",
    "texto": "Símbolo Go (悟), scouter vermelho, cabelo Super Saiyajin 2, gi rasgado e botas de pano dobradas. Personagens salvos sem edição passam para o visual novo."
   }
  ]
 },
 {
  "versao": "0.73",
  "titulo": "Golden e Black Freeza, editor de transformações",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Golden Freeza e Black Freeza",
    "texto": "O Freeza ganha a 5ª transformação (Golden: corpo dourado com placas roxas) e a 6ª (Black: corpo preto com placas roxas brilhantes), com o corpo da forma final e as cores do mangá. Quem já tinha o Freeza salvo recebe as duas no fim da lista."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Copiar o corpo de outra transformação",
    "texto": "Na aba TRANSFORMAÇÃO, \"COPIAR O CORPO DE\" escolhe de onde a transformação nova começa: a forma original ou qualquer transformação da lista."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Trocar a raça no construtor",
    "texto": "Trocar a RAÇA agora muda a prévia na hora (volta para a cor de pele da raça). Tirar peças (Nenhum/Nenhuma) numa transformação fica salvo."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Gerenciador de personagens",
    "texto": "Ao rolar, os cartões ficam dentro do quadro e não passam mais por cima do título, do CRIAR NOVO e da seta."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Gi do Piccolo como era",
    "texto": "O \"Gi com faixa na cintura\" volta a ter a blusa roxa. Para o Piccolo sem camisa, com o peito musculoso, use ROUPA DE CIMA \"Nenhuma\"."
   }
  ]
 },
 {
  "versao": "0.72",
  "titulo": "Cell mais fiel e camisa do gi separada",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Cell 1ª forma",
    "texto": "Coroa com duas abas abrindo em V e casco oval preto na testa, ombros em cúpula, placa oval preta no meio do peito, asas abertas com moldura verde e o rabo subindo por cima do ombro, com base anelada bege e ferrão."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Cell semi-perfeito",
    "texto": "Duas pontas altas e finas na cabeça com placa oval roxa na testa, sorriso maligno, ombros enormes, placa preta em V com gema azul sobre a barriga laranja segmentada, botas pretas com ponta laranja, asas curtas fechadas e rabo grosso com anéis laranja."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Cell perfeito",
    "texto": "Pontas mais altas e finas, casco preto-azulado só no alto da cabeça, mãos verdes com manchas, ombros preto-azulados, botas amarelo-ouro e asas longas fechadas descendo como uma capa."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Manchas do Cell",
    "texto": "Manchas orgânicas de formatos e tamanhos variados no lugar das bolinhas iguais."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Gi do Piccolo sem camisa",
    "texto": "A blusa roxa do \"Gi com faixa na cintura\" agora é a CAMISA: escolher \"Nenhuma (pele à mostra)\" deixa o peito à mostra (fica só a faixa). Piccolo e Gohan salvos continuam iguais."
   }
  ]
 },
 {
  "versao": "0.71",
  "titulo": "Cell em 3 formas",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Cell com as 3 formas",
    "texto": "O Cell começa na 1ª forma (capacete de inseto com pontas cruzadas, boca laranja, placa laranja riscada, asas abertas, rabo com ferrão, juntas azuis e pintas pretas) e transforma em semi-perfeito (gigante, chapa preta na cabeça, antebraços e canelas pretos, rabo preto e laranja) e perfeito (verde claro com pintas verde-escuras, rosto claro com contorno amarelo e faixas roxas, peito preto, faixa roxa na cintura, sapatos de ponta)."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Peças do Cell no construtor",
    "texto": "Capacetes do Cell, corpo de bio-androide nas 3 formas, asas de inseto abertas, rabo com ferrão e dois sapatos novos."
   }
  ]
 },
 {
  "versao": "0.70",
  "titulo": "Freeza mais fiel e corpo sem emendas",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Capacetes do Freeza",
    "texto": "1ª e 2ª formas: chapa roxa no alto da cabeça e capacete branco em volta, descendo até o \"fone\" chato sobre a orelha. Na 2ª forma os chifres saem para o lado e sobem, e a chapa é menor."
   },
   {
    "tag": "MELHORADO",
    "titulo": "2ª e 3ª formas",
    "texto": "Carapaça branca descendo até as laterais da barriga, com a faixa rosa acima do short, e ombreiras largas. A 3ª forma tem a cabeça subindo reta com espinhos dos dois lados e risada maligna."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Freeza ciborgue",
    "texto": "Rosto de frente com dois olhos: lente verde no olho da frente, topo da cabeça de metal. Braço direito, ombro direito roxo, gota roxa e metade do peito continuam do Freeza; o resto é metal."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Corpo sem emendas",
    "texto": "Sem o risco entre tronco e pernas, no pescoço, nos pulsos e nos tornozelos, em todos os personagens. Barriga dourada da armadura com contorno escuro suave."
   }
  ]
 },
 {
  "versao": "0.69",
  "titulo": "Freeza em 5 formas, Piccolo e cor da pele",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Freeza com as 5 formas",
    "texto": "O Freeza começa na 1ª forma (armadura com ombreiras douradas, capacete com chifres finos, pele rosada listrada) e cada TRANSFORMAR sobe uma forma: 2ª forma gigante de chifres grandes, 3ª forma de cabeça alongada com espinhos, forma final branca com placas roxas e o Freeza ciborgue de metal."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Peças novas no construtor",
    "texto": "Capacetes e cabeças da raça do Freeza, meia cabeça de metal com lente, armadura com ombreiras douradas, pele rosada listrada, placas brancas, corpo de metal, braçadeiras brancas e pés com garras (com ou sem caneleiras)."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Marcas Namek no Piccolo",
    "texto": "Placas rosadas com estrias nos braços, faixa vermelha no punho, centro do abdômen rosado e estrias no pescoço."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Cor da pele em qualquer raça",
    "texto": "No CONSTRUTOR, escolher uma cor de pele já vale na hora, em qualquer raça (desmarca sozinho \"usar cor padrão da raça\"). Com a opção marcada, a amostra mostra a cor da raça escolhida."
   }
  ]
 },
 {
  "versao": "0.68",
  "titulo": "Músculos e controles",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Músculos estilo Dragon Ball",
    "texto": "Sem camisa: peitoral com volume, gomos do abdômen, oblíquos, bíceps, antebraço, coxa e panturrilha marcados. Com roupa, o tecido marca o peito, os braços e as coxas. A força das marcas segue o porte físico, no editor e na luta."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Novo padrão de teclas do PC",
    "texto": "Jogador 1: setas para mover, mouse esquerdo ataca, S carrega, A transforma, ESPAÇO parry e Q especial. Jogador 2 no teclado numérico: 5/2/1/3 movem, ENTER ataca, NUM ENTER carrega, 9 transforma, 0 parry e 7 especial."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Tela CONTROLE JOYSTICK mais limpa",
    "texto": "SENSIBILIDADE DO ANALÓGICO, sem as linhas de texto embaixo dos botões e com mais espaço abaixo do título."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Personagem do construtor salvo certo",
    "texto": "Mudar o modelo ou o cabelo no CONSTRUTOR e clicar em SALVAR agora salva o que aparece na prévia (antes podia salvar o Goku)."
   }
  ]
 },
 {
  "versao": "0.67",
  "titulo": "Aura limpa e histórico completo",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Sem os riscos da aura antiga",
    "texto": "Saíram os riscos de luz que subiam em volta dos personagens; fica só a aura nova em labareda."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "UPDATES com todo o histórico",
    "texto": "Uma versão para cada atualização do jogo, da primeira (0.1) até esta."
   }
  ]
 },
 {
  "versao": "0.66",
  "titulo": "Tela centralizada",
  "itens": [
   {
    "tag": "CORRIGIDO",
    "titulo": "Jogo centralizado no aplicativo",
    "texto": "Aberto pelo atalho na tela inicial, o jogo fica no centro da tela e não é mais cortado embaixo."
   }
  ]
 },
 {
  "versao": "0.65",
  "titulo": "Notas de versão",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "UPDATES em versões",
    "texto": "Novidades organizadas por versão, com etiquetas coloridas."
   }
  ]
 },
 {
  "versao": "0.64",
  "titulo": "Resolução automática",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "60 FPS na luta",
    "texto": "Se o aparelho não aguentar 60 FPS, o jogo baixa a resolução sozinho."
   }
  ]
 },
 {
  "versao": "0.63",
  "titulo": "Cenários em alta resolução",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Cenários nítidos",
    "texto": "Céus, montanhas, pavilhão, nave e plateia em alta resolução."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Nomes do mapa",
    "texto": "Nomes das fases com fundo escuro, sem letras amassadas."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Tiro do vilão",
    "texto": "Bola de poder do vilão 50% maior."
   }
  ]
 },
 {
  "versao": "0.62",
  "titulo": "Alta resolução",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Imagem nítida",
    "texto": "O jogo desenha na resolução real da tela (até 2x), com personagens em alta resolução."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Cartões de personagem",
    "texto": "Personagem grande e liso nos cartões de SELEÇÃO e DATABASE."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Planetas do Supremo Kaioh",
    "texto": "Lua, gigante gasoso, oceano e um parecido com a Terra."
   }
  ]
 },
 {
  "versao": "0.61",
  "titulo": "Escudo e parry",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Escudo e parry em volta da aura",
    "texto": "Ícones dos itens 30% menores; escudo da cápsula maior que a aura; parry em volta da aura."
   }
  ]
 },
 {
  "versao": "0.60",
  "titulo": "Parry",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Parry sem círculo grande",
    "texto": "O escudo do personagem ficou maior e é a área que rebate."
   }
  ]
 },
 {
  "versao": "0.59",
  "titulo": "Dica do tutorial",
  "itens": [
   {
    "tag": "CORRIGIDO",
    "titulo": "Sem parênteses",
    "texto": "A dica do tutorial com controle mostra só o botão do passo."
   }
  ]
 },
 {
  "versao": "0.58",
  "titulo": "Uma rolagem só",
  "itens": [
   {
    "tag": "CORRIGIDO",
    "titulo": "Rolagem de UPDATES",
    "texto": "Uma barra de rolagem só, e os analógicos rolam a lista."
   }
  ]
 },
 {
  "versao": "0.57",
  "titulo": "ATUALIZAR inteligente",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Só recarrega quando muda",
    "texto": "O ATUALIZAR só recarrega se houver novidade; senão avisa JÁ ESTÁ ATUALIZADO."
   }
  ]
 },
 {
  "versao": "0.56",
  "titulo": "Seleção e controle",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Confirmação na seleção",
    "texto": "SELEÇÃO DE PERSONAGEM pergunta antes de trocar; no VERSUS cada jogador escolhe qualquer personagem."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Opções do controle",
    "texto": "Sensibilidade do analógico (− / +), analógico direito rola UPDATES e o touchpad do PS5 alterna a tela cheia."
   }
  ]
 },
 {
  "versao": "0.55",
  "titulo": "Luta sem textos",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Sem textos na luta",
    "texto": "Pegar um item mostra um ícone rápido em vez de texto."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Derrota e teste de controles",
    "texto": "X ou BOLA voltam ao mapa na derrota; especial do Goku certo no teste."
   }
  ]
 },
 {
  "versao": "0.54",
  "titulo": "Controle nos menus",
  "itens": [
   {
    "tag": "CORRIGIDO",
    "titulo": "Controle detectado",
    "texto": "O controle é detectado também nos menus e não é confundido com PC."
   }
  ]
 },
 {
  "versao": "0.53",
  "titulo": "AUTOMÁTICO",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Entrada acesa",
    "texto": "Com AUTOMÁTICO, a chave da entrada em uso acende sozinha."
   }
  ]
 },
 {
  "versao": "0.52",
  "titulo": "Chaves de modo",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "AUTOMÁTICO / PC / TOUCH / JOYSTICK",
    "texto": "Chaves de modo na tela CONTROLES."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Transmissão e tela",
    "texto": "Aviso com o motivo exato quando não dá para transmitir; tela volta ao lugar depois."
   }
  ]
 },
 {
  "versao": "0.51",
  "titulo": "Padrão PS5 e tutorial por plataforma",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Novo padrão PS5",
    "texto": "Padrão do controle com ícones de todos os botões e janelas navegáveis pelo controle."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Tutorial por plataforma",
    "texto": "Mostra só os comandos de toque, teclado/mouse ou controle, conforme o que estiver em uso."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Transmissão para TV",
    "texto": "Experimental: abre a escolha da TV direto do jogo."
   }
  ]
 },
 {
  "versao": "0.50",
  "titulo": "Controle e TV",
  "itens": [
   {
    "tag": "CORRIGIDO",
    "titulo": "Foco do controle",
    "texto": "O foco não cai mais em alvos escondidos; botão de tela cheia alcançável."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "TRANSMITIR PARA A TV",
    "texto": "Opção que explica como espelhar o jogo na TV."
   }
  ]
 },
 {
  "versao": "0.49",
  "titulo": "Minions e tutorial",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Minions detalhados",
    "texto": "Saibaman e Cell Jr. com desenho mais detalhado."
   },
   {
    "tag": "MELHORADO",
    "titulo": "VERSUS sem minions",
    "texto": "No VERSUS é só um contra o outro."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Tutorial animado",
    "texto": "O tutorial age como a luta: tiros, especial, aura e transformação."
   }
  ]
 },
 {
  "versao": "0.48",
  "titulo": "Botões polidos",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Botões de toque polidos",
    "texto": "Acabamento novo e arrumação do jogador, com VOLTAR AO PADRÃO no editor de HUD."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Goku no teste de controles",
    "texto": "O TESTE DE CONTROLES mostra o Goku respondendo aos comandos."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Grades centralizadas",
    "texto": "SELEÇÃO DE PERSONAGEM e DATABASE com cartões centralizados."
   }
  ]
 },
 {
  "versao": "0.47",
  "titulo": "Botões de toque com ícones",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Ícones nos botões",
    "texto": "Botões de toque com as ilustrações do jogador; sem TRANSF.: com ki cheio o CARREGAR vira TRANSFORMAR."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Pausa no tutorial",
    "texto": "O tutorial pode ser pausado e continua do mesmo passo."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Mapa e cenários",
    "texto": "Mapa de fases centralizado com fotos das fases, lava animada em Namek e Cell Jr. redesenhado."
   }
  ]
 },
 {
  "versao": "0.46",
  "titulo": "Namek, Cell Jr. e vilão",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Namek de lado",
    "texto": "Nas fases de Namek, a câmera anda de lado, na direção dos lutadores."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Cell Jr.",
    "texto": "No Torneio de Cell aparecem Cell Jr. azuis no lugar dos Saibamans."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Agarrão que solta",
    "texto": "Com um Saibaman agarrado, PARRY ou CARREGAR o arremessam para trás."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Vilão transformado",
    "texto": "O vilão usa as transformações do editor e não pisca mais de volta ao normal; cápsula com desenho novo."
   }
  ]
 },
 {
  "versao": "0.45",
  "titulo": "Mais 5 fases em 3D",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Fases em 3D",
    "texto": "Planeta do Sr. Kaioh, Torneio de Artes Marciais, Planeta Supremo Kaioh, Planeta Namek e Namek prestes a explodir em 3D."
   }
  ]
 },
 {
  "versao": "0.44",
  "titulo": "Nave de Freeza 3D",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Nave pousada em Namek",
    "texto": "A câmera dá a volta na nave do Freeza pousada em Namek."
   }
  ]
 },
 {
  "versao": "0.43",
  "titulo": "Torneio de Cell 3D",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Arena do Cell em 3D",
    "texto": "A câmera gira em volta dos lutadores no meio da arena, com pilares, estrada e morros ao fundo."
   }
  ]
 },
 {
  "versao": "0.42",
  "titulo": "Sala do Tempo em perspectiva",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Chão infinito",
    "texto": "Câmera em perspectiva e chão infinito: os lutadores parecem andar em volta do pavilhão."
   }
  ]
 },
 {
  "versao": "0.41",
  "titulo": "Sala do Tempo 3D",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Pavilhão em 3D",
    "texto": "A Sala do Tempo ganha o pavilhão com cúpula, ampulhetas e postes, e a câmera dá a volta nele durante a fase."
   }
  ]
 },
 {
  "versao": "0.40",
  "titulo": "Botão ATUALIZAR",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "ATUALIZAR em UPDATES",
    "texto": "Botão que baixa a versão mais nova do jogo na hora."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Tela cheia no celular",
    "texto": "Ao sair da tela cheia pelo gesto de voltar do Android, o jogo volta para ela no próximo toque."
   }
  ]
 },
 {
  "versao": "0.39",
  "titulo": "Uma música por fase",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "8 músicas",
    "texto": "Cada uma das 8 fases tem a sua música."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Cartões das arenas",
    "texto": "A tela ARENAS mostra a foto do cenário de cada fase."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Aviso de conquista",
    "texto": "Pílula no topo da tela com a medalha saltando."
   }
  ]
 },
 {
  "versao": "0.38",
  "titulo": "Quatro músicas novas",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Músicas diferentes",
    "texto": "Quatro músicas novas e bem diferentes entre si, uma por época."
   }
  ]
 },
 {
  "versao": "0.37",
  "titulo": "Trilhas sonoras",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Tela TRILHAS SONORAS",
    "texto": "Em Opções > Áudio, ouça as músicas das fases."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Saibaman que abraça",
    "texto": "Ele parte para cima ao passar perto e abraça as pernas do herói pela frente."
   }
  ]
 },
 {
  "versao": "0.36",
  "titulo": "Ritmo das músicas",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Músicas no ritmo",
    "texto": "Bateria completa e ritmo firme, sem oscilar quando o jogo atrasa."
   }
  ]
 },
 {
  "versao": "0.35",
  "titulo": "Saibaman, itens e música",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Saibaman do anime",
    "texto": "Brota da terra, salta e voa; se encostar, abraça e explode."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Itens do céu",
    "texto": "Semente dos Deuses, Cápsula, Nuvem Voadora e Bastão Mágico."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Música nas fases",
    "texto": "Músicas originais sintetizadas no clima de cada época."
   }
  ]
 },
 {
  "versao": "0.34",
  "titulo": "Editor mais claro",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Opções do editor",
    "texto": "Capa em NAS COSTAS e opções descritas pela peça, sem nomes de personagens."
   }
  ]
 },
 {
  "versao": "0.33",
  "titulo": "Várias transformações",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Aba TRANSFORMAÇÃO",
    "texto": "Cada personagem pode ter várias transformações em ordem, editadas no próprio construtor; na luta, cada TRANSFORMAR com ki cheio sobe um nível."
   }
  ]
 },
 {
  "versao": "0.32",
  "titulo": "Transformar com ki cheio",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "TRANSFORMAR com ki cheio",
    "texto": "A transformação acontece ao apertar TRANSFORMAR com a barra de ki cheia, gastando o ki todo."
   }
  ]
 },
 {
  "versao": "0.31",
  "titulo": "Início da luta liso",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Preparação nos menus",
    "texto": "O lutador e o rival são preparados nos menus, então o primeiro segundo da luta fica liso."
   }
  ]
 },
 {
  "versao": "0.30",
  "titulo": "Desempenho",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Mais rápido",
    "texto": "Abertura rápida, transformação sem travar, luta e construtor mais leves."
   }
  ]
 },
 {
  "versao": "0.29",
  "titulo": "Opções independentes",
  "itens": [
   {
    "tag": "CORRIGIDO",
    "titulo": "Cada opção muda só a sua parte",
    "texto": "Roupa, camisa, calça e raça mudam só a própria parte, com cores próprias para camisa e calça."
   }
  ]
 },
 {
  "versao": "0.28",
  "titulo": "Construtor de personagem",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Gênero e características",
    "texto": "Construtor com gênero e orelhas, antenas/chifres e marcas separados da raça; cueca ou top automáticos."
   }
  ]
 },
 {
  "versao": "0.27",
  "titulo": "Um estilo só",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Estilo clássico removido",
    "texto": "Fica só o estilo anime; personagens salvos são refeitos no estilo atual."
   }
  ]
 },
 {
  "versao": "0.26",
  "titulo": "Sem piscar",
  "itens": [
   {
    "tag": "CORRIGIDO",
    "titulo": "Personagem sem piscar",
    "texto": "O personagem não pisca mais ao trocar de movimento ou ao transformar."
   }
  ]
 },
 {
  "versao": "0.25",
  "titulo": "Transformação até o fim",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Transformação duradoura",
    "texto": "A transformação dura até o fim da luta; o poder extra e a aura grande duram 15 segundos."
   }
  ]
 },
 {
  "versao": "0.24",
  "titulo": "Cabelo amarelo",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Super Saiyajin na luta",
    "texto": "Os Saiyajins transformados ficam com o cabelo amarelo em todos os movimentos."
   }
  ]
 },
 {
  "versao": "0.23",
  "titulo": "Aura em labareda",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Aura de ki nova",
    "texto": "Aura em forma de labareda em volta do corpo, que cresce ao carregar e fica grande e dourada ao transformar."
   }
  ]
 },
 {
  "versao": "0.22",
  "titulo": "Estilo anime como padrão",
  "itens": [
   {
    "tag": "CORRIGIDO",
    "titulo": "Braços e pernas inteiros",
    "texto": "Sem risco nas juntas em nenhum personagem; o estilo anime vira o padrão do construtor."
   }
  ]
 },
 {
  "versao": "0.21",
  "titulo": "Estilo anime para todos",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Todos em estilo anime",
    "texto": "Todos os personagens redesenhados no estilo anime, com o Cell como personagem novo."
   }
  ]
 },
 {
  "versao": "0.20",
  "titulo": "Cabelo do Goku",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Cabelo do anime",
    "texto": "Espetos no formato do anime, com franja e pontas que balançam com o movimento."
   }
  ]
 },
 {
  "versao": "0.19",
  "titulo": "Goku sem riscos",
  "itens": [
   {
    "tag": "CORRIGIDO",
    "titulo": "Joelho e cotovelo",
    "texto": "Saiu o risco preto que aparecia no joelho e no cotovelo do Goku."
   }
  ]
 },
 {
  "versao": "0.18",
  "titulo": "Goku em estilo anime",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Pixel art estilo anime",
    "texto": "Goku redesenhado com proporções e rosto de anime, sombras recortadas e traço nítido."
   }
  ]
 },
 {
  "versao": "0.17",
  "titulo": "Atualização automática",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Jogo se atualiza sozinho",
    "texto": "Quando sai versão nova, o jogo baixa e recarrega sozinho, nunca no meio da luta ou com uma janela aberta."
   }
  ]
 },
 {
  "versao": "0.16",
  "titulo": "Celular em pé",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Gira sozinho",
    "texto": "Com o celular em pé, o jogo aparece deitado sozinho, sem o aviso \"GIRE O CELULAR\", e os toques continuam no lugar certo."
   }
  ]
 },
 {
  "versao": "0.15",
  "titulo": "Tela cheia no aplicativo",
  "itens": [
   {
    "tag": "CORRIGIDO",
    "titulo": "Sem aviso do Chrome",
    "texto": "Aberto pelo ícone da tela inicial, o jogo já fica em tela cheia sem o aviso do navegador."
   }
  ]
 },
 {
  "versao": "0.14",
  "titulo": "Som de clique",
  "itens": [
   {
    "tag": "CORRIGIDO",
    "titulo": "Clique só nos botões",
    "texto": "O som do menu toca só ao tocar num botão, não em qualquer lugar da tela."
   }
  ]
 },
 {
  "versao": "0.13",
  "titulo": "Cadeado e menus leves",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Cadeado no mapa",
    "texto": "Fases bloqueadas mostram um cadeado dourado, que abre e cai ao liberar a fase."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Editor sem travar",
    "texto": "Editor e menus mais leves no celular: rolar e trocar de aba não trava mais."
   }
  ]
 },
 {
  "versao": "0.12",
  "titulo": "Conquistas divertidas",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Nomes novos",
    "texto": "Conquistas antigas com nomes e descrições mais divertidos."
   }
  ]
 },
 {
  "versao": "0.11",
  "titulo": "VERSUS melhor de 3",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "VERSUS em 3 rodadas",
    "texto": "O modo de 2 jogadores vira VERSUS: quem vencer 2 rodadas ganha a partida."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Novas conquistas",
    "texto": "Conquistas para os modos das fases e uma medalha de diamante."
   }
  ]
 },
 {
  "versao": "0.10",
  "titulo": "Conquistas e tela maior",
  "itens": [
   {
    "tag": "CORRIGIDO",
    "titulo": "Conquistas corrigidas",
    "texto": "\"Do Limiar da Morte à Vitória\" agora pode ser liberada; \"Campeão do Torneio\" só ao vencer o modo NORMAL."
   },
   {
    "tag": "MELHORADO",
    "titulo": "Jogo maior fora da tela cheia",
    "texto": "O jogo ocupa mais espaço na tela, sem rolagem."
   }
  ]
 },
 {
  "versao": "0.9",
  "titulo": "Revisão geral",
  "itens": [
   {
    "tag": "CORRIGIDO",
    "titulo": "Ajustes pequenos",
    "texto": "Cor do tiro igual ao ki de cada personagem, cartões de personagem mais leves e lista de novidades com as mudanças reais."
   }
  ]
 },
 {
  "versao": "0.8",
  "titulo": "Todos os personagens prontos",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "14 personagens iniciais",
    "texto": "Trunks, Gohan, Supremo Sr. Kaioh, Gogeta, Bardock, Androides 17 e 18, Majin Boo, Raditz e Broly se juntam a Goku, Vegeta, Piccolo e Freeza."
   }
  ]
 },
 {
  "versao": "0.7",
  "titulo": "Botões que afundam",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Botões físicos",
    "texto": "Botões afundam ao serem apertados e sobem como uma mola antes da ação acontecer, nos menus, cartões e botões de toque."
   }
  ]
 },
 {
  "versao": "0.6",
  "titulo": "Botões dos menus",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Botões no lugar certo",
    "texto": "As posições de todos os botões dos menus ficam num lugar só: o que é desenhado é exatamente o que responde ao toque."
   }
  ]
 },
 {
  "versao": "0.5",
  "titulo": "Limpeza do código",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Editor mais enxuto",
    "texto": "Sai o sistema antigo de aparência e botões repetidos do editor de personagem."
   }
  ]
 },
 {
  "versao": "0.4",
  "titulo": "Correções da revisão geral",
  "itens": [
   {
    "tag": "CORRIGIDO",
    "titulo": "VERSUS e parry",
    "texto": "O jogador 2 não fica mais preso ao ser derrotado; o golpe rebatido por ele acerta o jogador 1 e conta ponto certo; parry que erra tem uma pequena espera."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Telas de 120 Hz",
    "texto": "Surgimento de inimigos e itens, flutuação e tremor de tela no mesmo ritmo em qualquer tela."
   },
   {
    "tag": "CORRIGIDO",
    "titulo": "Editor",
    "texto": "Apagar o personagem selecionado escolhe outro automaticamente, sem travar."
   }
  ]
 },
 {
  "versao": "0.3",
  "titulo": "Saiyan Fight",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Novo nome e ícone",
    "texto": "O jogo passa a se chamar SAIYAN FIGHT, com ícone do choque de punhos entre Goku e Vegeta."
   }
  ]
 },
 {
  "versao": "0.2",
  "titulo": "Ícone e instalação no celular",
  "itens": [
   {
    "tag": "CRIAÇÃO",
    "titulo": "Instalar no celular",
    "texto": "Com \"Adicionar à tela inicial\", o jogo abre em tela cheia como um aplicativo, com ícone próprio."
   },
   {
    "tag": "CRIAÇÃO",
    "titulo": "Testes automáticos",
    "texto": "A cada atualização, o GitHub confere sozinho se o jogo continua funcionando."
   }
  ]
 },
 {
  "versao": "0.1",
  "titulo": "Organização do projeto",
  "itens": [
   {
    "tag": "MELHORADO",
    "titulo": "Projeto organizado",
    "texto": "Arquivos antigos e duplicados removidos; os testes automáticos do jogo passaram a ficar junto do código."
   }
  ]
 }
];
