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
import {minimatch} from 'minimatch';

export async function findWrapperPropertiesFiles(
  pathsInclude: string[],
  pathsIgnore: string[]
): Promise<string[]> {
  const globber = await glob.create(
    '**/gradle/wrapper/gradle-wrapper.properties',
    {followSymbolicLinks: false}
  );

  let propertiesFiles = await globber.glob();

  core.debug(
    `wrapper.properties found: ${JSON.stringify(propertiesFiles, null, 2)}`
  );

  if (!propertiesFiles.length) {
    return propertiesFiles;
  }

  if (pathsInclude.length) {
    propertiesFiles = propertiesFiles.filter(wrapperPath =>
      pathsInclude.some(pattern => minimatch(wrapperPath, pattern))
    );
  }

  core.debug(
    `wrapper.properties after pathsInclude: ${JSON.stringify(
      propertiesFiles,
      null,
      2
    )}`
  );

  if (pathsIgnore.length) {
    propertiesFiles = propertiesFiles.filter(
      wrapperPath =>
        !pathsIgnore.some(pattern => minimatch(wrapperPath, pattern))
    );
  }

  core.debug(
    `wrapper.properties after pathsExclude: ${JSON.stringify(
      propertiesFiles,
      null,
      2
    )}`
  );

  return propertiesFiles;
}
