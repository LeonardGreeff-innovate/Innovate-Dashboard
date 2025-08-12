// Premium dashboard script
const BRAND = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim();
const CSV_URL = window.DATA_URL;

// Utility: parse CSV (simple)
function parseCSV(text) {
  const rows = text.trim().split(/\r?\n/).map(r => r.split(','));
  return { headers: rows[0], rows: rows.slice(1) };
}

// Utility: get column by name as numbers (or strings)
function col(data, name, asNumber = true) {
  const idx = data.headers.indexOf(name);
  const arr = data.rows.map(r => r[idx] ?? '');
  return asNumber ? arr.map(v => (v === '' ? 0 : Number(v))) : arr;
}

// Utility: month labels
function monthsFromData(data) {
  return col(data, 'Month', false);
}

// Filter data by month range
function sliceByMonths(data, startLabel, endLabel) {
  const months = monthsFromData(data);
  const start = months.indexOf(startLabel);
  const end = months.indexOf(endLabel);
  const s = start >= 0 ? start : 0;
  const e = end >= 0 ? end : months.length - 1;
  const rows = data.rows.slice(s, e + 1);
  return { headers: data.headers, rows };
}

// Gauge plugin to draw center text
const centerText = {
  id: 'centerText',
  afterDraw(chart, args, options) {
    const {ctx, chartArea: {width, height}} = chart;
    ctx.save();
    ctx.font = '700 28px Arial';
    ctx.fillStyle = BRAND;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(options.text || '', chart.getDatasetMeta(0).data[0].x, chart.getDatasetMeta(0).data[0].y);
    ctx.restore();
  }
};

let charts = [];

function destroyCharts() {
  charts.forEach(c => c.destroy());
  charts = [];
}

