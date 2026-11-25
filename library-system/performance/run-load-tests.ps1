# Runs every load test of docs/07-performance-security-usability.md.
# Start the backend first (cd backend; npm start), then from the library-system folder:
#   powershell -ExecutionPolicy Bypass -File performance\run-load-tests.ps1 -JMeter C:\apache-jmeter-5.6.3\bin\jmeter.bat
# Each run writes an HTML dashboard to <Results>\<name>\index.html. The folder is outside the repository,
# because a cloud-synced folder (OneDrive) slows the test down while it uploads the files.
# The numbers of all runs are collected in summary.csv next to this script.
# Plug in the laptop charger: on battery Windows slows down background programs such as the API.
param(
  [string]$JMeter = 'jmeter',
  [int]$Duration = 60,
  [int]$Port = 5000,
  [string]$Results = (Join-Path $env:TEMP 'library-load-test')
)

$plan = Join-Path $PSScriptRoot 'library-load-test.jmx'

# name, users browsing books, users logging in
$runs = @(
  @('books-10', 10, 0),
  @('books-50', 50, 0),
  @('books-100', 100, 0),
  @('books-200', 200, 0),
  @('login-10', 0, 10),
  @('login-25', 0, 25),
  @('login-50', 0, 50),
  @('mixed-50-books-25-login', 50, 25)
)

New-Item -ItemType Directory -Force $Results | Out-Null
$summary = @()
foreach ($run in $runs) {
  $name, $booksUsers, $loginUsers = $run
  $folder = Join-Path $Results $name
  $jtl = "$folder.jtl"
  # JMeter refuses to overwrite the results of an earlier run
  if (Test-Path $folder) { Remove-Item -Recurse -Force $folder }
  if (Test-Path $jtl) { Remove-Item -Force $jtl }

  Write-Host "== $name"
  & $JMeter -n -t $plan -l $jtl -e -o $folder -j "$folder.log" "-Jport=$Port" "-Jduration=$Duration" `
    "-JbooksUsers=$booksUsers" "-JloginUsers=$loginUsers"
  if ($LASTEXITCODE -ne 0) { throw "JMeter failed in run $name" }

  # statistics.json is written by JMeter next to the dashboard
  $stats = Get-Content -Raw (Join-Path $folder 'statistics.json') | ConvertFrom-Json
  foreach ($row in $stats.PSObject.Properties.Value | Where-Object { $_.transaction -ne 'Total' }) {
    $summary += [pscustomobject]@{
      run            = $name
      request        = $row.transaction
      users          = if ($row.transaction -like '*login') { $loginUsers } else { $booksUsers }
      samples        = $row.sampleCount
      errors_percent = [math]::Round($row.errorPct, 2)
      avg_ms         = [math]::Round($row.meanResTime)
      median_ms      = [math]::Round($row.medianResTime)
      p95_ms         = [math]::Round($row.pct2ResTime)
      p99_ms         = [math]::Round($row.pct3ResTime)
      max_ms         = [math]::Round($row.maxResTime)
      requests_per_s = [math]::Round($row.throughput, 1)
    }
  }
}

$summary | Export-Csv -NoTypeInformation -Encoding utf8 (Join-Path $PSScriptRoot 'summary.csv')
$summary | Format-Table -AutoSize
