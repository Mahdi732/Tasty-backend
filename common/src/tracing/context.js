import { AsyncLocalStorage } from 'async_hooks';

const requestContextStorage = new AsyncLocalStorage();

export const runWithRequestContext = (context, callback) =>
  requestContextStorage.run(context || {}, callback);

export const getRequestContext = () => requestContextStorage.getStore() || null;
