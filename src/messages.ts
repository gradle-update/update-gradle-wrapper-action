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

import {Release} from './releases';

const ISSUES_URL =
  'https://github.com/gradle-update/update-gradle-wrapper-action/issues';

const TARGET_VERSION_PLACEHOLDER = '%targetVersion%';
const SOURCE_VERSION_PLACEHOLDER = '%sourceVersion%';

export function replaceVersionPlaceholders(
  template: string,
  sourceVersion: string | undefined,
  targetVersion: string
): string {
  return template
    .replace(TARGET_VERSION_PLACEHOLDER, targetVersion)
    .replace(SOURCE_VERSION_PLACEHOLDER, sourceVersion ?? 'undefined');
}

export function pullRequestText(
  prTitleTemplate: string,
  distTypes: Set<string>,
  targetRelease: Release,
  sourceVersion?: string
): {title: string; body: string} {
  const targetVersion = targetRelease.version;
  const title = replaceVersionPlaceholders(
    prTitleTemplate,
    sourceVersion,
    targetVersion
  );
  const bodyHeader = `${title}.

Read the release notes: https://docs.gradle.org/${targetVersion}/release-notes.html`;

  let bodyChecksum = `The checksums of the Wrapper JAR and the distribution binary have been successfully verified.

- Gradle release: \`${targetVersion}\`
`;

  if (distTypes.has('bin')) {
    bodyChecksum += `- Distribution (-bin) zip checksum: \`${targetRelease.binChecksum}\`\n`;
  }

  if (distTypes.has('all')) {
    bodyChecksum += `- Distribution (-all) zip checksum: \`${targetRelease.allChecksum}\`\n`;
  }

  bodyChecksum += `- Wrapper JAR Checksum: \`${targetRelease.wrapperChecksum}\`

You can find the reference checksum values at https://gradle.org/release-checksums/`;

  const bodyFooter = `🤖 This PR has been created by the [Update Gradle Wrapper](https://github.com/gradle-update/update-gradle-wrapper-action) action.

<details>
<summary>Need help? 🤔</summary>
<br />

If something doesn't look right with this PR please file an issue [here](${ISSUES_URL}).
</details>`;

  const body = `${bodyHeader}\n\n---\n\n${bodyChecksum}\n\n---\n\n${bodyFooter}`;

  return {title, body};
}
