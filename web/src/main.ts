import challengeData from '../../content/challenges.json'
import {
  acceptChallenge,
  advanceSpectator,
  createInitialState,
  enterSpectatorMode,
  formatLedger,
  goBack,
  quitChallenge,
  restartGame,
  startGame,
  type Challenge,
  type GameState,
} from '../../packages/game-core/src/index.ts'
import './styles/base.css'
import './styles/minimal.css'
import './styles/paper.css'
import './styles/cyber.css'

type ThemeName = 'minimal' | 'paper' | 'cyber'

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
    index: 'OPC / 012',
    identityLines: ['ONE PERSON', 'COMPANY', 'SURVIVAL'],
    identityMeta: '答案只在当前页面内存中存在',
    statePrefix: 'OPC / SURVIVAL',
  },
  paper: {
    edition: '纸张账单版',
    index: '费用报销单 / 000–012',
    identityLines: ['壹人', '有限公司', '生存账单'],
    identityMeta: '本票据仅供清醒，不具备抵扣功能',
    statePrefix: 'EXPENSE / CLAIM',
  },
  cyber: {
    edition: '极简赛博版',
    index: 'OPC_OS / BUILD 0.12',
    identityLines: ['ONE_PERSON', 'RISK_KERNEL', 'SURVIVAL_RUN'],
    identityMeta: 'SESSION: MEMORY_ONLY · DATA_EGRESS: 0',
    statePrefix: 'OPC://SURVIVAL',
  },
}

const challenges = challengeData as Challenge[]
const appElement = document.querySelector<HTMLDivElement>('#app')
if (!appElement) throw new Error('App root is missing.')
const app: HTMLDivElement = appElement

function resolveTheme(): ThemeName {
  const candidate = document.body.dataset.theme
  if (candidate === 'paper' || candidate === 'cyber') return candidate
  return 'minimal'
}

const themeName = resolveTheme()
const theme = THEMES[themeName]
document.documentElement.dataset.theme = themeName

let state: GameState = createInitialState()
let transition: { receipt: string; costText: string; nextState: GameState } | null = null
let transitionTimer: number | null = null

const escapeHtml = (value: string): string =>
  value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;',
  })[character] ?? character)

function ledgerMarkup(gameState: GameState): string {
  const ledger = formatLedger(gameState.lockedResult?.ledger ?? gameState.ledger)
  return `
    <dl class="ledger" aria-label="当前三本账">
      <div><dt>现金 / CASH</dt><dd>${escapeHtml(ledger.cash)}</dd></div>
      <div><dt>时间 / TIME</dt><dd>${escapeHtml(ledger.time)}</dd></div>
      <div><dt>风险 / RISK</dt><dd>${escapeHtml(ledger.risk)}</dd></div>
    </dl>
  `
}

