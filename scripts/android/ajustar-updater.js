// scripts/android/ajustar-updater.js — roda sozinho depois do `npm ci`/`npm install` da raiz (postinstall).
// O @capgo/capacitor-updater (download do jogo novo dentro do APK) só avisa o download de 10 em 10%, com os bytes
// presos entre 10 e 70% (de 70 a 100% dos bytes ele fica parado em 70). Para a tela ATUALIZAÇÕES mostrar o que
// está sendo baixado DE VERDADE, em tempo real (v0.133), este script ajusta o código Android do plugin:
//  - os bytes baixados viram 10..70 em linha reta (10 + 60 × baixados/total), em vez de presos entre 10 e 70;
//  - avisa a cada ponto (≈1,7% dos bytes), em vez de a cada 10.
// Depois disso o plugin continua igual: 75..90 = descompactando, 100 = pronto (o jogo lê isso em
// novo/src/logica/atualizacao.ts, faseDoDownload). É mudança NATIVA: exige o APK novo (package.json da raiz 1.1.0).
// Falha alto se o código do plugin mudou (atualização da versão) para não gerar um APK sem o ajuste.
"use strict";
const fs = require("fs");
const path = require("path");

const ARQ = path.join(__dirname, "..", "..", "node_modules", "@capgo", "capacitor-updater", "android", "src", "main", "java", "ee", "forgr", "capacitor_updater", "DownloadService.java");
const MARCA = "// saiyan-fight: progresso real";

const TROCAS = [
    [
        `        int percent = (int) (((double) downloadedBytes / contentLength) * 100);
        percent = Math.max(10, percent);
        percent = Math.min(70, percent);
        return percent;`,
        `        ${MARCA}: bytes baixados em linha reta de 10 a 70
        double parte = Math.max(0, Math.min(1, (double) downloadedBytes / contentLength));
        return 10 + (int) (parte * 60);`,
    ],
    [
        `                        if (percent >= lastNotifiedPercent[0] + 10) {
                            lastNotifiedPercent[0] = (percent / 10) * 10;
                            setProgress(lastNotifiedPercent[0]);
                        }`,
        `                        ${MARCA}: avisa a cada ponto, não a cada 10
                        if (percent > lastNotifiedPercent[0]) {
                            lastNotifiedPercent[0] = percent;
                            setProgress(percent);
                        }`,
    ],
];

function ajustar() {
    if (!fs.existsSync(ARQ)) { console.log("ajustar-updater: plugin não instalado, nada a fazer"); return; }
    let s = fs.readFileSync(ARQ, "utf8");
    if (s.includes(MARCA)) { console.log("ajustar-updater: já ajustado"); return; }
    for (const [de, para] of TROCAS) {
        if (!s.includes(de)) throw new Error("ajustar-updater: o código do @capgo/capacitor-updater mudou; revise scripts/android/ajustar-updater.js");
        s = s.replace(de, para);
    }
    fs.writeFileSync(ARQ, s);
    console.log("ajustar-updater: progresso do download em tempo real ativado");
}

module.exports = { ajustar, ARQ, MARCA };
if (require.main === module) ajustar();
