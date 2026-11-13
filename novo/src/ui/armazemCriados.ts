// Onde o EDITOR DE PERSONAGENS do jogo novo guarda os personagens: IndexedDB `saiyan-novo` (loja `personagens`,
// um registro por personagem, com as imagens dos quadros). IndexedDB porque as imagens não cabem no localStorage.
// Nunca toca no banco do antigo (`saiyan_conjuntos`) nem no `saiyan_db_v8_8bit`.
import { normalizarPersonagem, type PersonagemEditavel } from '../logica/editorPersonagem';
import { armazenamentoPadrao } from '../logica/progresso';
import { lerOcultos, salvarOcultos } from '../logica/editorArena';

export const BANCO_NOVO = 'saiyan-novo';
const LOJA = 'personagens';

function abrir(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((ok) => {
    try {
      const req = indexedDB.open(BANCO_NOVO, 1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(LOJA)) req.result.createObjectStore(LOJA, { keyPath: 'id' }); };
      req.onsuccess = () => ok(req.result);
      req.onerror = () => ok(null);
      req.onblocked = () => ok(null);
    } catch { ok(null); }
  });
}

function transacao<T>(modo: IDBTransactionMode, f: (loja: IDBObjectStore) => IDBRequest<T> | void): Promise<T | null> {
  return abrir().then((db) => new Promise<T | null>((ok) => {
    if (!db) { ok(null); return; }
    let r: T | null = null;
    try {
      const tx = db.transaction(LOJA, modo);
      const req = f(tx.objectStore(LOJA));
      if (req) req.onsuccess = () => { r = req.result; };
      tx.oncomplete = () => { db.close(); ok(r); };
      tx.onerror = tx.onabort = () => { db.close(); ok(null); };
    } catch { db.close(); ok(null); }
  }));
}

export async function lerPersonagensDoNovo(): Promise<PersonagemEditavel[]> {
  const l = (await transacao<unknown[]>('readonly', (loja) => loja.getAll())) ?? [];
  return l.map(normalizarPersonagem).filter((p): p is PersonagemEditavel => !!p).sort((a, b) => a.salvo - b.salvo);
}

/** grava (cria ou troca); true = gravou */
export async function salvarPersonagemNoNovo(p: PersonagemEditavel): Promise<boolean> {
  const copia = JSON.parse(JSON.stringify({ ...p, salvo: p.salvo || Date.now() }));
  const r = await transacao('readwrite', (loja) => loja.put(copia));
  if (r === null) return false;
  if (p.chaveAntiga) { // voltou a existir no novo: se estava escondido, aparece
    const a = armazenamentoPadrao(), o = lerOcultos(a);
    if (o.personagens.includes(p.chaveAntiga)) { o.personagens = o.personagens.filter((x) => x !== p.chaveAntiga); salvarOcultos(a, o); }
  }
  return true;
}

/** exclui do novo; se veio do antigo, fica escondido (o antigo não é alterado) */
export async function excluirPersonagemDoNovo(p: PersonagemEditavel): Promise<void> {
  await transacao('readwrite', (loja) => loja.delete(p.id));
  if (p.origem === 'antigo' && p.chaveAntiga) {
    const a = armazenamentoPadrao(), o = lerOcultos(a);
    if (!o.personagens.includes(p.chaveAntiga)) { o.personagens.push(p.chaveAntiga); salvarOcultos(a, o); }
  }
}
