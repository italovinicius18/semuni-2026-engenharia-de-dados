"""A silver marca defeito em coluna e nao apaga nada. Estes testes seguram isso."""

from __future__ import annotations

from pipeline.camadas.silver import transformar

# esquema explicito, nao inferido: a bronze e toda string de proposito, e uma
# coluna inteira nula (txtCNPJCPF nos casos do SIGEPA) nao tem tipo para inferir
ESQUEMA = (
    "txNomeParlamentar string, sgUF string, sgPartido string, "
    "txtDescricao string, txtFornecedor string, txtCNPJCPF string, "
    "vlrDocumento string, vlrGlosa string, vlrLiquido string, "
    "numAno string, numMes string, ano_ref int"
)
COLUNAS = [c.strip().split()[0] for c in ESQUEMA.split(",")]


def linha(**kw):
    base = {c: None for c in COLUNAS}
    base.update({
        "txNomeParlamentar": "FULANO", "sgUF": "DF", "sgPartido": "XX",
        "txtDescricao": "COMBUSTIVEIS", "txtFornecedor": "POSTO",
        "vlrDocumento": "100.00", "vlrGlosa": "0.00", "vlrLiquido": "100.00",
        "numAno": "2025", "numMes": "3", "ano_ref": 2025,
    })
    base.update(kw)
    return tuple(base[c] for c in COLUNAS)


def monta(spark, linhas):
    return transformar(spark.createDataFrame(linhas, ESQUEMA)).collect()


def test_nada_e_descartado(spark):
    """Tres registros esquisitos entram, tres registros saem."""
    linhas = [
        linha(vlrLiquido="-500.00"),                 # estorno
        linha(txtCNPJCPF=None),                      # SIGEPA
        linha(vlrGlosa="40.00", vlrLiquido="60.00"),  # glosa
    ]
    assert len(monta(spark, linhas)) == 3


def test_estorno_vira_coluna(spark):
    (r,) = monta(spark, [linha(txtCNPJCPF="12345678000199", vlrLiquido="-500.00")])
    assert r.eh_estorno is True
    assert r.vlr_liquido == -500.0   # o valor continua la, com o sinal original


def test_sem_cnpj_e_sigepa(spark):
    (r,) = monta(spark, [linha(txtCNPJCPF=None)])
    assert r.via_sigepa is True
    assert r.doc is None
    assert r.raiz_cnpj is None


def test_cnpj_vazio_conta_como_ausente(spark):
    """String vazia e ausencia disfarcada; se virasse '' o via_sigepa mentiria."""
    (r,) = monta(spark, [linha(txtCNPJCPF="   ")])
    assert r.via_sigepa is True


def test_raiz_do_cnpj_junta_as_grafias(spark):
    """A chave natural: duas filiais, dois CNPJs, uma empresa."""
    rs = monta(spark, [
        linha(txtCNPJCPF="12.345.678/0001-99", txtFornecedor="POSTO SOL"),
        linha(txtCNPJCPF="12345678000280", txtFornecedor="Posto Sol Ltda"),
    ])
    assert {r.raiz_cnpj for r in rs} == {"12345678"}


def test_cpf_nao_vira_raiz(spark):
    """CPF tem 11 digitos e nao tem raiz; inventar uma juntaria pessoas ao acaso."""
    (r,) = monta(spark, [linha(txtCNPJCPF="123.456.789-00")])
    assert r.doc == "12345678900"
    assert r.raiz_cnpj is None


def test_glosa(spark):
    (r,) = monta(spark, [linha(vlrDocumento="100.00", vlrGlosa="40.00",
                               vlrLiquido="60.00")])
    assert r.tem_glosa is True
    assert (r.vlr_documento, r.vlr_glosa, r.vlr_liquido) == (100.0, 40.0, 60.0)


def test_raiz_zerada_nao_e_empresa(spark):
    """Raiz 00000000 tem 14 digitos e passa em qualquer validacao de formato.

    Nao e um CNPJ: e o preenchimento que a Camara usa para o que ela mesma
    fornece, e nao e um valor so. Tratar como raiz juntava ramal, celular
    funcional e Correios num fornecedor de R$ 15,1 mi que nunca existiu.
    """
    rs = monta(spark, [
        linha(txtCNPJCPF="00000000000006", txtFornecedor="RAMAL"),
        linha(txtCNPJCPF="00000000000001", txtFornecedor="CELULAR FUNCIONAL"),
    ])
    assert [r.doc for r in rs] == ["00000000000006", "00000000000001"]  # o dado fica
    assert {r.raiz_cnpj for r in rs} == {None}         # mas nao vira chave
    assert all(r.servico_da_camara for r in rs)


def test_raiz_de_verdade_nao_e_confundida(spark):
    """Zeros no meio ou no fim sao normais; so a raiz toda zerada e sentinela."""
    (r,) = monta(spark, [linha(txtCNPJCPF="00306597000100")])
    assert r.raiz_cnpj == "00306597"
    assert r.servico_da_camara is False
