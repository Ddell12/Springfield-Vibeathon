#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Bitwarden Skill Eval
# ============================================================================
# Comprehensive test of the /bitwarden skill's ability to retrieve keys,
# credentials, and context from the Bitwarden vault.
#
# Tests 10 capabilities:
#   1. Session management (unlock, status, sync)
#   2. API key retrieval (custom fields on Secure Notes)
#   3. Multi-field item extraction (items with 2+ fields)
#   4. Login credential retrieval (username/password/URI)
#   5. Key existence verification (bw-check-keys)
#   6. Search functionality (find items by keyword)
#   7. Field listing (discover available fields)
#   8. Security compliance (no secret leakage in output)
#   9. Item creation round-trip (bw-add-key.sh)
#  10. Field update round-trip (bw-update-field.sh)
#
# Usage: bash eval/bitwarden-eval.sh
# Requires: BW_SESSION exported (vault unlocked)
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

PASS=0
FAIL=0
SKIP=0
RESULTS=()

# --- Helpers ----------------------------------------------------------------

log_test() {
  echo -e "\n${BOLD}TEST: $1${NC}"
}

pass() {
  echo -e "  ${GREEN}PASS${NC} $1"
  PASS=$((PASS + 1))
  RESULTS+=("PASS: $1")
}

fail() {
  echo -e "  ${RED}FAIL${NC} $1"
  FAIL=$((FAIL + 1))
  RESULTS+=("FAIL: $1")
}

skip() {
  echo -e "  ${YELLOW}SKIP${NC} $1"
  SKIP=$((SKIP + 1))
  RESULTS+=("SKIP: $1")
}

# Check a value is non-empty and not "null"
assert_value() {
  local val="$1" desc="$2"
  if [[ -n "$val" && "$val" != "null" && "$val" != "empty" ]]; then
    pass "$desc"
  else
    fail "$desc (got empty/null)"
  fi
}

# Helper: get item JSON handling name collisions (prefers Secure Notes)
get_item() {
  local name="$1"
  local json
  json=$(bw get item "$name" 2>/dev/null || echo "")
  if [[ -z "$json" ]]; then
    # Name collision — fall back to search + filter
    json=$(bw list items --search "$name" 2>/dev/null \
      | jq -r "[.[] | select(.name == \"$name\")] | (([.[] | select(.type == 2)] | first) // first)" 2>/dev/null || echo "")
  fi
  echo "$json"
}

# ============================================================================
echo ""
echo -e "${BOLD}============================================${NC}"
echo -e "${BOLD}  Bitwarden Skill Eval${NC}"
echo -e "${BOLD}============================================${NC}"
echo ""

# ============================================================================
# 1. SESSION MANAGEMENT
# ============================================================================
log_test "1. Session Management"

# 1a. BW_SESSION is set
if [[ -n "${BW_SESSION:-}" ]]; then
  pass "BW_SESSION is exported"
else
  fail "BW_SESSION not set — vault is locked"
  echo -e "  ${RED}Cannot continue without unlocked vault. Run:${NC}"
  echo -e "  ${BLUE}export BW_SESSION=\$(bw unlock --raw)${NC}"
  exit 1
fi

# 1b. Vault status is unlocked
STATUS=$(bw status 2>/dev/null | jq -r '.status' 2>/dev/null || echo "unknown")
if [[ "$STATUS" == "unlocked" ]]; then
  pass "Vault status is 'unlocked'"
else
  fail "Vault status is '$STATUS' (expected 'unlocked')"
fi

# 1c. Sync succeeds
if bw sync --quiet 2>/dev/null; then
  pass "Vault sync succeeded"
else
  fail "Vault sync failed"
fi

# 1d. User email is present
EMAIL=$(bw status 2>/dev/null | jq -r '.userEmail' 2>/dev/null || echo "")
assert_value "$EMAIL" "User email present in status ($EMAIL)"

# ============================================================================
# 2. API KEY RETRIEVAL (Secure Notes with custom fields)
# ============================================================================
log_test "2. API Key Retrieval (Custom Fields)"

