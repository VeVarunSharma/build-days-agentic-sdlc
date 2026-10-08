[CmdletBinding(SupportsShouldProcess, ConfirmImpact = "High")]
param(
  [Parameter(Mandatory)]
  [ValidatePattern("^[^/]+/[^/]+$")]
  [string]$Repository,

  [string]$BaseBranch,

  [string]$ExerciseBranch = "workshop/lab5-codeql-exercise"
)

$ErrorActionPreference = "Stop"
$marker = "<!-- workshop-lab5-codeql-exercise -->"
$fixturePath = "tests/security-exercise/unsafe-command.ts"
$templateRoot = Join-Path $PSScriptRoot "..\docs\labs\starters\security-exercise"
$manifestPath = Join-Path $templateRoot "exercise.json"
$originalRef = (git branch --show-current).Trim()

function Invoke-Native {
  param(
    [Parameter(Mandatory)]
    [string]$FilePath,

    [Parameter(Mandatory)]
    [string[]]$ArgumentList
  )

  & $FilePath @ArgumentList
  if ($LASTEXITCODE -ne 0) {
    throw "$FilePath failed with exit code $LASTEXITCODE."
  }
}

function Get-GhJson {
  param([Parameter(Mandatory)][string[]]$ArgumentList)

  $output = & gh @ArgumentList
  if ($LASTEXITCODE -ne 0) {
    throw "gh failed with exit code $LASTEXITCODE."
  }

  return $output | ConvertFrom-Json
}

if (-not (Test-Path -LiteralPath $manifestPath)) {
  throw "Security exercise manifest was not found at $manifestPath."
}
if (-not $originalRef) {
  throw "Run the seed script from a named branch, not a detached HEAD."
}

Invoke-Native gh @("auth", "status")

$gitEmail = (git config user.email).Trim()
$gitName = (git config user.name).Trim()
if (-not $gitEmail -or -not $gitName) {
  throw "Configure the instructor git user.name and user.email before seeding."
}

$remoteRepository = (Get-GhJson @(
  "repo", "view", $Repository, "--json", "nameWithOwner,defaultBranchRef"
))
if ($remoteRepository.nameWithOwner -ne $Repository) {
  throw "Authenticated gh identity cannot resolve $Repository."
}
if (-not $BaseBranch) {
  $BaseBranch = $remoteRepository.defaultBranchRef.name
}

$originUrl = (git remote get-url origin).Trim()
if ($originUrl -notmatch [regex]::Escape($Repository)) {
  throw "The origin remote '$originUrl' does not match $Repository."
}

$existingPr = @(Get-GhJson @(
  "pr", "list", "--repo", $Repository, "--state", "all",
  "--head", $ExerciseBranch, "--json", "number,url,isDraft,state"
)) | Select-Object -First 1

if (-not $existingPr) {
  $status = git status --porcelain
  if ($status) {
    throw "Use a clean instructor checkout before creating the exercise branch."
  }

  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  $vulnerableTemplate = Join-Path $templateRoot $manifest.vulnerableTemplate
  if (-not (Test-Path -LiteralPath $vulnerableTemplate)) {
    throw "Vulnerable fixture template was not found at $vulnerableTemplate."
  }

  Invoke-Native git @("fetch", "origin", $BaseBranch)
  $remoteBranch = & git ls-remote --exit-code --heads origin $ExerciseBranch
  $branchExists = $LASTEXITCODE -eq 0

  if (-not $branchExists) {
    if ($PSCmdlet.ShouldProcess(
        "$Repository/$ExerciseBranch",
        "Create and push the isolated CodeQL exercise branch"
      )) {
      try {
        Invoke-Native git @("switch", "--create", $ExerciseBranch, "origin/$BaseBranch")
        $fixtureDirectory = Split-Path -Parent $fixturePath
        New-Item -ItemType Directory -Force -Path $fixtureDirectory | Out-Null
        Copy-Item -LiteralPath $vulnerableTemplate -Destination $fixturePath
        Invoke-Native git @("add", "--", $fixturePath)
        Invoke-Native git @(
          "commit", "-m",
          "Seed isolated Lab 5 CodeQL exercise"
        )
        Invoke-Native git @("push", "--set-upstream", "origin", $ExerciseBranch)
      }
      finally {
        if ($originalRef) {
          Invoke-Native git @("switch", $originalRef)
        }
      }
    }
  }

  $prBody = @"
$marker

Isolated, non-production Lab 5 security exercise.

- Expected CodeQL query: ``js/command-line-injection``
- Fixture: ``$fixturePath``
- Requirement: follow the bounded security exercise contract in the linked issue.
- Completion: replace shell execution with the small allow-list/``execFile`` remediation, then confirm CodeQL and required checks pass.

This draft must not be merged while the CodeQL finding remains.
"@

  if ($PSCmdlet.ShouldProcess(
      "$Repository/$ExerciseBranch",
      "Create the draft remediation pull request"
    )) {
    $prUrl = & gh pr create --repo $Repository --draft --base $BaseBranch `
      --head $ExerciseBranch --title "Lab 5: remediate synthetic command injection" `
      --body $prBody
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to create the draft pull request."
    }
    $existingPr = [pscustomobject]@{
      url = $prUrl.Trim()
      isDraft = $true
      state = "OPEN"
    }
  }
}

$issueSearch = '"Lab 5: remediate deterministic CodeQL finding" in:title'
$existingIssue = @(Get-GhJson @(
  "issue", "list", "--repo", $Repository, "--state", "all",
  "--search", $issueSearch, "--json", "number,url,state"
)) | Select-Object -First 1

if (-not $existingIssue -and $existingPr) {
  $issueBody = @"
$marker

Remediate the synthetic CodeQL finding on $($existingPr.url).

## Evidence contract

- Expected query: ``js/command-line-injection``.
- Acceptance: the deterministic command-injection alert is removed by the supplied safe execution pattern.
- Acceptance: use the supplied allow-list plus ``execFile`` pattern; do not suppress or disable CodeQL.
- Focused validation: confirm the expected alert exists before the fix, push the remediation, and confirm the alert disappears while required checks pass.
- Boundary: the fixture is synthetic, contains no secret, and is excluded from the default branch and production application inputs.
"@

  if ($PSCmdlet.ShouldProcess(
      $Repository,
      "Create the sanitized Lab 5 security exercise issue"
    )) {
    $issueUrl = & gh issue create --repo $Repository `
      --title "Lab 5: remediate deterministic CodeQL finding" `
      --body $issueBody
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to create the security exercise issue."
    }
    $existingIssue = [pscustomobject]@{
      url = $issueUrl.Trim()
      state = "OPEN"
    }
  }
}

Write-Host "Security exercise branch: $ExerciseBranch"
if ($existingPr) {
  Write-Host "Draft pull request: $($existingPr.url)"
}
if ($existingIssue) {
  Write-Host "Issue: $($existingIssue.url)"
}
