// Gera apresentacao/aula.pptx com o mesmo conteudo de fontes/slides.html.
//
// O HTML continua sendo a versao que se projeta. Este arquivo existe para
// quem precisa de PowerPoint: a professora, o pendrive, o e-mail. Segue o
// que a Microsoft recomenda para um deck que abre em qualquer Office:
// 16:9, Calibri e Courier New (vem com o Office, nada para instalar),
// titulo 32-48pt, corpo 14-18pt, margem de 0,6", notas do apresentador
// no campo de notas e nao num quadro escondido no slide.
//
// O que nao viaja do HTML: os fragmentos. PowerPoint gerado por script nao
// tem animacao, entao cada slide mostra tudo de uma vez. As notas dizem
// onde fazer a pausa que o fragmento fazia.
//
// Versao de 22/09/2026: 21 slides sobre o roteiro de APRESENTACAO.md.
//
//   make pptx

const pptxgen = require("pptxgenjs");

const C = {
  papel: "101822", painel: "18222F", grade: "22303F",
  tinta: "EAF0F8", tinta60: "A9B6C6", tinta40: "7C8A9B",
  fumaca: "070C13", linha: "1E2937",
  laranja: "FF8A4C", verde: "48D597", vermelho: "FF6B63", ambar: "FFBE55",
  kw: "8E9FB5",
};
const SANS = "Calibri", MONO = "Courier New";
const W = 13.333, H = 7.5, M = 0.6, CW = W - 2 * M;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "Ítalo Vinícius";
pres.title = "Engenharia e processamento de dados local focado em gastos políticos";
pres.lang = "pt-BR";

let n = 0;
const TOTAL = 21;

// ---------- pecas ----------------------------------------------------------
function novo(rotulo, nota) {
  n += 1;
  const s = pres.addSlide();
  s.background = { color: C.papel };
  if (rotulo) s.addText(rotulo.toUpperCase(), { x: M, y: 0.42, w: CW, h: 0.3, fontFace: MONO, fontSize: 11,
    color: C.laranja, charSpacing: 3, margin: 0, isTextBox: true });
  s.addText(`${String(n).padStart(2, "0")} / ${TOTAL}`, { x: M, y: H - 0.5, w: 2, h: 0.25, fontFace: MONO,
    fontSize: 9, color: C.tinta40, margin: 0, isTextBox: true });
  s.addText("COTA PARLAMENTAR 2019–2025  ·  SEMUNI 2026 — UnB", { x: W - M - 6, y: H - 0.5, w: 6, h: 0.25,
    fontFace: MONO, fontSize: 9, color: C.tinta40, align: "right", charSpacing: 1, margin: 0, isTextBox: true });
  if (nota) s.addNotes(nota);
  return s;
}

function titulo(s, texto, opts = {}) {
  s.addText(texto, { x: M, y: opts.y ?? 0.8, w: opts.w ?? CW, h: opts.h ?? 0.9, fontFace: SANS,
    fontSize: opts.size ?? 32, bold: true, color: C.tinta, margin: 0, valign: "top", isTextBox: true });
}

function paragrafo(s, runs, y, opts = {}) {
  const r = Array.isArray(runs) ? runs : [{ text: runs }];
  s.addText(r.map(x => ({ text: x.text, options: { color: x.color ?? C.tinta60, bold: !!x.bold, italic: !!x.italic,
      fontFace: x.mono ? MONO : SANS, fontSize: x.mono ? (opts.size ?? 16) - 2 : (opts.size ?? 16), breakLine: !!x.br } })),
    { x: opts.x ?? M, y, w: opts.w ?? 9.4, h: opts.h ?? 1, fontFace: SANS, fontSize: opts.size ?? 16,
      color: C.tinta60, margin: 0, valign: "top", paraSpaceAfter: 6, isTextBox: true });
}

// A janela de terminal e o motivo do deck.
function janela(s, x, y, w, h, nome) {
  s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: C.fumaca }, line: { color: C.linha, width: 0.75 }, rectRadius: 0.08 });
  s.addShape(pres.ShapeType.rect, { x: x + 0.01, y: y + 0.01, w: w - 0.02, h: 0.42, fill: { color: "0C131C" }, line: { color: "0C131C", width: 0 } });
  [C.vermelho, C.ambar, C.verde].forEach((c, i) =>
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.2 + i * 0.2, y: y + 0.15, w: 0.12, h: 0.12, fill: { color: c }, line: { color: c, width: 0 } }));
  s.addText(nome, { x: x + 0.9, y: y + 0.08, w: w - 1.1, h: 0.26, fontFace: MONO, fontSize: 10, color: C.tinta60,
    charSpacing: 1, margin: 0, valign: "middle", isTextBox: true });
  return { x: x + 0.28, y: y + 0.6, w: w - 0.56 };
}

function codigo(s, area, linhas, size = 13) {
  const runs = [];
  linhas.forEach((l, i) => {
    const partes = typeof l === "string" ? [{ t: l }] : l;
    partes.forEach((p, j) => runs.push({ text: p.t, options: { color: p.c ?? C.tinta, bold: !!p.b,
      breakLine: j === partes.length - 1 && i < linhas.length - 1 } }));
  });
  s.addText(runs, { x: area.x, y: area.y, w: area.w, h: linhas.length * (size * 0.0215) + 0.1, fontFace: MONO,
    fontSize: size, color: C.tinta, margin: 0, valign: "top", lineSpacingMultiple: 1.15, isTextBox: true });
}

function tabela(s, area, cab, linhas, colW, opts = {}) {
  const borda = [{ type: "none" }, { type: "none" }, { type: "solid", pt: 0.5, color: C.linha }, { type: "none" }];
  const rows = [];
  if (cab) rows.push(cab.map(t => ({ text: t, options: { fontFace: MONO, fontSize: 9, color: C.tinta40, charSpacing: 2, border: borda } })));
  linhas.forEach(l => rows.push(l.map(c => {
    const cel = typeof c === "string" ? { t: c } : c;
    return { text: cel.t, options: { fontFace: cel.sans ? SANS : MONO, fontSize: opts.size ?? 12.5, color: cel.c ?? C.tinta60,
      bold: !!cel.b, border: borda } };
  })));
  s.addTable(rows, { x: area.x, y: area.y, w: area.w, colW, rowH: opts.rowH ?? 0.34, fill: { color: C.fumaca },
    margin: [0.04, 0.08, 0.04, 0.08], valign: "middle", autoPage: false });
}

