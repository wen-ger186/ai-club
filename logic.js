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
    const loginBtn = document.querySelector('button'); 
    if(loginBtn) { loginBtn.innerText = "登录中..."; loginBtn.disabled = true; }

    try {
        const userQuery = new AV.Query('ClubUser');
        userQuery.equalTo('username', userIn);
        userQuery.equalTo('password', passIn);
        const userFound = await userQuery.first();

        if (!userFound) throw new Error("账号或密码错误");

        // 判断角色
        const role = userFound.get('role');
        let targetUser = null;

        if (['root', 'platform_admin', 'club_admin'].includes(role)) {
            // 管理员直接登录
            targetUser = {
                name: userFound.get('displayName') || '管理员',
                username: userIn, 
                role: role, 
                clubName: userFound.get('clubName') || ''
            };
        } else {
            // 会员：查档案
            const memberQuery = new AV.Query('ClubMember');
            memberQuery.equalTo('parentPhone', userIn);
            const members = await memberQuery.find();
            
            if (members.length === 0) {
                targetUser = { name: '新会员', role: 'member', club: '待分配', phone: userIn };
            } else if (members.length === 1) {
                targetUser = members[0].toJSON();
            } else {
                let msg = "请选择登录身份：\n";
                members.forEach((m, i) => msg += `${i+1}. ${m.get('name')}\n`);
                const idx = parseInt(prompt(msg, "1")) - 1;
                if (members[idx]) targetUser = members[idx].toJSON();
            }
        }

        if (targetUser) {
            localStorage.setItem('currentUser', JSON.stringify(targetUser));
            window.location.href = "dashboard.html"; // 👉 登录成功直接去后台
        }
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

    let list = profileDatabase;
    
    // 过滤
    if (filterClub !== 'ALL') {
        list = list.filter(p => p.club === filterClub);
    }

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 20px; color:#999;">暂无数据</td></tr>';
        return;
    }

    list.forEach(p => {
        const tr = document.createElement('tr');
        const canEdit = getRoleLevel(currentUser.role) > 0; // 只要是管理员就能点管理
        
        let clubTag = p.club;
        if(p.club === '待分配') clubTag = '<span style="color:red; font-weight:bold;">⚠️ 待分配</span>';

        let btns = canEdit ? `<button onclick="editUser('${p.phone}')" class="btn-xs">管理</button>` : '';

        tr.innerHTML = `
            <td><input type="checkbox" class="member-check" value="${p.phone}"></td>
            <td><img src="${p.photo||''}" style="width:36px;height:36px;border-radius:50%;background:#eee;"></td>
            <td>${btns}</td>
            <td><strong>${p.name}</strong></td>
            <td>${clubTag}</td>
            <td>${p.gender}</td>
            <td>${p.phone}</td>
            <td>${p.school}</td>
        `;
        tbody.appendChild(tr);
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
    const name = document.getElementById('j-name').value;
    const phone = document.getElementById('j-phone').value;
    
    // 模拟注册
    profileDatabase.push({
        name: name, phone: phone, 
        club: '待分配', // 👈 关键
        role: 'member',
        school: document.getElementById('j-school').value
    });
    userDatabase.push({ username: phone, password: phone.substr(-4), role: 'member' });
    
    saveAllData();
    alert("报名成功！请等待分配。");
    window.location.href = "login.html";
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
function toggleSelectAll() {} 
function toggleClubInput() {}
function confirmTransfer() { alert("演示：已转移选中会员"); closeModal('modal-transfer'); }
function deleteBatch() { alert("⚠️ 危险操作：批量删除 (仅老板可用)"); }
function exportSelected() { alert("导出Excel报表"); }