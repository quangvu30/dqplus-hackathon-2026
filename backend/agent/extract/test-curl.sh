#!/usr/bin/env bash
# Smoke-tests the extract agent's HTTP API against a running instance.
# Usage: ./test-curl.sh [base_url] [userId]
set -euo pipefail

BASE_URL="${1:-http://localhost:3001}"
USER_ID="${2:-00000000-0000-0000-0000-000000000001}"

hr() { printf '\n--- %s ---\n' "$1"; }

hr "health"
curl -sS "$BASE_URL/health" | tee /dev/stderr
echo

hr "POST /extract/text (founder)"
curl -sS -X POST "$BASE_URL/extract/text" \
  -H 'Content-Type: application/json' \
  -d "{
    \"userId\": \"$USER_ID\",
    \"role\": \"founder\",
    \"text\": \"We are Acme AI, a Series A B2B SaaS startup based in Singapore building an AI-powered fraud detection platform for banks in Southeast Asia. We have 18 employees, \$1.2M ARR, and are raising \$3M to expand into Vietnam and Indonesia.\"
  }" | tee /dev/stderr
echo

hr "POST /extract/text (investor)"
curl -sS -X POST "$BASE_URL/extract/text" \
  -H 'Content-Type: application/json' \
  -d "{
    \"userId\": \"$USER_ID-inv\",
    \"role\": \"investor\",
    \"text\": \"Golden Gate Ventures is a VC firm investing in seed to Series A fintech and SaaS startups across Southeast Asia. Typical check size is \$250k to \$2M. We look for strong founding teams with early traction.\"
  }" | tee /dev/stderr
echo

hr "POST /extract/crawl"
curl -sS -X POST "$BASE_URL/extract/crawl" \
  -H 'Content-Type: application/json' \
  -d "{
    \"userId\": \"$USER_ID-crawl\",
    \"role\": \"founder\",
    \"url\": \"https://example.com/acme-ai\",
    \"content\": \"Acme AI helps banks detect fraud in real time using machine learning. Based in Singapore, founded 2022.\",
    \"metadata\": { \"country\": \"Singapore\" }
  }" | tee /dev/stderr
echo

hr "POST /extract/profile (expects 404 unless userId has a linked gateway profile)"
curl -sS -w '\nHTTP %{http_code}\n' -X POST "$BASE_URL/extract/profile" \
  -H 'Content-Type: application/json' \
  -d "{ \"userId\": \"$USER_ID\" }"

hr "GET /extracted/:userId"
curl -sS "$BASE_URL/extracted/$USER_ID" | tee /dev/stderr
echo

hr "done"
