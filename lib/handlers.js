const _data = require('./data');
const helpers = require('./helpers');

const handlers = {};

handlers.ping = (data, cb) => {
  cb(200);
};

handlers.users = (data, cb) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];

  if (acceptableMethods.includes(data.method)) {
    handlers._users[data.method](data, cb);
  } else {
    cb(405);
  }
};

handlers._users = {};

// Requires: firstName, lastName, phone, password, agreement
handlers._users.post = (data, cb) => {
  const firstName =
    typeof data.payload.firstName === 'string' &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : null;
  const lastName =
    typeof data.payload.lastName === 'string' &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : null;
  const phone =
    typeof data.payload.phone === 'string' &&
    data.payload.phone.trim().length === 13
      ? data.payload.phone.trim()
      : null;
  const password =
    typeof data.payload.password === 'string' &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : null;
  const agreement =
    typeof data.payload.agreement === 'boolean' &&
    data.payload.agreement === true
      ? true
      : false;

  if (firstName && lastName && phone && password && agreement) {
    _data.read('users', phone, (err, data) => {
      if (err) {
        const hashedPassword = helpers.hash(password);

        if (hashedPassword) {
          const userObject = {
            firstName,
            lastName,
            phone,
            hashedPassword,
            agreement: true,
          };

          // store user
          _data.create('users', phone, userObject, err => {
            if (!err) {
              cb(200);
            } else {
              console.log(err);
              cb(500, { error: 'Could not create new user' });
            }
          });
        } else {
          cb(500, { error: 'Could not hash password' });
        }
      } else {
        cb(400, {
          error: 'A user with this phone is already registered',
        });
      }
    });
  } else {
    cb(400, { error: 'Missing required fields' });
  }
};

// Requires: phone
handlers._users.get = (data, cb) => {
  const phone =
    typeof data.queryStringObject.phone === 'string' &&
    data.queryStringObject.phone.trim().length === 13
      ? data.queryStringObject.phone.trim()
      : false;

  if (phone) {
    // get token from headers
    const token =
      typeof data.headers.token === 'string' ? data.headers.token : false;
    // verify if the token is valid for the phone
    handlers._tokens.verifyToken(token, phone, tokenIsValid => {
      if (tokenIsValid) {
        // user lookup
        _data.read('users', phone, (err, data) => {
          if (!err && data) {
            // remove hashed password from returned data
            delete data.hashedPassword;

            cb(200, data);
          } else {
            cb(404);
          }
        });
      } else {
        cb(403, { error: 'Missing or invalid token in header' });
      }
    });
  } else {
    cb(400, { error: 'Missing required field' });
  }
};

// Requires: phone, optional (1+)
// Optional: firstName, lastName, password
handlers._users.put = (data, cb) => {
  const phone =
    typeof data.payload.phone === 'string' &&
    data.payload.phone.trim().length === 13
      ? data.payload.phone.trim()
      : false;

  // check optional fields
  const firstName =
    typeof data.payload.firstName === 'string' &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : null;
  const lastName =
    typeof data.payload.lastName === 'string' &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : null;
  const password =
    typeof data.payload.password === 'string' &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : null;

  // check if the phone is ok
  if (phone) {
    // check if there is at least one optional
    if (firstName || lastName || password) {
      // get token from headers
      const token =
        typeof data.headers.token === 'string' ? data.headers.token : false;
      // verify if the token is valid for the phone
      handlers._tokens.verifyToken(token, phone, tokenIsValid => {
        if (tokenIsValid) {
          // user lookup
          _data.read('users', phone, (err, userData) => {
            if (!err && userData) {
              // update
              if (firstName) {
                userData.firstName = firstName;
              }
              if (lastName) {
                userData.lastName = lastName;
              }
              if (password) {
                userData.hashedPassword = helpers.hash(password);
              }
            } else {
              cb(400, { error: 'The user does not exist' });
            }

            // store
            _data.update('users', phone, userData, err => {
              if (!err) {
                cb(200);
              } else {
                console.log(err);
                cb(500, { error: 'Could not update the user' });
              }
            });
          });
        } else {
          cb(403, { error: 'Missing or invalid token in header' });
        }
      });
    } else {
      cb(400, { error: 'Missing fields to update' });
    }
  } else {
    cb({ error: 'Missing required field' });
  }
};

