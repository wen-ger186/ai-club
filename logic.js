// ============================================
// 1. 初始化数据 (四级架构)
// ============================================

// 账号数据库
const defaultUsers = [
    { username: 'root', password: '123', role: 'ultimate_admin', displayName: '终极BOSS' },
    { username: 'admin01', password: '123', role: 'super_admin', displayName: '平台运营01' },
    { username: 'songhu01', password: '123', role: 'club_admin', clubName: '莞-松湖俱乐部', displayName: '松湖管理员' },
    { username: '13800000001', password: '123', role: 'member', displayName: '张小明' }
];

// 档案数据库
const defaultProfiles = [
    { phone: '13800000001', name: '张小明', role: 'member', gender: '男', club: '莞-松湖俱乐部', idcard: '441900201501010001', school: '松山湖实验', gradeClass: '三年2班', parentWeChat: 'zhang_papa' },
    { phone: 'songhu01', name: '松湖管理员', role: 'club_admin', club: '莞-松湖俱乐部', gender: '男', idcard: '000000000000000000' },
    { phone: 'admin01', name: '平台运营01', role: 'super_admin', club: '平台总部', gender: '女', idcard: '000000000000000001' }
];

// 保持使用 v10 数据库，确保和 join.html 通信顺畅
let userDatabase = JSON.parse(localStorage.getItem('db_users_v10')) || defaultUsers;
let profileDatabase = JSON.parse(localStorage.getItem('db_profiles_v10')) || defaultProfiles;

function saveAllData() {
    localStorage.setItem('db_users_v10', JSON.stringify(userDatabase));
    localStorage.setItem('db_profiles_v10', JSON.stringify(profileDatabase));
}
saveAllData();

let currentUser = null;
let tempPhotoBase64 = ""; 
let currentEditingPhone = null;

// ============================================
// 2. 权限判断核心
// ============================================
function getRoleLevel(role) {
    if (role === 'ultimate_admin') return 3;
    if (role === 'super_admin') return 2;
    if (role === 'club_admin') return 1;
    return 0;
}

function canManage(myRole, targetRole) {
    return getRoleLevel(myRole) > getRoleLevel(targetRole);
}