function makeKPI(container, label, value, sparkData) {
  const col = document.createElement('div');
  col.className = 'col-6 col-md-4 col-lg-2';
  col.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-value">${value.toLocaleString()}</div>
      <div class="kpi-label">${label}</div>
      <canvas class="kpi-spark"></canvas>
    </div>`;
  container.appendChild(col);
  const ctx = col.querySelector('canvas').getContext('2d');
  charts.push(new Chart(ctx, {
    type: 'line',
    data: { labels: sparkData.map((_,i)=>i+1), datasets: [{ data: sparkData, borderColor: BRAND, fill: false, tension: 0.3, pointRadius: 0 }]},
    options: { responsive: true, plugins: { legend: { display:false } }, scales: { x: { display:false }, y: { display:false } } }
  }));
}

function renderAll(data) {
  destroyCharts();

  // Months and selectors
  const months = monthsFromData(data);
  const startSel = document.getElementById('startMonth');
  const endSel = document.getElementById('endMonth');
  [startSel, endSel].forEach(sel => { sel.innerHTML = months.map(m=>`<option>${m}</option>`).join(''); });
  endSel.value = months[months.length-1];

  // Build datasets
  const firstAid = col(data, 'First Aid Injury');
  const mti = col(data, 'Medical Treatment Injury');
  const rwi = col(data, 'Restricted work Injury');
  const lti = col(data, 'Lost Time Injury');
  const propertyDamage = col(data, 'Property Damage Incident');
  const environmental = col(data, 'Environmental Incidents');
  const clientObs = col(data, 'Client HSE observation');
  const internalObs = col(data, 'Internal HSE observation');
  const totalManhours = col(data, 'Total Man Hours worked');
  const safeManhours = col(data, 'Safe Man Hours Worked Without LTI');
  const avgManpower = col(data, 'Average Manpower');
  const induction = col(data, 'Induction Training');
  const audits = col(data, 'HSE Audits conducted');
  const lastIncidentDates = col(data, 'Last Incident Date', false);

  // KPI cards
  const cards = document.getElementById('kpiCards');
  cards.innerHTML = '';
  const totalIncidents = mti.map((v,i)=>v + lti[i] + firstAid[i] + rwi[i]).reduce((a,b)=>a+b,0);
  makeKPI(cards, 'Total Incidents (YTD)', totalIncidents, mti.map((v,i)=>v + lti[i] + firstAid[i] + rwi[i]));
  makeKPI(cards, 'Property Damage (YTD)', propertyDamage.reduce((a,b)=>a+b,0), propertyDamage);
  makeKPI(cards, 'Environmental (YTD)', environmental.reduce((a,b)=>a+b,0), environmental);
  makeKPI(cards, 'Total Manhours (YTD)', totalManhours.reduce((a,b)=>a+b,0), totalManhours);
  makeKPI(cards, 'Safe Manhours (YTD)', safeManhours.reduce((a,b)=>a+b,0), safeManhours);
  makeKPI(cards, 'Avg Manpower (Mean)', Math.round(avgManpower.reduce((a,b)=>a+b,0)/Math.max(1,avgManpower.length)), avgManpower);

  // Gauge: Days since last incident
  const parsedDates = lastIncidentDates.map(d => d ? new Date(d) : null).filter(Boolean);
  let days = 0;
  if (parsedDates.length) {
    const last = parsedDates.sort((a,b)=>b-a)[0];
    const diffMs = Date.now() - last.getTime();
    days = Math.max(0, Math.floor(diffMs / (1000*60*60*24)));
  }
  const gaugeCtx = document.getElementById('daysGauge').getContext('2d');
  const maxGauge = 120; // scale for display
  const clamped = Math.min(days, maxGauge);
  const gaugeData = [clamped, maxGauge - clamped];
  charts.push(new Chart(gaugeCtx, {
    type: 'doughnut',
    plugins: [centerText],
    data: { datasets: [{ data: gaugeData, backgroundColor: [BRAND, '#e9ecef'], borderWidth: 0 }] },
    options: {
      cutout: '75%',
      rotation: -90,
      circumference: 180,
      plugins: { legend: { display: false }, centerText: { text: String(days) } }
    }
  }));

  // Incidents monthly sparkline
  const sparkCtx = document.getElementById('incidentsSparkline').getContext('2d');
  const monthlyTotals = mti.map((v,i)=>v + lti[i] + firstAid[i] + rwi[i]);
  charts.push(new Chart(sparkCtx, {
    type: 'line',
    data: { labels: months, datasets: [{ label: 'Incidents', data: monthlyTotals, borderColor: BRAND, fill:false, tension: 0.3 }]},
    options: { plugins: { legend: { display:false } }, scales: { y: { beginAtZero: true } } }
  }));

  // Incidents by Severity (stacked)
  const sevCtx = document.getElementById('incidentsSeverity').getContext('2d');
  charts.push(new Chart(sevCtx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        { label: 'First Aid', data: firstAid, backgroundColor: '#5bc0de' },
        { label: 'MTI', data: mti, backgroundColor: '#ffc107' },
        { label: 'Restricted', data: rwi, backgroundColor: '#20c997' },
        { label: 'LTI', data: lti, backgroundColor: BRAND }
      ]
    },
    options: { responsive: true, scales: { x: { stacked:true }, y: { stacked:true, beginAtZero:true } } }
  }));

  // Incident Types (horizontal)
  const typeCtx = document.getElementById('incidentTypes').getContext('2d');
  const types = ['Property Damage Incident', 'Environmental Incidents'];
  const typeValues = [propertyDamage.reduce((a,b)=>a+b,0), environmental.reduce((a,b)=>a+b,0)];
  charts.push(new Chart(typeCtx, {
    type: 'bar',
    data: { labels: types, datasets: [{ data: typeValues, backgroundColor: [BRAND, '#6c757d'] }] },
    options: { indexAxis: 'y', plugins: { legend: { display:false } }, scales: { x: { beginAtZero:true } } }
  }));

  // Observations
  const obsCtx = document.getElementById('observationsChart').getContext('2d');
  charts.push(new Chart(obsCtx, {
    type: 'line',
    data: { labels: months, datasets: [
      { label: 'Client HSE', data: clientObs, borderColor: BRAND, fill:false, tension:0.3 },
      { label: 'Internal HSE', data: internalObs, borderColor: '#0d6efd', fill:false, tension:0.3 }
    ]},
    options: { responsive: true }
  }));

  // Manhours & Manpower with target line
  const mhCtx = document.getElementById('manhoursChart').getContext('2d');
  charts.push(new Chart(mhCtx, {
    type: 'line',
    data: { labels: months, datasets: [
      { label: 'Total Manhours', data: totalManhours, borderColor: BRAND, fill:false, tension:0.3 },
      { label: 'Safe Manhours', data: safeManhours, borderColor: '#20c997', fill:false, tension:0.3 },
      { label: 'Avg Manpower', data: avgManpower, borderColor: '#6c757d', fill:false, tension:0.3, yAxisID: 'y1' }
    ]},
    options: { responsive:true, scales: { y: { beginAtZero:true }, y1: { position: 'right', beginAtZero:true, grid: { drawOnChartArea:false } } } }
  }));

  // Training & Audits
  const trCtx = document.getElementById('trainingChart').getContext('2d');
  charts.push(new Chart(trCtx, {
    type: 'bar',
    data: { labels: months, datasets: [
      { label: 'Induction Training', data: induction, backgroundColor: '#20c997' },
      { label: 'HSE Audits', data: audits, backgroundColor: BRAND }
    ]},
    options: { responsive:true, scales: { y: { beginAtZero:true } } }
  }));

  // Apply filter button
  document.getElementById('applyFilter').onclick = () => {
    const start = document.getElementById('startMonth').value;
    const end = document.getElementById('endMonth').value;
    const sliced = sliceByMonths(data, start, end);
    renderAll(sliced);
  };
}

async function init() {
  const csv = await fetch(CSV_URL).then(r=>r.text());
  const data = parseCSV(csv);
  renderAll(data);
}

init();
