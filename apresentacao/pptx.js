// Gera apresentacao/aula.pptx com o mesmo conteudo de fontes/slides.html.
//
// O HTML continua sendo a versao que se projeta. Este arquivo existe para
// quem precisa de PowerPoint: a professora, o pendrive, o e-mail. Segue o
// que a Microsoft recomenda para um deck que abre em qualquer Office:
// 16:9, Calibri e Courier New (vem com o Office, nada para instalar),
// titulo 32-40pt, corpo 14-18pt, margem de 0,6", notas do apresentador
// no campo de notas e nao num quadro escondido no slide.
//
// O que nao viaja do HTML: os fragmentos. PowerPoint gerado por script nao
// tem animacao, entao cada slide mostra tudo de uma vez. As notas dizem
// onde fazer a pausa que o fragmento fazia.
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
pres.title = "Quem recebeu o dinheiro da cota parlamentar?";
pres.lang = "pt-BR";

let n = 0;
const TOTAL = 20;

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
  s.addText(r.map(x => ({ text: x.text, options: { color: x.color ?? C.tinta60, bold: !!x.bold,
      fontFace: x.mono ? MONO : SANS, fontSize: x.mono ? (opts.size ?? 16) - 2 : (opts.size ?? 16), breakLine: !!x.br } })),
    { x: opts.x ?? M, y, w: opts.w ?? 9.4, h: opts.h ?? 1, fontFace: SANS, fontSize: opts.size ?? 16,
      color: C.tinta60, margin: 0, valign: "top", paraSpaceAfter: 6, isTextBox: true });
}

// A janela de terminal e o motivo do deck: aparece em doze slides.
function janela(s, x, y, w, h, nome) {
  s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: C.fumaca }, line: { color: C.linha, width: 0.75 }, rectRadius: 0.08 });
  s.addShape(pres.ShapeType.rect, { x: x + 0.01, y: y + 0.01, w: w - 0.02, h: 0.42, fill: { color: "0C131C" }, line: { color: "0C131C", width: 0 } });
  [C.vermelho, C.ambar, C.verde].forEach((c, i) =>
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.2 + i * 0.2, y: y + 0.15, w: 0.12, h: 0.12, fill: { color: c }, line: { color: c, width: 0 } }));
  s.addText(nome, { x: x + 0.9, y: y + 0.08, w: w - 1.1, h: 0.26, fontFace: MONO, fontSize: 10, color: C.tinta60,
    charSpacing: 1, margin: 0, valign: "middle", isTextBox: true });
  return { x: x + 0.28, y: y + 0.6, w: w - 0.56 };
}

// linhas de codigo: cada linha e uma lista de trechos {t, c}
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
  const th = cab.map(t => ({ text: t, options: { fontFace: MONO, fontSize: 9, color: C.tinta40, charSpacing: 2, bold: false,
    border: [{ type: "none" }, { type: "none" }, { type: "solid", pt: 0.5, color: C.linha }, { type: "none" }] } }));
  const rows = [th, ...linhas.map(l => l.map(c => {
    const cel = typeof c === "string" ? { t: c } : c;
    return { text: cel.t, options: { fontFace: cel.sans ? SANS : MONO, fontSize: opts.size ?? 12.5, color: cel.c ?? C.tinta60,
      bold: !!cel.b, border: [{ type: "none" }, { type: "none" }, { type: "solid", pt: 0.5, color: C.linha }, { type: "none" }] } };
  }))];
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

// =============================================================== 01 capa
{
  const s = novo(null, "Não se apresente: a professora já leu a minibio. Comece pela pergunta. Diga que você vai responder três vezes e errar duas.");
  s.addText("SEMUNI 2026  ·  SEMINÁRIO EM CLOUD", { x: M, y: 2.0, w: CW, h: 0.3, fontFace: MONO, fontSize: 12, color: C.laranja, charSpacing: 3, margin: 0, isTextBox: true });
  s.addText("Quem recebeu o dinheiro da cota parlamentar?", { x: M, y: 2.4, w: 10.5, h: 1.9, fontFace: SANS, fontSize: 48, bold: true, color: C.tinta, margin: 0, valign: "top", isTextBox: true });
  paragrafo(s, "Sete anos de nota fiscal, 1,56 milhão de linhas, domínio público. Vou responder três vezes nos próximos 35 minutos. As duas primeiras respostas estão erradas, e nenhuma delas dá erro.", 4.45, { w: 9.2, size: 18, h: 1.2 });
  s.addText("Ítalo Vinícius  ·  23 de setembro de 2026", { x: M, y: 6.1, w: 8, h: 0.3, fontFace: MONO, fontSize: 11, color: C.tinta40, margin: 0, isTextBox: true });
}

