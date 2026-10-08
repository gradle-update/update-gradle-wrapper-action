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

import * as git from '../git/git-cmds.js';
import * as gitAuth from '../git/git-auth.js';
import * as store from '../store/index.js';

import {commit} from '../git/git-commit.js';
import {replaceVersionPlaceholders} from '../messages.js';
import {createWrapperInfo} from '../wrapperInfo.js';
import {createWrapperUpdater} from '../wrapperUpdater.js';
import {findWrapperPropertiesFiles} from '../wrapper/find.js';
import type {GitHubOps} from '../github/gh-ops.js';
import type {IGitHubApi} from '../github/gh-api.js';
import type {Inputs} from '../inputs/index.js';
import type {Releases} from '../releases.js';

export class MainAction {
  constructor(
    private inputs: Inputs,
    private githubApi: IGitHubApi,
    private githubOps: GitHubOps,
    private releases: Releases
  ) {}

  async run() {
    try {
      store.setMainActionExecuted();

      core.debug(JSON.stringify(process.env, null, 2));

      await gitAuth.setup(this.inputs);

      const releaseChannel = this.inputs.releaseChannel;
      const targetRelease =
        await this.releases.fetchReleaseInformation(releaseChannel);
      core.info(
        `Latest release: ${targetRelease.version} (channel ${releaseChannel})`
      );

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

      const wrappers = await findWrapperPropertiesFiles(
        this.inputs.paths,
        this.inputs.pathsIgnore
      );
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
          this.inputs.setDistributionChecksum,
          this.inputs.distributionsBaseUrl,
          this.inputs.additionalArguments
        );

        core.startGroup('Updating Wrapper');
        await updater.update();
        core.endGroup();

        core.startGroup('Checking whether any file has been updated');
        let modifiedFiles = await git.gitDiffNameOnly();
        core.debug(`Modified files count: ${modifiedFiles.length}`);
        core.debug(`Modified files list: ${modifiedFiles}`);
        core.endGroup();

        if (modifiedFiles.length) {
          // Running the `wrapper` task a second time ensures that the wrapper jar itself
          // and the wrapper scripts get updated if a new version is available (happens infrequently).
          // https://docs.gradle.org/current/userguide/gradle_wrapper.html#sec:upgrading_wrapper
          core.startGroup('Updating Wrapper (2nd update)');
          await updater.update();
          modifiedFiles = await git.gitDiffNameOnly();
          core.debug(`Modified files count: ${modifiedFiles.length}`);
          core.debug(`Modified files list: ${modifiedFiles}`);
          core.endGroup();

          core.startGroup('Verifying Wrapper');
          await updater.verify();
          core.endGroup();

          core.startGroup('Committing');

          const commitMessage = replaceVersionPlaceholders(
            this.inputs.commitMessageTemplate,
            wrapper.version,
            targetRelease.version
          );
          await commit(modifiedFiles, commitMessage);
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

      const changedFilesCount = commitDataList.reduce(
        (acc, cd) => acc + cd.files.length,
        0
      );
      core.debug(
        `Have added ${commitDataList.length} commits for a total of ${changedFilesCount} files`
      );

      core.info('Pushing branch');
      await git.push(branchName);

      core.info('Creating Pull Request');
      const singleSourceVersion =
        commitDataList.length === 1
          ? commitDataList[0]?.sourceVersion
          : undefined;
      const pullRequestData = await this.githubOps.createPullRequest(
        branchName,
        distTypes,
        targetRelease,
        singleSourceVersion
      );

      core.info(`✅ Created a Pull Request at ${pullRequestData.url} ✨`);

      store.setPullRequestData(pullRequestData);
    } catch (error) {
      // setFailed is fatal (terminates action), core.error
      // creates a failure annotation instead
      core.setFailed(
        `❌ ${error instanceof Error ? error.message : String(error)}`
      );
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
