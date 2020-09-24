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

import {WrapperInfo} from './wrapperInfo';
import {WrapperUpdater} from './wrapperUpdater';
import * as api from './api';
import * as git from './git';
import * as releases from './releases';

async function run() {
  try {
    if (core.isDebug()) {
      core.debug(JSON.stringify(process.env, null, 2));
    }

    const releaseInfo = await releases.latest();

    const ref = await api.findMatchingRef(releaseInfo.version);

    if (ref) {
      core.info('Found an existing ref, stopping here.');
      core.debug(`Ref url: ${ref.url}`);
      core.debug(`Ref sha: ${ref.object.sha}`);
      core.warning(
        `A pull request already exists that updates Gradle Wrapper to ${releaseInfo.version}.`
      );
      return;
    }

    const currentWrapper = new WrapperInfo(
      'gradle/wrapper/gradle-wrapper.properties'
    );

    // read current version before updating the wrapper
    core.debug(`Current Wrapper: ${currentWrapper.version}`);

    core.info('Updating Wrapper');
    const updater = new WrapperUpdater({
      wrapper: currentWrapper,
      targetRelease: releaseInfo
    });
    await updater.update();

    core.info(`Checking modified files`);
    const modifiedFiles: string[] = await git.gitDiffNameOnly();
    core.debug(`Modified files count: ${modifiedFiles.length}`);
    core.debug(`Modified files list: ${modifiedFiles}`);

    if (!modifiedFiles.length) {
      core.warning(
        `✅ Gradle Wrapper is already up-to-date (version ${releaseInfo.version})! 👍`
      );
      return;
    }

    core.info('Verifying Wrapper');
    await updater.verify();

    core.info('Creating PR');
    const pr_url = await api.commitAndCreatePR(
      modifiedFiles,
      currentWrapper.version
    );

    core.info(`✅ Created a Pull Request at ${pr_url} ✨`);
  } catch (error) {
    // setFailed is fatal (terminates action), core.error creates a failure
    // annotation instead
    core.setFailed(`❌ ${error.message}`);
  }
}

run();
