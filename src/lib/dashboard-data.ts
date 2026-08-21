export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const kpis = [
  { label: "Orçamento (Previsto)", value: "R$ 52,73 mi", sub: "100% do total", icon: "coins" },
  { label: "Comprometido", value: "R$ 18,64 mi", sub: "35,35% do orçamento", icon: "file" },
  { label: "Realizado", value: "R$ 11,70 mi", sub: "22,19% do orçamento", icon: "check" },
  { label: "Saldo a Executar", value: "R$ 41,03 mi", sub: "77,81% do orçamento", icon: "pie" },
  {
    label: "Disponível após compromissos",
    value: "R$ 22,39 mi",
    sub: "42,45% do orçamento",
    icon: "wallet",
  },
  { label: "Forecast Dez/2026", value: "R$ 45,80 mi", sub: "86,85% do orçamento", icon: "trend" },
  {
    label: "Desvio Forecast",
    value: "- R$ 6,93 mi",
    sub: "-13,15% do orçamento",
    icon: "target",
    negative: true,
  },
] as const;

export const execucaoMensal = [
  { mes: "JAN", previsto: 4.4, realizado: 1.6, forecast: null as number | null },
  { mes: "FEV", previsto: 8.8, realizado: 3.1, forecast: null },
  { mes: "MAR", previsto: 13.2, realizado: 5.0, forecast: null },
  { mes: "ABR", previsto: 17.6, realizado: 7.1, forecast: null },
  { mes: "MAI", previsto: 22.0, realizado: 9.3, forecast: null },
  { mes: "JUN", previsto: 26.4, realizado: 11.7, forecast: 11.7 },
  { mes: "JUL", previsto: 30.8, realizado: null, forecast: 17.4 },
  { mes: "AGO", previsto: 35.2, realizado: null, forecast: 23.0 },
  { mes: "SET", previsto: 39.5, realizado: null, forecast: 28.5 },
  { mes: "OUT", previsto: 43.9, realizado: null, forecast: 34.2 },
  { mes: "NOV", previsto: 48.3, realizado: null, forecast: 40.0 },
  { mes: "DEZ", previsto: 52.73, realizado: null, forecast: 45.8 },
];

export const contas = [
  { nome: "Construções em Andamento", pct: 57.5 },
  { nome: "Equip. de Informática", pct: 12.2 },
  { nome: "Máquinas e Equip. em Geral", pct: 10.8 },
  { nome: "Equip. Méd., Cirúrg., Odont. e Laborat.", pct: 6.9 },
  { nome: "Mobiliário em Geral", pct: 5.8 },
  { nome: "Benfeitorias em Imóveis de Terceiros", pct: 4.1 },
  { nome: "Equip. de Comunicação", pct: 2.7 },
  { nome: "Equip. Esportivos, Art. e Recreação", pct: 0.0 },
  { nome: "Veículos", pct: 0.0 },
  { nome: "Terrenos", pct: 0.0 },
];

type Situacao = "ok" | "warn" | "crit";

export const centrosCusto: {
  cc: string;
  previsto: number;
  realizado: number;
  pct: string;
  saldo: number;
  situacao: Situacao;
}[] = [
  {
    cc: "SESI Escola Várzea Grande",
    previsto: 8921304,
    realizado: 2845632,
    pct: "31,9%",
    saldo: 6075672,
    situacao: "warn",
  },
  {
    cc: "SESI Escola Rondonópolis",
    previsto: 7845215,
    realizado: 1967819,
    pct: "25,1%",
    saldo: 5877396,
    situacao: "warn",
  },
  {
    cc: "SESI Escola Sorriso",
    previsto: 6620000,
    realizado: 1012450,
    pct: "15,3%",
    saldo: 5607550,
    situacao: "crit",
  },
  {
    cc: "SESI Clínica SST Lucas do RV",
    previsto: 4250000,
    realizado: 812300,
    pct: "19,1%",
    saldo: 3437700,
    situacao: "crit",
  },
  {
    cc: "SESI Experience Rondonópolis",
    previsto: 3980000,
    realizado: 1354776,
    pct: "34,0%",
    saldo: 2625224,
    situacao: "warn",
  },
  {
    cc: "SESI Clube Cáceres",
    previsto: 3215000,
    realizado: 562211,
    pct: "17,5%",
    saldo: 2652789,
    situacao: "crit",
  },
  {
    cc: "SESI Polo Alta Floresta",
    previsto: 2560000,
    realizado: 231895,
    pct: "9,1%",
    saldo: 2328105,
    situacao: "crit",
  },
  {
    cc: "SESI Casa da Indústria Sinop",
    previsto: 2250000,
    realizado: 394143,
    pct: "17,5%",
    saldo: 1855857,
    situacao: "crit",
  },
  {
    cc: "SESI Escola Cuiabá",
    previsto: 1980000,
    realizado: 523182,
    pct: "26,4%",
    saldo: 1456818,
    situacao: "warn",
  },
  {
    cc: "Demais Centros de Custo",
    previsto: 11102744,
    realizado: 1991400,
    pct: "17,9%",
    saldo: 9111344,
    situacao: "crit",
  },
];

