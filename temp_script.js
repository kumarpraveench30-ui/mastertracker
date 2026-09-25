
/**
 * VASUS CLAIM ANALYTICS - ENGINE V2
 * Full Interactive Dashboard Filtering + Daily/Monthly/Quarterly Dynamic Sync
 */

const SPREADSHEET_ID = '1mqve1wxOa-T37uQFOb4Lvv2QmjR2_k1EHRZT8zv_rcA';

// Cache stores
const sheetCache = {};
const queryCache = {};

let currentActiveTab = 'dashboard';

// State models for Employee and Doctor tabs
const empState = {
  name: 'Sirisha',
  mode: 'daily',          // 'daily' | 'monthly' | 'quarterly'
  dailyMonth: '2026-09',
  dailyDay: 'ALL',        // 'ALL' | 1..31
  monthlyMonth: '8',      // 'ALL' | 0..11 (8 = Sep)
  quarterlyQuarter: '3'   // 'ALL' | 1..4 (3 = Q3)
};

const docState = {
  name: 'Dr Sunitha',
  mode: 'daily',
  dailyMonth: '2026-09',
  dailyDay: 'ALL',
  monthlyMonth: '8',
  quarterlyQuarter: '3'
};

// Master Point Weights
const POINT_WEIGHTS = {
  employee: {
    'Claim': 1.0,
    'Preauth': 0.8,
    'Claim Query': 0.5,
    'Claim Submit': 0.65,
    'Enhancement': 0.25,
    'Resubmit': 0.25,
    'Highend': 0.25,
    'HD PA': 0.25,
    'HD CI': 0.5
  },
  doctor: {
    'Claim': 1.0,
    'Preauth': 0.8,
    'HD PA': 0.25,
    'HD CI': 0.5
  }
};

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// UI Notification Helper
function showNotification(msg, type='info'){
  const el = document.getElementById('statusNotice');
  const txt = document.getElementById('statusNoticeText');
  el.className = 'status-bar ' + (type === 'success' ? 'success' : type === 'error' ? 'error' : '');
  txt.innerHTML = msg;
  el.style.display = 'flex';
  if(type === 'success'){
    setTimeout(() => { el.style.display = 'none'; }, 4000);
  }
}

// Navigation Tab Switcher
function switchNavTab(tabId, btn){
  currentActiveTab = tabId;
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  if(btn) btn.classList.add('active');

  ['dashboard','employee','doctor'].forEach(t => {
    document.getElementById('tab-' + t).style.display = (t === tabId ? 'block' : 'none');
  });

  if(tabId === 'employee'){
    loadEmployeeData(empState.name);
  } else if(tabId === 'doctor'){
    loadDoctorData(docState.name);
  } else if(tabId === 'dashboard'){
    filterDashboard();
  }
}

/**
 * ==========================================================
 * 1. LIVE GOOGLE VISUALIZATION QUERY ENGINE (JSONP)
 * ==========================================================
 */
