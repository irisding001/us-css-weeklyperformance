---
name: us-css-weeklyperformance
description: Generate US CSS weekly performance report (Sections 1 & 2 only) for the Conversion CS Team — covers Live Chat, Phone, Email, and Outbound. Use for performance-only reports, custom date ranges, or any US CSS report without highlights/plans. Trigger on "临时报告", "performance report", "us-css-weeklyperformance", or custom-date US CSS reports.
---

# US CSS Weekly Performance Report

Sections 1 & 2 only (no Highlights / Next Week Plans). Tables sorted by ticket volume descending. Bilingual performance analysis labels.

**Team (8 agents, from 2026-11-14):** jacelynlim / terrychen / muhamadfaisal / azamuddin / jeanliew / whitneylee / alvinsim / wilsonwong

*(zaydentan 已于 2026-11-14 离职，从成员列表移除；calventan / vincentyew 早期已移除。run.js / run_weekly_patches.js TEAM 均不含此三人)*

**月度 KPI 目标（2026-11 起）：** 团队月度 KPI = **800**（Iris 11月明确指定），原 1200 作废。Individual Summary 表 `月度KPI达成%` 列仍按个人 KPI=100（人均口径，与团队 800 解耦）。

---

## PC 数据来源速查

| PC 类型 | 来源 | 备注 |
|--------|------|------|
| 个人**周度转化PC** | Guandata（run.js 通过 Guandata API 抓取，认证用 USCM_COOKIE，数据源是 `us.data.futuoa.com`） | 若 USCM_COOKIE 过期导致认证失败，patches 阶段仍会用 Guandata 正确值覆盖 |
| 个人**周度咨询PC** | Guandata card `ndfe729d2affb4323a070459` col[6]（客服侧已转化PC）| `run_weekly_patches.js` 自动抓取 |
| 个人**周度总PC** | 咨询PC + 转化PC（patch_corrections 计算） | — |
| 个人**月度总PC** | Guandata card `ndfe729d2affb4323a070459` **col[4]（已转化PC）**，filter: [月初, 周末] | `run_weekly_patches.js` 自动抓取，以 `monthlyTotalPC` 传入 patch_corrections；**唯一口径，不加咨询PC，不用 USCM** |
| **外呼个人周PC** | Guandata card `ndfe729d2affb4323a070459` col[5]（客经侧已转化PC） | `patch_ob_pc.js` 自动抓取；page `a367cbbcbb28445a198c3518`。**唯一口径**，不使用 USCM 全量（见下方说明） |
| **外呼转化率**（有效跟进/分配转化率） | Guandata page `w1b3b7d2e763b45f6a814194`，card `ra25fdcdd1f5643d49983698`（RATE_CARD_ID） | **必须从 Guandata fetch，禁止用 PC÷Leads/有效跟进反算**；无数据（含 PC=0 的 agent）显示 `0.0%` 而非 `-` |
| **渠道咨询PC合计**（consultSection） | Guandata card `oa724299e80dd4e4daaa9301`（GROUP BY 有效跟进方式） | `run_weekly_patches.js` 自动抓取；lc/phone/email 三路 |
| **满意度（全部）** | WS GetBadEvaluations（`us-workspace.futuoa.com/unsatisfied-orders`） | **唯一来源**；channel 1=LC / 2=Phone / 7=Email；`run_weekly_patches.js` 自动抓取 email+team；per-agent 由 patch_lc_csat.js 注入 |
| 概览栏 **周咨询PC** | = `consultSection.total` | `run_weekly_patches.js` 自动更新 |
| 概览栏 **月度PC** | Guandata OB card `ndfe729d2affb4323a070459` **col[4]（已转化PC）**，filter: [月初, 周末]，**全员求和** | `run_weekly_patches.js` 自动从 `monthlyFetch.totalAlreadyConverted` 更新；⚠️ 不可用 Individual Summary 末列求和代替（KPI%数值≠PC数值） |
| 概览栏 **外呼转化PC** | = 外呼个人表 周PC 列合计（Guandata card col[5]） | `run_weekly_patches.js` 自动更新 |
| **转化业务概览行 月总PC** | Guandata OB card `ndfe729d2affb4323a070459` **col[4]（已转化PC）**，filter: [月初, 周末]，全员求和 | `run_weekly_patches.js` 自动更新（`patchConversionOvRow` 第3参数 `monthlyGrandTotal`）；与概览栏月度PC 保持同一值 |
| **转化业务概览行 周外呼转化PC** | Guandata card `ndfe729d2affb4323a070459` col[5] 团队合计（客经侧已转化PC） | run.js 原值为 USCM 全量，**必须手动或脚本覆盖**为 Guandata cohort 合计；与概览栏保持一致 |

---

## 任务完成标准（必读）

报告被视为完成，当且仅当同时满足以下三条：

1. **数据无空缺** — 所有字段有值：Individual Summary 每人 PC/CSAT 非空；外呼表每列有数据；概览栏 周咨询PC / 月度PC / 外呼转化PC 已更新
2. **核查无矛盾/异常** — 通过 check_report.js + 推送前自检清单，无任何 ERROR；WARN 项已逐一确认合理
3. **格式与上周一致** — 打开上周报告（`weekly_report_YYYY-MM-DD_MMDD.html`）对照：列数/列序/着色规则/WoW 子标签位置与上周完全相同；若有新增列须明确标注

⚠️ **推送前必须经用户确认数据**：Claude 必须主动运行 check_report.js，将核查结果逐项输出给用户，等待用户明确确认"数据无误"后，才可提议推送。**不得在数据未经用户确认的情况下直接提议或执行推送。**

⚠️⚠️⚠️ **推送流程硬性规则（2026-10-27 起强制）**：

1. **推送前必须读完 Step 7 全文**（push 流程），不得跳过、不得依赖 memory
2. **飞书推送唯一方式：** `node C:/Users/irisding/push_weekly_report.js --week-start YYYY-MM-DD --week-end YYYY-MM-DD`
3. **禁止** 用 lark-cli / lark-im skill 手动发飞书消息到任何群（bot 不在群会报错，且极易发错群）
4. **禁止** 用 memory 里其他 skill 的 chat_id（如 `oc_6b53...` 是 US-CCS-weekly-report 群，**不是本 skill 的群**）
5. **本 skill 群唯一 chat_id：** `oc_57d5074a6079466f543bfad14bdd459b`（Moomoo US CSS 群），但**不得直接 lark-cli 发**，必须用上述 webhook 脚本
6. **GitHub 推送** 与 **飞书推送** 是两步，可以分别执行；任一步执行前必须先告知用户"即将执行 X 推送"，得到明确同意再执行

**2026-10-27 教训**：未读 Step 7、误用 memory 里另一份报告的 chat_id、用 lark-cli 手动发到错误群（US CSS Team Weekly Report 群），导致消息误发。已撤回，但风险极高。再犯不可原谅。

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

## 全流程一键入口（推荐）

```bash
node C:/Users/irisding/run_weekly.js \
  --week-start YYYY-MM-DD \
  --week-end   YYYY-MM-DD \
  --prev       C:/Users/irisding/us-css-weeklyperformance/weekly_report_prev.html
```

