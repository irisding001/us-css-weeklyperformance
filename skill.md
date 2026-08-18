---
name: us-css-weeklyperformance
description: Generate US CSS weekly performance report (Sections 1 & 2 only) for the Conversion CS Team — covers Live Chat, Phone, Email, and Outbound. Use for performance-only reports, custom date ranges, or any US CSS report without highlights/plans. Trigger on "临时报告", "performance report", "us-css-weeklyperformance", or custom-date US CSS reports.
---

# US CSS Weekly Performance Report

Sections 1 & 2 only (no Highlights / Next Week Plans). Tables sorted by ticket volume descending. Bilingual performance analysis labels.

**Team (11 agents):** jacelynlim / terrychen / muhamadfaisal / calventan / azamuddin / jeanliew / whitneylee / alvinsim / zaydentan / vincentyew / wilsonwong

---

## PC 数据来源速查

| PC 类型 | 来源 | 备注 |
|--------|------|------|
| 个人**周度转化PC** | USCM API（run.js 自动读取） | TEMP HTML Individual Summary col3 非零即可 |
| 个人**周度咨询PC** | 用户截图 → corrections JSON `weeklyConsultPC` | API 已移除，每周必须手动填入 |
| 个人**周度总PC** | 咨询PC + 转化PC（patch_corrections 计算） | — |
| 个人**月度转化PC** | USCM API（run.js 自动读取） | USCM 过期则为 0，需重跑 Step 3 |
| 个人**月度咨询PC** | 用户截图 → corrections JSON `monthlyConsultPC` | API 已移除，每周必须手动填入 |
| 个人**月度总PC** | 月度咨询PC + 月度转化PC（patch_corrections 计算） | — |
| **外呼个人周PC** | Guandata `a367cbbcbb28445a198c3518` card `ndfe729d2affb4323a070459` column[5]（客经侧已转化PC） | `patch_ob_pc.js` 自动抓取，非 USCM 计算值 |
| **外呼转化率**（有效跟进/分配转化率） | Guandata `w1b3b7d2e763b45f6a814194`（RATE_CARD_ID 每次发现后填入） | `patch_ob_pc.js` 同时注入，不填 RATE_CARD_ID 则从数据反算 |
| **渠道咨询PC合计**（consultSection） | Guandata page `pbb45c349b2854bad9223591` → `fetch_consult_pc_breakdown.js` → corrections JSON | lc/phone/email 三路分项；见 Step 4.5 说明 |
| 概览栏 **周咨询PC** | = `consultSection.total` | patch_corrections 不更新，需手动替换 |
| 概览栏 **月度PC** | = 所有人月度总PC 之和 | patch_corrections 不更新，需手动替换 |
| 概览栏 **外呼转化PC** | = 外呼个人表 周PC 列合计（Guandata） | patch_corrections 不更新，需手动替换 |

---

## 任务完成标准（必读）

报告被视为完成，当且仅当同时满足以下三条：

1. **数据无空缺** — 所有字段有值：Individual Summary 每人 PC/CSAT 非空；外呼表每列有数据；概览栏 周咨询PC / 月度PC / 外呼转化PC 已更新
2. **核查无矛盾/异常** — 通过 check_report.js + 推送前自检清单，无任何 ERROR；WARN 项已逐一确认合理
3. **格式与上周一致** — 打开上周报告（`weekly_report_YYYY-MM-DD_MMDD.html`）对照：列数/列序/着色规则/WoW 子标签位置与上周完全相同；若有新增列须明确标注

**无法完成时必须告知用户：**
- 任何步骤遇到数据缺失、API 返回异常、字段无法定位 → 立即停止，留言说明具体哪一步卡住、卡在哪个字段，等待 Iris 确认后再继续
- **不要静默跳过**、不要用占位符或 `-` 填入空缺后直接推送

---

## Step 1: Collect credentials

**DATA_COOKIE** (`us.data.futuoa.com` → F12 → Network → Cookie header)
```
uIdToken=...; uIdToken.sig=...
```

**USCM_COOKIE + USCM_CSRF** (`uscm.futuoa.com`)
```
EGG_SESS=...; csrfToken=TOKEN; staff_id=7328; staff_id.sig=...
```
CSRF = the `csrfToken` value extracted separately.

**WS_COOKIE** (`us-workspace.futuoa.com` → F12 → Network → Cookie header)
- Used for per-agent WS CSAT (综合满意度)
- Same domain as `us-workspace.futuoa.com/unsatisfied-orders`

