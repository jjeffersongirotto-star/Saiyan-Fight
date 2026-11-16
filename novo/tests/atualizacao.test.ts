import { describe, expect, it } from 'vitest';
import { compararVersoes, decidirAtualizacao, versaoCurta } from '../src/logica/atualizacao';
import { NOVIDADES } from '../src/dados/novidades';

const base = { versao: '0.121', build: 310, url: 'https://x/saiyan-fight-web-0.121-310.zip', sha256: 'ab'.repeat(32), nativoMinimo: '1.0.0', apk: 'https://x/Saiyan-Fight.apk' };

describe('atualização dentro do app (setinha ATUALIZAR)', () => {
  it('build igual ou menor = nada', () => {
    expect(decidirAtualizacao({ ...base, build: 310 }, { build: 310, nativo: '1.0.301' }).tipo).toBe('nada');
    expect(decidirAtualizacao({ ...base, build: 300 }, { build: 310, nativo: '1.0.301' }).tipo).toBe('nada');
  });
  it('build maior = baixa o pacote do jogo (url, sha256, id versão-build)', () => {
    expect(decidirAtualizacao(base, { build: 301, nativo: '1.0.301' })).toEqual({ tipo: 'jogo', url: base.url, sha256: base.sha256, versao: '0.121', id: '0.121-310', tamanho: 0 });
  });
  it('o APK que já está nos celulares (1.0.278 / 1.0.301) recebe o jogo novo pela setinha (nativoMinimo 1.0.0)', () => {
    expect(decidirAtualizacao(base, { build: 278, nativo: '1.0.278' }).tipo).toBe('jogo');
  });
  it('pacote que precisa de app mais novo = oferece o APK', () => {
    expect(decidirAtualizacao({ ...base, nativoMinimo: '1.1.0' }, { build: 301, nativo: '1.0.301' })).toEqual({ tipo: 'apk', url: base.apk, versao: '0.121' });
    expect(decidirAtualizacao({ ...base, nativoMinimo: '1.1.0' }, { build: 301, nativo: '1.1.305' }).tipo).toBe('jogo');
  });
  it('latest.json quebrado = erro (não baixa nada)', () => {
    expect(decidirAtualizacao({ ...base, sha256: '' }, { build: 1, nativo: '1.0.0' }).tipo).toBe('erro');
    expect(decidirAtualizacao(null, { build: 1, nativo: '1.0.0' }).tipo).toBe('erro');
    expect(decidirAtualizacao({ ...base, build: 'x' }, { build: 1, nativo: '1.0.0' }).tipo).toBe('erro');
  });
  it('comparação de versões', () => {
    expect(compararVersoes('apk-v1.0.300', '1.0.275')).toBeGreaterThan(0);
    expect(compararVersoes('1.1.0', '1.0.999')).toBeGreaterThan(0);
    expect(compararVersoes('v1.0.275', '1.0.275')).toBe(0);
    expect(versaoCurta('0.121.0')).toBe('0.121');
  });
  it('a lista de novidades começa na versão do package.json', async () => {
    const pkg = JSON.parse((await import('node:fs')).readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    expect(NOVIDADES[0].versao).toBe(versaoCurta(pkg.version));
  });
});

describe('aviso de versão nova (v0.129)', () => {
  it('site: acende só com build publicado mais novo que o aberto', async () => {
    const { siteTemVersaoNova } = await import('../src/logica/atualizacao');
    expect(siteTemVersaoNova({ versao: '0.129.0', build: 310 }, 300)).toBe(true);
    expect(siteTemVersaoNova({ build: 300 }, 300)).toBe(false);
    expect(siteTemVersaoNova({ build: 'x' }, 300)).toBe(false);
    expect(siteTemVersaoNova(null, 300)).toBe(false);
  });
  it('app: acende com pacote novo ou APK novo, não com nada/erro', async () => {
    const { avisaAtualizacao } = await import('../src/logica/atualizacao');
    expect(avisaAtualizacao({ tipo: 'jogo' })).toBe(true);
    expect(avisaAtualizacao({ tipo: 'apk' })).toBe(true);
    expect(avisaAtualizacao({ tipo: 'nada' })).toBe(false);
    expect(avisaAtualizacao({ tipo: 'erro' })).toBe(false);
    expect(avisaAtualizacao({ tipo: 'offline' })).toBe(false);
  });
});

describe('progresso do download (v0.130)', () => {
  it('KB baixados e total a partir da porcentagem e do tamanho do latest.json', async () => {
    const { progressoDoDownload, decidirAtualizacao } = await import('../src/logica/atualizacao');
    expect(progressoDoDownload(0, 24 * 1024 * 1024)).toEqual({ pct: 0, kb: 0, totalKb: 24576 });
    expect(progressoDoDownload(50, 24 * 1024 * 1024)).toEqual({ pct: 50, kb: 12288, totalKb: 24576 });
    expect(progressoDoDownload(150, 1024)).toEqual({ pct: 100, kb: 1, totalKb: 1 });
    expect(progressoDoDownload(33.4, 0)).toEqual({ pct: 33, kb: 0, totalKb: 0 });
    const d = decidirAtualizacao({ url: 'u', sha256: 's', build: 10, versao: '0.130', tamanho: 2048 }, { build: 1, nativo: '1.0.0' });
    expect(d.tipo === 'jogo' && d.tamanho).toBe(2048);
    const sem = decidirAtualizacao({ url: 'u', sha256: 's', build: 10, versao: '0.130' }, { build: 1, nativo: '1.0.0' });
    expect(sem.tipo === 'jogo' && sem.tamanho).toBe(0);
  });
});

describe('tamanho na unidade certa (v0.132)', () => {
  it('KB abaixo de 1 MB, MB abaixo de 1 GB, depois GB', async () => {
    const { formatarTamanho } = await import('../src/logica/atualizacao');
    expect(formatarTamanho(500 * 1024)).toBe('500 KB');
    expect(formatarTamanho(4630 * 1024)).toBe('4,5 MB');
    expect(formatarTamanho(23152 * 1024)).toBe('22,6 MB');
    expect(formatarTamanho(1.5 * 1024 ** 3)).toBe('1,5 GB');
    expect(formatarTamanho(23152 * 1024, false)).toBe('22.6 MB');
    expect(formatarTamanho(0)).toBe('0 KB');
  });
});

describe('progresso real do download (v0.133, APK 1.1)', () => {
  it('10..70 = bytes reais baixados; depois instalando; 100 = pronto', async () => {
    const { faseDoDownload } = await import('../src/logica/atualizacao');
    expect(faseDoDownload(10)).toEqual({ fase: 'baixando', pct: 0 });
    expect(faseDoDownload(40)).toEqual({ fase: 'baixando', pct: 50 });
    expect(faseDoDownload(70)).toEqual({ fase: 'baixando', pct: 100 });
    expect(faseDoDownload(75)).toEqual({ fase: 'instalando' });
    expect(faseDoDownload(90)).toEqual({ fase: 'instalando' });
    expect(faseDoDownload(100)).toEqual({ fase: 'pronto' });
  });
  it('o ajuste nativo do plugin está no postinstall e falha se o código mudar', async () => {
    const fs = await import('node:fs');
    const pkg = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
    expect(pkg.scripts.postinstall).toBe('node scripts/android/ajustar-updater.js');
    expect(pkg.version.split('.').slice(0, 2).join('.')).toBe('1.1');   // mudança nativa: APK novo (nativoMinimo 1.1.0)
    const s = fs.readFileSync(new URL('../../scripts/android/ajustar-updater.js', import.meta.url), 'utf8');
    expect(s).toContain('return 10 + (int) (parte * 60);');
    expect(s).toContain('o código do @capgo/capacitor-updater mudou');
  });
});

describe('app de PC (v0.138)', () => {
  it('o nativoMinimo do Android não bloqueia o app de PC: recebe o pacote do jogo', async () => {
    const { decidirAtualizacao, NATIVO_DO_PC } = await import('../src/logica/atualizacao');
    const latest = { url: 'u', sha256: 's', build: 400, versao: '0.138', nativoMinimo: '1.1.0', tamanho: 10 };
    expect(decidirAtualizacao(latest, { build: 300, nativo: NATIVO_DO_PC }).tipo).toBe('jogo');
    expect(decidirAtualizacao(latest, { build: 300, nativo: '1.0.278' }).tipo).toBe('apk');
  });
});
