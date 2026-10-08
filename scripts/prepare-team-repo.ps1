[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)][ValidatePattern("^[A-Za-z0-9_.-]+$")][string]$Organization,
    [Parameter(Mandatory)][ValidatePattern("^[A-Za-z0-9_.-]+$")][string]$Repository,
    [Parameter(Mandatory)][ValidatePattern("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")][string]$TemplateRepository,
    [Parameter(Mandatory)][ValidatePattern("^[0-9a-fA-F]{7,40}$")][string]$TemplateRevision,
    [string]$Outcome = "Babazon product search and category filtering",
    [Parameter(Mandatory)][ValidateRange(2, 3)][int]$TeamSize,
    [Parameter(Mandatory)][ValidatePattern("^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$")][string]$TeamId,
    [Parameter(Mandatory)][string]$AzureSubscriptionId,
    [Parameter(Mandatory)][string]$AzureTenantId,
    [Parameter(Mandatory)][string]$AzureClientId,
    [Parameter(Mandatory)][string]$AzureResourceGroup,
    [Parameter(Mandatory)][string]$EntraApplicationObjectId,
    [Parameter(Mandatory)][ValidateSet("PREPARE")][string]$Confirmation,
    [string[]]$Environments = @("workshop-validation", "workshop"),
    [string]$FixturePath,
    [string]$StateOutput,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$target = "$Organization/$Repository"
$operations = [System.Collections.Generic.List[object]]::new()

function Add-Operation {
    param([string]$Action, [string]$Resource, [string]$Detail)
    $operations.Add([ordered]@{ action = $Action; resource = $Resource; detail = $Detail })
    Write-Host "[$Action] $Resource - $Detail"
}

function Invoke-GhJson {
    param([string[]]$Arguments)
    $output = & gh @Arguments 2>$null
    if ($LASTEXITCODE -ne 0) { throw "gh $($Arguments -join ' ') failed" }
    return ($output | Out-String | ConvertFrom-Json)
}

function Invoke-Gh {
    param([string[]]$Arguments)
    & gh @Arguments
    if ($LASTEXITCODE -ne 0) { throw "gh $($Arguments -join ' ') failed" }
}

function Get-LiveState {
    & gh auth status | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "GitHub CLI is not authenticated. Run 'gh auth login'." }
    & az account show --output none 2>$null
    if ($LASTEXITCODE -ne 0) { throw "Azure CLI is not authenticated. Run 'az login'." }

    $repo = Invoke-GhJson @("api", "repos/$target")
    $templateCommit = Invoke-GhJson @("api", "repos/$TemplateRepository/commits/$TemplateRevision")
    $targetCommit = Invoke-GhJson @("api", "repos/$target/commits/$($repo.default_branch)")
    $serverSourcePayload = Invoke-GhJson @(
        "api",
        "repos/$TemplateRepository/contents/src/server/app.ts?ref=$TemplateRevision"
    )
    $serverSource = [Text.Encoding]::UTF8.GetString(
        [Convert]::FromBase64String(([string]$serverSourcePayload.content -replace "\s", ""))
    )
    $actions = try { Invoke-GhJson @("api", "repos/$target/actions/permissions") } catch { [pscustomobject]@{ enabled = $false } }
    $environmentData = try { Invoke-GhJson @("api", "--paginate", "repos/$target/environments") } catch { [pscustomobject]@{ environments = @() } }
    $variableData = try { Invoke-GhJson @("api", "--paginate", "repos/$target/actions/variables") } catch { [pscustomobject]@{ variables = @() } }
    $environmentVariables = @{}
    foreach ($environment in $Environments) {
        if (@($environmentData.environments.name) -contains $environment) {
            $data = Invoke-GhJson @("api", "--paginate", "repos/$target/environments/$environment/variables")
            $environmentVariables[$environment] = @($data.variables | ForEach-Object { [ordered]@{ name = $_.name; value = $_.value } })
        } else {
            $environmentVariables[$environment] = @()
        }
    }
    $oidcCustomization = Invoke-GhJson @("api", "repos/$target/actions/oidc/customization/sub")
    $labelData = Invoke-GhJson @("api", "--paginate", "repos/$target/labels?per_page=100")
    $issueData = Invoke-GhJson @("api", "--paginate", "repos/$target/issues?state=all&per_page=100")
    $repoSecrets = Invoke-GhJson @("api", "repos/$target/actions/secrets")
    $environmentSecrets = @()
    foreach ($environment in $Environments) {
        if (@($environmentData.environments.name) -contains $environment) {
            $data = Invoke-GhJson @("api", "repos/$target/environments/$environment/secrets")
            $environmentSecrets += @($data.secrets)
        }
    }
    $credentials = & az rest --method get --url "https://graph.microsoft.com/beta/applications/$EntraApplicationObjectId/federatedIdentityCredentials" --output json 2>$null
    if ($LASTEXITCODE -ne 0) { throw "Unable to read federated identity credentials for Entra application object $EntraApplicationObjectId." }
    $credentialData = $credentials | Out-String | ConvertFrom-Json

    return [ordered]@{
        repository = [ordered]@{
            id = [string]$repo.id
            ownerId = [string]$repo.owner.id
            fullName = [string]$repo.full_name
            issuesEnabled = [bool]$repo.has_issues
            actionsEnabled = [bool]$actions.enabled
            defaultBranch = [string]$repo.default_branch
        }
        provenanceVerified = [string]$templateCommit.commit.tree.sha -eq [string]$targetCommit.commit.tree.sha
        cloudAgentBaselineGapVerified = $serverSource -notmatch 'no-store'
        environments = @($environmentData.environments.name)
        variables = @($variableData.variables | ForEach-Object { [ordered]@{ name = $_.name; value = $_.value } })
        environmentVariables = $environmentVariables
        oidcCustomization = [ordered]@{
            useImmutableSubject = [bool]$oidcCustomization.use_immutable_subject
            subClaimPrefix = [string]$oidcCustomization.sub_claim_prefix
        }
        labels = @($labelData | ForEach-Object { [ordered]@{ name = $_.name; color = $_.color; description = $_.description } })
        issues = @($issueData | Where-Object { -not $_.pull_request } | ForEach-Object { [ordered]@{ title = $_.title; body = $_.body; state = $_.state; number = $_.number } })
        secretNames = @($repoSecrets.secrets.name) + @($environmentSecrets.name)
        federatedCredentials = @($credentialData.value)
    }
}