Validity: `uIdToken` ~2 weeks · `EGG_SESS` ~1 day

Update all three in `C:/Users/irisding/run_weekly_config.json` before each run.

---

## Step 2: Confirm date ranges

Standard cycle: **Monday ~ Sunday (BT)**. Outbound uses the same range.

Ask user for: `YYYY-MM-DD ~ YYYY-MM-DD`

---

## Step 3: Generate base report

**Script:** `C:/Users/irisding/.claude/skills/us-css-weeklyperformance/scripts/run.js`（独立副本，不依赖其他 skill）

⚠️ **Do NOT add `--ob-start`/`--ob-end`** — causes monthly PC = weekly PC bug.

⚠️ **USCM_COOKIE expires in ~1 day.** If expired, run.js silently returns 0 for all PC (weekly + monthly). Always verify TEMP HTML before proceeding — if all conv/consult PC = 0, refresh USCM_COOKIE and re-run.

Update `C:/Users/irisding/run_weekly_config.json` with fresh cookies, then:

```bash
node C:/Users/irisding/run_weekly_step3.js
```

Verify TEMP output — Individual Summary col3 (转化PC) should have non-zero values for most agents.

---

## Step 3.5: Fetch cross-channel CSAT

```bash
node C:/Users/irisding/run_weekly_step3_5.js
# saves to C:/Users/irisding/csat_YYYY-MM-DD.json
```

**CSAT formula:** `(total - neg) / total`
- total = LC tickets + Phone inbound answered + Email replied
- neg = LC neg_count + Phone neg_count + Email neg_count

**Email CSAT** — fetch separately from designated page (more accurate than run.js):
- Page: `https://us.data.futuoa.com/page/fbfc690af15de4953bc0725c`
- Card: `s9171c1087a664ae689047c4` · Dataset: `ncd519d0a95e74646bf48e5f`
- Team filter: `"US Conversion CS team"` · Version: `951`
- Filter: 工单创建-日 (`fdId=a04853e434ab34d21970334a`) for week range

⚠️ **fetch_csat.js email neg is currently broken** (v_param unresolved → all email CSAT = 100%). After running, manually verify email CSAT.

**Email channel CSAT (WS channel 7):** Use WS GetBadEvaluations API — same endpoint as patch_lc_csat.js, but filter `channel === 7`. Formula: `(total - neg) / total` where neg = `optionSatisfied === 3 || 4`. ⚠️ Email eval volume is typically very low (< 10/week); 100% CSAT with small sample is possible/acceptable — confirm with user rather than treating as error.

---

## Step 4: Post-process

```bash
node "C:\Users\irisding\.claude\skills\us-css-weeklyperformance\scripts\postprocess.js" \
  "C:/Users/irisding/weekly_report_TEMP.html" \
  "C:/Users/irisding/us-css-weeklyreport/weekly_report_YYYY-MM-DD.html" \
  --csat "C:/Users/irisding/csat_YYYY-MM-DD.json"
```

Omit `--csat` to remove the CSAT column entirely. Output filename uses `--week-start` date.

⚠️ **Never use broad regex to remove CSAT manually** — it corrupts LC/Phone/Email columns. postprocess.js handles this safely.

**CSS 自动压缩：** postprocess.js 输出时自动注入 Individual Summary 紧凑样式 override，无需手动调整。

**postprocess.js 自动行为（2026-08-10 起）：**
- 自动删除 `业绩分析 Performance Analysis` 区块（h3 + 内容 div）— 无需手动删除
- 自动删除 Section 二（渠道个人明细）所有 `.dot-red` 红灯指示器（保留彩色文字）
- 外呼个人表：全部度量列（跟进量/跟进率/有效跟进/有效跟进率/分配转化率/有效跟进转化率/周PC）标绿 top1；仅比率+PC列（有效跟进率/分配转化率/有效跟进转化率/周PC）标红 bottom1

---

## Step 4.1: Patch outbound individual table (patch_ob_pc.js)

run.js 输出的外呼个人表只有 5 列（Agent|分配Leads|跟进量|有效跟进|周PC_USCM），且 周PC 用 USCM 全量值而非 cohort 值。此步骤完全重建该表为正确 9 列，并从 Guandata 抓取 cohort PC。

**每次运行前更新脚本顶部三个常量：**
```js
const REPORT = 'C:/Users/irisding/us-css-weeklyreport/weekly_report_YYYY-MM-DD_MMDD.html';
const START  = 'YYYY-MM-DD';
const END    = 'YYYY-MM-DD';
```