// =============================================================== 02 o dado
{
  const s = novo("o dado", "CEAP = Cota para o Exercício da Atividade Parlamentar. Verba mensal, prestação de contas, publicação obrigatória. Não é vazamento: é transparência ativa. Sete arquivos, um por ano.");
  titulo(s, "Uma nota fiscal por linha, sete arquivos.");
  paragrafo(s, "A CEAP é a verba mensal de cada deputado. Ele gasta, presta contas, e a Câmara publica o CSV inteiro — um por ano, desde bem antes de 2019.", 1.75, { w: 9.6, size: 18, h: 1 });
  const stats = [["7", "arquivos, Ano-2019 a Ano-2025"], ["538 MB", "de CSV"], ["32", "colunas"], ["1.560.019", "lançamentos"]];
  const cw = (CW - 3 * 0.3) / 4;
  stats.forEach(([v, l], i) => {
    const x = M + i * (cw + 0.3);
    cartao(s, x, 3.1, cw, 1.7);
    s.addText(v, { x: x + 0.25, y: 3.3, w: cw - 0.5, h: 0.75, fontFace: MONO, fontSize: 30, bold: true, color: C.tinta, margin: 0, valign: "middle", isTextBox: true });
    s.addText(l, { x: x + 0.25, y: 4.05, w: cw - 0.5, h: 0.5, fontFace: SANS, fontSize: 13, color: C.tinta60, margin: 0, valign: "top", isTextBox: true });
  });
  termos(s, [["CEAP", "Cota para o Exercício da Atividade Parlamentar: a verba mensal que cada deputado gasta e presta contas. Publicar é obrigação legal, não gentileza."],
             ["lançamento", "uma linha do arquivo — uma despesa reembolsada, com fornecedor, valor, data e categoria."]]);
}

// =============================================================== 03 o script
{
  const s = novo("o jeito que a gente começa", "Mostre o script sem ironia. Esta é a forma correta de começar uma análise: é barata, é rápida, e responde. O problema aparece depois, e não é culpa de quem escreveu.");
  const a = janela(s, M, 0.9, CW, 3.55, "analise.py");
  codigo(s, a, [
    [{ t: "import", c: C.kw }, { t: " pandas " }, { t: "as", c: C.kw }, { t: " pd" }],
    "",
    [{ t: "df = pd.read_csv(" }, { t: '"Ano-2025.csv"', c: C.ambar }, { t: ", sep=" }, { t: '";"', c: C.ambar }, { t: ", encoding=" }, { t: '"utf-8"', c: C.ambar }, { t: ")" }],
    "",
    [{ t: "top = (df.groupby(" }, { t: '"txtFornecedor"', c: C.ambar }, { t: ")[" }, { t: '"vlrDocumento"', c: C.ambar }, { t: "]" }],
    "         .sum()",
    [{ t: "         .sort_values(ascending=" }, { t: "False", c: C.kw }, { t: ")" }],
    [{ t: "         .head(" }, { t: "10", c: C.vermelho }, { t: "))" }],
    "",
    [{ t: "print", c: C.kw }, { t: "(top)" }],
  ]);
  paragrafo(s, "Oito linhas, 40 segundos, nenhuma dependência além do pandas. Eu escrevo assim, você escreve assim, e na maior parte das vezes está tudo bem.", 4.7, { w: 9.6, size: 17, h: 0.9 });
  termos(s, [["ad-hoc", "feito sob demanda, para responder uma pergunta uma vez. Não é xingamento: é a forma certa de começar."],
             ["pandas", "biblioteca de Python que carrega a tabela inteira na memória e deixa agrupar e somar numa linha."]]);
}

// =============================================================== 04 a saida
{
  const s = novo("a saída", "Deixe a tabela na tela em silêncio. Espere alguém na plateia ver sozinho. Só então fale. Se ninguém vir, aponte para a linha 5 e a linha 8.");
  const a = janela(s, M, 0.9, 8.3, 4.1, "python analise.py");
  const v = C.vermelho;
  tabela(s, { x: a.x, y: a.y - 0.15, w: a.w }, ["FORNECEDOR", "TOTAL"], [
    [{ t: "TAM", b: true }, "R$ 16.402.463"], [{ t: "GOL", b: true }, "R$ 6.052.551"], [{ t: "AZUL", b: true }, "R$ 4.696.245"],
    [{ t: "PANTANAL VEÍCULOS LTDA", b: true }, "R$ 3.230.363"],
    [{ t: "Facebook Serviços Online do Brasil Ltda.", b: true, c: v }, { t: "R$ 2.237.052", c: v }],
    [{ t: "HPE AUTOMOTORES DO BRASIL LTDA", b: true }, "R$ 1.475.070"], [{ t: "SUPREMA MOBILIDADE LTDA", b: true }, "R$ 1.430.533"],
    [{ t: "FACEBOOK SERVIÇOS ONLINE DO BRASIL LTDA", b: true, c: v }, { t: "R$ 1.064.974", c: v }],
  ], [5.2, a.w - 5.2], { rowH: 0.36 });
  s.addText("ERRADO", { x: 9.35, y: 1.6, w: 3.3, h: 1.0, fontFace: MONO, fontSize: 36, bold: true, color: C.laranja,
    align: "center", valign: "middle", charSpacing: 6, rotate: 352, line: { color: C.laranja, width: 3 }, margin: 0, isTextBox: true });
  paragrafo(s, "Quinto e oitavo lugar são a mesma empresa, escrita de dois jeitos. O script rodou até o fim, sem aviso nenhum.", 5.3, { w: 9.6, size: 17, h: 0.9 });
}

