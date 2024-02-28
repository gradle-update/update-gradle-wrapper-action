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

import * as github from '@actions/github';

import nock from 'nock';

import {GitHubOps} from '../../src/github/gh-ops';
import {IGitHubApi} from '../../src/github/gh-api';
import {Inputs} from '../../src/inputs/';
import {Release} from '../../src/releases';

nock.disableNetConnect();

const nockScope = nock('https://api.github.com');

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
  prTitleTemplate:
    'Update Gradle Wrapper from %sourceVersion% to %targetVersion%',
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

let mockInputs: Inputs;
let mockGitHubApi: IGitHubApi;
let githubOps: GitHubOps;

beforeEach(() => {
  nock.cleanAll();

  mockInputs = Object.create(defaultMockInputs);
  mockGitHubApi = Object.create(defaultMockGitHubApi);

  githubOps = new GitHubOps(mockInputs, mockGitHubApi);

  jest.spyOn(github.context, 'repo', 'get').mockImplementation(() => {
    return {
      owner: 'owner-name',
      repo: 'repo-name'
    };
  });
});

describe('createPullRequest', () => {
  const branchName = 'a-branch-name';

  const distributionTypes = new Set(['bin']);

  const targetRelease: Release = {
    version: '1.0.1',
    allChecksum: 'distAllChecksum',
    binChecksum: 'distBinChecksum',
    wrapperChecksum: 'wrapperChecksum'
  };

  const sourceVersion = '1.0.0';

  describe('Pull Request creation', () => {
    beforeEach(() => {
      mockGitHubApi.repoDefaultBranch = jest.fn().mockResolvedValue('master');

      mockGitHubApi.createPullRequest = jest.fn().mockResolvedValue({
        url: 'https://api.github.com/repos/owner-name/repo-name/pulls/42',
        id: 123456,
        html_url: 'https://github.com/owner-name/repo-name/pull/42',
        number: 42,
        title: 'Update Gradle Wrapper from 1.0.0 to 1.0.1',
        body: 'Update Gradle Wrapper from 1.0.0 to 1.0.1'
      });
    });

    it('creates a Pull Request with custom title', async () => {
      await githubOps.createPullRequest(
        branchName,
        'chore: Bump wrapper from %sourceVersion% to %targetVersion%',
        distributionTypes,
        targetRelease,
        sourceVersion
      );

      expect(mockGitHubApi.repoDefaultBranch).toHaveBeenCalled();

      expect(mockGitHubApi.createPullRequest).toHaveBeenCalledWith({
        branchName: 'refs/heads/a-branch-name',
        target: 'master',
        title: 'chore: Bump wrapper from 1.0.0 to 1.0.1',
        body: expect.stringContaining(
          'chore: Bump wrapper from 1.0.0 to 1.0.1.'
        )
      });
    });

    it('creates a Pull Request and returns its data', async () => {
      const pullRequestData = await githubOps.createPullRequest(
        branchName,
        mockInputs.prTitleTemplate,
        distributionTypes,
        targetRelease,
        sourceVersion
      );

      expect(mockGitHubApi.repoDefaultBranch).toHaveBeenCalled();

      expect(mockGitHubApi.createPullRequest).toHaveBeenCalledWith({
        branchName: 'refs/heads/a-branch-name',
        target: 'master',
        title: 'Update Gradle Wrapper from 1.0.0 to 1.0.1',
        body: expect.stringContaining(
          'Update Gradle Wrapper from 1.0.0 to 1.0.1.'
        )
      });

      expect(mockGitHubApi.createLabelIfMissing).toHaveBeenCalledWith(
        'gradle-wrapper'
      );

      expect(mockGitHubApi.addLabels).toHaveBeenCalledWith(42, [
        'gradle-wrapper'
      ]);

      expect(mockGitHubApi.addReviewers).toHaveBeenCalledWith(42, []);

      expect(mockGitHubApi.addTeamReviewers).toHaveBeenCalledWith(42, []);

      expect(pullRequestData).toBeDefined();
      expect(pullRequestData.url).toEqual(
        'https://github.com/owner-name/repo-name/pull/42'
      );
      expect(pullRequestData.number).toEqual(42);
    });

    it('sets the input targetBranch', async () => {
      mockInputs.targetBranch = 'release-v2';

      const pullRequestData = await githubOps.createPullRequest(
        branchName,
        mockInputs.prTitleTemplate,
        distributionTypes,
        targetRelease,
        sourceVersion
      );

      expect(mockGitHubApi.repoDefaultBranch).not.toHaveBeenCalled();

      expect(mockGitHubApi.createPullRequest).toHaveBeenCalledWith({
        branchName: 'refs/heads/a-branch-name',
        target: 'release-v2',
        title: 'Update Gradle Wrapper from 1.0.0 to 1.0.1',
        body: expect.stringContaining(
          'Update Gradle Wrapper from 1.0.0 to 1.0.1.'
        )
      });

      expect(mockGitHubApi.createLabelIfMissing).toHaveBeenCalledWith(
        'gradle-wrapper'
      );

      expect(mockGitHubApi.addLabels).toHaveBeenCalledWith(42, [
        'gradle-wrapper'
      ]);

      expect(mockGitHubApi.addReviewers).toHaveBeenCalledWith(42, []);

      expect(mockGitHubApi.addTeamReviewers).toHaveBeenCalledWith(42, []);

      expect(pullRequestData).toBeDefined();
      expect(pullRequestData.url).toEqual(
        'https://github.com/owner-name/repo-name/pull/42'
      );
      expect(pullRequestData.number).toEqual(42);
    });

    it('adds the input reviewers', async () => {
      mockInputs.reviewers = ['username', 'collaborator'];

      const pullRequestData = await githubOps.createPullRequest(
        branchName,
        mockInputs.prTitleTemplate,
        distributionTypes,
        targetRelease,
        sourceVersion
      );

      expect(mockGitHubApi.repoDefaultBranch).toHaveBeenCalled();

      expect(mockGitHubApi.createPullRequest).toHaveBeenCalledWith({
        branchName: 'refs/heads/a-branch-name',
        target: 'master',
        title: 'Update Gradle Wrapper from 1.0.0 to 1.0.1',
        body: expect.stringContaining(
          'Update Gradle Wrapper from 1.0.0 to 1.0.1.'
        )
      });

      expect(mockGitHubApi.createLabelIfMissing).toHaveBeenCalledWith(
        'gradle-wrapper'
      );

      expect(mockGitHubApi.addLabels).toHaveBeenCalledWith(42, [
        'gradle-wrapper'
      ]);

      expect(mockGitHubApi.addReviewers).toHaveBeenCalledWith(42, [
        'username',
        'collaborator'
      ]);

      expect(mockGitHubApi.addTeamReviewers).toHaveBeenCalledWith(42, []);

      expect(pullRequestData).toBeDefined();
      expect(pullRequestData.url).toEqual(
        'https://github.com/owner-name/repo-name/pull/42'
      );
      expect(pullRequestData.number).toEqual(42);
    });

    it('adds the input team reviewers', async () => {
      mockInputs.teamReviewers = ['devops', 'frontend'];

      const pullRequestData = await githubOps.createPullRequest(
        branchName,
        mockInputs.prTitleTemplate,
        distributionTypes,
        targetRelease,
        sourceVersion
      );

      expect(mockGitHubApi.repoDefaultBranch).toHaveBeenCalled();

      expect(mockGitHubApi.createPullRequest).toHaveBeenCalledWith({
        branchName: 'refs/heads/a-branch-name',
        target: 'master',
        title: 'Update Gradle Wrapper from 1.0.0 to 1.0.1',
        body: expect.stringContaining(
          'Update Gradle Wrapper from 1.0.0 to 1.0.1.'
        )
      });

      expect(mockGitHubApi.createLabelIfMissing).toHaveBeenCalledWith(
        'gradle-wrapper'
      );

      expect(mockGitHubApi.addLabels).toHaveBeenCalledWith(42, [
        'gradle-wrapper'
      ]);

      expect(mockGitHubApi.addReviewers).toHaveBeenCalledWith(42, []);

      expect(mockGitHubApi.addTeamReviewers).toHaveBeenCalledWith(42, [
        'devops',
        'frontend'
      ]);

      expect(pullRequestData).toBeDefined();
      expect(pullRequestData.url).toEqual(
        'https://github.com/owner-name/repo-name/pull/42'
      );
      expect(pullRequestData.number).toEqual(42);
    });

    it('adds the input labels', async () => {
      mockInputs.labels = ['custom-label', 'help wanted'];

      const pullRequestData = await githubOps.createPullRequest(
        branchName,
        mockInputs.prTitleTemplate,
        distributionTypes,
        targetRelease,
        sourceVersion
      );

      expect(mockGitHubApi.repoDefaultBranch).toHaveBeenCalled();

      expect(mockGitHubApi.createPullRequest).toHaveBeenCalledWith({
        branchName: 'refs/heads/a-branch-name',
        target: 'master',
        title: 'Update Gradle Wrapper from 1.0.0 to 1.0.1',
        body: expect.stringContaining(
          'Update Gradle Wrapper from 1.0.0 to 1.0.1.'
        )
      });

      expect(mockGitHubApi.createLabelIfMissing).toHaveBeenCalledWith(
        'gradle-wrapper'
      );

      expect(mockGitHubApi.addLabels).toHaveBeenCalledWith(42, [
        'gradle-wrapper',
        'custom-label',
        'help wanted'
      ]);

      expect(mockGitHubApi.addReviewers).toHaveBeenCalledWith(42, []);

      expect(mockGitHubApi.addTeamReviewers).toHaveBeenCalledWith(42, []);

      expect(pullRequestData).toBeDefined();
      expect(pullRequestData.url).toEqual(
        'https://github.com/owner-name/repo-name/pull/42'
      );
      expect(pullRequestData.number).toEqual(42);
    });
  });

  describe('blowing up on some core GitHubApi error cases', () => {
    it('throws if repoDefaultBranch() throws', async () => {
      mockGitHubApi.repoDefaultBranch = jest.fn().mockImplementation(() => {
        throw new Error('fetch repo error');
      });

      await expect(
        githubOps.createPullRequest(
          branchName,
          mockInputs.prTitleTemplate,
          distributionTypes,
          targetRelease,
          sourceVersion
        )
      ).rejects.toThrowError('fetch repo error');
    });

    it('throws if createPullRequest() throws', async () => {
      mockGitHubApi.repoDefaultBranch = jest.fn().mockResolvedValue('master');

      mockGitHubApi.createPullRequest = jest.fn().mockImplementation(() => {
        throw new Error('create pull request error');
      });

      await expect(
        githubOps.createPullRequest(
          branchName,
          mockInputs.prTitleTemplate,
          distributionTypes,
          targetRelease,
          sourceVersion
        )
      ).rejects.toThrowError('create pull request error');
    });
  });
});

describe('findMatchingRef', () => {
  it('some refs match', async () => {
    nockScope
      .get(
        '/repos/owner-name/repo-name/git/matching-refs/heads%2Fgradlew-update-1.0.0'
      )
      .replyWithFile(200, `${__dirname}/fixtures/get_refs.ok.json`, {
        'Content-Type': 'application/json'
      });

    const ref = await githubOps.findMatchingRef('1.0.0');

    expect(ref).toBeDefined();
    expect(ref?.ref).toEqual('refs/heads/gradlew-update-1.0.0');
    nockScope.done();
  });

  it('no ref matches', async () => {
    nockScope
      .get(
        '/repos/owner-name/repo-name/git/matching-refs/heads%2Fgradlew-update-1.0.0'
      )
      .reply(200, []);

    const ref = await githubOps.findMatchingRef('1.0.0');

    expect(ref).not.toBeDefined();
    nockScope.done();
  });

  it('throws on api error', async () => {
    nockScope
      .get(
        '/repos/owner-name/repo-name/git/matching-refs/heads%2Fgradlew-update-1.0.0'
      )
      .reply(500);

    await expect(githubOps.findMatchingRef('1.0.0')).rejects.toThrowError();
    nockScope.done();
  });
});
