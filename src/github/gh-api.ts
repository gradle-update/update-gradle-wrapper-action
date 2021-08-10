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

import {components} from '@octokit/openapi-types';
import {context, getOctokit} from '@actions/github';
import * as core from '@actions/core';

import * as store from '../store';

type PullsCreateResponseData = components['schemas']['pull-request'];

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

  addTeamReviewers: (
    pullRequestNumber: number,
    teams: string[]
  ) => Promise<void>;

  addLabels: (pullRequestNumber: number, labels: string[]) => Promise<void>;

  createLabelIfMissing: (labelName: string) => Promise<boolean>;

  createLabel: (labelName: string) => Promise<boolean>;

  createComment: (pullRequestNumber: number, body: string) => Promise<boolean>;
}

export class GitHubApi implements IGitHubApi {
  private octokit;

  constructor(repoToken: string) {
    this.octokit = getOctokit(repoToken);
  }

  async repoDefaultBranch(): Promise<string> {
    const {data: repo} = await this.octokit.rest.repos.get({
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
    const {data: pullRequest} = await this.octokit.rest.pulls.create({
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

    core.info(`Requesting review from users: ${reviewers.join(',')}`);

    const erroredReviewers: string[] = [];

    for (const reviewer of reviewers) {
      const success = await this.addReviewer(pullRequestNumber, reviewer);
      if (!success) {
        erroredReviewers.push(reviewer);
      }
    }

    if (erroredReviewers.length) {
      core.warning(
        `Unable to set all the PR reviewers, check the following ` +
          `usernames are correct: ${erroredReviewers.join(', ')}`
      );

      store.setErroredReviewers(erroredReviewers);
    }
  }

  async addReviewer(
    pullRequestNumber: number,
    reviewer: string
  ): Promise<boolean> {
    try {
      const result = await this.octokit.rest.pulls.requestReviewers({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: pullRequestNumber,
        reviewers: [reviewer]
      });

      if (!result.data.requested_reviewers) {
        core.warning(`requested_reviewers is empty`);
        return false;
      }

      const requested_reviewers = result.data.requested_reviewers.map(
        user => user?.login
      );

      if (!requested_reviewers.includes(reviewer)) {
        core.warning(`Unable to set PR reviewer ${reviewer}`);
        return false;
      }
    } catch (error) {
      core.warning(
        `Unable to set PR reviewer ${reviewer}, got error: ${error.message}`
      );
      return false;
    }

    return true;
  }

  async addTeamReviewers(
    pullRequestNumber: number,
    teams: string[]
  ): Promise<void> {
    if (!teams.length) {
      core.info('No team reviewers to add');
      return;
    }

    core.info(`Requesting review from teams: ${teams.join(',')}`);

    const erroredTeamReviewers: string[] = [];

    for (const team of teams) {
      const success = await this.addTeamReviewer(pullRequestNumber, team);
      if (!success) {
        erroredTeamReviewers.push(team);
      }
    }

    if (erroredTeamReviewers.length) {
      core.warning(
        `Unable to set all the PR team reviewers, check the following ` +
          `team names are correct: ${erroredTeamReviewers.join(', ')}`
      );

      store.setErroredTeamReviewers(erroredTeamReviewers);
    }
  }

  async addTeamReviewer(
    pullRequestNumber: number,
    team: string
  ): Promise<boolean> {
    try {
      const result = await this.octokit.rest.pulls.requestReviewers({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: pullRequestNumber,
        team_reviewers: [team]
      });

      if (!result.data.requested_teams) {
        core.warning(`requested_teams is empty`);
        return false;
      }

      const requested_teams = result.data.requested_teams.map(t => t.slug);

      if (!requested_teams.includes(team)) {
        core.warning(`Unable to set PR team reviewer ${team}`);
        return false;
      }
    } catch (error) {
      core.warning(
        `Unable to set PR team reviewer ${team}, got error: ${error.message}`
      );
      return false;
    }

    return true;
  }

  async addLabels(pullRequestNumber: number, labels: string[]) {
    if (!labels.length) {
      core.info('No labels to add');
      return;
    }

    core.info(`Adding labels: ${labels.join(',')}`);

    try {
      await this.octokit.rest.issues.addLabels({
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
      const label = await this.octokit.rest.issues.getLabel({
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
      const label = await this.octokit.rest.issues.createLabel({
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

  async createComment(
    pullRequestNumber: number,
    body: string
  ): Promise<boolean> {
    try {
      const result = await this.octokit.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: pullRequestNumber,
        body
      });

      core.debug(
        `Created comment for PR ${pullRequestNumber} with id: ${result.data.id}`
      );

      return true;
    } catch (error) {
      core.warning(
        `Unable to create comment for PR ${pullRequestNumber}, got error: ${error.message}`
      );
      return false;
    }
  }
}
