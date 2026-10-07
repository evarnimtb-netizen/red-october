export const meta = {
  name: 'playtest-round',
  description: 'Ten Haiku testers play or read Red October, then findings are merged, checked against the code and written up',
  whenToUse: 'A round of playtesting of Red October: Fall of Empire. Optional args: {round: 3, only: ["sr-hard-force", ...]} (round names the save files and the report; only picks the testers).',
  phases: [
    { title: 'Build', detail: 'build the game once, so every tester plays the same version' },
    { title: 'Play', detail: 'eight testers play full games, two read the scenes', model: 'haiku' },
    { title: 'Merge', detail: 'one agent merges duplicate findings across testers', model: 'sonnet' },
    { title: 'Check', detail: 'each finding is checked against the source: real, artifact of the tool, or wrong', model: 'sonnet' },
    { title: 'Report', detail: 'write docs/playtest-round-N.md', model: 'sonnet' },
  ],
}

// Red October playtest round. Testers play with tools/play_cli.js (one move per command, game saved to a file),
// report structured findings; the findings are merged, checked against the code, and written to docs/.
// Nothing in the game is changed by this workflow: fixing is a separate step, in the main session.

const ROUND = (args && args.round) || 2
const ROOT = '/Users/evarnimtb/Documents/Red October/social_democracy_alternate_history'

const FINDINGS = {
  type: 'object',
  properties: {
    ending: { type: 'string', description: 'the ending reached, or "none" / "not a player" for readers' },
    summary: { type: 'string', description: 'three lines on how the game went' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['bug', 'imbalance', 'clarity'] },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          where: { type: 'string', description: 'date in the game, page or card title, and the choice; or file and line for readers' },
          what: { type: 'string', description: 'what happened, quoting the text where it matters' },
          expected: { type: 'string' },
        },
        required: ['type', 'severity', 'where', 'what', 'expected'],
      },
    },
  },
  required: ['ending', 'summary', 'findings'],
}

const MERGED = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'short slug, unique' },
          type: { type: 'string', enum: ['bug', 'imbalance', 'clarity'] },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          title: { type: 'string' },
          detail: { type: 'string', description: 'what happened, where, and what was expected, combining all reports of it' },
          reported_by: { type: 'array', items: { type: 'string' } },
        },
        required: ['id', 'type', 'severity', 'title', 'detail', 'reported_by'],
      },
    },
  },
  required: ['findings'],
}

const VERDICT = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['confirmed', 'cli-artifact', 'not-a-bug', 'cannot-tell'] },
    cause: { type: 'string', description: 'the cause in the source, with file:line, or why it is not a bug' },
    fix: { type: 'string', description: 'the smallest fix that would solve it, if confirmed' },
  },
  required: ['verdict', 'cause', 'fix'],
}

const HOWTO = `
You are a playtester for "Red October: Fall of Empire", a text strategy game about the Russian Revolution (1917-1921) built with the
Dendry engine. Do NOT edit, create or delete any file in the repository (the only file you write is your save file).

Repository: ${ROOT}. Run every command from there, with the environment variables given below.
Commands (node tools/play_cli.js ...): new <men|sr|lsr> [easy|normal|hard] | show | choose <n> | draw <n> | play <n> | advisor <n> | stats.
On the main page you draw a card from a deck, then play a card from your hand or use a pinned card (advisors, the Cabinet, the Council,
Wait and See); that usually ends the turn. On other pages you choose an option. Every move prints the new page, so you rarely need show.
The game has 69 turns, from March 1917 to the end of 1921. You may read the source to understand what you see: scenes are in
source/scenes/**/*.scene.dry, the numbers in tools/model.js, the design in docs/design-plan.md, the last balance report in docs/balance.md.
Do not rebuild the game (do not run npx dendrynexus): it has been built for you.

Known and already fixed (do not report again): the game running past 1921; the 519/412 vote; "Nineteen of thirty"; the Party Press card
listing four newspapers; the cautious-option sentence "grumbled rather than raged"; "Pass it by decree" on deck cards; the force option
under the Bolsheviks; raw <div> tags (the tool now names the charts); Wait and See's "fortnight".

Look for, and note with the date and page:
1. Bugs: engine errors, being stuck, text showing markup or "undefined"/"NaN", the wrong party or person for your party, events that
   contradict what already happened or come at the wrong time, options that do nothing or the opposite of what they say, odds that do not
   match what happens, numbers that jump without a reason.
2. Imbalances: a stat that only goes one way whatever you do, an option always best or never worth it, events or cards that repeat too
   often, long stretches with nothing worth doing, endings that are unfair or unreachable, Easy/Normal/Hard that do not feel different.
3. Clarity: where you could not tell what a choice would do or what a number means.
Only report what you saw yourself. Play the whole game to an ending if you can.`

