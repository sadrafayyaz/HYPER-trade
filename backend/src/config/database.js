const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
});

pool.connect((err) => {
    if (err) {
        console.error("❌ PostgreSQL Connection Error");
        console.error(err.message);
    } else {
        console.log("✅ PostgreSQL Connected Successfully");
    }
});

module.exports = pool;