import quizData from '../../content/quiz-v2.json'
import {
  assertValidQuizDefinition,
  chooseOption,
  formatLedger,
  goBack,
  interpolateQuizText,
  restartGame,
  type QuizDefinition,
  type QuizOption,
  type QuizQuestion,
  type QuizState,
} from '../../packages/game-core/src/index.ts'
import {
  renderPixelIntro,
  renderPixelQuestion,
  renderPixelResult,
  type PixelTransition,
} from './pixel/pixel-renderer.ts'
import './styles/base.css'
import './styles/minimal.css'
import './styles/paper.css'
import './styles/cyber.css'
import './styles/pixel.css'

type ThemeName = 'minimal' | 'paper' | 'cyber' | 'pixel'

interface ThemeChrome {
  edition: string
  index: string
  identityLines: string[]
  identityMeta: string
  statePrefix: string
}

const THEMES: Record<ThemeName, ThemeChrome> = {
  minimal: {
    edition: 'SBTI 式极简版',
    index: 'OPC / 025',
    identityLines: ['ONE PERSON', 'COMPANY', 'SURVIVAL'],
    identityMeta: '答案只在当前页面内存中存在',
    statePrefix: 'OPC / SURVIVAL',
  },
  paper: {
    edition: '纸张账单版',
    index: '费用报销单 / 000–025',
    identityLines: ['壹人', '有限公司', '生存账单'],
    identityMeta: '本票据仅供清醒，不具备抵扣功能',
    statePrefix: 'EXPENSE / CLAIM',
  },
  cyber: {
    edition: '极简赛博版',
    index: 'OPC_OS / BUILD 0.25',
    identityLines: ['ONE_PERSON', 'RISK_KERNEL', 'SURVIVAL_RUN'],
    identityMeta: 'SESSION: MEMORY_ONLY · DATA_EGRESS: 0',
    statePrefix: 'OPC://SURVIVAL',
  },
  pixel: {
    edition: '像素 RPG × 办证地狱',
    index: 'A001 / PIXEL OFFICE',
    identityLines: ['ONE PERSON', 'COMPANY', 'RPG'],
    identityMeta: '答案只在当前页面内存中存在',
    statePrefix: 'A001 / 办事大厅',
  },
}

const SCORE_LABELS = {
  execution: '执行力',
  compliance: '合规判断',
  business: '商业闭环',
  costHealth: '成本健康度',
} as const

// JSON imports widen tuple and string-literal fields. Runtime validation below
// remains the source of truth for the complete external definition.
const quiz = quizData as unknown as QuizDefinition
assertValidQuizDefinition(quiz)

const appElement = document.querySelector<HTMLDivElement>('#app')
if (!appElement) throw new Error('App root is missing.')
const app: HTMLDivElement = appElement

function resolveTheme(): ThemeName {
  const candidate = document.body.dataset.theme
  if (candidate === 'paper' || candidate === 'cyber' || candidate === 'pixel') return candidate
  return 'minimal'
}

const themeName = resolveTheme()
const theme = THEMES[themeName]
document.documentElement.dataset.theme = themeName

let started = false
let state: QuizState = restartGame(quiz)
let transition: PixelTransition | null = null
let transitionTimer: number | null = null
const preloadedAssets = new Set<string>()

const escapeHtml = (value: string): string =>
  value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;',
  })[character] ?? character)

function currentQuestion(gameState = state): QuizQuestion | null {
  return quiz.questions.find((question) => question.id === gameState.currentQuestionId) ?? null
}

function interpolateText(value: string, gameState = state): string {
  return interpolateQuizText(value, gameState.result?.ledger ?? gameState.ledger)
}

function ledgerMarkup(gameState: QuizState): string {
  const ledger = formatLedger(gameState.result?.ledger ?? gameState.ledger)
  return `
    <dl class="ledger ledger--v2" aria-label="当前经营账本">
      <div><dt>已支付 / PAID</dt><dd>${escapeHtml(ledger.paidSunk)}</dd></div>
      <div><dt>首年固定 / YEAR 1</dt><dd>${escapeHtml(ledger.firstYearCommitted)}</dd></div>
      <div><dt>创始人工时 / HOURS</dt><dd>${escapeHtml(ledger.founderTime)}</dd></div>
      <div><dt>关键路径 / DAYS</dt><dd>${escapeHtml(ledger.criticalPath)}</dd></div>
    </dl>
  `
}

