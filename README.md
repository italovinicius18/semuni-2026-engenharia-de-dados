# Quem recebeu o dinheiro?

Aula de engenharia de dados para a SEMUNI 2026 (UnB), dentro do Seminário em Cloud
da professora Aleteia, em 23/09/2026.

**Formato combinado com ela:** 35 min de fala + 10 min de perguntas.

## Onde está cada coisa

```
config/            config.yaml — fonte, credenciais do MinIO, Spark
src/pipeline/      o pipeline, uma camada por arquivo
  camadas/         ingestao → bronze → silver → gold
  infra/           sessão Spark e acesso ao object storage
  qualidade.py     regras que contam e relatam; nenhuma filtra
  consulta.py      SQL ad-hoc e DESCRIBE HISTORY, para projetar ao vivo
testes/            21 testes das transformações, sem MinIO e sem cluster
apresentacao/      o deck HTML e o script que mede se algo estourou
docker/            Dockerfile do cluster e o script que baixa os jars
dados/             os CSVs da Câmara (fora do git; `make ingestao` rebaixa)
```

## Rodar o pipeline

```
make preparar      # venv do laptop
make subir         # MinIO + Spark master + 2 workers + Jupyter
make pipeline      # os sete anos, ingestão → gold
```

Ou uma camada por vez, que é o ponto do medalhão:

```
make ingestao      # baixa os CSVs e põe na landing        (no laptop)
make bronze        # CSV → Delta, uma partição por ano     (no cluster)
make silver        # tipos certos, defeitos marcados       (no cluster)
make gold          # soma por raiz de CNPJ                 (no cluster)
make ano ANO=2023  # reprocessa só 2023, nas três camadas
```

Errou a regra da silver? `make silver`. A bronze nem fica sabendo — ela está no lake,
já lida, e reler o Delta leva segundos contra os 80s de reprocessar os 538 MB de CSV.

Consulta ad-hoc em SQL, boa para projetar no meio da aula:

```
make consultar Q='SELECT fornecedor, total FROM fornecedores_total ORDER BY total DESC LIMIT 10'
make historico     # o _delta_log: uma versão por escrita, todas consultáveis
```

```
make teste         # 21 testes, ~11s
```

### Por que metade roda no laptop e metade no cluster

O driver Spark sobe **dentro do `spark-master`**, não no laptop. Não é preciosismo: o
endereço do MinIO viaja do driver para os executores, e `localhost:9000` não quer dizer
nada dentro do container do worker. Além disso a imagem oficial do Spark 3.5.0 traz
Python 3.8, e driver e executor têm que falar a mesma versão.

O que sobra para o laptop é o que não precisa de cluster: baixar os 538 MB de CSV e
copiar para o object storage, que é trabalho de cliente HTTP. Por isso o
`requirements.txt` do laptop **não tem pyspark** — e por isso o `__main__.py` importa as
camadas de Spark só quando vai usá-las.

## Apresentar

Uma versão só, e é a que se projeta: **`apresentacao/aula.html`**. Arquivo único,
41 KB, abre no navegador sem internet e sem servidor, com relógio de palco,
fragmentos ao vivo e notas do apresentador.

São 20 slides, e o último mira o minuto 34.

Atalhos da versão HTML:

| tecla | faz |
|---|---|
| `→` `espaço` clique | avança (revela fragmento antes de trocar de slide) |
| `←` `shift+clique` | volta |
| `f` | tela cheia |
| `n` | notas do apresentador (mostram o minuto-alvo do slide) |
| `t` | liga e pausa o relógio de palco |
| `T` | zera o relógio |
| `Home` `End` | primeiro / último |

O relógio compara o tempo real com o minuto-alvo do slide. Se você estiver atrasado do
alvo em mais de 2 minutos, ele fica vermelho. Cada slide carrega seu alvo em `data-min`,
então dá para remanejar os tempos editando só o atributo.

A URL guarda o ponto exato: `aula.html#7` abre o slide 7, `aula.html#7.1` abre com o
primeiro fragmento já revelado. Útil para ensaiar um trecho.

## O arco

A aula defende uma tese: **o processo estruturado ganha do script ad-hoc não por
errar menos, mas por errar num lugar onde dá para ver.**

A capa promete **três respostas para a mesma pergunta, e as duas primeiras
erradas** — e o primeiro ato entrega as três, porque o caminho ad-hoc só
convence se for mostrado inteiro, e não como espantalho.

**Resposta 1 (slides 3–4).** O script que todo mundo escreve: oito linhas de
pandas, `groupby` no nome do fornecedor, `head(10)`. Roda até o fim e devolve um
pódio em que **o primeiro e o terceiro lugar são a mesma companhia aérea**
(`TAM` e `Cia Aérea - TAM`). Nenhum aviso, nenhuma exceção.

