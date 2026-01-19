import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
// If your Prisma file is located elsewhere, you can change the path
// import { PrismaClient } from '@/generated/prisma/client';
import { PrismaService } from '@/src/prisma/prisma.service';

// const prisma = new PrismaClient();

const prisma = new PrismaService();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  emailAndPassword: {
    enabled: true,
  },
});
