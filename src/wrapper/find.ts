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

import {MatchKind} from '@actions/glob/lib/internal-match-kind';
import {Pattern} from '@actions/glob/lib/internal-pattern';

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
    const toInclude: string[] = [];

    for (const wrapperPath of propertiesFiles) {
      let shouldInclude = false;

      for (const searchPath of pathsInclude) {
        const pattern = new Pattern(searchPath);
        const match = pattern.match(wrapperPath);

        shouldInclude ||= match === MatchKind.All;
      }

      if (shouldInclude) {
        toInclude.push(wrapperPath);
      }
    }

    propertiesFiles = toInclude;
  }

  core.debug(
    `wrapper.properties after pathsInclude: ${JSON.stringify(
      propertiesFiles,
      null,
      2
    )}`
  );

  if (pathsIgnore.length) {
    const toExclude: string[] = [];

    for (const wrapperPath of propertiesFiles) {
      let shouldExclude = false;

      for (const searchPath of pathsIgnore) {
        const pattern = new Pattern(searchPath);
        const match = pattern.match(wrapperPath);

        shouldExclude ||= match === MatchKind.All;
      }

      if (shouldExclude) {
        toExclude.push(wrapperPath);
      }
    }

    propertiesFiles = propertiesFiles.filter(f => !toExclude.includes(f));
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