// =============================================================== 05 o conserto
{
  const s = novo("e aí você conserta, porque é isso que a gente faz", "Sem ironia nenhuma: este script é bom. O analista viu o erro do slide anterior e consertou. Leia o dicionário em voz alta, e depois a legenda. O ponto é que FUNCIONOU.");
  const a = janela(s, M, 0.9, CW, 3.6, "analise.py — três semanas depois");
  const A = C.ambar, K = C.kw;
  codigo(s, a, [
    "APELIDO = {",
    [{ t: "    " }, { t: '"TAM"', c: A }, { t: ": " }, { t: '"TAM"', c: A }, { t: ",  " }, { t: '"LATAM"', c: A }, { t: ": " }, { t: '"TAM"', c: A }, { t: ",  " }, { t: '"GOL"', c: A }, { t: ": " }, { t: '"GOL"', c: A }, { t: "," }],
    [{ t: "    " }, { t: '"AZUL"', c: A }, { t: ": " }, { t: '"AZUL"', c: A }, { t: ",  " }, { t: '"TELEFONICA"', c: A }, { t: ": " }, { t: '"VIVO"', c: A }, { t: ",  " }, { t: '"VIVO"', c: A }, { t: ": " }, { t: '"VIVO"', c: A }, { t: "," }],
    "}",
    "",
    [{ t: "def", c: K }, { t: " limpar(nome):" }],
    [{ t: "    n = re.sub(" }, { t: 'r"[^A-Z0-9 ]"', c: A }, { t: ", " }, { t: '" "', c: A }, { t: ", " }, { t: "str", c: K }, { t: "(nome).upper())" }],
    [{ t: "    " }, { t: "for", c: K }, { t: " chave, apelido " }, { t: "in", c: K }, { t: " APELIDO.items():" }],
    [{ t: "        " }, { t: "if", c: K }, { t: " re.search(" }, { t: 'rf"\\b{chave}\\b"', c: A }, { t: ", n): " }, { t: "return", c: K }, { t: " apelido" }],
    [{ t: "    " }, { t: "return", c: K }, { t: " " }, { t: '" "', c: A }, { t: ".join(n.split())" }],
  ], 12.5);
  paragrafo(s, [{ text: "E " }, { text: "funciona", bold: true, color: C.tinta }, { text: ". AZUL tinha 50 grafias, VIVO 33, Facebook 4 — e os R$ 3,3 milhões do Facebook param de aparecer partidos em dois. De 22.024 fornecedores distintos para 21.414." }], 4.75, { w: 10.4, size: 16, h: 0.9 });
  termos(s, [["normalizar", "reduzir grafias diferentes da mesma coisa a uma forma única, para poder somar. É o primeiro conserto que todo mundo faz."]]);
}

// =============================================================== 06 soma certa, resposta errada
{
  const s = novo("a soma certa, a resposta errada", "O golpe da aula. A soma agora está CERTA e o pódio continua ERRADO, e as duas coisas não se contradizem. Espere a plateia procurar o erro antes de ler os parágrafos.");
  const a = janela(s, M, 0.9, CW, 2.95, "python analise.py — 2025, já com o conserto");
  const v = C.vermelho, g = C.verde;
  tabela(s, { x: a.x, y: a.y - 0.15, w: a.w }, ["FORNECEDOR", "TOTAL", ""], [
    [{ t: "TAM", b: true }, "R$ 17.403.240", { t: "ainda em primeiro", c: v }],
    [{ t: "GOL", b: true }, "R$ 6.337.713", { t: "e em segundo", c: v }],
    [{ t: "AZUL", b: true }, "R$ 5.038.621", { t: "e em terceiro", c: v }],
    [{ t: "FACEBOOK", b: true }, "R$ 3.303.431", { t: "agora inteiro", c: g }],
    [{ t: "PANTANAL VEÍCULOS", b: true }, "R$ 3.246.762", { t: "ok", c: g }],
  ], [4.2, 3.2, a.w - 7.4], { rowH: 0.33 });
  paragrafo(s, [{ text: "Companhia aérea não é fornecedora de deputado. É o " }, { text: "SIGEPA", bold: true, color: C.tinta }, { text: ", o sistema de passagens da própria Câmara: o bilhete sai por lá e a companhia cai na planilha. " }, { text: "Das 38.113 linhas de aérea em 2025, 37.114 não têm CNPJ.", bold: true, color: C.tinta }], 4.05, { w: 10.4, size: 16, h: 1.0 });
  paragrafo(s, "Nenhum dicionário de nomes ia descobrir isso, porque o defeito não estava na grafia. Estava na pergunta.", 5.15, { w: 10.4, size: 16, h: 0.7 });
  termos(s, [["SIGEPA", "Sistema de Gestão de Passagens Aéreas da Câmara. O bilhete sai por ele, e quem cai na planilha é a companhia aérea."]]);
}

// =============================================================== 07 a deriva
{
  const s = novo("e o dado não fica parado", "Este é o slide central da aula e o mais difícil de improvisar. Vá devagar. A coluna da direita sobe 16 vezes em cinco anos. Nada no script mudou.");
  titulo(s, "Lançamentos sem CNPJ, ano a ano.", { size: 28, h: 0.6 });
  const a = janela(s, M, 1.5, 7.9, 3.75, "python analise.py — os sete anos, linhas sem CNPJ");
  tabela(s, { x: a.x, y: a.y - 0.15, w: a.w }, ["ANO", "LANÇAMENTOS", "SEM CNPJ", "%"], [
    [{ t: "2019", b: true }, "289.830", "4.448", { t: "1,5%", c: C.verde }],
    [{ t: "2020", b: true }, "167.132", "17.234", "10,3%"],
    [{ t: "2021", b: true }, "218.765", "43.487", "19,9%"],
    [{ t: "2022", b: true }, "209.556", "46.992", "22,4%"],
    [{ t: "2023", b: true }, "232.745", "56.943", "24,5%"],
    [{ t: "2024", b: true }, "232.925", "58.164", { t: "25,0%", c: C.vermelho }],
    [{ t: "2025", b: true }, "209.066", "37.934", "18,1%"],
  ], [1.4, 2.4, 2.0, a.w - 5.8], { rowH: 0.33 });
  paragrafo(s, "A Câmara foi movendo o voo de “fornecedor com CNPJ” para “SIGEPA, sem CNPJ”. Quem escreveu o script em 2019 não escreveu nada errado. O chão é que andou.", 1.55, { x: 8.9, w: 3.85, size: 16, h: 3.5 });
  termos(s, [["CNPJ", "o documento da empresa, 14 dígitos. Sem ele, saber quem recebeu depende de confiar no nome que alguém digitou."]]);
}