function termos(s, lista, opts = {}) {
  const size = opts.size ?? 11, lh = size * 0.0235 + 0.05;
  const y = H - 0.7 - lista.length * lh;
  const runs = [];
  lista.forEach(([t, d], i) => {
    runs.push({ text: t + "   ", options: { fontFace: MONO, fontSize: size - 1, bold: true, color: C.laranja, charSpacing: 1 } });
    runs.push({ text: d, options: { fontFace: SANS, fontSize: size, color: C.tinta60, breakLine: i < lista.length - 1 } });
  });
  s.addText(runs, { x: M, y, w: CW - 0.4, h: lista.length * lh + 0.05, margin: 0, valign: "bottom", isTextBox: true });
}

function cartao(s, x, y, w, h) {
  s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: C.painel }, line: { color: C.grade, width: 0.75 }, rectRadius: 0.08 });
}

// tres ou quatro cartoes com rotulo mono, nome grande e descricao
function cartoes(s, y, h, itens, opts = {}) {
  const cols = opts.cols ?? itens.length, gap = 0.3;
  const cw = (CW - (cols - 1) * gap) / cols;
  itens.forEach(([k, nome, d], i) => {
    const x = M + (i % cols) * (cw + gap), yy = y + Math.floor(i / cols) * (h + gap);
    cartao(s, x, yy, cw, h);
    s.addText(k, { x: x + 0.3, y: yy + 0.18, w: cw - 0.6, h: 0.25, fontFace: MONO, fontSize: 10, color: C.laranja, charSpacing: 3, margin: 0, isTextBox: true });
    s.addText(nome, { x: x + 0.3, y: yy + 0.45, w: cw - 0.6, h: 0.55, fontFace: opts.mono ? MONO : SANS, fontSize: opts.size ?? 26, bold: true, color: C.tinta, margin: 0, isTextBox: true });
    s.addText(d, { x: x + 0.3, y: yy + 1.08, w: cw - 0.6, h: h - 1.2, fontFace: SANS, fontSize: 14, color: C.tinta60, margin: 0, valign: "top", isTextBox: true });
  });
}

const A = C.ambar, K = C.kw, P = C.verde, D = C.tinta40;

// =============================================================== 01 capa
{
  const s = novo(null, "Não se apresente: a professora leu a minibio. Diga o título e o que a plateia leva embora: um repositório que roda no laptop dela, com o mesmo software que roda na nuvem.");
  s.addText("SEMUNI 2026  ·  SEMINÁRIO EM CLOUD", { x: M, y: 1.7, w: CW, h: 0.3, fontFace: MONO, fontSize: 12, color: C.laranja, charSpacing: 3, margin: 0, isTextBox: true });
  s.addText("Engenharia e processamento de dados local focado em gastos políticos", { x: M, y: 2.1, w: 11.2, h: 2.2, fontFace: SANS, fontSize: 44, bold: true, color: C.tinta, margin: 0, valign: "top", isTextBox: true });
  paragrafo(s, "Sete anos de nota fiscal da Câmara, 1,56 milhão de linhas, processados num laptop com o mesmo software que roda na nuvem.", 4.5, { w: 9.6, size: 18, h: 0.9 });
  s.addText("Ítalo Vinícius  ·  23 de setembro de 2026", { x: M, y: 5.9, w: 8, h: 0.3, fontFace: MONO, fontSize: 11, color: C.tinta40, margin: 0, isTextBox: true });
}

// =============================================================== 02 o dado
{
  const s = novo("o dado, e como acessá-lo", "CEAP = Cota para o Exercício da Atividade Parlamentar. Verba mensal, prestação de contas, publicação obrigatória. Diga a regra da aula uma vez e não volte nela: nenhum deputado aparece.");
  titulo(s, "Uma nota fiscal por linha, um arquivo por ano.");
  paragrafo(s, [{ text: "A " }, { text: "CEAP", bold: true, color: C.tinta }, { text: " é a verba mensal de cada deputado. Ele gasta, presta contas, e a Câmara publica o CSV inteiro no portal de dados abertos (camara.leg.br/cotas). Publicar é obrigação legal." }], 1.75, { w: 10, size: 18, h: 1.1 });
  const stats = [["7", "arquivos, Ano-2019 a Ano-2025"], ["538 MB", "de CSV"], ["32", "colunas"], ["1.560.019", "lançamentos"]];
  const cw = (CW - 3 * 0.3) / 4;
  stats.forEach(([v, l], i) => {
    const x = M + i * (cw + 0.3);
    cartao(s, x, 3.0, cw, 1.6);
    s.addText(v, { x: x + 0.25, y: 3.15, w: cw - 0.5, h: 0.75, fontFace: MONO, fontSize: 30, bold: true, color: C.tinta, margin: 0, valign: "middle", isTextBox: true });
    s.addText(l, { x: x + 0.25, y: 3.9, w: cw - 0.5, h: 0.5, fontFace: SANS, fontSize: 13, color: C.tinta60, margin: 0, valign: "top", isTextBox: true });
  });
  paragrafo(s, [{ text: "Regra desta aula: nenhum deputado aparece. ", bold: true, color: C.tinta }, { text: "Todo número é somado por fornecedor. O assunto é o dado e o que se faz com ele." }], 4.9, { w: 11, size: 16, h: 0.8 });
  termos(s, [["CEAP", "Cota para o Exercício da Atividade Parlamentar: a verba mensal que cada deputado gasta e presta contas. Publicar é obrigação legal, não gentileza."],
             ["lançamento", "uma linha do arquivo: uma despesa reembolsada, com fornecedor, valor, data e categoria."]]);
}

// =============================================================== 03 cinco palavras
{
  const s = novo("o que cada linha significa", "A tabela é o glossário lido em voz alta, uma única vez na aula. Quem não é da área precisa das cinco palavras; quem é, precisa saber que o SIGEPA existe. A legenda mostra o que acontece sem a quarta linha.");
  titulo(s, "Cinco palavras antes de qualquer código.", { size: 28, h: 0.6 });
  const a = janela(s, M, 1.5, CW, 2.75, "o domínio, em cinco linhas");
  tabela(s, { x: a.x, y: a.y - 0.15, w: a.w }, null, [
    [{ t: "lançamento", b: true }, { t: "uma despesa reembolsada: fornecedor, valor, data, categoria", sans: true }],
    [{ t: "glosa", b: true }, { t: "a parte da nota que a Câmara recusou pagar", sans: true }],
    [{ t: "estorno", b: true }, { t: "dinheiro devolvido; entra negativo, na mesma coluna do gasto", sans: true }],
    [{ t: "SIGEPA", b: true }, { t: "passagem emitida pelo sistema da Câmara; a companhia aérea aparece como fornecedor, sem CNPJ", sans: true }],
    [{ t: "raiz do CNPJ", b: true }, { t: "os 8 primeiros dígitos identificam a empresa; os 4 seguintes, a filial", sans: true }],
  ], [2.4, a.w - 2.4], { rowH: 0.4, size: 14 });
  paragrafo(s, "Sem a quarta linha, a soma por fornecedor de 2025 põe TAM, GOL e AZUL no topo. Das 38.113 linhas de companhia aérea naquele ano, 37.114 não têm CNPJ: são bilhetes do SIGEPA, e a pergunta “quem o deputado contratou” tem que deixá-los de fora.", 4.5, { w: 11.2, size: 16, h: 1.2 });
  termos(s, [["regra de negócio", "a decisão de contar ou não uma linha, escrita num lugar onde dá para ler e testar."]]);
}

