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

import * as core from '@actions/core';

import * as gitAuth from '../git/git-auth';
import * as store from '../store';

import {IGitHubApi} from '../github/gh-api';

export class PostAction {
  private githubApi: IGitHubApi;
  private pullRequestData: store.PullRequestData;

  constructor(githubApi: IGitHubApi, pullRequestData: store.PullRequestData) {
    this.githubApi = githubApi;
    this.pullRequestData = pullRequestData;
  }

  async run() {
    try {
      await gitAuth.cleanup();
      await this.reportErroredReviewers();
    } catch (error) {
      core.debug('Post action task failed');
      if (error instanceof Error) {
        core.debug(`error: ${error.message}`);
      }
    }
  }

  private async reportErroredReviewers() {
    let usernames = '';

    const reviewers = store.getErroredReviewers();
    if (reviewers) {
      for (const reviewer of reviewers) {
        usernames += `- @${reviewer}\n`;
      }
    }

    const teams = store.getErroredTeamReviewers();
    if (teams) {
      for (const team of teams) {
        usernames += `- @${team}\n`;
      }
    }

    if (usernames.length) {
      const body = `Unable to set all the PR reviewers, check the following usernames are correct:

${usernames}

Please refer to the documentation for the [\`reviewers\`](https://github.com/gradle-update/update-gradle-wrapper-action#reviewers) \
and [\`team-reviewers\`](https://github.com/gradle-update/update-gradle-wrapper-action#team-reviewers) input parameters.

---

🤖 This is an automatic comment by the Update Gradle Wrapper action.`;

      await this.githubApi.createComment(this.pullRequestData.number, body);
    }
  }
}
