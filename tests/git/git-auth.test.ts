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

jest.unstable_mockModule('@actions/core', coreMock);

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

const core = await import('@actions/core');
const auth = await import('../../src/git/git-auth');
const git = await import('../../src/git/git-cmds');

describe('setup', () => {
  it('sets git extraheader configuration', async () => {
    const mockInputs = Object.create({repoToken: 's3cr3t'});

    await auth.setup(mockInputs);

    expect(core.setSecret).toHaveBeenCalledWith('eC1hY2Nlc3MtdG9rZW46czNjcjN0');

    expect(git.config).toHaveBeenCalledWith(
      'http.https://github.com/.extraheader',
      'Authorization: basic eC1hY2Nlc3MtdG9rZW46czNjcjN0'
    );
  });
});

describe('cleanup', () => {
  it('unsets git extraheader configuration', async () => {
    await auth.cleanup();

    expect(git.unsetConfig).toHaveBeenCalledWith(
      'http.https://github.com/.extraheader'
    );
  });
});
