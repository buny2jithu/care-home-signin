const STORE_KEY = 'careHomeLogs_v1';
const PW_STORE_KEY = 'careHomeAuth_v1';
const ADMINS_KEY = 'careHomeAdmins_v1';

// Initial state
let logs = JSON.parse(localStorage.getItem(STORE_KEY)) || [];
let currentPassword = localStorage.getItem(PW_STORE_KEY) || 'admin123';

// Migrate to array-based admins
let admins = JSON.parse(localStorage.getItem(ADMINS_KEY));
if (!admins || (admins.length === 1 && admins[0].name === 'Master')) {
    admins = [{ name: 'Spinneyfield@nhft.nhs.uk', pin: '232323' }];
    localStorage.setItem(ADMINS_KEY, JSON.stringify(admins));
}
let loggedInAdmin = null;

// Save to storage
function saveLogs() {
    localStorage.setItem(STORE_KEY, JSON.stringify(logs));
}

function saveAdmins() {
    localStorage.setItem(ADMINS_KEY, JSON.stringify(admins));
    // Keep backward compat with single password tool if modified
    if (loggedInAdmin && loggedInAdmin.name === 'Master') {
        localStorage.setItem(PW_STORE_KEY, loggedInAdmin.pin);
    }
}

function showToast(message) {
    let toast = document.getElementById('toast');
    if(!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.innerText = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function getApp() {
    return document.getElementById('app');
}

function renderDashboard() {
    const app = getApp();
    app.innerHTML = `
        <div class="glass-panel">
            <h1>Welcome to Spinneyfield</h1>
            <p class="subtitle">Please select your sign-in option below</p>
            
            <div class="dashboard-grid">
                <a href="#" class="glass-btn" onclick="renderForm('Staff')">
                    <i class="fas fa-user-md"></i>
                    Staff Sign-in
                </a>
                <a href="#" class="glass-btn" onclick="renderForm('Visitor')">
                    <i class="fas fa-users"></i>
                    Patient Visitor
                </a>
                <a href="#" class="glass-btn" onclick="renderForm('Other Worker')">
                    <i class="fas fa-hard-hat"></i>
                    Other Worker
                </a>
                <a href="#" class="glass-btn danger" onclick="renderSignOut()">
                    <i class="fas fa-sign-out-alt"></i>
                    Sign Out
                </a>
                
                <a href="#" class="glass-btn admin" onclick="renderManagerLogin()">
                    <i class="fas fa-lock"></i>
                    Manager Access (Secured)
                </a>
            </div>
        </div>
    `;
}

function renderForm(type) {
    const app = getApp();
    
    // Extract unique previous users for autocomplete
    const recentUsers = logs.filter(log => log.type === type);
    const uniqueUsersMap = new Map();
    recentUsers.forEach(user => {
        if (!uniqueUsersMap.has(user.name.toLowerCase())) {
            uniqueUsersMap.set(user.name.toLowerCase(), user);
        }
    });
    
    const uniqueUsersList = Array.from(uniqueUsersMap.values());
    const datalistOptions = uniqueUsersList.map(u => `<option value="${u.name}">`).join('');
    
    let extraFields = '';
    if (type === 'Staff') {
        extraFields = `
            <div class="form-group">
                <label>Role</label>
                <input type="text" id="field-role" class="glass-input" placeholder="e.g. Nurse, Doctor, Therapist" required>
            </div>
        `;
    } else if (type === 'Visitor') {
        extraFields = `
            <div class="form-group">
                <label>Patient Name</label>
                <input type="text" id="field-patient" class="glass-input" placeholder="Who are you visiting?" required>
            </div>
        `;
    } else if (type === 'Other Worker') {
        extraFields = `
            <div class="form-group">
                <label>Company / Agency</label>
                <input type="text" id="field-company" class="glass-input" placeholder="e.g. ABC Plumbing" required>
            </div>
        `;
    }

    app.innerHTML = `
        <div class="glass-panel">
            <button class="back-btn" onclick="renderDashboard()"><i class="fas fa-arrow-left"></i></button>
            <h1>${type} Sign-In</h1>
            <p class="subtitle">Search your name to autofill, or enter manually.</p>
            
            <form id="signin-form" onsubmit="handleSignIn(event, '${type}')">
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" id="field-name" class="glass-input" placeholder="Start typing your name..." required list="names-list" oninput="handleNameInput('${type}')" autocomplete="off">
                    <datalist id="names-list">
                        ${datalistOptions}
                    </datalist>
                </div>
                
                ${extraFields}
                
                <div class="form-group">
                    <label>Car Parking Registration (Optional)</label>
                    <input type="text" id="field-car" class="glass-input" placeholder="e.g. AB12 CDE">
                </div>
                
                <button type="submit" class="submit-btn" style="margin-top: 1.5rem">Sign In Now</button>
            </form>
        </div>
    `;
}

function handleNameInput(type) {
    const nameInput = document.getElementById('field-name').value.trim();
    if (!nameInput) return;
    
    const match = logs.find(log => log.type === type && log.name.toLowerCase() === nameInput.toLowerCase());
    
    if (match) {
        // Autofill car optionally
        const carInput = document.getElementById('field-car');
        if (carInput && match.car && match.car !== 'N/A') {
            carInput.value = match.car;
        }
        
        // Autofill specific detail
        if (type === 'Staff') {
            const roleInput = document.getElementById('field-role');
            if (roleInput) roleInput.value = match.specificDetail;
        } else if (type === 'Visitor') {
            const patientInput = document.getElementById('field-patient');
            if (patientInput) patientInput.value = match.specificDetail;
        } else if (type === 'Other Worker') {
            const companyInput = document.getElementById('field-company');
            if (companyInput) companyInput.value = match.specificDetail;
        }
    }
}

function handleSignIn(e, type) {
    e.preventDefault();
    
    // Save to fully uppercase text format per user request
    const name = document.getElementById('field-name').value.toUpperCase().trim();
    const carVal = document.getElementById('field-car').value.trim();
    const car = carVal ? carVal.toUpperCase() : 'N/A';
    
    let specificDetail = '';
    if (type === 'Staff') specificDetail = document.getElementById('field-role').value.toUpperCase().trim();
    else if (type === 'Visitor') specificDetail = document.getElementById('field-patient').value.toUpperCase().trim();
    else if (type === 'Other Worker') specificDetail = document.getElementById('field-company').value.toUpperCase().trim();
    
    const now = new Date();
    const strOffset = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    const safeYYMMDD = strOffset.toISOString().split('T')[0];
    
    const newEntry = {
        id: Date.now().toString(),
        name,
        type,
        specificDetail,
        car,
        timeIn: now.toLocaleString(),
        timeOut: null,
        dateFilter: safeYYMMDD
    };
    
    logs.unshift(newEntry);
    saveLogs();
    
    showToast(`Successfully signed in!`);
    renderDashboard();
}

function renderSignOut() {
    const app = getApp();
    
    app.innerHTML = `
        <div class="glass-panel">
            <button class="back-btn" onclick="renderDashboard()"><i class="fas fa-arrow-left"></i></button>
            <h1>Sign Out</h1>
            <p class="subtitle">Search your name to securely sign out</p>
            
            <div class="form-group">
                <input type="text" id="search-name" class="glass-input" placeholder="Search by name..." autocomplete="off" onkeyup="updateSignOutTable(this.value)">
            </div>
            
            <div class="table-container">
                <table class="glass-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Time In</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="signout-tbody">
                        <tr><td colspan="4" style="text-align:center">Type a name above to search for active sign-ins.</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function updateSignOutTable(searchQuery = '') {
    const tbody = document.getElementById('signout-tbody');
    if (!tbody) return;

    if (searchQuery.trim().length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">Type a name above to search for your records.</td></tr>';
        return;
    }

    const matchedLogs = logs.filter(log => 
        log.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    let rows = matchedLogs.map(log => {
        let actionCell = '';
        if (log.timeOut === null) {
            actionCell = `<button class="action-btn" onclick="handleSignOut('${log.id}')">Sign Out</button>`;
        } else {
            actionCell = `<button class="action-btn" style="background: var(--success);" onclick="alert('No action required. You signed out at ' + '${log.timeOut}')">Signed Out</button>`;
        }
        
        return `
        <tr>
            <td>${log.name}</td>
            <td>${log.type}</td>
            <td>${log.timeIn}</td>
            <td>${actionCell}</td>
        </tr>
        `;
    }).join('');
    
    if(matchedLogs.length === 0) {
        // Simple XSS safeguard for innerHTML
        const safeQuery = searchQuery.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        rows = `<tr><td colspan="4" style="text-align:center">No records found matching "${safeQuery}".</td></tr>`;
    }
    
    tbody.innerHTML = rows;
}

function handleSignOut(id) {
    const logIndex = logs.findIndex(l => l.id === id);
    if(logIndex > -1) {
        logs[logIndex].timeOut = new Date().toLocaleString();
        saveLogs();
        showToast('Successfully signed out!');
        const searchInput = document.getElementById('search-name');
        updateSignOutTable(searchInput ? searchInput.value : '');
    }
}

function renderManagerLogin() {
    const app = getApp();
    app.innerHTML = `
        <div class="glass-panel" style="max-width: 450px;">
            <button class="back-btn" onclick="renderDashboard()"><i class="fas fa-arrow-left"></i></button>
            <h1 style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                <i class="fas fa-lock"></i> Manager Access
            </h1>
            <p class="subtitle">Please enter your authorized User ID and PIN.</p>
            
            <form id="login-form" onsubmit="handleManagerLogin(event)">
                <div class="form-group">
                    <label>User ID</label>
                    <input type="text" id="field-admin-name" class="glass-input" placeholder="Enter User ID" style="text-transform: none;" required>
                </div>
                <div class="form-group">
                    <label>Security PIN</label>
                    <input type="password" id="field-password" class="glass-input" placeholder="Enter PIN" required>
                </div>
                
                <button type="submit" class="submit-btn" style="margin-top: 0.5rem">Unlock Logs</button>
            </form>
        </div>
    `;
}

function handleManagerLogin(e) {
    e.preventDefault();
    const name = document.getElementById('field-admin-name').value.trim();
    const pw = document.getElementById('field-password').value.trim();
    
    // Case-insensitive match allows email input flexibility
    const adminMatch = admins.find(a => a.name.toLowerCase() === name.toLowerCase() && a.pin === pw);
    
    if (adminMatch) {
        loggedInAdmin = adminMatch;
        showToast(`Welcome, ${adminMatch.name}!`);
        renderAdmin();
    } else {
        showToast('Incorrect User ID or PIN!');
    }
}

function renderAdmin() {
    const app = getApp();
    
    let todayStr = '';
    try {
        const offset = new Date().getTimezoneOffset() * 60000;
        todayStr = new Date(Date.now() - offset).toISOString().split('T')[0];
    } catch(e) {
        console.error(e);
    }
    
    app.innerHTML = `
        <div class="glass-panel" id="admin-view" style="max-width: 900px;">
            <button class="back-btn" onclick="renderDashboard()"><i class="fas fa-arrow-left"></i></button>
            <h1 style="color: black" class="no-print">Daily Log / Manager View</h1>
            <h1 style="display: none; color: black; font-size: 24px;" id="print-header">Spinneyfield Sign-In Logs<br><span id="print-time" style="font-size: 16px; font-weight: normal; color: #555;"></span></h1>
            <p class="subtitle no-print">View all sign-ins and sign-outs</p>
            
            <div class="no-print" style="display: flex; gap: 10px; margin-bottom: 1rem; flex-wrap: wrap;">
                <button class="action-btn print" onclick="securePrint()" style="margin-bottom: 0;">
                    <i class="fas fa-print"></i> Print to PDF
                </button>
                <button class="action-btn" style="background:#4B5563;" onclick="clearLogs()">
                    <i class="fas fa-trash"></i> Clear All Logs
                </button>
                <button class="action-btn" style="background:#3B82F6;" onclick="secureRenderChangePassword()">
                    <i class="fas fa-key"></i> Change PIN
                </button>
                <button class="action-btn" style="background:#8B5CF6;" onclick="secureRenderAddAdmin()">
                    <i class="fas fa-user-plus"></i> Add Admin
                </button>
                <button class="action-btn" style="background:#DC2626;" onclick="secureRenderRemoveAdmin()">
                    <i class="fas fa-user-minus"></i> Remove Admin
                </button>
            </div>
            
            <div class="no-print" style="display: grid; grid-template-columns: 1fr 1fr 2fr; gap: 1rem; margin-bottom: 1rem;">
                <div class="form-group" style="margin-bottom: 0;">
                    <input type="date" id="admin-date-filter" class="glass-input" title="Select Date Filter" value="${todayStr}" onchange="updateAdminTable()">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <select id="admin-category-filter" class="glass-input" style="text-transform: none; cursor: pointer;" onchange="updateAdminTable()">
                        <option value="All" style="color: black;">All Categories</option>
                        <option value="Staff" style="color: black;">Staff</option>
                        <option value="Visitor" style="color: black;">Visitors</option>
                        <option value="Other Worker" style="color: black;">Other Workers</option>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <input type="text" id="admin-search" class="glass-input" placeholder="Search logs..." autocomplete="off" onkeyup="updateAdminTable()">
                </div>
            </div>
            
            <div class="table-container">
                <table class="glass-table" id="print-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Category</th>
                            <th>Detail</th>
                            <th>Car Reg</th>
                            <th>Time In</th>
                            <th>Time Out</th>
                            <th class="no-print">Action</th>
                        </tr>
                    </thead>
                    <tbody id="admin-tbody">
                        <tr><td colspan="7" style="text-align:center">Loading logs...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // Slight delay safely allows the browser to paint the DOM before processing intensive loops
    setTimeout(updateAdminTable, 20);
}

function updateAdminTable() {
    try {
        const tbody = document.getElementById('admin-tbody');
        if (!tbody) return;
        
        const searchEl = document.getElementById('admin-search');
        const dateEl = document.getElementById('admin-date-filter');
        const catEl = document.getElementById('admin-category-filter');
        
        const query = (searchEl ? searchEl.value : '').toLowerCase().trim();
        const dateFilter = dateEl ? dateEl.value : '';
        const categoryFilter = catEl ? catEl.value : 'All';
        
        const matchedLogs = logs.filter(log => {
            if (!log) return false;
            
            if (categoryFilter !== 'All' && log.type !== categoryFilter) return false;
            
            if (dateFilter) {
                let isDateMatch = false;
                
                // 1. Strict YYYY-MM-DD match for newly authenticated logs
                if (log.dateFilter && log.dateFilter === dateFilter) {
                    isDateMatch = true;
                } 
                // 2. Legacy parsing fallback for older logs
                else if (log.timeIn) {
                    const filterLocalStr = new Date(dateFilter + 'T12:00:00').toLocaleDateString();
                    const logDateVal = new Date(log.timeIn);
                    
                    if (!isNaN(logDateVal)) {
                        const logYYMMDD = new Date(logDateVal.getTime() - logDateVal.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                        if (logYYMMDD === dateFilter) isDateMatch = true;
                    }
                    
                    if (!isDateMatch && (log.timeIn.startsWith(filterLocalStr) || log.timeIn.includes(filterLocalStr))) {
                        isDateMatch = true;
                    }
                }
                
                // If it failed all strict matching fallbacks, filter it OUT
                if (!isDateMatch) return false;
            }
            
            if (!query) return true;
            
            const nMatch = log.name && typeof log.name === 'string' && log.name.toLowerCase().includes(query);
            const tMatch = log.type && typeof log.type === 'string' && log.type.toLowerCase().includes(query);
            const dMatch = log.specificDetail && typeof log.specificDetail === 'string' && log.specificDetail.toLowerCase().includes(query);
            const cMatch = log.car && typeof log.car === 'string' && log.car.toLowerCase().includes(query);
            
            return nMatch || tMatch || dMatch || cMatch;
        });

        const staff = matchedLogs.filter(l => l.type === 'Staff');
        const visitors = matchedLogs.filter(l => l.type === 'Visitor');
        const others = matchedLogs.filter(l => l.type === 'Other Worker');
        
        let rows = '';
        
        function renderGroup(groupLogs, title) {
            if (groupLogs.length === 0) return '';
            let groupHtml = `<tr><td colspan="7" style="text-align: center; font-weight: bold; font-size: 1.1rem; letter-spacing: 2px; padding: 0.75rem; background: rgba(255, 255, 255, 0.15);">${title}</td></tr>`;
            groupHtml += groupLogs.map(log => `
                <tr>
                    <td>${log.name || ''}</td>
                    <td>${log.type || ''}</td>
                    <td>${log.specificDetail || ''}</td>
                    <td>${log.car || ''}</td>
                    <td>
                        <input type="text" class="glass-input inline-edit" value="${log.timeIn || ''}" onchange="inlineEditDate('${log.id}', 'in', this.value)">
                    </td>
                    <td>
                        <input type="text" class="glass-input inline-edit" value="${log.timeOut || ''}" placeholder="Active" onchange="inlineEditDate('${log.id}', 'out', this.value)" style="${!log.timeOut ? 'border-color: var(--success);' : ''}">
                    </td>
                    <td class="no-print" style="white-space: nowrap;">
                         <button class="action-btn" onclick="secureRenderEditLog('${log.id}')" style="background:#F59E0B; padding:0.25rem 0.5rem;font-size:0.8rem; display:inline-block; margin:0 0.25rem 0 0;">Edit</button>
                         <button class="action-btn" onclick="deleteLog('${log.id}')" style="padding:0.25rem 0.5rem;font-size:0.8rem; display:inline-block; margin:0;">Delete</button>
                    </td>
                </tr>
            `).join('');
            return groupHtml;
        }
        
        rows += renderGroup(staff, '— STAFF LOGS —');
        rows += renderGroup(visitors, '— VISITOR LOGS —');
        rows += renderGroup(others, '— OTHER WORKERS —');
        
        if (rows === '') {
            if (logs.length === 0) {
                rows = `<tr><td colspan="7" style="text-align:center">No logs found.</td></tr>`;
            } else {
                const displaySearch = query || dateFilter || 'these filters';
                const safeQuery = displaySearch.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                rows = `<tr><td colspan="7" style="text-align:center">No results found for "${safeQuery}".</td></tr>`;
            }
        }

        tbody.innerHTML = rows;
    } catch(e) {
        console.error("Error drawing table:", e);
        const tbody = document.getElementById('admin-tbody');
        if(tbody) tbody.innerHTML = `<tr><td colspan="7" style="color:#EF4444;text-align:center">Error rendering logs. Format invalid.</td></tr>`;
    }
}


function deleteLog(id) {
    const pw = prompt(`SECURITY CHECK: Please enter the PIN for ${loggedInAdmin.name} to delete this log:`);
    if (pw === loggedInAdmin.pin) {
        logs = logs.filter(l => l.id !== id);
        saveLogs();
        showToast("Log successfully deleted.");
        updateAdminTable();
    } else if (pw !== null) {
        alert("Incorrect PIN. Deletion cancelled.");
    }
}

function clearLogs() {
    const pw = prompt(`SECURITY CHECK: Please enter the PIN for ${loggedInAdmin.name} to delete ALL records:`);
    if (pw === loggedInAdmin.pin) {
        if(confirm("WARNING: Are you absolutely sure you want to permanently delete all records?")) {
            logs = [];
            saveLogs();
            showToast("All logs cleared.");
            updateAdminTable();
        }
    } else if (pw !== null) {
        alert("Incorrect PIN. Deletion cancelled.");
    }
}

function renderChangePassword() {
    const app = getApp();
    app.innerHTML = `
        <div class="glass-panel" style="max-width: 450px;">
            <button class="back-btn" onclick="renderAdmin()"><i class="fas fa-arrow-left"></i></button>
            <h1 style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                <i class="fas fa-key"></i> Change PIN
            </h1>
            <p class="subtitle">Set a new security PIN for ${loggedInAdmin.name}.</p>
            
            <form id="change-pw-form" onsubmit="handleChangePassword(event)">
                <div class="form-group">
                    <label>New PIN</label>
                    <input type="password" id="field-new-pw" class="glass-input" placeholder="Enter new PIN" required>
                </div>
                
                <button type="submit" class="submit-btn" style="margin-top: 0.5rem">Save PIN</button>
            </form>
        </div>
    `;
}

function handleChangePassword(e) {
    e.preventDefault();
    const newPw = document.getElementById('field-new-pw').value.trim();
    loggedInAdmin.pin = newPw;
    saveAdmins();
    showToast(`PIN for ${loggedInAdmin.name} updated successfully!`);
    renderAdmin();
}

function renderAddAdmin() {
    const app = getApp();
    app.innerHTML = `
        <div class="glass-panel" style="max-width: 450px;">
            <button class="back-btn" onclick="renderAdmin()"><i class="fas fa-arrow-left"></i></button>
            <h1 style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                <i class="fas fa-user-shield"></i> Add Admin
            </h1>
            <p class="subtitle">Create a new admin user with a User ID and secure PIN.</p>
            
            <form id="add-admin-form" onsubmit="handleAddAdmin(event)">
                <div class="form-group">
                    <label>New User ID</label>
                    <input type="text" id="new-admin-name" class="glass-input" placeholder="e.g. Email address or ID" style="text-transform: none;" required>
                </div>
                <div class="form-group">
                    <label>Security PIN</label>
                    <input type="password" id="new-admin-pin" class="glass-input" placeholder="Enter secure PIN" required>
                </div>
                
                <button type="submit" class="submit-btn" style="margin-top: 0.5rem">Authorize New Admin</button>
            </form>
        </div>
    `;
}

function handleAddAdmin(e) {
    e.preventDefault();
    const name = document.getElementById('new-admin-name').value.trim();
    const pin = document.getElementById('new-admin-pin').value.trim();
    
    const exists = admins.find(a => a.name.toLowerCase() === name.toLowerCase());
    if (exists) {
        showToast('An Admin with this name already exists!');
        return;
    }
    
    admins.push({ name, pin });
    saveAdmins();
    
    showToast(`${name} successfully added as Admin!`);
    renderAdmin();
}

function renderRemoveAdmin() {
    const app = getApp();
    
    let adminRows = admins.map((a, i) => `
        <tr>
            <td>${a.name}</td>
            <td style="text-align: right;">
                <button class="action-btn" style="background:#EF4444; padding:0.25rem 0.5rem; font-size:0.8rem; margin:0;" onclick="deleteAdmin(${i})">Remove</button>
            </td>
        </tr>
    `).join('');
    
    app.innerHTML = `
        <div class="glass-panel" style="max-width: 600px;">
            <button class="back-btn" onclick="renderAdmin()"><i class="fas fa-arrow-left"></i></button>
            <h1 style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                <i class="fas fa-users-cog"></i> Manage Admins
            </h1>
            <p class="subtitle">Remove authorized admin accounts.</p>
            
            <table class="glass-table" style="margin-top: 1.5rem;">
                <thead>
                    <tr><th>User ID</th><th style="text-align: right;">Action</th></tr>
                </thead>
                <tbody id="manage-admin-tbody">
                    ${adminRows}
                </tbody>
            </table>
        </div>
    `;
}

function deleteAdmin(index) {
    const admin = admins[index];
    if (admin.name.toLowerCase() === loggedInAdmin.name.toLowerCase()) {
        alert("You cannot remove your own active account!");
        return;
    }
    const pin = prompt(`SECURITY CHECK: Please enter PIN for ${loggedInAdmin.name} to confirm removal:`);
    if (pin === loggedInAdmin.pin) {
        admins.splice(index, 1);
        saveAdmins();
        showToast(`${admin.name} removed successfully.`);
        renderRemoveAdmin();
    } else if (pin !== null) {
        alert("Incorrect PIN. Deletion cancelled.");
    }
}

function renderEditLog(id) {
    const log = logs.find(l => l.id === id);
    if (!log) return;
    
    const app = getApp();
    app.innerHTML = `
        <div class="glass-panel" style="max-width: 600px;">
            <button class="back-btn" onclick="renderAdmin()"><i class="fas fa-arrow-left"></i></button>
            <h1 style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                <i class="fas fa-edit"></i> Edit Log Record
            </h1>
            <p class="subtitle">Modify the details for this entry.</p>
            
            <form id="edit-log-form" onsubmit="handleEditLog(event, '${id}')">
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" id="edit-name" class="glass-input" value="${log.name || ''}" required>
                </div>
                <div class="form-group" style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <label>Category / Role</label>
                        <input type="text" id="edit-type" class="glass-input" value="${log.type || ''}" required>
                    </div>
                    <div>
                        <label>Specific Detail</label>
                        <input type="text" id="edit-detail" class="glass-input" value="${log.specificDetail || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label>Car Registration</label>
                    <input type="text" id="edit-car" class="glass-input" value="${log.car !== 'N/A' ? log.car : ''}">
                </div>
                <div class="form-group" style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <label>Time In</label>
                        <input type="text" id="edit-time-in" class="glass-input" value="${log.timeIn || ''}" style="text-transform: none;" required>
                    </div>
                    <div>
                        <label>Time Out (Optional)</label>
                        <input type="text" id="edit-time-out" class="glass-input" value="${log.timeOut || ''}" style="text-transform: none;">
                    </div>
                </div>
                <div class="form-group">
                    <label>Internal Date Filter (YYYY-MM-DD)</label>
                    <input type="date" id="edit-date-filter" class="glass-input" value="${log.dateFilter || ''}" required>
                </div>
                
                <button type="submit" class="submit-btn" style="margin-top: 1rem">Save Changes</button>
            </form>
        </div>
    `;
}

function securePrint() {
    const pin = prompt("SECURITY CHECK: Please enter your PIN to authorize printing:");
    if (pin === loggedInAdmin.pin) window.print();
    else if (pin !== null) alert("Incorrect PIN. Printing denied.");
}

function secureRenderChangePassword() {
    const pin = prompt("SECURITY CHECK: Please enter your PIN to change account settings:");
    if (pin === loggedInAdmin.pin) renderChangePassword();
    else if (pin !== null) alert("Incorrect PIN. Access denied.");
}

function secureRenderAddAdmin() {
    const pin = prompt("SECURITY CHECK: Please enter your PIN to authorize new admins:");
    if (pin === loggedInAdmin.pin) renderAddAdmin();
    else if (pin !== null) alert("Incorrect PIN. Access denied.");
}

function secureRenderRemoveAdmin() {
    const pin = prompt("SECURITY CHECK: Please enter your PIN to manage existing admins:");
    if (pin === loggedInAdmin.pin) renderRemoveAdmin();
    else if (pin !== null) alert("Incorrect PIN. Access denied.");
}

function secureRenderEditLog(id) {
    const pin = prompt("SECURITY CHECK: Please enter your PIN to edit this specific log:");
    if (pin === loggedInAdmin.pin) renderEditLog(id);
    else if (pin !== null) alert("Incorrect PIN. Access denied.");
}

function inlineEditDate(id, type, val) {
    const logIndex = logs.findIndex(l => l.id === id);
    if(logIndex === -1) return;
    
    if (type === 'in') {
        logs[logIndex].timeIn = val;
    } else {
        logs[logIndex].timeOut = val || null;
    }
    saveLogs();
    showToast("Time updated.");
}

function handleEditLog(e, id) {
    e.preventDefault();
    const logIndex = logs.findIndex(l => l.id === id);
    if (logIndex === -1) return;
    
    // Auth was previously completed via secureRenderEditLog
    logs[logIndex].name = document.getElementById('edit-name').value.toUpperCase().trim();
    logs[logIndex].type = document.getElementById('edit-type').value.trim();
    logs[logIndex].specificDetail = document.getElementById('edit-detail').value.toUpperCase().trim();
    
    const carVal = document.getElementById('edit-car').value.trim();
    logs[logIndex].car = carVal ? carVal.toUpperCase() : 'N/A';
    
    logs[logIndex].timeIn = document.getElementById('edit-time-in').value.trim();
    
    const tOut = document.getElementById('edit-time-out').value.trim();
    logs[logIndex].timeOut = tOut || null;
    
    logs[logIndex].dateFilter = document.getElementById('edit-date-filter').value;
    
    saveLogs();
    showToast("Log successfully updated.");
    renderAdmin();
}

// Initialize app
document.addEventListener('DOMContentLoaded', renderDashboard);

// Fix for print view to show the hidden header
window.onbeforeprint = function() {
    const el = document.getElementById('print-header');
    if(el) {
        el.style.display = 'block';
        const catFilter = document.getElementById('admin-category-filter');
        let titleText = 'Spinneyfield Sign-In Logs';
        if (catFilter && catFilter.value !== 'All') {
             titleText = `Spinneyfield ${catFilter.value} Logs`;
             if (catFilter.value === 'Visitor') titleText = 'Spinneyfield Patient Visitor Logs';
        }
        el.innerHTML = `${titleText}<br><span id="print-time" style="font-size: 16px; font-weight: normal; color: #555;">Printed on: ${new Date().toLocaleString()}</span>`;
    }
};
window.onafterprint = function() {
    const el = document.getElementById('print-header');
    if(el) el.style.display = 'none';
};
