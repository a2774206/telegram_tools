(function() {
  // 获取当前页面的 URL
  const currentUrl = window.location.href;

  // 检查 URL 是否包含 '/k/'，如果是就替换为 '/a/'
  if (currentUrl.includes('https://web.telegram.org/k/')) {
    const newUrl = currentUrl.replace('/k/', '/a/');
    // 修改浏览器地址栏的 URL
    // window.history.replaceState(null, '', newUrl);
	window.location.href= newUrl;
   
  }
})();