// =============================================================== 04 a deriva
{
  const s = novo("o dado muda de forma: lançamentos sem CNPJ, ano a ano", "Vá devagar. A coluna da direita sobe 16 vezes em cinco anos e o script de 2019 continuou igual. É o argumento para arquitetura, antes de qualquer ferramenta.");
  const a = janela(s, M, 0.9, 7.9, 3.75, "python analise.py — os sete anos, linhas sem CNPJ");
  tabela(s, { x: a.x, y: a.y - 0.15, w: a.w }, ["ANO", "LANÇAMENTOS", "SEM CNPJ", "%"], [
    [{ t: "2019", b: true }, "289.830", "4.448", { t: "1,5%", c: C.verde }],
    [{ t: "2020", b: true }, "167.132", "17.234", "10,3%"],
    [{ t: "2021", b: true }, "218.765", "43.487", "19,9%"],
    [{ t: "2022", b: true }, "209.556", "46.992", "22,4%"],
    [{ t: "2023", b: true }, "232.745", "56.943", "24,5%"],
    [{ t: "2024", b: true }, "232.925", "58.164", { t: "25,0%", c: C.vermelho }],
    [{ t: "2025", b: true }, "209.066", "37.934", "18,1%"],
  ], [1.4, 2.4, 2.0, a.w - 5.8], { rowH: 0.33 });
  paragrafo(s, "A Câmara mudou como registra o voo: até 2022 a passagem entrava com CNPJ, depois passou pelo SIGEPA, sem. O script de 2019 continuou igual, e a resposta dele mudou sem aviso.", 0.95, { x: 8.9, w: 3.85, size: 16, h: 3.5 });
  termos(s, [["CNPJ", "o documento da empresa, 14 dígitos. Sem ele, saber quem recebeu depende de confiar no nome que alguém digitou."]]);
}

// =============================================================== 05 linha de base
{
  const s = novo("o processo padrão: um script", "Mostre o script sem ironia. É assim que uma análise começa e, para uma pergunta feita uma vez, basta. Tudo o que vem depois é comparado com estas oito linhas.");
  const a = janela(s, M, 0.9, CW, 3.55, "analise.py");
  codigo(s, a, [
    [{ t: "import", c: K }, { t: " pandas " }, { t: "as", c: K }, { t: " pd" }],
    "",
    [{ t: "df = pd.read_csv(" }, { t: '"Ano-2025.csv"', c: A }, { t: ", sep=" }, { t: '";"', c: A }, { t: ", encoding=" }, { t: '"utf-8"', c: A }, { t: ")" }],
    "",
    [{ t: "top = (df.groupby(" }, { t: '"txtFornecedor"', c: A }, { t: ")[" }, { t: '"vlrDocumento"', c: A }, { t: "]" }],
    "         .sum()",
    [{ t: "         .sort_values(ascending=" }, { t: "False", c: K }, { t: ")" }],
    [{ t: "         .head(" }, { t: "10", c: C.vermelho }, { t: "))" }],
    "",
    [{ t: "print", c: K }, { t: "(top)" }],
  ]);
  paragrafo(s, "Oito linhas e 40 segundos. É assim que uma análise começa, e para uma pergunta feita uma vez isso basta. As seções seguintes comparam tudo com este script.", 4.7, { w: 10, size: 17, h: 0.9 });
  termos(s, [["pandas", "biblioteca de Python que carrega a tabela inteira na memória e deixa agrupar e somar numa linha."]]);
}

// =============================================================== 06 catorze dias depois
{
  const s = novo("o mesmo script, catorze dias depois", "Aconteceu com este arquivo: baixado em 04/09 e de novo em 18/09. Leia as duas saídas sem comentar; a plateia vê a diferença. Depois o parágrafo final, que é onde a palavra arquitetura entra na aula.");
  const a = janela(s, M, 0.9, 7.3, 2.9, "python analise.py");
  codigo(s, a, [
    [{ t: "$", c: P }, { t: " python analise.py   " }, { t: "# Ano-2025.csv baixado em 04/09", c: D }],
    [{ t: "linhas: " }, { t: "208.246", b: true }],
    [{ t: "TAM       R$ " }, { t: "22,8 mi", b: true }],
    "",
    [{ t: "$", c: P }, { t: " python analise.py   " }, { t: "# mesmo arquivo, mesma URL, 18/09", c: D }],
    [{ t: "linhas: " }, { t: "209.066", b: true, c: C.vermelho }],
    [{ t: "TAM       R$ " }, { t: "16,4 mi", b: true, c: C.vermelho }],
  ], 13);
  paragrafo(s, "A Câmara republica o arquivo com correções. 820 linhas a mais, e a TAM perde R$ 6,4 milhões. O script não registra qual arquivo produziu qual número, nem quando rodou, nem com qual regra.", 0.95, { x: 8.3, w: 4.45, size: 15, h: 2.9 });
  paragrafo(s, [{ text: "Arquitetura de processamento", bold: true, color: C.tinta }, { text: " é o nome do que falta aqui: etapas fixas, cada uma gravada, com rastro do que leu e do que escreveu." }], 4.1, { w: 11, size: 18, h: 1 });
  termos(s, [["pipeline", "o mesmo tratamento escrito como etapas fixas, que rodam sempre na mesma ordem e deixam rastro do que fizeram."],
             ["reprodutível", "rodar de novo amanhã, na mesma entrada, e obter exatamente o mesmo número, ou saber por que não."]]);
}

