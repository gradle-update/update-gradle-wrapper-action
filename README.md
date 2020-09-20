# Update Gradle Wrapper Action

![CI](https://github.com/gradle-update/update-gradle-wrapper-action/workflows/CI/badge.svg)

This action keeps the [Gradle
Wrapper](https://docs.gradle.org/current/userguide/gradle_wrapper.html) script in
your projects up-to-date to the latest release.

Schedule an automatic daily or weekly workflow: as soon
as a new Gradle release is available, the action will open a PR ready to be
merged. It's like [Dependabot](https://dependabot.com) for Gradle Wrapper. 🤖✨

![Pull
Request](https://user-images.githubusercontent.com/316923/93274006-8922ef80-f7b9-11ea-8ec7-85c2704270eb.png
"Automatic Pull Request to update Gradle Wrapper")

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
      - uses: actions/checkout@v2

      - name: Update Gradle Wrapper
        uses: gradle-update/update-gradle-wrapper-action@v1
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
```

The action will run every day around midnight, check if a new Gradle version is
available and create a Pull Request to update the Gradle Wrapper script.

Check the detailed description of [action inputs](#action-inputs) and some more
[usage examples](#examples).

## Why shoud I use this?

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

### `repo-token`

| Name | Description | Required |
| --- | --- | --- |
| `repo-token` | `GITHUB_TOKEN` or a Personal Access Token (PAT) with `repo` scope. | Yes |

This input is needed to allow the action to perform tasks using the GitHub API.

To use the `GITHUB_TOKEN` that is installed in your repository:

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
runs CI checks on Pull Requests, they won't be triggered when using
`GITHUB_TOKEN`.

A recommended workaround is to [create a Personal Access Token
(PAT)](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token)
with `repo` scope and add it [as a
secret](https://docs.github.com/en/actions/reference/encrypted-secrets#creating-encrypted-secrets-for-a-repository)
into your repository.

### `reviewers`

| Name | Description | Required |
| --- | --- | --- |
| `reviewers` | List of users to request a review from (comma, space or newline-separate). | No |

Request a review from these GitHub usernames (notifications will be triggered).

For example:

```yaml
with:
  reviewers: username1 username2
```

or

```yaml
with:
  reviewers: |
    username1
    username2
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