function queryGviz(queryString, sheetName = 'Cases'){
  const cacheKey = sheetName + '::' + queryString;
  if(queryCache[cacheKey]) return Promise.resolve(queryCache[cacheKey]);

  return new Promise((resolve, reject) => {
    const callbackName = 'gviz_q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const script = document.createElement('script');

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timeout querying Google Sheets."));
    }, 25000);

    function cleanup(){
      clearTimeout(timeout);
      delete window[callbackName];
      if(script.parentNode) script.parentNode.removeChild(script);
    }

    window[callbackName] = function(data){
      cleanup();
      if(!data || data.status === 'error'){
        const errMsg = data && data.errors && data.errors[0] ? data.errors[0].message : 'Query execution error';
        reject(new Error(errMsg));
        return;
      }
      const table = data.table || { rows: [], cols: [] };
      queryCache[cacheKey] = table;
      resolve(table);
    };

    script.onerror = function(){
      cleanup();
      reject(new Error("Network communication error with Google Sheets."));
    };

    const encodedSheet = encodeURIComponent(sheetName);
    const encodedTq = encodeURIComponent(queryString);
    script.src = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=responseHandler:${callbackName}&sheet=${encodedSheet}&tq=${encodedTq}`;
    document.body.appendChild(script);
  });
}

/**
 * Fetch and Parse entire tab for Employee or Doctor
 */
function fetchSheetTab(tabName){
  if(sheetCache[tabName]) return Promise.resolve(sheetCache[tabName]);

  return new Promise((resolve, reject) => {
    const callbackName = 'gviz_tab_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const script = document.createElement('script');

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout loading tab "${tabName}".`));
    }, 25000);

    function cleanup(){
      clearTimeout(timeout);
      delete window[callbackName];
      if(script.parentNode) script.parentNode.removeChild(script);
    }

    window[callbackName] = function(data){
      cleanup();
      try{
        if(!data || !data.table || !data.table.rows){
          reject(new Error(`Invalid table structure for ${tabName}`));
          return;
        }

        const rows = [];
        for(const r of data.table.rows){
          if(!r || !r.c) continue;
          const c = r.c;

          let rawDate = c[0] ? (c[0].f || String(c[0].v || '')) : '';
          let dateObj = parseGoogleDate(c[0] ? c[0].v : null, rawDate);

          const caseNum = c[1] ? String(c[1].v || '') : '';
          const uploader = c[2] ? String(c[2].v || '').trim() : '';
          const hospital = c[3] ? String(c[3].v || '').trim() : '';
          const caseType = c[4] ? String(c[4].v || '').trim() : 'Unknown';
          const amt = c[5] ? Number(c[5].v) || 0 : 0;
          const discharge = c[6] ? String(c[6].v || '') : '';
          const points = c[7] ? Number(c[7].v) || 0 : 0;

          if(rawDate || caseNum){
            rows.push({
              rawDate,
              dateObj,
              day: dateObj ? dateObj.getDate() : null,
              month: dateObj ? dateObj.getMonth() : null, // 0 = Jan, 11 = Dec
              year: dateObj ? dateObj.getFullYear() : null,
              ymKey: dateObj ? `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}` : '',
              quarter: dateObj ? (Math.floor(dateObj.getMonth() / 3) + 1) : null,
              caseNum,
              uploader,
              hospital,
              caseType,
              amt,
              discharge,
              points
            });
          }
        }

        sheetCache[tabName] = rows;
        resolve(rows);
      }catch(err){
        reject(err);
      }
    };

    script.onerror = function(){
      cleanup();
      reject(new Error(`Failed to load tab "${tabName}".`));
    };

    const encodedTab = encodeURIComponent(tabName);
    script.src = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=responseHandler:${callbackName}&sheet=${encodedTab}`;
    document.body.appendChild(script);
  });
}

function parseGoogleDate(val, formatted){
  if(typeof val === 'string' && val.startsWith('Date(')){
    const m = val.match(/Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?/);
    if(m){
      return new Date(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]), parseInt(m[4]||0), parseInt(m[5]||0), parseInt(m[6]||0));
    }
  }
  if(formatted){
    const parts = formatted.split(/[/\- :]/);
    if(parts.length >= 3){
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2].length === 2 ? '20' + parts[2] : parts[2]);
      if(!isNaN(day) && !isNaN(month) && !isNaN(year)){
        return new Date(year, month, day);
      }
    }
  }
  return null;
}


/**
 * ==========================================================
 * 2. OVERVIEW DASHBOARD FILTERING ENGINE
 * ==========================================================
 */
let dashFilterRunning = false;


function onSchemeFilterChange() {
  const scheme = document.getElementById('dashSchemeFilter').value;
  const kaspGroup = document.getElementById('optgroupKasp');
  const medisepGroup = document.getElementById('optgroupMedisep');

  if(scheme === 'KASP') {
    if(kaspGroup) kaspGroup.style.display = '';
    if(medisepGroup) medisepGroup.style.display = 'none';
  } else if(scheme === 'MEDISEP') {
    if(kaspGroup) kaspGroup.style.display = 'none';
    if(medisepGroup) medisepGroup.style.display = '';
  } else {
    if(kaspGroup) kaspGroup.style.display = '';
    if(medisepGroup) medisepGroup.style.display = '';
  }
  filterDashboard();
}

async function filterDashboard(){
  if(dashFilterRunning) return;
  dashFilterRunning = true;

  const fromDate = document.getElementById('dashFromDate').value;
  const toDate = document.getElementById('dashToDate').value;
  const hospital = document.getElementById('dashHospitalFilter').value;
  const caseType = document.getElementById('dashCaseTypeFilter').value;

  // Build SQL where clause
  const whereClauses = [];
  if(fromDate){
    whereClauses.append ? null : whereClauses.push(`A >= datetime '${fromDate} 00:00:00'`);
  }
  if(toDate){
    whereClauses.push(`A <= datetime '${toDate} 23:59:59'`);
  }
  const scheme = document.getElementById('dashSchemeFilter') ? document.getElementById('dashSchemeFilter').value : 'ALL';
  if(scheme === 'KASP') {
    whereClauses.push("not lower(D) like '%medisep%'");
  } else if(scheme === 'MEDISEP') {
    whereClauses.push("lower(D) like '%medisep%'");
  }

  if(hospital && hospital !== 'ALL'){
    if(hospital === 'KASP_ALL'){
      whereClauses.push("not lower(D) like '%medisep%'");
    } else if(hospital === 'MEDISEP_ALL'){
      whereClauses.push("lower(D) like '%medisep%'");
    } else {
      let cleanHospFilter = hospital.replace(/^[0-9]+\.\s*/, '').replace(/^medisep[\s_-]*/i, '');
      whereClauses.push(`lower(D) like '%${cleanHospFilter.toLowerCase()}%'`);
    }
  }
  if(caseType && caseType !== 'ALL'){
    whereClauses.push(`lower(E) like '%${caseType.toLowerCase()}%'`);
  }

  const whereSql = whereClauses.length > 0 ? ("where " + whereClauses.join(" and ")) : "";

  // Update Summary label
  const hospName = hospital === 'ALL' ? 'All Hospitals' : hospital.toUpperCase();
  const typeName = caseType === 'ALL' ? 'All Case Types' : caseType;
  document.getElementById('dashFilterSummaryText').innerHTML = 
    `Filtering: <b>${fromDate || 'Earliest'}</b> to <b>${toDate || 'Latest'}</b> • Hospital: <b>${hospName}</b> • Case Type: <b>${typeName}</b>`;

  setSyncButtonState(true);
  showNotification('Fetching live filtered calculations from Google Sheets...');

  try{
    // Queries in parallel:
    // Q1: Case Type Breakdown
    const qTypes = `select E, count(B), sum(F), sum(H) ${whereSql} ${whereSql ? 'and' : 'where'} E is not null group by E`;
    // Q2: Hospital Breakdown
    const qHosp = `select D, E, count(B), sum(F) ${whereSql} ${whereSql ? 'and' : 'where'} D is not null group by D, E`;
    // Q3: Leaderboard (Uploaders)
    const qLeader = `select C, count(B), sum(H) ${whereSql} ${whereSql ? 'and' : 'where'} C is not null group by C order by count(B) desc limit 8`;

    const [typesData, hospData, leaderData] = await Promise.all([
      queryGviz(qTypes),
      queryGviz(qHosp),
      queryGviz(qLeader)
    ]);

    updateDashboardKPIs(typesData);
    updateDashboardHospitals(hospData, hospital);
    updateDashboardLeaderboard(leaderData);

    showNotification('Dashboard updated successfully!', 'success');
    document.getElementById('syncTime').textContent = `Synced: ${new Date().toLocaleTimeString()}`;
  }catch(err){
    console.error("Dashboard filter error:", err);
    showNotification('Live filter error: ' + err.message, 'error');
  }finally{
    setSyncButtonState(false);
    dashFilterRunning = false;
  }
}

function resetDashFilters(){
  document.getElementById('dashFromDate').value = '2026-09-23';
  document.getElementById('dashToDate').value = '2026-09-23';
  if(document.getElementById('dashSchemeFilter')) document.getElementById('dashSchemeFilter').value = 'ALL';
  document.getElementById('dashHospitalFilter').value = 'ALL';
  document.getElementById('dashCaseTypeFilter').value = 'ALL';
  onSchemeFilterChange();
}

function updateDashboardKPIs(table){
  let totalCases = 0;
  let totalPoints = 0;
  let claimCases = 0, claimAmt = 0;
  let preauthCases = 0, preauthAmt = 0;
  let enhanceCases = 0;
  let resubmitCases = 0;

  if(table && table.rows){
    table.rows.forEach(r => {
      if(!r.c) return;
      const type = r.c[0] ? String(r.c[0].v || '') : '';
      const count = r.c[1] ? Number(r.c[1].v || 0) : 0;
      const amt = r.c[2] ? Number(r.c[2].v || 0) : 0;
      const pts = r.c[3] ? Number(r.c[3].v || 0) : 0;

      totalCases += count;
      totalPoints += pts;

      const lowerType = type.toLowerCase();
      if(lowerType === 'claim'){
        claimCases += count;
        claimAmt += amt;
      } else if(lowerType === 'preauth'){
        preauthCases += count;
        preauthAmt += amt;
      } else if(lowerType.includes('enhancement')){
        enhanceCases += count;
      } else if(lowerType.includes('resubmit')){
        resubmitCases += count;
      }
    });
  }

  document.getElementById('dashTotalCases').textContent = totalCases.toLocaleString();
  document.getElementById('dashClaimCases').textContent = claimCases.toLocaleString();
  document.getElementById('dashClaimAmt').textContent = '₹' + Math.round(claimAmt).toLocaleString('en-IN');
  document.getElementById('dashPreauthCases').textContent = preauthCases.toLocaleString();
  document.getElementById('dashPreauthAmt').textContent = '₹' + Math.round(preauthAmt).toLocaleString('en-IN');
  document.getElementById('dashEnhanceCases').textContent = enhanceCases.toLocaleString();
  document.getElementById('dashResubmitCases').textContent = resubmitCases.toLocaleString();
  document.getElementById('dashTotalPoints').textContent = totalPoints.toFixed(1);
}

function updateDashboardHospitals(table, selectedHospFilter){
  const hospMap = {};

  if(table && table.rows){
    table.rows.forEach(r => {
      if(!r.c || !r.c[0]) return;
      const rawHosp = String(r.c[0].v || '').trim();
      const type = r.c[1] ? String(r.c[1].v || '').trim() : '';
      const count = r.c[2] ? Number(r.c[2].v || 0) : 0;
      const amt = r.c[3] ? Number(r.c[3].v || 0) : 0;

      // Normalize name e.g. "1.Kmct" -> "KMCT", "2.Pushpagiri" -> "Pushpagiri"
      let cleanHosp = rawHosp.replace(/^[0-9]+\.\s*/, '');
      if(cleanHosp.toLowerCase().includes('kmct')) cleanHosp = 'KMCT';
      else if(cleanHosp.toLowerCase().includes('pushpagiri')) cleanHosp = 'Pushpagiri';
      else if(cleanHosp.toLowerCase().includes('sgmc')) cleanHosp = 'SGMC';
      else if(cleanHosp.toLowerCase().includes('rmdh')) cleanHosp = 'RMDH';
      else if(cleanHosp.toLowerCase().includes('smci') || cleanHosp.toLowerCase().includes('smcsi')) cleanHosp = 'SMCI';
      else if(cleanHosp.toLowerCase().includes('snim')) cleanHosp = 'SNIM';
      else if(cleanHosp.toLowerCase().includes('sut')) cleanHosp = 'SUTAM';
      else if(cleanHosp.toLowerCase().includes('cmh')) cleanHosp = 'CMH';
      else if(cleanHosp.toLowerCase().includes('amch')) cleanHosp = 'AMCH';

      if(!hospMap[cleanHosp]){
        hospMap[cleanHosp] = { claimCnt: 0, claimAmt: 0, preauthCnt: 0, preauthAmt: 0, totalCases: 0, totalAmt: 0 };
      }

      hospMap[cleanHosp].totalCases += count;
      hospMap[cleanHosp].totalAmt += amt;

      const lowerType = type.toLowerCase();
      if(lowerType === 'claim'){
        hospMap[cleanHosp].claimCnt += count;
        hospMap[cleanHosp].claimAmt += amt;
      } else if(lowerType === 'preauth'){
        hospMap[cleanHosp].preauthCnt += count;
        hospMap[cleanHosp].preauthAmt += amt;
      }
    });
  }

  // Populate Table
  const tbody = document.getElementById('dashHospitalTableBody');
  tbody.innerHTML = '';

  const hospList = Object.keys(hospMap).sort((a,b) => hospMap[b].totalAmt - hospMap[a].totalAmt);

  if(hospList.length === 0){
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#64748b;padding:16px">No hospital records found for selected filters.</td></tr>`;
  } else {
    hospList.forEach(h => {
      const data = hospMap[h];
      const isMed = h.toLowerCase().includes('medisep');
      const schemePill = isMed 
        ? '<span class="pill pill-blue">MEDISEP</span>'
        : '<span class="pill pill-green">KASP</span>';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${schemePill}</td>
        <td><b>${h}</b></td>
        <td class="right">${data.claimCnt.toLocaleString()}</td>
        <td class="right">${data.claimAmt ? '₹' + Math.round(data.claimAmt).toLocaleString('en-IN') : '—'}</td>
        <td class="right">${data.preauthCnt.toLocaleString()}</td>
        <td class="right">${data.preauthAmt ? '₹' + Math.round(data.preauthAmt).toLocaleString('en-IN') : '—'}</td>
        <td class="right"><b>₹${Math.round(data.totalAmt).toLocaleString('en-IN')}</b></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Populate Bar Chart
  const barContainer = document.getElementById('dashHospitalBarChart');
  barContainer.innerHTML = '';

  const topHospitalsForBar = hospList.slice(0, 8);
  const maxCases = Math.max(...topHospitalsForBar.map(h => hospMap[h].totalCases), 1);

  topHospitalsForBar.forEach(h => {
    const cases = hospMap[h].totalCases;
    const pct = Math.max(8, Math.round((cases / maxCases) * 100));

    const wrap = document.createElement('div');
    wrap.className = 'simple-barwrap';
    wrap.innerHTML = `
      <span class="simple-barval">${cases.toLocaleString()}</span>
      <div class="simple-bar" style="height:${pct}%" title="${h}: ${cases.toLocaleString()} cases"></div>
      <span class="simple-barlabel" title="${h}">${h}</span>
    `;
    barContainer.appendChild(wrap);
  });
}

function updateDashboardLeaderboard(table){
  const tbody = document.getElementById('dashLeaderboardBody');
  tbody.innerHTML = '';

  if(!table || !table.rows || table.rows.length === 0){
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#64748b">No performer records found.</td></tr>`;
    return;
  }

  const list = [];
  table.rows.forEach(r => {
    if(!r.c || !r.c[0]) return;
    const name = String(r.c[0].v || '').trim();
    const cases = r.c[1] ? Number(r.c[1].v || 0) : 0;
    const pts = r.c[2] ? Number(r.c[2].v || 0) : 0;
    const ratio = cases > 0 ? (pts / cases).toFixed(2) : '0.00';
    list.push({ name, cases, pts, ratio });
  });

  // Track top 2 for Gold & Silver badges
  const empNames = list.filter(item => !item.name.toLowerCase().includes('dr ')).map(item => item.name);
  const docNames = list.filter(item => item.name.toLowerCase().includes('dr ')).map(item => item.name);
  window.latestLeaderboards.empList = empNames;
  window.latestLeaderboards.docList = docNames;
  updatePerformerDropdownDecorations();

  // Update badge on active reports if loaded
  const empBadgeEl = document.getElementById('empPerformerBadge');
  if(empBadgeEl && empState) empBadgeEl.innerHTML = getPerformerBadgeHtml(empState.name, 'emp');
  const docBadgeEl = document.getElementById('docPerformerBadge');
  if(docBadgeEl && docState) docBadgeEl.innerHTML = getPerformerBadgeHtml(docState.name, 'doc');

  list.forEach((item, idx) => {
    const pillClass = Number(item.ratio) >= 0.75 ? 'pill-green' : 'pill-blue';
    let badgeHtml = '';
    let rowClass = '';

    if(idx === 0) {
      badgeHtml = '<span class="badge-gold">🥇 Gold</span> ';
      rowClass = 'gold-row-highlight';
    } else if(idx === 1) {
      badgeHtml = '<span class="badge-silver">🥈 Silver</span> ';
      rowClass = 'silver-row-highlight';
    }

    const tr = document.createElement('tr');
    if(rowClass) tr.className = rowClass;
    tr.innerHTML = `
      <td>${badgeHtml}<b>${item.name}</b></td>
      <td class="right">${item.cases.toLocaleString()}</td>
      <td class="right">${item.pts.toFixed(2)}</td>
      <td class="right"><span class="pill ${pillClass}">${item.ratio}</span></td>
    `;
    tbody.appendChild(tr);
  });
}


/**
 * ==========================================================
 * 3. EMPLOYEE REPORT ENGINE (DAILY / MONTHLY / QUARTERLY)
 * ==========================================================
 */
async function loadEmployeeData(empName){
  empState.name = empName;
  document.getElementById('empSelect').value = empName;
  setSyncButtonState(true);
  showNotification(`Loading live data for employee <b>${empName}</b>...`);

  try{
    const rows = await fetchSheetTab(empName);
    buildEmpFilterDropdowns(rows);
    renderActiveEmployeeView();
    showNotification(`Loaded <b>${rows.length.toLocaleString()}</b> records for <b>${empName}</b>.`, 'success');
  }catch(err){
    showNotification(`Could not load tab for "${empName}".`, 'error');
  }finally{
    setSyncButtonState(false);
  }
}

function onEmployeeChange(){
  const name = document.getElementById('empSelect').value;
  loadEmployeeData(name);
}

function buildEmpFilterDropdowns(rows){
  const ymSet = new Set();
  rows.forEach(r => { if(r.ymKey) ymSet.add(r.ymKey); });
  const sortedYm = Array.from(ymSet).sort().reverse();

  // Populate Month selector for daily
  const monthSel = document.getElementById('empDailyMonthSelect');
  monthSel.innerHTML = '<option value="ALL">All Recorded Months</option>';
  sortedYm.forEach(ym => {
    const [y, m] = ym.split('-');
    const opt = document.createElement('option');
    opt.value = ym;
    opt.textContent = `${MONTH_NAMES[parseInt(m)-1]} ${y}`;
    monthSel.appendChild(opt);
  });

  if(sortedYm.length > 0 && !sortedYm.includes(empState.dailyMonth)){
    empState.dailyMonth = sortedYm[0];
  }
  monthSel.value = empState.dailyMonth;

  // Populate Days selector (1 to 31)
  const daySel = document.getElementById('empDaySelect');
  daySel.innerHTML = '<option value="ALL">Full Month (Days 1–31 Total)</option>';
  for(let d=1; d<=31; d++){
    const opt = document.createElement('option');
    opt.value = String(d);
    opt.textContent = `Day ${d} of Month`;
    daySel.appendChild(opt);
  }
  daySel.value = empState.dailyDay;
}

function setEmployeeViewMode(mode, btn){
  empState.mode = mode;
  document.querySelectorAll('#tab-employee .chart-btn').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');

  // Toggle sub-filter visibility
  document.getElementById('empDailyControls').style.display = (mode === 'daily' ? 'flex' : 'none');
  document.getElementById('empMonthlyControls').style.display = (mode === 'monthly' ? 'flex' : 'none');
  document.getElementById('empQuarterlyControls').style.display = (mode === 'quarterly' ? 'flex' : 'none');

  renderActiveEmployeeView();
}

function onEmpDailyMonthChange(){
  empState.dailyMonth = document.getElementById('empDailyMonthSelect').value;
  renderActiveEmployeeView();
}

function onEmpDaySelectChange(){
  empState.dailyDay = document.getElementById('empDaySelect').value;
  renderActiveEmployeeView();
}

function onEmpMonthSelectChange(){
  empState.monthlyMonth = document.getElementById('empMonthSelect').value;
  renderActiveEmployeeView();
}

function onEmpQuarterSelectChange(){
  empState.quarterlyQuarter = document.getElementById('empQuarterSelect').value;
  renderActiveEmployeeView();
}

/**
 * Recalculate Cards, Breakdown Table, and Chart for Employee
 */
function renderActiveEmployeeView(){
  const allRows = sheetCache[empState.name] || [];
  let filteredRows = [];
  let badgeText = '';
  let summaryText = '';

  if(empState.mode === 'daily'){
    badgeText = 'DAILY VIEW';
    const selMonth = empState.dailyMonth;
    const selDay = empState.dailyDay;

    filteredRows = allRows.filter(r => {
      const matchMonth = (selMonth === 'ALL' || r.ymKey === selMonth);
      const matchDay = (selDay === 'ALL' || String(r.day) === String(selDay));
      return matchMonth && matchDay;
    });

    const mLabel = (selMonth === 'ALL') ? 'All Months' : selMonth;
    summaryText = (selDay === 'ALL') 
      ? `Viewing Month Total: <b>${mLabel} (Days 1–31)</b> • <b>${filteredRows.length.toLocaleString()}</b> cases`
      : `Viewing Specific Day: <b>Day ${selDay} of ${mLabel}</b> • <b>${filteredRows.length.toLocaleString()}</b> cases`;

  } else if(empState.mode === 'monthly'){
    badgeText = 'MONTHLY VIEW';
    const mIdx = empState.monthlyMonth;

    filteredRows = allRows.filter(r => {
      return (mIdx === 'ALL' || String(r.month) === String(mIdx));
    });

    summaryText = (mIdx === 'ALL')
      ? `Viewing Full Year: <b>Jan to Dec Cumulative</b> • <b>${filteredRows.length.toLocaleString()}</b> cases`
      : `Viewing Month: <b>${MONTH_NAMES[parseInt(mIdx)]}</b> • <b>${filteredRows.length.toLocaleString()}</b> cases`;

  } else if(empState.mode === 'quarterly'){
    badgeText = 'QUARTERLY VIEW';
    const qIdx = empState.quarterlyQuarter;

    filteredRows = allRows.filter(r => {
      return (qIdx === 'ALL' || String(r.quarter) === String(qIdx));
    });

    summaryText = (qIdx === 'ALL')
      ? `Viewing Full Year: <b>All Quarters (Q1–Q4)</b> • <b>${filteredRows.length.toLocaleString()}</b> cases`
      : `Viewing Quarter: <b>Q${qIdx}</b> • <b>${filteredRows.length.toLocaleString()}</b> cases`;
  }

  // Update banner
  document.getElementById('empActiveBadge').textContent = badgeText;
  const eb = document.getElementById('empPerformerBadge'); if(eb) eb.innerHTML = getPerformerBadgeHtml(empState.name, 'emp');
  document.getElementById('empActiveSummary').innerHTML = summaryText;
  document.getElementById('empTablePeriodLabel').textContent = `(Reflecting: ${badgeText})`;

  // Update Employee Cards
  updatePersonCards('emp', filteredRows, POINT_WEIGHTS.employee);

  // Update Employee Case Details Table
  updatePersonTable('emp', filteredRows, POINT_WEIGHTS.employee);

  // Render Workflow Chart
  renderWorkflowChart('emp', empState.name, allRows, empState.mode);
}


/**
 * ==========================================================
 * 4. DOCTOR REPORT ENGINE (DAILY / MONTHLY / QUARTERLY)
 * ==========================================================
 */
async function loadDoctorData(docName){
  docState.name = docName;
  document.getElementById('docSelect').value = docName;
  setSyncButtonState(true);
  showNotification(`Loading live data for doctor <b>${docName}</b>...`);

  try{
    const rows = await fetchSheetTab(docName);
    buildDocFilterDropdowns(rows);
    renderActiveDoctorView();
    showNotification(`Loaded <b>${rows.length.toLocaleString()}</b> records for <b>${docName}</b>.`, 'success');
  }catch(err){
    showNotification(`Could not load tab for "${docName}".`, 'error');
  }finally{
    setSyncButtonState(false);
  }
}

function onDoctorChange(){
  const name = document.getElementById('docSelect').value;
  loadDoctorData(name);
}

function buildDocFilterDropdowns(rows){
  const ymSet = new Set();
  rows.forEach(r => { if(r.ymKey) ymSet.add(r.ymKey); });
  const sortedYm = Array.from(ymSet).sort().reverse();

  const monthSel = document.getElementById('docDailyMonthSelect');
  monthSel.innerHTML = '<option value="ALL">All Recorded Months</option>';
  sortedYm.forEach(ym => {
    const [y, m] = ym.split('-');
    const opt = document.createElement('option');
    opt.value = ym;
    opt.textContent = `${MONTH_NAMES[parseInt(m)-1]} ${y}`;
    monthSel.appendChild(opt);
  });

  if(sortedYm.length > 0 && !sortedYm.includes(docState.dailyMonth)){
    docState.dailyMonth = sortedYm[0];
  }
  monthSel.value = docState.dailyMonth;

  // Day selector 1 to 31
  const daySel = document.getElementById('docDaySelect');
  daySel.innerHTML = '<option value="ALL">Full Month (Days 1–31 Total)</option>';
  for(let d=1; d<=31; d++){
    const opt = document.createElement('option');
    opt.value = String(d);
    opt.textContent = `Day ${d} of Month`;
    daySel.appendChild(opt);
  }
  daySel.value = docState.dailyDay;
}

function setDoctorViewMode(mode, btn){
  docState.mode = mode;
  document.querySelectorAll('#tab-doctor .chart-btn').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');

  document.getElementById('docDailyControls').style.display = (mode === 'daily' ? 'flex' : 'none');
  document.getElementById('docMonthlyControls').style.display = (mode === 'monthly' ? 'flex' : 'none');
  document.getElementById('docQuarterlyControls').style.display = (mode === 'quarterly' ? 'flex' : 'none');

  renderActiveDoctorView();
}

function onDocDailyMonthChange(){
  docState.dailyMonth = document.getElementById('docDailyMonthSelect').value;
  renderActiveDoctorView();
}

function onDocDaySelectChange(){
  docState.dailyDay = document.getElementById('docDaySelect').value;
  renderActiveDoctorView();
}

function onDocMonthSelectChange(){
  docState.monthlyMonth = document.getElementById('docMonthSelect').value;
  renderActiveDoctorView();
}

function onDocQuarterSelectChange(){
  docState.quarterlyQuarter = document.getElementById('docQuarterSelect').value;
  renderActiveDoctorView();
}

/**
 * Recalculate Cards, Breakdown Table, and Chart for Doctor
 */
function renderActiveDoctorView(){
  const allRows = sheetCache[docState.name] || [];
  let filteredRows = [];
  let badgeText = '';
  let summaryText = '';

  if(docState.mode === 'daily'){
    badgeText = 'DAILY VIEW';
    const selMonth = docState.dailyMonth;
    const selDay = docState.dailyDay;

    filteredRows = allRows.filter(r => {
      const matchMonth = (selMonth === 'ALL' || r.ymKey === selMonth);
      const matchDay = (selDay === 'ALL' || String(r.day) === String(selDay));
      return matchMonth && matchDay;
    });

    const mLabel = (selMonth === 'ALL') ? 'All Months' : selMonth;
    summaryText = (selDay === 'ALL') 
      ? `Viewing Month Total: <b>${mLabel} (Days 1–31)</b> • <b>${filteredRows.length.toLocaleString()}</b> cases`
      : `Viewing Specific Day: <b>Day ${selDay} of ${mLabel}</b> • <b>${filteredRows.length.toLocaleString()}</b> cases`;

  } else if(docState.mode === 'monthly'){
    badgeText = 'MONTHLY VIEW';
    const mIdx = docState.monthlyMonth;

    filteredRows = allRows.filter(r => {
      return (mIdx === 'ALL' || String(r.month) === String(mIdx));
    });

    summaryText = (mIdx === 'ALL')
      ? `Viewing Full Year: <b>Jan to Dec Cumulative</b> • <b>${filteredRows.length.toLocaleString()}</b> cases`
      : `Viewing Month: <b>${MONTH_NAMES[parseInt(mIdx)]}</b> • <b>${filteredRows.length.toLocaleString()}</b> cases`;

  } else if(docState.mode === 'quarterly'){
    badgeText = 'QUARTERLY VIEW';
    const qIdx = docState.quarterlyQuarter;

    filteredRows = allRows.filter(r => {
      return (qIdx === 'ALL' || String(r.quarter) === String(qIdx));
    });

    summaryText = (qIdx === 'ALL')
      ? `Viewing Full Year: <b>All Quarters (Q1–Q4)</b> • <b>${filteredRows.length.toLocaleString()}</b> cases`
      : `Viewing Quarter: <b>Q${qIdx}</b> • <b>${filteredRows.length.toLocaleString()}</b> cases`;
  }

  // Update banner
  document.getElementById('docActiveBadge').textContent = badgeText;
  const db = document.getElementById('docPerformerBadge'); if(db) db.innerHTML = getPerformerBadgeHtml(docState.name, 'doc');
  document.getElementById('docActiveSummary').innerHTML = summaryText;
  document.getElementById('docTablePeriodLabel').textContent = `(Reflecting: ${badgeText})`;

  // Update Doctor Cards
  updatePersonCards('doc', filteredRows, POINT_WEIGHTS.doctor);

  // Update Doctor Case Details Table
  updatePersonTable('doc', filteredRows, POINT_WEIGHTS.doctor);

  // Render Workflow Chart
  renderWorkflowChart('doc', docState.name, allRows, docState.mode);
}


/**
 * Helper to update KPI cards for Employee or Doctor
 */
function updatePersonCards(type, rows, weights){
  let totalCases = rows.length;
  let totalPoints = 0;
  let counts = {};

  rows.forEach(r => {
    const t = r.caseType || 'Other';
    counts[t] = (counts[t] || 0) + 1;
    totalPoints += (r.points || 0);
  });

  if(type === 'emp'){
    document.getElementById('empCardTotal').textContent = totalCases.toLocaleString();
    document.getElementById('empCardClaim').textContent = (counts['Claim'] || 0).toLocaleString();
    document.getElementById('empCardQuery').textContent = (counts['Claim Query'] || 0).toLocaleString();
    document.getElementById('empCardPreauth').textContent = (counts['Preauth'] || 0).toLocaleString();
    document.getElementById('empCardEnhance').textContent = (counts['Enhancement'] || 0).toLocaleString();
    document.getElementById('empCardPoints').textContent = totalPoints.toFixed(2);
  } else {
    document.getElementById('docCardTotal').textContent = totalCases.toLocaleString();
    document.getElementById('docCardClaim').textContent = (counts['Claim'] || 0).toLocaleString();
    document.getElementById('docCardPreauth').textContent = (counts['Preauth'] || 0).toLocaleString();
    document.getElementById('docCardHdPa').textContent = (counts['HD PA'] || 0).toLocaleString();
    document.getElementById('docCardHdCi').textContent = (counts['HD CI'] || 0).toLocaleString();
    document.getElementById('docCardPoints').textContent = totalPoints.toFixed(2);
  }
}

/**
 * Helper to update Breakdown table for Employee or Doctor
 */
function updatePersonTable(type, rows, weights){
  const tbody = document.getElementById(type === 'emp' ? 'empTableBody' : 'docTableBody');
  tbody.innerHTML = '';

  if(rows.length === 0){
    const colCount = type === 'emp' ? 5 : 4;
    tbody.innerHTML = `<tr><td colspan="${colCount}" style="text-align:center;color:#64748b;padding:16px">No cases found for the selected period.</td></tr>`;
    return;
  }

  let counts = {};
  let amounts = {};
  let pointsSum = {};

  rows.forEach(r => {
    const t = r.caseType || 'Other';
    counts[t] = (counts[t] || 0) + 1;
    amounts[t] = (amounts[t] || 0) + (r.amt || 0);
    pointsSum[t] = (pointsSum[t] || 0) + (r.points || 0);
  });

  const sortedTypes = Object.keys(counts).sort((a,b) => counts[b] - counts[a]);
  let grandCases = 0, grandPts = 0, grandAmt = 0;

  sortedTypes.forEach(t => {
    const cnt = counts[t];
    const weight = weights[t] || '—';
    const pts = pointsSum[t] || 0;
    const amt = amounts[t];

    grandCases += cnt;
    grandPts += pts;
    grandAmt += amt;

    const tr = document.createElement('tr');
    if(type === 'emp'){
      tr.innerHTML = `
        <td><b>${t}</b></td>
        <td class="right">${cnt.toLocaleString()}</td>
        <td class="right">${weight}</td>
        <td class="right"><b>${pts.toFixed(2)}</b></td>
        <td class="right">${amt ? '₹' + Math.round(amt).toLocaleString('en-IN') : '—'}</td>
      `;
    } else {
      tr.innerHTML = `
        <td><b>${t}</b></td>
        <td class="right">${cnt.toLocaleString()}</td>
        <td class="right">${weight}</td>
        <td class="right"><b>${pts.toFixed(2)}</b></td>
      `;
    }
    tbody.appendChild(tr);
  });

  // Grand Total row
  const totalRow = document.createElement('tr');
  totalRow.style.background = '#f1f5fa';
  if(type === 'emp'){
    totalRow.innerHTML = `
      <td><b>Grand Total</b></td>
      <td class="right"><b>${grandCases.toLocaleString()}</b></td>
      <td class="right">—</td>
      <td class="right"><b>${grandPts.toFixed(2)}</b></td>
      <td class="right"><b>${grandAmt ? '₹' + Math.round(grandAmt).toLocaleString('en-IN') : '—'}</b></td>
    `;
  } else {
    totalRow.innerHTML = `
      <td><b>Grand Total</b></td>
      <td class="right"><b>${grandCases.toLocaleString()}</b></td>
      <td class="right">—</td>
      <td class="right"><b>${grandPts.toFixed(2)}</b></td>
    `;
  }
  tbody.appendChild(totalRow);
}


/**
 * ==========================================================
 * 5. DYNAMIC SVG WORKFLOW CHART ENGINE (CLICK-INTERACTIVE)
 * ==========================================================
 */
function renderWorkflowChart(type, personName, rows, mode){
  const area = document.getElementById(type === 'emp' ? 'empChartArea' : 'docChartArea');
  const titleEl = document.getElementById(type === 'emp' ? 'empChartTitle' : 'docChartTitle');
  const subEl = document.getElementById(type === 'emp' ? 'empChartSubtitle' : 'docChartSubtitle');

  let labels = [];
  let values = [];
  let title = '';
  let subtitle = '';

  const activeState = (type === 'emp') ? empState : docState;

  if(mode === 'daily'){
    labels = Array.from({length: 31}, (_, i) => String(i + 1));
    values = new Array(31).fill(0);

    const monthFilter = activeState.dailyMonth;
    title = `${personName} — Daily Workflow (1st to 31st)`;
    subtitle = (monthFilter === 'ALL') ? 'Aggregated across all months' : `Month: ${monthFilter}`;

    rows.forEach(r => {
      if(r.day && r.day >= 1 && r.day <= 31){
        if(monthFilter === 'ALL' || r.ymKey === monthFilter){
          values[r.day - 1]++;
        }
      }
    });

  } else if(mode === 'monthly'){
    labels = SHORT_MONTHS;
    values = new Array(12).fill(0);
    title = `${personName} — Monthly Workflow (Jan to Dec)`;
    subtitle = 'Full Year Cumulative Trend (Click any month to filter)';

    rows.forEach(r => {
      if(r.month !== null && r.month >= 0 && r.month < 12){
        values[r.month]++;
      }
    });

  } else if(mode === 'quarterly'){
    labels = ['Q1 (Jan–Mar)', 'Q2 (Apr–Jun)', 'Q3 (Jul–Sep)', 'Q4 (Oct–Dec)'];
    values = [0, 0, 0, 0];
    title = `${personName} — Quarterly Workflow`;
    subtitle = 'Quarterly Breakdown (Click any quarter to filter)';

    rows.forEach(r => {
      if(r.quarter && r.quarter >= 1 && r.quarter <= 4){
        values[r.quarter - 1]++;
      }
    });
  }

  titleEl.textContent = title;
  subEl.textContent = subtitle;

  // Chart dimensions & scaling
  const maxVal = Math.max(...values, 10);
  const minVal = 0;
  const w = 1000, h = 230, padX = 20, padY = 20;
  const step = values.length === 1 ? 0 : (w - padX * 2) / (values.length - 1);

  const pts = values.map((v, i) => {
    const x = padX + i * step;
    const y = h - padY - ((v - minVal) / (maxVal - minVal || 1)) * (h - padY * 2);
    return { x, y, v, label: labels[i], idx: i };
  });

  const polyPoints = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const isDaily = (mode === 'daily');

  // Check which point is currently selected
  let activeIndex = -1;
  if(mode === 'daily' && activeState.dailyDay !== 'ALL'){
    activeIndex = parseInt(activeState.dailyDay) - 1;
  } else if(mode === 'monthly' && activeState.monthlyMonth !== 'ALL'){
    activeIndex = parseInt(activeState.monthlyMonth);
  } else if(mode === 'quarterly' && activeState.quarterlyQuarter !== 'ALL'){
    activeIndex = parseInt(activeState.quarterlyQuarter) - 1;
  }

  // Generate SVG circles
  const circlesHtml = pts.map((p) => {
    const isSelected = (p.idx === activeIndex);
    const radius = isSelected ? 7 : (isDaily ? 3.5 : 5.5);
    const stroke = isSelected ? '#fbbf24' : '#3b82f6';
    const fill = isSelected ? '#fbbf24' : '#ffffff';

    return `
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${radius}" 
        fill="${fill}" stroke="${stroke}" stroke-width="${isSelected ? 3 : 2}" 
        data-label="${p.label}" data-val="${p.v}" data-idx="${p.idx}"
        class="chart-point ${isSelected ? 'active-point' : ''}">
      </circle>
    `;
  }).join('');

  // Values on chart
  const valsHtml = pts.map(p => {
    if(isDaily && p.v === 0) return '';
    const fontSize = isDaily ? (values.length > 20 ? 8 : 10) : 11;
    const textY = Math.max(14, p.y - 8);
    return `<text x="${p.x.toFixed(1)}" y="${textY.toFixed(1)}" text-anchor="middle" fill="#f8fafc" font-size="${fontSize}" font-weight="700">${p.v}</text>`;
  }).join('');

  const xlabelsHtml = labels.map(l => `<span>${l}</span>`).join('');
  const quarterBracketHtml = (mode === 'monthly') ? 
    `<div class="report-quarter-labels"><span>Q1</span><span>Q2</span><span>Q3</span><span>Q4</span></div>` : '';

  area.innerHTML = `
    <!-- Gridlines & Y-Axis Labels -->
    <div class="report-gridline" style="top:0%"></div>
    <div class="report-gridline" style="top:25%"></div>
    <div class="report-gridline" style="top:50%"></div>
    <div class="report-gridline" style="top:75%"></div>
    <div class="report-gridline" style="bottom:0%"></div>

    <div class="report-ylabel" style="top:0%">${maxVal}</div>
    <div class="report-ylabel" style="top:25%">${Math.round(maxVal * 0.75)}</div>
    <div class="report-ylabel" style="top:50%">${Math.round(maxVal * 0.5)}</div>
    <div class="report-ylabel" style="top:75%">${Math.round(maxVal * 0.25)}</div>
    <div class="report-ylabel" style="bottom:0%">0</div>

    <!-- Scalable Vector Graphic -->
    <svg class="report-line-svg" viewBox="0 0 1000 230" preserveAspectRatio="none">
      <polyline points="${polyPoints}" fill="none" stroke="#60a5fa" stroke-width="2.5" vector-effect="non-scaling-stroke"/>
      ${circlesHtml}
      ${valsHtml}
    </svg>

    <!-- X-Axis Labels -->
    <div class="report-xlabels" style="${isDaily ? 'font-size:8px' : 'font-size:10px'}">
      ${xlabelsHtml}
    </div>
    ${quarterBracketHtml}
    <div id="${type}Tooltip" class="chart-tooltip"></div>
  `;

  // Attach tooltips AND click handlers to circles
  const tooltip = document.getElementById(`${type}Tooltip`);
  area.querySelectorAll('.chart-point').forEach(pt => {
    pt.addEventListener('mouseenter', () => {
      const val = pt.getAttribute('data-val');
      const lbl = pt.getAttribute('data-label');
      tooltip.innerHTML = `<b>${lbl}</b>: ${parseInt(val).toLocaleString()} cases<br><small style="color:#64748b">Click to filter cards & table</small>`;
      tooltip.style.display = 'block';
      const rect = pt.getBoundingClientRect();
      const parentRect = area.getBoundingClientRect();
      tooltip.style.left = (rect.left - parentRect.left - 20) + 'px';
      tooltip.style.top = (rect.top - parentRect.top - 46) + 'px';
    });

    pt.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });

    // CLICK ON POINT TO FILTER!
    pt.addEventListener('click', () => {
      const idx = parseInt(pt.getAttribute('data-idx'));
      if(type === 'emp'){
        if(mode === 'daily'){
          empState.dailyDay = String(idx + 1);
          document.getElementById('empDaySelect').value = String(idx + 1);
        } else if(mode === 'monthly'){
          empState.monthlyMonth = String(idx);
          document.getElementById('empMonthSelect').value = String(idx);
        } else if(mode === 'quarterly'){
          empState.quarterlyQuarter = String(idx + 1);
          document.getElementById('empQuarterSelect').value = String(idx + 1);
        }
        renderActiveEmployeeView();
      } else {
        if(mode === 'daily'){
          docState.dailyDay = String(idx + 1);
          document.getElementById('docDaySelect').value = String(idx + 1);
        } else if(mode === 'monthly'){
          docState.monthlyMonth = String(idx);
          document.getElementById('docMonthSelect').value = String(idx);
        } else if(mode === 'quarterly'){
          docState.quarterlyQuarter = String(idx + 1);
          document.getElementById('docQuarterSelect').value = String(idx + 1);
        }
        renderActiveDoctorView();
      }
    });
  });
}


