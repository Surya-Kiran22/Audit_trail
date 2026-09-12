import commandRouter from '../../src/routes/commandRouter.js';
import queryRouter from '../../src/routes/queryRouter.js';

describe('CQRS Router Separation Unit Test', () => {
  function getRegisteredHttpMethods(router) {
    const methods = new Set();
    if (router && router.stack) {
      router.stack.forEach((layer) => {
        if (layer.route && layer.route.methods) {
          Object.keys(layer.route.methods).forEach((method) => {
            if (layer.route.methods[method]) {
              methods.add(method.toUpperCase());
            }
          });
        }
      });
    }
    return Array.from(methods);
  }

  test('commandRouter MUST NOT contain any read-only methods (GET)', () => {
    const commandMethods = getRegisteredHttpMethods(commandRouter);
    expect(commandMethods).not.toContain('GET');
    expect(commandMethods.every((m) => m === 'POST')).toBe(true);
  });

  test('queryRouter MUST NOT contain any mutating methods (POST, PUT, DELETE, PATCH)', () => {
    const queryMethods = getRegisteredHttpMethods(queryRouter);
    expect(queryMethods).not.toContain('POST');
    expect(queryMethods).not.toContain('PUT');
    expect(queryMethods).not.toContain('DELETE');
    expect(queryMethods).not.toContain('PATCH');
    expect(queryMethods.every((m) => m === 'GET')).toBe(true);
  });
});