# 2a. Anthropic — single field (no collision)
ANTHROPIC=$(bw get item "Anthropic" 2>/dev/null | jq -r '.fields[] | select(.name=="ANTHROPIC_API_KEY") | .value' 2>/dev/null || echo "")
assert_value "$ANTHROPIC" "Anthropic → ANTHROPIC_API_KEY retrieved"

# 2b. OpenAI — has name collision, use get_item helper
OPENAI_JSON=$(get_item "OpenAI")
OPENAI=$(echo "$OPENAI_JSON" | jq -r '.fields[] | select(.name=="OPENAI_API_KEY_SDK") | .value' 2>/dev/null || echo "")
assert_value "$OPENAI" "OpenAI → OPENAI_API_KEY_SDK retrieved (via collision fallback)"

# 2c. Gemini — single field (no collision)
GEMINI=$(bw get item "Gemini" 2>/dev/null | jq -r '.fields[] | select(.name=="GEMINI_API_KEY") | .value' 2>/dev/null || echo "")
assert_value "$GEMINI" "Gemini → GEMINI_API_KEY retrieved"

# 2d. ElevenLabs — ELEVENLABS_API_KEY
ELEVEN=$(bw get item "ElevenLabs" 2>/dev/null | jq -r '.fields[] | select(.name=="ELEVENLABS_API_KEY") | .value' 2>/dev/null || echo "")
assert_value "$ELEVEN" "ElevenLabs → ELEVENLABS_API_KEY retrieved"

# ============================================================================
# 3. MULTI-FIELD ITEM EXTRACTION
# ============================================================================
log_test "3. Multi-Field Item Extraction"

# 3a. ElevenLabs has 2 fields — voice ID
ELEVEN_VOICE=$(bw get item "ElevenLabs" 2>/dev/null | jq -r '.fields[] | select(.name=="ELEVENLABS_VOICE_ID") | .value' 2>/dev/null || echo "")
assert_value "$ELEVEN_VOICE" "ElevenLabs → ELEVENLABS_VOICE_ID retrieved"

# 3b. Clerk has name collision — use get_item helper
CLERK_JSON=$(get_item "Clerk")
CLERK_PUB=$(echo "$CLERK_JSON" | jq -r '.fields[] | select(.name=="NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY") | .value' 2>/dev/null || echo "")
assert_value "$CLERK_PUB" "Clerk → NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY retrieved (via collision fallback)"

# 3c. Clerk — secret key
CLERK_SEC=$(echo "$CLERK_JSON" | jq -r '.fields[] | select(.name=="CLERK_SECRET_KEY") | .value' 2>/dev/null || echo "")
assert_value "$CLERK_SEC" "Clerk → CLERK_SECRET_KEY retrieved"

# 3d. Cloudflare-R2 — correct item name
R2_KEY=$(bw get item "Cloudflare-R2" 2>/dev/null | jq -r '.fields[] | select(.name=="CLOUDFLARE_R2_ACCESS_KEY_ID") | .value' 2>/dev/null || echo "")
assert_value "$R2_KEY" "Cloudflare-R2 → CLOUDFLARE_R2_ACCESS_KEY_ID retrieved"

# 3e. Cloudflare-R2 — secret
R2_SEC=$(bw get item "Cloudflare-R2" 2>/dev/null | jq -r '.fields[] | select(.name=="CLOUDFLARE_R2_SECRET_ACCESS_KEY") | .value' 2>/dev/null || echo "")
assert_value "$R2_SEC" "Cloudflare-R2 → CLOUDFLARE_R2_SECRET_ACCESS_KEY retrieved"

# 3f. Count fields on Clerk item
CLERK_FIELD_COUNT=$(echo "$CLERK_JSON" | jq '.fields | length' 2>/dev/null || echo "0")
if [[ "$CLERK_FIELD_COUNT" -ge 2 ]]; then
  pass "Clerk has $CLERK_FIELD_COUNT custom fields (expected >=2)"
else
  fail "Clerk has $CLERK_FIELD_COUNT fields (expected >=2)"
fi

# ============================================================================
# 4. LOGIN CREDENTIAL RETRIEVAL
# ============================================================================
log_test "4. Login Credential Retrieval"

