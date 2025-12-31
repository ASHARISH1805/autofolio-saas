const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./database');
const { OAuth2Client } = require('google-auth-library');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Polyfill for pdf-parse issue with DOMMatrix
if (!global.DOMMatrix) {
    global.DOMMatrix = class DOMMatrix { };
}

const pdfParse = require('pdf-parse');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '631887364280-qhgrh2c9jdc3901kdklokrks21cugppa.apps.googleusercontent.com';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Serve Uploads & Static Files
// 1. /uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// 2. Serve static assets (css, js, images) from root, but do NOT serve index.html automatically as root
// We use { index: false } to prevent serving index.html (which is now portfolio.html) at /
// Serve static assets (css, js, images) from root
// We use { index: false } to prevent serving index.html automatically as root
app.use(express.static(path.join(__dirname), {
    index: false,
    setHeaders: (res, path) => {
        if (path.endsWith('.html') || path.endsWith('.js')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

// Multer
const upload = multer({ storage: multer.memoryStorage() });

// ================= HELPER FUNCTIONS =================
async function getUserBySubdomain(subdomain) {
    // Fallback logic: If subdomain looks like an email? No, just match subdomain or fallback.
    // For local dev, 'harish' is mapped to default user.
    const res = await db.query('SELECT * FROM users WHERE subdomain = $1', [subdomain]);
    return res.rows[0];
}

// ================= AUTH MIDDLEWARE =================
const reqAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing Token' });
    }
    const token = authHeader.split(' ')[1];

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const email = payload.email;

        // Fetch User and attach to request
        const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) {
            return res.status(401).json({ error: 'User not registered. Please Login first.' });
        }
        req.user = userRes.rows[0];
        next();
    } catch (err) {
        console.error('Auth Error:', err.message);
        res.status(401).json({ error: 'Unauthorized: Invalid Token' });
    }
};

// ================= AUTH ROUTES =================
app.get('/api/auth/config', (req, res) => res.json({ clientId: GOOGLE_CLIENT_ID }));

app.post('/api/auth/google', async (req, res) => {
    const { token } = req.body;
    console.log(`[AUTH] Protocol initiated. Token length: ${token ? token.length : 'MISSING'}`);

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        const { email, name, sub } = payload;

        console.log(`[AUTH] Token Verified. User: ${email}`);

        // Upsert User
        let userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) {
            console.log(`[AUTH] New user detected. Creating account for ${email}...`);
            // Generate unique subdomain from email
            let subdomain = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

            // Check collision
            const check = await db.query('SELECT * FROM users WHERE subdomain = $1', [subdomain]);
            if (check.rows.length > 0) subdomain += Math.floor(Math.random() * 1000);

            userRes = await db.query(
                'INSERT INTO users (email, name, google_id, subdomain) VALUES ($1, $2, $3, $4) RETURNING *',
                [email, name, sub, subdomain]
            );
        } else {
            console.log(`[AUTH] Existing user found. ID: ${userRes.rows[0].id}`);
        }
        res.json({ success: true, user: userRes.rows[0] });
    } catch (err) {
        console.error('[AUTH] Login Failed:', err.message);
        res.status(401).json({ error: 'Auth Failed: ' + err.message });
    }
});

