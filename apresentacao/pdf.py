#!/usr/bin/env python3
"""Gera apresentacao/aula.pdf a partir de aula.html, um slide por pagina.

Existe para que o deck HTML nao precise de um segundo projeto so para produzir
PDF. O PDF aqui e o plano B: o que vai no pendrive, o que sobe no e-mail da
organizacao, e o que abre se o navegador da sala renderizar diferente.

Cada pagina sai com TODOS os fragmentos revelados. PDF nao anima, e uma pagina
por fragmento transformaria 20 slides em 34 paginas que ninguem folheia. Quem
apresenta usa o HTML, que tem a construcao ao vivo.

A mesma armadilha do conferir.py vale aqui: mudar so o hash NAO recarrega a
pagina. Sem o reload voce exporta o slide 1 vinte vezes e so descobre olhando
o PDF pronto. O assert abaixo confere que a navegacao aconteceu.

Uso:  make pdf
"""
import io
import os
import sys

from PIL import Image
from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from conferir import chromium  # noqa: E402  mesmo glob, um lugar so

AQUI = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.join(AQUI, "aula.html")
SAIDA = os.path.join(AQUI, "aula.pdf")

# o palco e 1280x720; 1920x1080 com escala 2 da 3840x2160, nitido em projetor
# 4K. E 16:9 exato, entao o palco toma a tela inteira e nao sobra letterbox.
LARGURA, ALTURA, ESCALA = 1920, 1080, 2

# relogio, ajuda e notas sao ferramentas de quem apresenta, nao do slide
ESCONDER = "#ajuda, #relogio, #notas { display: none !important; }"


def main():
    if not os.path.exists(HTML):
        sys.exit("aula.html nao existe — rode `make slides` antes")

    url = "file://" + HTML
    paginas = []

    with sync_playwright() as p:
        nav = p.chromium.launch(executable_path=chromium())
        pg = nav.new_page(viewport={"width": LARGURA, "height": ALTURA},
                          device_scale_factor=ESCALA)
        pg.goto(url)
        total = pg.evaluate("document.querySelectorAll('.slide').length")

        for i in range(total):
            frags = pg.evaluate(
                "i => document.querySelectorAll('.slide')[i]"
                "       .querySelectorAll('.frag').length", i)
            pg.goto(f"{url}#{i + 1}" + (f".{frags}" if frags else ""))
            pg.reload()               # o hash sozinho nao recarrega
            pg.add_style_tag(content=ESCONDER)
            pg.wait_for_timeout(250)  # deixa o fit() assentar

            visto = pg.evaluate(
                "[].indexOf.call(document.querySelectorAll('.slide'),"
                " document.querySelector('.slide.is-active'))")
            apagados = pg.evaluate(
                "document.querySelectorAll('.slide.is-active .frag:not(.on)')"
                ".length")
            if visto != i:
                sys.exit(f"slide {i + 1}: o deck mostrou o indice {visto + 1}")
            if apagados:
                sys.exit(f"slide {i + 1}: {apagados} fragmentos nao revelados")

            paginas.append(Image.open(io.BytesIO(pg.screenshot())).convert("RGB"))

        nav.close()

    # DCTDecode (JPEG) porque flate em 3840px x 20 paginas passa de 100 MB e
    # nenhum leitor abre isso num pendrive sem pensar
    paginas[0].save(SAIDA, save_all=True, append_images=paginas[1:],
                    resolution=192.0, quality=92)
    print(f"apresentacao/aula.pdf — {len(paginas)} paginas, "
          f"{os.path.getsize(SAIDA) // 1024} KB, "
          f"{LARGURA * ESCALA}x{ALTURA * ESCALA}")


if __name__ == "__main__":
    main()
