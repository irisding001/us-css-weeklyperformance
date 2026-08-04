#!/usr/bin/env node
/**
 * Fetch per-agent cross-channel CSAT for all 12 Conversion CS Team agents.
 * Formula: (total_tickets - neg_tickets) / total_tickets
 *   total = LC tickets + Phone inbound_ans + Email replied
 *   neg   = LC neg_count + Phone neg_count + Email neg_count
 *
 * Usage:
 *   DATA_COOKIE="uIdToken=..." node fetch_csat.js \
 *     --start 2026-07-04 --end 2026-07-10
 *
 * Outputs JSON to stdout: { agentName: { total, neg, csat } }
 * where csat is a string like "95.3" (percent, no % sign) or null.
 *
 * NOTE: Card-specific COL keys and metric keys must match run.js exactly.
 */

const https = require('https');

const args      = process.argv.slice(2);
const startDate = args[args.indexOf('--start') + 1];
const endDate   = args[args.indexOf('--end')   + 1];

if (!startDate || !endDate) {
  console.error('Usage: DATA_COOKIE="..." node fetch_csat.js --start YYYY-MM-DD --end YYYY-MM-DD');
  process.exit(1);
}

const DATA_COOKIE = process.env.DATA_COOKIE || '';
if (!DATA_COOKIE) { console.error('Missing DATA_COOKIE'); process.exit(1); }

const TEAM_NAME = 'conversion CS team';
const LC_SKILL_VALUES = ['inc conversion (en)', 'inc conversion (cn)', 'inc英文（转化）', 'inc中文（转化）'];

// ── Card IDs & COL keys (must match run.js) ───────────────────────────────────
const LC_CARD  = 'n897ad21677424c66af5aad8';
const LC_V     = 'TFUsDZAqXcxCwqCzQlvZIQRT';
const LC_COL   = [{ name: '度量名', metaType: 'MPH', key: 'aWxMeJMiFiCjdaGrpBLNOyjG', nameTranslated: '度量名', alias: '度量名' }];

const PH_CARD  = 'p387a9f31ddc842f89a058eb';
const PH_V     = 'LoZeFSbcPCYrMOEKfCEenGqH';
const PH_COL   = [{ name: 'Metric Name', metaType: 'MPH', key: 'mLXLaiHOLIjNBXSnfhTWjCLH', nameTranslated: 'Metric Name', alias: 'Metric Name' }];

const EM_CARD  = 'j4e69d8b9111b4f0a86bfb93';
const EM_V     = 'rwBQAsirGzsCMpndPwUVKhzL';
const EM_COL   = [{ name: '度量名', metaType: 'MPH', key: 'VmZwSehqdXATpitHKQGYKjBW', nameTranslated: '度量名', alias: '度量名' }];

const ESA_CARD = 'db4225f75c16b49a0b6ef227';
const ESA_COL  = [{ name: 'Metric Name', metaType: 'MPH', key: 'mLXLaiHOLIjNBXSnfhTWjCLH', nameTranslated: 'Metric Name' }];

// ── HTTP helpers ─────────────────────────────────────────────────────────────

function httpPost(cardId, vParam, body) {
  return new Promise((resolve, reject) => {
    const str = JSON.stringify(body);
    const req = https.request({
      hostname: 'us.data.futuoa.com',
      path: `/api/card/${cardId}/data?v=${vParam}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'raw-backend-response': 'TRUE',
        'user-id': 'aXJpc2Rpbmc=',
        'x-dom-id': 'Z3VhbmJp',
        'Cookie': DATA_COOKIE,
        'Content-Length': Buffer.byteLength(str),
      },
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Card ${cardId}: HTTP ${res.statusCode}`));
        }
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch (e) { reject(new Error(`Card ${cardId}: invalid JSON`)); }
      });
    });
    req.on('error', reject);
    req.write(str);
    req.end();
  });
}

