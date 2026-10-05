// tests/selecao-parry-controle.test.js
// - SELEÇÃO DE PERSONAGEM pergunta antes de trocar (herói e vilão); no VERSUS a lista tem todos os personagens;
// - parry: a área é o escudo em volta do corpo (PARRY_RADIUS), sem círculo grande separado;
// - controle: sensibilidade do analógico salva, analógico direito rola UPDATES, touchpad alterna tela cheia.
//
// Uso: node tests/selecao-parry-controle.test.js

const { createHarness } = require("./harness.js");
const h = createHarness(__dirname + "/..", 800);
const { run, check, summary } = h;
run("deltaTime = 1/60");

// ---------- seleção com confirmação ----------
run("gameMode = 'singleplayer'; currentTab = 'HERÓIS'; charactersScrollY = 0; setGameState('characters')");
const chars = run("getFilteredCharacters()");
const antes = run("selectedCharacter");
const idx = chars.findIndex(k => k !== antes);
const card = run(`getCharacterCardRect(${idx})`);
run(`handleMenuClick(${card.x + card.w / 2}, ${card.y + card.h / 2})`);
check("clicar num herói abre a pergunta e ainda não troca", run("document.getElementById('modal-alert').style.display") === "flex" && run("selectedCharacter") === antes);
check("a pergunta cita o personagem", String(run("document.getElementById('modal-alert-msg').innerText")).includes(run(`characterDB['${chars[idx]}'].name`)));
run("executeSystemConfirm(false)");
check("CANCELAR não troca", run("selectedCharacter") === antes);
run(`handleMenuClick(${card.x + card.w / 2}, ${card.y + card.h / 2}); executeSystemConfirm(true)`);
check("SELECIONAR troca o herói", run("selectedCharacter") === chars[idx]);

run("currentTab = 'VILÕES'");
const viloes = run("getFilteredCharacters()");
const bossAntes = run("selectedBoss");
const vi = viloes.findIndex(k => k !== bossAntes);
const vcard = run(`getCharacterCardRect(${vi})`);
run(`handleMenuClick(${vcard.x + vcard.w / 2}, ${vcard.y + vcard.h / 2})`);
check("vilão também pergunta antes", run("selectedBoss") === bossAntes && run("document.getElementById('modal-alert').style.display") === "flex");
run("executeSystemConfirm(true)");
check("vilão trocado depois de confirmar", run("selectedBoss") === viloes[vi]);

run("gameMode = 'coop'");
const todos = run("Object.keys(characterDB).length");
check("VERSUS: jogador 1 vê todos os personagens", run("currentTab = 'HERÓIS'; getFilteredCharacters().length") === todos);
check("VERSUS: jogador 2 vê todos os personagens", run("currentTab = 'VILÕES'; getFilteredCharacters().length") === todos);
run("gameMode = 'singleplayer'; currentTab = 'HERÓIS'; setGameState('menu')");

// ---------- parry ----------
run("gameMode = 'singleplayer'; stageMode = 'normal'; startGame(); world.obstacles = []; player.parryCooldown = 0");
const cx = run("player.x + player.w / 2"), cy = run("player.y + player.h / 2");
run(`world.obstacles.push({ x: ${cx} + 45, y: ${cy}, vx: -4, vy: 0, radius: 6, fromPlayer: false, damage: 1 })`);
run(`world.obstacles.push({ x: ${cx} + 90, y: ${cy}, vx: -4, vy: 0, radius: 6, fromPlayer: false, damage: 1 })`);
run("tryReflect(player, false)");
check("parry rebate o tiro que encosta no escudo em volta do corpo", run("world.obstacles[0].fromPlayer") === true);
check("parry não alcança longe do corpo (sem bola gigante)", run("world.obstacles[1].fromPlayer") === false);
check("não existe mais o círculo grande separado", run("typeof drawParryRing") === "undefined");
run("setGameState('menu')");

// ---------- controle ----------
run("setGameState('options_gamepad'); padSensitivity = 3");
const mais = run("MENU_LAYOUT.optionsGamepad.sensMore"), menos = run("MENU_LAYOUT.optionsGamepad.sensLess");
run(`handleMenuClick(${mais.x + 5}, ${mais.y + 5})`);
check("+ aumenta a sensibilidade", run("padSensitivity") === 4);
check("sensibilidade fica salva", run("readStorage('saiyan_pad_sens')") === "4");
const padCom = (eixos, botao) => `navigator.getGamepads = () => [{ index: 0, connected: true, id: 'pad', mapping: 'standard', axes: ${JSON.stringify(eixos)}, buttons: Array.from({ length: 18 }, (_, i) => ({ pressed: i === ${botao}, value: i === ${botao} ? 1 : 0 })) }]`;
run(padCom([0.35, 0, 0, 0], -1));
check("mais sensível: inclinar pouco já move", run("getPadIntent(getConnectedGamepads()[0]).right") === true);
run(`handleMenuClick(${menos.x + 5}, ${menos.y + 5}); handleMenuClick(${menos.x + 5}, ${menos.y + 5}); handleMenuClick(${menos.x + 5}, ${menos.y + 5})`);
check("menos sensível: a mesma inclinação não move", run("padSensitivity") === 1 && run("getPadIntent(getConnectedGamepads()[0]).right") === false);
run("padSensitivity = 3; saveControls()");

// touchpad → tela cheia
run("setGameState('menu'); window.__telaCheia = 0; toggleFullscreen = () => { window.__telaCheia++; }; padPrevTouchpad = false");
run(padCom([0, 0, 0, 0], 17));
run("pollGamepadMenu(1/60); pollGamepadMenu(1/60)");
check("touchpad alterna a tela cheia uma vez por toque", run("window.__telaCheia") === 1);
run("navigator.getGamepads = () => []; pollGamepadMenu(1/60)");

// analógico direito rola UPDATES
run("(() => { const m = document.getElementById('modal-updates'); m.style.display = 'flex'; })()");
const temRolavel = run("(() => { const m = document.getElementById('modal-updates'); const el = m.querySelector && m.querySelector('ul'); if (!el) return false; Object.defineProperty(el, 'scrollHeight', { value: 900, configurable: true }); Object.defineProperty(el, 'clientHeight', { value: 100, configurable: true }); el.scrollTop = 0; return true; })()");
if (temRolavel) {
    run(padCom([0, 0, 0, 1], -1));
    run("pollGamepadMenu(1/60)");
    check("analógico direito rola o texto de UPDATES", run("document.getElementById('modal-updates').querySelector('ul').scrollTop") > 0);
}
run("navigator.getGamepads = () => []; document.getElementById('modal-updates').style.display = 'none'");

process.exit(summary());
