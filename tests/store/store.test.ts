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

import * as store from '../../src/store';

describe('setMainActionExecuted', () => {
  it('saves a state variable as "true"', () => {
    const saveState = jest.spyOn(core, 'saveState');

    store.setMainActionExecuted();

    expect(saveState).toHaveBeenCalledWith('main_action_executed', 'true');
  });
});

describe('mainActionExecuted', () => {
  it('returns true if the state variable is set to string "true"', () => {
    const saveState = jest.spyOn(core, 'getState').mockReturnValue('true');

    const executed = store.mainActionExecuted();

    expect(saveState).toHaveBeenCalledWith('main_action_executed');
    expect(executed).toBeTruthy();
  });

  it('returns false if the state variable is not set to string "true', () => {
    const saveState = jest.spyOn(core, 'getState').mockReturnValue('');

    const executed = store.mainActionExecuted();

    expect(saveState).toHaveBeenCalledWith('main_action_executed');
    expect(executed).toBeFalsy();
  });
});

describe('setPullRequestData', () => {
  it('saves a state variable as json representation of input data', () => {
    const saveState = jest.spyOn(core, 'saveState');

    store.setPullRequestData({url: 'https://github.com/pull/42', number: 42});

    expect(saveState).toHaveBeenCalledWith(
      'pull_request_data',
      '{"url":"https://github.com/pull/42","number":42}'
    );
  });
});

describe('getPullRequestData', () => {
  it('returns undefined if the state variable is empty', () => {
    const getState = jest.spyOn(core, 'getState').mockReturnValue('');

    const pullRequestData = store.getPullRequestData();

    expect(getState).toHaveBeenCalledWith('pull_request_data');
    expect(pullRequestData).toBeUndefined();
  });

  it('returns data if the state variable is set to valid json', () => {
    const getState = jest
      .spyOn(core, 'getState')
      .mockReturnValue('{"url":"https://github.com/pull/42","number":42}');

    const isCompleted = store.getPullRequestData();

    expect(getState).toHaveBeenCalledWith('pull_request_data');
    expect(isCompleted).toEqual({
      url: 'https://github.com/pull/42',
      number: 42
    });
  });
});

describe('setErroredReviewers', () => {
  it('saves a state variable as json representation of input array', () => {
    const saveState = jest.spyOn(core, 'saveState');

    store.setErroredReviewers(['a', 'b']);

    expect(saveState).toHaveBeenCalledWith('errored_reviewers', '["a","b"]');
  });

  describe('when input is empty', () => {
    it('saves a state variable as json empty array', () => {
      const saveState = jest.spyOn(core, 'saveState');

      store.setErroredReviewers([]);

      expect(saveState).toHaveBeenCalledWith('errored_reviewers', '[]');
    });
  });
});

describe('getErroredReviewers', () => {
  it('returns undefined if the state variable is empty', () => {
    const getState = jest.spyOn(core, 'getState').mockReturnValue('');

    const pullRequestData = store.getErroredReviewers();

    expect(getState).toHaveBeenCalledWith('errored_reviewers');
    expect(pullRequestData).toBeUndefined();
  });

  it('returns an array of strings if the state variable is set to valid json', () => {
    const getState = jest.spyOn(core, 'getState').mockReturnValue('["a"]');

    const reviewers = store.getErroredReviewers();

    expect(reviewers).toEqual(['a']);
    expect(getState).toHaveBeenCalledWith('errored_reviewers');
  });
});

describe('setErroredTeamReviewers', () => {
  it('saves a state variable as json representation of input array', () => {
    const saveState = jest.spyOn(core, 'saveState');

    store.setErroredTeamReviewers(['a', 'b']);

    expect(saveState).toHaveBeenCalledWith(
      'errored_team_reviewers',
      '["a","b"]'
    );
  });

  describe('when input is empty', () => {
    it('saves a state variable as json empty array', () => {
      const saveState = jest.spyOn(core, 'saveState');

      store.setErroredTeamReviewers([]);

      expect(saveState).toHaveBeenCalledWith('errored_team_reviewers', '[]');
    });
  });
});

describe('getErroredTeamReviewers', () => {
  it('returns undefined if the state variable is empty', () => {
    const getState = jest.spyOn(core, 'getState').mockReturnValue('');

    const pullRequestData = store.getErroredTeamReviewers();

    expect(getState).toHaveBeenCalledWith('errored_team_reviewers');
    expect(pullRequestData).toBeUndefined();
  });

  it('returns an array of strings if the state variable is set to valid json', () => {
    const getState = jest.spyOn(core, 'getState').mockReturnValue('["a"]');

    const reviewers = store.getErroredTeamReviewers();

    expect(reviewers).toEqual(['a']);
    expect(getState).toHaveBeenCalledWith('errored_team_reviewers');
  });
});
