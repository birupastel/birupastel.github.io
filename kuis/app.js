// Konfigurasi Google Sheets
const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE'; // Ganti dengan ID Google Sheet Anda
const API_KEY = 'YOUR_GOOGLE_SHEETS_API_KEY_HERE'; // Buat API Key di Google Cloud Console

let currentUser = null;
let currentRole = null;

// Inisialisasi aplikasi
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('loading').style.display = 'none';
    
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
});

// Login handler
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const adminData = await loadSheetData('admin');
        const admin = adminData.find(row => row.Username === username && row.Password === password);
        
        if (admin) {
            currentUser = admin;
            currentRole = 'admin';
            showMainApp();
            loadUserInfo();
            showPage('dashboard');
            return;
        }
        
        // Cek member
        const memberData = await loadSheetData('members');
        const member = memberData.find(row => row.Username === username && row.Password === password && row.Status === 'active');
        
        if (member) {
            currentUser = member;
            currentRole = 'member';
            showMainApp();
            loadUserInfo();
            showPage('dashboard');
            return;
        }
        
        showError('Username atau password salah!');
    } catch (error) {
        showError('Error: ' + error.message);
    }
}

function showMainApp() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    
    if (currentRole === 'admin') {
        document.getElementById('adminSidebar').classList.remove('hidden');
        document.getElementById('appTitle').textContent = 'Admin Panel - Kuis Harian';
    } else {
        document.getElementById('memberSidebar').classList.remove('hidden');
    }
}

function loadUserInfo() {
    const fullname = currentUser.Fullname || currentUser.Username;
    const role = currentRole === 'admin' ? 'Admin' : `Member (Lv.${getLevel(currentUser.Total_Points || 0)})`;
    const points = currentUser.Total_Points || 0;
    
    document.getElementById('userInfo').innerHTML = `
        ${fullname} | ${role} ${points ? `<span class="text-yellow-600 font-bold">${points} pts</span>` : ''}
    `;
}

function getLevel(points) {
    if (points >= 500) return 'Grandmaster';
    if (points >= 200) return 'Solver';
    return 'Beginner';
}

function showPage(page) {
    const container = document.getElementById('pagesContainer');
    container.innerHTML = '';
    
    switch(page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'questions':
            if (currentRole === 'admin') loadQuestionsPage();
            break;
        case 'members':
            if (currentRole === 'admin') loadMembersPage();
            break;
        case 'stats':
            if (currentRole === 'admin') loadStatsPage();
            break;
        case 'logs':
            if (currentRole === 'admin') loadLogsPage();
            break;
        case 'leaderboard':
            loadLeaderboard();
            break;
        case 'history':
            loadHistory();
            break;
        case 'profile':
            loadProfile();
            break;
    }
}

// Load data dari Google Sheets
async function loadSheetData(sheetName) {
    return new Promise((resolve, reject) => {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${sheetName}!A:Z?key=${API_KEY}`;
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.values) {
                    const headers = data.values[0];
                    const rows = data.values.slice(1).map(row => {
                        let obj = {};
                        headers.forEach((header, i) => {
                            obj[header] = row[i] || '';
                        });
                        return obj;
                    });
                    resolve(rows);
                } else {
                    resolve([]);
                }
            })
            .catch(reject);
    });
}

// Update Google Sheets (APPEND ONLY - untuk edit/hapus gunakan Google Sheets manual)
async function appendToSheet(sheetName, values) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${sheetName}:append?valueInputOption=RAW&key=${API_KEY}`;
    
    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            values: [values]
        })
    });
}

