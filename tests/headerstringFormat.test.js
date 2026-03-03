import { describe, it, expect } from 'vitest';
import { HeaderstringFormat } from '../interface/lib/headerstringFormat.js';

describe('HeaderstringFormat', () => {
  describe('parse', () => {
    it('should parse a simple cookie string', () => {
      const result = HeaderstringFormat.parse('cookie1=value1');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ name: 'cookie1', value: 'value1' });
    });

    it('should parse multiple cookies separated by semicolon', () => {
      const result = HeaderstringFormat.parse('cookie1=value1; cookie2=value2');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'cookie1', value: 'value1' });
      expect(result[1]).toEqual({ name: 'cookie2', value: 'value2' });
    });

    it('should handle cookies with empty values', () => {
      const result = HeaderstringFormat.parse('cookie1=; cookie2=value2');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'cookie1', value: '' });
    });

    it('should handle cookies with special characters in values', () => {
      const result = HeaderstringFormat.parse('cookie1=abc%20def; cookie2=hello world');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'cookie1', value: 'abc%20def' });
      expect(result[1]).toEqual({ name: 'cookie2', value: 'hello world' });
    });

    it('should trim whitespace from cookie parts', () => {
      const result = HeaderstringFormat.parse('  cookie1  =  value1  ;  cookie2=value2');
      // The first cookie has whitespace after name, before value
      expect(result[0].name).toBe('cookie1  ');
      expect(result[0].value).toBe('  value1');
      expect(result[1].name).toBe('cookie2');
      expect(result[1].value).toBe('value2');
    });

    it('should throw error for empty string', () => {
      expect(() => HeaderstringFormat.parse('')).toThrow('No cookies found.');
    });

    it('should throw error for string with only spaces', () => {
      expect(() => HeaderstringFormat.parse('   ')).toThrow('No cookies found.');
    });

    it('should skip invalid cookies (no equals sign)', () => {
      const result = HeaderstringFormat.parse('invalid; cookie1=value1');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ name: 'cookie1', value: 'value1' });
    });

    it('should handle cookies with equals sign in value', () => {
      const result = HeaderstringFormat.parse('cookie1=foo=bar; cookie2=value2');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'cookie1', value: 'foo=bar' });
    });
  });

  describe('format', () => {
    it('should format a single cookie', () => {
      const cookies = {
        0: { cookie: { name: 'cookie1', value: 'value1' } }
      };
      const result = HeaderstringFormat.format(cookies);
      expect(result).toBe('cookie1=value1');
    });

    it('should format multiple cookies', () => {
      const cookies = {
        0: { cookie: { name: 'cookie1', value: 'value1' } },
        1: { cookie: { name: 'cookie2', value: 'value2' } }
      };
      const result = HeaderstringFormat.format(cookies);
      expect(result).toBe('cookie1=value1;cookie2=value2');
    });

    it('should handle empty object', () => {
      const cookies = {};
      const result = HeaderstringFormat.format(cookies);
      expect(result).toBe('');
    });

    it('should handle special characters in cookie values', () => {
      const cookies = {
        0: { cookie: { name: 'cookie1', value: 'a;b=c' } }
      };
      const result = HeaderstringFormat.format(cookies);
      expect(result).toBe('cookie1=a;b=c');
    });
  });
});
