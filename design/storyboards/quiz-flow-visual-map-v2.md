# 已废弃：《一人公司生存模拟器》章节复用视觉映射草稿

> 本文件记录已停用的“13 张章节母板复用”探索，不是新版实施合同。当前唯一视觉规范是 `scene-briefs-v2.md`，当前资产清单是 `scene-manifest-v2.json`；新版要求 Q01～Q25 各有唯一桌面与手机四态母板。旧资产只保留为画风参考。

## 1. 目的与范围

本文件把最新版 25 题条件流程映射到现有像素 RPG 视觉资产，作为题库、游戏状态、像素渲染器和后续视觉资产生产之间的实施合同。

本版遵循四个原则：

1. 保留现有 `stage-00.webp` 至 `stage-12.webp` 共 13 张四格分镜作为章节视觉底座，不为 25 道题重复生产 25 套完整背景。
2. 题目编号、流程顺序和视觉场景编号彻底解耦。同一场景可以承载多个连续题目，场景切换由语义 `sceneId` 和资产 `assetSceneId` 决定，不再由 `question.stage` 拼文件名。
3. 四格母板继续承担 `idle / action / pass / quit` 基础动作；同一章节内不同题目和选项的差异由站点、道具、灯光、DOM 回执和轻量 FX 表达。
4. “继续”不再一律表现为绿色过关。普通确认、增加待办、切换路线、记录报价、退出和最终上线必须使用不同的反馈语义。

本文件不修改题目文案、计分公式和费用口径；视觉层只消费游戏核心给出的当前题目、选项结果、账本差量、路线标记和最终结果。

## 2. 现有 13 张章节底座

| sceneId | 现有资产 | 章节空间 | 新版用途 |
|---|---|---|---|
| `hall-intro` | `stage-00.webp` | 办事大厅入口 | 首页进入动画 |
| `founder-decision` | `stage-01.webp` | 多岗分流台 | Q1–Q4 立项、登录、商业化与公司决心 |
| `company-registration` | `stage-02.webp` | 注册专窗 | Q5 公司注册代办 |
| `registered-address` | `stage-03.webp` | 地址迷宫 | Q6 工位或挂靠 |
| `bookkeeping-tax` | `stage-04.webp` | 财税档案室 | Q9 记账、申报和公私财产分离 |
| `bank-payment` | `stage-05.webp` | 银行审核大厅 | Q7–Q8 公户与支付渠道 |
| `infrastructure` | `stage-06.webp` | 云资源机房 | Q12–Q16 域名、短信、服务器、存储和带宽 |
| `filings` | `stage-07.webp` | 备案长廊 | Q17–Q18 工信部备案与公安联网备案 |
| `ai-readiness` | `stage-08.webp` | AI 审查实验室 | Q10–Q11 开发工具和产品运行时 AI |
| `operating-license` | `stage-09.webp` | 经营许可多重闸门 | Q19 经营许可适用性 |
| `security-assessment` | `stage-10.webp` | 数据安全审计地堡 | Q20–Q21 安全评估与等保定级研判 |
| `business-model` | `stage-11.webp` | 商业模式压力舱 | Q22–Q24 定位、用户规模与价格 |
| `growth-operations` | `stage-12.webp` | 深夜增长战情室 | Q25 获客、上线和最终结果 |

资产文件的数字顺序只表示历史生产编号，不代表新版答题顺序。例如新版先走 `bank-payment`，再走 `bookkeeping-tax`；运行时必须通过清单查找资产，不能假设 Q7 对应 `stage-07.webp`。

## 3. 运行时视觉合同

### 3.1 标识符

