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

import {getInputs} from '../../src/inputs';
jest.mock('@actions/core');

describe('getInputs', () => {
  let ymlInputs = {} as {[key: string]: string};

  beforeAll(() => {
    jest.spyOn(core, 'getInput').mockImplementation((name: string) => {
      return ymlInputs[name] || '';
    });
  });

  beforeEach(() => {
    ymlInputs = {};
  });

  it('throws if repo-token is empty', () => {
    ymlInputs = {};

    expect(() => getInputs()).toThrowError();
  });

  it('sets default values for all inputs', () => {
    ymlInputs = {
      'repo-token': 's3cr3t'
    };

    expect(getInputs()).toMatchInlineSnapshot(`
      ActionInputs {
        "baseBranch": "",
        "distributionsBaseUrl": "",
        "labels": Array [],
        "mergeMethod": undefined,
        "paths": Array [],
        "pathsIgnore": Array [],
        "prTitleTemplate": "Update Gradle Wrapper from %sourceVersion% to %targetVersion%",
        "releaseChannel": "stable",
        "repoToken": "s3cr3t",
        "reviewers": Array [],
        "setDistributionChecksum": true,
        "targetBranch": "",
        "teamReviewers": Array [],
      }
    `);
  });

  describe('reviewers', () => {
    it('accepts comma and newline-separated values', () => {
      const tests: [string, string[]][] = [
        ['', []],
        ['foo', ['foo']],
        ['foo,bar', ['foo', 'bar']],
        ['foo, bar', ['foo', 'bar']],
        ['foo bar', ['foo bar']],
        ['foo\nbar', ['foo', 'bar']],
        ['foo \n bar, baz', ['foo', 'bar', 'baz']],
        ['foo \n bar baz ', ['foo', 'bar baz']]
      ];

      for (const [value, expected] of tests) {
        ymlInputs = {
          'repo-token': 's3cr3t',
          reviewers: value
        };

        expect(getInputs().reviewers).toStrictEqual(expected);
      }
    });
  });

  describe('team-reviewers', () => {
    it('accepts comma and newline-separated values', () => {
      const tests: [string, string[]][] = [
        ['', []],
        ['foo', ['foo']],
        ['foo,bar', ['foo', 'bar']],
        ['foo, bar', ['foo', 'bar']],
        ['foo bar', ['foo bar']],
        ['foo\nbar', ['foo', 'bar']],
        ['foo \n bar, baz', ['foo', 'bar', 'baz']],
        ['foo \n bar baz ', ['foo', 'bar baz']]
      ];

      for (const [value, expected] of tests) {
        ymlInputs = {
          'repo-token': 's3cr3t',
          'team-reviewers': value
        };

        expect(getInputs().teamReviewers).toStrictEqual(expected);
      }
    });
  });

  describe('labels', () => {
    it('accepts comma and newline-separated values', () => {
      const tests: [string, string[]][] = [
        ['', []],
        ['foo', ['foo']],
        ['foo,bar', ['foo', 'bar']],
        ['foo, bar', ['foo', 'bar']],
        ['foo bar', ['foo bar']],
        ['foo\nbar', ['foo', 'bar']],
        ['foo \n bar, baz', ['foo', 'bar', 'baz']],
        ['foo \n bar baz ', ['foo', 'bar baz']]
      ];

      for (const [value, expected] of tests) {
        ymlInputs = {
          'repo-token': 's3cr3t',
          labels: value
        };

        expect(getInputs().labels).toStrictEqual(expected);
      }
    });
  });

  describe('baseBranch', () => {
    it('defaults to empty input', () => {
      ymlInputs = {
        'repo-token': 's3cr3t'
      };

      expect(getInputs().baseBranch).toStrictEqual('');
    });

    it('is set to the input string value', () => {
      ymlInputs = {
        'repo-token': 's3cr3t',
        'base-branch': 'a-branch-name'
      };

      expect(getInputs().baseBranch).toStrictEqual('a-branch-name');
    });
  });

  describe('targetBranch', () => {
    it('defaults to empty input', () => {
      ymlInputs = {
        'repo-token': 's3cr3t'
      };

      expect(getInputs().targetBranch).toStrictEqual('');
    });

    it('is set to the input string value', () => {
      ymlInputs = {
        'repo-token': 's3cr3t',
        'target-branch': 'a-branch-name'
      };

      expect(getInputs().targetBranch).toStrictEqual('a-branch-name');
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

      for (const [value, expected] of tests) {
        ymlInputs = {
          'repo-token': 's3cr3t',
          'set-distribution-checksum': value
        };

        expect(getInputs().setDistributionChecksum).toEqual(expected);
      }
    });
  });

  describe('releaseChannel', () => {
    it('defaults to stable channel', () => {
      ymlInputs = {
        'repo-token': 's3cr3t'
      };

      expect(getInputs().releaseChannel).toStrictEqual('stable');
    });

    it('is set to the input string value', () => {
      ymlInputs = {
        'repo-token': 's3cr3t',
        'release-channel': 'release-candidate'
      };

      expect(getInputs().releaseChannel).toStrictEqual('release-candidate');
    });

    it('throws for unexpected channel', () => {
      ymlInputs = {
        'repo-token': 's3cr3t',
        'release-channel': 'unexpected-channel'
      };

      expect(() => getInputs()).toThrowError();
    });
  });

  describe('prTitleTemplate', () => {
    it('defaults to "Update Gradle Wrapper from %sourceVersion% to %targetVersion%"', () => {
      ymlInputs = {
        'repo-token': 's3cr3t'
      };

      expect(getInputs().prTitleTemplate).toStrictEqual(
        'Update Gradle Wrapper from %sourceVersion% to %targetVersion%'
      );
    });

    it('is set to the input string value', () => {
      ymlInputs = {
        'repo-token': 's3cr3t',
        'pr-title-template':
          'Change wrapper from %sourceVersion% to %targetVersion%'
      };

      expect(getInputs().prTitleTemplate).toStrictEqual(
        'Change wrapper from %sourceVersion% to %targetVersion%'
      );
    });
  });
});