function shell(content: string, stateLabel: string): string {
  return `
    <main class="shell" data-view="${started ? escapeHtml(state.phase) : 'intro'}">
      <aside class="identity" aria-label="产品名称">
        <span class="identity__index">${escapeHtml(theme.index)}</span>
        <div class="identity__title">
          ${theme.identityLines.map((line) => `<p>${escapeHtml(line)}</p>`).join('')}
        </div>
        <div class="identity__footer">
          <small>${escapeHtml(theme.identityMeta)}</small>
          <a href="../" class="edition-link">切换视觉版本 →</a>
        </div>
      </aside>
      <section class="game-card">
        <div class="paper-teeth" aria-hidden="true"></div>
        <div class="cyber-grid" aria-hidden="true"></div>
        <header class="mobile-brand">
          <span>${escapeHtml(theme.statePrefix)}</span>
          <span>${escapeHtml(stateLabel)}</span>
        </header>
        ${content}
      </section>
    </main>
  `
}

function renderIntro(): string {
  if (themeName === 'pixel') return shell(renderPixelIntro(state), '准备开始')
  return shell(`
    <div class="intro">
      <div class="intro__label">一人公司生存模拟器 · ${escapeHtml(theme.edition)}</div>
      <h1>你想做一人公司。<br />它也想做你。</h1>
      <p class="intro__lead">25 个问题，25 个独立场景。选择会改变现金、时间、合规待办、商业分数和最终称号；任何一关都可以体面离场。</p>
      <div class="privacy-note">
        <span class="privacy-note__dot" aria-hidden="true"></span>
        <p><strong>零数据模式</strong>：不登录、不联网提交、不使用 Cookie 或本地存储。刷新或关闭后，所有答案立即消失。</p>
      </div>
      <button class="button button--primary button--wide" data-action="start">开始承担</button>
      <p class="fine-print">娱乐化个人经验，不构成法律、财税或安全建议。事实说明与题目原文分开呈现。</p>
    </div>
  `, '准备开始')
}

function progressMarkup(question: QuizQuestion): string {
  const percent = Math.round((question.number / quiz.questions.length) * 100)
  return `
    <div class="progress-row"><span>第 ${String(question.number).padStart(2, '0')} 题</span><span>${question.number} / ${quiz.questions.length}</span></div>
    <div class="progress" aria-label="闯关进度 ${question.number} / ${quiz.questions.length}"><span style="width: ${percent}%"></span></div>
  `
}

function optionsMarkup(question: QuizQuestion): string {
  return `
    <div class="option-list" role="group" aria-label="可选答案">
      ${question.options.map((option, index) => `
        <button class="button ${option.outcome === 'exit' ? 'button--ghost' : 'button--primary'} option-button" type="button" data-option-id="${escapeHtml(option.id)}">
          <span class="option-button__key" aria-hidden="true">${index + 1}</span>
          <span class="option-button__label">${escapeHtml(interpolateText(option.label))}</span>
        </button>
      `).join('')}
    </div>
    <div class="secondary-row">
      <button class="text-button" data-action="back" ${state.history.length === 0 ? 'disabled' : ''}>← 返回上一题重选</button>
      <span>键盘：1～${question.options.length} 选择</span>
    </div>
  `
}

function interludeFor(question: QuizQuestion): { title: string; body?: string } | null {
  return quiz.definition.interludes.find((item) => item.afterQuestionId === question.id) ?? null
}

function genericTransitionMarkup(question: QuizQuestion, activeTransition: PixelTransition): string {
  const interlude = activeTransition.outcome === 'quit' ? null : interludeFor(question)
  return `
    <div class="pass-overlay" role="status">
      <div class="pass-overlay__scan" aria-hidden="true"></div>
      <span class="pass-overlay__code">${activeTransition.outcome === 'quit' ? 'EXIT' : `Q${String(question.number).padStart(2, '0')}`}</span>
      <strong>${escapeHtml(interlude?.title ?? activeTransition.optionLabel)}</strong>
      <small>${escapeHtml(interlude?.body ?? '账本、分数和后续路线已重新计算。')}</small>
    </div>
  `
}

