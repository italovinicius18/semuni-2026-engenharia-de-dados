#!/usr/bin/env python3
"""Mede, em cada slide do deck, a folga entre o fim do conteudo e o rodape.

Duas armadilhas que este script existe para evitar:

1. `pg.goto(url + '#7')` NAO recarrega quando so o hash muda. Sem o reload abaixo
   voce mede o slide 1 vinte vezes e recebe vinte folgas identicas — um falso
   "esta tudo bem". O assert confere que a navegacao realmente aconteceu.

2. Elemento SVG nao tem `offsetTop`. Se voce so somar offsets, os slides de
   diagrama silenciosamente medem zero. Por isso a medida usa
   getBoundingClientRect e desconverte a escala do palco.

3. Folga positiva nao prova que o conteudo aparece. `.janela` tem
   overflow:hidden; quando ela encolhia como item flex, a tabela era cortada
   por dentro e a caixa continuava passando aqui. O slide 6 escondeu tres dos
   sete anos assim, por uma sessao inteira. Por isso existe `confere_corte`.

4. Medir a folga DENTRO do palco nao prova que o palco cabe na tela. Um erro de
   transform-origin fazia o palco vazar 180px para fora da viewport em
   1920x1080 — cada slide passava aqui com folga de sobra e mesmo assim perdia
   o rodape no projetor. Por isso existe `confere_palco`.

5. Texto. A partir da versao de 22/09/2026 os slides seguem os padroes de
   no-ai-slop (petergyang) e unslop (theclaymethod), adaptados no spec em
   docs/superpowers/specs/2026-09-22-aula-roteiro-design.md. `confere_texto`
   acusa contraste binario, travessao em dobro, palavra de inflacao e triade
   de adjetivos. Falso positivo se marca no HTML com data-ok="motivo".

Uso:  make conferir
"""
import glob
import html as _html
import os
import re
import sys

from playwright.sync_api import sync_playwright

DECK = os.path.join(os.path.dirname(__file__), "aula.html")
URL = "file://" + os.path.abspath(DECK)
APERTADO = 14  # px de folga abaixo dos quais o slide encosta no rodape

MEDIDA = """() => {
  const st = document.getElementById('stage').getBoundingClientRect();
  const esc = st.width / 1280;
  const s = document.querySelector('.slide.is-active');
  const rod = s.querySelector('.rodape');
  let base = 0;
  [...s.children].forEach(c => {
    if (c === rod) return;
    const fim = (c.getBoundingClientRect().bottom - st.top) / esc;
    if (fim > base) base = fim;
  });
  const topo = (rod.getBoundingClientRect().top - st.top) / esc;
  return {
    idx: [...document.querySelectorAll('.slide')].indexOf(s) + 1,
    folga: Math.round(topo - base),
    alvo: s.getAttribute('data-min'),
  };
}"""


def chromium():
    achados = glob.glob(os.path.expanduser(
        "~/.cache/ms-playwright/chromium*/chrome-linux/chrome")) + glob.glob(os.path.expanduser(
        "~/.cache/ms-playwright/chromium_headless_shell*/chrome-headless-shell-linux64/chrome-headless-shell"))
    if not achados:
        sys.exit("chromium do playwright nao encontrado — rode: .venv/bin/playwright install chromium")
    return achados[0]


# conteudo cortado por dentro de uma caixa com overflow:hidden
CORTE = """() => {
  const s = document.querySelector('.slide.is-active');
  return [...s.querySelectorAll('*')]
    .filter(e => getComputedStyle(e).overflow === 'hidden'
              && e.scrollHeight - e.clientHeight > 1)
    .map(e => [e.className || e.tagName, e.scrollHeight - e.clientHeight]);
}"""


PALCO = """() => {
  const b = document.getElementById('stage').getBoundingClientRect();
  return {esq: b.left, topo: b.top, dir: innerWidth - b.right,
          baixo: innerHeight - b.bottom, larg: b.width, alt: b.height};
}"""

# telas em que a aula pode acabar sendo projetada
TELAS = [(1920, 1080), (1600, 900), (1440, 900), (1366, 768), (1280, 800), (1024, 768)]


def confere_palco(nav):
    """O palco tem que caber inteiro na tela, em qualquer proporcao."""
    ruins = []
    print("palco vs tela:")
    for larg, alt in TELAS:
        pg = nav.new_page(viewport={"width": larg, "height": alt})
        pg.goto(URL)
        pg.wait_for_timeout(200)
        d = pg.evaluate(PALCO)
        vaza = min(d["esq"], d["dir"], d["topo"], d["baixo"])
        # 16:9 exato tem que dar tela cheia, sem sobra nenhuma
        cheio = abs(larg / alt - 16 / 9) < 0.001
        aviso = ""
        if vaza < -0.5:
            aviso, _ = f"  <-- VAZA {abs(vaza):.0f}px PARA FORA", ruins.append((larg, alt))
        elif cheio and vaza > 0.5:
            aviso, _ = "  <-- DEVIA SER TELA CHEIA", ruins.append((larg, alt))
        print(f"  {larg}x{alt}  palco {d['larg']:.0f}x{d['alt']:.0f}"
              f"  sobra esq/dir {d['esq']:.0f}/{d['dir']:.0f}"
              f"  topo/baixo {d['topo']:.0f}/{d['baixo']:.0f}{aviso}")
        pg.close()
    return ruins


