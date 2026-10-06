# Red October: An Alternate History

A fork of [*Social Democracy: An Alternate History*](https://github.com/aucchen/social_democracy_alternate_history) by Autumn Chen (MIT licence), set in the Russian Revolution, 1917-1921. You lead the Mensheviks from the February Revolution to December 1921: share power or refuse it, keep the party together, and try to save something of what was won in February from a military dictatorship of the Right, a Bolshevik one-party state, or exile. "Red October" is a working title.

The design is in [`docs/design-plan.md`](docs/design-plan.md).

## Status

The **Menshevik campaign is playable from start to finish**:

- 69 turns: two-week turns until the calendar reform of February 1918, then monthly turns to December 1921.
- 27 cards in three decks (13 Party Affairs, 8 Coalition Affairs, 6 Soviet Affairs) and 16 advisors.
- About 50 events from the February Revolution to the arrests of 1921, with a real fork at the October Revolution (a Bolshevik takeover, an all-socialist government via the Vikzhel talks, or a Constituent Assembly that governs).
- 8 endings (Kornilov's Russia, the generals' republic, White Russia, exile, the one-party state, the all-socialist government, the Constituent Republic, Soviet democracy) and 10 achievements.

Not yet done from the design plan: the SR and Left SR campaigns and the alliance system between the playable parties (the alliance levels exist for the Menshevik campaign), public-domain period images and music (the old German assets were removed; card art is generated), and a balance pass by a human player. The numbers in the design plan marked as uncertain have not been checked against the books.

## Building the game

1. `npm install`
2. `npx dendrynexus make-html` in this folder, then open `out/html/index.html` (or serve the folder with any static web server).

`out/html/index.html` and `out/html/game.js` are hand-maintained and are not rewritten by the build. `out/html/model.js` is a copy of `tools/model.js`; run `tools/sync_model.sh` after editing the model.

## Tools

- `tools/model.js`: the numbers behind the game: the support model for each voter group and arena, the monthly drift of the stats, factions and dissent, the Civil War front, and helpers for cards and events. It is plain JavaScript, loaded by the game and by the tests.
- `tools/playtest.js`: a headless playtester. `node tools/playtest.js 100 cautious` plays 100 complete games with a random policy; `bot:democrat`, `bot:vikzhelist`, `bot:opposition` and `bot:whiteaid` play scripted strategies (see `tools/bots.js`). `DIFF=Hard` picks the difficulty, `TEXT=file` dumps all text shown, `POW=1` and `WF=1` print balance data. Run `make-html` first.
- `tools/gen_advisors.py` regenerates the advisor scenes; `tools/gen_cards.py` regenerates the card art (SVG) and wires it into the scenes.

## Included Libraries

[jquery v1.11.1](https://releases.jquery.com/)

## Credits

The engine, the interface and the structure of the cards, advisors and elections are the work of Autumn Chen: see `LICENSE`, and `credits_images.txt` and `credits_music.txt` for the assets of the original game, which are not included in this fork. Dendry, the game engine, is by Ian Millington and Autumn Chen.

To update dendrynexus in `package-lock.json`, run `npm install --upgrade https://github.com/aucchen/dendrynexus`
