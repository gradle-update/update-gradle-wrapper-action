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
import * as glob from '@actions/glob';

import {WrapperInfo} from './wrapperInfo';
import {WrapperUpdater} from './wrapperUpdater';
import * as api from './api';
import * as git from './git';
import * as releases from './releases';

import {commitFiles} from './gh-commit-helper';
import {createOrUpdateRef} from './gh-refs-helper';

async function run() {
  try {
    if (core.isDebug()) {
      core.debug(JSON.stringify(process.env, null, 2));
    }

    const targetRelease = await releases.latest();
    core.info(`Latest release: ${targetRelease.version}`);

    const ref = await api.findMatchingRef(targetRelease.version);

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
    core.debug(`Wrappers: ${wrappers}`);

    if (!wrappers.length) {
      core.warning('Unable to find Gradle Wrapper files in this project.');
      return;
    }

    core.debug(`Wrappers count: ${wrappers.length}`);

    const wrapperInfos = wrappers.map(path => new WrapperInfo(path));

    let allModifiedFiles: string[] = [];
    let commitDataList: {files: string[], message:string}[] = [];

    /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
    let currentSha = process.env.GITHUB_SHA!;

    const branchName = `refs/heads/gradlew-update-${targetRelease.version}`;

    for (const wrapper of wrapperInfos) {
      core.startGroup(`Working with Wrapper at: ${wrapper.path}`);

      // read current version before updating the wrapper
      core.debug(`Current Wrapper version: ${wrapper.version}`);

      if (wrapper.version === targetRelease.version) {
        core.debug(`Wrapper is already up-to-date`);
        continue;
      }

      core.startGroup('Updating Wrapper');
      const updater = new WrapperUpdater({wrapper, targetRelease});
      await updater.update();
      core.endGroup();

      core.info('Checking whether any file has been updated');
      const modifiedFiles: string[] = await git.gitDiffNameOnly();
      core.debug(`Modified files count: ${modifiedFiles.length}`);
      core.debug(`Modified files list: ${modifiedFiles}`);

      if (modifiedFiles.length) {
        core.info(`Keeping track of modified files`);

        core.startGroup('Verifying Wrapper');
        await updater.verify();
        core.endGroup();

        const message = `Update Gradle Wrapper from ${wrapper.version} to ${targetRelease.version}.

Update Gradle Wrapper from ${wrapper.version} to ${targetRelease.version}.
- [Release notes](https://docs.gradle.org/${targetRelease.version}/release-notes.html)`;


        commitDataList = commitDataList.concat({
          files: modifiedFiles,
          message: message,
        })

        allModifiedFiles = allModifiedFiles.concat(modifiedFiles);
      } else {
        core.info(`Nothing to update for Wrapper at ${wrapper.path}`);
      }

      core.endGroup();
    }

    core.debug(`All modified files count: ${allModifiedFiles.length}`);
    core.debug(`All modified files list: ${allModifiedFiles}`);
    if (!allModifiedFiles.length) {
      core.warning(
        `✅ Gradle Wrapper is already up-to-date (version ${targetRelease.version})! 👍`
      );
      return;
    }



    commitAllChanges(commitDataList, branchName);
    // currentSha = await commitFiles(modifiedFiles, currentSha, message);
    // await createOrUpdateRef(branchName, currentSha);

    core.info('Creating Pull Request');
    const pullRequestUrl = await api.createPullRequest(
      branchName,
      targetRelease.version,
      wrapperInfos.length === 1 ? wrapperInfos[0].version : undefined
    );

    core.info(`✅ Created a Pull Request at ${pullRequestUrl} ✨`);
  } catch (error) {
    // setFailed is fatal (terminates action), core.error creates a failure
    // annotation instead
    core.setFailed(`❌ ${error.message}`);
  }
}

run();
