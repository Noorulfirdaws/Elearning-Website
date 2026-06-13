#!/bin/sh
FILE="scripts/generate-fonctions.mjs"
if [ -f "$FILE" ]; then
  sed -i 's/sk-ant-api03-[A-Za-z0-9_-]*[A-Za-z0-9]/REDACTED/g' "$FILE"
fi
