// Copyright 2020-2021 Cristian Greco
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
import {GitListMatchingRefsResponseData} from '@octokit/types';
import * as core from '@actions/core';

import {GitHubApi, IGitHubApi} from './gh-api';
import {Inputs} from '../inputs';
import {PullRequestData} from '../store';
import {pullRequestText} from '../messages';
import {Release} from '../releases';

const DEFAULT_LABEL = 'gradle-wrapper';

export type MatchingRefType = GitListMatchingRefsResponseData[0] | undefined;

export class GitHubOps {
  private inputs: Inputs;
  private api: IGitHubApi;
  private octokit;

  constructor(inputs: Inputs, api?: IGitHubApi) {
    this.inputs = inputs;
    this.api = api ?? new GitHubApi(inputs.repoToken);
    this.octokit = getOctokit(inputs.repoToken);
  }

  async findMatchingRef(targetVersion: string): Promise<MatchingRefType> {
    const refName = `heads/gradlew-update-${targetVersion}`;

    const {data: refs} = await this.octokit.git.listMatchingRefs({
      owner: context.repo.owner,
      repo: context.repo.repo,
      ref: refName
    });

    if (refs.length) {
      const matchingRefs = refs.filter(ref => ref.ref === `refs/${refName}`);

      if (matchingRefs.length === 1) {
        return matchingRefs[0];
      }
    }

    return;
  }

  async createPullRequest(
    branchName: string,
    distTypes: Set<string>,
    targetRelease: Release,
    sourceVersion?: string
  ): Promise<PullRequestData> {
    const targetBranch =
      this.inputs.targetBranch !== ''
        ? this.inputs.targetBranch
        : await this.api.repoDefaultBranch();

    core.debug(`Target branch: ${targetBranch}`);

    const {title, body} = pullRequestText(
      distTypes,
      targetRelease,
      sourceVersion
    );

    const pullRequest = await this.api.createPullRequest({
      branchName: `refs/heads/${branchName}`,
      target: targetBranch,
      title,
      body
    });

    core.debug(`PullRequest number: ${pullRequest.number}`);
    core.debug(`PullRequest changed files: ${pullRequest.changed_files}`);

    await this.api.createLabelIfMissing(DEFAULT_LABEL);

    await this.api.addLabels(pullRequest.number, [
      DEFAULT_LABEL,
      ...this.inputs.labels
    ]);

    await this.api.addReviewers(pullRequest.number, this.inputs.reviewers);

    return {
      url: pullRequest.html_url,
      number: pullRequest.number
    };
  }
}
