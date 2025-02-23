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
import * as core from '@actions/core';
import * as store from '../../src/store';

import {GitHubApi} from '../../src/github/gh-api';
import {RequestError} from '@octokit/request-error';

let api: GitHubApi;
let mockOctokit: any;

beforeEach(() => {
  mockOctokit = {
    rest: {
      repos: {
        get: jest.fn()
      },
      pulls: {
        create: jest.fn(),
        requestReviewers: jest.fn()
      },
      issues: {
        addLabels: jest.fn(),
        getLabel: jest.fn(),
        createLabel: jest.fn(),
        createComment: jest.fn()
      }
    },
    graphql: jest.fn()
  };

  jest.spyOn(github, 'getOctokit').mockReturnValue(mockOctokit);

  api = new GitHubApi('s3cr3t');

  jest.spyOn(github.context, 'repo', 'get').mockImplementation(() => {
    return {
      owner: 'owner-name',
      repo: 'repo-name'
    };
  });
});

describe('repoDefaultBranch', () => {
  it('returns the default branch name', async () => {
    mockOctokit.rest.repos.get.mockResolvedValue({
      data: {
        default_branch: 'main'
      }
    });

    const defaultBranch = await api.repoDefaultBranch();

    expect(defaultBranch).toEqual('main');
    expect(mockOctokit.rest.repos.get).toHaveBeenCalledWith({
      owner: 'owner-name',
      repo: 'repo-name'
    });
  });

  it('throws on api error', async () => {
    mockOctokit.rest.repos.get.mockRejectedValue(new Error('API error'));

    await expect(api.repoDefaultBranch()).rejects.toThrow('API error');

    expect(mockOctokit.rest.repos.get).toHaveBeenCalledWith({
      owner: 'owner-name',
      repo: 'repo-name'
    });
  });
});

describe('createPullRequest', () => {
  it('creates a Pull Request', async () => {
    mockOctokit.rest.pulls.create.mockResolvedValue({
      data: {
        number: 42,
        html_url: 'https://github.com/owner-name/repo-name/pull/42'
      }
    });

    const pullRequest = await api.createPullRequest({
      branchName: 'make-it-up-to-date',
      target: 'main',
      title: 'Update Gradle Wrapper to 1.0.0',
      body: 'This PR updates Gradle Wrapper'
    });

    expect(pullRequest).toBeDefined();
    expect(pullRequest.number).toEqual(42);

    expect(mockOctokit.rest.pulls.create).toHaveBeenCalledWith({
      owner: 'owner-name',
      repo: 'repo-name',
      head: 'make-it-up-to-date',
      base: 'main',
      title: 'Update Gradle Wrapper to 1.0.0',
      body: 'This PR updates Gradle Wrapper'
    });
  });

  it('throws on api error', async () => {
    mockOctokit.rest.pulls.create.mockRejectedValue(new Error('API error'));

    await expect(
      api.createPullRequest({
        branchName: 'make-it-up-to-date',
        target: 'main',
        title: 'Update Gradle Wrapper to 1.0.0',
        body: 'This PR updates Gradle Wrapper'
      })
    ).rejects.toThrow('API error');

    expect(mockOctokit.rest.pulls.create).toHaveBeenCalledWith({
      owner: 'owner-name',
      repo: 'repo-name',
      head: 'make-it-up-to-date',
      base: 'main',
      title: 'Update Gradle Wrapper to 1.0.0',
      body: 'This PR updates Gradle Wrapper'
    });
  });
});

