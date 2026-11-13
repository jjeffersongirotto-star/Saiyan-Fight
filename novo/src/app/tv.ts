// TRANSMITIR PARA A TV (menu.js: transmitirParaTV): onde o navegador deixa (Chrome com Chromecast/Google TV) abre
// a lista de TVs; a TV abre tv.html, que recebe ao vivo a imagem do canvas (vídeo por WebRTC, combinação pelo
// canal da Presentation API). Sem suporte ou com erro, mostra como espelhar a tela pelo aparelho.
import { T } from '../logica/idioma';
import { avisar } from '../ui/janela';

interface Conexao { state: string; send(t: string): void; terminate(): void; onmessage: ((e: MessageEvent) => void) | null; onclose: (() => void) | null; onterminate: (() => void) | null; onconnect: (() => void) | null }
let tv: { conexao: Conexao; pc: RTCPeerConnection } | null = null;
export const transmitindo = () => !!tv;

export function ajudaTransmitirTV(motivo?: string): void {
  const ajuda = [
    'Espelhe a tela pelo aparelho (coloque o jogo em TELA CHEIA antes):',
    "• Android: o menu do Chrome não tem 'Transmitir' no celular. Puxe as configurações rápidas (deslize do topo duas vezes) e toque em 'Transmitir' (Xiaomi), 'Smart View' (Samsung) ou 'Transmitir tela' / 'Espelhamento de tela' (outros). Se não aparecer, toque no lápis e adicione esse atalho.",
    "• iPhone/iPad: Central de Controle > 'Espelhamento de Tela' (Apple TV/AirPlay).",
    "• PC (Chrome/Edge): menu ⋮ > 'Transmitir...' e escolha a TV.",
    'O jogo continua no seu aparelho e a TV mostra a mesma tela.',
  ].map((t) => T(t)).join('\n');
  avisar('TRANSMITIR PARA A TV', (motivo ? `${T('MOTIVO: ' + motivo)}\n\n` : '') + ajuda);
}

export function encerrarTransmissao(): void {
  if (!tv) return;
  try { tv.pc.close(); } catch { /* já fechou */ }
  try { tv.conexao.terminate(); } catch { /* já fechou */ }
  tv = null;
}

function enviarVideo(conexao: Conexao, canvas: HTMLCanvasElement): void {
  const stream = canvas.captureStream(30);
  const pc = new RTCPeerConnection({ iceServers: [] });
  stream.getTracks().forEach((t) => pc.addTrack(t, stream));
  tv = { conexao, pc };
  pc.onicecandidate = (e) => { if (e.candidate) conexao.send(JSON.stringify({ tipo: 'ice', candidato: e.candidate })); };
  conexao.onmessage = async (e) => {
    let msg: { tipo?: string; sdp?: RTCSessionDescriptionInit; candidato?: RTCIceCandidateInit };
    try { msg = JSON.parse(e.data); } catch { return; }
    if (msg.tipo === 'resposta' && msg.sdp) await pc.setRemoteDescription(msg.sdp);
    else if (msg.tipo === 'ice' && msg.candidato) { try { await pc.addIceCandidate(msg.candidato); } catch { /* candidato ruim */ } }
  };
  conexao.onclose = conexao.onterminate = () => { if (tv?.conexao === conexao) { try { pc.close(); } catch { /* */ } tv = null; } };
  void pc.createOffer().then((o) => pc.setLocalDescription(o)).then(() => conexao.send(JSON.stringify({ tipo: 'oferta', sdp: pc.localDescription })));
}

function motivo(err: unknown): string {
  const e = err as { name?: string; message?: string } | null;
  if (e?.name === 'NotFoundError') return 'NENHUMA TV COM CHROMECAST/GOOGLE TV NA MESMA REDE WI-FI';
  const t = e ? String(e.message || e.name || e) : '';
  return t ? 'ERRO: ' + t.slice(0, 80) : 'NÃO FOI POSSÍVEL CONECTAR À TV';
}

/** liga/desliga; `aoMudar` é chamado quando a transmissão começa ou para */
export function transmitirParaTV(canvas: HTMLCanvasElement, aoMudar: () => void): void {
  if (tv) { encerrarTransmissao(); aoMudar(); return; }
  const P = (window as unknown as { PresentationRequest?: new (u: string[]) => { start(): Promise<Conexao> } }).PresentationRequest;
  if (typeof P !== 'function' || typeof RTCPeerConnection !== 'function' || typeof canvas.captureStream !== 'function') {
    ajudaTransmitirTV('ESTE NAVEGADOR NÃO PERMITE: ABRA NO CHROME');
    return;
  }
  try {
    new P(['tv.html']).start().then((c) => {
      if (c.state === 'connected') enviarVideo(c, canvas);
      else c.onconnect = () => { enviarVideo(c, canvas); aoMudar(); };
      aoMudar();
    }).catch((err: { name?: string }) => { if (err?.name !== 'AbortError') ajudaTransmitirTV(motivo(err)); });
  } catch (e) { ajudaTransmitirTV(motivo(e)); }
}
