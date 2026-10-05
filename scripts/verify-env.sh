#!/usr/bin/env bash
set -uo pipefail

repository=""
expected_revision=""
subscription_id=""
resource_group=""
fixture=""
json_output=""
require_cloud=true
environments=("workshop-validation" "workshop")
variables=("TEAM_ID" "AZURE_CLIENT_ID" "AZURE_TENANT_ID" "AZURE_SUBSCRIPTION_ID" "AZURE_RESOURCE_GROUP")

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repository) repository="$2"; shift 2 ;;
    --expected-revision) expected_revision="$2"; shift 2 ;;
    --azure-subscription-id) subscription_id="$2"; shift 2 ;;
    --azure-resource-group) resource_group="$2"; shift 2 ;;
    --fixture) fixture="$2"; shift 2 ;;
    --json-output) json_output="$2"; shift 2 ;;
    --allow-pending-cloud-validation) require_cloud=false; shift ;;
    --help)
      echo "Usage: verify-env.sh --repository OWNER/REPO --expected-revision SHA --azure-subscription-id ID --azure-resource-group NAME [--json-output FILE] [--allow-pending-cloud-validation]"
      exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$fixture" && ( -z "$expected_revision" || -z "$subscription_id" || -z "$resource_group" ) ]]; then
  echo "Live preflight requires --expected-revision, --azure-subscription-id, and --azure-resource-group." >&2
  exit 2
fi

results='[]'
fail_count=0
add_result() {
  local status="$1" id="$2" observed="$3" expected="$4" remediation="$5"
  results="$(jq -c --arg s "$status" --arg i "$id" --arg o "$observed" --arg e "$expected" --arg r "$remediation" \
    '. + [{status:$s,id:$i,observed:$o,expected:$e,remediation:$r}]' <<<"$results")"
  [[ "$status" == "FAIL" ]] && fail_count=$((fail_count + 1))
  printf '[%s] %s: %s\n' "$status" "$id" "$observed"
  [[ "$status" == "PASS" ]] || printf '       Expected: %s\n       Action: %s\n' "$expected" "$remediation"
}

if ! command -v jq >/dev/null 2>&1; then
  echo "[FAIL] tool.jq: not found"
  echo "       Expected: installed and callable"
  echo "       Action: Install jq; it is required for structured preflight output."
  exit 1
fi

if [[ -n "$fixture" ]]; then
  state="$(cat "$fixture")"
