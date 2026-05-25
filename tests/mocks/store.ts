import {jest} from '@jest/globals';

export const storeMock = () => ({
  setMainActionExecuted: jest.fn(),
  mainActionExecuted: jest.fn(),
  setPullRequestData: jest.fn(),
  getPullRequestData: jest.fn(),
  setErroredReviewers: jest.fn(),
  getErroredReviewers: jest.fn(),
  setErroredTeamReviewers: jest.fn(),
  getErroredTeamReviewers: jest.fn()
});
