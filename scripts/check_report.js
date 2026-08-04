/**
 * check_report.js
 * Runs data consistency checks on the weekly report HTML.
 *
 * Usage:
 *   node check_report.js <html-file> [--csat <csat-json>]
 *
 * Checks:
 *  1. 周度总PC = 咨询PC + 转化PC per agent
 *  2. Individual Summary CSAT vs workspace csat json (if provided)
 *  3. 月度总PC has rank-top on top 3 (not more, not fewer)
 *  4. 业绩分析: 零PC line should not exist if all agents have PC > 0
 *  5. 业绩分析: Email CSAT bucket (亮点 vs 异常) matches actual value
 *  6. 业绩分析: 综合满意度低于84% list matches csat json (if provided)
 *  7. 月度个人PC汇总 section should not exist
 */

const fs = require('fs');

const args = process.argv.slice(2);
const htmlFile = args[0];
const csatIdx = args.indexOf('--csat');
const csatFile = csatIdx !== -1 ? args[csatIdx + 1] : null;

if (!htmlFile) {
  console.error('Usage: node check_report.js <html-file> [--csat <csat-json>]');
  process.exit(1);
}

const html = fs.readFileSync(htmlFile, 'utf8');
const csatData = csatFile ? JSON.parse(fs.readFileSync(csatFile, 'utf8')) : null;

let errors = 0;
let warnings = 0;

function ok(msg) { console.log('  ✓ ' + msg); }
function err(msg) { console.log('  ✗ ERROR: ' + msg); errors++; }
function warn(msg) { console.log('  ! WARN:  ' + msg); warnings++; }

// ─── Extract Individual Summary table ────────────────────────────────────────
function getSummaryRows() {
  const si = html.indexOf('Individual Summary');
  const ts = html.indexOf('<table', si);
  const te = html.indexOf('</table>', ts) + 8;
  const table = html.slice(ts, te);
  const rows = [...table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)];
  return rows.map(r => {
    const tds = [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => ({
      text: m[1].replace(/<[^>]+>/g, '').trim().replace(/[▲▼][^%\d].*$/, '').trim(),
      raw: m[0],
    }));
    return tds;
  }).filter(r => r.length >= 8 && r[0].text && /^[a-z]/.test(r[0].text));
}

// ─── Check 1: 月度个人PC汇总 should not exist ──────────────────────────────────
console.log('\n[1] 月度个人PC汇总 section');
if (html.includes('月度个人PC汇总')) {
  err('月度个人PC汇总 section still present — run patch_corrections.js to remove it');
} else {
  ok('Not present');
}

// ─── Check 2: 周度总PC = 咨询PC + 转化PC ─────────────────────────────────────
console.log('\n[2] 周度总PC = 咨询PC + 转化PC');
const rows = getSummaryRows();
for (const r of rows) {
  const name = r[0].text;
  const consultPC = parseInt(r[2].text) || 0;
  const convPC = parseInt(r[3].text) || 0;
  const weeklyTotal = parseInt(r[4].text) || 0;
  const expected = consultPC + convPC;
  if (weeklyTotal !== expected) {
    err(name + ': 周度总PC=' + weeklyTotal + ', 咨询(' + consultPC + ')+转化(' + convPC + ')=' + expected);
  } else {
    ok(name + ': ' + consultPC + '+' + convPC + '=' + weeklyTotal);
  }
}

// ─── Check 3: Individual Summary CSAT vs csat json ───────────────────────────
console.log('\n[3] Individual Summary CSAT vs workspace csat');
if (!csatData) {
  warn('No csat json provided — skipping CSAT check (pass --csat csat_YYYY-MM-DD.json)');
} else {
  for (const r of rows) {
    const name = r[0].text;
    const htmlCsat = r[5].text;
    if (!csatData[name]) { warn(name + ': not in csat json'); continue; }
    const jsonCsat = csatData[name].csat + '%';
    if (htmlCsat !== jsonCsat) {
      err(name + ': HTML=' + htmlCsat + ', json=' + jsonCsat);
    } else {
      ok(name + ': ' + htmlCsat);
    }
  }
}