export const totalCC = {
  previsto: 52732263,
  realizado: 11701009,
  pct: "22,19%",
  saldo: 41031254,
};

export const maioresSaldos = [
  {
    item: "Construção SESI Escola Sorriso",
    cc: "SESI Escola Sorriso",
    saldo: 4890000,
    pct: "11,9%",
  },
  {
    item: "Ampliação SESI Escola VG",
    cc: "SESI Escola Várzea Grande",
    saldo: 4210000,
    pct: "10,3%",
  },
  {
    item: "Construção Clínica SST Lucas",
    cc: "SESI Clínica SST Lucas do RV",
    saldo: 3200000,
    pct: "7,8%",
  },
  { item: "Reforma SESI Rondonópolis", cc: "SESI Escola Rondonópolis", saldo: 2980000, pct: "7,3%" },
  { item: "Centro de Eventos – Estrutura", cc: "Sede SESI MT", saldo: 2450000, pct: "6,0%" },
  { item: "Equipamentos de Informática", cc: "Diversos CC", saldo: 1950000, pct: "4,8%" },
  { item: "Mobiliário SESI Escolas", cc: "Diversos CC", saldo: 1750000, pct: "4,3%" },
  { item: "Equip. Médicos e Laboratoriais", cc: "Diversos CC", saldo: 1420000, pct: "3,5%" },
  { item: "Comunicação e Telefonia", cc: "Diversos CC", saldo: 980000, pct: "2,4%" },
  { item: "Veículos Operacionais", cc: "Diversos CC", saldo: 860000, pct: "2,1%" },
];

export const risco = [
  {
    titulo: "Em dia",
    tone: "ok" as const,
    qtd: 15,
    unidade: "Centros de Custo",
    valor: "R$ 14,23 mi",
    sub: "27,0% do orçamento",
  },
  {
    titulo: "Atenção",
    tone: "warn" as const,
    qtd: 17,
    unidade: "Centros de Custo",
    valor: "R$ 12,71 mi",
    sub: "24,1% do orçamento",
  },
  {
    titulo: "Crítico",
    tone: "crit" as const,
    qtd: 9,
    unidade: "Centros de Custo",
    valor: "R$ 25,79 mi",
    sub: "48,9% do orçamento",
  },
  {
    titulo: "Sem execução",
    tone: "neutral" as const,
    qtd: 6,
    unidade: "Itens de Investimento",
    valor: "R$ 2,31 mi",
    sub: "4,4% do orçamento",
  },
];

export const comparativo = [
  { linha: "Previsto", a2025: "48.270.258", a2026: "52.732.263", var: "+9,24%", dir: "up" },
  { linha: "Realizado", a2025: "10.708.366", a2026: "11.701.010", var: "+9,27%", dir: "up" },
  { linha: "% Execução", a2025: "22,19%", a2026: "22,19%", var: "0,00 p.p.", dir: "flat" },
] as const;

// ---------- Respostas rápidas (leitura executiva) ----------
export const respostasRapidas = [
  {
    pergunta: "Quanto temos previsto?",
    resposta: "R$ 52,73 mi",
    detalhe: "Orçamento aprovado 2026",
    tone: "brand" as const,
  },
  {
    pergunta: "Quanto já realizamos?",
    resposta: "R$ 11,70 mi",
    detalhe: "22,19% do previsto no período apurado",
    tone: "ok" as const,
  },
  {
    pergunta: "Quanto falta executar?",
    resposta: "R$ 41,03 mi",
    detalhe: "77,81% do orçamento nos meses restantes",
    tone: "warn" as const,
  },
  {
    pergunta: "Onde estão os maiores investimentos?",
    resposta: "Construções em Andamento",
    detalhe: "57,5% do orçamento • Sorriso, VG e Rondonópolis",
    tone: "brand" as const,
  },
  {
    pergunta: "Onde estão os principais desvios?",
    resposta: "9 CC críticos • R$ 25,79 mi",
    detalhe: "Execução < 15% • maior desvio: Alta Floresta (-25,7 p.p.)",
    tone: "crit" as const,
  },
  {
    pergunta: "Qual o ritmo de execução?",
    resposta: "R$ 1,95 mi/mês",
    detalhe: "Necessário Jul-Dez: R$ 6,84 mi/mês (3,5x)",
    tone: "warn" as const,
  },
  {
    pergunta: "Qual a tendência de encerramento?",
    resposta: "R$ 45,80 mi (86,85%)",
    detalhe: "Desvio projetado: - R$ 6,93 mi",
    tone: "crit" as const,
  },
];

// ---------- Visão segmentada ----------
export type SegRow = {
  nome: string;
  grupo: string;
  previsto: number;
  /** Legado: a planilha oficial SHIFT não traz "comprometido". */
  comprometido?: number;

  realizado: number;
};

