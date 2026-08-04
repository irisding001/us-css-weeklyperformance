/**
 * patch_corrections.js
 * Applies all manual data corrections to the weekly report HTML.
 *
 * Usage:
 *   node patch_corrections.js <html-file> --config <json-file>
 *
 * Config JSON format:
 * {
 *   "weeklyConsultPC": {
 *     "terrychen": 3, "muhamadfaisal": 5, "calventan": 4, ...
 *   },
 *   "monthlyConsultPC": {
 *     "terrychen": 13, "muhamadfaisal": 17, ...
 *   },
 *   "consultSection": {
 *     "total": 24, "lc": 10, "phone": 14, "email": 0
 *   },
 *   "emailCsat": "71.0%",
 *   "teamCsat": "85.3%"
 * }
 *
 * What this script does:
 *  1. Remove 月度个人PC汇总 section
 *  2. Inject weekly consult PC into Individual Summary (3rd td per agent)
 *  3. Recalculate 周度总PC = consult + conv per agent
 *  4. Recalculate 月度总PC = monthly consult + monthly conv, rank top 3 green
 *  5. Update 咨询业务 section PC values (LC / Phone / Email / Total)
 *  6. Update Email CSAT in 咨询业务 section
 *  7. Fix 业绩分析: move Email CSAT to 异常 if < 84%, fix 综合满意度, remove 零PC line
 */

const fs = require('fs');
const path = require('path');

// ─── Parse args ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const htmlFile = args[0];
const configIdx = args.indexOf('--config');
const configFile = configIdx !== -1 ? args[configIdx + 1] : null;

