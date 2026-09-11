// LG心动小屋 - 主逻辑

// ===== Gist 云端同步配置 =====
// GitHub Gist 作为云端数据库，实现两人数据同步
const GIST_CONFIG = {
    // Gist ID（创建后填入）
    gistId: '84d3ebbe582873205054e76185f9ee6c',
    // GitHub Token（简单加密，运行时解码）
    _tokenEnc: 'MFRsdzAwZnZUendUY3JyRXpCTFp2OU91WkZIWHBqU1UycnI5X3BoZw==',
    // 数据文件名
    fileName: 'lg-xindong-data.json',
    // 自动刷新间隔（毫秒）
    refreshInterval: 8000
};

// ===== 高德地图配置 =====
// 高德地图 Web 服务 Key，用于反向地理编码（经纬度转地址）
const AMAP_CONFIG = {
    key: '5e39a9184e49154b331b8fe03d631a30'
};

// 解码 token
function _getGistToken() {
    try {
        return atob(GIST_CONFIG._tokenEnc).split('').reverse().join('');
    } catch (e) {
        return '';
    }
}

// Gist 模式开关
let GIST_MODE = false;
let gistData = null;
let _savingGist = false; // 防止重复保存

// 从 Gist 读取数据
async function fetchGistData() {
    try {
        const res = await fetch(`https://api.github.com/gists/${GIST_CONFIG.gistId}`, {
            headers: {
                'Authorization': `token ${_getGistToken()}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!res.ok) throw new Error('Failed to fetch gist');
        
        const data = await res.json();
        const fileContent = data.files[GIST_CONFIG.fileName].content;
        gistData = JSON.parse(fileContent);
        
        // 更新配置
        if (gistData.users) {
            CONFIG.users.girl1.name = gistData.users.girl1.name;
            CONFIG.users.girl1.avatar = gistData.users.girl1.avatar;
            CONFIG.users.girl2.name = gistData.users.girl2.name;
            CONFIG.users.girl2.avatar = gistData.users.girl2.avatar;
            CONFIG.users.girl1.password = gistData.password;
            CONFIG.users.girl2.password = gistData.password;
        }
        if (gistData.meetDate) {
            CONFIG.meetDate = gistData.meetDate;
        }
        
        // 更新数据
        messages = gistData.messages || [];
        anniversaries = gistData.anniversaries || [];
        wishes = gistData.wishes || [];
        moods = gistData.moods || {};
        photos = gistData.photos || [];
        locations = gistData.locations || {};
        
        return true;
    } catch (e) {
        console.error('Gist 读取失败:', e);
        return false;
    }
}

// 保存数据到 Gist
async function saveGistData() {
    try {
        const dataToSave = {
            users: {
                girl1: { name: CONFIG.users.girl1.name, avatar: CONFIG.users.girl1.avatar },
                girl2: { name: CONFIG.users.girl2.name, avatar: CONFIG.users.girl2.avatar }
            },
            password: CONFIG.users.girl1.password,
            meetDate: CONFIG.meetDate,
            messages: messages,
            anniversaries: anniversaries,
            wishes: wishes,
            moods: moods,
            photos: photos,
            locations: locations
        };
        
        const res = await fetch(`https://api.github.com/gists/${GIST_CONFIG.gistId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${_getGistToken()}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: {
                    [GIST_CONFIG.fileName]: {
                        content: JSON.stringify(dataToSave, null, 2)
                    }
                }
            })
        });
        
        if (!res.ok) throw new Error('Failed to update gist');
        return true;
    } catch (e) {
        console.error('Gist 保存失败:', e);
        return false;
    }
}

// ===== API 配置 =====
// 如果后端部署在其他地方，改成对应的地址
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api';

// 服务器模式开关：true = 从服务器同步数据，false = 本地存储模式
let SERVER_MODE = true;

// 自动检测使用哪种模式
async function checkServerMode() {
    // 先尝试本地服务器
    try {
        const res = await fetch(`${API_BASE}/health`);
        if (res.ok) {
            SERVER_MODE = true;
            GIST_MODE = false;
            console.log('💕 已连接到本地后端服务器，数据实时同步~');
            return;
        }
    } catch (e) {
        // 本地服务器不可用，尝试 Gist 模式
    }
    
    // 尝试 Gist 模式
    const gistOk = await fetchGistData();
    if (gistOk) {
        GIST_MODE = true;
        SERVER_MODE = false;
        console.log('☁️  已连接到 Gist 云端数据库，数据实时同步~');
        return;
    }
    
    // 都不行，用本地存储
    SERVER_MODE = false;
    GIST_MODE = false;
    console.log('💡 未检测到服务器，使用本地存储模式');
}

// ===== 配置 =====
let CONFIG = {
    users: {
        girl1: { name: '洛木伍呷', avatar: '🌸', password: '108910' },
        girl2: { name: '朱艳玲', avatar: '🌷', password: '108910' }
    },
    meetDate: '2021-07-31',
    defaultAnniversaries: [
        { id: 1, name: '认识的第一天', date: '2021-07-31', note: '我们故事的开始 💕' }
    ]
};

// 心情配置
const MOOD_CONFIG = {
    happy: { emoji: '😄', name: '开心', color: '#ffd93d' },
    love: { emoji: '🥰', name: '幸福', color: '#ff6b9d' },
    calm: { emoji: '😌', name: '平静', color: '#6bcb77' },
    tired: { emoji: '😴', name: '累了', color: '#9b89b3' },
    sad: { emoji: '😢', name: '难过', color: '#4d96ff' },
    angry: { emoji: '😤', name: '生气', color: '#ff4757' }
};

// 愿望分类配置
const WISH_CATEGORIES = {
    travel: { emoji: '✈️', name: '想去的地方' },
    food: { emoji: '🍜', name: '想吃的东西' },
    thing: { emoji: '🎁', name: '想要的东西' },
    do: { emoji: '✨', name: '想做的事' },
    other: { emoji: '💭', name: '其他愿望' }
};

// 照片分类配置
const PHOTO_CATEGORIES = {
    daily: { emoji: '🌸', name: '日常碎片' },
    travel: { emoji: '✈️', name: '一起旅行' },
    food: { emoji: '🍜', name: '美食打卡' },
    selfie: { emoji: '🤳', name: '合照自拍' },
    funny: { emoji: '😂', name: '搞笑黑图' },
    other: { emoji: '💖', name: '其他神图' }
};

// ===== 状态 =====
let currentUser = null;
let messages = [];
let anniversaries = [];
let wishes = [];
let moods = {}; // { 'YYYY-MM-DD': { mood, note, userId } }
let photos = [];
let locations = {}; // { girl1: { lat, lng, address, time }, girl2: {...} }
let selectedMood = null;
let currentCalendarMonth = new Date();
let currentWishFilter = 'all';
let currentPhotoFilter = 'all';
let currentModalPhotoId = null;
let pendingPhotoFiles = [];

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', async () => {
    await checkServerMode();
    initData();
    checkLogin();
    bindEvents();
    
    // 服务器模式下，定期刷新数据
    if (SERVER_MODE || GIST_MODE) {
        setInterval(refreshAllData, GIST_MODE ? GIST_CONFIG.refreshInterval : 10000);
    }
    
    // 后台静默补全位置地址（如果有的话）
    setTimeout(() => {
        if (currentUser) ensureLocationAddresses();
    }, 3000);
});

// 加载配置（如果有自定义配置）
function loadConfig() {
    const savedConfig = localStorage.getItem('bff_config');
    if (savedConfig) {
        const customConfig = JSON.parse(savedConfig);
        CONFIG.users = customConfig.users || CONFIG.users;
        CONFIG.meetDate = customConfig.meetDate || CONFIG.meetDate;
        CONFIG.defaultAnniversaries = customConfig.defaultAnniversaries || CONFIG.defaultAnniversaries;
    }
}

