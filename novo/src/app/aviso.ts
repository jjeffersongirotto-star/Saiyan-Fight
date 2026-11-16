// Aviso de versão nova (v0.129): ao abrir o menu, o jogo confere em silêncio se saiu versão nova e acende uma
// bolinha vermelha na esfera de 4 estrelas e no UPDATES. Não baixa nada: no app, quem atualiza continua sendo a
// setinha ⟳ ATUALIZAR; no site, o botão RECARREGAR da tela ATUALIZAÇÕES.
//  - app (APK): o mesmo latest.json da setinha (procurarAtualizacao);
//  - site: versao.json publicado junto com o site (vite.config.ts), comparado com o build aberto.
// Confere no máximo a cada 10 minutos; sem internet, fica sem aviso.
import { avisaAtualizacao, siteTemVersaoNova } from '../logica/atualizacao';
import { comAtualizador, infoVersao, procurarAtualizacao } from './plataforma';

const INTERVALO_MS = 10 * 60 * 1000;
let nova = false;
let ultima = -Infinity;
let emCurso: Promise<boolean> | null = null;
const ouvintes = new Set<(nova: boolean) => void>();

export const temVersaoNova = () => nova;

/** avisa quando a conferência termina; devolve a função que para de avisar */
export function aoMudarAviso(f: (nova: boolean) => void): () => void {
  ouvintes.add(f);
  return () => { ouvintes.delete(f); };
}

export function verificarAtualizacao(): Promise<boolean> {
  if (emCurso) return emCurso;
  if (Date.now() - ultima < INTERVALO_MS) return Promise.resolve(nova);
  ultima = Date.now();
  emCurso = (async () => {
    try {
      if (comAtualizador()) nova = avisaAtualizacao(await procurarAtualizacao());
      else {
        const r = await fetch(`versao.json?t=${Date.now()}`, { cache: 'no-store' });
        if (r.ok) nova = siteTemVersaoNova(await r.json(), infoVersao().build);
      }
    } catch { /* sem internet: sem aviso */ }
    emCurso = null;
    for (const f of ouvintes) f(nova);
    return nova;
  })();
  return emCurso;
}

/** Site: abre a página de novo pedindo a versão nova (o endereço muda, então o navegador não usa a cópia guardada). */
export function recarregarSite(): void {
  try { window.location.replace(`${window.location.pathname}?v=${Date.now()}`); } catch { /* ignora */ }
}
