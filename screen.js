// 测试 观察效果便于改进
// screen.js

const uploadUrl = 'http://38.55.129.207:3000/upload'; // 你的服务器接口地址


export async function captureAndUpload() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      console.log('没找到活动标签页');
      return;
    }

    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });

    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.log('上传失败:', text);
    } else {
      console.log('截图上传成功');
    }
  } catch (err) {
    console.log('截图或上传出错:', err);
  }
}