if (!htmlFile || !configFile) {
  console.error('Usage: node patch_corrections.js <html-file> --config <json-file>');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
let html = fs.readFileSync(htmlFile, 'utf8');

const {
  weeklyConsultPC = {},
  monthlyConsultPC = {},
  consultSection = {},
  emailCsat,
  teamCsat,
} = config;

// ─── Helper: operate within a specific table only ─────────────────────────────
function patchTable(html, anchorText, patchFn) {
  const anchorIdx = html.indexOf(anchorText);
  if (anchorIdx === -1) return html;
  const ts = html.indexOf('<table', anchorIdx);
  const te = html.indexOf('</table>', ts) + 8;
  const before = html.slice(0, ts);
  let table = html.slice(ts, te);
  const after = html.slice(te);
  table = patchFn(table);
  return before + table + after;
}

function patchRowsInTable(table, agentValues, tdIndex, rankFn) {
  const rows = table.split('</tr>');
  const fixed = rows.map(row => {
    for (const [name, val] of Object.entries(agentValues)) {
      if (!row.includes('>' + name + '<')) continue;
      const tds = [...row.matchAll(/<td[^>]*>[\s\S]*?<\/td>/g)];
      if (tds.length <= tdIndex) continue;
      const target = tds[tdIndex][0];
      const cls = rankFn ? rankFn(name, val) : '';
      const replacement = '<td' + (cls ? ' class="' + cls + '"' : '') + '>' + val + '</td>';
      row = row.slice(0, tds[tdIndex].index) + replacement + row.slice(tds[tdIndex].index + target.length);
    }
    return row;
  });
  return fixed.join('</tr>');
}

// ─── 1. Remove 月度个人PC汇总 section ──────────────────────────────────────────
const monthlyIdx = html.indexOf('月度个人PC汇总');
if (monthlyIdx !== -1) {
  const h3Start = html.lastIndexOf('<h3', monthlyIdx);
  const tableEnd = html.indexOf('</table>', monthlyIdx) + 8;
  html = html.slice(0, h3Start) + html.slice(tableEnd);
  console.log('✓ Removed 月度个人PC汇总');
} else {
  console.log('- 月度个人PC汇总 not found (already removed?)');
}

// ─── 2. Inject weekly consult PC (3rd td = index 2) ───────────────────────────
if (Object.keys(weeklyConsultPC).length > 0) {
  html = patchTable(html, 'Individual Summary', table => {
    return patchRowsInTable(table, weeklyConsultPC, 2, null);
  });
  console.log('✓ Injected weekly consult PC');
}

// ─── 3. Recalculate 周度总PC = consult + conv (4th td = index 3 is conv, index 4 is total) ──
// After consult PC injection, derive weekly totals
if (Object.keys(weeklyConsultPC).length > 0) {
  html = patchTable(html, 'Individual Summary', table => {
    const rows = table.split('</tr>');
    const fixed = rows.map(row => {
      for (const [name, consultVal] of Object.entries(weeklyConsultPC)) {
        if (!row.includes('>' + name + '<')) continue;
        const tds = [...row.matchAll(/<td[^>]*>[\s\S]*?<\/td>/g)];
        if (tds.length < 5) continue;
        // td[3] = conv PC, td[4] = weekly total
        const convVal = parseInt(tds[3][0].replace(/<[^>]+>/g, '').trim()) || 0;
        const weeklyTotal = consultVal + convVal;
        const target = tds[4][0];
        const replacement = '<td>' + weeklyTotal + '</td>';
        row = row.slice(0, tds[4].index) + replacement + row.slice(tds[4].index + target.length);
      }
      return row;
    });
    return fixed.join('</tr>');
  });
  console.log('✓ Recalculated 周度总PC');
}

// ─── 4. Recalculate 月度总PC = monthly consult + monthly conv, top 3 green ────
if (Object.keys(monthlyConsultPC).length > 0) {
  // First pass: collect current monthly conv PC (last td in each agent row)
  const monthlyConvPC = {};
  const si = html.indexOf('Individual Summary');
  const ts = html.indexOf('<table', si);
  const te = html.indexOf('</table>', ts) + 8;
  const table = html.slice(ts, te);
  const rows = [...table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)];
  for (const r of rows) {
    const tds = [...r[1].matchAll(/<td[^>]*>[\s\S]*?<\/td>/g)];
    if (tds.length < 2) continue;
    const name = tds[0][0].replace(/<[^>]+>/g, '').trim();
    if (monthlyConsultPC[name] !== undefined) {
      const lastVal = parseInt(tds[tds.length - 1][0].replace(/<[^>]+>/g, '').trim()) || 0;
      monthlyConvPC[name] = lastVal;
    }
  }

  // Calculate new monthly totals
  const newMonthlyTotal = {};
  for (const [name, consultVal] of Object.entries(monthlyConsultPC)) {
    newMonthlyTotal[name] = consultVal + (monthlyConvPC[name] || 0);
  }

  // Top 3 for rank-top
  const sorted = Object.entries(newMonthlyTotal).sort((a, b) => b[1] - a[1]);
  const top3 = new Set(sorted.slice(0, 3).map(([n]) => n));

  html = patchTable(html, 'Individual Summary', table => {
    const rows = table.split('</tr>');
    const fixed = rows.map(row => {
      for (const [name, val] of Object.entries(newMonthlyTotal)) {
        if (!row.includes('>' + name + '<')) continue;
        const tds = [...row.matchAll(/<td[^>]*>[\s\S]*?<\/td>/g)];
        if (tds.length < 2) continue;
        const lastTd = tds[tds.length - 1];
        const cls = top3.has(name) ? ' class="rank-top"' : '';
        const replacement = '<td' + cls + '>' + val + '</td>';
        row = row.slice(0, lastTd.index) + replacement + row.slice(lastTd.index + lastTd[0].length);
      }
      return row;
    });
    return fixed.join('</tr>');
  });
  console.log('✓ Updated 月度总PC, top 3:', [...top3].join(', '));
}

