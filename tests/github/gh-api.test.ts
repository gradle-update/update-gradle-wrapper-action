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

import {GitHubApi} from '../../src/github/gh-api';
import * as store from '../../src/store';

nock.disableNetConnect();

const nockScope = nock('https://api.github.com');

let api: GitHubApi;

beforeEach(() => {
  nock.cleanAll();

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
    nockScope
      .get('/repos/owner-name/repo-name')
      .replyWithFile(200, `${__dirname}/fixtures/get_repo.ok.json`, {
        'Content-Type': 'application/json'
      });

    const defaultBranch = await api.repoDefaultBranch();

    expect(defaultBranch).toEqual('master');
    nockScope.done();
  });

  it('throws on api error', async () => {
    nockScope.get('/repos/owner-name/repo-name').reply(500);

    await expect(api.repoDefaultBranch()).rejects.toThrowError();

    nockScope.done();
  });
});

describe('createPullRequest', () => {
  it('creates a Pull Request', async () => {
    nockScope
      .post('/repos/owner-name/repo-name/pulls', {
        title: 'Update Gradle Wrapper to 1.0.0',
        body: 'This PR updates Gradle Wrapper',
        head: 'make-it-up-to-date',
        base: 'master'
      })
      .replyWithFile(200, `${__dirname}/fixtures/create_pull_request.ok.json`, {
        'Content-Type': 'application/json'
      });

    const pullRequest = await api.createPullRequest({
      branchName: 'make-it-up-to-date',
      target: 'master',
      title: 'Update Gradle Wrapper to 1.0.0',
      body: 'This PR updates Gradle Wrapper'
    });

    expect(pullRequest).toBeDefined();
    nockScope.done();
  });

  it('throws on api error', async () => {
    nockScope.post('/repos/owner-name/repo-name/pulls').reply(500);

    await expect(
      api.createPullRequest({
        branchName: 'make-it-up-to-date',
        target: 'master',
        title: 'Update Gradle Wrapper to 1.0.0',
        body: 'This PR updates Gradle Wrapper'
      })
    ).rejects.toThrowError();

    nockScope.done();
  });
});

describe('addReviewers', () => {
  beforeEach(() => {
    jest.spyOn(store, 'setErroredReviewers');
  });

  it('does nothing when `reviewers` is empty', async () => {
    await api.addReviewers(1, []);

    expect(store.setErroredReviewers).not.toHaveBeenCalled();

    nockScope.done();
  });

  it('adds a reviewer', async () => {
    nockScope
      .post('/repos/owner-name/repo-name/pulls/1/requested_reviewers', {
        reviewers: ['reviewer']
      })
      .replyWithFile(
        201,
        `${__dirname}/fixtures/add_reviewer_to_pr.one_user.json`,
        {
          'Content-Type': 'application/json'
        }
      );

    await api.addReviewers(1, ['reviewer']);

    expect(store.setErroredReviewers).not.toHaveBeenCalled();

    nockScope.done();
  });

  it('adds multiple reviewers', async () => {
    nockScope
      .post('/repos/owner-name/repo-name/pulls/1/requested_reviewers', {
        reviewers: ['reviewer1']
      })
      .replyWithFile(
        201,
        `${__dirname}/fixtures/add_reviewer_to_pr.two_users.json`,
        {
          'Content-Type': 'application/json'
        }
      )
      .post('/repos/owner-name/repo-name/pulls/1/requested_reviewers', {
        reviewers: ['reviewer2']
      })
      .replyWithFile(
        201,
        `${__dirname}/fixtures/add_reviewer_to_pr.two_users.json`,
        {
          'Content-Type': 'application/json'
        }
      );

    await api.addReviewers(1, ['reviewer1', 'reviewer2']);

    expect(store.setErroredReviewers).not.toHaveBeenCalled();

    nockScope.done();
  });

  it('saves all errored reviewers to store state', async () => {
    nockScope
      .post('/repos/owner-name/repo-name/pulls/1/requested_reviewers', {
        reviewers: ['reviewer']
      })
      .replyWithFile(
        201,
        `${__dirname}/fixtures/add_reviewer_to_pr.one_user.json`,
        {
          'Content-Type': 'application/json'
        }
      )
      .post('/repos/owner-name/repo-name/pulls/1/requested_reviewers', {
        reviewers: ['reviewer2']
      })
      .replyWithFile(
        201,
        `${__dirname}/fixtures/add_reviewer_to_pr.one_user.json`,
        {
          'Content-Type': 'application/json'
        }
      );

    await api.addReviewers(1, ['reviewer', 'reviewer2']);

    expect(store.setErroredReviewers).toHaveBeenCalledWith(['reviewer2']);

    nockScope.done();
  });

  it('does not throw when adding a user that is not a collaborator', async () => {
    nockScope
      .post('/repos/owner-name/repo-name/pulls/1/requested_reviewers', {
        reviewers: ['not_a_collaborator']
      })
      .replyWithFile(
        422,
        `${__dirname}/fixtures/add_reviewer_to_pr.not_a_collaborator.json`,
        {
          'Content-Type': 'application/json'
        }
      );

    await api.addReviewers(1, ['not_a_collaborator']);

    expect(store.setErroredReviewers).toHaveBeenCalledWith([
      'not_a_collaborator'
    ]);

    nockScope.done();
  });

  it('does not throw on api error', async () => {
    nockScope
      .post('/repos/owner-name/repo-name/pulls/1/requested_reviewers', {
        reviewers: ['not_a_collaborator']
      })
      .reply(500);

    await api.addReviewers(1, ['not_a_collaborator']);

    expect(store.setErroredReviewers).toHaveBeenCalledWith([
      'not_a_collaborator'
    ]);

    nockScope.done();
  });
});