// =============================================================== 07 camadas
{
  const s = novo("camadas: onde cada decisão fica gravada", "Construa o desenho no ritmo da fala: o CSV, depois o armazenamento, depois as três tabelas. O bronze existe porque a sua regra vai estar errada uma hora, e porque o arquivo de origem muda.");
  cartoes(s, 0.95, 2.35, [["CAMADA 1", "bronze", "Como a Câmara publicou. Tudo texto, nada consertado. 1.560.019 linhas."],
                          ["CAMADA 2", "silver", "Tipos certos e sete colunas de defeito marcado. Nenhuma linha some."],
                          ["CAMADA 3", "gold", "Uma tabela por pergunta. 55.672 empresas, somadas pela raiz do CNPJ."]]);
  paragrafo(s, [{ text: "Guardar o bronze cru custa 5 GB e parece desperdício até a primeira vez que a regra de limpeza está errada. Aí ele é o que permite refazer sem pedir o arquivo de novo. E a Câmara " }, { text: "republica os CSVs com correções", bold: true, color: C.tinta }, { text: ", então o arquivo de hoje não é o de ontem." }], 3.6, { w: 11.2, size: 16, h: 1.2 });
  termos(s, [["raiz do CNPJ", "os 8 primeiros dígitos, que identificam a empresa. Os 4 seguintes são a filial e os 2 últimos, os verificadores. É por ela que 55.672 empresas se somam."],
             ["chave natural", "identificador que já existe no dado do mundo real, em vez de um número inventado na hora de guardar."],
             ["camada", "um estágio do pipeline que lê do lake e escreve no lake. Como cada uma fica gravada, dá para refazer só ela."],
             ["medalhão", "o nome deste arranjo em três camadas. É uma convenção de nomes: nada instala “medalhão”."]], { size: 10.5 });
}

// =============================================================== 08 formatos
{
  const s = novo("formatos e processamento massivo", "Três números medidos em 22/09 com DuckDB sobre o Ano-2025.csv, no laptop; apresentacao/numeros.py recalcula. O tempo varia de máquina para máquina; a proporção não. Colunar, compressão e partição são o que faz massivo caber.");
  cartoes(s, 0.95, 2.3, [["TAMANHO", "74,5 → 5,3 MB", "o mesmo ano em CSV e em Parquet com zstd"],
                         ["TEMPO", "137 → 8 ms", "a mesma consulta, DuckDB, no laptop"],
                         ["LEITURA", "1,0 de 5,1 MB", "o que uma consulta de três colunas lê do arquivo"]], { mono: true, size: 24 });
  paragrafo(s, "Colunar: a consulta lê só as colunas que pede. Compressão: repetição vira bytes a menos. Partição por ano: 2023 mora numa pasta, e reprocessar 2023 reescreve uma pasta. Com os três, sete anos cabem num laptop, e o mesmo código vale quando o dado cresce.", 3.55, { w: 11.2, size: 16, h: 1.3 });
  termos(s, [["Parquet", "formato de arquivo colunar e comprimido, aberto. É o que fica no disco por baixo de quase todo lake."],
             ["colunar", "guarda cada coluna junta, em vez de cada linha. Somar uma coluna lê uma coluna."],
             ["partição", "o dado fica em pastas por ano. Consultar um ano lê um ano, e reprocessar um ano reescreve um ano só."]]);
}

// =============================================================== 09 lakehouse
{
  const s = novo("lakehouse: a tabela por cima dos arquivos", "Aconteceu de verdade: DuckDB contou 209.066 e Spark contou 209.079, porque multiLine é true num e false no outro. A v0 guardou o erro. Consulte ao vivo se der tempo; se não, a tabela basta.");
  const a = janela(s, M, 0.9, CW, 2.95, "spark-sql — DESCRIBE HISTORY");
  tabela(s, { x: a.x, y: a.y - 0.15, w: a.w }, ["VERSÃO", "OPERAÇÃO", "LINHAS", "O QUE ERA"], [
    [{ t: "0", b: true }, "WRITE", { t: "209.079", c: C.vermelho }, "sem multiLine: 13 linhas partidas"],
    [{ t: "1", b: true }, "WRITE", { t: "209.066", c: C.verde }, "com multiLine: correto"],
  ], [1.4, 1.8, 1.6, a.w - 4.8], { rowH: 0.34 });
  codigo(s, { x: a.x, y: a.y + 1.05, w: a.w }, [
    [{ t: "spark-sql>", c: P }, { t: " SELECT count(*) FROM delta.`s3a://lake/bronze` " }, { t: "VERSION AS OF 0", b: true }, { t: ";" }],
    [{ t: "209079", c: C.vermelho }],
  ], 13);
  paragrafo(s, "Um lakehouse é uma tabela aberta escrita por cima de arquivos Parquet num object storage. O Delta Lake grava, ao lado dos dados, um log com cada escrita: uma versão por vez, inteira ou nada. Confiabilidade é isso. Consistência é o resto do log: a contagem errada continua na versão 0 e dá para consultar agora.", 4.05, { w: 11.2, size: 15, h: 1.4 });
  termos(s, [["lakehouse", "arquivos abertos num object storage, com uma camada de tabela por cima que dá transação, esquema e histórico."],
             ["Delta Lake", "formato de tabela aberto por cima de arquivos Parquet. Guarda um registro de cada escrita num log ao lado dos dados."],
             ["transação", "uma escrita que entra inteira ou não entra. Quem lê nunca vê metade."],
             ["viagem no tempo", "consultar a tabela como ela estava antes. VERSION AS OF 0 lê o que foi escrito antes da correção."]], { size: 10.5 });
}

