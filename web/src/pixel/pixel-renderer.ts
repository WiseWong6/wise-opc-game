import {
  formatCurrency,
  formatLedger,
  interpolateQuizText,
  type OptionVisualOverlay,
  type OptionVisualVariant,
  type QuizDefinition,
  type QuizQuestion,
  type QuizState,
} from '../../../packages/game-core/src/index.ts'
import { resolvePixelVisual, type PixelVisualOutcome } from './pixel-scenes.ts'
import { resolvePixelSceneGuide, type PixelSceneGuide } from './pixel-scene-guides.ts'

export interface PixelTransition {
  optionId: string
  optionLabel: string
  outcome: PixelVisualOutcome
  visualOutcome?: string
  nextState: QuizState
}

type PixelSceneMode = 'intro' | 'question' | 'result' | 'victory'
type PixelSceneFrame = 'idle' | 'action' | 'resolved' | 'quit'

const SCORE_LABELS = {
  execution: '执行力',
  compliance: '合规判断',
  business: '商业闭环',
  costHealth: '成本健康度',
} as const

const COST_LABELS = {
  paidSunk: '已支付沉没成本',
  firstYearCommitted: '首年固定成本',
  renewal: '次年续费',
  variable: '变动成本',
  pendingQuote: '待报价',
  capitalRequirement: '注册资本门槛',
} as const

const escapeHtml = (value: string): string =>
  value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;',
  })[character] ?? character)

function interpolateText(value: string, gameState: QuizState): string {
  return interpolateQuizText(value, gameState.result?.ledger ?? gameState.ledger)
}

function sceneGuideFor(questionId: string, gameState: QuizState): PixelSceneGuide | undefined {
  const guide = resolvePixelSceneGuide(questionId)
  if (!guide || questionId !== 'Q24') return guide

  const users = Number(gameState.metrics.users)
  if (!Number.isFinite(users)) return guide
  const formattedUsers = new Intl.NumberFormat('zh-CN').format(users)

  return {
    ...guide,
    items: guide.items.map((item) => item.id === 'formula'
      ? {
          ...item,
          title: `${formattedUsers} 位预计用户 × 月费`,
          detail: '用户数来自上一题 · 理论月流水 ≠ 利润',
        }
      : item),
  }
}

function pixelLedgerMarkup(gameState: QuizState): string {
  const ledger = formatLedger(gameState.result?.ledger ?? gameState.ledger)
  const cells = [
    { kind: 'cash', icon: '¥', label: '已付', value: ledger.paidSunk },
    { kind: 'fixed', icon: '年', label: '首年', value: ledger.firstYearCommitted },
    { kind: 'time', icon: '时', label: '工时', value: ledger.founderTime },
    { kind: 'path', icon: '天', label: '关键路径', value: ledger.criticalPath },
  ]

  return `
    <dl class="pixel-hud" data-pixel-hud aria-label="当前经营账本">
      ${cells.map((cell) => `
        <div class="pixel-hud__cell pixel-hud__cell--${cell.kind}">
          <dt><span class="pixel-hud__icon" aria-hidden="true">${cell.icon}</span>${cell.label}</dt>
          <dd>${escapeHtml(cell.value)}</dd>
        </div>
      `).join('')}
    </dl>
  `
}