// =============================================================== 08 catorze dias depois
{
  const s = novo("o mesmo script, catorze dias depois", "Aconteceu de verdade, com este arquivo: baixado em 04/09 e de novo em 18/09. Leia as duas saídas sem comentar. A plateia vê a diferença sozinha. Depois a tese, como conclusão.");
  const a = janela(s, M, 0.9, 7.3, 2.9, "python analise.py");
  const P = C.verde, K = C.tinta40;
  codigo(s, a, [
    [{ t: "$", c: P }, { t: " python analise.py   " }, { t: "# Ano-2025.csv baixado em 04/09", c: K }],
    [{ t: "linhas: " }, { t: "208.246", b: true }],
    [{ t: "TAM       R$ " }, { t: "22,8 mi", b: true }],
    "",
    [{ t: "$", c: P }, { t: " python analise.py   " }, { t: "# mesmo arquivo, mesma URL, 18/09", c: K }],
    [{ t: "linhas: " }, { t: "209.066", b: true, c: C.vermelho }],
    [{ t: "TAM       R$ " }, { t: "16,4 mi", b: true, c: C.vermelho }],
  ], 13);
  paragrafo(s, "A Câmara republica o arquivo com correções. 820 linhas a mais, e a TAM perde R$ 6,4 milhões. O script não tem como saber qual dos dois arquivos produziu o número que você já mandou para alguém.", 0.95, { x: 8.3, w: 4.45, size: 15, h: 2.9 });
  s.addText("Um pipeline não erra menos que um script. Ele erra num lugar onde dá para ver.", { x: M, y: 4.05, w: 11, h: 1.3, fontFace: SANS, fontSize: 30, bold: true, color: C.tinta, margin: 0, valign: "top", isTextBox: true });
  termos(s, [["pipeline", "o mesmo tratamento escrito como etapas fixas, que rodam sempre na mesma ordem e deixam rastro do que fizeram."],
             ["reprodutível", "rodar de novo amanhã, na mesma entrada, e obter exatamente o mesmo número — ou saber por que não."]]);
}

// =============================================================== 09 medalhao
{
  const s = novo("onde o conserto vai morar", "Agora a estrutura, e só agora. Construa o desenho no ritmo da fala: o CSV, depois o armazenamento, depois as três tabelas. O bronze existe porque a sua regra vai estar errada uma hora.");
  const cam = [["CAMADA 1", "bronze", "Como a Câmara publicou. Tudo texto, nada consertado. 1.560.019 linhas."],
               ["CAMADA 2", "silver", "Tipos certos e sete colunas de defeito marcado. Nenhuma linha some."],
               ["CAMADA 3", "gold", "Uma tabela por pergunta. 55.672 empresas, somadas pela raiz do CNPJ."]];
  const cw = (CW - 2 * 0.35) / 3;
  cam.forEach(([k, nome, d], i) => {
    const x = M + i * (cw + 0.35);
    cartao(s, x, 0.95, cw, 2.35);
    s.addText(k, { x: x + 0.3, y: 1.15, w: cw - 0.6, h: 0.25, fontFace: MONO, fontSize: 10, color: C.laranja, charSpacing: 3, margin: 0, isTextBox: true });
    s.addText(nome, { x: x + 0.3, y: 1.42, w: cw - 0.6, h: 0.55, fontFace: SANS, fontSize: 28, bold: true, color: C.tinta, margin: 0, isTextBox: true });
    s.addText(d, { x: x + 0.3, y: 2.05, w: cw - 0.6, h: 1.1, fontFace: SANS, fontSize: 14, color: C.tinta60, margin: 0, valign: "top", isTextBox: true });
  });
  paragrafo(s, "Guardar o bronze cru custa 5 GB e parece desperdício até a primeira vez que a regra de limpeza está errada. Aí ele é o que permite refazer sem pedir o arquivo de novo — e a Câmara republica os CSVs com correções, então o arquivo de hoje não é o de ontem.", 3.6, { w: 11.2, size: 16, h: 1.2 });
  termos(s, [["raiz do CNPJ", "os 8 primeiros dígitos, que identificam a empresa. Os 4 seguintes são a filial e os 2 últimos, os verificadores. É por ela que 55.672 empresas se somam."],
             ["chave natural", "identificador que já existe no dado do mundo real, em vez de um número inventado na hora de guardar."],
             ["camada", "um estágio do pipeline que lê do lake e escreve no lake. Como cada uma fica gravada, dá para refazer só ela."],
             ["medalhão", "o nome deste arranjo em três camadas. É convenção de nomes, não tecnologia: nada instala “medalhão”."]], { size: 10.5 });
}

