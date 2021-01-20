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

import * as auth from '../../src/git/git-auth';
import * as git from '../../src/git/git-cmds';

describe('setup', () => {
  it('sets git extraheader configuration', async () => {
    const mockInputs = Object.create({repoToken: 's3cr3t'});
    const setSecret = jest.spyOn(core, 'setSecret').mockImplementation();
    const gitConfig = jest.spyOn(git, 'config').mockImplementation();

    await auth.setup(mockInputs);

    expect(setSecret).toHaveBeenCalledWith('eC1hY2Nlc3MtdG9rZW46czNjcjN0');

    expect(gitConfig).toHaveBeenCalledWith(
      'http.https://github.com/.extraheader',
      'Authorization: basic eC1hY2Nlc3MtdG9rZW46czNjcjN0'
    );
  });
});

describe('cleanup', () => {
  it('unsets git extraheader configuration', async () => {
    const gitUnsetConfig = jest.spyOn(git, 'unsetConfig').mockImplementation();

    await auth.cleanup();

    expect(gitUnsetConfig).toHaveBeenCalledWith(
      'http.https://github.com/.extraheader'
    );
  });
});
