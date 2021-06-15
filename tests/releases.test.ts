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

import nock from 'nock';

import {Releases} from '../src/releases';

nock.disableNetConnect();

const nockScope = nock('https://services.gradle.org');

let releases: Releases;

beforeEach(() => {
  nock.cleanAll();

  releases = new Releases();
});

describe('loadRelease', () => {
  it('fetches current release information for stable channel', async () => {
    nockScope
      .get('/versions/current')
      .replyWithFile(200, `${__dirname}/fixtures/current.ok.json`, {
        'Content-Type': 'application/json'
      })
      .get('/distributions/gradle-6.6.1-bin.zip.sha256')
      .reply(200, 'sha256-sum-of-bin-dist', {
        'Content-Type': 'application/octet-stream'
      })
      .get('/distributions/gradle-6.6.1-all.zip.sha256')
      .reply(200, 'sha256-sum-of-all-dist', {
        'Content-Type': 'application/octet-stream'
      })
      .get('/distributions/gradle-6.6.1-wrapper.jar.sha256')
      .reply(200, 'sha256-sum-of-wrapper-jar', {
        'Content-Type': 'application/octet-stream'
      });

    const current = await releases.loadRelease('stable');

    expect(current.version).toEqual('6.6.1');
    expect(current.binChecksum).toEqual('sha256-sum-of-bin-dist');
    expect(current.allChecksum).toEqual('sha256-sum-of-all-dist');
    expect(current.wrapperChecksum).toEqual('sha256-sum-of-wrapper-jar');

    nockScope.done();
  });

  it('fetches release-candidate release information for release-candidate channel', async () => {
    nockScope
      .get('/versions/release-candidate')
      .replyWithFile(200, `${__dirname}/fixtures/release-candidate.ok.json`, {
        'Content-Type': 'application/json'
      })
      .get('/distributions/gradle-7.0-rc-2-bin.zip.sha256')
      .reply(200, 'sha256-sum-of-bin-dist', {
        'Content-Type': 'application/octet-stream'
      })
      .get('/distributions/gradle-7.0-rc-2-all.zip.sha256')
      .reply(200, 'sha256-sum-of-all-dist', {
        'Content-Type': 'application/octet-stream'
      })
      .get('/distributions/gradle-7.0-rc-2-wrapper.jar.sha256')
      .reply(200, 'sha256-sum-of-wrapper-jar', {
        'Content-Type': 'application/octet-stream'
      });

    const current = await releases.loadRelease('release-candidate');

    expect(current.version).toEqual('7.0-rc-2');
    expect(current.binChecksum).toEqual('sha256-sum-of-bin-dist');
    expect(current.allChecksum).toEqual('sha256-sum-of-all-dist');
    expect(current.wrapperChecksum).toEqual('sha256-sum-of-wrapper-jar');

    nockScope.done();
  });

  it('throws error if remote server is unavailable', async () => {
    nockScope.get('/versions/current').reply(500);

    await expect(releases.loadRelease('stable')).rejects.toThrowError();

    nockScope.done();
  });

  it('throws error if remote endpoint is not found', async () => {
    nockScope.get('/versions/current').reply(404);

    await expect(releases.loadRelease('stable')).rejects.toThrowError();

    nockScope.done();
  });

  it('throws error if any of the checksum endpoints is not available', async () => {
    nockScope
      .get('/versions/current')
      .replyWithFile(200, `${__dirname}/fixtures/current.ok.json`, {
        'Content-Type': 'application/json'
      })
      .get('/distributions/gradle-6.6.1-bin.zip.sha256')
      .reply(200, 'sha256-sum-of-bin-dist', {
        'Content-Type': 'application/octet-stream'
      })
      .get('/distributions/gradle-6.6.1-all.zip.sha256')
      .reply(404);

    await expect(releases.loadRelease('stable')).rejects.toThrowError();

    nockScope.done();
  });
});
