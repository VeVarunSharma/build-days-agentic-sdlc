#!/usr/bin/env bash
set -uo pipefail

repository=""
expected_revision=""
template_repository="VeVarunSharma/build-days-agentic-sdlc"
catalogue_repository=""
catalogue_expected_revision=""
catalogue_template_repository="VeVarunSharma/babazon-catalogue-service"
include_azure=false
subscription_id=""
resource_group=""
fixture=""
json_output=""
require_cloud=true
environments=("workshop-validation" "workshop")
variables=("TEAM_ID" "AZURE_CLIENT_ID" "AZURE_TENANT_ID" "AZURE_SUBSCRIPTION_ID" "AZURE_RESOURCE_GROUP")

while [[ $# -gt 0 ]]; do
  if [[ "$1" != "--help" && "$1" != "--include-azure" && "$1" != "--allow-pending-cloud-validation" && $# -lt 2 ]]; then
    echo "Missing value for $1." >&2
    exit 2
  fi
  case "$1" in
    --repository) repository="$2"; shift 2 ;;
    --expected-revision) expected_revision="$2"; shift 2 ;;
    --template-repository) template_repository="$2"; shift 2 ;;
    --catalogue-repository) catalogue_repository="$2"; shift 2 ;;
    --catalogue-expected-revision) catalogue_expected_revision="$2"; shift 2 ;;
    --catalogue-template-repository) catalogue_template_repository="$2"; shift 2 ;;
    --include-azure) include_azure=true; shift ;;
    --azure-subscription-id) subscription_id="$2"; shift 2 ;;
    --azure-resource-group) resource_group="$2"; shift 2 ;;
    --fixture) fixture="$2"; shift 2 ;;
    --json-output) json_output="$2"; shift 2 ;;
    --allow-pending-cloud-validation) require_cloud=false; shift ;;
    --help)
      echo "Usage: verify-env.sh --repository OWNER/APP --expected-revision SHA --catalogue-repository OWNER/SERVICE --catalogue-expected-revision SHA [--json-output FILE] [--include-azure --azure-subscription-id ID --azure-resource-group NAME]"
      exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

repo_pattern='^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$'
sha_pattern='^[0-9a-fA-F]{40}$'
if [[ ! "$expected_revision" =~ $sha_pattern || ! "$catalogue_expected_revision" =~ $sha_pattern ||
      ! "$catalogue_repository" =~ $repo_pattern || ! "$template_repository" =~ $repo_pattern ||
      ! "$catalogue_template_repository" =~ $repo_pattern ||
      ( -n "$repository" && ! "$repository" =~ $repo_pattern ) ]]; then
  echo "Provide valid owner/repo identities and full approved --expected-revision and --catalogue-expected-revision SHAs." >&2
  exit 2
fi
if [[ "$repository" == "$catalogue_repository" ]]; then
  echo "The app and catalogue must be different repositories." >&2
  exit 2
fi
if [[ "$include_azure" == true && ( -z "$subscription_id" || -z "$resource_group" ) ]]; then
  echo "--include-azure requires --azure-subscription-id and --azure-resource-group." >&2
  exit 2
fi

gh_json() {
  local output
  if ! output="$(gh api "$1")"; then
    echo "Cannot read $1. Check access to both repositories and their Actions policy." >&2
    return 1
  fi
  printf '%s\n' "$output"
}