// 初始化数据
function initData() {
    if (SERVER_MODE) {
        // 服务器模式：从服务器加载配置
        fetchConfig();
        return;
    }
    
    // 本地模式
    loadConfig();
    const savedMessages = localStorage.getItem('bff_messages');
    const savedAnniversaries = localStorage.getItem('bff_anniversaries');
    const savedWishes = localStorage.getItem('bff_wishes');
    const savedMoods = localStorage.getItem('bff_moods');
    const savedPhotos = localStorage.getItem('bff_photos');
    
    if (savedMessages) messages = JSON.parse(savedMessages);
    if (savedAnniversaries) {
        anniversaries = JSON.parse(savedAnniversaries);
    } else {
        anniversaries = [...CONFIG.defaultAnniversaries];
        saveAnniversaries();
    }
    if (savedWishes) wishes = JSON.parse(savedWishes);
    if (savedMoods) moods = JSON.parse(savedMoods);
    if (savedPhotos) photos = JSON.parse(savedPhotos);
    const savedLocationsData = localStorage.getItem('bff_locations');
    if (savedLocationsData) locations = JSON.parse(savedLocationsData);
}

// 从服务器获取配置
async function fetchConfig() {
    try {
        const res = await fetch(`${API_BASE}/config`);
        const data = await res.json();
        CONFIG.users = data.users;
        CONFIG.meetDate = data.meetDate;
        updateLoginSelect();
    } catch (e) {
        console.error('获取配置失败:', e);
    }
}

// 从服务器获取所有数据
async function fetchAllData() {
    if (!SERVER_MODE) return;
    
    try {
        const res = await fetch(`${API_BASE}/data`);
        const data = await res.json();
        
        messages = data.messages || [];
        anniversaries = data.anniversaries || [];
        wishes = data.wishes || [];
        moods = data.moods || {};
        photos = data.photos || [];
        locations = data.locations || {};
        
        if (data.users) {
            CONFIG.users = data.users;
        }
        if (data.meetDate) {
            CONFIG.meetDate = data.meetDate;
        }
        
        return true;
    } catch (e) {
        console.error('获取数据失败:', e);
        return false;
    }
}

// 刷新所有数据（已登录时）
async function refreshAllData() {
    if ((!SERVER_MODE && !GIST_MODE) || !currentUser) return;
    
    const hadData = messages.length > 0;
    const prevCount = messages.length;
    
    if (GIST_MODE) {
        await fetchGistData();
    } else {
        await fetchAllData();
    }
    
    // 重新渲染
    if (document.getElementById('home-tab').classList.contains('active')) {
        renderNextAnniversary();
        renderLatestMessage();
        renderTodayMoodHome();
    }
    
    if (document.getElementById('messages-tab').classList.contains('active')) {
        renderMessages();
        updateMessageCount();
    }
    
    if (document.getElementById('anniversary-tab').classList.contains('active')) {
        renderAnniversaries();
        updateAnniversaryCount();
    }
    
    if (document.getElementById('wishes-tab').classList.contains('active')) {
        renderWishes();
        updateWishCount();
    }
    
    if (document.getElementById('mood-tab').classList.contains('active')) {
        renderMoodCalendar();
        updateMoodCount();
    }
    
    if (document.getElementById('photos-tab').classList.contains('active')) {
        renderPhotos();
        updatePhotoCount();
    }
    
    if (document.getElementById('location-tab').classList.contains('active')) {
        renderLocationCards();
        updateDistance();
    }
    
    // 有新消息提示
    if (hadData && messages.length > prevCount) {
        const latestMsg = messages[messages.length - 1];
        if (latestMsg.userId !== currentUser) {
            showToast('💌 有新的留言哦~');
        }
    }
}

// 检查是否已登录
function checkLogin() {
    const savedUser = localStorage.getItem('bff_currentUser');
    if (savedUser && CONFIG.users[savedUser]) {
        login(savedUser);
    }
}

// ===== 事件绑定 =====
function bindEvents() {
    // 登录表单
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // 注册表单
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    
    // 页面切换
    document.getElementById('go-register').addEventListener('click', showRegisterPage);
    document.getElementById('go-login').addEventListener('click', showLoginPage);
    
    // 退出登录
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // 标签切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });
    
    // 发送留言
    document.getElementById('send-message-btn').addEventListener('click', sendMessage);
    
    // 留言输入字数统计
    document.getElementById('message-input').addEventListener('input', updateCharCount);
    
    // 添加纪念日
    document.getElementById('add-anni-btn').addEventListener('click', addAnniversary);
    
    // 添加愿望
    document.getElementById('add-wish-btn').addEventListener('click', addWish);
    
    // 愿望筛选
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentWishFilter = btn.dataset.filter;
            renderWishes();
        });
    });
    
    // 心情选择
    document.querySelectorAll('.mood-emoji').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mood-emoji').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedMood = btn.dataset.mood;
        });
    });
    
    // 心情打卡
    document.getElementById('mood-checkin-btn').addEventListener('click', checkinMood);
    
    // 日历翻页
    document.getElementById('prev-month').addEventListener('click', () => {
        currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() - 1);
        renderMoodCalendar();
    });
    
    document.getElementById('next-month').addEventListener('click', () => {
        currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() + 1);
        renderMoodCalendar();
    });
    
    // 相册相关
    const uploadArea = document.getElementById('upload-area');
    const photoInput = document.getElementById('photo-input');
    
    uploadArea.addEventListener('click', () => photoInput.click());
    
    photoInput.addEventListener('change', (e) => {
        handlePhotoFiles(e.target.files);
    });
    
    // 拖拽上传
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handlePhotoFiles(e.dataTransfer.files);
    });
    
    // 上传按钮
    document.getElementById('upload-photo-btn').addEventListener('click', uploadPhotos);
    
    // 照片筛选
    document.querySelectorAll('[data-photo-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-photo-filter]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPhotoFilter = btn.dataset.photoFilter;
            renderPhotos();
        });
    });
    
    // 删除弹窗中的照片
    document.getElementById('modal-delete').addEventListener('click', deleteCurrentPhoto);
    
    // 位置更新
    document.getElementById('refresh-location-btn').addEventListener('click', updateMyLocation);
}

// ===== 页面切换 =====
function showRegisterPage() {
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('register-page').classList.add('active');
}

function showLoginPage() {
    document.getElementById('register-page').classList.remove('active');
    document.getElementById('login-page').classList.add('active');
    updateLoginSelect();
}

// 更新登录下拉选项
function updateLoginSelect() {
    const select = document.getElementById('username-select');
    select.innerHTML = `
        <option value="">请选择你是谁~</option>
        <option value="girl1">${CONFIG.users.girl1.name} ${CONFIG.users.girl1.avatar}</option>
        <option value="girl2">${CONFIG.users.girl2.name} ${CONFIG.users.girl2.avatar}</option>
    `;
}

// ===== 注册 =====
function handleRegister(e) {
    e.preventDefault();
    
    const name1 = document.getElementById('reg-name1').value.trim();
    const name2 = document.getElementById('reg-name2').value.trim();
    const password = document.getElementById('reg-password').value;
    const meetDate = document.getElementById('reg-meet-date').value;
    const errorEl = document.getElementById('register-error');
    
    if (!name1 || !name2) {
        errorEl.textContent = '昵称都要填哦~';
        return;
    }
    
    if (password.length < 4) {
        errorEl.textContent = '密码至少4位呀~';
        return;
    }
    
    if (!meetDate) {
        errorEl.textContent = '选一下认识的日子吧~';
        return;
    }
    
    if (SERVER_MODE) {
        // 服务器模式
        fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name1, name2, password, meetDate })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                fetchConfig();
                showToast('小屋创建成功！快去登录吧~ 🏠💕');
                showLoginPage();
                document.getElementById('register-form').reset();
            } else {
                errorEl.textContent = data.message || '注册失败~';
            }
        })
        .catch(() => {
            errorEl.textContent = '连接服务器失败~';
        });
    } else {
        // 本地模式
        const newConfig = {
            users: {
                girl1: { name: name1, avatar: '🌸', password: password },
                girl2: { name: name2, avatar: '🌷', password: password }
            },
            meetDate: meetDate,
            defaultAnniversaries: [
                { id: 1, name: '认识的第一天', date: meetDate, note: '我们故事的开始 💕' }
            ]
        };
        
        localStorage.setItem('bff_config', JSON.stringify(newConfig));
        CONFIG = newConfig;
        
        messages = [];
        anniversaries = [...CONFIG.defaultAnniversaries];
        wishes = [];
        moods = {};
        photos = [];
        locations = {};
        saveMessages();
        saveAnniversaries();
        saveWishes();
        saveMoods();
        savePhotos();
        saveLocations();
        
        showToast('小屋创建成功！快去登录吧~ 🏠💕');
        showLoginPage();
        document.getElementById('register-form').reset();
    }
}