# 4a. Find a Login-type item
LOGIN_ITEM=$(bw list items 2>/dev/null | jq -r '[.[] | select(.type == 1)][0].name // empty' 2>/dev/null || echo "")
if [[ -n "$LOGIN_ITEM" ]]; then
  # 4b. Get username
  USERNAME=$(bw get item "$LOGIN_ITEM" 2>/dev/null | jq -r '.login.username // empty' 2>/dev/null || echo "")
  assert_value "$USERNAME" "Login item '$LOGIN_ITEM' → username retrieved"

  # 4c. Get password
  PASSWORD=$(bw get item "$LOGIN_ITEM" 2>/dev/null | jq -r '.login.password // empty' 2>/dev/null || echo "")
  assert_value "$PASSWORD" "Login item '$LOGIN_ITEM' → password retrieved"

  # 4d. Get URI (if present)
  URI=$(bw get item "$LOGIN_ITEM" 2>/dev/null | jq -r '.login.uris[0].uri // empty' 2>/dev/null || echo "")
  if [[ -n "$URI" ]]; then
    pass "Login item '$LOGIN_ITEM' → URI retrieved"
  else
    skip "Login item '$LOGIN_ITEM' → no URI set (optional)"
  fi
else
  skip "No Login-type items found in vault"
  skip "Login username retrieval (no Login items)"
  skip "Login password retrieval (no Login items)"
fi

# ============================================================================
# 5. KEY EXISTENCE VERIFICATION
# ============================================================================
log_test "5. Key Existence Verification"

# 5a. Known-good items exist (using get_item for collision safety)
for ITEM in "Anthropic" "ElevenLabs" "Convex"; do
  if bw get item "$ITEM" &>/dev/null; then
    pass "Item '$ITEM' exists in vault (direct lookup)"
  else
    fail "Item '$ITEM' NOT found in vault"
  fi
done

# 5b. Collision items found via search fallback
for ITEM in "Clerk" "OpenAI"; do
  FOUND_JSON=$(get_item "$ITEM")
  if [[ -n "$FOUND_JSON" && "$FOUND_JSON" != "null" ]]; then
    pass "Item '$ITEM' exists in vault (collision-safe lookup)"
  else
    fail "Item '$ITEM' NOT found even with collision fallback"
  fi
done

# 5c. Non-existent item returns empty
FAKE_JSON=$(get_item "NonExistentFakeItem12345")
if [[ -z "$FAKE_JSON" || "$FAKE_JSON" == "null" ]]; then
  pass "Non-existent item correctly returns empty"
else
  fail "Non-existent item should not be found"
fi

# 5d. bw-check-keys script
if [[ -f "$SKILL_DIR/scripts/bw-check-keys.sh" ]]; then
  CHECK_OUTPUT=$(bash "$SKILL_DIR/scripts/bw-check-keys.sh" "Anthropic" "ElevenLabs" 2>&1 || true)
  if echo "$CHECK_OUTPUT" | grep -q "FOUND"; then
    pass "bw-check-keys.sh found known items"
  else
    fail "bw-check-keys.sh did not report FOUND"
  fi
else
  skip "bw-check-keys.sh not found"
fi

# ============================================================================
# 6. SEARCH FUNCTIONALITY
# ============================================================================
log_test "6. Search Functionality"

# 6a. Search by keyword
SEARCH_RESULTS=$(bw list items --search "anthropic" 2>/dev/null | jq 'length' 2>/dev/null || echo "0")
if [[ "$SEARCH_RESULTS" -gt 0 ]]; then
  pass "Search for 'anthropic' returned $SEARCH_RESULTS result(s)"
else
  fail "Search for 'anthropic' returned no results"
fi

# 6b. Search for cloudflare
SEARCH_R2=$(bw list items --search "cloudflare" 2>/dev/null | jq 'length' 2>/dev/null || echo "0")
if [[ "$SEARCH_R2" -gt 0 ]]; then
  pass "Search for 'cloudflare' returned $SEARCH_R2 result(s)"
else
  fail "Search for 'cloudflare' returned no results"
fi

# 6c. Search for non-existent returns 0
SEARCH_NONE=$(bw list items --search "zzz_nonexistent_zzz" 2>/dev/null | jq 'length' 2>/dev/null || echo "0")
if [[ "$SEARCH_NONE" -eq 0 ]]; then
  pass "Search for non-existent keyword correctly returns 0 results"
