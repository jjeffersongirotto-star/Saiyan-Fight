// Saiyan Fight (novo): Phaser 3 + TypeScript. Tela lógica 800x350 (a mesma do jogo antigo), sempre deitada,
// esticada para caber na tela sem deformar.
import Phaser from 'phaser';
import { TELA_A, TELA_L } from './logica/constantes';
import { Arenas } from './cenas/Arenas';
import { Atualizacoes } from './cenas/Atualizacoes';
import { AvisoConquista } from './cenas/AvisoConquista';
import { Boot } from './cenas/Boot';
import { FimHistoria } from './cenas/FimHistoria';
import { Luta } from './cenas/Luta';
import { Mapa } from './cenas/Mapa';
import { Menu } from './cenas/Menu';
import { CENAS_OPCOES } from './cenas/Opcoes';
import { Preload } from './cenas/Preload';
import { Selecao } from './cenas/Selecao';
import { CENAS_TELAS } from './cenas/Telas';
import { Trilhas } from './cenas/Trilhas';
import { Vitoria } from './cenas/Vitoria';
import { ESCALA_RENDER, vigiarDesempenho } from './ui/resolucao';
import { vigiarErros } from './app/erros';

const jogo = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'jogo',
  backgroundColor: '#0a0f1f',
  width: Math.round(TELA_L * ESCALA_RENDER),
  height: Math.round(TELA_A * ESCALA_RENDER),
  pixelArt: true, // sprites sem borrar
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, fullscreenTarget: 'jogo' },
  input: { activePointers: 4 },
  audio: { noAudio: true }, // o som é nosso (audio/som.ts); o Phaser não abre outro AudioContext
  fps: { target: 60 },
  // as OPÇÕES vêm depois da Luta: abertas da pausa, ficam desenhadas por cima dela; o aviso de conquista por cima de tudo
  scene: [Boot, Preload, Menu, ...CENAS_TELAS, Mapa, Selecao, Arenas, Luta, Vitoria, FimHistoria, Trilhas, Atualizacoes, ...CENAS_OPCOES, AvisoConquista],
});

vigiarDesempenho(jogo);
vigiarErros(jogo.canvas); // v0.155: faixa vermelha com o erro (o app do PC não tem console à mão)

// para testes no navegador (playwright) e depuração
(window as unknown as { saiyan: Phaser.Game }).saiyan = jogo;
