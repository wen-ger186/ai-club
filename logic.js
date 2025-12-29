var APP_ID=(window.LC_CONFIG&&window.LC_CONFIG.APP_ID)||"H5n4qmS6PtlQ622uTrphucD9-MdYXbMMI";
var APP_KEY=(window.LC_CONFIG&&window.LC_CONFIG.APP_KEY)||"WIqoGPzreBxRfzrMPAudP4ll";
var SERVER_URL=(window.LC_CONFIG&&window.LC_CONFIG.SERVER_URL)||"https://h5n4qms6.api.lncldglobal.com";
AV.init({appId:APP_ID,appKey:APP_KEY,serverURL:SERVER_URL});

var currentUser=null;

// 登录函数
function doLogin() {
  var username = document.getElementById('login-username').value.trim();
  var password = document.getElementById('login-password').value.trim();
  var errorElement = document.getElementById('login-error');
  
  // 隐藏错误信息
  if (errorElement) errorElement.style.display = 'none';
  
  // 验证输入
  if (!username || !password) {
    showLoginError('请输入账号和密码');
    return;
  }
  
  // 显示加载状态
  var loginBtn = document.getElementById('btn-login');
  if (loginBtn) {
    loginBtn.disabled = true;
    loginBtn.textContent = '登录中...';
  }
  
  // 调用 LeanCloud 登录
  AV.User.logIn(username, password).then(function(user) {
    // 登录成功
    var userData = {
      id: user.id,
      username: user.getUsername(),
      name: user.get('displayName') || user.getUsername(),
      role: user.get('roleLevel') >= 2 ? 'platform_admin' : (user.get('roleLevel') === 1 ? 'club_admin' : 'member'),
      roleLevel: user.get('roleLevel') || 0,
      clubName: user.get('club') || ''
    };
    
    // 保存用户信息到本地存储
    localStorage.setItem('currentUser', JSON.stringify(userData));
    currentUser = userData;
    
    // 跳转到管理后台
    window.location.href = 'dashboard.html';
    
  }).catch(function(error) {
    // 登录失败
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.textContent = '登录';
    }
    
    if (error.code === 211) {
      showLoginError('用户不存在');
    } else if (error.code === 210) {
      showLoginError('密码错误');
    } else {
      showLoginError('登录失败: ' + error.message);
    }
  });
}

function showLoginError(message) {
  var errorElement = document.getElementById('login-error');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }
}
var membersCache=[];
var selectedIds=new Set();
var editingMemberId=null;

document.addEventListener('DOMContentLoaded',function(){
  // 强制核对 LeanCloud 会话，清理旧数据冲突
  var leanCloudUser = AV.User.current();
  var savedLocalUser = localStorage.getItem('currentUser');
  
  if (leanCloudUser) {
    // 有 LeanCloud 用户：以 LeanCloud 为准，忽略/覆盖本地旧数据
    var userData = {
      id: leanCloudUser.id,
      username: leanCloudUser.getUsername(),
      name: leanCloudUser.get('displayName') || leanCloudUser.getUsername(),
      role: leanCloudUser.get('roleLevel') >= 2 ? 'platform_admin' : (leanCloudUser.get('roleLevel') === 1 ? 'club_admin' : 'member'),
      roleLevel: leanCloudUser.get('roleLevel') || 0,
      clubName: leanCloudUser.get('club') || ''
    };
    
    // 更新本地存储
    localStorage.setItem('currentUser', JSON.stringify(userData));
    currentUser = userData;
    
  } else if (savedLocalUser) {
    // 没有 LeanCloud 用户但有本地数据：清理所有旧缓存
    console.log('检测到旧版本地数据，执行数据清洗...');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('members');
    localStorage.removeItem('clubs');
    localStorage.removeItem('admins');
    // 清理其他可能的旧数据键
    Object.keys(localStorage).forEach(function(key) {
      if (key.includes('member') || key.includes('club') || key.includes('admin') || key.includes('user')) {
        localStorage.removeItem(key);
      }
    });
    
    currentUser = null;
    alert('检测到旧版数据，已自动清理。请重新登录。');
    if (window.isDashboardPage) {
      window.location.href = 'login.html';
      return;
    }
  }
  
  if(window.isDashboardPage){
    if(!currentUser){alert("请先登录");window.location.href="login.html";return}
    initDashboard();
  }else{
    if(currentUser){updateNavbarState(true)}else{updateNavbarState(false)}
    initHamburger();initBanner();
  }
});