自动链式执行：Step 3 → Step 3.5 → Step 4（postprocess）→ Step 4.0（patches）→ Step 4.6（check）

- `--skip-step3`：跳过 proxy/USCM，复用已有 `weekly_report_TEMP.html`（USCM 未过期时用）
- 输出路径自动推导：`us-css-weeklyperformance/weekly_report_YYYY-MM-DD_MMDD.html`
- `run_weekly_step3.js` 从 `WEEK_START`/`WEEK_END` env vars 读取日期（run_weekly.js 自动传入）

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

**所有满意度数据统一来源：`https://us-workspace.futuoa.com/unsatisfied-orders`**（WS GetBadEvaluations API）。不使用 Guandata / fetch_csat.js。

```bash
node C:/Users/irisding/run_weekly_step3_5.js
# saves to C:/Users/irisding/csat_YYYY-MM-DD.json
```

**WS channel 编号映射：**
| channel 值 | 渠道 |
|-----------|------|
| 1 | LC（在线 Live Chat） |
| 2 | Phone（电话） |
| 7 | Email（邮件） |

**CSAT 计算公式：** `(total - neg) / total`
- `neg` = `optionSatisfied === 3 || optionSatisfied === 4`
- **per-agent**：filter by `item.sid`（staff_id），不分 channel → 综合满意度
- **per-channel**：filter by `item.channel`，再按 agent 分组 → LC/Phone/Email 各渠道满意度
- **team**：所有 evaluations，不分 agent/channel

⚠️ **fetch_csat.js（Guandata 方式）已废弃**，其 email neg 字段长期返回 0（→ CSAT 假性 100%）。全部改用 WS。
⚠️ Email eval 样本通常 < 10/week；100% CSAT + 小样本属正常，留言说明即可。

---

## Step 4: Post-process

```bash
node "C:\Users\irisding\.claude\skills\us-css-weeklyperformance\scripts\postprocess.js" \
  "C:/Users/irisding/weekly_report_TEMP.html" \
  "C:/Users/irisding/us-css-weeklyperformance/weekly_report_YYYY-MM-DD.html" \
  --csat "C:/Users/irisding/csat_YYYY-MM-DD.json"
```

Omit `--csat` to remove the CSAT column entirely. Output filename uses `--week-start` date.

⚠️ **Never use broad regex to remove CSAT manually** — it corrupts LC/Phone/Email columns. postprocess.js handles this safely.

**CSS 自动压缩：** postprocess.js 输出时自动注入 Individual Summary 紧凑样式 override，无需手动调整。

**postprocess.js 自动行为（2026-08-10 起）：**
- 自动删除 Section 三 `满意度分析` 整块（2026-09-01 起）— 报告仅保留 Section 一（团队业绩）和 Section 二（个人业绩）
- 自动删除 `业绩分析 Performance Analysis` 区块（h3 + 内容 div）— 无需手动删除
- 自动删除 `满意度小结` 区块（h3 + 内容 div）— 已由 Section 三 整体删除覆盖
- 全局删除所有 `.dot-red` 红灯指示器（含 position:relative 外层 span），仅保留彩色文字
- 自动删除外呼个人表内的满意度分布行（在线/电话/邮件/超赞/满意/一般/不满意/糟糕，2026-09-01 起）
- 外呼个人表：全部度量列标绿 top1；仅比率+PC列标红 bottom1
- **Individual Summary CSAT 着色（2026-09-01 起）：** 周满意度（cells[5]）和月满意度（cells[8]）统一规则：< 84% 标红（`color:#ef4444`）；top1 标绿（`color:#15803d`）；不显示小红点

---

## Step 4.0: Run automated patch pipeline (one command)

**推荐方式（2026-09-01 起）：** 一条命令完成所有 patch 步骤（4.1~4.55）并自动更新概览栏。

```bash
node C:/Users/irisding/run_weekly_patches.js \
  --week-start YYYY-MM-DD \
  --week-end   YYYY-MM-DD \
  --report     C:/Users/irisding/us-css-weeklyperformance/weekly_report_YYYY-MM-DD_MMDD.html \
  --prev       C:/Users/irisding/us-css-weeklyperformance/weekly_report_prev-YYYY-MM-DD_MMDD.html \
  [--pc-kpi N]
```

**`--pc-kpi`**：月度PC KPI 目标（默认 `100`，9月起生效）。传入后作为 `PC_KPI` env var 传给 patch_corrections.js，用于计算 KPI 完成度列（`月度总PC ÷ PC_KPI`，百分比显示，时间进度着色）。

- **KPI 完成度着色规则**：`pct/100 < weekEndDay/daysInMonth`（当前进度落后）→ 红色 `#dc2626`；否则绿色 `#16a34a`
- **9月 PC_KPI = 100**（无需每次传入，默认值已是 100）

自动执行顺序：
1. Cookie 有效性检查（DATA_COOKIE / WS_COOKIE，失败则退出并给出提示）
2. 从 Guandata OB card 抓取 weeklyConsultPC（col[6]）+ monthlyTotalPC（col[4]）
3. 从 PC detail card 抓取 consultSection（lc/phone/email）
4. 从 WS GetBadEvaluations 抓取 emailCsat + teamCsat + perAgentCsat（含 LC/Phone/Email 分渠道）
5. patch_corrections.js（注入咨询PC、渠道PC、CSAT）
6. patch_ob_pc.js（重建/更新外呼个人表，内置幂等检测）
7. patch_lc_csat.js（注入 LC CSAT 到个人渠道表）
8. patch_channel_wow.js（注入 WoW 子标签）
9. patch_email_data.js（注入邮件 per-agent 工单/SLA/CSAT；解析 PATCH_EMAIL_SUMMARY 更新 Channel Team Summary 邮件行）
10. 注入 per-agent CSAT → Individual Summary cells[5]（周满意度）
11. 覆盖转化业务概览行 周外呼转化PC（Guandata cohort 合计）
12. 自动更新概览栏（周咨询PC / 月度PC / 外呼转化PC）
13. 更新概览栏 CSAT chips（综合满意度 / 在线 CSAT / 电话 CSAT / 邮件 CSAT）

⚠️ 脚本读取 `run_weekly_config.json` — 运行前确保 DATA_COOKIE / WS_COOKIE 有效。
⚠️ patch_ob_pc.js 内置幂等检测：已是 9 列时跳过重建，只更新 PC+转化率；完整 pipeline 可重复运行。

### 手动注入脚本（run_weekly_patches 之后执行，顺序固定）

run_weekly_patches.js 完成后，还需运行以下手动注入脚本（顺序敏感，前者输出会被后者覆盖）：

| 顺序 | 脚本 | 作用 |
|------|------|------|
| 1 | `inject_lc_email_wow.js` | LC/Email 行 WoW 子标签（patch_channel_wow 漏注入的修复） |
| 2 | `inject_conv_wow.js` | 转化业务表 4 列 WoW（不含月总PC） |
| 3 | `inject_fatal_individual.js` | Individual Summary 致命/非致命差错列 |
| 4 | `inject_eff_follow_red.js` | 外呼个人表 有效跟进 < 50 标红 |
| 5 | `inject_kpi_time_chips.js` | 概览栏第二行：月时间进度 + KPI 进度 chip |
| 6 | `inject_wow_kpi.js` | Channel Team Summary + 转化业务汇总 WoW（必跑，否则 Channel Team Summary 无 WoW） |
| 7 | `inject_summary.js` | 本周业绩小结 + email CSAT 行 + 综合满意度名单 |

