// Mobile-first premium dashboard mapped to exact headers with totals and PNG download

const BRAND = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim();
const CSV_URL = window.DATA_URL;

// Simple CSV parse
function parseCSV(text) {
  const rows = text.trim().split(/\r?\n/).map(r => r.split(','));
  return { headers: rows[0], rows: rows.slice(1) };
}

function col(data, name, asNumber = true) {
  const i = data.headers.indexOf(name);
  const arr = data.rows.map(r => r[i] ?? '');
  return asNumber ? arr.map(v => (v === '' ? 0 : Number(v))) : arr;
}
function months(data){ return col(data, 'Month', false); }

function totals(arr){ return arr.reduce((a,b)=>a+(Number(b)||0),0); }

// Draw center text in gauge
const centerText = {
  id: 'centerText',
  afterDraw(chart, args, options) {
    const {ctx} = chart;
    const meta = chart.getDatasetMeta(0);
    if (!meta.data || !meta.data[0]) return;
    const p = meta.data[0];
    ctx.save();
    ctx.font = '700 26px Arial';
    ctx.fillStyle = BRAND;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(options.text || '', p.x, p.y);
    ctx.restore();
  }
};

let CHARTS = [];
function clearCharts(){ CHARTS.forEach(c=>c.destroy()); CHARTS=[]; }

