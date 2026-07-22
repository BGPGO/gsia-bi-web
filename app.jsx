/* GSIA Facilities BI — Controle de Vagas + Dashboard Executivo */
const { useState, useMemo, useRef } = React;

const COLORS = [
  '#22d3ee', '#10b981', '#f59e0b', '#a78bfa', '#f97316',
  '#ec4899', '#14b8a6', '#6366f1', '#84cc16', '#f43f5e',
  '#0ea5e9', '#e879f9', '#22c55e', '#fb923c', '#818cf8',
];

// ============== SLA CONFIG ==============
const SLA_CONFIG = {
  'Auxiliar de Serviços Gerais': { ideal: 2, max: 4 },
  'ASG': { ideal: 2, max: 4 },
  'Controlador de Acesso': { ideal: 3, max: 5 },
  'Recepcionista': { ideal: 3, max: 5 },
  'Operador de Monitoramento': { ideal: 4, max: 6 },
  'Supervisor': { ideal: 5, max: 7 },
};
const SLA_DEFAULT = { ideal: 3, max: 5 };

const getSLA = (cargo) => {
  if (!cargo) return SLA_DEFAULT;
  const upper = cargo.toUpperCase();
  for (const [key, val] of Object.entries(SLA_CONFIG)) {
    if (upper.includes(key.toUpperCase())) return val;
  }
  return SLA_DEFAULT;
};

// Semáforo: verde=dentro ideal, amarelo=entre ideal e max, vermelho=fora max, preto=crítico sem cobertura
const getSemaforo = (vaga) => {
  const sla = getSLA(vaga.cargo);
  const hoje = new Date();
  if (vaga.status === 'FECHADO') {
    if (vaga.diasFechamento == null) return 'verde';
    if (vaga.diasFechamento <= sla.ideal) return 'verde';
    if (vaga.diasFechamento <= sla.max) return 'amarelo';
    return 'vermelho';
  }
  if (vaga.status === 'CANCELADA') return 'cinza';
  // EM ABERTO — calcula dias desde abertura
  if (!vaga.dataAbertura) return 'vermelho';
  const dias = Math.max(0, Math.round((hoje - new Date(vaga.dataAbertura)) / 86400000));
  if (dias <= sla.ideal) return 'verde';
  if (dias <= sla.max) return 'amarelo';
  if (dias <= sla.max * 2) return 'vermelho';
  return 'preto';
};

const SEMAFORO_COLORS = {
  verde: '#10b981', amarelo: '#f59e0b', vermelho: '#ef4444', preto: '#374151', cinza: '#6b7680',
};
const SEMAFORO_LABELS = {
  verde: 'No prazo', amarelo: 'Atenção', vermelho: 'Fora do prazo', preto: 'Crítico', cinza: 'Cancelada',
};

// Dias de posto descoberto
const getDiasDescoberto = (vaga) => {
  const sla = getSLA(vaga.cargo);
  if (vaga.status === 'FECHADO') {
    if (vaga.diasFechamento == null) return 0;
    return Math.max(0, vaga.diasFechamento - sla.max);
  }
  if (vaga.status === 'EM ABERTO' && vaga.dataAbertura) {
    const dias = Math.max(0, Math.round((new Date() - new Date(vaga.dataAbertura)) / 86400000));
    return Math.max(0, dias - sla.max);
  }
  return 0;
};

// ============== ICONS ==============
const Icon = ({ name, ...props }) => {
  const paths = {
    users: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></>,
    briefcase: <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></>,
    dashboard: <><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></>,
    check: <><path d="M20 6L9 17l-5-5"/></>,
    clock: <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>,
    building: <><path d="M6 22V2h12v20M6 12H2v10h4M18 12h4v10h-4M10 6h4M10 10h4M10 14h4M10 18h4"/></>,
    menu: <><path d="M4 6h16M4 12h10M4 18h16"/></>,
    chevronRight: <><path d="M9 6l6 6-6 6"/></>,
    chevronDown: <><path d="M6 9l6 6 6-6"/></>,
    xCircle: <><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></>,
    filter: <><path d="M3 5h18l-7 9v6l-4-2v-4z"/></>,
    alert: <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></>,
    target: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {paths[name]}
    </svg>
  );
};

// ============== SIDEBAR ==============
const PAGE_LABELS = {
  vagas: 'Controle de Vagas',
  executivo: 'Dashboard Executivo',
};
const Sidebar = ({ active, onSelect }) => {
  const items = [
    { id: "vagas", icon: "briefcase", label: "Controle de Vagas" },
    { id: "executivo", icon: "dashboard", label: "Dashboard Executivo" },
  ];
  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <img src="assets/bgp-logo-white.png" alt="BGP" className="sb-logo-img" />
      </div>
      <div className="sb-section">Gestão de Pessoas</div>
      {items.map(it => (
        <button key={it.id} className={`sb-item ${active === it.id ? "active" : ""}`} onClick={() => onSelect(it.id)}>
          <Icon name={it.icon} style={{ width: 18, height: 18 }} />
          <span className="label">{it.label}</span>
        </button>
      ))}
      <div className="sb-spacer" />
      <div className="sb-user">
        <div className="avatar">GS</div>
        <div className="who">
          <b>GSIA Facilities</b>
          <span>Controle de Vagas · BGP GO</span>
        </div>
      </div>
    </aside>
  );
};

