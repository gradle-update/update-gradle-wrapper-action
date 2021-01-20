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

import * as cmd from '../../src/cmd';
import * as git from '../../src/git/git-cmds';

describe('gitDiffNameOnly', () => {
  describe('when no files has been modified', () => {
    it('execs "git diff" and returns empty array', async () => {
      const exec = jest.spyOn(cmd, 'execWithOutput').mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: ''
      });

      const files = await git.gitDiffNameOnly();

      expect(exec).toHaveBeenCalledWith('git', ['diff', '--name-only']);

      expect(files).toEqual([]);
    });
  });

  describe('when some files have been modified', () => {
    it('execs "git diff" and returns the file names', async () => {
      const exec = jest.spyOn(cmd, 'execWithOutput').mockResolvedValue({
        exitCode: 0,
        stdout: 'path/to/file.txt\ncode.js\n',
        stderr: ''
      });

      const files = await git.gitDiffNameOnly();

      expect(exec).toHaveBeenCalledWith('git', ['diff', '--name-only']);

      expect(files).toEqual(['path/to/file.txt', 'code.js']);
    });
  });
});

describe('checkout', () => {
  it('execs "git checkout" with the given branch and start point', async () => {
    const exec = jest.spyOn(cmd, 'execWithOutput').mockImplementation();

    await git.checkout('main-branch', 'head-ref');

    expect(exec).toHaveBeenCalledWith('git', [
      'checkout',
      '-b',
      'main-branch',
      'head-ref'
    ]);
  });
});

describe('add', () => {
  it('execs "git add" with the given paths', async () => {
    const exec = jest.spyOn(cmd, 'execWithOutput').mockImplementation();

    await git.add(['path/to/file.txt', '../folder/another/data.csv']);

    expect(exec).toHaveBeenCalledWith('git', [
      'add',
      'path/to/file.txt',
      '../folder/another/data.csv'
    ]);
  });
});

describe('commit', () => {
  it('execs "git commit" with the given message body', async () => {
    const exec = jest.spyOn(cmd, 'execWithOutput').mockImplementation();

    await git.commit('this is a commit message');

    expect(exec).toHaveBeenCalledWith('git', [
      'commit',
      '-m',
      'this is a commit message',
      '--signoff'
    ]);
  });
});

describe('config', () => {
  it('execs "git config" to set local configuration for key and value', async () => {
    const exec = jest.spyOn(cmd, 'execWithOutput').mockImplementation();

    await git.config('key', 'value');

    expect(exec).toHaveBeenCalledWith('git', [
      'config',
      '--local',
      'key',
      'value'
    ]);
  });
});

describe('unsetConfig', () => {
  it('execs "git config" to unset local configuration for key', async () => {
    const exec = jest.spyOn(cmd, 'execWithOutput').mockImplementation();

    await git.unsetConfig('key');

    expect(exec).toHaveBeenCalledWith('git', [
      'config',
      '--local',
      '--unset-all',
      'key'
    ]);
  });
});

describe('push', () => {
  it('execs "git push" to origin and head of the specified branch', async () => {
    const exec = jest.spyOn(cmd, 'execWithOutput').mockImplementation();

    await git.push('my-feature-branch');

    expect(exec).toHaveBeenCalledWith('git', [
      'push',
      '--force-with-lease',
      'origin',
      'HEAD:refs/heads/my-feature-branch'
    ]);
  });
});
