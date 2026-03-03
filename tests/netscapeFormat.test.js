import { describe, it, expect, vi } from 'vitest';
import { NetscapeFormat } from '../interface/lib/netscapeFormat.js';

describe('NetscapeFormat', () => {
  describe('parse', () => {
    it('should parse a simple cookie line', () => {
      const input = '.example.com\tTRUE\t/\tFALSE\t1893456000\tcookie1\tvalue1';
      const result = NetscapeFormat.parse(input);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        domain: '.example.com',
        hostOnly: false,
        path: '/',
        secure: false,
        expiration: '1893456000',
        name: 'cookie1',
        value: 'value1',
        httpOnly: false,
      });
    });

    it('should parse HttpOnly cookie', () => {
      const input = '#HttpOnly_.example.com\tTRUE\t/\tFALSE\t1893456000\tcookie1\tvalue1';
      const result = NetscapeFormat.parse(input);
      expect(result).toHaveLength(1);
      expect(result[0].httpOnly).toBe(true);
      expect(result[0].domain).toBe('.example.com');
    });

    it('should skip comment lines', () => {
      const input = '# Netscape HTTP Cookie File\n# http://curl.haxx.se/rfc/cookie_spec.html\n.example.com\tTRUE\t/\tFALSE\t1893456000\tcookie1\tvalue1';
      const result = NetscapeFormat.parse(input);
      expect(result).toHaveLength(1);
    });

    it('should skip empty lines', () => {
      const input = '.example.com\tTRUE\t/\tFALSE\t1893456000\tcookie1\tvalue1\n\n\n.example2.com\tTRUE\t/\tFALSE\t1893456000\tcookie2\tvalue2';
      const result = NetscapeFormat.parse(input);
      expect(result).toHaveLength(2);
    });

    it('should parse multiple cookies', () => {
      const input = '.example.com\tTRUE\t/\tFALSE\t1893456000\tcookie1\tvalue1\n.example2.com\tFALSE\t/path\tTRUE\t1893456001\tcookie2\tvalue2';
      const result = NetscapeFormat.parse(input);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('cookie1');
      expect(result[1].name).toBe('cookie2');
    });

    it('should correctly parse hostOnly flag', () => {
      // In Netscape format, the second field means "includes subdomain"
      // TRUE = includes subdomain = NOT host-only (false)
      // FALSE = doesn't include subdomain = IS host-only (true)
      const input = '.example.com\tFALSE\t/\tFALSE\t1893456000\tcookie1\tvalue1';
      const result = NetscapeFormat.parse(input);
      expect(result[0].hostOnly).toBe(true);

      const input2 = '.example.com\tTRUE\t/\tFALSE\t1893456000\tcookie1\tvalue1';
      const result2 = NetscapeFormat.parse(input2);
      expect(result2[0].hostOnly).toBe(false);
    });

    it('should correctly parse secure flag', () => {
      const input = '.example.com\tTRUE\t/\tFALSE\t1893456000\tcookie1\tvalue1';
      const result = NetscapeFormat.parse(input);
      expect(result[0].secure).toBe(false);

      const input2 = '.example.com\tTRUE\t/\tTRUE\t1893456000\tcookie1\tvalue1';
      const result2 = NetscapeFormat.parse(input2);
      expect(result2[0].secure).toBe(true);
    });

    it('should throw error for invalid format (not 7 fields)', () => {
      const input = '.example.com\tTRUE\t/\tFALSE\t1893456000\tcookie1';
      expect(() => NetscapeFormat.parse(input)).toThrow('Invalid netscape format');
    });

    it('should handle empty string', () => {
      const result = NetscapeFormat.parse('');
      expect(result).toHaveLength(0);
    });

    it('should handle string with only whitespace and comments', () => {
      const input = '# Comment 1\n# Comment 2\n   \n# Another comment';
      const result = NetscapeFormat.parse(input);
      expect(result).toHaveLength(0);
    });
  });

  describe('format', () => {
    it('should format a simple cookie', () => {
      const cookies = {
        0: {
          cookie: {
            domain: '.example.com',
            hostOnly: false,
            path: '/',
            secure: true,
            expirationDate: 1893456000,
            name: 'cookie1',
            value: 'value1',
            httpOnly: false,
            session: false,
          }
        }
      };
      const result = NetscapeFormat.format(cookies);
      const expectedCookieLine = '.example.com\tTRUE\t/\tTRUE\t1893456000\tcookie1\tvalue1';
      expect(result).toContain('# Netscape HTTP Cookie File');
      expect(result).toContain(expectedCookieLine);
    });

    it('should handle session cookie (no expirationDate)', () => {
      vi.useFakeTimers();
      const now = new Date('2024-01-01T00:00:00Z');
      vi.setSystemTime(now);

      const cookies = {
        0: {
          cookie: {
            domain: '.example.com',
            hostOnly: false,
            path: '/',
            secure: false,
            name: 'session_cookie',
            value: 'test_value',
            httpOnly: false,
            session: true,
          }
        }
      };
      const result = NetscapeFormat.format(cookies);
      // Session cookies get a 1-day TTL from now
      const expectedExpiration = Math.trunc(now.getTime() / 1000) + 86400;
      const expectedLine = `.example.com\tTRUE\t/\tFALSE\t${expectedExpiration}\tsession_cookie\ttest_value`;
      expect(result).toContain(expectedLine);

      vi.useRealTimers();
    });

    it('should handle httpOnly cookies', () => {
      const cookies = {
        0: {
          cookie: {
            domain: '.example.com',
            hostOnly: false,
            path: '/',
            secure: false,
            expirationDate: 1893456000,
            name: 'cookie1',
            value: 'value1',
            httpOnly: true,
            session: false,
          }
        }
      };
      const result = NetscapeFormat.format(cookies);
      expect(result).toContain('#HttpOnly_');
    });

    it('should handle hostOnly flag', () => {
      const cookies = {
        0: {
          cookie: {
            domain: '.example.com',
            hostOnly: true,
            path: '/',
            secure: false,
            expirationDate: 1893456000,
            name: 'cookie1',
            value: 'value1',
            httpOnly: false,
            session: false,
          }
        }
      };
      const result = NetscapeFormat.format(cookies);
      // hostOnly: true should result in FALSE for the includesSubdomain flag.
      const expectedLine = '.example.com\tFALSE\t/\tFALSE\t1893456000\tcookie1\tvalue1';
      expect(result).toContain(expectedLine);
    });

    it('should handle empty cookie object', () => {
      const cookies = {};
      const result = NetscapeFormat.format(cookies);
      // Even with empty cookies, the header is included
      expect(result).toContain('# Netscape HTTP Cookie File');
    });
  });
});
