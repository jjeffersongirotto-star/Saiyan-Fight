// ==================== STORAGE.JS - PERSISTÊNCIA GENÉRICA ====================
// Extraído de database.js: helpers de localStorage usados por todo o jogo.
// Deve ser carregado ANTES de database.js, gameplay.js e menu.js.

function readStorage(key) {
    try {
        return window.localStorage.getItem(key);
    } catch (e) {
        return null;
    }
}

function writeStorage(key, value) {
    try {
        window.localStorage.setItem(key, value);
        return true;
    } catch (e) {
        return false;
    }
}

function readJsonStorage(key, fallback) {
    const raw = readStorage(key);
    if (!raw) return fallback;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return fallback;
    }
}

