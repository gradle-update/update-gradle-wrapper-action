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

import {isAbsolute} from 'path';
import {existsSync, readFileSync} from 'fs';

export interface IWrapperInfo {
  readonly version: string;
  readonly path: string;
  readonly distType: string;
  readonly basePath: string;
  readonly withVerificationMetadataFile: boolean;
}

export function createWrapperInfo(path: string): IWrapperInfo {
  return new WrapperInfo(path);
}

class WrapperInfo implements IWrapperInfo {
  readonly version: string;
  readonly path: string;
  readonly distType: string;
  readonly basePath: string;
  readonly withVerificationMetadataFile: boolean;

  constructor(path: string) {
    if (!isAbsolute(path)) {
      throw new Error(`${path} is not an absolute path`);
    }

    this.path = path;
    this.basePath = path.replace(
      'gradle/wrapper/gradle-wrapper.properties',
      ''
    );

    core.debug('WrapperInfo');
    core.debug(`  path: ${this.path}`);
    core.debug(`  basePath: ${this.basePath}`);

    const verificationMetadataFilePath = path.replace(
      'gradle/wrapper/gradle-wrapper.properties',
      'gradle/verification-metadata.xml'
    );
    this.withVerificationMetadataFile = existsSync(
      verificationMetadataFilePath
    );
    core.debug(
      `  withVerificationMetadataFile: ${this.withVerificationMetadataFile}`
    );

    const props = readFileSync(path).toString();
    core.debug(`  props: ${props.replace(/\n/g, ' ')}`);

    const distributionUrl = props
      .trim()
      .split('\n')
      .find(line => line.startsWith('distributionUrl='));

    core.debug(`distributionUrl: ${distributionUrl}`);

    const parsed =
      distributionUrl !== undefined
        ? /^distributionUrl=.*\/gradle-(.+)-([^.-]+)\.zip$/.exec(
            distributionUrl
          )
        : null;

    const version = parsed?.[1];
    const distType = parsed?.[2];

    if (version !== undefined && distType !== undefined) {
      core.debug(`  version: ${version}`);
      core.debug(`  distribution: ${distType}`);

      this.version = version;
      this.distType = distType;
      return;
    }

    throw new Error('Unable to parse properties file');
  }
}