describe('addReviewer', () => {
  it('adds a reviewer', async () => {
    nockScope
      .post('/repos/owner-name/repo-name/pulls/1/requested_reviewers', {
        reviewers: ['reviewer']
      })
      .replyWithFile(
        201,
        `${__dirname}/fixtures/add_reviewer_to_pr.one_user.json`,
        {
          'Content-Type': 'application/json'
        }
      );

    const success = await api.addReviewer(1, 'reviewer');

    expect(success).toBeTruthy();
    nockScope.done();
  });

  it('returns false if reviewer cannot be added', async () => {
    nockScope
      .post('/repos/owner-name/repo-name/pulls/1/requested_reviewers', {
        reviewers: ['not_a_collaborator']
      })
      .replyWithFile(
        201,
        `${__dirname}/fixtures/add_reviewer_to_pr.one_user.json`,
        {
          'Content-Type': 'application/json'
        }
      );

    const success = await api.addReviewer(1, 'not_a_collaborator');

    expect(success).toBeFalsy();
    nockScope.done();
  });

  it('returns false on api error', async () => {
    nockScope
      .post('/repos/owner-name/repo-name/pulls/1/requested_reviewers', {
        reviewers: ['reviewer']
      })
      .reply(500);

    const success = await api.addReviewer(1, 'reviewer');

    expect(success).toBeFalsy();
    nockScope.done();
  });
});

