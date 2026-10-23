#!/usr/bin/env python3
"""코드블루 리더 빌드: src/ 의 조각들을 하나의 HTML로 합칩니다.

  python tools/build.py            → dist/web/index.html, dist/web/inst.html (+ app/ 에 복사)
  python tools/build.py --fragment → dist/fragment.html (문서 틀 없는 조각, 아티팩트용)
"""
import os, sys, shutil
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
CSS = ['fx2.css', 'instcon.css', 'custom2.css', 'algo2.css', 'learn2.css']
JS = ['core.js', 'keep_hints.js', 'newui.js', 'fx.js', 'events.js', 'fx2.js', 'protocol.js', 'assess2.js', 'rosc2.js',
      'fatigue.js', 'learn2.js', 'custom2.js', 'algo2.js', 'instcon.js', 'inst2.js']
ASSETS = ['assets/assets4.js', 'assets/herovid.js', 'assets/voice.js']

def rd(name):
    with open(os.path.join(SRC, name), encoding='utf-8') as f:
        return f.read()

def fragment():
    head = rd('head.html')
    css = '\n'.join(rd(c) for c in CSS)
    i = head.rfind('</style>')
    head = head[:i] + css + '\n' + head[i:]
    assets = '\n'.join(rd(a) for a in ASSETS)
    js = '\n'.join(rd(j) for j in JS)
    return head + '\n<script>\n' + assets + '\n</script>\n<script>\n' + js + '\n</script>\n'

def doc(body):
    return ('<!doctype html><html lang="ko"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            '</head><body>\n' + body + '</body></html>')

def console_page():
    return ('<!doctype html><html lang="ko"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            '<title>강사 콘솔 · 코드블루 리더</title><style>' + rd('instcon.css') + '</style></head><body>'
            '<script>window.CBL_STANDALONE_CONSOLE=true;</script><script>' + rd('instcon.js') + '</script></body></html>')

def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print('wrote', os.path.relpath(path, ROOT), len(text.encode('utf-8')), 'bytes')

if __name__ == '__main__':
    frag = fragment()
    if '--fragment' in sys.argv:
        write(os.path.join(ROOT, 'dist', 'fragment.html'), frag)
        sys.exit(0)
    web = os.path.join(ROOT, 'dist', 'web')
    write(os.path.join(web, 'index.html'), doc(frag))
    write(os.path.join(web, 'inst.html'), console_page())
    write(os.path.join(web, '.nojekyll'), '')
    for n in ('index.html', 'inst.html'):
        shutil.copyfile(os.path.join(web, n), os.path.join(ROOT, 'app', n))
    print('copied index.html, inst.html -> app/')
