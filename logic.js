// ============================================
// 1. 初始化配置
// ============================================
const APP_ID = "H5n4qmS6PtlQ622uTrphucD9-MdYXbMMI"; 
const APP_KEY = "WIqoGPzreBxRfzrMPAudP4ll";

AV.init({ appId: APP_ID, appKey: APP_KEY, serverURL: "https://h5n4qms6.api.lncldglobal.com" });

// 本地缓存 (模拟数据库，实际需对接云端API)
let userDatabase = JSON.parse(localStorage.getItem('db_users_v12')) || [];
let profileDatabase = JSON.parse(localStorage.getItem('db_profiles_v12')) || [];
function saveAllData() {
    localStorage.setItem('db_users_v12', JSON.stringify(userDatabase));
    localStorage.setItem('db_profiles_v12', JSON.stringify(profileDatabase));
}

let currentUser = null;
let currentEditingPhone = null;
let tempPhotoBase64 = "";
let membersData = [];
let selectedIds = new Set();

// ============================================
// 2. 路由与身份检查 (核心变更：前后台分离)
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('currentUser');
    
    // A. 如果当前在“后台页面” (dashboard.html)
    if (window.isDashboardPage) {
        if (!savedUser) {
            alert("⚠️ 访问受限：请先登录系统");
            window.location.href = "login.html";
            return;
        }
        currentUser = JSON.parse(savedUser);
        initDashboard(); // 启动后台逻辑
    } 
    // B. 如果当前在“前台页面” (index.html)
    else {
        if (savedUser) {
            // 已登录，显示“进入控制台”按钮
            currentUser = JSON.parse(savedUser);
            updateNavbarState(true);
        } else {
            updateNavbarState(false);
        }
        initHamburger();
        initBanner();
    }
});

function updateNavbarState(isLoggedIn) {
    const guestMenu = document.getElementById('guest-menu');
    const memberMenu = document.getElementById('member-menu');
    const guestBtns = document.getElementById('guest-btns');
    const memberBtns = document.getElementById('member-btns');
    
    if (isLoggedIn) {
        if(guestMenu) guestMenu.classList.add('hidden'); // 登录后可选隐藏游客菜单，或保留
        if(guestBtns) guestBtns.classList.add('hidden');
        if(memberMenu) memberMenu.classList.remove('hidden');
        if(memberBtns) {
            memberBtns.classList.remove('hidden');
            document.getElementById('nav-user-name').innerText = "Hi, " + currentUser.name;
        }
    } else {
        if(memberMenu) memberMenu.classList.add('hidden');
        if(memberBtns) memberBtns.classList.add('hidden');
        if(guestMenu) guestMenu.classList.remove('hidden');
        if(guestBtns) guestBtns.classList.remove('hidden');
    }
}

function initHamburger() {
    const hb = document.getElementById('hamburger');
    const menu = document.querySelector('.nav-menu');
    if (!hb || !menu) return;
    hb.addEventListener('click', () => {
        menu.classList.toggle('active');
        hb.classList.toggle('active');
    });
    document.querySelectorAll('.nav-links a').forEach(a => {
        a.addEventListener('click', () => {
            menu.classList.remove('active');
            hb.classList.remove('active');
        });
    });
}

function initBanner() {
    const banner = document.getElementById('banner');
    if (!banner) return;
    const track = banner.querySelector('.banner-track');
    const slides = Array.from(banner.querySelectorAll('.slide'));
    const dots = Array.from(banner.querySelectorAll('.dot'));
    const prev = banner.querySelector('.banner-prev');
    const next = banner.querySelector('.banner-next');
    let index = 0;
    let timer = null;
    function update() {
        track.style.transform = `translateX(-${index * 100}%)`;
        dots.forEach((d, i) => d.classList.toggle('active', i === index));
    }
    function go(i) {
        index = (i + slides.length) % slides.length;
        update();
    }
    function start() {
        stop();
        timer = setInterval(() => go(index + 1), 5000);
    }
    function stop() {
        if (timer) { clearInterval(timer); timer = null; }
    }
    prev.addEventListener('click', () => { go(index - 1); start(); });
    next.addEventListener('click', () => { go(index + 1); start(); });
    dots.forEach(d => d.addEventListener('click', e => { go(parseInt(d.dataset.index)); start(); }));
    banner.addEventListener('mouseenter', stop);
    banner.addEventListener('mouseleave', start);
    update();
    start();
}