/**
 * ==========================================================
 * 6. DATA EXPORT (CSV & EXCEL)
 * ==========================================================
 */
function exportData(type, format){
  const name = (type === 'employee') ? empState.name : docState.name;
  const allRows = sheetCache[name] || [];

  // Filter rows according to active view
  let rows = [];
  const state = (type === 'employee') ? empState : docState;

  if(state.mode === 'daily'){
    rows = allRows.filter(r => (state.dailyMonth === 'ALL' || r.ymKey === state.dailyMonth) && (state.dailyDay === 'ALL' || String(r.day) === String(state.dailyDay)));
  } else if(state.mode === 'monthly'){
    rows = allRows.filter(r => (state.monthlyMonth === 'ALL' || String(r.month) === String(state.monthlyMonth)));
  } else if(state.mode === 'quarterly'){
    rows = allRows.filter(r => (state.quarterlyQuarter === 'ALL' || String(r.quarter) === String(state.quarterlyQuarter)));
  }

  if(rows.length === 0){
    alert(`No records to export for ${name} under current filter.`);
    return;
  }

  const filename = `${name.replace(/\\s+/g, '_')}_${state.mode.toUpperCase()}_Report`;

  if(format === 'csv'){
    const headers = ['Date', 'Case Number', 'Uploader', 'Hospital', 'Case Type', 'Amount', 'Date of Discharge', 'Points'];
    const csvLines = [headers.join(',')];

    rows.forEach(r => {
      csvLines.push([
        `"${r.rawDate || ''}"`,
        `"${r.caseNum || ''}"`,
        `"${r.uploader || ''}"`,
        `"${r.hospital || ''}"`,
        `"${r.caseType || ''}"`,
        r.amt || 0,
        `"${r.discharge || ''}"`,
        r.points || 0
      ].join(','));
    });

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, `${filename}.csv`);

  } else if(format === 'excel'){
    let tableHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"></head>
      <body>
      <h2>VASUS CLAIM ANALYTICS - ${name.toUpperCase()} (${state.mode.toUpperCase()} VIEW)</h2>
      <table border="1">
        <tr style="background:#173f78;color:#ffffff;font-weight:bold">
          <th>Date</th><th>Case Number</th><th>Uploader</th><th>Hospital</th><th>Case Type</th><th>Amount (INR)</th><th>Discharge</th><th>Points</th>
        </tr>`;

    rows.forEach(r => {
      tableHtml += `<tr>
        <td>${r.rawDate || ''}</td>
        <td style="mso-number-format:'\\@'">${r.caseNum || ''}</td>
        <td>${r.uploader || ''}</td>
        <td>${r.hospital || ''}</td>
        <td>${r.caseType || ''}</td>
        <td>${r.amt || 0}</td>
        <td>${r.discharge || ''}</td>
        <td>${r.points || 0}</td>
      </tr>`;
    });

    tableHtml += `</table></body></html>`;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    triggerDownload(blob, `${filename}.xls`);
  }
}

function triggerDownload(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function syncCurrentTab(){
  // Clear caches
  for(let k in queryCache) delete queryCache[k];

  if(currentActiveTab === 'employee'){
    delete sheetCache[empState.name];
    loadEmployeeData(empState.name);
  } else if(currentActiveTab === 'doctor'){
    delete sheetCache[docState.name];
    loadDoctorData(docState.name);
  } else {
    filterDashboard();
  }
}

function setSyncButtonState(isLoading){
  const btn = document.getElementById('syncBtn');
  if(isLoading){
    btn.classList.add('loading');
    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg> Syncing...`;
  } else {
    btn.classList.remove('loading');
    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg> Sync Live Data`;
  }
}

// Initial Boot
window.addEventListener('DOMContentLoaded', () => {
  // Pre-load employee data in background
  loadEmployeeData('Sirisha');
  if(typeof loadAttendanceFromStorage === 'function') loadAttendanceFromStorage();
});


/**
 * GOLD & SILVER PERFORMANCE MEDALS ENGINE
 */
window.latestLeaderboards = { empList: [], docList: [] };

function getPerformerBadgeHtml(name, type) {
  if(!name || name === 'ALL') return '';
  const topList = (type === 'emp') 
    ? (window.latestLeaderboards ? window.latestLeaderboards.empList : []) 
    : (window.latestLeaderboards ? window.latestLeaderboards.docList : []);
  
  const rank = topList.indexOf(name);
  if(rank === 0){
    return `<span class="badge-gold">🥇 Gold Performer</span>`;
  } else if(rank === 1){
    return `<span class="badge-silver">🥈 Silver Performer</span>`;
  }
  return '';
}

function updatePerformerDropdownDecorations() {
  const empList = window.latestLeaderboards ? window.latestLeaderboards.empList : [];
  const docList = window.latestLeaderboards ? window.latestLeaderboards.docList : [];

  const empSel = document.getElementById('empSelect');
  if(empSel && empList.length >= 2){
    Array.from(empSel.options).forEach(opt => {
      let raw = opt.value;
      if(raw === empList[0]){
        opt.textContent = `🥇 ${raw} (Gold Performer)`;
      } else if(raw === empList[1]){
        opt.textContent = `🥈 ${raw} (Silver Performer)`;
      }
    });
  }

  const docSel = document.getElementById('docSelect');
  if(docSel && docList.length >= 2){
    Array.from(docSel.options).forEach(opt => {
      let raw = opt.value;
      if(raw === docList[0]){
        opt.textContent = `🥇 ${raw} (Gold Performer)`;
      } else if(raw === docList[1]){
        opt.textContent = `🥈 ${raw} (Silver Performer)`;
      }
    });
  }
}


/**
 * 9. ATTENDANCE TRACKER ENGINE
 */
const DEFAULT_ATT_EMPLOYEES = [
  "Ch Praveen Kumar", "SAI CHARAN", "CHANIKYA", "MANI", "NEELIMA",
  "KAVITHA", "VANI", "LAXMINARAYANA", "SIRISHA", "VAIDEHI",
  "SAI KUMAR", "VAISHNAVI", "RAMESH", "PHANI", "DR PRANAY",
  "DR SUNITHA", "DR BINDU", "DR CHINJU", "DR VARUN"
];

let attMonth = 8; // September (0-indexed)
let attYear = 2026;
let attEmployees = [...DEFAULT_ATT_EMPLOYEES];
let attData = {};    // { [empName]: { [day]: 'P'|'WO'|'HO'|'CL'|'L'|'CF' } }
let attRemarks = {}; // { [empName_day]: { comment: '...', author: '...', time: '...' } }
let activeRemarkTarget = null; // { empName, day }

function getAttendanceStorageKey() {
  return `vasus_attendance_${attYear}_${attMonth}`;
}
function getRemarksStorageKey() {
  return `vasus_att_remarks_${attYear}_${attMonth}`;
}
function getEmployeesStorageKey() {
  return `vasus_att_employees_${attYear}_${attMonth}`;
}

function loadAttendanceFromStorage() {
  try {
    const rawEmp = localStorage.getItem(getEmployeesStorageKey());
    if(rawEmp) attEmployees = JSON.parse(rawEmp);
    else attEmployees = [...DEFAULT_ATT_EMPLOYEES];

    const rawData = localStorage.getItem(getAttendanceStorageKey());
    if(rawData) {
      attData = JSON.parse(rawData);
    } else {
      initDefaultAttendanceData();
    }

    const rawRem = localStorage.getItem(getRemarksStorageKey());
    if(rawRem) {
      attRemarks = JSON.parse(rawRem);
    } else {
      initDefaultRemarks();
    }
  } catch(e) {
    console.error('Storage load error:', e);
    initDefaultAttendanceData();
    initDefaultRemarks();
  }
}

function saveAttendanceToStorage() {
  try {
    localStorage.setItem(getAttendanceStorageKey(), JSON.stringify(attData));
    localStorage.setItem(getRemarksStorageKey(), JSON.stringify(attRemarks));
    localStorage.setItem(getEmployeesStorageKey(), JSON.stringify(attEmployees));
  } catch(e) {
    console.error('Storage save error:', e);
  }
}

function initDefaultAttendanceData() {
  attData = {};
  const daysInMonth = new Date(attYear, attMonth + 1, 0).getDate();

  attEmployees.forEach(emp => {
    attData[emp] = {};
    for(let d=1; d<=daysInMonth; d++){
      const date = new Date(attYear, attMonth, d);
      const isSunday = (date.getDay() === 0);
      attData[emp][d] = isSunday ? 'WO' : 'P';
    }
  });

  // Replicate specific screenshot patterns for September 2026
  if(attYear === 2026 && attMonth === 8){
    if(attData['CHANIKYA']) {
      attData['CHANIKYA'][4] = 'CL';
      attData['CHANIKYA'][5] = 'L';
      attData['CHANIKYA'][14] = 'HO';
    }
    if(attData['KAVITHA']) {
      attData['KAVITHA'][5] = 'CF';
      attData['KAVITHA'][14] = 'HO';
    }
    if(attData['VAIDEHI']) {
      attData['VAIDEHI'][1] = 'CL';
      attData['VAIDEHI'][14] = 'HO';
      attData['VAIDEHI'][15] = 'L';
      attData['VAIDEHI'][16] = 'L';
    }
    if(attData['SAI KUMAR']) {
      attData['SAI KUMAR'][17] = 'CF';
    }
    if(attData['PHANI']) {
      attData['PHANI'][1] = 'WO';
      attData['PHANI'][9] = 'WO';
    }
    if(attData['DR PRANAY']) {
      attData['DR PRANAY'][5] = 'WO';
      attData['DR PRANAY'][12] = 'WO';
      attData['DR PRANAY'][14] = 'HO';
    }
    ['MANI', 'NEELIMA', 'VAISHNAVI'].forEach(name => {
      if(attData[name]) attData[name][14] = 'HO';
    });
    if(attData['SAI CHARAN']) {
      attData['SAI CHARAN'][16] = 'CL';
      attData['SAI CHARAN'][17] = 'CF';
    }
    if(attData['LAXMINARAYANA']) {
      attData['LAXMINARAYANA'][16] = 'CL';
    }
  }
}

function initDefaultRemarks() {
  attRemarks = {};
  if(attYear === 2026 && attMonth === 8){
    attRemarks['Ch Praveen Kumar_5'] = {
      comment: 'Permission taken for half day from 2pm (approved)',
      author: 'PRAVEEN KUMAR',
      time: '05-Sep-2026 14:00'
    };
    attRemarks['CHANIKYA_5'] = {
      comment: 'Medical leave certificate submitted for fever',
      author: 'CHANIKYA',
      time: '05-Sep-2026 10:15'
    };
    attRemarks['VAIDEHI_15'] = {
      comment: 'Casual leave approved by Team Lead',
      author: 'VAIDEHI',
      time: '15-Sep-2026 09:30'
    };
  }
}

function onAttendanceMonthChange() {
  attMonth = parseInt(document.getElementById('attMonthSelect').value);
  attYear = parseInt(document.getElementById('attYearSelect').value);
  loadAttendanceFromStorage();
  renderAttendanceGrid();
}

function renderAttendanceGrid() {
  loadAttendanceFromStorage();

  const titleEl = document.getElementById('attSheetTitle');
  const mName = MONTH_NAMES[attMonth];
  if(titleEl) titleEl.textContent = `Attendance Sheet for ${mName}-${attYear}`;

  const thead = document.getElementById('attGridThead');
  const tbody = document.getElementById('attGridTbody');
  if(!thead || !tbody) return;

  const daysInMonth = new Date(attYear, attMonth + 1, 0).getDate();
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Build thead
  let row1 = '<tr><th class="col-emp" rowspan="2" style="vertical-align:middle">Employees</th>';
  let row2 = '<tr>';

  for(let d=1; d<=daysInMonth; d++){
    const date = new Date(attYear, attMonth, d);
    const dayOfWeek = DAY_NAMES[date.getDay()];
    const isSunday = (date.getDay() === 0);
    const dStr = String(d).padStart(2, '0') + '-' + SHORT_MONTHS[attMonth];

    const dayClass = isSunday ? 'att-header-sunday' : 'att-header-day';
    row1 += `<th class="${dayClass}">${dayOfWeek}</th>`;
    row2 += `<th class="att-header-date ${isSunday ? 'att-header-sunday' : ''}">${dStr}</th>`;
  }

  // Summary headers
  row1 += `
    <th rowspan="2" style="vertical-align:middle;font-size:10px">Total<br>Days</th>
    <th rowspan="2" style="color:#10b981;vertical-align:middle;font-size:10px">P</th>
    <th rowspan="2" style="color:#ef4444;vertical-align:middle;font-size:10px">L</th>
    <th rowspan="2" style="color:#06b6d4;vertical-align:middle;font-size:10px">CL</th>
    <th rowspan="2" style="color:#ec4899;vertical-align:middle;font-size:10px">WO</th>
    <th rowspan="2" style="color:#d946ef;vertical-align:middle;font-size:10px">HO</th>
    <th rowspan="2" style="color:#a855f7;vertical-align:middle;font-size:10px">CF</th>
  </tr>`;
  row2 += `</tr>`;

  thead.innerHTML = row1 + row2;

  // Build tbody
  let bodyHtml = '';
  attEmployees.forEach(emp => {
    let pCount = 0, lCount = 0, clCount = 0, woCount = 0, hoCount = 0, cfCount = 0;
    let cellsHtml = '';

    if(!attData[emp]) attData[emp] = {};

    for(let d=1; d<=daysInMonth; d++){
      const status = attData[emp][d] || 'P';
      const remKey = `${emp}_${d}`;
      const remarkObj = attRemarks[remKey];
      const hasRemark = Boolean(remarkObj && remarkObj.comment);

      if(status === 'P') pCount++;
      else if(status === 'L') lCount++;
      else if(status === 'CL') clCount++;
      else if(status === 'WO') woCount++;
      else if(status === 'HO') hoCount++;
      else if(status === 'CF') cfCount++;

      const remClass = hasRemark ? 'att-has-remark' : '';
      const tooltip = hasRemark ? `title="${emp} (Day ${d}): ${remarkObj.comment}"` : `title="Click to edit status or add remark"`;

      cellsHtml += `<td class="att-cell att-${status} ${remClass}" ${tooltip} onclick="openRemarkModal('${emp.replace(/'/g, "\\'")}', ${d})">${status}</td>`;
    }

    bodyHtml += `
      <tr>
        <td class="col-emp"><b>${emp}</b></td>
        ${cellsHtml}
        <td style="font-weight:700">${daysInMonth}</td>
        <td style="font-weight:700;color:#10b981">${pCount}</td>
        <td style="font-weight:700;color:#ef4444">${lCount}</td>
        <td style="font-weight:700;color:#06b6d4">${clCount}</td>
        <td style="font-weight:700;color:#ec4899">${woCount}</td>
        <td style="font-weight:700;color:#d946ef">${hoCount}</td>
        <td style="font-weight:700;color:#a855f7">${cfCount}</td>
      </tr>
    `;
  });

  tbody.innerHTML = bodyHtml;
}

