const environments = {};

environments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: 'staging',
  hashingSecret: 'SECRET!!!',
  maxChecks: 5,
};
environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: 'production',
  hashingSecret: 'SECRET!!!',
  maxChecks: 5,
};

const currentEnv =
  typeof process.env.NODE_ENV === 'string'
    ? process.env.NODE_ENV.toLowerCase()
    : '';

const environment =
  typeof environments[currentEnv] === 'object'
    ? environments[currentEnv]
    : environments.staging;

module.exports = environment;
