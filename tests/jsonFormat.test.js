import { describe, it, expect } from 'vitest';
import { JsonFormat } from '../interface/lib/jsonFormat.js';

describe('JsonFormat', () => {
  describe('parse', () => {
    it('should parse a valid JSON cookie string', () => {
      const input = '[{"name": "cookie1", "value": "value1"}]';
      const result = JsonFormat.parse(input);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ name: 'cookie1', value: 'value1' });
    });

    it('should parse multiple cookies', () => {
      const input = '[{"name": "cookie1", "value": "value1"}, {"name": "cookie2", "value": "value2"}]';
      const result = JsonFormat.parse(input);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('cookie1');
      expect(result[1].name).toBe('cookie2');
    });

    it('should parse empty array', () => {
      const input = '[]';
      const result = JsonFormat.parse(input);
      expect(result).toHaveLength(0);
    });

    it('should handle full cookie object properties', () => {
      const input = JSON.stringify([{
        name: 'test',
        value: 'testvalue',
        domain: '.example.com',
        path: '/',
        secure: true,
        httpOnly: false,
        sameSite: 'no_restriction',
        expirationDate: 1893456000,
      }]);
      const result = JsonFormat.parse(input);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('test');
    });

    it('should throw on invalid JSON', () => {
      expect(() => JsonFormat.parse('not valid json')).toThrow();
    });
  });

  describe('format', () => {
    it('should format a single cookie', () => {
      const cookies = {
        0: {
          cookie: {
            name: 'cookie1',
            value: 'value1',
            domain: '.example.com',
            path: '/',
            secure: true,
            httpOnly: false,
            session: false,
            hostOnly: false,
          }
        }
      };
      const result = JsonFormat.format(cookies);
      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe('cookie1');
      expect(parsed[0].value).toBe('value1');
    });

    it('should format multiple cookies', () => {
      const cookies = {
        0: { cookie: { name: 'cookie1', value: 'value1', domain: '.ex.com', path: '/', secure: false, httpOnly: false, session: false, hostOnly: false } },
        1: { cookie: { name: 'cookie2', value: 'value2', domain: '.ex2.com', path: '/', secure: true, httpOnly: false, session: false, hostOnly: false } }
      };
      const result = JsonFormat.format(cookies);
      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(2);
    });

    it('should set storeId to null', () => {
      const cookies = {
        0: { cookie: { name: 'test', value: 'val', domain: '.ex.com', path: '/', secure: false, httpOnly: false, session: false, hostOnly: false } }
      };
      const result = JsonFormat.format(cookies);
      const parsed = JSON.parse(result);
      expect(parsed[0].storeId).toBeNull();
    });

    it('should handle sameSite: unspecified by converting to null', () => {
      const cookies = {
        0: { cookie: { name: 'test', value: 'val', domain: '.ex.com', path: '/', secure: false, httpOnly: false, session: false, hostOnly: false, sameSite: 'unspecified' } }
      };
      const result = JsonFormat.format(cookies);
      const parsed = JSON.parse(result);
      expect(parsed[0].sameSite).toBeNull();
    });

    it('should preserve other sameSite values', () => {
      const cookies = {
        0: { cookie: { name: 'test', value: 'val', domain: '.ex.com', path: '/', secure: false, httpOnly: false, session: false, hostOnly: false, sameSite: 'Strict' } }
      };
      const result = JsonFormat.format(cookies);
      const parsed = JSON.parse(result);
      expect(parsed[0].sameSite).toBe('Strict');
    });

    it('should handle empty object', () => {
      const cookies = {};
      const result = JsonFormat.format(cookies);
      expect(result).toBe('[]');
    });

    it('should format with proper indentation', () => {
      const cookies = {
        0: { cookie: { name: 'test', value: 'val', domain: '.ex.com', path: '/', secure: false, httpOnly: false, session: false, hostOnly: false } }
      };
      const result = JsonFormat.format(cookies);
      // Check that output is indented (4 spaces)
      expect(result).toContain('\n');
    });
  });
});