⚠️ **所有手动注入脚本必须放在 run_weekly_patches.js 之后**，否则 patches 会覆盖手动改动。
⚠️ **inject_summary.js 必须最后**，因其锚点依赖前序脚本的最终 HTML 状态。

### inject_wow_kpi.js 已知坑（2026-11-16 修复）

1. **目录硬编码错误**：脚本 `findLastWeekReport()` 原指向 `C:/Users/irisding/us-css-weeklyreport`（旧目录），会误抓到该目录下的过时文件作为上周基准。**已修复为 `us-css-weeklyperformance`**。若再次出现上周基准数据异常，先检查此路径。
2. **WoW span 重复注入**：`inject_wow_kpi.js`（注入 `<span style="font-size:9px">`）与 `patch_channel_wow.js`（注入 `<span class="sub-lbl">`）都对 Channel Team Summary 4 行注入 WoW，若两个格式都存在会导致同一指标显示两行 WoW。**idempotency regex 已加强**，覆盖 `sub-lbl` 格式 + unicode minus `−` + ascii `-`。重复时清理命令：
   ```bash
   node -e "
   const fs=require('fs');
   let h=fs.readFileSync('REPORT.html','utf8');
   h=h.replace(/<span class=\"sub-lbl\" style=\"color:#(?:15803d|ef4444)\">[▲▼][−-]?[^<]*<\/span>/g,'');
   h=h.replace(/<span style=\"display:block;font-size:9px;color:#(?:16a34a|dc2626);line-height:1\.2;margin-top:1px\">[▲▼][^<]*<\/span>/g,'');
   fs.writeFileSync('REPORT.html',h);
   "
   ```
   清理后再重跑 `inject_wow_kpi.js`。

### 手动注入脚本自动化重构（2026-11-23）

**已重构脚本（无需每周手动改数据）：**

| 脚本 | 重构内容 |
|------|---------|
| `inject_conv_wow.js` | 从命令行参数读 cur/prev 路径，默认自动取目录最新+次新；从 HTML 转化业务表提取 cur/prev 5 个值，不再硬编码 |
| `build_card.js` | REPORT_PATH 从命令行参数或目录最新文件自动推导；日期范围从文件名提取；Highlights 从 HTML 块自动提取（不再手写） |
| `inject_kpi_time_chips.js` | chip 标签改为"季度时间进度/季度KPI进度"（原"月时间进度/KPI 进度"已废弃）；口径改季度（Q4=92 天） |

**用法：**
```bash
node inject_conv_wow.js [当前周报告路径] [上周报告路径]
node build_card.js [报告路径]
node inject_kpi_time_chips.js  # 仍硬编码 REPORT，需每周改路径
```

**inject_kpi_time_chips.js 仍需每周手动改：**
- `REPORT` 路径（本周报告）
- `kpiPct` 值（从 `fetch_kpi_quarterly.js` 输出读取）
- `weekEndDay`（Q4 累计天数，如 11/22 = 53）

**Highlights 块 HTML 提取锚点（build_card.js）：**
- 外层 div style 含 `padding:14px 18px;background:#f8faff;border:1.5px solid #1456F0`
- `display:block` 的 `<span>` 视作换行
- 若 Highlights HTML 结构变化，extractHighlights 会返回空，需调试 regex

---

---

## Step 4.05: Patch Section 二 rank highlighting (patch_section2_ranks.js)

Section 二（渠道个人明细）合并表默认无 top/bot 高亮。此脚本对 8 列加 rank-top（绿）/rank-bot（红）：
- LC: 30s 接通 / CSAT / FCR
- Phone: 20s 接通 / CSAT / FCR
- Email: SLA / CSAT

**工单量 / 呼入量不加高亮**（按 Iris 指示）。
`-` 空值不参与排名。同列同值并列标同色。

```bash
node "C:/Users/irisding/us-css-weeklyperformance/scripts/patch_section2_ranks.js" \
  "C:/Users/irisding/us-css-weeklyreport/weekly_report_YYYY-MM-DD_MMDD.html"
```

⚠️ **运行时机：** 在 postprocess.js 之后、patch_ob_pc.js 之前。脚本只改 Section 二第一张表（渠道个人明细），不影响其他表。

---

## Step 4.1: Patch outbound individual table (patch_ob_pc.js)

run.js 输出的外呼个人表只有 5 列（Agent|分配Leads|跟进量|有效跟进|周PC_USCM），且 周PC 用 USCM 全量值而非 cohort 值。此步骤完全重建该表为正确 9 列，并从 Guandata 抓取 cohort PC。

**通过 run_weekly_patches.js 调用（推荐）** — 自动传入 PATCH_REPORT/PATCH_START/PATCH_END 环境变量。

**手动运行（如需单独运行）：** 更新脚本顶部三个常量或设置 env vars：
```bash
PATCH_REPORT=".../weekly_report_YYYY-MM-DD.html" PATCH_START="YYYY-MM-DD" PATCH_END="YYYY-MM-DD" \
  node C:/Users/irisding/patch_ob_pc.js
```

**RATE_CARD_ID（转化率卡片）：**
- 已固定：`ra25fdcdd1f5643d49983698`（page `w1b3b7d2e763b45f6a814194`）
- ⚠️ **禁止反算**：转化率必须从 Guandata fetch，不得用 cohort PC ÷ 有效跟进 / 分配Leads 代替
- PC=0 的 agent（如 jeanliew 本周无转化）：rate card 应返回 0% → 显示 `0.0%`，而非 `-`
- 若 rate card 返回空行（agent 不在结果中）→ 显示 `0.0%` 而非 `-`（表示有跟进但 0 转化）

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

⚠️ **幂等说明：** patch_ob_pc.js 内置列数检测 — 首次运行检测到 5 列时完整重建为 9 列；后续运行检测到 ≥9 列时跳过重建，仅更新 PC 和转化率列。可安全重复运行，无需 git checkout。

---

## Step 4.4: Patch LC CSAT to 个人渠道业绩 table

Fetches LC-only CSAT from WS and injects WS 满意度 data into the 在线 Live Chat group of the per-agent channel table (Section 二).

**LC-only vs combined CSAT:** postprocess.js already fills the 满意度 column from the csat JSON (combined cross-channel formula). This step OVERWRITES those values with WS-sourced LC-only CSAT, which is more accurate for the channel breakdown view.

**Script:** `C:/Users/irisding/patch_lc_csat.js`

**通过 run_weekly_patches.js 调用（推荐）** — 自动传入 PATCH_REPORT/PATCH_START/PATCH_END/WS_COOKIE 环境变量。

