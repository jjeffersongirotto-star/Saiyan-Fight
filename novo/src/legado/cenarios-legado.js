// @ts-nocheck
// GERADO por novo/scripts/gerar-cenarios-legado.mjs a partir do jogo antigo — NÃO EDITAR À MÃO.
// Trechos: game-logic-core.js (ângulos), menu.js (Sala do Tempo, Torneio de Cell, Nave de Freeza,
// drawStageBackground) e cenarios3d.js. O canvas é a "tela" do jogo antigo: 800x350 lógicos, contexto escalado.
/* eslint-disable */
// arenas criadas no EDITOR DE ARENAS do antigo (saiyan_arenas, lidas pelo jogo novo): id -> arena
let arenasDoJogador = new Map();
// músicas que uma arena pode usar (ids de dados/temas.ts); null = aceita qualquer uma
let temasDoJogo = null;
export function definirTemas(ids) { temasDoJogo = ids ? new Set(ids) : null; }
export function definirArenasCriadas(lista) {
  arenasDoJogador = new Map((Array.isArray(lista) ? lista : []).filter((a) => a && typeof a.id === 'string').map((a) => [a.id, a]));
}
export function criarCenariosLegado(canvasEl) {
  const GAME_WIDTH = 800, GAME_HEIGHT = 350;
  let renderScale = 1;
  const canvas = { get width() { return GAME_WIDTH; }, get height() { return GAME_HEIGHT; } };
  const ctx = canvasEl.getContext('2d');
  let gameplayClock = 0;
  const gameState = 'playing';
  const world = { stageScrollX: 0 };
  let selectedStage = 'kame';
// Sala do Tempo: o cenário é só o pavilhão no vazio branco, e conforme o herói avança a câmera dá a volta
// nele (frente → lateral → fundos → outra lateral → frente de novo). Uma volta completa a cada
// TIME_ROOM_LAP_SCROLL de avanço (~2 minutos de luta) e depois recomeça pela frente.
const TIME_ROOM_LAP_SCROLL = 10800;
function getTimeRoomOrbitAngle(scroll) {
    const v = ((scroll % TIME_ROOM_LAP_SCROLL) + TIME_ROOM_LAP_SCROLL) % TIME_ROOM_LAP_SCROLL;
    return v / TIME_ROOM_LAP_SCROLL * Math.PI * 2;
}

// Torneio de Cell: os lutadores ficam no meio da arena e a câmera gira em volta do centro, na altura deles —
// o piso passa por baixo, os pilares dos cantos passam pela frente e a paisagem dá a volta ao fundo.
const CELL_ARENA_LAP_SCROLL = 9000;   // ~100 s de luta por volta
function getCellArenaOrbitAngle(scroll) {
    const v = ((scroll % CELL_ARENA_LAP_SCROLL) + CELL_ARENA_LAP_SCROLL) % CELL_ARENA_LAP_SCROLL;
    return v / CELL_ARENA_LAP_SCROLL * Math.PI * 2;
}

// Nave de Freeza: igual à Sala do Tempo — a nave pousada fica no meio e a câmera dá a volta nela.
const FREEZA_SHIP_LAP_SCROLL = 10800;
function getFreezaShipOrbitAngle(scroll) {
    const v = ((scroll % FREEZA_SHIP_LAP_SCROLL) + FREEZA_SHIP_LAP_SCROLL) % FREEZA_SHIP_LAP_SCROLL;
    return v / FREEZA_SHIP_LAP_SCROLL * Math.PI * 2;
}

// Ângulo de uma volta completa para as fases em 3D que giram (0 → 2π a cada `volta` de avanço, e recomeça).
function getStageLapAngle(scroll, volta) {
    const v = ((scroll % volta) + volta) % volta;
    return v / volta * Math.PI * 2;
}
const KAIO_PLANET_LAP_SCROLL = 6000;   // Planeta do Sr. Kaioh: ~67 s por volta
const TERRA_ARENA_LAP_SCROLL = 9000;   // Torneio de Artes Marciais: ~100 s
const KAIOSHIN_LAP_SCROLL = 10800;     // Planeta Supremo Kaioh: ~2 min
const KAME_ISLAND_LAP_SCROLL = 9600;   // Ilha do Mestre Kame: ~107 s por volta em volta da casa
const PLATAFORMA_LAP_SCROLL = 10200;   // Plataforma Celestial: ~113 s por volta em volta do palácio
const CAPITAL_LAP_SCROLL = 10800;      // Capital do Oeste: ~2 min por volta em volta da Corporação Cápsula
// Fases que andam para a frente (Namek): distância percorrida pela câmera.
const NAMEK_FORWARD_SPEED = 1.4;
function getForwardTravel(scroll) {
    return Math.max(0, scroll) * NAMEK_FORWARD_SPEED;
}

// ==================== SALA DO TEMPO: PAVILHÃO EM 3D QUE A CÂMERA RODEIA ====================
// O pavilhão no vazio branco: cúpula dourada com relógio, duas alas de telhado rosa, ampulhetas gigantes de
// areia verde (que escorre de verdade), postes com globo verde-água e piso de azulejos em degraus. Tudo é
// descrito em coordenadas de "planta" (x para o lado, z para a frente, y para cima) e projetado com a
// câmera girando o ângulo `ang` em volta do centro — assim a fase mostra frente, lateral, fundos e volta.
// A câmera tem perspectiva de verdade (fica a TR_D do centro, a TR_H de altura) e o chão branco tem rejuntes
// até o horizonte: o chão perto dos lutadores passa rápido e o pavilhão lá longe gira devagar — quem parece
// andar em volta do pavilhão são os lutadores, não o pavilhão girando como um prato.
const TR_K = 1.12, TR_CX = 400, TR_GY = 236, TR_TILT = 0.3;
const TR_D = 700, TR_H = 210, TR_F = TR_K * TR_D, TR_HY = TR_GY - TR_K * TR_H, TR_PERTO = 40;
let trG = ctx;   // onde o pavilhão é desenhado (a imagem guardada; ver drawTimeRoomStage)
// Câmera usada por trProj. A Sala do Tempo usa TR_CAM; a Nave de Freeza troca para NV_CAM enquanto desenha.
const TR_CAM = { CX: TR_CX, HY: TR_HY, D: TR_D, H: TR_H, F: TR_F, PERTO: TR_PERTO };
let trCam = TR_CAM;

function trRot(x, z, ang) {
    const c = Math.cos(ang), s = Math.sin(ang);
    return [x * c - z * s, x * s + z * c];   // [lado, profundidade (+ = mais perto da câmera)]
}
// planta -> tela, com perspectiva: [x, y, profundidade (+ = perto), escala naquele ponto]
function trProj(x, y, z, ang) {
    const r = trRot(x, z, ang);
    const esc = trCam.F / Math.max(trCam.PERTO, trCam.D - r[1]);
    return [trCam.CX + r[0] * esc, trCam.HY + (trCam.H - y) * esc, r[1], esc];
}
function trPoly(pts) {
    trG.beginPath();
    pts.forEach((p, i) => i ? trG.lineTo(p[0], p[1]) : trG.moveTo(p[0], p[1]));
    trG.closePath();
}

// Laje do piso (retângulo da planta com altura h): lados visíveis, tampo e o rejunte dos azulejos.
function trDrawSlab(sl, ang) {
    const cantos = [[sl.x0, sl.z0], [sl.x1, sl.z0], [sl.x1, sl.z1], [sl.x0, sl.z1]];
    const topo = cantos.map(c => trProj(c[0], sl.h, c[1], ang));
    const base = cantos.map(c => trProj(c[0], 0, c[1], ang));
    for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        // lado virado para a câmera: a normal da aresta (para fora) aponta para a frente depois de girar
        const mx = (cantos[i][0] + cantos[j][0]) / 2, mz = (cantos[i][1] + cantos[j][1]) / 2;
        const cx = (sl.x0 + sl.x1) / 2, cz = (sl.z0 + sl.z1) / 2;
        const n = trRot(mx - cx, mz - cz, ang);
        if (n[1] <= 0) continue;
        trG.fillStyle = "#a9c2cc";
        trPoly([topo[i], topo[j], base[j], base[i]]);
        trG.fill();
    }
    trG.fillStyle = "#dceaf0";
    trPoly(topo);
    trG.fill();
    trG.strokeStyle = "rgba(120, 150, 165, 0.35)";
    trG.lineWidth = 1;
    trG.beginPath();
    const passo = 22;
    for (let x = Math.ceil(sl.x0 / passo) * passo; x < sl.x1; x += passo) {
        const p0 = trProj(x, sl.h, sl.z0, ang), p1 = trProj(x, sl.h, sl.z1, ang);
        trG.moveTo(p0[0], p0[1]); trG.lineTo(p1[0], p1[1]);
    }
    for (let z = Math.ceil(sl.z0 / passo) * passo; z < sl.z1; z += passo) {
        const p0 = trProj(sl.x0, sl.h, z, ang), p1 = trProj(sl.x1, sl.h, z, ang);
        trG.moveTo(p0[0], p0[1]); trG.lineTo(p1[0], p1[1]);
    }
    trG.stroke();
    trG.strokeStyle = "#8fadb9";
    trPoly(topo);
    trG.stroke();
}

// Ala de telhado rosa: caixa branca com a janela comprida na frente e o telhado arredondado.
function trDrawWing(wx, ang) {
    const hx = 38, hz = 30, y0 = 9, y1 = 46, yr = 53;
    const cantos = [[wx - hx, -hz], [wx + hx, -hz], [wx + hx, hz], [wx - hx, hz]];
    const P = (c, y) => trProj(c[0], y, c[1], ang);
    for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        const mx = (cantos[i][0] + cantos[j][0]) / 2 - wx, mz = (cantos[i][1] + cantos[j][1]) / 2;
        const n = trRot(mx, mz, ang);
        if (n[1] <= 0) continue;
        const luz = 0.93 + 0.07 * (n[0] / Math.hypot(n[0], n[1]));   // paredes brancas, um lado um pouco mais claro
        trG.fillStyle = `rgb(${Math.round(250 * luz)}, ${Math.round(251 * luz)}, ${Math.round(253 * luz)})`;
        trPoly([P(cantos[i], y1), P(cantos[j], y1), P(cantos[j], y0), P(cantos[i], y0)]);
        trG.fill();
        trG.strokeStyle = "#9aa7b4"; trG.lineWidth = 1; trG.stroke();
        // telhado: faixa rosa mais escura dos lados
        trG.fillStyle = "#d9799f";
        trPoly([P(cantos[i], yr), P(cantos[j], yr), P(cantos[j], y1), P(cantos[i], y1)]);
        trG.fill();
        // janela comprida só nas paredes da frente e de trás (as compridas)
        if (Math.abs(mz) > 1) {
            const A = cantos[i], B = cantos[j];
            const L = (u, y) => trProj(A[0] + (B[0] - A[0]) * u, y, A[1] + (B[1] - A[1]) * u, ang);
            trG.fillStyle = "#2f3b4c";
            trPoly([L(0.22, 33), L(0.78, 33), L(0.78, 25), L(0.22, 25)]);
            trG.fill();
            trG.strokeStyle = "#ffffff"; trG.lineWidth = 1.5; trG.stroke();
        }
    }
    trG.fillStyle = "#f4a9c9";
    trPoly(cantos.map(c => P(c, yr)));
    trG.fill();
    trG.strokeStyle = "#c86890"; trG.lineWidth = 1; trG.stroke();
}

// Ampulheta gigante (igual de todos os lados): base e tampa douradas, vidro e a areia verde escorrendo.
function trDrawHourglass(px, py, fase, k) {
    const w = 17 * k, meio = py - 50 * k, topoVidro = py - 92 * k, baseVidro = py - 10 * k;
    // base dourada
    trG.fillStyle = "#d4a52a";
    trG.beginPath(); trG.ellipse(px, py - 5 * k, w * 1.25, 5 * k, 0, 0, Math.PI * 2); trG.fill();
    trG.fillRect(px - w * 1.25, py - 11 * k, w * 2.5, 6 * k);
    trG.fillStyle = "#f2cf5b";
    trG.beginPath(); trG.ellipse(px, py - 11 * k, w * 1.25, 5 * k, 0, 0, Math.PI * 2); trG.fill();
    // forma do vidro (dois bulbos e a cintura fina)
    const vidro = () => {
        trG.beginPath();
        trG.moveTo(px - w, topoVidro);
        trG.bezierCurveTo(px - w * 1.15, meio - 18 * k, px - 3 * k, meio - 6 * k, px - 2.5 * k, meio);
        trG.bezierCurveTo(px - 3 * k, meio + 6 * k, px - w * 1.15, meio + 18 * k, px - w, baseVidro);
        trG.lineTo(px + w, baseVidro);
        trG.bezierCurveTo(px + w * 1.15, meio + 18 * k, px + 3 * k, meio + 6 * k, px + 2.5 * k, meio);
        trG.bezierCurveTo(px + 3 * k, meio - 6 * k, px + w * 1.15, meio - 18 * k, px + w, topoVidro);
        trG.closePath();
    };
    trG.save();
    vidro();
    trG.fillStyle = "rgba(225, 240, 245, 0.85)";
    trG.fill();
    trG.clip();
    // areia: em cima esvazia, embaixo enche (a fase vai de 0 a 1 e recomeça)
    const cima = (1 - fase) * 34 * k, baixo = fase * 34 * k;
    trG.fillStyle = "#4fb85a";
    trG.fillRect(px - w * 1.3, meio - 4 * k - cima, w * 2.6, cima);
    trG.fillStyle = "#3e9f4b";
    trG.beginPath();
    trG.moveTo(px - w * 1.3, baseVidro);
    trG.lineTo(px - w * 1.3, baseVidro - baixo * 0.75);
    trG.quadraticCurveTo(px, baseVidro - baixo * 1.25, px + w * 1.3, baseVidro - baixo * 0.75);
    trG.lineTo(px + w * 1.3, baseVidro);
    trG.closePath();
    trG.fill();
    if (fase < 0.97) { trG.fillStyle = "#4fb85a"; trG.fillRect(px - 1, meio - 3 * k, 2, (baseVidro - meio) - baixo * 0.9); }
    // brilho do vidro
    trG.fillStyle = "rgba(255, 255, 255, 0.55)";
    trG.fillRect(px - w * 0.75, topoVidro + 6 * k, 3 * k, 22 * k);
    trG.fillRect(px - w * 0.75, meio + 10 * k, 3 * k, 18 * k);
    trG.restore();
    vidro();
    trG.strokeStyle = "rgba(120, 150, 165, 0.8)"; trG.lineWidth = 1.2; trG.stroke();
    // tampa: cúpula dourada com ponta
    trG.fillStyle = "#d4a52a";
    trG.fillRect(px - w * 1.2, topoVidro - 5 * k, w * 2.4, 6 * k);
    const tampa = trG.createLinearGradient(px - w, 0, px + w, 0);
    tampa.addColorStop(0, "#f7d76b"); tampa.addColorStop(0.5, "#e8b83a"); tampa.addColorStop(1, "#b88a1c");
    trG.fillStyle = tampa;
    trG.beginPath(); trG.ellipse(px, topoVidro - 5 * k, w * 1.15, 20 * k, 0, Math.PI, 0); trG.fill();
    trG.fillStyle = "#c99a26";
    trG.beginPath(); trG.moveTo(px - 2.5 * k, topoVidro - 24 * k); trG.lineTo(px, topoVidro - 36 * k); trG.lineTo(px + 2.5 * k, topoVidro - 24 * k); trG.fill();
}

// Poste com globo verde-água.
function trDrawLamp(px, py, k) {
    trG.fillStyle = "#c99a26";
    trG.beginPath(); trG.ellipse(px, py - 2 * k, 7 * k, 2.5 * k, 0, 0, Math.PI * 2); trG.fill();
    trG.fillRect(px - 1.5 * k, py - 60 * k, 3 * k, 58 * k);
    trG.fillRect(px - 4 * k, py - 62 * k, 8 * k, 3 * k);
    const globo = trG.createRadialGradient(px - 3 * k, py - 73 * k, 1, px, py - 70 * k, 10 * k);
    globo.addColorStop(0, "#ffffff"); globo.addColorStop(0.5, "#c8f2e4"); globo.addColorStop(1, "#7fcfb8");
    trG.fillStyle = globo;
    trG.beginPath(); trG.arc(px, py - 70 * k, 10 * k, 0, Math.PI * 2); trG.fill();
    trG.strokeStyle = "#7bb3a3"; trG.lineWidth = 1; trG.stroke();
}

// Pavilhão central: colunas em volta, cortinas e mesinha dentro, cúpula dourada com gomos e o relógio na frente.
function trDrawGazebo(ang) {
    const k = TR_K, R = 50, yPiso = 9, yTopo = 72;
    const centro = trProj(0, yPiso, 0, ang), centroTopo = trProj(0, yTopo, 0, ang);
    const rx = R * k, ry = R * TR_TILT * k;
    const colunas = [];
    for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 + Math.PI / 8;
        const p = trProj(Math.sin(a) * R, yPiso, Math.cos(a) * R, ang);
        colunas.push(p);
    }
    const desenhaColuna = (p) => {
        const alto = (yTopo - yPiso) * k;
        trG.fillStyle = "#f4f6f8";
        trG.fillRect(p[0] - 3 * k, p[1] - alto, 6 * k, alto);
        trG.fillStyle = "#c9d3dc";
        trG.fillRect(p[0] + 1 * k, p[1] - alto, 2 * k, alto);
        trG.fillStyle = "#ffffff";
        trG.fillRect(p[0] - 4.5 * k, p[1] - alto, 9 * k, 3 * k);
        trG.fillRect(p[0] - 4.5 * k, p[1] - 3 * k, 9 * k, 3 * k);
    };
    // interior: parede do fundo com cortinas lilás e a mesinha
    trG.fillStyle = "#cfd7e6";
    trG.beginPath();
    trG.ellipse(centro[0], centro[1], rx, ry, 0, Math.PI, 0, true);
    trG.lineTo(centroTopo[0] + rx, centroTopo[1]);
    trG.ellipse(centroTopo[0], centroTopo[1], rx, ry, 0, 0, Math.PI, true);
    trG.closePath();
    trG.fill();
    trG.fillStyle = "rgba(150, 110, 190, 0.55)";
    for (let i = 0; i < 6; i++) {
        const a = ang * 0.0 + i * Math.PI / 3;   // cortinas penduradas em volta (giram com o pavilhão)
        const r = trRot(Math.sin(a) * R * 0.9, Math.cos(a) * R * 0.9, ang);
        if (r[1] > 0) continue;                 // só as do fundo aparecem por trás da mesa
        const x = TR_CX + r[0] * k, yTop = centroTopo[1] + r[1] * TR_TILT * k;
        trG.beginPath();
        trG.moveTo(x - 9 * k, yTop); trG.quadraticCurveTo(x, yTop + 30 * k, x - 4 * k, yTop + 55 * k);
        trG.lineTo(x + 4 * k, yTop + 55 * k); trG.quadraticCurveTo(x, yTop + 30 * k, x + 9 * k, yTop);
        trG.fill();
    }
    trG.fillStyle = "#8a5a33";
    trG.beginPath(); trG.ellipse(centro[0], centro[1] - 16 * k, 10 * k, 3 * k, 0, 0, Math.PI * 2); trG.fill();
    trG.fillRect(centro[0] - 1.5 * k, centro[1] - 16 * k, 3 * k, 15 * k);
    // colunas: as de trás, depois as da frente
    const ordem = colunas.map((p, i) => i).sort((a, b) => colunas[a][2] - colunas[b][2]);
    ordem.forEach(i => { if (colunas[i][2] < 0) desenhaColuna(colunas[i]); });
    // mureta baixa na frente, entre as colunas
    trG.fillStyle = "rgba(240, 244, 248, 0.92)";
    trG.beginPath();
    trG.ellipse(centro[0], centro[1] - 7 * k, rx, ry, 0, 0, Math.PI);
    trG.lineTo(centro[0] - rx, centro[1]);
    trG.ellipse(centro[0], centro[1], rx, ry, 0, Math.PI, 0, true);
    trG.closePath();
    trG.fill();
    ordem.forEach(i => { if (colunas[i][2] >= 0) desenhaColuna(colunas[i]); });
    // faixa branca sob a cúpula
    trG.fillStyle = "#f7f9fb";
    trG.beginPath();
    trG.ellipse(centroTopo[0], centroTopo[1] - 6 * k, rx + 4 * k, ry + 1, 0, Math.PI, 0);
    trG.lineTo(centroTopo[0] + rx + 4 * k, centroTopo[1]);
    trG.ellipse(centroTopo[0], centroTopo[1], rx + 4 * k, ry + 1, 0, 0, Math.PI);
    trG.closePath();
    trG.fill();
    trG.strokeStyle = "#b9c4ce"; trG.lineWidth = 1; trG.stroke();
    // cúpula dourada
    const yBase = centroTopo[1] - 6 * k, alturaDomo = 58 * k, rDomo = rx + 4 * k;
    const ouro = trG.createRadialGradient(centroTopo[0] - rDomo * 0.35, yBase - alturaDomo * 0.7, 4, centroTopo[0], yBase - alturaDomo * 0.4, rDomo * 1.1);
    ouro.addColorStop(0, "#fff1a8"); ouro.addColorStop(0.45, "#f0c53f"); ouro.addColorStop(1, "#b5841b");
    trG.fillStyle = ouro;
    trG.beginPath();
    trG.moveTo(centroTopo[0] - rDomo, yBase);
    trG.bezierCurveTo(centroTopo[0] - rDomo, yBase - alturaDomo * 0.9, centroTopo[0] - rDomo * 0.35, yBase - alturaDomo, centroTopo[0], yBase - alturaDomo);
    trG.bezierCurveTo(centroTopo[0] + rDomo * 0.35, yBase - alturaDomo, centroTopo[0] + rDomo, yBase - alturaDomo * 0.9, centroTopo[0] + rDomo, yBase);
    trG.ellipse(centroTopo[0], yBase, rDomo, ry + 1, 0, 0, Math.PI);
    trG.closePath();
    trG.fill();
    // gomos da cúpula (giram junto com a câmera)
    trG.strokeStyle = "rgba(150, 105, 20, 0.55)";
    trG.lineWidth = 1.2;
    for (let j = 0; j < 12; j++) {
        const a = j * Math.PI / 6;
        const r = trRot(Math.sin(a), Math.cos(a), ang);
        if (r[1] < 0.05) continue;
        const bx = centroTopo[0] + r[0] * rDomo, by = yBase + r[1] * (ry + 1);
        trG.beginPath();
        trG.moveTo(bx, by);
        trG.quadraticCurveTo(centroTopo[0] + r[0] * rDomo * 0.95, yBase - alturaDomo * 0.85, centroTopo[0], yBase - alturaDomo);
        trG.stroke();
    }
    // ponta com a bola dourada
    trG.fillStyle = "#e0b23a";
    trG.beginPath(); trG.arc(centroTopo[0], yBase - alturaDomo - 6 * k, 6 * k, 0, Math.PI * 2); trG.fill();
    trG.beginPath(); trG.moveTo(centroTopo[0] - 2 * k, yBase - alturaDomo - 11 * k); trG.lineTo(centroTopo[0], yBase - alturaDomo - 24 * k); trG.lineTo(centroTopo[0] + 2 * k, yBase - alturaDomo - 11 * k); trG.fill();
    // relógio na frente da cúpula (some quando a câmera está atrás e fica fino de lado)
    const rel = trRot(0, 1, ang);
    if (rel[1] > 0.08) {
        const cxr = centroTopo[0] + rel[0] * rDomo * 0.82, cyr = yBase - alturaDomo * 0.38;
        const larg = 15 * k * rel[1];
        trG.fillStyle = "#fbf6e8";
        trG.fillRect(cxr - larg, cyr - 13 * k, larg * 2, 26 * k);
        trG.strokeStyle = "#c99a26"; trG.lineWidth = 1.5; trG.strokeRect(cxr - larg, cyr - 13 * k, larg * 2, 26 * k);
        trG.fillStyle = "#ffffff";
        trG.beginPath(); trG.ellipse(cxr, cyr, 10 * k * rel[1], 10 * k, 0, 0, Math.PI * 2); trG.fill();
        trG.strokeStyle = "#8a6a20"; trG.lineWidth = 1.2; trG.stroke();
        trG.strokeStyle = "#333333"; trG.lineWidth = 1.4;
        trG.beginPath(); trG.moveTo(cxr, cyr); trG.lineTo(cxr, cyr - 7 * k); trG.moveTo(cxr, cyr); trG.lineTo(cxr + 4 * k * rel[1], cyr + 1 * k); trG.stroke();
    }
}

// Vazio branco e chão infinito com rejuntes, desenhados a cada quadro (barato: ~90 linhas retas). É o chão
// perto da câmera passando rápido que dá a sensação de que os lutadores estão andando em volta do pavilhão.
function drawTimeRoomFloor(ang) {
    const fundo = ctx.createLinearGradient(0, 0, 0, canvas.height);
    fundo.addColorStop(0, "#fdfbf6");
    fundo.addColorStop(0.5, "#f5f0e6");
    fundo.addColorStop(1, "#e8e1d3");
    ctx.fillStyle = fundo;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const S = 90, L = 2000, perto = TR_D - TR_PERTO * 2;
    ctx.strokeStyle = "rgba(160, 148, 125, 0.42)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const linha = (x0, z0, x1, z1) => {
        // corta a parte que ficaria atrás da câmera e projeta as duas pontas (reta continua reta)
        const r0 = trRot(x0, z0, ang), r1 = trRot(x1, z1, ang);
        let t0 = 0, t1 = 1;
        if (r0[1] > perto && r1[1] > perto) return;
        if (r0[1] > perto) t0 = (perto - r0[1]) / (r1[1] - r0[1]);
        if (r1[1] > perto) t1 = (perto - r0[1]) / (r1[1] - r0[1]);
        const pa = trProj(x0 + (x1 - x0) * t0, 0, z0 + (z1 - z0) * t0, ang);
        const pb = trProj(x0 + (x1 - x0) * t1, 0, z0 + (z1 - z0) * t1, ang);
        ctx.moveTo(pa[0], pa[1]);
        ctx.lineTo(pb[0], pb[1]);
    };
    for (let v = -L; v <= L; v += S) {
        linha(v, -L, v, L);
        linha(-L, v, L, v);
    }
    ctx.stroke();
    // névoa branca no horizonte: o chão some ao longe no vazio
    const nevoa = ctx.createLinearGradient(0, TR_HY, 0, TR_HY + 150);
    nevoa.addColorStop(0, "rgba(253, 251, 246, 1)");
    nevoa.addColorStop(1, "rgba(253, 251, 246, 0)");
    ctx.fillStyle = nevoa;
    ctx.fillRect(0, 0, canvas.width, TR_HY + 150);
}

// O pavilhão gira devagar (uma volta a cada ~2 min): ele é desenhado numa imagem guardada, com fundo
// transparente, e só refeito quando a câmera anda 1/4 de grau (a cada ~5 quadros); o chão é a cada quadro.
const TR_PASSOS_POR_VOLTA = 1440;
const trCena = { passo: null, canvas: null };
// Camada guardada (fundo transparente) de uma construção que a câmera rodeia: só é refeita quando o ângulo
// anda 1/4 de grau. Usada pela Sala do Tempo e pela Nave de Freeza.
function drawCachedOrbitLayer(cena, ang, desenhar) {
    const passo = Math.round(ang / (Math.PI * 2) * TR_PASSOS_POR_VOLTA) % TR_PASSOS_POR_VOLTA;
    if (!c3Valida(cena.canvas)) {
        const f = c3NovaFaixa(canvas.width, canvas.height);   // camada na resolução real da tela
        cena.canvas = f ? f.c : null;
        cena.passo = null;
    }
    const g = cena.canvas && cena.canvas.getContext && cena.canvas.getContext("2d");
    if (!g) { trG = ctx; desenhar(ang); return; }
    if (cena.passo !== passo) {
        g.clearRect(0, 0, canvas.width, canvas.height);
        trG = g;
        try { desenhar(passo / TR_PASSOS_POR_VOLTA * Math.PI * 2); } finally { trG = ctx; }
        cena.passo = passo;
    }
    ctx.drawImage(cena.canvas, 0, 0, canvas.width, canvas.height);
}
function drawTimeRoomStage(ang) {
    drawTimeRoomFloor(ang);
    drawCachedOrbitLayer(trCena, ang, drawTimeRoomScene);
}

// Só o pavilhão (fundo transparente). O vazio branco e o chão infinito são desenhados por drawTimeRoomFloor.
function drawTimeRoomScene(ang) {
    // piso em degraus (das lajes mais baixas para as mais altas)
    const lajes = [
        { x0: -132, x1: 132, z0: 88, z1: 124, h: 2 },
        { x0: -102, x1: 102, z0: 66, z1: 96, h: 4 },
        { x0: -78, x1: 78, z0: 50, z1: 74, h: 6 },
        { x0: -250, x1: 250, z0: -38, z1: 38, h: 7 },
        { x0: -95, x1: 95, z0: -58, z1: 58, h: 9 }
    ];
    // sombra de verdade: o contorno das lajes no chão, um pouco deslocado (luz vindo do alto, à esquerda)
    trG.fillStyle = "rgba(120, 110, 95, 0.16)";
    lajes.forEach(sl => {
        const chao = [[sl.x0, sl.z0], [sl.x1, sl.z0], [sl.x1, sl.z1], [sl.x0, sl.z1]].map(c => trProj(c[0] + 10, 0, c[1] + 8, ang));
        trPoly(chao);
        trG.fill();
    });
    lajes.forEach(sl => trDrawSlab(sl, ang));

    // objetos em pé, do mais longe para o mais perto da câmera
    const objetos = [
        { x: 0, z: 0, d: (a) => trDrawGazebo(a) },
        { x: -100, z: 0, d: (a) => trDrawWing(-100, a) },
        { x: 100, z: 0, d: (a) => trDrawWing(100, a) },
        { x: -178, z: 0, d: (a, p) => trDrawHourglass(p[0], p[1], (gameplayClock * 0.02) % 1, p[3]) },
        { x: 178, z: 0, d: (a, p) => trDrawHourglass(p[0], p[1], (gameplayClock * 0.02 + 0.5) % 1, p[3]) },
        { x: -228, z: 0, d: (a, p) => trDrawLamp(p[0], p[1], p[3]) },
        { x: 228, z: 0, d: (a, p) => trDrawLamp(p[0], p[1], p[3]) }
    ];
    objetos
        .map(o => ({ o, p: trProj(o.x, 7, o.z, ang) }))
        .sort((a, b) => a.p[2] - b.p[2])
        .forEach(({ o, p }) => o.d(ang, p));
}

// ==================== TORNEIO DE CELL: ARENA EM 3D, CÂMERA GIRANDO NO MEIO DELA ====================
// Os lutadores ficam no meio da arena e a câmera, na altura deles, dá a volta em torno do centro: o piso de
// azulejos passa por baixo, os 4 pilares brancos dos cantos passam pela frente e por trás e a paisagem
// (montanhas, morros de pedra, céu) gira ao fundo. Planta: x para o lado, z para a frente, y para cima.
const CA_CX = 400, CA_HY = 118, CA_D = 330, CA_H = 80, CA_F = 400, CA_PERTO = 30;
const CA_W = 240;            // meia largura do piso da arena
const CA_CHAO = -26;         // altura do gramado (a arena é um tablado acima dele)

function caRot(x, z, ang) {
    const c = Math.cos(ang), s = Math.sin(ang);
    return [x * c - z * s, x * s + z * c];
}
function caProj(x, y, z, ang) {
    const r = caRot(x, z, ang);
    const esc = CA_F / Math.max(CA_PERTO, CA_D - r[1]);
    return [CA_CX + r[0] * esc, CA_HY + (CA_H - y) * esc, r[1], esc];
}
// Polígono no chão/tampo (pontos [x, y, z]) cortado no plano perto da câmera e projetado.
function caPoly(pts, ang) {
    const lim = CA_D - CA_PERTO;
    const rot = pts.map(p => { const r = caRot(p[0], p[2], ang); return [r[0], p[1], r[1]]; });
    const out = [];
    for (let i = 0; i < rot.length; i++) {
        const A = rot[i], B = rot[(i + 1) % rot.length];
        const aIn = A[2] <= lim, bIn = B[2] <= lim;
        if (aIn) out.push(A);
        if (aIn !== bIn) {
            const t = (lim - A[2]) / (B[2] - A[2]);
            out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, lim]);
        }
    }
    if (out.length < 3) return false;
    ctx.beginPath();
    out.forEach((p, i) => {
        const esc = CA_F / Math.max(CA_PERTO, CA_D - p[2]);
        const x = CA_CX + p[0] * esc, y = CA_HY + (CA_H - p[1]) * esc;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.closePath();
    return true;
}
// Linha reta no chão cortada no plano perto da câmera.
function caLine(x0, y0, z0, x1, y1, z1, ang) {
    const lim = CA_D - CA_PERTO;
    const r0 = caRot(x0, z0, ang), r1 = caRot(x1, z1, ang);
    if (r0[1] > lim && r1[1] > lim) return;
    let t0 = 0, t1 = 1;
    if (r0[1] > lim) t0 = (lim - r0[1]) / (r1[1] - r0[1]);
    if (r1[1] > lim) t1 = (lim - r0[1]) / (r1[1] - r0[1]);
    const pa = caProj(x0 + (x1 - x0) * t0, y0 + (y1 - y0) * t0, z0 + (z1 - z0) * t0, ang);
    const pb = caProj(x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1, z0 + (z1 - z0) * t1, ang);
    ctx.moveTo(pa[0], pa[1]);
    ctx.lineTo(pb[0], pb[1]);
}

// Paisagem distante (céu, nuvens, montanhas, morros de pedra) desenhada uma vez numa faixa de 360°; a cada
// quadro só é copiada deslocada conforme o ângulo da câmera (barato e liso).
const CA_PANO_W = Math.round(Math.PI * 2 * CA_F);
let caPanorama = null;
function getCellArenaPanorama() {
    if (c3Valida(caPanorama)) return caPanorama;
    const f = c3NovaFaixa(CA_PANO_W, CA_HY + 40);   // na resolução real da tela (nítido)
    if (!f) return null;
    const { c, g } = f;
    const W = CA_PANO_W, base = CA_HY + 6;
    // altura de uma serra que dá a volta certinho (soma de senos com períodos inteiros)
    const serra = (u, amp, fases) => fases.reduce((h, f) => h + Math.sin(u / W * Math.PI * 2 * f[0] + f[1]) * f[2], 0) * amp;
    // céu
    const ceu = g.createLinearGradient(0, 0, 0, base);
    ceu.addColorStop(0, "#3d8fe0"); ceu.addColorStop(0.65, "#8cc8f2"); ceu.addColorStop(1, "#d6eefb");
    g.fillStyle = ceu;
    g.fillRect(0, 0, W, c.__h);
    // nuvens
    g.fillStyle = "rgba(255, 255, 255, 0.92)";
    for (let i = 0; i < 14; i++) {
        const x = (i * 197.3 + (i % 3) * 61) % W, y = 18 + (i * 37) % 52, r = 12 + (i * 7) % 14;
        [[0, 0, 1], [r * 1.1, -r * 0.35, 1.2], [r * 2.3, 0, 0.95], [r * 1.2, r * 0.2, 1]].forEach(b => {
            // desenha também uma volta antes e depois: a nuvem na emenda da faixa não fica cortada
            [-W, 0, W].forEach(dx => { g.beginPath(); g.arc(x + b[0] + dx, y + b[1], r * b[2], 0, Math.PI * 2); g.fill(); });
        });
    }
    // serra azulada bem longe
    g.fillStyle = "#8fb3c9";
    g.beginPath(); g.moveTo(0, base);
    for (let u = 0; u <= W; u += 8) g.lineTo(u, base - 22 - serra(u, 1, [[5, 0.3, 9], [11, 1.1, 6], [23, 2, 3]]));
    g.lineTo(W, base); g.closePath(); g.fill();
    // morros verdes mais perto
    g.fillStyle = "#4f9a52";
    g.beginPath(); g.moveTo(0, base);
    for (let u = 0; u <= W; u += 6) g.lineTo(u, base - 8 - Math.max(0, serra(u, 1, [[7, 1.4, 10], [13, 0.2, 6], [29, 2.2, 3]])));
    g.lineTo(W, base); g.closePath(); g.fill();
    // morros de pedra marrons de topo reto (como os da arena do anime), em alguns pontos da volta
    [[0.08, 120, 46], [0.31, 90, 34], [0.47, 150, 52], [0.72, 110, 40], [0.9, 70, 28]].forEach(([pos, larg, alt]) => {
        const x = pos * W;
        const desenha = (dx) => {
            const x0 = x + dx;
            g.fillStyle = "#b07a45";
            g.beginPath();
            g.moveTo(x0 - larg / 2, base);
            g.lineTo(x0 - larg / 2 + 10, base - alt);
            g.lineTo(x0 + larg / 2 - 14, base - alt - 4);
            g.lineTo(x0 + larg / 2, base);
            g.closePath(); g.fill();
            g.fillStyle = "#8c5a2e";   // faixas das camadas de rocha
            for (let k = 1; k <= 3; k++) g.fillRect(x0 - larg / 2 + 8, base - alt * k / 4, larg - 18, 2);
            g.fillStyle = "#5e9b4c";   // grama no topo
            g.fillRect(x0 - larg / 2 + 10, base - alt - 6, larg - 24, 6);
        };
        desenha(0);
        if (x + larg / 2 > W) desenha(-W);
        if (x - larg / 2 < 0) desenha(W);
    });
    caPanorama = c;
    return c;
}

// Pilar branco pontudo de canto (igual de todos os lados).
function caDrawPillar(px, py, esc) {
    const alto = 210 * esc, larg = 9 * esc;
    const topoY = py - alto;
    // base quadrada
    ctx.fillStyle = "#e8edf2";
    ctx.fillRect(px - larg * 1.6, py - 10 * esc, larg * 3.2, 10 * esc);
    ctx.fillStyle = "#b9c5cf";
    ctx.fillRect(px + larg * 0.4, py - 10 * esc, larg * 1.2, 10 * esc);
    // corpo afinando até a ponta
    ctx.fillStyle = "#f4f7fa";
    ctx.beginPath();
    ctx.moveTo(px - larg, py - 10 * esc);
    ctx.lineTo(px - larg * 0.55, topoY + alto * 0.25);
    ctx.lineTo(px, topoY);
    ctx.lineTo(px + larg * 0.55, topoY + alto * 0.25);
    ctx.lineTo(px + larg, py - 10 * esc);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#c3ced8";   // lado na sombra
    ctx.beginPath();
    ctx.moveTo(px + larg * 0.15, py - 10 * esc);
    ctx.lineTo(px + larg * 0.1, topoY + alto * 0.25);
    ctx.lineTo(px, topoY);
    ctx.lineTo(px + larg * 0.55, topoY + alto * 0.25);
    ctx.lineTo(px + larg, py - 10 * esc);
    ctx.closePath();
    ctx.fill();
    // anéis
    ctx.fillStyle = "#d5dde5";
    ctx.fillRect(px - larg * 1.05, py - 22 * esc, larg * 2.1, 4 * esc);
    ctx.fillRect(px - larg * 0.62, topoY + alto * 0.27, larg * 1.24, 3 * esc);
}

function drawCellArenaStage(ang) {
    // paisagem ao fundo: posição na faixa de 360° conforme o ângulo da câmera
    const pano = getCellArenaPanorama();
    if (pano) {
        c3BlitPanorama(pano, ang, CA_F, CA_CX);
    } else {
        ctx.fillStyle = "#8cc8f2";
        ctx.fillRect(0, 0, canvas.width, CA_HY + 6);
    }
    // gramado até o horizonte (mais claro e enevoado lá longe)
    const grama = ctx.createLinearGradient(0, CA_HY, 0, canvas.height);
    grama.addColorStop(0, "#8fc56d"); grama.addColorStop(0.25, "#6fb04f"); grama.addColorStop(1, "#4f8f37");
    ctx.fillStyle = grama;
    ctx.fillRect(0, CA_HY + 5, canvas.width, canvas.height - CA_HY);

    // manchas de terra e a estrada de terra saindo da arena
    ctx.fillStyle = "#c9a46a";
    [[-520, -380, 120, 70], [610, 260, 140, 80], [-300, 720, 160, 90], [480, -760, 200, 110], [-900, 100, 180, 100]].forEach(([x, z, rx, rz]) => {
        const pts = [];
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; pts.push([x + Math.cos(a) * rx, CA_CHAO, z + Math.sin(a) * rz]); }
        if (caPoly(pts, ang)) ctx.fill();
    });
    const estrada = [[0, -CA_W - 30], [-60, -520], [140, -900], [-80, -1400], [60, -2200]];
    ctx.fillStyle = "#d4b07a";
    for (let i = 0; i < estrada.length - 1; i++) {
        const [ax, az] = estrada[i], [bx, bz] = estrada[i + 1];
        const len = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / len * 26, nz = (bx - ax) / len * 26;
        if (caPoly([[ax + nx, CA_CHAO, az + nz], [bx + nx, CA_CHAO, bz + nz], [bx - nx, CA_CHAO, bz - nz], [ax - nx, CA_CHAO, az - nz]], ang)) ctx.fill();
    }

    // tablado: degrau (borda mais larga e baixa) e o piso de azulejos
    const W = CA_W, B = CA_W + 22;
    const ladoVisivel = (mx, mz) => caRot(mx, mz, ang)[1] > 0;
    const faces = (w, yTop, yBase, cor) => {
        const cantos = [[-w, -w], [w, -w], [w, w], [-w, w]];
        for (let i = 0; i < 4; i++) {
            const A = cantos[i], C = cantos[(i + 1) % 4];
            if (!ladoVisivel((A[0] + C[0]) / 2, (A[1] + C[1]) / 2)) continue;
            ctx.fillStyle = cor;
            if (caPoly([[A[0], yTop, A[1]], [C[0], yTop, C[1]], [C[0], yBase, C[1]], [A[0], yBase, A[1]]], ang)) ctx.fill();
        }
    };
    faces(B, -12, CA_CHAO, "#9aa6ae");
    ctx.fillStyle = "#cfd8de";
    if (caPoly([[-B, -12, -B], [B, -12, -B], [B, -12, B], [-B, -12, B]], ang)) ctx.fill();
    faces(W, 0, -12, "#aeb9c1");
    ctx.fillStyle = "#e3eaee";
    if (caPoly([[-W, 0, -W], [W, 0, -W], [W, 0, W], [-W, 0, W]], ang)) ctx.fill();
    // rejunte dos azulejos
    ctx.strokeStyle = "rgba(120, 140, 155, 0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let v = -W; v <= W; v += 30) {
        caLine(v, 0, -W, v, 0, W, ang);
        caLine(-W, 0, v, W, 0, v, ang);
    }
    ctx.stroke();

    // pilares dos cantos, do mais longe para o mais perto
    [[-W + 6, -W + 6], [W - 6, -W + 6], [W - 6, W - 6], [-W + 6, W - 6]]
        .map(([x, z]) => caProj(x, 0, z, ang))
        .filter(p => CA_D - p[2] > CA_PERTO * 2)
        .sort((a, b) => a[2] - b[2])
        .forEach(p => caDrawPillar(p[0], p[1], p[3]));
}

// ==================== NAVE DE FREEZA: NAVE POUSADA EM NAMEK, CÂMERA DÁ A VOLTA ====================
// Como na Sala do Tempo: a nave fica parada no meio e os lutadores dão a volta nela. O chão de Namek (azul-
// esverdeado, com lagos, pedras e tufos) passa perto da câmera; o céu verde e os morros de pedra giram ao fundo.
// A nave: casco branco embaixo, faixa preta com escotilhas azuis, cúpula branca com a faixa listrada cor de
// madeira, escotilha escura no topo, a janela roxa curvada, os calombos amarelos do casco e as patas de aço.
const NV_CAM = { CX: 400, HY: 138, D: 620, H: 112, F: 620, PERTO: 30 };
const nvCena = { passo: null, canvas: null };

// elipse de uma "latitude" da nave (círculo de raio r na altura y), já em perspectiva
function nvAnel(y, r, ang) {
    const c = trProj(0, y, 0, ang), fr = trProj(0, y, r, 0), tr = trProj(0, y, -r, 0);
    return { cx: c[0], cy: c[1], rx: r * c[3], ry: Math.max(1, (fr[1] - tr[1]) / 2) };
}
// faixa entre duas latitudes (só a metade da frente aparece)
function nvFaixa(a1, a2, cor) {
    trG.fillStyle = cor;
    trG.beginPath();
    trG.ellipse(a1.cx, a1.cy, a1.rx, a1.ry, 0, Math.PI, 0, true);
    trG.lineTo(a2.cx + a2.rx, a2.cy);
    trG.ellipse(a2.cx, a2.cy, a2.rx, a2.ry, 0, 0, Math.PI, false);
    trG.closePath();
    trG.fill();
}

// Perna de aço em forma de pata de aranha (como na nave do anime): um braço largo e firme sai de baixo do
// casco, entre os calombos amarelos, e vai para fora; na junta a pata desce reta e afina até uma ponta
// cravada no chão; uma haste fina faz o reforço em triângulo entre o casco e a pata.
function nvDrawLeg(a, ang, frente) {
    const ox = Math.sin(a), oz = Math.cos(a);
    const P = (r, y) => trProj(ox * r, y, oz * r, ang);
    const quadril = P(104, 18), joelho = P(162, 26), ponta = P(210, 0), reforcoBase = P(98, 8), reforcoPata = P(190, 11);
    const k = joelho[3];
    const claro = frente ? "#f3f6f8" : "#c9d0d7", meio = frente ? "#bcc5cf" : "#98a1ab", escuro = frente ? "#56606c" : "#414852";
    trG.lineCap = "round"; trG.lineJoin = "round";
    // haste de reforço (fina, por trás)
    trG.strokeStyle = escuro; trG.lineWidth = Math.max(1, 2.6 * k);
    trG.beginPath(); trG.moveTo(reforcoBase[0], reforcoBase[1]); trG.lineTo(reforcoPata[0], reforcoPata[1]); trG.stroke();
    trG.strokeStyle = meio; trG.lineWidth = Math.max(0.8, 1.3 * k); trG.stroke();
    // pata: desce inclinada da junta, afinando até a ponta cravada no chão
    const lp = 6.5 * k;
    const dx = ponta[0] - joelho[0], dy = ponta[1] - joelho[1], dl = Math.hypot(dx, dy) || 1;
    const nx = -dy / dl, ny = dx / dl;
    trG.fillStyle = meio;
    trG.beginPath();
    trG.moveTo(joelho[0] + nx * lp, joelho[1] + ny * lp); trG.lineTo(ponta[0], ponta[1]); trG.lineTo(joelho[0] - nx * lp, joelho[1] - ny * lp);
    trG.closePath(); trG.fill();
    trG.fillStyle = claro;
    trG.beginPath();
    trG.moveTo(joelho[0] - nx * lp, joelho[1] - ny * lp); trG.lineTo(ponta[0], ponta[1]); trG.lineTo(joelho[0], joelho[1]);
    trG.closePath(); trG.fill();
    trG.strokeStyle = escuro; trG.lineWidth = 1;
    trG.beginPath();
    trG.moveTo(joelho[0] + nx * lp, joelho[1] + ny * lp); trG.lineTo(ponta[0], ponta[1]); trG.lineTo(joelho[0] - nx * lp, joelho[1] - ny * lp);
    trG.stroke();
    // braço: curto e grosso, do casco até a junta
    trG.strokeStyle = escuro; trG.lineWidth = 13 * k;
    trG.beginPath(); trG.moveTo(quadril[0], quadril[1]); trG.lineTo(joelho[0], joelho[1]); trG.stroke();
    trG.strokeStyle = meio; trG.lineWidth = 10 * k; trG.stroke();
    trG.strokeStyle = claro; trG.lineWidth = 4.5 * k;
    trG.beginPath(); trG.moveTo(quadril[0], quadril[1] - 2.5 * k); trG.lineTo(joelho[0], joelho[1] - 2.5 * k); trG.stroke();
    // junta redonda
    trG.fillStyle = escuro;
    trG.beginPath(); trG.arc(joelho[0], joelho[1], 7.5 * k, 0, Math.PI * 2); trG.fill();
    trG.fillStyle = claro;
    trG.beginPath(); trG.arc(joelho[0], joelho[1], 5.5 * k, 0, Math.PI * 2); trG.fill();
    trG.fillStyle = meio;
    trG.beginPath(); trG.arc(joelho[0] + 1 * k, joelho[1] + 1 * k, 2.5 * k, 0, Math.PI * 2); trG.fill();
}

// Calombo amarelo do casco: não é peça solta, é um relevo arredondado da parte de baixo do casco (abaixo da
// faixa preta), que acompanha a curva da nave. Montado sobre a superfície do casco e projetado.
function nvRaioCascoBaixo(y) { return 100 + (y - 14) / 46 * 58; }   // casco de baixo afunila: y 14 -> 60
function nvDrawPod(a, ang) {
    const normal = trRot(Math.sin(a), Math.cos(a), ang)[1];
    if (normal < 0.02) return;                               // virado para longe: escondido pelo casco
    const meiaLarg = 0.19, yc = 37, meiaAlt = 21;
    const pts = [];
    for (let i = 0; i < 28; i++) {
        const t = i / 28 * Math.PI * 2;
        // retângulo de cantos bem arredondados (superelipse)
        const u = Math.sign(Math.cos(t)) * Math.pow(Math.abs(Math.cos(t)), 0.6);
        const v = Math.sign(Math.sin(t)) * Math.pow(Math.abs(Math.sin(t)), 0.6);
        const y = yc + v * meiaAlt, th = a + u * meiaLarg;
        const r = nvRaioCascoBaixo(Math.min(60, y)) + 3 + 9 * (1 - u * u) * (1 - v * v);   // estufado no meio
        pts.push(trProj(Math.sin(th) * r, y, Math.cos(th) * r, ang));
    }
    const centro = trProj(Math.sin(a) * (nvRaioCascoBaixo(yc) + 12), yc, Math.cos(a) * (nvRaioCascoBaixo(yc) + 12), ang);
    const luz = trProj(Math.sin(a - meiaLarg * 0.35) * (nvRaioCascoBaixo(yc + 5) + 12), yc + 6, Math.cos(a - meiaLarg * 0.35) * (nvRaioCascoBaixo(yc + 5) + 12), ang);
    const k = centro[3];
    const g = trG.createRadialGradient(luz[0], luz[1], 1, centro[0], centro[1], 26 * k);
    g.addColorStop(0, "#fff8c4"); g.addColorStop(0.45, "#f6d63c"); g.addColorStop(1, "#c99a12");
    trG.fillStyle = g;
    trG.beginPath(); pts.forEach((q, i) => i ? trG.lineTo(q[0], q[1]) : trG.moveTo(q[0], q[1])); trG.closePath(); trG.fill();
    trG.strokeStyle = "rgba(140, 105, 10, 0.7)"; trG.lineWidth = 1; trG.stroke();
}

// Janela da cabine: vidro roxo curvado sobre a cúpula (acompanha a curva dela), com um pequeno suporte
// claro em volta do vidro. Fica colado na nave em qualquer ângulo.
const NV_CABINE = { a: -0.55, meiaLarg: 0.17, yc: 116, meiaAlt: 14, borda: 3.5 };
function nvRaioCupula(y) { const t = Math.min(1, Math.max(0, (y - 82) / 70)); return 158 * Math.sqrt(1 - t * t); }
function nvDrawCockpit(ang) {
    const c = NV_CABINE;
    const normal = trRot(Math.sin(c.a), Math.cos(c.a), ang)[1];
    if (normal < 0.02) return;
    const contorno = (extra, inchar) => {
        const pts = [];
        for (let i = 0; i < 32; i++) {
            const t = i / 32 * Math.PI * 2, u = Math.cos(t), v = Math.sin(t);
            const y = c.yc + v * (c.meiaAlt + extra), th = c.a + u * (c.meiaLarg + extra / 140);
            const r = nvRaioCupula(y) + 1 + inchar * (1 - u * u) * (1 - v * v);
            pts.push(trProj(Math.sin(th) * r, y, Math.cos(th) * r, ang));
        }
        return pts;
    };
    const desenha = (pts) => { trG.beginPath(); pts.forEach((q, i) => i ? trG.lineTo(q[0], q[1]) : trG.moveTo(q[0], q[1])); trG.closePath(); };
    // suporte em volta do vidro
    desenha(contorno(c.borda, 1));
    trG.fillStyle = "#e9edf1"; trG.fill();
    trG.strokeStyle = "#8d96a1"; trG.lineWidth = 1; trG.stroke();
    // vidro roxo curvado
    const vidro = contorno(0, 4);
    const centro = trProj(Math.sin(c.a) * (nvRaioCupula(c.yc) + 5), c.yc, Math.cos(c.a) * (nvRaioCupula(c.yc) + 5), ang);
    const k = centro[3];
    const brilhoP = trProj(Math.sin(c.a - c.meiaLarg * 0.4) * (nvRaioCupula(c.yc + 6) + 5), c.yc + 6, Math.cos(c.a - c.meiaLarg * 0.4) * (nvRaioCupula(c.yc + 6) + 5), ang);
    const g = trG.createRadialGradient(brilhoP[0], brilhoP[1], 1, centro[0], centro[1], 26 * k);
    g.addColorStop(0, "#efd9ff"); g.addColorStop(0.35, "#a970d8"); g.addColorStop(0.8, "#5e2a90"); g.addColorStop(1, "#3c1663");
    desenha(vidro);
    trG.fillStyle = g; trG.fill();
    trG.strokeStyle = "#4a2470"; trG.lineWidth = 1; trG.stroke();
    // reflexo curvo do vidro (preso dentro dele)
    trG.save();
    desenha(vidro); trG.clip();
    trG.strokeStyle = "rgba(255, 255, 255, 0.75)"; trG.lineWidth = Math.max(1.5, 3 * k); trG.lineCap = "round";
    trG.beginPath();
    trG.arc(centro[0] + 4 * k, centro[1] + 3 * k, 13 * k, Math.PI * 1.05, Math.PI * 1.45);
    trG.stroke();
    trG.restore();
}

function drawFreezaShipScene(ang) {
    // sombra da nave no chão
    const sombra = [];
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; sombra.push(trProj(Math.sin(a) * 175 + 12, 0, Math.cos(a) * 175 + 10, ang)); }
    trG.fillStyle = "rgba(20, 60, 80, 0.28)";
    trPoly(sombra);
    trG.fill();

    // pernas de trás (ficam atrás do casco); 10 pernas entre os 10 calombos amarelos
    const pernas = [], calombos = [];
    for (let i = 0; i < 10; i++) { calombos.push(i * Math.PI / 5); pernas.push(i * Math.PI / 5 + Math.PI / 10); }
    const naFrente = (a) => trRot(Math.sin(a), Math.cos(a), ang)[1] > 0;
    const porProfundidade = (lista) => lista.slice().sort((a, b) => trRot(Math.sin(a), Math.cos(a), ang)[1] - trRot(Math.sin(b), Math.cos(b), ang)[1]);
    porProfundidade(pernas).forEach(a => { if (!naFrente(a)) nvDrawLeg(a, ang, false); });

    // casco de baixo (branco acinzentado, afunilando para baixo)
    const a30 = nvAnel(14, 100, ang), a60 = nvAnel(60, 158, ang), a82 = nvAnel(82, 162, ang);
    trG.fillStyle = "#c9d1da";
    trG.beginPath(); trG.ellipse(a60.cx, a60.cy, a60.rx, a60.ry, 0, 0, Math.PI * 2); trG.fill();
    nvFaixa(a30, a60, "#e6ebf0");
    trG.fillStyle = "#d5dce3";
    trG.beginPath(); trG.ellipse(a30.cx, a30.cy, a30.rx, a30.ry, 0, 0, Math.PI * 2); trG.fill();
    // faixa preta com as escotilhas azuis
    nvFaixa(a60, a82, "#1c1c2a");
    trG.fillStyle = "#26263a";
    trG.beginPath(); trG.ellipse(a82.cx, a82.cy, a82.rx, a82.ry, 0, 0, Math.PI * 2); trG.fill();
    for (let i = 0; i < 18; i++) {
        const a = i / 18 * Math.PI * 2;
        const r = trRot(Math.sin(a), Math.cos(a), ang);
        if (r[1] < 0.15) continue;
        const p = trProj(Math.sin(a) * 162, 71, Math.cos(a) * 162, ang), k = p[3];
        trG.fillStyle = "#7fb2e6";
        trG.beginPath(); trG.ellipse(p[0], p[1], 6 * k * r[1], 6 * k, 0, 0, Math.PI * 2); trG.fill();
        trG.fillStyle = "#d6ecff";
        trG.beginPath(); trG.ellipse(p[0] - 1.5 * k * r[1], p[1] - 2 * k, 2 * k * r[1], 2 * k, 0, 0, Math.PI * 2); trG.fill();
    }

    // calombos amarelos: relevo do próprio casco de baixo, encostados embaixo da faixa preta
    porProfundidade(calombos).forEach(a => nvDrawPod(a, ang));

    // cúpula branca com a faixa cor de madeira listrada
    const d0 = nvAnel(82, 158, ang), d1 = nvAnel(100, 150, ang), d2 = nvAnel(124, 124, ang), dTopo = nvAnel(146, 70, ang);
    const alturaDomo = (a82.cy - dTopo.cy) + dTopo.ry * 0.6;
    const branco = trG.createLinearGradient(d0.cx - d0.rx, 0, d0.cx + d0.rx, 0);
    branco.addColorStop(0, "#c7ced6"); branco.addColorStop(0.35, "#f7f9fb"); branco.addColorStop(1, "#b9c1ca");
    trG.fillStyle = branco;
    trG.beginPath();
    trG.moveTo(d0.cx - d0.rx, d0.cy);
    trG.bezierCurveTo(d0.cx - d0.rx, d0.cy - alturaDomo * 0.7, d0.cx - d0.rx * 0.45, d0.cy - alturaDomo, d0.cx, d0.cy - alturaDomo);
    trG.bezierCurveTo(d0.cx + d0.rx * 0.45, d0.cy - alturaDomo, d0.cx + d0.rx, d0.cy - alturaDomo * 0.7, d0.cx + d0.rx, d0.cy);
    trG.ellipse(d0.cx, d0.cy, d0.rx, d0.ry, 0, 0, Math.PI);
    trG.closePath();
    trG.fill();
    nvFaixa(d1, d2, "#c98a52");
    // listras da faixa (giram com a câmera)
    trG.strokeStyle = "rgba(120, 70, 30, 0.6)";
    trG.lineWidth = 1;
    trG.beginPath();
    for (let i = 0; i < 40; i++) {
        const a = i / 40 * Math.PI * 2;
        const r = trRot(Math.sin(a), Math.cos(a), ang);
        if (r[1] < 0.05) continue;
        const p1 = trProj(Math.sin(a) * 150, 100, Math.cos(a) * 150, ang), p2 = trProj(Math.sin(a) * 124, 124, Math.cos(a) * 124, ang);
        trG.moveTo(p1[0], p1[1]); trG.lineTo(p2[0], p2[1]);
    }
    trG.stroke();
    // escotilha escura no topo
    trG.fillStyle = "#eef1f4";
    trG.beginPath(); trG.ellipse(dTopo.cx, d0.cy - alturaDomo * 0.93, dTopo.rx * 0.78, Math.max(3, dTopo.ry * 0.8), 0, 0, Math.PI * 2); trG.fill();
    trG.strokeStyle = "#a9b2bc"; trG.lineWidth = 1.5; trG.stroke();
    trG.fillStyle = "#2c3038";
    trG.beginPath(); trG.ellipse(dTopo.cx, d0.cy - alturaDomo * 0.93, dTopo.rx * 0.55, Math.max(2, dTopo.ry * 0.55), 0, 0, Math.PI * 2); trG.fill();

    // cabine: vidro roxo curvado na cúpula, com o suporte em volta
    nvDrawCockpit(ang);

    // pernas da frente (saem de baixo do casco, entre os calombos)
    porProfundidade(pernas).forEach(a => { if (naFrente(a)) nvDrawLeg(a, ang, true); });
}

// Paisagem de Namek ao fundo (360°): céu verde-amarelado, mar azul no horizonte, morros de pedra altos de
// topo reto e as árvores de bolinha. Desenhada uma vez numa faixa e só deslocada a cada quadro.
const NV_PANO_W = Math.round(Math.PI * 2 * NV_CAM.F);
let nvPanorama = null;
function getFreezaShipPanorama() {
    if (c3Valida(nvPanorama)) return nvPanorama;
    const f = c3NovaFaixa(NV_PANO_W, NV_CAM.HY + 8);   // na resolução real da tela (nítido)
    if (!f) return null;
    const { c, g } = f;
    const W = NV_PANO_W, base = NV_CAM.HY + 4;
    const ceu = g.createLinearGradient(0, 0, 0, base);
    ceu.addColorStop(0, "#7ccf5a"); ceu.addColorStop(0.6, "#c4e87a"); ceu.addColorStop(1, "#e9f6b4");
    g.fillStyle = ceu;
    g.fillRect(0, 0, W, c.__h);
    // nuvens claras
    g.fillStyle = "rgba(245, 255, 220, 0.75)";
    for (let i = 0; i < 12; i++) {
        const x = (i * 331.7) % W, y = 20 + (i * 29) % 46, r = 10 + (i * 5) % 12;
        [-W, 0, W].forEach(dx => { g.beginPath(); g.ellipse(x + dx, y, r * 3, r, 0, 0, Math.PI * 2); g.fill(); });
    }
    // mar azul no horizonte
    g.fillStyle = "#4fb3c9";
    g.fillRect(0, base - 8, W, 12);
    // morros de pedra de Namek (altos, de topo reto e arredondado), com faixas de camadas
    const morros = [[0.05, 60, 70], [0.14, 40, 46], [0.27, 80, 88], [0.4, 50, 58], [0.55, 90, 76], [0.66, 44, 52], [0.8, 70, 96], [0.92, 54, 60]];
    morros.forEach(([pos, larg, alt]) => {
        const x = pos * W;
        [-W, 0, W].forEach(dx => {
            const x0 = x + dx;
            if (x0 + larg < 0 || x0 - larg > W) return;
            g.fillStyle = "#e3c3b0";
            g.beginPath();
            g.moveTo(x0 - larg / 2, base);
            g.lineTo(x0 - larg / 2 + 6, base - alt + 10);
            g.quadraticCurveTo(x0, base - alt - 6, x0 + larg / 2 - 6, base - alt + 10);
            g.lineTo(x0 + larg / 2, base);
            g.closePath(); g.fill();
            g.fillStyle = "#c79f8a";
            g.fillRect(x0 + larg * 0.12, base - alt + 10, larg * 0.38 - 6, alt - 10);
            g.fillStyle = "rgba(150, 110, 95, 0.5)";
            for (let k = 1; k <= 3; k++) g.fillRect(x0 - larg / 2 + 6, base - alt * k / 4, larg - 12, 2);
            g.fillStyle = "#5cbf6a";
            g.beginPath(); g.ellipse(x0, base - alt + 4, larg / 2 - 6, 5, 0, Math.PI, 0); g.fill();
        });
    });
    // árvores de Namek (tronco fino com bolinha em cima)
    for (let i = 0; i < 16; i++) {
        const x = (i * 241.3 + 90) % W, h = 18 + (i * 7) % 14;
        [-W, 0, W].forEach(dx => {
            const x0 = x + dx;
            g.strokeStyle = "#7b8b4a"; g.lineWidth = 2;
            g.beginPath(); g.moveTo(x0, base); g.lineTo(x0, base - h); g.stroke();
            g.fillStyle = "#3f9b4f";
            g.beginPath(); g.arc(x0, base - h - 5, 6, 0, Math.PI * 2); g.fill();
        });
    }
    nvPanorama = c;
    return c;
}

// Detalhes do chão de Namek (fixos no mundo): lagos, manchas de grama, pedras quebradas e tufos.
const NV_CHAO = (() => {
    const itens = [];
    let semente = 7;
    const rnd = () => { semente = (semente * 9301 + 49297) % 233280; return semente / 233280; };
    for (let i = 0; i < 46; i++) {
        const a = rnd() * Math.PI * 2, r = 250 + rnd() * 1500;
        const tipo = i % 5 === 0 ? "lago" : i % 5 === 1 ? "grama" : i % 5 === 2 ? "tufo" : "pedra";
        itens.push({ x: Math.sin(a) * r, z: Math.cos(a) * r, tipo, tam: 20 + rnd() * 50, giro: rnd() * Math.PI });
    }
    return itens;
})();

function drawFreezaShipGround(ang) {
    const pano = getFreezaShipPanorama();
    if (pano) {
        c3BlitPanorama(pano, ang, NV_CAM.F, NV_CAM.CX);
    } else {
        ctx.fillStyle = "#c4e87a";
        ctx.fillRect(0, 0, canvas.width, NV_CAM.HY);
    }
    // chão azul-esverdeado de Namek, mais claro lá longe
    const chao = ctx.createLinearGradient(0, NV_CAM.HY, 0, canvas.height);
    chao.addColorStop(0, "#9fd8d0"); chao.addColorStop(0.3, "#68bccb"); chao.addColorStop(1, "#3f93b0");
    ctx.fillStyle = chao;
    ctx.fillRect(0, NV_CAM.HY + 3, canvas.width, canvas.height - NV_CAM.HY);
    // detalhes do chão, do mais longe para o mais perto (é o que passa rápido perto dos lutadores)
    const lim = NV_CAM.D - NV_CAM.PERTO * 2;
    NV_CHAO
        .map(it => ({ it, r: trRot(it.x, it.z, ang) }))
        .filter(o => o.r[1] < lim)
        .sort((a, b) => a.r[1] - b.r[1])
        .forEach(({ it }) => {
            const p = trProj(it.x, 0, it.z, ang), k = p[3], t = it.tam;
            if (p[1] < NV_CAM.HY) return;
            if (it.tipo === "lago") {
                ctx.fillStyle = "#8fe3f2";
                ctx.beginPath(); ctx.ellipse(p[0], p[1], t * 1.6 * k, t * 0.35 * k, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
                ctx.beginPath(); ctx.ellipse(p[0] - t * 0.4 * k, p[1] - t * 0.06 * k, t * 0.5 * k, t * 0.06 * k, 0, 0, Math.PI * 2); ctx.fill();
            } else if (it.tipo === "grama") {
                ctx.fillStyle = "rgba(60, 150, 120, 0.55)";
                ctx.beginPath(); ctx.ellipse(p[0], p[1], t * 2 * k, t * 0.4 * k, 0, 0, Math.PI * 2); ctx.fill();
            } else if (it.tipo === "tufo") {
                ctx.strokeStyle = "#2f8a6a"; ctx.lineWidth = Math.max(1, 1.5 * k);
                ctx.beginPath();
                for (let j = -2; j <= 2; j++) { ctx.moveTo(p[0] + j * 3 * k, p[1]); ctx.lineTo(p[0] + j * 5 * k, p[1] - 10 * k); }
                ctx.stroke();
            } else {
                // pedra quebrada (lascas cor-de-rosa acinzentadas)
                const h = t * 0.5 * k, w = t * 0.6 * k;
                ctx.fillStyle = "#d9b8ad";
                ctx.beginPath();
                ctx.moveTo(p[0] - w, p[1]); ctx.lineTo(p[0] - w * 0.5, p[1] - h); ctx.lineTo(p[0] + w * 0.3, p[1] - h * 0.8); ctx.lineTo(p[0] + w, p[1]);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = "#b08e85";
                ctx.beginPath();
                ctx.moveTo(p[0] + w * 0.3, p[1] - h * 0.8); ctx.lineTo(p[0] + w, p[1]); ctx.lineTo(p[0] + w * 0.1, p[1]);
                ctx.closePath(); ctx.fill();
            }
        });
}

function drawFreezaShipStage(ang) {
    trCam = NV_CAM;
    try {
        drawFreezaShipGround(ang);
        drawCachedOrbitLayer(nvCena, ang, drawFreezaShipScene);
    } finally {
        trCam = TR_CAM;
    }
}

// ==================== DESENHO DAS ARENAS DBZ POLIDAS HD ====================
function drawStageBackground() {
    ctx.save();
    let scroll = world.stageScrollX;

    if (selectedStage === "terra") {
        drawTerraArenaStage(getStageLapAngle(scroll, TERRA_ARENA_LAP_SCROLL));
    }
    else if (selectedStage === "namek") {
        drawNamekStage(getForwardTravel(scroll));
    }
    else if (selectedStage === "kaio") {
        drawKaioPlanetStage(getStageLapAngle(scroll, KAIO_PLANET_LAP_SCROLL));
    }
    else if (selectedStage === "time_room") {
        drawTimeRoomStage(getTimeRoomOrbitAngle(scroll));
    } 
    else if (selectedStage === "freeza_ship") {
        drawFreezaShipStage(getFreezaShipOrbitAngle(scroll));
    }
    else if (selectedStage === "kaioshin") {
        drawKaioshinStage(getStageLapAngle(scroll, KAIOSHIN_LAP_SCROLL));
    }
    else if (selectedStage === "namek_explosao") {
        drawNamekExplodingStage(getForwardTravel(scroll));
    }
    else if (selectedStage === "cell_games") {
        drawCellArenaStage(getCellArenaOrbitAngle(scroll));
    }
    else if (selectedStage === "kame") {
        drawKameIslandStage(getStageLapAngle(scroll, KAME_ISLAND_LAP_SCROLL));
    }
    else if (selectedStage === "plataforma_celestial") {
        drawPlataformaStage(getStageLapAngle(scroll, PLATAFORMA_LAP_SCROLL));
    }
    else if (selectedStage === "capital_oeste") {
        drawCapitalStage(getStageLapAngle(scroll, CAPITAL_LAP_SCROLL));
    }
    else if (typeof drawArenaCriadaStage === "function") {
        drawArenaCriadaStage(selectedStage, scroll);   // arena criada no EDITOR DE ARENAS (arenas.js)
    }

    ctx.restore();
}


// ==================== CENARIOS3D.JS - FASES EM 3D (KAIOH, TORNEIO, SUPREMO KAIOH, NAMEK) ====================
// Cenários das fases redesenhados no estilo do jogo (nenhuma imagem do anime é usada), em 3D com perspectiva:
//  - Planeta do Sr. Kaioh: o planetinha verde gira e os lutadores voam por cima da estrada dando a volta nele.
//  - Torneio de Artes Marciais e Planeta Supremo Kaioh: câmera gira em volta dos lutadores no meio da arena
//    (mesma câmera do Torneio de Cell, ver caProj/caPoly em menu.js).
//  - Planeta Namek e Namek Prestes a Explodir: câmera andando de lado (na direção dos lutadores); o caminho é gerado aos poucos
//    (árvores, morros, pedras sempre um pouco diferentes, mas no mesmo estilo).
// Só desenha — chamado por drawStageBackground (menu.js) durante o render. Carrega depois de menu.js.

// Número pseudoaleatório fixo para um inteiro (o mesmo trecho do caminho sempre sai igual).
function c3Hash(n) {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
}

// Copia uma paisagem de 360° (faixa) deslocada conforme o ângulo da câmera que gira em volta do centro.
function c3BlitPanorama(pano, ang, F, CX) {
    if (!pano) return false;
    const W = pano.__w || pano.width, H = pano.__h || pano.height;
    let u0 = (-(ang + Math.PI) * F) % W;
    if (u0 < 0) u0 += W;
    const x0 = CX - u0;
    ctx.drawImage(pano, x0, 0, W, H);
    ctx.drawImage(pano, x0 + W, 0, W, H);
    if (x0 > 0) ctx.drawImage(pano, x0 - W, 0, W, H);
    return true;
}

// Imagem guardada de um cenário, feita na resolução REAL da tela (renderScale): fica nítida como o resto do
// jogo. Medidas lógicas em c.__w/c.__h (o contexto já vem escalado); c.__k diz em que resolução foi feita.
function c3NovaFaixa(largura, altura) {
    const k = typeof renderScale === "number" ? renderScale : 1;
    const c = document.createElement("canvas");
    c.width = Math.ceil(largura * k);
    c.height = Math.ceil(altura * k);
    c.__w = largura; c.__h = altura; c.__k = k;
    const g = c.getContext && c.getContext("2d");
    if (g && g.scale) g.scale(k, k);
    return g ? { c, g } : null;
}
// a imagem guardada ainda serve? (refeita quando a resolução da tela muda)
function c3Valida(c) { return !!c && (c.__k || 1) === (typeof renderScale === "number" ? renderScale : 1); }
function c3Img(img, x, y) { ctx.drawImage(img, x, y, img.__w || img.width, img.__h || img.height); }

// Desenha algo numa faixa de 360° repetindo nas emendas (para não ficar cortado na volta).
function c3NaVolta(W, x, larg, desenha) {
    [-W, 0, W].forEach(dx => { if (x + dx + larg > 0 && x + dx - larg < W) desenha(x + dx); });
}

// ==================== PLANETA DO SR. KAIOH ====================
// O planetinha visto um pouco de cima, bem perto: a estrada branca do equador fica na horizontal, no meio da
// tela, e o planeta gira em volta do eixo de pé — os lutadores voam por cima da estrada dando a volta nele.
const KP = { CX: 400, CY: 268, R: 196, INCL: 0.24, ROLL: -0.32 };   // ROLL: planeta inclinado (rua sobe para a direita)

// ponto na superfície (latitude, longitude) -> tela; d > 0 = lado virado para a câmera
function kpProj(lat, lon, ang, alt = 0) {
    const r = KP.R + alt;
    const cl = Math.cos(lat), x3 = cl * Math.sin(lon + ang), y3 = Math.sin(lat), z3 = cl * Math.cos(lon + ang);
    const ci = Math.cos(KP.INCL), si = Math.sin(KP.INCL);
    const dx = r * x3, dy = -r * (y3 * ci - z3 * si), cr = Math.cos(KP.ROLL), sr = Math.sin(KP.ROLL);
    return { x: KP.CX + dx * cr - dy * sr, y: KP.CY + dx * sr + dy * cr, d: z3 * ci + y3 * si, nx: x3, ny: -(y3 * ci - z3 * si) };
}

// Coisas em cima do planeta: casinhas, árvores, o carro e o poço; e manchas de grama (giram junto e mostram
// o movimento). Latitude/longitude em graus.
const KP_COISAS = (() => {
    const lista = [
        // a casa do Sr. Kaioh (duas cúpulas juntas) logo na beira da pista
        { tipo: "casa", lat: 15, lon: 14, tam: 0.75 }, { tipo: "casa", lat: 14, lon: 6, tam: 1 },
        { tipo: "arvore", lat: 30, lon: -22, tam: 1.15 }, { tipo: "arvore", lat: 46, lon: 52, tam: 0.9 },
        { tipo: "arvore", lat: -28, lon: 75, tam: 1.05 }, { tipo: "arvore", lat: 18, lon: 140, tam: 1 },
        { tipo: "arvore", lat: -24, lon: -120, tam: 1.1 }, { tipo: "arvore", lat: 36, lon: -160, tam: 0.95 },
        { tipo: "arvore", lat: -32, lon: 200, tam: 0.9 }, { tipo: "arvore", lat: 24, lon: 230, tam: 1 },
        { tipo: "carro", lat: 0, lon: 60, tam: 1 }, { tipo: "poco", lat: 24, lon: -4, tam: 1 }
    ];
    return lista.map(o => Object.assign({}, o, { lat: o.lat * Math.PI / 180, lon: o.lon * Math.PI / 180 }));
})();
const KP_MANCHAS = (() => {
    const m = [];
    for (let i = 0; i < 70; i++) {
        let lat = (c3Hash(i) * 2 - 1) * 1.25;
        if (Math.abs(lat) < 0.16) lat += lat < 0 ? -0.2 : 0.2;   // não em cima da estrada
        m.push({ lat, lon: c3Hash(i + 99) * Math.PI * 2, tam: 6 + c3Hash(i + 7) * 16, claro: c3Hash(i + 3) > 0.5 });
    }
    return m;
})();

function kpDrawCoisa(o, p) {
    // de pé na superfície: no meio do planeta ficam retas e, perto da borda, se inclinam para fora
    const ang = Math.asin(Math.max(-1, Math.min(1, p.nx)));
    const k = o.tam;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(ang + KP.ROLL);
    if (o.tipo === "arvore") {
        ctx.fillStyle = "#7a5530";
        ctx.fillRect(-3 * k, -18 * k, 6 * k, 18 * k);
        ctx.fillStyle = "#2f8a3e";
        [[0, -34, 17], [-13, -24, 12], [13, -24, 12], [-7, -44, 11], [8, -43, 11]].forEach(([x, y, r]) => {
            ctx.beginPath(); ctx.arc(x * k, y * k, r * k, 0, Math.PI * 2); ctx.fill();
        });
        ctx.fillStyle = "#4fb05a";
        [[-5, -38, 7], [6, -30, 6], [-11, -26, 5]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x * k, y * k, r * k, 0, Math.PI * 2); ctx.fill(); });
    } else if (o.tipo === "casa") {
        // casinha redonda laranja (cúpula) com porta
        const g = ctx.createRadialGradient(-6 * k, -18 * k, 2, 0, -10 * k, 22 * k);
        g.addColorStop(0, "#ffd08a"); g.addColorStop(1, "#e8742a");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(0, 0, 20 * k, 22 * k, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "#a9461a"; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.strokeStyle = "rgba(169, 70, 26, 0.6)";
        ctx.beginPath(); ctx.ellipse(0, -2 * k, 17 * k, 13 * k, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
        ctx.fillStyle = "#5b2a12";
        ctx.beginPath(); ctx.ellipse(4 * k, 0, 5 * k, 9 * k, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.ellipse(-8 * k, -12 * k, 3.5 * k, 3 * k, 0, 0, Math.PI * 2); ctx.fill();
    } else if (o.tipo === "carro") {
        ctx.fillStyle = "#e23b3b";
        ctx.beginPath(); ctx.ellipse(0, -6 * k, 13 * k, 7 * k, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
        ctx.fillRect(-15 * k, -7 * k, 30 * k, 6 * k);
        ctx.fillStyle = "#bfe6ff";
        ctx.fillRect(-5 * k, -11 * k, 9 * k, 4 * k);
        ctx.fillStyle = "#222";
        ctx.beginPath(); ctx.arc(-9 * k, -1 * k, 3 * k, 0, Math.PI * 2); ctx.arc(9 * k, -1 * k, 3 * k, 0, Math.PI * 2); ctx.fill();
    } else {
        // poço de pedra
        ctx.fillStyle = "#cfd6dc";
        ctx.fillRect(-9 * k, -8 * k, 18 * k, 8 * k);
        ctx.fillStyle = "#8d9aa6";
        ctx.beginPath(); ctx.ellipse(0, -8 * k, 9 * k, 3 * k, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#4a7fb5";
        ctx.beginPath(); ctx.ellipse(0, -8 * k, 6 * k, 1.8 * k, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

let kpCeu = null;
function getKaioSky() {
    if (c3Valida(kpCeu)) return kpCeu;
    const f = c3NovaFaixa(canvas.width, canvas.height);
    if (!f) return null;
    const { c, g } = f;
    const ceu = g.createLinearGradient(0, 0, 0, c.__h);
    ceu.addColorStop(0, "#f2a3cf"); ceu.addColorStop(0.55, "#f7c4de"); ceu.addColorStop(1, "#fbe0ec");
    g.fillStyle = ceu;
    g.fillRect(0, 0, c.__w, c.__h);
    // nuvens rosadas bem clarinhas
    g.fillStyle = "rgba(255, 240, 248, 0.6)";
    [[90, 50, 50], [640, 70, 64], [330, 30, 38], [730, 180, 40], [40, 200, 34]].forEach(([x, y, r]) => {
        g.beginPath(); g.ellipse(x, y, r * 1.8, r * 0.45, 0, 0, Math.PI * 2); g.fill();
    });
    kpCeu = c;
    return c;
}

function drawKaioPlanetStage(ang) {
    const ceu = getKaioSky();
    if (ceu) c3Img(ceu, 0, 0);
    else { ctx.fillStyle = "#f7c4de"; ctx.fillRect(0, 0, canvas.width, canvas.height); }

    // mar de nuvens douradas lá embaixo (o Caminho da Serpente), andando devagar
    const t = (typeof gameplayClock === "number" ? gameplayClock : 0);
    ctx.fillStyle = "#f2b640";
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (let x = 0; x <= canvas.width; x += 20) ctx.lineTo(x, 300 + Math.sin(x * 0.03 + t * 0.6) * 6 + Math.sin(x * 0.011) * 10);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255, 220, 120, 0.85)";
    for (let i = 0; i < 9; i++) {
        const x = ((i * 113 - t * 14) % (canvas.width + 120) + canvas.width + 120) % (canvas.width + 120) - 60;
        ctx.beginPath(); ctx.ellipse(x, 312 + (i % 3) * 12, 46, 9, 0, 0, Math.PI * 2); ctx.fill();
    }

    // coisas atrás do planeta (as que passam da borda aparecem por trás)
    const coisas = KP_COISAS.map(o => ({ o, p: kpProj(o.lat, o.lon, ang) }));
    coisas.filter(c => c.p.d <= 0 && c.p.d > -0.35).forEach(c => kpDrawCoisa(c.o, c.p));

    // o planeta: bola verde com luz vindo do alto à esquerda
    const g = ctx.createRadialGradient(KP.CX - KP.R * 0.35, KP.CY - KP.R * 0.45, KP.R * 0.1, KP.CX, KP.CY, KP.R);
    g.addColorStop(0, "#e6f8a2"); g.addColorStop(0.45, "#9fdc5a"); g.addColorStop(0.85, "#6cbf3c"); g.addColorStop(1, "#4f9c2c");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(KP.CX, KP.CY, KP.R, 0, Math.PI * 2); ctx.fill();

    // manchas de grama (giram com o planeta — é o que mostra os lutadores dando a volta)
    KP_MANCHAS.forEach(m => {
        const p = kpProj(m.lat, m.lon, ang);
        if (p.d < 0.08) return;
        ctx.fillStyle = m.claro ? "rgba(225, 250, 160, 0.45)" : "rgba(60, 140, 40, 0.35)";
        // achatadas perto da borda (vistas de lado)
        const rx = m.tam * Math.max(0.2, Math.sqrt(Math.max(0, 1 - p.nx * p.nx))), ry = m.tam * 0.5 * Math.max(0.2, p.d);
        ctx.beginPath(); ctx.ellipse(p.x, p.y, rx, ry, KP.ROLL, 0, Math.PI * 2); ctx.fill();
    });

    // a estrada branca do equador (cruzando o planeta inclinado)
    const meia = 0.12, passos = 36, borda = [];
    for (let i = 0; i <= passos; i++) { const mu = -Math.PI / 2 + i / passos * Math.PI; borda.push(kpProj(meia, mu - ang, ang)); }
    const bordaB = [];
    for (let i = passos; i >= 0; i--) { const mu = -Math.PI / 2 + i / passos * Math.PI; bordaB.push(kpProj(-meia, mu - ang, ang)); }
    ctx.fillStyle = "#f6f2e2";
    ctx.beginPath();
    borda.concat(bordaB).forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#c9c2a6"; ctx.lineWidth = 1.5;
    ctx.beginPath(); borda.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
    ctx.beginPath(); bordaB.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
    // marquinhas na estrada que passam com o giro
    ctx.strokeStyle = "rgba(170, 160, 130, 0.55)"; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 48; i++) {
        const lon = i / 48 * Math.PI * 2;
        const a = kpProj(meia * 0.55, lon, ang), b = kpProj(-meia * 0.55, lon, ang);
        if (a.d < 0.15) continue;
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();

    // brilho na borda do planeta
    ctx.strokeStyle = "rgba(240, 255, 200, 0.7)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(KP.CX, KP.CY, KP.R - 1.5, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();

    // coisas na frente
    coisas.filter(c => c.p.d > 0).sort((a, b) => a.p.d - b.p.d).forEach(c => kpDrawCoisa(c.o, c.p));
}

// ==================== TORNEIO DE ARTES MARCIAIS ====================
// Igual ao Torneio de Cell: os lutadores no meio da arena e a câmera girando em volta deles, na altura deles.
// Em volta: o muro com a plateia, os guarda-sóis azuis, o portão com as duas cabeças de demônio e a escadaria
// e, ao fundo, o templo de telhado marrom. Usa a câmera da arena (caProj/caPoly/caLine em menu.js).
const TA_MURO_R = 540, TA_MURO_ALT = 34, TA_PORTAO_Z = -450;

let taPanorama = null;
function getTerraPanorama() {
    if (c3Valida(taPanorama)) return taPanorama;
    const W = Math.round(Math.PI * 2 * CA_F), base = CA_HY + 4;
    const f = c3NovaFaixa(W, CA_HY + 8);
    if (!f) return null;
    const { c, g } = f;
    const ceu = g.createLinearGradient(0, 0, 0, base);
    ceu.addColorStop(0, "#3f8ee0"); ceu.addColorStop(0.7, "#9ad0f5"); ceu.addColorStop(1, "#dff1fb");
    g.fillStyle = ceu;
    g.fillRect(0, 0, W, c.__h);
    g.fillStyle = "rgba(255, 255, 255, 0.92)";
    for (let i = 0; i < 12; i++) {
        const x = c3Hash(i + 40) * W, y = 16 + c3Hash(i + 41) * 50, r = 10 + c3Hash(i + 42) * 12;
        c3NaVolta(W, x, r * 4, x0 => {
            [[0, 0, 1], [r * 1.1, -r * 0.4, 1.2], [r * 2.3, 0, 0.9]].forEach(b => { g.beginPath(); g.arc(x0 + b[0], y + b[1], r * b[2], 0, Math.PI * 2); g.fill(); });
        });
    }
    // copas de árvores ao longe, por trás do muro da plateia
    for (let i = 0; i < 70; i++) {
        const x = i / 70 * W + c3Hash(i) * 20, r = 12 + c3Hash(i + 5) * 16;
        g.fillStyle = i % 2 ? "#2f7a3a" : "#3e8f44";
        c3NaVolta(W, x, r, x0 => { g.beginPath(); g.arc(x0, base - 6 - c3Hash(i + 9) * 10, r, 0, Math.PI * 2); g.fill(); });
    }
    // o templo do torneio, atrás do portão (direção do portão = metade da faixa)
    const tx = W / 2, tl = 300, ty = base - 8;
    g.fillStyle = "#f3efe4";
    g.fillRect(tx - tl / 2, ty - 34, tl, 34);
    g.fillStyle = "#c0392b";
    g.fillRect(tx - tl / 2, ty - 34, tl, 4);
    g.fillStyle = "#3b4a8c";
    for (let i = 0; i < 9; i++) g.fillRect(tx - tl / 2 + 14 + i * 32, ty - 24, 18, 8);
    g.fillStyle = "#8a5a2b";   // telhado marrom (de palha)
    g.beginPath();
    g.moveTo(tx - tl / 2 - 20, ty - 32); g.lineTo(tx - tl / 2 + 30, ty - 76); g.lineTo(tx + tl / 2 - 30, ty - 76); g.lineTo(tx + tl / 2 + 20, ty - 32);
    g.closePath(); g.fill();
    g.strokeStyle = "rgba(60, 35, 15, 0.45)"; g.lineWidth = 1;
    for (let i = 0; i < 30; i++) { const x = tx - tl / 2 + 10 + i * 10; g.beginPath(); g.moveTo(x, ty - 74); g.lineTo(x - 6, ty - 34); g.stroke(); }
    g.fillStyle = "#f7f3e8";   // placa do torneio
    g.fillRect(tx - 60, ty - 74, 120, 18);
    g.strokeStyle = "#c0392b"; g.lineWidth = 2; g.strokeRect(tx - 60, ty - 74, 120, 18);
    g.fillStyle = "#c0392b"; g.font = "bold 11px monospace"; g.textAlign = "center";
    g.fillText("TORNEIO", tx, ty - 61);
    taPanorama = c;
    return c;
}

// Fachada do portão (desenhada uma vez): escadaria roxa no meio subindo até a porta, colunas douradas e as
// duas cabeças de demônio com chifres nos painéis vermelhos.
let taPortao = null;
const TA_PORTAO = { larg: 240, alt: 150 };
function getTerraGate() {
    if (c3Valida(taPortao)) return taPortao;
    const E = 2, f = c3NovaFaixa(TA_PORTAO.larg * E, TA_PORTAO.alt * E);
    if (!f) return null;
    const { c, g } = f;
    g.scale(E, E);
    const L = TA_PORTAO.larg, A = TA_PORTAO.alt, cx = L / 2;
    // painéis vermelhos dos lados
    [[8, 70], [L - 78, 70]].forEach(([x, w]) => {
        g.fillStyle = "#c0392b"; g.fillRect(x, A - 92, w, 92);
        g.fillStyle = "#e8b04a"; g.fillRect(x, A - 96, w, 6);
        // cabeça de demônio: rosto cinza, chifres, olhos e presas
        const hx = x + w / 2, hy = A - 50;
        g.fillStyle = "#6b6f78";
        g.beginPath(); g.moveTo(hx - 22, hy - 18); g.quadraticCurveTo(hx - 36, hy - 44, hx - 20, hy - 46); g.quadraticCurveTo(hx - 24, hy - 30, hx - 12, hy - 22); g.fill();
        g.beginPath(); g.moveTo(hx + 22, hy - 18); g.quadraticCurveTo(hx + 36, hy - 44, hx + 20, hy - 46); g.quadraticCurveTo(hx + 24, hy - 30, hx + 12, hy - 22); g.fill();
        g.fillStyle = "#9aa0aa";
        g.beginPath(); g.ellipse(hx, hy, 26, 24, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#4b4f57";
        g.beginPath(); g.ellipse(hx - 10, hy - 6, 7, 5, 0.3, 0, Math.PI * 2); g.ellipse(hx + 10, hy - 6, 7, 5, -0.3, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#f3d250";
        g.beginPath(); g.arc(hx - 10, hy - 6, 2.2, 0, Math.PI * 2); g.arc(hx + 10, hy - 6, 2.2, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#3a3d44"; g.fillRect(hx - 13, hy + 8, 26, 8);
        g.fillStyle = "#ffffff";
        for (let i = 0; i < 5; i++) g.fillRect(hx - 12 + i * 5.2, hy + 8, 3, 4);
    });
    // colunas douradas ornamentadas
    [[cx - 46, 16], [cx + 30, 16]].forEach(([x, w]) => {
        g.fillStyle = "#e8b04a"; g.fillRect(x, A - 128, w, 128);
        g.fillStyle = "#c0392b"; for (let i = 0; i < 5; i++) g.fillRect(x + 3, A - 120 + i * 24, w - 6, 12);
        g.fillStyle = "#b8862e"; g.fillRect(x - 3, A - 134, w + 6, 8);
    });
    // escadaria roxa até a porta
    g.fillStyle = "#c9b8e8";
    for (let i = 0; i < 7; i++) {
        const w = 60 - i * 3, y = A - 8 - i * 10;
        g.fillRect(cx - w / 2, y, w, 8);
        g.fillStyle = i % 2 ? "#c9b8e8" : "#b7a3dd";
    }
    g.fillStyle = "#f3efe4"; g.fillRect(cx - 22, A - 108, 44, 34);
    g.fillStyle = "#c0392b"; g.beginPath(); g.arc(cx, A - 92, 8, 0, Math.PI * 2); g.fill();
    taPortao = c;
    return c;
}

function taDrawGate(ang) {
    const z = TA_PORTAO_Z, L = TA_PORTAO.larg, A = TA_PORTAO.alt;
    const TL = caProj(-L / 2, A + CA_CHAO, z, ang), TR = caProj(L / 2, A + CA_CHAO, z, ang), BL = caProj(-L / 2, CA_CHAO, z, ang);
    if (CA_D - TL[2] < CA_PERTO * 3 || CA_D - TR[2] < CA_PERTO * 3) return;   // atrás da câmera
    const tex = getTerraGate();
    const ux = TR[0] - TL[0], uy = TR[1] - TL[1], vx = BL[0] - TL[0], vy = BL[1] - TL[1];
    const deFrente = ux * vy - uy * vx > 0;
    ctx.save();
    if (tex && deFrente) {
        ctx.transform(ux / tex.width, uy / tex.width, vx / tex.height, vy / tex.height, TL[0], TL[1]);
        ctx.drawImage(tex, 0, 0);
    } else {
        // visto por trás: parede de pedra
        const BR = caProj(L / 2, CA_CHAO, z, ang);
        ctx.fillStyle = "#b9a98f";
        ctx.beginPath(); ctx.moveTo(TL[0], TL[1] + (BL[1] - TL[1]) * 0.36); ctx.lineTo(TR[0], TR[1] + (BR[1] - TR[1]) * 0.36); ctx.lineTo(BR[0], BR[1]); ctx.lineTo(BL[0], BL[1]); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
}

// Muro com a plateia em volta da arena (em 3D, só a parte na frente da câmera).
const TA_PLATEIA_CORES = ["#e74c3c", "#f1c40f", "#3498db", "#2ecc71", "#ecf0f1", "#9b59b6", "#e67e22", "#34495e", "#f5cba7"];
// Cada pedaço do muro (com as cabeças da plateia em cima) é uma textura pronta, desenhada com uma transformação
// afim: poucas chamadas por quadro em vez de centenas de retângulos.
const TA_PLATEIA_ALT = 26;   // altura das cabeças acima do muro
let taPlateiaTex = null;
function getTerraCrowdTiles() {
    if (taPlateiaTex && c3Valida(taPlateiaTex[0])) return taPlateiaTex;
    const lista = [];
    for (let v = 0; v < 4; v++) {
        const f = c3NovaFaixa(48, TA_MURO_ALT + TA_PLATEIA_ALT);
        if (!f) return null;
        const { c, g } = f;
        for (let fil = 0; fil < 3; fil++) {
            for (let j = 0; j < 4; j++) {
                const x = (j + 0.5 + (fil % 2) * 0.5) / 4.5 * 48, y = TA_PLATEIA_ALT - 6 - fil * 7;
                g.fillStyle = TA_PLATEIA_CORES[(v * 7 + j * 3 + fil * 5) % TA_PLATEIA_CORES.length];
                g.fillRect(x - 3, y, 6, 6);
                g.fillStyle = "#2b1d14";
                g.fillRect(x - 2, y - 4, 4, 4);
            }
        }
        g.fillStyle = v % 2 ? "#c9a07a" : "#bf966f";
        g.fillRect(0, TA_PLATEIA_ALT, 48, TA_MURO_ALT);
        g.fillStyle = "#8d2d22";
        g.fillRect(0, TA_PLATEIA_ALT, 48, 3);
        lista.push(c);
    }
    return (taPlateiaTex = lista);
}
function taDrawCrowdWall(ang) {
    const N = 72, R = TA_MURO_R, lim = CA_D - CA_PERTO * 3;
    const tiles = getTerraCrowdTiles();
    if (!tiles) return;
    const segs = [];
    for (let i = 0; i < N; i++) {
        const a0 = i / N * Math.PI * 2, a1 = (i + 1) / N * Math.PI * 2;
        if (Math.abs(Math.cos(((a0 + a1) / 2) - (ang + Math.PI))) < 0.02) continue;
        const r0 = caRot(Math.sin(a0) * R, Math.cos(a0) * R, ang), r1 = caRot(Math.sin(a1) * R, Math.cos(a1) * R, ang);
        if (r0[1] > lim || r1[1] > lim) continue;
        segs.push({ i, a0, a1, d: (r0[1] + r1[1]) / 2 });
    }
    const topo = CA_CHAO + TA_MURO_ALT + TA_PLATEIA_ALT;
    ctx.save();   // mantém o tremor de tela (translate) que já está aplicado
    const base = ctx.getTransform ? ctx.getTransform() : null;
    segs.sort((a, b) => a.d - b.d).forEach(sg => {
        const TL = caProj(Math.sin(sg.a0) * R, topo, Math.cos(sg.a0) * R, ang), TR = caProj(Math.sin(sg.a1) * R, topo, Math.cos(sg.a1) * R, ang);
        const BL = caProj(Math.sin(sg.a0) * R, CA_CHAO, Math.cos(sg.a0) * R, ang);
        const tex = tiles[sg.i % tiles.length];
        // 2% a mais de largura para não aparecer fresta entre pedaços vizinhos
        const ux = (TR[0] - TL[0]) * 1.02, uy = (TR[1] - TL[1]) * 1.02;
        if (base) ctx.setTransform(base);
        ctx.transform(ux / tex.width, uy / tex.width, (BL[0] - TL[0]) / tex.height, (BL[1] - TL[1]) / tex.height, TL[0], TL[1]);
        ctx.drawImage(tex, 0, 0);
        if (!base) ctx.restore(), ctx.save();
    });
    ctx.restore();
}

// Guarda-sol azul (de pé, igual de todos os lados).
function taDrawParasol(px, py, k) {
    ctx.strokeStyle = "#ecf0f1"; ctx.lineWidth = Math.max(1, 3 * k);
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - 90 * k); ctx.stroke();
    const g = ctx.createRadialGradient(px - 12 * k, py - 104 * k, 2, px, py - 92 * k, 46 * k);
    g.addColorStop(0, "#7ec8ff"); g.addColorStop(0.6, "#2e86de"); g.addColorStop(1, "#1b5fa8");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(px, py - 88 * k, 44 * k, 26 * k, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#c0392b";
    ctx.fillRect(px - 44 * k, py - 90 * k, 88 * k, 4 * k);
}

function drawTerraArenaStage(ang) {
    if (!c3BlitPanorama(getTerraPanorama(), ang, CA_F, CA_CX)) { ctx.fillStyle = "#9ad0f5"; ctx.fillRect(0, 0, canvas.width, CA_HY + 6); }
    const grama = ctx.createLinearGradient(0, CA_HY, 0, canvas.height);
    grama.addColorStop(0, "#7fbf5a"); grama.addColorStop(0.3, "#5fa844"); grama.addColorStop(1, "#3f8a2f");
    ctx.fillStyle = grama;
    ctx.fillRect(0, CA_HY + 4, canvas.width, canvas.height - CA_HY);
    // faixas mais claras do gramado (passam por baixo e mostram o giro)
    ctx.strokeStyle = "rgba(170, 220, 120, 0.35)"; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let v = -600; v <= 600; v += 60) caLine(v, CA_CHAO, -600, v, CA_CHAO, 600, ang);
    ctx.stroke();

    taDrawCrowdWall(ang);
    taDrawGate(ang);

    // o tablado: lateral azul e o piso de azulejos claros
    const W = CA_W;
    const ladoVisivel = (mx, mz) => caRot(mx, mz, ang)[1] > 0;
    const cantos = [[-W, -W], [W, -W], [W, W], [-W, W]];
    for (let i = 0; i < 4; i++) {
        const A = cantos[i], C = cantos[(i + 1) % 4];
        if (!ladoVisivel((A[0] + C[0]) / 2, (A[1] + C[1]) / 2)) continue;
        ctx.fillStyle = "#2c3e9e";
        if (caPoly([[A[0], 0, A[1]], [C[0], 0, C[1]], [C[0], CA_CHAO, C[1]], [A[0], CA_CHAO, A[1]]], ang)) ctx.fill();
        ctx.fillStyle = "#c0392b";
        if (caPoly([[A[0], 0, A[1]], [C[0], 0, C[1]], [C[0], -4, C[1]], [A[0], -4, A[1]]], ang)) ctx.fill();
    }
    ctx.fillStyle = "#dedbea";
    if (caPoly([[-W, 0, -W], [W, 0, -W], [W, 0, W], [-W, 0, W]], ang)) ctx.fill();
    ctx.strokeStyle = "rgba(150, 140, 180, 0.6)"; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let v = -W; v <= W; v += 40) { caLine(v, 0, -W, v, 0, W, ang); caLine(-W, 0, v, W, 0, v, ang); }
    ctx.stroke();

    // guarda-sóis azuis em volta, do mais longe para o mais perto
    [[-330, -330], [330, -330], [330, 330], [-330, 330]]
        .map(([x, z]) => caProj(x, CA_CHAO, z, ang))
        .filter(p => CA_D - p[2] > CA_PERTO * 3)
        .sort((a, b) => a[2] - b[2])
        .forEach(p => taDrawParasol(p[0], p[1], p[3]));
}

// ==================== PLANETA SUPREMO KAIOH ====================
// Gramado verde com morros, pedras e penhascos de rocha, céu roxo com várias luas transparentes. Mesma câmera
// da arena (girando em volta dos lutadores, que ficam no meio do gramado), sem tablado.
let ksPanorama = null;
// Planetas do céu do Supremo Kaioh: cada um de um tipo (lua, gigante gasoso, planeta oceano, planeta como a
// Terra) — esfera com volume (luz do alto à esquerda, sombra no lado oposto e brilho na borda).
const KS_TIPOS_PLANETA = ["lua", "jupiter", "oceano", "terra"];
const KS_TIPOS_GRANDES = ["lua", "jupiter", "terra", "lua", "oceano", "jupiter", "lua", "terra", "jupiter"];
function ksPlaneta(g, x, y, r, tipo, semente) {
    const h = (k) => c3Hash(semente * 7 + k);
    g.save();
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.clip();
    if (tipo === "jupiter") {
        g.fillStyle = "#d9b48a"; g.fillRect(x - r, y - r, r * 2, r * 2);
        const faixas = ["#c98e5e", "#ecd5b0", "#b9764a", "#f2e2c6", "#c4875a", "#e3c39a", "#a8673f"];
        for (let i = 0; i < 9; i++) {
            const yy = y - r + (i + 0.5) * (r * 2 / 9) + Math.sin(i * 1.7 + semente) * r * 0.05;
            g.fillStyle = faixas[i % faixas.length];
            g.beginPath(); g.ellipse(x, yy, r * 1.2, r * (0.07 + h(i) * 0.06), 0, 0, Math.PI * 2); g.fill();
        }
        g.fillStyle = "#b5523a";   // grande mancha vermelha
        g.beginPath(); g.ellipse(x + r * 0.25, y + r * 0.3, r * 0.22, r * 0.12, 0, 0, Math.PI * 2); g.fill();
    } else if (tipo === "oceano") {
        const mar = g.createLinearGradient(x, y - r, x, y + r);
        mar.addColorStop(0, "#3fb6e8"); mar.addColorStop(1, "#1a5fae");
        g.fillStyle = mar; g.fillRect(x - r, y - r, r * 2, r * 2);
        for (let i = 0; i < 5; i++) {   // manchas mais claras de água rasa (sem traços)
            const cx = x + (h(i) - 0.5) * r * 1.4, cy = y + (h(i + 9) - 0.5) * r * 1.4, rr = r * (0.16 + h(i + 4) * 0.18);
            g.fillStyle = "rgba(140, 220, 255, 0.28)";
            g.beginPath(); g.ellipse(cx, cy, rr, rr * 0.6, h(i + 2) * 3, 0, Math.PI * 2); g.fill();
        }
        g.fillStyle = "#e9f7ff";   // calotas polares
        g.beginPath(); g.ellipse(x, y - r, r * 0.6, r * 0.18, 0, 0, Math.PI * 2); g.fill();
    } else if (tipo === "terra") {
        g.fillStyle = "#2f7fd0"; g.fillRect(x - r, y - r, r * 2, r * 2);
        for (let i = 0; i < 4; i++) {   // continentes verdes com bordas de areia
            const cx = x + (h(i) - 0.5) * r * 1.3, cy = y + (h(i + 5) - 0.5) * r * 1.2, rr = r * (0.25 + h(i + 2) * 0.25);
            g.fillStyle = "#d9c28a";
            g.beginPath(); g.ellipse(cx, cy, rr * 1.08, rr * 0.78, h(i + 7) * 3, 0, Math.PI * 2); g.fill();
            g.fillStyle = i % 2 ? "#4c9a3c" : "#3d8a35";
            g.beginPath(); g.ellipse(cx, cy, rr, rr * 0.7, h(i + 7) * 3, 0, Math.PI * 2); g.fill();
            g.beginPath(); g.ellipse(cx + rr * 0.5, cy - rr * 0.3, rr * 0.45, rr * 0.35, 0, 0, Math.PI * 2); g.fill();
        }
        g.fillStyle = "rgba(255, 255, 255, 0.8)";   // nuvens
        for (let i = 0; i < 6; i++) {
            const cx = x + (h(i + 20) - 0.5) * r * 1.6, cy = y + (h(i + 30) - 0.5) * r * 1.6;
            g.beginPath(); g.ellipse(cx, cy, r * (0.15 + h(i + 40) * 0.2), r * 0.06, -0.3, 0, Math.PI * 2); g.fill();
        }
    } else {   // lua cinza com crateras
        g.fillStyle = "#c9c6cf"; g.fillRect(x - r, y - r, r * 2, r * 2);
        g.fillStyle = "rgba(150, 146, 160, 0.6)";
        g.beginPath(); g.ellipse(x - r * 0.2, y + r * 0.1, r * 0.45, r * 0.32, 0.4, 0, Math.PI * 2); g.fill();   // "mar" lunar
        for (let i = 0; i < 7; i++) {
            const cx = x + (h(i) - 0.5) * r * 1.5, cy = y + (h(i + 11) - 0.5) * r * 1.5, rr = r * (0.06 + h(i + 3) * 0.12);
            g.fillStyle = "rgba(120, 116, 130, 0.75)"; g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.fill();
            g.fillStyle = "rgba(235, 233, 240, 0.7)"; g.beginPath(); g.arc(cx - rr * 0.25, cy - rr * 0.25, rr * 0.55, 0, Math.PI * 2); g.fill();
        }
    }
    // volume: luz do alto à esquerda e sombra (lado da noite) embaixo à direita
    const luz = g.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.05, x - r * 0.1, y - r * 0.1, r * 1.35);
    luz.addColorStop(0, "rgba(255, 255, 255, 0.35)"); luz.addColorStop(0.45, "rgba(255, 255, 255, 0)");
    luz.addColorStop(0.8, "rgba(40, 20, 80, 0.3)"); luz.addColorStop(1, "rgba(30, 10, 60, 0.6)");
    g.fillStyle = luz; g.fillRect(x - r, y - r, r * 2, r * 2);
    g.restore();
    // atmosfera: brilho fino na borda
    g.strokeStyle = tipo === "lua" ? "rgba(255, 255, 255, 0.45)" : tipo === "jupiter" ? "rgba(255, 230, 190, 0.5)" : "rgba(170, 225, 255, 0.7)";
    g.lineWidth = Math.max(1, r * 0.05);
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
}
function getKaioshinPanorama() {
    if (c3Valida(ksPanorama)) return ksPanorama;
    const W = Math.round(Math.PI * 2 * CA_F), base = CA_HY + 4;
    const f = c3NovaFaixa(W, CA_HY + 8);
    if (!f) return null;
    const { c, g } = f;
    const ceu = g.createLinearGradient(0, 0, 0, base);
    ceu.addColorStop(0, "#6f55c9"); ceu.addColorStop(0.55, "#a690e0"); ceu.addColorStop(0.9, "#e4c6ec"); ceu.addColorStop(1, "#f6d6e2");
    g.fillStyle = ceu;
    g.fillRect(0, 0, W, c.__h);
    // vários planetas de tamanhos e tipos diferentes espalhados pelo céu (lua, gigante gasoso, oceano, "Terra")
    for (let i = 0; i < 26; i++) {
        const x = c3Hash(i + 200) * W, r = i % 3 === 0 ? 28 + c3Hash(i + 201) * 22 : 6 + c3Hash(i + 202) * 16, y = 10 + r + c3Hash(i + 203) * (base - 46 - r * 2);
        // os grandes seguem uma ordem própria (só um planeta oceano entre eles, sem dois azuis iguais)
        const tipo = i % 3 === 0 ? KS_TIPOS_GRANDES[(i / 3) % KS_TIPOS_GRANDES.length] : KS_TIPOS_PLANETA[i % KS_TIPOS_PLANETA.length];
        c3NaVolta(W, x, r, x0 => ksPlaneta(g, x0, Math.max(r + 4, y), r, tipo, i));
    }
    // morros verdes ao longe, com penhascos de rocha clara
    const morro = (u, fases) => fases.reduce((h, f) => h + Math.sin(u / W * Math.PI * 2 * f[0] + f[1]) * f[2], 0);
    g.fillStyle = "#7bc65a";
    g.beginPath(); g.moveTo(0, base);
    for (let u = 0; u <= W; u += 6) g.lineTo(u, base - 10 - Math.max(0, morro(u, [[6, 0.4, 12], [13, 1.3, 7], [27, 2.1, 3]])));
    g.lineTo(W, base); g.closePath(); g.fill();
    [[0.07, 70, 34], [0.24, 50, 26], [0.43, 90, 40], [0.61, 60, 30], [0.83, 80, 36]].forEach(([pos, larg, alt]) => {
        c3NaVolta(W, pos * W, larg, x0 => {
            g.fillStyle = "#62b048";   // topo de grama inclinado
            g.beginPath(); g.moveTo(x0 - larg, base - 6); g.lineTo(x0 - larg * 0.4, base - alt - 8); g.lineTo(x0 + larg * 0.5, base - alt); g.lineTo(x0 + larg, base - 6); g.closePath(); g.fill();
            g.fillStyle = "#d8b48c";   // face de rocha
            g.beginPath(); g.moveTo(x0 + larg * 0.1, base - alt - 3); g.lineTo(x0 + larg * 0.5, base - alt); g.lineTo(x0 + larg * 0.62, base - 4); g.lineTo(x0 + larg * 0.05, base - 4); g.closePath(); g.fill();
            g.strokeStyle = "rgba(140, 100, 70, 0.6)"; g.lineWidth = 1;
            for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x0 + larg * (0.15 + k * 0.1), base - alt + 2); g.lineTo(x0 + larg * (0.12 + k * 0.1), base - 6); g.stroke(); }
            g.fillStyle = "#2f7a3a";
            g.beginPath(); g.arc(x0 - larg * 0.2, base - alt - 4, 3, 0, Math.PI * 2); g.arc(x0 + larg * 0.3, base - alt - 2, 2.5, 0, Math.PI * 2); g.fill();
        });
    });
    ksPanorama = c;
    return c;
}

// Pedras e tufos de grama fixos no chão (passam perto da câmera conforme ela gira).
const KS_CHAO = (() => {
    const itens = [];
    for (let i = 0; i < 60; i++) {
        const a = c3Hash(i + 300) * Math.PI * 2, r = 120 + c3Hash(i + 301) * 1400;
        itens.push({ x: Math.sin(a) * r, z: Math.cos(a) * r, tipo: i % 4 === 0 ? "pedra" : i % 4 === 1 ? "tufo" : i % 4 === 2 ? "morrinho" : "mancha", tam: 14 + c3Hash(i + 302) * 30 });
    }
    return itens;
})();

function drawKaioshinStage(ang) {
    if (!c3BlitPanorama(getKaioshinPanorama(), ang, CA_F, CA_CX)) { ctx.fillStyle = "#a690e0"; ctx.fillRect(0, 0, canvas.width, CA_HY + 6); }
    const grama = ctx.createLinearGradient(0, CA_HY, 0, canvas.height);
    grama.addColorStop(0, "#9fd77a"); grama.addColorStop(0.3, "#6fc04e"); grama.addColorStop(1, "#4fa23a");
    ctx.fillStyle = grama;
    ctx.fillRect(0, CA_HY + 4, canvas.width, canvas.height - CA_HY);
    const lim = CA_D - CA_PERTO * 2;
    KS_CHAO
        .map(it => ({ it, r: caRot(it.x, it.z, ang) }))
        .filter(o => o.r[1] < lim)
        .sort((a, b) => a.r[1] - b.r[1])
        .forEach(({ it }) => {
            const p = caProj(it.x, CA_CHAO, it.z, ang), k = p[3], t = it.tam;
            if (p[1] < CA_HY) return;
            if (it.tipo === "pedra") {
                const g = ctx.createRadialGradient(p[0] - t * 0.3 * k, p[1] - t * 0.6 * k, 1, p[0], p[1] - t * 0.3 * k, t * k);
                g.addColorStop(0, "#e9c7a6"); g.addColorStop(0.6, "#b98b68"); g.addColorStop(1, "#8a5f44");
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.ellipse(p[0], p[1] - t * 0.32 * k, t * k, t * 0.55 * k, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "rgba(40, 90, 30, 0.35)";
                ctx.beginPath(); ctx.ellipse(p[0] + t * 0.15 * k, p[1], t * 1.05 * k, t * 0.18 * k, 0, 0, Math.PI * 2); ctx.fill();
            } else if (it.tipo === "tufo") {
                ctx.strokeStyle = "#3f9a3a"; ctx.lineWidth = Math.max(1, 1.6 * k);
                ctx.beginPath();
                for (let j = -2; j <= 2; j++) { ctx.moveTo(p[0] + j * 3 * k, p[1]); ctx.lineTo(p[0] + j * 5.5 * k, p[1] - 11 * k); }
                ctx.stroke();
            } else if (it.tipo === "morrinho") {
                // ondulação do gramado: morrinho baixo, claro em cima e com sombra embaixo
                ctx.fillStyle = "rgba(40, 110, 40, 0.25)";
                ctx.beginPath(); ctx.ellipse(p[0] + t * 0.4 * k, p[1], t * 3 * k, t * 0.5 * k, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "rgba(170, 230, 120, 0.6)";
                ctx.beginPath(); ctx.ellipse(p[0], p[1] - t * 0.25 * k, t * 2.6 * k, t * 0.55 * k, 0, Math.PI, 0); ctx.fill();
            } else {
                ctx.fillStyle = "rgba(150, 215, 110, 0.45)";
                ctx.beginPath(); ctx.ellipse(p[0], p[1], t * 2 * k, t * 0.35 * k, 0, 0, Math.PI * 2); ctx.fill();
            }
        });
}

// ==================== NAMEK: CÂMERA ANDANDO PARA A FRENTE ====================
// A câmera avança em linha reta (getForwardTravel). O caminho é dividido em fileiras; cada fileira tem coisas
// sorteadas por c3Hash a partir do número dela — sempre iguais para a mesma fileira, mas diferentes entre si
// (tamanhos, alturas, posições), mantendo o mesmo estilo do ambiente.
const NF = { CX: 400, HY: 150, H: 90, F: 420, PERTO: 26, FILEIRA: 90, LONGE: 2700 };

// mundo -> tela (z = distância à frente da câmera)
function nfProj(x, y, z) {
    const esc = NF.F / Math.max(NF.PERTO, z);
    return [NF.CX + x * esc, NF.HY + (NF.H - y) * esc, esc];
}

// A câmera anda de lado, na direção em que os lutadores estão virados (como nas outras arenas). Cada fileira
// fica numa posição ao longo do caminho (n * FILEIRA); o "x" de cada item vira a distância até a câmera (os
// dois lados do caminho viram faixas de profundidade diferentes). As coisas perto passam rápido e as longe
// devagar. Desenha da mais longe para a mais perto e chama desenhar(item com x = posição na tela, z).
function nfProfundidade(it) {
    return 240 + Math.abs(it.x) * 1.3 + (it.x < 0 ? 45 : 0);
}
function nfPercorrer(andado, gerarFileira, desenhar) {
    const alcance = NF.LONGE + 400;
    const primeira = Math.floor((andado - alcance) / NF.FILEIRA), ultima = Math.ceil((andado + alcance) / NF.FILEIRA);
    const lista = [];
    for (let n = primeira; n <= ultima; n++) {
        gerarFileira(n).forEach(it => {
            const z = nfProfundidade(it), lado = n * NF.FILEIRA + (it.dz || 0) - andado;
            if (Math.abs(lado) * NF.F / z > canvas.width) return;   // fora da tela
            lista.push([z, it, lado]);
        });
    }
    lista.sort((a, b) => b[0] - a[0]);
    lista.forEach(([z, it, lado]) => desenhar(Object.assign({}, it, { x: lado }), z));
}

// Risquinhos no chão em várias distâncias, passando de lado (os de perto mais rápido): mostram o movimento.
function nfFaixasDoChao(andado, cor) {
    ctx.fillStyle = cor;
    ctx.beginPath();
    [190, 240, 310, 420, 600, 900, 1400].forEach((z, fila) => {
        const k = NF.F / z, passo = 70, meia = canvas.width / 2 / k + passo;
        for (let n = Math.floor((andado - meia) / passo); n * passo - andado < meia; n++) {
            const h = c3Hash(n * 7 + fila * 131);
            if (h < 0.45) continue;
            const [x, y] = nfProj(n * passo + h * 40 - andado, 0, z + h * 30);
            const r = (12 + h * 22) * k;
            ctx.moveTo(x + r, y); ctx.ellipse(x, y, r, Math.max(0.6, r * 0.09), 0, 0, Math.PI * 2);
        }
    });
    ctx.fill();
}

// ---------- Planeta Namek ----------
let nmCeu = null;
function getNamekSky() {
    if (c3Valida(nmCeu)) return nmCeu;
    const f = c3NovaFaixa(canvas.width, NF.HY + 6);
    if (!f) return null;
    const { c, g } = f;
    const ceu = g.createLinearGradient(0, 0, 0, NF.HY);
    ceu.addColorStop(0, "#3fb34a"); ceu.addColorStop(0.55, "#9ad84f"); ceu.addColorStop(1, "#eef3b0");
    g.fillStyle = ceu;
    g.fillRect(0, 0, c.__w, c.__h);
    // morros claros lá longe, apagados pela distância
    g.fillStyle = "rgba(170, 205, 220, 0.75)";
    g.beginPath(); g.moveTo(0, NF.HY + 2);
    for (let x = 0; x <= c.__w; x += 10) g.lineTo(x, NF.HY - 8 - Math.abs(Math.sin(x * 0.013)) * 16 - Math.abs(Math.sin(x * 0.031 + 1)) * 8);
    g.lineTo(c.__w, NF.HY + 2); g.closePath(); g.fill();
    nmCeu = c;
    return c;
}

// O que tem em cada fileira de Namek: árvores altas de copa azul nos lados, morros de pedra rosada com topo
// azul, manchas de grama azul-escura e trechos de areia.
function nmFileira(n) {
    const itens = [], h = (k) => c3Hash(n * 13 + k);
    if (h(1) < 0.3) {
        const lado = h(2) < 0.5 ? -1 : 1;
        itens.push({ tipo: "arvore", x: lado * (150 + h(3) * 520), alto: 150 + h(4) * 150, copa: 34 + h(5) * 26, dz: h(6) * 60 });
    }
    if (h(7) < 0.12) {
        const lado = h(8) < 0.5 ? -1 : 1;
        itens.push({ tipo: "arvore", x: lado * (700 + h(9) * 700), alto: 200 + h(10) * 200, copa: 40 + h(11) * 30, dz: h(12) * 60 });
    }
    if (h(13) < 0.26) {
        const lado = h(14) < 0.5 ? -1 : 1;
        itens.push({ tipo: "morro", x: lado * (380 + h(15) * 900), larg: 220 + h(16) * 300, alto: 120 + h(17) * 180, dz: h(18) * 60, inclina: h(19) });
    }
    if (h(20) < 0.7) itens.push({ tipo: h(21) < 0.3 ? "areia" : "mancha", x: (h(22) * 2 - 1) * 900, larg: 60 + h(23) * 160, dz: h(24) * 80 });
    return itens;
}

function nmDesenhar(it, z) {
    if (z < NF.PERTO) return;
    const [x, y, k] = nfProj(it.x, 0, z);
    if (it.tipo === "mancha" || it.tipo === "areia") {
        ctx.fillStyle = it.tipo === "areia" ? "rgba(240, 220, 170, 0.55)" : "rgba(40, 80, 170, 0.35)";
        ctx.beginPath(); ctx.ellipse(x, y, it.larg * k, it.larg * 0.12 * k + 0.5, 0, 0, Math.PI * 2); ctx.fill();
    } else if (it.tipo === "arvore") {
        const topo = nfProj(it.x, it.alto, z), larg = Math.max(1.5, 8 * k);
        if (x + it.copa * 1.4 * k < -50 || x - it.copa * 1.4 * k > canvas.width + 50) return;
        // tronco alto e fino
        const tronco = ctx.createLinearGradient(x - larg, 0, x + larg, 0);
        tronco.addColorStop(0, "#c98a5e"); tronco.addColorStop(0.5, "#e2a878"); tronco.addColorStop(1, "#9c6440");
        ctx.fillStyle = tronco;
        ctx.fillRect(x - larg / 2, topo[1], larg, y - topo[1]);
        // copa azul redonda e fofa (vários tufos), escura embaixo e clara em cima
        const r = it.copa * k, cy = topo[1] - r * 0.5;
        const tufos = [[0, 0.1, 1], [-0.55, 0.05, 0.6], [0.55, 0.08, 0.6], [-0.3, -0.45, 0.6], [0.3, -0.45, 0.6], [0, -0.7, 0.45], [-0.6, 0.45, 0.45], [0.6, 0.45, 0.45]];
        ctx.fillStyle = "#1a4596";
        tufos.forEach(([dx, dy, rr]) => { ctx.beginPath(); ctx.arc(x + dx * r, cy + dy * r + r * 0.12, rr * r * 0.75, 0, Math.PI * 2); ctx.fill(); });
        ctx.fillStyle = "#3a76dc";
        tufos.forEach(([dx, dy, rr]) => { ctx.beginPath(); ctx.arc(x + dx * r - r * 0.06, cy + dy * r, rr * r * 0.62, 0, Math.PI * 2); ctx.fill(); });
        ctx.fillStyle = "#86b5f6";
        [[-0.3, -0.5, 0.28], [0.15, -0.65, 0.2], [-0.62, -0.05, 0.18]].forEach(([dx, dy, rr]) => { ctx.beginPath(); ctx.arc(x + dx * r, cy + dy * r, rr * r, 0, Math.PI * 2); ctx.fill(); });
        ctx.fillStyle = "#0f2a62";
        ctx.beginPath(); ctx.arc(x, cy + r * 0.72, r * 0.22, 0, Math.PI * 2); ctx.fill();
    } else if (it.tipo === "morro") {
        const L = it.larg * k, A = it.alto * k;
        if (x + L < -50 || x - L > canvas.width + 50) return;
        // paredão de pedra rosada com faixas, topo coberto de grama azul
        ctx.fillStyle = "#e7b59a";
        ctx.beginPath();
        ctx.moveTo(x - L / 2, y); ctx.lineTo(x - L / 2 + L * 0.08, y - A); ctx.lineTo(x + L / 2 - L * 0.1 * it.inclina, y - A * 0.94); ctx.lineTo(x + L / 2, y);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#cf8f78";
        ctx.fillRect(x + L * 0.12, y - A * 0.92, L * 0.3, A * 0.92);
        ctx.strokeStyle = "rgba(160, 95, 80, 0.55)"; ctx.lineWidth = Math.max(1, 1.5 * k);
        ctx.beginPath();
        for (let i = 1; i < 6; i++) { const xx = x - L / 2 + L * i / 6; ctx.moveTo(xx, y - A * 0.9); ctx.lineTo(xx - L * 0.02, y); }
        ctx.stroke();
        ctx.fillStyle = "#4f86d8";
        ctx.beginPath();
        ctx.moveTo(x - L / 2 - L * 0.02, y - A + A * 0.08); ctx.quadraticCurveTo(x, y - A - A * 0.12, x + L / 2 + L * 0.02, y - A * 0.9);
        ctx.lineTo(x + L / 2 - L * 0.06, y - A * 0.78); ctx.quadraticCurveTo(x, y - A * 0.9, x - L / 2 + L * 0.04, y - A * 0.82);
        ctx.closePath(); ctx.fill();
    }
}

function drawNamekStage(andado) {
    const ceu = getNamekSky();
    if (ceu) c3Img(ceu, 0, 0); else { ctx.fillStyle = "#9ad84f"; ctx.fillRect(0, 0, canvas.width, NF.HY); }
    // nuvens amareladas passando devagar
    const t = typeof gameplayClock === "number" ? gameplayClock : 0;
    ctx.fillStyle = "rgba(250, 245, 170, 0.6)";
    for (let i = 0; i < 5; i++) {
        const x = ((i * 190 - t * 6) % 1000 + 1000) % 1000 - 100, y = 24 + (i % 3) * 22;
        ctx.beginPath(); ctx.ellipse(x, y, 70, 16, 0, 0, Math.PI * 2); ctx.ellipse(x + 40, y - 8, 46, 14, 0, 0, Math.PI * 2); ctx.fill();
    }
    // chão azul de Namek, mais claro lá longe
    const chao = ctx.createLinearGradient(0, NF.HY, 0, canvas.height);
    chao.addColorStop(0, "#b8d3f2"); chao.addColorStop(0.2, "#79a8ea"); chao.addColorStop(1, "#3567c9");
    ctx.fillStyle = chao;
    ctx.fillRect(0, NF.HY + 2, canvas.width, canvas.height - NF.HY);
    nfFaixasDoChao(andado, "rgba(30, 70, 160, 0.16)");
    nfPercorrer(andado, nmFileira, nmDesenhar);
}

// ---------- Namek Prestes a Explodir ----------
// Mesma câmera andando de lado. Céu verde-escuro com raios, colunas de lava com fumaça escura, brasas e
// pedras caindo, ilhas de pedra rachadas na água e arcos de lava entre elas.
let nxCeu = null;
function getNamekExplodingSky() {
    if (c3Valida(nxCeu)) return nxCeu;
    const f = c3NovaFaixa(canvas.width, NF.HY + 6);
    if (!f) return null;
    const { c, g } = f;
    const ceu = g.createLinearGradient(0, 0, 0, NF.HY);
    ceu.addColorStop(0, "#14361f"); ceu.addColorStop(0.45, "#2f6b35"); ceu.addColorStop(0.85, "#8fa74c"); ceu.addColorStop(1, "#d6c070");
    g.fillStyle = ceu;
    g.fillRect(0, 0, c.__w, c.__h);
    // nuvens de tempestade escuras
    g.fillStyle = "rgba(20, 35, 25, 0.55)";
    for (let i = 0; i < 9; i++) {
        const x = c3Hash(i + 500) * c.__w, y = 10 + c3Hash(i + 501) * 60, r = 30 + c3Hash(i + 502) * 40;
        g.beginPath(); g.ellipse(x, y, r * 2.2, r * 0.5, 0, 0, Math.PI * 2); g.fill();
    }
    // terra rachada ao longe com brilho de lava
    g.fillStyle = "#5e5a4a";
    g.beginPath(); g.moveTo(0, NF.HY + 2);
    for (let x = 0; x <= c.__w; x += 12) g.lineTo(x, NF.HY - 4 - Math.abs(Math.sin(x * 0.02)) * 10);
    g.lineTo(c.__w, NF.HY + 2); g.closePath(); g.fill();
    nxCeu = c;
    return c;
}

function nxFileira(n) {
    const itens = [], h = (k) => c3Hash(n * 17 + k + 1000);
    if (h(1) < 0.5) itens.push({ tipo: "ilha", x: (h(2) * 2 - 1) * 900, larg: 60 + h(3) * 130, racha: h(4) < 0.5, dz: h(5) * 70 });
    if (h(6) < 0.13) {
        const lado = h(7) < 0.5 ? -1 : 1;
        itens.push({ tipo: "coluna", x: lado * (260 + h(8) * 700), alto: 300 + h(9) * 260, larg: 26 + h(10) * 22, fase: h(11) * 6, dz: h(12) * 60 });
    }
    if (h(13) < 0.08) itens.push({ tipo: "arco", x: (h(14) * 2 - 1) * 700, abre: 120 + h(15) * 200, alto: 90 + h(16) * 120, dz: h(17) * 60 });
    if (h(18) < 0.5) itens.push({ tipo: "onda", x: (h(19) * 2 - 1) * 900, larg: 80 + h(20) * 200, dz: h(21) * 80 });
    return itens;
}

function nxDesenhar(it, z) {
    if (z < NF.PERTO) return;
    const [x, y, k] = nfProj(it.x, 0, z);
    const t = typeof gameplayClock === "number" ? gameplayClock : 0;
    if (it.tipo === "onda") {
        ctx.fillStyle = "rgba(150, 220, 220, 0.25)";
        ctx.beginPath(); ctx.ellipse(x, y, it.larg * k, it.larg * 0.06 * k + 0.5, 0, 0, Math.PI * 2); ctx.fill();
    } else if (it.tipo === "ilha") {
        const L = it.larg * k, A = 18 * k, topo = L * 0.18;
        if (x + L < -40 || x - L > canvas.width + 40) return;
        // lado escuro e tampo azulado da pedra
        ctx.fillStyle = "#3a2c44";
        ctx.beginPath(); ctx.ellipse(x, y, L, topo, 0, 0, Math.PI); ctx.lineTo(x - L, y - A); ctx.ellipse(x, y - A, L, topo, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#5b86a8";
        ctx.beginPath(); ctx.ellipse(x, y - A, L, topo, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
        ctx.beginPath(); ctx.ellipse(x - L * 0.25, y - A - topo * 0.2, L * 0.45, topo * 0.4, 0, 0, Math.PI * 2); ctx.fill();
        if (it.racha) {
            ctx.strokeStyle = "#ff8a1e"; ctx.lineWidth = Math.max(1, 2 * k);
            ctx.beginPath(); ctx.moveTo(x - L * 0.6, y - A); ctx.lineTo(x - L * 0.1, y - A + topo * 0.3); ctx.lineTo(x + L * 0.2, y - A - topo * 0.2); ctx.lineTo(x + L * 0.6, y - A + topo * 0.1); ctx.stroke();
        }
    } else if (it.tipo === "coluna") {
        const topo = nfProj(it.x, it.alto, z), L = it.larg * k;
        if (x + L * 6 < -40 || x - L * 6 > canvas.width + 40) return;
        const brilho = 0.75 + Math.sin(t * 3 + it.fase) * 0.25;
        // fumaça escura subindo em volta e por cima
        ctx.fillStyle = "rgba(40, 26, 24, 0.85)";
        for (let i = 0; i < 7; i++) {
            const fy = topo[1] + (y - topo[1]) * (i / 9), fx = x + Math.sin(i * 1.7 + it.fase + t * 0.5) * L * 1.2;
            ctx.beginPath(); ctx.arc(fx, fy, L * (1.6 + (6 - i) * 0.35), 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = "rgba(70, 50, 55, 0.7)";
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(x + (i - 2) * L * 1.4, topo[1] - L * (1 + (i % 2)), L * 1.8, 0, Math.PI * 2); ctx.fill(); }
        // a lava subindo
        const lava = ctx.createLinearGradient(x - L, 0, x + L, 0);
        lava.addColorStop(0, "#b3160d"); lava.addColorStop(0.5, `rgba(255, ${Math.round(150 * brilho)}, 40, 1)`); lava.addColorStop(1, "#b3160d");
        ctx.fillStyle = lava;
        ctx.fillRect(x - L / 2, topo[1], L, y - topo[1]);
        // faixas claras subindo pela coluna (a lava jorrando para cima)
        const altura = y - topo[1];
        ctx.fillStyle = "#ffd36b";
        for (let i = 0; i < 5; i++) {
            const f = ((i / 5 - t * 0.9 + it.fase) % 1 + 1) % 1;   // 1 = embaixo, 0 = no topo
            ctx.fillRect(x - L * 0.12 + Math.sin(i * 2 + t * 3) * L * 0.18, topo[1] + altura * f, L * 0.2, altura * 0.1);
        }
        // respingos saindo do topo e caindo pelos lados
        ctx.fillStyle = "#ff9a2e";
        for (let i = 0; i < 6; i++) {
            const u = ((t * 0.8 + i / 6 + it.fase) % 1 + 1) % 1, lado = i % 2 ? 1 : -1;
            const gx = x + lado * L * (0.3 + u * 2.2), gy = topo[1] - L * 2.2 * u * (1 - u) * 4 + altura * u * u * 0.25;
            ctx.beginPath(); ctx.arc(gx, gy, Math.max(1, L * 0.16 * (1 - u * 0.5)), 0, Math.PI * 2); ctx.fill();
        }
        // base espalhando no chão
        ctx.fillStyle = "#d4260f";
        ctx.beginPath(); ctx.ellipse(x, y, L * 2.2, L * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    } else if (it.tipo === "arco") {
        const a = nfProj(it.x - it.abre / 2, 0, z), b = nfProj(it.x + it.abre / 2, 0, z), cima = nfProj(it.x, it.alto * 1.8, z);
        if (Math.max(a[0], b[0]) < -40 || Math.min(a[0], b[0]) > canvas.width + 40) return;
        ctx.lineCap = "round";
        ctx.strokeStyle = "rgba(255, 90, 20, 0.55)"; ctx.lineWidth = Math.max(2, 9 * k);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(cima[0], cima[1], b[0], b[1]); ctx.stroke();
        ctx.strokeStyle = "#ffd36b"; ctx.lineWidth = Math.max(1, 3 * k); ctx.stroke();
        // gotas de lava correndo ao longo do arco (de uma ponta à outra)
        ctx.fillStyle = "#fff1b0";
        for (let i = 0; i < 4; i++) {
            const u = ((t * 0.45 + i / 4 + (it.dz || 0) * 0.01) % 1 + 1) % 1, v = 1 - u;
            const px = v * v * a[0] + 2 * u * v * cima[0] + u * u * b[0], py = v * v * a[1] + 2 * u * v * cima[1] + u * u * b[1];
            ctx.beginPath(); ctx.arc(px, py, Math.max(1.2, 5 * k), 0, Math.PI * 2); ctx.fill();
        }
    }
}

function drawNamekExplodingStage(andado) {
    const ceu = getNamekExplodingSky();
    if (ceu) c3Img(ceu, 0, 0); else { ctx.fillStyle = "#2f6b35"; ctx.fillRect(0, 0, canvas.width, NF.HY); }
    const t = typeof gameplayClock === "number" ? gameplayClock : 0;
    // raio de vez em quando (com clarão rápido)
    const ciclo = t % 3.2;
    if (ciclo < 0.18) {
        const semente = Math.floor(t / 3.2);
        ctx.strokeStyle = "rgba(255, 255, 230, 0.95)"; ctx.lineWidth = 2;
        ctx.beginPath();
        let rx = 120 + c3Hash(semente) * 560, ry = 0;
        ctx.moveTo(rx, ry);
        for (let i = 0; i < 7; i++) { rx += (c3Hash(semente * 7 + i) - 0.5) * 50; ry += NF.HY / 7; ctx.lineTo(rx, ry); }
        ctx.stroke();
        ctx.fillStyle = `rgba(230, 255, 210, ${0.18 * (1 - ciclo / 0.18)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    // água escura, mais clara lá longe
    const agua = ctx.createLinearGradient(0, NF.HY, 0, canvas.height);
    agua.addColorStop(0, "#7fb3a8"); agua.addColorStop(0.2, "#3f8590"); agua.addColorStop(1, "#14424f");
    ctx.fillStyle = agua;
    ctx.fillRect(0, NF.HY + 2, canvas.width, canvas.height - NF.HY);
    nfFaixasDoChao(andado, "rgba(10, 40, 50, 0.2)");
    nfPercorrer(andado, nxFileira, nxDesenhar);
    // brasas e pedrinhas caindo do céu (na frente de tudo do cenário)
    for (let i = 0; i < 26; i++) {
        const vel = 40 + c3Hash(i + 700) * 70, x = (c3Hash(i + 701) * canvas.width + Math.sin(t + i) * 10) % canvas.width;
        const y = ((c3Hash(i + 702) * canvas.height + t * vel) % (canvas.height + 30)) - 15;
        if (i % 5 === 0) { ctx.fillStyle = "#2b2324"; ctx.beginPath(); ctx.ellipse(x, y, 3, 4, 0, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.fillStyle = i % 2 ? "#ffb43b" : "#ff7a1e"; ctx.fillRect(x, y, 2, 5); }
    }
}

// ==================== ILHA DO MESTRE KAME ====================
// A ilhazinha no meio do mar: a Kame House rosa de telhado vinho (KAME HOUSE na empena, janela no sótão, cata-
// vento de galo, alpendre com porta verde-água), três coqueiros, arbustos, pedras e a faixa de areia. Como na
// Sala do Tempo e na Nave de Freeza, a câmera dá a volta na casa conforme os lutadores avançam (trProj com a
// câmera KH_CAM); a ilha fica numa camada guardada refeita a cada 1/4 de grau (drawCachedOrbitLayer). O céu com
// as nuvens grandes é uma faixa de 360° que também desliza devagar sozinha, e o mar (ondinhas e espuma da
// praia) é desenhado a cada quadro com poucas chamadas.
const KH_CAM = { CX: 400, HY: 112, D: 600, H: 140, F: 600, PERTO: 30 };
const khCena = { passo: null, canvas: null };
const KH_CASA = { X: 70, Z: 52, H: 60, R: 112 };   // meia largura, meia profundidade, altura da parede, cumeeira

// posição da câmera na planta (para saber quais faces da casa estão viradas para ela)
function khCamera(ang) {
    return [KH_CAM.D * Math.sin(ang), KH_CAM.H, KH_CAM.D * Math.cos(ang)];
}
// face plana (pontos da planta) com a normal para fora: só desenha se estiver virada para a câmera
function khFace(pts, normal, cor, ang, contorno) {
    const cam = khCamera(ang), p = pts[0];
    if ((cam[0] - p[0]) * normal[0] + (cam[1] - p[1]) * normal[1] + (cam[2] - p[2]) * normal[2] <= 0) return null;
    const tela = pts.map(q => trProj(q[0], q[1], q[2], ang));
    trPoly(tela);
    trG.fillStyle = cor;
    trG.fill();
    if (contorno) { trG.strokeStyle = contorno; trG.lineWidth = 1; trG.stroke(); }
    return tela;
}
// retângulo numa parede: origem o, direção u (largura), de a0 a a1 ao longo de u e de b0 a b1 de altura
function khRet(o, u, a0, a1, b0, b1, cor, ang, contorno) {
    const P = (a, b) => trProj(o[0] + u[0] * a, o[1] + b, o[2] + u[2] * a, ang);
    const tela = [P(a0, b0), P(a1, b0), P(a1, b1), P(a0, b1)];
    trPoly(tela);
    trG.fillStyle = cor;
    trG.fill();
    if (contorno) { trG.strokeStyle = contorno; trG.lineWidth = 1; trG.stroke(); }
}
// janela com moldura branca, vidro azul-escuro com reflexo e (opcional) cruz no meio
function khJanela(o, u, a0, a1, b0, b1, ang, cruz) {
    khRet(o, u, a0 - 2, a1 + 2, b0 - 2, b1 + 2, "#f4f4f6", ang, "#7a5a68");
    khRet(o, u, a0, a1, b0, b1, "#2c4f86", ang);
    khRet(o, u, a0, a0 + (a1 - a0) * 0.45, b0 + (b1 - b0) * 0.45, b1, "#4f7fbf", ang);
    if (cruz) {
        khRet(o, u, (a0 + a1) / 2 - 0.8, (a0 + a1) / 2 + 0.8, b0, b1, "#f4f4f6", ang);
        khRet(o, u, a0, a1, (b0 + b1) / 2 - 0.8, (b0 + b1) / 2 + 0.8, "#f4f4f6", ang);
    }
}
// tábuas da parede (linhas horizontais finas)
function khTabuas(o, u, a0, a1, b0, b1, ang) {
    trG.strokeStyle = "rgba(170, 90, 120, 0.35)";
    trG.lineWidth = 0.8;
    trG.beginPath();
    for (let b = b0 + 7; b < b1; b += 7) {
        const p = trProj(o[0] + u[0] * a0, o[1] + b, o[2] + u[2] * a0, ang), q = trProj(o[0] + u[0] * a1, o[1] + b, o[2] + u[2] * a1, ang);
        trG.moveTo(p[0], p[1]); trG.lineTo(q[0], q[1]);
    }
    trG.stroke();
}
// texto pintado numa parede (perspectiva aproximada pela transformação afim do ponto do texto)
function khTexto(o, u, a, b, texto, tam, ang) {
    const A = trProj(o[0] + u[0] * a, o[1] + b, o[2] + u[2] * a, ang);
    const B = trProj(o[0] + u[0] * (a + 1), o[1] + b, o[2] + u[2] * (a + 1), ang);
    const C = trProj(o[0] + u[0] * a, o[1] + b - 1, o[2] + u[2] * a, ang);
    trG.save();
    trG.transform(B[0] - A[0], B[1] - A[1], C[0] - A[0], C[1] - A[1], A[0], A[1]);
    trG.font = `bold ${tam}px 'Trebuchet MS', sans-serif`;
    trG.textAlign = "center";
    trG.fillStyle = "#c22a3a";
    trG.fillText(texto, 0, 0);
    trG.restore();
}

function khDrawCasa(ang) {
    const { X, Z, H, R } = KH_CASA;
    const rosa = "#f6b3cf", rosaSombra = "#e597ba", vinho = "#a8243a", vinhoEsc = "#7c1428", traco = "rgba(120, 40, 70, 0.6)";
    // paredes (a frente e os fundos são pentágonos: a empena sobe até a cumeeira)
    const frente = khFace([[-X, 0, Z], [X, 0, Z], [X, H, Z], [0, R, Z], [-X, H, Z]], [0, 0, 1], rosa, ang, traco);
    const fundos = khFace([[X, 0, -Z], [-X, 0, -Z], [-X, H, -Z], [0, R, -Z], [X, H, -Z]], [0, 0, -1], rosaSombra, ang, traco);
    const dir = khFace([[X, 0, Z], [X, 0, -Z], [X, H, -Z], [X, H, Z]], [1, 0, 0], rosaSombra, ang, traco);
    const esq = khFace([[-X, 0, -Z], [-X, 0, Z], [-X, H, Z], [-X, H, -Z]], [-1, 0, 0], rosa, ang, traco);
    if (frente) {
        const o = [-X, 0, Z + 0.5], u = [1, 0, 0];
        khTabuas(o, u, 0, 2 * X, 0, H, ang);
        khJanela(o, u, 18, 66, 16, 44, ang, true);            // janela grande da frente
        khTexto(o, u, 70, 78, "KAME", 14, ang);                // letreiro na empena
        khTexto(o, u, 70, 63, "HOUSE", 14, ang);
        khRet(o, u, 0, 2 * X, 0, 3, "#d77fa6", ang);           // rodapé
    }
    if (fundos) {
        const o = [X, 0, -Z - 0.5], u = [-1, 0, 0];
        khTabuas(o, u, 0, 2 * X, 0, H, ang);
        khJanela(o, u, 50, 90, 18, 42, ang, true);
    }
    if (dir) {
        const o = [X + 0.5, 0, Z], u = [0, 0, -1];
        khTabuas(o, u, 0, 2 * Z, 0, H, ang);
        khJanela(o, u, 30, 74, 16, 42, ang, true);
    }
    if (esq) {
        const o = [-X - 0.5, 0, -Z], u = [0, 0, 1];
        khTabuas(o, u, 0, 2 * Z, 0, H, ang);
        // janelão escuro de vidro (o da esquerda na imagem)
        khRet(o, u, 22, 84, 12, 46, "#f4f4f6", ang, "#7a5a68");
        khRet(o, u, 24, 82, 14, 44, "#22406e", ang);
        khRet(o, u, 24, 50, 30, 44, "#3f68a3", ang);
        khRet(o, u, 52, 53.6, 14, 44, "#f4f4f6", ang);
    }
    // telhado de duas águas com beiral (vinho), a cumeeira vai da frente para os fundos
    const ox = X + 12, oz = Z + 9, eb = H - 5;
    const aguaEsq = khFace([[0, R, -oz], [-ox, eb, -oz], [-ox, eb, oz], [0, R, oz]], [-(R - eb), ox, 0], vinho, ang, vinhoEsc);
    const aguaDir = khFace([[0, R, oz], [ox, eb, oz], [ox, eb, -oz], [0, R, -oz]], [R - eb, ox, 0], "#b8304a", ang, vinhoEsc);
    // telhas: linhas ao longo de cada água
    [[aguaEsq, -1], [aguaDir, 1]].forEach(([face, lado]) => {
        if (!face) return;
        trG.strokeStyle = "rgba(90, 10, 25, 0.35)";
        trG.lineWidth = 0.8;
        trG.beginPath();
        for (let i = 1; i < 6; i++) {
            const f = i / 6, y = R + (eb - R) * f, x = lado * ox * f;
            const p = trProj(x, y, oz, ang), q = trProj(x, y, -oz, ang);
            trG.moveTo(p[0], p[1]); trG.lineTo(q[0], q[1]);
        }
        trG.stroke();
    });
    // espessura do beiral nas empenas (frente e fundos)
    khFace([[-ox, eb - 5, oz], [-ox, eb, oz], [0, R, oz], [ox, eb, oz], [ox, eb - 5, oz], [0, R - 6, oz]], [0, 0, 1], vinhoEsc, ang);
    khFace([[ox, eb - 5, -oz], [ox, eb, -oz], [0, R, -oz], [-ox, eb, -oz], [-ox, eb - 5, -oz], [0, R - 6, -oz]], [0, 0, -1], vinhoEsc, ang);
    // beiral dos lados (faixa escura embaixo da telha)
    khFace([[ox, eb - 4, oz], [ox, eb - 4, -oz], [ox, eb, -oz], [ox, eb, oz]], [1, 0, 0], vinhoEsc, ang);
    khFace([[-ox, eb - 4, -oz], [-ox, eb - 4, oz], [-ox, eb, oz], [-ox, eb, -oz]], [-1, 0, 0], vinhoEsc, ang);
    // água-furtada (janelinha no telhado da esquerda), com o seu próprio telhadinho
    if (aguaEsq) khDrawAguaFurtada(ang);
    // cata-vento de galo na ponta da frente da cumeeira
    khDrawCataVento(0, R, oz - 6, ang);
}

function khDrawAguaFurtada(ang) {
    const { R, X, H } = KH_CASA;
    const x0 = -X * 0.62, x1 = -X * 0.2, zf = 14, zb = -10, yb = H + 18, yt = H + 40, yr = H + 52;
    const ladoX = (x) => H - 5 + (R - H + 5) * (1 - Math.abs(x) / (X + 12));   // altura do telhado nesse x
    khFace([[x0, ladoX(x0), zf], [x1, ladoX(x1), zf], [x1, yt, zf], [(x0 + x1) / 2, yr, zf], [x0, yt, zf]], [0, 0, 1], "#f6b3cf", ang, "rgba(120, 40, 70, 0.6)");
    khFace([[x0, yb - 6, zb], [x0, yb - 6, zf], [x0, yt, zf], [x0, yt, zb]], [-1, 0, 0], "#e597ba", ang, "rgba(120, 40, 70, 0.6)");
    const cam = khCamera(ang);
    if (cam[2] > zf) {
        const o = [x0, 0, zf + 0.5], u = [1, 0, 0];
        khJanela(o, u, 6, x1 - x0 - 6, ladoX(x0) + 4, yt - 3, ang, true);
    }
    khFace([[(x0 + x1) / 2, yr, zb], [x0 - 4, yt - 2, zb], [x0 - 4, yt - 2, zf + 4], [(x0 + x1) / 2, yr, zf + 4]], [-(yr - yt), (x1 - x0) / 2, 0], "#a8243a", ang, "#7c1428");
    khFace([[(x0 + x1) / 2, yr, zf + 4], [x1 + 4, yt - 2, zf + 4], [x1 + 4, yt - 2, zb], [(x0 + x1) / 2, yr, zb]], [yr - yt, (x1 - x0) / 2, 0], "#b8304a", ang, "#7c1428");
}

function khDrawCataVento(x, y, z, ang) {
    const base = trProj(x, y, z, ang), topo = trProj(x, y + 22, z, ang), k = base[3];
    trG.strokeStyle = "#3a3a44";
    trG.lineWidth = Math.max(1, 1.4 * k);
    trG.beginPath(); trG.moveTo(base[0], base[1]); trG.lineTo(topo[0], topo[1]); trG.stroke();
    // setas N-S/L-O
    const a = trProj(x - 9, y + 14, z, ang), b = trProj(x + 9, y + 14, z, ang), c = trProj(x, y + 14, z - 9, ang), d = trProj(x, y + 14, z + 9, ang);
    trG.lineWidth = Math.max(0.8, k);
    trG.beginPath(); trG.moveTo(a[0], a[1]); trG.lineTo(b[0], b[1]); trG.moveTo(c[0], c[1]); trG.lineTo(d[0], d[1]); trG.stroke();
    // galo (silhueta) no topo
    const s = 8 * k, gx = topo[0], gy = topo[1];
    trG.fillStyle = "#4a4a52";
    trG.beginPath();
    trG.moveTo(gx - s, gy);
    trG.quadraticCurveTo(gx - s * 1.3, gy - s * 1.2, gx - s * 0.6, gy - s * 1.1);   // rabo
    trG.lineTo(gx - s * 0.2, gy - s * 0.4);
    trG.quadraticCurveTo(gx + s * 0.3, gy - s * 1.0, gx + s * 0.6, gy - s * 0.9);   // pescoço e cabeça
    trG.lineTo(gx + s * 0.95, gy - s * 0.75);                                        // bico
    trG.lineTo(gx + s * 0.6, gy - s * 0.6);
    trG.quadraticCurveTo(gx + s * 0.7, gy, gx, gy);
    trG.closePath();
    trG.fill();
    trG.fillStyle = "#d23a3a";
    trG.fillRect(gx + s * 0.4, gy - s * 1.15, s * 0.3, s * 0.25);   // crista
}

// alpendre da porta (frente, à direita): telhadinho vinho, pilares, porta verde-água e degrau
function khDrawAlpendre(ang) {
    const { X, Z } = KH_CASA;
    const x0 = X - 46, x1 = X + 6, zf = Z + 24;
    khFace([[x0, 0, zf], [x1, 0, zf], [x1, 4, zf], [x0, 4, zf]], [0, 0, 1], "#e8e0d8", ang, "#a89a90");   // degrau
    khFace([[x0, 4, Z], [x0, 4, zf], [x1, 4, zf], [x1, 4, Z]], [0, 1, 0], "#f2ece6", ang);
    const frente = khCamera(ang)[2] > Z;
    if (frente) {
        const o = [x0, 0, Z + 0.6], u = [1, 0, 0];
        khRet(o, u, 14, 38, 4, 44, "#f4f4f6", ang, "#7a5a68");
        khRet(o, u, 16, 36, 4, 42, "#3fa7a0", ang);
        khRet(o, u, 18, 34, 26, 40, "#7fd3cc", ang);
    }
    // pilares
    [x0 + 3, x1 - 3].forEach(px => {
        const a = trProj(px, 4, zf - 3, ang), b = trProj(px, 50, zf - 3, ang);
        trG.strokeStyle = "#f4f0ea";
        trG.lineWidth = Math.max(1.5, 3 * a[3]);
        trG.beginPath(); trG.moveTo(a[0], a[1]); trG.lineTo(b[0], b[1]); trG.stroke();
    });
    // telhadinho inclinado
    khFace([[x0 - 4, 56, Z], [x1 + 6, 56, Z], [x1 + 6, 48, zf + 4], [x0 - 4, 48, zf + 4]], [0, zf + 4 - Z, 8], "#b8304a", ang, "#7c1428");
    khFace([[x0 - 4, 44, zf + 4], [x0 - 4, 48, zf + 4], [x1 + 6, 48, zf + 4], [x1 + 6, 44, zf + 4]], [0, 0, 1], "#7c1428", ang);
}

// coqueiro: tronco curvo com anéis e copa de folhas compridas caídas
function khDrawCoqueiro(c, ang) {
    const pts = [];
    for (let i = 0; i <= 6; i++) {
        const f = i / 6;
        pts.push(trProj(c.x + c.lx * f * f, 6 + c.h * f, c.z + c.lz * f * f, ang));
    }
    const k = pts[0][3];
    trG.lineCap = "round";
    for (let i = 0; i < 6; i++) {
        trG.strokeStyle = i % 2 ? "#8a6a44" : "#9c7a50";
        trG.lineWidth = Math.max(1.5, (9 - i * 0.9) * k);
        trG.beginPath(); trG.moveTo(pts[i][0], pts[i][1]); trG.lineTo(pts[i + 1][0], pts[i + 1][1]); trG.stroke();
    }
    trG.lineCap = "butt";
    const top = pts[6], s = top[3];
    // folhas: cada uma é uma curva grossa com bordas recortadas, caindo para os lados
    const folhas = [-2.7, -2.1, -1.45, -0.85, -0.25, 0.4, 1.0, 1.6, 2.3, 3.0];
    folhas.forEach((a, i) => {
        const comp = (48 + (i % 3) * 8) * s, queda = (18 + (i % 2) * 10) * s;
        const ex = top[0] + Math.cos(a) * comp, ey = top[1] - Math.sin(a) * comp * 0.35 + queda;
        const mx = top[0] + Math.cos(a) * comp * 0.5, my = top[1] - Math.sin(a) * comp * 0.35 - 10 * s;
        trG.strokeStyle = i % 2 ? "#2f8a3a" : "#3fa548";
        trG.lineWidth = Math.max(2, 7 * s);
        trG.beginPath(); trG.moveTo(top[0], top[1]); trG.quadraticCurveTo(mx, my, ex, ey); trG.stroke();
        trG.strokeStyle = "#5cc463";
        trG.lineWidth = Math.max(0.8, 1.6 * s);
        trG.beginPath(); trG.moveTo(top[0], top[1]); trG.quadraticCurveTo(mx, my - 2 * s, ex, ey); trG.stroke();
        // folíolos
        trG.strokeStyle = "#2a7a33";
        trG.lineWidth = Math.max(0.6, 1.2 * s);
        trG.beginPath();
        for (let j = 1; j <= 5; j++) {
            const f = j / 6, px = (1 - f) * (1 - f) * top[0] + 2 * (1 - f) * f * mx + f * f * ex, py = (1 - f) * (1 - f) * top[1] + 2 * (1 - f) * f * my + f * f * ey;
            trG.moveTo(px, py); trG.lineTo(px + Math.cos(a - 1.2) * 7 * s, py + 6 * s);
            trG.moveTo(px, py); trG.lineTo(px + Math.cos(a + 1.2) * 7 * s, py + 7 * s);
        }
        trG.stroke();
    });
    // cocos
    trG.fillStyle = "#6b4a22";
    [[-3, 3], [3, 4], [0, 6]].forEach(([dx, dy]) => { trG.beginPath(); trG.arc(top[0] + dx * s, top[1] + dy * s, 3 * s, 0, Math.PI * 2); trG.fill(); });
}

function khDrawArbusto(b, ang) {
    const p = trProj(b.x, 6, b.z, ang), k = p[3], r = b.r * k;
    [[-0.7, 0, 0.75], [0.7, 0.05, 0.7], [0, -0.35, 0.9], [-0.25, 0.1, 0.8], [0.35, -0.1, 0.75]].forEach(([dx, dy, rr], i) => {
        trG.fillStyle = i < 2 ? "#2f7a32" : "#3c9440";
        trG.beginPath(); trG.arc(p[0] + dx * r, p[1] - r * 0.5 + dy * r, rr * r, 0, Math.PI * 2); trG.fill();
    });
    trG.fillStyle = "rgba(140, 220, 120, 0.45)";
    trG.beginPath(); trG.arc(p[0] - r * 0.2, p[1] - r * 1.05, r * 0.35, 0, Math.PI * 2); trG.fill();
}

function khDrawPedra(pd, ang) {
    const p = trProj(pd.x, 4, pd.z, ang), k = p[3], w = pd.r * k, h = pd.r * 0.62 * k;
    trG.fillStyle = "#9aa58a";
    trG.beginPath(); trG.ellipse(p[0], p[1] - h * 0.5, w, h, 0, Math.PI, 0); trG.lineTo(p[0] + w, p[1]); trG.lineTo(p[0] - w, p[1]); trG.closePath(); trG.fill();
    trG.fillStyle = "#c3cbb0";
    trG.beginPath(); trG.ellipse(p[0] - w * 0.25, p[1] - h * 0.85, w * 0.5, h * 0.4, -0.2, 0, Math.PI * 2); trG.fill();
    trG.strokeStyle = "rgba(60, 70, 50, 0.5)"; trG.lineWidth = 1;
    trG.beginPath(); trG.ellipse(p[0], p[1] - h * 0.5, w, h, 0, Math.PI, 0); trG.stroke();
}

// contorno da ilha (raio um pouco irregular, sempre igual)
function khRaioIlha(a, base) {
    return base * (1 + 0.06 * Math.sin(a * 3 + 0.7) + 0.04 * Math.sin(a * 5 + 2.1));
}
const KH_COQUEIROS = [
    { x: -150, z: 40, h: 150, lx: -26, lz: 10 },
    { x: 118, z: -78, h: 175, lx: 14, lz: -8 },
    { x: 160, z: -38, h: 140, lx: 30, lz: 6 }
];
const KH_ARBUSTOS = [{ x: -92, z: 62, r: 16 }, { x: 110, z: 52, r: 13 }, { x: 140, z: 18, r: 15 }, { x: -110, z: -60, r: 14 }, { x: 40, z: -80, r: 12 }];
const KH_PEDRAS = [{ x: -40, z: 128, r: 15 }, { x: -12, z: 138, r: 10 }, { x: 150, z: 110, r: 9 }, { x: -168, z: -40, r: 11 }];

// A ilha inteira (camada guardada, fundo transparente): areia, grama, sombras e o que fica em pé, por profundidade
function drawKameIslandScene(ang) {
    const N = 64;
    const anel = (base, y) => { const l = []; for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; const r = khRaioIlha(a, base); l.push(trProj(Math.sin(a) * r, y, Math.cos(a) * r, ang)); } return l; };
    // areia molhada (borda) e areia seca por cima
    trPoly(anel(246, 0)); trG.fillStyle = "#d9c08a"; trG.fill();
    trPoly(anel(238, 5)); trG.fillStyle = "#f2e2b0"; trG.fill();
    // grama (mancha irregular em volta da casa)
    trPoly(anel(180, 6)); trG.fillStyle = "#6fbf4a"; trG.fill();
    trPoly(anel(150, 6)); trG.fillStyle = "#7ccb52"; trG.fill();
    // sombras (luz do alto, à esquerda): casa e coqueiros
    trG.fillStyle = "rgba(40, 80, 30, 0.25)";
    const { X, Z } = KH_CASA;
    trPoly([[-X + 14, Z + 14], [X + 30, Z + 14], [X + 30, -Z + 10], [-X + 14, -Z + 10]].map(c => trProj(c[0], 6, c[1], ang)));
    trG.fill();
    KH_COQUEIROS.forEach(c => {
        const p = trProj(c.x + 12, 6, c.z + 10, ang);
        trG.beginPath(); trG.ellipse(p[0], p[1], 22 * p[3], 7 * p[3], 0, 0, Math.PI * 2); trG.fill();
    });
    // objetos em pé, do mais longe para o mais perto da câmera
    const prof = (x, z) => trRot(x, z, ang)[1];
    const objetos = [{ z: prof(0, 0), d: () => khDrawCasa(ang) }, { z: prof(KH_CASA.X - 20, KH_CASA.Z + 14), d: () => khDrawAlpendre(ang) }];
    KH_COQUEIROS.forEach(c => objetos.push({ z: prof(c.x, c.z), d: () => khDrawCoqueiro(c, ang) }));
    KH_ARBUSTOS.forEach(b => objetos.push({ z: prof(b.x, b.z), d: () => khDrawArbusto(b, ang) }));
    KH_PEDRAS.forEach(pd => objetos.push({ z: prof(pd.x, pd.z), d: () => khDrawPedra(pd, ang) }));
    objetos.sort((a, b) => a.z - b.z).forEach(o => o.d());
}

// Céu de 360°: azul forte no alto clareando no horizonte, com as nuvens grandes de algodão (como na imagem)
const KH_PANO_W = Math.round(Math.PI * 2 * KH_CAM.F);
let khPanorama = null;
function getKameIslandPanorama() {
    if (c3Valida(khPanorama)) return khPanorama;
    const f = c3NovaFaixa(KH_PANO_W, KH_CAM.HY + 6);
    if (!f) return null;
    const { c, g } = f;
    const W = KH_PANO_W, base = KH_CAM.HY + 2;
    const ceu = g.createLinearGradient(0, 0, 0, base);
    ceu.addColorStop(0, "#1f6fd8"); ceu.addColorStop(0.55, "#4f9be8"); ceu.addColorStop(1, "#bfe3fb");
    g.fillStyle = ceu;
    g.fillRect(0, 0, W, c.__h);
    // nuvens de algodão: bolos de círculos brancos com a base azulada, subindo do horizonte
    for (let i = 0; i < 9; i++) {
        const cx = (i * 419.3 + 120) % W, larg = 120 + (i * 37) % 110, alt = 34 + (i * 23) % 30;
        c3NaVolta(W, cx, larg, x => khNuvem(g, x, base - 4, larg, alt, i));
    }
    // nuvens pequenas no alto
    g.fillStyle = "rgba(255, 255, 255, 0.8)";
    for (let i = 0; i < 14; i++) {
        const x = (i * 271.9 + 40) % W, y = 14 + (i * 13) % 30, r = 6 + (i * 3) % 6;
        c3NaVolta(W, x, r * 4, xx => { g.beginPath(); g.ellipse(xx, y, r * 3, r, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(xx - r, y - r * 0.5, r, 0, Math.PI * 2); g.fill(); });
    }
    khPanorama = c;
    return c;
}
function khNuvem(g, x, base, larg, alt, semente) {
    const bolas = [];
    const n = 9;
    for (let j = 0; j < n; j++) {
        const f = j / (n - 1), h = Math.sin(f * Math.PI);
        const r = (0.1 + 0.12 * h) * larg * (0.85 + c3Hash(semente * 17 + j) * 0.3);
        bolas.push([x - larg / 2 + f * larg, base - r * 0.5 - h * alt * 0.5, r]);
    }
    bolas.push([x - larg * 0.08, base - alt * 0.9, larg * 0.15], [x + larg * 0.12, base - alt * 0.75, larg * 0.13]);
    // sombra azulada embaixo
    g.fillStyle = "#c9dcf2";
    bolas.forEach(([bx, by, r]) => { g.beginPath(); g.arc(bx, by + r * 0.12, r, 0, Math.PI * 2); g.fill(); });
    g.fillStyle = "#ffffff";
    bolas.forEach(([bx, by, r]) => { g.beginPath(); g.arc(bx - r * 0.08, by - r * 0.08, r * 0.92, 0, Math.PI * 2); g.fill(); });
}

// Ondinhas do mar (fixas no mundo; brilham e somem devagar)
const KH_ONDAS = (() => {
    const l = [];
    for (let i = 0; i < 64; i++) {
        const a = c3Hash(i * 3.1) * Math.PI * 2, r = 280 + c3Hash(i * 7.7) * 1300;
        l.push({ x: Math.sin(a) * r, z: Math.cos(a) * r, fase: c3Hash(i * 1.9) * 6.28, tam: 14 + c3Hash(i * 5.3) * 26 });
    }
    return l;
})();

function drawKameIslandSea(ang, t) {
    // céu (com as nuvens deslizando devagar além do giro da câmera)
    const pano = getKameIslandPanorama();
    if (!pano || !c3BlitPanorama(pano, ang + t * 0.006, KH_CAM.F, KH_CAM.CX)) { ctx.fillStyle = "#4f9be8"; ctx.fillRect(0, 0, canvas.width, KH_CAM.HY); }
    // mar: verde-água claro no horizonte, azul mais fundo perto
    const mar = ctx.createLinearGradient(0, KH_CAM.HY, 0, canvas.height);
    mar.addColorStop(0, "#8fd6e8"); mar.addColorStop(0.18, "#4fb3dc"); mar.addColorStop(1, "#2a86c4");
    ctx.fillStyle = mar;
    ctx.fillRect(0, KH_CAM.HY + 1, canvas.width, canvas.height - KH_CAM.HY);
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.fillRect(0, KH_CAM.HY, canvas.width, 1.5);
    // ondinhas: agrupadas em 4 níveis de brilho (4 traços por quadro em vez de um por onda)
    const lim = KH_CAM.D - KH_CAM.PERTO * 2;
    const niveis = [[], [], [], []];
    KH_ONDAS.forEach(o => {
        const r = trRot(o.x, o.z, ang);
        if (r[1] > lim) return;
        const brilho = 0.5 + 0.5 * Math.sin(t * 1.3 + o.fase);
        if (brilho < 0.15) return;
        const p = trProj(o.x + Math.sin(t * 0.4 + o.fase) * 6, 0, o.z, ang);
        if (p[1] < KH_CAM.HY + 2) return;
        niveis[Math.min(3, Math.floor(brilho * 4))].push(p.concat(o.tam));
    });
    ctx.strokeStyle = "#e6f7ff";
    ctx.lineWidth = 1.6;
    niveis.forEach((lista, n) => {
        if (!lista.length) return;
        ctx.globalAlpha = (n + 0.5) / 4 * 0.8;
        ctx.beginPath();
        lista.forEach(([x, y, , k, tam]) => { ctx.moveTo(x - tam * k, y); ctx.quadraticCurveTo(x, y - tam * 0.18 * k, x + tam * k, y); });
        ctx.stroke();
    });
    ctx.globalAlpha = 1;
    // espuma da praia em volta da ilha, indo e voltando
    const N = 40, onda = 262 + Math.sin(t * 1.1) * 8;
    const anel = [];
    for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2, rr = khRaioIlha(a, onda); anel.push(trProj(Math.sin(a) * rr, 0, Math.cos(a) * rr, ang)); }
    ctx.fillStyle = "rgba(170, 230, 240, 0.85)";
    ctx.beginPath(); anel.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 + 0.3 * Math.sin(t * 1.1)})`;
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawKameIslandStage(ang) {
    const t = typeof gameplayClock === "number" ? gameplayClock : 0;
    trCam = KH_CAM;
    try {
        drawKameIslandSea(ang, t);
        drawCachedOrbitLayer(khCena, ang, drawKameIslandScene);
    } finally {
        trCam = TR_CAM;
    }
}

// ==================== PEÇAS 3D COMUNS (órbita) ====================
// Usadas pela Plataforma Celestial e pela Capital do Oeste: tudo em coordenadas de planta projetadas por trProj
// com a câmera atual (trCam). Faces com a normal para fora só aparecem viradas para a câmera.
function c3Camera(ang) { return [trCam.D * Math.sin(ang), trCam.H, trCam.D * Math.cos(ang)]; }
function c3Face(pts, normal, cor, ang, contorno) {
    const cam = c3Camera(ang), p = pts[0];
    if ((cam[0] - p[0]) * normal[0] + (cam[1] - p[1]) * normal[1] + (cam[2] - p[2]) * normal[2] <= 0) return null;
    const tela = pts.map(q => trProj(q[0], q[1], q[2], ang));
    trPoly(tela);
    trG.fillStyle = cor;
    trG.fill();
    if (contorno) { trG.strokeStyle = contorno; trG.lineWidth = 1; trG.stroke(); }
    return tela;
}
// elipse de um círculo horizontal (centro cx,cz, altura y, raio r) já em perspectiva
function c3Anel(cx, cz, y, r, ang) {
    const s = Math.sin(ang), co = Math.cos(ang);
    const c = trProj(cx, y, cz, ang), fr = trProj(cx + r * s, y, cz + r * co, ang), tr = trProj(cx - r * s, y, cz - r * co, ang);
    return { cx: c[0], cy: (fr[1] + tr[1]) / 2, rx: r * c[3], ry: Math.max(0.6, Math.abs(fr[1] - tr[1]) / 2), k: c[3] };
}
// cilindro em pé (lateral + tampa); cor pode ser um gradiente pronto
function c3Cilindro(cx, cz, y0, y1, r, cor, ang, tampa, contorno) {
    const a = c3Anel(cx, cz, y0, r, ang), b = c3Anel(cx, cz, y1, r, ang);
    trG.fillStyle = cor;
    trG.beginPath();
    trG.moveTo(b.cx - b.rx, b.cy);
    trG.lineTo(a.cx - a.rx, a.cy);
    trG.ellipse(a.cx, a.cy, a.rx, a.ry, 0, Math.PI, 0, true);
    trG.lineTo(b.cx + b.rx, b.cy);
    trG.closePath();
    trG.fill();
    if (contorno) { trG.strokeStyle = contorno; trG.lineWidth = 1; trG.stroke(); }
    trG.fillStyle = tampa || cor;
    trG.beginPath(); trG.ellipse(b.cx, b.cy, b.rx, b.ry, 0, 0, Math.PI * 2); trG.fill();
    if (contorno) trG.stroke();
    return b;
}
// cúpula (meia esfera achatada de altura h) sobre o círculo de raio r na altura y
function c3Domo(cx, cz, y, r, h, cor, ang, brilho) {
    const a = c3Anel(cx, cz, y, r, ang), topo = trProj(cx, y + h, cz, ang);
    const alto = a.cy - topo[1];
    const gr = trG.createLinearGradient(a.cx - a.rx, 0, a.cx + a.rx, 0);
    gr.addColorStop(0, spriteMixC3(cor, -0.3)); gr.addColorStop(0.38, spriteMixC3(cor, 0.35)); gr.addColorStop(1, spriteMixC3(cor, -0.35));
    trG.fillStyle = gr;
    trG.beginPath();
    trG.moveTo(a.cx - a.rx, a.cy);
    trG.bezierCurveTo(a.cx - a.rx, a.cy - alto * 0.75, a.cx - a.rx * 0.45, a.cy - alto, a.cx, a.cy - alto);
    trG.bezierCurveTo(a.cx + a.rx * 0.45, a.cy - alto, a.cx + a.rx, a.cy - alto * 0.75, a.cx + a.rx, a.cy);
    trG.ellipse(a.cx, a.cy, a.rx, a.ry, 0, 0, Math.PI);
    trG.closePath();
    trG.fill();
    if (brilho !== false) {
        trG.fillStyle = "rgba(255, 255, 255, 0.35)";
        trG.beginPath(); trG.ellipse(a.cx - a.rx * 0.32, a.cy - alto * 0.68, a.rx * 0.2, alto * 0.14, -0.5, 0, Math.PI * 2); trG.fill();
    }
    return { cx: a.cx, base: a.cy, alto, rx: a.rx };
}
// clareia (q > 0) ou escurece (q < 0) uma cor #rrggbb
function spriteMixC3(cor, q) {
    const n = parseInt(cor.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const f = (v) => Math.round(q >= 0 ? v + (255 - v) * q : v * (1 + q));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
}
// segmento do chão recortado antes de chegar atrás da câmera (devolve null se todo atrás)
function c3RecorteChao(a, b, ang, lim) {
    const da = trRot(a[0], a[1], ang)[1], db = trRot(b[0], b[1], ang)[1];
    if (da > lim && db > lim) return null;
    const corta = (p, q, dp, dq) => { const t = (lim - dp) / (dq - dp); return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; };
    if (da > lim) a = corta(a, b, da, db);
    if (db > lim) b = corta(b, a, db, da);
    return [a, b];
}

// ==================== PLATAFORMA CELESTIAL (Palácio de Kami) ====================
// O disco flutuando entre as nuvens: piso de ladrilhos azul-claros, borda vinho com triângulos, casco dourado com
// janelas ovais e a escada com a corda descendo; o palácio branco com cúpulas douradas (a grande no meio e duas
// menores dos lados), torres-mirante brancas, ciprestes, canteiros de grama e dois coqueiros com sombra. A câmera
// dá a volta na plataforma (como na Ilha do Kame); as nuvens lá embaixo e o céu passam a cada quadro.
const PC_CAM = { CX: 400, HY: 110, D: 760, H: 150, F: 600, PERTO: 30 };
const pcCena = { passo: null, canvas: null };
const PC_R = 300;
const PC_CIPRESTES = (() => {
    const l = [];
    const fileira = (x0, z0, dx, dz, n) => { for (let i = 0; i < n; i++) l.push({ x: x0 + dx * i, z: z0 + dz * i, h: 30 + (i % 2) * 6 }); };
    fileira(-250, 40, 16, 10, 5); fileira(250, 40, -16, 10, 5);          // frente esquerda / direita
    fileira(-245, -60, 18, -12, 4); fileira(245, -60, -18, -12, 4);      // fundos
    fileira(-60, -95, 20, 0, 3); fileira(20, -95, 20, 0, 3);             // diante do palácio
    return l;
})();
const PC_CANTEIROS = [[-262, 20, -175, 95], [175, 20, 262, 95], [-258, -110, -180, -40], [180, -110, 258, -40], [-75, 60, -40, 130], [40, 60, 75, 130]];
const PC_TORRES = [[-175, -150], [-225, -95], [175, -150], [225, -95]];

function pcCipreste(c, ang) {
    const b = trProj(c.x, 0, c.z, ang), t = trProj(c.x, c.h, c.z, ang), k = b[3];
    trG.fillStyle = "#4a3a2a"; trG.fillRect(b[0] - 1.2 * k, b[1] - 4 * k, 2.4 * k, 4 * k);
    trG.fillStyle = "#1f5a3a";
    trG.beginPath(); trG.ellipse(b[0], (b[1] - 4 * k + t[1]) / 2, 5.6 * k, (b[1] - 4 * k - t[1]) / 2, 0, 0, Math.PI * 2); trG.fill();
    trG.fillStyle = "#2f7a4c";
    trG.beginPath(); trG.ellipse(b[0] - 1.6 * k, (b[1] - 4 * k + t[1]) / 2 - 2 * k, 2.4 * k, (b[1] - 4 * k - t[1]) / 2.6, 0, 0, Math.PI * 2); trG.fill();
}
function pcTorre(x, z, ang) {
    const b = trProj(x, 0, z, ang), t = trProj(x, 74, z, ang), k = b[3];
    trG.strokeStyle = "#e8eef6"; trG.lineWidth = Math.max(1.5, 3.2 * k);
    trG.beginPath(); trG.moveTo(b[0], b[1]); trG.lineTo(t[0], t[1]); trG.stroke();
    trG.strokeStyle = "#a9b8cc"; trG.lineWidth = Math.max(0.6, 1 * k);
    trG.beginPath(); trG.moveTo(b[0] + 1.2 * k, b[1]); trG.lineTo(t[0] + 1.2 * k, t[1]); trG.stroke();
    // cone por baixo da cabine, cabine com faixa de vidro azul e a cupulazinha
    const a = c3Anel(x, z, 72, 15, ang);
    trG.fillStyle = "#cfd9e6";
    trG.beginPath(); trG.moveTo(a.cx - a.rx, a.cy); trG.lineTo(t[0], t[1] + 8 * k); trG.lineTo(a.cx + a.rx, a.cy); trG.closePath(); trG.fill();
    c3Cilindro(x, z, 72, 84, 15, "#f4f7fb", ang, "#ffffff", "rgba(80, 100, 130, 0.5)");
    const v = c3Anel(x, z, 78, 15.4, ang);
    trG.fillStyle = "#5b8ed0"; trG.beginPath(); trG.ellipse(v.cx, v.cy, v.rx, v.ry + 2.4 * k, 0, 0, Math.PI); trG.fill();
    c3Domo(x, z, 84, 14, 9, "#f4f7fb", ang);
}
function pcPalacio(ang) {
    const cam = c3Camera(ang);
    // escadaria e entrada em arco na frente do palácio
    const entrada = () => {
        c3Face([[-14, 0, -112], [14, 0, -112], [14, 6, -126], [-14, 6, -126]], [0, 14, 1], "#e6edf5", ang, "rgba(90, 110, 140, 0.4)");
        c3Face([[-12, 6, -126], [12, 6, -126], [12, 26, -126], [-12, 26, -126]], [0, 0, 1], "#f6f8fb", ang, "rgba(90, 110, 140, 0.4)");
        if (cam[2] > -126) {
            const p = trProj(0, 6, -125.5, ang), q = trProj(0, 20, -125.5, ang), k = p[3];
            trG.fillStyle = "#b4693a";
            trG.beginPath(); trG.moveTo(p[0] - 6 * k, p[1]); trG.lineTo(p[0] - 6 * k, q[1] + 4 * k); trG.quadraticCurveTo(p[0], q[1] - 4 * k, p[0] + 6 * k, q[1] + 4 * k); trG.lineTo(p[0] + 6 * k, p[1]); trG.closePath(); trG.fill();
        }
    };
    const lateral = (x) => {
        c3Cilindro(x, -150, 0, 20, 30, "#eef2f8", ang, "#f8fafc", "rgba(90, 110, 140, 0.45)");
        c3Cilindro(x, -150, 20, 26, 33, "#7a4fc0", ang, "#9a6fdc");
        const d = c3Domo(x, -150, 26, 24, 22, "#d6a23a", ang);
        const t = trProj(x, 48, -150, ang);
        trG.fillStyle = "#f2d27a"; trG.beginPath(); trG.arc(t[0], t[1], 2.4 * t[3], 0, Math.PI * 2); trG.fill();
        return d;
    };
    const central = () => {
        c3Cilindro(0, -175, 0, 24, 54, "#f2f5fa", ang, "#ffffff", "rgba(90, 110, 140, 0.45)");
        // faixa de vidro azul em volta
        const v = c3Anel(0, -175, 14, 54.5, ang);
        trG.fillStyle = "#7fb0e6"; trG.beginPath(); trG.ellipse(v.cx, v.cy, v.rx, v.ry + 5 * v.k, 0, 0, Math.PI); trG.fill();
        trG.strokeStyle = "rgba(255,255,255,0.6)"; trG.lineWidth = 1;
        for (let i = -3; i <= 3; i++) { trG.beginPath(); trG.moveTo(v.cx + i * v.rx / 4, v.cy + v.ry * Math.sqrt(Math.max(0, 1 - (i / 4) ** 2)) - 1); trG.lineTo(v.cx + i * v.rx / 4, v.cy + v.ry * Math.sqrt(Math.max(0, 1 - (i / 4) ** 2)) + 5 * v.k); trG.stroke(); }
        c3Cilindro(0, -175, 24, 30, 46, "#e7ecf4", ang, "#f6f8fb");
        c3Domo(0, -175, 30, 44, 40, "#d9a53c", ang);
        c3Cilindro(0, -175, 68, 80, 12, "#f6f8fb", ang, "#ffffff", "rgba(90, 110, 140, 0.45)");
        c3Domo(0, -175, 80, 12, 10, "#d9a53c", ang);
    };
    // de trás para a frente conforme a câmera
    const partes = [
        { z: trRot(0, -175, ang)[1], d: central },
        { z: trRot(-85, -150, ang)[1], d: () => lateral(-85) },
        { z: trRot(85, -150, ang)[1], d: () => lateral(85) },
        { z: trRot(0, -120, ang)[1], d: entrada }
    ];
    partes.sort((a, b) => a.z - b.z).forEach(p => p.d());
}
function pcCoqueiro(x, z, ang) {
    const b = trProj(x, 0, z, ang), t = trProj(x + 4, 44, z, ang), k = b[3];
    trG.strokeStyle = "#8a6a44"; trG.lineWidth = Math.max(1.5, 3.4 * k); trG.lineCap = "round";
    trG.beginPath(); trG.moveTo(b[0], b[1]); trG.quadraticCurveTo(b[0] - 3 * k, (b[1] + t[1]) / 2, t[0], t[1]); trG.stroke();
    trG.lineCap = "butt";
    [-2.6, -1.9, -1.2, -0.5, 0.3, 1.0, 1.7, 2.5].forEach((a, i) => {
        const comp = (20 + (i % 3) * 4) * k;
        const ex = t[0] + Math.cos(a) * comp, ey = t[1] - Math.sin(a) * comp * 0.3 + (8 + (i % 2) * 5) * k;
        trG.strokeStyle = i % 2 ? "#2f8a3a" : "#43a84c"; trG.lineWidth = Math.max(1.4, 4 * k);
        trG.beginPath(); trG.moveTo(t[0], t[1]); trG.quadraticCurveTo(t[0] + Math.cos(a) * comp * 0.5, t[1] - 6 * k, ex, ey); trG.stroke();
    });
}

function drawPlataformaScene(ang) {
    const N = 64, R = PC_R;
    // casco por baixo: faixas do maior para o menor raio, de baixo para cima (a de cima cobre a de baixo)
    const aneis = [[-14, 298], [-40, 284], [-68, 240], [-92, 168], [-110, 78], [-118, 20]];
    for (let i = aneis.length - 1; i > 0; i--) {
        const a = c3Anel(0, 0, aneis[i - 1][0], aneis[i - 1][1], ang), b = c3Anel(0, 0, aneis[i][0], aneis[i][1], ang);
        const gr = trG.createLinearGradient(a.cx - a.rx, 0, a.cx + a.rx, 0);
        gr.addColorStop(0, "#7a6224"); gr.addColorStop(0.4, i === 1 ? "#d8bb64" : "#c4a24a"); gr.addColorStop(1, "#6a5420");
        trG.fillStyle = gr;
        trG.beginPath();
        trG.ellipse(a.cx, a.cy, a.rx, a.ry, 0, Math.PI, 0, true);
        trG.lineTo(b.cx + b.rx, b.cy);
        trG.ellipse(b.cx, b.cy, b.rx, b.ry, 0, 0, Math.PI, false);
        trG.closePath();
        trG.fill();
    }
    // janelas ovais azuis no casco, só as viradas para a câmera
    for (let i = 0; i < 14; i++) {
        const a = i / 14 * Math.PI * 2, rr = trRot(Math.sin(a), Math.cos(a), ang)[1];
        if (rr < 0.5) continue;
        const p = trProj(Math.sin(a) * 262, -52, Math.cos(a) * 262, ang), k = p[3];
        trG.fillStyle = "#3a4f78"; trG.beginPath(); trG.ellipse(p[0], p[1], 13 * k * rr, 4.6 * k, 0, 0, Math.PI * 2); trG.fill();
        trG.fillStyle = "#8fb6e6"; trG.beginPath(); trG.ellipse(p[0] - 2 * k * rr, p[1] - 1 * k, 7 * k * rr, 2 * k, 0, 0, Math.PI * 2); trG.fill();
    }
    // borda vinho com triângulos (a faixa da lateral do disco)
    const topo = c3Anel(0, 0, 0, R, ang), base = c3Anel(0, 0, -14, R - 2, ang);
    trG.fillStyle = "#6e1430";
    trG.beginPath(); trG.ellipse(topo.cx, topo.cy, topo.rx, topo.ry, 0, Math.PI, 0, true); trG.lineTo(base.cx + base.rx, base.cy); trG.ellipse(base.cx, base.cy, base.rx, base.ry, 0, 0, Math.PI, false); trG.closePath(); trG.fill();
    trG.fillStyle = "#b8344e";
    trG.beginPath();
    for (let i = 0; i < 72; i++) {
        const a0 = i / 72 * Math.PI * 2, a1 = (i + 1) / 72 * Math.PI * 2, am = (a0 + a1) / 2;
        if (trRot(Math.sin(am), Math.cos(am), ang)[1] < 0.05) continue;
        const p0 = trProj(Math.sin(a0) * R, -12, Math.cos(a0) * R, ang), p1 = trProj(Math.sin(a1) * R, -12, Math.cos(a1) * R, ang), pt = trProj(Math.sin(am) * R, -2, Math.cos(am) * R, ang);
        trG.moveTo(p0[0], p0[1]); trG.lineTo(pt[0], pt[1]); trG.lineTo(p1[0], p1[1]); trG.closePath();
    }
    trG.fill();
    trG.strokeStyle = "#e8c66a"; trG.lineWidth = 1;
    trG.beginPath(); trG.ellipse(base.cx, base.cy, base.rx, base.ry, 0, 0, Math.PI); trG.stroke();
    // escada com a corda na frente (fixa na planta, do lado +z)
    if (trRot(0, 1, ang)[1] > 0.1) {
        const e0 = trProj(-6, -12, R - 2, ang), e1 = trProj(-6, -120, R * 0.55, ang), d0 = trProj(6, -12, R - 2, ang), d1 = trProj(6, -120, R * 0.55, ang);
        trG.strokeStyle = "#8a6a3a"; trG.lineWidth = 1.4;
        trG.beginPath(); trG.moveTo(e0[0], e0[1]); trG.lineTo(e1[0], e1[1]); trG.moveTo(d0[0], d0[1]); trG.lineTo(d1[0], d1[1]);
        for (let i = 1; i < 10; i++) { const f = i / 10; trG.moveTo(e0[0] + (e1[0] - e0[0]) * f, e0[1] + (e1[1] - e0[1]) * f); trG.lineTo(d0[0] + (d1[0] - d0[0]) * f, d0[1] + (d1[1] - d0[1]) * f); }
        trG.stroke();
        const c0 = trProj(0, -120, R * 0.55, ang);
        trG.strokeStyle = "rgba(240, 240, 240, 0.8)"; trG.lineWidth = 1;
        trG.beginPath(); trG.moveTo(c0[0], c0[1]); trG.lineTo(c0[0], canvas.height + 10); trG.stroke();
    }
    // piso de ladrilhos
    const anel = []; for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; anel.push(trProj(Math.sin(a) * R, 0, Math.cos(a) * R, ang)); }
    trPoly(anel);
    const piso = trG.createLinearGradient(0, topo.cy - topo.ry, 0, topo.cy + topo.ry);
    piso.addColorStop(0, "#c9d8ea"); piso.addColorStop(1, "#e8f0f8");
    trG.fillStyle = piso; trG.fill();
    trG.strokeStyle = "rgba(140, 165, 200, 0.45)"; trG.lineWidth = 0.7;
    trG.beginPath();
    for (let v = -R + 24; v < R; v += 24) {
        const m = Math.sqrt(R * R - v * v);
        let p = trProj(v, 0, -m, ang), q = trProj(v, 0, m, ang); trG.moveTo(p[0], p[1]); trG.lineTo(q[0], q[1]);
        p = trProj(-m, 0, v, ang); q = trProj(m, 0, v, ang); trG.moveTo(p[0], p[1]); trG.lineTo(q[0], q[1]);
    }
    trG.stroke();
    trG.strokeStyle = "#ffffff"; trG.lineWidth = 1.4; trPoly(anel); trG.stroke();
    // canteiros de grama e sombras dos coqueiros
    PC_CANTEIROS.forEach(([x0, z0, x1, z1]) => {
        trPoly([[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(c => trProj(c[0], 0.5, c[1], ang)));
        trG.fillStyle = "#4f9a3a"; trG.fill();
        trG.strokeStyle = "#e6eef6"; trG.lineWidth = 1; trG.stroke();
    });
    trG.fillStyle = "rgba(60, 90, 160, 0.35)";
    [[-57, 95], [57, 95]].forEach(([x, z]) => {
        for (let i = 0; i < 3; i++) { const p = trProj(x + 30 + i * 14, 0.6, z - 10 + i * 6, ang); trG.beginPath(); trG.ellipse(p[0], p[1], 10 * p[3], 3 * p[3], 0.3, 0, Math.PI * 2); trG.fill(); }
    });
    // o que fica em pé, de trás para a frente
    const prof = (x, z) => trRot(x, z, ang)[1];
    const objetos = [{ z: prof(0, -160), d: () => pcPalacio(ang) }];
    PC_TORRES.forEach(([x, z]) => objetos.push({ z: prof(x, z), d: () => pcTorre(x, z, ang) }));
    PC_CIPRESTES.forEach(c => objetos.push({ z: prof(c.x, c.z), d: () => pcCipreste(c, ang) }));
    [[-57, 95], [57, 95]].forEach(([x, z]) => objetos.push({ z: prof(x, z), d: () => pcCoqueiro(x, z, ang) }));
    objetos.sort((a, b) => a.z - b.z).forEach(o => o.d());
}

// céu azul em cima, mar de nuvens embaixo (360°, desliza devagar)
const PC_PANO_W = Math.round(Math.PI * 2 * PC_CAM.F);
let pcPanorama = null;
function getPlataformaPanorama() {
    if (c3Valida(pcPanorama)) return pcPanorama;
    const f = c3NovaFaixa(PC_PANO_W, PC_CAM.HY + 30);
    if (!f) return null;
    const { c, g } = f, W = PC_PANO_W, base = PC_CAM.HY + 8;
    const ceu = g.createLinearGradient(0, 0, 0, base);
    ceu.addColorStop(0, "#3d7fd6"); ceu.addColorStop(0.6, "#8cbcea"); ceu.addColorStop(1, "#e6f2fc");
    g.fillStyle = ceu; g.fillRect(0, 0, W, c.__h);
    for (let i = 0; i < 10; i++) {
        const cx = (i * 391.7 + 60) % W, larg = 160 + (i * 41) % 140, alt = 26 + (i * 17) % 22;
        c3NaVolta(W, cx, larg, x => khNuvem(g, x, base + 10, larg, alt, i + 30));
    }
    pcPanorama = c;
    return c;
}
const PC_NUVENS = (() => {
    const l = [];
    for (let i = 0; i < 40; i++) {
        const a = c3Hash(i * 2.3) * Math.PI * 2, r = 380 + c3Hash(i * 5.1) * 1500;
        l.push({ x: Math.sin(a) * r, z: Math.cos(a) * r, tam: 60 + c3Hash(i * 8.7) * 90 });
    }
    return l;
})();
function drawPlataformaCeu(ang, t) {
    const chao = ctx.createLinearGradient(0, PC_CAM.HY, 0, canvas.height);
    chao.addColorStop(0, "#eef6fd"); chao.addColorStop(1, "#c6dcf2");
    ctx.fillStyle = chao;
    ctx.fillRect(0, PC_CAM.HY, canvas.width, canvas.height - PC_CAM.HY);
    const pano = getPlataformaPanorama();
    if (!pano || !c3BlitPanorama(pano, ang + t * 0.005, PC_CAM.F, PC_CAM.CX)) { ctx.fillStyle = "#8cbcea"; ctx.fillRect(0, 0, canvas.width, PC_CAM.HY); }
    // nuvens lá embaixo (plano bem abaixo da plataforma), passando devagar
    const lim = PC_CAM.D - PC_CAM.PERTO * 2;
    const desl = (t * 6) % 3000;
    PC_NUVENS.map(n => ({ n, x: ((n.x + desl + 1500) % 3000) - 1500 }))
        .map(o => ({ o, r: trRot(o.x, o.n.z, ang) }))
        .filter(v => v.r[1] < lim)
        .sort((a, b) => a.r[1] - b.r[1])
        .forEach(({ o }) => {
            const p = trProj(o.x, -420, o.n.z, ang), k = p[3], w = o.n.tam * k;
            if (p[1] < PC_CAM.HY || p[1] - w * 0.3 > canvas.height) return;
            ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
            ctx.beginPath(); ctx.ellipse(p[0], p[1], w, w * 0.22, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(p[0] - w * 0.3, p[1] - w * 0.1, w * 0.45, w * 0.18, 0, 0, Math.PI * 2); ctx.fill();
        });
}
function drawPlataformaStage(ang) {
    const t = typeof gameplayClock === "number" ? gameplayClock : 0;
    trCam = PC_CAM;
    try {
        drawPlataformaCeu(ang, t);
        drawCachedOrbitLayer(pcCena, ang, drawPlataformaScene);
    } finally {
        trCam = TR_CAM;
    }
}

// ==================== CAPITAL DO OESTE (Corporação Cápsula) ====================
// Só o quarteirão da Corporação Cápsula: no meio o prédio-domo amarelo alongado (malha 3D com luz do sol, topo
// branco com a cúpula pequena, duas fileiras de janelas azuis, a porta e o letreiro CAPSULE na frente, torrinhas
// brancas atrás e domos brancos anexos); em volta, o gramado com trilhas e árvores, casinhas-domo redondas, o prédio
// de teto azul, prédios brancos com grade de janelas e a rua em volta do quarteirão. Fora dele só campo, ruas e o
// horizonte. A câmera dá a volta no domo; o que ficaria entre a câmera e a luta não é desenhado (corte).
const CO_CAM = { CX: 400, HY: 40, D: 700, H: 250, F: 560, PERTO: 30 };
const coCena = { passo: null, canvas: null };
const CO_QUARTEIRAO = 330;   // metade do lado do gramado (a rua vem logo depois)
const CO_CORTE = 150;        // objetos mais perto da câmera que isto (profundidade) não aparecem
const CO_DOMO = { rx: 132, rz: 96, h: 86, y: 8 };
const CO_SOL = (() => { const v = [-0.5, 0.75, 0.45], n = Math.hypot(v[0], v[1], v[2]); return v.map(c => c / n); })();
const CO_OBJETOS = [
    // prédio de teto azul à direita, prédios brancos na frente e dois menores no fundo
    { tipo: "predio", x: 255, z: -30, w: 80, d: 120, h: 42, teto: "#3b82f6" },
    { tipo: "predio", x: -185, z: 255, w: 110, d: 50, h: 28, teto: "#e2e8f0" },
    { tipo: "predio", x: 175, z: 262, w: 90, d: 46, h: 34, teto: "#e2e8f0" },
    { tipo: "predio", x: -235, z: -250, w: 70, d: 60, h: 48, teto: "#f472b6" },
    { tipo: "predio", x: 95, z: -268, w: 64, d: 48, h: 24, teto: "#4ade80" },
    // domos brancos colados ao prédio principal
    { tipo: "anexo", x: -138, z: -34, r: 38, h: 32 },
    { tipo: "anexo", x: 118, z: -78, r: 26, h: 22 },
    // casinhas-domo redondas em grupinhos
    ...[[-270, 70, 16], [-232, 106, 13], [-282, 132, 12], [-300, -130, 12], [-262, -165, 10],
        [250, 140, 15], [287, 176, 12], [224, 192, 12], [-98, -238, 16], [-58, -277, 12],
        [258, -228, 14], [292, -282, 12], [45, 238, 14], [-58, 282, 12], [-32, 222, 10]]
        .map(([x, z, r], i) => ({ tipo: "casa", x, z, r, faixa: ["#60a5fa", "#f472b6", "#facc15", "#4ade80", "#fb923c"][i % 5] }))
];
// árvores redondas no gramado, longe dos prédios e das trilhas
const CO_ARVORES_JARDIM = (() => {
    const l = [], Q = CO_QUARTEIRAO - 12;
    for (let i = 0; l.length < 30 && i < 400; i++) {
        const x = (c3Hash(i * 2.31) * 2 - 1) * Q, z = (c3Hash(i * 5.17) * 2 - 1) * Q;
        if ((x / 190) ** 2 + (z / 150) ** 2 < 1) continue;          // domo e trilha em volta
        if (Math.abs(x) < 20 && z > 0) continue;                    // trilha da frente
        if (Math.abs(z - 10) < 18 && x < -150) continue;            // trilha da esquerda
        const livre = CO_OBJETOS.every(o => o.tipo === "predio"
            ? Math.abs(x - o.x) > o.w / 2 + 12 || Math.abs(z - o.z) > o.d / 2 + 12
            : Math.hypot(x - o.x, z - o.z) > o.r + 12);
        if (livre && l.every(t => Math.hypot(t.x - x, t.z - z) > 26)) l.push({ x, z, t: 7 + c3Hash(i * 3.7) * 4 });
    }
    return l;
})();

// ponto/normal da casca do domo (elipsoide): t = longitude (0 = frente, lado +z), f = latitude (0 = base, PI/2 = topo)
function coPontoDomo(t, f, s) {
    const D = CO_DOMO, cf = Math.cos(f), e = s || 1;
    return [D.rx * cf * Math.sin(t) * e, D.y + D.h * Math.sin(f) * e, D.rz * cf * Math.cos(t) * e];
}
function coNormalDomo(t, f) {
    const D = CO_DOMO, cf = Math.cos(f);
    return [cf * Math.sin(t) / D.rx, Math.sin(f) / D.h, cf * Math.cos(t) / D.rz];
}
function coVeCamera(p, n, cam) { return (cam[0] - p[0]) * n[0] + (cam[1] - p[1]) * n[1] + (cam[2] - p[2]) * n[2] > 0; }
function coLuz(n) { const m = Math.hypot(n[0], n[1], n[2]); return (n[0] * CO_SOL[0] + n[1] * CO_SOL[1] + n[2] * CO_SOL[2]) / m; }
// malha do domo montada uma vez: cada quadradinho guarda o centro, a normal e a cor já iluminada
const CO_MALHA = (() => {
    const NT = 36, NF = 10, l = [];
    for (let j = 0; j < NF; j++) for (let i = 0; i < NT; i++) {
        const t0 = i / NT * Math.PI * 2, t1 = (i + 1) / NT * Math.PI * 2, f0 = j / NF * Math.PI / 2, f1 = (j + 1) / NF * Math.PI / 2;
        const tm = (t0 + t1) / 2, fm = (f0 + f1) / 2, n = coNormalDomo(tm, fm);
        const luz = Math.round(coLuz(n) * 8) / 8;
        const base = j >= NF - 2 ? "#f3f5f9" : "#ffd447";            // a parte de cima é branca
        l.push({ t0, t1, f0, f1, c: coPontoDomo(tm, fm), n, cor: spriteMixC3(base, Math.max(-0.22, Math.min(0.3, (luz - 0.45) * 0.55))) });
    }
    return l;
})();
// quadradinho na casca entre as longitudes t0..t1 e latitudes f0..f1 (um pouco para fora, para ficar por cima)
function coQuadDomo(t0, t1, f0, f1, cor, ang, s) {
    const e = s || 1.006;
    trPoly([coPontoDomo(t0, f0, e), coPontoDomo(t1, f0, e), coPontoDomo(t1, f1, e), coPontoDomo(t0, f1, e)].map(p => trProj(p[0], p[1], p[2], ang)));
    trG.fillStyle = cor; trG.fill();
}
// texto pintado num plano: o = ponto do meio, u = direção da leitura, v = "para cima" (vetores unitários)
function coTexto(o, u, v, texto, tam, cor, ang) {
    const A = trProj(o[0], o[1], o[2], ang);
    const B = trProj(o[0] + u[0], o[1] + u[1], o[2] + u[2], ang);
    const C = trProj(o[0] - v[0], o[1] - v[1], o[2] - v[2], ang);
    trG.save();
    trG.transform(B[0] - A[0], B[1] - A[1], C[0] - A[0], C[1] - A[1], A[0], A[1]);
    trG.font = `bold ${tam}px 'Trebuchet MS', sans-serif`;
    trG.textAlign = "center"; trG.textBaseline = "middle";
    trG.lineWidth = tam * 0.16; trG.strokeStyle = "#ffffff"; trG.strokeText(texto, 0, 0);
    trG.fillStyle = cor; trG.fillText(texto, 0, 0);
    trG.restore();
}
function coTorrinha(x, z, ang) {
    // torrinha redonda branca saindo da casca, com cúpula e uma faixa de janelinhas
    const D = CO_DOMO, y = D.y + D.h * Math.sqrt(Math.max(0, 1 - (x / D.rx) ** 2 - (z / D.rz) ** 2));
    c3Cilindro(x, z, y - 6, y + 16, 9, "#e6ebf2", ang, "#f7f9fc", "rgba(90, 100, 125, 0.45)");
    const a = c3Anel(x, z, y + 10, 9.4, ang);
    trG.strokeStyle = "#3d6fc2"; trG.lineWidth = Math.max(1, 2.6 * a.k);
    trG.beginPath(); trG.ellipse(a.cx, a.cy, a.rx, a.ry, 0, 0.15, Math.PI - 0.15); trG.stroke();
    c3Domo(x, z, y + 16, 9, 8, "#f7f9fc", ang);
}
function coCorporacao(ang) {
    const D = CO_DOMO, cam = c3Camera(ang);
    const torres = [[-58, -50], [62, -44]].map(([x, z]) => ({ x, z, frente: coVeCamera([x, 60, z], coNormalDomo(Math.atan2(x / D.rx, z / D.rz), 0.9), cam) }));
    torres.forEach(t => { if (!t.frente) coTorrinha(t.x, t.z, ang); });   // as de trás ficam escondidas pela casca
    // base branca (parede elíptica baixa)
    const NT = 36;
    for (let i = 0; i < NT; i++) {
        const t0 = i / NT * Math.PI * 2, t1 = (i + 1) / NT * Math.PI * 2, tm = (t0 + t1) / 2;
        const n = [Math.sin(tm) / D.rx, 0, Math.cos(tm) / D.rz];
        const p = (t, y) => [(D.rx + 4) * Math.sin(t), y, (D.rz + 4) * Math.cos(t)];
        if (!coVeCamera(p(tm, 4), n, cam)) continue;
        trPoly([p(t0, 0), p(t1, 0), p(t1, D.y), p(t0, D.y)].map(q => trProj(q[0], q[1], q[2], ang)));
        trG.fillStyle = spriteMixC3("#e7ebf1", Math.max(-0.3, (coLuz(n) - 0.4) * 0.4)); trG.fill();
        trG.strokeStyle = trG.fillStyle; trG.lineWidth = 0.8; trG.stroke();
    }
    // casca amarela iluminada (convexa: basta não desenhar o que está de costas)
    trG.lineWidth = 0.8;
    CO_MALHA.forEach(q => {
        if (!coVeCamera(q.c, q.n, cam)) return;
        trPoly([coPontoDomo(q.t0, q.f0), coPontoDomo(q.t1, q.f0), coPontoDomo(q.t1, q.f1), coPontoDomo(q.t0, q.f1)].map(p => trProj(p[0], p[1], p[2], ang)));
        trG.fillStyle = q.cor; trG.fill();
        trG.strokeStyle = q.cor; trG.stroke();
    });
    // friso branco entre o amarelo e o topo
    const fr = Math.PI / 2 * 0.8;
    for (let i = 0; i < NT; i++) {
        const t0 = i / NT * Math.PI * 2, t1 = (i + 1) / NT * Math.PI * 2, tm = (t0 + t1) / 2;
        if (coVeCamera(coPontoDomo(tm, fr), coNormalDomo(tm, fr), cam)) coQuadDomo(t0, t1, fr - 0.035, fr, "#c9d3e0", ang);
    }
    // janelas: fileira de baixo (16, sem as da frente onde ficam a porta e o letreiro) e fileira de cima (12)
    const janela = (tm, larg, f0, f1) => {
        const t0 = tm - larg / 2, t1 = tm + larg / 2;
        if (!coVeCamera(coPontoDomo(tm, (f0 + f1) / 2), coNormalDomo(tm, (f0 + f1) / 2), cam)) return;
        coQuadDomo(t0 - 0.012, t1 + 0.012, f0 - 0.02, f1 + 0.02, "#f4f7fb", ang);
        coQuadDomo(t0, t1, f0, f1, "#2f5fae", ang, 1.009);
        coQuadDomo(t0, t1, f1 - (f1 - f0) * 0.4, f1, "#7fa8e6", ang, 1.011);
    };
    for (let i = 0; i < 16; i++) {
        let tm = i / 16 * Math.PI * 2; if (tm > Math.PI) tm -= Math.PI * 2;
        if (Math.abs(tm) < 0.5) continue;
        janela(tm, 0.15, 0.2, 0.36);
    }
    for (let i = 0; i < 12; i++) janela((i + 0.5) / 12 * Math.PI * 2, 0.2, 0.74, 0.94);
    // porta na frente, com marquise branca
    if (coVeCamera(coPontoDomo(0, 0.1), coNormalDomo(0, 0.1), cam)) {
        coQuadDomo(-0.13, 0.13, -0.02, 0.2, "#e9eef5", ang, 1.01);
        coQuadDomo(-0.1, 0.1, -0.08, 0.16, "#2b3f66", ang, 1.016);
        coQuadDomo(-0.004, 0.004, -0.08, 0.16, "#8aa6d6", ang, 1.02);
    }
    // letreiro CAPSULE pintado na frente
    const fl = 0.42, nl = coNormalDomo(0, fl), pl = coPontoDomo(0, fl, 1.012);
    const cl = [cam[0] - pl[0], cam[1] - pl[1], cam[2] - pl[2]], ml = Math.hypot(...cl) * Math.hypot(...nl);
    if ((cl[0] * nl[0] + cl[1] * nl[1] + cl[2] * nl[2]) / ml > 0.18) {
        const vy = D.h * Math.cos(fl), vz = -D.rz * Math.sin(fl), mv = Math.hypot(vy, vz);
        coTexto(pl, [1, 0, 0], [0, vy / mv, vz / mv], "CAPSULE", 23, "#1f4fb4", ang);
    }
    // cúpula branca pequena no topo
    c3Cilindro(0, 0, D.y + D.h - 4, D.y + D.h + 6, 22, "#e3e9f1", ang, "#f7f9fc", "rgba(90, 100, 125, 0.4)");
    const anel = c3Anel(0, 0, D.y + D.h + 2, 22.4, ang);
    trG.strokeStyle = "#3d6fc2"; trG.lineWidth = Math.max(1, 2.4 * anel.k);
    trG.beginPath(); trG.ellipse(anel.cx, anel.cy, anel.rx, anel.ry, 0, 0.12, Math.PI - 0.12); trG.stroke();
    c3Domo(0, 0, D.y + D.h + 6, 22, 14, "#f7f9fc", ang);
    torres.forEach(t => { if (t.frente) coTorrinha(t.x, t.z, ang); });
}
// janelas em grade numa parede que vai de a até b (no chão, [x, z]) com altura h
function coJanelasParede(a, b, h, ang) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), cols = Math.max(1, Math.floor(len / 15)), rows = Math.max(1, Math.floor((h - 6) / 12));
    const pt = (s, y) => trProj(a[0] + (b[0] - a[0]) * s, y, a[1] + (b[1] - a[1]) * s, ang);
    const cw = 1 / cols, rh = (h - 8) / rows;
    for (let r = 0; r < rows; r++) {
        const y0 = 5 + r * rh, y1 = y0 + rh * 0.58;
        for (let c = 0; c < cols; c++) {
            const s0 = c * cw + cw * 0.2, s1 = s0 + cw * 0.6;
            trPoly([pt(s0, y0), pt(s1, y0), pt(s1, y1), pt(s0, y1)]);
            trG.fillStyle = "#3a6cbf"; trG.fill();
            trPoly([pt(s0, y1 - (y1 - y0) * 0.35), pt(s1, y1 - (y1 - y0) * 0.35), pt(s1, y1), pt(s0, y1)]);
            trG.fillStyle = "#8db3ea"; trG.fill();
        }
    }
}
function coPredio(p, ang) {
    const { x, z, w, d, h } = p, x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, o = 0.4;
    const parede = "#f1f4f8", lado = "#d3dbe6", traco = "rgba(80, 100, 130, 0.5)";
    if (c3Face([[x0, 0, z1], [x1, 0, z1], [x1, h, z1], [x0, h, z1]], [0, 0, 1], parede, ang, traco)) coJanelasParede([x0, z1 + o], [x1, z1 + o], h, ang);
    if (c3Face([[x1, 0, z0], [x0, 0, z0], [x0, h, z0], [x1, h, z0]], [0, 0, -1], lado, ang, traco)) coJanelasParede([x1, z0 - o], [x0, z0 - o], h, ang);
    if (c3Face([[x1, 0, z1], [x1, 0, z0], [x1, h, z0], [x1, h, z1]], [1, 0, 0], lado, ang, traco)) coJanelasParede([x1 + o, z1], [x1 + o, z0], h, ang);
    if (c3Face([[x0, 0, z0], [x0, 0, z1], [x0, h, z1], [x0, h, z0]], [-1, 0, 0], parede, ang, traco)) coJanelasParede([x0 - o, z0], [x0 - o, z1], h, ang);
    // teto colorido com mureta clara e uma caixa d'água redonda
    trPoly([[x0, h, z0], [x1, h, z0], [x1, h, z1], [x0, h, z1]].map(q => trProj(q[0], q[1], q[2], ang)));
    trG.fillStyle = "#f7f9fc"; trG.fill(); trG.strokeStyle = traco; trG.lineWidth = 1; trG.stroke();
    trPoly([[x0 + 4, h, z0 + 4], [x1 - 4, h, z0 + 4], [x1 - 4, h, z1 - 4], [x0 + 4, h, z1 - 4]].map(q => trProj(q[0], q[1], q[2], ang)));
    trG.fillStyle = p.teto; trG.fill();
    c3Cilindro(x - w * 0.22, z - d * 0.18, h, h + 7, 6, "#e3e9f1", ang, "#f7f9fc");
}
function coCasa(p, ang) {
    c3Cilindro(p.x, p.z, 0, 4, p.r, "#dde3ec", ang, "#eef2f7");
    c3Domo(p.x, p.z, 4, p.r, p.r * 0.85, "#f4f6fa", ang);
    const a = c3Anel(p.x, p.z, 4 + p.r * 0.35, p.r * 0.93, ang);
    trG.strokeStyle = p.faixa; trG.lineWidth = Math.max(1, 2.4 * a.k);
    trG.beginPath(); trG.ellipse(a.cx, a.cy, a.rx, a.ry, 0, 0.1, Math.PI - 0.1); trG.stroke();
    // janelinha redonda e a porta, viradas para o domo principal
    const dir = Math.atan2(-p.x, -p.z), jx = p.x + Math.sin(dir) * p.r * 0.8, jz = p.z + Math.cos(dir) * p.r * 0.8;
    if (trRot(jx - p.x, jz - p.z, ang)[1] > 0) {
        const j = trProj(jx, 4 + p.r * 0.55, jz, ang), q = trProj(jx, 4, jz, ang);
        trG.fillStyle = "#3a6cbf"; trG.beginPath(); trG.ellipse(j[0], j[1], 2.4 * j[3], 2.2 * j[3], 0, 0, Math.PI * 2); trG.fill();
        trG.fillStyle = "#6b7a90"; trG.fillRect(q[0] - 2.2 * q[3], q[1] - 7 * q[3], 4.4 * q[3], 7 * q[3]);
    }
}
function coAnexo(p, ang) {
    c3Cilindro(p.x, p.z, 0, 8, p.r + 2, "#e3e8f0", ang, "#f2f5f9", "rgba(90, 100, 125, 0.35)");
    c3Domo(p.x, p.z, 8, p.r, p.h, "#f6f8fb", ang);
    const a = c3Anel(p.x, p.z, 8 + p.h * 0.3, p.r * 0.95, ang);
    trG.strokeStyle = "#3d6fc2"; trG.lineWidth = Math.max(1, 3 * a.k);
    trG.setLineDash([4 * a.k, 4 * a.k]);
    trG.beginPath(); trG.ellipse(a.cx, a.cy, a.rx, a.ry, 0, 0.2, Math.PI - 0.2); trG.stroke();
    trG.setLineDash([]);
}
function coArvore(t, ang) {
    const p = trProj(t.x, 0, t.z, ang), k = p[3];
    trG.fillStyle = "rgba(30, 70, 30, 0.25)"; trG.beginPath(); trG.ellipse(p[0], p[1], t.t * k, t.t * 0.35 * k, 0, 0, Math.PI * 2); trG.fill();
    trG.fillStyle = "#7a5230"; trG.fillRect(p[0] - 1.2 * k, p[1] - t.t * 0.9 * k, 2.4 * k, t.t * 0.9 * k);
    trG.fillStyle = "#2f7a32"; trG.beginPath(); trG.arc(p[0], p[1] - t.t * 1.4 * k, t.t * k, 0, Math.PI * 2); trG.fill();
    trG.fillStyle = "#5cb24e"; trG.beginPath(); trG.arc(p[0] - t.t * 0.3 * k, p[1] - t.t * 1.7 * k, t.t * 0.45 * k, 0, Math.PI * 2); trG.fill();
}
// faixa clara de trilha no gramado (retângulo da planta)
function coTrilha(x0, z0, x1, z1, ang) {
    trPoly([[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(c => trProj(c[0], 0.5, c[1], ang)));
    trG.fill();
}
function drawCapitalScene(ang) {
    // trilhas claras: anel em volta do domo, caminho da porta até a rua e o da esquerda
    trG.fillStyle = "#efe4c2";
    const fora = [], dentro = [];
    for (let i = 0; i <= 48; i++) {
        const a = i / 48 * Math.PI * 2;
        fora.push(trProj(Math.sin(a) * 178, 0.5, Math.cos(a) * 140, ang));
        dentro.push(trProj(Math.sin(a) * 160, 0.5, Math.cos(a) * 122, ang));
    }
    trG.beginPath(); fora.forEach((p, i) => i ? trG.lineTo(p[0], p[1]) : trG.moveTo(p[0], p[1]));
    for (let i = dentro.length - 1; i >= 0; i--) trG.lineTo(dentro[i][0], dentro[i][1]);
    trG.closePath(); trG.fill();
    coTrilha(-11, 126, 11, CO_QUARTEIRAO, ang);
    coTrilha(-CO_QUARTEIRAO, 2, -164, 18, ang);
    const prof = (x, z) => trRot(x, z, ang)[1];
    const objetos = [{ z: prof(0, 0), d: () => coCorporacao(ang) }];
    CO_OBJETOS.forEach(p => {
        const z = prof(p.x, p.z);
        if (z > CO_CORTE) return;   // corte: não tampa a luta
        objetos.push({ z, d: () => (p.tipo === "predio" ? coPredio(p, ang) : p.tipo === "anexo" ? coAnexo(p, ang) : coCasa(p, ang)) });
    });
    CO_ARVORES_JARDIM.forEach(t => { const z = prof(t.x, t.z); if (z <= CO_CORTE + 120) objetos.push({ z, d: () => coArvore(t, ang) }); });
    objetos.sort((a, b) => a.z - b.z).forEach(o => o.d());
}

// céu, campo e morros ao fundo (360°)
const CO_PANO_W = Math.round(Math.PI * 2 * CO_CAM.F);
let coPanorama = null;
function getCapitalPanorama() {
    if (c3Valida(coPanorama)) return coPanorama;
    const f = c3NovaFaixa(CO_PANO_W, CO_CAM.HY + 6);
    if (!f) return null;
    const { c, g } = f, W = CO_PANO_W, base = CO_CAM.HY + 2;
    const ceu = g.createLinearGradient(0, 0, 0, base);
    ceu.addColorStop(0, "#5aa6e8"); ceu.addColorStop(1, "#cfe8fa");
    g.fillStyle = ceu; g.fillRect(0, 0, W, c.__h);
    // morros e mesas rosadas ao longe
    for (let i = 0; i < 18; i++) {
        const x = (i * 211.3 + 40) % W, larg = 70 + (i * 23) % 80, alt = 10 + (i * 7) % 18;
        c3NaVolta(W, x, larg, xx => {
            g.fillStyle = i % 3 === 0 ? "#b98aa8" : "#6fa86a";
            g.beginPath(); g.moveTo(xx - larg / 2, base); g.quadraticCurveTo(xx, base - alt * 2, xx + larg / 2, base); g.closePath(); g.fill();
        });
    }
    // o resto da cidade, bem longe
    for (let i = 0; i < 40; i++) {
        const x = (i * 97.7 + 13) % W, w = 8 + (i * 5) % 10, h = 6 + (i * 13) % 16;
        c3NaVolta(W, x, w, xx => { g.fillStyle = "rgba(225, 232, 245, 0.8)"; g.fillRect(xx, base - h, w, h); g.fillStyle = ["#f9a8d4", "#fde68a", "#93c5fd"][i % 3]; g.fillRect(xx, base - h, w, 2); });
    }
    coPanorama = c;
    return c;
}
// árvores soltas no campo fora do quarteirão
const CO_ARVORES = (() => {
    const l = [];
    for (let i = 0; i < 36; i++) {
        const a = c3Hash(i * 1.9) * Math.PI * 2, r = 470 + c3Hash(i * 4.3) * 700;
        l.push({ x: Math.sin(a) * r, z: Math.cos(a) * r, t: 6 + c3Hash(i * 3.1) * 5 });
    }
    return l;
})();
function drawCapitalChao(ang) {
    const pano = getCapitalPanorama();
    if (!pano || !c3BlitPanorama(pano, ang, CO_CAM.F, CO_CAM.CX)) { ctx.fillStyle = "#8cc4ef"; ctx.fillRect(0, 0, canvas.width, CO_CAM.HY); }
    const chao = ctx.createLinearGradient(0, CO_CAM.HY, 0, canvas.height);
    chao.addColorStop(0, "#9ccf7a"); chao.addColorStop(1, "#4f9a3a");
    ctx.fillStyle = chao;
    ctx.fillRect(0, CO_CAM.HY + 2, canvas.width, canvas.height - CO_CAM.HY);
    const lim = CO_CAM.D - CO_CAM.PERTO * 2, Q = CO_QUARTEIRAO, R = Q + 30;
    const quadrado = (m, y) => { const q = [[-m, -m], [m, -m], [m, m], [-m, m]].map(c => trProj(c[0], y, c[1], ang)); ctx.beginPath(); q.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); };
    // ruas saindo do quarteirão (recortadas antes da câmera)
    ctx.fillStyle = "#8d96a3";
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz]) => {
        const nx = -dz * 13, nz = dx * 13;
        const seg = c3RecorteChao([dx * R, dz * R], [dx * 1600, dz * 1600], ang, lim);
        if (!seg) return;
        const [a, b] = seg;
        const q = [[a[0] + nx, a[1] + nz], [b[0] + nx, b[1] + nz], [b[0] - nx, b[1] - nz], [a[0] - nx, a[1] - nz]].map(c => trProj(c[0], 0, c[1], ang));
        ctx.beginPath(); q.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill();
    });
    // rua em volta do quarteirão, calçada e o gramado
    quadrado(R, 0); ctx.fillStyle = "#8d96a3"; ctx.fill();
    ctx.setLineDash([10, 9]); quadrado(Q + 17, 0.2); ctx.strokeStyle = "rgba(255, 255, 255, 0.75)"; ctx.lineWidth = 1.2; ctx.stroke(); ctx.setLineDash([]);
    quadrado(Q + 6, 0.3); ctx.fillStyle = "#d9dde3"; ctx.fill();
    quadrado(Q, 0.4); ctx.fillStyle = "#74c454"; ctx.fill();
    // árvores do campo (fixas no mundo)
    CO_ARVORES.forEach(t => {
        if (trRot(t.x, t.z, ang)[1] > lim) return;
        const p = trProj(t.x, 0, t.z, ang), k = p[3];
        if (p[1] < CO_CAM.HY) return;
        ctx.fillStyle = "#2f7a32"; ctx.beginPath(); ctx.arc(p[0], p[1] - t.t * k, t.t * k, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#5cb24e"; ctx.beginPath(); ctx.arc(p[0] - t.t * 0.3 * k, p[1] - t.t * 1.3 * k, t.t * 0.45 * k, 0, Math.PI * 2); ctx.fill();
    });
}
function drawCapitalStage(ang) {
    trCam = CO_CAM;
    try {
        drawCapitalChao(ang);
        drawCachedOrbitLayer(coCena, ang, drawCapitalScene);
    } finally {
        trCam = TR_CAM;
    }
}

  // ---- mapa de fases (game-logic-core.js, mapa.js, menu.js) ----
  let traduzir = (t) => t;
  let mapaTotal = 60;
  function getMapaTotalFases() { return mapaTotal; }
// ==================== MAPA DE PROGRESSO (fases em linha) ====================
// Caminho único e longo, rolando na horizontal: fase i (0 = primeira) fica em getMapaPosicaoFase(i), em
// coordenadas do mapa (x cresce para a direita; a tela mostra MAPA_TELA_W de largura). Cada trecho de
// MAPA_FASES_POR_TRECHO fases tem um ambiente. MAPA_TOTAL_FASES = fases existentes + futuras (com cadeado):
// para ter mais, é só aumentar o número.
const MAPA_TOTAL_FASES = 60;
const MAPA_FASES_POR_TRECHO = 10;
const MAPA_PASSO_X = 130;
const MAPA_MARGEM_X = 90;
const MAPA_TELA_W = 800;
function getMapaPosicaoFase(i) {
    // sobe e desce em ondas irregulares (duas senoides), nunca colando em cima do título nem embaixo
    // (0.85: o mapa é em perspectiva, com o horizonte em MAPA_HORIZONTE_Y — o caminho fica no chão, abaixo dele)
    const y = 206 + Math.sin(i * 1.15) * 40 + Math.sin(i * 0.43 + 1) * 16;
    return { x: MAPA_MARGEM_X + i * MAPA_PASSO_X, y: Math.round(y) };
}
const MAPA_HORIZONTE_Y = 100;
// Mistura dos ambientes ao longo do mapa (x do mapa): perto da divisa entre dois trechos o ambiente muda aos
// poucos, ao longo de MAPA_MISTURA_FASES fases. Devolve { a, b, w }: trecho a, trecho b (o seguinte) e o peso de
// b (0 = só a, 1 = só b). Longe da divisa, w = 0.
const MAPA_MISTURA_FASES = 3;
function getMapaMistura(mx) {
    const trechoW = MAPA_FASES_POR_TRECHO * MAPA_PASSO_X, meia = MAPA_MISTURA_FASES * MAPA_PASSO_X / 2;
    // divisa entre o trecho k e o k+1: no meio do caminho entre a última fase de k e a primeira de k+1
    const rel = mx - MAPA_MARGEM_X + MAPA_PASSO_X / 2;
    const k = Math.floor(rel / trechoW);
    const dentro = rel - k * trechoW;   // 0..trechoW
    if (k < 0) return { a: 0, b: 0, w: 0 };
    if (dentro > trechoW - meia) {
        const t = (dentro - (trechoW - meia)) / (2 * meia);
        return { a: Math.max(0, k), b: Math.max(0, k + 1), w: t * t * (3 - 2 * t) };
    }
    if (dentro < meia && k > 0) {
        const t = (dentro + meia) / (2 * meia);
        return { a: k - 1, b: k, w: t * t * (3 - 2 * t) };
    }
    return { a: Math.max(0, k), b: Math.max(0, k), w: 0 };
}
function getMapaTrecho(i) {
    return Math.floor(Math.max(0, i) / MAPA_FASES_POR_TRECHO);
}
function getMapaLargura(total) {
    return MAPA_MARGEM_X * 2 + (Math.max(1, total || MAPA_TOTAL_FASES) - 1) * MAPA_PASSO_X;
}
function limitarRolagemMapa(rolagem, total) {
    return Math.max(0, Math.min(getMapaLargura(total) - MAPA_TELA_W, rolagem || 0));
}
// rolagem que deixa a fase i no meio da tela
function rolagemParaFase(i, total) {
    return limitarRolagemMapa(getMapaPosicaoFase(i).x - MAPA_TELA_W / 2, total);
}


// ==================== MAPA DE PROGRESSO (cenário em 3D) ====================
// Só desenho do fundo do mapa de fases (os cliques, a rolagem e os círculos das fases ficam em menu.js; a
// geometria do caminho e a mistura dos ambientes em game-logic-core.js). Carrega depois de cenarios3d.js.
//
// O mapa é visto em perspectiva: céu em cima, horizonte em MAPA_HORIZONTE_Y e o chão descendo até a tela,
// com a estrada das fases deitada nele. Cada trecho de 10 fases tem um ambiente de Dragon Ball (MAPA_AMBIENTES)
// e, perto da divisa entre dois trechos, tudo muda aos poucos ao longo de ~3 fases (getMapaMistura): as cores
// do céu e do chão se misturam, a paisagem do horizonte de um some enquanto a do outro aparece e os objetos do
// chão vão trocando de um ambiente para o outro.
// Profundidade (paralaxe): a paisagem do horizonte anda devagar, as fileiras de objetos lá longe um pouco mais,
// a estrada na velocidade da rolagem e a fileira da frente mais rápido.
// Desempenho: as cores são uma faixa pequena feita uma vez e esticada (1 drawImage); cada paisagem de
// horizonte é uma imagem guardada (no máximo 3 na memória); cada objeto é um desenho guardado e copiado
// (algumas dezenas de drawImage por quadro).

const MAPA_HY = MAPA_HORIZONTE_Y;
const MAPA_DECOR_W = 1600;          // largura da paisagem de horizonte (repete)
const MAPA_DECOR_VEL = 0.3;         // paralaxe da paisagem de horizonte
const MAPA_PALETA_PASSO = 8;        // 1 coluna da faixa de cores a cada 8 px do mapa

// Ambientes na ordem dos trechos (fases 1-10, 11-20...). Trechos além da lista repetem o último.
const MAPA_AMBIENTES = [
    { nome: "terra", ceu: ["#3b7fd6", "#c4e6fb"], chao: ["#a6d872", "#4e9a3a"], decor: mapaDecorTerra, objetos: ["arvore", "arvore", "capsula", "mesa", "pedra"] },
    { nome: "namek", ceu: ["#4f9e68", "#dcf2b4"], chao: ["#8ad6c6", "#3f93a8"], decor: mapaDecorNamek, objetos: ["namek_arvore", "namek_arvore", "namek_casa", "espigao", "pedra_azul"] },
    { nome: "espaco", ceu: ["#05030f", "#3a1a5a"], chao: ["#6a4a86", "#2c1c40"], decor: mapaDecorEspaco, objetos: ["cratera", "rocha_roxa", "cristal_roxo", "nave_saiyajin", "cratera"] },
    { nome: "deserto_cell", ceu: ["#5aa0e0", "#f2e4c4"], chao: ["#efe0b4", "#c4a06c"], decor: mapaDecorDeserto, objetos: ["agulha", "agulha", "pedra_areia", "mesa_areia"] },
    { nome: "kaioshin", ceu: ["#3a1a6a", "#f2bede"], chao: ["#b2eaa8", "#4a9a6a"], decor: mapaDecorKaioshin, objetos: ["arvore_rosa", "arvore_rosa", "cristal", "arbusto"] },
    { nome: "bills", ceu: ["#0a0620", "#5a1f7a"], chao: ["#74a462", "#2a4a3a"], decor: mapaDecorBills, objetos: ["piramide", "arvore_bills", "rocha_flutuante", "pilar"] }
];
function mapaAmbiente(t) { return MAPA_AMBIENTES[Math.max(0, Math.min(t, MAPA_AMBIENTES.length - 1))]; }

// ---------- cores (céu e chão), misturadas coluna a coluna numa faixa pequena ----------
function mapaHex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mapaMisturaCor(c1, c2, w) {
    const a = mapaHex(c1), b = mapaHex(c2);
    return `rgb(${Math.round(a[0] + (b[0] - a[0]) * w)},${Math.round(a[1] + (b[1] - a[1]) * w)},${Math.round(a[2] + (b[2] - a[2]) * w)})`;
}
let mapaPaleta = null;
function getMapaPaleta() {
    if (mapaPaleta) return mapaPaleta;
    if (typeof document === "undefined" || !document.createElement) return null;
    const largura = getMapaLargura(getMapaTotalFases()) + 800;
    const c = document.createElement("canvas");
    c.width = Math.ceil(largura / MAPA_PALETA_PASSO) + 2;
    c.height = 350;
    const g = c.getContext && c.getContext("2d");
    if (!g || typeof g.createLinearGradient !== "function") return null;
    for (let i = 0; i < c.width; i++) {
        const m = getMapaMistura(i * MAPA_PALETA_PASSO), A = mapaAmbiente(m.a), B = mapaAmbiente(m.b);
        const ceu = g.createLinearGradient(0, 0, 0, MAPA_HY);
        ceu.addColorStop(0, mapaMisturaCor(A.ceu[0], B.ceu[0], m.w));
        ceu.addColorStop(1, mapaMisturaCor(A.ceu[1], B.ceu[1], m.w));
        g.fillStyle = ceu;
        g.fillRect(i, 0, 1, MAPA_HY);
        const chao = g.createLinearGradient(0, MAPA_HY, 0, 350);
        const longe = mapaMisturaCor(A.chao[0], B.chao[0], m.w), perto = mapaMisturaCor(A.chao[1], B.chao[1], m.w);
        chao.addColorStop(0, mapaMisturaCor(A.ceu[1], B.ceu[1], m.w));   // névoa no horizonte
        chao.addColorStop(0.06, longe);
        chao.addColorStop(1, perto);
        g.fillStyle = chao;
        g.fillRect(i, MAPA_HY, 1, 350 - MAPA_HY);
    }
    mapaPaleta = c;
    return c;
}

// ---------- paisagem do horizonte (uma imagem por ambiente, repetindo de lado) ----------
const mapaDecorCache = new Map();   // nome do ambiente -> faixa (c3NovaFaixa)
function getMapaDecor(amb) {
    let c = mapaDecorCache.get(amb.nome);
    if (c3Valida(c)) return c;
    const f = typeof document !== "undefined" && document.createElement ? c3NovaFaixa(MAPA_DECOR_W, MAPA_HY + 16) : null;
    if (!f || typeof f.g.createLinearGradient !== "function") return null;
    amb.decor(f.g, MAPA_DECOR_W, MAPA_HY + 2, mapaSorteio(amb.nome.length * 97 + 13));
    if (mapaDecorCache.size >= 3) mapaDecorCache.delete(mapaDecorCache.keys().next().value);
    mapaDecorCache.set(amb.nome, f.c);
    return f.c;
}
function mapaSorteio(semente) {
    let s = (semente * 9301 + 49297) % 233280 || 1;
    return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}
// repete na emenda da faixa (para o desenho não ficar cortado na volta)
function mapaNaVolta(W, x, larg, desenha) { [-W, 0, W].forEach(dx => { if (x + dx + larg > 0 && x + dx - larg < W) desenha(x + dx); }); }

function mapaMontanhas(g, W, base, alt, cor, luz, rnd, passo, redonda) {
    let x = 0;
    const picos = [];
    while (x < W) { const pw = passo * (0.6 + rnd() * 0.8); picos.push([x, pw, alt * (0.45 + rnd() * 0.55), 0.4 + rnd() * 0.2]); x += pw; }
    picos[picos.length - 1][1] += W - x;   // a última fecha a volta certinho
    [-W, 0, W].forEach(dx => {
        g.fillStyle = cor;
        g.beginPath(); g.moveTo(dx, base + 20);
        picos.forEach(([px, pw, ph, pf]) => {
            if (redonda) g.quadraticCurveTo(dx + px + pw / 2, base - ph * 1.6, dx + px + pw, base);
            else { g.lineTo(dx + px + pw * pf, base - ph); g.lineTo(dx + px + pw, base); }
        });
        g.lineTo(dx + W, base + 20); g.closePath(); g.fill();
        if (!luz || redonda) return;
        g.fillStyle = luz;
        picos.forEach(([px, pw, ph, pf]) => { g.beginPath(); g.moveTo(dx + px + pw * pf, base - ph); g.lineTo(dx + px + pw, base); g.lineTo(dx + px + pw * (pf + 0.12), base); g.closePath(); g.fill(); });
    });
}
function mapaNuvem(g, x, y, s, cor, sombra) {
    g.fillStyle = sombra; [[0, 3, 1.1], [-0.9, 4, 0.75], [0.95, 4, 0.8]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(x + dx * s * 16, y + dy, s * 12 * r, 0, Math.PI * 2); g.fill(); });
    g.fillStyle = cor; [[0, 0, 1.1], [-0.9, 2, 0.75], [0.95, 2, 0.8], [0.4, -3, 0.7]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(x + dx * s * 16, y + dy, s * 12 * r, 0, Math.PI * 2); g.fill(); });
}
function mapaEstrelas(g, W, ate, rnd, n) {
    for (let i = 0; i < n; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + rnd() * 0.7})`; g.fillRect(rnd() * W, rnd() * ate, rnd() < 0.15 ? 2 : 1.2, rnd() < 0.15 ? 2 : 1.2); }
}
function mapaPlaneta(g, W, x, y, r, cor, anel) {
    mapaNaVolta(W, x, r * 2, xx => {
        const gr = g.createRadialGradient(xx - r * 0.4, y - r * 0.4, r * 0.1, xx, y, r);
        gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.25, cor); gr.addColorStop(1, "#100820");
        g.fillStyle = gr; g.beginPath(); g.arc(xx, y, r, 0, Math.PI * 2); g.fill();
        if (anel) { g.strokeStyle = "rgba(255,255,255,0.3)"; g.lineWidth = 1.5; g.beginPath(); g.ellipse(xx, y, r * 1.7, r * 0.35, -0.3, 0, Math.PI * 2); g.stroke(); }
    });
}
function mapaMesaLonge(g, W, x, base, larg, alt, cor, topo) {
    mapaNaVolta(W, x, larg, xx => {
        g.fillStyle = cor;
        g.beginPath(); g.moveTo(xx - larg / 2, base); g.lineTo(xx - larg * 0.42, base - alt); g.lineTo(xx + larg * 0.42, base - alt); g.lineTo(xx + larg / 2, base); g.closePath(); g.fill();
        g.fillStyle = topo; g.fillRect(xx - larg * 0.42, base - alt, larg * 0.84, 2);
    });
}

function mapaDecorTerra(g, W, base, rnd) {
    for (let i = 0; i < 12; i++) { const x = rnd() * W, y = 18 + rnd() * 40, s = 0.7 + rnd() * 0.8; mapaNaVolta(W, x, 40 * s, xx => mapaNuvem(g, xx, y, s, "rgba(255,255,255,0.95)", "rgba(190,210,235,0.8)")); }
    mapaMontanhas(g, W, base, 34, "#8aa6d6", "#a8c0e6", rnd, 120, false);
    for (let i = 0; i < 7; i++) mapaMesaLonge(g, W, rnd() * W, base + 2, 24 + rnd() * 20, 18 + rnd() * 16, "#b0866a", "#7fa356");
}
function mapaDecorNamek(g, W, base, rnd) {
    for (let i = 0; i < 3; i++) { const x = 200 + i * 520 + rnd() * 100, y = 22 + rnd() * 18; mapaNaVolta(W, x, 20, xx => { g.fillStyle = "rgba(255,255,230,0.85)"; g.beginPath(); g.arc(xx, y, 9 + rnd() * 3, 0, Math.PI * 2); g.fill(); }); }
    for (let i = 0; i < 7; i++) { const x = rnd() * W, y = 20 + rnd() * 34, s = 0.6 + rnd() * 0.6; mapaNaVolta(W, x, 30 * s, xx => mapaNuvem(g, xx, y, s, "rgba(240,255,225,0.85)", "rgba(170,210,170,0.6)")); }
    mapaMontanhas(g, W, base, 26, "#6fa89e", null, rnd, 150, true);
    for (let i = 0; i < 14; i++) {
        const x = rnd() * W, alt = 18 + rnd() * 30;
        mapaNaVolta(W, x, 10, xx => {
            g.fillStyle = "#7fa898"; g.beginPath(); g.moveTo(xx - 5, base + 2); g.lineTo(xx - 2.5, base - alt); g.lineTo(xx + 2.5, base - alt); g.lineTo(xx + 5, base + 2); g.fill();
            g.fillStyle = "#3f8f5a"; g.beginPath(); g.arc(xx, base - alt - 3, 5, 0, Math.PI * 2); g.fill();
        });
    }
}
function mapaDecorEspaco(g, W, base, rnd) {
    mapaEstrelas(g, W, base, rnd, 320);
    mapaPlaneta(g, W, W * 0.12, 36, 18, "#c87a4a", true);
    mapaPlaneta(g, W, W * 0.48, 46, 28, "#4a7ac8", false);
    mapaPlaneta(g, W, W * 0.8, 26, 11, "#d8c06a", true);
    // nave (disco) ao longe
    const nx = W * 0.3;
    g.fillStyle = "#c8c0e0"; g.beginPath(); g.ellipse(nx, 70, 26, 7, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#e8e0ff"; g.beginPath(); g.ellipse(nx, 66, 15, 7, 0, Math.PI, 0); g.fill();
    g.fillStyle = "#ff6a8a"; for (let i = -2; i <= 2; i++) g.fillRect(nx + i * 8 - 1, 71, 2, 1.5);
    mapaMontanhas(g, W, base, 30, "#3a2050", "#5a3a78", rnd, 90, false);
}
function mapaDecorDeserto(g, W, base, rnd) {
    for (let i = 0; i < 9; i++) { const x = rnd() * W, y = 18 + rnd() * 36, s = 0.6 + rnd() * 0.7; mapaNaVolta(W, x, 40 * s, xx => mapaNuvem(g, xx, y, s, "rgba(255,255,255,0.95)", "rgba(190,205,225,0.6)")); }
    mapaMontanhas(g, W, base, 30, "#c8b090", "#dcc8a8", rnd, 130, false);
    for (let i = 0; i < 12; i++) {
        const x = rnd() * W, alt = 14 + rnd() * 26, larg = 5 + rnd() * 6;
        mapaNaVolta(W, x, larg, xx => {
            g.fillStyle = "#b8946e"; g.beginPath(); g.moveTo(xx - larg, base + 2); g.lineTo(xx - larg * 0.3, base - alt); g.lineTo(xx + larg * 0.2, base - alt * 0.96); g.lineTo(xx + larg, base + 2); g.fill();
        });
    }
    // ringue do Cell bem longe
    const rx = W * 0.55;
    g.fillStyle = "#f0ece4"; g.fillRect(rx - 26, base - 4, 52, 4);
    g.fillStyle = "#e0dad0"; [-22, 22].forEach(dx => g.fillRect(rx + dx - 1.5, base - 14, 3, 10));
}
function mapaDecorKaioshin(g, W, base, rnd) {
    mapaEstrelas(g, W, base * 0.6, rnd, 90);
    mapaPlaneta(g, W, W * 0.22, 40, 26, "#7ac8e8", false);
    mapaPlaneta(g, W, W * 0.7, 30, 16, "#e8a050", true);
    mapaMontanhas(g, W, base, 26, "#b48ad6", null, rnd, 140, true);
    for (let i = 0; i < 16; i++) {
        const x = rnd() * W, alt = 10 + rnd() * 16, larg = 3 + rnd() * 3;
        mapaNaVolta(W, x, larg, xx => { g.fillStyle = "rgba(190,240,255,0.9)"; g.beginPath(); g.moveTo(xx - larg, base + 2); g.lineTo(xx, base - alt); g.lineTo(xx + larg, base + 2); g.fill(); });
    }
}
function mapaDecorBills(g, W, base, rnd) {
    mapaEstrelas(g, W, base, rnd, 220);
    const cx = W * 0.5, cy = 40;
    for (let i = 0; i < 140; i++) { const a = i * 0.25, r = i * 0.6; g.fillStyle = `rgba(230,200,255,${0.6 - i / 280})`; g.fillRect(cx + Math.cos(a) * r * 1.8, cy + Math.sin(a) * r * 0.5, 1.5, 1.5); }
    for (let i = 0; i < 6; i++) {
        const x = rnd() * W, y = 30 + rnd() * 40, s = 8 + rnd() * 8;
        mapaNaVolta(W, x, s, xx => {
            g.fillStyle = "#6a4a3a"; g.beginPath(); g.moveTo(xx - s, y); g.lineTo(xx + s, y); g.lineTo(xx + s * 0.2, y + s * 1.3); g.closePath(); g.fill();
            g.fillStyle = "#4a9a5a"; g.beginPath(); g.ellipse(xx, y, s, s * 0.25, 0, 0, Math.PI * 2); g.fill();
        });
    }
    mapaMontanhas(g, W, base, 32, "#3a1a5a", "#5a2a7a", rnd, 100, false);
}

// ---------- objetos do chão (desenho guardado por tipo, base no meio de baixo) ----------
const MAPA_OBJ_W = 70, MAPA_OBJ_H = 90, MAPA_OBJ_BASE = 84;
const mapaObjCache = new Map();
function getMapaObjeto(tipo) {
    const k = typeof renderScale === "number" ? renderScale : 1;
    const chave = tipo + "|" + k;
    if (mapaObjCache.has(chave)) return mapaObjCache.get(chave);
    let c = null;
    if (typeof document !== "undefined" && document.createElement) {
        c = document.createElement("canvas");
        const esc = k * 1.4;   // um pouco maior: a fileira da frente aparece ampliada
        c.width = Math.ceil(MAPA_OBJ_W * esc); c.height = Math.ceil(MAPA_OBJ_H * esc);
        const g = c.getContext && c.getContext("2d");
        if (g && typeof g.scale === "function") {
            g.scale(esc, esc);
            // sombra no chão
            g.fillStyle = "rgba(0, 0, 0, 0.22)";
            g.beginPath(); g.ellipse(35, MAPA_OBJ_BASE, 22, 4.5, 0, 0, Math.PI * 2); g.fill();
            (MAPA_OBJ_DESENHO[tipo] || MAPA_OBJ_DESENHO.pedra)(g, 35, MAPA_OBJ_BASE);
        } else c = null;
    }
    mapaObjCache.set(chave, c);
    return c;
}
function mapaArvore(g, x, b, r, tronco, copa, luz, alt) {
    g.fillStyle = tronco; g.fillRect(x - r * 0.14, b - alt, r * 0.28, alt);
    g.fillStyle = copa; g.beginPath(); g.arc(x, b - alt - r * 0.6, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = luz; g.beginPath(); g.arc(x - r * 0.3, b - alt - r * 0.9, r * 0.45, 0, Math.PI * 2); g.fill();
}
const MAPA_OBJ_DESENHO = {
    arvore: (g, x, b) => { mapaArvore(g, x - 8, b, 13, "#6a4a2a", "#3f8f3f", "#6cc25a", 16); mapaArvore(g, x + 9, b, 10, "#6a4a2a", "#2f7f35", "#5cb24e", 12); },
    capsula: (g, x, b) => {
        g.fillStyle = "#e8e8f0"; g.fillRect(x - 22, b - 6, 44, 6);
        g.fillStyle = "#f8f8fc"; g.beginPath(); g.ellipse(x, b - 6, 20, 18, 0, Math.PI, 0); g.fill();
        g.fillStyle = "#d4d4e0"; g.beginPath(); g.ellipse(x + 6, b - 6, 12, 15, 0, Math.PI * 1.5, 0); g.fill();
        g.fillStyle = "#4fa6e8"; g.fillRect(x - 12, b - 15, 6, 4); g.fillRect(x + 4, b - 15, 6, 4);
        g.fillStyle = "#e85a3a"; g.font = "bold 6px sans-serif"; g.textAlign = "center"; g.fillText("CC", x, b - 2);
    },
    mesa: (g, x, b) => {
        g.fillStyle = "#b0714a"; g.beginPath(); g.moveTo(x - 20, b); g.lineTo(x - 15, b - 54); g.lineTo(x + 15, b - 54); g.lineTo(x + 20, b); g.closePath(); g.fill();
        g.fillStyle = "#8a5436"; g.beginPath(); g.moveTo(x + 4, b); g.lineTo(x + 6, b - 54); g.lineTo(x + 15, b - 54); g.lineTo(x + 20, b); g.closePath(); g.fill();
        g.fillStyle = "#7fa356"; g.beginPath(); g.ellipse(x, b - 54, 15, 3, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "rgba(0,0,0,0.18)"; g.lineWidth = 1; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x - 19 + k, b - k * 13); g.lineTo(x + 19 - k, b - k * 13); g.stroke(); }
    },
    pedra: (g, x, b) => mapaPedra(g, x, b, 14, "#8a8a7a", "#b4b4a2"),
    namek_arvore: (g, x, b) => {
        g.strokeStyle = "#7b8b4a"; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(x, b); g.quadraticCurveTo(x - 4, b - 30, x + 2, b - 56); g.stroke();
        g.fillStyle = "#2f8a4a"; g.beginPath(); g.arc(x + 2, b - 62, 11, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#7ad06a"; g.beginPath(); g.arc(x - 2, b - 66, 5, 0, Math.PI * 2); g.fill();
    },
    namek_casa: (g, x, b) => {
        g.fillStyle = "#e8f0e0"; g.beginPath(); g.ellipse(x, b - 4, 18, 24, 0, Math.PI, 0); g.fill(); g.fillRect(x - 18, b - 4, 36, 4);
        g.fillStyle = "#c8d6c0"; g.beginPath(); g.ellipse(x + 6, b - 4, 10, 20, 0, Math.PI * 1.5, 0); g.fill();
        g.fillStyle = "#3a5a4a"; [[-7, -14], [6, -10], [-1, -22]].forEach(([dx, dy]) => { g.beginPath(); g.arc(x + dx, b + dy, 3, 0, Math.PI * 2); g.fill(); });
    },
    espigao: (g, x, b) => {
        g.fillStyle = "#8ab09a"; g.beginPath(); g.moveTo(x - 10, b); g.lineTo(x - 5, b - 60); g.lineTo(x + 5, b - 60); g.lineTo(x + 10, b); g.fill();
        g.fillStyle = "#6a9080"; g.beginPath(); g.moveTo(x + 2, b); g.lineTo(x + 3, b - 60); g.lineTo(x + 5, b - 60); g.lineTo(x + 10, b); g.fill();
        g.fillStyle = "#2f8a4a"; g.beginPath(); g.arc(x, b - 66, 9, 0, Math.PI * 2); g.fill();
    },
    pedra_azul: (g, x, b) => mapaPedra(g, x, b, 13, "#6a9aa8", "#9ac8d4"),
    cratera: (g, x, b) => {
        g.fillStyle = "rgba(20,8,30,0.6)"; g.beginPath(); g.ellipse(x, b - 3, 24, 7, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "rgba(190,150,220,0.7)"; g.lineWidth = 2; g.beginPath(); g.ellipse(x, b - 4, 24, 7, 0, Math.PI, 0); g.stroke();
    },
    rocha_roxa: (g, x, b) => mapaPedra(g, x, b, 16, "#5a3a78", "#8a6aa8"),
    cristal_roxo: (g, x, b) => {
        [[-8, 26, 6], [3, 40, 8], [12, 22, 5]].forEach(([dx, alt, l]) => {
            g.fillStyle = "#b07ae0"; g.beginPath(); g.moveTo(x + dx - l, b); g.lineTo(x + dx, b - alt); g.lineTo(x + dx + l, b); g.fill();
            g.fillStyle = "rgba(255,255,255,0.5)"; g.beginPath(); g.moveTo(x + dx - l * 0.2, b); g.lineTo(x + dx, b - alt); g.lineTo(x + dx + l * 0.3, b); g.fill();
        });
    },
    nave_saiyajin: (g, x, b) => {
        g.fillStyle = "rgba(20,8,30,0.55)"; g.beginPath(); g.ellipse(x, b - 2, 26, 6, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#e8e8f0"; g.beginPath(); g.arc(x, b - 14, 14, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#b8b8c8"; g.beginPath(); g.arc(x + 4, b - 12, 10, -0.5, 1.8); g.fill();
        g.fillStyle = "#c83a4a"; g.beginPath(); g.ellipse(x - 2, b - 17, 6, 5, 0, 0, Math.PI * 2); g.fill();
    },
    agulha: (g, x, b) => {
        g.fillStyle = "#b08a64"; g.beginPath(); g.moveTo(x - 13, b); g.lineTo(x - 4, b - 70); g.lineTo(x + 3, b - 67); g.lineTo(x + 13, b); g.fill();
        g.fillStyle = "#8a6848"; g.beginPath(); g.moveTo(x, b); g.lineTo(x + 3, b - 67); g.lineTo(x + 13, b); g.fill();
    },
    pedra_areia: (g, x, b) => mapaPedra(g, x, b, 15, "#c4a072", "#e0c49a"),
    mesa_areia: (g, x, b) => {
        g.fillStyle = "#c8a070"; g.beginPath(); g.moveTo(x - 24, b); g.lineTo(x - 18, b - 36); g.lineTo(x + 18, b - 36); g.lineTo(x + 24, b); g.closePath(); g.fill();
        g.fillStyle = "#a07c52"; g.beginPath(); g.moveTo(x + 6, b); g.lineTo(x + 8, b - 36); g.lineTo(x + 18, b - 36); g.lineTo(x + 24, b); g.closePath(); g.fill();
    },
    arvore_rosa: (g, x, b) => { mapaArvore(g, x - 6, b, 13, "#7a5a8a", "#f0a0c8", "#ffd0e8", 18); mapaArvore(g, x + 10, b, 9, "#7a5a8a", "#e88ab8", "#ffd0e8", 12); },
    cristal: (g, x, b) => {
        [[-6, 30, 6], [5, 44, 7]].forEach(([dx, alt, l]) => {
            g.fillStyle = "rgba(170,236,255,0.95)"; g.beginPath(); g.moveTo(x + dx - l, b); g.lineTo(x + dx, b - alt); g.lineTo(x + dx + l, b); g.fill();
            g.fillStyle = "rgba(255,255,255,0.7)"; g.beginPath(); g.moveTo(x + dx - l * 0.2, b); g.lineTo(x + dx, b - alt); g.lineTo(x + dx + l * 0.25, b); g.fill();
        });
    },
    arbusto: (g, x, b) => { [[-10, 10], [8, 9], [0, 12]].forEach(([dx, r], i) => { g.fillStyle = i === 2 ? "#5ab06a" : "#3f8a52"; g.beginPath(); g.arc(x + dx, b - r * 0.8, r, 0, Math.PI * 2); g.fill(); }); },
    piramide: (g, x, b) => {
        g.fillStyle = "#c8a060"; g.beginPath(); g.moveTo(x - 26, b); g.lineTo(x, b - 34); g.lineTo(x + 26, b); g.fill();
        g.fillStyle = "#9a7440"; g.beginPath(); g.moveTo(x, b - 34); g.lineTo(x + 26, b); g.lineTo(x + 6, b); g.fill();
    },
    arvore_bills: (g, x, b) => {
        g.strokeStyle = "#5a3a5a"; g.lineWidth = 3; g.beginPath(); g.moveTo(x, b); g.lineTo(x, b - 40); g.stroke();
        [[-12, -46, 10, "#e8c040"], [10, -50, 9, "#d07ad8"], [0, -60, 11, "#7ad0c8"]].forEach(([dx, dy, r, cor]) => { g.fillStyle = cor; g.beginPath(); g.arc(x + dx, b + dy, r, 0, Math.PI * 2); g.fill(); });
    },
    rocha_flutuante: (g, x, b) => {
        g.fillStyle = "#6a4a3a"; g.beginPath(); g.moveTo(x - 16, b - 44); g.lineTo(x + 16, b - 44); g.lineTo(x + 3, b - 18); g.closePath(); g.fill();
        g.fillStyle = "#4a9a5a"; g.beginPath(); g.ellipse(x, b - 44, 16, 4, 0, 0, Math.PI * 2); g.fill();
    },
    pilar: (g, x, b) => {
        g.fillStyle = "#8a6aa8"; g.fillRect(x - 6, b - 56, 12, 56);
        g.fillStyle = "#6a4a88"; g.fillRect(x + 1, b - 56, 5, 56);
        g.fillStyle = "#c8a0e0"; g.fillRect(x - 9, b - 60, 18, 5);
    }
};
function mapaPedra(g, x, b, r, cor, luz) {
    g.fillStyle = cor; g.beginPath(); g.ellipse(x, b - r * 0.5, r, r * 0.75, 0, Math.PI, 0); g.lineTo(x + r, b); g.lineTo(x - r, b); g.closePath(); g.fill();
    g.fillStyle = luz; g.beginPath(); g.ellipse(x - r * 0.3, b - r * 0.85, r * 0.45, r * 0.3, -0.2, 0, Math.PI * 2); g.fill();
}

// Fileiras de objetos, de longe para perto: y (faixa na tela), paralaxe, tamanho, espaçamento e quantos aparecem
const MAPA_FILEIRAS = [
    { y0: MAPA_HY + 6, y1: MAPA_HY + 16, vel: 0.55, esc: 0.38, passo: 64, dens: 0.75, alfa: 0.8 },
    { y0: MAPA_HY + 20, y1: MAPA_HY + 38, vel: 0.72, esc: 0.55, passo: 80, dens: 0.6, alfa: 0.92 },
    { y0: 288, y1: 318, vel: 1.12, esc: 0.95, passo: 118, dens: 0.55, alfa: 1 },
    { y0: 338, y1: 356, vel: 1.32, esc: 1.3, passo: 150, dens: 0.5, alfa: 1 }
];
function drawMapaObjetos(rolagem) {
    MAPA_FILEIRAS.forEach((f, fi) => {
        const desloc = rolagem * f.vel;
        const n0 = Math.floor((desloc - 120) / f.passo), n1 = Math.ceil((desloc + 920) / f.passo);
        ctx.globalAlpha = f.alfa;
        for (let n = n0; n <= n1; n++) {
            const semente = n * 7 + fi * 1013;
            if (c3Hash(semente) > f.dens) continue;
            const x = n * f.passo + c3Hash(semente + 1) * f.passo * 0.6 - desloc;
            if (x < -80 || x > 880) continue;
            const m = getMapaMistura(x + rolagem);
            const amb = mapaAmbiente(c3Hash(semente + 2) < m.w ? m.b : m.a);
            const tipo = amb.objetos[Math.floor(c3Hash(semente + 3) * amb.objetos.length) % amb.objetos.length];
            const img = getMapaObjeto(tipo);
            if (!img) continue;
            const y = f.y0 + c3Hash(semente + 4) * (f.y1 - f.y0);
            const s = f.esc * (0.85 + c3Hash(semente + 5) * 0.3);
            ctx.drawImage(img, x - 35 * s, y - MAPA_OBJ_BASE * s, MAPA_OBJ_W * s, MAPA_OBJ_H * s);
        }
    });
    ctx.globalAlpha = 1;
}

// Paisagem do horizonte dos ambientes visíveis. Na divisa, cada uma passa por uma máscara em degradê com o
// peso dela ao longo da tela (numa camada de apoio reaproveitada), então a troca é suave, sem faixas.
let mapaCamadaApoio = null;
function drawMapaHorizonte(rolagem) {
    const desloc = ((rolagem * MAPA_DECOR_VEL) % MAPA_DECOR_W + MAPA_DECOR_W) % MAPA_DECOR_W, H = MAPA_HY + 16;
    const passo = 40, pesos = [];
    for (let x = 0; x <= 800; x += passo) pesos.push(getMapaMistura(rolagem + x));
    const usados = new Set();
    pesos.forEach(m => { usados.add(Math.min(m.a, MAPA_AMBIENTES.length - 1)); if (m.w > 0) usados.add(Math.min(m.b, MAPA_AMBIENTES.length - 1)); });
    // copia só o pedaço que aparece (a faixa tem 1600 de largura; a tela, 800), em até 2 partes na emenda
    const desenhar = (g, img) => {
        const k = img.__k || 1, larg1 = Math.min(800, MAPA_DECOR_W - desloc);
        g.drawImage(img, desloc * k, 0, larg1 * k, img.height, 0, 0, larg1, H);
        if (larg1 < 800) g.drawImage(img, 0, 0, (800 - larg1) * k, img.height, larg1, 0, 800 - larg1, H);
    };
    usados.forEach(t => {
        const img = getMapaDecor(MAPA_AMBIENTES[t]);
        if (!img) return;
        const ws = pesos.map(m => pesoAmbiente(m, t));
        if (ws.every(w => w >= 0.999)) { desenhar(ctx, img); return; }   // só ele na tela
        // onde o peso é 1: copia direto (recortado); onde está entre 0 e 1: passa pela máscara, só nesse trecho
        let cheio0 = null, misto0 = null, misto1 = null;
        const cheios = [];
        ws.forEach((w, i) => {
            const x = i * passo;
            if (w >= 0.999) { if (cheio0 === null) cheio0 = x; }
            else { if (cheio0 !== null) { cheios.push([cheio0, x]); cheio0 = null; } }
            if (w > 0.001 && w < 0.999) { if (misto0 === null) misto0 = Math.max(0, x - passo); misto1 = Math.min(800, x + passo); }
        });
        if (cheio0 !== null) cheios.push([cheio0, 800]);
        cheios.forEach(([x0, x1]) => {
            if (misto0 !== null) { if (x0 < misto1 && x1 > misto0) { if (x0 >= misto0) x0 = misto1; else x1 = misto0; } }
            if (x1 <= x0) return;
            ctx.save(); ctx.beginPath(); ctx.rect(x0, 0, x1 - x0, H); ctx.clip(); desenhar(ctx, img); ctx.restore();
        });
        if (misto0 === null) return;
        // camada de apoio em resolução 1x (só durante a troca de ambiente; fica um pouco mais suave, ninguém nota)
        if (!mapaCamadaApoio && typeof document !== "undefined" && document.createElement) {
            mapaCamadaApoio = document.createElement("canvas");
            mapaCamadaApoio.width = 800; mapaCamadaApoio.height = H;
        }
        const g = mapaCamadaApoio && mapaCamadaApoio.getContext && mapaCamadaApoio.getContext("2d");
        if (!g || typeof g.createLinearGradient !== "function") return;
        const larg = misto1 - misto0;
        g.globalCompositeOperation = "source-over";
        g.clearRect(0, 0, larg, H);
        g.save(); g.translate(-misto0, 0); desenhar(g, img); g.restore();
        const gr = g.createLinearGradient(0, 0, larg, 0);
        ws.forEach((w, i) => { const x = i * passo - misto0; if (x >= 0 && x <= larg) gr.addColorStop(x / larg, `rgba(0,0,0,${Math.max(0, Math.min(1, w)).toFixed(3)})`); });
        g.globalCompositeOperation = "destination-in";
        g.fillStyle = gr;
        g.fillRect(0, 0, larg, H);
        g.globalCompositeOperation = "source-over";
        ctx.drawImage(mapaCamadaApoio, 0, 0, larg, H, misto0, 0, larg, H);
    });
}
// peso do ambiente t (trechos além da lista contam como o último)
function pesoAmbiente(m, t) {
    const ult = MAPA_AMBIENTES.length - 1;
    return (Math.min(m.a, ult) === t ? 1 - m.w : 0) + (Math.min(m.b, ult) === t ? m.w : 0);
}

// Fundo do mapa na rolagem atual: cores, paisagem do horizonte e os objetos do chão
function drawMapaFundo(rolagem) {
    const paleta = getMapaPaleta();
    ctx.save();
    if (paleta) {
        ctx.imageSmoothingEnabled = true;   // a faixa de cores é pequena e esticada: suave, sem degraus
        ctx.drawImage(paleta, rolagem / MAPA_PALETA_PASSO, 0, 800 / MAPA_PALETA_PASSO, 350, 0, 0, 800, 350);
    } else {
        ctx.fillStyle = "#0a1024";
        ctx.fillRect(0, 0, 800, 350);
    }
    ctx.restore();
    drawMapaHorizonte(rolagem);
    drawMapaObjetos(rolagem);
}

// Estrada ligando as fases, deitada no chão em perspectiva: mais larga perto (embaixo) e achatada na
// vertical. acesaAte = índice (em `pontos`) da última fase liberada: a estrada até ela é dourada.
function mapaLarguraEstrada(y) { return 7 + Math.max(0, y - MAPA_HY) * 0.06; }
function drawMapaEstrada(pontos, acesaAte) {
    if (pontos.length < 2) return;
    // amostra as curvas (mesma curva de antes: bezier entre as fases)
    const amostras = [];   // { x, y, i } (i = índice da fase anterior)
    for (let i = 1; i < pontos.length; i++) {
        const a = pontos[i - 1], b = pontos[i], mx = (a.x + b.x) / 2;
        for (let k = i === 1 ? 0 : 1; k <= 10; k++) {
            const t = k / 10, u = 1 - t;
            amostras.push({
                x: u * u * u * a.x + 3 * u * u * t * mx + 3 * u * t * t * mx + t * t * t * b.x,
                y: u * u * u * a.y + 3 * u * u * t * a.y + 3 * u * t * t * b.y + t * t * t * b.y,
                i: i - 1 + t
            });
        }
    }
    const fita = (lista, extra) => {
        const esq = [], dir = [];
        lista.forEach((p, k) => {
            const q0 = lista[Math.max(0, k - 1)], q1 = lista[Math.min(lista.length - 1, k + 1)];
            let tx = q1.x - q0.x, ty = q1.y - q0.y;
            const len = Math.hypot(tx, ty) || 1; tx /= len; ty /= len;
            const w = (mapaLarguraEstrada(p.y) + extra) / 2;
            // normal do chão: achatada na vertical (o chão está deitado)
            const nx = -ty * w, ny = tx * w * 0.55;
            esq.push([p.x + nx, p.y + ny]); dir.push([p.x - nx, p.y - ny]);
        });
        ctx.beginPath();
        esq.forEach((p, k) => k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
        for (let k = dir.length - 1; k >= 0; k--) ctx.lineTo(dir[k][0], dir[k][1]);
        ctx.closePath();
    };
    ctx.save();
    fita(amostras.map(p => ({ x: p.x + 2, y: p.y + 3 })), 6); ctx.fillStyle = "rgba(20, 14, 10, 0.3)"; ctx.fill();   // sombra
    fita(amostras, 5); ctx.fillStyle = "#5a4a3a"; ctx.fill();                                                    // meio-fio
    fita(amostras, 0); ctx.fillStyle = "#9a8a72"; ctx.fill();
    const acesa = amostras.filter(p => p.i <= acesaAte);
    if (acesa.length > 1) { fita(acesa, 0); ctx.fillStyle = "#e8c070"; ctx.fill(); fita(acesa, -mapaLarguraEstrada(200) * 0.55); ctx.fillStyle = "#f6dc96"; ctx.fill(); }
    // faixa do meio tracejada
    ctx.beginPath();
    amostras.forEach((p, k) => k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.setLineDash([6, 8]); ctx.strokeStyle = "rgba(255, 245, 210, 0.6)"; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();
}

// Sombra no chão embaixo do círculo de uma fase (dá a sensação de que ele flutua sobre a estrada)
function drawMapaSombraFase(x, y, r) {
    ctx.fillStyle = "rgba(10, 8, 20, 0.32)";
    ctx.beginPath(); ctx.ellipse(x + 3, y + r * 0.82, r * 1.02, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
}

// Placa de madeira acima da primeira fase futura (cx, base = ponto onde o poste encosta no círculo)
function drawMapaPlaca(cx, base) {
    const w = 168, h = 34, y = base - 14 - h;
    ctx.save();
    ctx.fillStyle = "#5a3a1e";
    ctx.fillRect(cx - 3, y + h - 2, 6, base - (y + h) + 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(cx - w / 2 + 3, y + 3, w, h);
    ctx.fillStyle = "#8a5a2c";
    ctx.fillRect(cx - w / 2, y, w, h);
    ctx.fillStyle = "#a06a34";
    ctx.fillRect(cx - w / 2, y, w, 4);
    ctx.strokeStyle = "#3a2410";
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - w / 2, y, w, h);
    ctx.fillStyle = "#3a2410";
    [[-w / 2 + 5, 5], [w / 2 - 5, 5], [-w / 2 + 5, h - 5], [w / 2 - 5, h - 5]].forEach(([dx, dy]) => ctx.fillRect(cx + dx - 1, y + dy - 1, 2, 2));
    ctx.textAlign = "center";
    ctx.font = "bold 10px monospace";
    ctx.fillStyle = "#ffe08a";
    ctx.fillText(traduzir("ADVERSÁRIOS MAIS FORTES VIRÃO!"), cx, y + 15, w - 12);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px monospace";
    ctx.fillText(traduzir("PREPARE-SE"), cx, y + 28, w - 12);
    ctx.restore();
}

function drawPadlock(cx, cy, size, open = 0) {
    const bodyW = size * 1.5, bodyH = size * 1.15, r = size * 0.22;
    const bodyX = cx - bodyW / 2, bodyY = cy - bodyH / 2 + size * 0.3;
    ctx.save();
    // arco (sobe e abre pro lado quando destrava)
    ctx.save();
    ctx.translate(cx + size * 0.45, bodyY - open * size * 0.45);
    ctx.rotate(-open * 0.9);
    ctx.strokeStyle = "#b9c2cf";
    ctx.lineWidth = size * 0.28;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-size * 0.9, size * 0.05);
    ctx.lineTo(-size * 0.9, -size * 0.35);
    ctx.arc(-size * 0.45, -size * 0.35, size * 0.45, Math.PI, 0);
    ctx.lineTo(0, size * 0.05);
    ctx.stroke();
    ctx.restore();
    // corpo
    ctx.fillStyle = "#e8b93a";
    ctx.strokeStyle = "#6b4a10";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bodyX + r, bodyY);
    ctx.arcTo(bodyX + bodyW, bodyY, bodyX + bodyW, bodyY + bodyH, r);
    ctx.arcTo(bodyX + bodyW, bodyY + bodyH, bodyX, bodyY + bodyH, r);
    ctx.arcTo(bodyX, bodyY + bodyH, bodyX, bodyY, r);
    ctx.arcTo(bodyX, bodyY, bodyX + bodyW, bodyY, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";   // brilho
    ctx.fillRect(bodyX + size * 0.2, bodyY + size * 0.15, size * 0.18, bodyH - size * 0.3);
    // fechadura
    ctx.fillStyle = "#3a2a10";
    ctx.beginPath();
    ctx.arc(cx, bodyY + bodyH * 0.42, size * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - size * 0.07, bodyY + bodyH * 0.42, size * 0.14, bodyH * 0.35);
    ctx.restore();
}

function drawStageThumbCircle(cx, cy, r, img, g = ctx) {
    const s = (r * 2) / img.height, w = img.width * s;
    g.save();
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.clip();
    g.drawImage(img, cx - w / 2, cy - r, w, r * 2);
    g.restore();
}

  // ---- arenas.js (desenho das arenas criadas) ----
  const BGM_THEMES = new Proxy({}, { get: (_o, k) => (temasDoJogo ? temasDoJogo.has(k) : typeof k === 'string') });
  const arqErro = (msg, detalhe) => (detalhe === undefined ? msg : msg + ' [' + detalhe + ']');
  // planta (vista de cima) do editor novo: escala e centro definidos por quem desenha
  let plantaEscala = 1, plantaCentro = { x: 0, z: 0 }, plantaLado = 320;
  const arenaMundoParaPlanta = (x, z) => [plantaLado / 2 + (x - plantaCentro.x) * plantaEscala, plantaLado / 2 + (z - plantaCentro.z) * plantaEscala];
  const readJsonStorage = (_k, padrao) => padrao;
  const writeStorage = () => false;
  const normalizadas = new WeakMap();
  function getFaseDef(id) {
    const bruta = arenasDoJogador.get(id);
    if (!bruta) return null;
    let a = normalizadas.get(bruta);
    if (!a) { a = normalizarArena(bruta); normalizadas.set(bruta, a); }
    return { id, arena: a, criada: true, camera: { tipo: a.movimento === 'seguir' ? 'anda' : 'orbita', volta: 10800 } };
  }
// arenas.js — EDITOR DE ARENAS (v0.92): arenas montadas pelo jogador com peças separadas dos cenários do jogo
// (construções, nave, natureza, chão, céu e enfeites). Cada arena criada vira uma fase de verdade: entra no
// FASES_PADRAO (cenario "criada", sempre liberada), aparece em ARENAS, no mapa, no ranking e na luta, com a
// câmera dando a volta no centro como as fases 3D (cache drawCachedOrbitLayer + céu de 360°).
// Dados: localStorage "saiyan_arenas" (só números e textos — pequeno). Arquivo .arena.json para exportar/anexar
// (formatos/LEIA-ME-ARENAS.md). Carrega depois de mapa.js (usa as funções de desenho de cenarios3d.js e menu.js).

const ARENA_MAX = 7;            // arenas criadas (cabem na tela ARENAS e nas abas do ranking)
const ARENA_PECAS_MAX = 80;     // peças por arena (desempenho no celular)
const ARENA_RAIO = 420;         // a planta vai de -ARENA_RAIO a +ARENA_RAIO (o centro é onde a luta acontece)
const ARENA_FORMATO = "saiyan-fight-arena";
const ARENA_CAMERAS = {
    baixa: { CX: 400, HY: 118, D: 700, H: 110, F: 600, PERTO: 30, CORTE: 220 },
    media: { CX: 400, HY: 78, D: 720, H: 180, F: 580, PERTO: 30, CORTE: 190 },
    alta: { CX: 400, HY: 42, D: 700, H: 250, F: 560, PERTO: 30, CORTE: 160 }
};
const ARENA_CHAOS = {
    grama: { nome: "GRAMA", cor: "#6fbf4a" }, areia: { nome: "AREIA", cor: "#e3c98a" }, mar: { nome: "MAR", cor: "#2f86c9" },
    ladrilho: { nome: "PISO DE LADRILHOS", cor: "#cfd6df" }, terra: { nome: "TERRA", cor: "#a0703f" }, nuvens: { nome: "NUVENS", cor: "#e8f1fb" },
    espaco: { nome: "ESPAÇO", cor: "#1b1638" }, lava: { nome: "LAVA", cor: "#7a1d0c" }, neve: { nome: "NEVE", cor: "#eef4fb" }
};
const ARENA_ABAS = [["construcao", "CONSTRUÇÃO"], ["nave", "NAVE"], ["natureza", "NATUREZA"], ["chao", "CHÃO"], ["pincel", "PINCEL"], ["planicies", "PLANÍCIES"], ["ceu", "CÉU"], ["efeitos", "EFEITOS"], ["enfeites", "ENFEITES"], ["conjuntos", "CONJUNTOS"], ["lista", "NA ARENA"]];
const ARENA_ANIMADAS_MAX = 10;   // peças que se mexem (desenhadas a cada quadro)
const ARENA_DESFAZER_MAX = 50;   // passos guardados no ↶ DESFAZER do editor
const ARENA_GRADE = 20;          // GRADE ligada: posições de 20 em 20 e giro de 15 em 15 graus
const ARENA_TESTE_ID = "arena_teste";   // fase temporária do TESTAR (só existe durante a luta de teste)
let arenaTeste = null;           // { ed, arena, antes } enquanto a luta de teste do editor acontece
// EMPILHAR: construções soltas em cima destas peças encaixam alinhadas no topo (altura do topo, sem o tamanho)
const ARENA_SUPORTES = { bloco: 30, pilar: 68, predio: 72.2, ringue: 10 };
// altura aproximada de cada peça (espaço em pé, câmera perto, toque na tela grande); as outras: 40
const AR_ALTURAS = { bloco: 30, pilar: 68, predio: 72, ringue: 10, parede: 36, parede_janelas: 40, parede_porta: 40, escada: 24, portao: 63,
    coluna_lava: 260, arco_lava: 190, torre: 100, torre_mirante: 90, montanha: 140, mesa_pedra: 90, fumaca: 160, antena: 70, coqueiro: 80, brasas: 110 };
function arenaAlturaPeca(p) { return (AR_ALTURAS[p.t] || 40) * (p.e || 1); }
const ARENA_CONJUNTOS_MAX = 20;  // conjuntos de peças guardados (aba CONJUNTOS)
// hora do dia e clima da arena (DADOS DA ARENA)
const ARENA_HORAS = [["dia", "DIA"], ["tarde", "TARDE"], ["noite", "NOITE"]];
const ARENA_CLIMAS = [["nenhum", "SEM CLIMA"], ["chuva", "CHUVA"], ["neve", "NEVE"], ["neblina", "NEBLINA"], ["vento", "VENTO COM FOLHAS"], ["lava", "LAVA"]];
// PINCEL DE CHÃO: cada pincelada é 1 peça (até ARENA_PINCEL_PONTOS pontos)
const ARENA_PINCEL = { grama: ["GRAMA", "#6fc04e"], areia: ["AREIA", "#e8d39a"], lava: ["LAVA", "#ff5a1f"], agua: ["ÁGUA", "#4aa3df"], terra: ["TERRA", "#9c6b3f"], neve: ["NEVE", "#eef4fb"] };
const ARENA_PINCEL_PONTOS = 60;
// formatos das peças do chão (gramado, lago, lava...): o mesmo contorno serve de piso ou, com ALTURA, de monte
const ARENA_FORMATOS = [["circulo", "CÍRCULO"], ["oval", "OVAL"], ["feijao", "FEIJÃO"], ["irregular", "IRREGULAR"], ["rio", "RIO RETO"], ["rio_curvo", "RIO EM CURVA"]];

// ---------------- ajudantes de peça (coordenadas locais da peça -> mundo) ----------------
function arEsc(p) { return p.e || 1; }
function arGiro(p) { const a = (p.r || 0) * Math.PI / 180; return [Math.cos(a), Math.sin(a)]; }
function arPt(p, lx, y, lz) {
    const [c, s] = arGiro(p), e = arEsc(p);
    return [p.x + (lx * c - lz * s) * e, y * e, p.z + (lx * s + lz * c) * e];
}
function arNormal(p, nx, ny, nz) { const [c, s] = arGiro(p); return [nx * c - nz * s, ny, nx * s + nz * c]; }
function arProj(p, lx, y, lz, ang) { const w = arPt(p, lx, y, lz); return trProj(w[0], w[1], w[2], ang); }
// clareia (q > 0) ou escurece (q < 0) uma cor #rrggbb e devolve #rrggbb (dá para misturar de novo)
function arMix(cor, q) {
    const n = parseInt(String(cor).slice(1), 16);
    if (!/^#[0-9a-f]{6}$/i.test(cor)) return cor;
    const f = (v) => Math.round(q >= 0 ? v + (255 - v) * q : v * (1 + q));
    return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => f(v).toString(16).padStart(2, "0")).join("");
}
// luz do sol fixa no mundo: faces viradas para ela mais claras
const AR_SOL = (() => { const v = [-0.45, 0.6, 0.66], n = Math.hypot(...v); return v.map(c => c / n); })();
function arTom(cor, normal) {
    const l = normal[0] * AR_SOL[0] + normal[1] * AR_SOL[1] + normal[2] * AR_SOL[2];
    return arMix(cor, Math.max(-0.35, Math.min(0.25, (l - 0.3) * 0.5)));
}
function arFace(p, pts, n, cor, ang, contorno) {
    const nw = arNormal(p, n[0], n[1], n[2]);
    return c3Face(pts.map(q => arPt(p, q[0], q[1], q[2])), nw, arTom(cor, nw), ang, contorno);
}
// caixa local [x0,x1] x [y0,y1] x [z0,z1]; devolve as faces visíveis por nome (frente +z, tras -z, dir +x, esq -x, topo)
function arCaixa(p, x0, x1, y0, y1, z0, z1, cor, ang, corTopo, contorno) {
    const t = contorno === undefined ? "rgba(40, 50, 70, 0.35)" : contorno, v = {};
    v.tras = arFace(p, [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1], cor, ang, t);
    v.esq = arFace(p, [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0], cor, ang, t);
    v.dir = arFace(p, [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0], cor, ang, t);
    v.frente = arFace(p, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], cor, ang, t);
    v.topo = arFace(p, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], [0, 1, 0], corTopo || cor, ang, t);
    return v;
}
// polígono num plano local (pontos [lx, y, lz])
function arPoli(p, pts, cor, ang) {
    trPoly(pts.map(q => arProj(p, q[0], q[1], q[2], ang)));
    trG.fillStyle = cor; trG.fill();
}
// retângulo numa face vertical: face "frente"/"tras" (plano z) ou "dir"/"esq" (plano x), de a0..a1 na largura e b0..b1 de altura
function arRetFace(p, face, plano, a0, a1, b0, b1, cor, ang) {
    const q = (a, b) => face === "frente" ? [a, b, plano] : face === "tras" ? [-a, b, plano] : face === "dir" ? [plano, b, -a] : [plano, b, a];
    arPoli(p, [q(a0, b0), q(a1, b0), q(a1, b1), q(a0, b1)], cor, ang);
}
function arOvalFace(p, face, plano, ca, cb, ra, rb, cor, ang) {
    const pts = [];
    for (let i = 0; i < 14; i++) {
        const t = i / 14 * Math.PI * 2, a = ca + Math.cos(t) * ra, b = cb + Math.sin(t) * rb;
        pts.push(face === "frente" ? [a, b, plano] : face === "tras" ? [-a, b, plano] : face === "dir" ? [plano, b, -a] : [plano, b, a]);
    }
    arPoli(p, pts, cor, ang);
}
// grade de janelas numa face (largura -L..L, altura h0..h1)
function arJanelasFace(p, face, plano, L, h0, h1, cols, linhas, ang) {
    const cw = L * 2 / cols, rh = (h1 - h0) / linhas;
    for (let r = 0; r < linhas; r++) for (let c = 0; c < cols; c++) {
        const a0 = -L + c * cw + cw * 0.2, a1 = a0 + cw * 0.6, b0 = h0 + r * rh + rh * 0.2, b1 = b0 + rh * 0.6;
        arRetFace(p, face, plano, a0, a1, b0, b1, "#3a6cbf", ang);
        arRetFace(p, face, plano, a0, a1, b1 - (b1 - b0) * 0.35, b1, "#8db3ea", ang);
    }
}
// disco no chão (raio r) e retângulo no chão
function arDisco(p, r, cor, ang, y) {
    const pts = [];
    for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2; pts.push([Math.cos(a) * r * (1 + 0.05 * Math.sin(a * 3 + p.x)), y || 0.5, Math.sin(a) * r]); }
    arPoli(p, pts, cor, ang);
}
function arRetChao(p, w, d, cor, ang, y) { arPoli(p, [[-w, y || 0.5, -d], [w, y || 0.5, -d], [w, y || 0.5, d], [-w, y || 0.5, d]], cor, ang); }
function arLinhaChao(p, a, b, cor, larg, ang) {
    const A = arProj(p, a[0], a[1], a[2], ang), B = arProj(p, b[0], b[1], b[2], ang);
    trG.strokeStyle = cor; trG.lineWidth = Math.max(0.6, larg * A[3]);
    trG.beginPath(); trG.moveTo(A[0], A[1]); trG.lineTo(B[0], B[1]); trG.stroke();
}
// semente fixa de cada peça (a mesma mesmo quando a vista anda ou centra nela)
function arSemente(p) { return p._s !== undefined ? p._s : (p.x || 0) * 0.01 + (p.z || 0) * 0.02; }
// relógio dos efeitos: o da luta durante a partida; nos menus e no editor, o relógio do navegador
function arRelogio() { return typeof gameState !== "undefined" && gameState === "playing" && typeof gameplayClock === "number" ? gameplayClock : performance.now() / 1000; }
// contorno (pontos locais [x, z]) de um formato com raio R; s = semente para o irregular
function arFormaPontos(f, R, s) {
    const pts = [];
    if (f === "rio" || f === "rio_curvo") {
        // faixa comprida com margens onduladas (reta ou em arco)
        const N = 16, L = R * 2.6, W = R * 0.42, curva = f === "rio_curvo";
        const centro = (u) => curva ? [Math.sin(u * 1.1) * R * 1.9, (1 - Math.cos(u * 1.1)) * R * 1.9 - R * 0.6] : [u * L / 2, 0];
        const lado = (u, sinal) => {
            const [cx, cz] = centro(u), e = 0.01, [ax, az] = centro(u + e), dx = ax - cx, dz = az - cz, m = Math.hypot(dx, dz) || 1;
            const w = W * (1 + 0.18 * Math.sin(u * 7 + s) * sinal);
            return [cx - dz / m * w * sinal, cz + dx / m * w * sinal];
        };
        for (let i = 0; i <= N; i++) pts.push(lado(-1 + 2 * i / N, 1));
        for (let i = N; i >= 0; i--) pts.push(lado(-1 + 2 * i / N, -1));
        return pts;
    }
    for (let i = 0; i < 32; i++) {
        const a = i / 32 * Math.PI * 2;
        let rx = R, rz = R;
        if (f === "oval") { rx = R * 1.45; rz = R * 0.7; }
        else if (f === "feijao") { const k = 1 + 0.22 * Math.cos(2 * a) - 0.38 * Math.pow(Math.max(0, Math.sin(a)), 3); rx = R * 1.25 * k; rz = R * 0.8 * k; }
        else if (f === "irregular") { const k = 1 + 0.2 * Math.sin(3 * a + s) + 0.12 * Math.sin(5 * a + s * 2.3); rx = R * k; rz = R * k; }
        else { const k = 1 + 0.05 * Math.sin(a * 3 + s); rx = R * k; rz = R * k; }
        pts.push([Math.cos(a) * rx, Math.sin(a) * rz]);
    }
    return pts;
}
function arRaioForma(p, R) { return arFormaPontos(p.f, R, 1).reduce((m, q) => Math.max(m, Math.hypot(q[0], q[1])), 0); }
// peça do chão com formato: piso plano ou, com altura (p.v), um monte em camadas (base larga embaixo, topo claro)
function arChaoForma(p, R, cor, ang, deco) {
    const pts = arFormaPontos(p.f, R, arSemente(p));
    const alt = Math.max(0, Math.min(3, p.v || 0)) * 22;
    if (!alt) {
        arPoli(p, pts.map(q => [q[0], 0.5, q[1]]), cor, ang);
        if (deco) deco(pts, 0.6);
        return;
    }
    const N = 8;
    for (let i = 0; i <= N; i++) {
        const f = i / N, k = Math.sqrt(1 - f * f * 0.92), y = alt * (1 - (1 - f) * (1 - f)) + 0.5;
        arPoli(p, pts.map(q => [q[0] * k, y, q[1] * k]), arMix(cor, -0.28 + f * 0.4), ang);
    }
    if (deco) deco(pts.map(q => [q[0] * 0.3, q[1] * 0.3]), alt + 0.8);
}
// figura plana virada para a câmera (estátua, placa...): ponto da base na tela + escala
function arBase(p, ang, y) { return trProj(p.x, (y || 0) * arEsc(p), p.z, ang); }
// mistura duas cores #rrggbb (t = 0 -> a, 1 -> b)
function arMistura(a, b, t) {
    if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return a;
    const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
    return "#" + [16, 8, 0].map(k => Math.round(((x >> k) & 255) * (1 - t) + ((y >> k) & 255) * t).toString(16).padStart(2, "0")).join("");
}
// pincelada: faixa com cantos redondos pelos pontos (em coordenadas da peça)
function arDesenharPincelada(p, ang) {
    const pts = p.pts && p.pts.length ? p.pts : [[0, 0]], r = (p.w || 24) / 2, y = 0.6;
    const borda = arMix(p.c, -0.12);
    const disco = (q, rr, cor) => { const l = []; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; l.push([q[0] + Math.cos(a) * rr, y, q[1] + Math.sin(a) * rr]); } arPoli(p, l, cor, ang); };
    const faixa = (rr, cor) => {
        for (let i = 1; i < pts.length; i++) {
            const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dz = b[1] - a[1], m = Math.hypot(dx, dz) || 1, nx = -dz / m * rr, nz = dx / m * rr;
            arPoli(p, [[a[0] + nx, y, a[1] + nz], [b[0] + nx, y, b[1] + nz], [b[0] - nx, y, b[1] - nz], [a[0] - nx, y, a[1] - nz]], cor, ang);
        }
        pts.forEach(q => disco(q, rr, cor));
    };
    faixa(r, borda);
    faixa(r * 0.8, p.c);
    if (p.m === "lava") faixa(r * 0.3, "#ffd36b");
    else if (p.m === "agua") faixa(r * 0.25, arMix(p.c, 0.35));
}
// distância de (x, z) do mundo até a linha da pincelada
function arenaDistPincel(p, x, z) {
    const e = p.e || 1, a = -(p.r || 0) * Math.PI / 180, dx = (x - p.x) / e, dz = (z - p.z) / e;
    const lx = dx * Math.cos(a) - dz * Math.sin(a), lz = dx * Math.sin(a) + dz * Math.cos(a), pts = p.pts || [[0, 0]];
    let m = Infinity;
    pts.forEach((q, i) => {
        const o = i ? pts[i - 1] : q, vx = q[0] - o[0], vz = q[1] - o[1], L = vx * vx + vz * vz;
        const t = L ? Math.max(0, Math.min(1, ((lx - o[0]) * vx + (lz - o[1]) * vz) / L)) : 0;
        m = Math.min(m, Math.hypot(lx - o[0] - vx * t, lz - o[1] - vz * t));
    });
    return m * e;
}

// ---------------- as peças ----------------
// aba, nome, cor padrão, planta (forma na planta de cima: ret [w, d] ou circ r) e o desenho.
// chao: desenhada antes de tudo (plana); ceu: vai no céu de 360° (a = azimute 0-360, h = altura 0-1); texto: tem TEXTO.
const ARENA_PECAS = {
    // ---- CONSTRUÇÃO ----
    bloco: { aba: "construcao", nome: "BLOCO QUADRADO", cor: "#d9dee6", planta: { ret: [15, 15] },
        desenha: (p, ang) => arCaixa(p, -15, 15, 0, 30, -15, 15, p.c, ang) },
    parede: { aba: "construcao", nome: "PAREDE", cor: "#e6e2d6", planta: { ret: [40, 4] },
        desenha: (p, ang) => arCaixa(p, -40, 40, 0, 36, -4, 4, p.c, ang) },
    parede_janelas: { aba: "construcao", nome: "PAREDE COM JANELAS", cor: "#eef2f7", planta: { ret: [40, 4] },
        desenha: (p, ang) => {
            const v = arCaixa(p, -40, 40, 0, 40, -4, 4, p.c, ang);
            if (v.frente) arJanelasFace(p, "frente", 4.3, 40, 4, 38, 4, 2, ang);
            if (v.tras) arJanelasFace(p, "tras", -4.3, 40, 4, 38, 4, 2, ang);
        } },
    parede_porta: { aba: "construcao", nome: "PAREDE COM PORTA", cor: "#f2d9b8", planta: { ret: [40, 4] },
        desenha: (p, ang) => {
            const v = arCaixa(p, -40, 40, 0, 40, -4, 4, p.c, ang);
            [["frente", 4.3], ["tras", -4.3]].forEach(([f, pl]) => {
                if (!v[f]) return;
                arRetFace(p, f, pl, -11, 11, 0, 28, "#f4f4f6", ang);
                arRetFace(p, f, pl, -9, 9, 0, 26, "#7a4a28", ang);
                arRetFace(p, f, pl, 5, 7, 12, 14, "#ffd447", ang);
            });
        } },
    predio: { aba: "construcao", nome: "PRÉDIO", cor: "#3b82f6", planta: { ret: [25, 20] },
        desenha: (p, ang) => {
            const v = arCaixa(p, -25, 25, 0, 72, -20, 20, "#eef2f7", ang, "#f7f9fc");
            if (v.frente) arJanelasFace(p, "frente", 20.3, 25, 6, 68, 3, 5, ang);
            if (v.tras) arJanelasFace(p, "tras", -20.3, 25, 6, 68, 3, 5, ang);
            if (v.dir) arJanelasFace(p, "dir", 25.3, 20, 6, 68, 2, 5, ang);
            if (v.esq) arJanelasFace(p, "esq", -25.3, 20, 6, 68, 2, 5, ang);
            arPoli(p, [[-21, 72.2, -16], [21, 72.2, -16], [21, 72.2, 16], [-21, 72.2, 16]], p.c, ang);
        } },
    casa_domo: { aba: "construcao", nome: "CASINHA REDONDA", cor: "#60a5fa", planta: { circ: 15 },
        desenha: (p, ang) => coCasa({ x: p.x, z: p.z, r: 14 * arEsc(p), faixa: p.c }, ang) },
    domo: { aba: "construcao", nome: "DOMO", cor: "#ffd447", planta: { circ: 42 },
        desenha: (p, ang) => {
            const e = arEsc(p);
            c3Cilindro(p.x, p.z, 0, 6 * e, 42 * e, "#e3e8f0", ang, "#f2f5f9", "rgba(90, 100, 125, 0.4)");
            c3Domo(p.x, p.z, 6 * e, 40 * e, 32 * e, p.c, ang);
        } },
    torre: { aba: "construcao", nome: "TORRE REDONDA", cor: "#e8edf3", planta: { circ: 13 },
        desenha: (p, ang) => {
            const e = arEsc(p);
            c3Cilindro(p.x, p.z, 0, 90 * e, 12 * e, p.c, ang, arMix(p.c, 0.3), "rgba(80, 100, 130, 0.45)");
            const a = c3Anel(p.x, p.z, 74 * e, 12.4 * e, ang);
            trG.fillStyle = "#5b8ed0"; trG.beginPath(); trG.ellipse(a.cx, a.cy, a.rx, a.ry + 3 * a.k * e, 0, 0, Math.PI); trG.fill();
            c3Domo(p.x, p.z, 90 * e, 12 * e, 10 * e, "#d9a53c", ang);
        } },
    torre_mirante: { aba: "construcao", nome: "TORRE MIRANTE", cor: "#f4f7fb", planta: { circ: 15 },
        desenha: (p, ang) => pcTorre(p.x, p.z, ang) },
    pilar: { aba: "construcao", nome: "PILAR", cor: "#cfc6b8", planta: { ret: [9, 9] },
        desenha: (p, ang) => {
            arCaixa(p, -9, 9, 0, 6, -9, 9, p.c, ang);
            arCaixa(p, -6, 6, 6, 62, -6, 6, arMix(p.c, 0.08), ang);
            arCaixa(p, -9, 9, 62, 68, -9, 9, p.c, ang);
        } },
    escada: { aba: "construcao", nome: "ESCADA", cor: "#e2ddd2", planta: { ret: [30, 24] },
        desenha: (p, ang) => { for (let i = 0; i < 4; i++) arCaixa(p, -30, 30, i * 6, i * 6 + 6, -24 + i * 12, 24, p.c, ang); } },
    ringue: { aba: "construcao", nome: "RINGUE DE LUTA", cor: "#d8d4cc", planta: { ret: [80, 80] },
        desenha: (p, ang) => {
            arCaixa(p, -86, 86, 0, 4, -86, 86, arMix(p.c, -0.15), ang);
            arCaixa(p, -80, 80, 4, 10, -80, 80, p.c, ang);
            trG.save();
            for (let i = -60; i <= 60; i += 20) {
                arLinhaChao(p, [i, 10.2, -80], [i, 10.2, 80], "rgba(90, 90, 100, 0.45)", 1, ang);
                arLinhaChao(p, [-80, 10.2, i], [80, 10.2, i], "rgba(90, 90, 100, 0.45)", 1, ang);
            }
            trG.restore();
        } },
    portao: { aba: "construcao", nome: "PORTÃO", cor: "#d9342b", planta: { ret: [36, 5] },
        desenha: (p, ang) => {
            arCaixa(p, -32, -26, 0, 56, -3, 3, p.c, ang);
            arCaixa(p, 26, 32, 0, 56, -3, 3, p.c, ang);
            arCaixa(p, -38, 38, 50, 56, -4, 4, p.c, ang);
            arCaixa(p, -42, 42, 58, 63, -5, 5, "#2b2b2b", ang);
        } },
    // ---- NAVE ----
    casco_nave: { aba: "nave", nome: "CASCO DE NAVE", cor: "#e9edf3", planta: { circ: 90 },
        desenha: (p, ang) => {
            const e = arEsc(p);
            c3Cilindro(p.x, p.z, 10 * e, 24 * e, 90 * e, "#c9d1dd", ang, "#d8dee8", "rgba(70, 80, 100, 0.45)");
            const a = c3Anel(p.x, p.z, 17 * e, 90.5 * e, ang);
            for (let i = -6; i <= 6; i++) {
                const u = i / 7, px = a.cx + u * a.rx, py = a.cy + a.ry * Math.sqrt(1 - u * u);
                trG.fillStyle = "#24345a"; trG.beginPath(); trG.ellipse(px, py, 5 * a.k * e * Math.sqrt(1 - u * u) + 1, 3.4 * a.k * e, 0, 0, Math.PI * 2); trG.fill();
                trG.fillStyle = "#8fb4ea"; trG.beginPath(); trG.ellipse(px - 1.2 * a.k * e, py - 1 * a.k * e, 1.6 * a.k * e * Math.sqrt(1 - u * u) + 0.4, 1 * a.k * e, 0, 0, Math.PI * 2); trG.fill();
            }
            c3Domo(p.x, p.z, 24 * e, 84 * e, 44 * e, p.c, ang);
            const t = c3Anel(p.x, p.z, 24 * e, 84 * e, ang);
            trG.fillStyle = "#ffd447";
            for (let i = -4; i <= 4; i++) { const u = i / 5; trG.beginPath(); trG.arc(t.cx + u * t.rx, t.cy + t.ry * Math.sqrt(1 - u * u) - 2 * t.k, 1.8 * t.k * e, 0, Math.PI * 2); trG.fill(); }
        } },
    perna_aco: { aba: "nave", nome: "PERNA DE AÇO", cor: "#9aa5b5", planta: { ret: [22, 5] },
        desenha: (p, ang) => {
            const A = arProj(p, -14, 46, 0, ang), B = arProj(p, 22, 0, 0, ang), k = A[3] * arEsc(p);
            trG.lineCap = "round";
            trG.strokeStyle = arMix(p.c, -0.3); trG.lineWidth = Math.max(2, 9 * k);
            trG.beginPath(); trG.moveTo(A[0], A[1]); trG.lineTo(B[0], B[1]); trG.stroke();
            trG.strokeStyle = p.c; trG.lineWidth = Math.max(1.4, 6 * k); trG.stroke();
            trG.strokeStyle = "rgba(255, 255, 255, 0.55)"; trG.lineWidth = Math.max(0.6, 1.6 * k);
            trG.beginPath(); trG.moveTo(A[0] - 1.5 * k, A[1]); trG.lineTo(B[0] - 1.5 * k, B[1] - 2 * k); trG.stroke();
            trG.lineCap = "butt";
            trG.fillStyle = arMix(p.c, -0.2);
            trG.beginPath(); trG.ellipse(B[0], B[1], 10 * k, 3.4 * k, 0, 0, Math.PI * 2); trG.fill();
        } },
    parede_metal: { aba: "nave", nome: "PAREDE DE METAL COM JANELAS OVAIS", cor: "#b8c2d0", planta: { ret: [40, 4] },
        desenha: (p, ang) => {
            const v = arCaixa(p, -40, 40, 0, 34, -4, 4, p.c, ang);
            [["frente", 4.3], ["tras", -4.3]].forEach(([f, pl]) => {
                if (!v[f]) return;
                [-24, 0, 24].forEach(a => { arOvalFace(p, f, pl, a, 18, 8, 9, "#24345a", ang); arOvalFace(p, f, pl, a - 2, 21, 3.2, 3.4, "#8fb4ea", ang); });
            });
        } },
    painel_botoes: { aba: "nave", nome: "PAINEL DE BOTÕES", cor: "#5b6577", planta: { ret: [16, 9] },
        desenha: (p, ang) => {
            const v = arCaixa(p, -16, 16, 0, 20, -9, 9, p.c, ang, arMix(p.c, -0.25));
            if (v.frente) { arRetFace(p, "frente", 9.3, -12, 12, 6, 16, "#0f2a3d", ang); arRetFace(p, "frente", 9.4, -10, 2, 8, 14, "#22d3ee", ang); }
            [["#ef4444", -9], ["#facc15", -3], ["#22c55e", 3], ["#3b82f6", 9]].forEach(([cor, lx]) => {
                const q = arProj(p, lx, 20.5, 2, ang);
                trG.fillStyle = cor; trG.beginPath(); trG.ellipse(q[0], q[1], 2.4 * q[3] * arEsc(p), 1.3 * q[3] * arEsc(p), 0, 0, Math.PI * 2); trG.fill();
            });
        } },
    antena: { aba: "nave", nome: "ANTENA", cor: "#ef4444", planta: { circ: 5 },
        desenha: (p, ang) => {
            const b = arBase(p, ang), t = arBase(p, ang, 70), k = b[3] * arEsc(p);
            trG.strokeStyle = "#c7cfdb"; trG.lineWidth = Math.max(1, 2.4 * k);
            trG.beginPath(); trG.moveTo(b[0], b[1]); trG.lineTo(t[0], t[1]); trG.stroke();
            trG.fillStyle = p.c; trG.beginPath(); trG.arc(t[0], t[1], 4 * k, 0, Math.PI * 2); trG.fill();
            trG.fillStyle = "rgba(255, 255, 255, 0.6)"; trG.beginPath(); trG.arc(t[0] - 1.2 * k, t[1] - 1.2 * k, 1.4 * k, 0, Math.PI * 2); trG.fill();
        } },
    capsula: { aba: "nave", nome: "CÁPSULA ESPACIAL", cor: "#e9edf3", planta: { circ: 16 },
        desenha: (p, ang) => {
            const c = arBase(p, ang, 16), k = c[3] * arEsc(p), r = 15 * k;
            const g = trG.createRadialGradient(c[0] - r * 0.4, c[1] - r * 0.4, r * 0.1, c[0], c[1], r);
            g.addColorStop(0, "#ffffff"); g.addColorStop(1, arMix(p.c, -0.35));
            trG.strokeStyle = "#8a94a6"; trG.lineWidth = Math.max(1, 2 * k);
            trG.beginPath(); trG.moveTo(c[0] - r * 0.7, c[1] + r * 0.6); trG.lineTo(c[0] - r, c[1] + r * 1.1); trG.moveTo(c[0] + r * 0.7, c[1] + r * 0.6); trG.lineTo(c[0] + r, c[1] + r * 1.1); trG.stroke();
            trG.fillStyle = g; trG.beginPath(); trG.arc(c[0], c[1], r, 0, Math.PI * 2); trG.fill();
            trG.fillStyle = "#b91c1c"; trG.beginPath(); trG.ellipse(c[0], c[1] - r * 0.1, r * 0.55, r * 0.4, 0, 0, Math.PI * 2); trG.fill();
            trG.fillStyle = "rgba(255, 200, 200, 0.6)"; trG.beginPath(); trG.ellipse(c[0] - r * 0.2, c[1] - r * 0.25, r * 0.18, r * 0.1, -0.4, 0, Math.PI * 2); trG.fill();
        } },
    luz_pista: { aba: "nave", nome: "LUZ DE PISTA", cor: "#7dd3fc", planta: { circ: 4 },
        desenha: (p, ang) => {
            const b = arBase(p, ang), t = arBase(p, ang, 14), k = b[3] * arEsc(p);
            trG.fillStyle = "#6b7280"; trG.fillRect(b[0] - 1.5 * k, t[1], 3 * k, b[1] - t[1]);
            const g = trG.createRadialGradient(t[0], t[1], 0, t[0], t[1], 9 * k);
            g.addColorStop(0, "#ffffff"); g.addColorStop(0.35, p.c); g.addColorStop(1, "rgba(0, 0, 0, 0)");
            trG.fillStyle = g; trG.beginPath(); trG.arc(t[0], t[1], 9 * k, 0, Math.PI * 2); trG.fill();
        } },
    // ---- NATUREZA ----
    coqueiro: { aba: "natureza", nome: "COQUEIRO", cor: "#3fa548", planta: { circ: 10 },
        desenha: (p, ang) => { const e = arEsc(p), [c, s] = arGiro(p); khDrawCoqueiro({ x: p.x, z: p.z, lx: 16 * e * c, lz: 16 * e * s, h: 70 * e }, ang); } },
    palmeira: { aba: "natureza", nome: "PALMEIRA PEQUENA", cor: "#43a84c", planta: { circ: 8 },
        desenha: (p, ang) => pcCoqueiro(p.x, p.z, ang) },
    cipreste: { aba: "natureza", nome: "CIPRESTE", cor: "#1f5a3a", planta: { circ: 6 },
        desenha: (p, ang) => pcCipreste({ x: p.x, z: p.z, h: 34 * arEsc(p) }, ang) },
    arvore: { aba: "natureza", nome: "ÁRVORE REDONDA", cor: "#2f7a32", planta: { circ: 10 },
        desenha: (p, ang) => coArvore({ x: p.x, z: p.z, t: 9 * arEsc(p) }, ang) },
    arbusto: { aba: "natureza", nome: "ARBUSTO", cor: "#3c9440", planta: { circ: 12 },
        desenha: (p, ang) => khDrawArbusto({ x: p.x, z: p.z, r: 12 * arEsc(p) }, ang) },
    pedra: { aba: "natureza", nome: "PEDRA", cor: "#9aa58a", planta: { circ: 14 },
        desenha: (p, ang) => khDrawPedra({ x: p.x, z: p.z, r: 14 * arEsc(p) }, ang) },
    mesa_pedra: { aba: "natureza", nome: "MESA DE PEDRA", cor: "#b8875a", planta: { circ: 30 },
        desenha: (p, ang) => {
            const e = arEsc(p);
            c3Cilindro(p.x, p.z, 0, 90 * e, 30 * e, p.c, ang, arMix(p.c, 0.2), "rgba(80, 50, 30, 0.45)");
            [28, 52, 72].forEach(y => { const a = c3Anel(p.x, p.z, y * e, 30.3 * e, ang); trG.strokeStyle = "rgba(90, 55, 30, 0.45)"; trG.lineWidth = 1; trG.beginPath(); trG.ellipse(a.cx, a.cy, a.rx, a.ry, 0, 0.1, Math.PI - 0.1); trG.stroke(); });
        } },
    montanha: { aba: "natureza", nome: "MONTANHA", cor: "#7b8794", planta: { circ: 90 },
        desenha: (p, ang) => {
            const e = arEsc(p), a = c3Anel(p.x, p.z, 0, 90 * e, ang), t = trProj(p.x, 140 * e, p.z, ang);
            const g = trG.createLinearGradient(a.cx - a.rx, 0, a.cx + a.rx, 0);
            g.addColorStop(0, arMix(p.c, 0.15)); g.addColorStop(1, arMix(p.c, -0.3));
            trG.fillStyle = g;
            trG.beginPath(); trG.moveTo(a.cx - a.rx, a.cy); trG.lineTo(t[0], t[1]); trG.lineTo(a.cx + a.rx, a.cy); trG.ellipse(a.cx, a.cy, a.rx, a.ry, 0, 0, Math.PI); trG.closePath(); trG.fill();
            const f = 0.28, nx = (q) => t[0] + (q - t[0]) * f, ny = t[1] + (a.cy - t[1]) * f;
            trG.fillStyle = "#f4f7fb";
            trG.beginPath(); trG.moveTo(t[0], t[1]); trG.lineTo(nx(a.cx + a.rx), ny); trG.lineTo(t[0] + (nx(a.cx + a.rx) - t[0]) * 0.4, ny - 4 * a.k); trG.lineTo(t[0], ny + 3 * a.k); trG.lineTo(nx(a.cx - a.rx), ny); trG.closePath(); trG.fill();
        } },
    cristal: { aba: "natureza", nome: "CRISTAL", cor: "#7dd3fc", planta: { circ: 10 },
        desenha: (p, ang) => {
            const b = arBase(p, ang), k = b[3] * arEsc(p);
            [[-6, 30, -0.2], [4, 40, 0.1], [11, 22, 0.35]].forEach(([dx, h, inc]) => {
                const x = b[0] + dx * k, y = b[1], w = 5 * k, tx = x + inc * h * k, ty = y - h * k;
                trG.fillStyle = arMix(p.c, -0.2); trG.beginPath(); trG.moveTo(x - w, y); trG.lineTo(tx, ty); trG.lineTo(x + w, y); trG.closePath(); trG.fill();
                trG.fillStyle = arMix(p.c, 0.35); trG.beginPath(); trG.moveTo(x - w * 0.2, y); trG.lineTo(tx, ty); trG.lineTo(x + w, y); trG.closePath(); trG.fill();
            });
        } },
    // ---- CHÃO (planas) ----
    gramado: { aba: "chao", chao: true, forma: 70, nome: "GRAMADO", cor: "#6fc04e", planta: { circ: 70 }, desenha: (p, ang) => arChaoForma(p, 70, p.c, ang) },
    lago: { aba: "chao", chao: true, forma: 60, nome: "LAGO", cor: "#4aa3df", planta: { circ: 60 },
        desenha: (p, ang) => arChaoForma(p, 60, p.c, ang, (pts, y) => {
            arPoli(p, pts.map(q => [q[0] * 0.66, y, q[1] * 0.66]), arMix(p.c, 0.18), ang);
            arPoli(p, pts.map(q => [q[0] * 0.3, y + 0.1, q[1] * 0.3]), arMix(p.c, 0.32), ang);
        }) },
    areia: { aba: "chao", chao: true, forma: 70, nome: "AREIA", cor: "#e8d39a", planta: { circ: 70 }, desenha: (p, ang) => arChaoForma(p, 70, p.c, ang) },
    terra: { aba: "chao", chao: true, forma: 70, nome: "TERRA", cor: "#9c6b3f", planta: { circ: 70 }, desenha: (p, ang) => arChaoForma(p, 70, p.c, ang) },
    lava: { aba: "chao", chao: true, forma: 60, nome: "LAVA", cor: "#ff5a1f", planta: { circ: 60 },
        desenha: (p, ang) => arChaoForma(p, 60, p.c, ang, (pts, y) => arPoli(p, pts.map(q => [q[0] * 0.55, y, q[1] * 0.55]), "#ffc04d", ang)) },
    neve: { aba: "chao", chao: true, forma: 70, nome: "NEVE", cor: "#eef4fb", planta: { circ: 70 }, desenha: (p, ang) => arChaoForma(p, 70, p.c, ang) },
    piso: { aba: "chao", chao: true, nome: "PISO DE LADRILHOS", cor: "#d9d4c7", planta: { ret: [80, 80] },
        desenha: (p, ang) => {
            arRetChao(p, 80, 80, p.c, ang);
            for (let i = -60; i <= 60; i += 20) { arLinhaChao(p, [i, 0.6, -80], [i, 0.6, 80], "rgba(90, 90, 100, 0.4)", 1, ang); arLinhaChao(p, [-80, 0.6, i], [80, 0.6, i], "rgba(90, 90, 100, 0.4)", 1, ang); }
        } },
    estrada: { aba: "chao", chao: true, nome: "ESTRADA", cor: "#8d96a3", planta: { ret: [100, 13] },
        desenha: (p, ang) => {
            arRetChao(p, 100, 13, p.c, ang);
            for (let i = -90; i < 90; i += 24) arLinhaChao(p, [i, 0.6, 0], [i + 12, 0.6, 0], "rgba(255, 255, 255, 0.8)", 1.4, ang);
        } },
    // pincelada do PINCEL DE CHÃO: faixa larga (w) pelos pontos pts (relativos a x, z), lisa no chão
    pincel: { aba: "pincel", chao: true, pincel: true, nome: "PINCELADA", cor: "#6fc04e", planta: { circ: 12 },
        desenha: (p, ang) => arDesenharPincelada(p, ang) },
    trilha: { aba: "chao", chao: true, nome: "TRILHA", cor: "#efe4c2", planta: { ret: [80, 7] }, desenha: (p, ang) => arRetChao(p, 80, 7, p.c, ang) },
    // ---- CÉU (no céu de 360°: desenhadas uma vez na faixa) ----
    sol: { aba: "ceu", ceu: true, nome: "SOL", cor: "#fff3b0",
        desenha: (g, x, y, r, p) => {
            const gr = g.createRadialGradient(x, y, 0, x, y, r * 2.4);
            gr.addColorStop(0, "rgba(255, 250, 220, 0.95)"); gr.addColorStop(0.4, "rgba(255, 240, 180, 0.35)"); gr.addColorStop(1, "rgba(255, 240, 180, 0)");
            g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 2.4, 0, Math.PI * 2); g.fill();
            g.fillStyle = p.c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
        } },
    lua: { aba: "ceu", ceu: true, nome: "LUA", cor: "#d6d3cc", desenha: (g, x, y, r, p, s) => ksPlaneta(g, x, y, r, "lua", s) },
    planeta_gasoso: { aba: "ceu", ceu: true, nome: "PLANETA GASOSO", cor: "#d9b48a",
        desenha: (g, x, y, r, p, s) => {
            ksPlaneta(g, x, y, r, "jupiter", s);
            g.strokeStyle = "rgba(230, 210, 170, 0.75)"; g.lineWidth = Math.max(1, r * 0.12);
            g.beginPath(); g.ellipse(x, y, r * 1.7, r * 0.38, -0.25, 0.15, Math.PI * 2 - 0.15); g.stroke();
        } },
    planeta_oceano: { aba: "ceu", ceu: true, nome: "PLANETA OCEANO", cor: "#2f86c9", desenha: (g, x, y, r, p, s) => ksPlaneta(g, x, y, r, "oceano", s) },
    planeta_terra: { aba: "ceu", ceu: true, nome: "PLANETA TERRA", cor: "#4a9a5a", desenha: (g, x, y, r, p, s) => ksPlaneta(g, x, y, r, "terra", s) },
    nuvem: { aba: "ceu", ceu: true, nome: "NUVEM", cor: "#ffffff", desenha: (g, x, y, r, p, s) => khNuvem(g, x, y + r * 0.6, r * 5, r * 1.6, s) },
    estrelas: { aba: "ceu", ceu: true, nome: "ESTRELAS", cor: "#ffffff",
        desenha: (g, x, y, r, p, s) => {
            g.fillStyle = p.c;
            for (let i = 0; i < 40; i++) { const sx = x + (c3Hash(s * 13 + i) - 0.5) * r * 12, sy = y + (c3Hash(s * 29 + i * 3) - 0.5) * r * 3.2, t = 0.5 + c3Hash(s + i * 7) * 1.1; g.globalAlpha = 0.5 + c3Hash(i + s) * 0.5; g.fillRect(sx, sy, t, t); }
            g.globalAlpha = 1;
        } },
    morros: { aba: "ceu", ceu: true, nome: "MORROS NO HORIZONTE", cor: "#6fa86a", baixo: true,
        desenha: (g, x, y, r, p, s, base) => {
            g.fillStyle = p.c;
            for (let i = 0; i < 6; i++) {
                const cx = x + (i - 2.5) * r * 2.2, l = r * (1.6 + c3Hash(s + i) * 1.4), a = r * (0.5 + c3Hash(s * 3 + i) * 0.7);
                g.beginPath(); g.moveTo(cx - l, base); g.quadraticCurveTo(cx, base - a * 2, cx + l, base); g.closePath(); g.fill();
            }
        } },
    montanhas_neve: { aba: "ceu", ceu: true, nome: "MONTANHAS COM NEVE", cor: "#7b8794", baixo: true,
        desenha: (g, x, y, r, p, s, base) => {
            for (let i = 0; i < 5; i++) {
                const cx = x + (i - 2) * r * 2, l = r * (1.2 + c3Hash(s + i) * 0.8), a = r * (1.2 + c3Hash(s * 5 + i) * 1.2);
                g.fillStyle = arMix(p.c, (i % 2) * -0.15); g.beginPath(); g.moveTo(cx - l, base); g.lineTo(cx, base - a); g.lineTo(cx + l, base); g.closePath(); g.fill();
                g.fillStyle = "#f4f7fb"; g.beginPath(); g.moveTo(cx - l * 0.3, base - a * 0.7); g.lineTo(cx, base - a); g.lineTo(cx + l * 0.3, base - a * 0.7); g.closePath(); g.fill();
            }
        } },
    cidade_longe: { aba: "ceu", ceu: true, nome: "CIDADE AO LONGE", cor: "#e1e8f5", baixo: true,
        desenha: (g, x, y, r, p, s, base) => {
            for (let i = 0; i < 14; i++) {
                const w = r * (0.4 + c3Hash(s + i) * 0.5), h = r * (0.6 + c3Hash(s * 7 + i) * 1.8), bx = x + (i - 7) * r * 0.75;
                g.fillStyle = p.c; g.fillRect(bx, base - h, w, h);
                g.fillStyle = ["#f9a8d4", "#fde68a", "#93c5fd"][i % 3]; g.fillRect(bx, base - h, w, Math.max(1, r * 0.12));
            }
        } },
    ilha_pedra: { aba: "natureza", nome: "ILHA DE PEDRA RACHADA", cor: "#5b86a8", planta: { circ: 50 },
        desenha: (p, ang) => {
            const e = arEsc(p);
            c3Cilindro(p.x, p.z, 0, 16 * e, 50 * e, "#3a2c44", ang, p.c);
            const a = c3Anel(p.x, p.z, 16 * e, 50 * e, ang);
            trG.fillStyle = "rgba(255, 255, 255, 0.18)"; trG.beginPath(); trG.ellipse(a.cx - a.rx * 0.25, a.cy - a.ry * 0.2, a.rx * 0.45, a.ry * 0.4, 0, 0, Math.PI * 2); trG.fill();
            trG.strokeStyle = "#ff8a1e"; trG.lineWidth = Math.max(1, 2 * a.k * e);
            trG.beginPath(); trG.moveTo(a.cx - a.rx * 0.6, a.cy); trG.lineTo(a.cx - a.rx * 0.1, a.cy + a.ry * 0.3); trG.lineTo(a.cx + a.rx * 0.2, a.cy - a.ry * 0.2); trG.lineTo(a.cx + a.rx * 0.6, a.cy + a.ry * 0.1); trG.stroke();
        } },
    // ---- EFEITOS (se mexem: desenhados a cada quadro, por cima do cenário guardado) ----
    coluna_lava: { aba: "efeitos", anim: true, nome: "COLUNA DE LAVA", cor: "#ffb020", planta: { circ: 14 },
        desenha: (p, ang, t) => {
            const b = arBase(p, ang), topo = arBase(p, ang, 260), k = b[3] * arEsc(p), L = 26 * k, x = b[0], y = b[1], fase = arSemente(p);
            const brilho = 0.75 + Math.sin(t * 3 + fase) * 0.25;
            trG.fillStyle = "rgba(40, 26, 24, 0.85)";
            for (let i = 0; i < 7; i++) { const fy = topo[1] + (y - topo[1]) * (i / 9), fx = x + Math.sin(i * 1.7 + fase + t * 0.5) * L * 1.2; trG.beginPath(); trG.arc(fx, fy, L * (1.6 + (6 - i) * 0.35), 0, Math.PI * 2); trG.fill(); }
            trG.fillStyle = "rgba(70, 50, 55, 0.7)";
            for (let i = 0; i < 5; i++) { trG.beginPath(); trG.arc(x + (i - 2) * L * 1.4, topo[1] - L * (1 + (i % 2)), L * 1.8, 0, Math.PI * 2); trG.fill(); }
            const lava = trG.createLinearGradient(x - L, 0, x + L, 0);
            lava.addColorStop(0, "#b3160d"); lava.addColorStop(0.5, `rgba(255, ${Math.round(150 * brilho)}, 40, 1)`); lava.addColorStop(1, "#b3160d");
            trG.fillStyle = lava; trG.fillRect(x - L / 2, topo[1], L, y - topo[1]);
            const altura = y - topo[1];
            trG.fillStyle = p.c;
            for (let i = 0; i < 5; i++) { const f = ((i / 5 - t * 0.9 + fase) % 1 + 1) % 1; trG.fillRect(x - L * 0.12 + Math.sin(i * 2 + t * 3) * L * 0.18, topo[1] + altura * f, L * 0.2, altura * 0.1); }
            trG.fillStyle = "#ff9a2e";
            for (let i = 0; i < 6; i++) { const u = ((t * 0.8 + i / 6 + fase) % 1 + 1) % 1, lado = i % 2 ? 1 : -1; trG.beginPath(); trG.arc(x + lado * L * (0.3 + u * 2.2), topo[1] - L * 2.2 * u * (1 - u) * 4 + altura * u * u * 0.25, Math.max(1, L * 0.16 * (1 - u * 0.5)), 0, Math.PI * 2); trG.fill(); }
            trG.fillStyle = "#d4260f"; trG.beginPath(); trG.ellipse(x, y, L * 2.2, L * 0.4, 0, 0, Math.PI * 2); trG.fill();
        } },
    arco_lava: { aba: "efeitos", anim: true, nome: "ARCO DE LAVA", cor: "#ffd36b", planta: { ret: [70, 6] },
        desenha: (p, ang, t) => {
            const a = arProj(p, -70, 0, 0, ang), b = arProj(p, 70, 0, 0, ang), cima = arProj(p, 0, 190, 0, ang), k = a[3] * arEsc(p);
            trG.lineCap = "round";
            trG.strokeStyle = "rgba(255, 90, 20, 0.55)"; trG.lineWidth = Math.max(2, 9 * k);
            trG.beginPath(); trG.moveTo(a[0], a[1]); trG.quadraticCurveTo(cima[0], cima[1], b[0], b[1]); trG.stroke();
            trG.strokeStyle = p.c; trG.lineWidth = Math.max(1, 3 * k); trG.stroke();
            trG.lineCap = "butt";
            trG.fillStyle = "#fff1b0";
            for (let i = 0; i < 4; i++) {
                const u = ((t * 0.45 + i / 4) % 1 + 1) % 1, v = 1 - u;
                trG.beginPath(); trG.arc(v * v * a[0] + 2 * u * v * cima[0] + u * u * b[0], v * v * a[1] + 2 * u * v * cima[1] + u * u * b[1], Math.max(1.2, 5 * k), 0, Math.PI * 2); trG.fill();
            }
        } },
    brasas: { aba: "efeitos", anim: true, nome: "BRASAS SUBINDO", cor: "#ffb43b", planta: { circ: 30 },
        desenha: (p, ang, t) => {
            for (let i = 0; i < 16; i++) {
                const s = c3Hash(i * 3.3 + arSemente(p) * 10), u = ((t * (0.25 + s * 0.3) + s) % 1 + 1) % 1;
                const q = arProj(p, (c3Hash(i * 5.1) - 0.5) * 60 + Math.sin(t * 2 + i) * 6, u * 110, (c3Hash(i * 7.7) - 0.5) * 60, ang);
                trG.globalAlpha = 1 - u; trG.fillStyle = i % 2 ? p.c : "#ff7a1e";
                trG.fillRect(q[0], q[1], Math.max(1, 2.2 * q[3]), Math.max(1, 4 * q[3]));
            }
            trG.globalAlpha = 1;
        } },
    fumaca: { aba: "efeitos", anim: true, nome: "FUMAÇA", cor: "#4b4246", planta: { circ: 20 },
        desenha: (p, ang, t) => {
            for (let i = 0; i < 8; i++) {
                const u = ((t * 0.18 + i / 8) % 1 + 1) % 1, q = arProj(p, Math.sin(u * 5 + i) * 12, u * 160, 0, ang), r = (10 + u * 30) * q[3] * arEsc(p);
                trG.globalAlpha = 0.55 * (1 - u); trG.fillStyle = p.c;
                trG.beginPath(); trG.arc(q[0], q[1], r, 0, Math.PI * 2); trG.fill();
            }
            trG.globalAlpha = 1;
        } },
    nuvens_passando: { aba: "efeitos", anim: true, nome: "NUVENS PASSANDO", cor: "#ffffff", planta: { ret: [90, 20] },
        desenha: (p, ang, t) => {
            for (let i = 0; i < 4; i++) {
                const u = ((t * 0.05 + i / 4) % 1 + 1) % 1, q = arProj(p, -90 + u * 180, 14 + (i % 2) * 8, (i - 1.5) * 10, ang), k = q[3] * arEsc(p);
                trG.globalAlpha = Math.sin(u * Math.PI) * 0.85; trG.fillStyle = p.c;
                [[-14, 0, 12], [0, -5, 15], [14, 0, 11], [4, 4, 12]].forEach(([dx, dy, r]) => { trG.beginPath(); trG.arc(q[0] + dx * k, q[1] + dy * k, r * k, 0, Math.PI * 2); trG.fill(); });
            }
            trG.globalAlpha = 1;
        } },
    raio: { aba: "efeitos", anim: true, nome: "RAIO", cor: "#fffbe6", planta: { circ: 10 },
        desenha: (p, ang, t) => {
            const fase = arModulo(arSemente(p) * 7, 3.2), ciclo = ((t + fase) % 3.2 + 3.2) % 3.2;
            if (ciclo > 0.22) return;
            const b = arBase(p, ang), semente = Math.floor((t + fase) / 3.2);
            trG.strokeStyle = p.c; trG.lineWidth = 2.2;
            trG.beginPath();
            let rx = b[0] + (c3Hash(semente) - 0.5) * 80, ry = 0;
            trG.moveTo(rx, ry);
            for (let i = 1; i <= 8; i++) { rx += (c3Hash(semente * 7 + i) - 0.5) * 40; ry = b[1] * i / 8; trG.lineTo(i === 8 ? b[0] : rx, ry); }
            trG.stroke();
            trG.fillStyle = `rgba(230, 255, 210, ${0.16 * (1 - ciclo / 0.22)})`; trG.fillRect(0, 0, canvas.width, canvas.height);
        } },
    // ---- ENFEITES ----
    estatua: { aba: "enfeites", nome: "ESTÁTUA", cor: "#b8b2a6", planta: { ret: [10, 10] },
        desenha: (p, ang) => {
            arCaixa(p, -10, 10, 0, 12, -10, 10, arMix(p.c, -0.1), ang);
            const b = arBase(p, ang, 12), k = b[3] * arEsc(p), cor = p.c, esc = arMix(p.c, -0.3);
            const x = b[0], y = b[1];
            trG.fillStyle = esc;
            trG.fillRect(x - 5 * k, y - 18 * k, 4 * k, 18 * k); trG.fillRect(x + 1 * k, y - 18 * k, 4 * k, 18 * k);   // pernas
            trG.fillStyle = cor;
            trG.beginPath(); trG.moveTo(x - 8 * k, y - 34 * k); trG.lineTo(x + 8 * k, y - 34 * k); trG.lineTo(x + 6 * k, y - 17 * k); trG.lineTo(x - 6 * k, y - 17 * k); trG.closePath(); trG.fill();   // tronco
            trG.fillStyle = esc; trG.fillRect(x - 9 * k, y - 30 * k, 18 * k, 5 * k);   // braços cruzados
            trG.fillStyle = cor; trG.beginPath(); trG.arc(x, y - 39 * k, 5 * k, 0, Math.PI * 2); trG.fill();   // cabeça
            trG.beginPath(); trG.moveTo(x - 5 * k, y - 41 * k); trG.lineTo(x - 7 * k, y - 49 * k); trG.lineTo(x - 2 * k, y - 44 * k); trG.lineTo(x, y - 51 * k); trG.lineTo(x + 2 * k, y - 44 * k); trG.lineTo(x + 7 * k, y - 49 * k); trG.lineTo(x + 5 * k, y - 41 * k); trG.closePath(); trG.fill();   // cabelo espetado
        } },
    simbolo: { aba: "enfeites", nome: "SÍMBOLO", cor: "#ff8c1a", texto: "亀", planta: { circ: 6 },
        desenha: (p, ang) => {
            const b = arBase(p, ang), t = arBase(p, ang, 44), k = b[3] * arEsc(p);
            trG.fillStyle = "#6b4a22"; trG.fillRect(b[0] - 1.6 * k, t[1], 3.2 * k, b[1] - t[1]);
            trG.fillStyle = p.c; trG.beginPath(); trG.arc(t[0], t[1], 11 * k, 0, Math.PI * 2); trG.fill();
            trG.fillStyle = "#ffffff"; trG.beginPath(); trG.arc(t[0], t[1], 8.5 * k, 0, Math.PI * 2); trG.fill();
            trG.fillStyle = "#111111"; trG.font = `bold ${Math.max(4, Math.round(11 * k))}px sans-serif`; trG.textAlign = "center"; trG.textBaseline = "middle";
            trG.fillText(String(p.txt || "亀").slice(0, 2), t[0], t[1] + 0.5 * k);
            trG.textBaseline = "alphabetic";
        } },
    placa: { aba: "enfeites", nome: "PLACA COM TEXTO", cor: "#8b5a2b", texto: "SAIYAN FIGHT", planta: { ret: [22, 3] },
        desenha: (p, ang) => {
            const b = arBase(p, ang), k = b[3] * arEsc(p), x = b[0], y = b[1];
            trG.fillStyle = "#5a3a1c"; trG.fillRect(x - 18 * k, y - 18 * k, 2.5 * k, 18 * k); trG.fillRect(x + 15.5 * k, y - 18 * k, 2.5 * k, 18 * k);
            trG.fillStyle = p.c; trG.fillRect(x - 24 * k, y - 32 * k, 48 * k, 16 * k);
            trG.strokeStyle = arMix(p.c, -0.4); trG.lineWidth = Math.max(0.6, k); trG.strokeRect(x - 24 * k, y - 32 * k, 48 * k, 16 * k);
            trG.fillStyle = "#ffffff"; trG.font = `bold ${Math.max(4, Math.round(7 * k))}px 'Trebuchet MS', sans-serif`; trG.textAlign = "center"; trG.textBaseline = "middle";
            trG.fillText(String(p.txt || "").slice(0, 16), x, y - 24 * k, 44 * k);
            trG.textBaseline = "alphabetic";
        } },
    bandeira: { aba: "enfeites", nome: "BANDEIRA", cor: "#e11d2e", planta: { circ: 5 },
        desenha: (p, ang) => {
            const b = arBase(p, ang), t = arBase(p, ang, 60), k = b[3] * arEsc(p);
            trG.strokeStyle = "#d1d5db"; trG.lineWidth = Math.max(1, 2 * k);
            trG.beginPath(); trG.moveTo(b[0], b[1]); trG.lineTo(t[0], t[1]); trG.stroke();
            trG.fillStyle = p.c;
            trG.beginPath(); trG.moveTo(t[0], t[1]); trG.quadraticCurveTo(t[0] + 12 * k, t[1] - 3 * k, t[0] + 24 * k, t[1] + 2 * k); trG.lineTo(t[0] + 24 * k, t[1] + 15 * k); trG.quadraticCurveTo(t[0] + 12 * k, t[1] + 10 * k, t[0], t[1] + 14 * k); trG.closePath(); trG.fill();
        } },
    lampiao: { aba: "enfeites", nome: "LAMPIÃO", cor: "#ffe08a", planta: { circ: 5 },
        desenha: (p, ang) => {
            const b = arBase(p, ang), t = arBase(p, ang, 40), k = b[3] * arEsc(p);
            trG.fillStyle = "#374151"; trG.fillRect(b[0] - 1.5 * k, t[1], 3 * k, b[1] - t[1]);
            const g = trG.createRadialGradient(t[0], t[1], 0, t[0], t[1], 12 * k);
            g.addColorStop(0, "#ffffff"); g.addColorStop(0.3, p.c); g.addColorStop(1, "rgba(0, 0, 0, 0)");
            trG.fillStyle = g; trG.beginPath(); trG.arc(t[0], t[1], 12 * k, 0, Math.PI * 2); trG.fill();
            trG.fillStyle = "#374151"; trG.fillRect(t[0] - 4 * k, t[1] - 6 * k, 8 * k, 2 * k);
        } },
    ampulheta: { aba: "enfeites", nome: "AMPULHETA", cor: "#d4a52a", planta: { circ: 18 },
        desenha: (p, ang) => { const b = arBase(p, ang); trDrawHourglass(b[0], b[1], 0.5, b[3] * 0.35 * arEsc(p)); } },
    esfera_dragao: { aba: "enfeites", nome: "ESFERA DO DRAGÃO", cor: "#ffb52e", planta: { circ: 8 },
        desenha: (p, ang) => {
            arCaixa(p, -7, 7, 0, 10, -7, 7, "#9ca3af", ang);
            const c = arBase(p, ang, 17), k = c[3] * arEsc(p), r = 7 * k;
            const g = trG.createRadialGradient(c[0] - r * 0.35, c[1] - r * 0.4, r * 0.1, c[0], c[1], r);
            g.addColorStop(0, "#fff3c4"); g.addColorStop(0.4, p.c); g.addColorStop(1, arMix(p.c, -0.4));
            trG.fillStyle = g; trG.beginPath(); trG.arc(c[0], c[1], r, 0, Math.PI * 2); trG.fill();
            trG.fillStyle = "#e11d2e";
            [[0, -0.35], [-0.35, 0.05], [0.35, 0.05], [0, 0.4]].forEach(([dx, dy]) => { trG.beginPath(); trG.arc(c[0] + dx * r, c[1] + dy * r, r * 0.16, 0, Math.PI * 2); trG.fill(); });
        } }
};

// ---------------- planícies (o chão completo de cada fase) ----------------
// Escolher uma planície troca o chão base e o céu pelos da fase e coloca embaixo de tudo as peças de chão dela
// (ilha de areia, lagos, ringue, ruas...). As peças da planície não contam no limite nem no espaço das outras.
const ARENA_PLANICIES = {
    kame: { nome: "ILHA DO MESTRE KAME", ceu: { topo: "#4da3e8", horizonte: "#d6efff" }, chao: { tipo: "mar", cor: "#2f86c9" },
        pecas: [{ t: "areia", x: 0, z: 0, e: 3.6, f: "irregular", c: "#ecd9a0" }, { t: "gramado", x: -30, z: -40, e: 2.2, f: "irregular", c: "#6fbf4a" }] },
    terra: { nome: "TORNEIO ARTES MARCIAIS", ceu: { topo: "#5aa6e8", horizonte: "#e3f1fb" }, chao: { tipo: "grama", cor: "#6fbf4a" },
        pecas: [{ t: "piso", x: 0, z: 0, e: 2.2, c: "#e2ddd2" }, { t: "trilha", x: 0, z: -260, e: 1.6, r: 90, c: "#efe4c2" }] },
    kaio: { nome: "PLANETA DO SR. KAIOH", ceu: { topo: "#f2c94c", horizonte: "#fff3c4" }, chao: { tipo: "grama", cor: "#6ccf5a" },
        pecas: [0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = i / 8 * Math.PI * 2; return { t: "estrada", x: Math.cos(a) * 270, z: Math.sin(a) * 270, e: 1.1, r: (a * 180 / Math.PI + 90) % 360, c: "#f1efe6" }; }) },
    namek: { nome: "PLANETA NAMEK", ceu: { topo: "#3fa58a", horizonte: "#bfe8c9" }, chao: { tipo: "grama", cor: "#5fa36a" },
        pecas: [{ t: "lago", x: -260, z: -180, e: 1.6, f: "irregular", c: "#4fb3c9" }, { t: "lago", x: 240, z: 120, e: 1.2, f: "oval", c: "#4fb3c9" }, { t: "lago", x: 60, z: -330, e: 2, f: "feijao", c: "#4fb3c9" }] },
    freeza_ship: { nome: "NAVE DE FREEZA", ceu: { topo: "#4fae8c", horizonte: "#cfeedd" }, chao: { tipo: "grama", cor: "#4f9d6c" },
        pecas: [{ t: "lago", x: 230, z: -200, e: 2.2, f: "irregular", c: "#5cbad0" }, { t: "lago", x: -280, z: 160, e: 1.4, f: "oval", c: "#5cbad0" }, { t: "terra", x: 0, z: 0, e: 2.4, f: "circulo", c: "#8a9a6a" }] },
    namek_explosao: { nome: "NAMEK PRESTES A EXPLODIR", ceu: { topo: "#14361f", horizonte: "#d6c070" }, chao: { tipo: "mar", cor: "#14424f" },
        pecas: [{ t: "lava", x: -220, z: -160, e: 1.4, f: "irregular", c: "#ff5a1f" }, { t: "terra", x: 0, z: 0, e: 2.6, f: "irregular", c: "#5b86a8" }, { t: "lava", x: 260, z: 200, e: 1.1, f: "rio_curvo", c: "#ff5a1f" }] },
    time_room: { nome: "SALA DO TEMPO", ceu: { topo: "#ffffff", horizonte: "#f2f2ee" }, chao: { tipo: "ladrilho", cor: "#f4f4f2" }, pecas: [] },
    cell_games: { nome: "TORNEIO DE CELL", ceu: { topo: "#5aa6e8", horizonte: "#e9e0c4" }, chao: { tipo: "terra", cor: "#b99a6a" },
        pecas: [{ t: "terra", x: -260, z: -200, e: 1.8, f: "irregular", c: "#a5865a" }, { t: "estrada", x: 0, z: 300, e: 2.6, c: "#c8a978" }, { t: "piso", x: 0, z: 0, e: 1.4, c: "#d8d4cc" }] },
    kaioshin: { nome: "PLANETA SUPREMO KAIOH", ceu: { topo: "#7ec8e3", horizonte: "#f7e1b5" }, chao: { tipo: "grama", cor: "#8fd06b" },
        pecas: [{ t: "lago", x: 220, z: -220, e: 1.8, f: "oval", c: "#7fd0e8" }, { t: "gramado", x: -200, z: 120, e: 2, f: "irregular", c: "#a6dc7c" }] },
    plataforma_celestial: { nome: "PLATAFORMA CELESTIAL", ceu: { topo: "#5fb0ea", horizonte: "#e6f4fd" }, chao: { tipo: "nuvens", cor: "#e8f1fb" },
        pecas: [{ t: "gramado", x: 0, z: 0, e: 4.3, f: "circulo", c: "#a9c9e6" }, { t: "piso", x: 0, z: 0, e: 2.2, c: "#cfe3f2" }] },
    capital_oeste: { nome: "CAPITAL DO OESTE", ceu: { topo: "#5aa6e8", horizonte: "#cfe8fa" }, chao: { tipo: "grama", cor: "#9ccf7a" },
        pecas: [{ t: "piso", x: 0, z: 0, e: 4.4, c: "#8d96a3" }, { t: "gramado", x: 0, z: 0, e: 4.6, f: "circulo", c: "#74c454" },
            { t: "estrada", x: 0, z: -420, e: 4.4, c: "#8d96a3" }, { t: "estrada", x: 0, z: 420, e: 4.4, c: "#8d96a3" }] }
};

// ---------------- arena: validar / guardar ----------------
function arenaCorValida(c, padrao) { return typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c) ? c.toLowerCase() : padrao; }
function arenaNum(v, min, max, padrao) { const n = Number(v); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : padrao; }
// limpa uma peça; devolve null se o tipo não existe
function normalizarPecaArena(q) {
    if (!q || typeof q !== "object") return null;
    const def = ARENA_PECAS[q.t];
    if (!def) return null;
    const p = { t: q.t, e: Math.round(arenaNum(q.e, 0.3, 3, 1) * 100) / 100, c: arenaCorValida(q.c, def.cor) };
    if (def.ceu) { p.a = Math.round(arenaNum(q.a, 0, 360, 0)) % 360; p.h = Math.round(arenaNum(q.h, 0, 1, 0.5) * 100) / 100; }
    else { p.x = Math.round(arenaNum(q.x, -ARENA_RAIO, ARENA_RAIO, 0)); p.z = Math.round(arenaNum(q.z, -ARENA_RAIO, ARENA_RAIO, 0)); p.r = ((Math.round(arenaNum(q.r, -3600, 3600, 0)) % 360) + 360) % 360; }
    if (def.texto !== undefined) p.txt = typeof q.txt === "string" ? q.txt.slice(0, 16) : def.texto;
    if (def.forma) {
        p.f = ARENA_FORMATOS.some(f => f[0] === q.f) ? q.f : "circulo";
        p.v = Math.round(arenaNum(q.v, 0, 3, 0) * 10) / 10;
    }
    if (def.pincel) {
        p.m = ARENA_PINCEL[q.m] ? q.m : "grama";
        p.w = Math.round(arenaNum(q.w, 6, 80, 24));
        const pts = (Array.isArray(q.pts) ? q.pts : []).filter(v => Array.isArray(v) && Number.isFinite(v[0]) && Number.isFinite(v[1]))
            .slice(0, ARENA_PINCEL_PONTOS).map(v => [Math.round(arenaNum(v[0], -900, 900, 0)), Math.round(arenaNum(v[1], -900, 900, 0))]);
        p.pts = pts.length ? pts : [[0, 0]];
    }
    if (!def.ceu) {
        const b = arenaNum(q.b, 0, 900, 0);   // empilhada: altura da base (topo da peça de baixo)
        if (b > 0) p.b = Math.round(b * 10) / 10;
        if (p.b && Array.isArray(q.al) && q.al.length === 3 && q.al.every(Number.isFinite)) {   // centro alinhado + largura da de baixo
            p.al = q.al.map(v => Math.round(v * 10) / 10);
            p.d = Math.round(arenaNum(q.d, -0.9, 0.9, 0) * 10) / 10;   // DESALINHAR (fração da largura da de baixo)
        }
        if (Number.isInteger(q.g) && q.g > 0 && q.g < 1000) { p.g = q.g; if (q.fv) p.fv = true; }   // FUNDIR: grupo e quem dá a aparência
    }
    if (q.oc) p.oc = true;   // 👁 escondida no editor
    if (q.tr) p.tr = true;   // 🔒 travada
    return p;
}
function arenaPadrao() {
    return { id: "", nome: "MINHA ARENA", cor: "#22d3ee", musica: "classico", minion: "saibaman", camera: "media", movimento: "girar", planicie: "",
        ceu: { topo: "#4f9be0", horizonte: "#cfe8fa" }, chao: { tipo: "grama", cor: ARENA_CHAOS.grama.cor }, pecas: [] };
}
function normalizarArena(a) {
    const d = arenaPadrao();
    if (!a || typeof a !== "object") return d;
    const nome = typeof a.nome === "string" ? a.nome.trim().toUpperCase().slice(0, 24) : "";
    const chaoTipo = a.chao && ARENA_CHAOS[a.chao.tipo] ? a.chao.tipo : "grama";
    return {
        id: typeof a.id === "string" && /^arena_[\w]+$/.test(a.id) ? a.id : "",
        nome: nome || d.nome,
        cor: arenaCorValida(a.cor, d.cor),
        musica: typeof a.musica === "string" && typeof BGM_THEMES === "object" && BGM_THEMES[a.musica] ? a.musica : d.musica,
        minion: typeof a.minion === "string" && a.minion ? a.minion : d.minion,
        camera: ARENA_CAMERAS[a.camera] ? a.camera : "media",
        movimento: a.movimento === "seguir" ? "seguir" : "girar",
        planicie: ARENA_PLANICIES[a.planicie] ? a.planicie : "",
        ceu: { topo: arenaCorValida(a.ceu && a.ceu.topo, d.ceu.topo), horizonte: arenaCorValida(a.ceu && a.ceu.horizonte, d.ceu.horizonte) },
        chao: { tipo: chaoTipo, cor: arenaCorValida(a.chao && a.chao.cor, ARENA_CHAOS[chaoTipo].cor) },
        pecas: (Array.isArray(a.pecas) ? a.pecas : []).map(normalizarPecaArena).filter(Boolean).slice(0, ARENA_PECAS_MAX),
        // USAR COMO CAPA: ângulo (GIRAR) ou caminho andado (SEGUIR) da foto do card; a luta começa dessa vista
        hora: ARENA_HORAS.some(h => h[0] === a.hora) ? a.hora : "dia",
        clima: ARENA_CLIMAS.some(c => c[0] === a.clima) ? a.clima : "nenhum",
        capa: a.capa && typeof a.capa === "object" && Number.isFinite(a.capa.ang)
            ? { ang: Math.round(arModulo(a.capa.ang, Math.PI * 2) * 1000) / 1000, andado: Math.round(arenaNum(a.capa.andado, -1e6, 1e6, 0)) } : null
    };
}
function getArenasCriadas() {
    const l = readJsonStorage("saiyan_arenas", []);
    return (Array.isArray(l) ? l : []).map(normalizarArena).filter(a => a.id).slice(0, ARENA_MAX);
}
function salvarArenasCriadas(lista) { return writeStorage("saiyan_arenas", JSON.stringify(lista.map(normalizarArena))); }
// céu escuro? (as fases de céu claro ganham placas escuras atrás do placar)
function arenaCeuClaro(a) {
    const n = parseInt(arCeuDaHora(a).topo.slice(1), 16), l = (((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) / 255;
    return l > 0.35;
}
// coloca as arenas criadas na lista de fases (no fim, sempre liberadas)
function registrarArenasCriadas() {
    for (let i = FASES_PADRAO.length - 1; i >= 0; i--) if (FASES_PADRAO[i].criada) FASES_PADRAO.splice(i, 1);
    const lista = getArenasCriadas();
    if (arenaTeste) lista.push(arenaTeste.arena);   // TESTAR: a arena em edição entra só durante a luta de teste
    lista.forEach((a, i) => {
        FASES_PADRAO.push({ id: a.id, nome: a.nome, posicao: 1000 + i, cor: a.cor, musica: a.musica, cenario: "criada",
            camera: { tipo: a.movimento === "seguir" ? "anda" : "orbita", volta: 10800 }, fundoClaro: arenaCeuClaro(a), minion: a.minion, conquista: null, criada: true, arena: a });
    });
    aplicarOrdemDasFases(typeof getOrdemFasesSalva === "function" ? getOrdemFasesSalva() : null);
    if (typeof atualizarCoresDasFases === "function") atualizarCoresDasFases();
    if (typeof selectedStage !== "undefined" && !getFaseDef(selectedStage)) selectedStage = STAGE_PROGRESSION[0].id;
}

// ---------------- espaço de cada peça (para duas não ocuparem o mesmo lugar) ----------------
// Peças de pé, efeitos e montes (chão com altura) ocupam espaço; pisos planos e o céu não.
function arenaPegada(p) {
    const def = ARENA_PECAS[p.t];
    if (!def || def.ceu || (def.chao && !(p.v > 0))) return null;
    const e = p.e || 1, y0 = p.b || 0, y1 = y0 + arenaAlturaPeca(p);
    if (def.forma) return { r: arRaioForma(p, def.forma) * e * 0.92, x: p.x, z: p.z, y0, y1 };
    if (def.planta && def.planta.ret) return { x: p.x, z: p.z, hw: def.planta.ret[0] * e, hd: def.planta.ret[1] * e, a: (p.r || 0) * Math.PI / 180, y0, y1 };
    return { r: ((def.planta && def.planta.circ) || 8) * e, x: p.x, z: p.z, y0, y1 };
}
// o ponto (x, z) está dentro da pegada g?
function arenaPontoNaPegada(g, x, z) {
    if (g.r !== undefined) return Math.hypot(x - g.x, z - g.z) <= g.r;
    const c = Math.cos(g.a), s = Math.sin(g.a), dx = x - g.x, dz = z - g.z;
    return Math.abs(dx * c + dz * s) <= g.hw && Math.abs(-dx * s + dz * c) <= g.hd;
}
function arPontoNoRet(px, pz, q) {   // ponto do retângulo q mais perto de (px, pz)
    const c = Math.cos(q.a), s = Math.sin(q.a), dx = px - q.x, dz = pz - q.z;
    const lx = Math.max(-q.hw, Math.min(q.hw, dx * c + dz * s)), lz = Math.max(-q.hd, Math.min(q.hd, -dx * s + dz * c));
    return [q.x + lx * c - lz * s, q.z + lx * s + lz * c];
}
function arRetCantos(q) {
    const c = Math.cos(q.a), s = Math.sin(q.a);
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => [q.x + u * q.hw * c - v * q.hd * s, q.z + u * q.hw * s + v * q.hd * c]);
}
function arenaPegadasSeTocam(a, b) {
    const folga = 1;
    // uma em cima da outra (ex.: bloco empilhado) não se chocam
    if (a.y1 !== undefined && b.y1 !== undefined && (a.y1 <= b.y0 + 0.5 || b.y1 <= a.y0 + 0.5)) return false;
    if (a.r !== undefined && b.r !== undefined) return Math.hypot(a.x - b.x, a.z - b.z) < a.r + b.r - folga;
    if (a.r !== undefined || b.r !== undefined) {
        const c = a.r !== undefined ? a : b, q = a.r !== undefined ? b : a, [nx, nz] = arPontoNoRet(c.x, c.z, q);
        return Math.hypot(c.x - nx, c.z - nz) < c.r - folga;
    }
    // dois retângulos: eixos separadores
    const A = arRetCantos(a), B = arRetCantos(b);
    for (const q of [a, b]) for (const ang of [q.a, q.a + Math.PI / 2]) {
        const ax = Math.cos(ang), az = Math.sin(ang), proj = (pts) => pts.map(p => p[0] * ax + p[1] * az);
        const pa = proj(A), pb = proj(B);
        if (Math.max(...pa) - folga <= Math.min(...pb) || Math.max(...pb) - folga <= Math.min(...pa)) return false;
    }
    return true;
}
// a peça i (ou uma peça p fora da lista) invade o espaço de outra?
// ignorar: índice ou lista de índices que não contam (ex.: as peças arrastadas junto); peças do mesmo grupo de FUSÃO podem se sobrepor
function arenaPecaColide(pecas, p, ignorar) {
    const g = arenaPegada(p);
    if (!g) return false;
    const pula = Array.isArray(ignorar) ? ignorar : [ignorar];
    return pecas.some((q, j) => {
        if (pula.includes(j) || q === p || (p.g && q.g === p.g)) return false;
        const h = arenaPegada(q);
        return !!h && arenaPegadasSeTocam(g, h);
    });
}
// índices das peças que se sobrepõem à peça i (sem olhar grupos de fusão)
function arenaPecasTocando(pecas, i) {
    const g = arenaPegada(pecas[i]);
    if (!g) return [];
    return pecas.map((q, j) => j).filter(j => { if (j === i) return false; const h = arenaPegada(pecas[j]); return !!h && arenaPegadasSeTocam(g, h); });
}

// ---------------- desenho da arena (luta, ARENAS, prévia do editor) ----------------
const arCenas = new Map();   // chave -> { passo, canvas, pano, chave }
// duas chaves: a das peças (camada 3D guardada) e a do céu (faixa 360°). Mudar a cor do céu ou a hora só refaz o
// céu, e mudar uma peça não refaz o céu — arrastar no seletor de cores refazia tudo a cada movimento e travava.
function arCenaDe(id, a) {
    let c = arCenas.get(id);
    const ceu = (p) => !!ARENA_PECAS[p.t].ceu;
    const chave = JSON.stringify([a.pecas.filter(p => !ceu(p)), a.planicie, a.camera]);
    const chavePano = JSON.stringify([a.ceu, a.hora, a.clima, a.camera, a.pecas.filter(ceu)]);
    if (!c || c.chave !== chave) { c = { passo: null, canvas: c ? c.canvas : null, pano: c && c.chavePano === chavePano ? c.pano : null, chave, chavePano }; arCenas.set(id, c); }
    else if (c.chavePano !== chavePano) { c.pano = null; c.chavePano = chavePano; }
    return c;
}
// cores do céu conforme a hora (tarde alaranjada, noite escura)
function arCeuDaHora(a) {
    if (a.clima === "lava") {   // clima LAVA: céu avermelhado, como Namek prestes a explodir (escurece de noite)
        const k = a.hora === "noite" ? 0.85 : 0.6;
        return { topo: arMistura(a.ceu.topo, "#3a0d08", k), horizonte: arMistura(a.ceu.horizonte, "#ff7a2a", k * 0.85) };
    }
    if (a.hora === "tarde") return { topo: arMistura(a.ceu.topo, "#ff7a3d", 0.45), horizonte: arMistura(a.ceu.horizonte, "#ffb36b", 0.6) };
    if (a.hora === "noite") return { topo: arMistura(a.ceu.topo, "#050a1f", 0.85), horizonte: arMistura(a.ceu.horizonte, "#1b2448", 0.75) };
    return a.ceu;
}
function arPanorama(a, cena, cam) {
    if (c3Valida(cena.pano)) return cena.pano;
    const W = Math.round(Math.PI * 2 * cam.F), f = c3NovaFaixa(W, cam.HY + 6);
    if (!f) return null;
    const { c, g } = f, base = cam.HY + 2, cores = arCeuDaHora(a);
    const ceu = g.createLinearGradient(0, 0, 0, base);
    ceu.addColorStop(0, cores.topo); ceu.addColorStop(1, cores.horizonte);
    g.fillStyle = ceu; g.fillRect(0, 0, W, c.__h);
    if (a.hora === "noite") {   // estrelas
        for (let i = 0; i < 260; i++) {
            const x = c3Hash(i * 1.7) * W, y = c3Hash(i * 3.3) * (base - 6), r = 0.5 + c3Hash(i * 5.1) * 1.1;
            g.fillStyle = `rgba(255, 255, 255, ${0.35 + c3Hash(i * 7.9) * 0.6})`; g.fillRect(x, y, r, r);
        }
    }
    // peças do céu: as de baixo (morros, cidade) por último, encostadas no horizonte
    const pecas = a.pecas.filter(p => ARENA_PECAS[p.t].ceu).sort((p, q) => (ARENA_PECAS[p.t].baixo ? 1 : 0) - (ARENA_PECAS[q.t].baixo ? 1 : 0));
    pecas.forEach((p, i) => {
        const def = ARENA_PECAS[p.t], x = p.a / 360 * W, r = cam.HY * 0.12 * p.e;
        const y = def.baixo ? base - 4 - p.h * (cam.HY - 10) : Math.min(base - 4 - p.h * (cam.HY - 10), base - 3 - r);
        c3NaVolta(W, x, r * 9, xx => def.desenha(g, xx, y, r, p, i + 1, base));
    });
    cena.pano = c;
    return c;
}
// detalhes do chão (fixos no mundo) para a luta "andar" sobre ele
const AR_DETALHES = (() => {
    const l = [];
    for (let i = 0; i < 90; i++) { const ang = c3Hash(i * 3.1) * Math.PI * 2, r = 60 + c3Hash(i * 7.7) * 1300; l.push({ x: Math.sin(ang) * r, z: Math.cos(ang) * r, s: c3Hash(i * 5.3) }); }
    return l;
})();
const AR_PERIODO = ARENA_RAIO * 2 + 80;   // no modo SEGUIR a planta se repete para os lados
function arModulo(v, m) { return ((v % m) + m) % m; }
// chão: a cor escolhida de verdade (sem clarear/escurecer, para ficar igual ao campo de cor) e, perto do
// horizonte, uma névoa da cor do horizonte do céu — o chão some no horizonte como planície, sem faixa lisa que
// parecia um muro (e tampava os planetas baixos)
function arDesenharNevoaDoHorizonte(a, cam) {
    const alto = (canvas.height - cam.HY) * 0.34, hz = arCeuDaHora(a).horizonte;
    const n = parseInt(hz.slice(1), 16), rgb = `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
    const gr = ctx.createLinearGradient(0, cam.HY, 0, cam.HY + alto);
    gr.addColorStop(0, `rgba(${rgb}, 1)`); gr.addColorStop(0.25, `rgba(${rgb}, 0.85)`); gr.addColorStop(0.55, `rgba(${rgb}, 0.35)`); gr.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = gr; ctx.fillRect(0, cam.HY, canvas.width, alto + 2);
}
function arDesenharChao(a, ang, cam, desl) {
    const ch = a.chao, base = ch.cor;
    ctx.fillStyle = base; ctx.fillRect(0, cam.HY, canvas.width, canvas.height - cam.HY);
    const lim = cam.D - cam.PERTO * 2, t = arRelogio();
    if (ch.tipo === "ladrilho") {
        // as linhas vão até bem longe (somem na névoa do horizonte)
        // longe as linhas ficam mais fracas (juntas elas viravam uma faixa cinza no horizonte)
        const ox = arModulo(desl.x, 80), oz = arModulo(desl.z, 80), L = 4000;
        ctx.strokeStyle = "rgba(90, 95, 110, 0.35)"; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = -L; i <= L; i += 80) {
            if (Math.abs(i) > 1600) continue;
            [[[i - ox, -L], [i - ox, L]], [[-L, i - oz], [L, i - oz]]].forEach(([p0, p1]) => {
                const seg = c3RecorteChao(p0, p1, ang, lim);
                if (!seg) return;
                const A = trProj(seg[0][0], 0, seg[0][1], ang), B = trProj(seg[1][0], 0, seg[1][1], ang);
                ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]);
            });
        }
        ctx.stroke();
        ctx.strokeStyle = "rgba(90, 95, 110, 0.12)"; ctx.beginPath();
        for (let i = -L; i <= L; i += 80) {
            if (Math.abs(i) <= 1600) continue;
            [[[i - ox, -L], [i - ox, L]], [[-L, i - oz], [L, i - oz]]].forEach(([p0, p1]) => {
                const seg = c3RecorteChao(p0, p1, ang, lim);
                if (!seg) return;
                const A = trProj(seg[0][0], 0, seg[0][1], ang), B = trProj(seg[1][0], 0, seg[1][1], ang);
                ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]);
            });
        }
        ctx.stroke();
        arDesenharNevoaDoHorizonte(a, cam);
        return;
    }
    AR_DETALHES.forEach(d => {
        const dx = arModulo(d.x - desl.x + 1300, 2600) - 1300, dz = d.z - desl.z;
        if (trRot(dx, dz, ang)[1] > lim) return;
        const p = trProj(dx, 0, dz, ang), k = p[3];
        if (p[1] < cam.HY) return;
        if (ch.tipo === "grama") { ctx.strokeStyle = arMix(base, -0.3); ctx.lineWidth = Math.max(0.6, 1.2 * k); ctx.beginPath(); ctx.moveTo(p[0] - 3 * k, p[1]); ctx.lineTo(p[0] - 1 * k, p[1] - 6 * k); ctx.moveTo(p[0] + 2 * k, p[1]); ctx.lineTo(p[0] + 3 * k, p[1] - 5 * k); ctx.stroke(); }
        else if (ch.tipo === "mar") { ctx.strokeStyle = "rgba(255, 255, 255, 0.45)"; ctx.lineWidth = Math.max(0.6, 1.4 * k); const o = Math.sin(t * 1.5 + d.s * 6) * 3 * k; ctx.beginPath(); ctx.arc(p[0] + o, p[1], 6 * k, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
        else if (ch.tipo === "nuvens") { ctx.fillStyle = "rgba(255, 255, 255, 0.55)"; ctx.beginPath(); ctx.ellipse(p[0], p[1], 22 * k, 6 * k, 0, 0, Math.PI * 2); ctx.fill(); }
        else if (ch.tipo === "espaco") { ctx.fillStyle = d.s > 0.5 ? "#ffffff" : "#a5b4fc"; ctx.fillRect(p[0], p[1], 1.2 + d.s, 1.2 + d.s); }
        else if (ch.tipo === "lava") { ctx.strokeStyle = "rgba(255, 140, 40, 0.75)"; ctx.lineWidth = Math.max(0.8, 2 * k); ctx.beginPath(); ctx.moveTo(p[0] - 10 * k, p[1]); ctx.lineTo(p[0] - 2 * k, p[1] + 2 * k); ctx.lineTo(p[0] + 9 * k, p[1] - 1 * k); ctx.stroke(); }
        else { ctx.fillStyle = arMix(base, d.s > 0.5 ? -0.25 : 0.2); ctx.beginPath(); ctx.ellipse(p[0], p[1], 3 * k, 1.4 * k, 0, 0, Math.PI * 2); ctx.fill(); }
    });
    arDesenharNevoaDoHorizonte(a, cam);
}
// posições de uma peça na tela: o centro da vista (desl) vira a origem; no modo SEGUIR a planta se repete de lado
function arCopiasDaPeca(p, desl, repete) {
    const z = p.z - desl.z;
    if (!repete) return [{ x: p.x - desl.x, z }];
    const x0 = arModulo(p.x - desl.x + AR_PERIODO / 2, AR_PERIODO) - AR_PERIODO / 2;
    return [x0 - AR_PERIODO, x0, x0 + AR_PERIODO].filter(x => Math.abs(x) < 1350).map(x => ({ x, z }));
}
// opts: desl {x, z} (centro da vista), repete (modo SEGUIR), vermelha (índice da peça que invade outra), anima (desenha
// os efeitos agora: false = deixa para a passada de cada quadro)
// peça de base de cada peça empilhada (a pilha é desenhada de baixo para cima, na profundidade da peça do chão)
function arRaizesDasPilhas(pecas) {
    const raiz = pecas.map((p, i) => i);
    pecas.forEach((p, i) => {
        let atual = i, passos = 0;
        while (pecas[atual].b > 0 && passos++ < 12) {
            const q = pecas[atual], base = pecas.findIndex((r, j) => j !== atual && !ARENA_PECAS[r.t].ceu && (r.b || 0) < q.b
                && Math.abs((r.b || 0) + arenaAlturaPeca(r) - q.b) < 2 && arenaPontoNaPegada(arenaPegada(r) || { r: 0, x: r.x, z: r.z }, q.al ? q.al[0] : q.x, q.al ? q.al[1] : q.z));
            if (base < 0) break;
            atual = base;
        }
        raiz[i] = atual;
    });
    return raiz;
}
// desenha a peça com a base levantada (empilhada): subir a peça = baixar a câmera do mesmo tanto
function arDesenharPecaElevada(o, ang, t) {
    const antes = trCam;
    if (o.p.b > 0) trCam = Object.assign({}, antes, { H: antes.H - o.p.b });
    try { o.d.desenha(o.p, ang, t); } catch (e) { /* peça com erro não derruba o cenário */ }
    finally { trCam = antes; }
}
function arDesenharCena(a, ang, cam, opts) {
    const desl = opts.desl, repete = !!opts.repete;
    const comPos = (p, pos) => Object.assign({ _s: arSemente(p) }, p, pos);
    const plan = ARENA_PLANICIES[a.planicie];
    if (plan) plan.pecas.forEach(p => arCopiasDaPeca(p, desl, repete).forEach(pos => ARENA_PECAS[p.t].desenha(comPos(Object.assign({ r: 0, f: "circulo", v: 0 }, p), pos), ang)));
    const objs = [], raiz = a.pecas.some(p => p.b > 0) ? arRaizesDasPilhas(a.pecas) : null;
    const verm = [].concat(opts.vermelha === undefined || opts.vermelha === null ? [] : opts.vermelha);
    a.pecas.forEach((p, i) => {
        const d = ARENA_PECAS[p.t];
        if (d.ceu || (d.anim && !opts.anima) || (p.oc && opts.esconder)) return;
        const q = verm.includes(i) ? Object.assign({}, p, { c: "#ff3030" }) : p;
        arCopiasDaPeca(p, desl, repete).forEach(pos => {
            if (d.chao && !(p.v > 0) && !p.b) { d.desenha(comPos(q, pos), ang); return; }   // piso plano: embaixo de tudo, na ordem
            const z = trRot(pos.x, pos.z, ang)[1];
            if (z > cam.CORTE) return;   // perto da câmera demais: tamparia a luta
            // profundidade para ordenar: a da peça do chão da pilha (empilhadas logo depois dela, de baixo para cima)
            const r = raiz ? a.pecas[raiz[i]] : p;
            const zk = r === p ? z : trRot(pos.x + r.x - p.x, pos.z + r.z - p.z, ang)[1];
            objs.push({ z, zk, p: comPos(q, pos), d, i });
        });
    });
    // FUNDIR (recorte de verdade): cada peça do grupo sai na sua profundidade normal; depois da última do grupo, a
    // peça escolhida (fv) é desenhada de novo só dentro da região sobreposta (o volume em comum, visto na tela)
    objs.forEach(o => { o.k = o.zk; o.ult = 0; });
    objs.filter(o => a.pecas[o.i].g && a.pecas[o.i].fv).forEach(o => {
        const p = a.pecas[o.i], dx = o.p.x - p.x, dz = o.p.z - p.z;   // deslocamento desta cópia na tela
        const membros = a.pecas.map((q, j) => j).filter(j => j !== o.i && a.pecas[j].g === p.g);
        const regioes = arRegioesFundidas(p, membros.map(j => a.pecas[j]), dx, dz, ang);
        if (!regioes.length) return;
        let k = o.zk;
        objs.forEach(u => { if (membros.includes(u.i) && Math.abs(u.p.x - a.pecas[u.i].x - dx) < 1 && Math.abs(u.p.z - a.pecas[u.i].z - dz) < 1) k = Math.max(k, u.zk); });
        objs.push({ z: o.z, zk: k, k, ult: 1, p: o.p, d: o.d, i: o.i, recorte: regioes });
    });
    const t = arRelogio();
    objs.sort((u, v) => (u.k - v.k) || (u.ult - v.ult) || ((u.p.b || 0) - (v.p.b || 0)) || (u.z - v.z)).forEach(o => {
        if (o.recorte) {
            trG.save();
            trG.beginPath();
            o.recorte.forEach(r => { r.forEach((q, n) => n ? trG.lineTo(q[0], q[1]) : trG.moveTo(q[0], q[1])); trG.closePath(); });
            trG.clip();
            arDesenharPecaElevada(o, ang, t);
            trG.restore();
            return;
        }
        arDesenharPecaElevada(o, ang, t);
        if (verm.includes(o.i)) arDesenharPegadaVermelha(o.p, ang);
    });
}
// contorno da pegada (pontos [x, z] do mundo), deslocado para a cópia na tela
function arContornoPegada(g, dx, dz) {
    const pts = g.r !== undefined ? Array.from({ length: 20 }, (_, i) => { const t = i / 20 * Math.PI * 2; return [g.x + Math.cos(t) * g.r, g.z + Math.sin(t) * g.r]; }) : arRetCantos(g);
    return pts.map(q => [q[0] + dx, q[1] + dz]);
}
// interseção de dois polígonos convexos (Sutherland–Hodgman)
function arRecorteConvexo(A, B) {
    let area = 0;
    B.forEach((q, i) => { const r = B[(i + 1) % B.length]; area += q[0] * r[1] - r[0] * q[1]; });
    const lado = area >= 0 ? 1 : -1;
    let saida = A;
    for (let i = 0; i < B.length && saida.length; i++) {
        const e0 = B[i], e1 = B[(i + 1) % B.length], entrada = saida;
        const dentro = (q) => lado * ((e1[0] - e0[0]) * (q[1] - e0[1]) - (e1[1] - e0[1]) * (q[0] - e0[0])) >= 0;
        const corte = (p, q) => {
            const a1 = (e1[0] - e0[0]) * (p[1] - e0[1]) - (e1[1] - e0[1]) * (p[0] - e0[0]), a2 = (e1[0] - e0[0]) * (q[1] - e0[1]) - (e1[1] - e0[1]) * (q[0] - e0[0]);
            const t = a1 / (a1 - a2);
            return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
        };
        saida = [];
        entrada.forEach((q, j) => {
            const p = entrada[(j + entrada.length - 1) % entrada.length];
            if (dentro(q)) { if (!dentro(p)) saida.push(corte(p, q)); saida.push(q); }
            else if (dentro(p)) saida.push(corte(p, q));
        });
    }
    return saida;
}
// envoltória convexa (pontos da tela)
function arEnvoltoria(pts) {
    const p = pts.slice().sort((u, v) => u[0] - v[0] || u[1] - v[1]);
    if (p.length < 3) return p;
    const cruz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const baixo = [], cima = [];
    p.forEach(q => { while (baixo.length >= 2 && cruz(baixo[baixo.length - 2], baixo[baixo.length - 1], q) <= 0) baixo.pop(); baixo.push(q); });
    p.slice().reverse().forEach(q => { while (cima.length >= 2 && cruz(cima[cima.length - 2], cima[cima.length - 1], q) <= 0) cima.pop(); cima.push(q); });
    return baixo.slice(0, -1).concat(cima.slice(0, -1));
}
// regiões da tela onde a peça escolhida se sobrepõe às outras do grupo (o volume em comum projetado)
function arRegioesFundidas(p, outras, dx, dz, ang) {
    const g = arenaPegada(p);
    if (!g) return [];
    const A = arContornoPegada(g, dx, dz);
    const res = [];
    outras.forEach(q => {
        const h = arenaPegada(q);
        if (!h) return;
        const y0 = Math.max(g.y0, h.y0), y1 = Math.min(g.y1, h.y1);
        if (y1 <= y0) return;
        const C = arRecorteConvexo(A, arContornoPegada(h, dx, dz));
        if (C.length < 3) return;
        const tela = [];
        C.forEach(c => { tela.push(trProj(c[0], y0, c[1], ang)); tela.push(trProj(c[0], y1, c[1], ang)); });
        res.push(arEnvoltoria(tela.map(v => [v[0], v[1]])));
    });
    return res;
}
// área da peça pintada de vermelho no chão (invadindo outra peça)
function arDesenharPegadaVermelha(p, ang) {
    const g = arenaPegada(p);
    if (!g) return;
    const pts = g.r !== undefined
        ? Array.from({ length: 24 }, (_, i) => { const a = i / 24 * Math.PI * 2; return [g.x + Math.cos(a) * g.r, g.z + Math.sin(a) * g.r]; })
        : arRetCantos(g);
    trPoly(pts.map(q => trProj(q[0], 1 + (p.b || 0), q[1], ang)));
    trG.fillStyle = "rgba(255, 30, 30, 0.35)"; trG.fill();
    trG.strokeStyle = "#ff2a2a"; trG.lineWidth = 2; trG.stroke();
}
// efeitos (peças que se mexem): a cada quadro, por cima da camada guardada
function arDesenharAnimadas(a, ang, cam, opts) {
    const t = arRelogio();
    const objs = [];
    a.pecas.forEach(p => {
        const d = ARENA_PECAS[p.t];
        if (!d.anim || (p.oc && opts.esconder)) return;
        arCopiasDaPeca(p, opts.desl, !!opts.repete).forEach(pos => {
            const z = trRot(pos.x, pos.z, ang)[1];
            if (z <= cam.CORTE) objs.push({ z, p: Object.assign({ _s: arSemente(p) }, p, pos), d });
        });
    });
    objs.sort((u, v) => u.z - v.z).forEach(o => arDesenharPecaElevada(o, ang, t));
}
// desenha a arena no ctx do jogo. opts: cam (outra câmera), chave (cache), desl, andado (modo SEGUIR), vermelha
function drawArenaCriada(a, ang, opts) {
    opts = opts || {};
    const cam = opts.cam || ARENA_CAMERAS[a.camera] || ARENA_CAMERAS.media, anterior = trCam;
    const seguir = opts.andado !== undefined;
    const desl = { x: (opts.desl ? opts.desl.x : 0) + (seguir ? opts.andado : 0), z: opts.desl ? opts.desl.z : 0 };
    const cena = arCenaDe(opts.chave || a.id || "_previa", a);
    trCam = cam;
    try {
        const pano = arPanorama(a, cena, cam);
        if (!pano || !c3BlitPanorama(pano, seguir ? 0 : ang, cam.F, cam.CX)) { ctx.fillStyle = arCeuDaHora(a).topo; ctx.fillRect(0, 0, canvas.width, cam.HY + 2); }
        arDesenharChao(a, ang, cam, desl);
        const o = { desl, repete: seguir, vermelha: opts.vermelha, esconder: !!opts.esconder };
        if (seguir || opts.desl) {
            // a vista anda (SEGUIR) ou está centrada numa peça: desenha direto, sem a camada guardada
            trG = ctx;
            arDesenharCena(a, ang, cam, Object.assign({ anima: true }, o));
        } else {
            drawCachedOrbitLayer(cena, ang, (g) => arDesenharCena(a, g, cam, o));
            arDesenharAnimadas(a, ang, cam, o);
        }
        trG = ctx;
        arDesenharHora(a, ang, cam, o);
        arDesenharClima(a);
    } finally {
        trCam = anterior;
        trG = ctx;
    }
}
// ---- hora do dia: tarde alaranjada, noite escura com lampiões, luzes e lava brilhando ----
const AR_LUZES = { lampiao: 40, luz_pista: 14, lava: 2, coluna_lava: 60, arco_lava: 40, brasas: 20, cristal: 12 };
function arDesenharHora(a, ang, cam, o) {
    if (a.hora !== "tarde" && a.hora !== "noite") return;
    ctx.fillStyle = a.hora === "noite" ? "rgba(8, 14, 48, 0.5)" : "rgba(255, 120, 40, 0.13)";
    ctx.fillRect(0, cam.HY - 2, canvas.width, canvas.height - cam.HY + 2);
    if (a.hora !== "noite") return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    a.pecas.forEach(p => {
        const def = ARENA_PECAS[p.t], lava = p.t === "pincel" && p.m === "lava";
        if (def.ceu || (AR_LUZES[p.t] === undefined && !lava) || (p.oc && o.esconder)) return;
        const alto = (lava ? 1 : AR_LUZES[p.t]) * (p.e || 1) + (p.b || 0);
        arCopiasDaPeca(p, o.desl, o.repete).forEach(pos => {
            if (trRot(pos.x, pos.z, ang)[1] > cam.CORTE) return;
            const pr = trProj(pos.x, alto, pos.z, ang), k = pr[3];
            const r = (p.t === "lampiao" || p.t === "luz_pista" ? 34 : lava ? (p.w || 24) * 1.2 : 50) * (p.e || 1) * k;
            if (!(r > 1)) return;
            const g = ctx.createRadialGradient(pr[0], pr[1], 0, pr[0], pr[1], r);
            g.addColorStop(0, p.t === "lampiao" ? "rgba(255, 220, 140, 0.55)" : p.t === "luz_pista" || p.t === "cristal" ? "rgba(140, 210, 255, 0.45)" : "rgba(255, 110, 30, 0.5)");
            g.addColorStop(1, "rgba(0, 0, 0, 0)");
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pr[0], pr[1], r, 0, Math.PI * 2); ctx.fill();
        });
    });
    ctx.restore();
}
// ---- clima: ~60 partículas na tela (chuva, neve, neblina, vento com folhas), sem guardar nada por quadro ----
function arDesenharClima(a) {
    const tipo = a.clima;
    if (!tipo || tipo === "nenhum") return;
    const t = arRelogio(), W = canvas.width, H = canvas.height;
    ctx.save();
    if (tipo === "neblina") {
        ctx.fillStyle = "rgba(225, 230, 238, 0.22)"; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 5; i++) {
            const y = H * (0.3 + i * 0.13), x = ((c3Hash(i * 2.3) * W + t * (8 + i * 3)) % (W + 400)) - 200;
            const g = ctx.createRadialGradient(x, y, 0, x, y, 220);
            g.addColorStop(0, "rgba(240, 244, 250, 0.35)"); g.addColorStop(1, "rgba(240, 244, 250, 0)");
            ctx.fillStyle = g; ctx.fillRect(x - 220, y - 60, 440, 120);
        }
        ctx.restore();
        return;
    }
    if (tipo === "lava") {
        // brilho alaranjado embaixo, brasas subindo e gotas de lava caindo com rastro
        const g = ctx.createLinearGradient(0, H * 0.55, 0, H);
        g.addColorStop(0, "rgba(255, 90, 20, 0)"); g.addColorStop(1, "rgba(255, 90, 20, 0.22)");
        ctx.fillStyle = g; ctx.fillRect(0, H * 0.55, W, H * 0.45);
        for (let i = 0; i < 60; i++) {
            const sx = c3Hash(i * 1.37), sy = c3Hash(i * 2.71), sv = 0.6 + c3Hash(i * 4.13) * 0.8;
            if (i < 40) {   // brasas subindo, piscando
                const y = H - ((sy * H + t * 45 * sv) % (H + 10)), x = ((sx * W + Math.sin(t * 1.6 + i) * 10) % W + W) % W;
                ctx.fillStyle = `rgba(255, ${150 + Math.round(80 * sv) % 100}, 40, ${0.45 + 0.4 * Math.abs(Math.sin(t * 5 + i))})`;
                ctx.fillRect(x, y, 1.6 + sv, 1.6 + sv);
            } else {   // gotas de lava caindo
                const y = (sy * H + t * 210 * sv) % (H + 40) - 20, x = (sx * (W + 60) + y * 0.18) % (W + 60) - 30;
                ctx.strokeStyle = "rgba(255, 120, 30, 0.45)"; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y - 14); ctx.stroke();
                ctx.fillStyle = "#ffcf5a"; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
            }
        }
        ctx.restore();
        return;
    }
    if (tipo === "chuva") { ctx.strokeStyle = "rgba(200, 220, 255, 0.55)"; ctx.lineWidth = 1.2; ctx.beginPath(); }
    for (let i = 0; i < 60; i++) {
        const sx = c3Hash(i * 1.37), sy = c3Hash(i * 2.71), sv = 0.6 + c3Hash(i * 4.13) * 0.8;
        if (tipo === "chuva") {
            const y = (sy * H + t * 520 * sv) % (H + 20) - 10, x = (sx * (W + 60) - y * 0.25 + W) % (W + 60) - 30;
            ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 14);
        } else if (tipo === "neve") {
            const y = (sy * H + t * 40 * sv) % (H + 10) - 5, x = ((sx * W + Math.sin(t * 1.2 + i) * 14) % W + W) % W;
            ctx.fillStyle = "rgba(255, 255, 255, 0.85)"; ctx.beginPath(); ctx.arc(x, y, 1.2 + sv * 1.3, 0, Math.PI * 2); ctx.fill();
        } else if (tipo === "vento") {
            if (i >= 28) break;   // folhas: menos e maiores
            const x = (sx * (W + 80) + t * 160 * sv) % (W + 80) - 40, y = sy * H * 0.9 + Math.sin(t * 2.4 + i) * 16, gira = t * 4 * sv + i;
            ctx.save(); ctx.translate(x, y); ctx.rotate(gira);
            ctx.fillStyle = i % 3 === 0 ? "#c47a2c" : i % 3 === 1 ? "#6aa84f" : "#d9a441";
            ctx.beginPath(); ctx.ellipse(0, 0, 4.5, 2, 0, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }
    if (tipo === "chuva") ctx.stroke();
    ctx.restore();
}
function drawArenaCriadaStage(id, scroll) {
    const f = getFaseDef(id);
    if (!f || !f.arena) return;
    const capa = f.arena.capa;   // USAR COMO CAPA: o card e o começo da luta mostram essa vista
    if (f.arena.movimento === "seguir") drawArenaCriada(f.arena, 0, { andado: getForwardTravel(scroll) + (capa ? capa.andado : 0) });
    else drawArenaCriada(f.arena, getStageLapAngle(scroll, f.camera.volta || 10800) + (capa ? capa.ang : 0));
}


// ---------------- arquivo .arena.json ----------------
function dadosDaArenaParaArquivo(a) {
    const n = normalizarArena(a), arena = Object.assign({}, n);
    delete arena.id;
    return { formato: ARENA_FORMATO, versao: 1, arena };
}
function validarArquivoArena(dados) {
    if (!dados || typeof dados !== "object" || dados.formato !== ARENA_FORMATO || !dados.arena || typeof dados.arena !== "object") return { erro: "ESTE ARQUIVO NÃO É DE ARENA DO SAIYAN FIGHT." };
    if (!(Number(dados.versao) >= 1)) return { erro: arqErro("VERSÃO DO ARQUIVO INVÁLIDA", dados.versao) };
    if (Number(dados.versao) > 1) return { erro: "ARQUIVO FEITO POR UMA VERSÃO MAIS NOVA DO JOGO. ATUALIZE O JOGO." };
    const a = dados.arena;
    if (typeof a.nome !== "string" || !a.nome.trim()) return { erro: "FALTA O NOME DA ARENA (nome)." };
    if (a.chao !== undefined && (!a.chao || !ARENA_CHAOS[a.chao.tipo])) return { erro: arqErro("TIPO DE CHÃO DESCONHECIDO", a.chao && a.chao.tipo) };
    if (a.camera !== undefined && !ARENA_CAMERAS[a.camera]) return { erro: arqErro("CÂMERA DESCONHECIDA", a.camera) };
    if (a.movimento !== undefined && a.movimento !== "girar" && a.movimento !== "seguir") return { erro: arqErro("MOVIMENTO DESCONHECIDO", a.movimento) };
    if (a.planicie !== undefined && a.planicie !== "" && !ARENA_PLANICIES[a.planicie]) return { erro: arqErro("PLANÍCIE DESCONHECIDA", a.planicie) };
    if (a.hora !== undefined && !ARENA_HORAS.some(h => h[0] === a.hora)) return { erro: arqErro("HORA DO DIA DESCONHECIDA", a.hora) };
    if (a.clima !== undefined && !ARENA_CLIMAS.some(c => c[0] === a.clima)) return { erro: arqErro("CLIMA DESCONHECIDO", a.clima) };
    if (a.pecas !== undefined && !Array.isArray(a.pecas)) return { erro: "LISTA DE PEÇAS INVÁLIDA (pecas)." };
    const pecas = a.pecas || [];
    if (pecas.length > ARENA_PECAS_MAX) return { erro: arqErro("PEÇAS DEMAIS (MÁXIMO 80)", pecas.length) };
    const ruim = pecas.find(q => !q || typeof q !== "object" || !ARENA_PECAS[q.t]);
    if (ruim) return { erro: arqErro("PEÇA DESCONHECIDA", ruim && ruim.t) };
    const n = normalizarArena(a);
    n.id = "";
    return { arena: n };
}


const AR_ARVORES = { coqueiro: 1, palmeira: 1, arvore: 1, arbusto: 1, cipreste: 1 };

const AR_DOMOS = { domo: 1, casa_domo: 1, torre: 1, torre_mirante: 1, capsula: 1, casco_nave: 1 };

function arenaDesenharPlantaForma(g, p, def, s) {
    const pts = arFormaPontos(p.f, def.forma, arSemente(p));
    g.beginPath();
    pts.forEach((q, i) => { const x = q[0] * s * p.e, y = q[1] * s * p.e; i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.closePath();
}

function arenaMaqueteChao(g, a, s) {
    const ch = a.chao, base = ch.cor, R = ARENA_RAIO;
    const [x0, y0] = arenaMundoParaPlanta(-R, -R), [x1, y1] = arenaMundoParaPlanta(R, R);
    g.fillStyle = base; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    if (ch.tipo === "ladrilho") {
        g.strokeStyle = "rgba(90, 95, 110, 0.35)"; g.lineWidth = 1; g.beginPath();
        for (let v = -R; v <= R; v += 80) { const [a1, b1] = arenaMundoParaPlanta(v, -R), [a2, b2] = arenaMundoParaPlanta(v, R), [c1, d1] = arenaMundoParaPlanta(-R, v), [c2, d2] = arenaMundoParaPlanta(R, v); g.moveTo(a1, b1); g.lineTo(a2, b2); g.moveTo(c1, d1); g.lineTo(c2, d2); }
        g.stroke();
        return;
    }
    AR_DETALHES.forEach(d => {
        if (Math.abs(d.x) > R || Math.abs(d.z) > R) return;
        const [px, py] = arenaMundoParaPlanta(d.x, d.z), k = Math.max(0.6, s * 2.2);
        if (ch.tipo === "grama") { g.strokeStyle = arMix(base, -0.3); g.lineWidth = 1; g.beginPath(); g.moveTo(px - 2 * k, py + 1.5 * k); g.lineTo(px - k, py - 1.5 * k); g.moveTo(px + k, py + 1.5 * k); g.lineTo(px + 1.5 * k, py - 1.5 * k); g.stroke(); }
        else if (ch.tipo === "mar") { g.strokeStyle = "rgba(255, 255, 255, 0.5)"; g.lineWidth = 1; g.beginPath(); g.arc(px, py, 3 * k, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
        else if (ch.tipo === "nuvens") { g.fillStyle = "rgba(255, 255, 255, 0.6)"; g.beginPath(); g.ellipse(px, py, 7 * k, 3 * k, 0, 0, Math.PI * 2); g.fill(); }
        else if (ch.tipo === "espaco") { g.fillStyle = d.s > 0.5 ? "#ffffff" : "#a5b4fc"; g.fillRect(px, py, 1.2, 1.2); }
        else if (ch.tipo === "lava") { g.strokeStyle = "rgba(255, 140, 40, 0.8)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(px - 4 * k, py); g.lineTo(px, py + k); g.lineTo(px + 4 * k, py - k); g.stroke(); }
        else { g.fillStyle = arMix(base, d.s > 0.5 ? -0.25 : 0.2); g.beginPath(); g.ellipse(px, py, 1.6 * k, k, 0, 0, Math.PI * 2); g.fill(); }
    });
}

function arenaMaquetePeca(g, p, def, s, cor) {
    const e = (p.e || 1) * s, c = cor || p.c, borda = arMix(c, -0.35);
    g.lineWidth = 1;
    if (def.pincel) {
        g.strokeStyle = c; g.lineWidth = Math.max(2, (p.w || 24) * e); g.lineCap = g.lineJoin = "round";
        g.beginPath(); (p.pts || [[0, 0]]).forEach((q, k) => { const x = q[0] * e, y = q[1] * e; k ? g.lineTo(x, y) : g.moveTo(x, y); });
        if ((p.pts || []).length < 2) g.lineTo(0.01, 0);
        g.stroke();
        return;
    }
    if (def.forma) {
        const pts = arFormaPontos(p.f, def.forma, arSemente(p));
        const contorno = (k) => { g.beginPath(); pts.forEach((q, n) => { const x = q[0] * e * k, y = q[1] * e * k; n ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); };
        contorno(1); g.fillStyle = c; g.fill();
        if (p.v > 0) { for (let k = 1; k <= Math.ceil(p.v); k++) { contorno(1 - k * 0.22); g.fillStyle = arMix(c, 0.08 * k); g.fill(); } contorno(1); g.strokeStyle = borda; g.stroke(); }
        if (p.t === "lava") { contorno(0.55); g.fillStyle = "#ffc04d"; g.fill(); }
        return;
    }
    if (def.planta && def.planta.ret) {
        const w = def.planta.ret[0] * e, d = def.planta.ret[1] * e;
        if (p.t === "predio") { g.fillStyle = "#eef2f7"; g.fillRect(-w, -d, w * 2, d * 2); g.fillStyle = c; g.fillRect(-w * 0.84, -d * 0.8, w * 1.68, d * 1.6); }
        else if (p.t === "ringue") {
            g.fillStyle = arMix(c, -0.15); g.fillRect(-w * 1.07, -d * 1.07, w * 2.14, d * 2.14); g.fillStyle = c; g.fillRect(-w, -d, w * 2, d * 2);
            g.strokeStyle = "rgba(90, 90, 100, 0.45)"; g.beginPath(); for (let k = -3; k <= 3; k++) { g.moveTo(k * w / 4, -d); g.lineTo(k * w / 4, d); g.moveTo(-w, k * d / 4); g.lineTo(w, k * d / 4); } g.stroke();
        } else if (p.t === "escada") {
            for (let k = 0; k < 4; k++) { g.fillStyle = arMix(c, 0.06 * k); g.fillRect(-w, -d + k * d / 2, w * 2, d * 2 - k * d / 2); }
        } else if (p.t === "pilar") { g.fillStyle = c; g.fillRect(-w, -d, w * 2, d * 2); g.fillStyle = arMix(c, 0.15); g.fillRect(-w * 0.66, -d * 0.66, w * 1.32, d * 1.32); }
        else if (p.t === "portao") { g.fillStyle = "#2b2b2b"; g.fillRect(-w * 1.15, -d, w * 2.3, d * 2); g.fillStyle = c; g.fillRect(-w * 0.9, -d * 0.6, w * 0.2, d * 1.2); g.fillRect(w * 0.7, -d * 0.6, w * 0.2, d * 1.2); }
        else { g.fillStyle = c; g.fillRect(-w, -d, w * 2, d * 2); if (def.chao) return; }
        g.strokeStyle = borda; g.strokeRect(-w, -d, w * 2, d * 2);
        return;
    }
    const r = Math.max(2.5, ((def.planta && def.planta.circ) || 8) * e);
    if (AR_ARVORES[p.t]) {
        g.fillStyle = arMix(c, -0.25); g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
        g.fillStyle = c; g.beginPath(); g.arc(-r * 0.15, -r * 0.15, r * 0.75, 0, Math.PI * 2); g.fill();
        g.fillStyle = arMix(c, 0.25); g.beginPath(); g.arc(-r * 0.3, -r * 0.3, r * 0.3, 0, Math.PI * 2); g.fill();
    } else if (AR_DOMOS[p.t]) {
        const gr = g.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
        gr.addColorStop(0, arMix(c, 0.45)); gr.addColorStop(1, arMix(c, -0.15));
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); g.strokeStyle = borda; g.stroke();
    } else if (p.t === "cristal") {
        g.fillStyle = c; g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 0.7, 0); g.lineTo(0, r); g.lineTo(-r * 0.7, 0); g.closePath(); g.fill(); g.strokeStyle = borda; g.stroke();
    } else if (def.anim) {
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, r * 1.3);
        gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.4, c); gr.addColorStop(1, "rgba(0, 0, 0, 0)");
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 1.3, 0, Math.PI * 2); g.fill();
    } else {
        g.fillStyle = c; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
        g.fillStyle = arMix(c, 0.2); g.beginPath(); g.arc(-r * 0.25, -r * 0.25, r * 0.45, 0, Math.PI * 2); g.fill();
        g.strokeStyle = borda; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
    }
}

function arenaRaioPeca(p) {
    const def = ARENA_PECAS[p.t];
    if (def.pincel) return (Math.max(0, ...(p.pts || [[0, 0]]).map(q => Math.hypot(q[0], q[1]))) + (p.w || 24) / 2) * (p.e || 1);
    return (def.forma ? arRaioForma(p, def.forma) : def.planta ? (def.planta.circ || Math.max(...def.planta.ret)) : 30) * (p.e || 1);
}

function arenaCameraPerto(p) {
    const def = ARENA_PECAS[p.t], e = p.e || 1;
    const raio = arenaRaioPeca(p);
    const alto = AR_ALTURAS[p.t] || 40;
    const D = Math.max(170, Math.min(900, Math.max(raio * 3.4, alto * e * 2.4) + 110));
    // peça empilhada: a câmera sobe junto (a peça fica no mesmo lugar da tela)
    return { CX: 400, HY: 70, D, H: Math.max(60, D * 0.36) + (p.b || 0), F: 560, PERTO: 20, CORTE: D * 0.5 };
}

  return {
    /** EDITOR DE ARENAS do jogo novo: as tabelas e funções do arenas.js (peças, planícies, validação, planta) */
    editor: {
      PECAS: ARENA_PECAS, PLANICIES: ARENA_PLANICIES, CHAOS: ARENA_CHAOS, CAMERAS: ARENA_CAMERAS, HORAS: ARENA_HORAS, CLIMAS: ARENA_CLIMAS,
      FORMATOS: ARENA_FORMATOS, PINCEL: ARENA_PINCEL, ABAS: ARENA_ABAS, MAX: ARENA_MAX, PECAS_MAX: ARENA_PECAS_MAX, RAIO: ARENA_RAIO,
      PINCEL_PONTOS: ARENA_PINCEL_PONTOS, ANIMADAS_MAX: ARENA_ANIMADAS_MAX, GRADE: ARENA_GRADE, FORMATO: ARENA_FORMATO,
      normalizar: (a) => normalizarArena(a), padrao: () => arenaPadrao(), normalizarPeca: (q) => normalizarPecaArena(q),
      pegada: (p) => arenaPegada(p), colide: (pecas, p, ignorar) => arenaPecaColide(pecas, p, ignorar), raio: (p) => arenaRaioPeca(p),
      paraArquivo: (a) => dadosDaArenaParaArquivo(a), validarArquivo: (d) => validarArquivoArena(d), alturaPeca: (p) => arenaAlturaPeca(p),
      /** desenha a arena `a` (já normalizada) neste canvas, com a câmera em `ang` (ou andando `andado` no SEGUIR) */
      previa(a, ang, opts) {
        ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        drawArenaCriada(a, ang, opts || {});
      },
      cameraPerto: (p) => arenaCameraPerto(p),
      /** planta: o chão (g = contexto da planta de lado `lado`, escala s px/unidade, centro c) e uma peça já no centro dela */
      plantaChao(g, a, s, lado, c) { plantaEscala = s; plantaLado = lado; plantaCentro = c || { x: 0, z: 0 }; arenaMaqueteChao(g, a, s); },
      plantaPeca(g, p, s, cor) { arenaMaquetePeca(g, p, ARENA_PECAS[p.t], s, cor); },
    },
    /** desenha a arena `id` com o avanço `scroll` (1,5 por quadro, como o antigo) e o relógio `t` em segundos */
    desenhar(id, scroll, t) {
      selectedStage = id;
      world.stageScrollX = scroll;
      gameplayClock = t;
      ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
      ctx.imageSmoothingEnabled = true;
      drawStageBackground();
    },
    /** MAPA DE FASES: o desenho do antigo (céu, horizonte, objetos e estrada) com a rolagem `rolagem` */
    mapa: {
      TOTAL_FASES: MAPA_TOTAL_FASES, NO_R: 26,
      posicao: (i) => getMapaPosicaoFase(i),
      limitar: (r, total) => limitarRolagemMapa(r, total),
      rolagemPara: (i, total) => rolagemParaFase(i, total),
      traducao(f) { traduzir = f; },
      desenhar(rolagem, total, acesaAte) {
        mapaTotal = total;
        ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
        drawMapaFundo(rolagem);
        const de = Math.max(0, Math.floor((rolagem - MAPA_MARGEM_X) / MAPA_PASSO_X) - 1);
        const ate = Math.min(total - 1, Math.ceil((rolagem + 800 - MAPA_MARGEM_X) / MAPA_PASSO_X) + 1);
        const pontos = [];
        for (let i = de; i <= ate; i++) { const p = getMapaPosicaoFase(i); pontos.push({ x: p.x - rolagem, y: p.y }); }
        drawMapaEstrada(pontos, acesaAte - de);
      },
      sombra: (x, y, r) => drawMapaSombraFase(x, y, r),
      placa: (x, y) => drawMapaPlaca(x, y),
      cadeado: (x, y, s, aberto) => drawPadlock(x, y, s, aberto || 0),
      foto: (x, y, r, img) => drawStageThumbCircle(x, y, r, img),
      ctx: () => ctx,
    },
    /** troca a resolução (pixels reais por pixel do jogo); as imagens guardadas se refazem sozinhas (c3Valida) */
    escala(k) {
      renderScale = k;
      canvasEl.width = Math.round(GAME_WIDTH * k);
      canvasEl.height = Math.round(GAME_HEIGHT * k);
    },
  };
}
