#!/bin/bash
FILE_PATH=$(jq -r '.tool_input.file_path' 2>/dev/null)

if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

case "$FILE_PATH" in
  *.py)
    ruff check --fix "$FILE_PATH" 2>/dev/null
    ruff format "$FILE_PATH" 2>/dev/null
    ;;
  *.js|*.jsx|*.ts|*.tsx|*.css|*.scss|*.json)
    prettierd "$FILE_PATH" 2>/dev/null
    ;;
esac