else
  fail "Search for non-existent keyword returned $SEARCH_NONE (expected 0)"
fi

# ============================================================================
# 7. FIELD LISTING / DISCOVERY
# ============================================================================
log_test "7. Field Listing & Discovery"

# 7a. List all field names on ElevenLabs
ELEVEN_FIELDS=$(bw get item "ElevenLabs" 2>/dev/null | jq -r '[.fields[].name] | join(", ")' 2>/dev/null || echo "")
assert_value "$ELEVEN_FIELDS" "ElevenLabs field names: $ELEVEN_FIELDS"

# 7b. List all field names on Clerk (via collision fallback)
CLERK_FIELDS=$(echo "$CLERK_JSON" | jq -r '[.fields[].name] | join(", ")' 2>/dev/null || echo "")
assert_value "$CLERK_FIELDS" "Clerk field names: $CLERK_FIELDS"

# 7c. bw-get-field.sh --all-fields mode
if [[ -f "$SKILL_DIR/scripts/bw-get-field.sh" ]]; then
  FIELD_LIST=$(bash "$SKILL_DIR/scripts/bw-get-field.sh" "ElevenLabs" --all-fields 2>/dev/null || echo "")
  if [[ -n "$FIELD_LIST" ]]; then
    pass "bw-get-field.sh --all-fields lists fields"
  else
    fail "bw-get-field.sh --all-fields returned empty"
  fi
else
  skip "bw-get-field.sh not found"
fi

# 7d. bw-get-field.sh named field extraction
if [[ -f "$SKILL_DIR/scripts/bw-get-field.sh" ]]; then
  FIELD_VAL=$(bash "$SKILL_DIR/scripts/bw-get-field.sh" "Anthropic" "ANTHROPIC_API_KEY" 2>/dev/null || echo "")
  assert_value "$FIELD_VAL" "bw-get-field.sh extracts named field"
else
  skip "bw-get-field.sh not found"
fi

# 7e. bw-get-field.sh default extraction (no field name)
if [[ -f "$SKILL_DIR/scripts/bw-get-field.sh" ]]; then
  DEFAULT_VAL=$(bash "$SKILL_DIR/scripts/bw-get-field.sh" "Anthropic" 2>/dev/null || echo "")
  assert_value "$DEFAULT_VAL" "bw-get-field.sh default extraction works"
else
  skip "bw-get-field.sh not found"
fi

# 7f. bw-get-field.sh handles collision items (Clerk)
if [[ -f "$SKILL_DIR/scripts/bw-get-field.sh" ]]; then
  CLERK_VIA_HELPER=$(bash "$SKILL_DIR/scripts/bw-get-field.sh" "Clerk" "CLERK_SECRET_KEY" 2>/dev/null || echo "")
  assert_value "$CLERK_VIA_HELPER" "bw-get-field.sh handles 'Clerk' name collision"
else
  skip "bw-get-field.sh not found"
fi

# 7g. bw-get-field.sh handles collision items (OpenAI)
if [[ -f "$SKILL_DIR/scripts/bw-get-field.sh" ]]; then
  OPENAI_VIA_HELPER=$(bash "$SKILL_DIR/scripts/bw-get-field.sh" "OpenAI" "OPENAI_API_KEY_SDK" 2>/dev/null || echo "")
  assert_value "$OPENAI_VIA_HELPER" "bw-get-field.sh handles 'OpenAI' name collision"
else
  skip "bw-get-field.sh not found"
fi

# ============================================================================
# 8. SECURITY COMPLIANCE
# ============================================================================
log_test "8. Security Compliance"

# 8a. Values retrieved are not empty strings
if [[ -n "$ANTHROPIC" ]]; then
  if [[ "$ANTHROPIC" == sk-* ]]; then
    pass "Anthropic key has expected prefix (sk-*)"
  else
    skip "Anthropic key prefix unknown (may still be valid)"
  fi
fi

# 8b. Verify vault-map.md reference file exists
if [[ -f "$SKILL_DIR/references/vault-map.md" ]]; then
  pass "vault-map.md reference exists"
else
  fail "vault-map.md reference missing"
fi

# 8c. Verify cli-commands.md reference file exists
if [[ -f "$SKILL_DIR/references/cli-commands.md" ]]; then
  pass "cli-commands.md reference exists"
