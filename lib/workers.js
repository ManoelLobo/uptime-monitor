const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const url = require('url');
const util = require('util');
const _data = require('./data');
const helpers = require('./helpers');
const _logs = require('./logs');

// Only show console msg if started with NODE_DEBUG=workers
const debug = util.debuglog('workers');

const workers = {};

workers.gatherAllChecks = () => {
  // get all existing checks
  _data.list('checks', (err, checks) => {
    if (!err && checks.length > 0) {
      checks.forEach(check => {
        _data.read('checks', check, (err, originalCheckData) => {
          if (!err && originalCheckData) {
            //  pass data to validator
            workers.validateCheckData(originalCheckData);
          } else {
            debug("Error reading one of the check's data", err);
          }
        });
      });
    } else {
      debug('Error: Could not find checks to process');
    }
  });
};

workers.validateCheckData = originalCheckData => {
  originalCheckData =
    typeof originalCheckData === 'object' && originalCheckData !== null
      ? originalCheckData
      : {};
  originalCheckData.id =
    typeof originalCheckData.id === 'string' &&
    originalCheckData.id.trim().length === 20
      ? originalCheckData.id
      : false;
  originalCheckData.userPhone =
    typeof originalCheckData.userPhone === 'string' &&
    originalCheckData.userPhone.trim().length === 13
      ? originalCheckData.userPhone
      : false;
  originalCheckData.protocol =
    typeof originalCheckData.protocol === 'string' &&
    ['http', 'https'].includes(originalCheckData.protocol)
      ? originalCheckData.protocol
      : false;
  originalCheckData.url =
    typeof originalCheckData.url === 'string' &&
    originalCheckData.url.trim().length > 0
      ? originalCheckData.url
      : false;
  originalCheckData.method =
    typeof originalCheckData.method === 'string' &&
    ['post', 'get', 'put', 'delete'].includes(originalCheckData.method)
      ? originalCheckData.method
      : false;
  originalCheckData.successCodes =
    typeof originalCheckData.successCodes === 'object' &&
    originalCheckData.successCodes instanceof Array &&
    originalCheckData.successCodes.length > 0
      ? originalCheckData.successCodes
      : false;
  originalCheckData.timeoutSeconds =
    typeof originalCheckData.timeoutSeconds === 'number' &&
    originalCheckData.timeoutSeconds > 0 &&
    originalCheckData.timeoutSeconds <= 5
      ? originalCheckData.timeoutSeconds
      : false;

  // set state & time keys if this is 1st time the worker checks it
  originalCheckData.state =
    typeof originalCheckData.state === 'string' &&
    ['up', 'down'].includes(originalCheckData.state)
      ? originalCheckData.state
      : 'down';
  originalCheckData.lastChecked =
    typeof originalCheckData.lastChecked === 'number' &&
    originalCheckData.lastChecked > 0
      ? originalCheckData.lastChecked
      : false;

  // if all the checks are valid, proceed
  if (
    originalCheckData.id &&
    originalCheckData.userPhone &&
    originalCheckData.protocol &&
    originalCheckData.url &&
    originalCheckData.method &&
    originalCheckData.successCodes &&
    originalCheckData.timeoutSeconds
  ) {
    workers.performCheck(originalCheckData);
  } else {
    debug(
      'Error: One of the checks is not correctly formatted and will be skipped',
      originalCheckData,
    );
  }
};