**RATE_CARD_ID（转化率卡片）：**
- 首次使用先 discover：`node C:/Users/irisding/patch_ob_pc.js --discover`
- 记录输出的 24 位 card ID，填入 `RATE_CARD_ID = 'xxxxxx...'`
- 若不填，脚本自动从 cohort PC ÷ 有效跟进 / 分配Leads 反算转化率

**数据来源：**
- 外呼 cohort PC：Page `a367cbbcbb28445a198c3518` → Card `ndfe729d2affb4323a070459` column[5] = `客经侧已转化PC`
- 转化率：Page `w1b3b7d2e763b45f6a814194`（RATE_CARD_ID 填入后自动拉取）
- Dataset: `ic06ff886844c4de6a191268`；Region filter: `地区=US`（fdId `ud94da47e746c4b5e9a9f8f6`）

```bash
node C:/Users/irisding/patch_ob_pc.js
```

**输出 9 列（固定顺序）：**
```
客服 | 分配Leads | 跟进量 | 跟进率 | 有效跟进 | 有效跟进率 | 分配转化率 | 有效跟进转化率 | 周PC
```
- 跟进率 = 跟进量 ÷ 分配Leads（从 HTML 原有值计算）
- 有效跟进率 = 有效跟进 ÷ 跟进量（从 HTML 原有值计算）
- 周PC = Guandata cohort PC（蓝色加粗显示）

脚本末尾输出：`外呼转化PC 合计 → update overview bar 外呼转化PC to: N`，用于手动替换概览栏。

⚠️ **运行时机：** 在 postprocess.js 之后、check_report.js 之前运行。postprocess.js 的 Step 5（注入转化率列）会被此脚本完全覆盖，无冲突。

---

## Step 4.4: Patch LC CSAT to 个人渠道业绩 table

Fetches LC-only CSAT from WS and injects WS 满意度 data into the 在线 Live Chat group of the per-agent channel table (Section 二).

**LC-only vs combined CSAT:** postprocess.js already fills the 满意度 column from the csat JSON (combined cross-channel formula). This step OVERWRITES those values with WS-sourced LC-only CSAT, which is more accurate for the channel breakdown view.

**Script:** `C:/Users/irisding/patch_lc_csat.js`

Update three constants at the top before each run:
```js
const REPORT = 'C:/Users/irisding/us-css-weeklyreport/weekly_report_YYYY-MM-DD_MMDD.html';
const START  = 'YYYY-MM-DD';  // week start
const END    = 'YYYY-MM-DD';  // week end
```

WS_COOKIE is read from the environment or falls back to the hardcoded value in the file — update the hardcoded value with a fresh `us-workspace.futuoa.com` cookie if needed.

```bash
node C:/Users/irisding/patch_lc_csat.js
```

Output: prints per-agent LC total/neg/csat, then writes the patched HTML.

**CSAT formula:** `(lc_total - neg) / lc_total`
- `channel === 1` = LC only
- `optionSatisfied === 3 || === 4` = negative

**Column position:** 满意度 is the last column in the 在线 Live Chat group (after FCR), with the channel-divider border.

⚠️ **锚点变更（2026-08-10 修复）：** 脚本原先用 `html.indexOf('个人渠道业绩')` 定位表格，但该文本在 0803-0809 起的报告中已移除，导致脚本静默失败（落到第一张表）。已改为 `html.indexOf('id="二"')` 定位 Section 二 的第一张表（始终是 per-agent channel table）。

---

## Step 4.45: Patch Email Channel Team Summary

Channel Team Summary 邮件行需手动更新 — patch_email_data.js 只更新 Section 二个人明细表，**不更新**渠道汇总表。

| 列 | 来源 | 备注 |
|---|---|---|
| 邮件工单总量 | Section 二邮件列各人 tickets 合计（patch_email_data.js console 输出） | 验证：各人相加 |
| 邮件 SLA | patch_email_data.js console 输出 team SLA（加权均值，非各人平均） | 格式：XX.X% |
| 邮件 CSAT | WS GetBadEvaluations `channel === 7`，formula: `(total-neg)/total` | 样本 < 10 可接受，留言说明 |

**着色：** SLA ≥90% / CSAT ≥84% → `color:#15803d`；否则 `color:#ef4444`

同时更新**合计 Total 行**总工单 = LC + Phone + Email 各行之和。

---

## Step 4.5: Manual data corrections

Collect from user (screenshots) and build a config JSON:

