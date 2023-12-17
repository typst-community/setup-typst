#!/bin/bash
set -e
script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd -P)

typst compile "$script_dir/example.typ" "$script_dir/example.pdf"