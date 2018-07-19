function Event() {
    'use strict';
    var self = this;

    this.queue = {};

    this.emit = function (event, ...params) {
        var queue = self.queue[event];

        if (typeof queue === 'undefined') {
            return;
        }

        queue.forEach(function (callback) {
            callback.apply(null, params);
        });
    };

    this.on = function (event, callback) {
        if (typeof self.queue[event] === 'undefined') {
            self.queue[event] = [];
        }

        self.queue[event].push(callback);
    };
}