function sceneMarkup(
  mode: PixelSceneMode,
  frame: PixelSceneFrame,
  sceneId: string,
  desktopAsset: string,
  mobileAsset: string,
  sequence = false,
  optionVisual?: { optionId: string; overlay?: OptionVisualOverlay; variant: OptionVisualVariant },
  sceneGuide?: PixelSceneGuide,
): string {
  const overlayTone = optionVisual?.overlay?.tone && ['brand', 'success', 'warning'].includes(optionVisual.overlay.tone)
    ? optionVisual.overlay.tone
    : 'neutral'
  const overlayMarkup = optionVisual?.overlay
    ? `
      <div class="pixel-option-visual pixel-option-visual--${overlayTone}" data-option-visual-overlay aria-hidden="true">
        ${optionVisual.overlay.eyebrow ? `<small>${escapeHtml(optionVisual.overlay.eyebrow)}</small>` : ''}
        <strong>${escapeHtml(optionVisual.overlay.title)}</strong>
        ${optionVisual.overlay.detail ? `<span>${escapeHtml(optionVisual.overlay.detail)}</span>` : ''}
      </div>
    `
    : ''
  const optionFrameMarkup = optionVisual
    ? (['action', 'resolved'] as const).map((frame) => {
      const assets = optionVisual.variant[frame]
      if (!assets) return ''
      return `
        <picture class="pixel-world__option-frame pixel-world__option-frame--${frame}" data-option-visual-frame="${frame}">
          <source media="(max-width: 600px)" srcset="${escapeHtml(assets.mobileAsset)}" />
          <img src="${escapeHtml(assets.desktopAsset)}" alt="" width="768" height="512" decoding="async" />
        </picture>
      `
    }).join('')
    : ''
  const guideMarkup = sceneGuide
    ? `
      <div class="pixel-scene-guide pixel-scene-guide--${sceneGuide.layout}" data-pixel-scene-guide aria-hidden="true">
        ${sceneGuide.eyebrow ? `<small class="pixel-scene-guide__eyebrow">${escapeHtml(sceneGuide.eyebrow)}</small>` : ''}
        <div class="pixel-scene-guide__items">
          ${sceneGuide.items.map((item) => `
            <div class="pixel-scene-guide__item pixel-scene-guide__item--${item.tone ?? 'neutral'} ${item.optionId && optionVisual?.optionId === item.optionId ? 'is-selected' : ''}"${item.brand ? ` data-brand="${escapeHtml(item.brand)}"` : ''}>
              ${item.brand ? '<i class="pixel-scene-guide__brand"></i>' : ''}
              <strong>${escapeHtml(item.title)}</strong>
              ${item.detail ? `<span>${escapeHtml(item.detail)}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `
    : ''
  return `
    <div class="pixel-world pixel-world--illustrated pixel-world--${mode} pixel-world--frame-${frame} ${sequence ? 'pixel-world--sequence-accept' : ''}" data-pixel-scene="${mode}" data-scene-id="${escapeHtml(sceneId)}" data-storyboard-frame="${frame}" data-visual-source="${optionVisual ? 'option' : 'question'}"${optionVisual ? ` data-option-visual="${escapeHtml(optionVisual.optionId)}"` : ''} aria-hidden="true">
      <div class="pixel-world__art">
        <picture>
          <source media="(max-width: 600px)" srcset="${escapeHtml(mobileAsset)}" />
          <img src="${escapeHtml(desktopAsset)}" alt="" width="1536" height="1024" decoding="async" fetchpriority="high" />
        </picture>
      </div>
      ${optionFrameMarkup ? `<div class="pixel-world__option-art">${optionFrameMarkup}</div>` : ''}
      <div class="pixel-world__grade"></div>
      ${guideMarkup}
      ${overlayMarkup}
    </div>
  `
}

function introSceneMarkup(): string {
  const introAsset = '/assets/pixel/storyboards/stage-00.webp'
  return sceneMarkup('intro', 'idle', 'LOBBY', introAsset, introAsset)
}

function progressMarkup(question: QuizQuestion, count: number): string {
  const percent = Math.round((question.number / count) * 100)
  return `
    <div class="pixel-progress" data-pixel-status-rail aria-label="闯关进度 ${question.number} / ${count}">
      <span>${escapeHtml(question.chapterId)} · 第 ${question.number} / ${count} 题</span>
      <div class="pixel-progress__track"><i style="width:${percent}%"></i></div>
    </div>
  `
}

interface PixelImpactItem {
  kind: 'cash' | 'fixed' | 'renewal' | 'variable' | 'quote' | 'capital' | 'hours' | 'recurring' | 'days' | 'todo'
  label: string
  value: string
  direction: 'up' | 'down' | 'neutral'
}

const rounded = (value: number): number => Math.round(value * 10) / 10

function signedCurrency(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  const absolute = Math.abs(value)
  const fractionDigits = Number.isInteger(absolute) ? 0 : 2
  const formatted = new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: 2,
  }).format(absolute)
  return `${sign}${formatted}`
}