// =============================================================== 10 delta, iceberg, hudi
{
  const s = novo("três formatos de tabela aberta", "Só fato de documentação de cada projeto; nenhum adjetivo. Se perguntarem qual é o melhor: depende do motor que já está na sua casa. A última frase é a ponte para a pós; é a sua pesquisa, diga em uma frase e siga.");
  const a = janela(s, M, 0.9, CW, 2.75, "o mesmo problema, três respostas");
  tabela(s, { x: a.x, y: a.y - 0.15, w: a.w }, ["FORMATO", "QUEM MANTÉM", "COMO GUARDA O HISTÓRICO", "ONDE É O PADRÃO"], [
    [{ t: "Delta Lake", b: true }, { t: "Linux Foundation; nasceu na Databricks", sans: true }, { t: "_delta_log: um JSON por escrita, checkpoints em Parquet", sans: true }, { t: "Databricks; Spark", sans: true }],
    [{ t: "Apache Iceberg", b: true }, { t: "Apache Software Foundation; nasceu na Netflix", sans: true }, { t: "árvore de metadados: metadata.json, manifest list, manifests", sans: true }, { t: "Snowflake, Athena, BigQuery, Trino", sans: true }],
    [{ t: "Apache Hudi", b: true }, { t: "Apache Software Foundation; nasceu na Uber", sans: true }, { t: "timeline em .hoodie/; tabelas copy-on-write ou merge-on-read", sans: true }, { t: "Amazon EMR; cargas com upsert", sans: true }],
  ], [2.0, 3.1, 4.0, a.w - 9.1], { rowH: 0.55, size: 13 });
  paragrafo(s, "Os três resolvem o mesmo problema: transação e histórico sobre arquivos que não sabem o que é uma tabela. Este repositório usa Delta porque o Spark que roda aqui já o carrega. Comparar os três em carga real (TPC-DS) é a minha pesquisa, e é por aí que se entra na pós-graduação.", 3.9, { w: 11.2, size: 16, h: 1.3 });
  termos(s, [["Iceberg", "formato de tabela aberto da Apache, com metadados em árvore; nasceu na Netflix."],
             ["Hudi", "formato de tabela aberto da Apache, feito para atualização linha a linha; nasceu na Uber."]]);
}

// =============================================================== 11 docker
{
  const s = novo("Docker: o que ele simula aqui", "Antes de falar, docker compose ps no terminal: cinco containers. O worker 3 está tracejado porque vai subir de verdade no slide 18. Docker aqui simula dois serviços de nuvem: um cluster de processamento e um object storage.");
  const rot = (x, y, w, t) => s.addText(t, { x, y, w, h: 0.25, fontFace: MONO, fontSize: 9.5, color: C.laranja, charSpacing: 2, margin: 0, isTextBox: true });
  const caixa = (x, y, w, h, nome, sub, opt = {}) => {
    s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: opt.oco ? C.papel : C.painel },
      line: { color: opt.oco ? C.laranja : C.kw, width: 1.25, dashType: opt.oco ? "dash" : "solid" }, rectRadius: 0.06 });
    s.addText(nome, { x: x + 0.12, y: y + 0.08, w: w - 0.24, h: 0.32, fontFace: MONO, fontSize: 12, bold: true, color: opt.oco ? C.laranja : C.tinta, margin: 0, valign: "middle", isTextBox: true });
    if (sub) s.addText(sub, { x: x + 0.12, y: y + 0.4, w: w - 0.24, h: 0.3, fontFace: MONO, fontSize: 8.5, color: C.tinta40, charSpacing: 1, margin: 0, isTextBox: true });
  };
  s.addShape(pres.ShapeType.rect, { x: M, y: 1.0, w: 6.6, h: 3.2, fill: { color: "141D2A" }, line: { color: C.grade, width: 1, dashType: "dash" } });
  s.addShape(pres.ShapeType.rect, { x: 8.1, y: 1.0, w: 4.63, h: 3.2, fill: { color: "141D2A" }, line: { color: C.grade, width: 1, dashType: "dash" } });
  rot(M + 0.2, 1.1, 6, "PROCESSAMENTO · CONTAINERS spark");
  rot(8.3, 1.1, 4.3, "ARMAZENAMENTO · CONTAINER minio");
  caixa(2.6, 1.5, 2.6, 0.78, "spark-master", "REPARTE O TRABALHO");
  caixa(0.85, 3.0, 1.9, 0.9, "worker 1", "2 CORES · 2 GB");
  caixa(2.95, 3.0, 1.9, 0.9, "worker 2", "2 CORES · 2 GB");
  caixa(5.05, 3.0, 1.9, 0.9, "worker 3", "SOBE NO SLIDE 18", { oco: true });
  [1.8, 3.9, 6.0].forEach(x => s.addShape(pres.ShapeType.line, { x: 3.9, y: 2.28, w: x - 3.9, h: 0.72, line: { color: C.kw, width: 1, endArrowType: "triangle" }, flipH: x < 3.9 }));
  caixa(8.35, 1.5, 4.1, 0.78, "MinIO", "BUCKET lake");
  [["bronze", "1.560.019 LINHAS"], ["silver", "DEFEITOS MARCADOS"], ["gold", "55.672 EMPRESAS"]].forEach(([nm, sb], i) => caixa(8.35 + i * 1.4, 3.0, 1.3, 0.9, nm, sb));
  s.addShape(pres.ShapeType.line, { x: 7.2, y: 2.6, w: 0.9, h: 0, line: { color: C.laranja, width: 2, beginArrowType: "triangle", endArrowType: "triangle" } });
  s.addText("s3a://", { x: 7.0, y: 2.1, w: 1.3, h: 0.35, fontFace: MONO, fontSize: 12, bold: true, color: C.laranja, align: "center", margin: 0, isTextBox: true });
  s.addText("A MESMA API DO AMAZON S3", { x: 6.6, y: 2.75, w: 2.1, h: 0.5, fontFace: MONO, fontSize: 8, color: C.tinta40, align: "center", charSpacing: 1, margin: 0, isTextBox: true });
  paragrafo(s, [{ text: "cinco containers no laptop simulam o que na nuvem são dois serviços: um cluster de processamento e um object storage.", color: C.verde }], 4.4, { w: CW, size: 16, h: 0.75 });
  s.addText("DOCKER COMPOSE DOWN DERRUBA O PROCESSAMENTO; O LAKE CONTINUA NO VOLUME. O SPARK NÃO GUARDA DADO.", { x: M, y: 5.15, w: CW, h: 0.3, fontFace: MONO, fontSize: 10, color: C.laranja, charSpacing: 1, margin: 0, isTextBox: true });
  termos(s, [["container", "um processo isolado, subido a partir de uma imagem (a receita congelada: sistema, dependências, configuração). Cinco deles formam este ambiente."],
             ["volume", "disco que sobrevive ao container. O bucket do MinIO mora num volume; derrubar o stack não apaga o lake."]]);
}