**Resposta 2 (slides 5–6).** O que de fato acontece depois: o analista vê o erro
e conserta. Entra um dicionário de apelidos e uma normalização de texto, e **o
conserto funciona** — AZUL tinha 50 grafias, VIVO 33, Facebook 4, e os R$ 3,3
milhões do Facebook param de aparecer partidos em dois. A soma agora está certa.
**E o pódio continua errado**, com TAM, GOL e AZUL em primeiro, segundo e
terceiro. Nenhum dicionário de nomes resolveria: das 38.113 linhas de companhia
aérea em 2025, **37.114 não têm CNPJ nenhum** — não são fornecedor, são SIGEPA,
o sistema de passagens da própria Câmara. O defeito nunca esteve na grafia.
Estava na pergunta.

Esse é o par que sustenta a aula. Sem ele a comparação seria entre um script
ingênuo e um pipeline pronto, que não é comparação nenhuma.

**O que nenhum conserto de script alcança (slide 8)** são três perguntas de
processo, não de código: de onde veio o número que você mandou no grupo mês
passado, se a sua resposta mudou quando a Câmara republicou o CSV, e qual dos
dois números está certo quando o colega roda o mesmo script. É daí que a tese
cai como conclusão, em vez de ser afirmada antes da prova.

**Resposta 3 (slides 11–13).** O pipeline. Daí em diante cada peça da
arquitetura entra porque pegou um erro concreto, e
todos os quatro são erros que eu cometi montando esta aula. O fecho é neutro:
mapeia MinIO → S3/GCS/Blob e Spark → EMR/Dataproc/Databricks, e lista quando
cada lado faz sentido, com quatro benefícios reais de cada. É o mesmo Apache
Spark e o mesmo Delta Lake dos dois lados; o que muda é quem opera. Nenhum slide
deprecia a nuvem — seria estranho num Seminário em Cloud, e seria falso.

### O achado que sustenta a tese

Lançamentos **sem CNPJ**, ano a ano:

| 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 |
|---|---|---|---|---|---|---|
| 1,5% | 10,3% | 19,9% | 22,4% | 24,5% | **25,0%** | 18,1% |

A Câmara foi movendo o registro do voo de "fornecedor com CNPJ" para "SIGEPA, sem
CNPJ". Um script afinado em 2025 mente sobre 2019, e vice-versa — sem quebrar. É
por isso que `ano_ref` é partição e não um filtro solto no meio do código.

O mesmo vale para uma assinatura de ChatGPT: em 2023 ela entra com o documento
`00000000000010` (gaveta interna da Câmara, 14 dígitos válidos) e em 2025 com o
CNPJ real `62531071000178`. Agrupar por nome dá duas empresas; agrupar por
documento sem tratar a sentinela dá uma empresa que não existe.

A linguagem visual alterna duas coisas de propósito: **palco** para o raciocínio
e os diagramas, montados peça por peça com os fragmentos; e **janela de
terminal** para as telas de prova, que afunda no palco em vez de flutuar sobre
ele.

## Os números

⚠️ **A Câmara republica os arquivos com correções.** Entre a primeira medição e esta, o
CSV de 2025 ganhou 820 linhas e o total da TAM caiu de R$ 22,8 mi para R$ 16,4 mi. Se
você rebaixar os dados antes da aula, **rode o pipeline e confira os números dos
slides** — ou não rebaixe, e apresente com o que está em `dados/`.

### Os sete anos, medidos em 19/09/2026

| | |
|---|---|
| anos | 2019–2025 |
| CSV bruto | 538 MB |
| bronze | 1.560.019 linhas |
| por ano | 289.830 · 167.132 · 218.765 · 209.556 · 232.745 · 232.925 · 209.066 |
| estornos | 56.912 (3,65%) |
| sem CNPJ (passagens SIGEPA) | 265.202 (17,00%) |
| CNPJ de raiz `00000000` (serviço da própria Câmara) | 108.900 (6,98%) |
| lançamentos com glosa | 78.505 |
| gold, empresa × ano | 128.761 linhas |
| gold, empresa nos sete anos | 55.672 empresas |
| pipeline inteiro | ~2 min em 2 workers |

Os primeiros do consolidado 2019–2025: **TAM R$ 49,96 mi**, **GOL R$ 46,34 mi**,
**Pantanal Veículos R$ 20,16 mi**, **Azul R$ 14,81 mi**, **Vivo R$ 14,80 mi**,
**Facebook R$ 9,81 mi**. A CASCOL, que a aula usa como exemplo das muitas grafias,
aparece em décimo com R$ 5,52 mi.

### 2025 isolado, que é o que os slides usam hoje

| | |
|---|---|
| linhas / colunas / tamanho | 209.066 / 32 / 74,5 MB |
| consulta crua (errada) | TAM 16.402.463 · GOL 6.052.551 · AZUL 4.696.245 |
| consulta limpa (certa) | Facebook 3.251.952 · Pantanal 3.227.315 · Telefonia 1.591.716 |
| grafias distintas da CASCOL, raiz `00306597` | 70, somando R$ 1.067.822 |
| CSV → Parquet zstd | 74,5 MB → 5,3 MB |
| mesma consulta, CSV vs Parquet | 118 ms → 3 ms |
| Parquet remoto, consulta de 3 colunas | baixa 0,60 MB de 5,30 MB (11,3%) |

### Duas regras que estavam erradas