- `questionId`：稳定题目 ID，例如 `q08-payment-channel`。题目调整顺序时不改 ID。
- `sceneId`：章节级语义空间 ID，对应上表 13 个底座之一，例如 `bank-payment`。
- `assetSceneId`：当前代码适配层使用的数字资产编号，例如 `5` 对应 `stage-05.webp`。完整 25 题落地前允许继续使用该字段兼容现有文件名。
- `stationId`：同一章节里的当前交互站点，例如机房中的 `domain-console` 或 `storage-bay`。
- `optionId`：题目内稳定选项 ID，不使用数组下标持久化路线。
- `visualOutcome`：选中选项后的视觉反馈语义。
- `visualModifier`：可选的局部特殊效果，例如 `money-rain`，不得代替 `visualOutcome`。

### 3.2 数据结构

```ts
type VisualOutcome =
  | 'confirmed'
  | 'todo'
  | 'route-change'
  | 'quote'
  | 'quit'
  | 'final-organic'
  | 'final-paid'
  | 'final-launch'

type VisualModifier =
  | 'none'
  | 'money-rain'
  | 'token-meter'
  | 'payment-both'
  | 'pressure-budget-l2'
  | 'pressure-budget-l3'

interface QuestionVisualMap {
  questionId: string
  questionNumber: number
  chapterId: string
  sceneId: string
  assetSceneId: number
  stationId: string
  optionVisuals: Record<string, {
    outcome: VisualOutcome
    modifier?: VisualModifier
  }>
}

interface SceneVisualDefinition {
  sceneId: string
  assetSceneId: number
  storyboardAsset: string
  frames: {
    idle: FrameRect
    action: FrameRect
    pass: FrameRect
    quit: FrameRect
  }
  stations: Record<string, {
    focus?: { x: number; y: number }
    tone?: 'neutral' | 'warm' | 'cold' | 'warning'
    overlayAsset?: string
  }>
}

interface FrameRect {
  x: number
  y: number
  width: number
  height: number
}
```

`FrameRect` 必须来自资产清单。渲染器不得再假设图片一定能以 `50% × 50%` 无损切开。

### 3.3 四格与选项反馈的关系

四格仍保持以下基础含义：

| 母板格 | 基础含义 | 新版使用方式 |
|---|---|---|
| 左上 `idle` | 当前空间和待决策状态 | 题目出现、返回重选、减少动画默认画面 |
| 右上 `action` | 主角执行当前选择 | 所有非退出选项的短暂确认动作 |
| 左下 `pass` | 当前站点已处理 | `confirmed / todo / route-change / quote` 的场景完成底图 |
| 右下 `quit` | 主角停止承担 | `quit` 结果和退出结算背景 |

`pass` 只是一张完成态底图，不代表 UI 必须显示“过关”。实际回执由 `visualOutcome` 决定。

## 4. Q1–Q25 视觉映射

### 4.1 第一章：要不要真的开始

| Q | questionId | sceneId | stationId | 选项结果映射 |
|---:|---|---|---|---|
| 1 | `q01-launch-goal` | `founder-decision` | `launch-desk` | 上线产品→`confirmed`；不是→`quit` |
| 2 | `q02-login-plan` | `founder-decision` | `identity-desk` | 要登录→`route-change`；无需登录→`route-change` |
| 3 | `q03-monetization` | `founder-decision` | `revenue-desk` | 赚钱→`route-change` 并进入公司线；为爱发电→`route-change` 并跳到 Q10 |
| 4 | `q04-company-commit` | `founder-decision` | `founder-seat` | 真创业→`confirmed`；不敢→`quit` |

同章站点变化：四路传送槽依次突出产品盒、身份卡槽、收款箱和一张只有主角的空椅。站点切换只改变局部灯光和道具轮廓，不重复播放大型过关动画。

### 4.2 第二章：公司主体与收款

| Q | questionId | sceneId | stationId | 选项结果映射 |
|---:|---|---|---|---|
| 5 | `q05-registration-agent` | `company-registration` | `registration-window` | 代办注册→`confirmed`；去吃饭→`quit` |
| 6 | `q06-address-mode` | `registered-address` | `address-fork` | 租工位→`confirmed`；挂靠→`confirmed`；太麻烦→`quit` |
| 7 | `q07-bank-account` | `bank-payment` | `bank-verification` | 开公户→`confirmed`；退出→`quit` |
| 8 | `q08-payment-channel` | `bank-payment` | `payment-rails` | 微信→`confirmed`；支付宝→`confirmed`；全都要→`confirmed + payment-both`；跑路→`quit` |
| 9 | `q09-bookkeeping` | `bookkeeping-tax` | `ledger-conveyor` | 代理记账→`confirmed`；自己做→`todo`；买球鞋→`quit` |