// =============================================================== 10 duas pontas
{
  const s = novo("a mesma pergunta, nas duas pontas", "A mesma pergunta nas duas pontas. Rode ao vivo se a internet deixar; o screencast é o plano B. Aponte que a de cima é o script do slide 3, só que em SQL.");
  const a = janela(s, M, 0.9, CW, 3.85, "spark-sql — container spark-master");
  const P = C.verde;
  codigo(s, a, [
    [{ t: "spark-sql>", c: P }, { t: " SELECT txtFornecedor, sum(vlrDocumento) t" }],
    [{ t: "           FROM delta.`s3a://lake/" }, { t: "bronze", b: true, c: C.laranja }, { t: "` WHERE numAno=2025 GROUP BY 1 ORDER BY 2 DESC LIMIT 3;" }],
    [{ t: "TAM 16.402.463,26   GOL 6.052.550,88   AZUL 4.696.245,04", c: C.vermelho }],
    "",
    [{ t: "spark-sql>", c: P }, { t: " SELECT fornecedor, total" }],
    [{ t: "           FROM " }, { t: "fornecedores", b: true, c: C.laranja }, { t: " WHERE ano_ref=2025 ORDER BY total DESC LIMIT 3;" }],
    [{ t: "FACEBOOK 3.251.951,87   PANTANAL 3.227.314,77   VIVO 1.591.715,84", c: C.verde }],
  ], 12.5);
  paragrafo(s, "Mesmo arquivo, mesma pergunta, nenhum nome repetido entre as duas listas.", 5.0, { w: 10, size: 17, h: 0.6 });
  termos(s, [["SQL", "a mesma pergunta do slide 3, escrita como consulta. Quem lê não precisa abrir o script para saber o que foi perguntado."],
             ["s3a://", "o jeito do Spark falar com armazenamento de objetos. Entre o MinIO daqui e o S3 da AWS muda o endereço, não a consulta."]]);
}

// =============================================================== 11 a resposta
{
  const s = novo("a resposta, em 2025", "Clímax. Silêncio antes de falar. E seja honesto: o pandas chega ao mesmo pódio, e é preciso dizer isso antes que alguém pergunte. O que ele não tem são os próximos slides. Nos sete anos a lista muda, e o motivo é o slide 7.");
  s.addText("R$ 3,25 mi", { x: M, y: 0.8, w: CW, h: 1.5, fontFace: MONO, fontSize: 72, bold: true, color: C.verde, margin: 0, valign: "middle", isTextBox: true });
  s.addText("FACEBOOK SERVIÇOS ONLINE DO BRASIL", { x: M, y: 2.35, w: CW, h: 0.4, fontFace: MONO, fontSize: 18, color: C.tinta60, charSpacing: 3, margin: 0, isTextBox: true });
  paragrafo(s, [{ text: "O script do slide 5, com uma linha a mais — " }, { text: "df[df.txtCNPJCPF.notna()]", mono: true, color: C.tinta }, { text: " —, chega ao mesmo pódio. Ele dá R$ 3,30 mi e a gold 3,25 por duas razões que dá para nomear: ele soma a nota e a gold soma o reembolso; ele agrupa por nome e a gold por CNPJ, o que deixa de fora uma linha homônima de outra empresa." }], 3.05, { w: 11.2, size: 15, h: 1.3 });
  paragrafo(s, [{ text: "Nos sete anos a lista volta a começar com companhia aérea — até 2022 o voo entrava " }, { text: "com", bold: true, color: C.tinta }, { text: " CNPJ. A regra não mudou; o dado mudou de forma. Por isso o ano é uma partição, e não um filtro solto no meio de um script." }], 4.45, { w: 11.2, size: 15, h: 1.1 });
  termos(s, [["partição", "o dado fica em pastas por ano. Consultar um ano lê um ano, e reprocessar um ano reescreve um ano só."]]);
}

// =============================================================== 12 estorno
{
  const s = novo("o que está dentro dos R$ 16,4 milhões", "O 16,4 é o número do slide 4. Mostre que ele já é uma subtração: 22,8 de passagem menos 6,4 de devolução. Os 22,8 são o mesmo número do slide 8, e é provável que as 820 linhas novas sejam devoluções — mas o arquivo de 04/09 não está guardado. Se perguntarem, diga que é provável e não medido.");
  const a = janela(s, M, 0.9, CW, 2.5, "python — a TAM do slide 4");
  const P = C.verde, K = C.tinta40;
  codigo(s, a, [
    [{ t: ">>>", c: P }, { t: " tam = df[df.txtFornecedor == " }, { t: '"TAM"', c: C.ambar }, { t: "].vlrDocumento" }],
    [{ t: ">>>", c: P }, { t: " tam[tam > 0].sum()                 R$ " }, { t: "22.787.293", b: true }],
    [{ t: ">>>", c: P }, { t: " tam[tam < 0].sum()                 R$ " }, { t: "-6.384.830", b: true, c: C.vermelho }, { t: "    # 5.433 linhas", c: K }],
    [{ t: ">>>", c: P }, { t: " tam.sum()                          R$ " }, { t: "16.402.463", b: true }, { t: "    # o slide 4", c: K }],
  ], 13);
  paragrafo(s, "São estornos: passagem devolvida, lançada como valor negativo na mesma coluna do gasto. 7.197 linhas assim em 2025, 53.112 nos sete anos. Apagar resolve a soma e perde a informação. Marcar, numa coluna a mais, guarda as duas — e cada pergunta decide se conta com eles.", 3.65, { w: 11, size: 16, h: 1.4 });
  termos(s, [["estorno", "devolução de dinheiro já reembolsado. Entra como valor negativo, na mesma coluna do gasto."],
             ["glosa", "a parte da nota que a Câmara recusou pagar. O que saiu de verdade é o valor do documento menos a glosa."]]);
}

