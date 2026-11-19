param(
    [Parameter(Mandatory, Position = 0)]
    [ValidateSet('spec-template')]
    [string]$TemplateName,
    [switch]$Json
)

$ErrorActionPreference = 'Stop'
$specifyRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
# shortcut: only the local template is supported; use the upstream resolver before adding presets or extensions.
if (Test-Path -LiteralPath (Join-Path $specifyRoot 'extensions.yml')) {
    throw 'Local resolver does not support extension layers. Install the upstream Spec Kit resolver first.'
}
$templatePath = Join-Path $specifyRoot "templates/$TemplateName.md"
$content = Get-Content -LiteralPath $templatePath -Raw
if ($Json) {
    @{ TEMPLATE_CONTENT = $content } | ConvertTo-Json -Compress
} else {
    $content
}
