// Copyright 2020 Cristian Greco
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

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import {IGitHubApi} from '../../src/github/gh-api';

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import Inputs from '../../src/inputs/inputs';
jest.mock('../../src/inputs', () => {
  const mockInputs: Inputs = {
    repoToken: 's3cr3t',
    reviewers: [],
    targetBranch: '',
    setDistributionChecksum: true
  };

  return {
    inputs: mockInputs
  };
});

nock.disableNetConnect();

const nockScope = nock('https://api.github.com');

let mockGitHubApi: IGitHubApi;
let githubOps: GitHubOps;

beforeEach(() => {
  mockGitHubApi = {
    repoDefaultBranch: jest.fn(),
    createPullRequest: jest.fn(),
    addReviewers: jest.fn(),
    addLabels: jest.fn(),
    createLabel: jest.fn(),
    createLabelIfMissing: jest.fn()
  };

  githubOps = new GitHubOps(mockGitHubApi);

  jest.spyOn(github.context, 'repo', 'get').mockImplementation(() => {
    return {
      owner: 'owner-name',
      repo: 'repo-name'
    };
  });
});

afterEach(() => {
  nock.cleanAll();
});

describe('createPullRequest', () => {
  it('creates a Pull Request and returns its url', async () => {
    mockGitHubApi.repoDefaultBranch = jest.fn().mockResolvedValue('master');

    mockGitHubApi.createPullRequest = jest.fn().mockResolvedValue({
      url: 'https://api.github.com/repos/owner-name/repo-name/pulls/42',
      id: 123456,
      html_url: 'https://github.com/owner-name/repo-name/pull/42',
      number: 42,
      title: 'Updates Gradle Wrapper from 1.0.0 to 1.0.1.',
      body: 'Updates Gradle Wrapper from 1.0.0 to 1.0.1',
      commits: 1,
      changed_files: 4,
      user: {},
      head: {},
      base: {}
    });

    const pullRequestUrl = await githubOps.createPullRequest(
      'a-branch-name',
      '1.0.1',
      '1.0.0'
    );

    expect(mockGitHubApi.repoDefaultBranch).toHaveBeenCalled();

    expect(mockGitHubApi.createPullRequest).toHaveBeenCalledWith({
      branchName: 'refs/heads/a-branch-name',
      target: 'master',
      title: 'Updates Gradle Wrapper from 1.0.0 to 1.0.1.',
      body: expect.stringContaining(
        'Updates Gradle Wrapper from 1.0.0 to 1.0.1.'
      )
    });

    expect(mockGitHubApi.createLabelIfMissing).toHaveBeenCalledWith(
      'gradle-wrapper'
    );

    expect(mockGitHubApi.addLabels).toHaveBeenCalledWith(42, [
      'gradle-wrapper'
    ]);

    expect(mockGitHubApi.addReviewers).toHaveBeenCalledWith(42, []);

    expect(pullRequestUrl).toEqual(
      'https://github.com/owner-name/repo-name/pull/42'
    );
  });

  describe('blows up on some core GitHubApi error cases', () => {
    it('throws if repoDefaultBranch() throws', async () => {
      mockGitHubApi.repoDefaultBranch = jest.fn().mockImplementation(() => {
        throw new Error('fetch repo error');
      });

      await expect(
        githubOps.createPullRequest('a-branch-name', '1.0.1', '1.0.0')
      ).rejects.toThrowError('fetch repo error');
    });

    it('throws if createPullRequest() throws', async () => {
      mockGitHubApi.repoDefaultBranch = jest.fn().mockResolvedValue('master');

      mockGitHubApi.createPullRequest = jest.fn().mockImplementation(() => {
        throw new Error('create pull request error');
      });

      await expect(
        githubOps.createPullRequest('a-branch-name', '1.0.1', '1.0.0')
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
