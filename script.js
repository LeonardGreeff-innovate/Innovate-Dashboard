// 1) YOUR PUBLISHED CSV LINKS
const COMPANY_TOTALS_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTXQVIPN42E20By0btiM2IFinhYkeNeYuz66b7bA5QEukcD_gLN-g7LGyArw05zaMJssbMxJm68DAkX/pub?gid=1080547954&single=true&output=csv';
// If you also publish Compliance Expiries as CSV, paste it below. If left blank, the section will be hidden.
const EXPIRIES_CSV = '';

// 2) Small helpers
async function fetchCSV(url){
  const res = await fetch(url, { cache: 'no-store' });
  if(!res.ok) throw new Error('Fetch failed: '+url);
  return (await res.text()).trim();
}
function parseCSV(text){
  const rows = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines){
    // naive split that also trims wrapping quotes
    const cols = line.split(',').map(s => s.replace(/^"(.*)"$/, '$1').trim());
    rows.push(cols);
  }
  return rows;
}
function num(x){ const n = parseFloat(String(x).replace(/,/g,'')); return isNaN(n) ? 0 : n; }
function fmt(n){ return new Intl.NumberFormat().format(n); }

// 3) Build a map from Company Totals sheet
function mapCompanyTotals(rows){
  const map = {};
  for (let i=0;i<rows.length;i++) {
    const r = rows[i];
    if (!r || !r.length) continue;
    const keyFromC = (r[2] || '').trim();
    const keyFromA = (r[0] || '').split(':')[0].trim();
    const key = (keyFromC && keyFromC.toLowerCase() !== 'key') ? keyFromC : keyFromA;
    if (!key) continue;
    // value: prefer col B, else first numeric in row
    let v = num(r[1]);
    if (!v) {
      for (let j=0;j<r.length;j++) {
        const maybe = num(r[j]);
        if (maybe) { v = maybe; break; }
      }
    }
    map[key.toLowerCase()] = v;
  }
  return map;
}

// 4) Parse Compliance Expiries (Item | DaysLeft)
function parseExpiries(rows){
  const out = [];
  // assume headers on row 1: Item | Expiry (Days Left)
  for (let i=1;i<rows.length;i++) {
    const item = (rows[i][0]||'').trim();
    const days = num(rows[i][1]);
    if (item) out.push({ item, days });
  }
  out.sort((a,b)=>a.days - b.days);
  return out;
}

// 5) Renderers
function renderKPIs(t){
  const get = k => t[k.toLowerCase()] ?? 0;
  document.getElementById('totalBehaviour').textContent = fmt(get('total behaviour'));
  document.getElementById('totalEvents').textContent    = fmt(get('total events'));
  document.getElementById('hoursYTD').textContent       = fmt(get('total man hours (ytd)'));
  document.getElementById('ltifrYTD').textContent       = (get('ltifr (ytd)') || 0).toFixed(2);
  document.getElementById('ltiYTD').textContent         = fmt(get('lti (ytd)'));
}

let behaviourChart, incidentChart;

function renderCharts(t){
  const get = k => t[k.toLowerCase()] ?? 0;

  const behaviourData = [
    get('safe behaviour'),
    get('unsafe behaviour'),
    get('safe condition'),
    get('unsafe condition'),
    get('positive behaviour/action')
  ];
  const incidentData = [
    get('near miss'),
    get('incident'),
    get('accident'),
    get('property or equipment damage'),
    get('fatality')
  ];

  // Behaviour chart
  const bc = document.getElementById('behaviourChart').getContext('2d');
  if (behaviourChart) behaviourChart.destroy();
  behaviourChart = new Chart(bc, {
    type:'bar',
    data:{
      labels:['Safe Behaviour','Unsafe Behaviour','Safe Condition','Unsafe Condition','Positive Behaviour/Action'],
      datasets:[{ label:'Count', data:behaviourData }]
    },
    options:{
      responsive:true,
      plugins:{
        legend:{display:false},
        title:{display:true,text:`Total Behaviour: ${fmt(get('total behaviour'))}`}
      }
    }
  });

  // Incident chart
  const ic = document.getElementById('incidentChart').getContext('2d');
  if (incidentChart) incidentChart.destroy();
  incidentChart = new Chart(ic, {
    type:'bar',
    data:{
      labels:['Near Miss','Incident','Accident','Property/Equipment Damage','Fatality'],
      datasets:[{ label:'Count', data:incidentData }]
    },
    options:{
      responsive:true,
      plugins:{
        legend:{display:false},
        title:{display:true,text:`Total Events: ${fmt(get('total events'))}`}
      }
    }
  });

  // Download buttons
  document.getElementById('dlBehaviour').onclick = () => {
    const a = document.createElement('a');
    a.href = behaviourChart.toBase64Image('image/png',1);
    a.download = 'behaviour.png'; a.click();
  };
  document.getElementById('dlIncident').onclick = () => {
    const a = document.createElement('a');
    a.href = incidentChart.toBase64Image('image/png',1);
    a.download = 'incidents.png'; a.click();
  };
}

function renderCompliance(list){
  const section = document.getElementById('complianceSection');
  const tbody = document.getElementById('complianceBody');
  const note = document.getElementById('complianceNote');
  if (!list || !list.length) {
    note.textContent = 'Publish your Compliance Expiries tab as CSV and set EXPIRIES_CSV in script.js to show items here.';
    tbody.innerHTML = '';
    return;
  }
  note.textContent = '';
  tbody.innerHTML = '';
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
  try{
    const totalsCSV = await fetchCSV(COMPANY_TOTALS_CSV);
    const totalsMap = mapCompanyTotals(parseCSV(totalsCSV));
    renderKPIs(totalsMap);
    renderCharts(totalsMap);

    if (EXPIRIES_CSV && /^https?:/.test(EXPIRIES_CSV)) {
      try {
        const expCSV = await fetchCSV(EXPIRIES_CSV);
        const expiries = parseExpiries(parseCSV(expCSV));
        renderCompliance(expiries);
      } catch (e) {
        console.warn('Expiries fetch failed:', e);
        renderCompliance([]);
      }
    } else {
      renderCompliance([]);
    }
  }catch(err){
    console.error(err);
    alert('Could not load data. Check the CSV publish link(s) and sharing settings.');
  }
})();