/**
 * ATTENDANCE REMARK / COMMENT MODAL (MATCHING IMAGE 3)
 */
function openRemarkModal(empName, day) {
  activeRemarkTarget = { empName, day };

  document.getElementById('remarkEmpName').textContent = empName.toUpperCase();
  const dStr = String(day).padStart(2, '0') + '-' + SHORT_MONTHS[attMonth] + '-' + attYear;
  document.getElementById('remarkCellDate').textContent = `${dStr} • Daily Attendance Record`;

  const currStatus = (attData[empName] && attData[empName][day]) ? attData[empName][day] : 'P';
  document.getElementById('remarkStatusSelect').value = currStatus;

  const remKey = `${empName}_${day}`;
  const existing = attRemarks[remKey];
  const textarea = document.getElementById('remarkTextarea');
  const deleteBtn = document.getElementById('btnDeleteRemark');

  if(existing && existing.comment){
    textarea.value = existing.comment;
    if(deleteBtn) deleteBtn.style.display = 'block';
  } else {
    textarea.value = '';
    if(deleteBtn) deleteBtn.style.display = 'none';
  }

  document.getElementById('remarkModal').style.display = 'flex';
  setTimeout(() => textarea.focus(), 50);
}

function closeRemarkModal() {
  document.getElementById('remarkModal').style.display = 'none';
  activeRemarkTarget = null;
}