A primeira versão de `glosa_maior_que_documento` era só `vlr_glosa > vlr_documento`.
Ela acusou 53.112 registros, 3,4% da base. Nenhum era problema: são estornos, onde o
documento é negativo e a glosa é zero, e `0 > -1175` é verdade. A regra estava certa em
SQL e errada em português.

É por isso que `qualidade.py` **relata em vez de filtrar**. Se aquela regra fosse um
filtro, teria apagado 53 mil linhas boas e ninguém ia notar. O teste
`test_estorno_nao_conta_como_glosa_maior` existe para impedir a volta.

A segunda foi pior, porque ia para o slide. A raiz do CNPJ aceitava qualquer documento
de 14 dígitos — e a Câmara usa uma faixa reservada para o que ela mesma fornece:
`00000000000001` é celular funcional, `...0006` é ramal, `...0007` são os Correios,
`...0010` é uma gaveta com 961 grafias diferentes. Todos com raiz `00000000`. Os sete
viraram **um fornecedor só, de R$ 15,1 mi**, que ia entrar na apresentação como o quarto
maior da série. Não existe essa empresa.

Formato válido não é a mesma coisa que significado válido, e nenhuma validação de CNPJ
teria pego isso — os dígitos verificadores batem. O que pegou foi olhar o nome que saiu
na consulta e estranhar. Ele estava escrito `RAMAL`.

Na `gold`, `F.first("fornecedor")` tinha o mesmo defeito de outra natureza: devolvia a
grafia que calhasse de vir na primeira partição, então a mesma empresa aparecia como
`Latam Linhas Aéreas S.A` num ensaio e `TAM LINHAS AEREAS S/A.` no seguinte. Hoje é
`F.mode`, que é o que o comentário sempre disse que era.

## Rebuild do deck

`apresentacao/aula.html` é gerado a partir de três pedaços em `apresentacao/fontes/`:

    make slides

- `cabecalho.html` — tokens de design e CSS (papel de engenharia + terminal)
- `slides.html` — os 20 slides; `data-nota` vira nota, `data-min` vira minuto-alvo
- `rodape.html` — navegação, relógio, escala do palco 1280×720, notas

O tema é escuro, e a razão é o conteúdo: sete dos vinte slides são janela de
terminal. No tema claro anterior elas eram retângulos pretos colados num papel
quadriculado, e o que a aula tem de mais importante parecia corpo estranho no
próprio slide. A escada de contraste agora é **terminal < palco < painel** — a
janela afunda, as caixas sobem, e nenhuma delas precisa de sombra.

Termos de engenharia de dados são descritos no slide em que aparecem, pelo
componente `.termos`: faixa fina acima do rodapé, termo em mono laranja e
descrição em uma linha. São 27 descrições em 16 slides. **Não se lê em voz
alta** — é referência para quem na plateia não é da área, não roteiro de fala.

O deck usa a fonte do sistema em vez de embutir IBM Plex em base64: o arquivo cai de
320 KB para 41 KB e continua abrindo sem internet. O build falha se sobrar qualquer
`http://` no HTML.

Depois de editar, confira que nada estourou:

    make conferir

Ele mede, em cada slide, a folga entre o fim do conteúdo e o rodapé, com todos os
fragmentos revelados (o pior caso de altura). Abaixo de 14px o slide está encostando.
Depois repete a conta para seis resoluções de projetor e confere que o palco cabe
inteiro na tela — em 16:9 exato tem que dar tela cheia, sem sobra.

Desde setembro de 2026 ele também acusa **conteúdo cortado por dentro**, e essa
checagem nasceu de um erro real: `.janela` tem `overflow:hidden` e, como item de
um flex column, encolhia sozinha quando o slide passava da altura. O slide 6
escondeu três dos sete anos da tabela de deriva por uma sessão inteira, e a
medida de folga não via nada — a caixa espremida cabia com 18px de sobra. O
conserto foi `flex:none` na janela, para o transbordo virar folga negativa em vez
de sumir, mais uma varredura por qualquer elemento com `scrollHeight` maior que
`clientHeight`. É o próprio argumento da aula aplicado ao deck: o erro não sumiu,
só passou a acontecer num lugar onde dá para ver.

## Ainda falta

- [ ] **Refazer o notebook.** O antigo era inteiro em DuckDB, apontava para `../data/`
      (que não existe mais) e fechava com "custo total desta aula: R$ 0,00" e "o que a
      nuvem vende não é o motor" — as duas frases que você já tinha vetado. Está na
      lixeira do job, não no repo. O novo deve ler a `gold` que o pipeline escreve.
- [ ] **Ensaiar cronometrado com `t` ligado.** A reescrita levou o corpo de 966 para
      1.261 palavras e os `data-min` são estimativa, não medição. Se estourar: o slide
      14 aguenta perder o quarto erro e o 16 sai inteiro sem furar o arco.
- [ ] Screencast de 90s do bloco remoto, como plano B se a demo travar
- [ ] Preencher a planilha da professora com título e minibio
- [ ] Confirmar as certificações antes de deixar a minibio ir para a leitura em voz alta