// ================= PUBLIC API (Public Portfolio Data) =================
app.get('/api/public/:username/:resource', async (req, res) => {
    const { username, resource } = req.params;
    const allowed = ['skills', 'projects', 'internships', 'certifications', 'achievements'];
    if (!allowed.includes(resource)) return res.status(400).json({ error: 'Invalid resource' });

    try {
        const user = await getUserBySubdomain(username);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const query = `SELECT * FROM ${resource} WHERE user_id = $1 AND is_visible = TRUE ORDER BY display_order ASC`;
        const result = await db.query(query, [user.id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// Contact Form
app.post('/api/contact', async (req, res) => {
    const { name, email, subject, message, target_user } = req.body;

    try {
        // Default to 'harish' if no target specified (legacy support)
        const recipientSubdomain = target_user || 'harish';
        const user = await getUserBySubdomain(recipientSubdomain);

        if (!user) return res.status(404).json({ error: 'Recipient not found' });

        await db.query(
            'INSERT INTO messages (user_id, name, email, subject, message) VALUES ($1, $2, $3, $4, $5)',
            [user.id, name, email, subject, message]
        );

        // Email Notification
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
            });

            // Send email to the Portfolio Owner
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: `New Portfolio Message: ${subject}`,
                text: `You have received a new message on your AutoFolio.\n\nFrom: ${name} (${email})\nSubject: ${subject}\n\nMessage:\n${message}`
            });
            console.log(`📧 Email sent to ${user.email}`);
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Contact Error:', err);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// ================= ADMIN ROUTES (Protected / Dashboard) =================
// Note: Frontend uses paths like /api/admin/view/skills
const adminRouter = express.Router();
adminRouter.use(reqAuth);

// Get Messages
adminRouter.get('/view/messages', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM messages WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// View Table
adminRouter.get('/view/:table', async (req, res) => {
    const { table } = req.params;
    const allowed = ['skills', 'projects', 'internships', 'certifications', 'achievements'];
    if (!allowed.includes(table)) return res.status(400).json({ error: 'Invalid table' });

    try {
        const result = await db.query(`SELECT * FROM ${table} WHERE user_id = $1 ORDER BY display_order ASC`, [req.user.id]);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Save Item (Upsert)
adminRouter.post('/save', async (req, res) => {
    const { table, id, ...data } = req.body;
    const allowed = ['skills', 'projects', 'internships', 'certifications', 'achievements'];
    if (!allowed.includes(table)) return res.status(400).json({ error: 'Invalid table' });

    // Filter valid columns (Simplified white-list approach for safety)
    // We trust admin input slightly but ensure SQL safety via parameters
    // We MUST remove 'id' and 'user_id' from data if present to avoid overwriting
    delete data.id;
    delete data.user_id;

    try {
        if (id) {
            // Update Existing
            const keys = Object.keys(data);
            if (keys.length === 0) return res.json({ success: true }); // Nothing to update

            const values = Object.values(data);
            const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

            // Ensure ownership: WHERE id = $ID AND user_id = $USER_ID
            await db.query(`UPDATE ${table} SET ${setClause} WHERE id = $${keys.length + 1} AND user_id = $${keys.length + 2}`,
                [...values, id, req.user.id]);
        } else {
            // Insert New
            const keys = ['user_id', ...Object.keys(data)];
            const values = [req.user.id, ...Object.values(data)];
            const cols = keys.join(', ');
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

            await db.query(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`, values);
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Delete
adminRouter.delete('/delete/:table/:id', async (req, res) => {
    const { table, id } = req.params;
    const allowed = ['skills', 'projects', 'internships', 'certifications', 'achievements'];
    if (!allowed.includes(table)) return res.status(400).json({ error: 'Invalid table' });

    try {
        await db.query(`DELETE FROM ${table} WHERE id = $1 AND user_id = $2`, [id, req.user.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// File Upload (Base64 return)
adminRouter.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;
    res.json({ filePath: dataURI });
});

app.use('/api/admin', adminRouter);

// Resume Parse (Protected)
app.post('/api/resume/parse', reqAuth, upload.single('resume'), async (req, res) => {
    if (!req.file || !GEMINI_API_KEY) return res.status(400).json({ error: 'Missing file/key' });
    try {
        console.log('📄 Parsing PDF...');
        const pdfData = await pdfParse(req.file.buffer);
        const text = pdfData.text;

        console.log('🧠 Sending to AI...');
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Extract JSON from resume text: 
        "${text.substring(0, 30000)}". 
        
        Return ONLY valid JSON with this structure: 
        { 
          "skills": [{ "title": "Category", "technologies": "Comma, separated, list" }], 
          "projects": [{ "title": "Project Name", "description": "Brief Desc", "technologies": "Tech Stack", "link": "url" }], 
          "internships": [{ "title": "Role", "company": "Company", "period": "Dates", "description": "Duties" }], 
          "certifications": [{ "title": "Name", "issuer": "Org", "date_issued": "Year" }],
          "achievements": [{ "title": "Title", "description": "Desc" }]
        }`;

        const result = await model.generateContent(prompt);
        let jsonStr = result.response.text();
        // Clean markdown
        jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();

        res.json({ success: true, data: JSON.parse(jsonStr) });
    } catch (err) {
        console.error('Resume Parse Error', err);
        res.status(500).json({ error: 'Parse Error', details: err.message });
    }
});

// ================= FRONTEND ROUTING =================
// 1. Landing Page at Root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'landing.html'));
});

// 2. User Portfolio at /u/:username
app.get('/u/:username', (req, res) => {
    res.sendFile(path.join(__dirname, 'portfolio.html'));
});

// 3. Other Pages
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/dashboard.html', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
app.get('/admin.html', (req, res) => res.redirect('/dashboard.html'));

// ================= DATABASE AUTO-MIGRATION =================
async function ensureSchema() {
    try {
        console.log('🔄 Checking Database Schema...');

        // 1. Create Messages Table
        await db.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255),
                email VARCHAR(255),
                subject VARCHAR(255),
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_read BOOLEAN DEFAULT FALSE
            )
        `);

        // 2. Ensure Columns Exist (Safe Alter)
        const tables = ['projects', 'internships', 'achievements'];
        const links = ['source_code', 'demo_video', 'live_demo'];

        // Add Visible Columns
        for (const table of tables) {
            for (const link of links) {
                const colName = `${link}_visible`;
                await db.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${colName} BOOLEAN DEFAULT TRUE`);
            }
            // Add Certificate Link
            await db.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS certificate_link TEXT`);
            // Add Certificate Visible
            await db.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS certificate_visible BOOLEAN DEFAULT TRUE`);
        }

        // Certifications Table
        await db.query(`ALTER TABLE certifications ADD COLUMN IF NOT EXISTS certificate_visible BOOLEAN DEFAULT TRUE`);
        await db.query(`ALTER TABLE certifications ADD COLUMN IF NOT EXISTS verify_link VARCHAR(500)`);

        // Projects Image
        await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_image_path TEXT`);

        // Skills Icon
        await db.query(`ALTER TABLE skills ADD COLUMN IF NOT EXISTS icon_class VARCHAR(50) DEFAULT 'fas fa-code'`);

        console.log('✅ Database Schema Verified.');
    } catch (err) {
        console.error('❌ Schema Check Failed:', err);
    }
}

// Start Server
ensureSchema().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`- Landing: http://localhost:${PORT}/`);
        console.log(`- Portfolio (Example): http://localhost:${PORT}/u/harish`);
    });
});