**手动运行：**
```bash
PATCH_REPORT=".../weekly_report_YYYY.html" PATCH_START="YYYY-MM-DD" PATCH_END="YYYY-MM-DD" \
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
| 邮件工单总量 | **Guandata API 自动获取**（见下方） | 验证：各人之和 = 团队合计 |
| 邮件 SLA | patch_email_data.js console 输出 team SLA（加权均值，非各人平均） | 格式：XX.X% |
| 邮件 CSAT | WS GetBadEvaluations `channel === 7`，formula: `(total-neg)/total` | 样本 < 10 可接受，留言说明 |

**邮件工单总量 — Guandata API 方法（patch_email_data.js）：**
- Card: `fa9508e7b7ef0432bb2f68ea` · Dataset: `b2c3bbdd011c8413c9efea28`
- Filter fdId: `d9cd5c72c8fab4ba080a791a`（工单创建-日，BT 口径）
- 认证：`DATA_COOKIE`（含 uIdToken），加 `raw-backend-response: TRUE` header
- 聚合：SUM 所有 agent 的 `data[i][0].v` = 团队邮件工单总量
- ⚠️ 勿用 `ncd519d0a95e74646bf48e5f`（CSAT 评价数据集，只含被评价工单，值偏小，如 47 vs 实际 176）

**着色：** SLA ≥90% / CSAT ≥84% → `color:#15803d`；否则 `color:#ef4444`

同时更新**合计 Total 行**总工单 = LC + Phone + Email 各行之和。

---

## Step 4.5: Data corrections (now auto-fetched)

**2026-09-01 起：所有数据通过 `run_weekly_patches.js` 自动抓取，无需手动 corrections JSON。**

自动获取内容：
- `weeklyConsultPC` — Guandata OB card `ndfe729d2affb4323a070459` col[6]（客服侧已转化PC，周度）
- `monthlyTotalPC` — 同 card col[4]（已转化PC，月初至周末）；**唯一个人月度PC来源，不加咨询PC**
- `consultSection` (lc/phone/email) — Guandata card `oa724299e80dd4e4daaa9301` GROUP BY 有效跟进方式
- `emailCsat` — WS GetBadEvaluations `channel === 7`
- `teamCsat` — WS GetBadEvaluations all channels

**数据来源映射：**

| dim[4] / channel 值 | 映射渠道 |
|---------------------|---------|
| 客服工单-在线咨询 | LC |
| 客服工单-电话 | Phone |
| 客服工单-邮件 | Email |
| 外呼 / SMS | 不计入咨询PC |

⚠️ **如 consultSection GROUP BY 返回空**（历史上曾出现），`run_weekly_patches.js` 自动降级：consultSection.total = weeklyConsultPC 之和；lc/phone/email 为 0（Channel Team Summary 渠道 consultPC 列留空需手动填入）。

⚠️ **咨询PC 字段已从 USCM API 移除。** run.js TEMP HTML 中个人咨询PC 全为 0 是正常的；patch 阶段由 run_weekly_patches.js 填入正确值。

**手动 corrections JSON（如需覆盖自动值）：**
```json
{
  "weeklyConsultPC": { "agentName": 3, ... },
  "monthlyTotalPC":  { "agentName": 31, ... },
  "consultSection":  { "total": 57, "lc": 31, "phone": 20, "email": 6 },
  "emailCsat": "71.0%",
  "teamCsat":  "85.3%"
}
```
```bash
node ".../patch_corrections.js" <report.html> --config corrections.json
```

Notes:
- `jeanliew` / `wilsonwong` often have 0 weekly consult PC
- `monthlyTotalPC`: Guandata col[4] 已转化PC per agent，month-to-date。**个人月度总PC = 此值，不再 + consult**
- `teamCsat`: overall WS CSAT shown in consultation header (fetch from `us-workspace.futuoa.com`)
- 个人月度总PC 合计 应 = 概览栏月度PC = 转化业务月总PC（三者同源 Guandata col[4]）

