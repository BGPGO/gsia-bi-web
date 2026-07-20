/**
 * build-data.cjs — Lê a planilha de Abertura de Vagas e gera data.js
 * para o BI GSIA Facilities (controle de vagas).
 */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_PATH = 'G:/Meu Drive/BGP/CLIENTES/BI/126. GSIA FACILITIES/BASES/Abertura de Vagas (10).xlsx';

console.log('[build-data] Lendo planilha…');
const wb = XLSX.readFile(EXCEL_PATH, { cellDates: true });
const ws = wb.Sheets[wb.SheetNames[0]];
const raw = XLSX.utils.sheet_to_json(ws, { defval: null });

console.log(`[build-data] ${raw.length} linhas lidas.`);

// Normaliza dados
const vagas = [];
for (const row of raw) {
  const carimbo = row['Carimbo de data/hora'];
  const empresa = row['Empresa/Grupo'] || '';
  const cliente = row['Nome do Cliente'] || '';
  const qtd = Number(row['Quantidade de Vagas']) || 1;
  const cargo = row['Cargo'] || '';
  const motivo = row['Motivo da Abertura'] || '';
  const escala = row['Escala'] || '';
  const feriado = row['Trabalha Feriado?'] || '';
  const escalonado = row['Escalonado (Sábado e Domingo)'] || '';
  const horarioEntrada = row['Horário (Entrada)'] || '';
  const horarioSaida = row['Horário (Saída)'] || '';
  const sexo = row['Sexo'] || '';
  const perfil = row['Perfil / Requisitos'] || '';
  const responsavel = row['Responsável Pela Abertura'] || '';
  const prazoFechamento = row['Prazo de Fechamento'];
  const dataFechamento = row['Data de Fechamento'];
  const statusRaw = (row['Status'] || '').toString().trim().toUpperCase();

  // Determina status: FECHADO, CANCELADA, ou EM ABERTO
  let status;
  if (statusRaw === 'FECHADO' || statusRaw === 'FECHADA') {
    status = 'FECHADO';
  } else if (statusRaw === 'CANCELADA' || statusRaw === 'CANCELADO') {
    status = 'CANCELADA';
  } else {
    status = 'EM ABERTO';
  }

  // Calcula tempo de fechamento (em dias) se houver data de fechamento
  let diasFechamento = null;
  if (dataFechamento && carimbo && status === 'FECHADO') {
    const dtAbertura = new Date(carimbo);
    const dtFechamento = new Date(dataFechamento);
    diasFechamento = Math.max(0, Math.round((dtFechamento - dtAbertura) / (1000 * 60 * 60 * 24)));
  }

  // Formata datas
  const fmtDate = (d) => {
    if (!d) return null;
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return null;
    return dt.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  vagas.push({
      dataAbertura: fmtDate(carimbo),
      empresa,
      cliente,
      qtdVagas: qtd,
      cargo,
      motivo,
      escala,
      feriado,
      escalonado,
      horarioEntrada: horarioEntrada ? horarioEntrada.toString() : '',
      horarioSaida: horarioSaida ? horarioSaida.toString() : '',
      sexo,
      perfil,
      responsavel,
      prazoFechamento: fmtDate(prazoFechamento),
      dataFechamento: fmtDate(dataFechamento),
      status,
      diasFechamento,
    });
}

console.log(`[build-data] ${vagas.length} vagas (1 por linha).`);

// === Métricas ===
const fechadas = vagas.filter(v => v.status === 'FECHADO').length;
const abertas = vagas.filter(v => v.status === 'EM ABERTO').length;
const canceladas = vagas.filter(v => v.status === 'CANCELADA').length;
const total = vagas.length;
const clientes = [...new Set(vagas.map(v => v.cliente))].filter(Boolean);
const totalClientes = clientes.length;

// Tempo médio de fechamento (só vagas fechadas com dias calculados)
const vagasFechadasComDias = vagas.filter(v => v.status === 'FECHADO' && v.diasFechamento != null);
const tempoMedioFechamento = vagasFechadasComDias.length > 0
  ? Math.round(vagasFechadasComDias.reduce((s, v) => s + v.diasFechamento, 0) / vagasFechadasComDias.length)
  : 0;

// === Gráfico de barras: responsável por abertura ===
const porResponsavel = {};
for (const v of vagas) {
  const r = v.responsavel || 'N/A';
  porResponsavel[r] = (porResponsavel[r] || 0) + 1;
}
const responsavelData = Object.entries(porResponsavel)
  .map(([name, value]) => ({ name, value }))
  .sort((a, b) => b.value - a.value);

// === Gráfico pizza: quantidade de vagas por função (cargo) ===
const porCargo = {};
for (const v of vagas) {
  const c = v.cargo || 'N/A';
  porCargo[c] = (porCargo[c] || 0) + 1;
}
const cargoData = Object.entries(porCargo)
  .map(([name, value]) => ({ name, value }))
  .sort((a, b) => b.value - a.value);

// === Gráfico de barras empilhadas: tempo médio de fechamento por cliente ===
const tempoClienteMap = {};
for (const v of vagas) {
  if (v.status === 'FECHADO' && v.diasFechamento != null) {
    const c = v.cliente || 'N/A';
    if (!tempoClienteMap[c]) tempoClienteMap[c] = { soma: 0, count: 0 };
    tempoClienteMap[c].soma += v.diasFechamento;
    tempoClienteMap[c].count++;
  }
}
const tempoClienteData = Object.entries(tempoClienteMap)
  .map(([name, { soma, count }]) => ({ name, value: Math.round(soma / count) }))
  .sort((a, b) => b.value - a.value);

// === Matriz: vagas por cliente → responsavel → cargo ===
// Estrutura hierárquica para a tabela
const matrizData = [];
const clienteMap = {};
for (const v of vagas) {
  const c = v.cliente || 'N/A';
  const r = v.responsavel || 'N/A';
  const cargo = v.cargo || 'N/A';
  const key = `${c}|||${r}|||${cargo}`;
  if (!clienteMap[key]) {
    clienteMap[key] = { cliente: c, responsavel: r, cargo, fechado: 0, cancelada: 0, aberto: 0, dataFechamento: [] };
  }
  if (v.status === 'FECHADO') clienteMap[key].fechado++;
  else if (v.status === 'CANCELADA') clienteMap[key].cancelada++;
  else clienteMap[key].aberto++;
  if (v.dataFechamento) clienteMap[key].dataFechamento.push(v.dataFechamento);
}
const matrizRows = Object.values(clienteMap).sort((a, b) => {
  if (a.cliente !== b.cliente) return a.cliente.localeCompare(b.cliente);
  if (a.responsavel !== b.responsavel) return a.responsavel.localeCompare(b.responsavel);
  return a.cargo.localeCompare(b.cargo);
});

// === Responsável por Matriz (vagas por responsavel com breakdown de status) ===
const responsavelMatrizMap = {};
for (const v of vagas) {
  const r = v.responsavel || 'N/A';
  if (!responsavelMatrizMap[r]) responsavelMatrizMap[r] = { fechado: 0, cancelada: 0, aberto: 0 };
  if (v.status === 'FECHADO') responsavelMatrizMap[r].fechado++;
  else if (v.status === 'CANCELADA') responsavelMatrizMap[r].cancelada++;
  else responsavelMatrizMap[r].aberto++;
}
const responsavelMatrizData = Object.entries(responsavelMatrizMap)
  .map(([name, d]) => ({ name, fechado: d.fechado, cancelada: d.cancelada, aberto: d.aberto, total: d.fechado + d.cancelada + d.aberto }))
  .sort((a, b) => b.total - a.total);

// Monta objeto final
const BIT = {
  kpis: {
    fechadas,
    abertas,
    canceladas,
    total,
    totalClientes,
    tempoMedioFechamento,
  },
  responsavelData,
  responsavelMatrizData,
  cargoData,
  tempoClienteData,
  matrizRows,
  vagas, // dados completos pra filtros futuros
};

// Escreve data.js
const outPath = path.join(__dirname, 'data.js');
const now = new Date().toISOString();
const content = `// Auto-generated by build-data.cjs — ${now}\nwindow.BIT_UPDATED = "${now}";\nwindow.BIT = ${JSON.stringify(BIT, null, 0)};\n`;
fs.writeFileSync(outPath, content, 'utf-8');

console.log(`[build-data] data.js gerado (${(Buffer.byteLength(content) / 1024).toFixed(1)} KB)`);
console.log(`[build-data] KPIs: ${fechadas} fechadas, ${abertas} abertas, ${canceladas} canceladas, ${total} total, ${totalClientes} clientes, ${tempoMedioFechamento} dias médio`);
