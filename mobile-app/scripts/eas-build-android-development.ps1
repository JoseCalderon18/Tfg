$ErrorActionPreference = "Stop"

$env:EAS_NO_VCS = "1"
$env:EAS_PROJECT_ROOT = (Resolve-Path "$PSScriptRoot\..").Path

npx eas-cli build --profile development --platform android --non-interactive --no-wait

if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