describe('addTeamReviewers', () => {
  beforeEach(() => {
    jest.spyOn(store, 'setErroredTeamReviewers');
  });

  it('does nothing when `teams` is empty', async () => {
    await api.addTeamReviewers(1, []);

    expect(store.setErroredTeamReviewers).not.toHaveBeenCalled();

    nockScope.done();
  });

  it('adds a team reviewer', async () => {
    nockScope
      .post('/repos/owner-name/repo-name/pulls/1/requested_reviewers', {
        team_reviewers: ['team']
      })
      .replyWithFile(
        201,
        `${__dirname}/fixtures/add_team_reviewer_to_pr.one_team.json`,
        {
          'Content-Type': 'application/json'
        }
      );

    await api.addTeamReviewers(1, ['team']);

    expect(store.setErroredTeamReviewers).not.toHaveBeenCalled();

    nockScope.done();
  });

  it('adds multiple team reviewers', async () => {
    nockScope
      .post('/repos/owner-name/repo-name/pulls/1/requested_reviewers', {
        team_reviewers: ['team1']
      })
      .replyWithFile(
        201,
        `${__dirname}/fixtures/add_team_reviewer_to_pr.two_teams.json`,
        {
          'Content-Type': 'application/json'
        }
      )
      .post('/repos/owner-name/repo-name/pulls/1/requested_reviewers', {
        team_reviewers: ['team2']
      })
      .replyWithFile(
        201,
        `${__dirname}/fixtures/add_team_reviewer_to_pr.two_teams.json`,
        {
          'Content-Type': 'application/json'
        }
      );

    await api.addTeamReviewers(1, ['team1', 'team2']);

    expect(store.setErroredTeamReviewers).not.toHaveBeenCalled();

    nockScope.done();
  });

  it('saves all errored team reviewers to store state', async () => {
    nockScope
      .post('/repos/owner-name/repo-name/pulls/1/requested_reviewers', {
        team_reviewers: ['team']
      })
      .replyWithFile(
        201,
        `${__dirname}/fixtures/add_team_reviewer_to_pr.one_team.json`,
        {
          'Content-Type': 'application/json'
        }
      )
      .post('/repos/owner-name/repo-name/pulls/1/requested_reviewers', {
        team_reviewers: ['team2']
      })
      .replyWithFile(
        201,
        `${__dirname}/fixtures/add_team_reviewer_to_pr.one_team.json`,
        {
          'Content-Type': 'application/json'
        }
      );

    await api.addTeamReviewers(1, ['team', 'team2']);

    expect(store.setErroredTeamReviewers).toHaveBeenCalledWith(['team2']);

    nockScope.done();
  });

  it('does not throw on api error', async () => {
    nockScope
      .post('/repos/owner-name/repo-name/pulls/1/requested_reviewers', {
        team_reviewers: ['team']
      })
      .reply(500);

    await api.addTeamReviewers(1, ['team']);

    expect(store.setErroredTeamReviewers).toHaveBeenCalledWith(['team']);

    nockScope.done();
  });
});

describe('addTeamReviewer', () => {
  it('adds a team reviewer', async () => {
    nockScope
      .post('/repos/owner-name/repo-name/pulls/1/requested_reviewers', {
        team_reviewers: ['team']
      })
      .replyWithFile(
        201,
        `${__dirname}/fixtures/add_team_reviewer_to_pr.one_team.json`,
        {
          'Content-Type': 'application/json'
        }
      );

    const success = await api.addTeamReviewer(1, 'team');

    expect(success).toBeTruthy();
    nockScope.done();
  });

  it('returns false if team reviewer cannot be added', async () => {
    nockScope
      .post('/repos/owner-name/repo-name/pulls/1/requested_reviewers', {
        team_reviewers: ['not_a_team_username']
      })
      .replyWithFile(
        201,
        `${__dirname}/fixtures/add_team_reviewer_to_pr.one_team.json`,
        {
          'Content-Type': 'application/json'
        }
      );

    const success = await api.addTeamReviewer(1, 'not_a_team_username');

    expect(success).toBeFalsy();
    nockScope.done();
  });

  it('returns false on api error', async () => {
    nockScope
      .post('/repos/owner-name/repo-name/pulls/1/requested_reviewers', {
        team_reviewers: ['team']
      })
      .reply(500);

    const success = await api.addTeamReviewer(1, 'team');

    expect(success).toBeFalsy();
    nockScope.done();
  });
});

