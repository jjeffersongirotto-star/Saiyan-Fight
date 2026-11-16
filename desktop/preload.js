// desktop/preload.js — o que o jogo enxerga do app de PC (window.saiyanDesktop), usado por
// novo/src/app/plataforma.ts: procurar/baixar a versão nova (pelo processo do app, sem CORS), o progresso REAL do
// download (bytes) e o aviso de que o jogo abriu (pronto) para a troca de versão ficar valendo.
"use strict";
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("saiyanDesktop", {
  versaoDoApp: ipcRenderer.sendSync("versao-do-app"),
  procurar: () => ipcRenderer.invoke("procurar"),
  baixar: (d) => ipcRenderer.invoke("baixar", d),
  aoProgresso: (f) => { const h = (_e, p) => f(p); ipcRenderer.on("progresso", h); return () => ipcRenderer.removeListener("progresso", h); },
  reiniciar: () => ipcRenderer.send("reiniciar"),
  pronto: () => ipcRenderer.send("pronto"),
});
