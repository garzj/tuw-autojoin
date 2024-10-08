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
  URL: z.string().url(),
  TRY_GROUPS: z.string(),
  PRELOGIN_SECOND: z.coerce.number().optional(),
  PRELOGIN_MINUTE: z.coerce.number().optional(),
  PRELOGIN_HOUR: z.coerce.number().optional(),
  PRELOGIN_DATE: z.coerce.number().optional(),
  PRELOGIN_MONTH: z.coerce.number().optional(),
  PRELOGIN_YEAR: z.coerce.number().optional(),
  PRELOGIN_TZ: z.string(),
  PRELOGIN_RETRY_INTERVAL: z.coerce.number(),
  PRELOGIN_RETRY_MAX: z.coerce.number(),
  SIGNUP_SECOND: z.coerce.number(),
  SIGNUP_MINUTE: z.coerce.number(),
  SIGNUP_HOUR: z.coerce.number(),
  SIGNUP_DATE: z.coerce.number(),
  SIGNUP_MONTH: z.coerce.number(),
  SIGNUP_YEAR: z.coerce.number(),
  SIGNUP_TZ: z.string(),
  SIGNUP_RETRY_INTERVAL: z.coerce.number(),
  SIGNUP_RETRY_MAX: z.coerce.number(),
});
export type Env = z.infer<typeof envSchema>;

const envRes = envSchema.safeParse(process.env);
if (!envRes.success) {
  console.log(`Env validation error:`, envRes.error.format());
  process.exit(1);
}
const env = envRes.data;

export { env };