```json
{
  "weeklyConsultPC": {
    "alvinsim": 2, "azamuddin": 1, "calventan": 4, "jacelynlim": 2,
    "muhamadfaisal": 5, "terrychen": 3, "vincentyew": 3,
    "whitneylee": 1, "zaydentan": 1, "zyonnleong": 2
  },
  "monthlyConsultPC": {
    "alvinsim": 11, "azamuddin": 11, "calventan": 15, "jacelynlim": 15,
    "jeanliew": 11, "muhamadfaisal": 17, "terrychen": 13, "vincentyew": 7,
    "whitneylee": 13, "wilsonwong": 8, "zaydentan": 7, "zyonnleong": 2
  },
  "consultSection": { "total": 24, "lc": 10, "phone": 14, "email": 0 },
  "emailCsat": "71.0%",
  "teamCsat": "85.3%"
}
```

**渠道咨询PC合计（consultSection）自动获取：**
```bash
node C:/Users/irisding/fetch_consult_pc_breakdown.js
# 输出按 有效跟进方式 分组的 PC，保存到 consult_pc_breakdown.json
# 映射到 lc/phone/email 后填入 corrections JSON
```
- 数据页：`https://us.data.futuoa.com/page/pbb45c349b2854bad9223591`
- Card: `oa724299e80dd4e4daaa9301` · Dataset: `m79e24ac5abd4430c877951f`
- 当前脚本按 `有效跟进方式` 分组，不是按 LC/Phone/Email 分组 — 需将 output 各行手动映射到渠道再填入 `consultSection`
- `weeklyConsultPC` / `monthlyConsultPC`（个人粒度）仍需从截图手动读取

⚠️ **咨询PC（online_pc / phone_pc / email_pc）字段已从 USCM API 移除。** run.js 生成的 TEMP HTML 中个人咨询PC 全为 0，这是正常的，不是 USCM_COOKIE 过期。每周必须从用户提供的截图手动统计后填入 `weeklyConsultPC` / `monthlyConsultPC`，否则所有人咨询PC 为 0 且 周度总PC = 转化PC。

⚠️ **转化PC（convPC）** 由 USCM API 正常返回，run.js 读取正确。验证方法：TEMP HTML Individual Summary col3（转化PC）大部分人非零即可。

Notes:
- `jeanliew` / `wilsonwong` often have 0 weekly consult PC
- `monthlyConsultPC`: month-to-date per agent (consult only)
- `teamCsat`: overall WS CSAT shown in consultation header (fetch from `us-workspace.futuoa.com`)
- patch_corrections reads TEMP HTML's last column (月度总PC from run.js) as monthly conv PC, then adds monthlyConsultPC → final 月度总PC = consult + conv. **If USCM was expired during run.js, monthly conv = 0 and 月度总PC = monthlyConsultPC only — must re-run Step 3 with valid USCM first.**

```bash
node "C:\Users\irisding\.claude\skills\us-css-weeklyperformance\scripts\patch_corrections.js" \
  "C:/Users/irisding/us-css-weeklyreport/weekly_report_YYYY-MM-DD.html" \
  --config "C:/Users/irisding/corrections_YYYY-MM-DD.json"
```

### Known run.js output bugs — always fix manually after postprocess:

**Bug 3: 外呼个人表 跟进量/跟进率 列数据错误**
run.js 在个人外呼表中将 `convPC` 写入 `跟进量` 列（带 `data-col="salespc"` 标记），`跟进率` 列显示整数（与 `周PC` 相同）而非百分比。
- **检测方法**：`跟进量` 值（3、3、6...）远小于 `分配Leads`（200-300），`跟进率` 无 `%` 符号
- **修复方法**：从现有数据反推：`跟进量 = round(有效跟进 / 有效跟进率)`，`跟进率 = (跟进量 / 分配Leads).toFixed(1) + '%'`
- 反推值之和应等于团队汇总行 `外呼跟进量`（如 1949）以验证正确性
```js
// 反推示例
const follow = Math.round(effectiveFollow / effectiveRate);  // e.g. Math.round(43/0.154) = 280
const rate   = (follow / assignedLeads * 100).toFixed(1) + '%'; // e.g. "90.0%"
```

**外呼表 有效跟进转化率 / 分配转化率 数据源**

⚠️ 这两列**不能**用 USCM conv_pc ÷ 有效跟进 计算，必须使用 Guandata「客经维度-新leads（cohort）」视图：
- Page: `https://us.data.futuoa.com/page/a367cbbcbb28445a198c3518`
- Card: `ndfe729d2affb4323a070459` · Dataset: `ic06ff886844c4de6a191268`
- 同一 card 内 column[5] = `客经侧已转化 PC`（fdId: `c04a7710cb4594ff2b96b6a9`）
- cohort 口径：仅统计本周新 leads 的转化，与 USCM 全量 conv_pc 不同