describe('addReviewers', () => {
  beforeEach(() => {
    jest.spyOn(store, 'setErroredReviewers');
  });

  it('does nothing when `reviewers` is empty', async () => {
    await api.addReviewers(1, []);

    expect(store.setErroredReviewers).not.toHaveBeenCalled();
  });

  it('adds a reviewer', async () => {
    mockOctokit.rest.pulls.requestReviewers.mockResolvedValue({
      data: {
        requested_reviewers: [{login: 'reviewer'}]
      }
    });

    await api.addReviewers(1, ['reviewer']);

    expect(store.setErroredReviewers).not.toHaveBeenCalled();
    expect(mockOctokit.rest.pulls.requestReviewers).toHaveBeenCalledWith({
      owner: 'owner-name',
      repo: 'repo-name',
      pull_number: 1,
      reviewers: ['reviewer']
    });
  });

  it('adds multiple reviewers', async () => {
    mockOctokit.rest.pulls.requestReviewers
      .mockResolvedValueOnce({
        data: {
          requested_reviewers: [{login: 'reviewer1'}]
        }
      })
      .mockResolvedValueOnce({
        data: {
          requested_reviewers: [{login: 'reviewer2'}]
        }
      });

    await api.addReviewers(1, ['reviewer1', 'reviewer2']);

    expect(store.setErroredReviewers).not.toHaveBeenCalled();
    expect(mockOctokit.rest.pulls.requestReviewers).toHaveBeenCalledWith({
      owner: 'owner-name',
      repo: 'repo-name',
      pull_number: 1,
      reviewers: ['reviewer1']
    });
    expect(mockOctokit.rest.pulls.requestReviewers).toHaveBeenCalledWith({
      owner: 'owner-name',
      repo: 'repo-name',
      pull_number: 1,
      reviewers: ['reviewer2']
    });
  });

  it('saves all errored reviewers to store state', async () => {
    mockOctokit.rest.pulls.requestReviewers
      .mockResolvedValueOnce({
        data: {
          requested_reviewers: [{login: 'reviewer1'}]
        }
      })
      .mockResolvedValueOnce({
        data: {
          requested_reviewers: [{login: 'reviewer1'}]
        }
      });

    await api.addReviewers(1, ['reviewer1', 'reviewer2']);

    expect(store.setErroredReviewers).toHaveBeenCalledWith(['reviewer2']);
  });

  it('does not throw when adding a user that is not a collaborator', async () => {
    mockOctokit.rest.pulls.requestReviewers.mockRejectedValue(
      new RequestError('Not Found', 422, {
        request: {
          method: 'POST',
          url: 'https://api.github.com/repos/owner-name/repo-name/pulls/1/requested_reviewers',
          headers: {}
        },
        response: {
          status: 422,
          url: 'https://api.github.com/repos/owner-name/repo-name/pulls/1/requested_reviewers',
          headers: {},
          data: {
            message:
              'Reviews may only be requested from collaborators. One or more of the users or teams you specified is not a collaborator of the owner-name/repo-name repository.',
            documentation_url:
              'https://docs.github.com/rest/reference/pulls#request-reviewers-for-a-pull-request'
          }
        }
      })
    );

    await api.addReviewers(1, ['not_a_collaborator']);

    expect(store.setErroredReviewers).toHaveBeenCalledWith([
      'not_a_collaborator'
    ]);
  });

  it('does not throw on api error', async () => {
    mockOctokit.rest.pulls.requestReviewers.mockRejectedValue(
      new Error('API error')
    );

    await api.addReviewers(1, ['reviewer']);

    expect(store.setErroredReviewers).toHaveBeenCalledWith(['reviewer']);
  });
});

describe('addReviewer', () => {
  it('adds a reviewer', async () => {
    mockOctokit.rest.pulls.requestReviewers.mockResolvedValue({
      data: {
        requested_reviewers: [{login: 'reviewer'}]
      }
    });

    const success = await api.addReviewer(1, 'reviewer');

    expect(success).toBeTruthy();
    expect(mockOctokit.rest.pulls.requestReviewers).toHaveBeenCalledWith({
      owner: 'owner-name',
      repo: 'repo-name',
      pull_number: 1,
      reviewers: ['reviewer']
    });
  });

  it('returns false if reviewer cannot be added', async () => {
    mockOctokit.rest.pulls.requestReviewers.mockResolvedValue({
      data: {
        requested_reviewers: []
      }
    });

    const success = await api.addReviewer(1, 'not_a_collaborator');

    expect(success).toBeFalsy();
  });

  it('returns false on api error', async () => {
    mockOctokit.rest.pulls.requestReviewers.mockRejectedValue(
      new Error('API error')
    );

    const success = await api.addReviewer(1, 'reviewer');

    expect(success).toBeFalsy();
  });
});

describe('addTeamReviewers', () => {
  beforeEach(() => {
    jest.spyOn(store, 'setErroredTeamReviewers');
  });

  it('does nothing when `teams` is empty', async () => {
    await api.addTeamReviewers(1, []);

    expect(store.setErroredTeamReviewers).not.toHaveBeenCalled();
  });

  it('adds a team reviewer', async () => {
    mockOctokit.rest.pulls.requestReviewers.mockResolvedValue({
      data: {
        requested_teams: [{slug: 'team'}]
      }
    });

    await api.addTeamReviewers(1, ['team']);

    expect(store.setErroredTeamReviewers).not.toHaveBeenCalled();
    expect(mockOctokit.rest.pulls.requestReviewers).toHaveBeenCalledWith({
      owner: 'owner-name',
      repo: 'repo-name',
      pull_number: 1,
      team_reviewers: ['team']
    });
  });

  it('adds multiple team reviewers', async () => {
    mockOctokit.rest.pulls.requestReviewers
      .mockResolvedValueOnce({
        data: {
          requested_teams: [{slug: 'team1'}]
        }
      })
      .mockResolvedValueOnce({
        data: {
          requested_teams: [{slug: 'team2'}]
        }
      });

    await api.addTeamReviewers(1, ['team1', 'team2']);

    expect(store.setErroredTeamReviewers).not.toHaveBeenCalled();
    expect(mockOctokit.rest.pulls.requestReviewers).toHaveBeenCalledWith({
      owner: 'owner-name',
      repo: 'repo-name',
      pull_number: 1,
      team_reviewers: ['team1']
    });
    expect(mockOctokit.rest.pulls.requestReviewers).toHaveBeenCalledWith({
      owner: 'owner-name',
      repo: 'repo-name',
      pull_number: 1,
      team_reviewers: ['team2']
    });
  });

  it('saves all errored team reviewers to store state', async () => {
    mockOctokit.rest.pulls.requestReviewers
      .mockResolvedValueOnce({
        data: {
          requested_teams: [{slug: 'team1'}]
        }
      })
      .mockResolvedValueOnce({
        data: {
          requested_teams: [{slug: 'team1'}]
        }
      });

    await api.addTeamReviewers(1, ['team1', 'team2']);

    expect(store.setErroredTeamReviewers).toHaveBeenCalledWith(['team2']);
  });

  it('does not throw on api error', async () => {
    mockOctokit.rest.pulls.requestReviewers.mockRejectedValue(
      new Error('API error')
    );

    await api.addTeamReviewers(1, ['team']);

    expect(store.setErroredTeamReviewers).toHaveBeenCalledWith(['team']);
  });
});

