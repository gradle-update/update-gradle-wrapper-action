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
  distributionsBaseUrl: string;
  paths: string[];
  pathsIgnore: string[];
  releaseChannel: string;
  mergeMethod: string | undefined;
  prTitleTemplate: string;
}

export function getInputs(): Inputs {
  return new ActionInputs();
}

const acceptedReleaseChannels = ['stable', 'release-candidate'];

class ActionInputs implements Inputs {
  repoToken: string;
  reviewers: string[];
  teamReviewers: string[];
  labels: string[];
  baseBranch: string;
  targetBranch: string;
  setDistributionChecksum: boolean;
  paths: string[];
  pathsIgnore: string[];
  releaseChannel: string;
  mergeMethod: string | undefined;
  prTitleTemplate: string;
  distributionsBaseUrl: string;

  constructor() {
    this.repoToken = core.getInput('repo-token', {required: false});
    if (this.repoToken === '') {
      throw new Error(`repo-token cannot be empty`);
    }

    this.reviewers = core
      .getInput('reviewers', {required: false})
      .split(/[\n,]/)
      .map(r => r.trim())
      .filter(r => r.length);

    this.teamReviewers = core
      .getInput('team-reviewers', {required: false})
      .split(/[\n,]/)
      .map(r => r.trim())
      .filter(r => r.length);

    this.labels = core
      .getInput('labels', {required: false})
      .split(/[\n,]/)
      .map(l => l.trim())
      .filter(l => l.length);

    this.baseBranch = core.getInput('base-branch', {required: false});

    this.targetBranch = core.getInput('target-branch', {required: false});

    this.distributionsBaseUrl = core.getInput('distributions-base-url', {
      required: false
    });

    this.setDistributionChecksum =
      core
        .getInput('set-distribution-checksum', {required: false})
        .toLowerCase() !== 'false';

    this.paths = core
      .getInput('paths', {required: false})
      .split(/[\n,]/)
      .map(r => r.trim())
      .filter(r => r.length);

    this.pathsIgnore = core
      .getInput('paths-ignore', {required: false})
      .split(/[\n,]/)
      .map(r => r.trim())
      .filter(r => r.length);

    this.releaseChannel = core
      .getInput('release-channel', {required: false})
      .trim()
      .toLowerCase();
    if (!this.releaseChannel) {
      this.releaseChannel = 'stable';
    }

    if (!acceptedReleaseChannels.includes(this.releaseChannel)) {
      throw new Error('release-channel has unexpected value');
    }

    this.mergeMethod = core.getInput('merge-method', {required: false});
    if (!this.mergeMethod) {
      this.mergeMethod = undefined;
    }

    this.prTitleTemplate = core
      .getInput('pr-title-template', {required: false})
      .trim();
    if (!this.prTitleTemplate) {
      this.prTitleTemplate =
        'Update Gradle Wrapper from %sourceVersion% to %targetVersion%';
    }
  }
}
