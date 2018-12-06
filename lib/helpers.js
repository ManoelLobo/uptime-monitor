const crypto = require('crypto');
const queryString = require('querystring');
const https = require('https');

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

// send SMS
helpers.sendSMS = (phone, msg, cb) => {
  phone =
    typeof phone === 'string' && phone.trim().length //=== 13
      ? phone.trim()
      : false;
  msg =
    typeof msg === 'string' && msg.trim().length > 0 && msg.trim().length < 1600
      ? msg.trim()
      : false;

  if (phone && msg) {
    // configure request payload
    const payload = {
      From: config.twilio.fromPhone,
      To: '+' + phone,
      Body: msg,
    };

    const stringPayload = JSON.stringify(payload);

    const requestDetails = {
      protocol: 'https:',
      hostname: 'api.twilio.com',
      method: 'POST',
      path: '/2010-04-01/Accounts/' + config.twilio.accountSid, // + '/Messages.json',
      auth: config.twilio.accountSid + ':' + config.twilio.authToken,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload),
      },
    };

    // instantiate request object
    const req = https.request(requestDetails, res => {
      // status of the request sent
      const status = res.statusCode;
      // callback if all is ok
      if (status === 200 || status === 201) {
        cb(false);
      } else {
        cb('Status code returned: ' + status);
      }
    });

    // Bind to the error to avoid throw
    req.on('error', err => {
      cb(err);
    });

    // Add the payload
    req.write(stringPayload);

    // End request
    req.end();
  } else {
    cb('Missing or invalid parameters');
  }
};

module.exports = helpers;