**外呼表列顺序规则（固定）：**
```
分配Leads | 跟进量 | 跟进率 | 有效跟进 | 有效跟进率 | 分配转化率 | 有效跟进转化率 | 周PC
```
- 分配转化率 在 有效跟进转化率 **左侧**
- postprocess.js 自动标绿全部度量列（col2~col8）top1；仅比率+PC列标红 bottom1 — **无需手动**
- 有效跟进量（col4）< 25 标红（需手动 — postprocess.js 不处理此规则）

**Bug 5: Phone FCR 列显示邮件工单数（无电话工单的 agent）**
run.js 对没有电话工单的 agent，Phone FCR 列写入其邮件工单数（整数，无 `%`）而非空值。
- **检测方法**：Phone FCR 列出现整数（如 `29`、`21`），无 `%`，值与该 agent 邮件工单数相同
- **修复方法**：将该单元格替换为 `<td class="empty">-</td>`（用前后上下文定位唯一锚点）
- **已知受影响**：无电话接线记录的 agent（alvinsim、terrychen 等轮班人员）

**Bug 4: Red-dot 着色 regex 破坏 `</strong>` 和 `<td>` 标签**
向含 `.dot-red` 的单元格添加红色样式时，若用 `([^<]+)<span class="dot dot-red">` 模式，`[^<]+` 会匹配到 `</strong>` 或 `</td>` 中的 `/strong>` 或 `td>XX%`，导致：
- `<strong>76.7%<<span style="color:#ef4444">/strong></span>` — `/strong>` 变成可见文字
- `<<span style="color:#ef4444">td>91.2%</span>` — `<td>` 标签破坏
修复：用确切字符串替换（而非宽泛 regex），或将 regex 锚定到 `<td>` 和 `</td>` 边界内。

### Known patch_corrections bugs — always fix manually after running:

**Bug 1: emailCsat replaces email ticket count cell**
The `emailRowRe` regex matches the first numeric cell in the email row (ticket count) instead of the CSAT cell. After running, verify the email row in 咨询业务 section — if the ticket count was replaced with a percentage, restore it:
```js
html = html.replace('<td><strong>47.37%</strong></td><td><strong>0</strong></td>',
                    '<td><strong>419</strong></td><td><strong>0</strong></td>');
// Replace 47.37% / 419 with actual emailCsat / actual ticket count
```

**Bug 2: 业绩分析 email CSAT and 综合满意度 lines not injected / 内容错误**
check_report.js checks 6 & 7 will WARN if these lines are missing. Inject manually before `<div class="editable-area"`:
```js
// Email CSAT < 84% → 异常:
'<div style="font-size:13px;color:#333;line-height:1.6;margin-bottom:6px">邮件满意度 Email CSAT <strong>XX.XX%</strong>，低于目标 below target ≥84%</div>'
// 综合满意度 below 84% list:
'<div style="font-size:13px;color:#333;line-height:1.6;margin-bottom:6px">综合满意度低于 Overall CSAT below 84%：name1(XX%)、name2(XX%)...</div>'
```

⚠️ **自动注入行须核查，以下情况必须删除：**
- Email CSAT 显示 `100.0%` → fetch_csat.js email neg 已知是 broken 状态，100% 是假数据，**删除该行**
- 综合满意度名单与 Individual Summary CSAT 列不符 → 删除并手动重写准确名单

### Overview bar manual fixes (patch_corrections does not update these):

After patch_corrections, the overview bar `本周概览` still shows API values:
- **周咨询PC** shows 0 (API broken) → replace with `consultSection.total`
- **月度PC** shows monthly conv only → replace with sum of all agents' 月度总PC from Individual Summary
- **外呼转化PC** API value may differ from actual → replace with sum of 周PC column in outbound table (Guandata source)

```js
html = html.replace('<strong>周咨询PC</strong> 0 单', '<strong>周咨询PC</strong> 22 单');
html = html.replace('<strong>月度PC</strong> 158 单', '<strong>月度PC</strong> 317 单');
html = html.replace('<strong>外呼转化PC</strong> 73 单', '<strong>外呼转化PC</strong> 43 单');
```

---

## Step 4.55: Channel Team Summary WoW 子标签

渠道汇总表（在线/电话/邮件/合计）的 **工单量、咨询PC、CSAT** 三列需加 WoW 对比子标签。

