import { cpSync, mkdirSync } from 'node:fs';
mkdirSync('dist/schema', { recursive: true });
cpSync('schema', 'dist/schema', { recursive: true });
console.log('✓ schema copied to dist/schema');
