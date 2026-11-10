"""Empacota a pasta www/ (feita por scripts/android/copiar-web.js) para a atualização do jogo dentro do APK.

Rodar na raiz do projeto, depois do copiar-web.js:
    python3 scripts/android/pacote-web.py [pasta_saida] [url_base]
(padrões: pacote-web/ e https://github.com/jjeffersongirotto-star/Saiyan-Fight/releases/download/app-bundle)

Gera em pasta_saida:
- saiyan-fight-web-<jogo>-<build>.zip: os arquivos de www/ na raiz do zip (o que o @capgo/capacitor-updater espera);
- latest.json: { versao (jogo 0.X), build, arquivo, url, sha256 (do zip, conferido pelo plugin no celular),
  nativoMinimo (APK mínimo para este pacote), apk (endereço do APK mais novo), publicadoEm }.
A CI (.github/workflows/android.yml) publica os dois na Release "app-bundle" a cada push na main.
"""
import hashlib
import json
import sys
import time
import zipfile
from pathlib import Path

WWW = Path('www')
SAIDA = Path(sys.argv[1] if len(sys.argv) > 1 else 'pacote-web')
URL_BASE = (sys.argv[2] if len(sys.argv) > 2 else
            'https://github.com/jjeffersongirotto-star/Saiyan-Fight/releases/download/app-bundle').rstrip('/')
APK = 'https://github.com/jjeffersongirotto-star/Saiyan-Fight/releases/latest/download/Saiyan-Fight.apk'

info = json.loads((WWW / 'versao-apk.json').read_text(encoding='utf-8'))
if not (WWW / 'index.html').is_file():
    sys.exit('www/index.html não existe: rode antes node scripts/android/copiar-web.js')
SAIDA.mkdir(parents=True, exist_ok=True)
nome = f"saiyan-fight-web-{info['jogo'] or '0'}-{info['build']}.zip"
destino = SAIDA / nome
with zipfile.ZipFile(destino, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for f in sorted(WWW.rglob('*')):
        if f.is_file():
            z.write(f, f.relative_to(WWW).as_posix())
sha = hashlib.sha256(destino.read_bytes()).hexdigest()
latest = {
    'versao': info['jogo'],
    'build': info['build'],
    'arquivo': nome,
    'url': f'{URL_BASE}/{nome}',
    'sha256': sha,
    'nativoMinimo': info['nativoMinimo'],
    'apk': APK,
    'publicadoEm': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
}
(SAIDA / 'latest.json').write_text(json.dumps(latest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(f"{destino} ({destino.stat().st_size / 1e6:.1f} MB), sha256 {sha[:12]}…, jogo {info['jogo']} build {info['build']}")