// =============================================================== 13 grep chatgpt
{
  const s = novo("grep chatgpt", "Um grep. 58 linhas, nove jeitos de escrever, e a coluna do documento: 57 iguais e uma diferente. O igual é a gaveta da Câmara para o que não tem nota; passa em qualquer validação de CNPJ.");
  const a = janela(s, M, 0.9, CW, 3.25, "Ano-2019.csv … Ano-2025.csv");
  const S = "000.000.000/0001-0";
  tabela(s, { x: a.x, y: a.y - 0.15, w: a.w }, ["FORNECEDOR", "LINHAS", "DOCUMENTO"], [
    [{ t: "OpenAI, LLC", b: true }, "38", S], [{ t: "ChatGPT Plus Subscription", b: true }, "8", S],
    [{ t: "chat GPT", b: true }, "4", S], [{ t: "OpenAI", b: true }, "3", S],
    [{ t: "Chatgpt · CHATGPT · OpenAi · ChatGPT  Plus Subscription", b: true }, "4", S],
    [{ t: "chatGPT", b: true }, "1", { t: "625.310.710/0017-8", c: C.vermelho }],
  ], [7.2, 1.4, a.w - 8.6], { rowH: 0.33 });
  paragrafo(s, "Nove grafias, um produto, R$ 10,2 mil em três anos. Cinquenta e sete linhas com o mesmo documento de catorze dígitos, que passa em qualquer validação de CNPJ e não é uma empresa: é a gaveta da Câmara para o que não tem nota fiscal. Agrupar por nome dá nove fornecedores; agrupar por documento dá um que não existe.", 4.4, { w: 11.2, size: 15, h: 1.3 });
  termos(s, [["dígito verificador", "os 2 últimos dígitos do CNPJ, calculados a partir dos outros 12. Pegam erro de digitação; não provam que a empresa existe."]]);
}

// =============================================================== 14 quatro erros
{
  const s = novo("quatro erros meus, e o que pegou cada um", "O coração da aula. São quatro erros meus, não hipotéticos. Leia os quatro e depois a legenda. Se estiver atrasado, corte o quarto. Primeira linha: qualidade.py relata quantas linhas cada regra acusou em vez de apagá-las. A regra errada apareceu como 53 mil acusações, não como 53 mil linhas sumidas — e foi por isso que eu vi.");
  const a = janela(s, M, 0.9, CW, 2.75, "o que aconteceu montando esta aula");
  const g = C.verde;
  tabela(s, { x: a.x, y: a.y - 0.15, w: a.w }, ["O ERRO", "O QUE PEGOU"], [
    [{ t: "regra de glosa acusou 53.112 linhas boas", sans: true, c: C.tinta }, { t: "o relatório conta, não filtra", c: g }],
    [{ t: "a mesma empresa com nome diferente a cada execução", sans: true, c: C.tinta }, { t: "rodar duas vezes e comparar", c: g }],
    [{ t: "soma saindo como 4.99577E7 na tela", sans: true, c: C.tinta }, { t: "tipo decimal na gold", c: g }],
    [{ t: "R$ 15,1 mi de um fornecedor que não existe", sans: true, c: C.vermelho, b: true }, { t: "consultar a gold antes de crer", c: g }],
  ], [7.0, a.w - 7.0], { rowH: 0.38, size: 14 });
  paragrafo(s, [{ text: "O quarto ia para este slide. Ramal, celular funcional e Correios compartilham a raiz " }, { text: "00000000", mono: true, color: C.tinta }, { text: ", viraram uma empresa só e apareceram em quarto lugar. Os catorze dígitos batem, inclusive os verificadores. Formato válido e significado válido são coisas diferentes." }], 3.95, { w: 11.2, size: 16, h: 1.4 });
}

// =============================================================== 15 o erro continua consultavel
{
  const s = novo("o erro continua consultável", "Aconteceu de verdade: DuckDB contou 209.066 e Spark contou 209.079, porque multiLine é true num e false no outro. A v0 guardou o erro. Consulte ao vivo.");
  const a = janela(s, M, 0.9, CW, 2.95, "spark-sql — DESCRIBE HISTORY");
  tabela(s, { x: a.x, y: a.y - 0.15, w: a.w }, ["VERSÃO", "OPERAÇÃO", "LINHAS", "O QUE ERA"], [
    [{ t: "0", b: true }, "WRITE", { t: "209.079", c: C.vermelho }, "sem multiLine — 13 linhas partidas"],
    [{ t: "1", b: true }, "WRITE", { t: "209.066", c: C.verde }, "com multiLine — correto"],
  ], [1.4, 1.8, 1.6, a.w - 4.8], { rowH: 0.34 });
  codigo(s, { x: a.x, y: a.y + 1.05, w: a.w }, [
    [{ t: "spark-sql>", c: C.verde }, { t: " SELECT count(*) FROM delta.`s3a://lake/bronze` " }, { t: "VERSION AS OF 0", b: true }, { t: ";" }],
    [{ t: "209079", c: C.vermelho }],
  ], 13);
  paragrafo(s, "No slide 8 o mesmo script deu outro número porque o arquivo mudou; aqui, porque mudou quem lê. Treze linhas têm quebra de linha dentro de um campo entre aspas, e dois motores honestos discordam sobre isso por padrão. O que a tabela Delta acrescenta é que a contagem errada não foi sobrescrita: ela virou a versão 0, e dá para voltar nela agora.", 4.1, { w: 11.2, size: 15, h: 1.5 });
  termos(s, [["Delta Lake", "formato de tabela aberto por cima de arquivos Parquet. Guarda um registro de cada escrita num log ao lado dos dados."],
             ["viagem no tempo", "consultar a tabela como ela estava antes. VERSION AS OF 0 lê o que foi escrito antes da correção."]]);
}