// ===== 登录相关 =====
function handleLogin(e) {
    e.preventDefault();
    
    const userId = document.getElementById('username-select').value;
    const password = document.getElementById('password-input').value;
    const errorEl = document.getElementById('login-error');
    
    if (!userId) {
        errorEl.textContent = '先选一下你是谁呀~';
        return;
    }
    
    if (SERVER_MODE) {
        // 服务器模式
        fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, password })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                login(userId);
                errorEl.textContent = '';
            } else {
                errorEl.textContent = data.message || '登录失败~';
                shakeElement(document.querySelector('.login-container'));
            }
        })
        .catch(() => {
            errorEl.textContent = '连接服务器失败~';
        });
    } else if (GIST_MODE) {
        // Gist 模式
        const user = CONFIG.users[userId];
        if (user && user.password === password) {
            login(userId);
            errorEl.textContent = '';
        } else {
            errorEl.textContent = '秘密暗号不对哦~ 再想想？';
            shakeElement(document.querySelector('.login-container'));
        }
    } else {
        // 本地模式
        const user = CONFIG.users[userId];
        if (user && user.password === password) {
            login(userId);
            errorEl.textContent = '';
        } else {
            errorEl.textContent = '秘密暗号不对哦~ 再想想？';
            shakeElement(document.querySelector('.login-container'));
        }
    }
}

async function login(userId) {
    currentUser = userId;
    localStorage.setItem('bff_currentUser', userId);
    
    const user = CONFIG.users[userId];
    document.getElementById('current-user').textContent = user.name;
    document.getElementById('welcome-text').textContent = `欢迎回来，${user.name}~`;
    document.getElementById('welcome-avatar').textContent = user.avatar;
    
    // 切换页面
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('register-page').classList.remove('active');
    document.getElementById('main-page').classList.add('active');
    
    if (SERVER_MODE) {
        // 服务器模式：从服务器加载所有数据
        await fetchAllData();
    } else if (GIST_MODE) {
        // Gist 模式：数据已经在 checkServerMode 时加载了
        await fetchGistData();
    }
    
    // 加载数据
    loadHomeData();
    loadMessages();
    loadAnniversaries();
    loadWishes();
    loadMoods();
    loadPhotos();
    loadLocations();
    startTogetherTimer();
    
    showToast(`欢迎回家，${user.name} 💕`);
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('bff_currentUser');
    
    document.getElementById('main-page').classList.remove('active');
    document.getElementById('login-page').classList.add('active');
    
    document.getElementById('username-select').value = '';
    document.getElementById('password-input').value = '';
    document.getElementById('login-error').textContent = '';
    
    showToast('下次见哦~ 👋');
}

function shakeElement(el) {
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = 'shake 0.5s ease-in-out';
}

const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20%, 60% { transform: translateX(-10px); }
        40%, 80% { transform: translateX(10px); }
    }
`;
document.head.appendChild(style);

// ===== 标签切换 =====
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // 切换到心情页时渲染日历
    if (tabName === 'mood') {
        currentCalendarMonth = new Date();
        renderMoodCalendar();
    }
    
    // 切换到相册页时设置默认日期
    if (tabName === 'photos') {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('photo-date').value = today;
    }
    
    // 切换到位置页时，自动补全缺失的地址信息
    if (tabName === 'location') {
        ensureLocationAddresses();
    }
    
    // 切换到小甜蜜页时，初始化
    if (tabName === 'sweet') {
        initSweetPage();
    }
    
    // 切换到听歌页时，初始化
    if (tabName === 'music') {
        initMusicPage();
    }
}

// ===== 首页数据 =====
function loadHomeData() {
    renderNextAnniversary();
    renderLatestMessage();
    renderTodayMoodHome();
}

function renderNextAnniversary() {
    const container = document.getElementById('next-anniversary');
    
    if (anniversaries.length === 0) {
        container.innerHTML = '<div class="no-message-tip">还没有添加纪念日呢~</div>';
        return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let nextAnni = null;
    let minDays = Infinity;
    
    anniversaries.forEach(anni => {
        const date = new Date(anni.date);
        date.setFullYear(today.getFullYear());
        
        if (date < today) {
            date.setFullYear(today.getFullYear() + 1);
        }
        
        const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
        
        if (diffDays < minDays) {
            minDays = diffDays;
            nextAnni = { ...anni, upcomingDate: date, daysLeft: diffDays };
        }
    });
    
    if (nextAnni.daysLeft === 0) {
        container.innerHTML = `
            <div class="anni-next-name">🎉 ${escapeHtml(nextAnni.name)}</div>
            <div class="anni-next-countdown">就是今天！🎊</div>
            <div class="anni-next-date">${formatDate(nextAnni.upcomingDate)}</div>
        `;
    } else {
        container.innerHTML = `
            <div class="anni-next-name">🎀 ${escapeHtml(nextAnni.name)}</div>
            <div class="anni-next-countdown">${nextAnni.daysLeft} <small>天后</small></div>
            <div class="anni-next-date">${formatDate(nextAnni.upcomingDate)}</div>
        `;
    }
}

function renderLatestMessage() {
    const container = document.getElementById('latest-message');
    
    if (messages.length === 0) {
        container.innerHTML = '<div class="no-message-tip">还没有留言哦，快去写第一条吧~ 💌</div>';
        return;
    }
    
    const latest = messages[messages.length - 1];
    const user = CONFIG.users[latest.userId];
    
    container.innerHTML = `
        <div class="latest-msg-item">
            <div class="latest-msg-user">${escapeHtml(user.name)} ${user.avatar}</div>
            <div class="latest-msg-content">${escapeHtml(latest.content)}</div>
            <div class="latest-msg-time">${formatTime(latest.time)}</div>
        </div>
    `;
}

function renderTodayMoodHome() {
    const container = document.getElementById('today-mood-home');
    const todayKey = formatDateKey(new Date());
    const todayMood = moods[todayKey];
    
    if (todayMood) {
        const moodInfo = MOOD_CONFIG[todayMood.mood];
        const user = CONFIG.users[todayMood.userId];
        container.innerHTML = `
            <div class="today-mood-emoji">${moodInfo.emoji}</div>
            <div class="today-mood-text">${escapeHtml(user.name)} 今天${moodInfo.name}</div>
        `;
    } else {
        container.innerHTML = '<div class="no-mood-tip">今天还没打卡呢~ 🌈</div>';
    }
}

// ===== 在一起多久了 =====
function startTogetherTimer() {
    updateTogetherTime();
    setInterval(updateTogetherTime, 1000);
}

function updateTogetherTime() {
    const meetDate = new Date(CONFIG.meetDate);
    const now = new Date();
    const diff = now - meetDate;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    document.getElementById('together-days').textContent = days;
    document.getElementById('together-hours').textContent = hours;
    document.getElementById('together-minutes').textContent = minutes;
}

// ===== 留言板 =====
function loadMessages() {
    renderMessages();
    updateMessageCount();
}

function renderMessages() {
    const container = document.getElementById('messages-list');
    
    if (messages.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💌</div>
                <div class="empty-text">还没有留言呢<br>写下第一句悄悄话吧~</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = messages.map(msg => {
        const user = CONFIG.users[msg.userId];
        const isMine = msg.userId === currentUser;
        
        return `
            <div class="message-item ${isMine ? 'mine' : ''}">
                <div class="message-avatar">${user.avatar}</div>
                <div class="message-bubble">
                    <div class="message-user">
                        ${escapeHtml(user.name)}
                        ${isMine ? `<span class="message-delete" onclick="deleteMessage(${msg.id})">删除</span>` : ''}
                    </div>
                    <div class="message-content">${escapeHtml(msg.content)}</div>
                    <div class="message-time">${formatTime(msg.time)}</div>
                </div>
            </div>
        `;
    }).join('');
    
    container.scrollTop = container.scrollHeight;
}

function updateCharCount() {
    const input = document.getElementById('message-input');
    const countEl = document.getElementById('char-count');
    const count = input.value.length;
    countEl.textContent = `${count}/500`;
    countEl.style.color = count > 500 ? '#ff4757' : '';
}

function sendMessage() {
    const input = document.getElementById('message-input');
    const content = input.value.trim();
    
    if (!content) {
        showToast('写点什么再发送呀~');
        return;
    }
    
    if (content.length > 500) {
        showToast('留言太长啦，精简一下吧~');
        return;
    }
    
    if (SERVER_MODE) {
        // 服务器模式
        fetch(`${API_BASE}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser, content })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                fetchAllData().then(() => {
                    renderMessages();
                    updateMessageCount();
                    renderLatestMessage();
                });
                input.value = '';
                updateCharCount();
                showToast('留言已送达~ 💌');
            }
        })
        .catch(() => {
            showToast('发送失败，检查网络~');
        });
    } else if (GIST_MODE) {
        // Gist 模式
        const newMsg = {
            id: Date.now(),
            userId: currentUser,
            content: content,
            time: new Date().toISOString()
        };
        messages.push(newMsg);
        saveGistData().then(ok => {
            if (ok) {
                input.value = '';
                updateCharCount();
                renderMessages();
                updateMessageCount();
                renderLatestMessage();
                showToast('留言已送达~ 💌');
            } else {
                messages.pop();
                showToast('发送失败了~');
            }
        });
    } else {
        // 本地模式
        const newMsg = {
            id: Date.now(),
            userId: currentUser,
            content: content,
            time: new Date().toISOString()
        };
        
        messages.push(newMsg);
        saveMessages();
        
        input.value = '';
        updateCharCount();
        
        renderMessages();
        updateMessageCount();
        renderLatestMessage();
        
        showToast('留言已送达~ 💌');
    }
}

