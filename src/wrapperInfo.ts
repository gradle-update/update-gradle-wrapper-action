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

import {readFileSync} from 'fs';
import {isAbsolute} from 'path';

export class WrapperInfo {
  readonly version: string;
  readonly path: string;
  readonly distType: string;
  readonly basePath: string;

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

    const props = readFileSync(path).toString();
    core.debug(`  props: ${props.replace('\n', ' ')}`);

    const distributionUrl = props
      .trim()
      .split('\n')
      .filter(line => line.startsWith('distributionUrl='))[0];

    core.debug(`distributionUrl: ${distributionUrl}`);

    const parsed = /^distributionUrl=.*\/gradle-([^-]+)-([^.]+)\.zip$/.exec(
      distributionUrl
    );

    if (parsed) {
      const [, version, distType] = parsed;
      core.debug(`  version: ${version}`);
      core.debug(`  distribution: ${distType}`);

      [this.version, this.distType] = [version, distType];
      return;
    }

    throw new Error('Unable to parse properties file');
  }
}
