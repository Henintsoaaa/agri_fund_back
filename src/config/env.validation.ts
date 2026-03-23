import * as Joi from 'joi';

/**
 * Environment variables validation schema
 * This ensures all required environment variables are present at startup
 */
export const envValidationSchema = Joi.object({
  // Server
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  // Database
  DATABASE_URL: Joi.string().required(),

  // Authentication
  BETTER_AUTH_SECRET: Joi.string().min(32).required(),
  BETTER_AUTH_URL: Joi.string().uri().required(),

  // CORS
  CORS_ORIGIN: Joi.string().required(),

  // Stripe (optional in development)
  STRIPE_SECRET_KEY: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  STRIPE_WEBHOOK_SECRET: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),

  // Optional Email Configuration
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().optional(),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASSWORD: Joi.string().optional(),
  SMTP_FROM: Joi.string().email().optional(),
});