function httpGet(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'us.data.futuoa.com',
      path, method: 'GET',
      headers: {
        'raw-backend-response': 'TRUE',
        'user-id': 'aXJpc2Rpbmc=',
        'x-dom-id': 'Z3VhbmJp',
        'Cookie': DATA_COOKIE,
      },
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch { resolve({}); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function randId() {
  const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({length: 24}, () => c[Math.floor(Math.random() * c.length)]).join('');
}

function findVParam(obj, depth = 0) {
  if (depth > 4 || !obj || typeof obj !== 'object') return null;
  for (const k of ['version', 'hash', 'v', 'vid', 'configHash']) {
    if (typeof obj[k] === 'string' && /^[a-zA-Z0-9]{20,30}$/.test(obj[k])) return obj[k];
  }
  for (const val of Object.values(obj)) {
    const found = findVParam(val, depth + 1);
    if (found) return found;
  }
  return null;
}

// ── Body builder ─────────────────────────────────────────────────────────────

function buildBody(agentDim, metrics, filters, col) {
  return {
    offset: 0, limit: 500,
    filters,
    zoneFilter: { zoneData: { row: [agentDim], column: col, metric: metrics, sorting: [] } },
    treeFilters: [], dynamicParams: [], dynamicFieldFilters: [],
    combinationFilters: [], layerTreeFilters: [],
    headerSortings: null, rowExpand: null, sorting: [],
    name: '报表', taskRequestId: randId(),
  };
}

function mkDateFilter(fdId, key, dsId, cdId, srcCdId) {
  const f = { name: 'date', fdId, key, fdType: 'STRING',
    filterType: 'BT', originFilterType: 'BT',
    filterValue: [startDate, endDate], displayValue: [startDate, endDate] };
  if (dsId)    f.dsId = dsId;
  if (cdId)    f.cdId = cdId;
  if (srcCdId) f.sourceCdId = srcCdId;
  return f;
}

// ── Response parser ───────────────────────────────────────────────────────────

function agentRows(resp) {
  const data    = resp?.response?.chartMain?.data    || [];
  const rowVals = resp?.response?.chartMain?.row?.values || [];
  return data.map((row, i) => ({
    name: rowVals[i]?.[0]?.title ?? rowVals[i]?.[0]?.dvt ?? '',
    vals: row.map(c => c?.v ?? null),
  }));
}

function toInt(v) { return v == null ? 0 : (parseInt(v) || 0); }

// ── Fetch functions ───────────────────────────────────────────────────────────

async function fetchLC() {
  const dim = {
    fdId: 'h72cb4ce7e104450f91d1e5e', key: 'ixmnrrBevwuFxxsLStkcEqIv',
    name: '接待客服名字-英', fdType: 'STRING', metaType: 'DIM',
    isAggregated: false, calculationType: 'normal', level: 'dataset',
  };
  const metrics = [
    { fdId: 'x50bcef02b3094ef5a4ca0ea', name: '工单总数', fdType: 'DOUBLE', metaType: 'METRIC',
      isAggregated: true, calculationType: 'aggregation', key: 'uSnzSWmrcKEACbnkFiruihTG',
      level: 'dataset', formula: 'count(distinct [工单号])' },
    { fdId: 'o8de31b7e41984a26820ac0f', name: '不满意工单数', fdType: 'DOUBLE', metaType: 'METRIC',
      isAggregated: true, calculationType: 'aggregation', key: 'lcNegCount001',
      level: 'dataset', formula: '[不满意的工单数]' },
  ];
  const skillFilter = {
    name: '实际接待技能', fdId: 'u0e8c717ad0c84c788d304e4', key: 'u0e8c717ad0c84c788d304e4',
    fdType: 'STRING', filterType: 'IN', filterValue: LC_SKILL_VALUES,
    level: 'dataset', filterLevel: 'DETAIL',
    dsId: 'nf8f5724ebd214f34acee5b9', cdId: LC_CARD,
  };
  const filters = [
    mkDateFilter('mc52e5dd1696f423fb044d75', 'mc52e5dd1696f423fb044d75',
      'nf8f5724ebd214f34acee5b9', LC_CARD, 'ca5946493505349b2affa651'),
    skillFilter,
  ];
  const resp = await httpPost(LC_CARD, LC_V, buildBody(dim, metrics, filters, LC_COL));
  const result = {};
  agentRows(resp).forEach(({ name, vals }) => {
    result[name] = { tickets: toInt(vals[0]), neg: toInt(vals[1]) };
  });
  return result;
}

async function fetchPhone() {
  const DS  = 'i3c6fe114d95f4ccc880a844';
  const dim = {
    fdId: 'p7d3c93d1eb174d4f96bc76e', key: 'KRMnUVGvnqVbdEffKhpGiRys',
    name: '工单当前处理人', fdType: 'STRING', metaType: 'DIM',
    isAggregated: false, calculationType: 'normal', level: 'dataset',
  };
  const metrics = [
    { fdId: 'p2433451518d946fa8d225eb', name: '呼入接通次数', fdType: 'DOUBLE', metaType: 'METRIC',
      isAggregated: true, calculationType: 'aggregation', key: 'OkeTTQouVpmhfpHwRrUkFPcs',
      level: 'dataset', formula: 'COUNT(DISTINCT(IF([通话类型]=2 and [通话应答时间]!=0,[Call ID],null)))' },
    { fdId: 'fd23bae0f599e436d94fb740', name: '不满意评价数', fdType: 'DOUBLE', metaType: 'METRIC',
      isAggregated: true, calculationType: 'aggregation', key: 'phNegCount001',
      level: 'dataset', formula: 'SUM([不满意评价数])' },
  ];
  const filters = [
    mkDateFilter('qfae26c41f2964547871e5ba', 'qfae26c41f2964547871e5ba',
      DS, PH_CARD, 'ieacb98abc3fc4de8ae08f34'),
    { name: '客服组', fdId: 'ff8cb357f0deb43d0859a12d', key: 'ff8cb357f0deb43d0859a12d',
      fdType: 'STRING', filterType: 'IN', filterValue: [TEAM_NAME],
      level: 'dataset', filterLevel: 'DETAIL',
      dsId: DS, cdId: PH_CARD, sourceCdId: 'r997dac1f3ce444979ac5c33' },
  ];
  const resp = await httpPost(PH_CARD, PH_V, buildBody(dim, metrics, filters, PH_COL));
  const result = {};
  agentRows(resp).forEach(({ name, vals }) => {
    result[name] = { answered: toInt(vals[0]), neg: toInt(vals[1]) };
  });
  return result;
}

async function fetchEmailReplied() {
  const DS  = 'j4dbefb8670a149afbd8a960';
  const dim = {
    fdId: 'sd76cc38f77ca4c1eb7bcf76', key: 'YfzfXuShhSiMJXDQASvgDOSB',
    name: 'reply_sid_nick', fdType: 'STRING', metaType: 'DIM',
    isAggregated: false, calculationType: 'normal', level: 'dataset',
  };
  const metrics = [
    { fdId: 'kb139048426f1492ea0c428f', name: '已回复邮件量', fdType: 'DOUBLE', metaType: 'METRIC',
      isAggregated: true, calculationType: 'aggregation', key: 'KCqWmysCPfcXOvuQPIssAdjh',
      level: 'dataset', formula: 'SUM([是否已回复])' },
  ];
  const filters = [
    mkDateFilter('ibf197b7482b3471a9d30074', 'ibf197b7482b3471a9d30074',
      DS, EM_CARD, 'o9e26b4da81cf441cac822d2'),
  ];
  const resp = await httpPost(EM_CARD, EM_V, buildBody(dim, metrics, filters, EM_COL));
  const result = {};
  agentRows(resp).forEach(({ name, vals }) => { result[name] = toInt(vals[0]); });
  return result;
}

async function fetchEmailNeg() {
  const DS = 'w605094686a92446b9da361b';

  let vParam = null;
  try {
    const cfg = await httpGet(`/api/card/${ESA_CARD}`);
    vParam = findVParam(cfg);
  } catch (e) {
    process.stderr.write(`[WARN] Email sat v_param: ${e.message}\n`);
  }
  if (!vParam) {
    process.stderr.write('[WARN] Email neg: could not resolve v_param, returning empty\n');
    return {};
  }

  const dim = {
    fdId: 'n79073e09102b4b43aad3ac8', key: 'utlHrocEyaXplhewOQjPIXzi',
    name: 'staff_nick', fdType: 'STRING', metaType: 'DIM',
    isAggregated: false, calculationType: 'normal', level: 'dataset', dsId: DS,
  };
  const metrics = [
    { fdId: 'n24b6cd8fdd154e0788b52b1', name: 'unstisfyed_order_count', fdType: 'DOUBLE',
      metaType: 'METRIC', isAggregated: true, calculationType: 'aggregation',
      key: 'esaNegCount001', dsId: DS },
  ];
  const filters = [
    mkDateFilter('f14bd7ff447884b0b8a514e2', 'f14bd7ff447884b0b8a514e2',
      DS, ESA_CARD, 'x25b867e4d1904be0a4a5f7b'),
  ];
  const resp = await httpPost(ESA_CARD, vParam, buildBody(dim, metrics, filters, ESA_COL));
  const result = {};
  agentRows(resp).forEach(({ name, vals }) => { result[name] = toInt(vals[0]); });
  return result;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  process.stderr.write(`Fetching cross-channel CSAT ${startDate} ~ ${endDate} ...\n`);

  const [lcData, phoneData, emReplied, emNeg] = await Promise.all([
    fetchLC(), fetchPhone(), fetchEmailReplied(), fetchEmailNeg(),
  ]);

  // Collect all agent names
  const names = new Set([
    ...Object.keys(lcData), ...Object.keys(phoneData),
    ...Object.keys(emReplied), ...Object.keys(emNeg),
  ]);

  const output = {};
  for (const name of names) {
    if (!name) continue;
    const lc  = lcData[name]    || { tickets: 0, neg: 0 };
    const ph  = phoneData[name] || { answered: 0, neg: 0 };
    const emT = emReplied[name] || 0;
    const emN = emNeg[name]     || 0;

    const total = lc.tickets + ph.answered + emT;
    const neg   = lc.neg     + ph.neg      + emN;
    const csat  = total > 0 ? ((total - neg) / total * 100).toFixed(1) : null;

    output[name] = { total, neg, csat };
  }

  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
}

main().catch(e => { console.error(e.message); process.exit(1); });
