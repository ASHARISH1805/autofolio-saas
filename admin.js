const API_URL = '/api';

// --- AUTH HANDOFF: Check URL for Token ---
const urlParams = new URLSearchParams(window.location.search);
const tokenFromUrl = urlParams.get('token');
const emailFromUrl = urlParams.get('email');

if (tokenFromUrl && emailFromUrl) {
    console.log('[AUTH] Restoring session from URL...');
    localStorage.setItem('saasToken', tokenFromUrl);
    localStorage.setItem('adminKey', tokenFromUrl); // Legacy support
    localStorage.setItem('adminEmail', emailFromUrl);

    // Clean URL silently
    const newUrl = window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
}

// --- AUTH CHECK ---
let ADMIN_KEY = localStorage.getItem('saasToken') || localStorage.getItem('adminKey');
console.log('[DEBUG] Loaded Token:', ADMIN_KEY ? ADMIN_KEY.substring(0, 10) + '...' : 'NONE');

// Strict Validation
if (!ADMIN_KEY || ADMIN_KEY === 'undefined' || ADMIN_KEY === 'null' || ADMIN_KEY.trim() === '') {
    // Only alert if we really have no token and we're not on the login page
    // We can't redirect to login if we ARE on login... but this is admin.js, used in dashboard.
    // However, if we just failed the URL grab above, we are truly lost.
    if (ADMIN_KEY) alert("Fixing invalid session (Token corrupted). Please login again.");
    localStorage.clear();
    window.location.href = 'login.html';
}

function getAuthHeaders() {
    return {
        'Authorization': `Bearer ${ADMIN_KEY}`
    };
}

// Logout Function
function logout() {
    localStorage.removeItem('adminKey');
    localStorage.removeItem('adminEmail');
    window.location.href = 'login.html';
}

async function downloadBackup() {
    try {
        const res = await fetch('/api/admin/backup', {
            headers: getAuthHeaders()
        });

        if (!res.ok) throw new Error('Backup failed');

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (err) {
        alert('Failed to download backup: ' + err.message);
    }
}

// Display Admin Email
const adminEmail = localStorage.getItem('adminEmail');
if (adminEmail) {
    const display = document.getElementById('adminEmailDisplay');
    if (display) display.innerText = adminEmail;

    // Also update dynamic "View My Portfolio" link
    const subdomain = adminEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const link = document.getElementById('mySiteLink');
    if (link) {
        link.href = `/u/${subdomain}`;
    }
}

// State
let currentSection = 'skills';
let editItemId = null;
let itemToDelete = null;

// --- Helper Functions ---

// 1. File Upload Handler
window.handleFileUpload = async (input, targetId) => {
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const btn = input.nextElementSibling;
    input.disabled = true;

    try {
        const res = await fetch('/api/admin/upload', {
            method: 'POST',
            headers: getAuthHeaders(), // No Content-Type for FormData
            body: formData
        });
        const data = await res.json();

        if (res.status === 401) {
            alert('Session expired. Please login again.');
            window.location.href = 'login.html';
            return;
        }

        if (data.error) throw new Error(data.error);

        // Update the text input with the file path
        document.getElementById(targetId).value = data.filePath;
        alert('File uploaded successfully! Don\'t forget to Save the form.');
    } catch (e) {
        console.error(e);
        alert('Upload failed: ' + e.message);
    } finally {
        input.disabled = false;
        input.value = ''; // Reset file input
    }
};

// --- Resume Import Logic ---
window.openResumeModal = () => document.getElementById('resumeModal').style.display = 'flex';
window.closeResumeModal = () => document.getElementById('resumeModal').style.display = 'none';

window.handleResumeSelect = () => {
    const file = document.getElementById('resumeFile').files[0];
    if (file) {
        document.querySelector('#dropZone p').innerText = "Selected: " + file.name;
        document.querySelector('#dropZone').style.borderColor = '#8b5cf6';
    }
};

window.uploadResume = async () => {
    const file = document.getElementById('resumeFile').files[0];
    if (!file) return alert('Please select a PDF file first.');

    document.getElementById('resumeLoading').style.display = 'block';

    const formData = new FormData();
    formData.append('resume', file);

    try {
        const res = await fetch('/api/resume/parse', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: formData
        });
        const result = await res.json();

        if (!result.success) throw new Error(result.error);

        console.log('Parsed Data:', result.data);
        alert('Resume Parsed Successfully! Importing data...');

        await processParsedData(result.data);

        closeResumeModal();
        location.reload();
    } catch (err) {
        alert('Resume Import Failed: ' + err.message);
    } finally {
        document.getElementById('resumeLoading').style.display = 'none';
    }
};