# --- texto --------------------------------------------------------------------
FONTES = os.path.join(os.path.dirname(__file__), "fontes", "slides.html")

INFLACAO = ["fundamental", "essencial", "crucial", "pivotal", "poderoso", "poderosa",
            "revolucionári", "game changer", "estudos mostram", "especialistas",
            "o mercado", "incrível", "impressionante", "melhor do mundo"]
# "nao e X, e Y" e "nao X. Y." no mesmo paragrafo; "X nao e Y: e Z"
CONTRASTE = [re.compile(r"\bn[aã]o (?:é|e|está|era|estava)\b[^.;:]{2,60},\s*(?:é|e|está|era|estava)\b", re.I),
             re.compile(r"\bn[aã]o\b[^.]{3,80}\.\s+(?:É|E|Está|Ele|Ela)\b\s+\w+[^.]{0,60}\."),
             re.compile(r"\bn[aã]o é [^.:]{2,60}:\s*é\b", re.I)]
TRIADE = re.compile(r"\b(\w{4,}), (\w{4,}),? e (\w{4,})\b")


def _texto(trecho):
    t = re.sub(r"<[^>]+>", " ", trecho)
    return re.sub(r"\s+", " ", _html.unescape(t)).strip()


def confere_texto():
    """Acusa, por slide, o que os padroes de comunicacao do spec proibem."""
    s = open(FONTES, encoding="utf-8").read()
    partes = re.split(r"<!-- (\d\d) -->", s)
    ruins = []
    print("texto:")
    for i in range(1, len(partes), 2):
        n, corpo = partes[i], partes[i + 1]
        # o glossario e definicao e nao entra nas regras de forma
        sem_termos = re.sub(r'<div class="termos">.*?</div>', "", corpo, flags=re.S)
        blocos = re.findall(r"<(?:p|div class=\"(?:legenda|fecho)[^\"]*\"|h[123]|td)[^>]*>(.*?)</(?:p|div|h[123]|td)>", sem_termos, re.S)
        ok = dict(re.findall(r'data-ok="([^"]+)"', corpo))
        achados = []
        for b in blocos:
            t = _texto(b)
            if not t:
                continue
            for rx in CONTRASTE:
                if rx.search(t):
                    achados.append(f"contraste binario: “{t[:70]}”")
                    break
            for w in INFLACAO:
                if re.search(r"\b" + w, t, re.I):
                    achados.append(f"inflacao: “{w}” em “{t[:50]}”")
            m = TRIADE.search(t)
            if m and all(x.endswith(("a", "o", "as", "os", "es", "is", "el", "il", "ar", "or", "nte", "vel")) for x in m.groups()):
                achados.append(f"triade: “{m.group(0)}”")
        travessoes = _texto(sem_termos).count("—")
        if travessoes > 1:
            achados.append(f"travessao em dobro: {travessoes}")
        if ok:
            print(f"  slide {int(n):>2}  data-ok: " + "; ".join(ok))
        for a in achados:
            ruins.append(n)
            print(f"  slide {int(n):>2}  <-- {a}")
    if not ruins:
        print("  nenhum achado")
    return ruins


def main():
    ruins = []
    with sync_playwright() as p:
        nav = p.chromium.launch(executable_path=chromium())
        pg = nav.new_page(viewport={"width": 1280, "height": 720})
        erros = []
        pg.on("pageerror", lambda e: erros.append(str(e)))

        pg.goto(URL)
        pg.wait_for_timeout(250)
        total = pg.evaluate("document.querySelectorAll('.slide').length")
        print(f"{total} slides — erros de javascript: {erros or 'nenhum'}\n")

        for i in range(1, total + 1):
            pg.goto(f"{URL}#{i}")
            pg.reload()
            pg.wait_for_timeout(120)
            # revela todos os fragmentos: e o pior caso de altura
            pg.evaluate("document.querySelectorAll('.slide.is-active .frag')"
                        ".forEach(e => e.classList.add('on'))")
            d = pg.evaluate(MEDIDA)
            assert d["idx"] == i, f"nao navegou: pedi {i}, recebi {d['idx']}"

            aviso = ""
            if d["folga"] < 0:
                aviso, _ = "  <-- ESTOUROU", ruins.append(d)
            elif d["folga"] < APERTADO:
                aviso, _ = "  <-- APERTADO", ruins.append(d)
            print(f"  slide {i:>2}  alvo {d['alvo']:>2}'  folga {d['folga']:>4}px{aviso}")

            for cls, px in pg.evaluate(CORTE):
                ruins.append(d)
                print(f"            <-- CORTADO: .{cls} esconde {px}px por dentro")

        print()
        telas_ruins = confere_palco(nav)
        nav.close()

    print()
    texto_ruim = confere_texto()

    print(f"\n{len(ruins)} slide(s) com problema, {len(telas_ruins)} tela(s) com problema, "
          f"{len(texto_ruim)} achado(s) de texto")
    return 1 if (ruins or telas_ruins or erros or texto_ruim) else 0


if __name__ == "__main__":
    sys.exit(main())
