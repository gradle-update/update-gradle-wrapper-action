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

import * as commit from '../../src/git/git-commit';
import * as git from '../../src/git/git-cmds';
import * as gitAuth from '../../src/git/git-auth';
import * as store from '../../src/store';
import * as wrapper from '../../src/wrapperInfo';
import * as wrapperFind from '../../src/wrapper/find';
import * as wrapperUpdater from '../../src/wrapperUpdater';

import {GitHubOps} from '../../src/github/gh-ops';
import {IGitHubApi} from '../../src/github/gh-api';
import {Inputs} from '../../src/inputs/';
import {MainAction} from '../../src/tasks/main';
import {Release, Releases} from '../../src/releases';

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
  setDistributionChecksum: true,
  paths: [],
  pathsIgnore: [],
  releaseChannel: '',
  mergeMethod: undefined,
  prTitleTemplate: 'Bump wrapper from %sourceVersion% to %targetVersion%',
  distributionsBaseUrl: ''
};

const defaultMockGitHubApi: IGitHubApi = {
  repoDefaultBranch: jest.fn(),
  createPullRequest: jest.fn(),
  addReviewers: jest.fn(),
  addTeamReviewers: jest.fn(),
  addLabels: jest.fn(),
  createLabelIfMissing: jest.fn(),
  createLabel: jest.fn(),
  createComment: jest.fn(),
  enableAutoMerge: jest.fn()
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
    jest.spyOn(store, 'setMainActionExecuted').mockImplementation();

    jest.spyOn(gitAuth, 'setup').mockImplementation();

    mockReleases.fetchReleaseInformation = jest.fn().mockReturnValue({
      version: '1.0.1',
      allChecksum: 'dist-all-checksum-value',
      binChecksum: 'dist-bin-checksum-value',
      wrapperChecksum: 'wrapper-jar-checksum-value'
    } as Release);

    mockGitHubOps.findMatchingRef = jest.fn().mockReturnValue(undefined);

    jest
      .spyOn(wrapperFind, 'findWrapperPropertiesFiles')
      .mockResolvedValue(['/path/to/gradle/wrapper/gradle-wrapper.properties']);

    jest.spyOn(wrapper, 'createWrapperInfo').mockReturnValue({
      version: '1.0.0',
      path: '/path/to/gradle/wrapper/gradle-wrapper.properties',
      distType: 'bin',
      basePath: '/path/to/gradle'
    } as wrapper.IWrapperInfo);

    jest.spyOn(git, 'config').mockImplementation();

    mockGitHubApi.repoDefaultBranch = jest.fn().mockReturnValue('master');

    jest.spyOn(git, 'fetch').mockImplementation();
    jest.spyOn(git, 'checkout').mockResolvedValue(0);
    jest.spyOn(git, 'parseHead').mockResolvedValue('abc123');
    jest.spyOn(git, 'checkoutCreateBranch').mockImplementation();

    jest.spyOn(wrapperUpdater, 'createWrapperUpdater').mockReturnValue({
      update: jest.fn().mockImplementation(),
      verify: jest.fn().mockImplementation()
    } as wrapperUpdater.IWrapperUpdater);

    jest
      .spyOn(git, 'gitDiffNameOnly')
      .mockResolvedValue([
        '/path/to/gradle/wrapper/gradle-wrapper.properties',
        '/path/to/gradle/wrapper/gradle-wrapper.jar'
      ]);

    jest.spyOn(commit, 'commit').mockImplementation();

    jest.spyOn(git, 'push').mockImplementation();

    mockGitHubOps.createPullRequest = jest.fn().mockReturnValue({
      url: 'https://github.com/owner/repo/pulls/42',
      number: 42
    } as store.PullRequestData);

    jest.spyOn(store, 'setPullRequestData').mockImplementation();

    await mainAction.run();

    expect(store.setMainActionExecuted).toHaveBeenCalled();

    expect(mockGitHubApi.repoDefaultBranch).toHaveBeenCalled();

    expect(git.checkout).toHaveBeenCalledWith('master');
    expect(git.checkoutCreateBranch).toHaveBeenCalledWith(
      'gradlew-update-1.0.1',
      'abc123'
    );

    expect(commit.commit).toHaveBeenCalledWith(
      [
        '/path/to/gradle/wrapper/gradle-wrapper.properties',
        '/path/to/gradle/wrapper/gradle-wrapper.jar'
      ],
      '1.0.1',
      '1.0.0'
    );

    expect(git.push).toHaveBeenCalledWith('gradlew-update-1.0.1');

    expect(mockGitHubOps.createPullRequest).toHaveBeenCalledWith(
      'gradlew-update-1.0.1',
      'Bump wrapper from %sourceVersion% to %targetVersion%',
      new Set(['bin']),
      expect.objectContaining({
        version: '1.0.1'
      }),
      '1.0.0'
    );

    expect(store.setPullRequestData).toHaveBeenCalledWith({
      url: 'https://github.com/owner/repo/pulls/42',
      number: 42
    });
  });
});