Q7 到 Q8 保持同一银行空间：Q7 聚焦扫描区和金库门，Q8 横移到两条无字支付轨道；“全都要”同时点亮两条轨道，但不得在生成图里出现平台 Logo。

### 4.3 第三章：产品开发与基础设施

| Q | questionId | sceneId | stationId | 选项结果映射 |
|---:|---|---|---|---|
| 10 | `q10-coding-model` | `ai-readiness` | `coding-console` | 各付费模型→`confirmed`；免费工具→`route-change` |
| 11 | `q11-runtime-ai` | `ai-readiness` | `runtime-model-line` | 不用 AI→`route-change`；必须用 AI→`todo + token-meter`；退出→`quit` |
| 12 | `q12-domain-stack` | `infrastructure` | `domain-console` | 购买→`confirmed`；去吃火锅→`quit` |
| 13 | `q13-sms-login` | `infrastructure` | `sms-terminal` | 买短信→`confirmed`；改游客模式→`route-change`；退出→`quit` |
| 14 | `q14-compute` | `infrastructure` | `compute-rack` | 1核2G→`confirmed`；2核4G→`confirmed`；买衣服→`quit` |
| 15 | `q15-storage` | `infrastructure` | `storage-bay` | 系统盘+数据盘→`confirmed`；只用系统盘→`route-change` |
| 16 | `q16-bandwidth` | `infrastructure` | `bandwidth-gauge` | 购买带宽→`confirmed`；退出→`quit` |

机房连续五题不能只重复同一整幅图。每个站点分别点亮域名接线台、短信终端、计算机柜、磁盘舱和带宽表；已经完成的站点保留低亮状态，让用户看到基础设施逐步上线。

### 4.4 第四章：备案和合规三连击

| Q | questionId | sceneId | stationId | 选项结果映射 |
|---:|---|---|---|---|
| 17 | `q17-miit-filing` | `filings` | `miit-gate` | 提交备案→`todo`；不上线→`quit` |
| 18 | `q18-police-filing` | `filings` | `police-gate` | 办理备案→`todo`；退出→`quit` |
| 19 | `q19-license-scope` | `operating-license` | `business-scope-table` | 自营产品→`route-change`；自行发布→`route-change`；平台能力/100万门槛→`quote + money-rain`；退出→`quit` |
| 20 | `q20-expression-assessment` | `security-assessment` | `expression-scan` | 未触发→`route-change`；自己评估→`todo`；第三方询价→`quote`；退出→`quit` |
| 21 | `q21-mlps-classification` | `security-assessment` | `mlps-vault` | 先定级研判→`todo`；二级压力预算→`quote + pressure-budget-l2`；三级压力预算→`quote + pressure-budget-l3`；退出→`quit` |

Q17、Q18 使用备案长廊中连续两道门，不把两个备案合并为一个完成动作。Q20 聚焦扫描网，Q21 聚焦同心保险库；两题属于同一安全空间，但核心装置必须不同。

Q19 的 `money-rain` 是全流程唯一一次土豪撒钱效果。100 万属于资格门槛，不得通过动画表现为已经从“已花现金”中扣除。

### 4.5 第五章：产品、收入和获客