function saveCurrentRemark() {
  if(!activeRemarkTarget) return;
  const { empName, day } = activeRemarkTarget;
  const newStatus = document.getElementById('remarkStatusSelect').value;
  const comment = document.getElementById('remarkTextarea').value.trim();

  if(!attData[empName]) attData[empName] = {};
  attData[empName][day] = newStatus;

  const remKey = `${empName}_${day}`;
  if(comment) {
    attRemarks[remKey] = {
      comment,
      author: empName.toUpperCase(),
      time: new Date().toLocaleString()
    };
  } else {
    delete attRemarks[remKey];
  }

  saveAttendanceToStorage();
  closeRemarkModal();
  renderAttendanceGrid();
}

function deleteCurrentRemark() {
  if(!activeRemarkTarget) return;
  const { empName, day } = activeRemarkTarget;
  const remKey = `${empName}_${day}`;
  delete attRemarks[remKey];
  saveAttendanceToStorage();
  closeRemarkModal();
  renderAttendanceGrid();
}

function promptAddNewEmployee() {
  const name = prompt('Enter staff or doctor name to add to attendance roster:');
  if(!name || !name.trim()) return;
  const clean = name.trim();
  if(!attEmployees.includes(clean)) {
    attEmployees.push(clean);
    saveAttendanceToStorage();
    renderAttendanceGrid();
    showNotification(`Added <b>${clean}</b> to attendance roster.`, 'success');
  }
}

