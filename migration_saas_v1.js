const db = require('./database');

async function migrate() {
    console.log('🚀 Starting SaaS Database Migration (Phase 2)...');
    try {
        await db.query('BEGIN');

        // 1. Re-create Users Table with SaaS fields
        console.log('📦 Updating Users Table Schema...');
        // We drop the old users table if it exists as it was a placeholder
        // CAUTION: This deletes any existing admin users, but since it was just a raw hash, we will recreate a better one.
        await db.query('DROP TABLE IF EXISTS users CASCADE');
        
        await db.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                google_id VARCHAR(255) UNIQUE,
                email VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(255),
                subdomain VARCHAR(100) UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Create Default User (The original portfolio owner)
        console.log('👤 Creating Default User...');
        const defaultUser = await db.query(`
            INSERT INTO users (email, name, subdomain)
            VALUES ($1, $2, $3)
            RETURNING id
        `, ['harishengg1805@gmail.com', 'Harish A.S', 'harish']);
        
        const userId = defaultUser.rows[0].id;
        console.log(`✅ Default User ID: ${userId}`);

        // 3. Add user_id to all resource tables
        const tables = ['skills', 'projects', 'internships', 'certifications', 'achievements', 'messages'];
        
        for (const table of tables) {
            console.log(`🔗 Linking table ${table} to user...`);
            
            // Add column
            await db.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS user_id INTEGER`);
            
            // Set ownership to default user
            await db.query(`UPDATE ${table} SET user_id = $1 WHERE user_id IS NULL`, [userId]);
            
            // Add Foreign Key Constraint
            // We drop existing constraint if exists to avoid error on rerun
            await db.query(`
                DO $$ 
                BEGIN 
                    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_${table}_user') THEN 
                        ALTER TABLE ${table} DROP CONSTRAINT fk_${table}_user; 
                    END IF; 
                END $$;
            `);
            
            await db.query(`
                ALTER TABLE ${table} 
                ADD CONSTRAINT fk_${table}_user 
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            `);
        }

        await db.query('COMMIT');
        console.log('✅ SaaS Migration Complete. Database is now Multi-Tenant.');
        process.exit(0);
    } catch (err) {
        await db.query('ROLLBACK');
        console.error('❌ Migration Failed:', err);
        process.exit(1);
    }
}

migrate();