| Q | questionId | sceneId | stationId | 选项结果映射 |
|---:|---|---|---|---|
| 22 | `q22-positioning` | `business-model` | `positioning-map` | 想清楚→`confirmed`；大厂风险→`todo`；还没想好→`todo`；没价值→`quit` |
| 23 | `q23-user-scale` | `business-model` | `user-seats` | 100/1000/10000/100000→均为`confirmed`，数字只由 DOM 显示 |
| 24 | `q24-pricing` | `business-model` | `pricing-scale` | 9.9/19.9/29.9→均为`confirmed`；打不了一点→`quit` |
| 25 | `q25-acquisition` | `growth-operations` | `launch-control` | 内容社群→`final-organic`；广告获客→`final-paid`；直接上线→`final-launch` |

Q23 和 Q24 的大数字、价格、理论收入全部由 DOM 渲染，禁止烘焙进场景图。选择更大的用户数或更高价格只改变沙盘状态，不触发更夸张的庆祝，以免视觉暗示“数字越大得分越高”。

像素 Web 版在 Q24 选价后、Q25 获客题前插入一个不占共享题号的毛利确认关。确认关复用 Q24 对应价格的 `resolved` 画面，在舞台安全层用 DOM 同屏显示“预计用户、用户月费、理论月收入、首年总投入 ÷ 12、预计每月毛利（粗算）”；不得把金额烘焙进图片。玩家可以继续进入原 Q25，或返回 Q24 重选价格。最终主结算卡只保留首年总投入、预计首年收入与四维分数；月度推演、最低盈亏平衡用户数和费用明细进入完整结算。存在未定价成本时使用“待确认”和“至少”口径，且毛利粗算必须明确未扣模型用量、支付手续费、税费、获客和流失。此确认关不新增分值、账本项目或题库答案，Web 与小程序共用同一公式。

## 5. `visualOutcome` 反馈规范

| visualOutcome | 场景序列 | DOM 回执 | HUD 变化 | 动效强度 |
|---|---|---|---|---|
| `confirmed` | `idle → action → pass` | 蓝色或旧纸色“已选择”章 | 对应现金、工时、等待和分数滚动更新 | 低 |
| `todo` | `idle → action → pass` | 琥珀色“增加待办”夹条 | 待办数量增加；未知金额不扣现金 | 低至中 |
| `route-change` | `idle → action → pass` | “路线已更新”分岔卡 | 路线标记变化；可出现跳题提示 | 中 |
| `quote` | `idle → action → pass` | 红框“待确认报价/门槛”回执 | 只更新待报价或资本门槛 | 中 |
| `quit` | `idle → action → quit` | 当前退出文案 | 账本冻结，不新增未发生费用 | 中，克制 |
| `final-organic` | `idle → action → pass → result` | “用时间换流量” | 增加持续工时，进入结果页 | 高 |
| `final-paid` | `idle → action → pass → result` | “先设 CAC 上限” | 增加营销预算待办，进入结果页 | 高 |
| `final-launch` | `idle → action → pass → result` | “今天正式上线” | 不新增预算，进入结果页 | 高 |

普通题不再出现全屏绿色“过关”和大面积彩纸。大型庆祝仅保留两处：

1. Q19 `money-rain`：黑色幽默式撒钱，持续时间不超过 1.2 秒。
2. Q25 完成：根据三条获客路线显示不同终局光路，再进入结果页。

### 5.1 动画节奏

- 同章站点切换：`160–240ms`，只移动焦点、局部灯光或道具层。
- 普通确认：`600–800ms`，场景必须保持可见，不使用全屏深色遮罩。
- 路线切换和待报价：`800–1000ms`。
- 退出：`900–1400ms`，先收手，再落到 `quit` 静帧，随后打开结果页。
- Q19 撒钱：最多 `1200ms`。
- 最终上线：最多 `1800ms`。
- 动画结束由 `animationend` 或 Web Animations API 完成回调驱动，并保留超时兜底；不得只依赖与 CSS 分离的固定计时器。
- `prefers-reduced-motion: reduce` 时直接显示目标静帧，但 DOM 回执至少保留到用户进入下一题，不能用 `setTimeout(0)` 立即抹掉。

## 6. 同章站点表现

### 6.1 站点层级

每个站点由以下四类信息组合，不要求每题新增完整背景：

