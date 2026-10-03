import { mkdtempSync } from 'fs';
import os from 'os';
import path from 'path';

process.env.UPLOAD_DIR = mkdtempSync(path.join(os.tmpdir(), 'uploads-'));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { dataUrlToFile, readStoredFile, SAFE_NAME } = require('../file-store');

test('base64 image round-trips through disk', async () => {
  const url = await dataUrlToFile('data:image/png;base64,aGVsbG8=');
  const name = url.replace('/api/files/', '');
  expect(SAFE_NAME.test(name)).toBe(true);
  expect((await readStoredFile(name)).toString()).toBe('hello');
});

test('rejects traversal names', () => {
  expect(SAFE_NAME.test('../../etc/passwd')).toBe(false);
});
