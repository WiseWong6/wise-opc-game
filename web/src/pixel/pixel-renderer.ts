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

type PixelHudKind = 'cash' | 'fixed' | 'time' | 'path'

function compactCurrency(value: number, hasUnknownAmount: boolean): string {
  const formatted = Math.abs(value) >= 10_000
    ? `¥${(value / 10_000).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}万`
    : `¥${value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`
  return `${formatted}${hasUnknownAmount ? '+待定' : ''}`
}

function changedHudKinds(beforeState: QuizState, afterState: QuizState): Set<PixelHudKind> {
  const before = beforeState.result?.ledger ?? beforeState.ledger
  const after = afterState.result?.ledger ?? afterState.ledger
  const changed = new Set<PixelHudKind>()
  if (
    before.costs.paidSunk.totalCny !== after.costs.paidSunk.totalCny
    || before.costs.paidSunk.hasUnknownAmount !== after.costs.paidSunk.hasUnknownAmount
  ) changed.add('cash')
  if (
    before.costs.firstYearCommitted.totalCny !== after.costs.firstYearCommitted.totalCny
    || before.costs.firstYearCommitted.hasUnknownAmount !== after.costs.firstYearCommitted.hasUnknownAmount
  ) changed.add('fixed')
  if (
    before.time.founderHours !== after.time.founderHours
    || before.time.recurringMonthlyHours !== after.time.recurringMonthlyHours
  ) changed.add('time')
  if (before.time.criticalPathDays !== after.time.criticalPathDays) changed.add('path')
  return changed
}