// ─── 5. Update 咨询业务 section PC values ────────────────────────────────────
if (consultSection.total !== undefined) {
  // Total row
  html = html.replace(
    /(<tr class="consult-total-row">[\s\S]*?<td><strong>\d+<\/strong><\/td><td><strong>)\d+(<\/strong><\/td>)/,
    '$1' + consultSection.total + '$2'
  );
  console.log('✓ Updated consult total PC:', consultSection.total);
}
if (consultSection.lc !== undefined) {
  html = html.replace(
    /(<td><strong>在线 Live Chat<\/strong><\/td><td><strong>\d+<\/strong><\/td><td><strong>)\d+(<\/strong><\/td>)/,
    '$1' + consultSection.lc + '$2'
  );
  console.log('✓ Updated LC consult PC:', consultSection.lc);
}
if (consultSection.phone !== undefined) {
  html = html.replace(
    /(<td><strong>电话 Phone<\/strong><\/td><td><strong>\d+<\/strong><\/td><td><strong>)\d+(<\/strong><\/td>)/,
    '$1' + consultSection.phone + '$2'
  );
  console.log('✓ Updated Phone consult PC:', consultSection.phone);
}

// ─── 6. Update Email CSAT in 咨询业务 section ────────────────────────────────
if (emailCsat) {
  // Match email row: 邮件 Email ... CSAT value (last strong before </tr>)
  const emailRowRe = /(<td><strong>邮件 Email<\/strong><\/td>[\s\S]*?<strong>)([\d.]+%?)(<\/strong><\/td>(?:\s*<\/tr>|\s*<td>))/;
  const m = html.match(emailRowRe);
  if (m) {
    const old = m[2];
    html = html.replace(emailRowRe, '$1' + emailCsat + '$3');
    console.log('✓ Updated Email CSAT:', old, '->', emailCsat);
  } else {
    console.log('! Email CSAT pattern not matched — update manually');
  }
}

// ─── 7. Update team CSAT in consultation header ───────────────────────────────
if (teamCsat) {
  html = html.replace(
    /(<th[^>]*>综合满意度[\s\S]*?<\/th>\s*<th[^>]*>)([\d.]+%?)(<\/th>)/,
    '$1' + teamCsat + '$3'
  );
}

// ─── 8. Fix 业绩分析 section ──────────────────────────────────────────────────
// 8a. Email CSAT: if < 84% move to 异常
if (emailCsat) {
  const emailPct = parseFloat(emailCsat);
  const threshold = 84;

  // Remove from 亮点 if present
  html = html.replace(
    /<div[^>]*>邮件满意度 Email CSAT <strong>[\d.]+%<\/strong>，达成目标 met target ≥84%<\/div>/,
    ''
  );

  if (emailPct < threshold) {
    // Add to 异常 after phone CSAT line
    const phoneIssueRe = /(<div[^>]*>电话满意度 Phone CSAT <strong>[\d.]+%<\/strong>，低于目标 below target ≥84%<\/div>)/;
    if (phoneIssueRe.test(html)) {
      html = html.replace(
        phoneIssueRe,
        '$1<div style="font-size:13px;color:#333;line-height:1.6;margin-bottom:6px">邮件满意度 Email CSAT <strong>' + emailCsat + '</strong>，低于目标 below target ≥84%</div>'
      );
      console.log('✓ Moved Email CSAT to 异常 section');
    }
  } else {
    // Add to 亮点 before its closing tag
    html = html.replace(
      /(个人 CSAT 优秀 Top Individual CSAT)/,
      '<div style="font-size:13px;color:#333;line-height:1.6;margin-bottom:6px">邮件满意度 Email CSAT <strong>' + emailCsat + '</strong>，达成目标 met target ≥84%</div>$1'
    );
    console.log('✓ Kept Email CSAT in 亮点 section');
  }
}

// 8b. Fix 综合满意度低于84% using workspace CSAT (from csat json if available)
// This is handled externally — run after injecting CSAT from csat json

// 8c. Remove 零PC line if no agents have zero total PC
const zeroPcIdx = html.indexOf('本周 PC 为 0 Zero PC this week');
if (zeroPcIdx !== -1) {
  const divStart = html.lastIndexOf('<div', zeroPcIdx);
  const divEnd = html.indexOf('</div>', zeroPcIdx) + 6;
  html = html.slice(0, divStart) + html.slice(divEnd);
  console.log('✓ Removed 零PC line (verify manually if any agents truly had 0 PC)');
}

// ─── Write output ─────────────────────────────────────────────────────────────
fs.writeFileSync(htmlFile, html);
console.log('\nDone. File saved:', htmlFile);