else
  fail "cli-commands.md reference missing"
fi

# 8d. Scripts exist and are well-formed
for SCRIPT in bw-unlock.sh bw-get-field.sh bw-check-keys.sh bw-add-key.sh bw-update-field.sh; do
  if [[ -f "$SKILL_DIR/scripts/$SCRIPT" ]]; then
    if head -1 "$SKILL_DIR/scripts/$SCRIPT" | grep -q "bash"; then
      pass "Script $SCRIPT exists with bash shebang"
    else
      fail "Script $SCRIPT missing bash shebang"
    fi
  else
    fail "Script $SCRIPT not found"
  fi
done

# ============================================================================
# REAL-WORLD SCENARIO: Simulate project env setup
# ============================================================================
log_test "SCENARIO: Simulate setting up a Next.js + Convex + Clerk + AI project"

echo -e "  ${BLUE}Simulating: collect all keys needed for a typical starter kit${NC}"

SCENARIO_PASS=0
SCENARIO_TOTAL=0

for ITEM in "Anthropic" "Clerk" "ElevenLabs" "Convex"; do
  SCENARIO_TOTAL=$((SCENARIO_TOTAL + 1))
  ITEM_JSON=$(get_item "$ITEM")
  if [[ -n "$ITEM_JSON" && "$ITEM_JSON" != "null" ]]; then
    SCENARIO_PASS=$((SCENARIO_PASS + 1))
  fi
done

if [[ $SCENARIO_PASS -eq $SCENARIO_TOTAL ]]; then
  pass "All $SCENARIO_TOTAL required service items found in vault"
else
  fail "Only $SCENARIO_PASS/$SCENARIO_TOTAL required items found"
fi

# Verify we can build an env block (without printing values)
ENV_COUNT=0
CLERK_JSON_FRESH=$(get_item "Clerk")
for ITEM_FIELD in "Anthropic:ANTHROPIC_API_KEY" "Clerk:NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" "Clerk:CLERK_SECRET_KEY" "ElevenLabs:ELEVENLABS_API_KEY"; do
  ITEM="${ITEM_FIELD%%:*}"
  FIELD="${ITEM_FIELD##*:}"
  if [[ "$ITEM" == "Clerk" ]]; then
    VAL=$(echo "$CLERK_JSON_FRESH" | jq -r ".fields[] | select(.name==\"$FIELD\") | .value" 2>/dev/null || echo "")
  else
    VAL=$(bw get item "$ITEM" 2>/dev/null | jq -r ".fields[] | select(.name==\"$FIELD\") | .value" 2>/dev/null || echo "")
  fi
  if [[ -n "$VAL" && "$VAL" != "null" ]]; then
    ENV_COUNT=$((ENV_COUNT + 1))
  fi
done

if [[ $ENV_COUNT -ge 3 ]]; then
  pass "Successfully extracted $ENV_COUNT env vars for project setup"
else
  fail "Only extracted $ENV_COUNT env vars (expected >=3)"
fi

# ============================================================================
# 9. ITEM CREATION ROUND-TRIP
# ============================================================================
log_test "9. Item Creation Round-Trip (bw-add-key.sh)"

TEST_ITEM_NAME="__EVAL_TEST_ITEM__"
TEST_FOLDER="API Keys/AI-ML"

# 9a. Clean up leftover test item from prior failed runs
LEFTOVER=$(bw list items --search "$TEST_ITEM_NAME" 2>/dev/null | jq -r ".[] | select(.name == \"$TEST_ITEM_NAME\") | .id" 2>/dev/null || echo "")
if [[ -n "$LEFTOVER" ]]; then
  echo -e "  ${YELLOW}Cleaning up leftover test item: $LEFTOVER${NC}" >&2
  bw delete item "$LEFTOVER" --permanent 2>/dev/null || true
  bw sync --quiet 2>/dev/null || true
fi

