const crypto = require('crypto');

const config = require('./config');

const helpers = {};

helpers.hash = str => {
  if (typeof str === 'string' && str.length > 0) {
    const hash = crypto
      .createHmac('sha256', config.hashingSecret)
      .update(str)
      .digest('hex');

    return hash;
  } else {
    return false;
  }
};

// parse JSON to object; Do not throw on error (return {})
helpers.parseJsonToObject = str => {
  try {
    const obj = JSON.parse(str);
    return obj;
  } catch (err) {
    return {};
  }
};

// create string with random characters, of a given length
helpers.createRandomString = strLength => {
  strLength =
    typeof strLength === 'number' && strLength > 0 ? strLength : false;

  if (strLength) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';

    let str = '';
    for (let i = 1; i <= strLength; i++) {
      str += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return str;
  } else {
    return false;
  }
};

module.exports = helpers;
