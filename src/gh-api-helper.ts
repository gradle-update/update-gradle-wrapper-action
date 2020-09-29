// Copyright 2020 Cristian Greco
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {context, getOctokit} from '@actions/github';

import * as core from '@actions/core';

/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  GitListMatchingRefsResponseData,
  IssuesCreateLabelResponseData,
  PullsCreateResponseData
} from '@octokit/types';
/* eslint-enable @typescript-eslint/no-unused-vars */

import {inputs} from './inputs';

const ISSUES_URL =
  'https://github.com/gradle-update/update-gradle-wrapper-action/issues';

const LABEL_NAME = 'gradle-wrapper';

const octokit = getOctokit(inputs.repoToken);

export type MatchingRefType = GitListMatchingRefsResponseData[0] | undefined;

export async function findMatchingRef(
  targetVersion: string
): Promise<MatchingRefType> {
  const {data: refs} = await octokit.git.listMatchingRefs({
    owner: context.repo.owner,
    repo: context.repo.repo,
    ref: `heads/gradlew-update-${targetVersion}`
  });

  return refs.length ? refs[0] : undefined;
}

export async function createPullRequest(
  branchName: string,
  targetVersion: string,
  sourceVersion?: string
): Promise<string> {
  const pullRequest: PullsCreateResponseData = await openPullRequest(
    `refs/heads/${branchName}`,
    targetVersion,
    sourceVersion
  );

  await findLabel();

  await octokit.issues.addLabels({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: pullRequest.number,
    labels: [LABEL_NAME]
  });

  await addReviewers(pullRequest.number, inputs.reviewers);

  return pullRequest.html_url;
}

async function openPullRequest(
  branchName: string,
  targetVersion: string,
  sourceVersion?: string
): Promise<PullsCreateResponseData> {
  const shortMessage = sourceVersion
    ? `Updates Gradle Wrapper from ${sourceVersion} to ${targetVersion}.`
    : `Updates Gradle Wrapper to ${targetVersion}.`;

  const body = `${shortMessage}

See release notes: https://docs.gradle.org/${targetVersion}/release-notes.html

---

🤖 This PR has been created by the [Update Gradle Wrapper](https://github.com/gradle-update/update-gradle-wrapper-action) action.

<details>
<summary>Need help? 🤔</summary>
<br />

If something doesn't look right with this PR please file an issue [here](${ISSUES_URL}).
</details>`;

  const base =
    inputs.targetBranch !== ''
      ? inputs.targetBranch
      : await repoDefaultBranch();
  core.debug(`Target branch: ${base}`);

  const pullRequest = await octokit.pulls.create({
    owner: context.repo.owner,
    repo: context.repo.repo,
    title: shortMessage,
    head: branchName,
    base,
    body
  });

  core.debug(`PullRequest changed files: ${pullRequest.data.changed_files}`);
  core.debug(`PullRequest mergeable: ${pullRequest.data.mergeable}`);
  core.debug(`PullRequest user: ${pullRequest.data.user.login}`);

  return pullRequest.data;
}

async function repoDefaultBranch(): Promise<string> {
  const repo = await octokit.repos.get({
    owner: context.repo.owner,
    repo: context.repo.repo
  });

  return repo.data.default_branch;
}

async function findLabel(): Promise<IssuesCreateLabelResponseData> {
  try {
    const label = await octokit.issues.getLabel({
      owner: context.repo.owner,
      repo: context.repo.repo,
      name: LABEL_NAME
    });

    core.debug(`Label description: ${label.data.description}`);

    return label.data;
  } catch (error) {
    if (error.status !== 404) {
      throw error;
    }

    core.debug('Label not found');

    return await createLabel();
  }
}

async function createLabel(): Promise<IssuesCreateLabelResponseData> {
  const label = await octokit.issues.createLabel({
    owner: context.repo.owner,
    repo: context.repo.repo,
    name: LABEL_NAME,
    color: '02303A',
    description: 'Pull requests that update Gradle wrapper'
  });

  core.debug(`Label id: ${label.data.id}`);

  return label.data;
}

async function addReviewers(pr: number, reviewers: string[]) {
  if (!reviewers.length) {
    core.info('No Pull Request reviewers to add');
    return;
  }

  core.info(`Adding PR reviewers: ${reviewers.join(',')}`);

  try {
    const res = await octokit.pulls.requestReviewers({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: pr,
      reviewers
    });

    if (res.data.requested_reviewers.length !== reviewers.length) {
      core.debug(
        `Added reviewers: ${res.data.requested_reviewers
          .map(r => r.login)
          .join(' ')}`
      );

      core.warning(
        `Unable to set all the PR reviewers, check usernames are correct.`
      );
    }
  } catch (error) {
    if (error.status !== 422) {
      throw error;
    }

    core.warning(error.message);
  }
}