// =============================================================== 12 onde o dado mora
{
  const s = novo("onde o dado mora, e como é referenciado", "Leia o caminho de cima para baixo, uma peça por vez. Depois rode make pipeline e deixe rodando: são ~2 minutos nos sete anos. O próximo slide é falado por cima da execução.");
  const a = janela(s, M, 0.9, CW, 3.4, "um caminho, decomposto");
  codigo(s, a, [
    [{ t: "s3a://lake/bronze/ano_ref=2023/part-00000-….parquet", c: A }],
    "",
    [{ t: "s3a://         ", b: true }, { t: "protocolo: o Spark falando com object storage", c: D }],
    [{ t: "lake           ", b: true }, { t: "bucket; o endpoint é minio:9000 aqui e s3.amazonaws.com lá", c: D }],
    [{ t: "bronze         ", b: true }, { t: "a tabela; ao lado dela, _delta_log/", c: D }],
    [{ t: "ano_ref=2023   ", b: true }, { t: "a partição: um ano, uma pasta", c: D }],
    [{ t: "part-….parquet ", b: true }, { t: "o arquivo colunar", c: D }],
    "",
    [{ t: "spark-sql>", c: P }, { t: " SELECT count(*) FROM delta.`s3a://lake/bronze` WHERE ano_ref = " }, { t: "2023", c: C.vermelho }, { t: ";" }],
    [{ t: "232745", c: A }, { t: "   # leu a pasta de 2023; as outras seis ficaram fechadas", c: D }],
  ], 12.5);
  paragrafo(s, [{ text: "Referenciar é isto: endpoint, bucket, tabela, partição, arquivo. Processar é o Spark abrir só a pasta pedida e só as colunas pedidas. " }, { text: "make pipeline", bold: true, color: C.tinta, mono: true }, { text: " começa agora e escreve as três tabelas nos sete anos." }], 4.5, { w: 11.2, size: 16, h: 1.0 });
  termos(s, [["s3a://", "o jeito do Spark falar com armazenamento de objetos. Entre o MinIO daqui e o S3 da AWS muda o endereço, não a consulta."],
             ["endpoint", "o endereço do serviço de armazenamento. É a linha de configuração que muda entre rodar aqui e rodar na AWS."],
             ["object storage", "guarda o arquivo inteiro endereçado por um nome, em vez de blocos como um disco. É o que MinIO e S3 fazem."]]);
}

// =============================================================== 13 codigo aberto, nomes na nuvem
{
  const s = novo("enquanto roda: código aberto, e os nomes na nuvem", "Fala de 2 a 4 minutos, por cima do pipeline rodando. Abra o console do MinIO (localhost:9001) e mostre lake/bronze/ano_ref=… enchendo. Roteiro: (1) cada container é um projeto de código aberto; (2) os serviços gerenciados da nuvem rodam esses mesmos projetos: EMR e Dataproc rodam Apache Spark, a Databricks criou o Delta, o MinIO implementa a API do S3; (3) o que muda é quem opera. Tom neutro: nenhum lado é melhor.");
  const linha = (y, rotulo, aqui, la, legenda) => {
    s.addText(rotulo, { x: M, y, w: 3, h: 0.25, fontFace: MONO, fontSize: 9.5, color: C.laranja, charSpacing: 2, margin: 0, isTextBox: true });
    cartao(s, M, y + 0.35, 4.3, 1.25);
    s.addText(aqui, { x: M + 0.3, y: y + 0.5, w: 3.7, h: 0.5, fontFace: SANS, fontSize: 22, bold: true, color: C.tinta, margin: 0, valign: "middle", isTextBox: true });
    s.addText("NO SEU DOCKER", { x: M + 0.3, y: y + 1.05, w: 3.7, h: 0.3, fontFace: MONO, fontSize: 9, color: C.tinta40, charSpacing: 2, margin: 0, isTextBox: true });
    s.addShape(pres.ShapeType.line, { x: 5.1, y: y + 0.97, w: 1.2, h: 0, line: { color: C.laranja, width: 2, beginArrowType: "triangle", endArrowType: "triangle" } });
    cartao(s, 6.5, y + 0.35, 6.23, 1.25);
    s.addText(la, { x: 6.8, y: y + 0.5, w: 5.7, h: 0.5, fontFace: SANS, fontSize: 18, bold: true, color: C.tinta, margin: 0, valign: "middle", isTextBox: true });
    s.addText(legenda, { x: 6.8, y: y + 1.05, w: 5.7, h: 0.3, fontFace: MONO, fontSize: 9, color: C.tinta40, charSpacing: 1, margin: 0, isTextBox: true });
  };
  linha(0.95, "PROCESSAMENTO", "Apache Spark", "EMR · Dataproc · Databricks · Synapse", "O MESMO APACHE SPARK, OPERADO POR OUTRA PESSOA");
  linha(2.95, "ARMAZENAMENTO", "MinIO", "Amazon S3 · Google Cloud Storage · Azure Blob", "A MESMA API. VOCÊ TROCA UMA LINHA DE CONFIGURAÇÃO.");
  paragrafo(s, [{ text: "MinIO, Spark, Delta e Docker são código aberto. Os serviços gerenciados rodam esses mesmos projetos; muda quem opera.", color: C.verde }], 5.0, { w: CW, size: 16, h: 0.75 });
  termos(s, [["compute e storage separados", "quem processa e quem guarda são serviços distintos. Escalar um não obriga a escalar o outro."],
             ["elasticidade", "pedir máquina quando precisa e devolver depois. O worker 3 sobe ao vivo no slide 18; na nuvem são 200, e o código é o mesmo."]]);
}

// =============================================================== 14 o pipeline terminou
{
  const s = novo("o pipeline terminou: uma versão por escrita, e 21 testes em 11 segundos", "O pipeline terminou. make historico mostra uma versão por escrita em cada tabela; make teste roda em 11 s. Dois testes têm nome de bug que aconteceu aqui: o estorno contado como glosa e a raiz zerada tratada como empresa.");
  const a = janela(s, M, 0.9, CW, 2.75, "make historico · make teste");
  codigo(s, a, [
    [{ t: "bronze", c: D }, { t: "  v1 WRITE   " }, { t: "silver", c: D }, { t: "  v1 WRITE   " }, { t: "gold", c: D }, { t: "  v1 WRITE" }],
    "",
    [{ t: "PASSED", c: P }, { t: "  test_estorno_nao_conta_como_glosa_maior" }],
    [{ t: "PASSED", c: P }, { t: "  test_raiz_zerada_nao_e_empresa" }],
    [{ t: "PASSED", c: P }, { t: "  test_raiz_de_verdade_nao_e_confundida" }],
    [{ t: "...", c: D }],
    [{ t: "21 passed", c: P, b: true }, { t: " in 11.09s" }],
  ], 13);
  paragrafo(s, "Os testes rodam sem cluster e sem MinIO, numa SparkSession local. Eles testam a regra de negócio, e dois deles existem porque o bug aconteceu: o estorno contado como glosa, e a raiz zerada tratada como empresa.", 3.95, { w: 11, size: 16, h: 1.1 });
  termos(s, [["SparkSession", "o objeto que representa a conexão com o Spark. O teste sobe uma local, sem cluster e sem MinIO."],
             ["CI", "integração contínua: os testes rodam sozinhos a cada mudança no repositório, antes de alguém confiar nela."]]);
}

