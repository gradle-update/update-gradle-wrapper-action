# Changelog

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