// Required: phone
// @TODO Check if user is authenticated to delete only own object
// @TODO Cleanup files
handlers._users.delete = (data, cb) => {
  // phone check
  const phone =
    typeof data.queryStringObject.phone === 'string' &&
    data.queryStringObject.phone.trim().length === 13
      ? data.queryStringObject.phone.trim()
      : false;

  if (phone) {
    // user lookup
    _data.read('users', phone, (err, data) => {
      if (!err && data) {
        _data.delete('users', phone, err => {
          if (!err) {
            cb(200);
          } else {
            cb(500, { error: 'Could not delete the user' });
          }
        });
      } else {
        cb(400, { error: 'Could not find the user' });
      }
    });
  } else {
    cb(400, { error: 'Missing required field' });
  }
};

// Token handling
handlers.tokens = (data, cb) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];

  if (acceptableMethods.includes(data.method)) {
    handlers._tokens[data.method](data, cb);
  } else {
    cb(405);
  }
};

handlers._tokens = {};

// Required: phone, password
handlers._tokens.post = (data, cb) => {
  const phone =
    typeof data.payload.phone === 'string' &&
    data.payload.phone.trim().length === 13
      ? data.payload.phone.trim()
      : null;
  const password =
    typeof data.payload.password === 'string' &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : null;

  if (phone && password) {
    // user lookup
    _data.read('users', phone, (err, userData) => {
      if (!err && userData) {
        const hashedPassword = helpers.hash(password);

        if (hashedPassword === userData.hashedPassword) {
          // create new token (1h expiration time)
          const tokenId = helpers.createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObject = { phone, id: tokenId, expires };

          // store token
          _data.create('tokens', tokenId, tokenObject, err => {
            if (!err) {
              cb(200, tokenObject);
            } else {
              cb(500, { error: 'Could not create token' });
            }
          });
        } else {
          cb(400, { error: 'Password does not match' });
        }
      } else {
        cb(400, { error: 'Could not find the user' });
      }
    });
  } else {
    cb(400, { error: 'Missing required field(s)' });
  }
};

// Required: id
handlers._tokens.get = (data, cb) => {
  // check if the id is valid
  const id =
    typeof data.queryStringObject.id === 'string' &&
    data.queryStringObject.id.trim().length === 20
      ? data.queryStringObject.id.trim()
      : false;

  if (id) {
    // token lookup
    _data.read('tokens', id, (err, tokenData) => {
      if (!err && tokenData) {
        cb(200, tokenData);
      } else {
        cb(404);
      }
    });
  } else {
    cb(400, { error: 'Missing required field' });
  }
};

// Required: id, extend
handlers._tokens.put = (data, cb) => {
  const id =
    typeof data.payload.id === 'string' && data.payload.id.trim().length === 20
      ? data.payload.id.trim()
      : false;
  const extend =
    typeof data.payload.extend === 'boolean' && data.payload.extend === true
      ? true
      : false;

  if (id && extend) {
    // token lookup
    _data.read('tokens', id, (err, tokenData) => {
      if (!err && tokenData) {
        // check if token has not expired
        if (tokenData.expires > Date.now()) {
          // update epiration date
          tokenData.expires = Date.now() + 1000 * 60 * 60;

          // store updated token
          _data.update('tokens', id, tokenData, err => {
            console.log(err);
            if (!err) {
              cb(200);
            } else {
              cb(500, { error: 'Could not update token expiration date' });
            }
          });
        } else {
          cb(400, { error: 'The token has already expired' });
        }
      } else {
        cb(400, { error: 'Token does not exist' });
      }
    });
  } else {
    cb(400, { error: 'Missing or invalid required field(s)' });
  }
};

// Required: id
handlers._tokens.delete = (data, cb) => {
  // id check
  const id =
    typeof data.queryStringObject.id === 'string' &&
    data.queryStringObject.id.trim().length === 20
      ? data.queryStringObject.id.trim()
      : false;

  if (id) {
    // token lookup
    _data.read('tokens', id, (err, data) => {
      if (!err && data) {
        _data.delete('tokens', id, err => {
          if (!err) {
            cb(200);
          } else {
            cb(500, { error: 'Could not delete the token' });
          }
        });
      } else {
        cb(400, { error: 'Could not find the token' });
      }
    });
  } else {
    cb(400, { error: 'Missing required field' });
  }
};

// check if a token id is valid for a given user
handlers._tokens.verifyToken = (id, phone, cb) => {
  // token lookup
  _data.read('tokens', id, (err, tokenData) => {
    if (!err && tokenData) {
      // check if token is for user and has not expired
      if (tokenData.phone === phone && tokenData.expires > Date.now()) {
        cb(true);
      } else {
        cb(false);
      }
    } else {
      cb(false);
    }
  });
};

handlers.notFound = (data, cb) => {
  cb(404);
};

module.exports = handlers;
