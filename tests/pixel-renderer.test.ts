import assert from 'node:assert/strict'
import test from 'node:test'
import quizData from '../content/quiz-v2.json'
import {
  chooseOption,
  restartGame,
  type QuizDefinition,
} from '../packages/game-core/src/index.ts'
import {
  renderPixelIntro,
  renderPixelQuestion,
  renderPixelResult,
} from '../web/src/pixel/pixel-renderer.ts'

const quiz = quizData as unknown as QuizDefinition

test('像素版首页包含四格大厅、动态 25 题与零数据说明', () => {
  const state = restartGame(quiz)
  const markup = renderPixelIntro(state, quiz.questions.length)
  assert.match(markup, /data-pixel-hud/)
  assert.match(markup, /data-pixel-scene="intro"/)
  assert.match(markup, /stage-00\.webp/)
  assert.match(markup, /零数据模式/)
  assert.match(markup, /25 个场景/)
  assert.match(markup, /data-action="start"/)
})

test('题目页按数组渲染 1～4 选项并绑定当前题唯一双端资产', () => {
  const state = restartGame(quiz)
  const question = quiz.questions[0]
  const markup = renderPixelQuestion(state, quiz, null)
  assert.match(markup, new RegExp(question.prompt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(markup, new RegExp(question.visual.desktopAsset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(markup, new RegExp(question.visual.mobileAsset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(markup, /<picture>/)
  assert.equal((markup.match(/data-option-id=/g) ?? []).length, question.options.length)
  assert.match(markup, /键盘：1～/)
})

test('25 题都在场景内提供准确语义标签，Q3 明确 Codex Pro 美元成本而非产品售价', () => {
  const semanticAnchors: Record<string, string[]> = {
    Q01: ['从本地原型走向真实用户', 'GO LIVE'],
    Q02: ['真实产品登录界面', '手机号 / 邮箱', '游客进入'],
    Q03: ['开发会员投入', 'CODEX PRO', '$200 / 月'],
    Q04: ['身份与责任的门槛', '公司设立', '企业主体'],
    Q05: ['注册代办受理台', '投入注册火炉'],
    Q06: ['注册地址二选一', '真实工位', '地址挂靠'],
    Q07: ['企业对公账户申请', '企业开户 / 对公账户', 'UKey'],
    Q08: ['商户收银台', '微信支付', '支付宝'],
    Q09: ['公司账与个人账必须分开', '代理记账', '自己做账'],
    Q10: ['编程助手订阅选择', 'GPT 5.6 Ultra', 'GLM 5.2 Pro', 'Kimi Code 2.7'],
    Q11: ['产品运行时 AI 决策', 'TOKEN 按量', '供应商合同'],
    Q12: ['正式网址接线台', 'DOMAIN / 域名', 'SSL', 'DNS'],
    Q13: ['手机验证码登录', '+86 手机号', '1000 条短信'],
    Q14: ['云服务器规格选择', '1 核 / 2G', '2 核 / 4G'],
    Q15: ['系统与数据存储', 'SYS 40G + DATA 100G', '仅 SYS 40G'],
    Q16: ['公网带宽最后一插', '3M / 3 Mbps', '已花 ¥X'],
    Q17: ['工信部网站备案', 'ICP 备案提交', '预计 7 天'],
    Q18: ['公安联网备案', '工信备案已通过', '再等 7 天'],
    Q19: ['经营范围与主体门槛', '自营产品 / 服务', '注册资本门槛 ¥1,000,000', '未支付'],
    Q20: ['公众表达功能检查', '发帖 · 评论 · 公开分享 · 社群', '第三方询价 ¥12,000', '未支付'],
    Q21: ['等保待定级研判', '二级压力预算', '三级压力预算', '未支付'],
    Q22: ['产品定位四格表', '用户', '场景', '需求', '竞品 / 替代'],
    Q23: ['用户规模假设，不是已获得用户', '预计用户数', '100,000'],
    Q24: ['价格假设与理论月流水', '¥9.9 / 用户·月', '理论月流水 ≠ 利润'],
    Q25: ['第一百个用户从哪来', '内容 · 社群 · 口碑', 'CAC 上限', '今天上线'],
  }

  for (const question of quiz.questions) {
    const state = { ...restartGame(quiz), currentQuestionId: question.id }
    const markup = renderPixelQuestion(state, quiz, null)
    assert.match(markup, /data-pixel-scene-guide/, `${question.id} 应有场景语义标签`)
    for (const anchor of semanticAnchors[question.id] ?? []) {
      assert.match(
        markup,
        new RegExp(anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        `${question.id} 缺少语义锚点：${anchor}`,
      )
    }
  }
  assert.deepEqual(Object.keys(semanticAnchors).sort(), quiz.questions.map((question) => question.id).sort())

  const q3State = { ...restartGame(quiz), currentQuestionId: 'Q03' }
  const q3Markup = renderPixelQuestion(q3State, quiz, null)
  assert.match(q3Markup, /CODEX PRO/)
  assert.match(q3Markup, /\$200 \/ 月/)
  assert.match(q3Markup, /开发会员投入/)
  assert.match(q3Markup, /让产品覆盖订阅投入/)

  const q10State = { ...restartGame(quiz), currentQuestionId: 'Q10' }
  const q10Markup = renderPixelQuestion(q10State, quiz, null)
  for (const label of ['GPT 5.6 Ultra', 'GLM 5.2 Pro', 'Kimi Code 2.7', '免费工具']) {
    assert.match(q10Markup, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})

test('Q24 公式承接 Q23 实际选择的预计用户数，不把人数写死成 100', () => {
  const state = {
    ...restartGame(quiz),
    currentQuestionId: 'Q24',
    metrics: { users: 10_000 },
  }
  const markup = renderPixelQuestion(state, quiz, null)

  assert.match(markup, /10,000 位预计用户 × 月费/)
  assert.match(markup, /用户数来自上一题 · 理论月流水 ≠ 利润/)
})

test('25 题分别绑定 25 个 sceneId 和 50 个路径，不存在旧 1..12 clamp', () => {
  assert.equal(new Set(quiz.questions.map((question) => question.visual.sceneId)).size, 25)
  assert.equal(new Set(quiz.questions.map((question) => question.visual.desktopAsset)).size, 25)
  assert.equal(new Set(quiz.questions.map((question) => question.visual.mobileAsset)).size, 25)

  for (const question of quiz.questions) {
    const state = { ...restartGame(quiz), currentQuestionId: question.id }
    const markup = renderPixelQuestion(state, quiz, null)
    assert.match(markup, new RegExp(`data-scene-id="${question.visual.sceneId}"`))
  }
})

test('选择反馈播放 resolved/quit 四态帧并冻结控件', () => {
  const state = restartGame(quiz)
  const question = quiz.questions[0]
  const continuing = question.options.find((option) => option.outcome !== 'exit')
  const exiting = question.options.find((option) => option.outcome === 'exit')
  assert.ok(continuing)
  assert.ok(exiting)

  const resolved = renderPixelQuestion(state, quiz, {
    optionId: continuing.id,
    optionLabel: continuing.label,
    outcome: 'resolved',
    nextState: chooseOption(quiz, state, continuing.id),
  })
  assert.match(resolved, /data-storyboard-frame="resolved"/)
  assert.match(resolved, /pixel-world--sequence-accept/)
  assert.match(resolved, /pixel-dossier pixel-dossier--question" inert/)
  assert.match(resolved, /data-pixel-impact/)
  assert.doesNotMatch(resolved, /路线已重算/)
  assert.doesNotMatch(resolved, /pixel-pass__copy/)

  const quit = renderPixelQuestion(state, quiz, {
    optionId: exiting.id,
    optionLabel: exiting.label,
    outcome: 'quit',
    nextState: chooseOption(quiz, state, exiting.id),
  })
  assert.match(quit, /data-storyboard-frame="quit"/)
  assert.match(quit, />撤退已受理</)
  assert.doesNotMatch(quit, /pixel-world--sequence-accept/)
  assert.match(quit, /pixel-pass__copy/)
})

test('正常选择按 optionId 使用专属双端 action/resolved 单帧与安全 DOM 文字，退出仍回落到题目母板', () => {
  const optionQuiz = structuredClone(quiz)
  const question = optionQuiz.questions[0]
  const continuing = question.options.find((option) => option.outcome !== 'exit')
  const exiting = question.options.find((option) => option.outcome === 'exit')
  assert.ok(continuing)
  assert.ok(exiting)
  question.visual.optionVariants = {
    [continuing.id]: {
      action: {
        desktopAsset: '/assets/pixel/options/Q01-launch-action-desktop.webp',
        mobileAsset: '/assets/pixel/options/Q01-launch-action-mobile.webp',
      },
      resolved: {
        desktopAsset: '/assets/pixel/options/Q01-launch-resolved-desktop.webp',
        mobileAsset: '/assets/pixel/options/Q01-launch-resolved-mobile.webp',
      },
      overlay: {
        eyebrow: 'CODING PLAN',
        title: 'Codex Pro <GPT>',
        detail: 'US$200 / 月',
        tone: 'brand',
      },
    },
    [exiting.id]: {
      action: {
        desktopAsset: '/assets/pixel/options/Q01-exit-action-desktop.webp',
        mobileAsset: '/assets/pixel/options/Q01-exit-action-mobile.webp',
      },
      overlay: { title: '不应显示' },
    },
  }
  const state = restartGame(optionQuiz)

  const resolved = renderPixelQuestion(state, optionQuiz, {
    optionId: continuing.id,
    optionLabel: continuing.label,
    outcome: 'resolved',
    nextState: chooseOption(optionQuiz, state, continuing.id),
  })
  assert.match(resolved, /Q01-launch-action-desktop\.webp/)
  assert.match(resolved, /Q01-launch-action-mobile\.webp/)
  assert.match(resolved, /Q01-launch-resolved-desktop\.webp/)
  assert.match(resolved, /Q01-launch-resolved-mobile\.webp/)
  assert.match(resolved, /data-option-visual-frame="action"/)
  assert.match(resolved, /data-option-visual-frame="resolved"/)
  assert.match(resolved, /data-visual-source="option"/)
  assert.match(resolved, /data-option-visual="launch"/)
  assert.match(resolved, /data-option-visual-overlay/)
  assert.match(resolved, /Codex Pro &lt;GPT&gt;/)
  assert.match(resolved, /US\$200 \/ 月/)
  assert.match(resolved, /pixel-world--sequence-accept/)

  const quit = renderPixelQuestion(state, optionQuiz, {
    optionId: exiting.id,
    optionLabel: exiting.label,
    outcome: 'quit',
    nextState: chooseOption(optionQuiz, state, exiting.id),
  })
  assert.match(quit, new RegExp(question.visual.desktopAsset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(quit, /data-visual-source="question"/)
  assert.doesNotMatch(quit, /Q01-exit-action-desktop\.webp/)
  assert.doesNotMatch(quit, /data-option-visual-overlay/)
})

test('Q5 普通选择在顶部状态条下显示即时钱与时间差量，不再弹路线重算', () => {
  let state = restartGame(quiz)
  for (const optionId of ['launch', 'login', 'profit', 'found-company']) {
    state = chooseOption(quiz, state, optionId)
  }
  assert.equal(state.currentQuestionId, 'Q05')
  const question = quiz.questions.find((candidate) => candidate.id === 'Q05')
  const option = question?.options.find((candidate) => candidate.id === 'register')
  assert.ok(option)
  const markup = renderPixelQuestion(state, quiz, {
    optionId: option.id,
    optionLabel: option.label,
    outcome: 'resolved',
    visualOutcome: option.visualOutcome,
    nextState: chooseOption(quiz, state, option.id),
  })

  const hudIndex = markup.indexOf('data-pixel-hud')
  const impactIndex = markup.indexOf('data-pixel-impact')
  const sceneIndex = markup.indexOf('data-pixel-scene')
  assert.ok(hudIndex >= 0 && impactIndex > hudIndex && sceneIndex > impactIndex)
  assert.match(markup, /已支付<\/small><strong>\+¥500<\/strong>/)
  assert.match(markup, /工时<\/small><strong>\+4h<\/strong>/)
  assert.match(markup, /关键路径<\/small><strong>\+2\.7天<\/strong>/)
  assert.match(markup, /<dd>¥500(?:\.00)?<\/dd>/)
  assert.match(markup, /data-visual-outcome="gpt-sacrifice"/)
  assert.match(markup, /pixel-choice-effect--sacrifice/)
  assert.doesNotMatch(markup, /路线已重算/)
})

test('Q10 选择不同开发 AI 时在 HUD 下反馈带保留具体选项与模型接线动效', () => {
  let state = restartGame(quiz)
  for (const optionId of ['launch', 'guest', 'love']) state = chooseOption(quiz, state, optionId)
  assert.equal(state.currentQuestionId, 'Q10')
  const question = quiz.questions.find((candidate) => candidate.id === 'Q10')
  const option = question?.options.find((candidate) => candidate.id === 'glm-pro')
  assert.ok(option)
  const markup = renderPixelQuestion(state, quiz, {
    optionId: option.id,
    optionLabel: option.label,
    outcome: 'resolved',
    visualOutcome: option.visualOutcome,
    nextState: chooseOption(quiz, state, option.id),
  })

  assert.match(markup, /data-selected-option="glm-pro"/)
  assert.match(markup, /data-visual-outcome="ai-glm"/)
  assert.match(markup, /GLM 5\.2 Pro/)
  assert.match(markup, /pixel-choice-effect--ai/)
  assert.match(markup, /首年<\/small><strong>\+¥1,430\.40<\/strong>/)
  assert.match(markup, /工时<\/small><strong>\+80h<\/strong>/)
})

test('Q19 资本门槛只显示为门槛差量并触发像素钱雨，不混入已支付', () => {
  let state = restartGame(quiz)
  let guard = 0
  while (state.phase === 'playing' && state.currentQuestionId !== 'Q19') {
    const question = quiz.questions.find((candidate) => candidate.id === state.currentQuestionId)
    const option = question?.options.find((candidate) => candidate.outcome !== 'exit')
    assert.ok(option)
    state = chooseOption(quiz, state, option.id)
    guard += 1
    assert.ok(guard <= 25)
  }
  const question = quiz.questions.find((candidate) => candidate.id === 'Q19')
  const option = question?.options.find((candidate) => candidate.id === 'all-in-capital')
  assert.ok(question)
  assert.ok(option)
  const nextState = chooseOption(quiz, state, option.id)
  const markup = renderPixelQuestion(state, quiz, {
    optionId: option.id,
    optionLabel: option.label,
    outcome: 'resolved',
    visualOutcome: option.visualOutcome,
    nextState,
  })
  assert.match(markup, /资本门槛<\/small><strong>\+¥1,000,000<\/strong>/)
  assert.match(markup, /pixel-money-rain/)
  assert.equal(nextState.ledger.costs.paidSunk.totalCny, state.ledger.costs.paidSunk.totalCny)
})

test('Q9 过场只在继续路线出现，退出买球鞋不会误报资质关卡完成', () => {
  let state = restartGame(quiz)
  while (state.phase === 'playing' && state.currentQuestionId !== 'Q09') {
    const question = quiz.questions.find((candidate) => candidate.id === state.currentQuestionId)
    const option = question?.options.find((candidate) => candidate.outcome !== 'exit')
    assert.ok(option)
    state = chooseOption(quiz, state, option.id)
  }
  const question = quiz.questions.find((candidate) => candidate.id === 'Q09')
  const exitOption = question?.options.find((candidate) => candidate.outcome === 'exit')
  assert.ok(question)
  assert.ok(exitOption)
  const markup = renderPixelQuestion(state, quiz, {
    optionId: exitOption.id,
    optionLabel: exitOption.label,
    outcome: 'quit',
    nextState: chooseOption(quiz, state, exitOption.id),
  })
  assert.match(markup, /撤退已受理/)
  assert.doesNotMatch(markup, /走完了大部分的资质关卡/)
})

test('完成路线结果页复用 Q25 resolved 帧并展示四维 100 分制与商业粗算', () => {
  let state = restartGame(quiz)
  let guard = 0
  while (state.phase === 'playing') {
    const question = quiz.questions.find((candidate) => candidate.id === state.currentQuestionId)
    const option = question?.options.find((candidate) => candidate.outcome !== 'exit')
    assert.ok(option)
    state = chooseOption(quiz, state, option.id)
    guard += 1
    assert.ok(guard <= 25)
  }
  const markup = renderPixelResult(state, quiz)
  assert.match(markup, /data-pixel-scene="victory"/)
  assert.match(markup, /data-scene-id="Q25"/)
  assert.match(markup, /data-storyboard-frame="resolved"/)
  assert.match(markup, /data-visual-source="option"/)
  assert.match(markup, /data-option-visual="organic"/)
  assert.match(markup, /data-option-visual-frame="resolved"/)
  assert.match(markup, /总分 \d+ \/ 100/)
  assert.equal((markup.match(/<strong>[^<]+ \/ (?:30|25|15)<\/strong>/g) ?? []).length, 4)
  assert.match(markup, /理论月收入/)
  assert.match(markup, /¥990/)
  assert.match(markup, /data-action="back"/)
})
