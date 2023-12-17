#!/bin/bash
set -e

for f in test/*.sh; do
  if ! bash "$f"; then
    echo "$f failed!" >&2
    failed=true
  fi
done

if [[ $failed == true ]]; then
  exit 1
fi