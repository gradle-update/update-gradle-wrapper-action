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

import {jest} from '@jest/globals';

import {coreMock} from '../mocks/core';
import {storeMock} from '../mocks/store';

import type {IGitHubApi} from '../../src/github/gh-api';
import type {GitHubOps} from '../../src/github/gh-ops';
import type {Inputs} from '../../src/inputs';
import type {Release, Releases} from '../../src/releases';
import type {MainAction} from '../../src/tasks/main';
import type {IWrapperInfo} from '../../src/wrapperInfo';
import type {IWrapperUpdater} from '../../src/wrapperUpdater';

jest.unstable_mockModule('@actions/core', coreMock);

jest.unstable_mockModule('../../src/git/git-commit', () => ({
  commit: jest.fn()
}));

jest.unstable_mockModule('../../src/git/git-cmds', () => ({
  config: jest.fn(),
  unsetConfig: jest.fn(),
  fetch: jest.fn(),
  checkout: jest.fn(),
  checkoutCreateBranch: jest.fn(),
  add: jest.fn(),
  commit: jest.fn(),
  push: jest.fn(),
  parseHead: jest.fn(),
  gitDiffNameOnly: jest.fn()
}));

jest.unstable_mockModule('../../src/git/git-auth', () => ({
  setup: jest.fn(),
  cleanup: jest.fn()
}));

jest.unstable_mockModule('../../src/store', storeMock);

jest.unstable_mockModule('../../src/wrapperInfo', () => ({
  createWrapperInfo: jest.fn()
}));

jest.unstable_mockModule('../../src/wrapper/find', () => ({
  findWrapperPropertiesFiles: jest.fn()
}));

jest.unstable_mockModule('../../src/wrapperUpdater', () => ({
  createWrapperUpdater: jest.fn()
}));

const commit = await import('../../src/git/git-commit');
const git = await import('../../src/git/git-cmds');
const store = await import('../../src/store');
const wrapper = await import('../../src/wrapperInfo');
const wrapperFind = await import('../../src/wrapper/find');
const wrapperUpdater = await import('../../src/wrapperUpdater');

const {MainAction} = await import('../../src/tasks/main');

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
  distributionsBaseUrl: '',
  paths: [],
  pathsIgnore: [],
  releaseChannel: '',
  mergeMethod: undefined,
  prTitleTemplate: 'Bump wrapper from %sourceVersion% to %targetVersion%',
  prMessageTemplate: '',
  commitMessageTemplate:
    'Update Gradle Wrapper from %sourceVersion% to %targetVersion%'
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
    mockReleases.fetchReleaseInformation = jest
      .fn<() => Promise<Release>>()
      .mockResolvedValue({
        version: '1.0.1',
        allChecksum: 'dist-all-checksum-value',
        binChecksum: 'dist-bin-checksum-value',
        wrapperChecksum: 'wrapper-jar-checksum-value'
      });

    mockGitHubOps.findMatchingRef = jest
      .fn<() => Promise<undefined>>()
      .mockResolvedValue(undefined);

    jest
      .mocked(wrapperFind.findWrapperPropertiesFiles)
      .mockResolvedValue(['/path/to/gradle/wrapper/gradle-wrapper.properties']);

    jest.mocked(wrapper.createWrapperInfo).mockReturnValue({
      version: '1.0.0',
      path: '/path/to/gradle/wrapper/gradle-wrapper.properties',
      distType: 'bin',
      basePath: '/path/to/gradle'
    } as IWrapperInfo);

    mockGitHubApi.repoDefaultBranch = jest
      .fn<() => Promise<string>>()
      .mockResolvedValue('master');

    jest.mocked(git.checkout).mockResolvedValue(0);
    jest.mocked(git.parseHead).mockResolvedValue('abc123');

    jest.mocked(wrapperUpdater.createWrapperUpdater).mockReturnValue({
      update: jest.fn(),
      verify: jest.fn()
    } as unknown as IWrapperUpdater);

    jest
      .mocked(git.gitDiffNameOnly)
      .mockResolvedValue([
        '/path/to/gradle/wrapper/gradle-wrapper.properties',
        '/path/to/gradle/wrapper/gradle-wrapper.jar'
      ]);

    mockGitHubOps.createPullRequest = jest
      .fn<() => Promise<{url: string; number: number}>>()
      .mockResolvedValue({
        url: 'https://github.com/owner/repo/pulls/42',
        number: 42
      });

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
      'Update Gradle Wrapper from 1.0.0 to 1.0.1'
    );

    expect(git.push).toHaveBeenCalledWith('gradlew-update-1.0.1');

    expect(mockGitHubOps.createPullRequest).toHaveBeenCalledWith(
      'gradlew-update-1.0.1',
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
