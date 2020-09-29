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

import * as git from './git-cmds';

export async function commit(
  files: string[],
  targetVersion: string,
  sourceVersion: string
) {
  await git.add(files);

  const message = `Update Gradle Wrapper from ${sourceVersion} to ${targetVersion}.

Update Gradle Wrapper from ${sourceVersion} to ${targetVersion}.
- [Release notes](https://docs.gradle.org/${targetVersion}/release-notes.html)`;

  await git.commit(message);
}