// =============================================================== 15 duas pontas
{
  const s = novo("a mesma pergunta, nas duas pontas", "Rode as duas consultas ao vivo, na gold que acabou de ser escrita. Aponte que a de cima é o script do slide 5 em SQL. A frase sobre 3,30 e 3,25 responde antes que perguntem: a soma por nome chega perto, e a diferença tem nome.");
  const a = janela(s, M, 0.9, CW, 3.35, "spark-sql — container spark-master");
  codigo(s, a, [
    [{ t: "spark-sql>", c: P }, { t: " SELECT txtFornecedor, sum(vlrDocumento) t" }],
    [{ t: "           FROM delta.`s3a://lake/" }, { t: "bronze", b: true, c: C.laranja }, { t: "` WHERE numAno=2025 GROUP BY 1 ORDER BY 2 DESC LIMIT 3;" }],
    [{ t: "TAM 16.402.463,26   GOL 6.052.550,88   AZUL 4.696.245,04", c: C.vermelho }],
    "",
    [{ t: "spark-sql>", c: P }, { t: " SELECT fornecedor, total" }],
    [{ t: "           FROM " }, { t: "fornecedores", b: true, c: C.laranja }, { t: " WHERE ano_ref=2025 ORDER BY total DESC LIMIT 3;" }],
    [{ t: "FACEBOOK 3.251.951,87   PANTANAL 3.227.314,77   VIVO 1.591.715,84", c: C.verde }],
  ], 12.5);
  paragrafo(s, "R$ 3,25 mi para a Facebook Serviços Online do Brasil em 2025. A soma por nome do script dá R$ 3,30 mi; a gold soma o reembolso e agrupa por CNPJ, e isso tira R$ 51 mil de nota não paga e uma linha homônima de outra empresa.", 4.5, { w: 11.2, size: 16, h: 1.1 });
  termos(s, [["SQL", "a mesma pergunta do slide 5, escrita como consulta. Quem lê não precisa abrir o script para saber o que foi perguntado."]]);
}

// =============================================================== 16 achado 1
{
  const s = novo("achado 1: o que está dentro dos R$ 16,4 milhões", "O 16,4 é o número que a bronze devolveu no slide anterior. Mostre que ele já é uma subtração: 22,8 de passagem menos 6,4 de devolução. Os 22,8 batem com o arquivo de 04/09 do slide 6, e é provável que as 820 linhas novas sejam devoluções; o arquivo de 04/09 não foi guardado, então diga provável, não medido.");
  const a = janela(s, M, 0.9, CW, 2.5, "python — a TAM de 2025");
  codigo(s, a, [
    [{ t: ">>>", c: P }, { t: " tam = df[df.txtFornecedor == " }, { t: '"TAM"', c: A }, { t: "].vlrDocumento" }],
    [{ t: ">>>", c: P }, { t: " tam[tam > 0].sum()                 R$ " }, { t: "22.787.293", b: true }],
    [{ t: ">>>", c: P }, { t: " tam[tam < 0].sum()                 R$ " }, { t: "-6.384.830", b: true, c: C.vermelho }, { t: "    # 5.433 linhas", c: D }],
    [{ t: ">>>", c: P }, { t: " tam.sum()                          R$ " }, { t: "16.402.463", b: true }, { t: "    # a bronze do slide 15", c: D }],
  ], 13);
  paragrafo(s, "São estornos: passagem devolvida, lançada como valor negativo na mesma coluna do gasto. 7.197 linhas assim em 2025, 53.112 nos sete anos. Apagar resolve a soma e perde a informação. Marcar, numa coluna a mais, guarda as duas, e cada pergunta decide se conta com eles.", 3.65, { w: 11, size: 16, h: 1.4 });
  termos(s, [["estorno", "devolução de dinheiro já reembolsado. Entra como valor negativo, na mesma coluna do gasto."],
             ["glosa", "a parte da nota que a Câmara recusou pagar. O que saiu de verdade é o valor do documento menos a glosa."]]);
}

// =============================================================== 17 achado 2
{
  const s = novo("achado 2: grep chatgpt", "Um grep. 58 linhas, nove jeitos de escrever, e a coluna do documento: 57 iguais e uma diferente. O igual é a gaveta da Câmara para o que não tem nota; passa em qualquer validação de CNPJ. É o exemplo de formato válido com significado inválido.");
  const a = janela(s, M, 0.9, CW, 3.25, "Ano-2019.csv … Ano-2025.csv");
  const S = "000.000.000/0001-0";
  tabela(s, { x: a.x, y: a.y - 0.15, w: a.w }, ["FORNECEDOR", "LINHAS", "DOCUMENTO"], [
    [{ t: "OpenAI, LLC", b: true }, "38", S], [{ t: "ChatGPT Plus Subscription", b: true }, "8", S],
    [{ t: "chat GPT", b: true }, "4", S], [{ t: "OpenAI", b: true }, "3", S],
    [{ t: "Chatgpt · CHATGPT · OpenAi · ChatGPT  Plus Subscription", b: true }, "4", S],
    [{ t: "chatGPT", b: true }, "1", { t: "625.310.710/0017-8", c: C.vermelho }],
  ], [7.2, 1.4, a.w - 8.6], { rowH: 0.33 });
  paragrafo(s, "Nove grafias, um produto, R$ 10,2 mil em três anos. Cinquenta e sete linhas com o mesmo documento de catorze dígitos, que passa em qualquer validação de CNPJ e é a gaveta da Câmara para o que não tem nota fiscal. Agrupar por nome dá nove fornecedores; agrupar por documento dá um que não existe.", 4.4, { w: 11.2, size: 15, h: 1.3 });
  termos(s, [["dígito verificador", "os 2 últimos dígitos do CNPJ, calculados a partir dos outros 12. Pegam erro de digitação; não provam que a empresa existe."]]);
}

