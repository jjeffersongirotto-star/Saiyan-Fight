// Atualização do jogo DENTRO do app Android (mesmo esquema do atualizacao.js do jogo antigo): só quando o jogador
// aperta a setinha ATUALIZAR. Aqui fica só a decisão (pura, testada em tests/atualizacao.test.ts); quem fala com o
// Capacitor é src/app/plataforma.ts.

/** latest.json publicado pela CI na Release "app-bundle" (scripts/android/pacote-web.py). */
export interface Latest {
  versao?: string;
  build?: number | string;
  arquivo?: string;
  url?: string;
  sha256?: string;
  nativoMinimo?: string;
  apk?: string;
}

export type Decisao =
  | { tipo: 'nada' }
  | { tipo: 'erro' }
  | { tipo: 'apk'; url: string; versao: string }
  | { tipo: 'jogo'; url: string; sha256: string; versao: string; id: string };

export const APK_DOWNLOAD_URL = 'https://github.com/jjeffersongirotto-star/Saiyan-Fight/releases/latest/download/Saiyan-Fight.apk';
export const APP_BUNDLE_LATEST_URL = 'https://github.com/jjeffersongirotto-star/Saiyan-Fight/releases/download/app-bundle/latest.json';
/** O jogo antigo (HTML/JS) continua no site, nesta pasta. */
export const JOGO_ANTIGO_URL = 'https://jjeffersongirotto-star.github.io/Saiyan-Fight/antigo/';

/** > 0 quando `a` é mais nova que `b` ("1.0.280" > "1.0.275"; aceita "apk-v"/"v" na frente). */
export function compararVersoes(a: string | undefined, b: string | undefined): number {
  const partes = (v: string | undefined) => String(v ?? '').replace(/^[^0-9]*/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pa = partes(a), pb = partes(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

/** O que fazer com o latest.json. atual = build do pacote que está rodando + versão do APK instalado. */
export function decidirAtualizacao(latest: Latest | null | undefined, atual: { build: number; nativo: string }): Decisao {
  if (!latest || typeof latest !== 'object' || !latest.url || !latest.sha256 || !Number.isFinite(Number(latest.build))) return { tipo: 'erro' };
  const build = Number(latest.build);
  if (build <= (Number(atual.build) || 0)) return { tipo: 'nada' };
  const versao = String(latest.versao ?? '');
  if (latest.nativoMinimo && compararVersoes(latest.nativoMinimo, atual.nativo || '0') > 0) return { tipo: 'apk', url: latest.apk || APK_DOWNLOAD_URL, versao };
  return { tipo: 'jogo', url: String(latest.url), sha256: String(latest.sha256), versao, id: `${versao || 'web'}-${build}` };
}

/** "0.121.0" → "0.121" (a versão 0.X que aparece para o jogador, como nas UPDATES do jogo antigo). */
export function versaoCurta(v: string): string {
  return String(v).split('.').slice(0, 2).join('.');
}
