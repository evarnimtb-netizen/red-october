# Red October: An Alternate History

A fork of [*Social Democracy: An Alternate History*](https://github.com/aucchen/social_democracy_alternate_history) by Autumn Chen (MIT licence), set in the Russian Revolution, 1917-1921. The player leads the Mensheviks, the SRs or the Left SRs. The design is in [`docs/design-plan.md`](docs/design-plan.md).

**Status:** early development. The game content is still the original German (Weimar) game; the conversion follows the build roadmap in the design plan. "Red October" is a working title.

The engine, systems and any content not yet replaced are the work of Autumn Chen. See `LICENSE`.

## Included Libraries

[jquery v1.11.1](https://releases.jquery.com/)

[d3.js v7](https://d3js.org)

[d3-parliament](https://github.com/geoffreybr/d3-parliament)

## Building the game

1. Install [dendrynexus](https://github.com/aucchen/dendrynexus)

2. Run `dendrynexus make-html` in this folder.

To update dendrynexus in `package-lock.json`, run `npm install --upgrade https://github.com/aucchen/dendrynexus`