// 权限等级定义 (金字塔)
function getRoleLevel(role) {
    if (role === 'root') return 3;           // 老板
    if (role === 'platform_admin') return 2; // 总部
    if (role === 'club_admin') return 1;     // 店长
    return 0;                                // 会员
}

// ============================================
// 3. 云端登录 (Login)
// ============================================
async function handleCloudLogin() {
    const userIn = document.getElementById('login-username').value.trim();
    const passIn = document.getElementById('login-password').value.trim();
    const loginBtn = document.getElementById('btn-login'); 
    if(loginBtn) { loginBtn.innerText = "登录中..."; loginBtn.disabled = true; }
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: userIn, password: passIn })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || '登录失败');
        const map = { ultimate_admin: 'root', super_admin: 'platform_admin', club_admin: 'club_admin', member: 'member' };
        const targetUser = {
            name: data.name || '会员',
            username: userIn,
            role: map[data.role] || 'member',
            clubName: data.clubLocation || '',
            phone: userIn,
            token: data.token
        };
        localStorage.setItem('currentUser', JSON.stringify(targetUser));
        window.location.href = "dashboard.html";
    } catch (error) {
        alert("登录失败：" + error.message);
    } finally {
        if(loginBtn) { loginBtn.innerText = "登录"; loginBtn.disabled = false; }
    }
}

// ============================================
// 4. 后台管理逻辑 (Dashboard Logic)
// ============================================
function initDashboard() {
    // 基础显示
    document.getElementById('user-display-name').innerText = currentUser.name;
    const roleBadge = document.getElementById('identity-role');
    
    // 角色分流与权限控制
    if (currentUser.role === 'root') {
        roleBadge.innerText = "👑 AI-Club 超级管理员";
        showAdminTools(true, true); // (是管理员, 是老板)
        renderAdminTable('ALL');
    }
    else if (currentUser.role === 'platform_admin') {
        roleBadge.innerText = "🛡️ 平台管理员 (总部)";
        showAdminTools(true, false); // (是管理员, 不是老板)
        renderAdminTable('ALL');
    }
    else if (currentUser.role === 'club_admin') {
        roleBadge.innerText = "🏠 " + (currentUser.clubName || currentUser.club) + " 店长";
        showAdminTools(false, false); // 店长不显示顶部那个复杂的工具条
        // 店长只能看自己
        renderAdminTable(currentUser.clubName || currentUser.club);
    }
    else {
        roleBadge.innerText = "👤 会员";
        document.getElementById('admin-panel').style.display = 'none';
        document.getElementById('top-admin-tools').style.display = 'none';
        // 会员直接看档案
        editUser(currentUser.phone || currentUser.username);
    }
}

function showAdminTools(isTopAdmin, isRoot) {
    document.getElementById('top-admin-tools').style.display = 'block';
    document.getElementById('admin-panel').style.display = 'block';
    
    // 只有老板能看到的“批量删除”按钮
    const btnDel = document.getElementById('btn-batch-delete');
    if(btnDel) btnDel.style.display = isRoot ? 'inline-block' : 'none';
}

// ============================================
// 5. 表格渲染 (含公海池逻辑)
// ============================================
function renderAdminTable(filterClub) {
    const tbody = document.getElementById('member-list-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    const roleMapInv = { root: 'ultimate_admin', platform_admin: 'super_admin', club_admin: 'club_admin', member: 'member' };
    const myRole = roleMapInv[currentUser.role] || 'member';
    const myClub = currentUser.clubName || currentUser.club || 'ALL';
    fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: myRole, myClub })
    })
    .then(res => res.json())
    .then(data => {
        membersData = (data && data.data) ? data.data : [];
        if (membersData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 20px; color:#999;">暂无数据</td></tr>';
            return;
        }
        membersData.forEach(u => {
            const tr = document.createElement('tr');
            const canEdit = getRoleLevel(currentUser.role) > 0;
            const clubTag = u.clubLocation === '待分配' ? '<span style="color:red; font-weight:bold;">⚠️ 待分配</span>' : (u.clubLocation || '');
            const btns = canEdit ? `<button onclick="editUser('${u.parentPhone}')" class="btn-xs">管理</button>` : '';
            tr.innerHTML = `
                <td><input type="checkbox" class="member-check" value="${u._id}"></td>
                <td><img src="${u.childPhoto||''}" style="width:36px;height:36px;border-radius:50%;background:#eee;"></td>
                <td>${btns}</td>
                <td><strong>${u.childName||''}</strong></td>
                <td>${clubTag}</td>
                <td>${u.gender||''}</td>
                <td>${u.parentPhone||''}</td>
                <td>${u.school||''}</td>
            `;
            tbody.appendChild(tr);
        });
        Array.from(document.querySelectorAll('.member-check')).forEach(cb => {
            cb.addEventListener('change', (e) => {
                const id = cb.value;
                if (cb.checked) selectedIds.add(id); else selectedIds.delete(id);
            });
        });
    })
    .catch(() => {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 20px; color:#999;">加载失败</td></tr>';
    });
}

