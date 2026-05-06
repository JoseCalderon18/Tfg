$ErrorActionPreference = "Stop"

$env:EAS_NO_VCS = "1"
$env:EAS_PROJECT_ROOT = (Resolve-Path "$PSScriptRoot\..").Path

$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$rawBuilds = & npx eas-cli build:list --platform android --limit 5 --json 2>$null
$easExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousErrorActionPreference

if ($easExitCode -ne 0) {
  Write-Error "EAS no pudo consultar los builds."
  exit $easExitCode
}

$jsonStart = [string]::Join("`n", $rawBuilds).IndexOf("[")

if ($jsonStart -lt 0) {
  Write-Error "No se pudo leer la respuesta de EAS."
  exit 1
}

$builds = ([string]::Join("`n", $rawBuilds).Substring($jsonStart) | ConvertFrom-Json)
$latestFinished = $builds | Where-Object { $_.status -eq "FINISHED" -and $_.artifacts.buildUrl } | Select-Object -First 1
$latestBuild = $builds | Select-Object -First 1

if ($latestFinished) {
  Write-Output "URL de descarga Android:"
  Write-Output $latestFinished.artifacts.buildUrl
  Write-Output ""
  Write-Output "Pagina del build:"
  Write-Output "https://expo.dev/accounts/adri016/projects/app-emergencias/builds/$($latestFinished.id)"
  exit 0
}

Write-Output "Todavia no hay APK descargable."
if ($latestBuild) {
  Write-Output "Ultimo build: $($latestBuild.id)"
  Write-Output "Estado: $($latestBuild.status)"
  Write-Output "Pagina de logs:"
  Write-Output "https://expo.dev/accounts/adri016/projects/app-emergencias/builds/$($latestBuild.id)"
}

exit 1
