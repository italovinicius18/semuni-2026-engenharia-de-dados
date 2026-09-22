# Aula SEMUNI 2026 refeita sobre o roteiro de `apresentacao/APRESENTACAO.md`

Data: 22/09/2026. Aula em 23/09/2026, Seminário em Cloud (profa. Aleteia), UnB.
Formato fixo: 35 minutos de fala e 10 de perguntas. Plateia mista, boa parte na
graduação; tudo o que aparece deve ser reproduzível por quem assistiu.

## 1. O que muda e o que fica

A espinha da aula passa a ser o roteiro: introdução, metodologia, prática,
resultados, conclusão. O caso da cota parlamentar (CEAP) é o exemplo dentro de
cada seção. A narrativa atual ("quem recebeu o dinheiro?", três respostas, duas
erradas) sai; o material técnico fica e é reorganizado.

Decisões tomadas com o Ítalo, nesta ordem:

| pergunta | decisão |
|---|---|
| espinha | o roteiro (A) |
| o que sobrevive do deck atual | o técnico; sai a história e os "erros meus" (B) |
| profundidade em lakehouse e formatos | o repositório mais o panorama Delta/Iceberg/Hudi (B) |
| a seção prática | ao vivo com screencast de reserva (C); o pipeline roda nos sete anos, não um só |
| conclusão | esqueleto proposto por mim, fonte escolhida por ele: Joseph Machado, *Data Engineering Projects* (startdataengineering.com, 14/06/2024) |
| ordem das seções | prática antes de resultados (abordagem 2), porque os resultados são lidos da gold que a prática acabou de escrever |
| padrões de comunicação | no-ai-slop (petergyang) e unslop (theclaymethod), adaptados na seção 3 |

Título: **Engenharia e processamento de dados local focado em gastos políticos**.

Fixo e não negociável: nenhum nome de deputado em slide, nota ou demo. O dado é
sempre somado por fornecedor. O slide 2 diz isso uma vez.

Fica: tema escuro, janela de terminal como motivo, glossário `.termos` no rodapé,
`cabecalho.html` e `rodape.html` intocados, `conferir.py`, `pptx.js` (reescrito
para os slides novos), `make slides`, `make conferir`, `make pptx`.

Sai: capa com a pergunta, pódio errado com carimbo, o conserto do dicionário,
"a soma certa, a resposta errada", "quatro erros meus". O exemplo do documento
sentinela `000.000.000/0001-0` fica, como achado.

## 2. O arco: 21 slides, 35 minutos

Minuto-alvo entre parênteses (vai em `data-min`). "= N" indica o slide atual
reaproveitado; "novo" não existe hoje. Números citados vêm de `README.md`
("Os números") ou foram medidos nesta sessão sobre `dados/`; a seção 6 diz como
cada um é conferido.

### Introdução (5 min)

1. (0) Capa. Título, "SEMUNI 2026 · Seminário em Cloud", nome e data.
2. (1) O dado e como acessá-lo. Portal da Câmara, um CSV por ano, publicação
   obrigatória por lei. 7 arquivos · 538 MB · 32 colunas · 1.560.019 lançamentos.
   A regra da aula: nenhum deputado nomeado; o dado é somado por fornecedor.
   Novo. Glossário: CEAP, lançamento.
3. (2) Por que conhecer o negócio do dado importa. Cinco palavras do domínio,
   uma linha cada: lançamento, glosa, estorno, SIGEPA, raiz do CNPJ. O exemplo em
   uma frase: companhia aérea no topo da soma por fornecedor é passagem emitida
   pelo sistema da Câmara, sem CNPJ na linha; das 38.113 linhas de aérea em 2025,
   37.114 não têm CNPJ. Novo; condensa os atuais 3 a 6 sem a história.
4. (3) O dado muda de forma. A tabela de lançamentos sem CNPJ por ano, 2019 a
   2025 (1,5 % → 25,0 % → 18,1 %). Legenda: a Câmara mudou como registra o voo; o
   script de 2019 continuou igual. = 7, legenda reescrita (seção 3, regra 5).

### Metodologia (9 min)

5. (5) A linha de base. O script pandas de oito linhas, `encoding="utf-8"`. É o
   "processo padrão" do roteiro; a comparação das seções seguintes é contra ele.
   = 3, sem o pódio. Glossário: pandas.
