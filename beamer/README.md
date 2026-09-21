# Slides no Overleaf

Versão LaTeX/Beamer da aula, no mesmo tema da proposta 2: papel quadriculado
azul-tinta para o raciocínio, janela de terminal escura para a prova.

20 frames, 34 páginas de PDF (a diferença são os overlays `\onslide`),
160 × 90 mm — 16:9, do jeito que o projetor da sala espera.

## Subir para o Overleaf

1. No Overleaf: **New Project → Upload Project**.
2. Mande **os dois arquivos**, na raiz do projeto:
   - `main.tex`
   - `semuni.sty`  ← sem ele o projeto não compila; é o tema inteiro
3. Não mexa no compilador. **pdfLaTeX** é o padrão do Overleaf e é o que este
   projeto usa. XeLaTeX/LuaLaTeX vão brigar com o `sourcesanspro`.
4. `Recompile`. Leva uns 20 s na primeira vez porque o Overleaf busca as fontes.

Não suba `main.pdf`, `main.aux`, `main.log` e companhia — o Overleaf gera tudo.
Se subir a pasta inteira por engano, apague os auxiliares lá dentro.

## PDF com as notas do apresentador

Cada frame tem um `\note{}` com o que dizer. Para gerar a versão com a nota ao
lado do slide:

1. Em `main.tex`, logo abaixo do `\usepackage{semuni}`, descomente a única linha
   comentada que sobrou ali:
   ```latex
   % \setbeameroption{show notes on second screen=right}
   ```
2. Recompile e baixe o PDF. Ele sai com 907 × 255 pt — **o dobro da largura**:
   slide à esquerda, nota e miniatura à direita.
3. **Comente a linha de novo** antes de gerar o PDF de projeção. O PDF largo não
   serve para apresentar — o projetor corta a metade da nota ou encolhe o slide.

Na prática: duas compilações, dois downloads, dois arquivos no pendrive
(`aula.pdf` e `aula-notas.pdf`).

## Compilar aqui, sem Overleaf

```bash
cd beamer
latexmk -pdf main.tex      # gera main.pdf
latexmk -c                 # limpa os auxiliares
```

Precisa de TeX Live com `beamer`, `tcolorbox`, `tikz`, `sourcesanspro`,
`sourcecodepro`, `ragged2e`.

## Onde mexer

| Quero mudar | Vou em |
|---|---|
| texto de um slide | `main.tex`, os frames estão numerados em comentário com o minuto-alvo |
| cor, fonte, grade do papel | `semuni.sty`, bloco de `\definecolor` no topo |
| a janela de terminal | `semuni.sty`, ambiente `terminal` (as três bolinhas são desenhadas no `overlay`) |
| as duas colunas da comparação | `semuni.sty`, caixa `lado` e ambiente `beneficios` |
| o diagrama da arquitetura | `main.tex`, frame 16 — usa os helpers `\bloco` e `\blocoq` |

Duas coisas que já custaram tempo e estão comentadas no código, não repita:

- Um frame que **começa com `{`** faz o Beamer achar que aquilo é o título do
  frame e estourar com `Paragraph ended before \beamer@inlineframetitle was
  complete`. Para frase de tela cheia use a macro `\frase{...}`.
- Dentro da caixa `lado`, o rótulo é `\ttfamily`. Sem o `\normalfont` logo
  depois dele, a fonte mono vaza para o corpo inteiro da caixa.

## Estado

Compila com `exit=0`, 34 páginas, sem `Overfull \vbox` e sem `Underfull`.
Sobram alguns `Overfull \hbox` de fração de ponto dentro das caixas do
`tcolorbox` — invisíveis no PDF, deixados de propósito.

A versão HTML da mesma aula está em `../apresentacao/aula.html`, e sai de
`make slides`. As duas contam a mesma aula: se você mudar uma, mude a outra.
