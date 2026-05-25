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

import {jest} from '@jest/globals';

import * as path from 'path';
import {fileURLToPath} from 'url';

import {coreMock} from '../mocks/core';

jest.unstable_mockModule('@actions/core', coreMock);

jest.unstable_mockModule('@actions/glob', () => ({
  create: jest.fn()
}));

const glob = await import('@actions/glob');
const {findWrapperPropertiesFiles} = await import('../../src/wrapper/find');

describe('findWrapperPropertiesFiles', () => {
  it('filters paths based on include and ignore lists', async () => {
    const pathPrefix = path.dirname(fileURLToPath(import.meta.url));

    jest.mocked(glob.create).mockResolvedValue({
      getSearchPaths: jest.fn(),
      glob: jest
        .fn<() => Promise<string[]>>()
        .mockResolvedValue([
          `${pathPrefix}/path_a/gradle/wrapper/gradle-wrapper.properties`,
          `${pathPrefix}/path_b/gradle/wrapper/gradle-wrapper.properties`,
          `${pathPrefix}/path_b/subpath_c/gradle/wrapper/gradle-wrapper.properties`
        ]),
      globGenerator: jest.fn()
    } as unknown as Awaited<ReturnType<typeof glob.create>>);

    const tests: {
      pathsInclude: string[];
      pathsIgnore: string[];
      pathsExpected: string[];
    }[] = [
      {
        pathsInclude: [],
        pathsIgnore: [],
        pathsExpected: [
          `${pathPrefix}/path_a/gradle/wrapper/gradle-wrapper.properties`,
          `${pathPrefix}/path_b/gradle/wrapper/gradle-wrapper.properties`,
          `${pathPrefix}/path_b/subpath_c/gradle/wrapper/gradle-wrapper.properties`
        ]
      },
      {
        pathsInclude: [`${pathPrefix}/path_a/**`],
        pathsIgnore: [],
        pathsExpected: [
          `${pathPrefix}/path_a/gradle/wrapper/gradle-wrapper.properties`
        ]
      },
      {
        pathsInclude: [],
        pathsIgnore: [`${pathPrefix}/path_a/**`],
        pathsExpected: [
          `${pathPrefix}/path_b/gradle/wrapper/gradle-wrapper.properties`,
          `${pathPrefix}/path_b/subpath_c/gradle/wrapper/gradle-wrapper.properties`
        ]
      },
      {
        pathsInclude: [`${pathPrefix}/path_a/**`],
        pathsIgnore: [`${pathPrefix}/path_a/**`],
        pathsExpected: []
      },
      {
        pathsInclude: [`${pathPrefix}/path_b/**`],
        pathsIgnore: [`${pathPrefix}/path_b/subpath_c/**`],
        pathsExpected: [
          `${pathPrefix}/path_b/gradle/wrapper/gradle-wrapper.properties`
        ]
      }
    ];

    for (const t of tests) {
      const files = await findWrapperPropertiesFiles(
        t.pathsInclude,
        t.pathsIgnore
      );
      expect(files).toEqual(t.pathsExpected);
    }

    expect(glob.create).toHaveBeenCalledTimes(tests.length);
  });
});
