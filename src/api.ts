// The API process: the GraphQL endpoint at /graphql over HTTP (docs/architecture/bootstrap.md).
import { createServer } from 'node:http';

import { createApp } from './app.js';
import { parseEnv } from './config/index.js';
import { systemClock } from './shared/index.js';

const env = parseEnv(process.env);
const app = createApp({ env, clock: systemClock });
createServer(app.yoga.requestListener).listen(env.PORT);
