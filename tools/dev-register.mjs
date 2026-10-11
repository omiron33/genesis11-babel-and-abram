import { register } from 'node:module';
register(new URL('./dev-loader.mjs', import.meta.url));
