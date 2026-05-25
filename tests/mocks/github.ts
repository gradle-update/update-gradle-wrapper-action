import {jest} from '@jest/globals';

export const githubMock = () => ({
  getOctokit: jest.fn(),
  context: {
    repo: {owner: 'owner-name', repo: 'repo-name'}
  }
});