**格式：**
```html
<span class="sub-lbl" style="color:#15803d">▲+20</span>   <!-- 上涨绿 -->
<span class="sub-lbl" style="color:#ef4444">▼-14</span>   <!-- 下跌红 -->
<span class="sub-lbl" style="color:#999">±0</span>        <!-- 无变化灰 -->
```
CSAT 差值用 `pp` 为单位（如 `▲+10.8pp`）；工单/PC 用整数差值。

**数据来源：** 上周报告（`weekly_report_YYYY-MM-DD_MMDD.html`）中 Channel Team Summary 对应行的值。

**注入位置：** 紧接在 `<strong>值</strong>` 或 `值%` 之后，作为同一 `<td>` 内追加内容。

---

## Step 4.6: Data check

```bash
node "C:\Users\irisding\.claude\skills\us-css-weeklyperformance\scripts\check_report.js" \
  "C:/Users/irisding/us-css-weeklyreport/weekly_report_YYYY-MM-DD.html" \
  --csat "C:/Users/irisding/csat_YYYY-MM-DD.json"
```

Fix all `✗ ERROR` before pushing. `! WARN` items need manual judgment.

Checks: 月度个人PC汇总已删除 · 周度总PC = 咨询PC + 转化PC · Individual Summary CSAT匹配 · 月度总PC top-3绿色 · 零PC行不存在 · Email CSAT分类正确（≥84% 亮点 / <84% 异常）· 综合满意度列表准确

⚠️ Fixing Individual Summary CSAT: split by `</tr>`, match agent name row, replace in that row only. **Never use `[\s\S]*?` across row boundaries.**

### 推送前自检（必做，有异常须留言确认）

每次报告完成后，在推送 GitHub/飞书 前，**主动逐项核查以下清单**，并将结果输出给用户。若任意一项异常，**停止推送，留言说明**，等待用户明确确认后再继续。

```
【推送前自检报告】
□ 个人周度转化PC（大部分人非零）        实际：___
□ 个人周度咨询PC（corrections已填入）   实际：___
□ 渠道咨询PC合计（lc+phone+email）      实际：___
□ 外呼个人周PC合计（Guandata来源）      实际：___
□ 概览栏 周咨询PC（已手动更新）         实际：___
□ 概览栏 月度PC（已手动更新）           实际：___
□ 概览栏 外呼转化PC（已手动更新）       实际：___
□ Email CSAT（WS channel 7 实际值，小样本可接受）  实际：___
□ Individual Summary CSAT（无缺失）     异常人员：___
□ 业绩分析行（无错误自动注入内容）      状态：___
```

**异常判断标准：**
- 任意 PC 为 0（且该人本周有工单）→ 异常
- Email CSAT = 100% + 样本量 ≥ 20 → 异常（fetch_csat broken 或数据异常）；样本 < 10 可接受
- 概览栏数值与表格合计不符 → 异常
- Individual Summary 有人 CSAT 显示 `-` 但 csat JSON 有数据 → 异常

**留言格式示例：**
> 自检发现以下问题，请确认后再推送：
> 1. azamuddin 周度咨询PC = 0（corrections 是否漏填？）
> 2. Email CSAT 显示 100%（fetch_csat broken，需手动核实并更新）

---

## Step 4.65: 月度满意度 + 致命/非致命差错列（可选）

Individual Summary 月度区域含 `zone-monthly` colspan=6，对应 6 列：
**月度总工单 → 月度满意度 → 月度致命 → 月度非致命 → 月度总PC → 月度KPI达成**

⚠️ **推荐运行顺序：先 `add_fatal_columns.js`，再 `patch_monthly_sat.js`。**
`patch_monthly_sat.js` 的 header 替换锚定 `月度致命` 已存在；若顺序颠倒，header 替换静默失败（满意度列无标题），但 per-agent 行 sat 值仍会注入，导致列顺序错乱。

⚠️ **任何注入脚本运行后，必须验证 `合计 Total` 行 td 数量 = agent 行 td 数量（标准为 13）。** 注入脚本只处理 agent 行，total 行经常漏更新。验证方法：
```js
// 在 Node REPL 快速检查
const html = require('fs').readFileSync('...report.html','utf8');
const summaryIdx = html.indexOf('Individual Summary');
const tblStart = html.lastIndexOf('<table', html.indexOf('zone-monthly', summaryIdx));
const tbl = html.slice(tblStart, html.indexOf('</table>', tblStart));
(tbl.match(/<tr[^>]*>[\s\S]*?<\/tr>/g)||[]).forEach((r,i)=>{
  const n = (r.match(/<td/g)||[]).length;
  const name = (r.match(/><([^<]{3,20})<\/td>/)||[])[1]||'';
  if(n>0) console.log(i, n, name);
});
```
若 total 行 td 数量不足，需手动重建（用 agent 行各列合计值）。