function deleteMessage(id) {
    if (!confirm('确定要删除这条留言吗？')) return;
    
    if (SERVER_MODE) {
        fetch(`${API_BASE}/messages/${id}`, { method: 'DELETE' })
        .then(() => {
            fetchAllData().then(() => {
                renderMessages();
                updateMessageCount();
                renderLatestMessage();
            });
            showToast('已删除');
        });
    } else if (GIST_MODE) {
        const oldMessages = [...messages];
        messages = messages.filter(m => m.id !== id);
        saveGistData().then(ok => {
            if (ok) {
                renderMessages();
                updateMessageCount();
                renderLatestMessage();
                showToast('已删除');
            } else {
                messages = oldMessages;
                showToast('删除失败了~');
            }
        });
    } else {
        messages = messages.filter(m => m.id !== id);
        saveMessages();
        renderMessages();
        updateMessageCount();
        renderLatestMessage();
        showToast('已删除');
    }
}

function updateMessageCount() {
    document.getElementById('message-count').textContent = `${messages.length} 条留言`;
}

function saveMessages() {
    localStorage.setItem('bff_messages', JSON.stringify(messages));
    if (GIST_MODE && !_savingGist) {
        _savingGist = true;
        saveGistData().finally(() => { _savingGist = false; });
    }
}

// ===== 纪念日 =====
function loadAnniversaries() {
    renderAnniversaries();
    updateAnniversaryCount();
}

function renderAnniversaries() {
    const container = document.getElementById('anniversary-list');
    
    if (anniversaries.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎀</div>
                <div class="empty-text">还没有添加纪念日<br>记录下你们的重要日子吧~</div>
            </div>
        `;
        return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sorted = anniversaries.map(anni => {
        const date = new Date(anni.date);
        const thisYear = new Date(today.getFullYear(), date.getMonth(), date.getDate());
        let diffDays;
        
        if (thisYear >= today) {
            diffDays = Math.ceil((thisYear - today) / (1000 * 60 * 60 * 24));
        } else {
            const nextYear = new Date(today.getFullYear() + 1, date.getMonth(), date.getDate());
            diffDays = Math.ceil((nextYear - today) / (1000 * 60 * 60 * 24));
        }
        
        const totalDays = Math.floor((today - date) / (1000 * 60 * 60 * 24));
        const years = Math.floor(totalDays / 365);
        
        return { ...anni, diffDays, years, totalDays };
    }).sort((a, b) => a.diffDays - b.diffDays);
    
    container.innerHTML = sorted.map(anni => `
        <div class="anniversary-item">
            <div class="anni-info">
                <div class="anni-name">${escapeHtml(anni.name)}</div>
                ${anni.note ? `<div class="anni-note">💭 ${escapeHtml(anni.note)}</div>` : ''}
                <div class="anni-date">📅 ${formatDate(new Date(anni.date))} · 已经 ${anni.years} 年了</div>
            </div>
            <div class="anni-days">
                <div class="anni-days-number">${anni.diffDays === 0 ? '🎉' : anni.diffDays}</div>
                <div class="anni-days-label">${anni.diffDays === 0 ? '今天！' : '天后'}</div>
            </div>
            <button class="anni-delete" onclick="deleteAnniversary(${anni.id})" title="删除">🗑️</button>
        </div>
    `).join('');
}

function addAnniversary() {
    const nameInput = document.getElementById('anni-name');
    const dateInput = document.getElementById('anni-date');
    const noteInput = document.getElementById('anni-note');
    
    const name = nameInput.value.trim();
    const date = dateInput.value;
    const note = noteInput.value.trim();
    
    if (!name) {
        showToast('给纪念日起个名字吧~');
        return;
    }
    
    if (!date) {
        showToast('选一个日期呀~');
        return;
    }
    
    if (SERVER_MODE) {
        fetch(`${API_BASE}/anniversaries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, date, note })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                fetchAllData().then(() => {
                    renderAnniversaries();
                    updateAnniversaryCount();
                    renderNextAnniversary();
                });
                nameInput.value = '';
                dateInput.value = '';
                noteInput.value = '';
                showToast('纪念日添加成功~ 🎀');
            }
        });
    } else {
        const newAnni = {
            id: Date.now(),
            name: name,
            date: date,
            note: note
        };
        
        anniversaries.push(newAnni);
        saveAnniversaries();
        
        nameInput.value = '';
        dateInput.value = '';
        noteInput.value = '';
        
        renderAnniversaries();
        updateAnniversaryCount();
        renderNextAnniversary();
        
        showToast('纪念日添加成功~ 🎀');
    }
}

function deleteAnniversary(id) {
    if (!confirm('确定要删除这个纪念日吗？')) return;
    
    if (SERVER_MODE) {
        fetch(`${API_BASE}/anniversaries/${id}`, { method: 'DELETE' })
        .then(() => {
            fetchAllData().then(() => {
                renderAnniversaries();
                updateAnniversaryCount();
                renderNextAnniversary();
            });
            showToast('已删除');
        });
    } else {
        anniversaries = anniversaries.filter(a => a.id !== id);
        saveAnniversaries();
        renderAnniversaries();
        updateAnniversaryCount();
        renderNextAnniversary();
        showToast('已删除');
    }
}

function updateAnniversaryCount() {
    document.getElementById('anni-count').textContent = `${anniversaries.length} 个`;
}

function saveAnniversaries() {
    localStorage.setItem('bff_anniversaries', JSON.stringify(anniversaries));
    if (GIST_MODE && !_savingGist) {
        _savingGist = true;
        saveGistData().finally(() => { _savingGist = false; });
    }
}

// ===== 心愿清单 =====
function loadWishes() {
    renderWishes();
    updateWishCount();
}