function updateNavbarState(a){
  var b=document.getElementById('guest-menu');
  var c=document.getElementById('member-menu');
  var d=document.getElementById('guest-btns');
  var e=document.getElementById('member-btns');
  if(a){if(b)b.classList.add('hidden');if(d)d.classList.add('hidden');if(c)c.classList.remove('hidden');if(e){e.classList.remove('hidden');document.getElementById('nav-user-name').innerText="Hi, "+currentUser.name}}
  else{if(c)c.classList.add('hidden');if(e)e.classList.add('hidden');if(b)b.classList.remove('hidden');if(d)d.classList.remove('hidden')}
}

function initHamburger(){
  var a=document.getElementById('hamburger');
  var b=document.querySelector('.nav-menu');
  if(!a||!b)return;
  a.addEventListener('click',function(){b.classList.toggle('active');a.classList.toggle('active')});
  document.querySelectorAll('.nav-links a').forEach(function(c){c.addEventListener('click',function(){b.classList.remove('active');a.classList.remove('active')})})
}

function initBanner(){
  var a=document.getElementById('banner');if(!a)return;
  var b=a.querySelector('.banner-track');
  var c=Array.from(a.querySelectorAll('.slide'));
  var d=Array.from(a.querySelectorAll('.dot'));
  var e=a.querySelector('.banner-prev');
  var f=a.querySelector('.banner-next');
  var g=0;var h=null;
  function i(){b.style.transform="translateX(-"+g*100+"%)";d.forEach(function(k,l){k.classList.toggle('active',l===g)})}
  function j(k){g=(k+c.length)%c.length;i()}
  function m(){n();h=setInterval(function(){j(g+1)},5000)}
  function n(){if(h){clearInterval(h);h=null}}
  e.addEventListener('click',function(){j(g-1);m()});
  f.addEventListener('click',function(){j(g+1);m()});
  d.forEach(function(k){k.addEventListener('click',function(){j(parseInt(k.dataset.index));m()})});
  a.addEventListener('mouseenter',n);
  a.addEventListener('mouseleave',m);
  i();m();
}

function getRoleLevel(a){if(a==='root')return 3;if(a==='platform_admin')return 2;if(a==='club_admin')return 1;return 0}
function getCurrentRole(){return currentUser&&currentUser.role?currentUser.role:'member'}
function getCurrentClub(){return currentUser&&currentUser.clubName?currentUser.clubName:(currentUser&&currentUser.club?currentUser.club:'')}

function switchTab(a){
  ['tab-members','tab-org','tab-club-cms','tab-cms'].forEach(function(b){var c=document.getElementById(b);if(c)c.style.display=b===a?'block':'none'});
  
  // 切换到俱乐部内容管理标签时加载俱乐部列表
  if (a === 'tab-club-cms') {
    loadClubCMSList();
  }
  
  applyRoleUI();
}

function initDashboard(){
  document.getElementById('user-display-name').innerText=currentUser.name;
  var a=document.getElementById('identity-role');var lv=getRoleLevel(getCurrentRole());
  if(lv===3){a.innerText="AI-Club 超级管理员"}else if(lv===2){a.innerText="平台管理员"}else if(lv===1){a.innerText="俱乐部管理员"}else{a.innerText="会员"}
  switchTab('tab-members');
  loadClubs();loadMembers();loadAdmins();loadNews();loadSiteSettings();applyRoleUI();
}

function applyRoleUI(){
  var lv=getRoleLevel(getCurrentRole());
  var clubSel=document.getElementById('filter-club');
  var btnAdd=document.getElementById('btn-add-member');
  var btnDel=document.getElementById('btn-batch-delete');
  var btnTrans=document.getElementById('btn-batch-transfer');
  var btnExport=document.getElementById('btn-export');
  if(clubSel){clubSel.disabled=lv===1}
  if(btnAdd){btnAdd.style.display=lv>=1?'inline-block':'none'}
  if(btnDel){btnDel.style.display=lv===3?'inline-block':'none'}
  if(btnTrans){btnTrans.style.display=lv>=2?'inline-block':'none'}
  if(btnExport){btnExport.style.display=lv>=1?'inline-block':'none'}
  var tabOrg=document.querySelector('[data-tab="tab-org"]');if(tabOrg)tabOrg.style.display=lv>=2?'inline-block':'none';
  var tabCms=document.querySelector('[data-tab="tab-cms"]');if(tabCms)tabCms.style.display=lv>=2?'inline-block':'none';
  var roleTypeSelect=document.getElementById('admin-role-type');
  if(roleTypeSelect){
    if(lv===3){
      roleTypeSelect.innerHTML='<option value="">-- 请选择管理员类型 --</option><option value="2">平台管理员 (新增 L2)</option><option value="1">俱乐部管理员 (新增 L1)</option>';
      roleTypeSelect.disabled=false;
      roleTypeSelect.style.border='2px solid #2563eb';
      roleTypeSelect.style.background='#f0f5ff';
    }else{
      roleTypeSelect.innerHTML='<option value="1">俱乐部管理员 (单店店长)</option>';
      roleTypeSelect.disabled=true;
      roleTypeSelect.style.border='1px solid #ccc';
      roleTypeSelect.style.background='#f9f9f9';
    }
  }
}