### 月度满意度列

**数据源：**
- Page: `https://us.data.futuoa.com/page/md4204d8939874f5b83b99d0`（转化客服绩效-月报）
- Card: `q675815b12e4246afa871c94` · Dataset: `ic06ff886844c4de6a191268`
- V_PARAM: `kQdbjGiERwJqhUiwlPPIjNPc`
- 字段：`jdeec5a324c714af2a1e80e4`（已评价）/ `pa1080e37a99441fb893e456`（不满意）

**公式：** 月度满意度 = (已评价 − 不满意) ÷ 已评价

**抓取：**
```bash
node C:/Users/irisding/fetch_monthly_sat.js 2026-07
# → C:/Users/irisding/monthly_sat_2026-07.json
```

⚠️ `fetch_monthly_sat.js` 使用 region=US filter（不加 BT 日期），在代码内按月份筛选。不可自定义 zoneData metrics，必须用 card 自身的字段 key。

**注入：**
```bash
node C:/Users/irisding/patch_monthly_sat.js \
  "C:/Users/irisding/us-css-weeklyreport/weekly_report_YYYY-MM-DD.html" \
  "C:/Users/irisding/monthly_sat_YYYY-MM.json"
```

**着色：** ≥84% → `color:#15803d`（绿）；<84% → `color:#ef4444`（红）

---

### 月度致命/非致命差错列

若需在 Individual Summary 添加 `月度致命` / `月度非致命` 列，从 Guandata 获取数据后注入。

**数据源：**
- Page: `https://us.data.futuoa.com/page/a367cbbcbb28445a198c3518`
- Card ID: `ndfe729d2affb4323a070459` · Dataset: `ic06ff886844c4de6a191268`
- 关键字段：`m810be6ccbbbb486db0f2f99`（致命）/ `fa0669df08d964728b247041`（非致命）
- 使用 card 自身的 `zoneData`（不可自定义，否则返回空）；加 `地区=US` + 日期范围过滤

**注入位置：** 在 `月度总PC` 列 **前** 插入两个 `<th>` / 每行 `<td>`；注入位置在每行第 10 个 `</td>` 之后（月度总工单之后）。

⚠️ `add_fatal_columns.js` 写死了注入位置（`cells.split('</td>').slice(0,10)`）；若已先注入月度满意度列，则致命列注入偏移应改为 `slice(0, 11)` 才能插在正确位置。运行后必须目视核查列顺序是否为：月度总工单 → 月满意度 → 月度致命 → 月度非致命 → 月度总PC → 月度KPI。

**着色规则：** 致命 > 0 → `color:#ef4444`（红）；非致命 > 0 → `color:#f59e0b`（橙）。

---

## Step 4.7: 本周业绩小结 (team-facing)

Delete the auto-generated 亮点 / Needs Improvement blocks and inject a bilingual team-facing summary. Structure:

```html
<div style="padding:14px 18px;background:#f8faff;border-radius:8px;font-size:12.5px;color:#1a1a2e;line-height:1.9">
  <div style="font-weight:700;font-size:13.5px;margin-bottom:12px;color:#1456F0">本周业绩小结 Weekly Performance Summary</div>

  <div style="margin-bottom:10px">
    <span style="font-size:11px;font-weight:700;background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:3px;margin-right:8px">表现突出 Standouts</span><br>
    <span style="display:block;margin-top:6px">· 内容双语，第一条加 margin-top:6px</span>
    <span style="display:block">· 后续条目无 margin-top</span>
  </div>

  <div style="margin-bottom:10px">
    <span style="font-size:11px;font-weight:700;background:#fef3c7;color:#b45309;padding:2px 8px;border-radius:3px;margin-right:8px">本周关注点 Focus Areas</span><br>
    <span style="display:block;margin-top:6px">· 内容双语</span>
  </div>

  <div>
    <span style="font-size:11px;font-weight:700;background:#ede9fe;color:#7c3aed;padding:2px 8px;border-radius:3px;margin-right:8px">月度进度 Monthly Progress</span><br>
    <span style="display:block;margin-top:6px">· Top 3 月度PC + 全队月度合计，双语</span>
  </div>
</div>
```

