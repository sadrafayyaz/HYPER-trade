require("dotenv").config();

module.exports = {
  app: {
    port: process.env.PORT || 3000,
    name: process.env.APP_NAME || "Trading AI Exchange",
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  bcrypt: {
    rounds: Number(process.env.BCRYPT_SALT_ROUNDS || 12),
  },
};