function Test-ImmutableCredential {
    param([object]$Credential, [string]$Environment, [string]$RepositoryId, [string]$OwnerId)
    $expected = "repo:$Organization@$OwnerId/$Repository@$RepositoryId`:environment:$Environment"
    $subject = [string]$Credential.subject
    if (-not $subject -or $subject.Contains("*") -or $subject -ne $expected) { return $false }
    return ([string]$Credential.issuer -eq "https://token.actions.githubusercontent.com" -and
        @($Credential.audiences) -contains "api://AzureADTokenExchange")
}

if ($FixturePath) {
    $state = Get-Content -Raw $FixturePath | ConvertFrom-Json -AsHashtable
} else {
    $state = Get-LiveState
}

if ($state.repository.fullName -ne $target) {
    throw "Target identity mismatch: API returned '$($state.repository.fullName)', expected '$target'. No changes were made."
}
if (-not $state.provenanceVerified) {
    throw "Template provenance failed: $target's default-branch tree does not match $TemplateRepository at $TemplateRevision. No changes were made."
}
if (-not $state.cloudAgentBaselineGapVerified) {
    throw "The selected template revision already contains the Lab 4 no-store cache policy. Seed a newly verified feature-independent issue instead of creating completed work."
}
if (-not $state.repository.id -or -not $state.repository.ownerId) {
    throw "GitHub did not return numeric repository and owner IDs. Immutable OIDC trust cannot be verified."
}
$expectedPrefix = "repo:$Organization@$($state.repository.ownerId)/$Repository@$($state.repository.id)"
if (-not $state.oidcCustomization.useImmutableSubject -or [string]$state.oidcCustomization.subClaimPrefix -ne $expectedPrefix) {
    throw "GitHub immutable OIDC subject is not enabled or its live prefix is unexpected. Expected '$expectedPrefix'; observed '$($state.oidcCustomization.subClaimPrefix)'."
}
if (@($state.secretNames | Where-Object { $_ -match "(?i)(AZURE_)?CLIENT[_-]?SECRET|SERVICE[_-]?PRINCIPAL[_-]?SECRET" }).Count -gt 0) {
    throw "A client-secret-like Actions secret exists. Remove it; this workshop permits Azure OIDC only."
}
if (-not $state.repository.actionsEnabled) {
    throw "GitHub Actions is disabled or unavailable for $target. Ask an organization owner to enable the approved Actions policy before preparation."
}
foreach ($environment in $Environments) {
    $matching = @($state.federatedCredentials | Where-Object {
        Test-ImmutableCredential $_ $environment ([string]$state.repository.id) ([string]$state.repository.ownerId)
    })
    if ($matching.Count -ne 1) {
        throw "OIDC readiness failed for '$environment'. Require exactly one credential subject '$expectedPrefix`:environment:$environment'. Name-only subjects, wildcards, and client-secret fallbacks are rejected."
    }
}

