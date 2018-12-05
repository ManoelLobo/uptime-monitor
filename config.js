const environments = {};

environments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: 'staging',
  hashingSecret: 'SECRET!!!',
};
environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: 'production',
  hashingSecret: 'SECRET!!!',
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
