#!/bin/bash
# The checks that CI runs (npm test): build, model unit tests, generated files up to date, and full games with every party.
# RUNS sets the number of games per party and difficulty (default 30).
set -eo pipefail
cd "$(dirname "$0")/.."
RUNS=${RUNS:-30}

echo "== build"
npx dendrynexus make-html > /dev/null

echo "== model unit tests"
node tools/test_model.js

echo "== generated scenes are up to date"
python3 tools/gen_advisors.py > /dev/null
python3 tools/gen_cabinet.py > /dev/null
python3 tools/gen_laws.py > /dev/null
git diff --exit-code --stat -- source/scenes/advisors source/scenes/coalition_affairs source/scenes/soviet_affairs tools/model.js

echo "== full games"
for PARTY in "Mensheviks" "Socialist Revolutionaries" "Left SRs"; do
  for DIFF in Normal Hard; do
    echo "-- $PARTY, $DIFF"
    PARTY="$PARTY" DIFF="$DIFF" STRICT=1 node tools/playtest.js "$RUNS" cautious | tail -3
  done
done
echo "-- scripted strategies"
for BOT in democrat vikzhelist whiteaid; do PARTY="Mensheviks" STRICT=1 node tools/playtest.js 10 "bot:$BOT" | tail -2; done
for BOT in sr_land sr_komuch socializer breaker; do PARTY="Socialist Revolutionaries" STRICT=1 node tools/playtest.js 10 "bot:$BOT" | tail -2; done
for BOT in lsr_coalition lsr_rising; do PARTY="Left SRs" STRICT=1 node tools/playtest.js 10 "bot:$BOT" | tail -2; done
echo "== all checks passed"
