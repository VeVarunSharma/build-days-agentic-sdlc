[CmdletBinding()]
param(
    [ValidatePattern("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")][string]$Repository,
    [ValidatePattern("^[0-9a-fA-F]{40}$")][string]$ExpectedRevision,
    [ValidatePattern("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")][string]$TemplateRepository = "VeVarunSharma/build-days-agentic-sdlc",
    [switch]$IncludeAzure,
    [string]$AzureSubscriptionId,
    [string]$AzureResourceGroup,
    [string[]]$Environments = @("workshop-validation", "workshop"),
    [string[]]$RequiredVariables = @("TEAM_ID", "AZURE_CLIENT_ID", "AZURE_TENANT_ID", "AZURE_SUBSCRIPTION_ID", "AZURE_RESOURCE_GROUP"),
    [bool]$RequireCloudValidation = $true,
    [string]$FixturePath,
    [string]$JsonOutput
)

$ErrorActionPreference = "Stop"
$results = [System.Collections.Generic.List[object]]::new()

if (!$ExpectedRevision) {
    throw "Preflight requires -ExpectedRevision. Use the full approved starter SHA."
}
if ($IncludeAzure -and (!$AzureSubscriptionId -or !$AzureResourceGroup)) {
    throw "-IncludeAzure requires -AzureSubscriptionId and -AzureResourceGroup."
}

function Add-Result {
    param(
        [ValidateSet("PASS", "FAIL", "ADVISORY", "MANUAL")][string]$Status,
        [string]$Id,
        [string]$Observed,
        [string]$Expected,
        [string]$Remediation
    )
    $results.Add([ordered]@{
        status = $Status
        id = $Id
        observed = $Observed
        expected = $Expected
        remediation = $Remediation
    })
}

function Invoke-JsonCommand {
    param([string]$File, [string[]]$Arguments)
    $output = & $File @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$File $($Arguments -join ' ') failed. Check repository access and Actions policy." }
    return ($output | Out-String | ConvertFrom-Json)
}

function Get-LiveState {
    $state = [ordered]@{ tools = @{} }
    $tools = @("git", "node", "npm", "gh")
    if ($IncludeAzure) { $tools += "az" }
    foreach ($tool in $tools) {
        $command = Get-Command $tool -ErrorAction SilentlyContinue
        if (-not $command) {
            $state.tools[$tool] = $null
            continue
        }
        try {
            [string[]]$versionArgs = if ($tool -eq "az") { @("version", "--output", "json") } else { @("--version") }
            $state.tools[$tool] = ((& $tool @versionArgs 2>$null) | Out-String).Trim()
            if ($LASTEXITCODE -ne 0) { throw "$tool version probe failed." }
        } catch {
            Write-Warning "Cannot run $tool to read its version: $($_.Exception.Message)"
            $state.tools[$tool] = $null
        }
    }

    $state.ghAuthenticated = $false
    if ($state.tools.gh) {
        & gh auth status 2>&1 | Out-Null
        $state.ghAuthenticated = $LASTEXITCODE -eq 0
    }
    if ($IncludeAzure -and $state.tools.az) {
        & az account show --output none 2>$null
        $state.azAuthenticated = $LASTEXITCODE -eq 0
    }
    if (-not $Repository) {
        $script:Repository = Invoke-JsonCommand "gh" @("repo", "view", "--json", "nameWithOwner") | Select-Object -ExpandProperty nameWithOwner
    }
    $state.repository = $Repository

    if ($Repository -and $state.ghAuthenticated) {
        $repo = Invoke-JsonCommand "gh" @("api", "repos/$Repository")
        $state.repository = [string]$repo.full_name
        $source = Invoke-JsonCommand "gh" @("api", "repos/$TemplateRepository/commits/$ExpectedRevision")
        $head = Invoke-JsonCommand "gh" @("api", "repos/$Repository/commits/$($repo.default_branch)")
        $state.provenanceVerified = [string]$source.commit.tree.sha -eq [string]$head.commit.tree.sha
        $state.targetRevision = [string]$head.sha
        $state.repoExists = $true
        $state.issuesEnabled = [bool]$repo.has_issues
        $actions = Invoke-JsonCommand "gh" @("api", "repos/$Repository/actions/permissions")
        $state.actionsEnabled = [bool]$actions.enabled
        if ($IncludeAzure) {
            $state.expectedOidcPrefix = "repo:$($repo.owner.login)@$($repo.owner.id)/$($repo.name)@$($repo.id)"
            try {
                $oidc = Invoke-JsonCommand "gh" @("api", "repos/$Repository/actions/oidc/customization/sub")
                $state.immutableOidc = [bool]$oidc.use_immutable_subject -and [string]$oidc.sub_claim_prefix -eq $state.expectedOidcPrefix
                $state.oidcPrefix = [string]$oidc.sub_claim_prefix
            } catch {
                $state.immutableOidc = $false
                $state.oidcPrefix = "unavailable"
            }
            try {
                $environmentData = Invoke-JsonCommand "gh" @("api", "--paginate", "repos/$Repository/environments")
                $state.environments = @($environmentData.environments.name)
            } catch { $state.environments = @() }
            try {
                $state.environmentVariables = @{}
                foreach ($environment in $Environments) {
                    $variableData = Invoke-JsonCommand "gh" @("api", "--paginate", "repos/$Repository/environments/$environment/variables")
                    $state.environmentVariables[$environment] = @($variableData.variables.name)
                }
            } catch { $state.environmentVariables = @{} }
            try {
                $runs = Invoke-JsonCommand "gh" @("api", "repos/$Repository/actions/workflows/infra-validate.yml/runs?status=completed&per_page=20")
                $state.cloudValidation = @($runs.workflow_runs | Where-Object {
                    $_.conclusion -eq "success" -and $_.head_sha -eq $state.targetRevision
                }).Count -gt 0
            } catch { $state.cloudValidation = $false }
        }
    }

    if ($IncludeAzure -and $state.azAuthenticated) {
        $account = Invoke-JsonCommand "az" @("account", "show", "--output", "json")
        $state.subscriptionId = [string]$account.id
        try {
            $group = Invoke-JsonCommand "az" @("group", "show", "--subscription", $AzureSubscriptionId, "--name", $AzureResourceGroup, "--output", "json")
            $state.resourceGroupId = [string]$group.id
            $state.resourceGroupAccessible = $true
        } catch { $state.resourceGroupAccessible = $false }
    }
    return $state
}

