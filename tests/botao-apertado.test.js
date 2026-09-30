// tests/botao-apertado.test.js — botões se comportam como botões físicos: ao encostar o dedo/segurar o mouse o
// botão "afunda" (desenhado menor e mais baixo); ao SOLTAR ele sobe de volta ao lugar e, no menu, a ação só
// acontece depois dessa subida. Arrastar o dedo para fora antes de soltar cancela. Os botões da partida (ATAQUE
// etc.) continuam agindo na hora, só fazem a animação na tela.
//
// Uso: node tests/botao-apertado.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, fire, touch, summary } = h;

const centerOf = (expr) => run(`(() => { const r = ${expr}; return [r.x + r.w / 2, r.y + r.h / 2]; })()`);
const pressed = (expr) => run(`(() => { const r = ${expr}; return isRectPressed(r.x, r.y, r.w, r.h); })()`);
run("isTouchDevice = true");

// ---------- toque no menu: afunda ao encostar, age ao soltar ----------
run("setGameState('menu')");
const [px, py] = centerOf("MENU_LAYOUT.main.play");
fire("touchstart", [touch(1, px, py)], [touch(1, px, py)]);
check("encostar o dedo em JOGAR ainda não troca de tela", run("gameState") === "menu");
check("enquanto o dedo está em cima, JOGAR aparece apertado", pressed("MENU_LAYOUT.main.play"));
check("os outros botões não aparecem apertados", !pressed("MENU_LAYOUT.main.options"));
h.calls.length = 0;
run("render()");
check("o desenho do botão apertado sai encolhido (afundado)", h.calls.some(c => c[0] === "scale" && c[1][0] === 0.94));
fire("touchend", [], [touch(1, px, py)]);
const subindo = run("(() => { const r = MENU_LAYOUT.main.play; return getPressAmount(r.x, r.y, r.w, r.h); })()");
check("ao soltar, JOGAR começa a subir de volta ao lugar (meio afundado)", subindo > 0 && subindo <= 1, String(subindo));
check("enquanto o botão sobe, a tela ainda não mudou", run("gameState") === "menu");
run("buttonRelease.start -= 1000");
check("depois de subir, JOGAR está de volta no lugar (sem afundar)", !pressed("MENU_LAYOUT.main.play"));
run("flushButtonActions()");
check("terminada a subida, JOGAR age (vai para a escolha de modo)", run("gameState") === "mode_select");
check("o botão da tela nova no mesmo lugar não aparece apertado por engano", !pressed("MENU_LAYOUT.modeSelect.single"));

// ---------- arrastar o dedo para fora antes de soltar cancela ----------
run("setGameState('menu')");
fire("touchstart", [touch(2, px, py)], [touch(2, px, py)]);
fire("touchmove", [touch(2, px + 120, py + 80)], [touch(2, px + 120, py + 80)]);
check("arrastou o dedo para fora: JOGAR volta a ficar solto", !pressed("MENU_LAYOUT.main.play"));
fire("touchend", [], [touch(2, px + 120, py + 80)]);
run("flushButtonActions()");
check("soltar longe do botão cancela (continua no menu)", run("gameState") === "menu");

// ---------- mouse: afunda enquanto segura; o clique continua acontecendo ao soltar ----------
run("setGameState('options_audio'); sfxVolume = 0.5");
const [mx, my] = centerOf("MENU_LAYOUT.optionsAudio.sfxPlus");
run(`canvas.onmousedown({ clientX: ${mx}, clientY: ${my}, button: 0, preventDefault() {} })`);
check("mouse segurando o '+': ele aparece apertado", pressed("MENU_LAYOUT.optionsAudio.sfxPlus"));
run(`canvas.onmouseup({ clientX: ${mx}, clientY: ${my}, button: 0, preventDefault() {} })`);
run(`canvas.onclick({ clientX: ${mx}, clientY: ${my} })`);
check("depois de soltar o mouse, o '+' está subindo de volta (ainda um pouco afundado)", pressed("MENU_LAYOUT.optionsAudio.sfxPlus"));
run("flushButtonActions()");
check("clique de mouse no '+' aumenta o volume", Math.abs(run("sfxVolume") - 0.6) < 1e-9);
run("buttonRelease.start -= 1000");
check("e logo depois volta ao lugar", !pressed("MENU_LAYOUT.optionsAudio.sfxPlus"));

// ---------- partida: botão ATAQUE age na hora e afunda enquanto o dedo segura ----------
run("gameMode = 'singleplayer'; stageMode = 'normal'; startGame(); runStats.attacks = 0");
const a = run("getHudButtonRect('attack')");
const [ax, ay] = [a.x + a.w / 2, a.y + a.h / 2];
fire("touchstart", [touch(3, ax, ay)], [touch(3, ax, ay)]);
check("ATAQUE atira na hora do toque (sem esperar soltar)", run("runStats.attacks") === 1);
check("ATAQUE aparece apertado enquanto o dedo segura", run("getHudPressAmount('attack')") === 1);
fire("touchend", [], [touch(3, ax, ay)]);
const hudSubindo = run("getHudPressAmount('attack')");
check("soltou: ATAQUE começa a subir de volta", hudSubindo > 0 && hudSubindo <= 1);
run("hudReleaseStart.attack -= 1000");
check("e volta ao lugar", run("getHudPressAmount('attack')") === 0);

// ---------- botão de pausa: afunda e pausa ao soltar ----------
const pr = run("getPauseButtonRect()");
const [qx, qy] = [pr.x + pr.w / 2, pr.y + pr.h / 2];
fire("touchstart", [touch(4, qx, qy)], [touch(4, qx, qy)]);
check("encostar na pausa ainda não pausa (o botão está afundado)", run("gameState") === "playing" && pressed("getPauseButtonRect()"));
fire("touchend", [], [touch(4, qx, qy)]);
run("flushButtonActions()");
check("ao soltar (depois de o botão subir), pausa", run("gameState") === "paused");

run("setGameState('menu')");
process.exit(summary());
