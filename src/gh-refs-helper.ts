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

import {context, getOctokit} from '@actions/github';
import * as core from '@actions/core';

const token = core.getInput('repo-token');
const octokit = getOctokit(token);

export async function createOrUpdateRef(name: string, sha: string) {
  let ref = undefined;

  if (!name.startsWith('refs/')) {
    // for get and update the prefix is needed, but not for otherwise
    throw new Error('wrong ref name');
  }

  try {
    core.debug('trying to get ref');
    ref = await octokit.git.getRef({
      owner: context.repo.owner,
      repo: context.repo.repo,
      ref: name.substring(5)
    });
    core.debug(`ref.status: ${ref.status}`);

    core.debug('trying to update ref');
    ref = await octokit.git.updateRef({
      owner: context.repo.owner,
      repo: context.repo.repo,
      ref: name.substring(5),
      sha
    });
  } catch (error) {
    core.debug(`ref error: ${error}`);
    core.debug(`error.status: ${error.status}`);
    if (error.status !== 404) {
      throw error;
    }

    core.debug('trying to create ref');
    ref = await octokit.git.createRef({
      owner: context.repo.owner,
      repo: context.repo.repo,
      ref: name,
      sha
    });
  }

  core.debug(`Ref sha: ${ref.data.object.sha}`);
}
