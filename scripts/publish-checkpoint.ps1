[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$')]
    [string]$SourceRepository,

    [Parameter(Mandatory)]
    [ValidatePattern('^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$')]
    [string]$TargetRepository,

    [Parameter(Mandatory)]
    [ValidateSet('lab1-start', 'lab2-start', 'lab3-start', 'lab4-start', 'lab5-start')]
    [string]$Checkpoint,

    [Parameter(Mandatory)]
    [string]$TargetBranch,

    [Parameter(Mandatory)]
    [string]$ManifestPath,

    [Parameter(Mandatory)]
    [ValidateCount(1, 100)]
    [string[]]$ParticipantLogins,

    [string]$WorkingDirectory = (Join-Path (Get-Location) '.workshop-checkpoint-publish'),

    [string]$EvidencePath,

    [switch]$DryRun,

    [switch]$ConfirmPublication
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-NativeCommand {
    param(
        [Parameter(Mandatory)]
        [string]$FilePath,

        [Parameter(Mandatory)]
        [string[]]$ArgumentList
    )

    $output = @(& $FilePath @ArgumentList 2>&1)
    if ($LASTEXITCODE -ne 0) {
        $rendered = $ArgumentList -join ' '
        throw "$FilePath $rendered failed with exit code $LASTEXITCODE.`n$($output -join [Environment]::NewLine)"
    }

    return ($output -join [Environment]::NewLine).Trim()
}

function Assert-ValidBranchName {
    param([Parameter(Mandatory)][string]$Name)

    if (
        -not $Name.StartsWith('recovery/') -or
        $Name.StartsWith('/') -or
        $Name.EndsWith('/') -or
        $Name.EndsWith('.') -or
        $Name.EndsWith('.lock') -or
        $Name.Contains('..') -or
        $Name.Contains('//') -or
        $Name.Contains('@{') -or
        $Name.IndexOfAny(@('~', '^', ':', '?', '*', '[', '\', ' ')) -ge 0
    ) {
        throw "TargetBranch '$Name' must start with 'recovery/' and be a safe Git branch name."
    }
}

function Get-RequiredProperty {
    param(
        [Parameter(Mandatory)]
        [object]$InputObject,

        [Parameter(Mandatory)]
        [string]$Name,

        [Parameter(Mandatory)]
        [string]$Context
    )

    $property = $InputObject.PSObject.Properties[$Name]
    if ($null -eq $property -or [string]::IsNullOrWhiteSpace([string]$property.Value)) {
        throw "$Context must define '$Name'."
    }

    function Test-RepositoryReadAccess {
        param(
            [Parameter(Mandatory)]
            [string]$Repository,

            [Parameter(Mandatory)]
            [string]$Login
        )

        $encodedLogin = [Uri]::EscapeDataString($Login)
        $output = @(& gh api "repos/$Repository/collaborators/$encodedLogin/permission" --jq '.permission' 2>&1)
        if ($LASTEXITCODE -eq 0) {
            return $true
        }

        $message = $output -join [Environment]::NewLine
        if ($message -match 'HTTP 404|Not Found') {
            return $false
        }

        throw "Unable to verify whether '$Login' can read '$Repository'.`n$message"
    }

    return $property.Value
}

if ($SourceRepository -eq $TargetRepository) {
    throw 'SourceRepository and TargetRepository must be different repositories.'
}

Assert-ValidBranchName -Name $TargetBranch

$resolvedManifestPath = (Resolve-Path -LiteralPath $ManifestPath).Path
$manifest = Get-Content -LiteralPath $resolvedManifestPath -Raw | ConvertFrom-Json

if ([int](Get-RequiredProperty $manifest 'schemaVersion' 'Manifest') -ne 1) {
    throw 'Only checkpoint manifest schemaVersion 1 is supported.'
}

$manifestSource = [string](Get-RequiredProperty $manifest 'sourceRepository' 'Manifest')
if ($manifestSource -ne $SourceRepository) {
    throw "SourceRepository '$SourceRepository' does not match manifest sourceRepository '$manifestSource'."
}

$storage = Get-RequiredProperty $manifest 'storage' 'Manifest'
$storageMode = [string](Get-RequiredProperty $storage 'mode' 'Manifest storage')
if ($storageMode -ne 'private-repository') {
    throw "Manifest storage mode must be 'private-repository'. Branch protection is not a read-access boundary."
}

$accessBoundary = [string](Get-RequiredProperty $storage 'accessBoundary' 'Manifest storage')
if ($accessBoundary -ne 'participants-no-read') {
    throw "Manifest storage accessBoundary must be 'participants-no-read'."
}

$matches = @($manifest.checkpoints | Where-Object { $_.name -eq $Checkpoint })
if ($matches.Count -ne 1) {
    throw "Manifest must contain exactly one '$Checkpoint' entry."
}

$checkpointEntry = $matches[0]
$sourceRef = [string](Get-RequiredProperty $checkpointEntry 'sourceRef' "Checkpoint '$Checkpoint'")
$expectedCommit = [string](Get-RequiredProperty $checkpointEntry 'expectedCommit' "Checkpoint '$Checkpoint'")
$evidenceLabel = [string](Get-RequiredProperty $checkpointEntry 'evidenceLabel' "Checkpoint '$Checkpoint'")
$reviewedBy = [string](Get-RequiredProperty $checkpointEntry 'reviewedBy' "Checkpoint '$Checkpoint'")
$reviewedAt = [string](Get-RequiredProperty $checkpointEntry 'reviewedAt' "Checkpoint '$Checkpoint'")
$validation = Get-RequiredProperty $checkpointEntry 'validation' "Checkpoint '$Checkpoint'"
$validationStatus = [string](Get-RequiredProperty $validation 'status' "Checkpoint '$Checkpoint' validation")
$validationEvidence = [string](Get-RequiredProperty $validation 'evidenceUrl' "Checkpoint '$Checkpoint' validation")

if ($sourceRef -notmatch '^refs/(heads|tags)/') {
    throw "Checkpoint sourceRef '$sourceRef' must be a full refs/heads/* or refs/tags/* ref."
}
if ($expectedCommit -notmatch '^[0-9a-fA-F]{40}$') {
    throw "Checkpoint expectedCommit '$expectedCommit' must be a full 40-character commit SHA."
}
if ($validationStatus -ne 'passed') {
    throw "Checkpoint '$Checkpoint' has not passed validation."
}
if ($evidenceLabel -ne 'instructor-recovery') {
    throw "Checkpoint '$Checkpoint' evidenceLabel must be 'instructor-recovery'."
}

if (-not $DryRun -and -not $ConfirmPublication) {
    throw 'Publication requires -ConfirmPublication. Use -DryRun to validate without publishing.'
}

Invoke-NativeCommand -FilePath 'gh' -ArgumentList @('auth', 'status') | Out-Null

$sourceVisibility = Invoke-NativeCommand -FilePath 'gh' -ArgumentList @(
    'api',
    "repos/$SourceRepository",
    '--jq',
    '.visibility'
)

if ($sourceVisibility -ne 'private') {
    throw "Source repository '$SourceRepository' must be private."
}

foreach ($participant in ($ParticipantLogins | Sort-Object -Unique)) {
    if (Test-RepositoryReadAccess -Repository $SourceRepository -Login $participant) {
        throw "Participant '$participant' can read the private checkpoint source '$SourceRepository'. Remove that access before publishing recovery content."
    }
}

Invoke-NativeCommand -FilePath 'gh' -ArgumentList @(
    'api',
    "repos/$TargetRepository",
    '--jq',
    '.full_name'
) | Out-Null

$encodedRef = [Uri]::EscapeDataString($sourceRef)
$resolvedCommit = Invoke-NativeCommand -FilePath 'gh' -ArgumentList @(
    'api',
    "repos/$SourceRepository/commits/$encodedRef",
    '--jq',
    '.sha'
)

if ($resolvedCommit -ne $expectedCommit.ToLowerInvariant()) {
    throw "Source ref '$sourceRef' resolved to '$resolvedCommit', not reviewed commit '$expectedCommit'."
}

$manifestDigest = (Get-FileHash -LiteralPath $resolvedManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
$sourceUrl = "https://github.com/$SourceRepository.git"
$targetUrl = "https://github.com/$TargetRepository.git"
$scratchName = "checkpoint-$([Guid]::NewGuid().ToString('N'))"
$scratchPath = Join-Path $WorkingDirectory $scratchName

New-Item -ItemType Directory -Path $scratchPath -Force | Out-Null

try {
    Invoke-NativeCommand -FilePath 'gh' -ArgumentList @('auth', 'setup-git') | Out-Null
    Invoke-NativeCommand -FilePath 'git' -ArgumentList @('-C', $scratchPath, 'init', '--bare', '--quiet') | Out-Null
    Invoke-NativeCommand -FilePath 'git' -ArgumentList @('-C', $scratchPath, 'remote', 'add', 'source', $sourceUrl) | Out-Null
    Invoke-NativeCommand -FilePath 'git' -ArgumentList @('-C', $scratchPath, 'remote', 'add', 'target', $targetUrl) | Out-Null
    Invoke-NativeCommand -FilePath 'git' -ArgumentList @(
        '-C',
        $scratchPath,
        'fetch',
        '--quiet',
        '--no-tags',
        '--depth=1',
        'source',
        $sourceRef
    ) | Out-Null

    $fetchedCommit = Invoke-NativeCommand -FilePath 'git' -ArgumentList @(
        '-C',
        $scratchPath,
        'rev-parse',
        'FETCH_HEAD'
    )
    if ($fetchedCommit -ne $resolvedCommit) {
        throw "Fetched commit '$fetchedCommit' does not match API-resolved commit '$resolvedCommit'."
    }

    $existingBranch = Invoke-NativeCommand -FilePath 'git' -ArgumentList @(
        '-C',
        $scratchPath,
        'ls-remote',
        '--heads',
        'target',
        $TargetBranch
    )
    if (-not [string]::IsNullOrWhiteSpace($existingBranch)) {
        throw "Target branch '$TargetBranch' already exists. Choose a new explicit branch name."
    }

    $tree = Invoke-NativeCommand -FilePath 'git' -ArgumentList @(
        '-C',
        $scratchPath,
        'rev-parse',
        "$fetchedCommit`^{tree}"
    )

    $commitMessage = @"
Publish recovery checkpoint $Checkpoint

This branch contains only the reviewed checkpoint snapshot selected by an instructor.

Evidence-Origin: $evidenceLabel
Checkpoint-Name: $Checkpoint
Source-Repository: $SourceRepository
Source-Ref: $sourceRef
Source-Commit: $resolvedCommit
Manifest-SHA256: $manifestDigest
Reviewed-By: $reviewedBy
Reviewed-At: $reviewedAt
Validation-Evidence: $validationEvidence
"@

    $publicationCommit = Invoke-NativeCommand -FilePath 'git' -ArgumentList @(
        '-C',
        $scratchPath,
        '-c',
        'user.name=Workshop checkpoint publisher',
        '-c',
        'user.email=checkpoint-publisher@users.noreply.github.com',
        'commit-tree',
        $tree,
        '-m',
        $commitMessage
    )

    $evidence = [ordered]@{
        schemaVersion      = 1
        mode               = if ($DryRun) { 'dry-run' } else { 'published' }
        evidenceOrigin     = $evidenceLabel
        checkpoint         = $Checkpoint
        sourceRepository   = $SourceRepository
        sourceRef          = $sourceRef
        sourceCommit       = $resolvedCommit
        targetRepository   = $TargetRepository
        targetBranch       = $TargetBranch
        publicationCommit  = $publicationCommit
        manifestSha256     = $manifestDigest
        reviewedBy         = $reviewedBy
        reviewedAt         = $reviewedAt
        validationEvidence = $validationEvidence
        participantAccessChecks = ($ParticipantLogins | Sort-Object -Unique).Count
        recordedAt         = [DateTimeOffset]::UtcNow.ToString('o')
    }

    if (-not $DryRun) {
        Invoke-NativeCommand -FilePath 'git' -ArgumentList @(
            '-C',
            $scratchPath,
            'push',
            '--quiet',
            'target',
            "${publicationCommit}:refs/heads/$TargetBranch"
        ) | Out-Null

        $published = Invoke-NativeCommand -FilePath 'git' -ArgumentList @(
            '-C',
            $scratchPath,
            'ls-remote',
            '--heads',
            'target',
            $TargetBranch
        )
        if ($published -notmatch "^$publicationCommit\s") {
            throw "Published branch '$TargetBranch' could not be verified at commit '$publicationCommit'."
        }
    }

    $evidenceJson = $evidence | ConvertTo-Json -Depth 4
    if (-not [string]::IsNullOrWhiteSpace($EvidencePath)) {
        $evidenceDirectory = Split-Path -Parent $EvidencePath
        if (-not [string]::IsNullOrWhiteSpace($evidenceDirectory)) {
            New-Item -ItemType Directory -Path $evidenceDirectory -Force | Out-Null
        }
        Set-Content -LiteralPath $EvidencePath -Value $evidenceJson -Encoding utf8
    }

    $evidenceJson
}
finally {
    if (Test-Path -LiteralPath $scratchPath) {
        [IO.Directory]::Delete($scratchPath, $true)
    }
}
