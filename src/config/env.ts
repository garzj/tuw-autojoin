import * as z from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .union([
      z.literal('development'),
      z.literal('production'),
      z.literal('test'),
    ])
    .default('production'),
  LOGIN_USERNAME: z.string(),
  LOGIN_PASSWORD: z.string(),
  PRELOGIN_CRON: z.string(),
  PRELOGIN_TZ: z.string(),
  PRELOGIN_RETRY_INTERVAL: z.coerce.number(),
  PRELOGIN_RETRY_MAX: z.coerce.number(),
  SIGNUP_URL: z.string().url(),
  SIGNUP_TRY_GROUPS: z.string(),
  SIGNUP_CRON: z.string(),
  SIGNUP_TZ: z.string(),
  SIGNUP_RETRY_INTERVAL: z.coerce.number(),
  SIGNUP_RETRY_MAX: z.coerce.number(),
  DRY_RUN: z.coerce.boolean().default(false),
});
export type Env = z.infer<typeof envSchema>;

const envRes = envSchema.safeParse(process.env);
if (!envRes.success) {
  console.log(`Env validation error:`, envRes.error.format());
  process.exit(1);
}
const env = envRes.data;

export { env };
