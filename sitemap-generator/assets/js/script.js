/**
 * SitemapGenerator - サイトマップ生成ツール
 * URLからサイトマップを自動生成
 */

// DOM要素の参照
const elements = {
  form: document.getElementById('generateForm'),
  urlInput: document.getElementById('urlInput'),
  generateBtn: document.getElementById('generateBtn'),
  maxDepth: document.getElementById('maxDepth'),
  maxPages: document.getElementById('maxPages'),
  includeImages: document.getElementById('includeImages'),
  loadingState: document.getElementById('loadingState'),
  loadingText: document.querySelector('#loadingState .loading-text'),
  errorState: document.getElementById('errorState'),
  errorMessage: document.getElementById('errorMessage'),
  retryBtn: document.getElementById('retryBtn'),
  resultsSection: document.getElementById('resultsSection'),
  progressFill: document.getElementById('progressFill'),
  progressText: document.getElementById('progressText'),
  progressUrl: document.getElementById('progressUrl'),
  cancelBtn: document.getElementById('cancelBtn'),
  totalPages: document.getElementById('totalPages'),
  totalImages: document.getElementById('totalImages'),
  totalLinks: document.getElementById('totalLinks'),
  generationTime: document.getElementById('generationTime'),
  downloadXmlBtn: document.getElementById('downloadXmlBtn'),
  downloadTxtBtn: document.getElementById('downloadTxtBtn'),
  copyXmlBtn: document.getElementById('copyXmlBtn'),
  treeContainer: document.getElementById('treeContainer'),
  listContainer: document.getElementById('listContainer'),
  xmlCode: document.getElementById('xmlCode'),
  tabBtns: document.querySelectorAll('.tab-btn'),
  previewPanels: document.querySelectorAll('.preview-panel')
};

// 状態管理
let sitemapData = {
  pages: [],
  images: [],
  links: [],
  baseUrl: '',
  startTime: null
};

// キャンセルフラグ
let isCancelled = false;

// プロキシAPI（CORS回避用）
const PROXY_URLS = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest='
];

/**
 * タイムアウト付きfetch
 */
async function fetchWithTimeout(url, timeout = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/html'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('タイムアウト: リクエストが30秒以内に完了しませんでした');
    }
    throw error;
  }
}

/**
 * プロキシ経由でURLを取得
 */
async function fetchWithProxy(url) {
  let lastError = null;
  
  for (const proxy of PROXY_URLS) {
    try {
      const proxyUrl = proxy + encodeURIComponent(url);
      const response = await fetchWithTimeout(proxyUrl, 30000);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const html = await response.text();
      
      // HTMLかどうかを簡易チェック
      if (html.includes('<!DOCTYPE') || html.includes('<html') || html.includes('<head') || html.trim().length > 0) {
        return html;
      }
      
      throw new Error('有効なHTMLが取得できませんでした');
    } catch (error) {
      lastError = error;
      console.warn(`プロキシ ${proxy} でエラー:`, error.message);
      continue;
    }
  }
  
  throw new Error(lastError?.message || 'すべてのプロキシでHTMLの取得に失敗しました。サイトがアクセス可能か確認してください。');
}

/**
 * URLを正規化
 */
function normalizeUrl(url, baseUrl) {
  try {
    // 空のURLや無効なURLをスキップ
    if (!url || url.trim() === '' || url === '#' || url.startsWith('javascript:') || url.startsWith('mailto:')) {
      return null;
    }
    
    // 既に完全なURLの場合はそのまま
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const urlObj = new URL(url);
      urlObj.hash = '';
      return urlObj.href;
    }
    
    // プロトコル相対URL
    if (url.startsWith('//')) {
      url = 'https:' + url;
      const urlObj = new URL(url);
      urlObj.hash = '';
      return urlObj.href;
    }
    
    // 絶対パス
    if (url.startsWith('/')) {
      const base = new URL(baseUrl);
      url = base.origin + url;
      const urlObj = new URL(url);
      urlObj.hash = '';
      return urlObj.href;
    }
    
    // 相対パス
    const base = new URL(baseUrl);
    // baseUrlがディレクトリでない場合は、最後のパスを削除
    if (!base.pathname.endsWith('/')) {
      base.pathname = base.pathname.substring(0, base.pathname.lastIndexOf('/') + 1);
    }
    url = new URL(url, base.href).href;
    const urlObj = new URL(url);
    urlObj.hash = '';
    return urlObj.href;
  } catch (error) {
    console.warn(`URL正規化エラー: ${url}`, error);
    return null;
  }
}

/**
 * 同じドメインかチェック
 */
function isSameDomain(url1, url2) {
  try {
    const domain1 = new URL(url1).hostname;
    const domain2 = new URL(url2).hostname;
    return domain1 === domain2;
  } catch (error) {
    return false;
  }
}