// Perform the check, send original data && result
workers.performCheck = originalCheckData => {
  // outcome setup
  const outcome = { error: null, responseCode: null };
  // the outcome has not been sent
  let outcomeSent = false;

  // parsed url for the hostname in the original check data
  const parsedUrl = url.parse(
    originalCheckData.protocol + '://' + originalCheckData.url,
    true,
  );

  const hostname = parsedUrl.hostname;
  const path = parsedUrl.path; // path has the query string

  // request content
  const requestDetails = {
    protocol: originalCheckData.protocol + ':',
    hostname,
    method: originalCheckData.method.toUpperCase(),
    path,
    timeout: originalCheckData.timeoutSeconds * 1000,
  };

  // choose module depending on the check protocol
  const _moduleToUse = originalCheckData.protocol === 'http' ? http : https;

  const req = _moduleToUse.request(requestDetails, res => {
    const status = res.statusCode;

    // update outcome
    outcome.responseCode = status;

    // pass the data
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, outcome);
      outcomeSent = true;
    }
  });

  // bind the error to avoid throwing
  req.on('error', err => {
    // update check outcome and pass data
    outcome.error = { error: true, value: err };
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, outcome);
      outcomeSent = true;
    }
  });

  // bind to the timout
  req.on('timeout', err => {
    // update check outcome and pass data
    outcome.error = { error: true, value: 'timeout' };
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, outcome);
      outcomeSent = true;
    }
  });

  req.end();
};

// process outcome, update check data, trigger user alert
// special logic for a 1st time check
workers.processCheckOutcome = (originalCheckData, outcome) => {
  const state =
    !outcome.error &&
    outcome.responseCode &&
    originalCheckData.successCodes.includes(outcome.responseCode)
      ? 'up'
      : 'down';

  // decide if alert
  const alertNeeded =
    originalCheckData.lastChecked && originalCheckData.state !== state;

  const timeOfCheck = Date.now();
  // log the outcome
  workers.log(originalCheckData, outcome, state, alertNeeded, timeOfCheck);

  // update check data
  const newCheckData = originalCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = timeOfCheck;

  // Save the data
  _data.update('checks', newCheckData.id, newCheckData, err => {
    if (!err) {
      if (alertNeeded) {
        workers.alertStatusChange(newCheckData);
      } else {
        debug('No alert needed');
      }
    } else {
      debug('Error trying to save updates to check');
    }
  });
};

workers.alertStatusChange = newCheckData => {
  const msg = `Alert: your check for ${newCheckData.method.toUpperCase()} ${
    newCheckData.protocol
  }://${newCheckData.url} is currently ${newCheckData.state}
  `;

  helpers.sendSMS(newCheckData.userPhone, msg, err => {
    if (!err) {
      debug('Success: User was alerted to the status change: ', msg);
    } else {
      debug('Error: Could not send sms message to user');
    }
  });
};

// log files to the disk
workers.log = (originalCheckData, outcome, state, alertNeeded, timeOfCheck) => {
  // form the log data
  const logData = {
    check: originalCheckData,
    outcome,
    state,
    alert: alertNeeded,
    time: timeOfCheck,
  };

  const logString = JSON.stringify(logData);

  // generate the name of the log file
  const logFileName = originalCheckData.id;

  // append the log
  _logs.append(logFileName, logString, err => {
    if (!err) {
      debug('Logging to file successful');
    } else {
      debug(err);
      debug('Logging to file failed');
    }
  });
};

// timer that runs once per minute
workers.loop = () => {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 * 60);
};

// timer to execute log rotation once per day
workers.logRotationLoop = () => {
  setInterval(workers.rotateLogs, 1000 * 60 * 60 * 24);
};

// rotate (compress) log files
workers.rotateLogs = () => {
  // list all uncompressed logs
  _logs.list(false, (err, logs) => {
    if (!err && logs && logs.length > 0) {
      logs.forEach(logName => {
        // compress te data to a new file
        const logId = logName.replace('.log', '');
        const newFileId = logId + '-' + Date.now();

        _logs.compress(logId, newFileId, err => {
          if (!err) {
            // truncate the log
            _logs.truncate(logId, err => {
              if (!err) {
                debug('Log file truncated');
              } else {
                debug('Error truncating log file');
              }
            });
          } else {
            debug('Error compressing file', err);
          }
        });
      });
    } else {
      debug('Error: Could not find logs to rotate');
    }
  });
};

workers.init = () => {
  // console log formatting
  console.log('\x1b[33m%s\x1b[0m', 'Background workers initialized');

  // execute all the checks
  workers.gatherAllChecks();

  // loop
  workers.loop();

  // compress all the logs immediately
  workers.rotateLogs();

  // compression loop for later on
  workers.logRotationLoop();
};

module.exports = workers;
