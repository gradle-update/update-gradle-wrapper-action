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

export interface Inputs {
  repoToken: string;
  reviewers: string[];
  teamReviewers: string[];
  labels: string[];
  baseBranch: string;
  targetBranch: string;
  setDistributionChecksum: boolean;
}

export function getInputs(): Inputs {
  return new ActionInputs();
}

class ActionInputs implements Inputs {
  repoToken: string;
  reviewers: string[];
  teamReviewers: string[];
  labels: string[];
  baseBranch: string;
  targetBranch: string;
  setDistributionChecksum: boolean;

  constructor() {
    this.repoToken = core.getInput('repo-token', {required: false}).trim();
    if (this.repoToken === '') {
      throw new Error(`repo-token cannot be empty`);
    }

    this.reviewers = core
      .getInput('reviewers', {required: false})
      .trim()
      .split(/[\n,]/)
      .map(r => r.trim())
      .filter(r => r.length);

    this.teamReviewers = core
      .getInput('team-reviewers', {required: false})
      .trim()
      .split(/[\n,]/)
      .map(r => r.trim())
      .filter(r => r.length);

    this.labels = core
      .getInput('labels', {required: false})
      .trim()
      .split(/[\n,]/)
      .map(l => l.trim())
      .filter(l => l.length);

    this.baseBranch = core.getInput('base-branch', {required: false}).trim();

    this.targetBranch = core
      .getInput('target-branch', {required: false})
      .trim();

    this.setDistributionChecksum =
      core
        .getInput('set-distribution-checksum', {required: false})
        .trim()
        .toLowerCase() !== 'false';
  }
}
