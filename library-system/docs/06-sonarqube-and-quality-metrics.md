# 3.9 SonarQube and Quality Metrics

## Execution record

**Date:** 2026-11-24
**Project:** `library-system`, configured by [`sonar-project.properties`](../sonar-project.properties)
**Status:** SonarQube analysis could not be completed in this environment.

The backend and frontend coverage runs completed and generated the LCOV reports named in the project configuration. The `@sonar/scan` npm wrapper (5.1.0) was installed and checked. Docker Desktop's Linux engine was started, but the `sonarqube:community` image pull did not complete, so the server never became available on `localhost:9000` and the scan could not be submitted. No SonarQube measures or Quality Gate result are claimed below.

To finish the scan, start a working SonarQube Community server and install SonarScanner, then run from the project root:

```powershell
npm exec --yes --package=@sonar/scan -- sonar-scanner-npm -Dsonar.host.url=http://localhost:9000 -Dsonar.token=$env:SONAR_TOKEN
```

Keep the token in an environment variable; do not put it in the project or this report. After the scan, replace the unavailable SonarQube values below with the measures from the project dashboard.

## Available test and defect metrics

| Metric | Result | Source / interpretation |
|---|---:|---|
| Backend line coverage | **100%** | Jest: 100% statements, branches, functions and lines; 363/363 tests passed. |
| Frontend line coverage | **95.02%** | Vitest: 95.37% statements, 98.97% branches, 87.35% functions and 95.02% lines; 62/62 tests passed. |
| Open observed defects | **5** | Local issue register; BB-04 is closed after regression verification. |
| Defect density (approximate) | **5.19 defects/KLOC** | Six distinct defects found in the initial black-box run divided by approximately 1.156 KLOC across 27 production JS/JSX files. The denominator is a simple nonblank/noncomment line count, not SonarQube `ncloc`; treat this as a project estimate. |
| SonarQube code smells | **Not measured** | No successful SonarQube scan. |
| SonarQube technical debt | **Not measured** | No successful SonarQube scan. |
| SonarQube Quality Gate | **Not evaluated** | Requires a server-side analysis. |

Coverage is from the test tools, not SonarQube. The frontend meets the test plan's 80% line and branch target. The defect density uses all six defects found before the BB-04 fix so that it reflects the initial test campaign; five remain open.

## Improvement proposals pending SonarQube confirmation

These actions come from the existing white-box complexity review and black-box defect evidence. They are not presented as SonarQube findings because the scan did not run.

1. **Reduce validation complexity.** `validateBook` has cyclomatic complexity 14. Extract focused checks for text fields and numeric ranges, then preserve the existing boundary tests.
2. **Return correct client-error responses.** Update the Express error handler to map oversized bodies to 413 and malformed encoded paths to 400 instead of 500; retain EP-55 and EP-56 as regression tests.
3. **Harden search and input normalization.** Escape SQL `LIKE` wildcards, normalize ISBN search in the same way as ISBN writes, and tighten email-domain validation. Track BB-01, BB-02 and BB-03 through retest before closure.

## SonarQube fields to record after the scan

| SonarQube measure | Value |
|---|---|
| Coverage | Pending scan |
| Bugs / vulnerabilities / security hotspots | Pending scan |
| Code smells | Pending scan |
| Technical debt and debt ratio | Pending scan |
| Duplications | Pending scan |
| Reliability, security and maintainability ratings | Pending scan |
| Quality Gate | Pending scan |