6. (6) O que a linha de base não segura. O mesmo script sobre o `Ano-2025.csv`
   baixado em 04/09 (208.246 linhas, TAM R$ 22,8 mi) e em 18/09 (209.066, R$ 16,4
   mi). Sem rastro de qual arquivo produziu qual número. Daqui nasce a
   necessidade de arquitetura. = 8, sem a tese em h2. Glossário: pipeline,
   reprodutível.
7. (7) Camadas. Bronze, silver, gold com os números reais (1.560.019 linhas; sete
   colunas de defeito marcado; 55.672 empresas pela raiz do CNPJ) e por que
   guardar o bruto (5 GB; a Câmara republica). = 9. Glossário: camada, medalhão
   (reescrito sem "não tecnologia"), raiz do CNPJ, chave natural.
8. (9) Formatos e processamento massivo. Três números grandes: 74,5 MB → 5,3 MB
   (CSV → Parquet zstd); 118 ms → 3 ms (mesma consulta); 0,60 MB de 5,30 MB
   (consulta de três colunas lê 11,3 % do arquivo). Legenda: colunar, compressão
   e partição por ano são o que faz "massivo" caber numa máquina. Novo.
   Glossário: Parquet, colunar, partição.
9. (11) Lakehouse. Tabela aberta (Delta) sobre Parquet em object storage; o
   `_delta_log` ao lado dos dados; confiabilidade = escrita atômica, consistência
   = histórico consultável. A tabela `DESCRIBE HISTORY` real: v0 209.079 linhas
   (sem multiLine), v1 209.066; `VERSION AS OF 0`. = 15, reenquadrado como
   propriedade do lakehouse. Glossário: lakehouse, Delta Lake, transação, viagem
   no tempo.
10. (13) Delta, Iceberg e Hudi. Tabela de três linhas por quatro colunas: formato
    · projeto que mantém · como guarda o histórico · onde é o padrão. Só fato
    verificável na documentação de cada projeto; sem adjetivo, sem "mais
    adotado". Uma linha de fecho: é a área de pesquisa do Ítalo e a ponte para
    quem quiser pós-graduação. Novo. Glossário: Iceberg, Hudi.

### Prática (9 min; o pipeline roda nos sete anos durante esta seção)

11. (14) Docker: o que é e o que simula aqui. `docker compose ps` na tela: cinco
    containers (spark-master, dois spark-worker, minio, notebook). O desenho do
    slide 17 atual, com a legenda "um cluster Spark e um object storage, na sua
    máquina". = 17, reescrito. Glossário: container, imagem, volume.
12. (15) Onde o dado mora, como é referenciado e processado. Uma linha de caminho,
    `s3a://lake/bronze/ano_ref=2023/…`, decomposta: endpoint, bucket, tabela,
    partição, arquivo Parquet + `_delta_log`. Uma consulta que lê só uma
    partição. **`make pipeline` começa neste slide.** Novo. Glossário: s3a://,
    endpoint, object storage.
13. (17) Enquanto roda: código aberto, e os nomes na nuvem. MinIO, Spark, Delta,
    Docker, e a linha de cada um: EMR/Dataproc/Databricks/Synapse; S3/GCS/Blob.
    O console do MinIO aberto noutra aba mostrando `lake/bronze/ano_ref=…`
    enchendo. A nota tem fala para até 4 minutos. = 18. Glossário: compute e
    storage separados, elasticidade.
14. (20) O pipeline terminou. `make historico` (uma versão por escrita) e `make
    teste` (21 testes em 11 s, dois com nome de bug real). = 16. Glossário:
    SparkSession, CI.

### Resultados (8 min, lidos da gold recém-escrita)

15. (23) A mesma pergunta nas duas pontas. `make consultar` sobre o bronze
    (TAM · GOL · AZUL) e sobre a gold (FACEBOOK · PANTANAL · VIVO) em 2025, ao
    vivo. R$ 3,25 mi, Facebook Serviços Online do Brasil. Uma frase sobre a
    diferença para a soma por nome (R$ 3,30 mi): a gold soma o reembolso, não a
    nota, e agrupa por CNPJ. = 10 + 11 fundidos. Glossário: SQL.
16. (25) Achado 1: o que está dentro dos R$ 16,4 mi da TAM em 2025. R$ 22.787.293
    positivos, R$ −6.384.830 em 5.433 linhas, soma R$ 16.402.463. Estornos:
    marcar em coluna em vez de apagar. = 12. Glossário: estorno, glosa.