function loadClubs(){
  var Club=AV.Object.extend('Club');var q=new AV.Query('Club');q.ascending('name');
  q.find().then(function(list){
    var body=document.getElementById('club-list-body');
    if(body){body.innerHTML='';list.forEach(function(o){var tr=document.createElement('tr');tr.innerHTML='<td>'+((o.get('name'))||'')+'</td><td><button class="btn-xs" data-id="'+o.id+'" onclick="editClub(\''+o.id+'\')">修改</button> '+(getRoleLevel(getCurrentRole())===3?'<button class="btn-xs" onclick="deleteClub(\''+o.id+'\')">删除</button>':'')+'</td>';body.appendChild(tr);});}
    var sel=document.getElementById('filter-club');
    if(sel){sel.innerHTML='';if(getRoleLevel(getCurrentRole())>=2){var op=document.createElement('option');op.value='ALL';op.innerText='全部俱乐部';sel.appendChild(op);}list.forEach(function(o){var op=document.createElement('option');op.value=o.get('name');op.innerText=o.get('name');sel.appendChild(op);});}
    var adminClub=document.getElementById('admin-club');
    if(adminClub){adminClub.innerHTML='';list.forEach(function(o){var op=document.createElement('option');op.value=o.get('name');op.innerText=o.get('name');adminClub.appendChild(op);});}
    var mClub=document.getElementById('m-club');
    if(mClub){mClub.innerHTML='';list.forEach(function(o){var op=document.createElement('option');op.value=o.get('name');op.innerText=o.get('name');mClub.appendChild(op);});var opx=document.createElement('option');opx.value='待分配';opx.innerText='待分配';mClub.appendChild(opx);}
    var tClub=document.getElementById('transfer-target-club');
    if(tClub){tClub.innerHTML='';list.forEach(function(o){var op=document.createElement('option');op.value=o.get('name');op.innerText=o.get('name');tClub.appendChild(op);});}
  });
}

function createClub(){
  if(getRoleLevel(getCurrentRole())<2){alert('无权限');return}
  var name=document.getElementById('club-name-input').value.trim();
  if(!name){alert('请输入俱乐部名称');return}
  var Club=AV.Object.extend('Club');var q=new AV.Query('Club');q.equalTo('name',name).first()
    .then(function(ex){if(ex){alert('俱乐部已存在');return}var c=new Club();c.set('name',name);return c.save()})
    .then(function(){document.getElementById('club-name-input').value='';loadClubs()})
    .catch(function(e){alert('失败：'+e.message)})
}

function editClub(id){
  if(getRoleLevel(getCurrentRole())<2){alert('无权限');return}
  var name=prompt('新名称');if(!name)return;
  var q=new AV.Query('Club');q.get(id).then(function(o){o.set('name',name);return o.save()})
    .then(function(){loadClubs()})
    .catch(function(e){alert('失败：'+e.message)})
}

function deleteClub(id){
  if(getRoleLevel(getCurrentRole())<2){alert('无权限');return}
  var q=new AV.Query('Club');q.get(id).then(function(o){return o.destroy()})
    .then(function(){loadClubs()})
    .catch(function(e){alert('失败：'+e.message)})
}

// 删除会员函数
function deleteMember(id) {
  if (!confirm('确定要删除这个会员吗？此操作不可恢复！')) return;
  
  var q = new AV.Query('Member');
  q.get(id).then(function(member) {
    return member.destroy();
  }).then(function() {
    alert('删除成功');
    loadMembers(); // 刷新表格
  }).catch(function(error) {
    alert('删除失败: ' + error.message);
  });
}

function loadMembers(){
  var lv=getRoleLevel(getCurrentRole());
  var myClub=getCurrentClub();
  var name=document.getElementById('filter-name')?document.getElementById('filter-name').value.trim():'';
  var clubSel=document.getElementById('filter-club');
  var club=clubSel&&clubSel.value?clubSel.value:(lv===1?myClub:'ALL');
  var q=new AV.Query('Member');
  if(name){
    var q1=new AV.Query('Member');q1.contains('name',name);
    var q2=new AV.Query('Member');q2.contains('parentPhone',name);
    q=AV.Query.or(q1,q2);
  }
  if(lv===1){q.equalTo('club',myClub)}else{if(club&&club!=='ALL'){q.equalTo('club',club)}}
  q.limit(1000);
  q.find().then(function(list){membersCache=list;renderMembersTable()})
    .catch(function(){var tbody=document.getElementById('member-list-body');if(tbody){tbody.innerHTML='<tr><td colspan="11" style="text-align:center; padding: 20px; color:#999;">加载失败</td></tr>'}})
}

