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
// @TODO Check if user is authenticated to access only own object
handlers._users.get = (data, cb) => {
  const phone =
    typeof data.queryStringObject.phone === 'string' &&
    data.queryStringObject.phone.trim().length === 13
      ? data.queryStringObject.phone.trim()
      : false;

  if (phone) {
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
    cb(400, { error: 'Missing required field' });
  }
};

handlers._users.put = (data, cb) => {};
handlers._users.delete = (data, cb) => {};

handlers.notFound = (data, cb) => {
  cb(404);
};

module.exports = handlers;
