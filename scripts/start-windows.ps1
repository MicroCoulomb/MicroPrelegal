$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$envPath = Join-Path $repoRoot ".env"
$openAiApiKey = $null

if (Test-Path $envPath) {
    $envLines = Get-Content $envPath -Encoding Unicode
    foreach ($line in $envLines) {
        if ($line -match '^\s*OPENAI_API_KEY=(.+)\s*$') {
            $openAiApiKey = $matches[1]
            break
        }
    }
}

if (-not $openAiApiKey) {
    throw "OPENAI_API_KEY is missing from $envPath"
}

cmd /c "docker build -t microprelegal `"$repoRoot`" >nul 2>&1"
if ($LASTEXITCODE -ne 0) {
    throw "Failed to build the microprelegal image."
}
$existingContainer = docker ps -a --filter "name=^/microprelegal$" --format "{{.ID}}"
if ($existingContainer) {
    docker rm -f microprelegal *> $null
}
$containerId = docker run -d --name microprelegal -e OPENAI_API_KEY="$openAiApiKey" -p 8000:8000 microprelegal 2>$null
if (-not $containerId) {
    throw "Failed to start the microprelegal container."
}

$runningContainer = docker ps --filter "name=^/microprelegal$" --format "{{.ID}}"
if (-not $runningContainer) {
    throw "microprelegal did not start successfully."
}

Write-Host "Application available at http://localhost:8000"