// ============== HEADER ==============
const Header = ({ page }) => {
  const dataAtual = useMemo(() => {
    // Tenta pegar do comentário do data.js via fetch síncrono do cache
    // Fallback: exibe a data do window.BIT_UPDATED se existir
    if (window.BIT_UPDATED) {
      const d = new Date(window.BIT_UPDATED);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    return null;
  }, []);

  return (
    <header className="header">
      <div className="breadcrumb">
        <span>GSIA Facilities</span>
        <Icon name="chevronRight" style={{ width: 12, height: 12 }} />
        <span>BI RH</span>
        <Icon name="chevronRight" style={{ width: 12, height: 12 }} />
        <b>{PAGE_LABELS[page] || 'Controle de Vagas'}</b>
      </div>
      {dataAtual && (
        <div style={{ fontSize: 12, color: 'var(--mute)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="clock" style={{ width: 14, height: 14 }} />
          <span>Atualizado em: <b style={{ color: 'var(--text-2)' }}>{dataAtual}</b></span>
        </div>
      )}
    </header>
  );
};

// ============== KPI TILE ==============
const KpiTile = ({ label, value, unit, tone, subtitle }) => (
  <div className={`kpi-tile ${tone || ""}`}>
    <div className="kpi-label">{label}</div>
    <div className="kpi-value">
      {value}
      {unit && <span className="kpi-unit">{unit}</span>}
    </div>
    {subtitle && <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 4 }}>{subtitle}</div>}
  </div>
);

// ============== DRILLDOWN BADGE ==============
const DrilldownBadge = ({ drilldown, onClear }) => {
  if (!drilldown) return null;
  const typeLabels = { responsavel: 'Responsável', cargo: 'Cargo', cliente: 'Cliente', motivo: 'Motivo', empresa: 'Empresa' };
  return (
    <div className="drilldown-badge">
      <span>Filtrando por <b>{typeLabels[drilldown.type] || drilldown.type}</b>: <b>{drilldown.value}</b></span>
      <button onClick={onClear} className="drilldown-clear">× Limpar</button>
    </div>
  );
};

// ============== HORIZONTAL BAR CHART ==============
const HBarChart = ({ data, color = "cyan", maxItems = 15, onBarClick, activeName, showPct, suffix }) => {
  const items = data.slice(0, maxItems);
  const max = Math.max(...items.map(d => d.value));
  const total = items.reduce((s, d) => s + d.value, 0);
  const hasActive = activeName != null;
  return (
    <div className="hbar-chart">
      {items.map((d, i) => {
        const isActive = hasActive && d.name === activeName;
        const cls = "hbar-row" +
          (onBarClick ? " clickable" : "") +
          (isActive ? " active" : "") +
          (hasActive && !isActive ? " dimmed" : "");
        return (
          <div key={i} className={cls} onClick={onBarClick ? () => onBarClick(d.name) : undefined}>
            <div className="hbar-label" title={d.name}>{d.name}</div>
            <div className="hbar-track">
              <div className={`hbar-fill ${color}`} style={{ width: `${(d.value / max) * 100}%` }} />
            </div>
            <div className="hbar-val">
              {d.value}{suffix || ''}
              {showPct && total > 0 && <span style={{ fontSize: 10, color: 'var(--mute)', marginLeft: 4 }}>{((d.value/total)*100).toFixed(0)}%</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ============== STACKED BAR CHART ==============
const StackedHBarChart = ({ data, maxItems = 15, onBarClick, activeName }) => {
  const items = data.slice(0, maxItems);
  const max = Math.max(...items.map(d => d.total));
  const hasActive = activeName != null;
  return (
    <div className="hbar-chart">
      {items.map((d, i) => {
        const wFechado = (d.fechado / max) * 100;
        const wCancelada = (d.cancelada / max) * 100;
        const wAberto = (d.aberto / max) * 100;
        const isActive = hasActive && d.name === activeName;
        const cls = "hbar-row" +
          (onBarClick ? " clickable" : "") +
          (isActive ? " active" : "") +
          (hasActive && !isActive ? " dimmed" : "");
        return (
          <div key={i} className={cls} onClick={onBarClick ? () => onBarClick(d.name) : undefined}>
            <div className="hbar-label" title={d.name}>{d.name}</div>
            <div className="hbar-track">
              <div className="hbar-stacked">
                {d.fechado > 0 && <div style={{ width: `${wFechado}%`, background: 'var(--green)' }} title={`Fechado: ${d.fechado}`} />}
                {d.cancelada > 0 && <div style={{ width: `${wCancelada}%`, background: 'var(--amber)' }} title={`Cancelada: ${d.cancelada}`} />}
                {d.aberto > 0 && <div style={{ width: `${wAberto}%`, background: 'var(--red)' }} title={`Em Aberto: ${d.aberto}`} />}
              </div>
            </div>
            <div className="hbar-val">{d.total}</div>
          </div>
        );
      })}
      <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: 'var(--mute)' }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: 'var(--green)', marginRight: 4 }}/>Fechado</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: 'var(--amber)', marginRight: 4 }}/>Cancelada</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: 'var(--red)', marginRight: 4 }}/>Em Aberto</span>
      </div>
    </div>
  );
};

// ============== TEMPO MÉDIO POR CLIENTE ==============
const TempoClienteChart = ({ data, maxItems = 15, onBarClick, activeName }) => {
  const items = data.slice(0, maxItems);
  const max = Math.max(...items.map(d => d.value));
  const hasActive = activeName != null;
  return (
    <div className="hbar-chart">
      {items.map((d, i) => {
        const isActive = hasActive && d.name === activeName;
        const cls = "hbar-row" +
          (onBarClick ? " clickable" : "") +
          (isActive ? " active" : "") +
          (hasActive && !isActive ? " dimmed" : "");
        return (
          <div key={i} className={cls} onClick={onBarClick ? () => onBarClick(d.name) : undefined}>
            <div className="hbar-label" title={d.name}>{d.name}</div>
            <div className="hbar-track">
              <div className="hbar-fill amber" style={{ width: `${(d.value / max) * 100}%` }} />
            </div>
            <div className="hbar-val">{d.value}<span style={{ fontSize: 10, color: 'var(--mute)', marginLeft: 2 }}>dias</span></div>
          </div>
        );
      })}
    </div>
  );
};

// ============== PIE CHART ==============
const PieChart = ({ data, maxItems = 10, onSliceClick, activeName, centerLabel }) => {
  const items = data.slice(0, maxItems);
  const others = data.slice(maxItems);
  const othersTotal = others.reduce((s, d) => s + d.value, 0);
  const all = othersTotal > 0 ? [...items, { name: 'Outros', value: othersTotal }] : items;
  const total = all.reduce((s, d) => s + d.value, 0);
  const hasActive = activeName != null;

  const size = 280;
  const thickness = 38;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={thickness}/>
        {all.map((seg, i) => {
          const len = (seg.value / total) * c;
          const off = c - acc;
          acc += len;
          const isActive = hasActive && seg.name === activeName;
          const isDimmed = hasActive && !isActive;
          return (
            <circle key={i} cx={size/2} cy={size/2} r={r}
              fill="none" stroke={seg.color || COLORS[i % COLORS.length]} strokeWidth={isActive ? thickness + 6 : thickness}
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={off}
              transform={`rotate(-90 ${size/2} ${size/2})`}
              opacity={isDimmed ? 0.3 : 1}
              style={{ cursor: onSliceClick && seg.name !== 'Outros' ? 'pointer' : 'default', transition: 'all 200ms' }}
              onClick={onSliceClick && seg.name !== 'Outros' ? () => onSliceClick(seg.name) : undefined}
            />
          );
        })}
        <text x={size/2} y={size/2 - 8} textAnchor="middle" fill="var(--text)" fontSize="30" fontWeight="700">{total}</text>
        <text x={size/2} y={size/2 + 16} textAnchor="middle" fill="var(--mute)" fontSize="12" fontWeight="500">{centerLabel || 'VAGAS'}</text>
      </svg>
      <div className="pie-legend" style={{ width: '100%' }}>
        {all.map((d, i) => {
          const pct = total > 0 ? ((d.value / total) * 100).toFixed(1).replace('.', ',') : '0';
          const isActive = hasActive && d.name === activeName;
          const isDimmed = hasActive && !isActive;
          return (
            <div key={i}
              className={"pie-legend-item" + (onSliceClick && d.name !== 'Outros' ? " clickable" : "") + (isDimmed ? " dimmed" : "") + (isActive ? " active" : "")}
              onClick={onSliceClick && d.name !== 'Outros' ? () => onSliceClick(d.name) : undefined}
            >
              <div className="pie-dot" style={{ background: d.color || COLORS[i % COLORS.length] }} />
              <span className="pie-name">{d.name}</span>
              <span className="pie-val">{d.value}</span>
              <span className="pie-pct">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============== MATRIX TABLE ==============
const MatrixTable = ({ rows }) => {
  const [expanded, setExpanded] = useState({});

  const tree = useMemo(() => {
    const map = {};
    for (const r of rows) {
      if (!map[r.cliente]) map[r.cliente] = {};
      if (!map[r.cliente][r.responsavel]) map[r.cliente][r.responsavel] = [];
      map[r.cliente][r.responsavel].push(r);
    }
    return map;
  }, [rows]);

  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const flatRows = [];
  for (const cliente of Object.keys(tree).sort()) {
    const ck = `c_${cliente}`;
    const cOpen = expanded[ck] !== false;
    const responsaveis = tree[cliente];
    let cF = 0, cC = 0, cA = 0; const cD = [];
    for (const resp of Object.keys(responsaveis)) {
      for (const r of responsaveis[resp]) { cF += r.fechado; cC += r.cancelada; cA += r.aberto; cD.push(...r.dataFechamento); }
    }
    flatRows.push({ type: 'cliente', key: ck, label: cliente, fechado: cF, cancelada: cC, aberto: cA, dataFechamento: cD.sort().slice(-1)[0] || '-', isOpen: cOpen });
    if (cOpen) {
      for (const resp of Object.keys(responsaveis).sort()) {
        const rk = `r_${cliente}_${resp}`;
        const rOpen = expanded[rk] !== false;
        let rF = 0, rC = 0, rA = 0; const rD = [];
        for (const r of responsaveis[resp]) { rF += r.fechado; rC += r.cancelada; rA += r.aberto; rD.push(...r.dataFechamento); }
        flatRows.push({ type: 'responsavel', key: rk, label: resp, fechado: rF, cancelada: rC, aberto: rA, dataFechamento: rD.sort().slice(-1)[0] || '-', isOpen: rOpen });
        if (rOpen) {
          for (const r of responsaveis[resp]) {
            flatRows.push({ type: 'cargo', key: `cargo_${cliente}_${resp}_${r.cargo}`, label: r.cargo, fechado: r.fechado, cancelada: r.cancelada, aberto: r.aberto, dataFechamento: r.dataFechamento.sort().slice(-1)[0] || '-' });
          }
        }
      }
    }
  }

  const fmtDate = (d) => { if (!d || d === '-') return '-'; const p = d.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d; };
  const renderStatus = (f, c, a) => (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {f > 0 && <span className="badge-status fechado">{f} Fechado</span>}
      {c > 0 && <span className="badge-status cancelada">{c} Cancelada</span>}
      {a > 0 && <span className="badge-status aberto">{a} Aberto</span>}
    </div>
  );

  return (
    <div className="t-scroll">
      <table className="t">
        <thead><tr><th style={{ width: '35%' }}>Cliente / Responsável / Cargo</th><th>Últ. Fechamento</th><th>Status</th><th className="num">Total</th></tr></thead>
        <tbody>
          {flatRows.map(row => (
            <tr key={row.key} className={`row-${row.type}`}>
              <td className={row.type === 'responsavel' ? 'indent-1' : row.type === 'cargo' ? 'indent-2' : ''}>
                {(row.type === 'cliente' || row.type === 'responsavel') && (
                  <button className={`expand-btn ${row.isOpen ? 'open' : ''}`} onClick={() => toggle(row.key)}>▶</button>
                )}
                {row.label}
              </td>
              <td>{fmtDate(row.dataFechamento)}</td>
              <td>{renderStatus(row.fechado, row.cancelada, row.aberto)}</td>
              <td className="num">{row.fechado + row.cancelada + row.aberto}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ============== DATE FILTER ==============
const DateFilter = ({ mes, setMes, ano, setAno, availableYears }) => {
  const MESES = [
    { v: 0, label: 'Todos os meses' },
    { v: 1, label: 'Janeiro' }, { v: 2, label: 'Fevereiro' }, { v: 3, label: 'Março' },
    { v: 4, label: 'Abril' }, { v: 5, label: 'Maio' }, { v: 6, label: 'Junho' },
    { v: 7, label: 'Julho' }, { v: 8, label: 'Agosto' }, { v: 9, label: 'Setembro' },
    { v: 10, label: 'Outubro' }, { v: 11, label: 'Novembro' }, { v: 12, label: 'Dezembro' },
  ];
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <select className="filter-select" value={ano} onChange={e => setAno(Number(e.target.value))}>
        <option value={0}>Todos os anos</option>
        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <select className="filter-select" value={mes} onChange={e => setMes(Number(e.target.value))}>
        {MESES.map(m => <option key={m.v} value={m.v}>{m.label}</option>)}
      </select>
    </div>
  );
};

// ============== SHARED: useFilteredVagas ==============
const useFilteredVagas = (opts = {}) => {
  const D = window.BIT;
  const [statusFilter, setStatusFilter] = useState('todos');
  const [mes, setMes] = useState(0);
  const [ano, setAno] = useState(0);
  const [drilldown, setDrilldown] = useState(null);
  const [clienteFilter, setClienteFilter] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFinal, setDataFinal] = useState('');

  const toggleDrill = (type, value) => {
    setDrilldown(prev => (prev && prev.type === type && prev.value === value) ? null : { type, value });
  };

  const availableYears = useMemo(() => {
    const years = new Set();
    for (const v of D.vagas) { if (v.dataAbertura) years.add(Number(v.dataAbertura.slice(0, 4))); }
    return [...years].sort();
  }, [D.vagas]);

  const availableClientes = useMemo(() => {
    const set = new Set();
    for (const v of D.vagas) { if (v.cliente) set.add(v.cliente); }
    return [...set].sort();
  }, [D.vagas]);

  const filteredVagas = useMemo(() => {
    let result = D.vagas;
    if (clienteFilter) result = result.filter(v => v.cliente === clienteFilter);
    if (dataInicio) result = result.filter(v => v.dataAbertura && v.dataAbertura >= dataInicio);
    if (dataFinal) result = result.filter(v => v.dataAbertura && v.dataAbertura <= dataFinal);
    if (ano > 0) result = result.filter(v => v.dataAbertura && Number(v.dataAbertura.slice(0, 4)) === ano);
    if (mes > 0) result = result.filter(v => v.dataAbertura && Number(v.dataAbertura.slice(5, 7)) === mes);
    if (statusFilter !== 'todos') {
      const map = { fechado: 'FECHADO', aberto: 'EM ABERTO', cancelada: 'CANCELADA' };
      result = result.filter(v => v.status === map[statusFilter]);
    }
    if (drilldown) {
      if (drilldown.type === 'responsavel') result = result.filter(v => v.responsavel === drilldown.value);
      else if (drilldown.type === 'cliente') result = result.filter(v => v.cliente === drilldown.value);
      else if (drilldown.type === 'cargo') result = result.filter(v => v.cargo === drilldown.value);
      else if (drilldown.type === 'motivo') result = result.filter(v => v.motivo === drilldown.value);
      else if (drilldown.type === 'empresa') result = result.filter(v => v.empresa === drilldown.value);
      else if (drilldown.type === 'semaforo') result = result.filter(v => getSemaforo(v) === drilldown.value);
    }
    return result;
  }, [statusFilter, mes, ano, drilldown, clienteFilter, dataInicio, dataFinal, D.vagas]);

  return { D, filteredVagas, statusFilter, setStatusFilter, mes, setMes, ano, setAno, drilldown, setDrilldown, toggleDrill, availableYears, clienteFilter, setClienteFilter, dataInicio, setDataInicio, dataFinal, setDataFinal, availableClientes };
};

// ====================================================
// PAGE 1: CONTROLE DE VAGAS (existing)
// ====================================================
const PageVagas = () => {
  const { D, filteredVagas, statusFilter, setStatusFilter, mes, setMes, ano, setAno, drilldown, setDrilldown, toggleDrill, availableYears } = useFilteredVagas();

  const kpis = useMemo(() => {
    const fechadas = filteredVagas.filter(v => v.status === 'FECHADO').length;
    const abertas = filteredVagas.filter(v => v.status === 'EM ABERTO').length;
    const total = filteredVagas.length;
    const clientes = [...new Set(filteredVagas.map(v => v.cliente))].filter(Boolean).length;
    const fcd = filteredVagas.filter(v => v.status === 'FECHADO' && v.diasFechamento != null);
    const tempoMedio = fcd.length > 0 ? Math.round(fcd.reduce((s, v) => s + v.diasFechamento, 0) / fcd.length) : 0;
    return { fechadas, abertas, total, clientes, tempoMedio };
  }, [filteredVagas]);

  const responsavelData = useMemo(() => {
    const map = {}; for (const v of filteredVagas) { const r = v.responsavel || 'N/A'; map[r] = (map[r] || 0) + 1; }
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredVagas]);

  const responsavelMatrizData = useMemo(() => {
    const map = {};
    for (const v of filteredVagas) { const r = v.responsavel || 'N/A'; if (!map[r]) map[r] = { fechado: 0, cancelada: 0, aberto: 0 }; if (v.status === 'FECHADO') map[r].fechado++; else if (v.status === 'CANCELADA') map[r].cancelada++; else map[r].aberto++; }
    return Object.entries(map).map(([name, d]) => ({ name, ...d, total: d.fechado + d.cancelada + d.aberto })).sort((a, b) => b.total - a.total);
  }, [filteredVagas]);

  const cargoData = useMemo(() => {
    const map = {}; for (const v of filteredVagas) { const c = v.cargo || 'N/A'; map[c] = (map[c] || 0) + 1; }
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredVagas]);

  const tempoClienteData = useMemo(() => {
    const map = {};
    for (const v of filteredVagas) { if (v.status === 'FECHADO' && v.diasFechamento != null) { const c = v.cliente || 'N/A'; if (!map[c]) map[c] = { soma: 0, count: 0 }; map[c].soma += v.diasFechamento; map[c].count++; } }
    return Object.entries(map).map(([name, { soma, count }]) => ({ name, value: Math.round(soma / count) })).sort((a, b) => b.value - a.value);
  }, [filteredVagas]);

  const matrizRows = useMemo(() => {
    const cm = {};
    for (const v of filteredVagas) { const c = v.cliente || 'N/A'; const r = v.responsavel || 'N/A'; const cargo = v.cargo || 'N/A'; const k = `${c}|||${r}|||${cargo}`; if (!cm[k]) cm[k] = { cliente: c, responsavel: r, cargo, fechado: 0, cancelada: 0, aberto: 0, dataFechamento: [] }; if (v.status === 'FECHADO') cm[k].fechado++; else if (v.status === 'CANCELADA') cm[k].cancelada++; else cm[k].aberto++; if (v.dataFechamento) cm[k].dataFechamento.push(v.dataFechamento); }
    return Object.values(cm).sort((a, b) => a.cliente.localeCompare(b.cliente) || a.responsavel.localeCompare(b.responsavel) || a.cargo.localeCompare(b.cargo));
  }, [filteredVagas]);

  const activeResp = drilldown && drilldown.type === 'responsavel' ? drilldown.value : null;
  const activeCliente = drilldown && drilldown.type === 'cliente' ? drilldown.value : null;
  const activeCargo = drilldown && drilldown.type === 'cargo' ? drilldown.value : null;

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Controle de Vagas</h1>
          <div className="subtitle">Gestão completa de abertura e fechamento de vagas · <b>{D.vagas.length} vagas cadastradas</b></div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <DateFilter mes={mes} setMes={setMes} ano={ano} setAno={setAno} availableYears={availableYears} />
          <div className="filter-pills">
            {[{ id: 'todos', label: 'Todos' }, { id: 'fechado', label: 'Fechados' }, { id: 'aberto', label: 'Em Aberto' }, { id: 'cancelada', label: 'Canceladas' }].map(f => (
              <button key={f.id} className={`filter-pill ${statusFilter === f.id ? 'active' : ''}`} onClick={() => setStatusFilter(f.id)}>{f.label}</button>
            ))}
          </div>
        </div>
      </div>
      <DrilldownBadge drilldown={drilldown} onClear={() => setDrilldown(null)} />
      <div className="kpi-row">
        <KpiTile label="Vagas Fechadas" value={kpis.fechadas} tone="green" />
        <KpiTile label="Vagas em Aberto" value={kpis.abertas} tone="red" />
        <KpiTile label="Total de Vagas" value={kpis.total} tone="cyan" />
        <KpiTile label="Total de Clientes" value={kpis.clientes} tone="violet" />
        <KpiTile label="Tempo Médio de Fechamento" value={kpis.tempoMedio} unit="dias" tone="amber" />
      </div>
      <div className="grid-2">
        <div className="card"><div className="card-title">Vagas por Responsável de Abertura</div><HBarChart data={responsavelData} color="cyan" onBarClick={n => toggleDrill('responsavel', n)} activeName={activeResp} /></div>
        <div className="card"><div className="card-title">Responsável por Status (Matriz)</div><StackedHBarChart data={responsavelMatrizData} onBarClick={n => toggleDrill('responsavel', n)} activeName={activeResp} /></div>
      </div>
      <div className="grid-2">
        <div className="card"><div className="card-title">Tempo Médio de Fechamento por Cliente (dias)</div><TempoClienteChart data={tempoClienteData} onBarClick={n => toggleDrill('cliente', n)} activeName={activeCliente} /></div>
        <div className="card"><div className="card-title">Vagas por Função (Cargo)</div><PieChart data={cargoData} onSliceClick={n => toggleDrill('cargo', n)} activeName={activeCargo} /></div>
      </div>
      <div className="card"><div className="card-title">Matriz de Vagas por Cliente</div><MatrixTable rows={matrizRows} /></div>
    </div>
  );
};

// ====================================================
// PAGE 2: DASHBOARD EXECUTIVO
// ====================================================
const PageExecutivo = () => {
  const { D, filteredVagas, statusFilter, setStatusFilter, mes, setMes, ano, setAno, drilldown, setDrilldown, toggleDrill, availableYears, clienteFilter, setClienteFilter, dataInicio, setDataInicio, dataFinal, setDataFinal, availableClientes } = useFilteredVagas();

  // === 1. KPIs Executivos ===
  const kpis = useMemo(() => {
    const total = filteredVagas.length;
    const fechadas = filteredVagas.filter(v => v.status === 'FECHADO').length;
    const abertas = filteredVagas.filter(v => v.status === 'EM ABERTO').length;
    const canceladas = filteredVagas.filter(v => v.status === 'CANCELADA').length;
    const taxaConversao = total > 0 ? ((fechadas / total) * 100).toFixed(1) : '0';
    const fcd = filteredVagas.filter(v => v.status === 'FECHADO' && v.diasFechamento != null);
    const tempoMedio = fcd.length > 0 ? Math.round(fcd.reduce((s, v) => s + v.diasFechamento, 0) / fcd.length) : 0;
    return { total, fechadas, abertas, canceladas, taxaConversao, tempoMedio };
  }, [filteredVagas]);

  // === 2. SLA por Cargo ===
  const slaData = useMemo(() => {
    const map = {};
    for (const v of filteredVagas) {
      if (v.status !== 'FECHADO' || v.diasFechamento == null) continue;
      const cargo = v.cargo || 'N/A';
      if (!map[cargo]) map[cargo] = { dentro: 0, atencao: 0, fora: 0, totalDias: 0, count: 0 };
      const sla = getSLA(cargo);
      map[cargo].count++;
      map[cargo].totalDias += v.diasFechamento;
      if (v.diasFechamento <= sla.ideal) map[cargo].dentro++;
      else if (v.diasFechamento <= sla.max) map[cargo].atencao++;
      else map[cargo].fora++;
    }
    return Object.entries(map).map(([cargo, d]) => ({
      cargo, ...d, media: Math.round(d.totalDias / d.count),
      sla: getSLA(cargo),
      pctDentro: d.count > 0 ? Math.round((d.dentro / d.count) * 100) : 0,
    })).sort((a, b) => b.count - a.count);
  }, [filteredVagas]);

  // === 3. Semáforo ===
  const semaforoData = useMemo(() => {
    const counts = { verde: 0, amarelo: 0, vermelho: 0, preto: 0 };
    for (const v of filteredVagas) {
      if (v.status === 'CANCELADA') continue;
      const s = getSemaforo(v);
      if (counts[s] !== undefined) counts[s]++;
    }
    return [
      { name: 'No prazo', value: counts.verde, color: SEMAFORO_COLORS.verde },
      { name: 'Atenção', value: counts.amarelo, color: SEMAFORO_COLORS.amarelo },
      { name: 'Fora do prazo', value: counts.vermelho, color: SEMAFORO_COLORS.vermelho },
      { name: 'Crítico', value: counts.preto, color: SEMAFORO_COLORS.preto },
    ];
  }, [filteredVagas]);

  // === 4. Ranking Rotatividade (clientes com mais vagas) ===
  const rotatividade = useMemo(() => {
    const map = {};
    for (const v of filteredVagas) { const c = v.cliente || 'N/A'; map[c] = (map[c] || 0) + 1; }
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredVagas]);

  // === 5. Motivos de Abertura ===
  const motivosData = useMemo(() => {
    const map = {};
    for (const v of filteredVagas) { const m = v.motivo || 'Não informado'; map[m] = (map[m] || 0) + 1; }
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredVagas]);

  // === 6. Performance por Responsável ===
  const perfResp = useMemo(() => {
    const map = {};
    for (const v of filteredVagas) {
      const r = v.responsavel || 'N/A';
      if (!map[r]) map[r] = { abertas: 0, fechadas: 0, canceladas: 0, diasTotal: 0, diasCount: 0 };
      map[r].abertas++;
      if (v.status === 'FECHADO') { map[r].fechadas++; if (v.diasFechamento != null) { map[r].diasTotal += v.diasFechamento; map[r].diasCount++; } }
      if (v.status === 'CANCELADA') map[r].canceladas++;
    }
    return Object.entries(map).map(([name, d]) => ({
      name, abertas: d.abertas, fechadas: d.fechadas, canceladas: d.canceladas,
      tempoMedio: d.diasCount > 0 ? Math.round(d.diasTotal / d.diasCount) : '-',
      taxaSucesso: d.abertas > 0 ? Math.round((d.fechadas / d.abertas) * 100) : 0,
    })).sort((a, b) => b.abertas - a.abertas);
  }, [filteredVagas]);

  // === 7. Canceladas detalhamento ===
  const canceladasData = useMemo(() => {
    const canceladas = filteredVagas.filter(v => v.status === 'CANCELADA');
    const porCliente = {}; const porResp = {}; const porMotivo = {};
    for (const v of canceladas) {
      const c = v.cliente || 'N/A'; porCliente[c] = (porCliente[c] || 0) + 1;
      const r = v.responsavel || 'N/A'; porResp[r] = (porResp[r] || 0) + 1;
      const m = v.motivo || 'N/A'; porMotivo[m] = (porMotivo[m] || 0) + 1;
    }
    return {
      total: canceladas.length,
      porCliente: Object.entries(porCliente).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      porResp: Object.entries(porResp).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      porMotivo: Object.entries(porMotivo).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    };
  }, [filteredVagas]);

  // === 8. Turnover por Empresa ===
  const turnoverData = useMemo(() => {
    const map = {};
    const motivosTurnover = ['Pedido de Demissão', 'Falta de Efetivo', 'Término de Experiência', 'Término de Contrato'];
    for (const v of filteredVagas) {
      const emp = v.empresa || 'N/A';
      if (!map[emp]) map[emp] = { total: 0, turnover: 0, motivos: {} };
      map[emp].total++;
      const isTurnover = motivosTurnover.some(m => (v.motivo || '').toUpperCase().includes(m.toUpperCase()));
      if (isTurnover) {
        map[emp].turnover++;
        const mot = v.motivo || 'N/A';
        map[emp].motivos[mot] = (map[emp].motivos[mot] || 0) + 1;
      }
    }
    return Object.entries(map).map(([empresa, d]) => ({
      empresa, total: d.total, turnover: d.turnover,
      taxa: d.total > 0 ? Math.round((d.turnover / d.total) * 100) : 0,
      motivos: Object.entries(d.motivos).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    })).sort((a, b) => b.turnover - a.turnover);
  }, [filteredVagas]);

  // === 9. Postos Descobertos ===
  const postosDescobertos = useMemo(() => {
    const items = [];
    for (const v of filteredVagas) {
      const dias = getDiasDescoberto(v);
      if (dias > 0) {
        items.push({ cliente: v.cliente, cargo: v.cargo, responsavel: v.responsavel, status: v.status, diasDescoberto: dias, dataAbertura: v.dataAbertura });
      }
    }
    return items.sort((a, b) => b.diasDescoberto - a.diasDescoberto);
  }, [filteredVagas]);
  const totalDiasDescobertos = postosDescobertos.reduce((s, p) => s + p.diasDescoberto, 0);

  // === 10. Qualidade dos Dados ===
  const qualidadeData = useMemo(() => {
    const campos = ['cliente', 'cargo', 'escala', 'motivo', 'responsavel', 'prazoFechamento', 'perfil'];
    const labels = ['Cliente', 'Cargo', 'Escala', 'Motivo', 'Responsável', 'Prazo Fechamento', 'Perfil'];
    return campos.map((c, i) => {
      const preenchidos = filteredVagas.filter(v => v[c] && v[c].toString().trim()).length;
      return { campo: labels[i], preenchidos, total: filteredVagas.length, pct: filteredVagas.length > 0 ? Math.round((preenchidos / filteredVagas.length) * 100) : 0 };
    });
  }, [filteredVagas]);

  const fmtDate = (d) => { if (!d || d === '-') return '-'; const p = d.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d; };

  const activeResp = drilldown && drilldown.type === 'responsavel' ? drilldown.value : null;
  const activeCliente = drilldown && drilldown.type === 'cliente' ? drilldown.value : null;
  const activeMotivo = drilldown && drilldown.type === 'motivo' ? drilldown.value : null;
  const activeEmpresa = drilldown && drilldown.type === 'empresa' ? drilldown.value : null;

  return (
    <div className="page" style={{ position: 'relative' }}>


      <div className="page-title">
        <div>
          <h1>Dashboard Executivo</h1>
          <div className="subtitle">Visão estratégica do processo de recrutamento · <b>Processo + Controle = Resultado</b></div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <DateFilter mes={mes} setMes={setMes} ano={ano} setAno={setAno} availableYears={availableYears} />
        </div>
      </div>

      {/* Filtro por Cliente + Período */}
      <div className="cliente-period-filter">
        <div className="cpf-group">
          <label className="cpf-label">Cliente</label>
          <select className="filter-select" value={clienteFilter} onChange={e => setClienteFilter(e.target.value)} style={{ minWidth: 220 }}>
            <option value="">Todos os clientes</option>
            {availableClientes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="cpf-group">
          <label className="cpf-label">Data Início</label>
          <input type="date" className="filter-date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
        </div>
        <div className="cpf-group">
          <label className="cpf-label">Data Final</label>
          <input type="date" className="filter-date" value={dataFinal} onChange={e => setDataFinal(e.target.value)} />
        </div>
        {(clienteFilter || dataInicio || dataFinal) && (
          <button className="cpf-clear" onClick={() => { setClienteFilter(''); setDataInicio(''); setDataFinal(''); }}>
            <Icon name="xCircle" style={{ width: 14, height: 14 }} /> Limpar filtros
          </button>
        )}
      </div>

      <DrilldownBadge drilldown={drilldown} onClear={() => setDrilldown(null)} />

      {/* 1. KPIs Executivos */}
      <div className="kpi-row">
        <KpiTile label="Total de Vagas" value={kpis.total} tone="cyan" />
        <KpiTile label="Fechadas" value={kpis.fechadas} tone="green" />
        <KpiTile label="Em Aberto" value={kpis.abertas} tone="red" />
        <KpiTile label="Canceladas" value={kpis.canceladas} tone="amber" />
        <KpiTile label="Taxa de Conversão" value={kpis.taxaConversao} unit="%" tone="green" subtitle="fechadas / total" />
        <KpiTile label="Tempo Médio Geral" value={kpis.tempoMedio} unit="dias" tone="violet" />
      </div>

      {/* 2+3. SLA + Semáforo */}
      <div className="grid-2">
        <div className="card">
          <div className="card-title">SLA de Fechamento por Cargo</div>
          <div className="t-scroll" style={{ maxHeight: 360 }}>
            <table className="t">
              <thead><tr><th>Cargo</th><th className="num">Qtd</th><th className="num">Média</th><th className="num">Ideal</th><th className="num">Máx</th><th className="num">% No Prazo</th><th>Status</th></tr></thead>
              <tbody>
                {slaData.map((r, i) => (
                  <tr key={i}>
                    <td>{r.cargo}</td>
                    <td className="num">{r.count}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{r.media}d</td>
                    <td className="num" style={{ color: 'var(--green)' }}>{r.sla.ideal}d</td>
                    <td className="num" style={{ color: 'var(--red)' }}>{r.sla.max}d</td>
                    <td className="num">
                      <span style={{ color: r.pctDentro >= 80 ? 'var(--green)' : r.pctDentro >= 50 ? 'var(--amber)' : 'var(--red)', fontWeight: 700 }}>{r.pctDentro}%</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 3 }}>
                        <span className="semaforo-dot" style={{ background: SEMAFORO_COLORS.verde }} title={`Dentro: ${r.dentro}`}>{r.dentro}</span>
                        <span className="semaforo-dot" style={{ background: SEMAFORO_COLORS.amarelo }} title={`Atenção: ${r.atencao}`}>{r.atencao}</span>
                        <span className="semaforo-dot" style={{ background: SEMAFORO_COLORS.vermelho }} title={`Fora: ${r.fora}`}>{r.fora}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Semáforo Geral de Vagas</div>
          <PieChart data={semaforoData} centerLabel="STATUS" />
        </div>
      </div>

      {/* 4+5. Rotatividade + Motivos */}
      <div className="grid-2">
        <div className="card">
          <div className="card-title">Ranking de Clientes — Maior Rotatividade</div>
          <HBarChart data={rotatividade} color="red" maxItems={12} onBarClick={n => toggleDrill('cliente', n)} activeName={activeCliente} showPct />
        </div>
        <div className="card">
          <div className="card-title">Motivos de Abertura das Vagas</div>
          <HBarChart data={motivosData} color="violet" onBarClick={n => toggleDrill('motivo', n)} activeName={activeMotivo} showPct />
        </div>
      </div>

      {/* 6. Performance por Responsável */}
      <div className="card">
        <div className="card-title">Performance por Responsável</div>
        <div className="t-scroll" style={{ maxHeight: 360 }}>
          <table className="t">
            <thead><tr><th>Responsável</th><th className="num">Abertas</th><th className="num">Fechadas</th><th className="num">Canceladas</th><th className="num">Tempo Médio</th><th className="num">Taxa Sucesso</th></tr></thead>
            <tbody>
              {perfResp.map((r, i) => (
                <tr key={i} className={activeResp === r.name ? 'active-row' : ''} style={{ cursor: 'pointer' }} onClick={() => toggleDrill('responsavel', r.name)}>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td className="num">{r.abertas}</td>
                  <td className="num" style={{ color: 'var(--green)' }}>{r.fechadas}</td>
                  <td className="num" style={{ color: 'var(--amber)' }}>{r.canceladas}</td>
                  <td className="num">{r.tempoMedio !== '-' ? r.tempoMedio + 'd' : '-'}</td>
                  <td className="num">
                    <span style={{ color: r.taxaSucesso >= 70 ? 'var(--green)' : r.taxaSucesso >= 40 ? 'var(--amber)' : 'var(--red)', fontWeight: 700 }}>{r.taxaSucesso}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. Canceladas + 8. Turnover */}
      <div className="grid-2">
        <div className="card">
          <div className="card-title">Vagas Canceladas — Detalhamento</div>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--amber)' }}>{canceladasData.total}</span>
            <span style={{ fontSize: 13, color: 'var(--mute)', marginLeft: 8 }}>vagas canceladas no período</span>
          </div>
          {canceladasData.total > 0 ? (
            <>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontWeight: 600 }}>Por Cliente</div>
                <HBarChart data={canceladasData.porCliente} color="amber" maxItems={8} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontWeight: 600 }}>Por Motivo</div>
                <HBarChart data={canceladasData.porMotivo} color="amber" maxItems={6} />
              </div>
            </>
          ) : <div style={{ color: 'var(--mute)', padding: 20, textAlign: 'center' }}>Nenhuma vaga cancelada no período</div>}
        </div>
        <div className="card">
          <div className="card-title">Índice de Turnover por Empresa</div>
          {turnoverData.map((emp, i) => (
            <div key={i} className={"turnover-card" + (activeEmpresa === emp.empresa ? " active-card" : "")} onClick={() => toggleDrill('empresa', emp.empresa)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{emp.empresa}</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: emp.taxa > 50 ? 'var(--red)' : emp.taxa > 30 ? 'var(--amber)' : 'var(--green)' }}>{emp.taxa}%</span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--mute)', marginBottom: 6 }}>
                <span>Total: <b style={{ color: 'var(--text)' }}>{emp.total}</b></span>
                <span>Turnover: <b style={{ color: 'var(--amber)' }}>{emp.turnover}</b></span>
              </div>
              <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${emp.taxa}%`, background: emp.taxa > 50 ? 'var(--red)' : emp.taxa > 30 ? 'var(--amber)' : 'var(--green)', borderRadius: 3, transition: 'width 300ms' }} />
              </div>
              {emp.motivos.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {emp.motivos.slice(0, 4).map((m, j) => (
                    <span key={j} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'var(--surface-2)', color: 'var(--text-2)' }}>{m.name}: {m.value}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 9. Postos Descobertos */}
      <div className="card">
        <div className="card-title">Postos Descobertos — Impacto Operacional</div>
        <div style={{ display: 'flex', gap: 24, marginBottom: 16, flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: 32, fontWeight: 700, color: 'var(--red)' }}>{postosDescobertos.length}</span>
            <span style={{ fontSize: 13, color: 'var(--mute)', marginLeft: 8 }}>vagas com posto descoberto</span>
          </div>
          <div>
            <span style={{ fontSize: 32, fontWeight: 700, color: 'var(--amber)' }}>{totalDiasDescobertos}</span>
            <span style={{ fontSize: 13, color: 'var(--mute)', marginLeft: 8 }}>dias totais sem cobertura</span>
          </div>
        </div>
        {postosDescobertos.length > 0 ? (
          <div className="t-scroll" style={{ maxHeight: 300 }}>
            <table className="t">
              <thead><tr><th>Cliente</th><th>Cargo</th><th>Responsável</th><th>Abertura</th><th>Status</th><th className="num">Dias Descoberto</th></tr></thead>
              <tbody>
                {postosDescobertos.slice(0, 30).map((p, i) => (
                  <tr key={i}>
                    <td>{p.cliente}</td>
                    <td>{p.cargo}</td>
                    <td>{p.responsavel}</td>
                    <td>{fmtDate(p.dataAbertura)}</td>
                    <td><span className={`badge-status ${p.status === 'FECHADO' ? 'fechado' : 'aberto'}`}>{p.status === 'FECHADO' ? 'Fechado' : 'Em Aberto'}</span></td>
                    <td className="num" style={{ color: p.diasDescoberto > 10 ? 'var(--red)' : 'var(--amber)', fontWeight: 700 }}>{p.diasDescoberto}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div style={{ color: 'var(--green)', padding: 20, textAlign: 'center', fontWeight: 600 }}>Nenhum posto descoberto no período</div>}
      </div>

      {/* 10. Qualidade dos Dados */}
      <div className="card">
        <div className="card-title">Padronização de Dados — Preenchimento Obrigatório</div>
        <div className="quality-grid">
          {qualidadeData.map((q, i) => (
            <div key={i} className="quality-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{q.campo}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: q.pct === 100 ? 'var(--green)' : q.pct >= 80 ? 'var(--amber)' : 'var(--red)' }}>{q.pct}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${q.pct}%`, background: q.pct === 100 ? 'var(--green)' : q.pct >= 80 ? 'var(--amber)' : 'var(--red)', borderRadius: 3, transition: 'width 300ms' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 4 }}>{q.preenchidos}/{q.total} preenchidos</div>
            </div>
          ))}
        </div>
      </div>


    </div>
  );
};

// ============== NOVAS VAGAS POPUP ==============
const NovasVagasPopup = () => {
  const novas = window.BIT.novasVagas || [];
  const [visible, setVisible] = useState(novas.length > 0);

  if (!visible || novas.length === 0) return null;

  const fmtDate = (d) => {
    if (!d) return '-';
    const p = d.split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
  };

  return (
    <div className="popup-overlay" onClick={() => setVisible(false)}>
      <div className="popup-card" onClick={e => e.stopPropagation()}>
        <div className="popup-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="popup-icon-pulse">
              <Icon name="alert" style={{ width: 22, height: 22, color: '#fff' }} />
            </div>
            <div>
              <div className="popup-title">{novas.length} nova{novas.length > 1 ? 's' : ''} vaga{novas.length > 1 ? 's' : ''} aberta{novas.length > 1 ? 's' : ''}</div>
              <div className="popup-subtitle">Detectada{novas.length > 1 ? 's' : ''} na última atualização</div>
            </div>
          </div>
          <button className="popup-close" onClick={() => setVisible(false)}>×</button>
        </div>
        <div className="popup-body">
          {novas.map((v, i) => (
            <div key={i} className="popup-vaga-item">
              <div className="popup-vaga-row">
                <span className="popup-vaga-cliente">{v.cliente}</span>
                <span className={`badge-status ${v.status === 'FECHADO' ? 'fechado' : v.status === 'CANCELADA' ? 'cancelada' : 'aberto'}`}>
                  {v.status === 'EM ABERTO' ? 'Em Aberto' : v.status === 'FECHADO' ? 'Fechado' : 'Cancelada'}
                </span>
              </div>
              <div className="popup-vaga-details">
                <span>{v.cargo}</span>
                <span style={{ color: 'var(--mute)' }}>·</span>
                <span>{v.responsavel}</span>
                {v.qtdVagas > 1 && <><span style={{ color: 'var(--mute)' }}>·</span><span>{v.qtdVagas} vagas</span></>}
              </div>
              <div className="popup-vaga-meta">
                <span>Abertura: {fmtDate(v.dataAbertura)}</span>
                {v.motivo && <><span style={{ color: 'var(--mute)' }}>·</span><span>{v.motivo}</span></>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============== APP ==============
const App = () => {
  const [page, setPage] = useState("vagas");
  return (
    <div className="app">
      <Sidebar active={page} onSelect={setPage} />
      <div className="main">
        <Header page={page} />
        {page === "vagas" && <PageVagas />}
        {page === "executivo" && <PageExecutivo />}
      </div>
      <NovasVagasPopup />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
