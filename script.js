// =======================================================
// AI Club 前端逻辑 v3.0 - 旗舰版
// 核心升级：使用 FormData 技术，支持同时发送文本和照片文件
// =======================================================

document.getElementById('joinForm').addEventListener('submit', async function(event) {
    event.preventDefault(); // 1. 阻止表单默认的刷新跳转行为

    // 2. 获取提交按钮，准备改变它的状态
    const submitBtn = document.querySelector('.submit-btn');
    const originalBtnText = submitBtn.innerText;

    // 3. 变成“正在提交...”状态，防止家长重复点击
    submitBtn.disabled = true;
    submitBtn.innerText = '⏳ 正在上传中，请稍候...';
    submitBtn.style.backgroundColor = '#ccc';

    try {
        // --- ★★★ 核心变化点开始 ★★★ ---
        
        // 以前我们是自己拼 JSON 对象，现在我们直接打包整个表单！
        // FormData 是浏览器专门用来处理文件上传的神器
        const formElement = document.getElementById('joinForm');
        const formData = new FormData(formElement);

        // 发送请求给后端
        const response = await fetch('http://localhost:3000/api/join', {
            method: 'POST',
            // 注意：这里千万【不要】手动设置 'Content-Type': 'application/json'
            // 浏览器会自动识别 FormData，并设置正确的 Multipart 格式和边界
            body: formData 
        });

        // --- ★★★ 核心变化点结束 ★★★ ---

        const result = await response.json();

        if (response.ok) {
            // 成功：弹出漂亮的提示
            alert('🎉 ' + result.message);
            // 重置表单
            formElement.reset();
        } else {
            // 失败 (比如身份证重复)：弹出红色警告
            alert('❌ ' + result.message);
        }

    } catch (error) {
        console.error('网络错误:', error);
        alert('❌ 网络连接失败，请检查服务器是否启动。');
    } finally {
        // 4. 无论成功失败，都要把按钮变回去，让用户能再次操作
        submitBtn.disabled = false;
        submitBtn.innerText = originalBtnText;
        submitBtn.style.backgroundColor = '#2563eb'; // 恢复原来的蓝色
    }
});