export const segCentroCusto: SegRow[] = [
  { nome: "SESI Escola Várzea Grande", grupo: "Educação", previsto: 8921304, comprometido: 4120000, realizado: 2845632 },
  { nome: "SESI Escola Rondonópolis", grupo: "Educação", previsto: 7845215, comprometido: 3150000, realizado: 1967819 },
  { nome: "SESI Escola Sorriso", grupo: "Educação", previsto: 6620000, comprometido: 2480000, realizado: 1012450 },
  { nome: "SESI Clínica SST Lucas do RV", grupo: "Saúde e Segurança", previsto: 4250000, comprometido: 1580000, realizado: 812300 },
  { nome: "SESI Experience Rondonópolis", grupo: "Cultura e Lazer", previsto: 3980000, comprometido: 1890000, realizado: 1354776 },
  { nome: "SESI Clube Cáceres", grupo: "Cultura e Lazer", previsto: 3215000, comprometido: 980000, realizado: 562211 },
  { nome: "SESI Polo Alta Floresta", grupo: "Educação", previsto: 2560000, comprometido: 410000, realizado: 231895 },
  { nome: "SESI Casa da Indústria Sinop", grupo: "Administrativo", previsto: 2250000, comprometido: 720000, realizado: 394143 },
  { nome: "SESI Escola Cuiabá", grupo: "Educação", previsto: 1980000, comprometido: 890000, realizado: 523182 },
  { nome: "Demais Centros de Custo", grupo: "Diversos", previsto: 11110744, comprometido: 2420000, realizado: 1996601 },
];

export const segItem: SegRow[] = [
  { nome: "Construção SESI Escola Sorriso", grupo: "Construções em Andamento", previsto: 6100000, comprometido: 2300000, realizado: 1210000 },
  { nome: "Ampliação SESI Escola Várzea Grande", grupo: "Construções em Andamento", previsto: 5600000, comprometido: 2600000, realizado: 1390000 },
  { nome: "Construção Clínica SST Lucas do RV", grupo: "Construções em Andamento", previsto: 4100000, comprometido: 1500000, realizado: 900000 },
  { nome: "Reforma SESI Escola Rondonópolis", grupo: "Benfeitorias em Imóveis", previsto: 3900000, comprometido: 1450000, realizado: 920000 },
  { nome: "Centro de Eventos – Estrutura", grupo: "Construções em Andamento", previsto: 3200000, comprometido: 1100000, realizado: 750000 },
  { nome: "Equipamentos de Informática", grupo: "Equip. de Informática", previsto: 6430000, comprometido: 2900000, realizado: 2180000 },
  { nome: "Mobiliário SESI Escolas", grupo: "Mobiliário em Geral", previsto: 3060000, comprometido: 1350000, realizado: 1310000 },
  { nome: "Equip. Médicos e Laboratoriais", grupo: "Equip. Médicos", previsto: 3640000, comprometido: 1420000, realizado: 1210000 },
  { nome: "Comunicação e Telefonia", grupo: "Equip. de Comunicação", previsto: 1420000, comprometido: 520000, realizado: 440000 },
  { nome: "Veículos Operacionais", grupo: "Veículos", previsto: 860000, comprometido: 0, realizado: 0 },
];

export const segConta: SegRow[] = [
  { nome: "Construções em Andamento", grupo: "Imobilizado", previsto: 30320000, comprometido: 11200000, realizado: 5310000 },
  { nome: "Equip. de Informática", grupo: "Imobilizado", previsto: 6430000, comprometido: 2900000, realizado: 2180000 },
  { nome: "Máquinas e Equip. em Geral", grupo: "Imobilizado", previsto: 5695000, comprometido: 1900000, realizado: 1150000 },
  { nome: "Equip. Méd., Cirúrg., Odont. e Laborat.", grupo: "Imobilizado", previsto: 3640000, comprometido: 1420000, realizado: 1210000 },
  { nome: "Mobiliário em Geral", grupo: "Imobilizado", previsto: 3060000, comprometido: 1350000, realizado: 1310000 },
  { nome: "Benfeitorias em Imóveis de Terceiros", grupo: "Imobilizado", previsto: 2162263, comprometido: 1150000, realizado: 100000 },
  { nome: "Equip. de Comunicação", grupo: "Imobilizado", previsto: 1425000, comprometido: 520000, realizado: 441009 },
  { nome: "Equip. Esportivos, Art. e Recreação", grupo: "Imobilizado", previsto: 0, comprometido: 0, realizado: 0 },
  { nome: "Veículos", grupo: "Imobilizado", previsto: 0, comprometido: 0, realizado: 0 },
  { nome: "Terrenos", grupo: "Imobilizado", previsto: 0, comprometido: 0, realizado: 0 },
];

/** meta esperada de execução até o mês base (Jun) = 50% do previsto */
export const META_EXEC_PCT = 50;
