const fs = require('fs');
const path = require('path');

const lib = {};

lib.baseDir = path.join(__dirname, '/../.data/');

lib.create = (dir, file, data, cb) => {
  fs.open(
    lib.baseDir + dir + '/' + file + '.json',
    'wx',
    (err, fileDescriptor) => {
      if (!err && fileDescriptor) {
        const stringData = JSON.stringify(data);

        fs.writeFile(fileDescriptor, stringData, err => {
          if (!err) {
            fs.close(fileDescriptor, err => {
              if (!err) {
                cb(false);
              } else {
                cb('Error closing new file');
              }
            });
          } else {
            cb('Error writing to new file');
          }
        });
      } else {
        cb('Could not create file');
      }
    },
  );
};

lib.read = (dir, file, cb) => {
  fs.readFile(lib.baseDir + dir + '/' + file + '.json', 'utf8', (err, data) => {
    cb(err, data);
  });
};

lib.update = (dir, file, data, cb) => {
  fs.open(
    lib.baseDir + dir + '/' + file + '.json',
    'r+',
    (err, fileDescriptor) => {
      if (!err && fileDescriptor) {
        const stringData = JSON.stringify(data);

        fs.ftruncate(fileDescriptor, err => {
          if (!err) {
            fs.writeFile(fileDescriptor, stringData, err => {
              if (!err) {
                fs.close(fileDescriptor, err => {
                  if (!err) {
                    cb(false);
                  } else {
                    cb('Error closing file');
                  }
                });
              } else {
                cb('Error writing to file');
              }
            });
          } else {
            cb('Error truncating file');
          }
        });
      } else {
        cb('Could not open file to update');
      }
    },
  );
};

lib.delete = (dir, file, cb) => {
  fs.unlink(lib.baseDir + dir + '/' + file + '.json', err => {
    if (!err) {
      cb(false);
    } else {
      cb('Could not remove file');
    }
  });
};

module.exports = lib;