/**
 * HTMLからリンクを抽出
 */
function extractLinks(html, baseUrl) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const links = [];
  const images = [];
  
  try {
    // aタグからリンクを抽出
    const anchorTags = doc.querySelectorAll('a[href]');
    anchorTags.forEach(anchor => {
      const href = anchor.getAttribute('href');
      if (href) {
        const normalizedUrl = normalizeUrl(href, baseUrl);
        if (normalizedUrl && isSameDomain(normalizedUrl, baseUrl)) {
          links.push(normalizedUrl);
        }
      }
    });
    
    // imgタグから画像を抽出
    const imgTags = doc.querySelectorAll('img[src]');
    imgTags.forEach(img => {
      const src = img.getAttribute('src');
      if (src) {
        const normalizedUrl = normalizeUrl(src, baseUrl);
        if (normalizedUrl) {
          images.push({
            url: normalizedUrl,
            alt: img.getAttribute('alt') || '',
            title: img.getAttribute('title') || ''
          });
        }
      }
    });
  } catch (error) {
    console.warn('リンク抽出エラー:', error);
  }
  
  return { links: [...new Set(links)], images };
}

/**
 * ページをクローリング
 */
async function crawlPage(url, depth, maxDepth, maxPages, visited, allImages) {
  // キャンセルチェック
  if (isCancelled) {
    throw new Error('処理がキャンセルされました');
  }
  
  if (depth > maxDepth || visited.size >= maxPages) {
    return;
  }
  
  if (visited.has(url)) {
    return;
  }
  
  visited.add(url);
  updateProgress(visited.size, maxPages, url);
  
  try {
    let html;
    try {
      html = await fetchWithProxy(url);
    } catch (fetchError) {
      // タイムアウトやネットワークエラーの場合は、ページを追加して続行
      console.warn(`Failed to fetch ${url}:`, fetchError.message);
      if (!sitemapData.pages.some(p => p.url === url)) {
        sitemapData.pages.push({
          url: url,
          depth: depth,
          lastmod: new Date().toISOString().split('T')[0],
          changefreq: 'weekly',
          priority: depth === 0 ? '1.0' : Math.max(0.1, (1.0 - depth * 0.1).toFixed(1))
        });
      }
      return; // このページはスキップして続行
    }
    
    // キャンセルチェック
    if (isCancelled) {
      throw new Error('処理がキャンセルされました');
    }
    
    // HTMLが空の場合はスキップ
    if (!html || html.trim().length === 0) {
      console.warn(`Empty HTML for ${url}`);
      return;
    }
    
    const { links, images } = extractLinks(html, url);
    
    // ページ情報を保存
    sitemapData.pages.push({
      url: url,
      depth: depth,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: depth === 0 ? '1.0' : Math.max(0.1, (1.0 - depth * 0.1).toFixed(1))
    });
    
    // 画像を保存
    if (elements.includeImages.checked) {
      images.forEach(img => {
        if (!allImages.some(existing => existing.url === img.url)) {
          allImages.push(img);
        }
      });
    }
    
    // 子ページを再帰的にクローリング
    if (depth < maxDepth && links.length > 0 && !isCancelled) {
      for (const link of links) {
        if (isCancelled || visited.size >= maxPages) break;
        if (!visited.has(link) && isSameDomain(link, url)) {
          // レート制限を最適化（深度が浅いほど短く）
          const delay = depth === 0 ? 400 : depth === 1 ? 600 : 800;
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // キャンセルチェック
          if (isCancelled) {
            throw new Error('処理がキャンセルされました');
          }
          
          try {
            await crawlPage(link, depth + 1, maxDepth, maxPages, visited, allImages);
          } catch (crawlError) {
            // キャンセルされた場合は再スロー
            if (crawlError.message === '処理がキャンセルされました') {
              throw crawlError;
            }
            // その他のエラーはログに記録して続行
            console.warn(`Error crawling ${link}:`, crawlError.message);
          }
        }
      }
    }
  } catch (error) {
    // キャンセルされた場合は再スロー
    if (error.message === '処理がキャンセルされました') {
      throw error;
    }
    console.error(`Error crawling ${url}:`, error);
    // エラーが発生してもページは追加（部分的に成功）
    // ただし、タイムアウトエラーの場合は既に追加されている可能性がある
    if (!sitemapData.pages.some(p => p.url === url)) {
      sitemapData.pages.push({
        url: url,
        depth: depth,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: depth === 0 ? '1.0' : Math.max(0.1, (1.0 - depth * 0.1).toFixed(1))
      });
    }
  }
}

/**
 * プログレスバーを更新
 */