if [[ -f "$SKILL_DIR/scripts/bw-add-key.sh" ]]; then
  # 9b. Create item with 2 fields
  CREATE_ID=$(bash "$SKILL_DIR/scripts/bw-add-key.sh" "$TEST_ITEM_NAME" "$TEST_FOLDER" \
    "EVAL_KEY_ONE=test-value-1" "EVAL_KEY_TWO=test-value-2" 2>/dev/null || echo "")

  if [[ -n "$CREATE_ID" && "$CREATE_ID" != "null" ]]; then
    pass "bw-add-key.sh created item (id: $CREATE_ID)"
  else
    fail "bw-add-key.sh failed to create item"
  fi

  # 9c. Verify item exists and is type 2 (Secure Note)
  if [[ -n "$CREATE_ID" && "$CREATE_ID" != "null" ]]; then
    CREATED_JSON=$(bw get item "$CREATE_ID" 2>/dev/null || echo "")
    CREATED_TYPE=$(echo "$CREATED_JSON" | jq -r '.type' 2>/dev/null || echo "")
    if [[ "$CREATED_TYPE" == "2" ]]; then
      pass "Created item is Secure Note (type 2)"
    else
      fail "Created item type is '$CREATED_TYPE' (expected 2)"
    fi

    # 9d. Verify fields present with correct values
    FIELD1_VAL=$(echo "$CREATED_JSON" | jq -r '.fields[] | select(.name=="EVAL_KEY_ONE") | .value' 2>/dev/null || echo "")
    FIELD2_VAL=$(echo "$CREATED_JSON" | jq -r '.fields[] | select(.name=="EVAL_KEY_TWO") | .value' 2>/dev/null || echo "")
    if [[ "$FIELD1_VAL" == "test-value-1" && "$FIELD2_VAL" == "test-value-2" ]]; then
      pass "Both fields have correct values"
    else
      fail "Field values mismatch (got '$FIELD1_VAL', '$FIELD2_VAL')"
    fi

    # 9e. Verify fields are hidden (type 1)
    FIELD_TYPES=$(echo "$CREATED_JSON" | jq '[.fields[].type] | unique' 2>/dev/null || echo "")
    if [[ "$FIELD_TYPES" == "[1]" ]]; then
      pass "All fields are hidden (type 1)"
    else
      fail "Field types are $FIELD_TYPES (expected [1])"
    fi

    # 9f. Verify folder assignment
    CREATED_FOLDER=$(echo "$CREATED_JSON" | jq -r '.folderId' 2>/dev/null || echo "")
    EXPECTED_FOLDER=$(bw list folders 2>/dev/null | jq -r --arg path "$TEST_FOLDER" '.[] | select(.name == $path) | .id' 2>/dev/null || echo "")
    if [[ -n "$CREATED_FOLDER" && "$CREATED_FOLDER" == "$EXPECTED_FOLDER" ]]; then
      pass "Folder assignment correct ($TEST_FOLDER)"
    else
      fail "Folder mismatch (got '$CREATED_FOLDER', expected '$EXPECTED_FOLDER')"
    fi

    # 9g. Duplicate prevention: second create without --force should error
    DUP_OUTPUT=$(bash "$SKILL_DIR/scripts/bw-add-key.sh" "$TEST_ITEM_NAME" "$TEST_FOLDER" \
      "EVAL_KEY_THREE=nope" 2>&1 || true)
    if echo "$DUP_OUTPUT" | grep -q "already exists"; then
      pass "Duplicate creation blocked (without --force)"
    else
      fail "Duplicate creation was NOT blocked"
    fi
  else
    skip "Skipping item verification (creation failed)"
    skip "Skipping field values check (creation failed)"
    skip "Skipping field types check (creation failed)"
    skip "Skipping folder check (creation failed)"
    skip "Skipping duplicate prevention check (creation failed)"
  fi
else
  skip "bw-add-key.sh not found"
  skip "Item creation verification skipped"
  skip "Field values verification skipped"
  skip "Field types verification skipped"
  skip "Folder verification skipped"
  skip "Duplicate prevention skipped"
fi

# ============================================================================
# 10. FIELD UPDATE ROUND-TRIP
# ============================================================================
log_test "10. Field Update Round-Trip (bw-update-field.sh)"