function signedNumber(value: number, suffix: string): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${rounded(Math.abs(value))}${suffix}`
}

function impactItems(beforeState: QuizState, afterState: QuizState): PixelImpactItem[] {
  const before = beforeState.result?.ledger ?? beforeState.ledger
  const after = afterState.result?.ledger ?? afterState.ledger
  const items: PixelImpactItem[] = []
  const addMoney = (kind: PixelImpactItem['kind'], label: string, beforeValue: number, afterValue: number): void => {
    const delta = rounded(afterValue - beforeValue)
    if (delta === 0) return
    items.push({ kind, label, value: signedCurrency(delta), direction: delta > 0 ? 'up' : 'down' })
  }

  addMoney('cash', '已支付', before.costs.paidSunk.totalCny, after.costs.paidSunk.totalCny)
  addMoney('fixed', '首年', before.costs.firstYearCommitted.totalCny, after.costs.firstYearCommitted.totalCny)
  addMoney('renewal', '续费', before.costs.renewal.totalCny, after.costs.renewal.totalCny)
  addMoney('quote', '待报价', before.costs.pendingQuote.totalCny, after.costs.pendingQuote.totalCny)
  addMoney('capital', '资本门槛', before.costs.capitalRequirement.totalCny, after.costs.capitalRequirement.totalCny)

  const unknownVariableDelta = Number(after.costs.variable.hasUnknownAmount) - Number(before.costs.variable.hasUnknownAmount)
  if (unknownVariableDelta !== 0) {
    items.push({
      kind: 'variable',
      label: '变动成本',
      value: unknownVariableDelta > 0 ? '+按量' : '−按量',
      direction: unknownVariableDelta > 0 ? 'up' : 'down',
    })
  }

  const hourDelta = rounded(after.time.founderHours - before.time.founderHours)
  if (hourDelta !== 0) items.push({ kind: 'hours', label: '工时', value: signedNumber(hourDelta, 'h'), direction: hourDelta > 0 ? 'up' : 'down' })
  const recurringDelta = rounded(after.time.recurringMonthlyHours - before.time.recurringMonthlyHours)
  if (recurringDelta !== 0) items.push({ kind: 'recurring', label: '每月工时', value: signedNumber(recurringDelta, 'h'), direction: recurringDelta > 0 ? 'up' : 'down' })
  const dayDelta = rounded(after.time.criticalPathDays - before.time.criticalPathDays)
  if (dayDelta !== 0) items.push({ kind: 'days', label: '关键路径', value: signedNumber(dayDelta, '天'), direction: dayDelta > 0 ? 'up' : 'down' })
  const todoDelta = after.todos.length - before.todos.length
  if (todoDelta !== 0) items.push({ kind: 'todo', label: '待办', value: signedNumber(todoDelta, '项'), direction: todoDelta > 0 ? 'up' : 'down' })
  return items
}

const feedbackOutcomes = new Set([
  'gpt-sacrifice',
  'ai-gpt',
  'ai-glm',
  'ai-kimi',
  'ai-free',
  'ai-off',
  'token-flow',
])

function feedbackOutcomeMarkup(transition: PixelTransition): string {
  const outcome = transition.visualOutcome
  if (!outcome || !feedbackOutcomes.has(outcome)) return ''

  if (outcome === 'gpt-sacrifice') {
    return `
      <span class="pixel-choice-effect pixel-choice-effect--sacrifice" aria-hidden="true">
        <i class="pixel-choice-effect__subscription"></i><i class="pixel-choice-effect__trail"></i><i class="pixel-choice-effect__payment-slot"></i>
      </span>
    `
  }

  if (outcome === 'token-flow') {
    return `
      <span class="pixel-choice-effect pixel-choice-effect--token" aria-hidden="true">
        <i></i><i></i><i></i><b></b>
      </span>
    `
  }

  return `
    <span class="pixel-choice-effect pixel-choice-effect--ai pixel-choice-effect--${outcome}" aria-hidden="true">
      <i class="pixel-choice-effect__core"></i><i class="pixel-choice-effect__wire"></i><b></b>
    </span>
  `
}

function impactMarkup(gameState: QuizState, transition: PixelTransition): string {
  const items = impactItems(gameState, transition.nextState)
  const feedbackOutcome = transition.visualOutcome && feedbackOutcomes.has(transition.visualOutcome)
    ? transition.visualOutcome
    : 'ledger'
  return `
    <div class="pixel-impact-strip pixel-impact-strip--${escapeHtml(feedbackOutcome)}" data-pixel-impact data-pixel-transition data-selected-option="${escapeHtml(transition.optionId)}" data-visual-outcome="${escapeHtml(feedbackOutcome)}" role="status" aria-live="polite" aria-label="已选择 ${escapeHtml(transition.optionLabel)}；本次账本变化">
      <span class="pixel-impact-strip__choice"><small>已选</small><strong title="${escapeHtml(transition.optionLabel)}">${escapeHtml(transition.optionLabel)}</strong></span>
      ${feedbackOutcomeMarkup(transition)}
      ${items.length ? items.map((item) => `
        <span class="pixel-impact-chip pixel-impact-chip--${item.kind} pixel-impact-chip--${item.direction}">
          <small>${escapeHtml(item.label)}</small><strong>${escapeHtml(item.value)}</strong>
        </span>
      `).join('') : `<span class="pixel-impact-strip__summary">本次选择不改变账本</span>`}
    </div>
  `
}

function optionsMarkup(question: QuizQuestion, gameState: QuizState): string {
  return `
    <div class="pixel-choice-list" role="group" aria-label="可选答案">
      ${question.options.map((option, index) => `
        <button class="pixel-choice-card" type="button" data-option-id="${escapeHtml(option.id)}">
          <span class="pixel-choice-card__key" aria-hidden="true">${index + 1}</span>
          <strong>${escapeHtml(interpolateText(option.label, gameState))}</strong>
        </button>
      `).join('')}
    </div>
    <div class="secondary-row">
      <button class="text-button" data-action="back" ${gameState.history.length === 0 ? 'disabled' : ''}>← 返回上一题重选</button>
      <span>键盘：1～${question.options.length} 选择</span>
    </div>
  `
}

function transitionMarkup(
  question: QuizQuestion,
  transition: PixelTransition,
  quiz: QuizDefinition,
): string {
  const quitting = transition.outcome === 'quit'
  const completing = transition.nextState.phase === 'completed'
  const interlude = quitting
    ? undefined
    : quiz.definition.interludes.find((item) => item.afterQuestionId === question.id)
  const confetti = completing
    ? Array.from({ length: 14 }, (_, index) => `<i style="--confetti-index:${index}"></i>`).join('')
    : ''

  return `
    <div class="pixel-pass pixel-pass--${quitting ? 'quit' : 'accept'}" data-pixel-transition="${quitting ? 'quit' : 'accept'}" role="status" aria-label="第 ${question.number} 题已选择">
      <div class="pixel-pass__shade"></div>
      <div class="pixel-pass__seal" aria-hidden="true"><i></i></div>
      ${completing ? '<div class="pixel-pass__burst" aria-hidden="true"></div>' : ''}
      <div class="pixel-pass__confetti" aria-hidden="true">${confetti}</div>
      <div class="pixel-pass__copy">
        <span>第 ${question.number} / ${quiz.questions.length} 题</span>
        <strong>${escapeHtml(interlude?.title ?? (quitting ? '撤退已受理' : '正式上线'))}</strong>
        <p>${escapeHtml(transition.optionLabel)}</p>
        <small>${escapeHtml(interlude?.body ?? (quitting ? '已发生费用保留，不再新增承诺。' : '产品已完成最后一步，正在生成结算。'))}</small>
      </div>
    </div>
  `
}

function moneyRainMarkup(transition: PixelTransition | null): string {
  if (transition?.visualOutcome !== 'rich-confetti') return ''
  return `<div class="pixel-money-rain" aria-hidden="true">${Array.from({ length: 16 }, (_, index) => {
    const left = 2 + ((index * 17) % 94)
    const delay = (index % 5) * 35
    const drift = ((index % 3) - 1) * 24
    return `<i style="--money-left:${left}%;--money-delay:${delay}ms;--money-drift:${drift}px"></i>`
  }).join('')}</div>`
}

export function renderPixelIntro(gameState: QuizState, questionCount = 25): string {
  return `
    <div class="pixel-layout pixel-layout--intro">
      ${pixelLedgerMarkup(gameState)}
      ${introSceneMarkup()}
      <section class="pixel-dossier pixel-dossier--intro">
        <i class="pixel-dossier__clip" aria-hidden="true"></i>
        <p class="pixel-dossier__eyebrow">A001 · 一人公司生存申请</p>
        <h1>一人公司<br /><em>生存模拟器</em></h1>
        <p class="pixel-dossier__lead">${questionCount} 个场景。你做出的每个选择，都会改变现金、时间、待办与最终称号。</p>
        <div class="pixel-privacy">
          <span aria-hidden="true"></span>
          <p><strong>零数据模式</strong>：不登录、不提交、不使用 Cookie 或本地存储。刷新后立即清零。</p>
        </div>
        <button class="button button--primary button--wide" data-action="start">进入办事大厅</button>
        <div class="pixel-dossier__footer">
          <small>娱乐化个人经验，不构成法律、财税或安全建议。</small>
          <a href="../" class="edition-link">切换视觉版本</a>
        </div>
      </section>
    </div>
  `
}

export function renderPixelQuestion(
  gameState: QuizState,
  quiz: QuizDefinition,
  transition: PixelTransition | null,
): string {
  const question = quiz.questions.find((candidate) => candidate.id === gameState.currentQuestionId)
  if (!question) return ''
  const selectedVisualOptionId = transition?.outcome === 'resolved' ? transition.optionId : undefined
  const visual = resolvePixelVisual(question, selectedVisualOptionId)
  const frame: PixelSceneFrame = transition
    ? transition.outcome === 'quit' ? 'quit' : 'resolved'
    : 'idle'
  const quitting = transition?.outcome === 'quit'
  const completing = transition?.nextState.phase === 'completed'
  const interlude = transition
    ? quiz.definition.interludes.find((item) => item.afterQuestionId === question.id)
    : undefined
  const showFullTransition = Boolean(transition && (quitting || completing || interlude))
  const ledgerState = transition?.nextState ?? gameState

  return `
    <div class="pixel-layout pixel-layout--challenge ${transition ? 'pixel-layout--frozen' : ''}" data-selected-option="${escapeHtml(transition?.optionId ?? '')}" aria-busy="${transition ? 'true' : 'false'}">
      ${pixelLedgerMarkup(ledgerState)}
      ${transition && !showFullTransition ? impactMarkup(gameState, transition) : progressMarkup(question, quiz.questions.length)}
      ${sceneMarkup(
        'question',
        frame,
        visual.sceneId,
        visual.desktopAsset,
        visual.mobileAsset,
        Boolean(transition && transition.outcome !== 'quit'),
        visual.source === 'option' && visual.optionId
          ? { optionId: visual.optionId, overlay: visual.overlay, variant: visual.optionVariant ?? {} }
          : undefined,
        sceneGuideFor(question.id, ledgerState),
      )}
      <section class="pixel-dossier pixel-dossier--question" ${transition ? 'inert' : ''}>
        <i class="pixel-dossier__clip" aria-hidden="true"></i>
        <p class="pixel-dossier__eyebrow">${escapeHtml(visual.chapterLabel)} / ${escapeHtml(visual.sceneId)}</p>
        <h1>${escapeHtml(interpolateText(question.prompt, gameState))}</h1>
        ${question.factNotes.length ? `
          <details class="pixel-cost-details">
            <summary>事实说明（不改题目原文）</summary>
            <ul>${question.factNotes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul>
          </details>
        ` : ''}
        <div class="pixel-dossier__controls">${optionsMarkup(question, gameState)}</div>
      </section>
      ${moneyRainMarkup(transition)}
      ${transition && showFullTransition ? transitionMarkup(question, transition, quiz) : ''}
    </div>
  `
}

function scoreMarkup(gameState: QuizState): string {
  const result = gameState.result
  if (!result) return ''
  return `
    <div class="pixel-score-grid" aria-label="四项评分">
      ${Object.entries(result.score.dimensions).map(([key, dimension]) => `
        <div><span>${SCORE_LABELS[key as keyof typeof SCORE_LABELS]}</span><strong>${dimension.score} / ${dimension.cap}</strong></div>
      `).join('')}
    </div>
  `
}

function costSummaryMarkup(gameState: QuizState): string {
  const result = gameState.result
  if (!result) return ''
  const formatted = formatLedger(result.ledger)
  return `
    <details class="pixel-result-ledger">
      <summary>展开完整经营账本</summary>
      <dl>
        ${Object.entries(COST_LABELS).map(([key, label]) => `<div><dt>${label}</dt><dd>${escapeHtml(formatted[key as keyof typeof COST_LABELS])}</dd></div>`).join('')}
        <div><dt>创始人工时</dt><dd>${escapeHtml(formatted.founderTime)}</dd></div>
        <div><dt>上线关键路径</dt><dd>${escapeHtml(formatted.criticalPath)}</dd></div>
      </dl>
    </details>
  `
}

function businessProjectionMarkup(gameState: QuizState): string {
  const metrics = gameState.result?.metrics
  const users = Number(metrics?.users)
  const monthlyPrice = Number(metrics?.monthlyPriceCny)
  if (!Number.isFinite(users) || !Number.isFinite(monthlyPrice)) return ''
  return `
    <div class="pixel-business-projection" aria-label="商业化粗算">
      <div><span>目标用户</span><strong>${new Intl.NumberFormat('zh-CN').format(users)}</strong></div>
      <div><span>每用户月费</span><strong>${escapeHtml(formatCurrency(monthlyPrice))}</strong></div>
      <div><span>理论月收入</span><strong>${escapeHtml(formatCurrency(users * monthlyPrice))}</strong></div>
      <small>用户数 × 月费，未扣流失、渠道、税费和变动成本。</small>
    </div>
  `
}

export function renderPixelResult(gameState: QuizState, quiz: QuizDefinition): string {
  const result = gameState.result
  if (!result) return renderPixelIntro(gameState, quiz.questions.length)
  const resultQuestionId = result.outcome === 'completed' ? 'Q25' : result.stoppedAtQuestionId
  const question = quiz.questions.find((candidate) => candidate.id === resultQuestionId) ?? quiz.questions.at(-1)
  if (!question) return ''
  const completed = result.outcome === 'completed'
  const completedOptionId = completed
    ? [...gameState.history].reverse().find((answer) => answer.questionId === question.id)?.optionId
    : undefined
  const visual = resolvePixelVisual(question, completedOptionId)

  return `
    <div class="pixel-layout pixel-layout--result">
      ${pixelLedgerMarkup(gameState)}
      ${sceneMarkup(
        completed ? 'victory' : 'result',
        completed ? 'resolved' : 'quit',
        visual.sceneId,
        visual.desktopAsset,
        visual.mobileAsset,
        false,
        completed && visual.source === 'option' && visual.optionId
          ? { optionId: visual.optionId, overlay: visual.overlay, variant: visual.optionVariant ?? {} }
          : undefined,
      )}
      <section class="pixel-dossier pixel-dossier--result">
        <i class="pixel-dossier__clip" aria-hidden="true"></i>
        <div class="pixel-result-stamp">${completed ? '正式上线' : '到此为止'}</div>
        <p class="pixel-dossier__eyebrow">答完 ${result.answeredCount} 题 · 总分 ${result.score.total} / 100</p>
        <h1>${escapeHtml(result.title)}</h1>
        <p class="pixel-result-conclusion">${escapeHtml(result.conclusion)}</p>
        ${result.badges.length ? `<div class="pixel-badges">${result.badges.map((badge) => `<span>${escapeHtml(badge.label)}</span>`).join('')}</div>` : ''}
        ${scoreMarkup(gameState)}
        ${businessProjectionMarkup(gameState)}
        ${costSummaryMarkup(gameState)}
        ${result.topTodos.length ? `<div class="pixel-result-todos"><strong>接下来优先做</strong><ul>${result.topTodos.map((todo) => `<li>${escapeHtml(todo.label)}</li>`).join('')}</ul></div>` : ''}
        <div class="result__actions">
          <button class="button button--primary" data-action="back">← 返回上一题重选</button>
          <button class="button button--ghost" data-action="restart">重新开始并清零</button>
        </div>
        <div class="pixel-dossier__footer">
          <small>注册资本、待报价与变动成本没有混入已花现金。</small>
          <a href="../" class="edition-link">切换视觉版本</a>
        </div>
      </section>
    </div>
  `
}