function updateProgress(current, total, currentUrl = '') {
  const percentage = Math.min((current / total) * 100, 100);
  elements.progressFill.style.width = `${percentage}%`;
  elements.progressText.textContent = `${current} / ${total} ページ`;
  if (currentUrl && elements.progressUrl) {
    elements.progressUrl.textContent = `処理中: ${currentUrl}`;
  }
}

/**
 * サイトマップXMLを生成
 */
function generateSitemapXml() {
  const baseUrl = sitemapData.baseUrl;
  const pages = sitemapData.pages;
  const images = sitemapData.images;
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
  
  if (images.length > 0) {
    xml += ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"';
  }
  
  xml += '>\n';
  
  pages.forEach(page => {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(page.url)}</loc>\n`;
    xml += `    <lastmod>${page.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    
    // 画像を含める（同じドメインの画像のみ）
    if (images.length > 0) {
      const pageImages = images.filter(img => {
        try {
          return isSameDomain(img.url, page.url);
        } catch {
          return false;
        }
      });
      
      pageImages.forEach(img => {
        xml += '    <image:image>\n';
        xml += `      <image:loc>${escapeXml(img.url)}</image:loc>\n`;
        if (img.alt) {
          xml += `      <image:title>${escapeXml(img.alt)}</image:title>\n`;
        }
        if (img.title) {
          xml += `      <image:caption>${escapeXml(img.title)}</image:caption>\n`;
        }
        xml += '    </image:image>\n';
      });
    }
    
    xml += '  </url>\n';
  });
  
  xml += '</urlset>';
  
  return xml;
}

/**
 * XMLエスケープ
 */
function escapeXml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 結果を表示
 */
function displayResults() {
  const pages = sitemapData.pages;
  const images = sitemapData.images;
  const endTime = Date.now();
  const duration = ((endTime - sitemapData.startTime) / 1000).toFixed(1);
  
  // サマリーを更新
  elements.totalPages.textContent = pages.length;
  elements.totalImages.textContent = images.length;
  // リンク数は実際のリンク数ではなく、ページ間の接続数を表示
  const uniqueLinks = new Set();
  pages.forEach(page => {
    uniqueLinks.add(page.url);
  });
  elements.totalLinks.textContent = uniqueLinks.size;
  elements.generationTime.textContent = `${duration}s`;
  
  // XMLを生成
  const xml = generateSitemapXml();
  elements.xmlCode.querySelector('code').textContent = xml;
  
  // ツリービューを生成
  displayTreeView(pages);
  
  // リストビューを生成
  displayListView(pages);
  
  // 結果セクションを表示
  elements.resultsSection.classList.remove('hidden');
  elements.loadingState.classList.add('hidden');
}

/**
 * ツリービューを表示
 */
function displayTreeView(pages) {
  const container = elements.treeContainer;
  container.innerHTML = '';
  
  // 階層ごとにグループ化
  const pagesByDepth = {};
  pages.forEach(page => {
    if (!pagesByDepth[page.depth]) {
      pagesByDepth[page.depth] = [];
    }
    pagesByDepth[page.depth].push(page);
  });
  
  // 階層ごとに表示
  Object.keys(pagesByDepth).sort((a, b) => parseInt(a) - parseInt(b)).forEach(depth => {
    pagesByDepth[depth].forEach(page => {
      const item = document.createElement('div');
      item.className = 'tree-item';
      
      const link = document.createElement('a');
      link.href = page.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'tree-link';
      link.innerHTML = `<span class="tree-icon">${depth === '0' ? '🏠' : '📄'}</span> ${page.url}`;
      
      item.appendChild(link);
      container.appendChild(item);
    });
  });
}

/**
 * リストビューを表示
 */
function displayListView(pages) {
  const container = elements.listContainer;
  container.innerHTML = '';
  
  pages.forEach(page => {
    const item = document.createElement('div');
    item.className = 'list-item';
    
    const urlDiv = document.createElement('div');
    urlDiv.className = 'list-url';
    const link = document.createElement('a');
    link.href = page.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = page.url;
    urlDiv.appendChild(link);
    
    const badge = document.createElement('span');
    badge.className = 'list-badge';
    badge.textContent = `深度: ${page.depth}`;
    
    item.appendChild(urlDiv);
    item.appendChild(badge);
    container.appendChild(item);
  });
}

/**
 * XMLをダウンロード
 */
