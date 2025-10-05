module.exports = ({ env }) => ({
  url: env("URL", "https://www.api.bwiscompltd.com"),
  proxy: { koa: true },
  host: env("HOST", "0.0.0.0"),
  port: env.int("PORT", 1337),
  app: { keys: env.array("APP_KEYS") },
});