/**
 * UPLOAD MONTHLY EXCEL FILE FOR ATTENDANCE
 */
function handleAttendanceExcelUpload(input) {
  const file = input.files[0];
  if(!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      if(typeof XLSX === 'undefined') {
        alert('SheetJS (XLSX) library is loading. Please try again in a moment or verify connection.');
        return;
      }
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if(!rows || rows.length < 2) {
        alert('Uploaded Excel file seems empty or has an invalid structure.');
        return;
      }

      let parsedCount = 0;
      rows.forEach((row, rIdx) => {
        if(rIdx < 2 || !row[0]) return;
        const empName = String(row[0]).trim();
        if(!empName || empName.toLowerCase().includes('month') || empName.toLowerCase().includes('employee')) return;

        if(!attEmployees.includes(empName)) {
          attEmployees.push(empName);
        }
        if(!attData[empName]) attData[empName] = {};

        for(let c=1; c<row.length && c<=31; c++){
          const val = String(row[c] || '').trim().toUpperCase();
          if(['P','L','CL','WO','HO','CF'].includes(val)){
            attData[empName][c] = val;
          }
        }
        parsedCount++;
      });

      saveAttendanceToStorage();
      renderAttendanceGrid();
      showNotification(`Successfully uploaded attendance for <b>${parsedCount} employees</b> from Excel file!`, 'success');
    } catch(err) {
      console.error('Excel parse error:', err);
      alert('Could not parse Excel file: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
  input.value = '';
}

/**
 * DOWNLOAD ATTENDANCE TO EXCEL
 */
function exportAttendanceData(format) {
  const daysInMonth = new Date(attYear, attMonth + 1, 0).getDate();
  const mName = MONTH_NAMES[attMonth];
  const filename = `Vasus_Attendance_${mName}_${attYear}`;

  let html = `<html><head><meta charset="utf-8"></head><body>`;
  html += `<h2>Attendance Sheet for ${mName}-${attYear}</h2>`;
  html += `<table border="1"><thead><tr><th>Employees</th>`;

  for(let d=1; d<=daysInMonth; d++){
    html += `<th>${String(d).padStart(2,'0')}-${SHORT_MONTHS[attMonth]}</th>`;
  }
  html += `<th>Total Days</th><th>P</th><th>L</th><th>CL</th><th>WO</th><th>HO</th><th>CF</th><th>Remarks</th></tr></thead><tbody>`;

  attEmployees.forEach(emp => {
    let pCount = 0, lCount = 0, clCount = 0, woCount = 0, hoCount = 0, cfCount = 0;
    let daysCells = '';
    const empRemarks = [];

    for(let d=1; d<=daysInMonth; d++){
      const status = (attData[emp] && attData[emp][d]) ? attData[emp][d] : 'P';
      const rem = attRemarks[`${emp}_${d}`];
      if(rem && rem.comment) empRemarks.push(`Day ${d}: ${rem.comment}`);

      if(status === 'P') pCount++;
      else if(status === 'L') lCount++;
      else if(status === 'CL') clCount++;
      else if(status === 'WO') woCount++;
      else if(status === 'HO') hoCount++;
      else if(status === 'CF') cfCount++;

      daysCells += `<td align="center">${status}</td>`;
    }

    html += `<tr>
      <td><b>${emp}</b></td>
      ${daysCells}
      <td>${daysInMonth}</td>
      <td>${pCount}</td>
      <td>${lCount}</td>
      <td>${clCount}</td>
      <td>${woCount}</td>
      <td>${hoCount}</td>
      <td>${cfCount}</td>
      <td>${empRemarks.join('; ')}</td>
    </tr>`;
  });

  html += `</tbody></table></body></html>`;
  const blob = new Blob([html

/**
 * ==========================================================
 * 10. PACKAGE MASTER ENGINE (KASP & MEDISEP PROCEDURES)
 * ==========================================================
 */
let pkgSchemeFilter = 'ALL';
let pkgSearchText = '';
let pkgSpecialtyFilter = 'ALL';
let pkgTypeFilter = 'ALL';
let pkgPage = 1;
let pkgPageSize = 50;
let pkgDebounceTimer = null;
let currentFilteredPackages = [];

function getRawPackageList() {
  if(!window.PACKAGE_MASTER_DATA) return [];
  const med = (window.PACKAGE_MASTER_DATA.medisep || []);
  const kasp = (window.PACKAGE_MASTER_DATA.kasp || []);
  return [...med, ...kasp];
}

function initPackageMasterTab() {
  const all = getRawPackageList();
  if(all.length === 0){
    console.warn('PACKAGE_MASTER_DATA not yet loaded.');
    const tbody = document.getElementById('pkgMasterTableBody');
    if(tbody) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted)">Package Master database not loaded. Ensure package_master_data.js is present.</td></tr>`;
    }
    return;
  }

  // Populate Specialties dropdown
  const specSet = new Set();
  all.forEach(p => { if(p.sp) specSet.add(p.sp.trim()); });
  const sortedSpec = Array.from(specSet).sort();

  const sel = document.getElementById('pkgSpecialtyFilter');
  if(sel && sel.options.length <= 1){
    sortedSpec.forEach(s => {
      sel.innerHTML += `<option value="${s}">${s}</option>`;
    });
  }

  renderPackageMasterTable();
}

function setPkgSchemeFilter(scheme) {
  pkgSchemeFilter = scheme;
  ['btnPkgAll','btnPkgMedisep','btnPkgKasp'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.classList.remove('active');
  });
  if(scheme === 'ALL') { const el = document.getElementById('btnPkgAll'); if(el) el.classList.add('active'); }
  if(scheme === 'MEDISEP') { const el = document.getElementById('btnPkgMedisep'); if(el) el.classList.add('active'); }
  if(scheme === 'KASP') { const el = document.getElementById('btnPkgKasp'); if(el) el.classList.add('active'); }

  pkgPage = 1;
  renderPackageMasterTable();
}

function onPkgSearchChange() {
  clearTimeout(pkgDebounceTimer);
  pkgDebounceTimer = setTimeout(() => {
    const inp = document.getElementById('pkgSearchInput');
    pkgSearchText = (inp ? inp.value : '').trim().toLowerCase();
    pkgPage = 1;
    renderPackageMasterTable();
  }, 120);
}

function onPkgFilterChange() {
  const sSel = document.getElementById('pkgSpecialtyFilter');
  const tSel = document.getElementById('pkgTypeFilter');
  if(sSel) pkgSpecialtyFilter = sSel.value;
  if(tSel) pkgTypeFilter = tSel.value;
  pkgPage = 1;
  renderPackageMasterTable();
}

function onPkgPageSizeChange() {
  const sel = document.getElementById('pkgPageSizeSelect');
  pkgPageSize = parseInt(sel ? sel.value : 50) || 50;
  pkgPage = 1;
  renderPackageMasterTable();
}

function navigatePkgPage(delta) {
  pkgPage += delta;
  if(pkgPage < 1) pkgPage = 1;
  renderPackageMasterTable();
}

function renderPackageMasterTable() {
  const all = getRawPackageList();
  const tbody = document.getElementById('pkgMasterTableBody');
  const countText = document.getElementById('pkgResultCountText');
  const pageText = document.getElementById('pkgPaginationText');
  const prevBtn = document.getElementById('btnPkgPrev');
  const nextBtn = document.getElementById('btnPkgNext');

  if(!tbody) return;

  if(all.length === 0){
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted)">Package Master database not loaded. Ensure package_master_data.js is present.</td></tr>`;
    return;
  }

  // Filter
  const filtered = all.filter(p => {
    if(pkgSchemeFilter === 'MEDISEP' && p.s !== 'MEDISEP') return false;
    if(pkgSchemeFilter === 'KASP' && p.s !== 'KASP') return false;

    if(pkgSpecialtyFilter !== 'ALL' && p.sp !== pkgSpecialtyFilter) return false;
    if(pkgTypeFilter !== 'ALL' && p.t && !p.t.toLowerCase().includes(pkgTypeFilter.toLowerCase())) return false;

    if(pkgSearchText){
      const codeMatch = (p.c || '').toLowerCase().includes(pkgSearchText);
      const procMatch = (p.pr || '').toLowerCase().includes(pkgSearchText);
      const pkgMatch = (p.p || '').toLowerCase().includes(pkgSearchText);
      const specMatch = (p.sp || '').toLowerCase().includes(pkgSearchText);
      if(!codeMatch && !procMatch && !pkgMatch && !specMatch) return false;
    }

    return true;
  });

  currentFilteredPackages = filtered;
  if(countText) countText.textContent = `Showing ${filtered.length.toLocaleString()} matching packages (Total: ${all.length.toLocaleString()})`;

  const totalPages = Math.ceil(filtered.length / pkgPageSize) || 1;
  if(pkgPage > totalPages) pkgPage = totalPages;
  if(pageText) pageText.textContent = `Page ${pkgPage} of ${totalPages}`;

  if(prevBtn) prevBtn.disabled = (pkgPage <= 1);
  if(nextBtn) nextBtn.disabled = (pkgPage >= totalPages);

  if(filtered.length === 0){
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted)">No packages match your search criteria.</td></tr>`;
    return;
  }

  const startIdx = (pkgPage - 1) * pkgPageSize;
  const pageItems = filtered.slice(startIdx, startIdx + pkgPageSize);

  let html = '';
  pageItems.forEach(p => {
    const isMed = (p.s === 'MEDISEP');
    const schemeBadge = isMed 
      ? '<span class="pill pill-blue">MEDISEP</span>' 
      : '<span class="pill pill-green">KASP</span>';

    // Pricing display
    let rateHtml = '';
    if(isMed) {
      const r0 = p.r0 && p.r0 !== 'NA' ? `₹${Number(p.r0).toLocaleString()}` : (p.r0 || '-');
      const r2 = p.r2 && p.r2 !== 'NA' ? `₹${Number(p.r2).toLocaleString()}` : (p.r2 || '-');
      rateHtml = `<div style="font-size:11px"><b>NABH:</b> ${r2} <br><span style="color:var(--text-muted)">Non-NABH: ${r0}</span></div>`;
    } else {
      const price = p.price && !isNaN(p.price) ? `₹${Number(p.price).toLocaleString()}` : (p.price || '-');
      rateHtml = `<div style="font-size:12px;font-weight:800;color:var(--green)">${price}</div>`;
    }

    // Implants
    let impHtml = '-';
    if(isMed && p.imp && p.imp !== 'NA'){
      impHtml = `<span style="font-size:10px" title="${p.imp}">${p.imp.slice(0, 22)}...</span>`;
    } else if(!isMed && p.imp === 'Yes'){
      impHtml = `<span class="pill pill-orange">Implants</span>`;
    }

    // Docs / Details button
    const safeCode = (p.c || '').replace(/'/g, "\\'");
    const safeScheme = (p.s || '').replace(/'/g, "\\'");
    const docBtn = `<button class="secondary-btn" style="padding:4px 8px;font-size:10px" onclick="openPkgDocModal('${safeCode}', '${safeScheme}')">View Details</button>`;

    html += `
      <tr>
        <td>${schemeBadge}</td>
        <td><span class="pkg-code-badge" onclick="navigator.clipboard.writeText('${safeCode}');showNotification('Copied ${safeCode} to clipboard!','success')" title="Click to copy code">${p.c}</span></td>
        <td style="font-weight:600">${p.sp}</td>
        <td>
          <div style="font-weight:700;color:var(--text-main)">${p.pr || p.p}</div>
          <div style="font-size:11px;color:var(--text-muted)">${p.p}</div>
        </td>
        <td style="text-align:center;font-weight:700">${p.l || '-'}</td>
        <td>${rateHtml}</td>
        <td>${impHtml}</td>
        <td style="text-align:center">${docBtn}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

/**
 * PACKAGE DETAILS & DOCUMENTS MODAL
 */
function openPkgDocModal(code, scheme) {
  const all = getRawPackageList();
  const pkg = all.find(p => p.c === code && p.s === scheme);
  if(!pkg) return;

  const schemeEl = document.getElementById('modalPkgScheme');
  if(schemeEl) {
    schemeEl.textContent = pkg.s;
    schemeEl.className = (pkg.s === 'MEDISEP') ? 'pill pill-blue' : 'pill pill-green';
  }
  const codeEl = document.getElementById('modalPkgCode');
  if(codeEl) codeEl.textContent = pkg.c;
  const nameEl = document.getElementById('modalPkgName');
  if(nameEl) nameEl.textContent = pkg.pr || pkg.p;
  const specEl = document.getElementById('modalPkgSpecialty');
  if(specEl) specEl.textContent = `${pkg.sp} • Length of Stay: ${pkg.l || 'NA'} Days`;

  const preEl = document.getElementById('modalPreAuthDocs');
  const clmEl = document.getElementById('modalClaimDocs');
  const rateBox = document.getElementById('modalRateDetailsBox');

  if(pkg.s === 'KASP') {
    if(preEl) preEl.innerHTML = pkg.d_pre ? pkg.d_pre.replace(/\n/g, '<br>') : 'Standard clinical notes and identity documentation.';
    if(clmEl) clmEl.innerHTML = pkg.d_clm ? pkg.d_clm.replace(/\n/g, '<br>') : 'Detailed discharge summary, operation notes, diagnostic reports, and final bill.';
    if(rateBox) rateBox.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span><b>Approved Package Price:</b></span>
        <span style="font-size:16px;font-weight:800;color:var(--green)">₹${Number(pkg.price || 0).toLocaleString()}</span>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:4px">
        Implants Applicable: <b>${pkg.imp || 'No'}</b> • Stratification Criteria: <b>${pkg.strat || 'No'}</b>
      </div>
    `;
  } else {
    if(preEl) preEl.innerHTML = 'Pre-authorization checklist per MEDISEP clinical guidelines: Clinical diagnosis, specialist recommendation, and identity card.';
    if(clmEl) clmEl.innerHTML = 'Claim settlement documents: Original discharge summary, itemized pharmacy bills, diagnostic reports, and hospital bill with NABH status.';
    if(rateBox) rateBox.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
        <div style="background:var(--card-bg);padding:6px;border-radius:6px;border:1px solid var(--border)">
          <div style="font-size:10px;color:var(--text-muted)">NON-NABH RATE</div>
          <div style="font-size:13px;font-weight:800">₹${Number(pkg.r0 || 0).toLocaleString()}</div>
        </div>
        <div style="background:var(--card-bg);padding:6px;border-radius:6px;border:1px solid var(--border)">
          <div style="font-size:10px;color:var(--text-muted)">ENTRY NABH</div>
          <div style="font-size:13px;font-weight:800">₹${Number(pkg.r1 || 0).toLocaleString()}</div>
        </div>
        <div style="background:var(--card-bg);padding:6px;border-radius:6px;border:1px solid var(--blue)">
          <div style="font-size:10px;color:var(--blue)">FULL NABH / GOVT</div>
          <div style="font-size:13px;font-weight:800;color:var(--blue)">₹${Number(pkg.r2 || 0).toLocaleString()}</div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:8px">
        Implant: <b>${pkg.imp || 'NA'}</b> • Max Cost: <b>${pkg.ic || 'NA'}</b> • Type: <b>${pkg.t || 'Regular'}</b>
      </div>
    `;
  }

  const modal = document.getElementById('pkgDocModal');
  if(modal) modal.style.display = 'flex';
}

function closePkgDocModal() {
  const modal = document.getElementById('pkgDocModal');
  if(modal) modal.style.display = 'none';
}

function exportPackageMasterData() {
  const list = currentFilteredPackages.length > 0 ? currentFilteredPackages : getRawPackageList();
  if(list.length === 0){
    alert('No packages available to export.');
    return;
  }

  const filename = `Vasus_Package_Master_${pkgSchemeFilter}`;
  let html = `<html><head><meta charset="utf-8"></head><body><table border="1">`;
  html += `<tr><th>Scheme</th><th>Code</th><th>Specialty</th><th>Package Name</th><th>Procedure Name</th><th>LOS</th><th>Rates / Price</th><th>Implants</th><th>Pre-Auth Docs</th><th>Claim Docs</th></tr>`;

  list.forEach(p => {
    const rate = (p.s === 'MEDISEP') ? `Full NABH: ${p.r2}, Entry: ${p.r1}, Non-NABH: ${p.r0}` : (p.price || '');
    html += `<tr>
      <td>${p.s}</td>
      <td>${p.c}</td>
      <td>${p.sp}</td>
      <td>${p.p}</td>
      <td>${p.pr}</td>
      <td>${p.l || ''}</td>
      <td>${rate}</td>
      <td>${p.imp || ''}</td>
      <td>${p.d_pre || ''}</td>
      <td>${p.d_clm || ''}</td>
    </tr>`;
  });

  html += `</table></body></html>`;
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  triggerDownload(blob, `${filename}.xls`);
}