function downloadXml() {
  const xml = generateSitemapXml();
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sitemap.xml';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * テキスト形式でダウンロード
 */
function downloadTxt() {
  const pages = sitemapData.pages;
  const text = pages.map(page => page.url).join('\n');
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sitemap.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * XMLをクリップボードにコピー
 */
async function copyXml() {
  const xml = generateSitemapXml();
  try {
    await navigator.clipboard.writeText(xml);
    const btn = elements.copyXmlBtn;
    const originalText = btn.querySelector('.btn-text').textContent;
    btn.querySelector('.btn-text').textContent = 'コピーしました！';
    setTimeout(() => {
      btn.querySelector('.btn-text').textContent = originalText;
    }, 2000);
  } catch (error) {
    alert('コピーに失敗しました');
  }
}

/**
 * タブ切り替え
 */
function switchTab(tabName) {
  elements.tabBtns.forEach(btn => {
    if (btn.dataset.tab === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  elements.previewPanels.forEach(panel => {
    if (panel.id === `${tabName}Preview`) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });
}

/**
 * エラーを表示
 */
function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorState.classList.remove('hidden');
  elements.loadingState.classList.add('hidden');
  elements.resultsSection.classList.add('hidden');
}

/**
 * 初期化
 */
function init() {
  // フォーム送信イベント
  elements.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const url = elements.urlInput.value.trim();
    if (!url) {
      showError('URLを入力してください');
      return;
    }
    
    // URLの基本バリデーション
    let normalizedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      normalizedUrl = 'https://' + url;
    }
    
    try {
      // URLが有効かチェック
      new URL(normalizedUrl);
    } catch (error) {
      showError('有効なURLを入力してください');
      return;
    }
    
    // 状態をリセット
    isCancelled = false;
    sitemapData = {
      pages: [],
      images: [],
      links: [],
      baseUrl: normalizedUrl,
      startTime: Date.now()
    };
    
    // UIを更新
    elements.loadingState.classList.remove('hidden');
    elements.errorState.classList.add('hidden');
    elements.resultsSection.classList.add('hidden');
    elements.generateBtn.disabled = true;
    elements.cancelBtn.classList.remove('hidden');
    elements.progressFill.style.width = '0%';
    elements.progressText.textContent = '0 / 0 ページ';
    if (elements.progressUrl) {
      elements.progressUrl.textContent = '';
    }
    
    try {
      
      const maxDepth = parseInt(elements.maxDepth.value) || 2;
      const maxPages = parseInt(elements.maxPages.value) || 100;
      const visited = new Set();
      const allImages = [];
      
      // クローリング開始
      if (elements.loadingText) {
        elements.loadingText.textContent = 'ページを取得中...';
      }
      
      try {
        await crawlPage(normalizedUrl, 0, maxDepth, maxPages, visited, allImages);
      } catch (crawlError) {
        console.error('クローリングエラー:', crawlError);
        // キャンセルされた場合は特別処理
        if (crawlError.message === '処理がキャンセルされました') {
          throw crawlError;
        }
        // その他のエラーは続行（部分的に成功している可能性がある）
      }
      
      sitemapData.images = allImages;
      
      // ページが1つも取得できなかった場合
      if (sitemapData.pages.length === 0) {
        throw new Error('ページを取得できませんでした。URLが正しいか、サイトがアクセス可能か確認してください。タイムアウトが発生している可能性があります。');
      }
      
      // 結果を表示
      displayResults();
    } catch (error) {
      console.error('Error:', error);
      if (error.message === '処理がキャンセルされました') {
        if (sitemapData.pages.length > 0) {
          // 部分的に取得できた場合は結果を表示
          sitemapData.images = allImages;
          displayResults();
        } else {
          showError('処理がキャンセルされました');
        }
      } else {
        // エラーメッセージを改善
        let errorMsg = error.message || 'サイトマップの生成に失敗しました';
        if (errorMsg.includes('タイムアウト')) {
          errorMsg += ' プロキシサーバーへの接続に時間がかかりすぎています。しばらく待ってから再試行してください。';
        }
        showError(errorMsg);
      }
    } finally {
      elements.generateBtn.disabled = false;
      if (elements.cancelBtn) {
        elements.cancelBtn.classList.add('hidden');
        elements.cancelBtn.disabled = false;
        elements.cancelBtn.textContent = 'キャンセル';
      }
      if (elements.progressUrl) {
        elements.progressUrl.textContent = '';
      }
    }
  });
  
  // 再試行ボタン
  elements.retryBtn.addEventListener('click', () => {
    elements.form.dispatchEvent(new Event('submit'));
  });
  
  // ダウンロードボタン
  elements.downloadXmlBtn.addEventListener('click', downloadXml);
  elements.downloadTxtBtn.addEventListener('click', downloadTxt);
  elements.copyXmlBtn.addEventListener('click', copyXml);
  
  // タブ切り替え
  elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });
  
  // キャンセルボタン
  if (elements.cancelBtn) {
    elements.cancelBtn.addEventListener('click', () => {
      if (confirm('処理をキャンセルしますか？取得済みのページがあれば結果を表示します。')) {
        isCancelled = true;
        elements.cancelBtn.disabled = true;
        elements.cancelBtn.textContent = 'キャンセル中...';
        if (elements.loadingText) {
          elements.loadingText.textContent = 'キャンセル中...';
        }
      }
    });
  }
}

// 初期化実行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
