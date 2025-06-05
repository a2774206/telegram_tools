let tasks = [];

document.addEventListener('DOMContentLoaded', async () => {
  // 加载任务
  const result = await chrome.storage.local.get('tasks');
  tasks = result.tasks || [];
  renderTasks();
  bindEvents();
  loadContacts();
});

function bindEvents() {
  const taskType = document.getElementById('task-type');
  taskType.addEventListener('change', () => {
    document.getElementById('daily-settings').style.display = taskType.value === 'daily' ? 'block' : 'none';
    document.getElementById('interval-settings').style.display = taskType.value === 'interval' ? 'block' : 'none';
  });

  document.getElementById('add-task').addEventListener('click', addTask);
  //优化折叠
  // document.getElementById('toggle-contact-list').addEventListener('click', () => {
  //   const container = document.getElementById('contact-list-container');
  //   const btn = document.getElementById('toggle-contact-list');
  //   if (container.style.display === 'none') {
  //     container.style.display = 'block';
  //     btn.textContent = '折叠联系人列表 ▲';
  //   } else {
  //     container.style.display = 'none';
  //     btn.textContent = '展示联系人列表 ▼';
  //   }
  // });
}

function addTask() {
  const message = document.getElementById('message').value.trim();
  const type = document.getElementById('task-type').value;
  const target = document.getElementById('target-type').value;
  const time = document.getElementById('daily-time').value;
  const h = +document.getElementById('interval-hours').value || 0;
  const m = +document.getElementById('interval-minutes').value || 0;
  const s = +document.getElementById('interval-seconds').value || 0;
  const filterText = document.getElementById('filter-list').value;
  const filterList = filterText.split('\n').map(t => t.trim()).filter(Boolean);

  if (!message) return alert('请输入消息内容');

  const task = { type, message, target, filterList };

  if (type === 'daily') {
    if (!time) return alert('请选择时间');
    task.time = time;
  } else if (type === 'interval') {
    if (h + m + s === 0) return alert('请输入间隔时间');
    task.interval = { h, m, s };
  }

  tasks.push(task);
  chrome.storage.local.set({ tasks }, () => {
    chrome.runtime.sendMessage({ type: 'setupAlarms' });
    renderTasks();
  });
}

function renderTasks() {
  const taskList = document.getElementById('task-list');
  taskList.innerHTML = '';

  tasks.forEach((task, index) => {
    const li = document.createElement('li');
    li.style.whiteSpace = 'normal';
    li.style.wordBreak = 'break-all';

    const timeDesc = task.type === 'daily'
      ? `每天 ${task.time}`
      : `每隔 ${task.interval.h}小时${task.interval.m}分${task.interval.s || 0}秒`;

    const filters = (task.filterList || []).join('、') || '无';

    li.innerHTML = `
      <div><strong>[${task.type === 'daily' ? '定时' : '间隔'}]</strong> ${timeDesc}</div>
      <div>发送对象：${task.target === 'all' ? '全部' : task.target === 'group' ? '群组' : '个人'}</div>
      <div>消息内容：${task.message}</div>
      <div>过滤名单：${filters}</div>
      <button class="delete-btn" data-index="${index}">删除</button>
    `;
    taskList.appendChild(li);
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const index = parseInt(e.target.dataset.index);
      tasks.splice(index, 1);
      chrome.storage.local.set({ tasks }, () => {
        chrome.runtime.sendMessage({ type: 'setupAlarms' });
        renderTasks();
      });
    });
  });
}

// 异步从 Telegram 页签获取联系人列表
function loadContacts() {
  chrome.tabs.query({ url: '*://web.telegram.org/*' }, (tabs) => {
    if (!tabs.length) return;

    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => {
        // 返回联系人名称和类型
        const listItems = document.querySelectorAll('.ListItem.Chat.chat-item-clickable.has-ripple');
        return Array.from(listItems).map(item => {
          const isGroup = item.classList.contains('group');
          const isPrivate = item.classList.contains('private');
          // 用 h3.fullName 更精准
          const nameEl = item.querySelector('a.ListItem-button h3.fullName');
          const name = nameEl ? nameEl.innerText.trim() : '';
          return { name, type: isGroup ? 'group' : (isPrivate ? 'private' : 'other') };
        }).filter(i => i.name);
      }
    }, (results) => {
      if (!results || !results[0] || !results[0].result) return;
      const contacts = results[0].result;
      renderContacts(contacts);
    });
  });
}

function renderContacts(contacts) {
  const ul = document.getElementById('contact-list');
  ul.innerHTML = '';
  const filterListTextarea = document.getElementById('filter-list');

  contacts.forEach(({ name, type }) => {
    const li = document.createElement('li');
    li.style.marginBottom = '4px';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = name;

    // 如果名字已在过滤名单里则默认选中
    if (filterListTextarea.value.split('\n').map(t => t.trim()).includes(name)) {
      checkbox.checked = true;
    }

    checkbox.addEventListener('change', (e) => {
      const lines = filterListTextarea.value.split('\n').map(t => t.trim()).filter(Boolean);
      if (e.target.checked) {
        if (!lines.includes(name)) {
          lines.push(name);
        }
      } else {
        const idx = lines.indexOf(name);
        if (idx >= 0) lines.splice(idx, 1);
      }
      filterListTextarea.value = lines.join('\n');
    });

    const label = document.createElement('label');
    label.style.userSelect = 'none';
    label.appendChild(checkbox);
    label.append(` ${name} (${type === 'group' ? '群组' : '个人'})`);

    li.appendChild(label);
    ul.appendChild(li);
  });
}
