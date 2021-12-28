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

import * as glob from '@actions/glob';
import * as path from 'path';

import {findWrapperPropertiesFiles} from '../../src/wrapper/find';

describe('findWrapperPropertiesFiles', () => {
  it('filters paths based on include and ignore lists', async () => {
    const pathPrefix = path.dirname(__filename);

    jest.spyOn(glob, 'create').mockResolvedValue({
      getSearchPaths: jest.fn(),
      glob: jest
        .fn()
        .mockReturnValue([
          `${pathPrefix}/path_a/gradle/wrapper/gradle-wrapper.properties`,
          `${pathPrefix}/path_b/gradle/wrapper/gradle-wrapper.properties`,
          `${pathPrefix}/path_b/subpath_c/gradle/wrapper/gradle-wrapper.properties`
        ]),
      globGenerator: jest.fn()
    });

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
