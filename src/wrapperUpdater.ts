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

import * as cmd from './cmd';
import type {IWrapperInfo} from './wrapperInfo';
import type {Release} from './releases';

export interface IWrapperUpdater {
  update: () => Promise<void>;
  verify: () => Promise<void>;
}

export function createWrapperUpdater(
  wrapper: IWrapperInfo,
  targetRelease: Release,
  setDistributionChecksum: boolean,
  distributionsBaseUrl: string
): IWrapperUpdater {
  return new WrapperUpdater(
    wrapper,
    targetRelease,
    setDistributionChecksum,
    distributionsBaseUrl
  );
}

class WrapperUpdater implements IWrapperUpdater {
  private targetRelease: Release;
  private wrapper: IWrapperInfo;
  private readonly setDistributionChecksum: boolean;
  private readonly distributionsBaseUrl: string;

  constructor(
    wrapper: IWrapperInfo,
    targetRelease: Release,
    setDistributionChecksum: boolean,
    distributionsBaseUrl: string
  ) {
    this.wrapper = wrapper;
    this.targetRelease = targetRelease;
    this.setDistributionChecksum = setDistributionChecksum;
    this.distributionsBaseUrl = distributionsBaseUrl;
  }

  async update() {
    let args = [
      'wrapper',
      '--gradle-version',
      this.targetRelease.version,
      '--distribution-type',
      this.wrapper.distType
    ];

    if (this.distributionsBaseUrl) {
      const url = `${this.distributionsBaseUrl}/gradle-${this.targetRelease.version}-${this.wrapper.distType}.zip`;
      args = ['wrapper', '--gradle-distribution-url', url];
    }

    if (this.setDistributionChecksum) {
      const sha256sum =
        this.wrapper.distType === 'bin'
          ? this.targetRelease.binChecksum
          : this.targetRelease.allChecksum;

      // Writes checksum of the distribution binary in gradle-wrapper.properties
      // so that it will be verified on first execution
      args = args.concat(['--gradle-distribution-sha256-sum', sha256sum]);
    }

    // Update verification data, if used
    if (this.wrapper.withVerificationMetadataFile) {
      args = args.concat(['--write-verification-metadata', 'sha256']);
    }

    const {exitCode, stderr} = await cmd.execWithOutput(
      './gradlew',
      args,
      this.wrapper.basePath
    );

    if (exitCode !== 0) {
      throw new Error(stderr);
    }
  }

  async verify() {
    await this.verifySha();
    await this.verifyRun();
  }

  private async verifySha() {
    const jarFilePath = this.wrapper.path.replace(
      'gradle-wrapper.properties',
      'gradle-wrapper.jar'
    );
    core.debug(`Verifying SHA-256 for: ${jarFilePath}`);

    const {stdout} = await cmd.execWithOutput('sha256sum', [jarFilePath]);

    const [sum] = stdout.split(' ');
    core.debug(`SHA-256: ${sum}`);

    if (sum !== this.targetRelease.wrapperChecksum) {
      throw new Error('SHA-256 Wrapper jar mismatch');
    }
  }

  // if the checksum is incorrect this will fail
  private async verifyRun() {
    const {exitCode, stderr} = await cmd.execWithOutput(
      './gradlew',
      ['--help'],
      this.wrapper.basePath
    );

    if (exitCode !== 0 && stderr.length) {
      const mismatch = stderr
        .split('\n')
        .filter(line => line.match(/checksum:/));
      throw new Error(
        `Gradle binary verification error 🚨\n\n${mismatch.join('\n')}`
      );
    }
  }
}
