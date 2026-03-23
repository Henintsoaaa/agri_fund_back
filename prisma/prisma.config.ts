import { defineConfig } from '@prisma/client/generator-build';

export default defineConfig({
  adapter: {
    provider: 'postgresql',
    url: process.env.DATABASE_URL,
  },
});