$state = if ($FixturePath) {
    Get-Content -Raw $FixturePath | ConvertFrom-Json -AsHashtable
} else {
    Get-LiveState
}

$toolRemediation = @{
    git = "Install Git and reopen the terminal."
    node = "Install Node.js 20.19 or later."
    npm = "Install npm with the supported Node.js distribution."
    gh = "Install GitHub CLI, then run 'gh auth login'."
}
if ($IncludeAzure) { $toolRemediation.az = "Install Azure CLI, then run 'az login'." }
foreach ($tool in $toolRemediation.Keys) {
    $value = $state.tools[$tool]
    if ($value) {
        Add-Result PASS "tool.$tool" ([string]$value) "installed and callable" ""
    } else {
        Add-Result FAIL "tool.$tool" "not found" "installed and callable" $toolRemediation[$tool]
    }
}

$nodeText = [string]$state.tools.node
$nodeMatch = [regex]::Match($nodeText, "v?(?<major>\d+)\.(?<minor>\d+)")
if ($nodeMatch.Success -and (([int]$nodeMatch.Groups["major"].Value -gt 20) -or
    (([int]$nodeMatch.Groups["major"].Value -eq 20) -and ([int]$nodeMatch.Groups["minor"].Value -ge 19)))) {
    Add-Result PASS "tool.node-version" $nodeText "Node.js >= 20.19" ""
} else {
    Add-Result FAIL "tool.node-version" $(if ($nodeText) { $nodeText } else { "unknown" }) "Node.js >= 20.19" "Install Node.js 20.19 or later."
}

if ($state.ghAuthenticated) {
    Add-Result PASS "auth.github" "authenticated" "GitHub CLI authenticated" ""
} else {
    Add-Result FAIL "auth.github" "not authenticated" "GitHub CLI authenticated" "Run 'gh auth login' and authorize access to the team repository."
}
if ($IncludeAzure) {
    if ($state.azAuthenticated) {
        Add-Result PASS "auth.azure" "authenticated" "Azure CLI authenticated" ""
    } else {
        Add-Result FAIL "auth.azure" "not authenticated" "Azure CLI authenticated" "Run 'az login' with the workshop account and select the assigned subscription."
    }
}

$actualRepo = [string]$state.repository
if ($actualRepo -and (!$Repository -or $actualRepo -eq $Repository)) {
    Add-Result PASS "repository.identity" $actualRepo $(if ($Repository) { $Repository } else { "a GitHub owner/repository remote" }) ""
} else {
    Add-Result FAIL "repository.identity" $(if ($actualRepo) { $actualRepo } else { "not detected" }) $Repository "Clone the assigned team repository or pass the correct -Repository owner/name."
}
if ($state.provenanceVerified) {
    Add-Result PASS "repository.template-revision" $ExpectedRevision "fresh app tree matches the approved source tree" ""
} else {
    Add-Result FAIL "repository.template-revision" "starter tree does not match" $ExpectedRevision "Use the approved fresh app starter before Lab 1; do not overwrite learner edits to make this gate pass."
}

foreach ($feature in @(@("issues", "issuesEnabled"), @("actions", "actionsEnabled"))) {
    if ($state[$feature[1]]) {
        Add-Result PASS "github.$($feature[0])" "enabled" "enabled" ""
    } else {
        Add-Result FAIL "github.$($feature[0])" "disabled or unavailable" "enabled" "Ask an organization owner to enable GitHub $($feature[0]) for $actualRepo."
    }
}

