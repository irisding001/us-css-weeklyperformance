---
name: us-css-weeklyperformance
description: Generate US CSS weekly performance report (Sections 1 & 2 only) for the Conversion CS Team — covers Live Chat, Phone, Email, and Outbound. Use for performance-only reports, custom date ranges, or any US CSS report without highlights/plans. Trigger on "临时报告", "performance report", "us-css-weeklyperformance", or custom-date US CSS reports.
---

# US CSS Weekly Performance Report

Sections 1 & 2 only (no Highlights / Next Week Plans). Tables sorted by ticket volume descending. Bilingual performance analysis labels.

**Team (12 agents):** jacelynlim / terrychen / muhamadfaisal / calventan / azamuddin / jeanliew / whitneylee / alvinsim / zaydentan / vincentyew / wilsonwong / zyonnleong

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

Standard cycle: **Friday ~ Thursday (BT)**. Outbound uses the same range.

Ask user for: `YYYY-MM-DD ~ YYYY-MM-DD`

---

## Step 3: Generate base report

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

⚠️ **fetch_csat.js email neg is currently broken** (v_param unresolved → all email CSAT = 100%). After running, manually verify email CSAT against the data page above and overwrite csat JSON if needed.

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

**Bug 2: 业绩分析 email CSAT and 综合满意度 lines not injected**
check_report.js checks 6 & 7 will WARN if these lines are missing. Inject manually before `<div class="editable-area"`:
```js
// Email CSAT < 84% → 异常:
'<div style="font-size:13px;color:#333;line-height:1.6;margin-bottom:6px">邮件满意度 Email CSAT <strong>XX.XX%</strong>，低于目标 below target ≥84%</div>'
// 综合满意度 below 84% list:
'<div style="font-size:13px;color:#333;line-height:1.6;margin-bottom:6px">综合满意度低于 Overall CSAT below 84%：name1(XX%)、name2(XX%)...</div>'
```

### Overview bar manual fixes (patch_corrections does not update these):

After patch_corrections, the overview bar `本周概览` still shows API values:
- **周咨询PC** shows 0 (API broken) → replace with `consultSection.total`
- **月度PC** shows monthly conv only → replace with sum of all agents' 月度总PC from Individual Summary

```js
html = html.replace('<strong>周咨询PC</strong> 0 单', '<strong>周咨询PC</strong> 22 单');
html = html.replace('<strong>月度PC</strong> 158 单', '<strong>月度PC</strong> 317 单');
```

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

---

## Step 4.65: 月度致命/非致命差错列（可选）

若需在 Individual Summary 添加 `月度致命` / `月度非致命` 列，从 Guandata 获取数据后注入。

**数据源：**
- Page: `https://us.data.futuoa.com/page/a367cbbcbb28445a198c3518`
- Card ID: `ndfe729d2affb4323a070459` · Dataset: `ic06ff886844c4de6a191268`
- 关键字段：`m810be6ccbbbb486db0f2f99`（致命）/ `fa0669df08d964728b247041`（非致命）
- 使用 card 自身的 `zoneData`（不可自定义，否则返回空）；加 `地区=US` + 日期范围过滤

**注入位置：** 在 `月度总PC` 列 **前** 插入两个 `<th>` / 每行 `<td>`；注入位置在每行第 10 个 `</td>` 之后（月度总工单之后）。

**着色规则：** 致命 > 0 → `color:#ef4444`（红）；非致命 > 0 → `color:#f59e0b`（橙）。

---

## Step 4.7: 本周业绩小结 (team-facing)

Delete the auto-generated 亮点 / Needs Improvement blocks and inject a bilingual team-facing summary. Structure:

```html
<div style="padding:14px 18px;background:#f8faff;border-radius:8px;font-size:12.5px;color:#1a1a2e;line-height:1.9">
  <div style="font-weight:700;font-size:13.5px;margin-bottom:12px;color:#1456F0">本周业绩小结 Weekly Performance Summary</div>

  <!-- 表现突出 Standouts — green tag, one line per highlight, bilingual -->
  <!-- 本周关注点 Focus Areas — yellow tag, one line per issue, bilingual -->
  <!-- 月度进度 Monthly Progress — purple tag, top 3 monthly PC -->
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

- `[ERROR] 外呼: USCM_AUTH_EXPIRED` → refresh USCM_COOKIE in run_weekly_config.json
- This repo (`us-css-weeklyreport`) is separate from the standard `US-CSS-weekly-report` repo
- Non-standard date ranges still use `--week-start` as the output filename date
- WS CSAT (per-agent) requires WS_COOKIE; team CSAT comes from `us-workspace.futuoa.com/unsatisfied-orders`
