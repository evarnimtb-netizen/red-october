#!/bin/sh
# Copy the model, and the vendored d3 build (from node_modules, after npm install), into the served game folder.
D="$(dirname "$0")/.."
cp "$D/tools/model.js" "$D/out/html/model.js"
if [ -f "$D/node_modules/d3/dist/d3.min.js" ]; then cp "$D/node_modules/d3/dist/d3.min.js" "$D/out/html/d3.v7.min.js"; fi