required_tools=(git node npm gh)
[[ "$include_azure" == true ]] && required_tools+=(az)

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
  for tool in "${required_tools[@]}"; do
    value=""
    if command -v "$tool" >/dev/null 2>&1; then
      if [[ "$tool" == "az" ]]; then
        if ! value="$(az version --output json)"; then
          echo "Cannot run az to read its version." >&2
          value=""
        fi
      elif ! value="$("$tool" --version)"; then
        echo "Cannot run $tool to read its version." >&2
        value=""
      fi
    fi
    state="$(jq -c --arg t "$tool" --arg v "$value" '.tools[$t] = (if $v == "" then null else $v end)' <<<"$state")"
  done
  gh_authenticated=false; gh auth status >/dev/null 2>&1 && gh_authenticated=true
  az_authenticated=false
  if [[ "$include_azure" == true ]]; then
    az account show --output none >/dev/null 2>&1 && az_authenticated=true
  fi
  if [[ -z "$repository" ]]; then
    repository="$(gh repo view --json nameWithOwner --jq .nameWithOwner)" || exit 1
  fi
  if [[ "$repository" == "$catalogue_repository" ]]; then
    echo "The app and catalogue must be different repositories." >&2
    exit 2
  fi
  state="$(jq -c --arg repo "$repository" --argjson gh "$gh_authenticated" --argjson az "$az_authenticated" \
    '.repository=$repo | .ghAuthenticated=$gh | .azAuthenticated=$az' <<<"$state")"
  if [[ "$gh_authenticated" == true && -n "$repository" ]]; then
    repo_json="$(gh_json "repos/$repository")" || exit 1
    source_json="$(gh_json "repos/$template_repository/commits/$expected_revision")" || exit 1
    branch="$(jq -r '.default_branch' <<<"$repo_json")"
    head_json="$(gh_json "repos/$repository/commits/$branch")" || exit 1
    actions_json="$(gh_json "repos/$repository/actions/permissions")" || exit 1
    catalogue_json="$(gh_json "repos/$catalogue_repository")" || exit 1
    catalogue_source="$(gh_json "repos/$catalogue_template_repository/commits/$catalogue_expected_revision")" || exit 1
    catalogue_branch="$(jq -r '.default_branch' <<<"$catalogue_json")"
    catalogue_head="$(gh_json "repos/$catalogue_repository/commits/$catalogue_branch")" || exit 1
    catalogue_actions="$(gh_json "repos/$catalogue_repository/actions/permissions")" || exit 1
    state="$(jq -c --argjson r "$repo_json" --argjson a "$actions_json" --argjson s "$source_json" --argjson h "$head_json" \
      --argjson c "$catalogue_json" --argjson cs "$catalogue_source" --argjson ch "$catalogue_head" --argjson ca "$catalogue_actions" \
      '.repository=$r.full_name | .issuesEnabled=$r.has_issues | .actionsEnabled=$a.enabled | .provenanceVerified=($s.commit.tree.sha == $h.commit.tree.sha) | .targetRevision=$h.sha |
       .catalogue={repository:{fullName:$c.full_name,issuesEnabled:$c.has_issues,actionsEnabled:$ca.enabled},provenanceVerified:($cs.commit.tree.sha == $ch.commit.tree.sha),targetRevision:$ch.sha}' <<<"$state")"
    if [[ "$include_azure" == true ]]; then
    oidc_json="$(gh api "repos/$repository/actions/oidc/customization/sub" 2>/dev/null || echo '{}')"
    env_json="$(gh api --paginate "repos/$repository/environments" 2>/dev/null || echo '{"environments":[]}')"
    head_sha="$(jq -r '.sha' <<<"$head_json")"
    runs_json="$(gh api "repos/$repository/actions/workflows/infra-validate.yml/runs?status=completed&per_page=20" 2>/dev/null || echo '{"workflow_runs":[]}')"
    state="$(jq -c --argjson r "$repo_json" --argjson a "$actions_json" --argjson o "$oidc_json" --argjson e "$env_json" --argjson w "$runs_json" --arg sha "$head_sha" \
      '.issuesEnabled=($r.has_issues // false) | .actionsEnabled=($a.enabled // false) | .expectedOidcPrefix=("repo:"+$r.owner.login+"@"+($r.owner.id|tostring)+"/"+$r.name+"@"+($r.id|tostring)) | .oidcPrefix=($o.sub_claim_prefix // "unavailable") | .immutableOidc=(($o.use_immutable_subject // false) and ($o.sub_claim_prefix == .expectedOidcPrefix)) | .environments=[$e.environments[]?.name] | .environmentVariables={} | .cloudValidation=any($w.workflow_runs[]?; .conclusion=="success" and .head_sha==$sha)' <<<"$state")"
    for environment in "${environments[@]}"; do
      vars_json="$(gh api --paginate "repos/$repository/environments/$environment/variables" 2>/dev/null || echo '{"variables":[]}')"
      state="$(jq -c --arg env "$environment" --argjson v "$vars_json" '.environmentVariables[$env]=[$v.variables[]?.name]' <<<"$state")"
    done
    fi
  fi
  if [[ "$include_azure" == true && "$az_authenticated" == true ]]; then
    account="$(az account show --output json 2>/dev/null || echo '{}')"
    group="$(az group show --subscription "$subscription_id" --name "$resource_group" --output json 2>/dev/null || echo '{}')"
    state="$(jq -c --argjson a "$account" --argjson g "$group" '.subscriptionId=($a.id // "") | .resourceGroupId=($g.id // "") | .resourceGroupAccessible=($g.id != null)' <<<"$state")"
  fi
fi

for tool in "${required_tools[@]}"; do
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