function renderWishes() {
    const container = document.getElementById('wishes-list');
    
    let filtered = wishes;
    if (currentWishFilter === 'done') {
        filtered = wishes.filter(w => w.done);
    } else if (currentWishFilter !== 'all') {
        filtered = wishes.filter(w => w.category === currentWishFilter && !w.done);
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⭐</div>
                <div class="empty-text">还没有愿望呢<br>许下你们的第一个愿望吧~</div>
            </div>
        `;
        return;
    }
    
    // 未完成的排前面
    filtered.sort((a, b) => {
        if (a.done === b.done) return b.id - a.id;
        return a.done ? 1 : -1;
    });
    
    container.innerHTML = filtered.map(wish => {
        const category = WISH_CATEGORIES[wish.category] || WISH_CATEGORIES.other;
        let ownerText = '';
        if (wish.owner === 'mine') {
            ownerText = CONFIG.users[wish.userId]?.name || '';
        } else if (wish.owner === 'her') {
            const otherId = wish.userId === 'girl1' ? 'girl2' : 'girl1';
            ownerText = CONFIG.users[otherId]?.name || '';
        } else {
            ownerText = '两个人的';
        }
        
        return `
            <div class="wish-item ${wish.done ? 'done' : ''}">
                <div class="wish-checkbox ${wish.done ? 'checked' : ''}" onclick="toggleWish(${wish.id})"></div>
                <div class="wish-info">
                    <div class="wish-content">${escapeHtml(wish.content)}</div>
                    <div class="wish-meta">
                        <span class="wish-tag">${category.emoji} ${category.name}</span>
                        <span>💝 ${escapeHtml(ownerText)}</span>
                    </div>
                </div>
                <button class="wish-delete" onclick="deleteWish(${wish.id})" title="删除">🗑️</button>
            </div>
        `;
    }).join('');
}

function addWish() {
    const input = document.getElementById('wish-input');
    const category = document.getElementById('wish-category').value;
    const owner = document.getElementById('wish-owner').value;
    const content = input.value.trim();
    
    if (!content) {
        showToast('写一个愿望吧~');
        return;
    }
    
    if (SERVER_MODE) {
        fetch(`${API_BASE}/wishes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, category, owner, userId: currentUser })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                fetchAllData().then(() => {
                    renderWishes();
                    updateWishCount();
                });
                input.value = '';
                showToast('愿望已添加~ ⭐');
            }
        });
    } else {
        const newWish = {
            id: Date.now(),
            content: content,
            category: category,
            owner: owner,
            userId: currentUser,
            done: false,
            createdAt: new Date().toISOString()
        };
        
        wishes.push(newWish);
        saveWishes();
        
        input.value = '';
        
        renderWishes();
        updateWishCount();
        
        showToast('愿望已添加~ ⭐');
    }
}

function toggleWish(id) {
    if (SERVER_MODE) {
        fetch(`${API_BASE}/wishes/${id}/toggle`, { method: 'PUT' })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.wish.done) {
                showToast('太棒了！愿望实现啦~ 🎉');
            }
            fetchAllData().then(() => {
                renderWishes();
                updateWishCount();
            });
        });
    } else {
        const wish = wishes.find(w => w.id === id);
        if (wish) {
            wish.done = !wish.done;
            saveWishes();
            renderWishes();
            updateWishCount();
            
            if (wish.done) {
                showToast('太棒了！愿望实现啦~ 🎉');
            }
        }
    }
}

function deleteWish(id) {
    if (!confirm('确定要删除这个愿望吗？')) return;
    
    if (SERVER_MODE) {
        fetch(`${API_BASE}/wishes/${id}`, { method: 'DELETE' })
        .then(() => {
            fetchAllData().then(() => {
                renderWishes();
                updateWishCount();
            });
            showToast('已删除');
        });
    } else {
        wishes = wishes.filter(w => w.id !== id);
        saveWishes();
        renderWishes();
        updateWishCount();
        showToast('已删除');
    }
}

function updateWishCount() {
    const total = wishes.length;
    const done = wishes.filter(w => w.done).length;
    document.getElementById('wish-count').textContent = `${done}/${total} 已实现`;
}

function saveWishes() {
    localStorage.setItem('bff_wishes', JSON.stringify(wishes));
    if (GIST_MODE && !_savingGist) {
        _savingGist = true;
        saveGistData().finally(() => { _savingGist = false; });
    }
}

// ===== 心情打卡 =====
function loadMoods() {
    updateMoodCount();
}

function checkinMood() {
    if (!selectedMood) {
        showToast('选一个心情吧~');
        return;
    }
    
    const note = document.getElementById('mood-note-input').value.trim();
    const todayKey = formatDateKey(new Date());
    
    if (SERVER_MODE) {
        fetch(`${API_BASE}/moods`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: todayKey, mood: selectedMood, note, userId: currentUser })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                fetchAllData().then(() => {
                    renderMoodCalendar();
                    updateMoodCount();
                    renderTodayMoodHome();
                });
                
                selectedMood = null;
                document.querySelectorAll('.mood-emoji').forEach(b => b.classList.remove('selected'));
                document.getElementById('mood-note-input').value = '';
                
                showToast('打卡成功~ 🌈✨');
            }
        });
    } else {
        moods[todayKey] = {
            mood: selectedMood,
            note: note,
            userId: currentUser,
            time: new Date().toISOString()
        };
        
        saveMoods();
        
        selectedMood = null;
        document.querySelectorAll('.mood-emoji').forEach(b => b.classList.remove('selected'));
        document.getElementById('mood-note-input').value = '';
        
        renderMoodCalendar();
        updateMoodCount();
        renderTodayMoodHome();
        
        showToast('打卡成功~ 🌈✨');
    }
}

function renderMoodCalendar() {
    const container = document.getElementById('mood-calendar');
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();
    
    document.getElementById('current-month').textContent = `${year}年${month + 1}月`;
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    let html = weekdays.map(d => `<div class="calendar-weekday">${d}</div>`).join('');
    
    // 空白格子
    for (let i = 0; i < startWeekday; i++) {
        html += '<div class="calendar-day empty"></div>';
    }
    
    const today = new Date();
    const todayKey = formatDateKey(today);
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateKey = formatDateKey(date);
        const mood = moods[dateKey];
        const isToday = dateKey === todayKey;
        
        let classes = 'calendar-day';
        if (isToday) classes += ' today';
        if (mood) classes += ` has-mood mood-${mood.mood}`;
        
        const displayText = mood ? MOOD_CONFIG[mood.mood].emoji : day;
        
        html += `
            <div class="${classes}" onclick="showMoodDetail('${dateKey}')" title="${dateKey}">
                ${mood ? displayText : day}
            </div>
        `;
    }
    
    container.innerHTML = html;
}

function showMoodDetail(dateKey) {
    const mood = moods[dateKey];
    const detailEl = document.getElementById('mood-detail');
    
    // 移除之前的选中
    document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
    // 添加当前选中
    const dayEl = document.querySelector(`.calendar-day[title="${dateKey}"]`);
    if (dayEl) dayEl.classList.add('selected');
    
    if (!mood) {
        detailEl.innerHTML = `<p class="mood-detail-tip">${dateKey} 这一天没有打卡记录~</p>`;
        return;
    }
    
    const moodInfo = MOOD_CONFIG[mood.mood];
    const user = CONFIG.users[mood.userId];
    
    detailEl.innerHTML = `
        <div class="mood-detail-content">
            <div class="mood-detail-emoji">${moodInfo.emoji}</div>
            <div class="mood-detail-info">
                <div class="mood-detail-date">${dateKey}</div>
                <div class="mood-detail-mood">${moodInfo.name}</div>
                ${mood.note ? `<div class="mood-detail-note">${escapeHtml(mood.note)}</div>` : ''}
                <div class="mood-detail-user">—— ${escapeHtml(user.name)} ${user.avatar}</div>
            </div>
        </div>
    `;
}

function updateMoodCount() {
    const count = Object.keys(moods).length;
    document.getElementById('mood-count').textContent = `${count} 天打卡`;
}

function saveMoods() {
    localStorage.setItem('bff_moods', JSON.stringify(moods));
    if (GIST_MODE && !_savingGist) {
        _savingGist = true;
        saveGistData().finally(() => { _savingGist = false; });
    }
}

// ===== 相册 - 神图诞生 =====
function loadPhotos() {
    renderPhotos();
    updatePhotoCount();
}

function handlePhotoFiles(files) {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
        showToast('请选择图片文件哦~');
        return;
    }
    
    pendingPhotoFiles = imageFiles;
    
    const uploadArea = document.getElementById('upload-area');
    uploadArea.innerHTML = `
        <div class="upload-icon">✅</div>
        <p class="upload-text">已选择 ${imageFiles.length} 张图片</p>
        <p class="upload-hint">填好信息后点「上传神图」按钮~</p>
    `;
}