// ─── Check 4: 月度总PC rank-top = exactly top 3 ──────────────────────────────
console.log('\n[4] 月度总PC rank-top = top 3');
const si = html.indexOf('Individual Summary');
const ts = html.indexOf('<table', si);
const te = html.indexOf('</table>', ts) + 8;
const table = html.slice(ts, te);
const tableRows = [...table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)];
const monthlyPCs = [];
for (const r of tableRows) {
  const tds = [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)];
  if (tds.length < 9) continue;
  const name = tds[0][1].replace(/<[^>]+>/g, '').trim();
  if (!name || !/^[a-z]/.test(name)) continue;
  // monthTotalPC is second-to-last if KPI column present (10 cols), else last (9 cols)
  const monthTdIdx = tds.length >= 10 ? tds.length - 2 : tds.length - 1;
  const lastTd = tds[monthTdIdx];
  const val = parseInt(lastTd[1].replace(/<[^>]+>/g, '').trim()) || 0;
  const isTop = lastTd[0].includes('rank-top');
  monthlyPCs.push({ name, val, isTop });
}
const sorted = [...monthlyPCs].sort((a, b) => b.val - a.val);
const top3Names = new Set(sorted.slice(0, 3).map(x => x.name));
let rankTopCount = 0;
for (const { name, val, isTop } of monthlyPCs) {
  if (isTop) rankTopCount++;
  if (top3Names.has(name) && !isTop) {
    err(name + '(月度PC=' + val + ') should be rank-top but is not');
  } else if (!top3Names.has(name) && isTop) {
    err(name + '(月度PC=' + val + ') has rank-top but is not in top 3');
  } else if (isTop) {
    ok(name + ': rank-top, val=' + val);
  }
}
if (rankTopCount !== 3) {
  err('rank-top count = ' + rankTopCount + ', expected 3');
} else {
  ok('Exactly 3 rank-top cells');
}

// ─── Check 5: 零PC line ───────────────────────────────────────────────────────
console.log('\n[5] 零PC line in 业绩分析');
const zeroPcMatch = html.match(/本周 PC 为 0 Zero PC this week：([^<]+)/);
if (zeroPcMatch) {
  const listed = zeroPcMatch[1].trim();
  // Verify against actual weekly totals
  const zeroActual = rows.filter(r => parseInt(r[4].text) === 0).map(r => r[0].text);
  if (zeroActual.length === 0) {
    err('零PC line exists but all agents have PC > 0: "' + listed + '"');
  } else {
    warn('零PC line lists: ' + listed + ' | Actual zero-PC agents: ' + zeroActual.join(', '));
  }
} else {
  ok('No 零PC line');
}

// ─── Check 6: Email CSAT bucket (亮点 vs 异常) ────────────────────────────────
console.log('\n[6] Email CSAT bucket');
const emailHighlight = html.match(/邮件满意度 Email CSAT <strong>([\d.]+%)<\/strong>，达成目标/);
const emailIssue = html.match(/邮件满意度 Email CSAT <strong>([\d.]+%)<\/strong>，低于目标/);
if (!emailHighlight && !emailIssue) {
  warn('Email CSAT not found in 业绩分析');
} else if (emailHighlight) {
  const val = parseFloat(emailHighlight[1]);
  if (val < 84) {
    err('Email CSAT ' + emailHighlight[1] + ' < 84% but is in 亮点 — should be in 异常');
  } else {
    ok('Email CSAT ' + emailHighlight[1] + ' in 亮点 (≥84%)');
  }
} else {
  const val = parseFloat(emailIssue[1]);
  if (val >= 84) {
    err('Email CSAT ' + emailIssue[1] + ' ≥ 84% but is in 异常 — should be in 亮点');
  } else {
    ok('Email CSAT ' + emailIssue[1] + ' in 异常 (<84%)');
  }
}

// ─── Check 7: 综合满意度低于84% matches csat json ────────────────────────────
console.log('\n[7] 综合满意度低于84% list');
if (!csatData) {
  warn('No csat json — skipping');
} else {
  const listedMatch = html.match(/综合满意度低于 Overall CSAT below 84%：([^<]+(?:<strong>[^<]*<\/strong>[^<]*)*)/);
  if (!listedMatch) {
    warn('综合满意度 line not found');
  } else {
    const listedText = listedMatch[0].replace(/<[^>]+>/g, '');
    const actualBelow = Object.entries(csatData)
      .filter(([, d]) => parseFloat(d.csat) < 84)
      .map(([name, d]) => ({ name, csat: d.csat + '%' }));

    for (const { name, csat } of actualBelow) {
      if (!listedText.includes(name)) {
        err(name + '(CSAT=' + csat + ') should be in 综合满意度 list but is missing');
      } else {
        ok(name + '(' + csat + ') present');
      }
    }
    // Check for agents listed but shouldn't be
    for (const r of rows) {
      const name = r[0].text;
      if (!csatData[name]) continue;
      const csat = parseFloat(csatData[name].csat);
      if (csat >= 84 && listedText.includes(name)) {
        err(name + '(CSAT=' + csatData[name].csat + '%) is listed but CSAT ≥ 84%');
      }
    }
  }
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n─────────────────────────────────');
if (errors === 0 && warnings === 0) {
  console.log('All checks passed.');
} else {
  console.log('Errors: ' + errors + '  Warnings: ' + warnings);
  if (errors > 0) process.exit(1);
}
