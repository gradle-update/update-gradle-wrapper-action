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

describe('setActionMainCompleted', () => {
  it('saves a state variable as "true" string', () => {
    const saveState = jest.spyOn(core, 'saveState');

    store.setActionMainCompleted();

    expect(saveState).toHaveBeenCalledWith('main-completed', 'true');
  });
});

describe('isMainActionCompleted', () => {
  it('returns true if the state variable is the "true" string', () => {
    const getState = jest.spyOn(core, 'getState').mockReturnValue('true');

    const isCompleted = store.isMainActionCompleted();

    expect(getState).toHaveBeenCalledWith('main-completed');
    expect(isCompleted).toBe(true);
  });

  it('returns false if the state variable is other than the "true" string', () => {
    const getState = jest.spyOn(core, 'getState').mockReturnValue('something');

    const isCompleted = store.isMainActionCompleted();

    expect(getState).toHaveBeenCalledWith('main-completed');
    expect(isCompleted).toBe(false);
  });
});

describe('setErroredReviewers', () => {
  it('saves a state variable as json representation of input array', () => {
    const saveState = jest.spyOn(core, 'saveState');

    store.setErroredReviewers(['a', 'b']);

    expect(saveState).toHaveBeenCalledWith('errored-reviewers', '["a","b"]');
  });

  describe('when input is empty', () => {
    it('saves a state variable as json empty array', () => {
      const saveState = jest.spyOn(core, 'saveState');

      store.setErroredReviewers([]);

      expect(saveState).toHaveBeenCalledWith('errored-reviewers', '[]');
    });
  });
});

describe('getErroredReviewers', () => {
  it('returns an array of strings from json state', () => {
    const getState = jest.spyOn(core, 'getState').mockReturnValue('["a"]');

    const reviewers = store.getErroredReviewers();

    expect(reviewers).toEqual(['a']);
    expect(getState).toHaveBeenCalledWith('errored-reviewers');
  });
});
