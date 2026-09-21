"""Conferencias de qualidade entre as camadas.

Aqui esta a decisao de projeto que mais aparece na aula: este modulo **conta e
relata, nao filtra**. Cada regra e uma expressao SQL que descreve um registro
suspeito; o pipeline soma quantos batem e escreve no log. Nenhum registro sai da
tabela por causa de uma regra.

O motivo e chato e pratico. Um estorno de R$ -1.200 parece lixo ate a hora em
que a pergunta e "quanto foi devolvido". Uma passagem sem CNPJ parece dado
faltando ate voce descobrir que e o SIGEPA, o sistema da propria Camara. Se a
limpeza tivesse jogado os dois fora, a resposta certa teria virado impossivel e
ninguem saberia por que.

Regra que realmente impede a proxima camada de rodar (coluna que sumiu, ano
vazio) e outra coisa: essa para o pipeline, em `exigir_colunas` e
`exigir_nao_vazio`.
"""

# o Python do cluster e o 3.8; as anotacoes ficam adiadas para nao
# quebrar no import (list[int] | None so existe como sintaxe a partir do 3.10)
from __future__ import annotations

import logging
from dataclasses import dataclass

from pyspark.sql import DataFrame
from pyspark.sql import functions as F

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Regra:
    nome: str
    condicao: str   # SQL que define o registro SUSPEITO
    nota: str       # o que fazer com essa informacao


REGRAS_SILVER = [
    Regra("valor_liquido_nulo", "vlr_liquido IS NULL",
          "CSV com campo vazio; some da gold porque nao entra na soma"),
    Regra("estorno", "eh_estorno",
          "esperado: dinheiro devolvido. Fica na silver, sai da gold"),
    Regra("sem_cnpj", "via_sigepa",
          "esperado: passagem emitida pelo SIGEPA, nao tem fornecedor externo"),
    Regra("cnpj_sentinela", "servico_da_camara",
          "raiz 00000000: nao e empresa, e servico da propria Camara"),
    Regra("doc_fora_do_padrao", "doc IS NOT NULL AND length(doc) NOT IN (11, 14)",
          "nem CPF nem CNPJ; olhar antes de confiar na raiz_cnpj"),
    # a primeira versao desta regra era so `vlr_glosa > vlr_documento` e
    # acusava 53.112 registros, 3,4% da base. Nenhum era problema: sao estornos,
    # onde o documento e negativo e a glosa e zero, e 0 > -1175 e verdade. A
    # regra estava certa em SQL e errada em portugues. Por isso o pipeline
    # relata em vez de filtrar: filtro teria apagado 53 mil linhas boas e
    # ninguem ia notar.
    Regra("glosa_maior_que_documento", "NOT eh_estorno AND vlr_glosa > vlr_documento",
          "a Camara cortou mais do que o pedido; hoje da zero, e o esperado"),
    Regra("com_glosa", "tem_glosa",
          "a Camara cortou parte do valor: o liquido e menor que o pedido"),
    Regra("mes_invalido", "mes IS NOT NULL AND (mes < 1 OR mes > 12)",
          "mes 0 existe no arquivo e significa 'sem competencia'"),
]


def exigir_colunas(df: DataFrame, necessarias: list[str]) -> None:
    """Falta de coluna e erro de contrato, nao de dado: para o pipeline."""
    faltando = [c for c in necessarias if c not in df.columns]
    if faltando:
        raise ValueError(f"colunas ausentes: {faltando}. presentes: {df.columns}")


def exigir_nao_vazio(df: DataFrame, rotulo: str) -> int:
    n = df.count()
    if n == 0:
        raise ValueError(f"{rotulo} veio vazio; a camada seguinte nao tem o que ler")
    return n


def conferir(df: DataFrame, regras: list[Regra], rotulo: str) -> dict[str, int]:
    """Conta quantos registros batem em cada regra. Devolve o relatorio."""
    total = df.count()
    # uma passada so: cada regra vira um sum(case when) na mesma agregacao
    somas = [F.sum(F.expr(r.condicao).cast("int")).alias(r.nome) for r in regras]
    linha = df.agg(*somas).collect()[0].asDict()

    logger.info("qualidade %s: %s registros", rotulo, f"{total:,}".replace(",", "."))
    for r in regras:
        n = linha[r.nome] or 0
        if n:
            pct = 100 * n / total
            logger.info("  %-26s %9s  (%.2f%%)  %s",
                        r.nome, f"{n:,}".replace(",", "."), pct, r.nota)
    return {"total": total, **{k: (v or 0) for k, v in linha.items()}}