function pixelLedgerMarkup(gameState: QuizState, changed = new Set<PixelHudKind>()): string {
  const rawLedger = gameState.result?.ledger ?? gameState.ledger
  const ledger = formatLedger(rawLedger)
  const cells = [
    {
      kind: 'cash' as const,
      icon: '¥',
      label: '已付',
      value: ledger.paidSunk,
      compactValue: compactCurrency(rawLedger.costs.paidSunk.totalCny, rawLedger.costs.paidSunk.hasUnknownAmount),
    },
    {
      kind: 'fixed' as const,
      icon: '年',
      label: '首年',
      value: ledger.firstYearCommitted,
      compactValue: compactCurrency(rawLedger.costs.firstYearCommitted.totalCny, rawLedger.costs.firstYearCommitted.hasUnknownAmount),
    },
    {
      kind: 'time' as const,
      icon: '时',
      label: '工时',
      value: ledger.founderTime,
      compactValue: `${rawLedger.time.founderHours}h${rawLedger.time.recurringMonthlyHours ? `+${rawLedger.time.recurringMonthlyHours}h/月` : ''}`,
    },
    {
      kind: 'path' as const,
      icon: '天',
      label: '关键路径',
      value: ledger.criticalPath,
      compactValue: `${Math.round(rawLedger.time.criticalPathDays * 10) / 10}天`,
    },
  ]

  return `
    <dl class="pixel-hud" data-pixel-hud aria-label="当前经营账本">
      ${cells.map((cell) => `
        <div class="pixel-hud__cell pixel-hud__cell--${cell.kind}${changed.has(cell.kind) ? ' pixel-hud__cell--changed' : ''}" data-pixel-hud-cell="${cell.kind}">
          <dt><span class="pixel-hud__icon" aria-hidden="true">${cell.icon}</span>${cell.label}</dt>
          <dd title="${escapeHtml(cell.value)}" aria-label="${escapeHtml(`${cell.label}：${cell.value}`)}">
            <span class="pixel-hud__value pixel-hud__value--full" aria-hidden="true">${escapeHtml(cell.value)}</span>
            <span class="pixel-hud__value pixel-hud__value--compact" aria-hidden="true">${escapeHtml(cell.compactValue)}</span>
          </dd>
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
): string {
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
    </div>
  `
}

function stageMarkup(scene: string, overlay = '', modifier = ''): string {
  return `
    <div class="pixel-stage ${modifier}" data-pixel-stage>
      ${scene}
      ${overlay}
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
      <span>第 ${question.number} / ${count} 题</span>
      <div class="pixel-progress__track"><i style="width:${percent}%"></i></div>
    </div>
  `
}

function costCheckpointProgressMarkup(questionCount: number): string {
  const completedQuestions = Math.max(questionCount - 1, 0)
  const percent = questionCount > 0 ? Math.round((completedQuestions / questionCount) * 100) : 0
  return `
    <div class="pixel-progress" data-pixel-status-rail aria-label="成本确认，已完成 ${completedQuestions} / ${questionCount} 题">
      <span>成本确认 · ${completedQuestions} / ${questionCount}</span>
      <div class="pixel-progress__track"><i style="width:${percent}%"></i></div>
    </div>
  `
}

function optionFeedbackMarkup(transition: PixelTransition, overlay?: OptionVisualOverlay): string {
  const tone = overlay?.tone && ['brand', 'success', 'warning'].includes(overlay.tone)
    ? overlay.tone
    : 'neutral'
  const eyebrow = overlay?.eyebrow ?? '选择确认'
  const title = overlay?.title ?? transition.optionLabel
  return `
    <div class="pixel-option-feedback pixel-option-visual pixel-option-visual--${tone}" data-pixel-option-feedback data-pixel-transition data-option-visual-overlay data-selected-option="${escapeHtml(transition.optionId)}"${transition.visualOutcome ? ` data-visual-outcome="${escapeHtml(transition.visualOutcome)}"` : ''} role="status" aria-live="polite" aria-label="已选择 ${escapeHtml(transition.optionLabel)}">
      <img class="pixel-option-feedback__motion" src="/assets/pixel/motion/choice-confirm.webp" alt="" width="160" height="80" aria-hidden="true" />
      <span class="pixel-option-feedback__copy">
        <small>${escapeHtml(eyebrow)}</small>
        <strong title="${escapeHtml(title)}">${escapeHtml(title)}</strong>
        ${overlay?.detail ? `<span>${escapeHtml(overlay.detail)}</span>` : ''}
      </span>
    </div>
  `
}

function optionsMarkup(question: QuizQuestion, gameState: QuizState): string {
  return `
    <div class="pixel-choice-list" data-option-count="${question.options.length}" role="group" aria-label="可选答案">
      ${question.options.map((option, index) => `
        <button class="pixel-choice-card" type="button" data-option-id="${escapeHtml(option.id)}">
          <span class="pixel-choice-card__key" aria-hidden="true">${index + 1}</span>
          <strong>${escapeHtml(interpolateText(option.label, gameState))}</strong>
        </button>
      `).join('')}
    </div>
    <div class="secondary-row">
      <button class="text-button" data-action="back" ${gameState.history.length === 0 ? 'disabled' : ''}>返回上一题重选</button>
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

export function renderPixelIntro(gameState: QuizState): string {
  return `
    <div class="pixel-layout pixel-layout--intro">
      ${pixelLedgerMarkup(gameState)}
      ${introSceneMarkup()}
      <section class="pixel-dossier pixel-dossier--intro">
        <i class="pixel-dossier__clip" aria-hidden="true"></i>
        <p class="pixel-dossier__eyebrow">A001 · 一人公司生存申请</p>
        <h1>一人公司<br /><em>生存模拟器</em></h1>
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
      ${pixelLedgerMarkup(ledgerState, transition ? changedHudKinds(gameState, transition.nextState) : undefined)}
      ${progressMarkup(question, quiz.questions.length)}
      ${stageMarkup(
        sceneMarkup(
          'question',
          frame,
          visual.sceneId,
          visual.desktopAsset,
          visual.mobileAsset,
          Boolean(transition && transition.outcome !== 'quit'),
          visual.source === 'option' && visual.optionId
            ? { optionId: visual.optionId, overlay: visual.overlay, variant: visual.optionVariant ?? {} }
            : undefined,
        ),
        `${moneyRainMarkup(transition)}${transition && showFullTransition
          ? transitionMarkup(question, transition, quiz)
          : transition
            ? optionFeedbackMarkup(transition, visual.overlay)
            : ''}`,
        'pixel-stage--question',
      )}
      <section class="pixel-dossier pixel-dossier--question" data-option-count="${question.options.length}" ${transition ? 'inert' : ''}>
        <i class="pixel-dossier__clip" aria-hidden="true"></i>
        <p class="pixel-dossier__eyebrow">${escapeHtml(visual.chapterLabel)} / ${escapeHtml(visual.sceneId)}</p>
        <h1>${escapeHtml(interpolateText(question.prompt, gameState))}</h1>
        <div class="pixel-dossier__controls">${optionsMarkup(question, gameState)}</div>
      </section>
    </div>
  `
}

export function renderPixelCostCheckpoint(gameState: QuizState, quiz: QuizDefinition): string {
  const pricingQuestion = quiz.questions.find((question) => question.id === 'Q24')
  if (!pricingQuestion) return renderPixelQuestion(gameState, quiz, null)

  const selectedPriceOptionId = [...gameState.history]
    .reverse()
    .find((answer) => answer.questionId === pricingQuestion.id)?.optionId
  const visual = resolvePixelVisual(pricingQuestion, selectedPriceOptionId)
  const users = Number(gameState.metrics.users)
  const monthlyPrice = Number(gameState.metrics.monthlyPriceCny)
  const safeUsers = Number.isFinite(users) ? users : 0
  const safeMonthlyPrice = Number.isFinite(monthlyPrice) ? monthlyPrice : 0
  const theoreticalMonthlyRevenue = safeUsers * safeMonthlyPrice
  const monthlyFixedCost = gameState.ledger.costs.firstYearCommitted.totalCny / 12
  const monthlyDifference = theoreticalMonthlyRevenue - monthlyFixedCost
  const hasUnpricedFixedCosts = gameState.ledger.costs.firstYearCommitted.hasUnknownAmount
  const formattedUsers = new Intl.NumberFormat('zh-CN').format(safeUsers)
  const formattedPrice = formatCurrency(safeMonthlyPrice)
  const formattedRevenue = formatCurrency(theoreticalMonthlyRevenue)
  const formattedMonthlyCost = formatCurrency(monthlyFixedCost)
  const formattedDifference = `${monthlyDifference >= 0 ? '+' : '−'}${formatCurrency(Math.abs(monthlyDifference))}`
  const differenceTone = monthlyDifference >= 0 ? 'positive' : 'negative'
  const optionVisual = visual.source === 'option' && visual.optionId
    ? { optionId: visual.optionId, overlay: visual.overlay, variant: visual.optionVariant ?? {} }
    : undefined
  const costBoard = `
    <div class="pixel-cost-board" data-pixel-cost-board role="status" aria-label="成本试算：${formattedUsers} 个用户，每位每月 ${formattedPrice}，理论月收入 ${formattedRevenue}，当前月固定成本约 ${formattedMonthlyCost}">
      <header><span>MONTHLY COST CHECK</span><strong>本月成本试算</strong></header>
      <div class="pixel-cost-board__grid">
        <div><span>预计用户</span><strong>${escapeHtml(formattedUsers)}</strong></div>
        <div><span>用户月费</span><strong>${escapeHtml(formattedPrice)}</strong></div>
        <div><span>理论月收入</span><strong>${escapeHtml(formattedRevenue)}</strong></div>
        <div><span>当前月固定成本</span><strong>${escapeHtml(formattedMonthlyCost)}${hasUnpricedFixedCosts ? '<small> + 待确认</small>' : ''}</strong></div>
      </div>
      <p class="pixel-cost-board__difference pixel-cost-board__difference--${differenceTone}">
        <span>理论月度差额</span><strong>${escapeHtml(formattedDifference)}</strong>
      </p>
    </div>
  `

  return `
    <div class="pixel-layout pixel-layout--challenge pixel-layout--cost-checkpoint" data-pixel-cost-checkpoint>
      ${pixelLedgerMarkup(gameState)}
      ${costCheckpointProgressMarkup(quiz.questions.length)}
      ${stageMarkup(
        sceneMarkup(
          'question',
          'resolved',
          visual.sceneId,
          visual.desktopAsset,
          visual.mobileAsset,
          false,
          optionVisual,
        ),
        costBoard,
        'pixel-stage--question pixel-stage--cost-check',
      )}
      <section class="pixel-dossier pixel-dossier--question pixel-cost-check" aria-labelledby="pixel-cost-check-title">
        <i class="pixel-dossier__clip" aria-hidden="true"></i>
        <p class="pixel-dossier__eyebrow">business / COST-CHECK</p>
        <h1 id="pixel-cost-check-title">预计 ${escapeHtml(formattedUsers)} 个用户，每位每月 ${escapeHtml(formattedPrice)}。你现在每月约支付 ${escapeHtml(formattedMonthlyCost)}，确定继续吗？</h1>
        <p class="pixel-cost-check__note">月成本按首年固定成本 ÷ 12 粗算；不含模型用量、支付手续费、税费和获客等浮动成本。</p>
        <div class="pixel-dossier__controls">
          <div class="pixel-choice-list" role="group" aria-label="成本确认选项">
            <button class="pixel-choice-card" type="button" data-action="confirm-cost-check">
              <span class="pixel-choice-card__key" aria-hidden="true">1</span>
              <strong>继续，去找第一百个用户</strong>
            </button>
            <button class="pixel-choice-card" type="button" data-action="recalculate-cost-check">
              <span class="pixel-choice-card__key" aria-hidden="true">2</span>
              <strong>返回重选价格</strong>
            </button>
          </div>
          <div class="secondary-row">
            <span>键盘：1 继续 · 2 重算</span>
          </div>
        </div>
      </section>
    </div>
  `
}

function scoreMarkup(gameState: QuizState): string {
  const result = gameState.result
  if (!result) return ''
  return `
    <div class="pixel-score-grid" aria-label="四项评分">
      ${Object.entries(result.score.dimensions).map(([key, dimension]) => `
        <div class="pixel-score-grid__item">
          <span>${SCORE_LABELS[key as keyof typeof SCORE_LABELS]}</span>
          <strong>${dimension.score} / ${dimension.cap}</strong>
          <i aria-hidden="true"><b style="width:${Math.round((dimension.score / dimension.cap) * 100)}%"></b></i>
        </div>
      `).join('')}
    </div>
  `
}

function costSummaryMarkup(gameState: QuizState): string {
  const result = gameState.result
  if (!result) return ''
  const formatted = formatLedger(result.ledger)
  return `
    <dl class="pixel-result-ledger">
      ${Object.entries(COST_LABELS).map(([key, label]) => `<div><dt>${label}</dt><dd>${escapeHtml(formatted[key as keyof typeof COST_LABELS])}</dd></div>`).join('')}
      <div><dt>创始人工时</dt><dd>${escapeHtml(formatted.founderTime)}</dd></div>
      <div><dt>上线关键路径</dt><dd>${escapeHtml(formatted.criticalPath)}</dd></div>
    </dl>
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
  if (!result) return renderPixelIntro(gameState)
  const resultQuestionId = result.outcome === 'completed' ? 'Q25' : result.stoppedAtQuestionId
  const question = quiz.questions.find((candidate) => candidate.id === resultQuestionId) ?? quiz.questions.at(-1)
  if (!question) return ''
  const completed = result.outcome === 'completed'
  const completedOptionId = completed
    ? [...gameState.history].reverse().find((answer) => answer.questionId === question.id)?.optionId
    : undefined
  const visual = resolvePixelVisual(question, completedOptionId)
  const scoreDigits = Math.min(String(Math.abs(result.score.total)).length, 3)
  const resultPanel = `
    <section class="pixel-result-panel" data-pixel-achievement aria-labelledby="pixel-result-title">
      <header class="pixel-certificate__hero">
        <div class="pixel-score-medallion pixel-score-medallion--digits-${scoreDigits}" aria-label="总分 ${result.score.total} 分">
          <img class="pixel-score-medallion__motion" src="/assets/pixel/motion/achievement-reveal.webp" alt="" width="256" height="256" aria-hidden="true" />
          <span class="pixel-score-medallion__disc" aria-hidden="true">
            <strong data-pixel-score>${result.score.total}</strong>
            <small>/ 100</small>
          </span>
        </div>
        <div class="pixel-certificate__identity">
          <div class="pixel-result-stamp">${completed ? '正式上线' : '到此为止'}</div>
          <p class="pixel-dossier__eyebrow">闯过 ${result.answeredCount} 关</p>
          <h1 id="pixel-result-title">${escapeHtml(result.title)}</h1>
        </div>
      </header>
      <p class="pixel-result-conclusion">${escapeHtml(result.conclusion)}</p>
      ${result.badges.length ? `<div class="pixel-badges" aria-label="成就章">${result.badges.map((badge) => `<span>${escapeHtml(badge.label)}</span>`).join('')}</div>` : ''}
      ${scoreMarkup(gameState)}
      ${businessProjectionMarkup(gameState)}
      <div class="result__actions">
        <button class="button button--primary" data-action="open-result-details">查看完整结算</button>
        <button class="button button--ghost" data-action="back">返回上一题</button>
        <button class="text-button" data-action="restart">重新开始并清零</button>
      </div>
    </section>
    <dialog class="pixel-result-dialog" data-result-dialog aria-labelledby="pixel-result-details-title">
      <form method="dialog" class="pixel-result-dialog__frame">
        <header>
          <div>
            <p class="pixel-dossier__eyebrow">经营档案 · 完整结算</p>
            <h2 id="pixel-result-details-title">${escapeHtml(result.title)}</h2>
          </div>
          <button class="pixel-result-dialog__close" type="button" data-action="close-result-details" aria-label="关闭完整结算">×</button>
        </header>
        <div class="pixel-result-dialog__body">
          <section>
            <h3>完整经营账本</h3>
            ${costSummaryMarkup(gameState)}
          </section>
          ${businessProjectionMarkup(gameState)}
          ${result.topTodos.length ? `<section class="pixel-result-todos"><h3>接下来优先做</h3><ul>${result.topTodos.map((todo) => `<li>${escapeHtml(todo.label)}</li>`).join('')}</ul></section>` : ''}
          <p class="pixel-result-dialog__note">注册资本、待报价与变动成本没有混入已花现金。</p>
        </div>
      </form>
    </dialog>
  `

  return `
    <div class="pixel-layout pixel-layout--result">
      ${pixelLedgerMarkup(gameState)}
      ${stageMarkup(
        sceneMarkup(
          completed ? 'victory' : 'result',
          completed ? 'resolved' : 'quit',
          visual.sceneId,
          visual.desktopAsset,
          visual.mobileAsset,
          false,
          completed && visual.source === 'option' && visual.optionId
            ? { optionId: visual.optionId, variant: visual.optionVariant ?? {} }
            : undefined,
        ),
        resultPanel,
        'pixel-stage--result',
      )}
    </div>
  `
}
