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
import type {PostAction} from '../../src/tasks/post';

jest.unstable_mockModule('@actions/core', coreMock);

jest.unstable_mockModule('../../src/git/git-auth', () => ({
  setup: jest.fn(),
  cleanup: jest.fn()
}));

jest.unstable_mockModule('../../src/store', storeMock);

const store = await import('../../src/store');
const {PostAction} = await import('../../src/tasks/post');

let mockGitHubApi: IGitHubApi;
let postAction: PostAction;

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
  mockGitHubApi = Object.create(defaultMockGitHubApi);

  postAction = new PostAction(mockGitHubApi, {
    url: 'https://github.com/pull/42',
    number: 42
  });
});

describe('run', () => {
  describe('when there are some errored reviewers', () => {
    beforeEach(() => {
      jest.mocked(store.getErroredReviewers).mockReturnValue(['username']);
      jest.mocked(store.getErroredTeamReviewers).mockReturnValue(['team']);
    });

    it('reports errored reviewers to a Pull Request comment', async () => {
      await postAction.run();

      expect(store.getErroredReviewers).toHaveBeenCalled();
      expect(store.getErroredTeamReviewers).toHaveBeenCalled();

      expect(mockGitHubApi.createComment).toHaveBeenCalledWith(
        42,
        expect.stringContaining(`- @username\n- @team\n`)
      );
    });
  });

  describe('when there are no errored reviewers', () => {
    it('does nothing', async () => {
      jest.mocked(store.getErroredReviewers).mockReturnValue([]);
      jest.mocked(store.getErroredTeamReviewers).mockReturnValue([]);

      await postAction.run();

      expect(store.getErroredReviewers).toHaveBeenCalled();
      expect(store.getErroredTeamReviewers).toHaveBeenCalled();

      expect(mockGitHubApi.createComment).not.toHaveBeenCalled();
    });
  });
});