if ($IncludeAzure) {
    if ($state.immutableOidc) {
        Add-Result PASS "github.oidc-subject" $state.oidcPrefix "immutable numeric owner/repository prefix" ""
    } else {
        Add-Result FAIL "github.oidc-subject" $(if ($state.oidcPrefix) { $state.oidcPrefix } else { "not configured" }) $(if ($state.expectedOidcPrefix) { $state.expectedOidcPrefix } else { "immutable numeric owner/repository prefix" }) "Run the immutable OIDC setup and repository preparation; do not substitute a name-only subject or client secret."
    }
foreach ($environment in $Environments) {
    if (@($state.environments) -contains $environment) {
        Add-Result PASS "github.environment.$environment" "present" "present" ""
    } else {
        Add-Result FAIL "github.environment.$environment" "missing" "present" "Run the instructor repository preparation for environment '$environment'."
    }
}
foreach ($environment in $Environments) {
    foreach ($variable in $RequiredVariables) {
        if (@($state.environmentVariables[$environment]) -contains $variable) {
            Add-Result PASS "github.environment.$environment.variable.$variable" "present" "present in environment (value not displayed)" ""
        } else {
            Add-Result FAIL "github.environment.$environment.variable.$variable" "missing" "present in environment" "Run repository preparation to set non-secret variable '$variable' in '$environment'."
        }
    }
}

if ($state.subscriptionId -eq $AzureSubscriptionId -and $state.resourceGroupAccessible) {
    Add-Result PASS "azure.scope" $state.resourceGroupId "/subscriptions/$AzureSubscriptionId/resourceGroups/$AzureResourceGroup" ""
} else {
    Add-Result FAIL "azure.scope" "subscription=$($state.subscriptionId); resource-group-access=$($state.resourceGroupAccessible)" "/subscriptions/$AzureSubscriptionId/resourceGroups/$AzureResourceGroup" "Select the assigned subscription and request Reader access to the assigned resource group."
}

if ($state.cloudValidation) {
    Add-Result PASS "cloud.oidc-infrastructure" "successful infra-validate.yml run for current revision" "completed OIDC login, Bicep validation, and Azure what-if" ""
} elseif ($RequireCloudValidation) {
    Add-Result FAIL "cloud.oidc-infrastructure" "NOT_YET_RUN" "successful infra-validate.yml run for current revision" "Run Azure infrastructure validation from the team repository and resolve OIDC or what-if failures before Lab 1."
} else {
    Add-Result ADVISORY "cloud.oidc-infrastructure" "NOT_YET_RUN" "successful infra-validate.yml run before Lab 1" "Run Azure infrastructure validation before the readiness gate."
}
}

Add-Result MANUAL "copilot.app" "shell detection is not reliable" "Copilot App installed and signed in" "Open the App and record this check manually."
Add-Result MANUAL "copilot.session" "UI capability must be checked" "repository Session with files and Plan canvas" "Use Sessions > + > Start session in, select your repo, and confirm the file editor and Plan canvas."
Add-Result MANUAL "copilot.fusion" "model availability must be checked" "a bounded Fusion prompt has been tried" "Select an available Fusion effort level, run the opening prompt, and record the actual capability."
Add-Result MANUAL "ghaw.engine" "billing and policy must be checked" "eligible per-run Copilot inference before Lab 5" "Confirm organization Copilot billing and Actions policy; do not add a long-lived token workaround."

$document = [ordered]@{
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    evidenceSource = if ($FixturePath) { "fixture" } else { "live" }
    repository = $actualRepo
    sourceRevision = $ExpectedRevision
    startingCommit = [string]$state.targetRevision
    includeAzure = [bool]$IncludeAzure
    results = $results
    summary = [ordered]@{
        pass = @($results | Where-Object status -eq "PASS").Count
        fail = @($results | Where-Object status -eq "FAIL").Count
        advisory = @($results | Where-Object status -eq "ADVISORY").Count
        manual = @($results | Where-Object status -eq "MANUAL").Count
    }
}

foreach ($result in $results) {
    $color = switch ($result.status) { "PASS" { "Green" } "FAIL" { "Red" } "ADVISORY" { "Yellow" } default { "Cyan" } }
    Write-Host ("[{0}] {1}: {2}" -f $result.status, $result.id, $result.observed) -ForegroundColor $color
    if ($result.status -ne "PASS") { Write-Host ("       Expected: {0}`n       Action: {1}" -f $result.expected, $result.remediation) }
}
if ($JsonOutput) {
    $document | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 $JsonOutput
    Write-Host "Structured results: $JsonOutput"
}
if ($document.summary.fail -gt 0) {
    Write-Host "PREFLIGHT BLOCKED: $($document.summary.fail) required check(s) failed." -ForegroundColor Red
    exit 1
}
Write-Host "PREFLIGHT READY ($($document.evidenceSource)): all automated blocking checks passed; complete MANUAL checks separately." -ForegroundColor Green
exit 0
