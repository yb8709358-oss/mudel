import { describe, expect, it } from 'vitest';
import {
  expectedRequestOrigin,
  isDevelopmentSafeOrigin,
  isValidOrigin,
} from '@/lib/origin';

function headers(init: Record<string, string | null>): { get(name: string): string | null } {
  return {
    get(name: string) {
      return init[name.toLowerCase()] ?? null;
    },
  };
}

describe('isValidOrigin', () => {
  it('allows requests without an Origin header (non-browser clients)', () => {
    expect(isValidOrigin(null, headers({ host: 'localhost:3000' }))).toBe(true);
    expect(isValidOrigin('', headers({ host: 'localhost:3000' }))).toBe(true);
  });

  it('accepts localhost origin', () => {
    expect(
      isValidOrigin('http://localhost:3000', headers({ host: 'localhost:3000' })),
    ).toBe(true);
  });

  it('accepts 127.0.0.1 origin', () => {
    expect(
      isValidOrigin('http://127.0.0.1:3000', headers({ host: '127.0.0.1:3000' })),
    ).toBe(true);
  });

  it('accepts IPv6 loopback origin', () => {
    expect(
      isValidOrigin('http://[::1]:3000', headers({ host: '[::1]:3000' })),
    ).toBe(true);
  });

  it('accepts a LAN IP origin matching the Host header (regression case)', () => {
    expect(
      isValidOrigin('http://192.168.0.103:3001', headers({ host: '192.168.0.103:3001' })),
    ).toBe(true);
  });

  it('accepts a LAN IP origin in development even when Host is loopback', () => {
    expect(
      isValidOrigin('http://192.168.0.103:3001', headers({ host: 'localhost:3001' }), {
        allowDevelopmentOrigins: true,
      }),
    ).toBe(true);
  });

  it('rejects a LAN IP origin in production when Host does not match', () => {
    expect(
      isValidOrigin('http://192.168.0.103:3001', headers({ host: 'localhost:3001' }), {
        allowDevelopmentOrigins: false,
      }),
    ).toBe(false);
  });

  it('supports a reverse proxy via X-Forwarded-Proto and X-Forwarded-Host', () => {
    expect(
      isValidOrigin(
        'https://mudel.example.com',
        headers({
          host: 'app.internal:3000',
          'x-forwarded-proto': 'https',
          'x-forwarded-host': 'mudel.example.com',
        }),
      ),
    ).toBe(true);
  });

  it('resolves comma-separated forwarded chains to the client-facing hop', () => {
    expect(
      isValidOrigin(
        'https://mudel.example.com',
        headers({
          host: 'app.internal:3000',
          'x-forwarded-proto': 'https, http',
          'x-forwarded-host': 'mudel.example.com, app.internal',
        }),
      ),
    ).toBe(true);
  });

  it('falls back to the Host header when no forwarded headers exist', () => {
    expect(
      isValidOrigin('http://localhost:3000', headers({ host: 'localhost:3000' })),
    ).toBe(true);
  });

  it('accepts a configured site URL even when Host is internal', () => {
    expect(
      isValidOrigin(
        'https://mudel.example.com',
        headers({ host: 'app.internal:3000' }),
        { siteUrl: 'https://mudel.example.com' },
      ),
    ).toBe(true);
  });

  it('rejects an Origin header of "null"', () => {
    expect(isValidOrigin('null', headers({ host: 'localhost:3000' }))).toBe(false);
  });

  it('rejects a cross-site origin', () => {
    expect(
      isValidOrigin('http://evil.example.com', headers({ host: 'localhost:3000' })),
    ).toBe(false);
  });

  it('rejects an https origin when the request was served over http', () => {
    expect(
      isValidOrigin('https://localhost:3000', headers({ host: 'localhost:3000' })),
    ).toBe(false);
  });

  it('rejects a malformed origin', () => {
    expect(isValidOrigin('http://', headers({ host: 'localhost:3000' }))).toBe(false);
  });

  it('rejects an origin with the wrong port', () => {
    expect(
      isValidOrigin('http://localhost:9999', headers({ host: 'localhost:3000' })),
    ).toBe(false);
  });

  it('stays strict in production for private ranges', () => {
    for (const ip of ['10.1.2.3', '172.16.0.1', '172.31.255.1', '192.168.1.5', '169.254.1.1']) {
      expect(
        isValidOrigin(`http://${ip}:3000`, headers({ host: 'localhost:3000' }), {
          allowDevelopmentOrigins: false,
        }),
      ).toBe(false);
    }
  });
});

describe('expectedRequestOrigin', () => {
  it('builds the origin from the Host header', () => {
    expect(expectedRequestOrigin('192.168.0.103:3001', null, null)).toBe(
      'http://192.168.0.103:3001',
    );
  });

  it('prefers forwarded headers over Host', () => {
    expect(expectedRequestOrigin('app.internal:3000', 'https', 'mudel.example.com')).toBe(
      'https://mudel.example.com',
    );
  });

  it('returns null without any host information', () => {
    expect(expectedRequestOrigin(null, null, null)).toBeNull();
  });
});

describe('isDevelopmentSafeOrigin', () => {
  it('accepts loopback origins', () => {
    for (const origin of ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://[::1]:3000']) {
      expect(isDevelopmentSafeOrigin(origin)).toBe(true);
    }
  });

  it('accepts private/LAN origins', () => {
    for (const ip of ['10.0.0.1', '172.16.0.1', '172.31.255.1', '192.168.0.103', '169.254.1.1']) {
      expect(isDevelopmentSafeOrigin(`http://${ip}:3001`)).toBe(true);
    }
  });

  it('rejects public and malformed origins', () => {
    expect(isDevelopmentSafeOrigin('https://mudel.example.com')).toBe(false);
    expect(isDevelopmentSafeOrigin('http://evil.example.com')).toBe(false);
    expect(isDevelopmentSafeOrigin('null')).toBe(false);
    expect(isDevelopmentSafeOrigin('not-a-url')).toBe(false);
  });
});