function uploadPhotos() {
    if (pendingPhotoFiles.length === 0) {
        showToast('先选几张神图吧~ 📸');
        return;
    }
    
    const title = document.getElementById('photo-title').value.trim();
    const category = document.getElementById('photo-category').value;
    const date = document.getElementById('photo-date').value || new Date().toISOString().split('T')[0];
    
    let uploaded = 0;
    const total = pendingPhotoFiles.length;
    
    pendingPhotoFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            // 压缩图片
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxSize = 1200;
                let width = img.width;
                let height = img.height;
                
                if (width > height && width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                } else if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                
                const photoTitle = total > 1 
                    ? (title || '神图') + ` (${index + 1})`
                    : (title || '神图');
                
                if (SERVER_MODE) {
                    // 服务器模式
                    fetch(`${API_BASE}/photos`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            title: photoTitle,
                            image: dataUrl,
                            category,
                            date,
                            userId: currentUser
                        })
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            uploaded++;
                            if (uploaded === total) {
                                fetchAllData().then(() => {
                                    renderPhotos();
                                    updatePhotoCount();
                                });
                                pendingPhotoFiles = [];
                                document.getElementById('photo-title').value = '';
                                document.getElementById('photo-category').value = 'daily';
                                resetUploadArea();
                                showToast(`成功上传 ${uploaded} 张神图！✨📸`);
                            }
                        }
                    });
                } else {
                    // 本地模式
                    const newPhoto = {
                        id: Date.now() + index,
                        title: photoTitle,
                        image: dataUrl,
                        category: category,
                        date: date,
                        userId: currentUser,
                        createdAt: new Date().toISOString()
                    };
                    
                    photos.unshift(newPhoto);
                    uploaded++;
                    
                    if (uploaded === total) {
                        savePhotos();
                        renderPhotos();
                        updatePhotoCount();
                        
                        pendingPhotoFiles = [];
                        document.getElementById('photo-title').value = '';
                        document.getElementById('photo-category').value = 'daily';
                        resetUploadArea();
                        
                        showToast(`成功上传 ${uploaded} 张神图！✨📸`);
                    }
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function resetUploadArea() {
    const uploadArea = document.getElementById('upload-area');
    uploadArea.innerHTML = `
        <div class="upload-icon">📸</div>
        <p class="upload-text">点击或拖拽图片到这里上传</p>
        <p class="upload-hint">支持 jpg、png、gif 格式~</p>
    `;
}

function renderPhotos() {
    const container = document.getElementById('photos-grid');
    
    let filtered = photos;
    if (currentPhotoFilter !== 'all') {
        filtered = photos.filter(p => p.category === currentPhotoFilter);
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-icon">📸</div>
                <div class="empty-text">还没有神图呢<br>上传第一张神图吧~</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(photo => {
        const category = PHOTO_CATEGORIES[photo.category] || PHOTO_CATEGORIES.other;
        const user = CONFIG.users[photo.userId];
        
        return `
            <div class="photo-item" onclick="openPhotoModal(${photo.id})">
                <img src="${photo.image}" alt="${escapeHtml(photo.title)}" loading="lazy">
                <div class="photo-item-overlay">
                    <div class="photo-item-title">${escapeHtml(photo.title)}</div>
                    <div class="photo-item-meta">${category.emoji} ${user.name}</div>
                </div>
            </div>
        `;
    }).join('');
}

function updatePhotoCount() {
    document.getElementById('photo-count').textContent = `${photos.length} 张神图`;
}

function openPhotoModal(id) {
    const photo = photos.find(p => p.id === id);
    if (!photo) return;
    
    currentModalPhotoId = id;
    const category = PHOTO_CATEGORIES[photo.category] || PHOTO_CATEGORIES.other;
    const user = CONFIG.users[photo.userId];
    
    document.getElementById('modal-image').src = photo.image;
    document.getElementById('modal-title').textContent = photo.title;
    document.getElementById('modal-meta').textContent = 
        `${category.emoji} ${category.name} · ${photo.date} · ${user.name}`;
    
    document.getElementById('photo-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closePhotoModal() {
    document.getElementById('photo-modal').classList.remove('active');
    document.body.style.overflow = '';
    currentModalPhotoId = null;
}

function deleteCurrentPhoto() {
    if (!currentModalPhotoId) return;
    if (!confirm('确定要删除这张神图吗？')) return;
    
    if (SERVER_MODE) {
        fetch(`${API_BASE}/photos/${currentModalPhotoId}`, { method: 'DELETE' })
        .then(() => {
            fetchAllData().then(() => {
                renderPhotos();
                updatePhotoCount();
            });
            closePhotoModal();
            showToast('已删除');
        });
    } else {
        photos = photos.filter(p => p.id !== currentModalPhotoId);
        savePhotos();
        renderPhotos();
        updatePhotoCount();
        closePhotoModal();
        showToast('已删除');
    }
}

function savePhotos() {
    try {
        localStorage.setItem('bff_photos', JSON.stringify(photos));
    } catch (e) {
        showToast('存储空间不够啦，删掉一些旧照片吧~');
    }
    if (GIST_MODE && !_savingGist) {
        _savingGist = true;
        saveGistData().finally(() => { _savingGist = false; });
    }
}

// ===== 地理位置 =====
function loadLocations() {
    renderLocationCards();
    updateDistance();
}

function updateMyLocation() {
    const btn = document.getElementById('refresh-location-btn');
    btn.textContent = '⏳ 获取位置中...';
    btn.disabled = true;
    
    if (!navigator.geolocation) {
        showToast('你的浏览器不支持定位功能哦~');
        btn.textContent = '📍 更新我的位置';
        btn.disabled = false;
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            btn.textContent = '🔍 解析地址中...';
            
            // 反向地理编码获取详细地址
            const geoResult = await reverseGeocode(lat, lng);
            let addressText = '';
            let addressFull = '';
            
            if (geoResult) {
                // 只显示省 + 市
                const parts = [];
                if (geoResult.province) parts.push(geoResult.province);
                if (geoResult.city && geoResult.city !== geoResult.province) parts.push(geoResult.city);
                addressText = parts.join(' · ');
                addressFull = geoResult.raw;
            } else {
                addressText = generateAddressDesc(lat, lng);
            }
            
            // 保存位置数据（包含详细地址）
            const locationData = {
                lat: lat,
                lng: lng,
                address: addressText,
                addressFull: addressFull,
                time: new Date().toISOString()
            };
            
            if (SERVER_MODE) {
                fetch(`${API_BASE}/locations`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUser, lat, lng, address: addressText, addressFull })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        fetchAllData().then(() => {
                            renderLocationCards();
                            updateDistance();
                        });
                        btn.textContent = '📍 更新我的位置';
                        btn.disabled = false;
                        showToast('位置更新成功~ 📍✨');
                    }
                });
            } else {
                locations[currentUser] = locationData;
                saveLocations();
                renderLocationCards();
                updateDistance();
                
                btn.textContent = '📍 更新我的位置';
                btn.disabled = false;
                
                showToast('位置更新成功~ 📍✨');
            }
        },
        (error) => {
            let msg = '获取位置失败了~';
            if (error.code === 1) msg = '你拒绝了定位授权哦~';
            if (error.code === 2) msg = '无法获取位置信息~';
            if (error.code === 3) msg = '获取位置超时了~';
            
            showToast(msg);
            
            btn.textContent = '📍 更新我的位置';
            btn.disabled = false;
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// 反向地理编码：经纬度转地址
// 高德地图反向地理编码（用 JSONP 方式，避免跨域）
function reverseGeocodeAmap(lat, lng) {
    return new Promise((resolve, reject) => {
        if (!AMAP_CONFIG || !AMAP_CONFIG.key) {
            reject(new Error('no amap key'));
            return;
        }
        
        const callbackName = '_amap_regeo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        
        window[callbackName] = function(data) {
            // 清理
            delete window[callbackName];
            document.body.removeChild(script);
            
            if (data.status === '1' && data.regeocode) {
                const comp = data.regeocode.addressComponent || {};
                resolve({
                    full: data.regeocode.formatted_address || '',
                    province: comp.province || '',
                    city: comp.city || comp.province || '',
                    district: comp.district || '',
                    street: comp.township || comp.street || '',
                    raw: data.regeocode.formatted_address || ''
                });
            } else {
                reject(new Error(data.info || 'amap error'));
            }
        };
        
        const script = document.createElement('script');
        script.src = `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_CONFIG.key}&location=${lng},${lat}&extensions=base&radius=1000&output=json&callback=${callbackName}`;
        script.onerror = function() {
            delete window[callbackName];
            document.body.removeChild(script);
            reject(new Error('amap network error'));
        };
        document.body.appendChild(script);
        
        // 超时 8 秒
        setTimeout(() => {
            if (window[callbackName]) {
                delete window[callbackName];
                try { document.body.removeChild(script); } catch(e) {}
                reject(new Error('amap timeout'));
            }
        }, 8000);
    });
}

async function reverseGeocode(lat, lng) {
    // 优先用高德地图（国内地址更准），用 JSONP 避免跨域
    if (AMAP_CONFIG && AMAP_CONFIG.key) {
        try {
            const result = await reverseGeocodeAmap(lat, lng);
            return result;
        } catch (e) {
            console.warn('高德地理编码失败，回退到OSM:', e);
        }
    }
    
    // 回退：使用 OpenStreetMap Nominatim 免费 API
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&accept-language=zh-CN&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'LG-Xindong-House/1.0'
                }
            }
        );
        
        if (!res.ok) throw new Error('Geocoding failed');
        
        const data = await res.json();
        const addr = data.address || {};
        
        // 拼接地址信息
        let parts = [];
        
        // 省/州
        if (addr.province || addr.state) parts.push(addr.province || addr.state);
        // 城市
        if (addr.city || addr.town || addr.county) parts.push(addr.city || addr.town || addr.county);
        // 区/县
        if (addr.borough || addr.suburb || addr.city_district) {
            parts.push(addr.borough || addr.suburb || addr.city_district);
        }
        // 街道/乡镇
        if (addr.road || addr.street) parts.push(addr.road || addr.street);
        if (addr.village || addr.neighbourhood) parts.push(addr.village || addr.neighbourhood);
        
        // 如果啥都没取到，用 display_name 的前几段
        if (parts.length === 0 && data.display_name) {
            const displayParts = data.display_name.split(',');
            parts = displayParts.slice(0, 3).map(s => s.trim());
        }
        
        return {
            full: parts.join(' '),
            province: addr.province || addr.state || '',
            city: addr.city || addr.town || addr.county || '',
            district: addr.borough || addr.suburb || addr.city_district || '',
            street: addr.road || addr.street || '',
            raw: data.display_name || ''
        };
    } catch (e) {
        console.error('地理编码失败:', e);
        return null;
    }
}