```bash
node "C:\Users\irisding\.claude\skills\us-css-weeklyperformance\scripts\patch_corrections.js" \
  "C:/Users/irisding/us-css-weeklyperformance/weekly_report_YYYY-MM-DD.html" \
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

**⚠️ 外呼转化PC 两个数字说明（不要混淆）：**
- **客经侧已转化PC（Guandata col[5]）= cohort 口径**：仅统计本周新分配 Leads 在本周内的转化，是报告的**唯一标准指标**
- **USCM 全量 PC（转化业务团队汇总行）**：本周所有外呼转化，含历史 Leads 本周才转化的，与 cohort 值通常不一致
- 概览栏外呼转化PC、个人外呼表周PC列、WoW 对比，**全部使用 cohort（Guandata）口径**，忽略 USCM 全量值

**外呼表列顺序规则（固定）：**
```
分配Leads | 跟进量 | 跟进率 | 有效跟进 | 有效跟进率 | 分配转化率 | 有效跟进转化率 | 周PC
```
- 分配转化率 在 有效跟进转化率 **左侧**
- postprocess.js / patch_ob_pc.js 自动标绿+标红所有度量列（col1~col8，含分配Leads）top1绿 + bottom1红 — **无需手动**
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

**Bug 5 (2026-10-26 修复): postprocess.js 业绩分析 regex 吞掉整个 Section 二**
原 regex `<h3[^>]*>业绩分析[^<]*<\/h3>[\s\S]*?(?=\s*<div style="padding:14px 18px;background:#f8faff)` 的 lookahead 锚定到 Section 三之后的本周业绩小结 div，`[\s\S]*?` 一路吞掉了渠道个人明细表 + 外呼表 + Section 三，导致报告只剩 3 张表（Section 一）。
修复：regex 改为只匹配业绩分析 h3 + 自身包裹 div：`<h3[^>]*>业绩分析[^<]*<\/h3>\s*<div[^>]*>[\s\S]*?<\/div>\s*<\/div>`。
症状：检查报告 grep `id="二"` 只返回 1 行且无 `Channel Breakdown` 文本 → 即中此 bug，需重跑 postprocess + 全部 patches。

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

### Overview bar（2026-09-01 起由 run_weekly_patches.js 自动更新）：

`run_weekly_patches.js` 在所有 patch 步骤完成后自动更新三个概览栏字段：
- **周咨询PC** ← `consultSection.total`（自动抓取）
- **月度PC** ← Guandata OB card `ndfe729d2affb4323a070459` col[4]（已转化PC）全员求和，filter: [月初, 周末]（`monthlyFetch.totalAlreadyConverted`，不是 Individual Summary 末列求和）
- **外呼转化PC** ← Guandata OB card col[5] 团队合计（客经侧已转化PC）

### Iris 自定义概览 chip（2026-11-14 更新：团队改季度口径）

Iris 在本周概览栏额外要求两个 chip（run_weekly_patches.js 未自动注入，需手动加在"月度PC"chip 后面）：

- **季度KPI进度**：Guandata page `e44cbeaa851f442ac80c5984` card 10 返回的团队 PC达成率（如 `42.7%`），**不带括号**（不显示 842/1972）
- **季度时间进度**：**汇报截止日（周末）**累计天数 / 季度总天数（Q4=92 天；如 11/08 → 39/92 = 42.4%），保留 1 位小数 + `%`。⚠️ 不是今天，是报告周的周末

注入脚本：`C:/Users/irisding/inject_kpi_time_chips.js`

每季度/每周手动更新两个值：
- **季度KPI进度**：从 `fetch_kpi_quarterly.js` 输出读取（`data[0][2].v` × 100，保留 1 位小数）
- **季度时间进度**：`cumulativeDays / daysInQuarter`（如 11/14 → 44/92 = 47.8%），保留 1 位小数 + `%`

锚点：`<span ...><strong>邮件 CSAT</strong> XX.X%</span>` chip（第一行最后一个），注入到其后面，用 `<span style="flex-basis:100%;height:0"></span>` 强制换行到第二行。

⚠️ **Flex 容器换行技巧**：概览栏 chips 容器是 `display:flex;flex-wrap:wrap`，`<br>` 不生效。必须用 `<span style="flex-basis:100%;height:0"></span>` 强制换行。

⚠️ **chip 标签必须写"季度时间进度 / 季度KPI进度"，不要写"月时间进度 / KPI 进度"**（2026-11-14 Iris 明确要求）。

⚠️ **个人月度 KPI 仍在 Individual Summary 表"月度KPI达成%"列展示，不受此 chip 影响**（团队用季度，个人用月度）。

### 转化业务表 WoW 子标签（2026-10-26 新增，需手动注入）

转化业务表（Outbound Contacts | Effective | Effective Rate | Weekly OB Conv. PC | Monthly Total PC）4 列需手动注入 WoW 子标签（**月总PC 不加 WoW** — Iris 明确要求）。

注入脚本：`C:/Users/irisding/inject_conv_wow.js`

每月需手动更新 cur/prev 数据对象：
```js
const cur={contacts:2294, eff:415, effRate:18.1, weeklyPC:61, monthlyPC:472};
const prev={contacts:2187, eff:435, effRate:19.9, weeklyPC:71, monthlyPC:356};
```

| 列 | WoW 来源 |
|---|---|
| 外呼跟进量 | cur.contacts - prev.contacts |
| 有效跟进量 | cur.eff - prev.eff |
| 有效跟进率 | cur.effRate - prev.effRate（单位 `pp`） |
| 周外呼转化PC | cur.weeklyPC - prev.weeklyPC |
| **月总PC** | ❌ 不加 WoW |

⚠️ patch_channel_wow.js 不处理转化业务表，仅处理 Channel Team Summary（合计/LC/Phone/Email 4 行）。转化业务表 WoW 需手动注入。

### 外呼个人表 有效跟进 < 50 标红（2026-10-27 新增，需手动注入）

外呼个人表（Section 二 外呼 Outbound Conversion）的"有效跟进"列（第5列）值 < 50 时标红：`<strong style="color:#ef4444;font-weight:600">N</strong>`。

注入脚本：`C:/Users/irisding/inject_eff_follow_red.js`

- 锚点：外呼表 `<tbody>` 内每行第 5 个 `<td>`
- 幂等：已标红（含 `<strong`）的 cell 跳过；纯数字 cell 才处理
- 阈值：`< 50` 标红；`>= 50` 不动；`-`（无跟进）保持原红色样式

### 转化业务表 WoW 已知 bug：patch_channel_wow.js 漏注入 LC/Email 行

`patch_channel_wow.js` 的 regex `/<tr[^>]*>[\s\S]*?<\/tr>/g` 在合并 `<tr>` 时，因合计行缺 `</tr>` 闭合标签，会把合计行 + 在线 Live Chat 行合并成一行，导致 LC 行 label 匹配优先命中"合计 Total"，最终只注入 合计/Phone 两行 WoW，LC/Email 被 SKIP。

**临时修复**：用独立 node 脚本 `inject_lc_email_wow.js`（待补 skill 文档）手动注入 LC/Email 行的 WoW 子标签。

### 致命/非致命差错列（Step 4.65）— 已知失败 TODO

`fetch_fatal.js` 当前 401（card `ndfe729d2affb4323a070459` POST data 返回 1012 非法过滤参数 / 0 rows）。原因排查中：
- region fdId 用 `ud94da47e746c4b5e9a9f8f6`（旧值）→ 改用 `l08320afe361b46ed9294ac3`（与 patches 一致）后 status=200 但 rows=0
- 可能 fatal/nonfatal 字段（`m810be6ccbbbb486db0f2f99` / `fa0669df08d964728b247041`）不在此 card，或需配合 team filter（`n639f8972951f40b5b498f17`）

**临时方案**：手动从 Guandata 后台或 USCM 月报获取致命/非致命数据，手动注入 Individual Summary 月度列。本报告（10/19-10/25）未注入致命/非致命，后续需 Iris 协助定位正确 card / fdId。

如需手动更新（run_weekly_patches.js 未运行的情况）：
```js
html = html.replace(/(<strong>周咨询PC<\/strong>)\s*\d+\s*单/, '$1 22 单');
html = html.replace(/(<strong>月度PC<\/strong>)\s*\d+\s*单/,   '$1 317 单');
html = html.replace(/(<strong>外呼转化PC<\/strong>)\s*\d+\s*单/, '$1 43 单');
```

---

## Step 4.55: Channel Team Summary WoW 子标签（自动）

渠道汇总表（合计/在线/电话/邮件）的 **工单量、咨询PC、满意度** 三列自动注入 WoW 对比子标签。

**Script:** `C:/Users/irisding/patch_channel_wow.js`

```bash
node C:/Users/irisding/patch_channel_wow.js \
  --current C:/Users/irisding/us-css-weeklyperformance/weekly_report_YYYY-MM-DD_MMDD.html \
  --prev    C:/Users/irisding/us-css-weeklyperformance/weekly_report_PREV-MM-DD_MMDD.html
```

- `--prev` 填上一周的报告文件名（通常是上周一 ~ 上周日那份）
- 脚本自动读取双方 Channel Team Summary，计算差值并注入；可重复运行（幂等）
- CSAT 差值单位 `pp`；工单/PC 用整数差；正绿负红零灰

**格式：**
```html
<span class="sub-lbl" style="color:#15803d">▲+20</span>
<span class="sub-lbl" style="color:#ef4444">▼-14</span>
<span class="sub-lbl" style="color:#999">±0</span>
```

⚠️ **必须对 `us-css-weeklyperformance/` 目录内的文件运行**，对 `us-css-weeklyreport/` 目录的文件运行后不会更新本仓库内容。

**运行后验证（必做）：** 确认 **4 行 × 3 列 = 12 个** WoW 标签都已注入。在线/电话/邮件行若缺少咨询PC 或 满意度 WoW，说明脚本用了错误路径的文件，需重跑：

```bash
# 快速检查：输出各行的 pc / csat 列文本（含 WoW 则有 ▲/▼）
node -e "
const html = require('fs').readFileSync('C:/Users/irisding/us-css-weeklyperformance/weekly_report_YYYY-MM-DD_MMDD.html','utf8');
const idx = html.indexOf('Channel Team Summary');
const tbl = html.slice(html.indexOf('<table',idx), html.indexOf('</table>',html.indexOf('<table',idx))+8);
(tbl.match(/<tr[^>]*>[\s\S]*?<\/tr>/g)||[]).forEach(r=>{
  const name=(r.match(/<td><strong>([^<]+)<\/strong><\/td>/)||[])[1];
  if(!name) return;
  const tds=[...r.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m=>m[1].replace(/<[^>]+>/g,'').trim());
  console.log(name.slice(0,12).padEnd(14),'pc:',tds[2],'| csat:',tds[3]);
});
"
# 每行 pc 和 csat 应包含 ▲ 或 ▼
```

---

## Step 4.6: Data check

```bash
node "C:\Users\irisding\.claude\skills\us-css-weeklyperformance\scripts\check_report.js" \
  "C:/Users/irisding/us-css-weeklyperformance/weekly_report_YYYY-MM-DD.html" \
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

⚠️ **月度KPI达成必须带 `%` 显示**（如 `56%`，不能显示纯数字 `56`）。run.js 生成的值有时不带百分号，需检查并修复：
```js
// 修复：Individual Summary 最后一列纯数字 → 加 %
tbl = tbl.replace(/<tr>([\s\S]*?)<\/tr>/g, (rowHtml, inner) => {
  const cells = [...inner.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)];
  if (cells.length < 10) return rowHtml;
  const last = cells[cells.length-1];
  const val = last[2].replace(/<[^>]+>/g,'').trim();
  if (/^\d+$/.test(val))
    return rowHtml.replace(last[0], last[0].replace(val + '</td>', val + '%</td>'));
  return rowHtml;
});
```

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
  "C:/Users/irisding/us-css-weeklyperformance/weekly_report_YYYY-MM-DD.html" \
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

## Step 4.65: 本周重点 Highlights 块（2026-11-09 新增，2026-11-14 改季度口径，必做）

报告顶部（业绩情况 Section 一 开头，概览栏下方）插入"本周重点 Highlights"块，让 KPI 进度和外呼进步一眼可见。

**口径规则（2026-11-14 起，强制）：**
- **团队行用季度口径**：季度KPI进度 + 季度时间进度
- **个人行用月度口径**：月度KPI达成率（Individual Summary 月度KPI% 列）
- 两者不可混用，团队行不展示个人月度百分比

**结构（两块，按顺序）：**

1. **KPI 进度榜 KPI Progress**（紫色 chip，标题含"季度 Q4"）
   - 全队 **季度KPI进度 XX.X%**，季度时间进度 XX.X%（截至 MM/DD），落后/领先 Npp
   - KPI 领先：agent（不展示百分比，个人月度口径）
   - KPI 需追赶（N 人）：agent、agent、agent...

2. **外呼进步榜 Progress / Regression**（绿色 chip）
   - **Praise 夸奖**（有效跟进量 进步）：agent（+N）
   - **Watch 关注**（有效跟进量 退步）：agent（-N）、agent（-N）
   - **Alert 预警**：agent（有效跟进 +N 但转化少）/ agent（特殊说明）

**红色加粗突出（2026-11-16 起，强制）：**
- "落后 Npp" → `<strong style="color:#dc2626">落后 Npp</strong>`
- "KPI 需追赶" 整行标签 + 名单内容 → `<strong style="color:#dc2626">KPI 需追赶（N 人）</strong>：<strong>agent、agent、agent...</strong>`
- "关注 Watch" 整行标签 + 名单内容 → `<strong style="color:#b45309">关注 Watch</strong>（...）：<strong>agent（-N）、agent（-N）</strong>`
- "预警 Alert" 整行标签 + 内容 → `<strong style="color:#dc2626">预警 Alert</strong>：<strong>agent（...）</strong>`

**HTML 模板：**
```html
<div style="padding:14px 18px;background:#f8faff;border:1.5px solid #1456F0;border-radius:8px;font-size:13px;color:#1a1a2e;line-height:1.9;margin-bottom:16px">
  <div style="font-weight:700;font-size:14px;margin-bottom:12px;color:#1456F0">本周重点 Highlights</div>

  <div style="margin-bottom:12px">
    <span style="font-size:11px;font-weight:700;background:#ede9fe;color:#7c3aed;padding:2px 8px;border-radius:3px;margin-right:8px">KPI 进度榜 KPI Progress（季度 Q4）</span><br>
    <span style="display:block;margin-top:6px">· 全队 <strong>季度KPI进度 <span style="color:#dc2626">XX.X%</span></strong>，季度时间进度 <strong>XX.X%</strong>（截至 MM/DD），<strong style="color:#dc2626">落后 Npp</strong> / Team quarterly KPI XX.X%, behind time progress XX.X% by Npp</span>
    <span style="display:block">· <strong style="color:#15803d">KPI 领先</strong>：agent / Above time progress</span>
    <span style="display:block">· <strong style="color:#dc2626">KPI 需追赶（N 人）</strong>：<strong>agent、agent、agent...</strong> / Behind time progress</span>
  </div>

  <div>
    <span style="font-size:11px;font-weight:700;background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:3px;margin-right:8px">外呼进步榜 Progress / Regression</span><br>
    <span style="display:block;margin-top:6px">· <strong style="color:#15803d">夸奖 Praise</strong>（有效跟进量 进步）：agent（+N）、agent（+N）/ agents — effective follow-up improved</span>
    <span style="display:block">· <strong style="color:#b45309">关注 Watch</strong>（有效跟进量 退步）：<strong>agent（-N）、agent（-N）</strong>— 跟进量明显下滑，需关注 / effective follow-up declined significantly</span>
    <span style="display:block">· <strong style="color:#dc2626">预警 Alert</strong>：<strong>agent（...）</strong>/ agent: ...</span>
  </div>