// 加载俱乐部列表
var clubsCache = [];
function loadClubsList() {
  var q = new AV.Query('Club');
  q.limit(100);
  return q.find().then(function(clubs) {
    clubsCache = clubs;
    return clubs;
  });
}

// 更新会员俱乐部
function updateMemberClub(memberId, clubName) {
  var q = new AV.Query('Member');
  q.get(memberId).then(function(member) {
    member.set('club', clubName);
    return member.save();
  }).then(function() {
    alert('更新成功');
    loadMembers(); // 刷新表格
  }).catch(function(error) {
    alert('更新失败: ' + error.message);
  });
}

function renderMembersTable(){
  var tbody=document.getElementById('member-list-body');if(!tbody)return;
  tbody.innerHTML='';
  if(membersCache.length===0){tbody.innerHTML='<tr><td colspan="11" style="text-align:center; padding: 20px; color:#999;">暂无数据</td></tr>';return}
  
  // 确保俱乐部列表已加载
  loadClubsList().then(function() {
    membersCache.forEach(function(o){
      var tr=document.createElement('tr');
      var img=o.get('photoUrl')||'';var id=o.id;
      var btns='<button class="btn-xs" onclick="openMemberModal(\''+id+'\')">编辑</button> <button class="btn-xs btn-danger" onclick="deleteMember(\''+id+'\')">删除</button>';
      
      // 创建俱乐部下拉选择框
      var clubSelect = '<select class="club-select" onchange="updateMemberClub(\''+id+'\', this.value)" style="padding: 4px 8px; border-radius: 4px; border: 1px solid #ddd;">';
      clubSelect += '<option value="">待分配</option>';
      clubsCache.forEach(function(club) {
        var clubName = club.get('name') || '';
        var selected = clubName === o.get('club') ? 'selected' : '';
        clubSelect += '<option value="' + clubName + '" ' + selected + '>' + clubName + '</option>';
      });
      clubSelect += '</select>';
      
      tr.innerHTML='<td><input type="checkbox" class="member-check" value="'+id+'"></td><td><img src="'+img+'" style="width:36px;height:36px;border-radius:50%;background:#eee;"></td><td>'+btns+'</td><td><strong>'+(o.get('name')||'')+'</strong></td><td>'+(o.get('gender')||'')+'</td><td>'+(o.get('idNumber')||'')+'</td><td>'+(o.get('parentPhone')||'')+'</td><td>'+(o.get('school')||'')+'</td><td>'+(o.get('className')||'')+'</td><td>'+clubSelect+'</td><td>'+(o.get('parentWeChat')||'')+'</td>';
      tbody.appendChild(tr);
    });
    
    Array.from(document.querySelectorAll('.member-check')).forEach(function(cb){
      cb.addEventListener('change',function(){var id=cb.value;if(cb.checked)selectedIds.add(id);else selectedIds.delete(id);});
    });
  });
}

function applyMemberFilters(){loadMembers()}

function openMemberModal(id){
  editingMemberId=id||null;
  document.getElementById('modal-member').classList.remove('hidden');
  if(id){
    var q=new AV.Query('Member');q.get(id).then(function(o){
      document.getElementById('m-name').value=o.get('name')||'';
      document.getElementById('m-gender').value=o.get('gender')||'男';
      document.getElementById('m-id').value=o.get('idNumber')||'';
      document.getElementById('m-phone').value=o.get('parentPhone')||'';
      document.getElementById('m-school').value=o.get('school')||'';
      document.getElementById('m-class').value=o.get('className')||'';
      document.getElementById('m-club').value=o.get('club')||'';
      document.getElementById('m-wechat').value=o.get('parentWeChat')||'';
      document.getElementById('m-photo').value=o.get('photoUrl')||'';
    })
  }else{
    document.getElementById('m-name').value='';
    document.getElementById('m-gender').value='男';
    document.getElementById('m-id').value='';
    document.getElementById('m-phone').value='';
    document.getElementById('m-school').value='';
    document.getElementById('m-class').value='';
    document.getElementById('m-club').value=getCurrentClub()||'';
    document.getElementById('m-wechat').value='';
    document.getElementById('m-photo').value='';
  }
}