// ============================================
// 6. 档案编辑 (3B方案: 字段锁定)
// ============================================
function editUser(phone) {
    // 切换面板显示
    document.getElementById('admin-panel').style.display = 'none';
    if(document.getElementById('top-admin-tools')) document.getElementById('top-admin-tools').style.display = 'none';
    document.getElementById('profile-panel').style.display = 'block';
    
    prepareEditForm(phone);
}

function prepareEditForm(phone) {
    currentEditingPhone = phone;
    let profile = profileDatabase.find(p => p.phone === phone);
    if (!profile) {
        profile = { phone: phone, name: '', role: 'member', club: '待分配', photo: '' };
        if(currentUser.phone === phone) profile = currentUser;
    }

    // 填充数据
    const setVal = (id, val) => document.getElementById(id).value = val || '';
    setVal('p-name', profile.name);
    setVal('p-phone', profile.phone);
    setVal('p-password', ''); // 密码默认留空
    setVal('p-gender', profile.gender || '男');
    setVal('p-club-select', profile.club || '待分配');
    setVal('p-idcard', profile.idcard);
    setVal('p-school', profile.school);
    setVal('p-class', profile.gradeClass);
    setVal('p-wechat', profile.parentWeChat);
    
    // 图片
    const img = document.getElementById('p-photo-preview');
    if(img) img.src = profile.photo || "https://via.placeholder.com/150?text=No+Photo";
    tempPhotoBase64 = profile.photo || "";

    // === 权限锁定核心逻辑 ===
    const myLevel = getRoleLevel(currentUser.role);
    
    // 1. 转会权限 (2A方案)：只有 Root(3) 和 Platform(2) 能改俱乐部
    const canTransfer = myLevel >= 2;
    document.getElementById('p-club-select').disabled = !canTransfer;
    if(!canTransfer) document.getElementById('p-club-select').classList.add('read-only');

    // 2. 关键信息修改权限 (3B方案)
    // 如果我是会员(0)，或者我只是店长(1)但我想改别人的关键信息 -> 锁定
    // 简单起见：会员自己不能改关键信息。管理员(>=1)可以改会员的关键信息。
    const isMemberSelf = (currentUser.role === 'member');
    const fieldsToLock = ['p-name', 'p-idcard', 'p-school', 'p-class'];
    
    fieldsToLock.forEach(id => {
        const el = document.getElementById(id);
        if (isMemberSelf) {
            el.disabled = true;
            el.classList.add('read-only');
        } else {
            el.disabled = false;
            el.classList.remove('read-only');
        }
    });
}

function saveProfileData() {
    const newName = document.getElementById('p-name').value.trim();
    if (!newName) return alert("姓名必填");

    const p = profileDatabase.find(x => x.phone === currentEditingPhone);
    // 构造新数据对象
    const newData = {
        phone: currentEditingPhone,
        name: newName,
        gender: document.getElementById('p-gender').value,
        club: document.getElementById('p-club-select').value,
        idcard: document.getElementById('p-idcard').value,
        school: document.getElementById('p-school').value,
        gradeClass: document.getElementById('p-class').value,
        parentWeChat: document.getElementById('p-wechat').value,
        photo: tempPhotoBase64,
        role: 'member' // 默认为会员
    };

    if(p) {
        Object.assign(p, newData);
    } else {
        profileDatabase.push(newData);
    }
    
    saveAllData();
    alert("保存成功！");
    
    // 如果不是会员本人，保存后返回列表
    if(currentUser.role !== 'member') closeDetailView();
}

// ============================================
// 7. 辅助功能 (弹窗、开店等)
// ============================================
function openAddAdminModal() { 
    document.getElementById('modal-add-admin').classList.remove('hidden');
    const roleSelect = document.getElementById('new-admin-role');
    roleSelect.innerHTML = '';
    
    // 只有老板能创建“平台管理员”
    if (currentUser.role === 'root') {
        const op1 = document.createElement('option');
        op1.value = 'platform_admin'; op1.innerText = '平台管理员 (总部运营)';
        roleSelect.appendChild(op1);
    }
    // 老板和总部都能创建“店长”
    const op2 = document.createElement('option');
    op2.value = 'club_admin'; op2.innerText = '俱乐部店长 (开分店)';
    roleSelect.appendChild(op2);
}