const TESTERS = [
  { id: 'men-normal-democrat', party: 'men', diff: 'normal',
    brief: 'The MENSHEVIKS on NORMAL. Play to win a democratic Russia: join the coalition, use the Cabinet (land, food, finance, war, order, labour) and the Council, push the Constituent Assembly, and try for the Vikzhel deal (it now shows where the talks stand). Aim for the Constituent Republic or the all-socialist government.' },
  { id: 'men-hard-opposition', party: 'men', diff: 'hard',
    brief: 'The MENSHEVIKS on HARD, in OPPOSITION: refuse the coalition and stay out of every government, keep relations with the Bolsheviks warm, push soviet democracy. Then play the Bolshevik years: the 1919 programme ("What Is to Be Done?"), the spring elections, Kronstadt and NEP. Aim for the Soviet democracy ending, which should now be reachable.' },
  { id: 'men-easy-late', party: 'men', diff: 'easy',
    brief: 'The MENSHEVIKS on EASY, the historical path into the Bolshevik years, to test the LATE GAME (1918-1921): legality, expulsion and readmission, the Civil War cards, Money and the Market, the ruble and bread under War Communism and after NEP, membership under persecution. Report whether Easy feels easier and whether the late game has real choices.' },
  { id: 'sr-normal-peasants', party: 'sr', diff: 'normal',
    brief: 'The SOCIALIST REVOLUTIONARIES on NORMAL, the peasant road: land committees, the peasant congress, Chernov at Agriculture, the Constituent Assembly. Use the Paying for the Revolution card and the Finance setting to hold up the ruble, and watch whether the opposition (Kadets, generals, Bolsheviks) acts only when it is strong enough.' },
  { id: 'sr-hard-force', party: 'sr', diff: 'hard',
    brief: 'The SOCIALIST REVOLUTIONARIES on HARD, AGGRESSIVE: socialise the land, tax war profits, pass contested laws by decree and by force, provoke the Kadets and the generals, and see whether sanctions, revolts and the generals\' march behave sensibly, whether the odds shown match what happens, and whether hostility fades over time as it should.' },
  { id: 'sr-easy-komuch', party: 'sr', diff: 'easy',
    brief: 'The SOCIALIST REVOLUTIONARIES on EASY, the anti-Bolshevik road: after October, back Komuch and the People\'s Army on the Volga, the Ufa Directory, and see what happens with Kolchak and the Whites. Report whether this road is coherent, whether its events fire in order, and whether any ending other than the Whites is reachable on it.' },
  { id: 'lsr-normal-coalition', party: 'lsr', diff: 'normal',
    brief: 'The LEFT SRs on NORMAL: split from the SRs, join the Bolsheviks in the Council of People\'s Commissars, try to stay in government through Brest-Litovsk and keep the soviets democratic (the Soviet coalition ending). Check every Left SR-only event and card, and that text never speaks as if you were the Mensheviks or the SRs.' },
  { id: 'lsr-hard-rising', party: 'lsr', diff: 'hard',
    brief: 'The LEFT SRs on HARD, the radical road: split early, oppose Brest, and go into the July 1918 rising. Then play the underground years. Report whether the rising and its aftermath make sense, and whether there is anything worth doing after it.' },
]
const PLAYERS = TESTERS.map(t => ({
  ...t,
  prompt: HOWTO + `\n\nYour save file: SAVE=/tmp/ro_round${ROUND}_${t.id}.json NODE_NO_WARNINGS=1 (put both before every command).\n` +
    `Start: SAVE=/tmp/ro_round${ROUND}_${t.id}.json NODE_NO_WARNINGS=1 node tools/play_cli.js new ${t.party} ${t.diff}\n\nYour game: ${t.brief}\n\n` +
    'Return your ending, a three-line summary, and your findings, most important first.',
}))

