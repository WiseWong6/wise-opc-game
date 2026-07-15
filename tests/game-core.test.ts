import assert from 'node:assert/strict'
import test from 'node:test'
import challengeData from '../content/challenges.json'
import costData from '../content/costs.json'
import {
  acceptChallenge,
  advanceSpectator,
  createInitialState,
  enterSpectatorMode,
  goBack,
  quitChallenge,
  restartGame,
  startGame,
  type Challenge,
} from '../packages/game-core/src/index.ts'

const challenges = challengeData as Challenge[]

test('题库固定为连续的 12 关', () => {
  assert.equal(challenges.length, 12)
  assert.deepEqual(challenges.map((challenge) => challenge.stage), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
})

test('用户成本清单完整进入首版口径', () => {
  const expected = new Map([
    ['company-registration', 200],
    ['address-white', 1300],
    ['address-red', 1800],
    ['corporate-account', 500],
    ['bookkeeping', 2000],
    ['domain-ssl', 120],
    ['dns', 99],
    ['ecs-2c4g', 1315],
    ['eip', 724],
    ['volume', 199.2],
    ['sms', 45],
    ['content-safety', 322],
    ['mlps-level-2', 50000],
    ['mlps-level-3', 130000],
    ['trademark', 300],
    ['software-copyright', 300],
  ])
  assert.equal(costData.length, expected.size)
  for (const item of costData) {
    assert.equal(item.amountCny, expected.get(item.id), item.id)
    assert.ok(item.labelZh.length > 0)
    assert.ok(item.labelEn.length > 0)
  }
})

test('12 关全部继续后锁定完整结果', () => {
  let state = startGame()
  for (const challenge of challenges) {
    assert.equal(challenges[state.currentIndex]?.id, challenge.id)
    state = acceptChallenge(state, challenges)
  }
  assert.equal(state.phase, 'locked')
  assert.equal(state.lockedResult?.completedCount, 12)
  assert.equal(state.lockedResult?.stoppedAtIndex, null)
  assert.equal(state.ledger.listedCashCny, 57424.2)
  assert.equal(state.answers.length, 12)
})

for (let quitIndex = 0; quitIndex < challenges.length; quitIndex += 1) {
  test(`在第 ${quitIndex + 1} 关退出时锁定此前成绩`, () => {
    let state = startGame()
    for (let index = 0; index < quitIndex; index += 1) state = acceptChallenge(state, challenges)
    state = quitChallenge(state, challenges)
    assert.equal(state.phase, 'locked')
    assert.equal(state.lockedResult?.completedCount, quitIndex)
    assert.equal(state.lockedResult?.stoppedAtIndex, quitIndex)
  })
}

test('围观模式不改变锁定成绩和账本', () => {
  let state = acceptChallenge(startGame(), challenges)
  state = quitChallenge(state, challenges)
  const locked = structuredClone(state.lockedResult)
  const ledger = structuredClone(state.ledger)
  state = enterSpectatorMode(state, challenges.length)
  while (state.currentIndex < challenges.length) state = advanceSpectator(state, challenges.length)
  assert.deepEqual(state.lockedResult, locked)
  assert.deepEqual(state.ledger, ledger)
  assert.equal(state.answers.length, 2)
})

test('返回上一关会重算三本账', () => {
  let state = startGame()
  state = acceptChallenge(state, challenges)
  state = acceptChallenge(state, challenges)
  assert.equal(state.ledger.listedCashCny, 200)
  state = goBack(state, challenges)
  assert.equal(state.currentIndex, 1)
  assert.equal(state.ledger.listedCashCny, 0)
  assert.equal(state.ledger.riskPoints, 1)
})

test('重新开始彻底清零，初始状态不保存历史', () => {
  const dirty = acceptChallenge(startGame(), challenges)
  const restarted = restartGame()
  assert.notDeepEqual(dirty, restarted)
  assert.deepEqual(restarted, createInitialState())
})