function confirmAddAdmin() {
    const user = document.getElementById('new-admin-user').value;
    const pass = document.getElementById('new-admin-pass').value;
    const name = document.getElementById('new-admin-name').value;
    const role = document.getElementById('new-admin-role').value;
    const club = document.getElementById('new-admin-club').value;

    if(!user || !club) return alert("请填写完整信息");
    
    userDatabase.push({ username: user, password: pass, role: role, displayName: name, clubName: club });
    saveAllData();
    alert(`任命成功！\n${name} 已成为 ${club} 的管理员。`);
    closeModal('modal-add-admin');
}

// 报名 (1B方案: 进公海)
async function handleJoin(event) {
    event.preventDefault();
    const name = document.getElementById('j-name').value.trim();
    const gender = document.getElementById('j-gender').value;
    const idcard = document.getElementById('j-idcard').value.trim();
    const school = document.getElementById('j-school').value.trim();
    const gradeClass = document.getElementById('j-class').value.trim();
    const phone = document.getElementById('j-phone').value.trim();
    const wechat = document.getElementById('j-wechat').value.trim();
    const club = document.getElementById('j-club').value;
    const photoInput = document.getElementById('j-photo');
    const fd = new FormData();
    fd.append('childName', name);
    fd.append('gender', gender);
    fd.append('childIDCard', idcard);
    fd.append('school', school);
    fd.append('gradeClass', gradeClass);
    fd.append('parentPhone', phone);
    fd.append('parentWeChat', wechat);
    fd.append('clubLocation', club);
    if (photoInput && photoInput.files && photoInput.files[0]) {
        fd.append('childPhoto', photoInput.files[0]);
    }
    try {
        const res = await fetch('/api/join', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || '报名失败');
        alert("报名成功！请前往登录。");
        window.location.href = "login.html";
    } catch (e) {
        alert("报名失败：" + e.message);
    }
}

// 通用工具
function logoutAction() { localStorage.removeItem('currentUser'); window.location.href = "index.html"; }
function closeDetailView() { document.getElementById('profile-panel').style.display = 'none'; initDashboard(); }
function openTransferModal() { document.getElementById('modal-transfer').classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function previewImage(input) {
    if (input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function (e) { document.getElementById('p-photo-preview').src = e.target.result; tempPhotoBase64 = e.target.result; };
        reader.readAsDataURL(input.files[0]);
    }
}
function toggleSelectAll() {
    const allCb = document.getElementById('select-all');
    const items = Array.from(document.querySelectorAll('.member-check'));
    selectedIds.clear();
    items.forEach(cb => { cb.checked = allCb.checked; if (allCb.checked) selectedIds.add(cb.value); });
} 
function toggleClubInput() {}
function confirmTransfer() {
    const targetClubInput = document.querySelector('#modal-transfer input[type=\"text\"]') || document.getElementById('transfer-target-club');
    const targetClub = targetClubInput ? targetClubInput.value.trim() : '';
    if (!targetClub) { alert('请输入目标俱乐部'); return; }
    if (selectedIds.size === 0) { alert('请先选择会员'); return; }
    const roleMapInv = { root: 'ultimate_admin', platform_admin: 'super_admin', club_admin: 'club_admin', member: 'member' };
    const myRole = roleMapInv[currentUser.role] || 'member';
    const myClub = currentUser.clubName || currentUser.club || '';
    fetch('/api/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), targetClub, role: myRole, myClub })
    })
    .then(res => res.json())
    .then(data => {
        if (!data.success) throw new Error(data.message||'转会失败');
        alert('转会成功');
        closeModal('modal-transfer');
        renderAdminTable('ALL');
    })
    .catch(err => alert('转会失败：' + err.message));
}
function deleteBatch() { alert("⚠️ 危险操作：批量删除请在后端启用接口权限"); }
function exportSelected() { 
    if (membersData.length === 0) { alert('暂无数据'); return; }
    const selected = membersData.filter(u => selectedIds.has(u._id));
    const rows = (selected.length>0 ? selected : membersData);
    const headers = ['姓名','性别','俱乐部','手机号','身份证','学校','班级','家长微信'];
    const toRow = u => [u.childName||'',u.gender||'',u.clubLocation||'',u.parentPhone||'',u.childIDCard||'',u.school||'',u.gradeClass||'',u.parentWeChat||''].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',');
    const csv = [headers.join(','), ...rows.map(toRow)].join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-club-members.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
