import arcjet, { tokenBucket } from "@arcjet/next";

// Only initialise Arcjet if the key is present.
// Without this guard, every server action crashes in dev
// when ARCJET_KEY is not set in .env.local
const aj = process.env.ARCJET_KEY
  ? arcjet({
      key: process.env.ARCJET_KEY,
      characteristics: ["userId"],
      rules: [
        tokenBucket({
          mode: "LIVE",
          refillRate: 100,
          interval: 3600,
          capacity: 100,
        }),
      ],
    })
  : null;

export default aj;