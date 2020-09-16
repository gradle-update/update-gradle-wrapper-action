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

import * as exec from '@actions/exec';

export interface CmdExec {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function execWithOutput(
  commandLine: string,
  args?: string[]
): Promise<CmdExec> {
  let outBuf = '';
  let errBuf = '';

  const opts = {
    ignoreReturnCode: true,
    listeners: {
      stdout: (data: Buffer) => {
        outBuf += data.toString();
      },
      stderr: (data: Buffer) => {
        errBuf += data.toString();
      }
    }
  };

  const exitCode = await exec.exec(commandLine, args, opts);

  return {exitCode, stdout: outBuf.trim(), stderr: errBuf.trim()};
}
