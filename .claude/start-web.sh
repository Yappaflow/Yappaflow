#!/bin/bash
export PATH="/usr/local/bin:$PATH"
cd "$(dirname "$0")/../web" && npx next dev --port "${PORT:-3000}"
