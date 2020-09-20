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

import * as wrapper from './wrapper';
import * as api from './api';
import * as git from './git';

const GRADLE_VERSION = '6.6.1';

async function run() {
  try {
    const ref = await api.findMatchingRef(GRADLE_VERSION);

    if (ref) {
      core.info('Found an existing ref, stopping here.');
      core.debug(`Ref url: ${ref.url}`);
      core.debug(`Ref sha: ${ref.object.sha}`);
      core.warning(
        `A pull request already exists that updates Gradle Wrapper to ${GRADLE_VERSION}.`
      );
      return;
    }

    // read current version before updating the wrapper
    const [currentVersion] = await wrapper.distributionType();
    core.debug(`Current Wrapper: ${currentVersion}`);

    core.info('Updating Wrapper');
    await wrapper.updateWrapper(GRADLE_VERSION);

    core.info(`Checking modified files`);
    const modifiedFiles: string[] = await git.gitDiffNameOnly();
    core.debug(`Modified files count: ${modifiedFiles.length}`);
    core.debug(`Modified files list: ${modifiedFiles}`);

    if (!modifiedFiles.length) {
      core.warning(
        `✅ Gradle Wrapper is already up-to-date (version ${GRADLE_VERSION})! 👍`
      );
      return;
    }

    core.info('Verifying Wrapper');
    await wrapper.verifySha();
    await wrapper.verifyRun();

    core.info('Creating PR');
    const pr_url = await api.commitAndCreatePR(modifiedFiles, currentVersion);

    core.info(`✅ Created a Pull Request at ${pr_url} ✨`);
  } catch (error) {
    // setFailed is fatal (terminates action), core.error creates a failure
    // annotation instead
    core.setFailed(`❌ ${error.message}`);
  }
}

run();