function shell(content: string, stateLabel: string): string {
  return `
    <main class="shell" data-view="${escapeHtml(state.phase)}">
      <aside class="identity" aria-label="产品名称">
        <span class="identity__index">${escapeHtml(theme.index)}</span>
        <div class="identity__title">
          ${theme.identityLines.map((line) => `<p>${escapeHtml(line)}</p>`).join('')}
        </div>
        <div class="identity__footer">
          <small>${escapeHtml(theme.identityMeta)}</small>
          <a href="/" class="edition-link">切换视觉版本 →</a>
        </div>
      </aside>
      <section class="game-card" aria-live="polite">
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
  return shell(`
    <div class="intro">
      <div class="intro__label">一人公司生存模拟器 · ${escapeHtml(theme.edition)}</div>
      <h1>你想做一人公司。<br />它也想做你。</h1>
      <p class="intro__lead">12 个问题，约 4 分钟。每次选择继续，现金、时间和风险会被记上一笔；任何一关都可以体面离场。</p>
      <div class="privacy-note">
        <span class="privacy-note__dot" aria-hidden="true"></span>
        <p><strong>零数据模式</strong>：不登录、不联网提交、不使用 Cookie 或本地存储。刷新或关闭后，所有答案立即消失。</p>
      </div>
      <button class="button button--primary button--wide" data-action="start">开始承担</button>
      <p class="fine-print">娱乐化个人经验，不构成法律、财税或安全建议。成本采用用户提供及文章历史口径，仍需逐项复核，不代表实时市场报价。</p>
    </div>
  `, '准备开始')
}

function renderProgress(currentIndex: number, spectator: boolean): string {
  const percent = Math.round(((currentIndex + 1) / challenges.length) * 100)
  return `
    <div class="progress-row">
      <span>${spectator ? '围观模式 · 不计分' : `第 ${String(currentIndex + 1).padStart(2, '0')} 关`}</span>
      <span>${currentIndex + 1} / ${challenges.length}</span>
    </div>
    <div class="progress" aria-label="闯关进度 ${currentIndex + 1} / ${challenges.length}">
      <span style="width: ${percent}%"></span>
    </div>
  `
}

function renderChallenge(): string {
  const challenge = challenges[state.currentIndex]
  if (!challenge) return renderResult()
  const spectator = state.phase === 'spectating'
  const controls = spectator
    ? `<button class="button button--primary button--wide" data-action="spectator-next">${state.currentIndex === challenges.length - 1 ? '看完，回到账单' : '看看下一关'}</button>`
    : `
      <div class="actions">
        <button class="button button--primary" data-action="accept">${escapeHtml(challenge.acceptLabel)}</button>
        <button class="button button--ghost" data-action="quit">${escapeHtml(challenge.quitLabel)}</button>
      </div>
      <div class="secondary-row">
        <button class="text-button" data-action="back" ${state.currentIndex === 0 ? 'disabled' : ''}>← 返回上一关重选</button>
        <span>键盘：1 继续 / 2 退出</span>
      </div>
    `

  return shell(`
    <div class="challenge ${transition ? 'challenge--frozen' : ''}">
      ${renderProgress(state.currentIndex, spectator)}
      ${ledgerMarkup(state)}
      <div class="question">
        <div class="question__category">${escapeHtml(challenge.category)} / ${escapeHtml(challenge.title)}</div>
        <h1>${escapeHtml(challenge.question)}</h1>
        <p class="question__cost">${spectator ? '本关原账单：' : ''}${escapeHtml(challenge.costText)}</p>
        <ul class="cost-list">
          ${challenge.costItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </div>
      ${controls}
      ${spectator ? '<p class="spectator-note">你的结局与三本账已经冻结，后续只看热闹，不再增加任何分数。</p>' : ''}
      ${transition ? `
        <div class="pass-overlay" role="status">
          <div class="pass-overlay__scan" aria-hidden="true"></div>
          <span class="pass-overlay__code">PASS ${String(challenge.stage).padStart(2, '0')}</span>
          <strong>${escapeHtml(transition.receipt)}</strong>
          <small>${escapeHtml(transition.costText)}</small>
        </div>
      ` : ''}
    </div>
  `, spectator ? '围观中' : '正在闯关')
}

function renderResult(): string {
  const result = state.lockedResult
  if (!result) return renderIntro()
  const completed = result.completedCount
  const stopped = result.stoppedAtIndex === null ? '全 12 关完成' : `停在第 ${result.stoppedAtIndex + 1} 关`
  const canSpectate = state.phase === 'locked' && result.stoppedAtIndex !== null && result.stoppedAtIndex < challenges.length - 1
  const spectatorFinished = state.phase === 'spectating' && state.currentIndex >= challenges.length

  return shell(`
    <div class="result">
      <div class="result__stamp">${spectatorFinished ? '围观结束' : completed === challenges.length ? 'SURVIVED' : 'RESULT LOCKED'}</div>
      <p class="result__meta">${escapeHtml(stopped)} · 成绩 ${completed} / ${challenges.length}</p>
      <h1>${escapeHtml(result.title)}</h1>
      <p class="result__conclusion">${escapeHtml(result.conclusion)}</p>
      ${ledgerMarkup(state)}
      <div class="result__notice">
        <strong>这就是全部结果。</strong>
        <span>没有人格标签，没有伪精确百分制，也没有上传到任何服务器。</span>
      </div>
      <div class="result__actions">
        ${canSpectate ? '<button class="button button--primary" data-action="spectate">不计分，围观后续难关</button>' : ''}
        <button class="button ${canSpectate ? 'button--ghost' : 'button--primary'}" data-action="restart">重新开始并清零</button>
      </div>
      <p class="fine-print">题目用于娱乐和自查。现实要求因地区、主体、产品形态与时间而不同，请以主管部门和专业人士意见为准。</p>
    </div>
  `, '结果已锁定')
}

function render(): void {
  app.dataset.phase = state.phase
  if (state.phase === 'intro') app.innerHTML = renderIntro()
  else if (state.phase === 'playing' || (state.phase === 'spectating' && state.currentIndex < challenges.length)) app.innerHTML = renderChallenge()
  else app.innerHTML = renderResult()
}

function clearTransitionTimer(): void {
  if (transitionTimer !== null) window.clearTimeout(transitionTimer)
  transitionTimer = null
}

function acceptCurrent(): void {
  if (state.phase !== 'playing' || transition) return
  const challenge = challenges[state.currentIndex]
  if (!challenge) return
  transition = {
    receipt: challenge.receipt,
    costText: challenge.costText,
    nextState: acceptChallenge(state, challenges),
  }
  render()
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  transitionTimer = window.setTimeout(() => {
    if (!transition) return
    state = transition.nextState
    transition = null
    transitionTimer = null
    render()
  }, reduceMotion ? 0 : 600)
}

function handleAction(action: string): void {
  if (transition) return
  if (action === 'start') state = startGame()
  if (action === 'accept') return acceptCurrent()
  if (action === 'quit' && state.phase === 'playing') state = quitChallenge(state, challenges)
  if (action === 'back') state = goBack(state, challenges)
  if (action === 'spectate') state = enterSpectatorMode(state, challenges.length)
  if (action === 'spectator-next') state = advanceSpectator(state, challenges.length)
  if (action === 'restart') {
    clearTransitionTimer()
    transition = null
    state = restartGame()
  }
  render()
}

app.addEventListener('click', (event) => {
  const target = event.target as HTMLElement
  const button = target.closest<HTMLButtonElement>('[data-action]')
  if (button && !button.disabled) handleAction(button.dataset.action ?? '')
})

window.addEventListener('keydown', (event) => {
  if (state.phase !== 'playing' || transition || event.metaKey || event.ctrlKey || event.altKey) return
  if (event.key === '1') acceptCurrent()
  if (event.key === '2') handleAction('quit')
})

render()