function generateAddressDesc(lat, lng) {
    // 用经纬度生成一个友好的描述
    const latDir = lat >= 0 ? '北纬' : '南纬';
    const lngDir = lng >= 0 ? '东经' : '西经';
    const latAbs = Math.abs(lat).toFixed(4);
    const lngAbs = Math.abs(lng).toFixed(4);
    
    // 判断大概在哪个半球/区域
    let region = '';
    if (lat > 23 && lat < 50 && lng > 73 && lng < 135) {
        region = '在中国境内 🇨🇳';
    } else if (lat > 0 && lng > 0) {
        region = '在东北半球';
    } else if (lat > 0 && lng < 0) {
        region = '在西北半球';
    } else if (lat < 0 && lng > 0) {
        region = '在东南半球';
    } else {
        region = '在西南半球';
    }
    
    return `${latDir}${latAbs}°，${lngDir}${lngAbs}°\n${region}`;
}

// 自动补全位置的地址信息（如果有经纬度但没有真实地址）
async function ensureLocationAddresses() {
    let needsSave = false;
    
    for (const key of ['girl1', 'girl2']) {
        const loc = locations[key];
        // 如果有经纬度，且没有地址或地址是旧的经纬度格式（含"北纬""东经"），就重新解析
        if (loc && loc.lat && loc.lng && (!loc.address || loc.address.includes('北纬') || loc.address.includes('东经'))) {
            const geoResult = await reverseGeocode(loc.lat, loc.lng);
            if (geoResult) {
                const parts = [];
                if (geoResult.province) parts.push(geoResult.province);
                if (geoResult.city && geoResult.city !== geoResult.province) parts.push(geoResult.city);
                loc.address = parts.join(' · ');
                loc.addressFull = geoResult.raw;
                needsSave = true;
            }
        }
    }
    
    if (needsSave) {
        if (SERVER_MODE) {
            // 分别更新两个人的位置地址
            for (const key of ['girl1', 'girl2']) {
                const loc = locations[key];
                if (loc && loc.address) {
                    fetch(`${API_BASE}/locations`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            userId: key, 
                            lat: loc.lat, 
                            lng: loc.lng, 
                            address: loc.address, 
                            addressFull: loc.addressFull 
                        })
                    }).catch(() => {});
                }
            }
        } else {
            saveLocations();
        }
        renderLocationCards();
    }
}

function renderLocationCards() {
    const user1 = CONFIG.users.girl1;
    const user2 = CONFIG.users.girl2;
    const loc1 = locations.girl1;
    const loc2 = locations.girl2;
    
    // 头像和名字
    document.getElementById('loc-avatar-1').textContent = user1.avatar;
    document.getElementById('loc-avatar-2').textContent = user2.avatar;
    document.getElementById('loc-name-1').textContent = user1.name;
    document.getElementById('loc-name-2').textContent = user2.name;
    
    // 位置1
    if (loc1) {
        const addrParts = [];
        // 如果有真实地址（不含"北纬""东经"），就显示真实地址
        if (loc1.address && !loc1.address.includes('北纬') && !loc1.address.includes('东经')) {
            addrParts.push(`📍 ${loc1.address}`);
        } else {
            addrParts.push(generateAddressDesc(loc1.lat, loc1.lng).replace(/\n/g, '<br>'));
        }
        if (loc1.lat && loc1.lng) {
            addrParts.push(`<small style="opacity:0.6">坐标: ${loc1.lat.toFixed(4)}°, ${loc1.lng.toFixed(4)}°</small>`);
        }
        document.getElementById('loc-address-1').innerHTML = addrParts.join('<br>');
        document.getElementById('loc-time-1').textContent = 
            `更新于 ${formatLocationTime(loc1.time)}`;
        document.getElementById('loc-status-1').textContent = '📍';
        document.getElementById('loc-status-1').classList.add('online');
    } else {
        document.getElementById('loc-address-1').textContent = '还没有更新位置~';
        document.getElementById('loc-time-1').textContent = '--';
        document.getElementById('loc-status-1').textContent = '⚪';
        document.getElementById('loc-status-1').classList.remove('online');
    }
    
    // 位置2
    if (loc2) {
        const addrParts = [];
        if (loc2.address && !loc2.address.includes('北纬') && !loc2.address.includes('东经')) {
            addrParts.push(`📍 ${loc2.address}`);
        } else {
            addrParts.push(generateAddressDesc(loc2.lat, loc2.lng).replace(/\n/g, '<br>'));
        }
        if (loc2.lat && loc2.lng) {
            addrParts.push(`<small style="opacity:0.6">坐标: ${loc2.lat.toFixed(4)}°, ${loc2.lng.toFixed(4)}°</small>`);
        }
        document.getElementById('loc-address-2').innerHTML = addrParts.join('<br>');
        document.getElementById('loc-time-2').textContent = 
            `更新于 ${formatLocationTime(loc2.time)}`;
        document.getElementById('loc-status-2').textContent = '📍';
        document.getElementById('loc-status-2').classList.add('online');
    } else {
        document.getElementById('loc-address-2').textContent = '还没有更新位置~';
        document.getElementById('loc-time-2').textContent = '--';
        document.getElementById('loc-status-2').textContent = '⚪';
        document.getElementById('loc-status-2').classList.remove('online');
    }
}