async function processParsedData(data) {
    const saveItem = async (table, item) => {
        const payload = { ...item, table };
        await fetch('/api/admin/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify(payload)
        });
    };

    if (data.skills) {
        for (const skill of data.skills) await saveItem('skills', skill);
    }
    if (data.projects) {
        for (const p of data.projects) await saveItem('projects', p);
    }
    if (data.internships) {
        for (const i of data.internships) await saveItem('internships', i);
    }
    if (data.certifications) {
        for (const c of data.certifications) await saveItem('certifications', c);
    }
    if (data.achievements) {
        for (const a of data.achievements) await saveItem('achievements', a);
    }
}
// --- End Resume Logic ---

// 2. URL Validation
function isValidUrl(string) {
    if (!string) return true;
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Tab Switching
function switchTab(section) {
    currentSection = section;

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[onclick="switchTab('${section}')"]`).classList.add('active');

    document.querySelectorAll('.section-content').forEach(c => c.classList.remove('active'));
    document.getElementById(section).classList.add('active');

    fetchData(section);
}

// Fetch Data
async function fetchData(section) {
    const container = document.getElementById(`${section}-list`);
    container.innerHTML = 'Loading...';

    if (section === 'messages') {
        container.innerHTML = 'Loading messages...';
        try {
            const response = await fetch('/api/admin/messages', {
                headers: getAuthHeaders()
            });

            if (response.status === 401) {
                window.location.href = 'login.html'; return;
            }

            const messages = await response.json();

            if (messages.length === 0) {
                container.innerHTML = '<p>No messages yet.</p>';
                return;
            }

            container.innerHTML = messages.map(msg => `
                <div class="item-row message-row" style="cursor:default;">
                    <div style="flex:1">
                        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                            <strong>${msg.subject}</strong>
                            <small>${new Date(msg.created_at).toLocaleString()}</small>
                        </div>
                        <div style="margin-bottom:5px;">
                            <span style="color:var(--primary-color)">${msg.name}</span> &lt;${msg.email}&gt;
                        </div>
                        <div style="background:#f8f9fa; padding:10px; border-radius:5px; white-space:pre-wrap;">${msg.message}</div>
                    </div>
                </div>
            `).join('');
            return;
        } catch (e) {
            console.error(e);
            container.innerHTML = '<p style="color:red">Error loading messages</p>';
            return;
        }
    }

    // Updated Fetch Logic for new SaaS API
    try {
        const response = await fetch(`/api/admin/view/${section}`, {
            headers: getAuthHeaders()
        });

        if (response.status === 401) {
            localStorage.removeItem('adminKey');
            window.location.href = 'login.html';
            return;
        }

        if (!response.ok) {
            throw new Error(`Server Error: ${response.status}`);
        }

        const data = await response.json();

        if (data.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; background: white; border-radius: 12px; border: 2px dashed #ccc;">
                    <i class="fas fa-robot" style="font-size: 3em; color: #8b5cf6; margin-bottom: 20px;"></i>
                    <h3>Welcome to your new portfolio!</h3>
                    <p style="color: #666; margin-bottom: 20px;">You don't have any ${section} yet. You can add them manually or use our AI Import.</p>
                    <button onclick="openResumeModal()" class="btn" style="background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); padding: 10px 20px;">
                        <i class="fas fa-magic"></i> Import from Resume
                    </button>
                    <button onclick="openModal('${section}')" class="btn btn-primary" style="background:#2ecc71; margin-left:10px;">
                        <i class="fas fa-plus"></i> Add Manually
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = data.map(item => `
            <div class="item-row" data-id="${item.id}">
                <div>
                    <strong><i class="fas fa-grip-vertical" style="color:#ccc; margin-right:10px"></i> ${item.title}</strong>
                    <br>
                    <small>Order: ${item.display_order}</small> |
                    <small style="color:${item.is_visible ? 'green' : 'red'}">Visible: ${item.is_visible ? '1' : '0'}</small>
                </div>
                <div>
                    <button class="btn btn-edit" onclick='openModal("${section}", ${JSON.stringify(item).replace(/'/g, "&#39;")})'>Edit</button>
                    <button class="btn btn-delete" onclick="deleteItem('${section}', ${item.id})">Delete</button>
                </div>
            </div>
        `).join('');


        new Sortable(container, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            handle: '.item-row',
            onEnd: async function (evt) {
                const orderedIds = Array.from(container.children).map(child => child.getAttribute('data-id'));
                try {
                    const res = await fetch('/api/admin/reorder', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...getAuthHeaders()
                        },
                        body: JSON.stringify({
                            table: section,
                            orderedIds: orderedIds
                        })
                    });

                    if (res.ok) {
                        Array.from(container.children).forEach((row, index) => {
                            const orderSmall = row.querySelector('small');
                            if (orderSmall) {
                                orderSmall.innerText = `Order: ${index + 1}`;
                            }
                        });
                    } else if (res.status === 401) {
                        alert('Session expired'); window.location.href = 'login.html';
                    } else {
                        alert('Failed to update order');
                        fetchData(section);
                    }
                } catch (err) {
                    console.error(err);
                    alert('Network error updating order');
                    fetchData(section);
                }
            }
        });

    } catch (err) {
        container.innerHTML = '<p style="color:red">Error loading data.</p>';
        console.error(err);
    }
}

// Modal Handling
const modal = document.getElementById('formModal');
const formFields = document.getElementById('formFields');

function openModal(section, item = null) {
    editItemId = item ? item.id : null;
    document.getElementById('itemType').value = section;
    document.getElementById('modalTitle').innerText = item ? `Edit ${section.slice(0, -1)}` : `Add ${section.slice(0, -1)}`;

    // Set Main Visibility
    document.getElementById('isVisible').checked = item ? item.is_visible : true;

    // Helper to generate file upload field
    const fileField = (label, name, value, isVisible) => {
        let checkboxName = name.replace('_link', '_visible').replace('_path', '_visible');
        if (name === 'certificate_image_path') checkboxName = 'certificate_visible';
        if (checkboxName === name) checkboxName = name + '_visible';

        return `
        <div class="form-group">
            <label>${label}</label>
            <div style="display:flex; gap:10px; align-items:center;">
                <input type="text" id="${name}" name="${name}" value="${value || ''}" placeholder="Upload a file or paste URL" style="flex:1;"
                    oninput="const chk = document.getElementById('${checkboxName}'); if(this.value.trim() === '') chk.checked = false; else if(!chk.checked) chk.checked = true;">
                <input type="file" onchange="handleFileUpload(this, '${name}')" style="width:100px;">
            </div>
            ${value ? `<div style="font-size:0.8em; margin-top:5px;"><a href="${value}" target="_blank">View Current File</a></div>` : ''}
            <div style="margin-top:5px; font-size:0.9em; color:#666">
                <input type="checkbox" id="${checkboxName}" name="${checkboxName}" value="true" ${isVisible !== false ? 'checked' : ''}> Show this certificate?
            </div>
        </div>`;
    };

    // Helper to generate link field with visibility toggle
    const linkField = (label, name, value, isVisible) => {
        const checkboxName = name.replace('_link', '_visible');
        return `
        <div class="form-group">
            <label>${label}</label>
            <input type="text" name="${name}" value="${value || ''}"
                oninput="const chk = document.getElementById('${checkboxName}'); if(this.value.trim() === '') chk.checked = false; else if(!chk.checked) chk.checked = true;">
            <div style="margin-top:5px; font-size:0.9em; color:#666">
                <input type="checkbox" id="${checkboxName}" name="${checkboxName}" value="true" ${isVisible !== false ? 'checked' : ''}> Show this link?
            </div>
        </div>`;
    };

    let fields = '';

    const commonFields = `
        <div class="form-group">
            <label>Title</label>
            <input type="text" name="title" value="${item ? item.title : ''}" required>
        </div>
        <div class="form-group">
            <label>Display Order</label>
            <input type="number" name="display_order" value="${item ? item.display_order : 0}">
        </div>
    `;

    if (section === 'skills') {
        fields = `
            ${commonFields}
            <div class="form-group">
                <label>Technologies (Comma separated)</label>
                <textarea name="technologies">${item ? item.technologies : ''}</textarea>
            </div>
        `;
    } else if (section === 'projects') {
        fields = `
            ${commonFields}
            <div class="form-group">
                <label>Description</label>
                <textarea name="description">${item ? item.description : ''}</textarea>
            </div>
            <div class="form-group">
                <label>Technologies</label>
                <input type="text" name="technologies" value="${item ? item.technologies : ''}">
            </div>
            ${linkField('Source Code Link', 'source_code_link', item?.source_code_link, item?.source_code_visible)}
            ${linkField('Demo Video Link', 'demo_video_link', item?.demo_video_link, item?.demo_video_visible)}
            ${linkField('Live Demo Link', 'live_demo_link', item?.live_demo_link, item?.live_demo_visible)}
            ${fileField('Home Page Image', 'certificate_link', item?.certificate_link, item?.certificate_visible)}
            ${fileField('Project Home Page Image (Popup)', 'project_image_path', item?.project_image_path, true)}
        `;
    } else if (section === 'internships') {
        fields = `
            <div class="form-group">
                <label>Role / Title</label>
                <input type="text" name="title" value="${item ? item.title : ''}" required>
            </div>
            <div class="form-group">
                <label>Company</label>
                <input type="text" name="company" value="${item ? item.company : ''}" required>
            </div>
            <div class="form-group">
                <label>Timeline (e.g. Aug 2024 - Oct 2024)</label>
                <input type="text" name="period" value="${item ? item.period : ''}">
            </div>
            <div class="form-group">
                <label>Technologies Used</label>
                <input type="text" name="technologies" value="${item ? item.technologies : ''}">
            </div>
            <div class="form-group">
                <label>Display Order</label>
                <input type="number" name="display_order" value="${item ? item.display_order : 0}">
            </div>
            <div class="form-group">
                <label>Description (Use • for bullets)</label>
                <textarea name="description" rows="5">${item ? item.description : ''}</textarea>
            </div>
            ${linkField('Source Code Link', 'source_code_link', item?.source_code_link, item?.source_code_visible)}
            ${linkField('Demo Video Link', 'demo_video_link', item?.demo_video_link, item?.demo_video_visible)}
            ${linkField('Live Demo Link', 'live_demo_link', item?.live_demo_link, item?.live_demo_visible)}
            ${fileField('Certificate File', 'certificate_link', item?.certificate_link, item?.certificate_visible)}
        `;
    } else if (section === 'certifications') {
        fields = `
            ${commonFields}
            <div class="form-group">
                <label>Issuer (e.g. IBM, Microsoft)</label>
                <input type="text" name="issuer" value="${item ? item.issuer : ''}">
            </div>
             <div class="form-group">
                <label>Date (e.g. Jan 2024)</label>
                <input type="text" name="date_issued" value="${item ? item.date_issued : ''}">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea name="description" rows="3">${item ? item.description : ''}</textarea>
            </div>
            ${fileField('Certificate File/Image', 'certificate_image_path', item?.certificate_image_path, item?.certificate_visible)}
            <div class="form-group">
                <label>Verify Link (Optional URL)</label>
                <input type="text" name="verify_link" value="${item?.verify_link || ''}">
            </div>
        `;
    } else if (section === 'achievements') {
        fields = `
            ${commonFields}
            <div class="form-group">
                <label>Role (if applicable)</label>
                <input type="text" name="role" value="${item ? item.role : ''}">
            </div>
            <div class="form-group">
                <label>Description (Use • for bullets)</label>
                <textarea name="description" rows="5">${item ? item.description : ''}</textarea>
            </div>
            ${linkField('Source Code Link', 'source_code_link', item?.source_code_link, item?.source_code_visible)}
            ${linkField('Demo Video Link', 'demo_video_link', item?.demo_video_link, item?.demo_video_visible)}
            ${linkField('Live Demo Link', 'live_demo_link', item?.live_demo_link, item?.live_demo_visible)}
            ${fileField('Certificate File', 'certificate_link', item?.certificate_link, item?.certificate_visible)}
        `;
    }

    formFields.innerHTML = fields;
    modal.style.display = 'flex';
}

function closeModal() {
    modal.style.display = 'none';
}

document.getElementById('adminForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const section = document.getElementById('itemType').value;
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    // Validation
    const invalidFields = [];
    for (const [key, value] of Object.entries(data)) {
        if (key.includes('link') && value && typeof value === 'string' && !key.includes('visible')) {
            if (value.startsWith('http')) {
                if (!isValidUrl(value)) invalidFields.push(`${key}: Invalid URL format`);
            }
        }
    }

    if (invalidFields.length > 0) {
        alert('Validation Error:\n' + invalidFields.join('\n'));
        return;
    }

    data.is_visible = document.getElementById('isVisible').checked;

    if (document.getElementById('source_code_visible')) {
        data.source_code_visible = document.getElementById('source_code_visible').checked;
    }
    if (document.getElementById('demo_video_visible')) {
        data.demo_video_visible = document.getElementById('demo_video_visible').checked;
    }
    if (document.getElementById('live_demo_visible')) {
        data.live_demo_visible = document.getElementById('live_demo_visible').checked;
    }
    if (document.getElementById('certificate_visible')) {
        data.certificate_visible = document.getElementById('certificate_visible').checked;
    }

    const payload = { ...data, table: section };
    if (editItemId) {
        payload.id = editItemId;
    }

    try {
        const response = await fetch('/api/admin/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert('Saved successfully!');
            closeModal();
            fetchData(section);
        } else if (response.status === 401) {
            alert('Session expired'); window.location.href = 'login.html';
        } else {
            const err = await response.json();
            alert('Error: ' + err.error + (err.details ? '\nDetails: ' + err.details : ''));
        }
    } catch (err) {
        console.error(err);
        alert('Network error');
    }
});

async function deleteItem(section, id) {
    if (confirm('Are you sure you want to delete this item?')) {
        try {
            const response = await fetch(`/api/admin/delete/${section}/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (response.ok) {
                fetchData(section);
            } else if (response.status === 401) {
                alert('Session expired'); window.location.href = 'login.html';
            } else {
                alert('Error deleting item');
            }
        } catch (err) { console.error(err); }
    }
}

fetchData('skills');