// Dashboard Harian (Member & Admin)
async function loadDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const questions = await loadSheetData('questions');
    const todayQuestion = questions.find(q => q.Release_Date === today);
    
    let content = `
        <div class="bg-white/80 glass rounded-2xl shadow-lg p-8">
            <div class="text-center mb-8">
                <i class="fas fa-calendar-day text-5xl text-blue-600 mb-4"></i>
                <h1 class="text-3xl font-bold text-gray-900 mb-2">Kuis Harian</h1>
                <p class="text-gray-600 text-lg">${today}</p>
            </div>
    `;
    
    if (!todayQuestion) {
        content += `
            <div class="text-center py-12">
                <i class="fas fa-clock text-6xl text-gray-300 mb-4"></i>
                <h2 class="text-2xl font-bold text-gray-500 mb-2">Soal belum tersedia</h2>
                <p class="text-gray-500">Silakan coba lagi besok</p>
            </div>
        `;
    } else {
        // Cek apakah sudah submit hari ini
        const submissions = await loadSheetData('submissions');
        const userSubmission = submissions.find(s => 
            s.Username === currentUser.Username && s.Date === today
        );
        
        if (userSubmission) {
            const totalPoints = (userSubmission.Q1_Correct === 'TRUE' ? 10 : 0) + 
                               (userSubmission.Q2_Correct === 'TRUE' ? 10 : 0) + 
                               (userSubmission.Short_Correct === 'TRUE' ? 5 : 0);
            
            content += `
                <div class="text-center py-12">
                    <i class="fas fa-check-circle text-6xl ${totalPoints > 15 ? 'text-green-500' : 'text-yellow-500'} mb-4"></i>
                    <h2 class="text-2xl font-bold text-gray-900 mb-2">Sudah dikerjakan!</h2>
                    <p class="text-xl font-bold text-gray-700 mb-4">${totalPoints} poin</p>
                    <div class="bg-gray-100 rounded-xl p-4">
                        <p class="text-sm text-gray-600">Tanggal: ${today}</p>
                    </div>
                </div>
            `;
        } else {
            content += generateQuizForm(todayQuestion);
        }
    }
    
    content += '</div>';
    document.getElementById('pagesContainer').innerHTML = content;
    
    // Handle form submit jika ada
    const form = document.getElementById('quizForm');
    if (form) {
        form.addEventListener('submit', handleQuizSubmit);
    }
}

function generateQuizForm(question) {
    return `
        <form id="quizForm">
            <div class="space-y-6">
                <!-- Stimulus -->
                <div class="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-r-xl">
                    <h3 class="font-bold text-lg mb-3 text-gray-900">Stimulus:</h3>
                    <div class="prose max-w-none text-gray-800">${question.Stimulus}</div>
                </div>

                <!-- Soal 1: Pilihan Ganda -->
                ${question.Category === 'Algoritma Pemrograman' ? 
                    `<div class="bg-gray-50 p-4 rounded-xl">
                        <pre class="bg-black text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto mb-4">${question.Code || '// Kode tidak tersedia'}</pre>
                    </div>` : ''
                }
                
                <div class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <h4 class="font-bold text-xl mb-4 text-gray-900">Soal 1 (10 poin)</h4>
                    <p class="mb-6 text-gray-800">${question.Question1}</p>
                    <div class="space-y-2">
                        ${['OptA1', 'OptB1', 'OptC1', 'OptD1', 'OptE1'].map((opt, i) => 
                            `<label class="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer transition duration-200">
                                <input type="radio" name="q1" value="${opt}" class="mr-3 text-blue-600" required>
                                <span class="text-gray-800">${String.fromCharCode(65+i)}. ${question[opt]}</span>
                            </label>`
                        ).join('')}
                    </div>
                </div>

                <!-- Soal 2: Pilihan Ganda -->
                <div class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <h4 class="font-bold text-xl mb-4 text-gray-900">Soal 2 (10 poin)</h4>
                    <p class="mb-6 text-gray-800">${question.Question2}</p>
                    <div class="space-y-2">
                        ${['OptA2', 'OptB2', 'OptC2', 'OptD2', 'OptE2'].map((opt, i) => 
                            `<label class="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer transition duration-200">
                                <input type="radio" name="q2" value="${opt}" class="mr-3 text-blue-600" required>
                                <span class="text-gray-800">${String.fromCharCode(65+i)}. ${question[opt]}</span>
                            </label>`
                        ).join('')}
                    </div>
                </div>

                <!-- Soal Isian Singkat -->
                <div class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <h4 class="font-bold text-xl mb-4 text-gray-900">Soal Isian (5 poin)</h4>
                    <p class="mb-6 text-gray-800">${question.Short_Question}</p>
                    <input type="text" name="short" placeholder="Jawaban singkat..." 
                           class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg" required>
                </div>

                <button type="submit" class="w-full bg-green-600 hover:bg-green-700 text-white py-4 px-6 rounded-xl font-bold text-xl shadow-lg transition duration-200">
                    <i class="fas fa-paper-plane mr-2"></i>Kirim Jawaban
                </button>
            </div>
        </form>
    `;
}

