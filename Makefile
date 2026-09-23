PYTHON := .venv/bin/python
PY4J   := /opt/spark/python/lib/py4j-0.10.9.7-src.zip

# Duas maneiras de rodar o pipeline, porque sao duas coisas diferentes.
#
# NO CLUSTER: tudo que usa Spark. O driver sobe dentro do spark-master, onde o
# hostname `minio` existe e o Python e o mesmo dos executores. Rodar o driver no
# laptop daria um erro chato de achar: o endereco do MinIO viaja do driver para
# os executores, e `localhost:9000` nao quer dizer nada la dentro.
#
# NO LAPTOP: so a ingestao. Baixar 538 MB de CSV e copiar para o object storage
# e trabalho de cliente HTTP, nao de motor de processamento.
NO_CLUSTER := docker compose exec -T \
  -e PYTHONPATH=/opt/src:/opt/spark/python:$(PY4J) \
  spark-master python3 -m pipeline
NO_LAPTOP  := S3_ENDPOINT=http://localhost:9000 PYTHONPATH=src $(PYTHON) -m pipeline

.PHONY: preparar jars subir descer pipeline ingestao bronze silver gold ano \
        consultar historico slides conferir numeros pptx demo teste limpar

preparar:
	python3 -m venv .venv
	.venv/bin/pip install --upgrade pip
	.venv/bin/pip install -r requirements.txt

# os jars vem antes: sem eles o Spark nao fala s3a:// nem Delta, e no dia da
# aula pode nao haver wi-fi para baixar
jars:
	./docker/baixar-jars.sh

subir: jars
	docker compose up -d --build --wait
	@echo "MinIO  console: http://localhost:9001  (semuni/semuni2026)"
	@echo "Spark  master:  http://localhost:8080"
	@echo "Jupyter:        http://localhost:8888  (token: semuni)"

descer:
	docker compose down

# --- o pipeline, inteiro ou uma camada por vez -------------------------------
# Cada camada roda sozinha porque cada uma le do lake e escreve no lake. Isso
# nao e organizacao de codigo: e a razao de existir do medalhao. Errou a regra
# da silver, roda `make silver` e a bronze nem fica sabendo.

pipeline: ingestao
	$(NO_CLUSTER) rodar --camadas bronze,silver,gold

ingestao:
	$(NO_LAPTOP) rodar --camadas ingestao

bronze:
	$(NO_CLUSTER) rodar --camadas bronze

silver:
	$(NO_CLUSTER) rodar --camadas silver

gold:
	$(NO_CLUSTER) rodar --camadas gold

# reprocessa um ano so, nas tres camadas:  make ano ANO=2023
ano:
	$(NO_CLUSTER) rodar --camadas bronze,silver,gold --anos $(ANO)

# consulta ad-hoc em SQL, boa para projetar:  make consultar Q='select ...'
consultar: Q ?= SELECT fornecedor, total FROM fornecedores_total ORDER BY total DESC LIMIT 10
consultar:
	$(NO_CLUSTER) consultar "$(Q)"

# o _delta_log: uma versao por escrita, e as anteriores continuam consultaveis
historico:
	$(NO_CLUSTER) historico

# --- apresentacao ------------------------------------------------------------
slides:
	apresentacao/montar.sh

conferir:
	$(PYTHON) apresentacao/conferir.py

# recalcula do dados/ cada numero que os slides dizem. a Camara republica os
# CSVs; um slide com numero que o dados/ nao produz mais e um slide errado
numeros:
	$(PYTHON) apresentacao/numeros.py

# a mesma aula em PowerPoint, para quem pedir .pptx. o HTML continua sendo o
# que se projeta; este e o arquivo do e-mail e do pendrive
pptx: apresentacao/node_modules
	cd apresentacao && node pptx.js

apresentacao/node_modules: apresentacao/package.json
	cd apresentacao && npm install --silent

# a sequencia da demo ao vivo, na ordem dos slides 11 a 18. serve para colar no
# terminal e para gravar o apresentacao/demo.webm de reserva
demo:
	@echo "# slide 11 — Docker: o que ele simula"
	@echo "docker compose ps"
	@echo "# slide 12 — onde o dado mora; comeca o pipeline nos sete anos (~2 min)"
	@echo "make pipeline"
	@echo "# slide 13 — enquanto roda: console do MinIO em http://localhost:9001, lake/bronze/ano_ref=..."
	@echo "# slide 14 — o pipeline terminou"
	@echo "make historico"
	@echo "make teste"
	@echo "# slide 15 — a mesma pergunta nas duas pontas"
	@echo "make consultar Q='SELECT txtFornecedor, sum(vlrDocumento) t FROM delta.\\`s3a://lake/bronze\\` WHERE numAno=2025 GROUP BY 1 ORDER BY 2 DESC LIMIT 3'"
	@echo "make consultar"
	@echo "# slide 18 — elasticidade: o worker 3 sobe, com o Spark UI em http://localhost:8080"
	@echo "docker compose up -d --scale spark-worker=3"

# os testes rodam no cluster pela mesma razao que o pipeline: e la que existe
# uma SparkSession com o Delta no classpath
teste:
	docker compose exec -T -e PYTHONPATH=/opt/src:/opt/spark/python:$(PY4J) \
	  spark-master python3 -m pytest /opt/testes -v -p no:cacheprovider

# derruba o stack e apaga o lake. os CSVs em dados/ ficam.
limpar: descer
	docker volume rm -f semuni_minio-dados