auth_checks=(github)
[[ "$include_azure" == true ]] && auth_checks+=(azure)
for auth in "${auth_checks[@]}"; do
  key="ghAuthenticated"; action="Run 'gh auth login' and authorize the team repository."
  [[ "$auth" == "azure" ]] && key="azAuthenticated" && action="Run 'az login' and select the assigned subscription."
  if [[ "$(jq -r ".$key // false" <<<"$state")" == true ]]; then add_result PASS "auth.$auth" authenticated authenticated ""
  else add_result FAIL "auth.$auth" "not authenticated" authenticated "$action"; fi
done

actual_repo="$(jq -r '.repository // ""' <<<"$state")"
if [[ -n "$actual_repo" && ( -z "$repository" || "$actual_repo" == "$repository" ) ]]; then add_result PASS repository.identity "$actual_repo" "${repository:-GitHub owner/repository}" ""
else add_result FAIL repository.identity "${actual_repo:-not detected}" "$repository" "Clone the assigned team repository or pass the correct owner/name."; fi
if [[ "$(jq -r '.provenanceVerified // false' <<<"$state")" == true ]]; then add_result PASS repository.template-revision "$expected_revision" "fresh app tree matches the approved source tree" ""
else add_result FAIL repository.template-revision "starter tree does not match" "$expected_revision" "Use the approved fresh app starter before Lab 1; do not overwrite learner edits."; fi

for pair in "issues:issuesEnabled" "actions:actionsEnabled"; do
  name="${pair%%:*}"; key="${pair#*:}"
  if [[ "$(jq -r ".$key // false" <<<"$state")" == true ]]; then add_result PASS "github.$name" enabled enabled ""
  else add_result FAIL "github.$name" "disabled or unavailable" enabled "Ask an organization owner to enable GitHub $name."; fi
done
actual_catalogue="$(jq -r '.catalogue.repository.fullName // ""' <<<"$state")"
if [[ "$actual_catalogue" == "$catalogue_repository" && "$actual_catalogue" != "$actual_repo" ]]; then
  add_result PASS catalogue.identity "$actual_catalogue" "$catalogue_repository" ""
else
  add_result FAIL catalogue.identity "$actual_catalogue" "$catalogue_repository" "Create your own catalogue template copy and pass its owner/name, distinct from the app repo."
fi
if [[ "$(jq -r '.catalogue.provenanceVerified // false' <<<"$state")" == true ]]; then
  add_result PASS catalogue.template-revision "$catalogue_expected_revision" "fresh service tree matches the approved source tree; ancestry is not required" ""
else
  add_result FAIL catalogue.template-revision "starter tree does not match" "$catalogue_expected_revision" "Use the approved template contents; a template copy has new commit history."
fi
for pair in "issues:issuesEnabled" "actions:actionsEnabled"; do
  name="${pair%%:*}"; key="${pair#*:}"
  if [[ "$(jq -r ".catalogue.repository.$key // false" <<<"$state")" == true ]]; then
    add_result PASS "catalogue.$name" enabled enabled ""
  else
    add_result FAIL "catalogue.$name" "disabled or unavailable" enabled "Enable GitHub $name for $catalogue_repository."
  fi
done

if [[ "$include_azure" == true ]]; then
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
fi
add_result MANUAL copilot.app "shell detection is not reliable" "Copilot App installed, signed in, and both repositories opened" "Verify both participant copies in the App."
add_result MANUAL copilot.project "UI capability must be checked" "one Copilot Project contains both repositories" "Create the Project and record unavailable preview access honestly."
add_result MANUAL copilot.fusion "model availability must be checked" "a bounded Fusion prompt has been tried" "Select an available Fusion effort level and run the opening prompt."
add_result MANUAL ghaw.engine "billing and policy must be checked" "eligible per-run Copilot inference before Lab 5" "Confirm organization billing and Actions policy; do not add a long-lived token workaround."

evidence_source="live"
[[ -n "$fixture" ]] && evidence_source="fixture"
document="$(jq -n --arg generatedAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg evidenceSource "$evidence_source" --arg repository "$actual_repo" --arg catalogueRepository "$actual_catalogue" \
  --arg appSource "$expected_revision" --arg serviceSource "$catalogue_expected_revision" --argjson state "$state" --argjson includeAzure "$include_azure" --argjson results "$results" \
  '{generatedAt:$generatedAt,evidenceSource:$evidenceSource,repository:$repository,catalogueRepository:$catalogueRepository,sourceRevisions:{app:$appSource,catalogue:$serviceSource},startingCommits:{app:($state.targetRevision // ""),catalogue:($state.catalogue.targetRevision // "")},includeAzure:$includeAzure,results:$results,summary:{pass:([$results[]|select(.status=="PASS")]|length),fail:([$results[]|select(.status=="FAIL")]|length),advisory:([$results[]|select(.status=="ADVISORY")]|length),manual:([$results[]|select(.status=="MANUAL")]|length)}}')"
if [[ -n "$json_output" ]]; then printf '%s\n' "$document" >"$json_output"; echo "Structured results: $json_output"; fi
if (( fail_count > 0 )); then
  echo "PREFLIGHT BLOCKED: $fail_count required check(s) failed."
  exit 1
fi
echo "PREFLIGHT READY ($evidence_source): all automated blocking checks passed; complete MANUAL checks separately."
exit 0
