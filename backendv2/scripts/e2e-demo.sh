#!/usr/bin/env bash
# End-to-end demo/smoke script for backendv2.
# Founder signup -> extraction -> investor signup -> browse/recommended ->
# meeting request -> notification -> accept -> (manual time-warp) -> feedback.
#
# Requires: backendv2 running on $BASE (default http://localhost:4000/api),
# and a reachable Postgres per backendv2/.env. Uses curl + node for JSON parsing
# (no jq dependency, matching the extract-agent's test-curl.sh style).
set -euo pipefail

BASE="${BASE:-http://localhost:4000/api}"
STAMP=$(date +%s)
FOUNDER_EMAIL="e2e-founder-${STAMP}@example.com"
INVESTOR_EMAIL="e2e-investor-${STAMP}@example.com"

jget() { node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const v=JSON.parse(d);console.log($1)})"; }

echo "== 1. Health check =="
curl -sf "$BASE/health" | jget "d.status"

echo "== 2. Founder onboarding submit =="
FOUNDER_RES=$(curl -sf -X POST "$BASE/onboarding/submit" -H 'Content-Type: application/json' -d @- <<JSON
{
  "email": "$FOUNDER_EMAIL", "password": "demo-password-123", "fullName": "E2E Founder", "role": "founder",
  "profile": {
    "displayName": "E2E Robotics", "headline": "Warehouse picking robots",
    "country": "Vietnam", "sectors": ["ai"], "regions": ["vietnam"],
    "stage": "seed", "teamSize": 8, "fundingAskUsd": 800000, "businessModel": "b2b",
    "productDescription": "Autonomous picking robots for 3PL warehouses.",
    "traction": "3 paid pilots, \$8k MRR.", "lookingFor": ["funding"]
  }
}
JSON
)
FOUNDER_TOKEN=$(echo "$FOUNDER_RES" | jget "d.token")
FOUNDER_ID=$(echo "$FOUNDER_RES" | jget "d.user.id")
echo "founder id: $FOUNDER_ID"

echo "== 3. Poll founder extraction status =="
for i in $(seq 1 15); do
  STATUS=$(curl -sf "$BASE/onboarding/status" -H "Authorization: Bearer $FOUNDER_TOKEN" | jget "d.status")
  echo "  attempt $i: $STATUS"
  [ "$STATUS" = "done" ] && break
  sleep 2
done
[ "$STATUS" = "done" ] || { echo "extraction did not complete in time"; exit 1; }

echo "== 4. Investor onboarding submit =="
INVESTOR_RES=$(curl -sf -X POST "$BASE/onboarding/submit" -H 'Content-Type: application/json' -d @- <<JSON
{
  "email": "$INVESTOR_EMAIL", "password": "demo-password-123", "fullName": "E2E Investor", "role": "investor",
  "profile": {
    "displayName": "E2E Ventures", "headline": "Seed fund for deep tech",
    "country": "Vietnam", "sectors": ["ai"], "regions": ["vietnam"],
    "investorType": "vc", "stages": ["seed"], "checkSizeMinUsd": 300000, "checkSizeMaxUsd": 1500000,
    "thesis": "AI-first automation for Southeast Asian supply chains."
  }
}
JSON
)
INVESTOR_TOKEN=$(echo "$INVESTOR_RES" | jget "d.token")
INVESTOR_ID=$(echo "$INVESTOR_RES" | jget "d.user.id")
echo "investor id: $INVESTOR_ID"

for i in $(seq 1 15); do
  STATUS=$(curl -sf "$BASE/onboarding/status" -H "Authorization: Bearer $INVESTOR_TOKEN" | jget "d.status")
  [ "$STATUS" = "done" ] && break
  sleep 2
done
[ "$STATUS" = "done" ] || { echo "investor extraction did not complete in time"; exit 1; }

echo "== 5. Investor sees founder in /discover/recommended =="
REC=$(curl -sf "$BASE/discover/recommended?limit=10" -H "Authorization: Bearer $INVESTOR_TOKEN")
echo "$REC" | jget "d.matches.map(m => m.displayName + ' (' + m.score + ')').join(', ')"
FOUNDER_PROFILE_ID=$(echo "$REC" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  const j=JSON.parse(d); const m=j.matches.find(x=>x.displayName==='E2E Robotics');
  console.log(m ? m.profileId : '');
})")
[ -n "$FOUNDER_PROFILE_ID" ] || { echo "founder not found in recommendations"; exit 1; }

echo "== 6. Investor requests a meeting =="
SLOT_START=$(node -e "console.log(new Date(Date.now()+3600000).toISOString())")
SLOT_END=$(node -e "console.log(new Date(Date.now()+3600000+2700000).toISOString())")
MEETING_RES=$(curl -sf -X POST "$BASE/meetings" -H "Authorization: Bearer $INVESTOR_TOKEN" -H 'Content-Type: application/json' -d @- <<JSON
{ "recipientUserId": "$FOUNDER_ID", "message": "Would love to chat", "slots": [{"startsAt": "$SLOT_START", "endsAt": "$SLOT_END"}] }
JSON
)
MEETING_ID=$(echo "$MEETING_RES" | jget "d.id")
SLOT_ID=$(echo "$MEETING_RES" | jget "d.slots[0].id")
echo "meeting: $MEETING_ID"

echo "== 7. Founder sees the notification =="
curl -sf "$BASE/notifications?unread=true" -H "Authorization: Bearer $FOUNDER_TOKEN" | jget "d.items.map(n=>n.title).join(' | ')"

echo "== 8. Founder accepts =="
curl -sf -X POST "$BASE/meetings/$MEETING_ID/accept" -H "Authorization: Bearer $FOUNDER_TOKEN" -H 'Content-Type: application/json' \
  -d "{\"slotId\": \"$SLOT_ID\"}" | jget "d.status"

echo "== Done. To exercise the completion sweep + feedback, time-warp the meeting: =="
echo "  UPDATE meetings SET scheduled_at = now() - interval '2 hours' WHERE id = '$MEETING_ID';"
echo "then wait up to 60s for the cron sweep, then POST /meetings/$MEETING_ID/feedback as both parties."
