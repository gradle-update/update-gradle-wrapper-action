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

import {coreMock} from './mocks/core';

jest.unstable_mockModule('@actions/core', coreMock);

const core = await import('@actions/core');
const {createWrapperInfo} = await import('../src/wrapperInfo');

test('parses a valid properties file', () => {
  const propsPath = path.resolve('tests/data/gradle-wrapper.properties');

  const wrapperInfo = createWrapperInfo(propsPath);
  expect(wrapperInfo.version).toBe('6.6.1');
  expect(wrapperInfo.distType).toBe('all');
});

test('parses a properties file with release candidate version', () => {
  const propsPath = path.resolve(
    'tests/data/gradle-wrapper.release-candidate.properties'
  );

  const wrapperInfo = createWrapperInfo(propsPath);
  expect(wrapperInfo.version).toBe('7.0-rc-1');
  expect(wrapperInfo.distType).toBe('all');
});

test('props debug log replaces all newlines', () => {
  const debugMock = core.debug as jest.Mock;
  debugMock.mockClear();

  const propsPath = path.resolve(
    'tests/data/gradle-wrapper.multiline.properties'
  );
  createWrapperInfo(propsPath);

  const propsCall = debugMock.mock.calls.find(
    ([msg]) => typeof msg === 'string' && msg.startsWith('  props: ')
  );
  expect(propsCall).toBeDefined();
  expect(propsCall![0]).not.toContain('\n');
});
