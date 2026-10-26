#!/usr/bin/env node
/**
 * Patch Section 二 (渠道个人明细) of a US CSS weekly performance report
 * to add rank-top (green) / rank-bot (red) highlighting to 8 columns:
 *   LC 30s, LC CSAT, LC FCR, Phone 20s, Phone CSAT, Phone FCR, Email SLA, Email CSAT
 *
 * 工单/呼入 columns are NOT ranked (per user spec).
 * '-' cells are excluded from ranking.
 *
 * Usage: node patch_section2_ranks.js <report.html>
 */
const fs = require('fs');

const file = process.argv[2];
if (!file) {
  console.error('Usage: node patch_section2_ranks.js <report.html>');
  process.exit(1);
}

let html = fs.readFileSync(file, 'utf8');

// Locate Section 二 first table (id="二")
const sec2Idx = html.indexOf('id="二"');
if (sec2Idx === -1) { console.error('Section 二 not found'); process.exit(1); }

const tblStart = html.indexOf('<table', sec2Idx);
const tblEnd = html.indexOf('</table>', tblStart);
if (tblStart === -1 || tblEnd === -1) { console.error('Section 二 table not found'); process.exit(1); }

const tbl = html.slice(tblStart, tblEnd + '</table>'.length);

// Parse rows in tbody
const tbodyMatch = tbl.match(/<tbody>([\s\S]*?)<\/tbody>/);
if (!tbodyMatch) { console.error('tbody not found in Section 二'); process.exit(1); }

const tbody = tbodyMatch[1];
const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
const rows = [];
let m;
while ((m = rowRe.exec(tbody)) !== null) rows.push(m[1]);

if (rows.length === 0) { console.error('No rows in Section 二 tbody'); process.exit(1); }

// Column layout (11 data columns after agent name):
// 0: Agent name
// 1: LC 工单     (skip)
// 2: LC 30s     (rank)
// 3: LC CSAT    (rank)
// 4: LC FCR     (rank)
// 5: Phone 呼入  (skip)
// 6: Phone 20s  (rank)
// 7: Phone CSAT (rank)
// 8: Phone FCR  (rank)
// 9: Email 工单  (skip)
// 10: Email SLA (rank)
// 11: Email CSAT(rank)
const RANK_COLS = [2, 3, 4, 6, 7, 8, 10, 11];

// Parse each row into cells
function parseCells(rowHtml) {
  const cells = [];
  const re = /<td[^>]*>([\s\S]*?)<\/td>/g;
  let mm;
  while ((mm = re.exec(rowHtml)) !== null) {
    cells.push({ raw: mm[0], inner: mm[1] });
  }
  return cells;
}

const parsedRows = rows.map(r => parseCells(r));

// Extract numeric value from cell inner HTML
function extractNum(innerHtml) {
  // First occurrence of a percentage like 89.5% or a number like 12.3m (Call Dur, not ranked anyway)
  const pctMatch = innerHtml.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pctMatch) return parseFloat(pctMatch[1]);
  return null;
}

// For each rank column, find max & min across rows that have a value
for (const col of RANK_COLS) {
  const vals = [];
  for (let r = 0; r < parsedRows.length; r++) {
    const cell = parsedRows[r][col];
    if (!cell) continue;
    // Skip empty cells (class="empty" or content is just "-")
    if (cell.raw.includes('class="empty"')) continue;
    const v = extractNum(cell.inner);
    if (v != null && !isNaN(v)) vals.push({ r, v });
  }
  if (vals.length < 2) continue;
  const max = Math.max(...vals.map(x => x.v));
  const min = Math.min(...vals.map(x => x.v));
  for (const { r, v } of vals) {
    let cls = '';
    if (v === max) cls = 'rank-top';
    else if (v === min) cls = 'rank-bot';
    if (!cls) continue;
    const cell = parsedRows[r][col];
    // Inject class into existing <td> tag
    const newRaw = cell.raw.replace(/<td([^>]*)>/, (full, attrs) => {
      if (/\bclass=/.test(attrs)) {
        return full.replace(/class="([^"]*)"/, (c, existing) => `class="${existing} ${cls}"`);
      } else {
        return `<td class="${cls}"${attrs}>`;
      }
    });
    parsedRows[r][col].raw = newRaw;
  }
}

// Rebuild tbody
const newTbody = '<tbody>\n    ' + parsedRows.map(cells => '<tr>' + cells.map(c => c.raw).join('') + '</tr>').join('\n    ') + '\n  </tbody>';

const newTbl = tbl.replace(/<tbody>[\s\S]*?<\/tbody>/, newTbody);
html = html.slice(0, tblStart) + newTbl + html.slice(tblEnd + '</table>'.length);

fs.writeFileSync(file, html);
console.log('Patched Section 二 rank highlighting in', file);
