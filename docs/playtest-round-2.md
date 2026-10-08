# Playtest report, round 2

Six testers ran the game: five played, one only read the event scenes. Every reported issue was then checked against the source. This report keeps only what the checks support.

File paths are relative to the project root (`social_democracy_alternate_history/`). "dix" is the half-month index used in the scene gates. The tester severities were almost all "high", so the severities below were reassigned by effect on the player:

- **High**: wrong mechanics or false facts at a key moment, or a whole party affected.
- **Medium**: a contradiction or missing explanation that a player will notice.
- **Low**: cosmetic or minor.

Each entry says what happens, the cause, and a suggested fix. Nothing in the repository was edited.

## 1. Testers and endings

- **sr-easy-komuch** (SRs, Easy, armed road): ended White Russia in July 1919, turn 40 of 69, when the White front reached the 72 limit.
- **men-hard-opposition** (Mensheviks, Hard, opposition): ended exile in January 1922, banned, 361k members. Bolshevik relations were 34.6 at the Eighth Congress, so free soviets were not granted.
- **reader-events** (read-only, 78 event scenes): no ending. Checked every gate and subtitle against the calendar and `tools/model.js`.
- **sr-normal-peasants** (SRs, Normal, peasant road): ended Constituent Republic at turn 69. The final page is headed January 1922.
- **lsr-hard-rising** (Left SRs, Hard): ended lsr_historical in October 1921, turn 67 of 69, banned, about 9,000 members, after the July 1918 rising.
- **sr-hard-force** (SRs, Hard, forceful): ended sr_historical after turn 69, screen dated January 1922.

## 2. Confirmed findings

### High

**H1. Resources sit at 0 for a year or more, which locks many options** (sr-easy-komuch, lsr-hard-rising)
- What happens: Resources reached 0 by Sep 1918 (SR) and stayed at 0 for about 14 months (Left SR). Campaigns, People's Army, congresses, and the careful ("slow") law routes were greyed out. The free options (decree, force) stay open, so a broke party is pushed toward the harsher choices.
- Cause: nothing adds income automatically. `dues_income` is computed (`source/scenes/post_event.scene.dry:56`) but only paid out when the Party Dues card is played (`source/scenes/party_affairs/fundraising.scene.dry:7-8, 19`). That card is one of about 21 random cards, needs a draw into a hand of 3, and has a 4-month cooldown. There are 48 `choose-if: resources >= 1` gates across about 25 scenes. Starting stock is 2-3 (`tools/model.js:66, 78, 91`).
- Fix: pay a steady income in `post_event.scene.dry` after line 56, for example `Q.dues_acc += Q.dues_income * 0.25 * Q.turn_length`, adding whole units to `Q.resources`. Make Party Dues a bonus. Show a "no resources" warning on the main page. Also, `root.scene.dry:186` sets `dues_income = 1`, which is wrong for SRs until the first turn (300/150 is 2).

**H2. Advisors who are deported, jailed, dead or finished stay pinned and can act** (four testers)
- What happens: Avksentiev and Zenzinov act after Kolchak deports them. Gots acts in Nov 1920 while "in the prisons of the Cheka", and his page still calls him Soviet chairman. Chernov's Land Socialisation stays after his Aug 1917 resignation and after the land law. Natanson stays pinned to Oct 1921 although the ending says he died in 1919.
- Cause: an advisor stays while `<id>_advisor == 1`. Nothing time-limits it (`tools/model.js:133-134, 503, 608-610, 625-636`). Only a few scenes clear a flag (`events/petrograd_soviet.scene.dry:12`, `events/khinchuk_defects.scene.dry:9`, `events/arrests_1921.scene.dry:9-12`). `kolchak.scene.dry` and `wrangel.scene.dry:20` set no flags. `advisors/chernov.scene.dry:16-24` has no land guard. The Axelrod complaint is the weakest part: he advises from abroad, which `advisors/axelrod.scene.dry:7-12` describes, so it is consistent.
- Fix: follow the `arrests_1921` pattern. Clear `avksentiev_advisor` and `zenzinov_advisor` in `kolchak.scene.dry` on-arrival. Clear `chernov_advisor`, `gots_advisor`, `avksentiev_advisor` and `zenzinov_advisor` in `wrangel.scene.dry` (and Martov and Abramovich for Mensheviks). Clear `natanson_advisor` in a 1919 Left SR event. Add `and land_law_draft = 0` to the Chernov action's `choose-if`. Alternatively, add an "until" date per advisor in `tools/gen_advisors.py` and check it in `advisorsAvailable`.