function updateDistance() {
    const loc1 = locations.girl1;
    const loc2 = locations.girl2;
    
    const distanceEl = document.getElementById('distance-km');
    const descEl = document.getElementById('distance-desc');
    
    if (!loc1 && !loc2) {
        distanceEl.textContent = '--';
        descEl.textContent = '两个人都还没更新位置呢~ 快点点上面的按钮吧！';
        return;
    }
    
    if (!loc1 || !loc2) {
        distanceEl.textContent = '--';
        const who = !loc1 ? CONFIG.users.girl1.name : CONFIG.users.girl2.name;
        descEl.textContent = `${who} 还没更新位置哦，等 TA 更新了就能看到距离啦~`;
        return;
    }
    
    // 计算距离
    const distance = calculateDistance(loc1.lat, loc1.lng, loc2.lat, loc2.lng);
    
    if (distance < 1) {
        const meters = Math.round(distance * 1000);
        distanceEl.textContent = meters;
        document.querySelector('.distance-unit').textContent = '米';
        descEl.textContent = '哇！你们离得好近呀~ 快约起来！💕';
    } else {
        distanceEl.textContent = distance.toFixed(2);
        document.querySelector('.distance-unit').textContent = '公里';
        
        if (distance < 5) {
            descEl.textContent = '好近呀！步行就能见面~ 🚶‍♀️';
        } else if (distance < 50) {
            descEl.textContent = '同城的距离~ 周末可以约！🚗';
        } else if (distance < 300) {
            descEl.textContent = '高铁一会儿就到啦~ 🚄';
        } else if (distance < 1000) {
            descEl.textContent = '虽然有点远，但心是连在一起的~ 💓';
        } else {
            descEl.textContent = '相隔万里，但思念不减~ 💕✨';
        }
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    // Haversine 公式计算两点间距离（公里）
    const R = 6371; // 地球半径（公里）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function formatLocationTime(timeStr) {
    const date = new Date(timeStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60 * 1000) return '刚刚';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} 分钟前`;
    if (date.toDateString() === now.toDateString()) {
        return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function saveLocations() {
    localStorage.setItem('bff_locations', JSON.stringify(locations));
    if (GIST_MODE && !_savingGist) {
        _savingGist = true;
        saveGistData().finally(() => { _savingGist = false; });
    }
}

// ===== 土味情话 =====
const SWEET_QUOTES = [
    "你是我最想珍藏的宝贝，也是我最想分享所有快乐和难过的人 💕",
    "别人都祝你快乐，我只愿你，遍历山河，觉得人间值得 ✨",
    "你不用跟别人比，你在我这里永远是最好的 🌸",
    "虽然你不是超人，但你是我的万能闺蜜 🦸‍♀️",
    "认识你这么久，从来没后悔过，反而觉得特别幸运 🍀",
    "你开心的时候我比你还开心，你难过的时候我想当你的依靠 🫂",
    "我们不是限定，是来日方长 🌅",
    "别人是见色起意，我们是见你起意 😂💕",
    "愿我们的友谊，从校服到婚纱，从青丝到白发 👰‍♀️👰‍♀️",
    "你是我选中的家人，没有血缘关系的亲人 👭",
    "跟你在一起的时候，我从来不用羡慕别人 💖",
    "谢谢你陪我长大，陪我犯傻，陪我度过所有好与不好的时光 🎀",
    "世界那么大，能遇见你，是我最大的幸运 🌟",
    "你就是我的宝藏女孩，藏起来不想跟别人分享的那种 🎁",
    "我们的关系就是：见面互怼，不见面想念，永远不会散 💫",
    "你是我枯燥生活里的糖，有你在生活都变甜了 🍬",
    "闺蜜就是那个，陪你从非主流到女神的人 👑",
    "我会在每个有意义的时刻，远隔山海与你共存 🌊",
    "你不用多好，我喜欢就好；我没有很好，你不嫌弃就好 🥰",
    "我们的友谊，不会输给时间，不会输给距离，更不会输给别人 🏆",
    "你笑起来真好看，像春天的花一样~ 🌺",
    "这辈子最不后悔的事，就是认识了你 💕",
    "你是我亲自挑选的家人，所以请你，不要离开我 🥺💕",
    "我们要做一辈子的好朋友，老了一起跳广场舞 💃",
    "有你在身边，风都超级甜 🍃💕",
    "你是我永远的底气，也是我永远的退路 🌈",
    "别人问我你哪里好，我说，哪都好，就是谁也替代不了 💗",
    "我们的故事，还很长，慢慢讲 ～ 📖",
    "有一个懂你的闺蜜，真的太幸福了 💕",
    "你永远是我，最最最最最重要的人！🌟"
];

let currentSweetIndex = -1;

function nextSweetQuote() {
    const textEl = document.getElementById('sweet-text');
    const quoteEl = document.getElementById('sweet-quote');
    
    // 随机选一个，不要和上一个一样
    let newIndex;
    do {
        newIndex = Math.floor(Math.random() * SWEET_QUOTES.length);
    } while (newIndex === currentSweetIndex && SWEET_QUOTES.length > 1);
    
    currentSweetIndex = newIndex;
    
    // 添加一个小动画
    quoteEl.style.opacity = '0';
    quoteEl.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
        textEl.textContent = SWEET_QUOTES[newIndex];
        quoteEl.style.opacity = '1';
        quoteEl.style.transform = 'translateY(0)';
    }, 200);
}

// 初始化时先显示一句
function initSweetPage() {
    if (currentSweetIndex === -1) {
        nextSweetQuote();
    }
}

// ===== 一起听歌 =====
const DEFAULT_SONGS = [
    { title: '一个像夏天一个像秋天', artist: '范玮琪', url: '', emoji: '🎵' },
    { title: '姐妹', artist: '张惠妹', url: '', emoji: '🎶' },
    { title: '闺蜜', artist: '许嵩/何曼婷', url: '', emoji: '💕' },
    { title: '世界上的另一个我', artist: '阿肆/郭采洁', url: '', emoji: '👯' },
    { title: '陪你长大', artist: '大Q秉洛', url: '', emoji: '🌱' },
];

let songList = [...DEFAULT_SONGS];
let currentSongIndex = -1;
let isPlaying = false;

function renderMusicList() {
    const container = document.getElementById('music-list-container');
    container.innerHTML = songList.map((song, index) => `
        <div class="music-item ${index === currentSongIndex ? 'active' : ''}" onclick="playSong(${index})">
            <div class="music-item-index">${index + 1}</div>
            <div class="music-item-info">
                <div class="music-item-title">${song.title}</div>
                <div class="music-item-artist">${song.artist}</div>
            </div>
            <div style="font-size: 20px;">${song.emoji || '🎵'}</div>
        </div>
    `).join('');
}

function playSong(index) {
    if (index < 0 || index >= songList.length) return;
    
    currentSongIndex = index;
    const song = songList[index];
    
    document.getElementById('music-title').textContent = song.title;
    document.getElementById('music-artist').textContent = song.artist;
    document.getElementById('music-cover').textContent = song.emoji || '🎶';
    
    const audio = document.getElementById('audio-player');
    
    if (song.url) {
        audio.src = song.url;
        audio.play().catch(() => {
            // 自动播放被阻止，等用户点击
        });
        isPlaying = true;
        updatePlayButton();
    } else {
        // 没有音频链接，模拟播放
        isPlaying = !isPlaying;
        if (isPlaying) {
            showToast('🎵 假装在播放~ 想加真实歌曲的话，把音频链接告诉我哦！');
        }
        updatePlayButton();
    }
    
    renderMusicList();
}

function togglePlay() {
    if (currentSongIndex === -1) {
        playSong(0);
        return;
    }
    
    const audio = document.getElementById('audio-player');
    const song = songList[currentSongIndex];
    
    if (song.url) {
        if (isPlaying) {
            audio.pause();
        } else {
            audio.play().catch(() => {});
        }
        isPlaying = !isPlaying;
    } else {
        isPlaying = !isPlaying;
    }
    
    updatePlayButton();
}

function updatePlayButton() {
    const btn = document.getElementById('play-btn');
    const cover = document.getElementById('music-cover');
    
    if (isPlaying) {
        btn.textContent = '⏸';
        cover.classList.add('playing');
    } else {
        btn.textContent = '▶️';
        cover.classList.remove('playing');
    }
}

function prevMusic() {
    if (currentSongIndex <= 0) {
        playSong(songList.length - 1);
    } else {
        playSong(currentSongIndex - 1);
    }
}

function nextMusic() {
    if (currentSongIndex >= songList.length - 1) {
        playSong(0);
    } else {
        playSong(currentSongIndex + 1);
    }
}

function initMusicPage() {
    renderMusicList();
    const audio = document.getElementById('audio-player');
    audio.addEventListener('ended', () => {
        nextMusic();
    });
    audio.addEventListener('play', () => {
        isPlaying = true;
        updatePlayButton();
    });
    audio.addEventListener('pause', () => {
        isPlaying = false;
        updatePlayButton();
    });
}

// ===== 工具函数 =====
function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${year}年${month}月${day}日`;
}

function formatDateKey(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatTime(timeStr) {
    const date = new Date(timeStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60 * 1000) return '刚刚';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} 分钟前`;
    if (date.toDateString() === now.toDateString()) {
        return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    
    if (date.getFullYear() === now.getFullYear()) {
        return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Toast 提示 =====
let toastTimer = null;

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}
