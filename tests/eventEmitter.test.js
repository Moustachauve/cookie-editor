import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EventEmitter } from '../interface/lib/eventEmitter.js';

describe('EventEmitter', () => {
  let emitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  describe('on', () => {
    it('should register an event listener', () => {
      const callback = vi.fn();
      emitter.on('testEvent', callback);
      expect(emitter.queue['testEvent']).toBeDefined();
      expect(emitter.queue['testEvent']).toContain(callback);
    });

    it('should allow multiple listeners for same event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      emitter.on('testEvent', callback1);
      emitter.on('testEvent', callback2);
      expect(emitter.queue['testEvent']).toHaveLength(2);
    });

    it('should allow listeners for different events', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      emitter.on('event1', callback1);
      emitter.on('event2', callback2);
      expect(emitter.queue['event1']).toContain(callback1);
      expect(emitter.queue['event2']).toContain(callback2);
    });
  });

  describe('emit', () => {
    it('should call registered callback when event is emitted', () => {
      const callback = vi.fn();
      emitter.on('testEvent', callback);
      emitter.emit('testEvent');
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should pass parameters to callback', () => {
      const callback = vi.fn();
      emitter.on('testEvent', callback);
      emitter.emit('testEvent', 'param1', 'param2');
      expect(callback).toHaveBeenCalledWith('param1', 'param2');
    });

    it('should call all listeners for an event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      emitter.on('testEvent', callback1);
      emitter.on('testEvent', callback2);
      emitter.emit('testEvent');
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should not throw for undefined event', () => {
      expect(() => emitter.emit('nonexistent')).not.toThrow();
    });

    it('should not call callbacks for different events', () => {
      const callback1 = vi.fn();
      emitter.on('event1', callback1);
      emitter.emit('event2');
      expect(callback1).not.toHaveBeenCalled();
    });

    it('should handle emitting same event multiple times', () => {
      const callback = vi.fn();
      emitter.on('testEvent', callback);
      emitter.emit('testEvent');
      emitter.emit('testEvent');
      emitter.emit('testEvent');
      expect(callback).toHaveBeenCalledTimes(3);
    });
  });
});