describe('addTeamReviewer', () => {
  it('adds a team reviewer', async () => {
    mockOctokit.rest.pulls.requestReviewers.mockResolvedValue({
      data: {
        requested_teams: [{slug: 'team'}]
      }
    });

    const success = await api.addTeamReviewer(1, 'team');

    expect(success).toBeTruthy();
    expect(mockOctokit.rest.pulls.requestReviewers).toHaveBeenCalledWith({
      owner: 'owner-name',
      repo: 'repo-name',
      pull_number: 1,
      team_reviewers: ['team']
    });
  });

  it('returns false if team reviewer cannot be added', async () => {
    mockOctokit.rest.pulls.requestReviewers.mockResolvedValue({
      data: {
        requested_teams: []
      }
    });

    const success = await api.addTeamReviewer(1, 'not_a_team');

    expect(success).toBeFalsy();
  });

  it('returns false on api error', async () => {
    mockOctokit.rest.pulls.requestReviewers.mockRejectedValue(
      new Error('API error')
    );

    const success = await api.addTeamReviewer(1, 'team');

    expect(success).toBeFalsy();
  });
});

describe('addLabels', () => {
  it('adds a label', async () => {
    mockOctokit.rest.issues.addLabels.mockResolvedValue({
      data: [{name: 'gradle-wrapper'}]
    });

    await api.addLabels(1, ['gradle-wrapper']);

    expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith({
      owner: 'owner-name',
      repo: 'repo-name',
      issue_number: 1,
      labels: ['gradle-wrapper']
    });
  });

  it('adds multiple labels', async () => {
    mockOctokit.rest.issues.addLabels.mockResolvedValue({
      data: [{name: 'gradle-wrapper'}, {name: 'dependencies'}]
    });

    await api.addLabels(1, ['gradle-wrapper', 'dependencies']);

    expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith({
      owner: 'owner-name',
      repo: 'repo-name',
      issue_number: 1,
      labels: ['gradle-wrapper', 'dependencies']
    });
  });

  it('does not throw on api error', async () => {
    mockOctokit.rest.issues.addLabels.mockRejectedValue(new Error('API error'));

    await api.addLabels(1, ['gradle-wrapper']);

    expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith({
      owner: 'owner-name',
      repo: 'repo-name',
      issue_number: 1,
      labels: ['gradle-wrapper']
    });
  });
});

describe('createLabelIfMissing', () => {
  it('does nothing if label already exists', async () => {
    mockOctokit.rest.issues.getLabel.mockResolvedValue({
      data: {
        id: 123,
        name: 'gradle-wrapper'
      }
    });

    const res = await api.createLabelIfMissing('gradle-wrapper');

    expect(res).toBeTruthy();
    expect(mockOctokit.rest.issues.getLabel).toHaveBeenCalledWith({
      owner: 'owner-name',
      repo: 'repo-name',
      name: 'gradle-wrapper'
    });
  });

  it('calls `createLabel()` if label does not exist', async () => {
    mockOctokit.rest.issues.getLabel.mockRejectedValue(
      new RequestError('Not Found', 404, {
        request: {
          method: 'GET',
          url: 'https://api.github.com/repos/owner-name/repo-name/labels/gradle-wrapper',
          headers: {}
        },
        response: {
          status: 404,
          url: 'https://api.github.com/repos/owner-name/repo-name/labels/gradle-wrapper',
          headers: {},
          data: {
            message: 'Not Found',
            documentation_url:
              'https://docs.github.com/rest/reference/issues#get-a-label'
          }
        }
      })
    );

    mockOctokit.rest.issues.createLabel.mockResolvedValue({
      data: {
        id: 123,
        name: 'gradle-wrapper'
      }
    });

    const res = await api.createLabelIfMissing('gradle-wrapper');

    expect(res).toBeTruthy();
    expect(mockOctokit.rest.issues.createLabel).toHaveBeenCalledWith({
      owner: 'owner-name',
      repo: 'repo-name',
      name: 'gradle-wrapper',
      color: '02303A',
      description: 'Pull requests that update Gradle wrapper'
    });
  });
});