else
  state='{"tools":{}}'
  for tool in git node npm gh az copilot; do
    value=""
    if command -v "$tool" >/dev/null 2>&1; then
      if [[ "$tool" == "az" ]]; then value="$(az version --output json 2>/dev/null || echo installed)"
      else value="$("$tool" --version 2>/dev/null | head -n 1 || echo installed)"; fi
    fi
    state="$(jq -c --arg t "$tool" --arg v "$value" '.tools[$t] = (if $v == "" then null else $v end)' <<<"$state")"
  done
  gh_authenticated=false; gh auth status >/dev/null 2>&1 && gh_authenticated=true
  az_authenticated=false; az account show --output none >/dev/null 2>&1 && az_authenticated=true
  if [[ -z "$repository" ]]; then
    origin="$(git remote get-url origin 2>/dev/null || true)"
    repository="$(sed -E 's#.*github\.com[:/]([^/]+/[^/.]+)(\.git)?$#\1#' <<<"$origin")"
  fi
  revision_ok=false
  git merge-base --is-ancestor "$expected_revision" HEAD >/dev/null 2>&1 && revision_ok=true
  state="$(jq -c --arg repo "$repository" --argjson gh "$gh_authenticated" --argjson az "$az_authenticated" --argjson rev "$revision_ok" \
    '.repository=$repo | .ghAuthenticated=$gh | .azAuthenticated=$az | .revisionContainsExpected=$rev' <<<"$state")"
  if [[ "$gh_authenticated" == true && -n "$repository" ]]; then
    repo_json="$(gh api "repos/$repository" 2>/dev/null || echo '{}')"
    actions_json="$(gh api "repos/$repository/actions/permissions" 2>/dev/null || echo '{}')"
    oidc_json="$(gh api "repos/$repository/actions/oidc/customization/sub" 2>/dev/null || echo '{}')"
    env_json="$(gh api --paginate "repos/$repository/environments" 2>/dev/null || echo '{"environments":[]}')"
    head_sha="$(git rev-parse HEAD 2>/dev/null || true)"
    runs_json="$(gh api "repos/$repository/actions/workflows/infra-validate.yml/runs?status=completed&per_page=20" 2>/dev/null || echo '{"workflow_runs":[]}')"
    state="$(jq -c --argjson r "$repo_json" --argjson a "$actions_json" --argjson o "$oidc_json" --argjson e "$env_json" --argjson w "$runs_json" --arg sha "$head_sha" \
      '.issuesEnabled=($r.has_issues // false) | .actionsEnabled=($a.enabled // false) | .expectedOidcPrefix=("repo:"+$r.owner.login+"@"+($r.owner.id|tostring)+"/"+$r.name+"@"+($r.id|tostring)) | .oidcPrefix=($o.sub_claim_prefix // "unavailable") | .immutableOidc=(($o.use_immutable_subject // false) and ($o.sub_claim_prefix == .expectedOidcPrefix)) | .environments=[$e.environments[]?.name] | .environmentVariables={} | .cloudValidation=any($w.workflow_runs[]?; .conclusion=="success" and .head_sha==$sha)' <<<"$state")"
    for environment in "${environments[@]}"; do
      vars_json="$(gh api --paginate "repos/$repository/environments/$environment/variables" 2>/dev/null || echo '{"variables":[]}')"
      state="$(jq -c --arg env "$environment" --argjson v "$vars_json" '.environmentVariables[$env]=[$v.variables[]?.name]' <<<"$state")"
    done
  fi
  if [[ "$az_authenticated" == true ]]; then
    account="$(az account show --output json 2>/dev/null || echo '{}')"
    group="$(az group show --subscription "$subscription_id" --name "$resource_group" --output json 2>/dev/null || echo '{}')"
    state="$(jq -c --argjson a "$account" --argjson g "$group" '.subscriptionId=($a.id // "") | .resourceGroupId=($g.id // "") | .resourceGroupAccessible=($g.id != null)' <<<"$state")"
  fi
fi

for tool in git node npm gh az copilot; do
  value="$(jq -r --arg t "$tool" '.tools[$t] // empty' <<<"$state")"
  if [[ -n "$value" ]]; then add_result PASS "tool.$tool" "$value" "installed and callable" ""
  else add_result FAIL "tool.$tool" "not found" "installed and callable" "Install $tool and reopen the terminal."; fi
done
node_text="$(jq -r '.tools.node // ""' <<<"$state")"
node_version="$(grep -oE '[0-9]+\.[0-9]+' <<<"$node_text" | head -n1 || true)"
node_major="${node_version%%.*}"; node_minor="${node_version#*.}"
if [[ -n "$node_version" ]] && (( node_major > 20 || (node_major == 20 && node_minor >= 19) )); then
  add_result PASS tool.node-version "$node_text" "Node.js >= 20.19" ""
else
  add_result FAIL tool.node-version "${node_text:-unknown}" "Node.js >= 20.19" "Install Node.js 20.19 or later."
fi