$desiredEnvironmentVariables = [ordered]@{
    TEAM_ID = $TeamId
    AZURE_CLIENT_ID = $AzureClientId
    AZURE_TENANT_ID = $AzureTenantId
    AZURE_SUBSCRIPTION_ID = $AzureSubscriptionId
    AZURE_RESOURCE_GROUP = $AzureResourceGroup
}
$desiredRepositoryVariables = [ordered]@{
    WORKSHOP_OUTCOME = $Outcome
    GITHUB_REPOSITORY_ID = [string]$state.repository.id
    GITHUB_REPOSITORY_OWNER_ID = [string]$state.repository.ownerId
}
$desiredLabels = @(
    [ordered]@{ name = "workshop"; color = "1d76db"; description = "Workshop-planned work" },
    [ordered]@{ name = "agent-ready"; color = "0e8a16"; description = "Bounded work ready for an agent" },
    [ordered]@{ name = "instructor-seeded"; color = "5319e7"; description = "Seeded by the instructor preparation path" },
    [ordered]@{ name = "human-revision-required"; color = "d93f0b"; description = "Requires a human-requested revision before merge" }
)
$desiredIssues = @(
    [ordered]@{
        marker = "<!-- workshop-feature-parent:v1 -->"
        title = "Babazon: product search and category filtering"
        labels = @("workshop", "instructor-seeded")
        body = @"
<!-- workshop-feature-parent:v1 -->
## Outcome

Deliver one shopper outcome: browse the Babazon catalogue, search by product
text, filter by category, clear filters, and understand loading, empty, error,
and results states.

## Required path

- Read `AGENTS.md`, `DESIGN.md`, and the observable acceptance criteria here.
- Review a Copilot App Plan before implementation.
- Create exactly four child issues with dependencies, owned paths, prohibited
  paths, focused tests, and completion evidence.
- Link pull requests and focused validation evidence here.

This issue seeds the work boundary; it does not contain the participant solution.
"@
    },
    [ordered]@{
        marker = "<!-- cloud-agent-revision-exercise:v1 -->"
        title = "Cloud agent: prevent caching of health and readiness responses"
        labels = @("workshop", "agent-ready", "instructor-seeded", "human-revision-required")
        body = @"
<!-- cloud-agent-revision-exercise:v1 -->
## Outcome

Add ``Cache-Control: no-store`` to the existing ``/health`` and ``/ready``
JSON responses.

## Contract

- Link this issue and the parent Babazon outcome issue.
- Own only ``src/server/app.ts`` and ``tests/api.test.ts``.
- Do not change ``src/client/**``, ``src/shared/**``, ``infra/**``,
  ``.github/workflows/**``, security fixtures, or participant feature code.
- Preserve the current response bodies and status codes.
- Cover ``GET /health`` and both the ``200`` and ``503`` ``GET /ready`` paths.
- Run ``npm test -- tests/api.test.ts``.
- Link the branch, commit, test result, and pull request here.
- Include ``<!-- cloud-agent-revision-exercise:v1 -->`` in the pull-request
  body so workshop structural checks can identify this instructor-seeded
  exercise.

A human reviewer must request a focused ``HEAD /health`` regression assertion
before approval. The revision must prove the no-store header is present and the
response has no body.
"@
    }
)

if (-not $state.repository.issuesEnabled) {
    Add-Operation UPDATE "repository settings" "enable Issues"
    if (-not $DryRun -and -not $FixturePath) {
        Invoke-Gh @("api", "--method", "PATCH", "repos/$target", "-f", "has_issues=true")
    }
}
Add-Operation VERIFY "repository topology" "one repository for this table of $TeamSize participants"

foreach ($environment in $Environments) {
    if (@($state.environments) -contains $environment) {
        Add-Operation VERIFY "environment:$environment" "already present"
    } else {
        Add-Operation CREATE "environment:$environment" "protected workflow scope"
        if (-not $DryRun -and -not $FixturePath) {
            Invoke-Gh @("api", "--method", "PUT", "repos/$target/environments/$environment")
        }
    }
}

foreach ($entry in $desiredRepositoryVariables.GetEnumerator()) {
    $current = @($state.variables | Where-Object name -eq $entry.Key | Select-Object -First 1)
    $action = if ($current.Count -eq 1 -and [string]$current[0].value -eq [string]$entry.Value) { "VERIFY" } elseif ($current.Count) { "UPDATE" } else { "CREATE" }
    Add-Operation $action "variable:$($entry.Key)" "non-secret repository configuration"
    if ($action -ne "VERIFY" -and -not $DryRun -and -not $FixturePath) {
        $payload = @{ name = $entry.Key; value = [string]$entry.Value } | ConvertTo-Json -Compress
        $method = if ($action -eq "CREATE") { "POST" } else { "PATCH" }
        $path = if ($action -eq "CREATE") { "repos/$target/actions/variables" } else { "repos/$target/actions/variables/$($entry.Key)" }
        $payload | gh api --method $method $path --input -
        if ($LASTEXITCODE -ne 0) { throw "Failed to converge variable $($entry.Key)." }
    }
}

foreach ($environment in $Environments) {
    foreach ($entry in $desiredEnvironmentVariables.GetEnumerator()) {
        $current = @($state.environmentVariables[$environment] | Where-Object name -eq $entry.Key | Select-Object -First 1)
        $action = if ($current.Count -eq 1 -and [string]$current[0].value -eq [string]$entry.Value) { "VERIFY" } elseif ($current.Count) { "UPDATE" } else { "CREATE" }
        Add-Operation $action "environment:$environment/variable:$($entry.Key)" "non-secret environment-scoped workflow configuration"
        if ($action -ne "VERIFY" -and -not $DryRun -and -not $FixturePath) {
            $payload = @{ name = $entry.Key; value = [string]$entry.Value } | ConvertTo-Json -Compress
            $method = if ($action -eq "CREATE") { "POST" } else { "PATCH" }
            $path = if ($action -eq "CREATE") { "repos/$target/environments/$environment/variables" } else { "repos/$target/environments/$environment/variables/$($entry.Key)" }
            $payload | gh api --method $method $path --input -
            if ($LASTEXITCODE -ne 0) { throw "Failed to converge $environment variable $($entry.Key)." }
        }
    }
}

foreach ($label in $desiredLabels) {
    $current = @($state.labels | Where-Object name -eq $label.name | Select-Object -First 1)
    $action = if ($current.Count -eq 1 -and $current[0].color -eq $label.color -and $current[0].description -eq $label.description) { "VERIFY" } elseif ($current.Count) { "UPDATE" } else { "CREATE" }
    Add-Operation $action "label:$($label.name)" "$($label.description)"
    if ($action -ne "VERIFY" -and -not $DryRun -and -not $FixturePath) {
        $method = if ($action -eq "CREATE") { "POST" } else { "PATCH" }
        $path = if ($action -eq "CREATE") { "repos/$target/labels" } else { "repos/$target/labels/$([uri]::EscapeDataString($label.name))" }
        $payload = @{ name = $label.name; color = $label.color; description = $label.description } | ConvertTo-Json -Compress
        $payload | gh api --method $method $path --input -
        if ($LASTEXITCODE -ne 0) { throw "Failed to converge label $($label.name)." }
    }
}

foreach ($issue in $desiredIssues) {
    $current = @($state.issues | Where-Object { [string]$_.body -like "*$($issue.marker)*" })
    if ($current.Count -gt 1) { throw "Duplicate seeded issue marker '$($issue.marker)' found. Resolve duplicates before rerunning." }
    if ($current.Count -eq 1) {
        Add-Operation VERIFY "issue:$($issue.title)" "marker already exists; no duplicate created"
    } else {
        Add-Operation CREATE "issue:$($issue.title)" "seed bounded workshop work"
        if (-not $DryRun -and -not $FixturePath) {
            $payload = @{ title = $issue.title; body = $issue.body; labels = $issue.labels } | ConvertTo-Json -Depth 5 -Compress
            $payload | gh api --method POST "repos/$target/issues" --input -
            if ($LASTEXITCODE -ne 0) { throw "Failed to create issue '$($issue.title)'." }
        }
    }
}

Add-Operation VERIFY "oidc" "numeric repository ID $($state.repository.id), owner ID $($state.repository.ownerId), and exact environments"
Add-Operation MANUAL "environment protection" "configure required reviewers in the organization UI when the repository plan supports it"
Add-Operation SKIP "security exercise branch/PR" "owned by the deterministic security workstream; intentionally not created"

$report = [ordered]@{
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    target = $target
    dryRun = [bool]$DryRun -or [bool]$FixturePath
    templateRevision = $TemplateRevision
    templateRepository = $TemplateRepository
    teamSize = $TeamSize
    repositoryId = [string]$state.repository.id
    repositoryOwnerId = [string]$state.repository.ownerId
    azureScope = "/subscriptions/$AzureSubscriptionId/resourceGroups/$AzureResourceGroup"
    environments = $Environments
    operations = $operations
}
if ($StateOutput) {
    $report | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 $StateOutput
    Write-Host "Preparation report: $StateOutput"
}
Write-Host "Repository preparation converged without client secrets. Review MANUAL operations before declaring readiness."
