const bcrypt = require("bcrypt");
const config = require("../config/config");

async function hashPassword(password) {
  return bcrypt.hash(password, config.bcrypt.rounds);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = {
  hashPassword,
  comparePassword,
};