</div>
```

**数据来源：**
- **季度KPI进度** = Guandata page `e44cbeaa851f442ac80c5984` card 10 `xf5c0a2b883c4467185b5079`（KPI达成情况），filter: 地区=US, 是否转化客服=是, 分区日期=Q4 范围；返回团队 PC达成率
- **季度时间进度** = **汇报截止日（周末）**至季度起始的天数 / 季度总天数（Q4 = 92 天；如 11/08 → 39/92 = 42.4%）。⚠️ 不是今天，是报告周的周末
- **个人 KPI**（月度）= Individual Summary 月度KPI% 列，用于"KPI 领先/追赶"名单筛选
- **外呼进步榜 WoW 对比**：从上周报告（`weekly_report_PREV-MM-DD_MMDD.html`）外呼个人表抓**有效跟进量**（第5列，col[4]）做 WoW 对比，按差值排序分类。**口径是有效跟进量，不是周PC**（2026-11-16 Iris 明确要求）

**fetch 脚本：** `C:/Users/irisding/fetch_kpi_quarterly.js`（团队汇总）

**排序规则（强制）：**
- Individual Summary 表：按 **周度总PC 倒序**
- 外呼个人表：按 **周PC 倒序**
- KPI 领先/追赶名单：按 KPI% 倒序（领先） / 正序（追赶）

---

## Step 4.7: Individual Summary 排序 + CSAT 标红（2026-11-09 新增，必做）

**排序：** Individual Summary 表 tbody 行按 **周度总PC 倒序**（cells[3]，第4列）。

**CSAT 标红：** 周满意度（cells[4]）和月满意度（cells[7]）< 84% → `<strong style="color:#ef4444">XX.X%</strong>`。

注入脚本：`C:/Users/irisding/fix_ind_summary.js`

```bash
node C:/Users/irisding/fix_ind_summary.js \
  "C:/Users/irisding/us-css-weeklyperformance/weekly_report_YYYY-MM-DD_MMDD.html"