**H3. Kolchak's coup refers to a Ufa Directory that no event forms** (sr-easy-komuch)
- What happens: the SR player first hears of the Directory in the coup event, which says the party's leaders sat in it. No event shows the player joining it.
- Cause: "Directory" and "Ufa" appear only in prose. Komuch is at `events/sr_komuch.scene.dry:5` (dix >= 33), the coup at `events/kolchak.scene.dry:5` (dix >= 44), and nothing sits between them. `kolchak.scene.dry:18` summarises the formation in one sentence. Lines 24, 27, 42 and 55 assume membership. The scene has no `player_party` gate, so Mensheviks and Left SRs get the same text. The tester's `ufa_line = 0` point is a misreading. That flag only means the 1919 `sr_ufa` choice was taken (`sr_ufa.scene.dry:22`).
- Fix: add a short September 1918 Ufa State Conference event for `player_party = 'sr' and armed_struggle = 1 and dix >= 40 and bol_regime = 1`, setting something like `directory_joined = 1`. Check that flag in `kolchak.scene.dry` before lines 24, 27, 42 and 55. The cheaper option is one sentence in the `sr_komuch` join branches saying Komuch will merge into a Directory at Ufa.

**H4. Brest: Left SR options are offered after the vote and without a government seat** (lsr-hard-rising, reader-events)
- What happens: the March 1918 page says the treaty was signed and ratified 784 to 261, then offers a choice of "Vote for ratification" and "Stay and fight the treaty from inside". A Left SR who reconciled or stayed outside the government (`lsr_in_gov = 0`) is still told the commissars resigned or the party stayed in government.
- Cause: `events/brest.scene.dry:18-20` narrates the ratification for all parties, and `on-arrival` (lines 9-14) has already set `at_war = 0`. `@lsr_leave` (line 92) and `@lsr_vote` (line 136) are gated only on `player_party = 'lsr'`, unlike `@lsr_stay` (line 107, which also requires `lsr_in_gov = 1`). `@lsr_leave` applies relations and soviet democracy penalties for leaving a government the player was never in. `events/lsr_july.scene.dry:13` ("members in the government are warned") is ungated too. The tester was wrong that opposing the treaty is not possible: `@lsr_leave`, `@lsr_stay` and `@lsr_front` all work, but only after the ratification text.
- Fix: for Left SRs, wrap the ratification sentence at line 20 in `[? if player_party != 'lsr' : ... ?]`, show only the pre-vote situation, and put the 784-261 result in the option bodies. Add `and lsr_in_gov = 1` to the `view-if` of `@lsr_leave` and `@lsr_vote`, and add an outside-government option. Wrap the `lsr_july` sentence in `[? if lsr_in_gov = 1 : ... ?]`.

**H5. Brest fires after a June 1918 Bolshevik coup and describes a March treaty** (reader-events)
- What happens: if the war goes on and `alt_second_attempt` puts the Bolsheviks in power at dix >= 34, Brest still fires and says the Soviet government signed in March and the Left SRs left on 19 March.
- Cause: `events/brest.scene.dry:6` is gated only on `dix >= 28 and bol_regime = 1 and at_war = 1`. The late coup sets `bol_regime = 1` (`alt_second_attempt.scene.dry:14`) and leaves `at_war` alone.
- Fix: set a flag such as `late_coup = 1` in the coup branch (declare it in `root.scene.dry` near line 82) and add `and late_coup = 0` to the Brest gate. If a separate peace is wanted after a late coup, write a dedicated scene.

