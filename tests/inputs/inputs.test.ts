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
jest.mock('@actions/core');

import Inputs from '../../src/inputs/inputs';

function mockGetInput(actionInputs: {[key: string]: string}) {
  (core.getInput as jest.Mock).mockImplementation(
    name => actionInputs[name] || ''
  );
}

describe('inputs', () => {
  it('throws if repo-token is empty', () => {
    mockGetInput({});

    expect(() => new Inputs()).toThrowError();
  });

  it('sets default values for all inputs', () => {
    mockGetInput({'repo-token': 's3cr3t'});

    expect(new Inputs()).toMatchInlineSnapshot(`
      Inputs {
        "repoToken": "s3cr3t",
        "reviewers": Array [],
        "setDistributionChecksum": true,
        "targetBranch": "",
      }
    `);
  });

  describe('reviewers', () => {
    it('accepts comma, space and newline-separated values', () => {
      const tests: [string, string[]][] = [
        ['', []],
        ['foo', ['foo']],
        ['foo bar', ['foo', 'bar']],
        ['foo,bar', ['foo', 'bar']],
        ['foo, bar', ['foo', 'bar']],
        ['foo\nbar', ['foo', 'bar']],
        ['foo\n\tbar, baz', ['foo', 'bar', 'baz']]
      ];

      for (let [value, expected] of tests) {
        mockGetInput({
          'repo-token': 's3cr3t',
          reviewers: value
        });

        expect(new Inputs().reviewers).toStrictEqual(expected);
      }
    });
  });

  describe('setDistributionChecksum', () => {
    it('is false only with the "false" string (case-insensitive)', () => {
      const tests: [string, boolean][] = [
        ['', true],
        ['foo', true],
        ['true', true],
        ['false', false],
        ['False', false],
        ['FALSE', false]
      ];

      for (let [value, expected] of tests) {
        mockGetInput({
          'repo-token': 's3cr3t',
          'set-distribution-checksum': value
        });

        expect(new Inputs().setDistributionChecksum).toEqual(expected);
      }
    });
  });
});
