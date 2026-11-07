import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

import {
  findSnippetProblems,
  findUnprotectedStagingHosts,
} from './check-gateway-staging-access.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(REPO_ROOT, path), 'utf8');

const server = (names, body = '') => `
    server {
        listen 443 ssl http2;
        server_name ${names};
${body}
    }
`;
const GUARD = '        include /etc/nginx/snippets/staging-access.conf;';

describe('findUnprotectedStagingHosts', () => {
  it('passes when every staging vhost includes the access snippet', () => {
    const text =
      server('adoptdontshop.app') +
      server('staging.adoptdontshop.app', GUARD) +
      server('staging-api.adoptdontshop.app', GUARD);
    expect(findUnprotectedStagingHosts(text)).toEqual([]);
  });

  it('flags a staging vhost that is publicly reachable', () => {
    const text =
      server('staging.adoptdontshop.app', GUARD) + server('staging-admin.adoptdontshop.app');
    expect(findUnprotectedStagingHosts(text)).toEqual(['staging-admin.adoptdontshop.app']);
  });

  it('does not count a commented-out include as protection', () => {
    const text = server(
      'staging-rescue.adoptdontshop.app',
      '        # include /etc/nginx/snippets/staging-access.conf;'
    );
    expect(findUnprotectedStagingHosts(text)).toEqual(['staging-rescue.adoptdontshop.app']);
  });

  it('ignores the port-80 redirect block, which only ever answers with a 301', () => {
    const text = `
    server {
        listen 80;
        server_name adoptdontshop.app staging.adoptdontshop.app;
        location / { return 301 https://$host$request_uri; }
    }
`;
    expect(findUnprotectedStagingHosts(text)).toEqual([]);
  });

  it('protects every staging vhost in the real gateway config', () => {
    expect(findUnprotectedStagingHosts(read('deploy/gateway/nginx.conf'))).toEqual([]);
  });
});

describe('findSnippetProblems', () => {
  const COMPLETE = `
satisfy any;
include /etc/nginx/staging-access/*.allow;
deny all;
auth_basic "staging";
auth_basic_user_file /etc/nginx/staging-access/htpasswd;
`;

  it('accepts an allowlist-or-password snippet that denies everyone else', () => {
    expect(findSnippetProblems(COMPLETE)).toEqual([]);
  });

  it('flags a snippet that would let unlisted IPs through without a password', () => {
    const text = COMPLETE.replace('deny all;', '').replace(/auth_basic.*\n/g, '');
    expect(findSnippetProblems(text)).toEqual([
      'missing "deny all;"',
      'missing "auth_basic"',
      'missing "auth_basic_user_file"',
    ]);
  });

  it('accepts the real snippet', () => {
    expect(findSnippetProblems(read('deploy/gateway/snippets/staging-access.conf'))).toEqual([]);
  });
});