function submitMember(){
  var lv=getRoleLevel(getCurrentRole());var myClub=getCurrentClub();
  var name=document.getElementById('m-name').value.trim();
  var gender=document.getElementById('m-gender').value;
  var idNum=document.getElementById('m-id').value.trim();
  var phone=document.getElementById('m-phone').value.trim();
  var school=document.getElementById('m-school').value.trim();
  var cls=document.getElementById('m-class').value.trim();
  var club=document.getElementById('m-club').value;
  var wechat=document.getElementById('m-wechat').value.trim();
  var photo=document.getElementById('m-photo').value.trim();
  if(!name||!idNum){alert('姓名和身份证必填');return}
  var q=new AV.Query('Member');q.equalTo('idNumber',idNum).first()
    .then(function(ex){
      if(ex&&ex.id!==editingMemberId){throw new Error('身份证号已存在')}
      if(lv===1&&club!==myClub){throw new Error('无权跨俱乐部操作')}
      if(editingMemberId){
        var q2=new AV.Query('Member');
        return q2.get(editingMemberId).then(function(o){
          o.set('name',name);o.set('gender',gender);o.set('idNumber',idNum);o.set('parentPhone',phone);o.set('school',school);o.set('className',cls);o.set('club',club);o.set('parentWeChat',wechat);o.set('photoUrl',photo);
          return o.save();
        })
      }else{
        var Member=AV.Object.extend('Member');var m=new Member();
        m.set('name',name);m.set('gender',gender);m.set('idNumber',idNum);m.set('parentPhone',phone);m.set('school',school);m.set('className',cls);m.set('club',club||myClub||'');m.set('parentWeChat',wechat);m.set('photoUrl',photo);
        return m.save();
      }
    })
    .then(function(){closeModal('modal-member');loadMembers()})
    .catch(function(e){alert(e.message)})
}

function confirmTransfer(){
  var targetClubInput=document.getElementById('transfer-target-club');
  var targetClub=targetClubInput?targetClubInput.value.trim():'';
  if(!targetClub){alert('请选择目标俱乐部');return}
  if(selectedIds.size===0){alert('请先选择会员');return}
  var level=getRoleLevel(getCurrentRole());
  if(level<2){alert('无权限');return}
  var Member=AV.Object.extend('Member');
  var query=new AV.Query('Member');
  query.containedIn('objectId',Array.from(selectedIds));
  query.find().then(function(list){
    var updates=list.map(function(obj){obj.set('club',targetClub);return obj.save()});
    return Promise.all(updates);
  }).then(function(){
    alert('转会成功');closeModal('modal-transfer');loadMembers();
  }).catch(function(e){alert('转会失败：'+e.message)})
}

function deleteBatch(){
  if(selectedIds.size===0){alert('请先选择会员');return}
  var level=getRoleLevel(getCurrentRole());
  if(level<1){alert('无权限');return}
  var myClub=getCurrentClub();
  var query=new AV.Query('Member');
  query.containedIn('objectId',Array.from(selectedIds));
  query.find().then(function(list){
    var filtered=level===1?list.filter(function(o){return o.get('club')===myClub}):list;
    var dels=filtered.map(function(o){return o.destroy()});
    return Promise.all(dels);
  }).then(function(){alert('删除成功');loadMembers()})
    .catch(function(e){alert('删除失败：'+e.message)})
}