function makeKPI(container, label, value, spark) {
  const col = document.createElement('div');
  col.className = 'col-6 col-md-4 col-lg-2';
  col.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-value">${Number(value).toLocaleString()}</div>
      <div class="kpi-label">${label}</div>
      <canvas class="kpi-spark"></canvas>
    </div>`;
  container.appendChild(col);
  const ctx = col.querySelector('canvas').getContext('2d');
  CHARTS.push(new Chart(ctx, {
    type: 'line',
    data: { labels: spark.map((_,i)=>i+1), datasets: [{ data: spark, borderColor: BRAND, fill:false, tension:.3, pointRadius:0 }]},
    options: { plugins:{legend:{display:false}}, scales:{x:{display:false}, y:{display:false}} }
  }));
}

// Helper to download PNG
function wireDownloadButtons() {
  document.querySelectorAll('[data-download]').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-download');
      const name = btn.getAttribute('data-filename') || `${id}.png`;
      const canvas = document.getElementById(id);
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = name;
      link.click();
    };
  });
}

function render(data){
  clearCharts();

  const m = months(data);
  const startSel = document.getElementById('startMonth');
  const endSel = document.getElementById('endMonth');
  [startSel, endSel].forEach(sel => sel.innerHTML = m.map(x=>`<option>${x}</option>`).join(''));
  endSel.value = m[m.length-1];

  // Extract exact columns
  const lastIncidentDates = col(data, 'Last Incident Date', false);
  const firstAid = col(data, 'First Aid Injury');
  const mti = col(data, 'Medical Treatment Injury');
  const lti = col(data, 'Lost Time Injury');
  const fatal = col(data, 'Fatal Incidents');
  const road = col(data, 'Road Traffic Incident');
  const prop = col(data, 'Property Damage Incident');
  const env = col(data, 'Environmental Incidents');
  const clientObs = col(data, 'Client HSE observation');
  const totalMH = col(data, 'Total Man Hours worked');
  const safeMH = col(data, 'Safe Man Hours Worked Without LTI');
  const induction = col(data, 'Induction Training');
  const behObs = col(data, 'Behavioral observations');
  const risk = col(data, 'Risk Assessments');

  // KPI cards
  const cards = document.getElementById('kpiCards');
  cards.innerHTML = '';
  const monthlyIncidents = mti.map((v,i)=>v + lti[i] + firstAid[i] + fatal[i] + road[i]);
  makeKPI(cards, 'Total Incidents (YTD)', totals(monthlyIncidents), monthlyIncidents);
  makeKPI(cards, 'Property Damage (YTD)', totals(prop), prop);
  makeKPI(cards, 'Environmental (YTD)', totals(env), env);
  makeKPI(cards, 'Total Manhours (YTD)', totals(totalMH), totalMH);
  makeKPI(cards, 'Safe Manhours (YTD)', totals(safeMH), safeMH);
  makeKPI(cards, 'Risk Assessments (YTD)', totals(risk), risk);

  // Gauge
  const dates = lastIncidentDates.map(d=>d?new Date(d):null).filter(Boolean);
  let days = 0;
  if (dates.length){
    const last = dates.sort((a,b)=>b-a)[0];
    days = Math.max(0, Math.floor((Date.now() - last.getTime())/86400000));
  }
  const gctx = document.getElementById('daysGauge').getContext('2d');
  CHARTS.push(new Chart(gctx, {
    type: 'doughnut',
    plugins:[centerText],
    data:{ datasets:[{ data:[Math.min(days,120), Math.max(0,120-Math.min(days,120))], backgroundColor:[BRAND, '#e9ecef'], borderWidth:0 }]},
    options:{ cutout:'75%', rotation:-90, circumference:180, plugins:{legend:{display:false}, centerText:{text:String(days)}} }
  }));

  // Sparkline trend
  const sctx = document.getElementById('incidentsSpark').getContext('2d');
  CHARTS.push(new Chart(sctx, {
    type:'line',
    data:{ labels:m, datasets:[{ label:'Incidents', data:monthlyIncidents, borderColor:BRAND, fill:false, tension:.3 }]},
    options:{ plugins:{legend:{display:false}}, scales:{ y:{ beginAtZero:true } } }
  }));
  document.getElementById('incidentsSparkTotal').innerText = `Total: ${totals(monthlyIncidents)}`;

  // Injury categories (stacked bars): First Aid, MTI, LTI, Fatal
  const ictx = document.getElementById('injuryCats').getContext('2d');
  CHARTS.push(new Chart(ictx, {
    type:'bar',
    data:{ labels:m, datasets:[
      { label:'First Aid', data:firstAid, backgroundColor:'#5bc0de' },
      { label:'MTI', data:mti, backgroundColor:'#ffc107' },
      { label:'LTI', data:lti, backgroundColor:BRAND },
      { label:'Fatal', data:fatal, backgroundColor:'#343a40' }
    ]},
    options:{ responsive:true, scales:{ x:{stacked:true}, y:{stacked:true, beginAtZero:true} } }
  }));
  document.getElementById('injuryCatsTotal').innerText =
    `Totals – First Aid: ${totals(firstAid)}, MTI: ${totals(mti)}, LTI: ${totals(lti)}, Fatal: ${totals(fatal)}`;

  // Other incident types (horizontal): Road, Property Damage, Environmental
  const octx = document.getElementById('otherInc').getContext('2d');
  const otherTotals = [totals(road), totals(prop), totals(env)];
  CHARTS.push(new Chart(octx, {
    type:'bar',
    data:{ labels:['Road Traffic', 'Property Damage', 'Environmental'], datasets:[{ data:otherTotals, backgroundColor:[ '#0d6efd', BRAND, '#20c997' ]}]},
    options:{ indexAxis:'y', plugins:{legend:{display:false}}, scales:{ x:{ beginAtZero:true } } }
  }));
  document.getElementById('otherIncTotal').innerText =
    `Totals – Road: ${otherTotals[0]}, Property: ${otherTotals[1]}, Environmental: ${otherTotals[2]}`;

  // Observations
  const obctx = document.getElementById('obsChart').getContext('2d');
  CHARTS.push(new Chart(obctx, {
    type:'line',
    data:{ labels:m, datasets:[
      { label:'Client HSE', data:clientObs, borderColor:BRAND, fill:false, tension:.3 },
      { label:'Behavioral', data:behObs, borderColor:'#0d6efd', fill:false, tension:.3 }
    ]},
    options:{ responsive:true }
  }));
  document.getElementById('obsChartTotal').innerText =
    `Totals – Client HSE: ${totals(clientObs)}, Behavioral: ${totals(behObs)}`;

  // Manhours
  const mhctx = document.getElementById('manChart').getContext('2d');
  CHARTS.push(new Chart(mhctx, {
    type:'line',
    data:{ labels:m, datasets:[
      { label:'Total Manhours', data:totalMH, borderColor:BRAND, fill:false, tension:.3 },
      { label:'Safe Manhours', data:safeMH, borderColor:'#20c997', fill:false, tension:.3 }
    ]},
    options:{ responsive:true, scales:{ y:{ beginAtZero:true } } }
  }));
  document.getElementById('manChartTotal').innerText =
    `Totals – Total Manhours: ${totals(totalMH).toLocaleString()}, Safe Manhours: ${totals(safeMH).toLocaleString()}`;

  // Training & Risk
  const tctx = document.getElementById('trainChart').getContext('2d');
  CHARTS.push(new Chart(tctx, {
    type:'bar',
    data:{ labels:m, datasets:[
      { label:'Induction Training', data:induction, backgroundColor:'#20c997' },
      { label:'Risk Assessments', data:risk, backgroundColor:BRAND }
    ]},
    options:{ responsive:true, scales:{ y:{ beginAtZero:true } } }
  }));
  document.getElementById('trainChartTotal').innerText =
    `Totals – Induction: ${totals(induction)}, Risk Assessments: ${totals(risk)}`;

  // Wire PNG downloads
  wireDownloadButtons();

  // Filter apply
  document.getElementById('applyFilter').onclick = () => {
    const s = startSel.value, e = endSel.value;
    const si = m.indexOf(s), ei = m.indexOf(e);
    const slice = (arr) => arr.slice(Math.max(0,si), Math.max(si,ei)+1);
    const sliced = {
      headers: data.headers,
      rows: data.rows.slice(Math.max(0,si), Math.max(si,ei)+1)
    };
    render(sliced);
  };
}

async function init(){
  const csv = await fetch(CSV_URL).then(r=>r.text());
  const data = parseCSV(csv);
  render(data);
}
init();