// ============================================
// 3. 登录与主页
// ============================================
function loginAction() {
    const userIn = document.getElementById('login-username').value.trim();
    const passIn = document.getElementById('login-password').value.trim();
    const found = userDatabase.find(u => u.username === userIn && u.password === passIn);

    if (found) {
        currentUser = found;
        document.getElementById('login-error').style.display = 'none';
        initDashboard();
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

function initDashboard() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    document.getElementById('user-display-name').innerText = currentUser.displayName;
    
    const roleBadge = document.getElementById('identity-role');
    const adminPanel = document.getElementById('admin-panel');
    const topTools = document.getElementById('top-admin-tools');
    const profilePanel = document.getElementById('profile-panel');
    const clubBtns = document.getElementById('club-admin-btns');

    adminPanel.style.display = 'none';
    topTools.style.display = 'none';
    profilePanel.style.display = 'none';
    clubBtns.style.display = 'none';

    if (currentUser.role === 'ultimate_admin') {
        roleBadge.innerText = "👑 终极管理员";
        topTools.style.display = 'block';
        document.getElementById('admin-tools-title').innerText = "🛡️ 终极上帝模式";
        adminPanel.style.display = 'block';
        renderAdminTable('ALL');
    }
    else if (currentUser.role === 'super_admin') {
        roleBadge.innerText = "🛡️ 超级管理员";
        topTools.style.display = 'block';
        document.getElementById('admin-tools-title').innerText = "🔧 平台管理台";
        adminPanel.style.display = 'block';
        renderAdminTable('ALL');
    }
    else if (currentUser.role === 'club_admin') {
        roleBadge.innerText = "🏠 " + currentUser.clubName + " 管理员";
        clubBtns.style.display = 'block';
        adminPanel.style.display = 'block';
        renderAdminTable(currentUser.clubName);
    }
    else {
        roleBadge.innerText = "👤 会员";
        profilePanel.style.display = 'block';
        document.getElementById('profile-title').innerText = "我的档案";
        prepareEditForm(currentUser.username);
    }
}

// ============================================
// 4. 表格渲染 (带身份证列)
// ============================================
function renderAdminTable(filterClub) {
    const tbody = document.getElementById('member-list-body');
    tbody.innerHTML = '';

    let list = profileDatabase;
    if (filterClub !== 'ALL') {
        list = list.filter(p => p.club === filterClub);
    }

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;">暂无数据</td></tr>';
        return;
    }

    list.forEach(p => {
        const imgSrc = p.photo ? p.photo : "https://via.placeholder.com/150?text=No+Img";
        const tr = document.createElement('tr');
        
        const hasPermission = canManage(currentUser.role, p.role);

        let btns = '';
        if (hasPermission) {
            btns += `<button class="btn-edit" onclick="editUser('${p.phone}')">编辑</button>`;
        } else {
            btns = '<span style="color:#ccc;font-size:12px;">无权操作</span>';
        }

        tr.innerHTML = `
            <td><input type="checkbox" class="member-check" value="${p.phone}"></td>
            <td><img src="${imgSrc}" class="table-avatar" alt="头像"></td>
            <td>${btns}</td>
            <td style="font-weight:bold;">${p.name}</td>
            <td>${getRoleTag(p.role)}</td>
            <td>${p.gender || '-'}</td>
            <td>${p.phone}</td>
            <td>${p.club}</td>
            <td>${p.idcard || '<span style="color:red">未录入</span>'}</td>
            <td>${p.school || '-'}</td>
            <td>${p.gradeClass || '-'}</td>
            <td>${p.parentWeChat || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

function getRoleTag(role) {
    const map = {
        'ultimate_admin': '<span style="background:#fadb14;padding:2px 5px;border-radius:3px;">👑 终极</span>',
        'super_admin': '<span style="background:#69c0ff;padding:2px 5px;border-radius:3px;color:white;">🛡️ 超级</span>',
        'club_admin': '<span style="background:#95de64;padding:2px 5px;border-radius:3px;">🏠 管理</span>',
        'member': '<span style="color:#999;">会员</span>'
    };
    return map[role] || role;
}

// ============================================
// 5. 编辑与保存 (恢复查重逻辑)
// ============================================
function editUser(phone) {
    document.getElementById('admin-panel').style.display = 'none';
    document.getElementById('top-admin-tools').style.display = 'none';
    document.getElementById('profile-panel').style.display = 'block';
    document.getElementById('club-admin-btns').style.display = 'none';
    document.getElementById('profile-title').innerText = "编辑档案";
    
    prepareEditForm(phone);
}

function prepareEditForm(phone) {
    currentEditingPhone = phone;
    let profile = profileDatabase.find(p => p.phone === phone);
    if (!profile) {
        const u = userDatabase.find(x => x.username === phone);
        profile = { phone: phone, name: u?u.displayName:'', role: u?u.role:'member', club: u?u.clubName:'', photo: '' };
    }

    document.getElementById('p-name').value = profile.name || '';
    document.getElementById('p-phone').value = profile.phone || '';
    document.getElementById('p-password').value = '';
    document.getElementById('p-gender').value = profile.gender || '男';
    document.getElementById('p-club-select').value = profile.club || '莞-松湖俱乐部';
    // 恢复身份证的读取
    document.getElementById('p-idcard').value = profile.idcard || ''; 
    document.getElementById('p-school').value = profile.school || '';
    document.getElementById('p-class').value = profile.gradeClass || '';
    document.getElementById('p-wechat').value = profile.parentWeChat || '';
    document.getElementById('p-role').value = profile.role || 'member';

    if (profile.photo) {
        document.getElementById('p-photo-preview').src = profile.photo;
        tempPhotoBase64 = profile.photo;
    } else {
        document.getElementById('p-photo-preview').src = "https://via.placeholder.com/150?text=No+Photo";
        tempPhotoBase64 = "";
    }

    const isBigBoss = (currentUser.role === 'ultimate_admin' || currentUser.role === 'super_admin');
    document.getElementById('p-club-select').disabled = !isBigBoss;
    document.getElementById('p-phone').disabled = !isBigBoss;
}

function saveProfileData() {
    const oldPhone = currentEditingPhone;
    const newPhone = document.getElementById('p-phone').value.trim();
    const newName = document.getElementById('p-name').value.trim();
    const newID = document.getElementById('p-idcard').value.trim(); // 获取输入的身份证
    const newPass = document.getElementById('p-password').value.trim();
    const newClub = document.getElementById('p-club-select').value;
    const role = document.getElementById('p-role').value;

    if (!newPhone || !newName) return alert("账号和姓名必填");
    if (!newID) return alert("身份证号必须填写！"); // 必填校验

    // === 关键：后台编辑时的查重逻辑 ===
    // 寻找数据库里有没有“不是我本人”，但是“身份证号和我一样”的人
    const duplicate = profileDatabase.find(p => p.idcard === newID && p.phone !== oldPhone);
    if (duplicate) {
        return alert(`错误：身份证号 ${newID} 已被成员【${duplicate.name}】使用！不能重复。`);
    }

    const newProfile = {
        phone: newPhone, name: newName, role: role, gender: document.getElementById('p-gender').value,
        club: newClub, 
        idcard: newID, // 保存身份证
        school: document.getElementById('p-school').value, gradeClass: document.getElementById('p-class').value,
        parentWeChat: document.getElementById('p-wechat').value, photo: tempPhotoBase64
    };

    let pIdx = profileDatabase.findIndex(p => p.phone === oldPhone);
    if (pIdx !== -1) profileDatabase[pIdx] = newProfile;
    else profileDatabase.push(newProfile);

    let uIdx = userDatabase.findIndex(u => u.username === oldPhone);
    if (uIdx !== -1) {
        userDatabase[uIdx].username = newPhone;
        userDatabase[uIdx].displayName = newName;
        userDatabase[uIdx].clubName = newClub;
        if (newPass) userDatabase[uIdx].password = newPass;
    }

    saveAllData();
    alert("保存成功");
    if (currentUser.role !== 'member') closeDetailView();
}

// 批量删除
function deleteBatch() {
    const cbs = document.querySelectorAll('.member-check:checked');
    if (cbs.length===0) return alert("请选择要删除的人员");
    if(!confirm(`确定要删除选中的 ${cbs.length} 人吗？`)) return;
    
    cbs.forEach(cb => {
        const phone = cb.value;
        const target = profileDatabase.find(p => p.phone === phone);
        if (target && canManage(currentUser.role, target.role)) {
            profileDatabase = profileDatabase.filter(p => p.phone !== phone);
            userDatabase = userDatabase.filter(u => u.username !== phone);
        }
    });
    saveAllData();
    alert("删除完成");
    const filter = (currentUser.role === 'club_admin') ? currentUser.clubName : 'ALL';
    renderAdminTable(filter);
}

// ... (以下弹窗和辅助函数不变，不需要修改) ...
// 弹窗功能
function openAddAdminModal() { document.getElementById('modal-add-admin').style.display = 'flex'; }
function openTransferModal() { document.getElementById('modal-transfer').style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function toggleClubSelect(role) { document.getElementById('div-new-admin-club').style.display = (role === 'club_admin') ? 'block' : 'none'; }
function confirmAddAdmin() {
    const user = document.getElementById('new-admin-user').value.trim();
    const pass = document.getElementById('new-admin-pass').value.trim();
    const name = document.getElementById('new-admin-name').value.trim();
    const role = document.getElementById('new-admin-role').value;
    const club = document.getElementById('new-admin-club').value;
    if (!user || !pass || !name) return alert("信息不全");
    if (role === 'ultimate_admin') return alert("禁止创建终极管理员");
    userDatabase.push({ username: user, password: pass, role: role, displayName: name, clubName: club });
    profileDatabase.push({ phone: user, name: name, role: role, club: club, photo: '', idcard: '' }); // 初始空身份证
    saveAllData();
    alert("新增成功");
    closeModal('modal-add-admin');
    renderAdminTable('ALL');
}
function confirmTransfer() {
    const targetClub = document.getElementById('transfer-target-club').value;
    const cbs = document.querySelectorAll('.member-check:checked');
    cbs.forEach(cb => {
        const p = profileDatabase.find(x => x.phone === cb.value);
        if (p && canManage(currentUser.role, p.role)) {
            p.club = targetClub;
            const u = userDatabase.find(x => x.username === cb.value);
            if (u) u.clubName = targetClub;
        }
    });
    saveAllData();
    alert("转会完成");
    closeModal('modal-transfer');
    renderAdminTable('ALL');
}
function previewImage(input) {
    if (input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function (e) { document.getElementById('p-photo-preview').src = e.target.result; tempPhotoBase64 = e.target.result; };
        reader.readAsDataURL(input.files[0]);
    }
}
function closeDetailView() { document.getElementById('profile-panel').style.display = 'none'; initDashboard(); }
function toggleSelectAll() { const all = document.getElementById('select-all').checked; document.querySelectorAll('.member-check').forEach(c => c.checked = all); }
function exportSelected() {
    const cbs = document.querySelectorAll('.member-check:checked');
    if (cbs.length===0) return alert("请选择");
    const ids = Array.from(cbs).map(c => c.value);
    const targets = profileDatabase.filter(p => ids.includes(p.phone));
    let csv = "\ufeff姓名,角色,俱乐部,手机,身份证\n";
    targets.forEach(p => { csv += `${p.name},${p.role},${p.club},${p.phone},'\t${p.idcard}\n`; });
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "export.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
function logoutAction() { currentUser = null; location.reload(); }
document.getElementById('login-password').addEventListener('keyup', (e)=>{if(e.key==='Enter') loginAction();});