// =============================================================== 18 local e nuvem
{
  const s = novo("local e nuvem: quando cada um faz sentido", "Os dois lados têm bolinha verde. A escolha é de contexto. Agora o worker 3: docker compose up -d --scale spark-worker=3 com o Spark UI em localhost:8080 aberto. Se não subir em 30 s, o desenho do slide 11 já contou a história; siga.");
  const col = (x, rotulo, itens) => {
    cartao(s, x, 0.95, (CW - 0.4) / 2, 3.7);
    s.addText(rotulo, { x: x + 0.35, y: 1.15, w: 5, h: 0.3, fontFace: MONO, fontSize: 11, color: C.laranja, charSpacing: 3, margin: 0, isTextBox: true });
    s.addText("Bom quando…", { x: x + 0.35, y: 1.5, w: 5, h: 0.45, fontFace: SANS, fontSize: 22, bold: true, color: C.tinta, margin: 0, isTextBox: true });
    s.addText(itens.map((t, i) => ({ text: t, options: { bullet: { code: "25CF" }, color: C.tinta60, breakLine: i < itens.length - 1 } })),
      { x: x + 0.35, y: 2.1, w: (CW - 0.4) / 2 - 0.7, h: 2.4, fontFace: SANS, fontSize: 15, color: C.tinta60, margin: 0, valign: "top", paraSpaceAfter: 8, isTextBox: true });
  };
  col(M, "NO SEU DOCKER", ["você está aprendendo e quer quebrar sem medo", "o dado cabe confortavelmente numa máquina", "o ciclo curto importa: subiu, errou, refez em minutos", "o dado não pode sair da sua rede"]);
  col(M + (CW - 0.4) / 2 + 0.4, "NA NUVEM", ["o dado não cabe mais numa máquina só", "você precisa de 200 máquinas por 20 minutos", "o time é pequeno e o plantão não pode ser você", "outras equipes precisam do mesmo dado, com governança"]);
  paragrafo(s, "É o mesmo Apache Spark e o mesmo Delta Lake dos dois lados; muda quem opera a infraestrutura. O mesmo desenho serve para os dados do TSE, do DataSUS e do INEP: troca o CSV e as regras de negócio.", 4.9, { w: CW, size: 16, h: 0.8 });
  termos(s, [["governança", "quem pode ler o quê, quem mudou a tabela e quando. Vira problema no dia em que o dado deixa de ser só seu."]]);
}

// =============================================================== 19 como iniciar
{
  const s = novo("como iniciar: quatro práticas, e onde elas estão aqui", "As quatro práticas são do Joseph Machado, Data Engineering Projects, startdataengineering.com, junho de 2024. Aponte onde cada uma está neste repositório; é a resposta para “como eu começo”.");
  cartoes(s, 0.9, 1.75, [["PRÁTICA 1", "versionamento", "git desde o primeiro commit. Cada número dos slides tem o commit que o produziu."],
                         ["PRÁTICA 2", "organização de código", "src/pipeline/ com uma camada por módulo, config em arquivo, um Makefile que diz o que existe."],
                         ["PRÁTICA 3", "testes e qualidade", "testes/ com 21 casos e qualidade.py, que relata o que cada regra acusou em vez de apagar linhas."],
                         ["PRÁTICA 4", "ferramentas em demanda", "Spark, Delta Lake, MinIO (API do S3), Docker. Os mesmos nomes das vagas e dos serviços de nuvem."]], { cols: 2, size: 22 });
  paragrafo(s, [{ text: "As quatro vêm de Joseph Machado, " }, { text: "Data Engineering Projects", italic: true }, { text: " (startdataengineering.com, junho de 2024). Um repositório que cumpre as quatro é um portfólio." }], 5.15, { w: CW, size: 16, h: 0.6 });
  termos(s, [["portfólio", "repositórios públicos que mostram como você trabalha, não só o que você sabe. É o que um recrutador de dados abre primeiro."]]);
}

// =============================================================== 20 portfolio
{
  const s = novo("portfólio: a escada, e o que estudar", "A escada é a do Machado, do mais simples ao mais complexo. Esta aula é o degrau 2. A lista do que estudar é curta de propósito; o resto vem quando o projeto pedir.");
  const a = janela(s, M, 0.9, CW, 3.0, "startdataengineering.com/post/data-engineering-projects");
  tabela(s, { x: a.x, y: a.y - 0.15, w: a.w }, ["DEGRAU", "PROJETO", "STACK"], [
    [{ t: "1", b: true }, { t: "pipeline batch simples", sans: true }, "DuckDB, Python"],
    [{ t: "2", b: true }, { t: "batch com orquestração e object storage  ← esta aula, com dado brasileiro", sans: true, c: C.verde }, "Spark, Airflow, MinIO"],
    [{ t: "3", b: true }, { t: "transformação testada", sans: true }, "dbt, DuckDB"],
    [{ t: "4", b: true }, { t: "captura de mudança em tempo real", sans: true }, "Debezium, Kafka"],
    [{ t: "5", b: true }, { t: "fluxo contínuo", sans: true }, "Flink, Kafka, Grafana"],
  ], [1.3, 7.2, a.w - 8.5], { rowH: 0.36, size: 13 });
  paragrafo(s, "O que estudar, na ordem: SQL, um motor (Spark ou DuckDB), formatos colunares, Docker, object storage, e uma nuvem até você saber o que está pagando.", 4.2, { w: 11.2, size: 17, h: 0.9 });
  termos(s, [["orquestração", "quem decide a ordem e a hora em que cada etapa roda, e o que fazer quando uma falha. Aqui é o Makefile; em produção, Airflow ou parecido."]]);
}

// =============================================================== 21 fecho
{
  const s = novo("para levar para casa", "Fecho curto. O repositório sobe em dois comandos. Quando o link público existir, ponha aqui. Depois abra para as perguntas: são 10 minutos.");
  s.addText("Roda no seu laptop hoje. Sobe na nuvem no dia em que o dado crescer.", { x: M, y: 1.0, w: 10.5, h: 1.9, fontFace: SANS, fontSize: 36, bold: true, color: C.tinta, margin: 0, valign: "top", isTextBox: true });
  paragrafo(s, "Tudo que você viu é software aberto: MinIO, Apache Spark, Delta Lake, Docker. O CSV é público. O repositório sobe em dois comandos, e as regras de negócio ficam onde dá para ler e testar.", 3.1, { w: 10.5, size: 18, h: 1.3 });
  const a = janela(s, M, 4.7, 6.2, 1.3, "no repositório");
  codigo(s, a, [[{ t: "$", c: P }, { t: " make subir" }, { t: "     ·     ", c: D }, { t: "$", c: P }, { t: " make pipeline" }]], 14);
}

if (n !== TOTAL) throw new Error(`esperava ${TOTAL} slides, saíram ${n}`);
pres.writeFile({ fileName: __dirname + "/aula.pptx" }).then(f => console.log("gravado:", f, "—", n, "slides"));
