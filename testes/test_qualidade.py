"""O relatorio de qualidade conta; quem decide o que fazer e a camada seguinte.

Dois testes aqui existem por causa de regras que ja estiveram erradas na base
real, e sao as linhas que impedem a volta:

  test_estorno_nao_conta_como_glosa_maior   `vlr_glosa > vlr_documento` acusava
                                            53.112 registros, todos estornos,
                                            porque 0 > -1175
  test_cnpj_sentinela_aparece_no_relatorio  a raiz 00000000 juntou ramal,
                                            celular funcional e Correios num
                                            fornecedor de R$ 15,1 mi
"""

from __future__ import annotations

import pytest

from pipeline.qualidade import REGRAS_SILVER, Regra, conferir, exigir_colunas, exigir_nao_vazio

ESQUEMA = ("vlr_documento double, vlr_glosa double, vlr_liquido double, "
           "doc string, mes int, eh_estorno boolean, tem_glosa boolean, "
           "via_sigepa boolean, servico_da_camara boolean")
COLUNAS = [c.strip().split()[0] for c in ESQUEMA.split(",")]

PADRAO = {
    "vlr_documento": 100.0, "vlr_glosa": 0.0, "vlr_liquido": 100.0,
    "doc": "12345678000199", "mes": 3,
    "eh_estorno": False, "tem_glosa": False,
    "via_sigepa": False, "servico_da_camara": False,
}


def linha(**kw):
    return tuple(dict(PADRAO, **kw)[c] for c in COLUNAS)


def monta(spark, linhas):
    return spark.createDataFrame(linhas, ESQUEMA)


def test_conta_sem_remover(spark):
    df = monta(spark, [
        linha(),
        linha(vlr_documento=-50.0, vlr_liquido=-50.0, eh_estorno=True),
        linha(vlr_glosa=20.0, vlr_liquido=60.0, doc=None,
              tem_glosa=True, via_sigepa=True),
    ])
    r = conferir(df, REGRAS_SILVER, "teste")
    assert r["total"] == 3
    assert r["estorno"] == 1
    assert r["sem_cnpj"] == 1
    assert r["com_glosa"] == 1
    assert df.count() == 3   # o relatorio nao encosta no DataFrame


def test_estorno_nao_conta_como_glosa_maior(spark):
    """0 > -1175 e verdade em SQL e falso em portugues."""
    df = monta(spark, [linha(vlr_documento=-1175.17, vlr_liquido=-1175.17,
                             doc=None, eh_estorno=True, via_sigepa=True)])
    assert conferir(df, REGRAS_SILVER, "teste")["glosa_maior_que_documento"] == 0


def test_glosa_maior_de_verdade_aparece(spark):
    df = monta(spark, [linha(vlr_glosa=150.0, vlr_liquido=-50.0, tem_glosa=True)])
    assert conferir(df, REGRAS_SILVER, "teste")["glosa_maior_que_documento"] == 1


def test_doc_fora_do_padrao(spark):
    """Nem CPF (11) nem CNPJ (14): a raiz nao pode ser confiada."""
    df = monta(spark, [linha(doc="123")])
    assert conferir(df, REGRAS_SILVER, "teste")["doc_fora_do_padrao"] == 1


def test_cnpj_sentinela_aparece_no_relatorio(spark):
    """Raiz 00000000: ramal, celular funcional, Correios. Nao e empresa."""
    df = monta(spark, [linha(doc="00000000000006", servico_da_camara=True)])
    assert conferir(df, REGRAS_SILVER, "teste")["cnpj_sentinela"] == 1


def test_coluna_ausente_para_o_pipeline(spark):
    """Fonte que muda de formato e erro de contrato, nao numero num relatorio."""
    df = monta(spark, [linha()])
    with pytest.raises(ValueError, match="colunas ausentes"):
        exigir_colunas(df, ["vlr_liquido", "coluna_que_a_camara_removeu"])


def test_camada_vazia_para_o_pipeline(spark):
    vazio = spark.createDataFrame([], "vlr_liquido double")
    with pytest.raises(ValueError, match="vazio"):
        exigir_nao_vazio(vazio, "silver")


def test_regra_nova_nao_precisa_de_codigo_novo(spark):
    """Uma regra e uma string de SQL; acrescentar uma e acrescentar uma linha."""
    df = monta(spark, [linha(mes=13)])
    minha = Regra("mes_absurdo", "mes > 12", "conferir a competencia na fonte")
    assert conferir(df, [minha], "teste")["mes_absurdo"] == 1
