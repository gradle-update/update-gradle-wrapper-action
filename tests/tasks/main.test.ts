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

import * as glob from '@actions/glob';

import {GitHubOps} from '../../src/github/gh-ops';
import {Release, Releases} from '../../src/releases';
import {IGitHubApi} from '../../src/github/gh-api';
import {Inputs} from '../../src/inputs/';
import {MainAction} from '../../src/tasks/main';
import * as gitAuth from '../../src/git/git-auth';

let mainAction: MainAction;
let mockInputs: Inputs;
let mockGitHubApi: IGitHubApi;
let mockGitHubOps: GitHubOps;
let mockReleases: Releases;

const defaultMockInputs: Inputs = {
  repoToken: 's3cr3t',
  reviewers: [],
  teamReviewers: [],
  labels: [],
  baseBranch: '',
  targetBranch: '',
  setDistributionChecksum: true
};

const defaultMockGitHubApi: IGitHubApi = {
  repoDefaultBranch: jest.fn(),
  createPullRequest: jest.fn(),
  addReviewers: jest.fn(),
  addTeamReviewers: jest.fn(),
  addLabels: jest.fn(),
  createLabelIfMissing: jest.fn(),
  createLabel: jest.fn(),
  createComment: jest.fn()
};

beforeEach(() => {
  mockInputs = Object.create(defaultMockInputs);
  mockGitHubApi = Object.create(defaultMockGitHubApi);
  mockGitHubOps = Object.create({
    findMatchingRef: jest.fn(),
    createPullRequest: jest.fn()
  });
  mockReleases = Object.create({
    current: jest.fn()
  });

  mainAction = new MainAction(
    mockInputs,
    mockGitHubApi,
    mockGitHubOps,
    mockReleases
  );
});

describe('run', () => {
  it('creates a Pull Request to update wrapper files', async () => {
    jest.spyOn(gitAuth, 'setup').mockImplementation();

    mockReleases.current = jest.fn().mockReturnValue({
      version: '1.0.0',
      allChecksum: 'dist-all-checksum-value',
      binChecksum: 'dist-bin-checksum-value',
      wrapperChecksum: 'wrapper-jar-checksum-value'
    } as Release);

    mockGitHubOps.findMatchingRef = jest.fn().mockReturnValue(undefined);

    mockGitHubApi.repoDefaultBranch = jest.fn().mockReturnValue('master');

    jest.spyOn(glob, 'create').mockResolvedValue({
      getSearchPaths: jest.fn(),
      glob: jest.fn().mockReturnValue([]),
      globGenerator: jest.fn()
    });

    await mainAction.run();

    expect(mockGitHubApi.repoDefaultBranch).toHaveBeenCalled();
  });
});