describe('createLabel', () => {
  it('creates a label', async () => {
    mockOctokit.rest.issues.createLabel.mockResolvedValue({
      data: {
        id: 123,
        name: 'gradle-wrapper'
      }
    });

    const created = await api.createLabel('gradle-wrapper');

    expect(created).toBeTruthy();
    expect(mockOctokit.rest.issues.createLabel).toHaveBeenCalledWith({
      owner: 'owner-name',
      repo: 'repo-name',
      name: 'gradle-wrapper',
      color: '02303A',
      description: 'Pull requests that update Gradle wrapper'
    });
  });

  it('does not throw if label already exists', async () => {
    mockOctokit.rest.issues.createLabel.mockRejectedValue(
      new RequestError('Label already exists', 422, {
        request: {
          method: 'POST',
          url: 'https://api.github.com/repos/owner-name/repo-name/labels',
          headers: {}
        },
        response: {
          status: 422,
          url: 'https://api.github.com/repos/owner-name/repo-name/labels',
          headers: {},
          data: {
            message: 'Validation Failed',
            errors: [
              {
                resource: 'Label',
                code: 'already_exists',
                field: 'name'
              }
            ],
            documentation_url:
              'https://docs.github.com/rest/reference/issues#create-a-label'
          }
        }
      })
    );

    const created = await api.createLabel('gradle-wrapper');

    expect(created).toBeFalsy();
  });

  it('does not throw on api error', async () => {
    mockOctokit.rest.issues.createLabel.mockRejectedValue(
      new Error('API error')
    );

    await api.createLabel('gradle-wrapper');

    expect(mockOctokit.rest.issues.createLabel).toHaveBeenCalledWith({
      owner: 'owner-name',
      repo: 'repo-name',
      name: 'gradle-wrapper',
      color: '02303A',
      description: 'Pull requests that update Gradle wrapper'
    });
  });
});

describe('createComment', () => {
  it('creates a comment', async () => {
    mockOctokit.rest.issues.createComment.mockResolvedValue({
      data: {
        id: 123,
        body: 'test comment'
      }
    });

    const created = await api.createComment(42, 'test comment');

    expect(created).toBeTruthy();
    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
      owner: 'owner-name',
      repo: 'repo-name',
      issue_number: 42,
      body: 'test comment'
    });
  });

  it('does not throw on api error', async () => {
    mockOctokit.rest.issues.createComment.mockRejectedValue(
      new Error('API error')
    );

    const created = await api.createComment(42, 'test comment');

    expect(created).toBeFalsy();
    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
      owner: 'owner-name',
      repo: 'repo-name',
      issue_number: 42,
      body: 'test comment'
    });
  });
});

describe('enableAutoMerge', () => {
  it('enables auto-merge with valid merge method', async () => {
    mockOctokit.graphql
      .mockResolvedValueOnce({
        repository: {
          pullRequest: {
            id: 'PR_123'
          }
        }
      })
      .mockResolvedValueOnce({
        pullRequest: {
          autoMergeRequest: {
            enabledAt: '2025-02-23T12:00:00Z',
            enabledBy: {
              login: 'user'
            }
          }
        }
      });

    await api.enableAutoMerge(42, 'MERGE');

    expect(mockOctokit.graphql).toHaveBeenCalledWith(
      expect.stringContaining('query GetPullRequestId'),
      {
        owner: 'owner-name',
        repo: 'repo-name',
        pullRequestNumber: 42
      }
    );

    expect(mockOctokit.graphql).toHaveBeenCalledWith(
      expect.stringContaining('mutation'),
      {
        pullRequestId: 'PR_123',
        mergeMethod: 'MERGE'
      }
    );
  });

  it('logs error for invalid merge method', async () => {
    const coreSpy = jest.spyOn(core, 'error');

    await api.enableAutoMerge(42, 'INVALID');

    expect(coreSpy).toHaveBeenCalledWith(
      expect.stringContaining('merge-method must be one of the following')
    );
  });

  it('does not throw on api error', async () => {
    mockOctokit.graphql.mockRejectedValue(new Error('API error'));

    await api.enableAutoMerge(42, 'MERGE');

    expect(mockOctokit.graphql).toHaveBeenCalled();
  });
});
