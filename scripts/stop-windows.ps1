$ErrorActionPreference = "Stop"

$containerId = docker ps -a --filter "name=^/microprelegal$" --format "{{.ID}}"
if ($containerId) {
    docker rm -f microprelegal *> $null
    Write-Host "Stopped microprelegal."
} else {
    Write-Host "microprelegal was not running."
}
