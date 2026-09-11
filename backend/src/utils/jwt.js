const jwt = require("jsonwebtoken");
const config = require("../config/config");

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.expiresIn,
    }
  );
}

function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

module.exports = {
  generateToken,
  verifyToken,
};