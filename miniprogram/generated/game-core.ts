export interface LedgerDelta {
  listedCashCny: number
  pendingCashItems: number
  pendingTimeItems: number
  riskPoints: number
}

export interface ChallengeSource {
  key: string
  label: string
  url: string | null
  sourceType: '用户口径' | '官方规则' | '产品设定'
  checkedAt: string
}

export interface Challenge {
  id: string
  stage: number
  category: string
  title: string
  question: string
  acceptLabel: string
  quitLabel: string
  delta: LedgerDelta
  receipt: string
  costText: string
  costItems: string[]
  sourceKeys: string[]
}

export type AnswerChoice = 'continue' | 'quit'

export interface Answer {
  challengeId: string
  choice: AnswerChoice
}

export interface LockedResult {
  completedCount: number
  stoppedAtIndex: number | null
  title: string
  conclusion: string
  ledger: LedgerDelta
}

export type GamePhase = 'intro' | 'playing' | 'locked' | 'spectating'

export interface GameState {
  phase: GamePhase
  currentIndex: number
  answers: Answer[]
  ledger: LedgerDelta
  lockedResult: LockedResult | null
}

export const ZERO_LEDGER: LedgerDelta = Object.freeze({
  listedCashCny: 0,
  pendingCashItems: 0,
  pendingTimeItems: 0,
  riskPoints: 0,
})

function cloneLedger(ledger: LedgerDelta): LedgerDelta {
  return { ...ledger }
}

function addLedger(left: LedgerDelta, right: LedgerDelta): LedgerDelta {
  return {
    listedCashCny: left.listedCashCny + right.listedCashCny,
    pendingCashItems: left.pendingCashItems + right.pendingCashItems,
    pendingTimeItems: left.pendingTimeItems + right.pendingTimeItems,
    riskPoints: left.riskPoints + right.riskPoints,
  }
}

function buildResult(completedCount: number, stoppedAtIndex: number | null, ledger: LedgerDelta): LockedResult {
  const bands = [
    { max: 0, title: '还没开工，先保住了钱包', conclusion: '你不是放弃，你只是比工商系统更早完成了风险评估。' },
    { max: 3, title: '营业执照门口的清醒人', conclusion: '公司还没成立，但你的求生欲已经完成了实缴。' },
    { max: 6, title: '备案迷宫的半熟勇士', conclusion: '你离老板只差几张表，和一段无法估价的等待。' },
    { max: 9, title: '合规清单驯兽师', conclusion: '你已经学会和待办和平相处，只是待办拒绝和平。' },
    { max: 11, title: '差一点成为老板', conclusion: '能走到这里，说明你对自由的理解已经包含报表。' },
    { max: 12, title: '一个人，也是一家公司', conclusion: '通关不代表轻松，只代表你愿意给所有岗位共用一把椅子。' },
  ]
  const band = bands.find((candidate) => completedCount <= candidate.max) ?? bands[bands.length - 1]
  return {
    completedCount,
    stoppedAtIndex,
    title: band.title,
    conclusion: band.conclusion,
    ledger: cloneLedger(ledger),
  }
}

export function createInitialState(): GameState {
  return {
    phase: 'intro',
    currentIndex: 0,
    answers: [],
    ledger: cloneLedger(ZERO_LEDGER),
    lockedResult: null,
  }
}

export function startGame(): GameState {
  return { ...createInitialState(), phase: 'playing' }
}

function assertPlayable(state: GameState, challenges: Challenge[]): Challenge {
  if (state.phase !== 'playing') {
    throw new Error('Only an active run can be scored.')
  }
  const challenge = challenges[state.currentIndex]
  if (!challenge) {
    throw new Error('Current challenge is out of range.')
  }
  return challenge
}

export function acceptChallenge(state: GameState, challenges: Challenge[]): GameState {
  const challenge = assertPlayable(state, challenges)
  const nextLedger = addLedger(state.ledger, challenge.delta)
  const nextAnswers = [...state.answers, { challengeId: challenge.id, choice: 'continue' as const }]
  const nextIndex = state.currentIndex + 1

  if (nextIndex >= challenges.length) {
    return {
      phase: 'locked',
      currentIndex: challenges.length,
      answers: nextAnswers,
      ledger: nextLedger,
      lockedResult: buildResult(nextAnswers.length, null, nextLedger),
    }
  }

  return {
    phase: 'playing',
    currentIndex: nextIndex,
    answers: nextAnswers,
    ledger: nextLedger,
    lockedResult: null,
  }
}

export function quitChallenge(state: GameState, challenges: Challenge[]): GameState {
  const challenge = assertPlayable(state, challenges)
  const completedCount = state.answers.filter((answer) => answer.choice === 'continue').length
  return {
    phase: 'locked',
    currentIndex: state.currentIndex,
    answers: [...state.answers, { challengeId: challenge.id, choice: 'quit' }],
    ledger: cloneLedger(state.ledger),
    lockedResult: buildResult(completedCount, state.currentIndex, state.ledger),
  }
}

export function enterSpectatorMode(state: GameState, challengeCount: number): GameState {
  if (state.phase !== 'locked' || state.lockedResult?.stoppedAtIndex === null || !state.lockedResult) {
    return state
  }
  return {
    ...state,
    phase: 'spectating',
    currentIndex: Math.min(state.lockedResult.stoppedAtIndex + 1, challengeCount),
  }
}

export function advanceSpectator(state: GameState, challengeCount: number): GameState {
  if (state.phase !== 'spectating') {
    return state
  }
  return { ...state, currentIndex: Math.min(state.currentIndex + 1, challengeCount) }
}

export function goBack(state: GameState, challenges: Challenge[]): GameState {
  if (state.phase !== 'playing' || state.currentIndex === 0) {
    return state
  }
  const nextAnswers = state.answers.slice(0, -1)
  const acceptedIds = new Set(
    nextAnswers.filter((answer) => answer.choice === 'continue').map((answer) => answer.challengeId),
  )
  const nextLedger = challenges.reduce(
    (ledger, challenge) => (acceptedIds.has(challenge.id) ? addLedger(ledger, challenge.delta) : ledger),
    cloneLedger(ZERO_LEDGER),
  )
  return {
    phase: 'playing',
    currentIndex: state.currentIndex - 1,
    answers: nextAnswers,
    ledger: nextLedger,
    lockedResult: null,
  }
}

export function restartGame(): GameState {
  return createInitialState()
}

export function formatLedger(ledger: LedgerDelta): { cash: string; time: string; risk: string } {
  const pendingCash = ledger.pendingCashItems > 0 ? ` + ${ledger.pendingCashItems} 项待确认` : ''
  const time = ledger.pendingTimeItems > 0 ? `${ledger.pendingTimeItems} 项待确认` : '尚未计入'
  return {
    cash: `¥${ledger.listedCashCny.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}${pendingCash}`,
    time,
    risk: `${ledger.riskPoints} 格`,
  }
}
