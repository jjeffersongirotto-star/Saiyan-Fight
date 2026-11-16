// desktop/teste.js — `node --test teste.js`: a troca de versão do app de PC (sem abrir o Electron).
"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const AdmZip = require("adm-zip");
const at = require("./atualizador");

function pacote(texto) {
  const z = new AdmZip();
  z.addFile("index.html", Buffer.from(`<html>${texto}</html>`));
  z.addFile("assets/a.js", Buffer.from("1"));
  return z.toBuffer();
}

test("abre o jogo embutido, troca para o baixado, confirma e volta se não confirmar", () => {
  const dados = fs.mkdtempSync(path.join(os.tmpdir(), "sf-"));
  const embutida = fs.mkdtempSync(path.join(os.tmpdir(), "sf-emb-"));
  fs.writeFileSync(path.join(embutida, "index.html"), "x");
  assert.strictEqual(at.pastaAtiva(dados, embutida), embutida);

  const p1 = at.instalarZip(dados, pacote("v1"), "0.137-400", 400);
  assert.strictEqual(at.pastaAtiva(dados, embutida), p1);
  assert.strictEqual(at.lerAtual(dados).pendente, true);
  at.confirmar(dados);
  assert.strictEqual(at.lerAtual(dados).pendente, false);

  // versão nova que nunca confirma: ao abrir de novo o app volta para a 1
  const p2 = at.instalarZip(dados, pacote("v2"), "0.138-401", 401);
  assert.strictEqual(at.pastaAtiva(dados, embutida), p2);
  assert.strictEqual(at.conferirAoAbrir(dados), "voltou");
  assert.strictEqual(at.pastaAtiva(dados, embutida), p1);

  // a primeira versão baixada que falha volta para o jogo embutido
  const d2 = fs.mkdtempSync(path.join(os.tmpdir(), "sf-"));
  at.instalarZip(d2, pacote("v1"), "x", 1);
  at.voltar(d2);
  assert.strictEqual(at.pastaAtiva(d2, embutida), embutida);
});

test("pedidos do jogo não saem da pasta", () => {
  const pasta = path.resolve("/tmp/jogo");
  assert.strictEqual(at.arquivoDoPedido(pasta, "jogo://local/"), path.join(pasta, "index.html"));
  assert.strictEqual(at.arquivoDoPedido(pasta, "jogo://local/atlas/goku-ssj.json"), path.join(pasta, "atlas", "goku-ssj.json"));
  assert.strictEqual(at.arquivoDoPedido(pasta, "jogo://local/..%2F..%2Fetc%2Fpasswd"), null);
});

test("pacote com caminho para fora é recusado; sha256", () => {
  const dados = fs.mkdtempSync(path.join(os.tmpdir(), "sf-"));
  const z = new AdmZip(); z.addFile("index.html", Buffer.from("x"));
  z.getEntries()[0].entryName = "../fora.html";
  assert.throws(() => at.instalarZip(dados, z.toBuffer(), "mau", 1));
  assert.strictEqual(at.sha256(Buffer.from("abc")), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});