// =============================================================== 16 testes
{
  const s = novo("o que impede a volta", "Slide curto. O ponto: dois destes testes existem porque os bugs aconteceram. Teste em engenharia de dados é sobre a regra, não sobre o framework.");
  titulo(s, "21 testes, e dois deles têm nome de cicatriz.", { size: 28, h: 0.6 });
  const a = janela(s, M, 1.5, CW, 2.35, "pytest /opt/testes");
  const g = C.verde;
  codigo(s, a, [
    [{ t: "PASSED", c: g }, { t: "  test_estorno_nao_conta_como_glosa_maior" }],
    [{ t: "PASSED", c: g }, { t: "  test_raiz_zerada_nao_e_empresa" }],
    [{ t: "PASSED", c: g }, { t: "  test_raiz_de_verdade_nao_e_confundida" }],
    [{ t: "...", c: C.tinta40 }],
    [{ t: "21 passed", c: g, b: true }, { t: " in 11.09s" }],
  ], 13);
  paragrafo(s, "Rodam sem MinIO e sem cluster, numa SparkSession local, em 11 segundos. O que eles testam não é o Spark: é se a regra de negócio ainda significa o que eu quis dizer.", 4.1, { w: 10.6, size: 16, h: 1 });
  termos(s, [["SparkSession", "o objeto que representa a conexão com o Spark. O teste sobe uma local, sem cluster e sem MinIO."]]);
}

// =============================================================== 17 arquitetura
{
  const s = novo("processamento separado do armazenamento", "Agora o desenho completo. O worker 3 está tracejado porque vai subir de verdade: docker compose up -d --scale spark-worker=3, com o Spark UI aberto noutra aba.");
  const rot = (x, y, w, t) => s.addText(t, { x, y, w, h: 0.25, fontFace: MONO, fontSize: 9.5, color: C.laranja, charSpacing: 2, margin: 0, isTextBox: true });
  const caixa = (x, y, w, h, nome, sub, opt = {}) => {
    s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: opt.oco ? C.papel : C.painel },
      line: { color: opt.oco ? C.laranja : C.kw, width: 1.25, dashType: opt.oco ? "dash" : "solid" }, rectRadius: 0.06 });
    s.addText(nome, { x: x + 0.12, y: y + 0.08, w: w - 0.24, h: 0.32, fontFace: MONO, fontSize: 12, bold: true, color: opt.oco ? C.laranja : C.tinta, margin: 0, valign: "middle", isTextBox: true });
    if (sub) s.addText(sub, { x: x + 0.12, y: y + 0.4, w: w - 0.24, h: 0.3, fontFace: MONO, fontSize: 8.5, color: C.tinta40, charSpacing: 1, margin: 0, isTextBox: true });
  };
  // dois blocos tracejados: compute a esquerda, storage a direita
  s.addShape(pres.ShapeType.rect, { x: M, y: 1.15, w: 6.6, h: 3.3, fill: { color: "141D2A" }, line: { color: C.grade, width: 1, dashType: "dash" } });
  s.addShape(pres.ShapeType.rect, { x: 8.1, y: 1.15, w: 4.63, h: 3.3, fill: { color: "141D2A" }, line: { color: C.grade, width: 1, dashType: "dash" } });
  rot(M + 0.2, 1.25, 6, "PROCESSAMENTO · CONTAINERS spark");
  rot(8.3, 1.25, 4.3, "ARMAZENAMENTO · CONTAINER minio");
  caixa(2.6, 1.65, 2.6, 0.78, "spark-master", "REPARTE O TRABALHO");
  caixa(0.85, 3.2, 1.9, 0.9, "worker 1", "2 CORES · 2 GB");
  caixa(2.95, 3.2, 1.9, 0.9, "worker 2", "2 CORES · 2 GB");
  caixa(5.05, 3.2, 1.9, 0.9, "worker 3", "SOBE AO VIVO", { oco: true });
  [1.8, 3.9, 6.0].forEach(x => s.addShape(pres.ShapeType.line, { x: 3.9, y: 2.43, w: x - 3.9, h: 0.77, line: { color: C.kw, width: 1, endArrowType: "triangle" }, flipH: x < 3.9 }));
  caixa(8.35, 1.65, 4.1, 0.78, "MinIO", "BUCKET lake");
  [["bronze", "1.560.019 LINHAS"], ["silver", "DEFEITOS MARCADOS"], ["gold", "55.672 EMPRESAS"]].forEach(([nm, sb], i) =>
    caixa(8.35 + i * 1.4, 3.2, 1.3, 0.9, nm, sb));
  // a ligacao entre os dois blocos
  s.addShape(pres.ShapeType.line, { x: 7.2, y: 2.85, w: 0.9, h: 0, line: { color: C.laranja, width: 2, beginArrowType: "triangle", endArrowType: "triangle" } });
  s.addText("s3a://", { x: 7.0, y: 2.35, w: 1.3, h: 0.35, fontFace: MONO, fontSize: 12, bold: true, color: C.laranja, align: "center", margin: 0, isTextBox: true });
  s.addText("A MESMA API DO AMAZON S3", { x: 6.6, y: 3.0, w: 2.1, h: 0.5, fontFace: MONO, fontSize: 8, color: C.tinta40, align: "center", charSpacing: 1, margin: 0, isTextBox: true });
  paragrafo(s, [{ text: "o Spark não guarda o dado. derrube os três containers dele e o lake continua inteiro.", color: C.verde }], 4.65, { w: CW, size: 16, h: 0.4 });
  s.addText("NA NUVEM ISSO SE CHAMA “COMPUTE E STORAGE SEPARADOS”, E É O QUE DEIXA O DESENHO PORTÁVEL", { x: M, y: 5.05, w: CW, h: 0.3, fontFace: MONO, fontSize: 10, color: C.laranja, charSpacing: 1, margin: 0, isTextBox: true });
  termos(s, [["compute e storage separados", "quem processa e quem guarda são serviços distintos. Escalar um não obriga a escalar o outro."],
             ["object storage", "guarda o arquivo inteiro endereçado por um nome, em vez de blocos como um disco. É o que MinIO e S3 fazem."]]);
}

