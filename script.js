// 1) YOUR PUBLISHED CSV LINKS
const COMPANY_TOTALS_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTXQVIPN42E20By0btiM2IFinhYkeNeYuz66b7bA5QEukcD_gLN-g7LGyArw05zaMJssbMxJm68DAkX/pub?gid=1080547954&single=true&output=csv';
const EXPIRIES_CSV       = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTXQVIPN42E20By0btiM2IFinhYkeNeYuz66b7bA5QEukcD_gLN-g7LGyArw05zaMJssbMxJm68DAkX/pub?gid=2030320336&single=true&output=csv';

// 2) Helpers
async function fetchCSV(url) {
  const res = await fetch(url, { cache:'no-store' });
  if(!res.ok) throw new Error('Fetch failed: '+url);
  return (await res.text()).trim();
}
function parseCSV(text) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    // split by commas not in quotes (basic)
    const cols = []; let cur=''; let q=false;
    for (let i=0;i<line.length;i++) {
      const ch=line[i];
      if(ch==='"') { q=!q; continue; }
      if(ch===',' && !q) { cols.push(cur.trim()); cur=''; continue; }
      cur+=ch;
    }
    cols.push(cur.trim());
    rows.push(cols.map(s=>s.replace(/^"(.*)"$/,'$1')));
  }
  return rows;
}
const num = (x)=>{ const n = parseFloat(String(x).replace(/,/g,'')); return isNaN(n)?0:n; };
const fmt = (n)=> new Intl.NumberFormat().format(n);

// 3) Build a robust key→value map from the Company Totals CSV
function normalizeKey(s) {
  return String(s||'').split(':')[0].trim().toLowerCase();
}
function mapCompanyTotals(rows) {
  const map = {};
  for (const r of rows) {
    if (!r || !r.length) continue;
    // keys from any text cell
    const keys = r.filter(c => isNaN(parseFloat(c))).map(normalizeKey).filter(k=>k);
    // value from first numeric-looking cell
    let value = 0;
    for (const c of r) { const n=num(c); if(String(c).length>0 && (n || c==='0')){ value=n; break; } }
    for (const k of keys) { if(!(k in map)) map[k]=value; }
  }
  return map;
}

// 4) Compliance Expiries
function parseExpiries(rows){
  const out=[];
  for(let i=1;i<rows.length;i++) {
    const item=(rows[i][0]||'').trim();
    const days=num(rows[i][1]);
    if(item) out.push({item,days});
  }
  out.sort((a,b)=>a.days-b.days);
  return out;
}

// 5) Render
function getFirst(map, keys) {
  for (const k of keys) { const v = map[k.toLowerCase()]; if(v!==undefined) return v; }
  return undefined;
}
function renderKPIs(t) {
  const totalBehaviour = getFirst(t, ['total behaviour']) || 0;

  // total incidents & accidents: accept either name or compute from components
  let totalEvents = getFirst(t, ['total incidents & accidents','total events']);
  if (totalEvents === undefined) {
    const parts = ['near miss','incident','accident','property or equipment damage','fatality'];
    totalEvents = parts.map(p=>getFirst(t,[p])||0).reduce((a,b)=>a+b,0);
  }

  const hoursYTD = getFirst(t, ['total man hours (ytd)','total man hours ytd','total man hours']) || 0;
  const ltifrYTD = getFirst(t, ['ltifr (ytd)','ltifr ytd','ltifr']) || 0;
  const ltiYTD   = getFirst(t, ['lti (ytd)','lti ytd','lti']) || 0;

  document.getElementById('totalBehaviour').textContent = fmt(totalBehaviour);
  document.getElementById('totalEvents').textContent    = fmt(totalEvents);
  document.getElementById('hoursYTD').textContent       = fmt(hoursYTD);
  document.getElementById('ltifrYTD').textContent       = (ltifrYTD||0).toFixed(2);
  document.getElementById('ltiYTD').textContent         = fmt(ltiYTD);

  // minis
  document.getElementById('sb').textContent = fmt(getFirst(t,['safe behaviour']) || 0);
  document.getElementById('ub').textContent = fmt(getFirst(t,['unsafe behaviour']) || 0);
  document.getElementById('sc').textContent = fmt(getFirst(t,['safe condition']) || 0);
  document.getElementById('uc').textContent = fmt(getFirst(t,['unsafe condition']) || 0);
  document.getElementById('pb').textContent = fmt(getFirst(t,['positive behaviour/action','positive behaviour','positive behavior/action']) || 0);

  document.getElementById('nm').textContent = fmt(getFirst(t,['near miss']) || 0);
  document.getElementById('in').textContent = fmt(getFirst(t,['incident']) || 0);
  document.getElementById('ac').textContent = fmt(getFirst(t,['accident']) || 0);
  document.getElementById('pd').textContent = fmt(getFirst(t,['property or equipment damage','property & equipment damage','property/equipment damage']) || 0);
  document.getElementById('fa').textContent = fmt(getFirst(t,['fatality']) || 0);
}

