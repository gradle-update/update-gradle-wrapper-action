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

export async function verifySha() {
  const {stdout} = await cmd.execWithOutput('sha256sum', [
    'gradle/wrapper/gradle-wrapper.jar'
  ]);

  const [sum] = stdout.split(' ');
  core.debug(`SHA-256: ${sum}`);

  if (sum !== process.env.GRADLE_WRAPPER_JAR_CHECKSUM) {
    throw new Error('SHA-256 Wrapper jar mismatch');
  }
}

// if the checksum is incorrect this will fail
export async function verifyRun() {
  const {exitCode, stderr} = await cmd.execWithOutput('./gradlew', ['--help']);

  if (exitCode !== 0 && stderr.length) {
    const mismatch = stderr.split('\n').filter(line => line.match(/checksum:/));
    throw new Error(
      `Gradle binary verification error 🚨\n\n${mismatch.join('\n')}`
    );
  }
}

export async function updateWrapper(version: string) {
  const [, distType] = await distributionType();

  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  const sha256sum =
    distType === 'bin'
      ? process.env.GRADLE_DIST_BIN_CHECKSUM!
      : process.env.GRADLE_DIST_ALL_CHECKSUM!;
  /* eslint-enable @typescript-eslint/no-non-null-assertion */

  const {exitCode, stderr} = await cmd.execWithOutput('gradle', [
    'wrapper',
    '--gradle-version',
    version,
    '--distribution-type',
    distType,
    // Writes checksum of the distribution binary in gradle-wrapper.properties
    // so that it will be verified on first execution
    '--gradle-distribution-sha256-sum',
    sha256sum
  ]);

  if (exitCode !== 0) {
    throw new Error(stderr);
  }
}

export async function distributionType(): Promise<string[]> {
  const {stdout} = await cmd.execWithOutput('grep', [
    '^distributionUrl=.*zip$',
    'gradle/wrapper/gradle-wrapper.properties'
  ]);

  core.debug(`Grep output: ${stdout}`);

  const parsed = /^distributionUrl=.*\/gradle-([^-]+)-([^.]+)\.zip$/.exec(
    stdout
  );

  if (parsed) {
    const [, version, distType] = parsed;
    core.debug(`Version: ${version}`);
    core.debug(`Distribution: ${distType}`);

    return [version, distType];
  }

  throw new Error('Unable to parse properties file');
}