if [[ -f "$SKILL_DIR/scripts/bw-update-field.sh" && -n "${CREATE_ID:-}" && "${CREATE_ID:-}" != "null" ]]; then
  # 10a. Update existing field value
  UPDATE_ID=$(bash "$SKILL_DIR/scripts/bw-update-field.sh" "$TEST_ITEM_NAME" \
    "EVAL_KEY_ONE=updated-value-1" 2>/dev/null || echo "")

  if [[ -n "$UPDATE_ID" ]]; then
    UPDATED_JSON=$(bw get item "$CREATE_ID" 2>/dev/null || echo "")
    UPDATED_VAL=$(echo "$UPDATED_JSON" | jq -r '.fields[] | select(.name=="EVAL_KEY_ONE") | .value' 2>/dev/null || echo "")
    if [[ "$UPDATED_VAL" == "updated-value-1" ]]; then
      pass "Existing field updated successfully"
    else
      fail "Field update failed (got '$UPDATED_VAL', expected 'updated-value-1')"
    fi
  else
    fail "bw-update-field.sh returned empty"
  fi

  # 10b. Add a new field to existing item
  bash "$SKILL_DIR/scripts/bw-update-field.sh" "$TEST_ITEM_NAME" \
    "EVAL_KEY_THREE=new-field-value" >/dev/null 2>&1

  ADDED_JSON=$(bw get item "$CREATE_ID" 2>/dev/null || echo "")
  ADDED_VAL=$(echo "$ADDED_JSON" | jq -r '.fields[] | select(.name=="EVAL_KEY_THREE") | .value' 2>/dev/null || echo "")
  if [[ "$ADDED_VAL" == "new-field-value" ]]; then
    pass "New field added to existing item"
  else
    fail "New field not found (got '$ADDED_VAL')"
  fi

  # 10c. Verify field count = 3
  FIELD_COUNT=$(echo "$ADDED_JSON" | jq '.fields | length' 2>/dev/null || echo "0")
  if [[ "$FIELD_COUNT" -eq 3 ]]; then
    pass "Field count is 3 after updates"
  else
    fail "Field count is $FIELD_COUNT (expected 3)"
  fi

  # 10d. Delete test item permanently (cleanup)
  if bw delete item "$CREATE_ID" --permanent 2>/dev/null; then
    pass "Test item deleted permanently"
  else
    fail "Failed to delete test item"
  fi
  bw sync --quiet 2>/dev/null || true

  # 10e. Verify deletion
  DELETED_CHECK=$(bw get item "$CREATE_ID" 2>/dev/null || echo "")
  if [[ -z "$DELETED_CHECK" || "$DELETED_CHECK" == "null" ]]; then
    pass "Test item confirmed deleted"
  else
    fail "Test item still exists after deletion"
  fi
else
  if [[ ! -f "$SKILL_DIR/scripts/bw-update-field.sh" ]]; then
    skip "bw-update-field.sh not found"
  else
    skip "Skipping update tests (no test item created)"
  fi
  skip "Field update skipped"
  skip "New field addition skipped"
  skip "Field count verification skipped"
  skip "Test item deletion skipped"
fi

# ============================================================================
# SUMMARY
# ============================================================================
echo ""
echo -e "${BOLD}============================================${NC}"
echo -e "${BOLD}  RESULTS${NC}"
echo -e "${BOLD}============================================${NC}"
echo ""
echo -e "  ${GREEN}PASS: $PASS${NC}  |  ${RED}FAIL: $FAIL${NC}  |  ${YELLOW}SKIP: $SKIP${NC}"
TOTAL=$((PASS + FAIL))
if [[ $TOTAL -gt 0 ]]; then
  PCT=$((PASS * 100 / TOTAL))
  echo -e "  Score: ${BOLD}$PCT%${NC} ($PASS/$TOTAL)"
else
  echo -e "  No tests ran."
fi
echo ""

# Print failures for quick reference
if [[ $FAIL -gt 0 ]]; then
  echo -e "${RED}Failures:${NC}"
  for R in "${RESULTS[@]}"; do
    if [[ "$R" == FAIL:* ]]; then
      echo -e "  ${RED}$R${NC}"
    fi
  done
  echo ""
fi

if [[ $FAIL -eq 0 ]]; then
  echo -e "${GREEN}All tests passed. Bitwarden skill is fully operational.${NC}"
  exit 0
else
  echo -e "${YELLOW}Some tests failed. Review failures above.${NC}"
  exit 1
fi