17. (26) Achado 2: `grep chatgpt`. 58 linhas, nove grafias, 57 com o documento
    `000.000.000/0001-0`, uma com CNPJ real. Formato válido e significado válido
    são coisas diferentes. = 13. Glossário: dígito verificador.
18. (28) Local e nuvem: quando cada um faz sentido. As duas colunas atuais, com
    bolinha verde dos dois lados, e uma linha nova: o mesmo desenho serve para
    dado do TSE, do DataSUS e do INEP. `--scale spark-worker=3` com o Spark UI
    aberto. = 19. Glossário: governança.

### Conclusão (4 min)

19. (31) Como iniciar. As quatro práticas do Joseph Machado (versionamento,
    organização de código padrão de mercado, testes e checagens de qualidade,
    ferramentas em demanda) e onde cada uma está neste repositório: git,
    `src/pipeline/`, `testes/` + `qualidade.py`, Spark/Delta/MinIO/Docker. Novo.
20. (32) Portfólio e o que estudar. A escada dele, do mais simples ao mais
    complexo: DuckDB → batch com Spark e MinIO → dbt → CDC com Debezium/Kafka →
    streaming com Flink. "Esta aula é o projeto batch com Spark e MinIO, com dado
    brasileiro." O que estudar, em uma linha por item: SQL, um motor (Spark ou
    DuckDB), formatos colunares, Docker, object storage, uma nuvem até saber o
    que se está pagando. Novo.
21. (33) Fecho. `make subir · make pipeline`, o endereço do repositório, perguntas.
    Termina no comando; sem lição de moral. = 20, sem o h2 atual.

## 3. Padrões de comunicação

Fontes: petergyang/no-ai-slop (README: dez padrões) e theclaymethod/unslop
(README: famílias `hard` e `soft`). Regras aplicadas ao texto dos slides, notas e
glossário:

