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
  /** bytes do .zip (v0.130: mostra KB baixados / total enquanto baixa) */
  tamanho?: number;
  nativoMinimo?: string;
  apk?: string;
}

export type Decisao =
  | { tipo: 'nada' }
  | { tipo: 'erro' }
  | { tipo: 'apk'; url: string; versao: string }
  | { tipo: 'jogo'; url: string; sha256: string; versao: string; id: string; tamanho: number };

export const APK_DOWNLOAD_URL = 'https://github.com/jjeffersongirotto-star/Saiyan-Fight/releases/latest/download/Saiyan-Fight.apk';
export const APP_BUNDLE_LATEST_URL = 'https://github.com/jjeffersongirotto-star/Saiyan-Fight/releases/download/app-bundle/latest.json';

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
  const tamanho = Number(latest.tamanho);
  return { tipo: 'jogo', url: String(latest.url), sha256: String(latest.sha256), versao, id: `${versao || 'web'}-${build}`, tamanho: Number.isFinite(tamanho) && tamanho > 0 ? tamanho : 0 };
}

/** "0.121.0" → "0.121" (a versão 0.X que aparece para o jogador, como nas UPDATES do jogo antigo). */
export function versaoCurta(v: string): string {
  return String(v).split('.').slice(0, 2).join('.');
}

/** versao.json do site (gerado no build pelo vite.config.ts): o site publicado tem build mais novo que o aberto? */
export function siteTemVersaoNova(remoto: unknown, buildAtual: number): boolean {
  const b = Number((remoto as { build?: unknown } | null)?.build);
  return Number.isFinite(b) && b > buildAtual;
}

/** Aviso de atualização (bolinha na esfera e em UPDATES): só quando o app tem pacote ou APK novo para baixar. */
export const avisaAtualizacao = (d: { tipo: string }) => d.tipo === 'jogo' || d.tipo === 'apk';

/** Progresso do download (o plugin avisa a porcentagem): KB já baixados e o total, quando o latest.json traz o
 *  tamanho; senão só a porcentagem. Devolve os números para o texto (TF) da tela ATUALIZAÇÕES. */
export function progressoDoDownload(percent: number, tamanhoBytes: number): { pct: number; kb: number; totalKb: number } {
  const pct = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  const totalKb = tamanhoBytes > 0 ? Math.round(tamanhoBytes / 1024) : 0;
  return { pct, kb: Math.round((totalKb * pct) / 100), totalKb };
}