Tone: motivating for team members. Name standout agents. Be constructive on improvement areas.
Also delete: `<div class="section" id="五">` (下周计划) and the `editable-area` 重点工作 block.

⚠️ **业绩小结数据准确性检查（必做）：** 写完后必须与 Individual Summary 表逐项核对：
- Standouts 中的 PC 数字：对照 `咨询PC`、`转化PC`、`周度总PC` 三列的实际值
- Email SLA 关注点：所有 `< 90%` 的人均需列出（不能遗漏），SLA 值从邮件个人明细表读取
- 综合满意度低于84%名单：与 Individual Summary CSAT 列及 csat JSON 核对

---

## Step 5: Upload to GitHub

> ⚠️ **执行前必须向 Iris 确认**：列出将要执行的命令，等待 Iris 明确回复"确认"或"yes"后再执行。

⚠️ **文件名必须包含结束日期**，格式：`weekly_report_YYYY-MM-DD_MMDD.html`
例：`weekly_report_2026-07-20_0726.html`（`_MMDD` = week-end 的月日）

```bash
cd "C:/Users/irisding/us-css-weeklyreport"
node update_index.js
git add weekly_report_YYYY-MM-DD_MMDD.html index.html
git commit -m "Add US CSS weekly performance report YYYY-MM-DD ~ YYYY-MM-DD"
git push origin main
```

Repo: `https://github.com/irisding001/us-css-weeklyreport`

---

## Step 6: Share link

```
https://irisding001.github.io/us-css-weeklyreport/weekly_report_YYYY-MM-DD_MMDD.html
```

History page (always shows 3 most recent):
```
https://irisding001.github.io/us-css-weeklyreport/
```

---

## Step 7: Push to Feishu group

> ⚠️ **执行前必须向 Iris 确认**：列出将要执行的命令，等待 Iris 明确回复"确认"或"yes"后再执行。

```bash
node C:/Users/irisding/push_weekly_report.js \
  --week-start YYYY-MM-DD \
  --week-end   YYYY-MM-DD
```

Optional custom note (bilingual):
```bash
--note "本周报告已更新，含满意度分析。\nThis week's report is ready, including CSAT analysis."
```

- Webhook: `https://open.feishu.cn/open-apis/bot/v2/hook/b26105dd-d92a-45b4-a2fe-9424f712b9b2`
- Report URL auto-constructed from `--week-start` + `--week-end`
- Card includes: title, bilingual note, 查看周报 + 历史周报 buttons

---

## Notes

- **趋势图周数（2026-08-07 起）：** Section 一趋势图一律显示最近 **6 周**数据，不再显示 4 周。生成 SVG 时需读取当前报告所在周及前 5 周的工单量、CSAT、转化PC 数据（从历史报告文件提取）。
- `[ERROR] 外呼: USCM_AUTH_EXPIRED` → refresh USCM_COOKIE in run_weekly_config.json
- This repo (`us-css-weeklyreport`) is separate from the standard `US-CSS-weekly-report` repo
- Non-standard date ranges still use `--week-start` as the output filename date
- WS CSAT (per-agent) requires WS_COOKIE; team CSAT comes from `us-workspace.futuoa.com/unsatisfied-orders`

---

## Individual Summary 表格样式参考（紧凑模式）

以下 CSS 为当前生效的压缩设置（2026-08-10 起）：

```css
.team-summary td { padding: 4px 5px; font-size: 12px; }
.team-summary th { padding: 3px 5px; font-size: 11px; line-height: 1.3; }
.group-header th { padding: 4px 6px; font-size: 11px; }
.en { font-size: 10px; display: block; line-height: 1.2; }
.team-row td { padding: 3px 6px; font-size: 12px; }
```

若新报告显示偏宽，使用上述参数覆盖对应 CSS 规则。

---

## 旧格式报告改造（cols-wide → 合并渠道表）

2026-08-10 前生成的报告使用 `cols-wide` div 包裹三张独立渠道表（在线/电话/邮件），新格式使用单张合并渠道表。如需将旧报告升级为新格式：

1. 找到 `<div class="cols-wide">` 区块，整体替换为合并渠道表 HTML
2. 合并表列结构（在线 LC 组：工单|30s接通|FCR|满意度；电话 Phone 组：呼入|20s接通|FCR|满意度；邮件 Email 组：工单|SLA|满意度）
3. 更新 Individual Summary `zone-monthly` colspan：3 → 6
4. 按 Step 4.65 流程注入月度满意度、致命/非致命列
5. 验证 `合计 Total` 行 td 数量 = agent 行 td 数量（13）