1. Sem contraste binário: "não é X, é Y", "não X. Y.", "X não é Y: é Z".
2. Sem fragmento dramático ("Só isso.") nem revelação com dois-pontos ("O melhor:
   …"). Rótulo de slide é frase nominal.
3. Sem pergunta retórica com autorresposta.
4. Sem inflação de importância (fundamental, essencial, crucial, pivotal,
   poderoso, revolucionário) nem atribuição vaga (estudos mostram, especialistas,
   o mercado). Onde houver número, o número; onde houver fonte, o nome.
5. Sem agência falsa ("os dados falam", "o dado conta uma história", "o chão
   andou").
6. Travessão: no máximo um por slide. Adaptação consciente: o unslop pede zero,
   mas travessão é pontuação corrente em português.
7. Frases de tamanho variado; sem sequência de três frases curtas de efeito; sem
   tríade de adjetivos ou de verbos curtos.
8. Sem coda moralizante no fecho.
9. Voz ativa com sujeito nomeado.
10. Fatos são sagrados: todo número no slide é medido neste repositório com este
    `dados/`, e a nota do apresentador diz de onde veio quando não for óbvio.

Exceções: o glossário `.termos` é definição, tem forma fixa e não entra nas
regras 2 e 7. Listas com rótulo em negrito são aceitas quando a fonte é uma
lista (slide 19).

Verificação: `conferir.py` ganha a função `confere_texto(slides_html)` que
acusa, por slide, (a) "não é … , é …" e "não … . … ." no mesmo parágrafo,
(b) mais de um "—", (c) qualquer palavra da lista da regra 4, (d) tríade "X, Y e
Z" de adjetivos em `.legenda` ou `<p>`. Falso positivo é marcado no HTML com
`data-ok="motivo"` no elemento, e o motivo aparece na saída do conferir.

## 4. A demo e a rede de segurança

Tudo roda local; `ingestao.baixar` pula o download quando o CSV já está em
`dados/` (`src/pipeline/camadas/ingestao.py`, linha 38), então nenhum passo
depende de internet.

| slide | comando | onde aparece | tempo |
|---|---|---|---|
| 11 | `docker compose ps` | terminal | 5 s |
| 12 | `make pipeline` | terminal | inicia; ~2 min em 2 workers |
| 13 | (rodando) | console do MinIO, `lake/bronze/ano_ref=…` | fala de 2 a 4 min |
| 14 | `make historico`, `make teste` | terminal | 11 s de testes |
| 15 | `make consultar Q='SELECT txtFornecedor, sum(vlrDocumento) t FROM delta.\`s3a://lake/bronze\` WHERE numAno=2025 GROUP BY 1 ORDER BY 2 DESC LIMIT 3'` e `make consultar` | terminal | 2 consultas |
| 18 | `docker compose up -d --scale spark-worker=3` | Spark UI | 20 s |

Rede de segurança: `apresentacao/demo.webm`, screencast de 3 a 4 minutos com
exatamente essa sequência, gravado no laptop do Ítalo com a mesma fonte de
terminal, depois de o deck estar pronto. A nota de cada slide de demo diz: "se
não subir em 30 s, abra `demo.webm` no minuto M:SS", com o minuto daquele passo.
Se o deck mudar depois da gravação, o vídeo é regravado.

Alvo novo `make demo`: imprime a sequência de comandos acima, na ordem, para
colar no terminal ou usar como roteiro da gravação.

Checklist de véspera (vai para o README, "Apresentar"): `make subir` na noite
anterior; `make pipeline` de manhã, para aquecer o cache e conferir os números;
MinIO, Spark UI e terminal abertos em abas; fonte do terminal em 20 pt ou mais;
`demo.webm` no mesmo diretório do `aula.html`; `aula.html` em tela cheia no slide 1.

Riscos aceitos: o pipeline passar de 2 min (a nota do 13 cobre até 4); os jars
do Spark faltarem (`make subir` depende de `jars` e falha na véspera); o worker 3
não subir por RAM (o vídeo cobre; o slide mostra o desenho tracejado e não afirma
que subiu).

## 5. Visual, glossário e build

Visual: tema, tokens e componentes atuais. Componentes reaproveitados nos slides
novos: `.gigante` em linha para os três números do slide 8; `.corpo.denso` para a
tabela do slide 10; `.dois`/`.col` para o slide 19. Sem imagem, logo ou ícone.

Glossário: entram lakehouse, Parquet, colunar, transação, Iceberg, Hudi,
container, imagem, volume, CI. Saem ad-hoc e normalizar. Os demais ficam. A
regra continua: não se lê em voz alta.

Build: `fontes/slides.html` reescrito com os 21 slides; `cabecalho.html` e
`rodape.html` intocados; `make slides` monta; `pptx.js` reescrito para os 21
slides e `make pptx` regenera `aula.pptx`. `APRESENTACAO.md` fica no repositório
com uma linha no topo: "roteiro que originou a versão de 22/09/2026; o deck é a
fonte da verdade a partir daí". README: seção "O arco" reescrita para as cinco
seções; "Apresentar" ganha o checklist de véspera e a referência ao `demo.webm`.

## 6. Verificação

Na ordem em que roda:

1. `make conferir`: estouro e corte por slide (como hoje) mais `confere_texto`.
   Critério: zero achados, ou `data-ok` com motivo.
2. `apresentacao/numeros.py`: recalcula a partir de `dados/` cada número que
   aparece nos slides (linhas por ano e sem CNPJ; TAM 2025 positiva, negativa,
   soma e contagem; grep chatgpt: linhas, grafias, documentos; total de
   lançamentos; CSV → Parquet: tamanho, tempo e bytes lidos, medidos com DuckDB
   sobre `dados/Ano-2025.csv`) e compara com o que está em `slides.html`.
   Critério: nenhuma diferença. Os números do slide 6 (04/09) não são
   recalculáveis, porque o arquivo de 04/09 não foi guardado; ficam marcados como
   "registrados em memória em 18/09/2026" e não entram no script.
3. `make pptx`, depois `validate.py` da skill de pptx e `markitdown`: 21 slides,
   21 notas, nenhum resto.
4. Ensaio cronometrado com `t`; `data-min` ajustados ao medido.
5. Render visual do `.pptx` com LibreOffice, se instalado; senão a checagem por
   geometria com python-pptx, como feita em 22/09.

## 7. Fora de escopo

Mudar tema ou tokens; instalar fontes; animação no `.pptx`; notebook em
`analise/` (continua pendente, independente desta aula); qualquer nome de
deputado; comparação de custo em dinheiro entre local e nuvem (a comparação é de
contexto, não de fatura, decisão anterior registrada em memória).
