const { Pool } = require('pg');
require('dotenv').config();

// DEBUGGING: Print what we are using
const connectionString = process.env.DATABASE_URL || 'postgres://postgres:ASharish_18052005@localhost:5432/saas_portfolio_db';
console.log("---------------------------------------------------");
console.log("DEBUG: Using Connection String:", connectionString);
console.log("---------------------------------------------------");

const pool = new Pool({
    connectionString: connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};