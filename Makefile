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
        consultar historico slides conferir teste limpar

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

# os testes rodam no cluster pela mesma razao que o pipeline: e la que existe
# uma SparkSession com o Delta no classpath
teste:
	docker compose exec -T -e PYTHONPATH=/opt/src:/opt/spark/python:$(PY4J) \
	  spark-master python3 -m pytest /opt/testes -v -p no:cacheprovider

# derruba o stack e apaga o lake. os CSVs em dados/ ficam.
limpar: descer
	docker volume rm -f semuni_minio-dados
