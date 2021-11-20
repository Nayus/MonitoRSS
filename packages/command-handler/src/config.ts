import * as dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  botToken: z.string().min(1).default(process.env.MRSS_BOT_TOKEN as string),
  botClientId: z.string().min(1).default(process.env.MRSS_BOT_CLIENT_ID as string),
  testingGuildId: z.string().min(1).default(process.env.MRSS_TESTING_GUILD_ID as string),
  mongoUri: z.string().min(1).default(process.env.MRSS_MONGO_URI as string),
  defaultRefreshRateMinutes: z.number().default(
    Number(process.env.MRSS_DEFAULT_REFRESH_RATE_MINUTES as string),
  ),
  defaultMaxFeeds: z.number().default(
    Number(process.env.MRSS_DEFAULT_MAX_FEEDS as string),
  ),
  logging: z.object({
    enableDebugLogs: z.boolean(),
    datadog: z.object({
      apiKey: z.string(),
      service: z.string(),
    }),
  }).default({
    enableDebugLogs: process.env.MRSS_LOGGING_ENABLE_DEBUG_LOGS === 'true',
    datadog: {
      apiKey: process.env.MRSS_LOGGING_DATADOG_API_KEY as string,
      service: process.env.MRSS_LOGGING_DATADOG_SERVICE || 'command-handler',
    },
  }),
  apis: z.object({
    subscriptions: z.object({
      enabled: z.boolean(),
      host: z.string().min(1),
      accessToken: z.string().min(1),
    })
      .partial()  
      .refine(data => {
        return (data.enabled && data.host && data.accessToken) || !data.enabled;
      }
      , 'Host and access token for subscription API must be set when enabled'),
  }).default({
    subscriptions: {
      enabled: process.env.MRSS_API_SUBSCRIPTIONS_ENABLED === 'true',
      host: process.env.MRSS_API_SUBSCRIPTIONS_HOST as string,
      accessToken: process.env.MRSS_API_SUBSCRIPTIONS_ACCESS_TOKEN as string,
    },
  }),
});

const config = configSchema.parse({});

export default config;
