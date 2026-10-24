declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL?: string;
    POSTGRES_URL?: string;
    AUTH_SECRET?: string;
    SESSION_SECRET?: string;
    APP_URL?: string;
    RESEND_API_KEY?: string;
    EMAIL_FROM?: string;
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    NOTIFICATION_GATEWAY_URL?: string;
    NOTIFICATION_GATEWAY_TOKEN?: string;
    REMINDER_JOB_SECRET?: string;
    TURN_URLS?: string;
    TURN_SHARED_SECRET?: string;
    SHOP_ENABLED?: string;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    MARKETPLACE_ENABLED?: string;
    MARKETPLACE_COUNTRIES?: string;
    MARKETPLACE_FEE_BPS?: string;
    STRIPE_CONNECT_WEBHOOK_SECRET?: string;
  }
}