// =============================================================== 18 o nome na nuvem
{
  const s = novo("o mesmo desenho, com o nome que ele tem na nuvem", "Tom neutro. É o mesmo software rodando em dois lugares, e o código não muda. Não deprecie nenhum lado: estamos num Seminário em Cloud e a comparação é honesta.");
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
  paragrafo(s, [{ text: "Delta Lake é o mesmo formato dos dois lados. Ele é aberto, e não muda quando você paga.", color: C.verde }], 5.0, { w: CW, size: 16, h: 0.45 });
  termos(s, [["endpoint", "o endereço do serviço de armazenamento. É a linha de configuração que muda entre rodar aqui e rodar na AWS."],
             ["elasticidade", "pedir máquina quando precisa e devolver depois. O worker 3 do slide anterior sobe ao vivo; na nuvem são 200, e o código é o mesmo."]]);
}

// =============================================================== 19 quando cada um faz sentido
{
  const s = novo("quando cada um faz sentido", "Os dois lados têm bolinha verde. A escolha é de contexto, não de virtude. Se alguém perguntar qual é o melhor, a resposta é: depende do que está na coluna da direita.");
  const col = (x, rotulo, itens) => {
    cartao(s, x, 0.95, (CW - 0.4) / 2, 3.9);
    s.addText(rotulo, { x: x + 0.35, y: 1.15, w: 5, h: 0.3, fontFace: MONO, fontSize: 11, color: C.laranja, charSpacing: 3, margin: 0, isTextBox: true });
    s.addText("Bom quando…", { x: x + 0.35, y: 1.5, w: 5, h: 0.45, fontFace: SANS, fontSize: 22, bold: true, color: C.tinta, margin: 0, isTextBox: true });
    s.addText(itens.map((t, i) => ({ text: t, options: { bullet: { code: "25CF" }, color: C.tinta60, breakLine: i < itens.length - 1 } })),
      { x: x + 0.35, y: 2.1, w: (CW - 0.4) / 2 - 0.7, h: 2.6, fontFace: SANS, fontSize: 15, color: C.tinta60, margin: 0, valign: "top", paraSpaceAfter: 8, isTextBox: true });
  };
  col(M, "NO SEU DOCKER", ["você está aprendendo e quer quebrar sem medo", "o dado cabe confortavelmente numa máquina", "o ciclo curto importa: subiu, errou, refez em minutos", "o dado não pode sair da sua rede"]);
  col(M + (CW - 0.4) / 2 + 0.4, "NA NUVEM", ["o dado não cabe mais numa máquina só", "você precisa de 200 máquinas por 20 minutos", "o time é pequeno e o plantão não pode ser você", "outras equipes precisam do mesmo dado, com governança"]);
  paragrafo(s, "É o mesmo Apache Spark e o mesmo Delta Lake dos dois lados. O que muda é quem opera a infraestrutura.", 5.1, { w: CW, size: 16, h: 0.5 });
  termos(s, [["governança", "quem pode ler o quê, quem mudou a tabela e quando. Vira problema no dia em que o dado deixa de ser só seu."]]);
}

// =============================================================== 20 fecho
{
  const s = novo("para levar para casa", "Fecho curto. O repositório sobe em dois comandos. Depois abra para as perguntas — são 10 minutos.");
  s.addText("O script do slide 3 continua certo. Ele só precisava de um lugar para morar.", { x: M, y: 1.0, w: 10.5, h: 1.9, fontFace: SANS, fontSize: 36, bold: true, color: C.tinta, margin: 0, valign: "top", isTextBox: true });
  paragrafo(s, "Tudo que você viu é software aberto — MinIO, Apache Spark, Delta Lake, Docker — e um CSV público da Câmara. Roda no seu laptop hoje e sobe na nuvem no dia em que o dado crescer, sem reescrever a regra.", 3.1, { w: 10.5, size: 18, h: 1.3 });
  const a = janela(s, M, 4.7, 6.2, 1.3, "no repositório");
  codigo(s, a, [[{ t: "$", c: C.verde }, { t: " make subir" }, { t: "     ·     ", c: C.tinta40 }, { t: "$", c: C.verde }, { t: " make pipeline" }]], 14);
}

if (n !== TOTAL) throw new Error(`esperava ${TOTAL} slides, saíram ${n}`);
pres.writeFile({ fileName: __dirname + "/aula.pptx" }).then(f => console.log("gravado:", f, "—", n, "slides"));
