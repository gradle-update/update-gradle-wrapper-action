# Changelog

## v2.1.0

- Added input parameter `pr-message-template`.
- Updated action dependencies.


## v2.0.1

- Updated action dependencies.

## v2.0.0

- Added input parameter `pr-title-template`, by @paulschuberth
- Added input parameter `commit-message-template`, by @paulschuberth
- Added input parameter `distributions-base-url`, by @yeikel
- Updated action to run with Node 20, by @chadlwilson
- Updated action dependencies.

## v1.0.20

- Added `auto-merge` input parameter, by @ChrisCarini

## v1.0.19

- Updated action dependencies.

## v1.0.18

- Added support for release-candidate releases of Gradle (@bountin).
- Updated action dependencies.
- Renamed `master` branch to `main`.

## v1.0.17

- Added `paths` and `paths-ignore` input parameters.
- Updated action dependencies.

## v1.0.16

- Added support for updating `verification-metadata.xml` file, thanks to @dbast (https://github.com/gradle-update/update-gradle-wrapper-action/pull/365)
- Updated action dependencies.

## v1.0.15

- Updated action dependencies and adapted to breaking changes.

## v1.0.14

- Fixed #233: correctly update `gradle-wrapper.jar` file by re-running
  the `wrapper` task.

## v1.0.13

- Added `base-branch` input parameter.

## v1.0.12

- `repo-token` input parameter is not mandatory anymore, and it defaults to `GITHUB_TOKEN` if not specified. Additionally, token authentication in git commands has been fixed.

## v1.0.11

- Added `team-reviewers` input parameter.
- Added failure report (as PR comment) for reviewers assignment.

## v1.0.10

- Added link to Gradle Releases Checksum page in PR message.

## v1.0.9

- Added `labels` input parameter.

## v1.0.8

- In repositories with multiple Wrapper files, each one gets updated in a separate commit.

## v1.0.7

- Added `set-distribution-checksum` input parameter.

## v1.0.6

- Action now updates all Wrapper files of the repository.

## v1.0.5

- Added `target-branch` input parameter.

## v1.0.4

- Action does not run with Docker anymore.

## v1.0.3

- Don't fail in case an error occurs adding PR reviewers.

## v1.0.2

- Added `reviewers` input parameter.

## v1.0.1

- Fixes action name and README.

## v1.0.0

- Initial release.
