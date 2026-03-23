import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaService } from '@/src/prisma/prisma.service';
import { send } from 'process';
import { sendEmail } from './email';
import { LoggerService } from '@/src/common/logger/logger.service';

const prisma = new PrismaService();
const logger = new LoggerService('BetterAuth');

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  trustedOrigins: ['http://localhost:5173', process.env.CORS_ORIGIN].filter(
    Boolean,
  ) as string[],

  cookies: {
    sessionToken: {
      name: 'better-auth.session_token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        secure: false, // Set to true when using HTTPS
        path: '/',
      },
    },
  },

  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url, token }, request) => {
      // void sendEmail({
      //   to: user.email,
      //   subject: 'Reset your password',
      //   text: `Click the link to reset your password: ${url}`,
      // });
      logger.log('Password reset requested', { email: user.email });
      logger.debug('Password reset URL generated', { url });
    },
    onPasswordReset: async ({ user }, request) => {
      logger.log('Password reset completed', { email: user.email });
    },
  },

  // Add the role field as custom field on the user
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        defaultValue: 'INVESTOR',
        input: true,
      },
    },
  },
});
