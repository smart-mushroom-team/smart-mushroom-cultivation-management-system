'use strict';

/**
 * Kiểm tra cú pháp + $ref của các file OpenAPI trong docs/openapi (chạy trong CI).
 *   npm run openapi:validate
 */
const path = require('node:path');
const SwaggerParser = require('@apidevtools/swagger-parser');

const DIR = path.join(__dirname, '..', 'docs', 'openapi');
const FILES = ['identity.yaml', 'core.yaml', 'monitoring.yaml'];

async function main() {
  let failed = false;
  for (const file of FILES) {
    try {
      const api = await SwaggerParser.validate(path.join(DIR, file));
      const count = Object.values(api.paths).reduce(
        (n, item) =>
          n +
          Object.keys(item).filter((k) => ['get', 'post', 'put', 'patch', 'delete'].includes(k))
            .length,
        0,
      );
      console.log(
        `OK   ${file}: ${api.info.title} — ${Object.keys(api.paths).length} đường dẫn, ${count} thao tác`,
      );
    } catch (err) {
      failed = true;
      console.error(`LỖI ${file}: ${err.message}`);
    }
  }
  process.exit(failed ? 1 : 0);
}

main();
