function GenericStorageHandler() {
  'use strict';
  Event.call(this);

  const browserDetector = new BrowserDetector();

  this.getLocal = function (key, callback) {
    if (browserDetector.supportsPromises()) {
      browserDetector
        .getApi()
        .storage.local.get([key])
        .then(
          (data) => {
            if (callback) {
              callback(null, data[key] ?? null);
            }
          },
          (error) => {
            console.error('Failed to retrieve data', key, error);
            if (callback) {
              callback(error.message, null);
            }
          },
        );
    } else {
      browserDetector.getApi().storage.local.get([key], (data) => {
        const error = browserDetector.getApi().runtime.lastError;
        if (error) {
          console.error('Failed to get data', key, error);
          if (callback) {
            const errorMessage =
              (error ? error.message : '') || 'Unknown error';
            return callback(errorMessage, data);
          }
          return;
        }

        if (callback) {
          return callback(null, data[key] ?? null);
        }
      });
    }
  };

  this.setLocal = function (key, data, callback) {
    const dataObj = {};
    dataObj[key] = data;

    if (browserDetector.supportsPromises()) {
      browserDetector
        .getApi()
        .storage.local.set(dataObj)
        .then(
          () => {
            if (callback) {
              callback();
            }
          },
          (error) => {
            console.error('Failed to set data', key, data, error);
            if (callback) {
              callback(error.message);
            }
          },
        );
    } else {
      browserDetector.getApi().storage.local.set(dataObj, () => {
        const error = browserDetector.getApi().runtime.lastError;
        if (error) {
          console.error('Failed to set data', key, data, error);
          if (callback) {
            const errorMessage =
              (error ? error.message : '') || 'Unknown error';
            return callback(errorMessage);
          }
          return;
        }

        if (callback) {
          return callback(null);
        }
      });
    }
  };
}
