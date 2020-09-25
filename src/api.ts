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
  GetResponseTypeFromEndpointMethod,
  GitListMatchingRefsResponseData,
  IssuesCreateLabelResponseData,
  PullsCreateResponseData
} from '@octokit/types';
/* eslint-enable @typescript-eslint/no-unused-vars */

type GitListMatchingRefsResponseType = GetResponseTypeFromEndpointMethod<
  typeof octokit.git.listMatchingRefs
>;

const ISSUES_URL =
  'https://github.com/gradle-update/update-gradle-wrapper-action/issues';

const LABEL_NAME = 'gradle-wrapper';

const token = core.getInput('repo-token');
const octokit = getOctokit(token);

export type MatchingRefType = GitListMatchingRefsResponseData[0] | undefined;

export async function findMatchingRef(
  version: string
): Promise<MatchingRefType> {
  const {
    data: refs
  }: GitListMatchingRefsResponseType = await octokit.git.listMatchingRefs({
    owner: context.repo.owner,
    repo: context.repo.repo,
    ref: `heads/gradlew-update-${version}`
  });

  return refs.length ? refs[0] : undefined;
}

export async function createPullRequest(
  branchName: string,
  targetVersion: string,
  sourceVersion?: string
): Promise<string> {
  const pullRequest: PullsCreateResponseData = await createPullRequest0(
    branchName,
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

  const reviewers = core
    .getInput('reviewers')
    .split(/[\n\s,]/)
    .map(r => r.trim())
    .filter(r => r.length);

  if (reviewers.length) {
    await addReviewers(pullRequest.number, reviewers);
  }

  return pullRequest.html_url;
}

async function createPullRequest0(
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

<details>
<summary>Need help?</summary>
<br />

If something doesn't look right with this PR please file a bug [here](${ISSUES_URL}) 🙏
</details>`;

  let base = core.getInput('target-branch', {required: false});
  if (!base) {
    base = await repoDefaultBranch();
  }
  core.debug(`Target branch: ${base}`);

  const pr = await octokit.pulls.create({
    owner: context.repo.owner,
    repo: context.repo.repo,
    title: shortMessage,
    head: branchName,
    base,
    body
  });

  core.debug(`PR changed files: ${pr.data.changed_files}`);
  core.debug(`PR mergeable: ${pr.data.mergeable}`);
  core.debug(`PR user: ${pr.data.user.login}`);

  return pr.data;
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
  core.info(`Adding PR reviewers: ${reviewers}`);

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