```

⚠️ **Individual Summary 表不加 WoW 子标签**（Iris 明确要求）。WoW 只在 Channel Team Summary 和外呼个人表。

---

## Step 4.75: 外呼个人表排序 + WoW 三列（2026-11-09 新增，必做）

**排序：** 外呼个人表 tbody 行按 **周PC 倒序**（cells[8]，第9列）。

**WoW 注入范围（仅 3 列）：**
- 跟进量（cells[2]）
- 有效跟进（cells[4]）
- 周PC（cells[8]）

**其他列不加 WoW：** 分配Leads / 跟进率 / 有效跟进率 / 分配转化率 / 有效跟进转化率 — 全部无 WoW。

**WoW 样式（强制）：**
```html
<span class="sub-lbl" style="font-size:9px;font-weight:400;margin-top:1px">
  <span style="color:${arrowColor};font-weight:600">▲</span>
  <span style="color:#000;font-weight:400">+N</span>
</span>
```
- `sub-lbl` 用 `display:block`（CSS 已定义，上下显示）
- 箭头保留颜色（▲ 绿 #15803d / ▼ 红 #dc2626 / ➡️ 灰 #6b7280 / — 灰 #9ca3af）
- 数字黑色 `#000`，font-weight 400
- 字号 9px

注入脚本：`C:/Users/irisding/fix_ob_table.js`

```bash
node C:/Users/irisding/fix_ob_table.js \
  "C:/Users/irisding/us-css-weeklyperformance/weekly_report_YYYY-MM-DD_MMDD.html"
```

⚠️ **跟进量列数据反推**：若 patch_ob_pc.js 输出的跟进量列数据错误（如显示百分比而非整数），用 `Follow = round(Leads × FollowRate%)` 反推。

---

## Step 4.8: 本周业绩小结 (team-facing)

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

## Step 4.9: 推送前完整核查（必做，不得跳过）

⚠️ **强制流程：先核查 → 输出结果给用户 → 等用户明确确认数据无误 → 再提议推送。**
任何情况下不得跳过此步骤，不得在用户未确认数据前提议或执行 git push / 飞书发送。

**在询问用户是否推送之前**，主动执行以下全部检查，将结果以表格形式输出给用户。任意一项异常 → 停止，说明问题，等待用户确认后再继续。

### A. 数据完整性

| 检查项 | 标准 | 实际值 |
|--------|------|--------|
| 个人周度转化PC | 大部分人非零 | ___ |
| 个人周度咨询PC | 全员已填入（corrections） | ___ |
| 渠道咨询PC合计（lc+phone+email） | = 概览栏周咨询PC | ___ |
| 外呼个人周PC合计 | = 概览栏外呼转化PC（Guandata cohort） | ___ |
| 概览栏月度PC | = Guandata OB card col[4] 全员求和（含休假成员） | ___ |
| Individual Summary CSAT | 无人显示 `-`（有工单的 agent） | ___ |
| 外呼个人表转化率 | 无人显示 `-`（从 Guandata rate card fetch） | ___ |
| per-agent email 工单量 | 非全零（有邮件工单的 agent） | ___ |
| 业绩分析亮点 | 已存在 | ___ |
| 业绩分析待提升点 | 已存在（有异常时必须填写） | ___ |

### B. 数据正确性 / 无矛盾

- 概览栏三项数值 = 对应表格合计（周咨询PC / 月度PC / 外呼转化PC）
- Channel Team Summary 合计行 = LC + Phone + Email 各行之和
- per-agent email 工单量合计 = Channel Team Summary 邮件工单量
- 外呼个人表 周PC 列合计 = 概览栏外呼转化PC
- 外呼转化率来自 Guandata rate card（不是反算），PC=0 的 agent 显示 `0.0%` 而非 `-`
- 转化业务概览行 周外呼转化PC = Guandata cohort 合计（非 USCM 全量）
- 月度KPI达成列格式带 `%`（如 `56%`，不能是纯数字 `56`）

### C. 格式检查

- 对照上周报告（上一个 `weekly_report_*.html`）：列数 / 列序 / 着色规则一致
- **本周重点 Highlights 块已注入**（KPI 进度榜 + 外呼进步榜，KPI 在前）
- **Individual Summary 按 周度总PC 降序排列**（最高在最上）
- **Individual Summary CSAT < 84% 标红**（cells[4] 周满意度 + cells[7] 月满意度，`color:#ef4444`）
- **外呼个人表按 周PC 降序排列**
- **外呼个人表 WoW 仅在 3 列显示**（跟进量/有效跟进/周PC，其他列无 `sub-lbl`）
- WoW 子标签上下两行显示（`display:block`），箭头保留颜色，数字黑色
- 外呼个人表表头只有一行（tbody 内无重复 `<tr><th>` 行）
- WoW 子标签：Channel Team Summary 4 行 × 3 列 = 12 个 `▲/▼` 标签均已注入
- Individual Summary：无满意度 `-`、无 dot-red 指示器、月度KPI达成带 `%`

### D. 错误 / WARN 检查

```bash
node "C:/Users/irisding/.claude/skills/us-css-weeklyperformance/scripts/check_report.js" \
  "C:/Users/irisding/us-css-weeklyperformance/weekly_report_YYYY-MM-DD_MMDD.html"
```

- 所有 `✗ ERROR` 必须修复后再推送
- `! WARN` 项逐一确认合理后方可推送

---

## Step 5: Upload to GitHub

> ⚠️ **执行前必须向 Iris 确认**：列出将要执行的命令，等待 Iris 明确回复"确认"或"yes"后再执行。

⚠️ **文件名必须包含结束日期**，格式：`weekly_report_YYYY-MM-DD_MMDD.html`
例：`weekly_report_2026-07-20_0726.html`（`_MMDD` = week-end 的月日）

```bash
cd "C:/Users/irisding/us-css-weeklyperformance"
node update_index.js
git add weekly_report_YYYY-MM-DD_MMDD.html index.html
git commit -m "Add US CSS weekly performance report YYYY-MM-DD ~ YYYY-MM-DD"
git push origin main
```

Repo: `https://github.com/irisding001/us-css-weeklyperformance`

---

## Step 6: Share link

```
https://irisding001.github.io/us-css-weeklyperformance/weekly_report_YYYY-MM-DD_MMDD.html
```

History page（主页含 KPI vs 时间进度对比块 + 历史报告列表）：
```
https://irisding001.github.io/us-css-weeklyperformance/
```

### 主页 update_index.js 改造（2026-11-09）

`update_index.js` 生成 `index.html` 时自动在顶部注入：

1. **KPI vs 时间进度对比块**：当前月度全队 PC / 800 vs 当月已过天数 / 当月总天数，红绿色标注落后/领先
2. **KPI 排行榜**：当月个人 PC 降序，标 top3 绿色
3. **外呼活跃榜**：当月个人外呼 周PC 累计降序，标 top3 绿色

数据来源：自动读取仓库内最新一份周报 HTML 的 Individual Summary 月度总PC 列 + 外呼个人表 周PC 列。

⚠️ 主页改造无需每周手动操作，`update_index.js` 自动生成。

---

## Step 7: Push to Feishu group

**目标群：Moomoo US CSS**（`chat_id: oc_57d5074a6079466f543bfad14bdd459b`）

