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

import * as core from '@actions/core';

import * as cmd from './cmd';

export async function gitDiffNameOnly(): Promise<string[]> {
  const {stdout} = await cmd.execWithOutput('git', ['diff', '--name-only']);

  const files = stdout.split('\n').filter(f => f.length);
  core.debug(`Git diff files: ${files}`);

  return files;
}

export async function gitFileMode(path: string): Promise<string> {
  const {stdout} = await cmd.execWithOutput('git', ['ls-files', '-s', path]);

  const [mode] = stdout.split(' ');

  core.debug(`Path: ${path}`);
  core.debug(`Mode: ${mode}`);

  return mode;
}
