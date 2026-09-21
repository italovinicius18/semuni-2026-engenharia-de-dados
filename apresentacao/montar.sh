#!/usr/bin/env bash
# Monta apresentacao/aula.html a partir dos tres pedacos em fontes/.
#
# Sem fontes tipograficas embutidas, de proposito: o deck usa a fonte do
# sistema, entao o arquivo fica em 32 KB em vez de 320 KB e continua abrindo
# sem internet. O auditorio da UnB pode nao ter wi-fi; o deck nao depende disso.
set -euo pipefail
cd "$(dirname "$0")"

cat fontes/cabecalho.html fontes/slides.html fontes/rodape.html > aula.html

if grep -qE 'https?://' aula.html; then
  echo "ERRO: sobrou link externo no deck — ele precisa abrir sem internet" >&2
  grep -nE 'https?://' aula.html >&2
  exit 1
fi

n=$(grep -c '<section class="slide' fontes/slides.html)
echo "apresentacao/aula.html — $n slides, $(du -h aula.html | cut -f1), offline"
echo "confira o estouro com: make conferir"
