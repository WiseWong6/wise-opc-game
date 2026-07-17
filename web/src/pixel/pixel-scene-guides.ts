export type PixelSceneGuideLayout = 'compact' | 'split' | 'login' | 'channels' | 'models' | 'checklist'
export type PixelSceneGuideTone = 'neutral' | 'brand' | 'money' | 'success' | 'muted'
export type PixelSceneGuideBrand = 'openai' | 'wechat' | 'alipay' | 'glm' | 'kimi' | 'free'

export interface PixelSceneGuideItem {
  id: string
  title: string
  detail?: string
  tone?: PixelSceneGuideTone
  brand?: PixelSceneGuideBrand
  optionId?: string
}

export interface PixelSceneGuide {
  eyebrow?: string
  layout: PixelSceneGuideLayout
  items: PixelSceneGuideItem[]
}

const guides: Record<string, PixelSceneGuide> = {
  Q01: {
    eyebrow: '从本地原型走向真实用户',
    layout: 'compact',
    items: [
      { id: 'go-live', title: 'GO LIVE', detail: '准备上线', tone: 'success', optionId: 'launch' },
    ],
  },
  Q02: {
    eyebrow: '真实产品登录界面',
    layout: 'login',
    items: [
      { id: 'identity', title: '手机号 / 邮箱', detail: '验证码 / 密码' },
      { id: 'login', title: '登录', detail: '账号 · 留存 · 召回', tone: 'success', optionId: 'login' },
      { id: 'guest', title: '游客进入', detail: '来了直接使用', optionId: 'guest' },
    ],
  },
  Q03: {
    eyebrow: '开发会员投入',
    layout: 'split',
    items: [
      { id: 'codex-pro', title: 'CODEX PRO', detail: '$200 / 月', brand: 'openai', tone: 'brand' },
      { id: 'profit', title: '商业化回本', detail: '让产品覆盖订阅投入', tone: 'money', optionId: 'profit' },
      { id: 'love', title: '为爱发电', detail: '免费开放 · 钱包继续扣费', optionId: 'love' },
    ],
  },
  Q04: {
    eyebrow: '身份与责任的门槛',
    layout: 'split',
    items: [
      { id: 'personal', title: '个人开发者', detail: '个人项目' },
      { id: 'company', title: '公司设立', detail: '一人公司 / 企业主体', tone: 'success', optionId: 'found-company' },
      { id: 'payment', title: '支付申请', detail: '企业主体待解锁', tone: 'muted' },
    ],
  },
  Q05: {
    eyebrow: '注册代办受理台',
    layout: 'split',
    items: [
      { id: 'agency', title: '公司注册代办', detail: '¥500 · 1–2 天', tone: 'money', optionId: 'register' },
      { id: 'sacrifice', title: 'GPT PRO 5x', detail: '投入注册火炉', brand: 'openai', tone: 'brand', optionId: 'register' },
    ],
  },
  Q06: {
    eyebrow: '注册地址二选一',
    layout: 'split',
    items: [
      { id: 'desk', title: '真实工位', detail: '¥1500/月 · 约¥1.8万/年', tone: 'money', optionId: 'desk' },
      { id: 'hosted', title: '地址挂靠', detail: '地址证明 + 集中信箱 · ¥2000/年', optionId: 'hosted' },
    ],
  },
  Q07: {
    eyebrow: '企业对公账户申请',
    layout: 'compact',
    items: [
      { id: 'bank-account', title: '企业开户 / 对公账户', detail: '材料申请 · 回执 · UKey · ¥500/年', tone: 'success', optionId: 'open-bank-account' },
    ],
  },
  Q08: {
    eyebrow: '商户收银台：选择要启用的渠道',
    layout: 'channels',
    items: [
      { id: 'wechat', title: '微信支付', detail: '认证 ¥300/年', brand: 'wechat', optionId: 'wechat-pay' },
      { id: 'alipay', title: '支付宝', detail: '无认证费', brand: 'alipay', optionId: 'alipay' },
      { id: 'bankcard', title: '银行卡', detail: '其他方式', tone: 'muted' },
      { id: 'unionpay', title: '云闪付', detail: '其他方式', tone: 'muted' },
      { id: 'both', title: '微信 + 支付宝', detail: '小孩子才做选择', tone: 'success', optionId: 'both' },
    ],
  },
  Q09: {
    eyebrow: '公司账与个人账必须分开',
    layout: 'split',
    items: [
      { id: 'agency', title: '代理记账', detail: '¥2000/年 · 每月申报', tone: 'money', optionId: 'agency-bookkeeping' },
      { id: 'self', title: '自己做账', detail: '约 4h/月 · 对账申报', optionId: 'self-bookkeeping' },
      { id: 'separation', title: '公司账 ｜ 个人账', detail: '公私财产分离', tone: 'success' },
    ],
  },
  Q10: {
    eyebrow: '编程助手订阅选择',
    layout: 'models',
    items: [
      { id: 'gpt', title: 'GPT 5.6 Ultra', detail: '$200/月', brand: 'openai', tone: 'brand', optionId: 'gpt-ultra' },
      { id: 'glm', title: 'GLM 5.2 Pro', detail: '连续包年 ¥1,430.4/年', brand: 'glm', optionId: 'glm-pro' },
      { id: 'kimi', title: 'Kimi Code 2.7', detail: '约 ¥200/月', brand: 'kimi', optionId: 'kimi-code' },
      { id: 'free', title: '免费工具', detail: '没钱也继续写', brand: 'free', tone: 'muted', optionId: 'free-tools' },
    ],
  },
  Q11: {
    eyebrow: '产品运行时 AI 决策',
    layout: 'checklist',
    items: [
      { id: 'off', title: 'AI 功能 OFF', detail: '普通功能仍然可用', optionId: 'no-runtime-ai' },
      { id: 'on', title: 'AI 功能 ON', detail: 'TOKEN 按量 · 内容审核', tone: 'brand', optionId: 'runtime-ai' },
      { id: 'materials', title: '企业认证 + 供应商合同', detail: '运行时 AI 新增待办', tone: 'muted', optionId: 'runtime-ai' },
    ],
  },
  Q12: {
    eyebrow: '正式网址接线台',
    layout: 'checklist',
    items: [
      { id: 'address', title: 'localhost → https://example.com', detail: '从本地走向公网', tone: 'success', optionId: 'buy-domain-stack' },
      { id: 'domain', title: 'DOMAIN / 域名', detail: '¥300 三件套' },
      { id: 'ssl', title: 'SSL', detail: '安全锁' },
      { id: 'dns', title: 'DNS', detail: 'A / CNAME' },
    ],
  },
  Q13: {
    eyebrow: '手机验证码登录',
    layout: 'login',
    items: [
      { id: 'phone', title: '+86 手机号', detail: '验证码输入框' },
      { id: 'sms', title: '1000 条短信', detail: '¥45', tone: 'money', optionId: 'sms-login' },
      { id: 'guest', title: '拆掉登录与支付', detail: '改为游客直达', optionId: 'remove-login-and-commerce' },
    ],
  },
  Q14: {
    eyebrow: '云服务器规格选择',
    layout: 'split',
    items: [
      { id: 'small', title: '1 核 / 2G', detail: '能跑但负载吃紧', optionId: 'one-core-two-gb' },
      { id: 'medium', title: '2 核 / 4G', detail: '¥1,300/年', tone: 'money', optionId: 'two-core-four-gb' },
      { id: 'shirts', title: '4 件 T 恤', detail: '4 × ¥300', optionId: 'buy-clothes' },
    ],
  },
  Q15: {
    eyebrow: '系统与数据存储',
    layout: 'split',
    items: [
      { id: 'split-disk', title: 'SYS 40G + DATA 100G', detail: '¥600/年 · 数据分盘', tone: 'success', optionId: 'system-and-data-disk' },
      { id: 'system-only', title: '仅 SYS 40G', detail: '¥200/年 · 备份方案待办', optionId: 'system-disk-only' },
    ],
  },
  Q16: {
    eyebrow: '公网带宽最后一插',
    layout: 'compact',
    items: [
      { id: 'bandwidth', title: '3M / 3 Mbps', detail: '¥724.2/年 · 基础窄带', tone: 'money', optionId: 'three-megabit' },
      { id: 'spent', title: '已花 ¥X', detail: '按前面选择动态累计', optionId: 'quit-after-spending' },
    ],
  },
  Q17: {
    eyebrow: '工信部网站备案',
    layout: 'checklist',
    items: [
      { id: 'miit', title: 'ICP 备案提交', detail: '公司证件 · 域名 · 接入资料', optionId: 'submit-miit-filing' },
      { id: 'review', title: '审核中', detail: '游戏口径预计 7 天', tone: 'muted' },
    ],
  },
  Q18: {
    eyebrow: '公安联网备案',
    layout: 'checklist',
    items: [
      { id: 'miit-done', title: '工信备案已通过', detail: '上一份回执', tone: 'success' },
      { id: 'police', title: '公安联网备案', detail: '拓扑 + 身份材料 · 再等 7 天', optionId: 'submit-police-filing' },
    ],
  },
  Q19: {
    eyebrow: '经营范围与主体门槛',
    layout: 'channels',
    items: [
      { id: 'self-operated', title: '自营产品 / 服务', detail: '无第三方入驻', optionId: 'self-operated' },
      { id: 'self-published', title: '自行发布内容', detail: '不开放别人发布', optionId: 'self-published' },
      { id: 'platform', title: '第三方平台', detail: '注册资本门槛 ¥1,000,000', tone: 'money', optionId: 'all-in-capital' },
      { id: 'not-paid', title: '未支付', detail: '门槛不计入已花现金', tone: 'muted' },
    ],
  },
  Q20: {
    eyebrow: '公众表达功能检查',
    layout: 'checklist',
    items: [
      { id: 'features', title: '发帖 · 评论 · 公开分享 · 社群', detail: '仅普通登录不等于自动触发' },
      { id: 'none', title: '当前未触发', detail: '上述功能未开启', optionId: 'no-public-expression' },
      { id: 'self', title: '自行安全评估', detail: '+24h 待办', optionId: 'self-assessment' },
      { id: 'third-party', title: '第三方询价 ¥12,000', detail: '待确认 · 未支付', tone: 'money', optionId: 'third-party-assessment' },
    ],
  },
  Q21: {
    eyebrow: '等保待定级研判',
    layout: 'split',
    items: [
      { id: 'level-two', title: '二级压力预算', detail: '¥50,000 · 待确认', optionId: 'level-two' },
      { id: 'level-three', title: '三级压力预算', detail: '¥100,000 · 待确认', optionId: 'level-three' },
      { id: 'pending', title: '未支付', detail: '依实际资产、数据与支付边界研判', tone: 'muted' },
    ],
  },
  Q22: {
    eyebrow: '产品定位四格表',
    layout: 'channels',
    items: [
      { id: 'user', title: '用户', detail: '谁会用' },
      { id: 'scenario', title: '场景', detail: '什么时候用' },
      { id: 'need', title: '需求', detail: '解决什么问题' },
      { id: 'competitor', title: '竞品 / 替代', detail: '为什么选你' },
    ],
  },
  Q23: {
    eyebrow: '用户规模假设，不是已获得用户',
    layout: 'models',
    items: [
      { id: '100', title: '100', detail: '预计用户数', optionId: 'users-100' },
      { id: '1000', title: '1,000', detail: '预计用户数', optionId: 'users-1000' },
      { id: '10000', title: '10,000', detail: '预计用户数', optionId: 'users-10000' },
      { id: '100000', title: '100,000', detail: '预计用户数', optionId: 'users-100000' },
    ],
  },
  Q24: {
    eyebrow: '价格假设与理论月流水',
    layout: 'models',
    items: [
      { id: '9-9', title: '¥9.9 / 用户·月', detail: '一杯咖啡', optionId: 'price-9-9' },
      { id: '19-9', title: '¥19.9 / 用户·月', detail: '两杯咖啡', optionId: 'price-19-9' },
      { id: '29-9', title: '¥29.9 / 用户·月', detail: '修图工具锚点', optionId: 'price-29-9' },
      { id: 'formula', title: '用户数 × 月费', detail: '理论月流水 ≠ 利润', tone: 'muted' },
    ],
  },
  Q25: {
    eyebrow: '第一百个用户从哪来',
    layout: 'split',
    items: [
      { id: 'organic', title: '内容 · 社群 · 口碑', detail: '持续工时 +40h/月', optionId: 'organic' },
      { id: 'paid', title: '广告获客', detail: '先设 CAC 上限 · 营销预算待设', optionId: 'paid-acquisition' },
      { id: 'launch', title: '今天上线', detail: '用户可以从 0 开始', tone: 'success', optionId: 'launch-now' },
    ],
  },
}

export function resolvePixelSceneGuide(questionId: string): PixelSceneGuide | undefined {
  return guides[questionId]
}