**H6. Six subtitles tell SR players that "the SRs" will not agree** (reader-events)
- What happens: for an SR player `rel_ally` is the Mensheviks, but the locked-choice subtitle names the SRs, so the player is told their own party refuses.
- Cause: hard-coded "SRs" in an `unavailable-subtitle` gated on `rel_ally`: `events/may_crisis.scene.dry:27-28`, `democratic_conference.scene.dry:32-33`, `congress_of_soviets.scene.dry:41-42`, `kornilov.scene.dry:42-43`, `july_days.scene.dry:36-37`, `first_coalition.scene.dry:49-50`, plus `february.scene.dry:52` (not on the tester's list). `partner_name` is set in `tools/model.js:114`.
- Fix: replace the party name with `[+ partner_name +]` in all seven. The body of `first_coalition.scene.dry` ("The SRs have entered without us") is also wrong for SR players.

**H7. October 1917 "Stay in the hall" is open to Left SR players and addresses their own party** (reader-events)
- What happens: for a Left SR player the option is available from the start, the text says "the Left SRs listened to our proposal", and the effects change `rel_lsr`, which is the Mensheviks for them.
- Cause: `events/october.scene.dry:54-56, 66`. `@stay` has no `player_party` gate and unlocks on `rel_lsr >= 35 or rel_bol >= 35`. A Left SR starts at 40 and 40 (`tools/model.js:79-81`).
- Fix: add `view-if: player_party != 'lsr'` to `@stay`. Left SRs keep `@lsr_join`.

**H8. The June 1918 expulsion event fires for SR players with the Menshevik story** (reader-events)
- What happens: an SR player reads that the Mensheviks were expelled and the decision "is later extended to the SRs". The press that was closed is "our press".
- Cause: `events/expelled.scene.dry:5` allows `player_party != 'lsr'`, but the text at lines 22, 24 and 69 is Menshevik-only. The mechanics are fine. No readmission event exists for SRs (`relegalised.scene.dry:5` is Menshevik-only).
- Fix: keep the gate and use `[? if player_party = 'sr' : ... ?]` in the text at lines 22-24 and 69 ("the Mensheviks and the Right SRs"). Optionally extend `relegalised` to SRs.

**H9. Two incompatible accounts of the 18 January Assembly session** (lsr-hard-rising)
- What happens: January 1918 says the Assembly ratified the government and sat 13 hours. The March page re-narrates the same session as a Bolshevik and Left SR walkout with a tired guard, ignoring that the Left SRs sat in the government.
- Cause: `events/assembly_dispersed.scene.dry:6` is gated only on `dix >= 25 and bol_regime = 1`. After `vikzhel_check.scene.dry:6-17` or `alt_second_attempt.scene.dry:14-15` flips `bol_regime`, it fires and retells the session (line 15). `assembly_meets.scene.dry:9` has already set `assembly_survives = 1`.
- Fix: set `assembly_met = 1` in `assembly_meets` on-arrival. Gate the existing dispersal text on `bol_regime = 1 and assembly_met = 0`. For runs where the Assembly already met, add a later scene dated at the real collapse, written for a Left SR who was in government.

**H10. Kadet ministers resign from a cabinet with no Kadets** (sr-hard-force, sr-normal-peasants)
- What happens: the Ukraine autonomy outcomes say "Three Kadet ministers have resigned" after the Kadets left in May 1917. The Democratic Conference then offers "Back coalition with the liberals, as before" although the cabinet has no liberals.
- Cause: `coalition_affairs/nationalities.scene.dry:39, 54, 72` are unconditional, and the card is gated only on `nationalities_timer <= 0` (line 6). `events/democratic_conference.scene.dry:15` has no `gov_kadets` check, and `@coalition` (lines 28-36) never sets `gov_kadets = 1`. `sr_chernov_leaves.scene.dry:22, 31` sets `gov_kadets = 0` and says the cabinet has no liberals.
- Fix: wrap the resignation sentence in `[? if gov_kadets = 1 : ... ?]`. In `democratic_conference`, reword `@coalition` as "invite the liberals back" when `gov_kadets = 0`, and set `gov_kadets = 1; homogeneous_gov = 0`.

**H11. Petrograd Soviet card announces a Bolshevik win before the outcome is decided** (reader-events, sr-normal-peasants)
- What happens: the card is titled "The Petrograd Soviet Changes Hands, 519 to 414". If `lost_petrosoviet = 0` the page is headed "The Petrograd Soviet Holds" and says the Bolsheviks lost narrowly.
- Cause: `events/petrograd_soviet.scene.dry:1, 3` are static. The outcome is set later in `on-arrival` (line 10). The tester's suggestion to branch the title does not work because the card is drawn before `on-arrival` runs.
- Fix: use a neutral card label, for example title "The Petrograd Soviet Votes" and subtitle "The Bolsheviks bring a resolution on power." Leave the branch headings at lines 23 and 31. Keep the 519-414 tally only in `ps_lost` (line 25).

**H12. The Constituent Republic ending text describes things that did not happen** (sr-normal-peasants)
- What happens: the ending says the Assembly elected a President and that the Bolsheviks sat "sometimes in the government and sometimes not". In the run there was no president (ministers answerable to the Assembly) and the Bolsheviks never ruled.
- Cause: `source/scenes/game_over.scene.dry:160` (`@eg_constituent_republic`) is static. It ignores `Q.constitution`, which `events/alt_republic.scene.dry` sets to 1, 2 or 3 (a president only for 2), and the Bolshevik clause ignores `vikzhel_deal`.
- Fix: make "elected a President" conditional on `constitution = 2`, with alternatives for 1 and 3. Make the Bolshevik clause conditional on `vikzhel_deal` and on whether they ever held office. "Sometimes in the government" would need a new flag set in `vikzhel.scene.dry` and `vikzhel_check.scene.dry`.

**H13. Cards and options outlive their premise** (four testers)
- What happens: "The war costs forty million a day" after peace. "Defend against the Kaiser" and "war to victory" after the war. "Wait for the Assembly" after it met or was dispersed. "Defend the Revolution" cites Kolchak and Denikin when the front is 0.
- Cause: `coalition_affairs/finance.scene.dry:7, 10` has no `at_war` test. `party_affairs/ideology.scene.dry:10, 28` shows the war text unconditionally. `peasant_meeting.scene.dry:13, 29`, `media.scene.dry:17` and `nationalities.scene.dry:15` have no Assembly-state check. `soviet_affairs/domestic_enemies.scene.dry:7, 10` has no end date. `media.scene.dry` and `peasant_meeting.scene.dry:40, 52` already use `view-if: at_war = 1`, so the convention exists. The tester's "War Communism lasts" item is not a bug (it is a locked-option subtitle in `money.scene.dry:79-82`).
- Fix: add `and at_war = 1` to the finance card, or guard its sentence. Guard the war text in `ideology`. Add `assembly_survives = 0 and bol_regime = 0` to the Assembly options. Add `bol_regime = 1 and dix < 92` to `domestic_enemies` or reword it for the post-war state.

### Medium

**M1. Komuch never has a visible fate** (sr-easy-komuch). `komuch_alive` is changed only silently (`kolchak.scene.dry:39, 48`) and no scene describes Samara falling or merging. After the pull-out the flag is 1 although the Directory was arrested, so the "Komuch Without Kolchak" achievement (`game_over.scene.dry:25, 219`) describes a surviving government that does not exist. Fix: add a short fate beat for SR players with `armed_struggle = 1`, and make the flag name and achievement text agree.

**M2. Expulsion event is shown before Komuch** (sr-easy-komuch). Both fall in dix 34. `expelled.scene.dry:6` has priority 40 and Komuch (`komuch.scene.dry:7`, `sr_komuch.scene.dry:6`) has 30, so the expulsion cites "forces on the Volga" first. Fix: raise Komuch above 40, or lower `expelled` below 30, or gate `expelled` at `dix >= 35`.

**M3. Left SRs still appear as an internal faction after leaving** (sr-easy-komuch, sr-normal-peasants). The "let them go" branch cuts the faction but keeps it (`events/sr_left_split.scene.dry:34-37`). `party_affairs/party_disunity.scene.dry:12, 26`, `ideology.scene.dry:10, 14, 28, 39`, `shuffle_leadership.scene.dry:14, 39` and `status.scene.dry:72` still use it. Fix: set `intl_strength = 0` on the split, add `view-if: intl_strength > 0` to those options, and guard `ideology.scene.dry:10` with `lsr_split = 0`.

**M4. Event text numbers disagree with the stats** (three testers). The SR split text says a fifth of members left, but the code subtracts a flat 20 (`sr_left_split.scene.dry:13, 41`, about 6.5%). `lsr_split_nov.scene.dry:13` has the same wording and changes no members. `lsr_1921.scene.dry:31` says "a few hundred members in prison" while the stat halves (79k to 41k). The Left SR Assembly result (26.6%, 187 seats) includes a hidden 1.3 list bonus that the poll stat leaves out (`constituent_assembly_election.scene.dry:58, 75`; `tools/model.js` ~246). `inside_sr.scene.dry:10` compares delegates with the electorate share. Fix: use `Math.round(Q.members * 0.2)` or soften the prose, reword the 1921 line to "tens of thousands", add the list bonus to `updatePolls` or note it in text, and say "a fifth of delegates but N% of the electorate".

**M5. Soviet democracy sits at 84-100 and stops measuring play** (men-hard-opposition, sr-normal-peasants). It starts at 80 (`root.scene.dry:68`) and has no downward drift without a Bolshevik regime (`tools/model.js:328-338`), while many actions add to it. The gates at 55-60 (`game_over.scene.dry:9`, `congress_1920.scene.dry:29`, `sr_congress_1920.scene.dry:29`, `vikzhel_check.scene.dry:10`) are nearly always met. Fix: add a pull toward about 60 in the non-Bolshevik branch of `drift()`, raise those gates to 70-75, then re-run `tools/balance_report.js`.

**M6. "Persuade" in the Menshevik Komuch event can make `white_aid` negative** (reader-events). `events/komuch.scene.dry:71` clamps at -2, so the front target drops by 8 (up to 16) and the text does not say so. `kolchak.scene.dry:34` clamps at 0. Fix: clamp at 0, or state the effect in the option text.

**M7. Assembly proclaimed a federal republic, then the constitution event says the form is undecided** (sr-normal-peasants). `assembly_meets.scene.dry:19` says "democratic federal republic". `alt_republic.scene.dry:11, 13` calls the structure undecided and offers a federal republic. The "parliamentary republic" text (line 45) belongs to the Assembly-governed option. Fix: drop "federal" from line 19 or reword `alt_republic` to say the principle was declared and the content is open.

**M8. Advisor "Cancel action" does not undo the action** (men-hard-opposition, lsr-hard-rising). Advisor scenes apply their effect in `on-arrival`, then offer "Cancel action". Cancel restores only the action count and cooldown (`cancel_advisor_action.scene.dry:3-23`), so stat changes stay and can be repeated. Cancel was meant for cards that lead to another card (`changes.txt:420`), but `tools/gen_advisors.py:344, 373` copies it into effect-on-arrival scenes (Martov, Dan, Kamkov, Kolegaev, Volsky). The Kamkov "jump to the next month" was not traced. Fix: remove the Cancel line in those templates and regenerate, or snapshot and restore stats.

**M9. Advisor blurbs are in the future tense and spoil events** (three testers). Examples: `abramovich.scene.dry:11`, `dan.scene.dry:11`, `avksentiev.scene.dry:11`, `kamkov.scene.dry:11`, plus Liber and Gvozdev (all generated from `tools/gen_advisors.py`). Volsky's Komuch action (`volsky.scene.dry` ~20) is offered under only `bol_regime = 1`, so it can appear in 1920. `party_affairs/response_to_antisemitism.scene.dry:10` says "in 1919" with no date gate. `events/labour_delegation.scene.dry:13` says the opposition "will be removed". Fix: rewrite the blurbs in present or past tense in `gen_advisors.py`, date-gate the Volsky action and the pogrom card, and soften the labour delegation line.

**M10. The Vikzhel score is not explained** (men-hard-opposition, sr-hard-force). `events/vikzhel.scene.dry:9` is a hidden weighted sum, and the threshold is 68 (line 37). The hint at line 21 omits `stayed_in_congress` (+10), `insight` (+3) and bloc lean (4 per point), names "Vikzhel leaders" who are not in the formula, and does not say soviet democracy counts only 0.08 per point. "Sign" gives no warning (line 24). Fix: rewrite line 21 to say what the score measures and name the real inputs. Optionally add a breakdown and "needs 68; you are at N" on Sign.

**M11. Opposition tab goes empty under a Bolshevik regime, but the Cabinet card still points to it** (three testers). `campActive` returns false (`tools/model.js:782-783`), so `out/html/ui.js:297` prints only "No camp is organised against you now." and the strength bar disappears. `advisors/cabinet.scene.dry:13` still says "see the Opposition tab". Fix: show a note in `renderOpposition` that open opposition has been crushed, and wrap the Cabinet sentence in `[? if bol_regime = 0 : ... ?]`.

**M12. Cheka "Denounce it" credits the Menshevik press for SR players** (sr-easy-komuch, sr-hard-force). `events/cheka.scene.dry:47` is fixed text, and "It was banned" is ambiguous. Fix: party-aware wording and "The paper was banned for a week".

**M13. "Say that we are for neither side" opens a policy prompt** (lsr-hard-rising). The option leads to a generated three-way prompt ("Cautiously ... Carry it out in full"). `tools/gen_laws.py` wraps any option whose effects lower `rel_bol` by 2 or more (`tools/lawvariants.py:14-25`). The slow variant needs a resource (`domestic_enemies.scene.dry:30-87`). Fix: make `@neither` a single scene with direct effects and exclude it in `gen_laws.py`, otherwise a rerun recreates the wrapper.

**M14. Constituent Assembly "united" and "joint" do nothing for Left SRs but cost relations** (reader-events). `events/constituent_assembly_election.scene.dry:57-60` handles only `ca_extra` 3 and 1 for Left SRs. `@united` sets 2 (no effect) yet gives `rel_ally` +5, `rel_lsr` +3 and dissent (lines 42-44). `@joint` multiplies by 1.0. The line 39 subtitle names the Left SRs, but `rel_lsr` is the Mensheviks for them (`tools/model.js:79, 117-118`). Fix: hide these options from Left SRs, or give `ca_extra == 2` a real effect. Use `[+ third_name +]` in the subtitle.

**M15. October 1917 Relations card ignores the Petrograd Soviet vote** (lsr-hard-rising). `party_affairs/inter_party_relationships.scene.dry:17, 67` always says the Menshevik-SR bloc is the Soviet majority. `lost_petrosoviet` is read nowhere else. Fix: branch line 17 on `lost_petrosoviet`, keeping the All-Russian executive wording.

**M16. November 1917 text promises seven seats "before the month is out"** (lsr-hard-rising). `events/lsr_split_nov.scene.dry:11` promises it. The offer (`lsr_government.scene.dry:5`) needs `bol_regime = 1` and `lsr_split = 1`. In a headless run Vikzhel intervened in 23 of 60 vikzhelist runs and delayed the offer to March. Reconcilers never get it. `sr_left_split.scene.dry:11` repeats the promise. Fix: delete or hedge the sentence ("Lenin is expected to offer them seats").

**M17. Kornilov text contradicts the July choice to shield the Bolsheviks** (sr-hard-force). `july_days.scene.dry:57, 64` sets `bol_freed = 1` and says the arrests were declined. `kornilov.scene.dry:37, 109` says they were "released from prison", and line 18 says "hunted". `bol_freed` is read nowhere. Fix: branch these lines on `bol_freed`.

**M18. "A Current Walks Out" never names the current or its side effects** (sr-hard-force, reader-events). `events/party_crisis.scene.dry:10-21` picks `crisis_faction` and applies Bolshevik, Kadet and right-threat shifts, but the text (lines 25-29) is fixed and `crisis_faction` is read nowhere. Fix: name it with `Q['flabel_' + Q.crisis_faction]` and add a sentence per faction group.

**M19. "Protest, and demand new elections" has a result that argues something else** (lsr-hard-rising). `events/assembly_dispersed.scene.dry:24` vs the result at line 73 (about the land law and Left SRs). Fix: rewrite line 73 to match, or relabel the option.

**M20. Grain card says "a few days of flour left" at any bread level** (sr-normal-peasants). The bread word is correct (`source/qdisplays/bread.qdisplay.dry:2-6`), but `coalition_affairs/economic_policy.scene.dry:7, 10` shows fixed flour text with no bread condition. Fix: gate or branch line 10 on bread.

**M21. Kronstadt page says the Red Army invaded Georgia, then says it did not** (reader-events). `events/kronstadt.scene.dry:16` has an unconditional invasion sentence, then `[? if georgia_survives = 1 : In this world it did not ... ?]`. Fix: split into two conditional sentences.

**M22. Kolchak event sends Avksentiev and Zenzinov "to the West" and to Harbin** (reader-events). `kolchak.scene.dry:18` vs `:55`. Fix: change line 18 to "expelled abroad".

**M23. Unity Congress page has a writer's note** (reader-events, men-hard-opposition). `events/unity_congress.scene.dry:12` contains "the dates given vary", and the heading (line 10) differs from the title (line 1). Axelrod's absence is not a contradiction. Fix: delete ", the dates given vary,", and align the heading and title.

**M24. Vikzhel check says the coalition was tested over a "treaty with Germany"** (reader-events). `vikzhel_check.scene.dry:29, 37`, but the non-Bolshevik path produces an armistice or no settlement (`peace_or_war.scene.dry:5`). Fix: say "over peace with Germany", or branch on `at_war`.

### Low

**L1. Event text narrates dates after the turn it fires in** (four testers). The list is below. July Days is not a defect (its dates fall within the turn).
- `congress_of_soviets.scene.dry:6` and `lsr_congress.scene.dry:5` fire at dix 10 but narrate 16 June. Use `dix >= 11`.
- `lsr_split_nov.scene.dry:5, 11` fires at Early November but says "second half of November".
- `sr_chernov_leaves.scene.dry:5, 11` says "first days of August" at dix 15 (Late August).
- `june_offensive.scene.dry:6, 23` says "By mid-July" in an early July turn.
- `kronstadt.scene.dry:6, 18` fires in February but reports 1 March.
- `relegalised.scene.dry:11` says "a month after"; it is about three weeks.
- `february.scene.dry:13` uses past tense for 15 March in Early March.

**L2. Turn header goes from Early November to Late November 1917 after an event that narrates December** (lsr-hard-rising). The calendar is monotonic. The cause is the `lsr_split_nov.scene.dry:5` gate (`dix >= 20`) described above. Fix: gate at `dix >= 22` and change the subtitle to "November-December 1917".

**L3. Final page is dated January 1922** (sr-normal-peasants). The calendar advances before the end test (`post_event.scene.dry:34-39`, `71`). Fix: skip the increment on the last turn, or make `dateText` (`out/html/ui.js:34-37`, `tools/play_cli.js:72`) clamp to December 1921.

**L4. Spacing and punctuation.** `events/brest.scene.dry:20` shows "ratification.The Left SRs" and a double space. `party_affairs/people_army.scene.dry:10` renders "yes ." and "no .". `events/peace_appeal.scene.dry:15` says "On the same week". Double spaces in `media.scene.dry:10` and `fundraising.scene.dry:12` are CLI-only (see section 3). Fix: move spaces outside the `[? ?]` blocks and change to "In the same week".

**L5. "Miliukov"** in `events/opp_kad_sanction.scene.dry:18`; elsewhere "Milyukov".

**L6. Brest text is ambiguous about Martov's party** (`brest.scene.dry:20`): "Martov and Kamkov, the Left SR leader". Fix: "Martov of the Menshevik Internationalists, and Kamkov of the Left SRs".

**L7. Menu label "Expelled from the Soviet Executive" for an event that may be averted** (`expelled.scene.dry:1`). Fix: use a neutral title such as "The Motion to Expel the Mensheviks".

**L8. Soviet Affairs deck shows [empty] from Dec 1917 to Feb 1918 with no reason** (men-hard-opposition). Every card in the deck except social_welfare is gated on a later date (`judiciary.scene.dry:7` dix >= 26 and so on). The deck has no `unavailable-subtitle` (`main.scene.dry:57-65`). Fix: add one saying when cards return.

**L9. The membership cap is not shown and hides decline** (two testers). `tools/model.js:296` clamps members to the cap, and a popular party can stay at 400k while persecuted. Only the CLI prints "(the most the party can hold)" (`tools/play_cli.js:74`). Fix: show a cap note in `status.scene.dry:16` and `ui.js`, and perhaps a net-trend figure.

**L10. "Send our members to the Red Army" dominates the other options on that card** (lsr-hard-rising). `domestic_enemies.scene.dry:17-28` has no price and small hidden costs. The card never retires (line 7). `conditions` is strictly worse and sets a dead flag `prisoner_deal`. Legality +1 comes only on later uses (line 25), not always. Fix: add a visible cost, an end gate, and either use or drop `prisoner_deal`.

**L11. "Peasants organised so far" prints 0.5 or 1.5** (`party_affairs/peasant_congress.scene.dry:10`). The counter moves in half steps. Fix: show `Math.floor(...)` or a worded level.

**L12. Alliance level 2 with Bolsheviks at relations 83 does not say why it is not a coalition** (`tools/model.js:464-475`; `inter_party_relationships.scene.dry:65-67`, `73-74`, `library.scene.dry:80`). Bolshevik coalition needs a Vikzhel deal, a surviving Assembly or Left SR ministers. Fix: add an `allianceBlocker` function and show its reason.

**L13. Labels and titles differ.** `may_crisis.scene.dry:1, 10` and `october.scene.dry:1, 70` use different names. `coalition_affairs/labor_affairs.scene.dry:14` names "Circular 421" with no explanation. Fix: describe it in plain words.

**L14. Congress of Soviets shows a hard-coded "123 of the 320 places"** (`congress_of_soviets.scene.dry:38`). The chart uses 777 seats. Fix: use `seat_*` variables or drop the numbers.

**L15. Dispersal text understates or overstates casualties** (`assembly_dispersed.scene.dry:18`: "A few thousand workers were killed or wounded"). The checker believes the figure is far too high (about 10-21 killed is the usual figure) but worked from memory, so verify it. The missing `ca_elected` guard is not a bug (priority 45 for the election outranks 40).

**L16. Denikin event names the Mensheviks as "us" for every party** (`events/denikin.scene.dry:14`). Fix: `[+ pname_the +]`.

**L17. Dead variable `lsr_left_gov`** (`brest.scene.dry:12`), set and never read. Delete it.

**L18. Garbled sentence** "the only party but one that is" (`events/lsr_1921.scene.dry:21`). Also "every opposition party" then says the Left SRs were untouched. Fix: "the only party besides the Bolsheviks that has not been touched".

## 3. Findings that are only artifacts of the command-line tool

- **Raw "White front N" and no 72 limit** (sr-easy-komuch). `tools/play_cli.js:78` prints the number. The browser shows a worded level (`status.scene.dry:42`, `source/qdisplays/front.qdisplay.dry`). One real remainder: the top band ("near Moscow") starts at 75 but the game ends at 72, so that label is never seen. Fix: change the cutoff to 72 in `front.qdisplay.dry` and `out/html/ui.js:27`.
- **Unexplained jumps in stats and resources** (sr-normal-peasants, sr-hard-force). The browser shows a "What changed" box after each choice (`out/html/ui.js:418-495`). The CLI does not. Most jumps trace to dues and the special appeal (`fundraising.scene.dry:19, 26`), `RO.breakCamp`, and `party_crisis` (-20 dissent for every faction). The Nov 1920 relation 54 to 60 source was not found (see section 5). Fix for testers: add a before/after diff to `play_cli.js`.
- **"[a parliament chart is drawn here in the browser]"** (all five players). `tools/play_cli.js:31-32` replaces the chart and recap divs. The data is saved in `Q.parl_*`. Fix: print rows from the saved record.
- **Old Style / New Style dates without a note** (two testers). The note is in the intro (`root.scene.dry:306`). `play_cli.js:118-125` skips the intro pages.
- **Legality wording.** The CLI prints "harassed" and "persecuted" (`play_cli.js:74`). The game uses "tolerated" and "expelled from the Soviet executive" (`source/qdisplays/legality.qdisplay.dry`).
- **Army discipline always printed.** `play_cli.js:75-79`. The browser hides it outside war (`status.scene.dry:30`). So "12 for three years" is a frozen hidden value.
- **Fixed "ally" and "Your support" labels.** `play_cli.js:73-74, 77`. The browser names the partner party and the arena.
- **Double spaces and trailing spaces.** `play_cli.js:28-40` does not collapse whitespace. HTML does.
- **Cap hint.** The "(the most the party can hold)" text exists only in the CLI.

## 4. Findings that are not bugs

- **White ending on a heavily armed SR road** (sr-easy-komuch). Designed outcome. The player stacks aid (Komuch +2, People's Army +1.5 each, Volsky +1). Komuch alone never reaches 72. Off-ramps exist (reject or militia, `sr_pullout` at `kolchak.scene.dry:34`, Red Army mobilisation, Denikin option). The front is shown from dix 34. Optional: add a warning near 72.
- **"Pull the party's people out" subtitle.** The gate (`bund_strength >= 4 or rel_kad < 30`) and the text "no warning" agree (`kolchak.scene.dry:29-32`).
- **Left SR ending "July 1918" header vs October 1921 stats.** The header is the fixed title; the early stop is the exile rule (`post_event.scene.dry:69-70`), not the 69-turn limit. Optional: say why the run ended early.
- **Bolshevik relation decay and the Eighth Congress gate.** Decay is intended (`tools/model.js:341-345`). "Talks with the moderate Bolsheviks" gives +8 every 3 months (`inter_party_relationships.scene.dry:46-50`). Optional: a hint about decay and the threshold.
- **"Demand free soviet elections" hides its gate and has one attempt.** Intended; hidden numbers are the convention (README line 41).
- **Kronstadt and Tenth Congress costs not labelled.** The browser shows a "What changed" box after the choice; no event option previews its effects.
- **"Rech was closed..." repeated.** Not a log. Each law resets the text and prints one fixed sentence per angered camp (`tools/model.js:892-902, 930-931, 979, 981`).
- **One-way stat drift.** Deliberate scripted pressure (`tools/model.js:307-340`). Levers exist but are cooldown-limited. White front is not one-way.
- **Resource glut late in the game.** Sinks exist (about 25 scenes); the player skipped them. Dues scale by design.
- **October walkout sentence in both branches.** It describes the whole bloc; the choice is whether the player joins.
- **Repeated cards and events.** Repeatable cooldown cards by design; events are capped (`alt_coup_n < 3`, `right_plot_n < 2`, `crisis_count < 2`). "Ask European socialists" is two different scenes.
- **Cabinet summary line is stale.** It shows only the Cabinet's own settings (`pol_land`, `pol_finance`), set only from the Cabinet card.
- **"Game note" lines.** Deliberate out-of-world hints (`new_calendar.scene.dry:16`).
- **Force odds shown for camps never attacked, no failure text.** The subtitle says camps under 45% are left alone; failure text exists (`tools/model.js:886-887`); seven wins in a row at those odds is chance.
- **Requisition has no cost.** It costs peasant support (-6 or -7), plus drift and faction dissent. The CLI does not print the boost.
- **Stats stuck at floor.** Land pressure is retired by the land decree on purpose; army discipline stops falling after the war.
- **1917 events firing after the takeover.** The engine drains events in the turn they become eligible. 60 headless games showed each fired at its threshold.
- **July 1918 rising card and its aftermath.** A real three-way choice; "Call it off" was locked by the tester's 37% dissent (gate is under 35%). Aftermath arithmetic matches. Setting legality to 1 is the intended historical blow.
- **Repression wording on the Cheka card.** The label is a power level, not an arrest count.
- **SR route back to government.** Intended: no seat after October; the route is the soviet-democracy ending.
- **"The Peasant Programme" menu entry.** A forced event; its hint is on the failure page (omits the `dix < 72` condition, minor).
- **Advisor cooldown is global.** The subtitle says "before the next advisor action". Minor: it prints "5.5" where the main card rounds up.
- **Martov's motion described twice.** Consistent; one passage omits the outcome.
- **White ending "jailers".** The Bolsheviks are fellow prisoners. Optional: "alongside".
- **Tsereteli pinned while out of coalition.** The blurb names coalition; the action greys out with a reason.
- **Hard-set Bolshevik strength and repression.** Regime baselines, hidden in the UI. Soviet democracy is not hard-set.
- **Left SR government text for other parties.** Narration of a non-player track; `lsr_in_gov` must not be set for them.
- **`opp_kad_sanction` uses `Math.random()`.** `RO.chance` is not seeded either (`tools/model.js:772`).
- **SR "let them go" cuts the Left SR faction without a number.** The text says "smaller and more united"; the figures are on the status page.

## 5. Could not be decided

No finding was left undecided. These points were not fully settled:

- **Relation 54 to 60 in Nov 1920 (men-hard-opposition).** No single scene firing then was found. It is probably a +6 `rel_ally` effect from a card or event.
- **Kamkov "jumps to the next month" after Cancel** (lsr-hard-rising). Not traced. Probably `month_actions` returning to 0 and the normal turn advance.
- **Casualty figure in `assembly_dispersed.scene.dry:18`.** Judged too high from memory, not from a source.
- **`lsr_split_nov` timing in game.** The cause is clear from the source, but no clean in-game reproduction was achieved (the attempted jump to dix 19 landed on another event).
- **Bolsheviks 44 to 60 and Right 33 to 12 after "Break the Officers' Union".** Traced to later events and drift, not to one step; the exact sequence was not reproduced.
- **Coverage gaps.** Only Hard was played for Mensheviks, and no Menshevik coalition run, no Left SR Easy or Normal run and no difficulty comparison were done.


---

**Status (8 October 2026):** all 57 confirmed findings have been fixed. The Ufa Directory now has its own event (`source/scenes/events/sr_directory.scene.dry`), and Kolchak's coup follows from what the party chose there. See the commit "Fix all 57 confirmed findings of playtest round 2".