1. `focus`：当前核心装置的归一化坐标，用于局部光照和轻微镜头关注。
2. `tone`：中性、暖色、冷色或警示色调，最大只改变一档，不破坏章节调色。
3. `overlayAsset`：可选透明道具或完成态灯光；不得包含文字、金额、Logo 或 UI。
4. `stationState`：`pending / active / completed / skipped`，由 DOM 或轻量 FX 表达。

### 6.2 站点状态

| 状态 | 场景表现 |
|---|---|
| `pending` | 装置保持低亮，不抢当前题焦点 |
| `active` | 核心装置获得局部轮廓光，题目卡同步标记当前站点 |
| `completed` | 保留一个低亮完成灯，不持续闪烁 |
| `skipped` | 装置关闭或路线熄灭，但不画红叉和失败图标 |

从同章上一题进入下一题时，不重新播放整张母板的入场动画。只更新站点焦点、题目卡和进度；跨章时才播放短促的空间切换。

## 7. 页面布局

### 7.1 顶部 HUD

默认只显示四个最重要的实时量：

```text
已花现金｜创始人工时｜等待天数｜当前得分
```

首年承诺、次年续费、变动成本、待报价、资本门槛和持续工时放入可展开账本。未知报价和资本门槛不能混入“已花现金”。

进度同时显示章节与逻辑题号，例如：

```text
备案与合规 · Q19 / 25
```

被条件路线跳过的题目记为 `skipped`，不伪装成已完成。进度条按 25 个逻辑节点显示，章节颜色只用于分组。

### 7.2 桌面布局（宽度 ≥ 961px）

- 页面采用顶部 HUD、左侧场景、右侧题目卡。
- 场景保持 `3:2`，不得用固定最小高度把画面拉伸；最大宽度由可用列宽决定。
- 题目卡建议宽 `360–460px`，自身允许滚动，不能通过压缩场景人物来容纳长文案。
- 选项使用纵向列表；只有全部选项都很短时才允许两列。
- 每个选项内最多显示四个差量标签：现金、工时、等待和主要分值或待办。
- 进度牌与场景牌不得同时占左上。场景牌移到右上，或只在题目卡 eyebrow 中显示。
- 结果页左侧保留当前章节终局画面，右侧展示主称号、最多三个徽章、四项分数、账本和下一步待办。

### 7.3 移动布局（宽度 ≤ 960px）

- 顺序固定为：紧凑 HUD → `3:2` 场景 → 章节/题号 → 题目卡 → 选项。
- 场景宽度为可用视口宽度，使用 `aspect-ratio: 3 / 2`；不得以 `min-height` 撑成 1.4:1。
- 四项 HUD 可以横向四列显示短值；在 320px 宽度下允许两行 `2 × 2`，不得截断金额单位。
- 所有选项单列排列，点击区域不低于 `48px`；长中文允许自然换行。
- `390 × 844` 下首屏至少完整看到场景、题目标题和第一个选项。
- `320 × 568` 下允许页面滚动，不得压缩字体到 12px 以下来强塞单屏。
- 费用详情默认折叠，但选项的即时差量必须直接可见。
- 结果页采用场景在上、结果文档在下；结果内容正常滚动，重新开始按钮不能遮挡徽章或成本表。
- 所有边距包含 `env(safe-area-inset-*)`。

## 8. 资产规格与加载预算

### 8.1 四格母板

- 新导出或机械规范化后的母板固定为 `1536 × 1024px`。
- 单格固定为 `768 × 512px`，宽高比严格为 `3:2`。
- 四格之间不保留不可控的中心沟槽；若视觉需要边框，边框必须属于每个单格自身。
- 清单必须记录整图尺寸、每个 `FrameRect`、文件字节数和 SHA-256。
- 现有构图保持不变；尺寸规范化只允许做机械裁切、补边或重新导出，不得趁机改变角色身份和场景语义。
- 插画母板属于高分辨率像素风栅格图，使用正常图像缩放；`image-rendering: pixelated` 只用于真正按整数倍显示的 UI 像素图标或低分辨率精灵。