function renderQuestion(): string {
  const question = currentQuestion()
  if (!question) return renderResult()
  if (themeName === 'pixel') return shell(renderPixelQuestion(state, quiz, transition), '正在闯关')

  return shell(`
    <div class="challenge ${transition ? 'challenge--frozen' : ''}" aria-busy="${transition ? 'true' : 'false'}">
      ${progressMarkup(question)}
      ${ledgerMarkup(state)}
      <div class="question">
        <div class="question__category">${escapeHtml(question.chapterId)} / ${escapeHtml(question.visual.sceneId)}</div>
        <h1>${escapeHtml(interpolateText(question.prompt))}</h1>
        ${question.factNotes.length ? `<details class="fact-notes"><summary>事实说明（不改题目原文）</summary><ul>${question.factNotes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul></details>` : ''}
      </div>
      ${optionsMarkup(question)}
      ${transition ? genericTransitionMarkup(question, transition) : ''}
    </div>
  `, '正在闯关')
}

function genericScoreMarkup(gameState: QuizState): string {
  const result = gameState.result
  if (!result) return ''
  return `
    <div class="score-grid" aria-label="四项评分">
      ${Object.entries(result.score.dimensions).map(([key, dimension]) => `
        <div><span>${SCORE_LABELS[key as keyof typeof SCORE_LABELS]}</span><strong>${dimension.score} / ${dimension.cap}</strong></div>
      `).join('')}
    </div>
  `
}

function genericFullLedger(gameState: QuizState): string {
  const result = gameState.result
  if (!result) return ''
  const ledger = formatLedger(result.ledger)
  const rows = [
    ['已支付沉没成本', ledger.paidSunk],
    ['首年固定成本', ledger.firstYearCommitted],
    ['次年续费', ledger.renewal],
    ['变动成本', ledger.variable],
    ['待报价', ledger.pendingQuote],
    ['注册资本门槛', ledger.capitalRequirement],
    ['创始人工时', ledger.founderTime],
    ['上线关键路径', ledger.criticalPath],
  ]
  return `<dl class="result-ledger">${rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>`
}

function businessProjectionMarkup(gameState: QuizState): string {
  const metrics = gameState.result?.metrics
  const users = Number(metrics?.users)
  const monthlyPrice = Number(metrics?.monthlyPriceCny)
  if (!Number.isFinite(users) || !Number.isFinite(monthlyPrice)) return ''
  const number = new Intl.NumberFormat('zh-CN').format(users)
  const price = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 2 }).format(monthlyPrice)
  const gross = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 2 }).format(users * monthlyPrice)
  return `
    <div class="business-projection" aria-label="商业化粗算">
      <div><span>目标用户</span><strong>${number}</strong></div>
      <div><span>每用户月费</span><strong>${price}</strong></div>
      <div><span>理论月收入</span><strong>${gross}</strong></div>
      <small>仅按“用户数 × 月费”粗算，未扣流失、渠道、税费和变动成本。</small>
    </div>
  `
}

function renderResult(): string {
  const result = state.result
  if (!result) return renderIntro()
  if (themeName === 'pixel') return shell(renderPixelResult(state, quiz), '结果已结算')

  return shell(`
    <div class="result">
      <div class="result__stamp">${result.outcome === 'completed' ? 'SURVIVED' : 'RESULT LOCKED'}</div>
      <p class="result__meta">答完 ${result.answeredCount} 题 · 总分 ${result.score.total} / 100</p>
      <h1>${escapeHtml(result.title)}</h1>
      <p class="result__conclusion">${escapeHtml(result.conclusion)}</p>
      ${result.badges.length ? `<div class="result-badges">${result.badges.map((badge) => `<span>${escapeHtml(badge.label)}</span>`).join('')}</div>` : ''}
      ${genericScoreMarkup(state)}
      ${businessProjectionMarkup(state)}
      ${ledgerMarkup(state)}
      <details class="result-details"><summary>展开六类费用与时间账本</summary>${genericFullLedger(state)}</details>
      ${result.topTodos.length ? `<div class="result__notice"><strong>接下来优先做</strong>${result.topTodos.map((todo) => `<span>${escapeHtml(todo.label)}</span>`).join('')}</div>` : ''}
      <div class="result__actions">
        <button class="button button--primary" data-action="back">← 返回上一题重选</button>
        <button class="button button--ghost" data-action="restart">重新开始并清零</button>
      </div>
      <p class="fine-print">注册资本门槛、待报价和变动成本不会混入已花现金。现实要求请以主管部门和专业人士意见为准。</p>
    </div>
  `, '结果已结算')
}

function preloadAsset(asset: string): void {
  if (preloadedAssets.has(asset)) return
  preloadedAssets.add(asset)
  const image = new Image()
  image.decoding = 'async'
  image.src = asset
}

