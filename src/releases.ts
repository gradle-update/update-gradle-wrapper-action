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

import {HttpClient} from '@actions/http-client';
import {ITypedResponse} from '@actions/http-client/interfaces';

export interface Release {
  version: string;
  allChecksum: string;
  binChecksum: string;
  wrapperChecksum: string;
}

interface ReleaseData {
  version: string;
  buildTime: string;
  current: boolean;
  snapshot: boolean;
  nightly: boolean;
  releaseNightly: boolean;
  activeRc: boolean;
  rcFor: string;
  milestoneFor: string;
  broken: boolean;
  downloadUrl: string;
  checksumUrl: string;
  wrapperChecksumUrl: string;
}

export class Releases {
  private client: HttpClient;

  constructor() {
    this.client = new HttpClient('Update Gradle Wrapper Action');
  }

  async current(): Promise<Release> {
    const response = await this.client.getJson<ReleaseData>(
      // TODO: with 404 result is null, 500 throws
      'https://services.gradle.org/versions/current'
    );
    core.debug(`statusCode: ${response.statusCode}`);

    return await this.mapResponse(response);
  }

  private async mapResponse(response: ITypedResponse<ReleaseData>) {
    const data = response.result;

    if (data) {
      core.debug(`current?: ${data.current}`);

      const version = data.version;
      core.debug(`version ${version}`);

      core.debug(`checksumUrl: ${data.checksumUrl}`);
      const distBinChecksum = await this.fetch(data.checksumUrl);
      core.debug(`distBinChecksum ${distBinChecksum}`);

      const distAllChecksumUrl = data.checksumUrl.replace(
        '-bin.zip',
        '-all.zip'
      );
      core.debug(`computed distAllChecksumUrl: ${distAllChecksumUrl}`);
      const distAllChecksum = await this.fetch(distAllChecksumUrl);
      core.debug(`computed distAllChecksum ${distAllChecksum}`);

      core.debug(`wrapperChecksumUrl: ${data.wrapperChecksumUrl}`);
      const wrapperChecksum = await this.fetch(data.wrapperChecksumUrl);
      core.debug(`wrapperChecksum ${wrapperChecksum}`);

      return {
        version,
        allChecksum: distAllChecksum,
        binChecksum: distBinChecksum,
        wrapperChecksum
      };
    }

    throw new Error('Unable to fetch release data');
  }

  private async fetch(url: string): Promise<string> {
    const response = await this.client.get(url);
    core.debug(`statusCode: ${response.message.statusCode}`);

    const body = await response.readBody();
    core.debug(`body: ${body}`);

    return body;
  }
}