for auth in github azure; do
  key="ghAuthenticated"; action="Run 'gh auth login' and authorize the team repository."
  [[ "$auth" == "azure" ]] && key="azAuthenticated" && action="Run 'az login' and select the assigned subscription."
  if [[ "$(jq -r ".$key // false" <<<"$state")" == true ]]; then add_result PASS "auth.$auth" authenticated authenticated ""
  else add_result FAIL "auth.$auth" "not authenticated" authenticated "$action"; fi
done

actual_repo="$(jq -r '.repository // ""' <<<"$state")"
if [[ -n "$actual_repo" && ( -z "$repository" || "$actual_repo" == "$repository" ) ]]; then add_result PASS repository.identity "$actual_repo" "${repository:-GitHub owner/repository}" ""
else add_result FAIL repository.identity "${actual_repo:-not detected}" "$repository" "Clone the assigned team repository or pass the correct owner/name."; fi
if [[ "$(jq -r '.revisionContainsExpected // false' <<<"$state")" == true ]]; then add_result PASS repository.template-revision "$expected_revision" "approved revision in HEAD history" ""
else add_result FAIL repository.template-revision "revision not found in HEAD history" "$expected_revision" "Ask the instructor to recreate or update the repository from the approved template revision."; fi

for pair in "issues:issuesEnabled" "actions:actionsEnabled"; do
  name="${pair%%:*}"; key="${pair#*:}"
  if [[ "$(jq -r ".$key // false" <<<"$state")" == true ]]; then add_result PASS "github.$name" enabled enabled ""
  else add_result FAIL "github.$name" "disabled or unavailable" enabled "Ask an organization owner to enable GitHub $name."; fi
done
if [[ "$(jq -r '.immutableOidc // false' <<<"$state")" == true ]]; then
  add_result PASS github.oidc-subject "$(jq -r '.oidcPrefix' <<<"$state")" "immutable numeric owner/repository prefix" ""
else
  add_result FAIL github.oidc-subject "$(jq -r '.oidcPrefix // "not configured"' <<<"$state")" "$(jq -r '.expectedOidcPrefix // "immutable numeric owner/repository prefix"' <<<"$state")" "Run immutable OIDC setup and repository preparation; never use a name-only subject or client secret."
fi
for environment in "${environments[@]}"; do
  if jq -e --arg x "$environment" '.environments // [] | index($x)' <<<"$state" >/dev/null; then add_result PASS "github.environment.$environment" present present ""
  else add_result FAIL "github.environment.$environment" missing present "Run instructor repository preparation for '$environment'."; fi
done
for environment in "${environments[@]}"; do
  for variable in "${variables[@]}"; do
    if jq -e --arg env "$environment" --arg x "$variable" '.environmentVariables[$env] // [] | index($x)' <<<"$state" >/dev/null; then add_result PASS "github.environment.$environment.variable.$variable" present "present in environment" ""
    else add_result FAIL "github.environment.$environment.variable.$variable" missing "present in environment" "Run repository preparation to set '$variable' in '$environment'."; fi
  done
done
actual_subscription="$(jq -r '.subscriptionId // ""' <<<"$state")"
rg_access="$(jq -r '.resourceGroupAccessible // false' <<<"$state")"
rg_id="$(jq -r '.resourceGroupId // ""' <<<"$state")"
if [[ "$actual_subscription" == "$subscription_id" && "$rg_access" == true ]]; then add_result PASS azure.scope "$rg_id" "/subscriptions/$subscription_id/resourceGroups/$resource_group" ""
else add_result FAIL azure.scope "subscription=$actual_subscription; resource-group-access=$rg_access" "/subscriptions/$subscription_id/resourceGroups/$resource_group" "Select the assigned subscription and request Reader access to the resource group."; fi
if [[ "$(jq -r '.cloudValidation // false' <<<"$state")" == true ]]; then
  add_result PASS cloud.oidc-infrastructure "successful infra-validate.yml run for current revision" "completed OIDC login and Azure what-if" ""
elif [[ "$require_cloud" == true ]]; then
  add_result FAIL cloud.oidc-infrastructure NOT_YET_RUN "successful infra-validate.yml run for current revision" "Run infrastructure validation before Lab 1."
else
  add_result ADVISORY cloud.oidc-infrastructure NOT_YET_RUN "successful run before Lab 1" "Run infrastructure validation before the readiness gate."
fi
add_result MANUAL copilot.app "shell detection is not reliable" "Copilot App installed, signed in, and repository opened" "Verify this in Copilot App and record it manually."

document="$(jq -n --arg generatedAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg repository "$actual_repo" --argjson results "$results" \
  '{generatedAt:$generatedAt,repository:$repository,results:$results,summary:{pass:([$results[]|select(.status=="PASS")]|length),fail:([$results[]|select(.status=="FAIL")]|length),advisory:([$results[]|select(.status=="ADVISORY")]|length),manual:([$results[]|select(.status=="MANUAL")]|length)}}')"
if [[ -n "$json_output" ]]; then printf '%s\n' "$document" >"$json_output"; echo "Structured results: $json_output"; fi
if (( fail_count > 0 )); then
  echo "PREFLIGHT BLOCKED: $fail_count required check(s) failed."
  exit 1
fi
echo "PREFLIGHT READY: all automated blocking checks passed; complete MANUAL checks separately."
exit 0
