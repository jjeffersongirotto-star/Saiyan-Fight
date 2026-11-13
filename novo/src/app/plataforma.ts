// Onde o jogo está rodando (site ou app Android do Capacitor) e a setinha ATUALIZAR do app — o mesmo fluxo do
// atualizacao.js do jogo antigo, para o APK que já está instalado continuar recebendo as versões novas:
//  - nada é automático: só a setinha procura versão nova (latest.json da Release app-bundle, pelo HTTP nativo,
//    porque o GitHub não manda CORS para a WebView);
//  - "jogo": baixa o .zip com o @capgo/capacitor-updater (confere o sha256) e troca para ele;
//  - "apk": só quando o pacote exige um app mais novo (nativoMinimo): abre o APK para baixar.
// Ao abrir, avisa o plugin que este pacote carregou bem (notifyAppReady); sem isso, em 15 s ele volta para o
// pacote anterior (appReadyTimeout no capacitor.config.json).
// O jogo nunca importa os pacotes do Capacitor: usa window.Capacitor.Plugins, que o app injeta.
import { APK_DOWNLOAD_URL, APP_BUNDLE_LATEST_URL, JOGO_ANTIGO_URL, decidirAtualizacao, versaoCurta, type Decisao, type Latest } from '../logica/atualizacao';

interface Updater {
  notifyAppReady(): Promise<unknown>;
  current(): Promise<{ native?: string }>;
  download(o: { url: string; version: string; checksum: string }): Promise<{ id: string }>;
  set(o: { id: string }): Promise<unknown>;
}
interface Http { get(o: { url: string; headers?: Record<string, string>; responseType?: string }): Promise<{ status: number; data: unknown }> }
interface JanelaComApp {
  Capacitor?: { isNativePlatform?: () => boolean; Plugins?: Record<string, unknown> };
  /** gerados por scripts/android/copiar-web.js (www/versao-apk.js), só dentro do app */
  VERSAO_APK?: string;
  VERSAO_JOGO_NO_APK?: string;
  BUILD_WEB?: number;
}
const janela = (): JanelaComApp => (typeof window !== 'undefined' ? (window as unknown as JanelaComApp) : {});

export function noApp(): boolean {
  try {
    const cap = janela().Capacitor;
    return Boolean(cap && (typeof cap.isNativePlatform !== 'function' || cap.isNativePlatform()));
  } catch { return false; }
}
function plugin<T>(nome: string): T | null {
  try { return (janela().Capacitor?.Plugins?.[nome] as T) ?? null; } catch { return null; }
}
export const androidNoNavegador = () => !noApp() && typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '');

/** Versão do jogo (0.X), build (número de commits) e, no app, a versão do APK que veio de fábrica. */
export function infoVersao(): { jogo: string; build: number; apk: string } {
  const j = janela();
  return {
    jogo: typeof j.VERSAO_JOGO_NO_APK === 'string' && j.VERSAO_JOGO_NO_APK ? j.VERSAO_JOGO_NO_APK : versaoCurta(__VERSAO__),
    build: typeof j.BUILD_WEB === 'number' ? j.BUILD_WEB : __BUILD__,
    apk: typeof j.VERSAO_APK === 'string' ? j.VERSAO_APK : '',
  };
}
export async function versaoDoAppInstalado(): Promise<string> {
  const u = plugin<Updater>('CapacitorUpdater');
  try { const c = await u?.current(); if (c?.native) return String(c.native); } catch { /* usa a de fábrica */ }
  return infoVersao().apk || '0';
}

let avisado = false;
/** Chamar quando o menu aparece (o jogo abriu de verdade). */
export function avisarQueOJogoAbriu(): void {
  if (avisado || !noApp()) return;
  const u = plugin<Updater>('CapacitorUpdater');
  if (!u) return;
  avisado = true;
  try { u.notifyAppReady().catch(() => undefined); } catch { /* ignora */ }
}

async function lerLatest(): Promise<Latest | null> {
  const url = `${APP_BUNDLE_LATEST_URL}?t=${Date.now()}`;
  const http = plugin<Http>('CapacitorHttp');
  if (http) {
    const r = await http.get({ url, headers: { 'Cache-Control': 'no-cache' }, responseType: 'json' });
    if (!r || r.status === 404) return null;
    if (r.status < 200 || r.status >= 300) throw new Error(`HTTP ${r.status}`);
    return (typeof r.data === 'string' ? JSON.parse(r.data) : r.data) as Latest;
  }
  const r = await fetch(url, { cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()) as Latest;
}

export type Procura = Decisao | { tipo: 'offline' };
/** Setinha ATUALIZAR: lê o latest.json e decide. */
export async function procurarAtualizacao(): Promise<Procura> {
  try {
    const latest = await lerLatest();
    if (latest === null) return { tipo: 'nada' };
    return decidirAtualizacao(latest, { build: infoVersao().build, nativo: await versaoDoAppInstalado() });
  } catch { return { tipo: 'offline' }; }
}
/** Baixa o pacote (o plugin confere o sha256) e troca para ele (o jogo reinicia na versão nova). */
export async function baixarEAtualizar(d: Extract<Decisao, { tipo: 'jogo' }>): Promise<boolean> {
  const u = plugin<Updater>('CapacitorUpdater');
  if (!u) return false;
  try {
    const pacote = await u.download({ url: d.url, version: d.id, checksum: d.sha256 });
    await u.set({ id: pacote.id });
    return true;
  } catch { return false; }
}

/** Abre um endereço fora do jogo (no app o Capacitor manda endereços de fora para o navegador). */
export function abrirEndereco(url: string): void {
  try { window.location.href = url; } catch { /* ignora */ }
}
export const abrirApk = (url = APK_DOWNLOAD_URL) => abrirEndereco(url);

/** JOGO ANTIGO: no site, a pasta antigo/ ao lado do jogo novo; no app, o endereço do site (abre no navegador). */
export function abrirJogoAntigo(): void {
  if (noApp()) return abrirEndereco(JOGO_ANTIGO_URL);
  try { abrirEndereco(new URL('antigo/', window.location.href).href); } catch { abrirEndereco(JOGO_ANTIGO_URL); }
}
