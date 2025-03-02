# Update Gradle Wrapper Action

![CI](https://github.com/gradle-update/update-gradle-wrapper-action/workflows/CI/badge.svg)

This action keeps the [Gradle
Wrapper](https://docs.gradle.org/current/userguide/gradle_wrapper.html) script in
your projects up-to-date to the latest release.

Schedule an automatic daily or weekly workflow: as soon
as a new Gradle release is available, the action will open a PR ready to be
merged. It's like [Dependabot](https://github.com/dependabot) for Gradle Wrapper. 🤖✨

![Pull
Request](https://user-images.githubusercontent.com/316923/93274006-8922ef80-f7b9-11ea-8ec7-85c2704270eb.png
"Automatic Pull Request to update Gradle Wrapper")

## Table of Contents

- [Usage](#usage)
- [Why shoud I use this action?](#why-should-i-use-this-action)
- [Action inputs](#action-inputs)
  - [`repo-token`](#repo-token)
  - [`reviewers`](#reviewers)
  - [`team-reviewers`](#team-reviewers)
  - [`labels`](#labels)
  - [`base-branch`](#base-branch)
  - [`target-branch`](#target-branch)
  - [`paths`](#paths)
  - [`paths-ignore`](#paths-ignore)
  - [`set-distribution-checksum`](#set-distribution-checksum)
  - [`distributions-base-url`](#distributions-base-url)
  - [`release-channel`](#release-channel)
  - [`merge-method`](#merge-method)
  - [`pr-title-template`](#pr-title-template)
  - [`pr-message-template`](#pr-message-template)
  - [`commit-message-template`](#commit-message-template)
- [Examples](#examples)
  - [Scheduling action execution](#scheduling-action-execution)
  - [Targeting a custom branch](#targeting-a-custom-branch)
  - [Updating to the latest Release Candidate version](#updating-to-the-latest-release-candidate-version)
  - [Ignoring subprojects folders with `paths-ignore`](#ignoring-subprojects-folders-with-paths-ignore)
  - [Using `paths` and `paths-ignore` together](#using-paths-and-paths-ignore-together)
- [FAQ](#faq)
  - [Running CI workflows in Pull Requests created by the action](#running-ci-workflows-in-pull-requests-created-by-the-action)
  - [Android Studio warning about `distributionSha256Sum`](#android-studio-warning-about-distributionsha256sum)
- [Debugging](#debugging)
- [License](#license)

## Usage

Create a new dedicated workflow file:

`.github/workflows/update-gradle-wrapper.yml`

Paste this configuration:

```yaml
name: Update Gradle Wrapper

on:
  schedule:
    - cron: "0 0 * * *"

jobs:
  update-gradle-wrapper:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Update Gradle Wrapper
        uses: gradle-update/update-gradle-wrapper-action@v2
```

The action will run every day around midnight, check if a new Gradle version is
available and create a Pull Request to update the Gradle Wrapper script.

Check the detailed description of [action inputs](#action-inputs) and some more
[usage examples](#examples).

## Why should I use this action?

Gradle Wrapper is the recommended way to setup Gradle in your project. The
Wrapper is a script that downloads and invokes a declared Gradle version. By
checking the Wrapper into version control you make the build process more
standardised, easy and reliable.

Maintaining dependencies up-to-date is regarded as a good practice, and the
build system files should be no exception. Unfortunately, often times developers
add the Wrapper to the project repository once and just forget about it.

The Update Gradle Wrapper Action aims to help keeping Gradle projects on GitHub
polished to high standards and to strengthen the software supply chain in the
Gradle ecosystem.

### Hygiene

Gradle is under heavy development, with new releases available every few weeks.
Projects that stick to old Wrapper versions can't benefit from the tons of
features and bug fixes being rolled out.

Updating the build system only once or twice per year might become a tedious
task. You will need to walk through longer changelogs and handle any breaking
change. Updating frequently helps do less work, take advantage of new features
earlier and safely drop deprecated functionality.

This action runs automatically at the declared schedule and creates Pull
Requests with detailed information about the version update.

![Pull Request
description](https://user-images.githubusercontent.com/316923/93386801-8af7bc00-f868-11ea-8bfb-3a931a596590.png
"Pull Request with Release Notes")

### Security

At the hearth of the Gradle Wrapper script is a `.jar` binary blob of executable
code. Checking that blob into a repository makes the developer experience quite
convenient but has important security implications.

A `gradle-wrapper.jar` that has been tampered with could execute or fetch any
arbitrary code. Pull Requests that update the Wrapper are genuinely hard to
review, as GitHub will show an empty binary diff.

![Empty binary
diff](https://user-images.githubusercontent.com/316923/93386924-b7abd380-f868-11ea-9f95-74cbf2ffeb80.png
"gradle-wrapper.jar shows an empty diff")

This action verifies the integrity of the `gradle-wrapper.jar` file being
updated by comparing its SHA-256 checksum against the official checksum value
published by Gradle authors. Moreover, the action configures the Wrapper so that
the Gradle executable itself can be verified once it is downloaded locally.

## Action inputs

This is the list of supported inputs:

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| [`repo-token`](#repo-token) | `GITHUB_TOKEN` or a Personal Access Token (PAT) with `repo` scope. | No | `GITHUB_TOKEN` |
| [`reviewers`](#reviewers) | List of users to request a review from (comma or newline-separated). | No | (empty) |
| [`team-reviewers`](#team-reviewers) | List of teams to request a review from (comma or newline-separated). | No | (empty) |
| [`labels`](#labels) | List of labels to set on the Pull Request (comma or newline-separated). | No | (empty) |
| [`base-branch`](#base-branch) | Base branch where the action will run and update the Gradle Wrapper. | No | The default branch name of your repository. |
| [`target-branch`](#target-branch) | Branch to create the Pull Request against. | No | The default branch name of your repository. |
| [`paths`](#paths) | List of paths where to search for Gradle Wrapper files (comma or newline-separated). | No | (empty) |
| [`paths-ignore`](#paths-ignore) | List of paths to be excluded when searching for Gradle Wrapper files (comma or newline-separated). | No | (empty) |
| [`set-distribution-checksum`](#set-distribution-checksum) | Whether to set the `distributionSha256Sum` property. | No | `true` |
| [`distributions-base-url`](#distributions-base-url) | Set a custom url to download the Gradle Wrapper zip file from. | No | (empty) |
| [`release-channel`](#release-channel) | Which Gradle release channel to use: either `stable` or `release-candidate`. | No | `stable` |
| [`merge-method`](#merge-method) | Which merge method to use for [auto-merge](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request). Valid values include `MERGE`, `REBASE`, or `SQUASH`.  If unset, automerge will not be enabled on opened PRs. | No | (unset) No auto-merge |
| [`pr-title-template`](#pr-title-template) | The template to use for the title of the pull request created by this action | No | `Update Gradle Wrapper from %sourceVersion% to %targetVersion%` |
| [`pr-message-template`](#pr-message-template) | The template to use for the description of the pull request created by this action | No | (empty) |
| [`commit-message-template`](#commit-message-template) | The template to use for the commit message created by this action | No | `Update Gradle Wrapper from %sourceVersion% to %targetVersion%` |

---

### `repo-token`

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| `repo-token` | `GITHUB_TOKEN` or a Personal Access Token (PAT) with `repo` scope. | No | `GITHUB_TOKEN` |

Set the authorisation token used by the action to perform tasks through the
GitHub API and to execute authenticated git commands.

If empty, it defaults to the `GITHUB_TOKEN` that is installed in your
repository, which is equivalent to the following configuration:

```yaml
with:
  repo-token: ${{ secrets.GITHUB_TOKEN }}
```

Note that, when using the `GITHUB_TOKEN`, Pull Requests created by the Update
Gradle Wrapper action cannot trigger any workflow run in your repository. This
is a restriction of GitHub Actions to avoid accidentally creating recursive
workflow runs ([read
more](https://docs.github.com/en/actions/reference/events-that-trigger-workflows#triggering-new-workflows-using-a-personal-access-token)).

So, for example, if you have any `on: pull_request` or `on: push` workflow that
runs CI checks on Pull Requests, they won't be triggered if the `repo-token` is
left empty or if you set it to `GITHUB_TOKEN`.

The recommended workaround is to [create a Personal Access Token
(PAT)](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token)
with `repo` scope and add it [as a
secret](https://docs.github.com/en/actions/reference/encrypted-secrets#creating-encrypted-secrets-for-a-repository)
into your repository. Then, set the `repo-token` to access your secret PAT:

```yaml
with:
  repo-token: ${{ secrets.GRADLE_UPDATE_PAT }}
```

Read this [paragraph](#running-ci-workflows-in-pull-requests-created-by-the-action) for more details on the topic.

---

### `reviewers`

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| `reviewers` | List of users to request a review from (comma or newline-separated). | No | (empty) |

Request a review from these GitHub usernames (notifications will be triggered).

For example, use a comma-separated list:

```yaml
with:
  reviewers: username1, username2
```

or add each reviewer on a different line (no comma needed):

```yaml
with:
  reviewers: |
    username1
    username2
```

Note that if you're using a Personal Access Token (PAT) as `repo-token` you cannot request a review from the user that the PAT belongs to.

---

### `team-reviewers`

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| `team-reviewers` | List of teams to request a review from (comma or newline-separated). | No | (empty) |

Request a review from these teams (notifications will be triggered).

For example, use a comma-separated list:

```yaml
with:
  team-reviewers: team1, team2
```

or add each team on a different line (no comma needed):

```yaml
with:
  team-reviewers: |
    team1
    team2
```

Note that you might need to use a Personal Access Token (PAT) as `repo-token` in order to request a review from a team in your organisation.

---

### `labels`

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| `labels` | List of labels to set on the Pull Request (comma or newline-separated). | No | (empty) |

Add custom labels to the Pull Request.

For example, use a comma-separated list:

```yaml
with:
  labels: automated pr, dependencies
```

or add each label on a different line (no comma needed):

```yaml
with:
  labels: |
    automated pr
    dependencies
```

Label names can include spaces. Note that the action will create a label if it doesn't already exist within your organisation.

---

### `base-branch`

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| `base-branch` | Base branch where the action will run and update the Gradle Wrapper. | No | The default branch name of your repository. |

The name of the branch used as a base when running the update process. The action will switch (i.e. `git checkout`) to this branch before updating the `gradle-wrapper.jar` file. By default the repository's "[default branch](https://docs.github.com/en/github/setting-up-and-managing-your-github-user-account/managing-the-default-branch-name-for-your-repositories)" is used (most commonly `master`).

```yaml
with:
  base-branch: gradle-testing
```

---

### `target-branch`

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| `target-branch` | Branch to create Pull Requests against. | No | The default branch name of your repository. |

The name of the branch to push changes into. By default the repository's "[default branch](https://docs.github.com/en/github/setting-up-and-managing-your-github-user-account/managing-the-default-branch-name-for-your-repositories)" is used (most commonly `master`).

For example:

```yaml
with:
  target-branch: unstable
```

---

### `paths`

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| `paths` | List of paths where to search for Gradle Wrapper files (comma or newline-separated). | No | (empty) |

By default all Gradle Wrapper files in the source tree will be autodiscovered and considered for update. Use `paths` to provide a specific list of paths where to look for `gradle-wrapper.jar`.

For example, use a comma-separated list:

```yaml
with:
  paths: project-web/**, project-backend/**
```

or add each path on a different line (no comma needed):

```yaml
with:
  paths: |
    project-web/**
    project-backend/**
```

This input accepts glob patterns that use characters like `*` and `**`, for more information see [GitHub's cheat sheet](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#filter-pattern-cheat-sheet).

`paths` and `paths-ignore` can be used together. `paths` is always evaluated before `paths-ignore`, look at [this example](#using-paths-and-paths-ignore-together).

---

### `paths-ignore`

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| `paths-ignore` | List of paths to be excluded when searching for Gradle Wrapper files (comma or newline-separated). | No | (empty) |

By default all Gradle Wrapper files in the source tree will be autodiscovered and considered for update. Use `paths-ignore` to specify paths that should be ignored during scan.

For example, use a comma-separated list:

```yaml
with:
  paths-ignore: project-docs/**, project-examples/**
```

or add each path on a different line (no comma needed):

```yaml
with:
  paths-ignore: |
    project-docs/**
    project-examples/**
```

This input accepts glob patterns that use characters like `*` and `**`, for more information see [GitHub's cheat sheet](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#filter-pattern-cheat-sheet).

`paths` and `paths-ignore` can be used together. `paths-ignore` is always evaluated after `paths`, look at [this example](#using-paths-and-paths-ignore-together).

---

### `set-distribution-checksum`

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| `set-distribution-checksum` | Whether to set the `distributionSha256Sum` property. | No | `true` |

The Gradle Wrapper provides a way to increase security against attackers
tampering with the Gradle distribuition file you download locally.
If the `distributionSha256Sum` property is added to
`gradle-wrapper.properties`, Gradle will report a build failure in case the
specified checksum doesn't match the checksum of the distribution downloaded
from server (this is only performed once, the first time you download a new
Gradle version).

The Update Gradle Wrapper action sets the expected checksum for you. If you
want to disable this behaviour change the `set-distribution-checksum` input
to `false`.

It is not recommended to change this value unless you've got a very specific
need (e.g. [Android Studio warnings](#android-studio-warning-about-distributionsha256sum)).

For example:

```yaml
with:
  set-distribution-checksum: false
```

---

### `distributions-base-url`

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| `distributions-base-url` | Set a custom url to download the Gradle Wrapper zip file from. | No | (empty) |

The base url to download the Gradle Wrapper zip file from. By default, the Gradle Wrapper update mechanism will download any newer version from the official repository.

For example:

```yaml
with:
  distributions-base-url: 'https://your-domain.com/gradle-release'
```

---

### `release-channel`

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| `release-channel` | Which release channel to use: `stable` or `release-candidate`. | No | `stable` |

Gradle's release channel used to update. By default `stable` is used which corresponds to the latest stable release.
Alternatively, `release-candidate` can be used to update to the most recent release candidate.

For example:

```yaml
with:
  release-channel: release-candidate
```

---

### `merge-method`

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| [`merge-method`](#merge-method) | Which merge method to use for [auto-merge](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request). Valid values include `MERGE`, `REBASE`, or `SQUASH`.  If unset, automerge will not be enabled on opened PRs. | No | (unset) No auto-merge |

The merge method to use for [auto-merge](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request). By default auto-merge will not be enabled; set this to one of the valid merge methods to enable auto-merge.

For example:

```yaml
with:
  merge-method: SQUASH
```

---

### `pr-title-template`

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| `pr-title-template` | The template to use for the title of the pull request created by this action | No | `Update Gradle Wrapper from %sourceVersion% to %targetVersion%` |

This input is used for the title of the pull request created by this action. This allows, for example, for better integration into repositories which make use of commit message patterns like [Conventional Commits](https://www.conventionalcommits.org/).

`%sourceVersion%` and `%targetVersion%` will be replaced by the current/old and the new version of the Gradle Wrapper respectively.

There are cases in which the source version of the Gradle Wrapper can not be determined successfully. In such cases, the string `undefined` will be used to replace the source version placeholder.

For example:

```yaml
with:
  pr-title-template: 'chore(deps): Bump Gradle Wrapper from %sourceVersion% to %targetVersion%'
```

---

### `pr-message-template`

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| `pr-message-template` | The template to use for the description of the pull request created by this action | No | (empty) |

This input is used for the description of the pull request created by this action.

`%sourceVersion%` and `%targetVersion%` will be replaced by the current/old and the new version of the Gradle Wrapper respectively.

There are cases in which the source version of the Gradle Wrapper can not be determined successfully. In such cases, the string `undefined` will be used to replace the source version placeholder.

For example:

```yaml
with:
  pr-message-template: 'Upgrading the Gradle Wrapper from version %sourceVersion% to %targetVersion%.'
```

---

### `commit-message-template`

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| `commit-message-template` | The template to use for the commit message created by this action | No | `Update Gradle Wrapper from %sourceVersion% to %targetVersion%` |

This input is used for the message of the commit created by this action. This allows for better integration into
repositories which make use of commit message patterns like [Conventional Commits](https://www.conventionalcommits.org/).

`%sourceVersion%` and `%targetVersion%` will be replaced by the current/old and the new version of the Gradle Wrapper respectively.

There are cases in which the source version of the Gradle Wrapper can not be determined successfully. In such cases, the string `undefined` will be used to replace the source version placeholder.

For example:

```yaml
with:
  commit-message-template: 'chore(deps): Bump Gradle Wrapper from %sourceVersion% to %targetVersion%'
```

## Examples

### Scheduling action execution

You should run this action on a dedicated workflow using a `schedule` trigger
event:

```yaml
on:
  schedule:
    # every day at 2am
    - cron: "0 2 * * *"
```

or

```yaml
on:
  schedule:
    # every week on Monday at 8am
    - cron: "0 8 * * MON"
```

Use the [POSIX cron
syntax](https://docs.github.com/en/actions/reference/events-that-trigger-workflows#scheduled-events)
to specify your preferred time or frequency (tip: check your value is correct
with [crontab guru](https://crontab.guru/examples.html)).

It is not recommended to run the action more frequently than once a day.

### Targeting a custom branch

The action will create Pull Requests against the "[default branch](https://docs.github.com/en/github/setting-up-and-managing-your-github-user-account/managing-the-default-branch-name-for-your-repositories)" of your repository (say, `master` or any other branch you've configured).

If you want Pull Requests to be created against a non-default branch use the `target-branch` input:

```yaml
with:
  target-branch: v2-dev
```

### Updating to the latest Release Candidate version

The action supports more Gradle release channels. By default, when the action runs it will check for the latest `stable` release. If your project depends on the release candidate version of Gradle, use `release-channel` to configure which release information to download:

```yaml
with:
  release-channel: release-candidate
```

### Ignoring subprojects folders with `paths-ignore`

There are cases where your repository contains folders for projects or subprojects that need to be kept at an older Gradle version.

If you want to ignore such files when the action runs, use `paths-ignore` to configure project paths that contain Gradle Wrapper files that should not be updated.

```yaml
with:
  paths-ignore: examples/**
```

### Using `paths` and `paths-ignore` together

`paths` and `paths-ignore` works as allowlist and blocklist systems. The evaluation rule is as follows:

- the source tree is searched for all `gradle-wrapper.jar` files and the list is passed to the next step
- if `paths` is not empty, the paths that match the specified patterns are passed to the next step
- if `paths-ignore` is not empty, the paths that match the specified patterns are removed from the list

For example, the following configuration will search for Gradle Wrapper files in the `sub-project` directory and its subdirectories, but not in the `sub-project/examples` directory.

```yaml
with:
  paths: sub-project/**
  paths-ignore: sub-project/examples/**
```

## FAQ

### Running CI workflows in Pull Requests created by the action

By default, if the `repo-token` input is left empty or if you set it to `GITHUB_TOKEN`, Pull Requests created by the Update Gradle Wrapper action do not trigger any other workflow. So, for example, if you have any `on: pull_request` or `on: push` workflow that runs CI checks on Pull Requests, they won't normally be triggered.

This is a restriction imposed by GitHub Actions to avoid accidentally creating recursive workflow runs ([read more](https://docs.github.com/en/actions/reference/events-that-trigger-workflows#triggering-new-workflows-using-a-personal-access-token)).

Here is what you can do to trigger additional workflows:

- Manual trigger: when you use the default `GITHUB_TOKEN` the Pull Request won't run any of the configured workflows, but you can manually close and immediately reopen the Pull Request to trigger the `on: pull_request` workflows.

- Use a [Personal Access Token](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token): create a PAT with the `repo` scope and add it [as a secret](https://docs.github.com/en/actions/reference/encrypted-secrets#creating-encrypted-secrets-for-a-repository) into your repository. Then configure the [`repo-token`](#repo-token) input to use such encrypted secret. Note that the Pull Request author will be set to the GitHub user that the PAT belongs to: as Pull Request author, this user cannot be assigned as reviewer and cannot approve it.

- Use a Personal Access Token of a dedicated account: use a PAT that belongs to a machine account with collaborator access to your repository.

### Android Studio warning about `distributionSha256Sum`

You might get a warning message in Android Studio that looks like this:

> It is not fully supported to define distributionSha256Sum in gradle-wrapper.properties.

This refers to the presence of the `distributionSha256Sum` property into
`gradle-wrapper.properties`, which Update Gradle Wrapper action sets by default
to increase security against the risk of the Gradle distribution being tampered
with.

It is totally safe to disable the warning in Android Studio, just choose the option:

> Use "..." as checksum for https://.../gradle-6.6.1-bin.zip and sync project

On the other hand, if for some reason you prefer to avoid the
`distributionSha256Sum` property being set automatically by the action use the
[`set-distribution-checksum`](#set-distribution-checksum):

```yaml
with:
  # not recommended
  set-distribution-checksum: false
```

## Debugging

Debug logs are disabled by default in GitHub actions. To see any debug output
in the workflow execution logs, [add a
secret](https://docs.github.com/en/actions/configuring-and-managing-workflows/creating-and-storing-encrypted-secrets)
named `ACTIONS_STEP_DEBUG` with value `true` in your repository.

![Adding a
secret](https://user-images.githubusercontent.com/316923/93029810-598bb000-f61e-11ea-914d-822fb44b2128.png
"Add the secret ACTIONS_STEP_DEBUG to your repository")

## License

The Update Gradle Wrapper Action is licensed under the [Apache License
2.0](LICENSE).
