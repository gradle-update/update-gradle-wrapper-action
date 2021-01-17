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

const PULL_REQUEST_DATA = 'pull_request_data';
const ERRORED_REVIEWERS = 'errored_reviewers';

export interface PullRequestData {
  url: string;
  number: number;
}

export function setPullRequestData(pullRequestData: PullRequestData) {
  core.saveState(PULL_REQUEST_DATA, JSON.stringify(pullRequestData));
}

export function getPullRequestData(): PullRequestData | undefined {
  const state = core.getState(PULL_REQUEST_DATA);
  return state.length ? (JSON.parse(state) as PullRequestData) : undefined;
}

export function setErroredReviewers(reviewers: string[]) {
  core.saveState(ERRORED_REVIEWERS, JSON.stringify(reviewers));
}

export function getErroredReviewers(): string[] | undefined {
  const reviewers = core.getState(ERRORED_REVIEWERS);
  return reviewers.length ? (JSON.parse(reviewers) as string[]) : undefined;
}