async function handleQuizSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const today = new Date().toISOString().split('T')[0];
    
    const questions = await loadSheetData('questions');
    const todayQuestion = questions.find(q => q.Release_Date === today);
    
    // Validasi jawaban
    const q1Answer = formData.get('q1');
    const q2Answer = formData.get('q2');
    const shortAnswer = formData.get('short').trim().toLowerCase();
    
    const q1Correct = q1Answer === `Ans1` ? 'TRUE' : 'FALSE';
    const q2Correct = q2Answer === `Ans2` ? 'TRUE' : 'FALSE';
    const shortCorrect = shortAnswer === (todayQuestion.Short_Answer || '').toLowerCase() ? 'TRUE' : 'FALSE';
    
    const points = (q1Correct === 'TRUE' ? 10 : 0) + (q2Correct === 'TRUE' ? 10 : 0) + (shortCorrect === 'TRUE' ? 5 : 0);
    
    // Update total points member
    const members = await loadSheetData('members');
    const memberIndex = members.findIndex(m => m.Username === currentUser.Username);
    if (memberIndex !== -1) {
        const currentPoints = parseInt(members[memberIndex].Total_Points || 0);
        const newPoints = currentPoints + points;
        currentUser.Total_Points = newPoints;
        // Update di sheet (manual untuk sekarang)
    }
    
    // Simpan submission
    const submissionData = [
        currentUser.Username, today, todayQuestion.Category,
        q1Answer, q1Correct, q2Answer, q2Correct, shortAnswer, shortCorrect, points
    ];
    
    await appendToSheet('submissions', submissionData);
    
    // Refresh dashboard
    showPage('dashboard');
    showSuccess('Jawaban berhasil disubmit! Anda mendapat ' + points + ' poin');
}

function showError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

function showSuccess(message) {
    // Toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-xl shadow-lg z-50 animate-pulse';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function handleLogout() {
    currentUser = null;
    currentRole = null;
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('loginError').classList.add('hidden');
}

// Leaderboard
async function loadLeaderboard() {
    const members = await loadSheetData('members');
    const sortedMembers = members
        .filter(m => m.Status === 'active')
        .sort((a, b) => parseInt(b.Total_Points || 0) - parseInt(a.Total_Points || 0))
        .slice(0, 50);
    
    let content = `
        <div class="bg-white/80 glass rounded-2xl shadow-lg p-8">
            <div class="flex items-center mb-8">
                <i class="fas fa-trophy text-4xl text-yellow-500 mr-4"></i>
                <div>
                    <h1 class="text-3xl font-bold text-gray-900">Leaderboard</h1>
                    <p class="text-gray-600">Peringkat berdasarkan total poin</p>
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full bg-white rounded-xl shadow-sm">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">#</th>
                            <th class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Nama</th>
                            <th class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Poin</th>
                            <th class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Level</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
    `;
    
    sortedMembers.forEach((member, index) => {
        const rankClass = index < 3 ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-bold' : 
                         index < 10 ? 'bg-blue-50 border-l-4 border-blue-400' : '';
        const level = getLevel(parseInt(member.Total_Points || 0));
        
        content += `
            <tr class="${rankClass}">
                <td class="px-6 py-4 whitespace-nowrap font-bold text-xl">${index + 1}</td>
                <td class="px-6 py-4 font-semibold">${member.Fullname || member.Username}</td>
                <td class="px-6 py-4">
                    <span class="font-bold text-2xl text-yellow-600">${member.Total_Points || 0}</span>
                </td>
                <td class="px-6 py-4">
                    <span class="px-3 py-1 rounded-full text-xs font-bold ${
                        level === 'Grandmaster' ? 'bg-purple-100 text-purple-800' :
                        level === 'Solver' ? 'bg-blue-100 text-blue-800' : 
                        'bg-green-100 text-green-800'
                    }">${level}</span>
                </td>
            </tr>
        `;
    });
    
    content += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    document.getElementById('pagesContainer').innerHTML = content;
}

