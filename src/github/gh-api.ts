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
import {PullsCreateResponseData} from '@octokit/types';
import * as core from '@actions/core';

import * as store from '../store';

export interface IGitHubApi {
  repoDefaultBranch: () => Promise<string>;

  createPullRequest: ({
    branchName,
    target,
    title,
    body
  }: {
    branchName: string;
    target: string;
    title: string;
    body: string;
  }) => Promise<PullsCreateResponseData>;

  addReviewers: (
    pullRequestNumber: number,
    reviewers: string[]
  ) => Promise<void>;

  addLabels: (pullRequestNumber: number, labels: string[]) => Promise<void>;

  createLabelIfMissing: (labelName: string) => Promise<boolean>;

  createLabel: (labelName: string) => Promise<boolean>;
}

export class GitHubApi implements IGitHubApi {
  private octokit;

  constructor(repoToken: string) {
    this.octokit = getOctokit(repoToken);
  }

  async repoDefaultBranch(): Promise<string> {
    const {data: repo} = await this.octokit.repos.get({
      owner: context.repo.owner,
      repo: context.repo.repo
    });

    return repo.default_branch;
  }

  async createPullRequest({
    branchName,
    target,
    title,
    body
  }: {
    branchName: string;
    target: string;
    title: string;
    body: string;
  }): Promise<PullsCreateResponseData> {
    const {data: pullRequest} = await this.octokit.pulls.create({
      owner: context.repo.owner,
      repo: context.repo.repo,
      head: branchName,
      base: target,
      title,
      body
    });

    return pullRequest;
  }

  async addReviewers(pullRequestNumber: number, reviewers: string[]) {
    if (!reviewers.length) {
      core.info('No reviewers to add');
      return;
    }

    core.info(`Requesting review from: ${reviewers.join(',')}`);

    let result;

    try {
      result = await this.octokit.pulls.requestReviewers({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: pullRequestNumber,
        reviewers
      });
    } catch (error) {
      core.warning(
        `Unable to set all the PR reviewers, got error: ${error.message}`
      );
      return;
    }

    if (result?.data.requested_reviewers.length !== reviewers.length) {
      const addedReviewers = result?.data.requested_reviewers.map(r => r.login);
      core.debug(`Added reviewers: ${addedReviewers.join(', ')}`);

      const erroredReviewers = reviewers.filter(
        id => !addedReviewers.includes(id)
      );

      store.setErroredReviewers(erroredReviewers);

      core.warning(
        `Unable to set all the PR reviewers, check the following ` +
          `usernames are correct: ${erroredReviewers.join(', ')}`
      );
    }
  }

  async addLabels(pullRequestNumber: number, labels: string[]) {
    if (!labels.length) {
      core.info('No labels to add');
      return;
    }

    core.info(`Adding labels: ${labels.join(',')}`);

    try {
      await this.octokit.issues.addLabels({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: pullRequestNumber,
        labels
      });
    } catch (error) {
      core.warning(
        `Unable to add all labels to PR, got error: ${error.message}`
      );
    }
  }

  async createLabelIfMissing(labelName: string): Promise<boolean> {
    try {
      const label = await this.octokit.issues.getLabel({
        owner: context.repo.owner,
        repo: context.repo.repo,
        name: labelName
      });

      core.debug(`Label ${labelName} already exists with id: ${label.data.id}`);

      return true;
    } catch (error) {
      if (error.status === 404) {
        core.debug('Label not found');

        return await this.createLabel(labelName);
      }

      return false;
    }
  }

  async createLabel(labelName: string): Promise<boolean> {
    try {
      const label = await this.octokit.issues.createLabel({
        owner: context.repo.owner,
        repo: context.repo.repo,
        name: labelName,
        color: '02303A',
        description: 'Pull requests that update Gradle wrapper'
      });

      core.debug(`Created label ${labelName} with id: ${label.data.id}`);

      return true;
    } catch (error) {
      core.warning(
        `Unable to create label "${labelName}", got error: ${error.message}`
      );
      return false;
    }
  }
}
