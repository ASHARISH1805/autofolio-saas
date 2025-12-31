const { Pool } = require('pg');
require('dotenv').config();

// Check if DATABASE_URL is set in production
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
const databaseUrl = process.env.DATABASE_URL;

if (isProduction && !databaseUrl) {
    console.error("\n❌ CRITICAL ERROR: DATABASE_URL environment variable is not set!");
    console.error("📋 Required Action:");
    console.error("   1. Go to Render Dashboard → Your PostgreSQL Database");
    console.error("   2. Copy the 'Internal Database URL'");
    console.error("   3. Go to Your Web Service → Environment tab");
    console.error("   4. Add: DATABASE_URL = <paste the database URL>");
    console.error("   5. Save and redeploy\n");
    process.exit(1);
}

// DEBUGGING: Print what we are using
const connectionString = databaseUrl || 'postgres://postgres:ASharish_18052005@localhost:5432/saas_portfolio_db';
console.log("---------------------------------------------------");
console.log("DEBUG: Using Connection String:", connectionString);
console.log("DEBUG: Environment:", isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
console.log("---------------------------------------------------");

const pool = new Pool({
    connectionString: connectionString,
    ssl: isProduction ? { rejectUnauthorized: false } : false
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};