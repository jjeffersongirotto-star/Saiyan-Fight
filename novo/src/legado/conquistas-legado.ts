// GERADO por novo/scripts/gerar-dados-legado.mjs a partir de progress.js (achievements) — NÃO EDITAR À MÃO.
// estat/limiar: destrava sozinha quando a estatística chega no limiar (checkThresholdAchievements); sem eles, o jogo
// destrava na hora certa (logica/conquistas.ts), como o unlockAchievement do antigo.
export interface ConquistaLegado { id: string; nome: string; desc: string; medalha: 'bronze' | 'silver' | 'gold' | 'diamond'; estat?: string; limiar?: number }
export const CONQUISTAS_LEGADO: ConquistaLegado[] = [
  {
    "id": "reflect_10",
    "nome": "Devolve pro Remetente",
    "desc": "Rebata 10 bolas de Ki. Obrigado, não quero!",
    "medalha": "bronze",
    "estat": "reflectsTotal",
    "limiar": 10
  },
  {
    "id": "reflect_50",
    "nome": "Escudo Impenetrável",
    "desc": "Rebata 50 bolas de Ki. Aqui não passa nada!",
    "medalha": "silver",
    "estat": "reflectsTotal",
    "limiar": 50
  },
  {
    "id": "reflect_200",
    "nome": "Muralha de Ki",
    "desc": "Rebata 200 bolas de Ki. Pode mandar mais!",
    "medalha": "gold",
    "estat": "reflectsTotal",
    "limiar": 200
  },
  {
    "id": "combo_3",
    "nome": "Pegando o Ritmo",
    "desc": "Rebata 3 seguidas sem errar o compasso",
    "medalha": "bronze",
    "estat": "maxParryCombo",
    "limiar": 3
  },
  {
    "id": "combo_6",
    "nome": "Dançando no Combate",
    "desc": "Rebata 6 seguidas. Parece até coreografia!",
    "medalha": "silver",
    "estat": "maxParryCombo",
    "limiar": 6
  },
  {
    "id": "combo_10",
    "nome": "Reflexo de Saiyajin",
    "desc": "Rebata 10 seguidas. Piscou? Nem precisa!",
    "medalha": "gold",
    "estat": "maxParryCombo",
    "limiar": 10
  },
  {
    "id": "untouchable",
    "nome": "Nem Encostou",
    "desc": "Faça 5 pontos sem levar nenhum arranhão",
    "medalha": "bronze"
  },
  {
    "id": "untouchable_wave5",
    "nome": "Roupa Sem Amassar",
    "desc": "Chegue à onda 5 sem levar nenhum dano",
    "medalha": "silver"
  },
  {
    "id": "zenkai_first",
    "nome": "Saiyajin Não Desiste",
    "desc": "Volte da derrota com a Zenkai pela 1ª vez",
    "medalha": "bronze",
    "estat": "zenkaiTotal",
    "limiar": 1
  },
  {
    "id": "zenkai_win",
    "nome": "Quase Morri, Mas Ganhei",
    "desc": "Use a Zenkai e ainda vença o Versus",
    "medalha": "silver"
  },
  {
    "id": "saibaman_50",
    "nome": "Jardineiro de Saibamen",
    "desc": "Derrote 50 Saibamen. Arranca tudo da terra!",
    "medalha": "bronze",
    "estat": "saibamansDefeated",
    "limiar": 50
  },
  {
    "id": "saibaman_200",
    "nome": "Praga na Plantação",
    "desc": "Derrote 200 Saibamen. Acabou a colheita!",
    "medalha": "silver",
    "estat": "saibamansDefeated",
    "limiar": 200
  },
  {
    "id": "ssj_transform",
    "nome": "Cabelo Arrepiado",
    "desc": "Vire Super Saiyajin pela primeira vez",
    "medalha": "bronze"
  },
  {
    "id": "ssj_10",
    "nome": "Viciado em Dourado",
    "desc": "Transforme-se 10 vezes. Fica bonito, né?",
    "medalha": "silver",
    "estat": "transformsTotal",
    "limiar": 10
  },
  {
    "id": "ssj_boss",
    "nome": "Loiro e Perigoso",
    "desc": "Derrote um vilão estando transformado",
    "medalha": "silver"
  },
  {
    "id": "special_first",
    "nome": "Kame... Hame... HA!",
    "desc": "Solte o ataque especial pela primeira vez",
    "medalha": "bronze"
  },
  {
    "id": "super_attack_first",
    "nome": "Bastão Turbinado",
    "desc": "Use o Super Ataque (especial + bastão mágico)",
    "medalha": "bronze",
    "estat": "superAttacksTotal",
    "limiar": 1
  },
  {
    "id": "super_attack_10",
    "nome": "Exagerado de Poder",
    "desc": "Use o Super Ataque 10 vezes. Sem moderação!",
    "medalha": "silver",
    "estat": "superAttacksTotal",
    "limiar": 10
  },
  {
    "id": "beam_clash_first",
    "nome": "Cabo de Guerra de Ki",
    "desc": "Provoque um Choque de Feixes no Versus",
    "medalha": "bronze",
    "estat": "beamClashesTotal",
    "limiar": 1
  },
  {
    "id": "beam_clash_5",
    "nome": "Guerra de Kamehamehas",
    "desc": "Provoque 5 Choques de Feixes. Aperta, aperta!",
    "medalha": "silver",
    "estat": "beamClashesTotal",
    "limiar": 5
  },
  {
    "id": "item_senzu_10",
    "nome": "Barriga Cheia",
    "desc": "Pegue 10 Feijões Mágicos. Nham!",
    "medalha": "bronze",
    "estat": "pickupsSenzu",
    "limiar": 10
  },
  {
    "id": "item_capsule_10",
    "nome": "Cliente da Cápsula",
    "desc": "Pegue 10 escudos. Segurança em 1º lugar!",
    "medalha": "bronze",
    "estat": "pickupsCapsule",
    "limiar": 10
  },
  {
    "id": "item_cloud_10",
    "nome": "Carona na Nuvem",
    "desc": "Pegue 10 Nuvens Voadoras. Vruum!",
    "medalha": "bronze",
    "estat": "pickupsCloud",
    "limiar": 10
  },
  {
    "id": "item_staff_10",
    "nome": "Estica, Bastão!",
    "desc": "Pegue 10 Bastões Mágicos",
    "medalha": "bronze",
    "estat": "pickupsStaff",
    "limiar": 10
  },
  {
    "id": "item_all_types",
    "nome": "Mochila Completa",
    "desc": "Pegue os 4 tipos de item numa mesma partida",
    "medalha": "bronze"
  },
  {
    "id": "wave_5",
    "nome": "Só Esquentando",
    "desc": "Chegue à onda 5. Isso foi o aquecimento!",
    "medalha": "bronze"
  },
  {
    "id": "wave_10",
    "nome": "Agora Ficou Sério",
    "desc": "Chegue à onda 10",
    "medalha": "silver"
  },
  {
    "id": "wave_15",
    "nome": "Elite Saiyajin",
    "desc": "Chegue à onda 15. O príncipe aprovaria!",
    "medalha": "silver"
  },
  {
    "id": "wave_20",
    "nome": "Lenda Viva",
    "desc": "Chegue à onda 20. Já pode dar autógrafo!",
    "medalha": "gold"
  },
  {
    "id": "wave_25",
    "nome": "Isso Ainda Não É Tudo!",
    "desc": "Chegue à onda 25. Nem o Bills aguenta!",
    "medalha": "gold"
  },
  {
    "id": "score_10",
    "nome": "Abrindo o Placar",
    "desc": "Faça 10 pontos numa partida",
    "medalha": "bronze"
  },
  {
    "id": "score_50",
    "nome": "Caçador de Recompensas",
    "desc": "Faça 50 pontos numa partida. Rende bem!",
    "medalha": "silver"
  },
  {
    "id": "score_100",
    "nome": "Mais de 8000? Que Nada!",
    "desc": "Faça 100 pontos numa partida",
    "medalha": "gold"
  },
  {
    "id": "boss_defeat_10",
    "nome": "Pesadelo dos Vilões",
    "desc": "Derrote 10 chefes. Eles já te conhecem!",
    "medalha": "silver",
    "estat": "bossesDefeated",
    "limiar": 10
  },
  {
    "id": "boss_defeat_50",
    "nome": "Coleção de Vilões",
    "desc": "Derrote 50 chefes. Ninguém mais quer lutar!",
    "medalha": "gold",
    "estat": "bossesDefeated",
    "limiar": 50
  },
  {
    "id": "stage_kame",
    "nome": "Férias na Kame House",
    "desc": "Vença o NORMAL da Ilha do Mestre Kame",
    "medalha": "bronze"
  },
  {
    "id": "stage_terra",
    "nome": "Campeão do Torneio",
    "desc": "Libere o Torneio de Artes Marciais",
    "medalha": "bronze"
  },
  {
    "id": "stage_kaio",
    "nome": "Treino com Piadas Ruins",
    "desc": "Libere o Planeta do Sr. Kaioh",
    "medalha": "bronze"
  },
  {
    "id": "stage_namek",
    "nome": "Turista em Namek",
    "desc": "Libere o Planeta Namek. Leve protetor!",
    "medalha": "bronze"
  },
  {
    "id": "stage_namek_explosao",
    "nome": "Fuga por um Triz",
    "desc": "Libere Namek Prestes a Explodir. Corre!",
    "medalha": "silver"
  },
  {
    "id": "stage_freeza_ship",
    "nome": "Clandestino na Nave",
    "desc": "Libere a Nave de Freeza sem ser visto",
    "medalha": "silver"
  },
  {
    "id": "stage_time_room",
    "nome": "Um Ano em Um Dia",
    "desc": "Libere a Sala do Tempo. Sem relógio!",
    "medalha": "silver"
  },
  {
    "id": "stage_cell_games",
    "nome": "Convidado do Cell",
    "desc": "Libere o Torneio de Cell",
    "medalha": "gold"
  },
  {
    "id": "stage_kaioshin",
    "nome": "Entre os Deuses",
    "desc": "Libere o Planeta Supremo Kaioh",
    "medalha": "gold"
  },
  {
    "id": "stage_plataforma_celestial",
    "nome": "Acima das Nuvens",
    "desc": "Libere a Plataforma Celestial",
    "medalha": "gold"
  },
  {
    "id": "stage_capital_oeste",
    "nome": "Visita à Corporação Cápsula",
    "desc": "Libere a Capital do Oeste",
    "medalha": "gold"
  },
  {
    "id": "hard_first",
    "nome": "Difícil? Não Para Mim",
    "desc": "Vença o modo DIFÍCIL de uma fase pela primeira vez",
    "medalha": "silver"
  },
  {
    "id": "all_normal",
    "nome": "Rodei o Universo Inteiro",
    "desc": "Vença o modo NORMAL de todas as fases",
    "medalha": "gold"
  },
  {
    "id": "all_hard",
    "nome": "Dificuldade? Pouco É Bobagem",
    "desc": "Vença o modo DIFÍCIL de todas as fases",
    "medalha": "gold"
  },
  {
    "id": "versus_win_first",
    "nome": "Rivalidade Saudável",
    "desc": "Vença uma partida do Versus (melhor de 3)",
    "medalha": "bronze",
    "estat": "versusWinsTotal",
    "limiar": 1
  },
  {
    "id": "versus_win_10",
    "nome": "Freguês Garantido",
    "desc": "Vença 10 partidas do Versus. Pede revanche?",
    "medalha": "silver",
    "estat": "versusWinsTotal",
    "limiar": 10
  },
  {
    "id": "builder_first",
    "nome": "Fábrica de Guerreiros",
    "desc": "Crie seu 1º personagem no editor",
    "medalha": "bronze",
    "estat": "customCharactersCreated",
    "limiar": 1
  },
  {
    "id": "builder_5",
    "nome": "Elenco Próprio",
    "desc": "Crie 5 personagens. Dá pra montar um time!",
    "medalha": "silver",
    "estat": "customCharactersCreated",
    "limiar": 5
  },
  {
    "id": "games_5",
    "nome": "Pegou Gosto",
    "desc": "Jogue 5 partidas",
    "medalha": "bronze",
    "estat": "gamesPlayed",
    "limiar": 5
  },
  {
    "id": "games_20",
    "nome": "Só Mais Uma...",
    "desc": "Jogue 20 partidas. Só mais uma, juro!",
    "medalha": "silver",
    "estat": "gamesPlayed",
    "limiar": 20
  },
  {
    "id": "games_50",
    "nome": "Isso É Vida",
    "desc": "Jogue 50 partidas. A luta é sua casa!",
    "medalha": "gold",
    "estat": "gamesPlayed",
    "limiar": 50
  },
  {
    "id": "all_achievements",
    "nome": "Quem Sabe, Sabe",
    "desc": "Complete todas as outras conquistas",
    "medalha": "diamond"
  }
];
