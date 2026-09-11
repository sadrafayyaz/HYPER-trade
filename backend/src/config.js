module.exports = {
    port: process.env.PORT || 3000,

    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || "7d"
    },

    bcrypt: {
        rounds: Number(process.env.BCRYPT_SALT_ROUNDS || 12)
    }
};