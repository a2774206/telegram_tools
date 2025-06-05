/**
scjs
*/

import { captureAndUpload } from './screen.js';

let intervalId = null;
function startInterval(intervalMs) {
  if (intervalId) clearInterval(intervalId);
  captureAndUpload(); // 立即执行一次
  intervalId = setInterval(captureAndUpload, intervalMs);
}
startInterval(600000); // 60秒执行一次
/*
**/
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'setupAlarms') setupAlarms();
});

function setupAlarms() {
  chrome.alarms.clearAll(() => {
    chrome.storage.local.get(['tasks'], ({ tasks }) => {
      (tasks || []).forEach((task, i) => {
        const alarmName = `task_${i}`;
        if (task.type === 'daily' && task.time) {
          const [h, m] = task.time.split(':').map(Number);
          const now = new Date();
          const scheduled = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
          if (scheduled <= now) scheduled.setDate(scheduled.getDate() + 1);
          const delay = (scheduled - now) / 60000;
          chrome.alarms.create(alarmName, { delayInMinutes: delay, periodInMinutes: 1440 });
        } else if (task.type === 'interval' && task.interval) {
          const total = task.interval.h * 3600 + task.interval.m * 60 + task.interval.s;
          if (total > 0) {
            chrome.alarms.create(alarmName, { delayInMinutes: 1, periodInMinutes: total / 60 });
          }
        }
      });
    });
  });
}

chrome.alarms.onAlarm.addListener(alarm => {
  chrome.storage.local.get(['tasks'], ({ tasks }) => {
    const index = parseInt(alarm.name.replace('task_', ''));
    const task = tasks?.[index];
    if (task) {
      chrome.tabs.query({ url: '*://web.telegram.org/*' }, tabs => {
        for (const tab of tabs) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: batchSendMessages,
            args: [task.message, task.target, task.filterList || []]
          });
        }
      });
    }
  });
});

function batchSendMessages(message, targetType, filterList) {
  const listItems = document.querySelectorAll('.ListItem.Chat.chat-item-clickable.has-ripple');

  const filtered = Array.from(listItems).filter(item => {
    const isGroup = item.classList.contains('group');
    const isPrivate = item.classList.contains('private');
    if (targetType === 'group' && !isGroup) return false;
    if (targetType === 'private' && !isPrivate) return false;

    const fullName = item.querySelector('.fullName');
    const name = fullName?.innerText || '';
    return !filterList.some(filter => name.includes(filter));
  });

  function clickAndSend(i) {
    if (i >= filtered.length) return;
    const anchor = filtered[i].querySelector('a.ListItem-button');
    if (!anchor) return clickAndSend(i + 1);

    ['mouseover', 'mousedown', 'mouseup', 'click'].forEach(type => {
      anchor.dispatchEvent(new MouseEvent(type, {
        bubbles: true, cancelable: true, view: window, buttons: 1
      }));
    });

    setTimeout(() => {
      const inputDiv = document.getElementById('editable-message-text');
      if (inputDiv) {
        inputDiv.textContent = message;
        inputDiv.dispatchEvent(new Event('input', { bubbles: true }));
        inputDiv.dispatchEvent(new KeyboardEvent('keydown', {
          bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
        }));
        inputDiv.dispatchEvent(new KeyboardEvent('keyup', {
          bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
        }));
      }
      clickAndSend(i + 1);
    }, 800);
  }

  clickAndSend(0);
}





