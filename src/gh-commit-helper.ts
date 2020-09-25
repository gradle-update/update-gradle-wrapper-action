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

import {context} from '@actions/github';
// import {context, getOctokit} from '@actions/github';
import {readFileSync} from 'fs';
import * as core from '@actions/core';

import * as git from './git';

import {GitHub, getOctokitOptions} from '@actions/github/lib/utils';
import * as throttling from '@octokit/plugin-throttling';

const token = core.getInput('repo-token');
const octokit0 = GitHub.plugin(throttling.throttling);
const octokit = new octokit0(
  getOctokitOptions(token, {
    throttle: {
      onRateLimit: (retryAfter: number, options: any) => {
        core.debug(
          `Request quota exhausted for request ${options.method} ${options.url}`
        );

        core.debug(JSON.stringify(options, null, 2));

        if (retryAfter > 100) {
          core.error(`rate limit`);
        }

        if (options.request.retryCount === 0) {
          // only retries once
          core.debug(`Retrying after ${retryAfter} seconds!`);
          return true;
        }
      },
      onAbuseLimit: (retryAfter: number, options: any) => {
        // does not retry, only logs a warning
        core.debug(
          `Abuse detected for request ${options.method} ${options.url}`
        );
      }
    }
  })
);

// const octokit = getOctokit(token);

// (After getting the commit from here, one can create or update a reference)
// Update the reference of your branch to point to the new commit SHA
export async function commitFiles(
  files: string[],
  currentCommitSha: string,
  message: string
): Promise<string> {
  // Get the current commit object
  const currentCommit = await octokit.git.getCommit({
    owner: context.repo.owner,
    repo: context.repo.repo,
    commit_sha: currentCommitSha
  });

  // Retrieve the tree it points to
  const currentTree = currentCommit.data.tree.sha;

  // Retrieve the content of the blob object that tree has for that particular file path
  // Change the content somehow and post a new blob object with that new content, getting a blob SHA back
  // Post a new tree object with that file path pointer replaced with your new blob SHA getting a tree SHA back
  const newTree = await createNewTree(currentTree, files);

  // Create a new commit object with the current commit SHA as the parent and the new tree SHA, getting a commit SHA back
  const newCommit = await createCommit(
    newTree.sha,
    currentCommit.data.sha,
    message
  );

  return newCommit.sha;
}

async function createNewTree(parentTreeSha: string, paths: string[]) {
  const treeData = [];

  core.debug(`Creating blob data for ${paths.length} files`);

  // Retrieve the content of the blob object that tree has for that particular file path
  // Change the content somehow and post a new blob object with that new content, getting a blob SHA back
  for (const path of paths) {
    const content = readFileSync(path).toString('base64');

    const blobData = await octokit.git.createBlob({
      owner: context.repo.owner,
      repo: context.repo.repo,
      content,
      encoding: 'base64'
    });
    const sha = blobData.data.sha;

    const mode = await git.gitFileMode(path);

    treeData.push({path, mode, type: 'blob', sha});
  }

  core.debug(`TreeData: ${JSON.stringify(treeData, null, 2)}`);

  // Post a new tree object with that file path pointer replaced with your new blob SHA getting a tree SHA back
  const tree = await octokit.git.createTree({
    owner: context.repo.owner,
    repo: context.repo.repo,
    tree: treeData as any,
    base_tree: parentTreeSha
  });

  core.debug(`Tree sha: ${tree.data.sha}`);

  return tree.data;
}

async function createCommit(
  tree: string,
  currentCommitSha: string,
  message: string
) {
  const commit = await octokit.git.createCommit({
    owner: context.repo.owner,
    repo: context.repo.repo,
    message,
    tree,
    parents: [currentCommitSha],
    author: {
      name: 'gradle-update-robot',
      email: 'gradle-update-robot@regolo.cc',
      date: new Date().toISOString()
    }
  });

  core.debug(`Commit sha: ${commit.data.sha}`);
  core.debug(`Commit author name: ${commit.data.author.name}`);
  core.debug(`Commit committer name: ${commit.data.committer.name}`);
  core.debug(`Commit verified: ${commit.data.verification.verified}`);

  return commit.data;
}
