// Lib for store and rotate logs
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const lib = {};

lib.baseDir = path.join(__dirname, '/../.logs/');

// append string to file (create file if not exists)
lib.append = (file, str, cb) => {
  // open file for appending
  fs.open(lib.baseDir + file + '.log', 'a', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      // append to file and close it
      fs.appendFile(fileDescriptor, str + '\n', err => {
        if (!err) {
          fs.close(fileDescriptor, err => {
            if (!err) {
              cb(false);
            } else {
              cb('Error closing file that was appended');
            }
          });
        } else {
          cb('Error appending data to file');
        }
      });
    } else {
      cb('Could not open file');
    }
  });
};

// list all the logs, optionally listing compressed
lib.list = (includeCompressed, cb) => {
  fs.readdir(lib.baseDir, (err, data) => {
    if (!err && data && data.length > 0) {
      const trimmedFileNames = data
        .filter(fileName => fileName !== '.gitkeep')
        .filter(fileName => fileName.includes('.gz.b64') === includeCompressed)
        .map(fileName => fileName.replace('.log', '').replace('.gz.b64', ''));

      cb(false, trimmedFileNames);
    } else {
      cb(err, data);
    }
  });
};

// compress the content of a log file
lib.compress = (logId, newFileId, cb) => {
  const sourceFile = logId + '.log';
  const destFile = newFileId + '.gz.b64';

  // read the source content
  fs.readFile(lib.baseDir + sourceFile, 'utf8', (err, inputString) => {
    if (!err && inputString) {
      // compress the data
      zlib.gzip(inputString, (err, buffer) => {
        if (!err && buffer) {
          // send data to dest file
          fs.open(lib.baseDir + destFile, 'wx', (err, fileDescriptor) => {
            // save dest file
            if (!err && fileDescriptor) {
              fs.writeFile(fileDescriptor, buffer.toString('base64'), err => {
                if (!err) {
                  // close dest file
                  fs.close(fileDescriptor, err => {
                    if (!err) {
                      cb(false);
                    } else {
                      cb(err);
                    }
                  });
                } else {
                  cb(err);
                }
              });
            } else {
              cb(err);
            }
          });
        } else {
          cb(err);
        }
      });
    } else {
      cb(err);
    }
  });
};

// decompress a .gz.b64 file into a string
lib.decompress = (fileId, cb) => {
  const fileName = fileId + '.gz.b64';

  fs.readFile(lib.baseDir + fileName, 'utf8', (err, string) => {
    if (!err && string) {
      // decompress data
      const inputBuffer = Buffer.from(string, 'base64');

      zlib.unzip(inputBuffer, (err, output) => {
        if (!err && output) {
          const str = output.toString();

          cb(false, str);
        } else {
          cb(err);
        }
      });
    } else {
      cb(err);
    }
  });
};

// truncate a log file
lib.truncate = (logId, cb) => {
  fs.truncate(lib.baseDir + logId + '.log', 0, err => {
    if (!err) {
      cb(false);
    } else {
      cb(err);
    }
  });
};

module.exports = lib;