// History
async function loadHistory() {
    const submissions = await loadSheetData('submissions');
    const userSubmissions = submissions
        .filter(s => s.Username === currentUser.Username)
        .sort((a, b) => new Date(b.Date) - new Date(a.Date))
        .slice(0, 30);
    
    let content = `
        <div class="bg-white/80 glass rounded-2xl shadow-lg p-8">
            <div class="flex items-center mb-8">
                <i class="fas fa-history text-4xl text-gray-500 mr-4"></i>
                <div>
                    <h1 class="text-3xl font-bold text-gray-900">Histori Jawaban</h1>
                    <p class="text-gray-600">Riwayat kuis yang telah dikerjakan</p>
                </div>
            </div>
    `;
    
    if (userSubmissions.length === 0) {
        content += `
            <div class="text-center py-12">
                <i class="fas fa-inbox text-6xl text-gray-300 mb-4"></i>
                <p class="text-gray-500 text-lg">Belum ada riwayat jawaban</p>
            </div>
        `;
    } else {
        content += `<div class="space-y-4">`;
        userSubmissions.forEach(sub => {
            const totalPoints = parseInt(sub.Points || 0);
            content += `
                <div class="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition duration-200">
                    <div class="flex justify-between items-start mb-3">
                        <span class="font-bold text-lg">${sub.Date}</span>
                        <span class="font-bold text-2xl text-${totalPoints > 15 ? 'green' : totalPoints > 10 ? 'yellow' : 'red'}-600">${totalPoints} pts</span>
                    </div>
                    <div class="grid grid-cols-3 gap-4 text-sm">
                        <div>Soal 1: <span class="font-semibold ${sub.Q1_Correct === 'TRUE' ? 'text-green-600' : 'text-red-600'}">${sub.Q1_Correct === 'TRUE' ? '✅' : '❌'}</span></div>
                        <div>Soal 2: <span class="font-semibold ${sub.Q2_Correct === 'TRUE' ? 'text-green-600' : 'text-red-600'}">${sub.Q2_Correct === 'TRUE' ? '✅' : '❌'}</span></div>
                        <div>Isian: <span class="font-semibold ${sub.Short_Correct === 'TRUE' ? 'text-green-600' : 'text-red-600'}">${sub.Short_Correct === 'TRUE' ? '✅' : '❌'}</span></div>
                    </div>
                </div>
            `;
        });
        content += `</div>`;
    }
    
    content += `</div>`;
    document.getElementById('pagesContainer').innerHTML = content;
}

// Admin Pages (simplified - implementasi lengkap bisa ditambahkan)
async function loadQuestionsPage() {
    document.getElementById('pagesContainer').innerHTML = `
        <div class="bg-white/80 glass rounded-2xl shadow-lg p-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-8">Bank Soal (Coming Soon)</h1>
            <p>Gunakan Google Sheets untuk mengelola soal secara manual untuk saat ini.</p>
            <div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p class="font-semibold text-blue-800">Tips:</p>
                <ul class="list-disc list-inside text-blue-700 mt-2 space-y-1">
                    <li>Tambahkan soal baru di sheet "questions"</li>
                    <li>Set Release_Date dengan format YYYY-MM-DD</li>
                    <li>Ans1, Ans2, Short_Answer harus sesuai dengan nama kolom pilihan</li>
                </ul>
            </div>
        </div>
    `;
}

async function loadMembersPage() {
    document.getElementById('pagesContainer').innerHTML = `
        <div class="bg-white/80 glass rounded-2xl shadow-lg p-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-8">Manajemen Member (Coming Soon)</h1>
            <p>Kelola member melalui Google Sheets "members"</p>
        </div>
    `;
}

async function loadStatsPage() {
    document.getElementById('pagesContainer').innerHTML = `
        <div class="bg-white/80 glass rounded-2xl shadow-lg p-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-8">Dashboard Statistik (Coming Soon)</h1>
        </div>
    `;
}

async function loadLogsPage() {
    document.getElementById('pagesContainer').innerHTML = `
        <div class="bg-white/80 glass rounded-2xl shadow-lg p-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-8">Log Submisi (Coming Soon)</h1>
        </div>
    `;
}

function loadProfile() {
    document.getElementById('pagesContainer').innerHTML = `
        <div class="bg-white/80 glass rounded-2xl shadow-lg p-8 max-w-2xl mx-auto">
            <div class="text-center mb-8">
                <i class="fas fa-user-circle text-8xl text-gray-300 mb-4"></i>
                <h1 class="text-3xl font-bold text-gray-900 mb-2">Profil</h1>
            </div>
            <div class="space-y-6">
                <div>
                    <label class="block text-gray-700 font-bold mb-2">Username</label>
                    <input type="text" value="${currentUser.Username}" disabled class="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl">
                </div>
                <div>
                    <label class="block text-gray-700 font-bold mb-2">Nama Lengkap</label>
                    <input type="text" value="${currentUser.Fullname || ''}" id="fullname" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-gray-700 font-bold mb-2">Password Baru</label>
                    <input type="password" id="newPassword" placeholder="Kosongkan jika tidak ingin ganti" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <button onclick="updateProfile()" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-bold text-lg">
                    <i class="fas fa-save mr-2"></i>Simpan Perubahan
                </button>
            </div>
        </div>
    `;
}

async function updateProfile() {
    // Implementasi update profile (manual via sheets untuk sekarang)
    showSuccess('Fitur update profile akan tersedia via Google Sheets');
}