### 8.2 站点变体

- 站点变体优先使用 DOM 灯光、CSS 色调和已有场景内的镜头焦点。
- 只有新增核心道具或不同完成态无法用 DOM 表达时，才增加透明 `overlayAsset`。
- 透明变体使用与单格相同的 `768 × 512px` 坐标系；未使用区域保持透明。
- 同一章节多个站点共用一个变体图集时，清单必须显式记录每个站点矩形，不能依赖文件命名猜测。
- 变体图中禁止可读文字、价格、数字、平台 Logo、按钮、对话框和分数。

### 8.3 文件预算

| 项目 | 预算 |
|---|---:|
| 单张四格章节母板 | 目标 ≤ 700KB，硬上限 900KB |
| 13 张章节母板合计 | 目标 ≤ 9MB |
| 单个透明站点变体 | 目标 ≤ 80KB，硬上限 120KB |
| 全部站点变体合计 | 目标 ≤ 2.5MB |
| 共享印章、路线和特殊 FX | 合计 ≤ 500KB |
| 首页首次加载 | 目标 ≤ 1.3MB |
| 一条完整商业路线累计图片传输 | 目标 ≤ 12MB |

- 优先使用 WebP；需要透明度时比较 WebP 与优化 PNG 后选择更小者。
- 只预加载当前章节和下一个可能章节；分支尚未确定时不得一次加载所有后续大图。
- 跨章前调用图片 `decode()`；解码未完成时保留当前静帧和轻量加载状态，不能闪成黑屏。
- 同章题目只切换站点和叠加层，不重复请求同一母板。
- 如果后续提供 AVIF，必须用 `<picture>` 保留 WebP 回退，不能让清单指向浏览器不支持的唯一格式。

## 9. 可访问性和输入

- 场景图可以保持装饰性 `aria-hidden="true"`，但题目、选项差量、回执和账本必须完整存在于 DOM。
- 选项使用真实按钮或单选控件；支持 Tab、Enter、Space 和数字键 `1–4`。
- 不能继续保留“键盘：1 继续 / 2 退出”的二选一固定提示。
- 视觉回执使用一个稳定的 `aria-live="polite"` 区域，不能因整棵 DOM 立即替换而丢失。
- 路线跳题时播报“已切换路线，跳过 Qx–Qy”，但不把跳过题宣称为已完成。
- 颜色不是唯一状态信号；`已选择 / 增加待办 / 路线已更新 / 待确认报价` 必须有文字标签。
- 减少动画模式、200% 浏览器缩放和系统大字号下均需保持所有选项可操作。

## 10. 结果页视觉合同

结果页至少展示：

1. 主称号。
2. 最多三个彩蛋徽章。
3. 执行力、合规判断、商业闭环和成本健康度四项分数。
4. 已花现金、首年成本、次年续费、变动成本、待报价和资本门槛。
5. 创始人工时、持续工时、等待天数和预计上线日。
6. 理论年流水、成本覆盖率和仍缺失的变量。
7. 最重要的三个下一步待办。

不得继续显示“没有伪精确百分制”。视觉应明确总分来自四项规则，不用雷达图制造额外精度；优先使用四条有刻度的像素进度条。

三种 Q25 终局画面：

- `final-organic`：内容、社群和口碑路线逐点亮起，主角仍背着包，远处出现少量真实灯点。
- `final-paid`：广告线路亮起，但线路入口同时出现预算闸门，不能表现为无限撒钱。
- `final-launch`：发布杆落下，城市只有一个小灯点亮，强调“上线不等于有用户”。

## 11. 验收清单

### 11.1 映射与路由