let behaviourChart, incidentChart;
function renderCharts(t){
  const totalIncAcc = (getFirst(t,['total incidents & accidents','total events']) ??
    ['near miss','incident','accident','property or equipment damage','fatality'].map(k=>getFirst(t,[k])||0).reduce((a,b)=>a+b,0));

  const b = [
    getFirst(t,['safe behaviour'])||0,
    getFirst(t,['unsafe behaviour'])||0,
    getFirst(t,['safe condition'])||0,
    getFirst(t,['unsafe condition'])||0,
    getFirst(t,['positive behaviour/action','positive behaviour'])||0
  ];
  const i = [
    getFirst(t,['near miss'])||0,
    getFirst(t,['incident'])||0,
    getFirst(t,['accident'])||0,
    getFirst(t,['property or equipment damage'])||0,
    getFirst(t,['fatality'])||0
  ];

  const bc = document.getElementById('behaviourChart').getContext('2d');
  if (behaviourChart) behaviourChart.destroy();
  behaviourChart = new Chart(bc, {
    type:'bar',
    data: { labels:['Safe','Unsafe','Safe Cond','Unsafe Cond','Positive'], datasets:[{ label:'Count', data:b }] },
    options: { responsive:true, plugins:{ legend:{display:false}, title:{display:true,text:`Total Behaviour: ${fmt(getFirst(t,['total behaviour'])||0)}`} } }
  });

  const ic = document.getElementById('incidentChart').getContext('2d');
  if (incidentChart) incidentChart.destroy();
  incidentChart = new Chart(ic, {
    type:'bar',
    data: { labels:['Near Miss','Incident','Accident','Property/Equip Damage','Fatality'], datasets:[{ label:'Count', data:i }] },
    options: { responsive:true, plugins:{ legend:{display:false}, title:{display:true,text:`Total Incidents & Accidents: ${fmt(totalIncAcc)}`} } }
  });

  document.getElementById('dlBehaviour').onclick = () => { const a=document.createElement('a'); a.href=behaviourChart.toBase64Image('image/png',1); a.download='behaviour.png'; a.click(); };
  document.getElementById('dlIncident').onclick  = () => { const a=document.createElement('a'); a.href=incidentChart.toBase64Image('image/png',1); a.download='incidents.png'; a.click(); };
}

function renderCompliance(list){
  const tbody = document.getElementById('complianceBody');
  const note  = document.getElementById('complianceNote');
  tbody.innerHTML='';
  if (!list.length) { note.textContent='No compliance items found.'; return; }
  note.textContent='';
  const status = d => d<0 ? ['Expired','bad'] : d<=30 ? ['Warning','warn'] : ['OK','ok'];
  list.forEach(({item,days})=>{
    const [label, cls] = status(days);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${item}</td><td>${fmt(days)}</td><td><span class="pill ${cls}">${label}</span></td>`;
    tbody.appendChild(tr);
  });
}

// 6) Boot
(async function init(){
  try {
    const totalsCSV = await fetchCSV(COMPANY_TOTALS_CSV);
    const totalsMap = mapCompanyTotals(parseCSV(totalsCSV));
    renderKPIs(totalsMap);
    renderCharts(totalsMap);

    const expCSV = await fetchCSV(EXPIRIES_CSV);
    const expiries = parseExpiries(parseCSV(expCSV));
    renderCompliance(expiries);
  } catch (err) {
    console.error(err);
    alert('Could not load data. Check the CSV links and sharing are published to web.');
  }
})();
