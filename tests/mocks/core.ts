import {jest} from '@jest/globals';

export const coreMock = () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  setFailed: jest.fn(),
  startGroup: jest.fn(),
  endGroup: jest.fn(),
  setSecret: jest.fn(),
  saveState: jest.fn(),
  getState: jest.fn(),
  getInput: jest.fn()
});
