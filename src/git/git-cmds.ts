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

import * as cmd from '../cmd';

export async function gitDiffNameOnly(): Promise<string[]> {
  const {stdout} = await cmd.execWithOutput('git', ['diff', '--name-only']);

  const files = stdout.split('\n').filter(f => f.length);
  core.debug(`Git diff files: ${files}`);

  return files;
}

export async function parseHead(): Promise<string> {
  const {stdout: currentCommitSha} = await cmd.execWithOutput('git', [
    'rev-parse',
    'HEAD'
  ]);
  return currentCommitSha;
}

export async function fetch() {
  await cmd.execWithOutput('git', ['fetch', '--depth=1']);
}

export async function checkout(branchName: string): Promise<number> {
  const exec = await cmd.execWithOutput('git', ['checkout', branchName]);
  return exec.exitCode;
}

export async function checkoutCreateBranch(
  branchName: string,
  startPoint: string
) {
  await cmd.execWithOutput('git', ['checkout', '-b', branchName, startPoint]);
}

export async function add(paths: string[]) {
  await cmd.execWithOutput('git', ['add', ...paths]);
}

export async function commit(message: string) {
  await cmd.execWithOutput('git', ['commit', '-m', message, '--signoff']);
}

export async function config(key: string, value: string) {
  await cmd.execWithOutput('git', ['config', '--local', key, value]);
}

export async function unsetConfig(key: string) {
  await cmd.execWithOutput('git', ['config', '--local', '--unset-all', key]);
}

export async function push(branchName: string) {
  await cmd.execWithOutput('git', [
    'push',
    '--force-with-lease',
    'origin',
    `HEAD:refs/heads/${branchName}`
  ]);
}
