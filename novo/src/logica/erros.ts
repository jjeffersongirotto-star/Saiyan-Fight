// v0.155: erros do jogo guardados para o jogador mandar print (no app do PC não há console à mão). Só a parte pura:
// a lista dos últimos erros, sem repetir o mesmo seguido. O desenho e a captura ficam em app/erros.ts.

export const CHAVE_ERROS = 'saiyan-novo-erros';
export const MAX_ERROS = 5;

export interface ErroGuardado {
  /** quando (ISO) */
  quando: string;
  msg: string;
  /** versão do jogo em que aconteceu */
  versao: string;
}

/** Junta um erro novo na lista (o mais novo no fim). O mesmo texto seguido só atualiza a hora. */
export function guardarErro(lista: ErroGuardado[], novo: ErroGuardado): ErroGuardado[] {
  const msg = novo.msg.slice(0, 400);
  const ultimo = lista[lista.length - 1];
  if (ultimo && ultimo.msg === msg) return [...lista.slice(0, -1), { ...ultimo, quando: novo.quando }];
  return [...lista, { ...novo, msg }].slice(-MAX_ERROS);
}

/** Texto curto de um erro do navegador: mensagem + onde (arquivo:linha), sem a pilha inteira. */
export function textoDoErro(msg: string, onde?: string, pilha?: string): string {
  const linha = (pilha ?? '').split('\n').map((l) => l.trim()).find((l) => l.startsWith('at ')) ?? '';
  return [msg, onde, linha].filter(Boolean).join(' | ');
}
