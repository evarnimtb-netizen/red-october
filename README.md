# Red October: Fall of Empire

A fork of [*Social Democracy: An Alternate History*](https://github.com/aucchen/social_democracy_alternate_history) by Autumn Chen (MIT licence), set in the Russian Revolution, 1917-1921. You lead one of three socialist parties (the Mensheviks, the SRs or the Left SRs) from the February Revolution to December 1921: share power or refuse it, keep the party together, and try to save something of what was won in February from a military dictatorship of the Right, a Bolshevik one-party state, or exile. "Red October" is a working title.

**Play it in your browser: https://evarnimtb-netizen.github.io/red-october/** (rebuilt automatically from `main`).

The design is in [`docs/design-plan.md`](docs/design-plan.md).

## Status

All three campaigns are **playable from start to finish**: the Mensheviks (hard), the SRs (normal) and the Left SRs (hard).

- A phone layout (900px and under): a bar at the top with the date, resources and members, and two drawers, Status on the left and Support and parliament on the right; cards become rows with their subtitles visible, and everything has touch-sized targets. Tablets and narrow windows get the same bar.
- 69 turns: two-week turns until the calendar reform of February 1918, then monthly turns to December 1921.
- An alliance web between the three playable parties and the Bolsheviks, with three levels (cooperation, bloc, coalition), each with its own effects, and fault lines (Brest-Litovsk, Komuch, the July 1918 rising, Kolchak's coup) at which alliances break.
- Cards in three decks (Party Affairs, Coalition Affairs, Soviet Affairs), with party-only cards for each campaign, and 29 advisors, of whom four sit on your council at a time (reshuffle or swap them from the Council card). A Cabinet card sets the country's standing policies while your party is in government.
- A right-hand panel with your support divided by nine classes, your popularity in each arena, the parliament of each arena (as elected, and as it would be if it voted today, drawn with d3-parliament) and the Opposition tab.
- An opposition that answers your policies: the Kadets and the propertied classes, the generals and the Right, and the Bolsheviks each have a hostility that rises with what they object to (socialising the land, the eight-hour day, peace diplomacy, emergency measures, the Kadets in or out of the cabinet). At 40 they try to sanction you; at 70 they take up arms (a landowners' revolt, a generals' march, a Bolshevik strike). You can give way, hold firm or appeal over their heads, and a revolt that is not put down can end the game. Every unpopular law, from the Cabinet or from the decks, can be carried out three ways: phased in with compensation (milder, costs a resource), by decree (as written), or, for a strong party or one with strong allies, by decree with the opposition broken by force (the odds are shown). Sanctions can be answered in kind.
- About 70 events from the February Revolution to the arrests of 1921, most shared between the parties with options and wording that change by party, plus events of each campaign's own. A real fork at the October Revolution: a Bolshevik takeover, an all-socialist government via the Vikzhel talks, or a Constituent Assembly that governs.
- 11 endings (Kornilov's Russia, the generals' republic, White Russia, exile, the one-party state, the SR and Left SR historical endings, the all-socialist government, the Constituent Republic, Soviet democracy, the Soviet coalition) and 14 achievements.

Not yet done from the design plan: public-domain period images and music (the old German assets were removed; card art is generated), and a balance pass by a human player. The numbers in the design plan marked as uncertain have not been checked against the books.

## Building the game

1. `npm install`
2. `npx dendrynexus make-html` in this folder, then open `out/html/index.html` (or serve the folder with any static web server).

`out/html/index.html`, `game.js`, `ui.js` (the sidebar bars, the "What changed" box and the party-select screen) and `game.css` are hand-maintained and are not rewritten by the build. `out/html/model.js` is a copy of `tools/model.js`; run `tools/sync_model.sh` after editing the model.

## Tools

- `tools/model.js`: the numbers behind the game: the support model for each voter group and arena, the monthly drift of the stats, factions and dissent, the Civil War front, and helpers for cards and events. It is plain JavaScript, loaded by the game and by the tests.
- `tools/playtest.js`: a headless playtester. `node tools/playtest.js 100 cautious` plays 100 complete games with a random policy; `bot:democrat`, `bot:vikzhelist`, `bot:opposition`, `bot:whiteaid` (Mensheviks), `bot:sr_land`, `bot:sr_komuch`, `bot:sr_peasant` (SRs) and `bot:lsr_coalition`, `bot:lsr_rising` (Left SRs) and `bot:socializer` and `bot:breaker` (SRs: socialise the land through the Cabinet, the second breaking the opposition by force) play scripted strategies (see `tools/bots.js`). `PARTY="Left SRs"` picks the party (`Mensheviks`, `Socialist Revolutionaries`, `Left SRs`), `DIFF=Hard` picks the difficulty, `TEXT=file` dumps all text shown, `POW=1` and `WF=1` print balance data. Run `make-html` first.
- `tools/evedit.py` has helpers for editing events by party; `tools/gen_advisors.py` regenerates the advisor scenes; `tools/gen_cards.py` regenerates the card art (SVG) and wires it into the scenes; `tools/gen_art.py` regenerates the title banner and the party emblems.

## Included Libraries

[jquery v1.11.1](https://releases.jquery.com/)

[d3.js v7](https://d3js.org) (ISC licence) and [d3-parliament](https://github.com/geoffreybr/d3-parliament) by Geoffrey Brossard (MIT licence), which draw the parliament charts, as in the original game.

## Credits

The engine, the interface and the structure of the cards, advisors and elections are the work of Autumn Chen: see `LICENSE`, and `credits_images.txt` and `credits_music.txt` for the assets of the original game, which are not included in this fork. Dendry, the game engine, is by Ian Millington and Autumn Chen.

To update dendrynexus in `package-lock.json`, run `npm install --upgrade https://github.com/aucchen/dendrynexus`