- [ ] Q1–Q25 每题都有唯一 `questionId / sceneId / stationId`。
- [ ] 每个选项都有 `visualOutcome`，不存在数组下标驱动视觉的逻辑。
- [ ] 赚钱路线能走 Q4–Q9；为爱发电路线能正确跳到 Q10。
- [ ] 登录路线显示 Q13；游客路线跳过 Q13。
- [ ] Q19、Q20、Q21 始终顺承出现，不被实现成互斥分支。
- [ ] 返回重选会同步回滚路线、账本、分数、站点完成态和预加载目标。
- [ ] 任何退出点都冻结已经发生的账本，不扣尚未发生的报价或门槛。

### 11.2 场景与状态

- [ ] 13 张母板均通过清单而非数字题号访问。
- [ ] 同章连续题能明显看出当前站点变化。
- [ ] `confirmed / todo / route-change / quote` 的 DOM 回执互不混淆。
- [ ] Q19 100 万只进入资本门槛，并触发唯一 `money-rain`。
- [ ] Q23 用户数和 Q24 价格不因数字更大出现更强庆祝。
- [ ] 退出先落到当前场景的 `quit` 状态，再显示结果页。
- [ ] Q25 三条终局路线具有不同灯路和回执。
- [ ] 围观模式若保留，使用专用观察者素材和明确默认路线；否则从新版入口移除。

### 11.3 四格资产

- [ ] 新版母板全部为 `1536 × 1024px`，单格 `768 × 512px`。
- [ ] 清单记录四个显式 `FrameRect`、字节数和 SHA-256。
- [ ] 没有半像素分界、中心黑缝、跨格污染或非预期拉伸。
- [ ] 主角、手持物和核心装置不进入进度/UI遮挡区。
- [ ] 站点透明层与底图坐标一致，没有相邻层残片。
- [ ] 人物身份、背包方向、服装和比例在全部章节中可连续辨认。

### 11.4 响应式

- [ ] `1440 × 900`：场景为3:2，题目卡和四选项完整可用。
- [ ] `1024 × 768`：左右布局没有横向溢出。
- [ ] `390 × 844`：首屏可见场景、题目和第一个选项。
- [ ] `320 × 568`：允许滚动，四选项不挤成两列，HUD单位可读。
- [ ] 刘海屏和底部手势区遵守 safe area。
- [ ] 200%缩放与大字号下没有按钮遮挡或内容丢失。

### 11.5 动画与可访问性

- [ ] 普通题不会出现全屏庆祝遮住场景。
- [ ] 动画完成由事件驱动并有超时兜底。
- [ ] `prefers-reduced-motion` 能直接到达正确目标静帧，回执仍可感知。
- [ ] 数字键 `1–4`、Tab、Enter 和 Space 可以完成所有题目。
- [ ] 屏幕阅读器能听到选项差量、路线变化、账本更新和退出结算。

### 11.6 性能与结果

- [ ] 首页首次加载不超过 1.3MB 图片预算。
- [ ] 一条完整商业路线累计图片传输目标不超过 12MB。
- [ ] 下一章节解码前不出现黑屏或布局跳动。
- [ ] 结果页完整展示四项分数、称号、徽章、六类成本、时间和三个待办。
- [ ] 免费路线不会因没有收入被视觉标记为失败。
- [ ] 待报价、历史压力预算和资本门槛不会混入已花现金。

## 12. 实施顺序

1. 先在题库中补齐稳定 `questionId / optionId`，并完成 25 题条件路由。
2. 增加本文件定义的 `QuestionVisualMap` 和 `SceneVisualDefinition`，替换题号拼资产路径的逻辑。
3. 让现有 13 张母板按 `sceneId` 正常工作，先完成多选项、跳题、回退和结果页。
4. 实现八个 `visualOutcome`（对应普通、待办、路线切换、报价、退出和终局六类反馈语义），去掉每题统一全屏“过关”。
5. 增加同章站点焦点和必要的轻量变体，不在逻辑稳定前批量生成新图。
6. 机械规范化四格尺寸并更新清单、哈希和资产测试。
7. 完成四个目标视口、减少动画、键盘和屏幕阅读器验收。
8. 最后再评估是否需要专用围观素材、手机同构重排图或更完整的终局动画。
