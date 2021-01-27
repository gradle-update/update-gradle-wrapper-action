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
import * as glob from '@actions/glob';

import {commit} from '../git/git-commit';
import {createWrapperInfo} from '../wrapperInfo';
import {createWrapperUpdater} from '../wrapperUpdater';
import {GitHubOps} from '../github/gh-ops';
import {IGitHubApi} from '../github/gh-api';
import {Inputs} from '../inputs';
import {Releases} from '../releases';
import * as git from '../git/git-cmds';
import * as gitAuth from '../git/git-auth';
import * as store from '../store';

export class MainAction {
  private inputs: Inputs;
  private githubApi: IGitHubApi;
  private githubOps: GitHubOps;
  private releases: Releases;

  constructor(
    inputs: Inputs,
    githubApi: IGitHubApi,
    githubOps: GitHubOps,
    releases: Releases
  ) {
    this.inputs = inputs;
    this.githubApi = githubApi;
    this.githubOps = githubOps;
    this.releases = releases;
  }

  async run() {
    try {
      store.setMainActionExecuted();

      core.debug(JSON.stringify(process.env, null, 2));

      await gitAuth.setup(this.inputs);

      const targetRelease = await this.releases.current();
      core.info(`Latest release: ${targetRelease.version}`);

      const ref = await this.githubOps.findMatchingRef(targetRelease.version);

      if (ref) {
        core.info('Found an existing ref, stopping here.');
        core.debug(`Ref url: ${ref.url}`);
        core.debug(`Ref sha: ${ref.object.sha}`);
        core.warning(
          `A pull request already exists that updates Gradle Wrapper to ${targetRelease.version}.`
        );
        return;
      }

      const globber = await glob.create(
        '**/gradle/wrapper/gradle-wrapper.properties',
        {followSymbolicLinks: false}
      );
      const wrappers = await globber.glob();
      core.debug(`Wrappers: ${JSON.stringify(wrappers, null, 2)}`);

      if (!wrappers.length) {
        core.warning('Unable to find Gradle Wrapper files in this project.');
        return;
      }

      core.debug(`Wrappers count: ${wrappers.length}`);

      const wrapperInfos = wrappers.map(path => createWrapperInfo(path));

      const commitDataList: {
        files: string[];
        targetVersion: string;
        sourceVersion: string;
      }[] = [];

      await git.config('user.name', 'gradle-update-robot');
      await git.config('user.email', 'gradle-update-robot@regolo.cc');

      const baseBranch =
        this.inputs.baseBranch !== ''
          ? this.inputs.baseBranch
          : await this.githubApi.repoDefaultBranch();
      core.debug(`Base branch: ${baseBranch}`);

      await this.switchBranch(baseBranch);

      const currentCommitSha = await git.parseHead();
      core.debug(`Head for branch ${baseBranch} is at ${currentCommitSha}`);

      core.startGroup('Creating branch');
      const branchName = `gradlew-update-${targetRelease.version}`;
      await git.checkoutCreateBranch(branchName, currentCommitSha);
      core.endGroup();

      const distTypes = new Set<string>();

      for (const wrapper of wrapperInfos) {
        core.startGroup(`Working with Wrapper at: ${wrapper.path}`);

        // read current version before updating the wrapper
        core.debug(`Current Wrapper version: ${wrapper.version}`);

        if (wrapper.version === targetRelease.version) {
          core.info(`Wrapper is already up-to-date`);
          continue;
        }

        distTypes.add(wrapper.distType);

        const updater = createWrapperUpdater(
          wrapper,
          targetRelease,
          this.inputs.setDistributionChecksum
        );

        core.startGroup('Updating Wrapper');
        await updater.update();
        core.endGroup();

        core.startGroup('Checking whether any file has been updated');
        const modifiedFiles = await git.gitDiffNameOnly();
        core.debug(`Modified files count: ${modifiedFiles.length}`);
        core.debug(`Modified files list: ${modifiedFiles}`);
        core.endGroup();

        if (modifiedFiles.length) {
          core.startGroup('Verifying Wrapper');
          await updater.verify();
          core.endGroup();

          core.startGroup('Committing');
          await commit(modifiedFiles, targetRelease.version, wrapper.version);
          core.endGroup();

          commitDataList.push({
            files: modifiedFiles,
            targetVersion: targetRelease.version,
            sourceVersion: wrapper.version
          });
        } else {
          core.info(`Nothing to update for Wrapper at ${wrapper.path}`);
        }

        core.endGroup();
      }

      if (!commitDataList.length) {
        core.warning(
          `✅ Gradle Wrapper is already up-to-date (version ${targetRelease.version})! 👍`
        );
        return;
      }

      const changedFilesCount = commitDataList
        .map(cd => cd.files.length)
        .reduce((acc, item) => acc + item);
      core.debug(
        `Have added ${commitDataList.length} commits for a total of ${changedFilesCount} files`
      );

      core.info('Pushing branch');
      await git.push(branchName);

      core.info('Creating Pull Request');
      const pullRequestData = await this.githubOps.createPullRequest(
        branchName,
        distTypes,
        targetRelease,
        commitDataList.length === 1
          ? commitDataList[0].sourceVersion
          : undefined
      );

      core.info(`✅ Created a Pull Request at ${pullRequestData.url} ✨`);

      store.setPullRequestData(pullRequestData);
    } catch (error) {
      // setFailed is fatal (terminates action), core.error
      // creates a failure annotation instead
      core.setFailed(`❌ ${error.message}`);
    }
  }

  private async switchBranch(branchName: string) {
    await git.fetch();
    const exitCode = await git.checkout(branchName);
    if (exitCode !== 0) {
      throw new Error(`Invalid base branch ${branchName}`);
    }
  }
}