describe('addLabels', () => {
  it('does nothing when `labels` is empty', async () => {
    await api.addLabels(1, []);

    nockScope.done();
  });

  it('adds a label', async () => {
    nockScope
      .post('/repos/owner-name/repo-name/issues/1/labels', {
        labels: ['gradle-wrapper']
      })
      .replyWithFile(200, `${__dirname}/fixtures/add_label_to_issue.ok.json`, {
        'Content-Type': 'application/json'
      });

    await api.addLabels(1, ['gradle-wrapper']);

    nockScope.done();
  });

  it('adds multiple labels', async () => {
    nockScope
      .post('/repos/owner-name/repo-name/issues/1/labels', {
        labels: ['gradle-wrapper', 'dependencies']
      })
      .replyWithFile(200, `${__dirname}/fixtures/add_label_to_issue.ok.json`, {
        'Content-Type': 'application/json'
      });

    await api.addLabels(1, ['gradle-wrapper', 'dependencies']);

    nockScope.done();
  });

  it('does not throw on api error', async () => {
    nockScope
      .post('/repos/owner-name/repo-name/issues/1/labels', {
        labels: ['gradle-wrapper']
      })
      .reply(500);

    await api.addLabels(1, ['gradle-wrapper']);

    nockScope.done();
  });
});

describe('createLabelIfMissing', () => {
  it('does nothing if label already exists', async () => {
    nockScope
      .get('/repos/owner-name/repo-name/labels/gradle-wrapper')
      .replyWithFile(200, `${__dirname}/fixtures/get_label.ok.json`, {
        'Content-Type': 'application/json'
      });

    const res = await api.createLabelIfMissing('gradle-wrapper');

    expect(res).toBeTruthy();
    nockScope.done();
  });

  it('calls `createLabel()` if label does not exist', async () => {
    nockScope
      .get('/repos/owner-name/repo-name/labels/gradle-wrapper')
      .replyWithFile(404, `${__dirname}/fixtures/get_label.not_found.json`, {
        'Content-Type': 'application/json'
      });

    api.createLabel = jest.fn().mockResolvedValue(true);

    const res = await api.createLabelIfMissing('gradle-wrapper');

    expect(api.createLabel).toHaveBeenCalled();
    expect(res).toBeTruthy();

    nockScope.done();
  });
});

describe('createLabel', () => {
  it('creates a label', async () => {
    nockScope
      .post('/repos/owner-name/repo-name/labels', {
        name: 'gradle-wrapper',
        color: '02303A',
        description: 'Pull requests that update Gradle wrapper'
      })
      .replyWithFile(201, `${__dirname}/fixtures/create_label.ok.json`, {
        'Content-Type': 'application/json'
      });

    const created = await api.createLabel('gradle-wrapper');

    expect(created).toBeTruthy();
    nockScope.done();
  });

  it('does not throw if label already exists', async () => {
    nockScope
      .post('/repos/owner-name/repo-name/labels', {
        name: 'gradle-wrapper',
        color: '02303A',
        description: 'Pull requests that update Gradle wrapper'
      })
      .replyWithFile(
        422,
        `${__dirname}/fixtures/create_label.already_exists.json`,
        {
          'Content-Type': 'application/json'
        }
      );

    const created = await api.createLabel('gradle-wrapper');

    expect(created).toBeFalsy();
    nockScope.done();
  });

  it('does not throw on api error', async () => {
    nockScope
      .post('/repos/owner-name/repo-name/labels', {
        name: 'gradle-wrapper',
        color: '02303A',
        description: 'Pull requests that update Gradle wrapper'
      })
      .reply(500);

    await api.createLabel('gradle-wrapper');

    nockScope.done();
  });
});

describe('createComment', () => {
  it('creates a comment', async () => {
    nockScope
      .post('/repos/owner-name/repo-name/issues/42/comments', {
        body: 'test comment'
      })
      .replyWithFile(201, `${__dirname}/fixtures/create_comment.ok.json`, {
        'Content-Type': 'application/json'
      });

    const created = await api.createComment(42, 'test comment');

    expect(created).toBeTruthy();
    nockScope.done();
  });

  it('does not throw on api error', async () => {
    nockScope
      .post('/repos/owner-name/repo-name/issues/42/comments', {
        body: 'test comment'
      })
      .reply(500);

    const created = await api.createComment(42, 'test comment');

    expect(created).toBeFalsy();
    nockScope.done();
  });
});
