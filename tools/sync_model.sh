#!/bin/sh
# Copy the model into the served game folder (run before make-html or after editing tools/model.js).
cp "$(dirname "$0")/model.js" "$(dirname "$0")/../out/html/model.js"
