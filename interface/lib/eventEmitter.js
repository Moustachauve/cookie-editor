/**
 * Abstract class that allows another class to emit events.
 */
export class EventEmitter {
  /**
   * Constructs an EventEmitter.
   */
  constructor() {
    this.queue = {};
  }

  /**
   * Emits an event signal to registered listeners.
   * @param {string} event Name of the event to signal.
   * @param  {...any} params Payload to send to the listeners.
   */
  emit(event, ...params) {
    const queue = this.queue[event];

    if (typeof queue === 'undefined') {
      return;
    }

    queue.forEach(function (callback) {
      callback(...params);
    });
  }

  /**
   * Registers a callback to an event to respond to the event signals.
   * @param {string} event Name of the event to register to.
   * @param {*} callback Callback to register to an event for handling signals.
   */
  on(event, callback) {
    if (typeof this.queue[event] === 'undefined') {
      this.queue[event] = [];
    }

    this.queue[event].push(callback);
  }
}