function exportSelected(){
  if(membersCache.length===0&&selectedIds.size===0){alert('暂无数据');return}
  var base=selectedIds.size>0?membersCache.filter(function(m){return selectedIds.has(m.id)}):membersCache;
  var headers=['姓名','性别','身份证号','手机号','学校','班级','俱乐部','家长微信'];
  var toRow=function(u){return [u.get('name')||'',u.get('gender')||'',u.get('idNumber')||'',u.get('parentPhone')||'',u.get('school')||'',u.get('className')||'',u.get('club')||'',u.get('parentWeChat')||''].map(function(v){return "\""+String(v).replace(/"/g,'""')+"\""}).join(',')};
  var csv=[headers.join(','),...base.map(toRow)].join('\n');
  var blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  var link=document.createElement('a');
  link.href=URL.createObjectURL(blob);
  link.download='会员数据.csv';
  link.click();
}

// CSV导入功能
window.saveMemberFromCSV = function(row) {
  return new Promise((resolve, reject) => {
    const lv = getRoleLevel(getCurrentRole());
    const myClub = getCurrentClub();
    
    // 映射CSV字段到数据库字段
    const memberData = {
      name: row.姓名 || '',
      gender: row.性别 || '男',
      idNumber: row.身份证号 || '',
      parentPhone: row.手机号 || '',
      school: row.学校 || '',
      className: row.班级 || '',
      club: row.俱乐部 || (lv === 1 ? myClub : ''),
      parentWeChat: '',
      photoUrl: ''
    };

    // 验证必填字段
    if (!memberData.name || !memberData.idNumber) {
      reject(new Error('姓名或身份证号为空'));
      return;
    }

    // 检查身份证号是否已存在
    const query = new AV.Query('Member');
    query.equalTo('idNumber', memberData.idNumber);
    query.first().then(function(existingMember) {
      if (existingMember) {
        reject(new Error('身份证号已存在'));
        return;
      }

      // 权限检查
      if (lv === 1 && memberData.club !== myClub) {
        reject(new Error('无权跨俱乐部操作'));
        return;
      }

      // 创建新会员
      const Member = AV.Object.extend('Member');
      const newMember = new Member();
      
      Object.keys(memberData).forEach(key => {
        newMember.set(key, memberData[key]);
      });

      return newMember.save();
    }).then(function() {
      resolve();
    }).catch(function(error) {
      reject(error);
    });
  });
};

function createAdmin(){
  var lv=getRoleLevel(getCurrentRole());if(lv<2){alert('无权限');return}
  var username=document.getElementById('admin-username').value.trim();
  var password=document.getElementById('admin-password').value.trim();
  var name=document.getElementById('admin-name').value.trim();
  var roleLevel=parseInt(document.getElementById('admin-role-type').value,10);
  var club=document.getElementById('admin-club').value;
  
  // 权限验证：Level 2 只能创建 Level 1
  if(lv===2&&roleLevel!==1){alert('权限不足：只能创建俱乐部管理员');return}
  if(!username||!password||!name||!roleLevel){alert('请填写完整信息');return}
  
  var user=new AV.User();user.setUsername(username);user.setPassword(password);user.set('displayName',name);user.set('roleLevel',roleLevel);user.set('club',club||'');
  user.signUp().then(function(){
    document.getElementById('admin-username').value='';
    document.getElementById('admin-password').value='';
    document.getElementById('admin-name').value='';
    loadAdmins();
  }).catch(function(e){alert('失败：'+e.message)})
}

function loadAdmins(){
  var lv=getRoleLevel(getCurrentRole());if(lv<2)return;
  var q=new AV.Query('_User');if(lv===2){q.equalTo('roleLevel',1)}
  q.limit(1000);q.find().then(function(list){
    var body=document.getElementById('admin-list-body');if(!body)return;
    body.innerHTML='';
    list.forEach(function(u){
      var tr=document.createElement('tr');
      var rl=u.get('roleLevel');var rlText=rl===3?'超级管理员':(rl===2?'平台管理员':'俱乐部管理员');
      var ops=''; // 彻底移除修改和删除按钮
      tr.innerHTML='<td>'+((u.get('displayName'))||'')+'</td><td>'+((u.get('username'))||'')+'</td><td>'+rlText+'</td><td>'+((u.get('club'))||'')+'</td><td>'+ops+'</td>';
      body.appendChild(tr);
    })
  })
}

function editAdmin(id){
  var lv=getRoleLevel(getCurrentRole());if(lv<2){alert('无权限');return}
  var q=new AV.Query('_User');q.get(id).then(function(u){
    var name=prompt('姓名',u.get('displayName')||'');if(name===null)return;
    var club=prompt('俱乐部',u.get('club')||'');if(club===null)return;
    var rl=u.get('roleLevel');if(lv===2&&rl!==1){alert('平台管理员只能管理俱乐部管理员');return Promise.resolve()}
    u.set('displayName',name);u.set('club',club||'');return u.save()
  }).then(function(){loadAdmins()}).catch(function(e){alert('失败：'+e.message)})
}

function deleteAdmin(id){
  var lv=getRoleLevel(getCurrentRole());if(lv<2){alert('无权限');return}
  var q=new AV.Query('_User');q.get(id).then(function(u){
    var rl=u.get('roleLevel');if(lv===2&&rl!==1){alert('平台管理员只能删除俱乐部管理员');return Promise.resolve()}
    return u.destroy()
  }).then(function(){loadAdmins()}).catch(function(e){alert('失败：'+e.message)})
}

function publishNews(){
  var lv=getRoleLevel(getCurrentRole());if(lv<2){alert('无权限');return}
  var title=document.getElementById('news-title').value.trim();
  var cover=document.getElementById('news-cover').value.trim();
  var content=document.getElementById('news-content').value.trim();
  if(!title||!content){alert('请填写标题和内容');return}
  var News=AV.Object.extend('News');var n=new News();
  n.set('title',title);n.set('coverUrl',cover);n.set('content',content);n.set('publishedAt',new Date());
  n.save().then(function(){
    document.getElementById('news-title').value='';
    document.getElementById('news-cover').value='';
    document.getElementById('news-content').value='';
    loadNews();
  }).catch(function(e){alert('失败：'+e.message)})
}

function loadNews(){
  var lv=getRoleLevel(getCurrentRole());if(lv<2)return;
  var q=new AV.Query('News');q.descending('publishedAt');
  q.find().then(function(list){
    var body=document.getElementById('news-list-body');if(!body)return;
    body.innerHTML='';
    list.forEach(function(n){
      var tr=document.createElement('tr');
      var ops='<button class="btn-xs" onclick="editNews(\''+n.id+'\')">编辑</button> <button class="btn-xs" onclick="deleteNews(\''+n.id+'\')">删除</button>';
      tr.innerHTML='<td>'+((n.get('title'))||'')+'</td><td><img src="'+(n.get('coverUrl')||'')+'" style="width:80px;height:40px;object-fit:cover;background:#eee;"></td><td>'+((n.get('publishedAt'))?new Date(n.get('publishedAt')).toLocaleString():'')+'</td><td>'+ops+'</td>';
      body.appendChild(tr);
    })
  })
}

function editNews(id){
  var lv=getRoleLevel(getCurrentRole());if(lv<2){alert('无权限');return}
  var q=new AV.Query('News');q.get(id).then(function(n){
    var title=prompt('标题',n.get('title')||'');if(title===null)return;
    var cover=prompt('封面链接',n.get('coverUrl')||'');if(cover===null)return;
    var content=prompt('正文',n.get('content')||'');if(content===null)return;
    n.set('title',title);n.set('coverUrl',cover);n.set('content',content);return n.save()
  }).then(function(){loadNews()}).catch(function(e){alert('失败：'+e.message)})
}

function deleteNews(id){
  var lv=getRoleLevel(getCurrentRole());if(lv<2){alert('无权限');return}
  var q=new AV.Query('News');q.get(id).then(function(n){return n.destroy()})
    .then(function(){loadNews()}).catch(function(e){alert('失败：'+e.message)})
}

function loadSiteSettings(){
  var lv=getRoleLevel(getCurrentRole());
  var inputs=['site-logo','site-banner1','site-banner2','site-banner3','site-banner4','site-core-text'];
  if(lv<3){inputs.forEach(function(id){var el=document.getElementById(id);if(el)el.disabled=true})}
  var q=new AV.Query('SiteSettings');q.equalTo('key','global');q.first().then(function(s){
    if(!s)return;
    var data=s.get('data')||{};
    var logo=document.getElementById('site-logo');if(logo)logo.value=data.logoUrl||'';
    var b1=document.getElementById('site-banner1');if(b1)b1.value=(data.banners&&data.banners[0])||'';
    var b2=document.getElementById('site-banner2');if(b2)b2.value=(data.banners&&data.banners[1])||'';
    var b3=document.getElementById('site-banner3');if(b3)b3.value=(data.banners&&data.banners[2])||'';
    var b4=document.getElementById('site-banner4');if(b4)b4.value=(data.banners&&data.banners[3])||'';
    var ct=document.getElementById('site-core-text');if(ct)ct.value=data.coreText||'';
  })
}

function saveSiteSettings(){
  if(getRoleLevel(getCurrentRole())<3){alert('无权限');return}
  var logo=document.getElementById('site-logo').value.trim();
  var b1=document.getElementById('site-banner1').value.trim();
  var b2=document.getElementById('site-banner2').value.trim();
  var b3=document.getElementById('site-banner3').value.trim();
  var b4=document.getElementById('site-banner4').value.trim();
  var ct=document.getElementById('site-core-text').value.trim();
  var q=new AV.Query('SiteSettings');q.equalTo('key','global');q.first().then(function(s){
    if(!s){var S=AV.Object.extend('SiteSettings');s=new S();s.set('key','global')}
    s.set('data',{logoUrl:logo,banners:[b1,b2,b3,b4],coreText:ct});
    return s.save();
  }).then(function(){alert('已保存')}).catch(function(e){alert('失败：'+e.message)})
}

function logoutAction(){localStorage.removeItem('currentUser');window.location.href="index.html"}
function toggleSelectAll(){var a=document.getElementById('select-all');var items=Array.from(document.querySelectorAll('.member-check'));selectedIds.clear();items.forEach(function(cb){cb.checked=a.checked;if(a.checked)selectedIds.add(cb.value)})}
function openTransferModal(){document.getElementById('modal-transfer').classList.remove('hidden')}
function closeModal(id){document.getElementById(id).classList.add('hidden')}

// 俱乐部内容管理功能
function openClubModal(id) {
  document.getElementById('modal-club-cms').classList.remove('hidden');
  document.getElementById('club-cms-id').value = id || '';
  
  if (id) {
    // 编辑模式：加载现有数据
    var q = new AV.Query('Club');
    q.get(id).then(function(club) {
      document.getElementById('club-cms-name').value = club.get('name') || '';
      document.getElementById('club-cms-short').value = club.get('shortDescription') || '';
      document.getElementById('club-cms-detail').value = club.get('detailContent') || '';
      document.getElementById('club-cms-address').value = club.get('address') || '';
      document.getElementById('club-cms-phone').value = club.get('contactPhone') || '';
    }).catch(function(error) {
      alert('加载失败: ' + error.message);
    });
  } else {
    // 新增模式：清空表单
    document.getElementById('club-cms-name').value = '';
    document.getElementById('club-cms-short').value = '';
    document.getElementById('club-cms-detail').value = '';
    document.getElementById('club-cms-address').value = '';
    document.getElementById('club-cms-phone').value = '';
    document.getElementById('club-cms-cover').value = '';
  }
}

function submitClubCMS() {
  var id = document.getElementById('club-cms-id').value;
  var name = document.getElementById('club-cms-name').value.trim();
  var shortDesc = document.getElementById('club-cms-short').value.trim();
  var fileInput = document.getElementById('club-cms-cover');
  
  if (!name) { alert('请输入俱乐部名称'); return; }
  if (!shortDesc) { alert('请输入简短介绍'); return; }
  
  var Club = AV.Object.extend('Club');
  var club;
  
  if (id) {
    // 编辑现有俱乐部
    club = Club.createWithoutData(id);
  } else {
    // 创建新俱乐部
    club = new Club();
  }
  
  club.set('name', name);
  club.set('shortDescription', shortDesc);
  club.set('detailContent', document.getElementById('club-cms-detail').value.trim());
  club.set('address', document.getElementById('club-cms-address').value.trim());
  club.set('contactPhone', document.getElementById('club-cms-phone').value.trim());
  
  // 处理图片上传
  if (fileInput.files.length > 0) {
    var file = fileInput.files[0];
    var avFile = new AV.File(file.name, file);
    
    avFile.save().then(function(savedFile) {
      club.set('coverImage', savedFile);
      return club.save();
    }).then(function() {
      alert('保存成功！');
      closeModal('modal-club-cms');
      loadClubCMSList();
    }).catch(function(error) {
      alert('保存失败: ' + error.message);
    });
  } else {
    // 没有上传新图片，直接保存
    club.save().then(function() {
      alert('保存成功！');
      closeModal('modal-club-cms');
      loadClubCMSList();
    }).catch(function(error) {
      alert('保存失败: ' + error.message);
    });
  }
}

function loadClubCMSList() {
  var q = new AV.Query('Club');
  q.ascending('name');
  q.include('coverImage');
  
  q.find().then(function(clubs) {
    var tbody = document.getElementById('club-cms-list-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (clubs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#999;">暂无俱乐部数据</td></tr>';
      return;
    }
    
    clubs.forEach(function(club) {
      var tr = document.createElement('tr');
      var coverImage = club.get('coverImage');
      var coverHtml = coverImage ? 
        '<img src="' + coverImage.url() + '" style="width:60px; height:40px; object-fit:cover; border-radius:4px;">' : 
        '<div style="width:60px; height:40px; background:#eee; border-radius:4px; display:flex; align-items:center; justify-content:center; color:#999; font-size:12px;">无图</div>';
      
      tr.innerHTML = '<td>' + coverHtml + '</td>' +
        '<td><strong>' + (club.get('name') || '') + '</strong></td>' +
        '<td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + (club.get('shortDescription') || '') + '</td>' +
        '<td style="max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + (club.get('address') || '') + '</td>' +
        '<td>' + (club.get('contactPhone') || '') + '</td>' +
        '<td><button class="btn-xs" onclick="openClubModal(\'' + club.id + '\')">编辑</button> ' +
        (getRoleLevel(getCurrentRole()) === 3 ? '<button class="btn-xs btn-danger" onclick="deleteClubCMS(\'' + club.id + '\')">删除</button>' : '') + '</td>';
      
      tbody.appendChild(tr);
    });
  }).catch(function(error) {
    console.error('加载俱乐部列表失败:', error);
  });
}

function deleteClubCMS(id) {
  if (!confirm('确定要删除这个俱乐部的内容吗？此操作不可恢复！')) return;
  
  var q = new AV.Query('Club');
  q.get(id).then(function(club) {
    return club.destroy();
  }).then(function() {
    alert('删除成功');
    loadClubCMSList();
  }).catch(function(error) {
    alert('删除失败: ' + error.message);
  });
}