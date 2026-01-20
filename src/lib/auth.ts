import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
// If your Prisma file is located elsewhere, you can change the path
// import { PrismaClient } from '@/generated/prisma/client';
import { PrismaService } from '@/src/prisma/prisma.service';
import { send } from 'process';
import { sendEmail } from './email';

// const prisma = new PrismaClient();

const prisma = new PrismaService();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url, token }, request) => {
      // void sendEmail({
      //   to: user.email,
      //   subject: 'Reset your password',
      //   text: `Click the link to reset your password: ${url}`,
      // });
      console.log(`Click the link to reset your password: ${url}`);
    },
    onPasswordReset: async ({ user }, request) => {
      // your logic here
      console.log(`Password for user ${user.email} has been reset.`);
    },
  },
});