function preloadQuestionAsset(questionId: string | null, includeOptionFrames = false): void {
  if (!questionId) return
  const question = quiz.questions.find((candidate) => candidate.id === questionId)
  if (!question) return
  const mobile = window.matchMedia('(max-width: 600px)').matches
  preloadAsset(mobile ? question.visual.mobileAsset : question.visual.desktopAsset)
  if (!includeOptionFrames) return

  for (const variant of Object.values(question.visual.optionVariants ?? {})) {
    for (const frame of [variant.action, variant.resolved]) {
      if (!frame) continue
      preloadAsset(mobile ? frame.mobileAsset : frame.desktopAsset)
    }
  }
}

function render(): void {
  app.dataset.phase = started ? state.phase : 'intro'
  if (!started) app.innerHTML = renderIntro()
  else if (state.phase === 'playing') app.innerHTML = renderQuestion()
  else app.innerHTML = renderResult()

  if (!started) preloadQuestionAsset(quiz.definition.startQuestionId, true)
  else if (state.phase === 'playing' && !transition) preloadQuestionAsset(state.currentQuestionId, true)
  if (!transition) {
    window.requestAnimationFrame(() => {
      const heading = app.querySelector<HTMLHeadingElement>('h1')
      if (!heading) return
      heading.tabIndex = -1
      heading.focus({ preventScroll: true })
    })
  }
}

function clearTransitionTimer(): void {
  if (transitionTimer !== null) window.clearTimeout(transitionTimer)
  transitionTimer = null
}

function finishTransition(): void {
  if (!transition) return
  const nextState = transition.nextState
  clearTransitionTimer()
  transition = null
  state = nextState
  render()
}

function scheduleTransition(): void {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const visibleDuration = reduceMotion ? 80 : themeName === 'pixel' ? 720 : 520
  if (themeName === 'pixel' && !reduceMotion) {
    const transitionNode = app.querySelector<HTMLElement>('[data-pixel-transition]')
    transitionNode?.addEventListener('animationend', (event) => {
      if (event.target === transitionNode && event.animationName === 'pixel-transition-lifecycle') finishTransition()
    }, { once: true })
  }
  transitionTimer = window.setTimeout(finishTransition, visibleDuration + (themeName === 'pixel' && !reduceMotion ? 120 : 0))
}

function selectOption(optionId: string): void {
  if (!started || state.phase !== 'playing' || transition) return
  const question = currentQuestion()
  const option: QuizOption | undefined = question?.options.find((candidate) => candidate.id === optionId)
  if (!question || !option) return
  const nextState = chooseOption(quiz, state, option.id)
  preloadQuestionAsset(nextState.currentQuestionId)
  transition = {
    optionId: option.id,
    optionLabel: interpolateText(option.label),
    outcome: nextState.phase === 'exited' ? 'quit' : 'resolved',
    visualOutcome: option.visualOutcome,
    nextState,
  }
  render()
  scheduleTransition()
}

function handleAction(action: string): void {
  if (transition) return
  if (action === 'open-result-details') {
    app.querySelector<HTMLDialogElement>('[data-result-dialog]')?.showModal()
    return
  }
  if (action === 'close-result-details') {
    app.querySelector<HTMLDialogElement>('[data-result-dialog]')?.close()
    return
  }
  if (action === 'start') {
    started = true
    state = restartGame(quiz)
  }
  if (action === 'back') state = goBack(quiz, state)
  if (action === 'restart') {
    clearTransitionTimer()
    started = false
    state = restartGame(quiz)
  }
  render()
}

app.addEventListener('click', (event) => {
  const target = event.target as HTMLElement
  const optionButton = target.closest<HTMLButtonElement>('[data-option-id]')
  if (optionButton && !optionButton.disabled) return selectOption(optionButton.dataset.optionId ?? '')
  const actionButton = target.closest<HTMLButtonElement>('[data-action]')
  if (actionButton && !actionButton.disabled) handleAction(actionButton.dataset.action ?? '')
})

window.addEventListener('keydown', (event) => {
  if (!started || state.phase !== 'playing' || transition || event.metaKey || event.ctrlKey || event.altKey) return
  if (!/^[1-4]$/.test(event.key)) return
  const option = currentQuestion()?.options[Number(event.key) - 1]
  if (option) selectOption(option.id)
})

render()