⚠️ **禁止用 lark-cli / lark-im skill 手动发消息**（bot 不在群，会报 230002）。
⚠️ **禁止发到 "US CSS Team Weekly Report" 群**（错误的群）。

> ⚠️ **执行前必须向 Iris 确认命令**，等待明确回复"确认"或"yes"后再执行。

### 推送命令（唯一正确方式）

```bash
# 1. 先生成卡片 JSON（含 Highlights 块，与私信预览一致）
node C:/Users/irisding/build_card.js

# 2. 再推送到群（自动读取 card_preview.json）
node C:/Users/irisding/push_weekly_report.js \
  --week-start YYYY-MM-DD \
  --week-end   YYYY-MM-DD
```

**卡片内容（2026-11-16 起，与私信预览完全一致）：**

```
┌─ US CSS Weekly Report | MM-DD ~ MM-DD ─────────────────┐
│                                                          │
│ 本周重点 Highlights                                       │
│                                                          │
│ 🟣 KPI 进度榜 KPI Progress（季度 Q4）                     │
│ · 全队 季度KPI进度 XX.X%，季度时间进度 XX.X%（截至 MM/DD），│
│   落后/领先 Npp                                           │
│ · 🟢 KPI 领先：agent                                      │
│ · 🔴 KPI 需追赶（N 人）：agent、agent、agent...           │
│                                                          │
│ 🟢 外呼进步榜 Progress / Regression                       │
│ · 🟢 夸奖 Praise（有效跟进量 进步）：agent（+N）           │
│ · 🟠 关注 Watch（有效跟进量 退步）：agent（-N）            │
│ · 🔴 预警 Alert：agent（...）                             │
│ ─────────────────────────────────────────────             │
│ 概览 Overview                                             │
│ 周咨询PC: N ｜ 外呼转化PC: N ｜ 月度PC: N（KPI 800）      │
│ ─────────────────────────────────────────────             │
│ 渠道汇总 Channel Team Summary                             │
│ | 渠道 | 工单 | 咨询PC | 满意度 |                          │
│ ─────────────────────────────────────────────             │
│ 个人业绩 Individual Summary                               │
│ | 客服 | 咨询PC | 转化PC | 周总PC | 周CSAT | 月总PC | 月KPI │
│ ─────────────────────────────────────────────             │
│ [查看完整周报 View Full Report]  [历史周报 History]        │
└──────────────────────────────────────────────────────────┘
```

**关键规则（2026-11-16 起，强制）：**
- **群推送卡片必须与私信预览一致**：都用 `build_card.js` 生成的 `card_preview.json`，确保 Highlights 块、季度KPI口径、有效跟进量外呼进步榜、名单加粗等完全相同
- **推送前必须先跑 `build_card.js`**：生成最新 `card_preview.json`，否则 `push_weekly_report.js` 会用旧 JSON 或回退到无 Highlights 的内置模板
- `push_weekly_report.js` 已改为优先读 `C:/Users/irisding/card_preview.json`；文件不存在时才回退到内置模板（无 Highlights，**不允许出现这种情况**）

可选自定义说明（双语，仅回退内置模板时生效）：
```bash
--note "本周报告已更新，含满意度分析。\nThis week's report is ready, including CSAT analysis."
```

**技术细节（仅供参考）：**
- Webhook: `https://open.feishu.cn/open-apis/bot/v2/hook/b26105dd-d92a-45b4-a2fe-9424f712b9b2`
- 脚本自动根据 `--week-start`/`--week-end` 构建报告 URL 和历史页链接
- Mon-Sun 周期 → webhook；Fri-Thu 周期 → lark-cli `us-ccs` profile（另一个群）
- ⚠️ webhook 发送的卡片**无法用 API 撤回**（不返回 message_id，bot 无 `im:message.group_msg` scope）。发错只能 Iris 手动在飞书客户端撤回。**务必先私信预览确认后再群发**。

### 发送前：检查历史周报完整性

**发飞书群消息前**，先列出目录中所有历史报告并核查：

```bash
ls C:/Users/irisding/us-css-weeklyperformance/weekly_report_*.html
```

| 检查项 | 合格标准 |
|--------|---------|
| 外呼表列数 | 9 列 |
| Channel Team Summary WoW 标签 | 各行含 ▲/▼ |
| Individual Summary CSAT | 每人满意度无缺失 |
| index.html | 已包含本周报告链接（运行 `node update_index.js` 后 git push）|

若任意项异常：**停止发送，告知 Iris 具体哪份报告哪项异常**，等待确认后再继续。

### Iris 个人私信预览（可选，群发前预审）

群发前可先用 lark-im skill 发**交互式卡片**给 Iris 预览效果（不是群消息，仅 Iris 个人可见）。

**关键配置（2026-11-14 更新）：**
- **profile**：`iris-weekly`（appId `cli_aa9ebc6861e55bc1`）
- **Iris open_id**：`ou_65c43706b75eeb31b763b24bd6b39d31`（**iris-weekly profile 下的 open_id，不是 CLAUDE.md 里那个**）
- ⚠️ CLAUDE.md 里的 `ou_7d1c2ad1368fc900420835dd5a8759ca` 属于**另一个 app**，跨 app 用会报 `code 99992361 "HTTP 400: open_id cross app"`

**构建卡片 JSON：** `C:/Users/irisding/build_card.js`
- 从 HTML 报告提取 Highlights / 概览 / Channel Team Summary / Individual Summary / Outbound Individual 表
- Highlights 第一行用**季度口径**（季度KPI进度 + 季度时间进度 + 落后 Npp，红色加粗）
- 输出 `C:/Users/irisding/card_preview.json`

**发送命令（Windows PowerShell 静默 exit 1 的 workaround）：**

```bash
node "C:/Users/irisding/AppData/Roaming/npm/node_modules/@futu/ft-lark-cli/scripts/run.js" \
  im +messages-send \
  --profile iris-weekly \
  --as bot \
  --user-id ou_65c43706b75eeb31b763b24bd6b39d31 \
  --msg-type interactive \
  --content "$(cat C:/Users/irisding/card_preview.json)" \
  > /tmp/lark_out.txt 2>&1; cat /tmp/lark_out.txt
```

⚠️ **Windows 终端吞 stdout**：lark-cli 在 PowerShell/git-bash 直接跑可能静默 exit 1，必须重定向到文件再 cat。

⚠️ 私信预览**不是**群推送，仅用于 Iris 本人查看效果；正式群发必须用 `push_weekly_report.js`。

⚠️ Iris 确认卡片后，再走 `push_weekly_report.js` 群推送流程（但注意：群推送当前是简单 webhook 卡片，不含 Highlights 块；如需群发完整 Highlights 卡片，需额外开发）。

---

## Notes

- **趋势图周数（2026-08-07 起）：** Section 一趋势图一律显示最近 **6 周**数据，不再显示 4 周。生成 SVG 时需读取当前报告所在周及前 5 周的工单量、CSAT、转化PC 数据（从历史报告文件提取）。
- `[ERROR] 外呼: USCM_AUTH_EXPIRED` → refresh USCM_COOKIE in run_weekly_config.json
- This repo (`us-css-weeklyperformance`) is separate from the standard `US-CSS-weekly-report` repo
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