const READERS = [
  { id: 'reader-events', brief: 'Read every scene in source/scenes/events/ (about 85 files). For each, check the text against its conditions (view-if, choose-if) and the history of 1917-1921: anachronisms (a date or event that has not happened yet at the time the event can fire), text that names the wrong party for the party playing (player_party is menshevik, sr or lsr), contradictions between a title or subtitle and the body, options whose effects (the JavaScript in on-arrival) contradict their text, and events that can fire at the wrong time (for example a 1917 event that can fire after the Bolsheviks take power, bol_regime = 1). Also check every go-to line: its conditions must never be true at the same time (the engine picks at random when they are).' },
  { id: 'reader-cards', brief: 'Read every card in source/scenes/party_affairs/, coalition_affairs/, soviet_affairs/ and advisors/, and tools/model.js. Check: cards whose text or options do not fit the time when they can be drawn (view-if), options that are always better than the others (compare the numbers in their on-arrival), options that cost nothing, text naming the wrong party or person, unavailable-subtitles that do not explain the real condition, and model functions whose numbers can run away (a stat that can only rise or only fall). Use node and tools/play_cli.js stats if you want to check a number.' },
]
const READER_PROMPTS = READERS.map(r => ({
  ...r,
  prompt: HOWTO + `\n\nYou are not playing: you are a READER. ${r.brief}\n\nReturn ending "not a player", a three-line summary of what you read, and your findings with file and line in "where", most important first.`,
}))

// args.only: the ids of the testers to run (all ten if not given)
const ONLY = (args && args.only) || null
const TEAM = [...PLAYERS, ...READER_PROMPTS].filter(t => !ONLY || ONLY.indexOf(t.id) >= 0)

phase('Build')
await agent(`In ${ROOT}, run \`npx dendrynexus make-html\` and then \`node tools/test_model.js\`. Report only "built" and the test result line.`,
  { label: 'build', phase: 'Build', model: 'haiku', effort: 'low' })

phase('Play')
log(`Round ${ROUND}: ${TEAM.length} testers (${TEAM.map(t => t.id).join(', ')})`)
const reports = await parallel(TEAM.map(t => () =>
  agent(t.prompt, { label: t.id, phase: 'Play', model: 'haiku', schema: FINDINGS })
    .then(r => r && { tester: t.id, ...r })))
const got = reports.filter(Boolean)
log(`${got.length} reports, ${got.reduce((n, r) => n + r.findings.length, 0)} findings`)

phase('Merge')
const merged = await agent(
  `Here are the reports of ${got.length} testers of a text strategy game. Merge findings that describe the same problem (keep every tester who reported it),` +
  ' keep distinct problems separate, drop findings that a tester marked as already known, and rank by severity. Do not judge whether they are real yet.\n\n' +
  JSON.stringify(got.map(r => ({ tester: r.tester, ending: r.ending, findings: r.findings }))),
  { label: 'merge', phase: 'Merge', model: 'sonnet', schema: MERGED })

phase('Check')
const checked = await parallel((merged ? merged.findings : []).map(f => () =>
  agent(`A tester of Red October: Fall of Empire (repository ${ROOT}) reported this. Check it against the source and decide whether it is real.\n\n` +
    `${f.type}, ${f.severity}: ${f.title}\n${f.detail}\n\n` +
    'The testers played with tools/play_cli.js, a command-line driver: some oddities come from the tool and not from the game, which runs in the browser' +
    ' (out/html/ui.js, game.js). Find the cause in the scenes (source/scenes) or the model (tools/model.js), with file:line. Do NOT edit any file.' +
    ' Verdict: confirmed (a real problem in the game), cli-artifact (only in the tool), not-a-bug (intended, or the tester misread), cannot-tell.',
    { label: `check:${f.id}`, phase: 'Check', model: 'sonnet', schema: VERDICT })
    .then(v => ({ ...f, ...(v || { verdict: 'cannot-tell', cause: 'the checker failed', fix: '' }) }))))

phase('Report')
const report = await agent(
  `Write a playtest report in Markdown for the game's author, and save it as ${ROOT}/docs/playtest-round-${ROUND}.md (the only file you may write).` +
  ' Sections: the testers and their endings (one line each); confirmed findings by severity, each with what happens, the cause (file:line) and the' +
  ' suggested fix; findings that are only artifacts of the command-line tool; findings that are not bugs, briefly; and the ones that could not be' +
  ' decided. Plain language, no hype. Then return the report text.\n\n' +
  JSON.stringify({ testers: got.map(r => ({ tester: r.tester, ending: r.ending, summary: r.summary })), findings: checked.filter(Boolean) }),
  { label: 'report', phase: 'Report', model: 'sonnet' })

const confirmed = checked.filter(Boolean).filter(f => f.verdict === 'confirmed')
log(`${confirmed.length} confirmed of ${checked.filter(Boolean).length} merged findings; report in docs/playtest-round-${ROUND}.md`)
return { round: ROUND, confirmed, all: checked.filter(Boolean), report }
