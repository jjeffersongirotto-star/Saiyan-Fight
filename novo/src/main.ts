// Saiyan Fight (novo): Phaser 3 + TypeScript. Tela lógica 800x350 (a mesma do jogo antigo), sempre deitada,
// esticada para caber na tela sem deformar.
import Phaser from 'phaser';
import { TELA_A, TELA_L } from './logica/constantes';
import { Arenas } from './cenas/Arenas';
import { Boot } from './cenas/Boot';
import { FimHistoria } from './cenas/FimHistoria';
import { Luta } from './cenas/Luta';
import { Mapa } from './cenas/Mapa';
import { Menu } from './cenas/Menu';
import { Preload } from './cenas/Preload';
import { Selecao } from './cenas/Selecao';
import { Trilhas } from './cenas/Trilhas';
import { Vitoria } from './cenas/Vitoria';
import { ESCALA_RENDER } from './ui/resolucao';

const jogo = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'jogo',
  backgroundColor: '#0a0f1f',
  width: TELA_L * ESCALA_RENDER,
  height: TELA_A * ESCALA_RENDER,
  pixelArt: true, // sprites sem borrar
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, fullscreenTarget: 'jogo' },
  input: { activePointers: 4 },
  fps: { target: 60 },
  scene: [Boot, Preload, Menu, Mapa, Selecao, Arenas, Luta, Vitoria, FimHistoria, Trilhas],
});

// para testes no navegador (playwright) e depuração
(window as unknown as { saiyan: Phaser.Game }).saiyan = jogo;
