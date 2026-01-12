/**
 * MetaScope - メタタグプレビューツール
 * URL入力からメタタグを分析し、各プラットフォームでの表示をプレビュー
 */

// CORSプロキシのリスト（フォールバック用）
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest='
];

// 推奨文字数の定義
const CHAR_LIMITS = {
  title: { min: 30, max: 60, name: 'タイトル' },
  description: { min: 120, max: 160, name: 'ディスクリプション' },
  ogTitle: { min: 30, max: 60, name: 'OGタイトル' },
  ogDescription: { min: 55, max: 200, name: 'OGディスクリプション' },
  twitterTitle: { min: 30, max: 70, name: 'Twitterタイトル' },
  twitterDescription: { min: 55, max: 200, name: 'Twitterディスクリプション' }
};

// 必須メタタグの定義
const REQUIRED_TAGS = [
  { key: 'title', name: 'title', type: 'basic', priority: 'high' },
  { key: 'description', name: 'meta description', type: 'basic', priority: 'high' },
  { key: 'viewport', name: 'viewport', type: 'basic', priority: 'medium' },
  { key: 'ogTitle', name: 'og:title', type: 'og', priority: 'high' },
  { key: 'ogDescription', name: 'og:description', type: 'og', priority: 'high' },
  { key: 'ogImage', name: 'og:image', type: 'og', priority: 'high' },
  { key: 'ogUrl', name: 'og:url', type: 'og', priority: 'medium' },
  { key: 'ogType', name: 'og:type', type: 'og', priority: 'low' },
  { key: 'ogSiteName', name: 'og:site_name', type: 'og', priority: 'low' },
  { key: 'twitterCard', name: 'twitter:card', type: 'twitter', priority: 'high' },
  { key: 'twitterTitle', name: 'twitter:title', type: 'twitter', priority: 'medium' },
  { key: 'twitterDescription', name: 'twitter:description', type: 'twitter', priority: 'medium' },
  { key: 'twitterImage', name: 'twitter:image', type: 'twitter', priority: 'medium' }
];

// DOM要素の参照
const elements = {
  form: document.getElementById('analyzeForm'),
  urlInput: document.getElementById('urlInput'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  loadingState: document.getElementById('loadingState'),
  errorState: document.getElementById('errorState'),
  errorMessage: document.getElementById('errorMessage'),
  retryBtn: document.getElementById('retryBtn'),
  resultsSection: document.getElementById('resultsSection'),
  // サマリー
  totalScore: document.getElementById('totalScore'),
  warningsCount: document.getElementById('warningsCount'),
  missingCount: document.getElementById('missingCount'),
  passedCount: document.getElementById('passedCount'),
  // プレビュー
  tabBtns: document.querySelectorAll('.tab-btn'),
  previewPanels: document.querySelectorAll('.preview-panel'),
  // Google
  googleFavicon: document.getElementById('googleFavicon'),
  googleUrl: document.getElementById('googleUrl'),
  googleTitle: document.getElementById('googleTitle'),
  googleDescription: document.getElementById('googleDescription'),
  // Facebook
  ogImage: document.getElementById('ogImage'),
  ogImagePlaceholder: document.getElementById('ogImagePlaceholder'),
  ogSiteName: document.getElementById('ogSiteName'),
  ogTitle: document.getElementById('ogTitle'),
  ogDescription: document.getElementById('ogDescription'),
  // Twitter
  twitterCard: document.getElementById('twitterCard'),
  twitterImage: document.getElementById('twitterImage'),
  twitterImagePlaceholder: document.getElementById('twitterImagePlaceholder'),
  twitterTitle: document.getElementById('twitterTitle'),
  twitterDescription: document.getElementById('twitterDescription'),
  twitterDomain: document.getElementById('twitterDomain'),
  // メタタグ詳細
  basicMetaTags: document.getElementById('basicMetaTags'),
  ogMetaTags: document.getElementById('ogMetaTags'),
  twitterMetaTags: document.getElementById('twitterMetaTags'),
  // 改善提案
  suggestionsList: document.getElementById('suggestionsList')
};

// メタタグデータの保存用
let metaData = {};
let analyzedUrl = '';

/**
 * 初期化
 */
function init() {
  // フォーム送信イベント
  elements.form.addEventListener('submit', handleSubmit);
  
  // 再試行ボタン
  elements.retryBtn.addEventListener('click', () => {
    hideError();
    handleAnalyze(analyzedUrl);
  });
  
  // タブ切り替え
  elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => handleTabChange(btn));
  });
}

/**
 * フォーム送信ハンドラ
 */
async function handleSubmit(e) {
  e.preventDefault();
  const url = elements.urlInput.value.trim();
  
  if (!isValidUrl(url)) {
    showError('有効なURLを入力してください（https:// または http:// で始まる必要があります）');
    return;
  }
  
  analyzedUrl = url;
  await handleAnalyze(url);
}

/**
 * URL検証
 */
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

/**
 * 分析処理
 */
async function handleAnalyze(url) {
  showLoading();
  hideError();
  hideResults();
  
  try {
    const html = await fetchHtml(url);
    metaData = parseMetaTags(html, url);
    updatePreviews();
    updateMetaTagDetails();
    updateSuggestions();
    updateSummary();
    showResults();
  } catch (error) {
    console.error('分析エラー:', error);
    showError(error.message || 'URLの取得に失敗しました。URLが正しいか、サイトがアクセス可能か確認してください。');
  } finally {
    hideLoading();
  }
}

/**
 * CORSプロキシを使用してHTMLを取得
 */
async function fetchHtml(url) {
  let lastError = null;
  
  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = proxy + encodeURIComponent(url);
      const response = await fetch(proxyUrl, {
        headers: {
          'Accept': 'text/html'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const html = await response.text();
      
      // HTMLかどうかを簡易チェック
      if (html.includes('<!DOCTYPE') || html.includes('<html') || html.includes('<head')) {
        return html;
      }
      
      throw new Error('有効なHTMLが取得できませんでした');
    } catch (error) {
      lastError = error;
      console.warn(`プロキシ ${proxy} でエラー:`, error.message);
      continue;
    }
  }
  
  throw new Error('すべてのプロキシでHTMLの取得に失敗しました。サイトがアクセス可能か確認してください。');
}

/**
 * HTMLからメタタグを抽出
 */
function parseMetaTags(html, url) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const urlObj = new URL(url);
  
  // 基本情報
  const data = {
    url: url,
    domain: urlObj.hostname,
    favicon: `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`,
    
    // 基本メタタグ
    title: getTextContent(doc, 'title'),
    description: getMetaContent(doc, 'description'),
    viewport: getMetaContent(doc, 'viewport'),
    charset: getCharset(doc),
    canonical: getCanonical(doc),
    robots: getMetaContent(doc, 'robots'),
    author: getMetaContent(doc, 'author'),
    keywords: getMetaContent(doc, 'keywords'),
    
    // OGPタグ
    ogTitle: getMetaProperty(doc, 'og:title'),
    ogDescription: getMetaProperty(doc, 'og:description'),
    ogImage: getMetaProperty(doc, 'og:image'),
    ogUrl: getMetaProperty(doc, 'og:url'),
    ogType: getMetaProperty(doc, 'og:type'),
    ogSiteName: getMetaProperty(doc, 'og:site_name'),
    ogLocale: getMetaProperty(doc, 'og:locale'),
    ogImageWidth: getMetaProperty(doc, 'og:image:width'),
    ogImageHeight: getMetaProperty(doc, 'og:image:height'),
    ogImageAlt: getMetaProperty(doc, 'og:image:alt'),
    
    // Twitterカード
    twitterCard: getMetaName(doc, 'twitter:card'),
    twitterSite: getMetaName(doc, 'twitter:site'),
    twitterCreator: getMetaName(doc, 'twitter:creator'),
    twitterTitle: getMetaName(doc, 'twitter:title'),
    twitterDescription: getMetaName(doc, 'twitter:description'),
    twitterImage: getMetaName(doc, 'twitter:image'),
    twitterImageAlt: getMetaName(doc, 'twitter:image:alt')
  };
  
  // 相対パスを絶対パスに変換
  if (data.ogImage && !data.ogImage.startsWith('http')) {
    data.ogImage = new URL(data.ogImage, url).href;
  }
  if (data.twitterImage && !data.twitterImage.startsWith('http')) {
    data.twitterImage = new URL(data.twitterImage, url).href;
  }
  
  return data;
}

/**
 * ヘルパー関数: テキストコンテンツを取得
 */
function getTextContent(doc, selector) {
  const el = doc.querySelector(selector);
  return el ? el.textContent.trim() : '';
}

/**
 * ヘルパー関数: meta[name]のcontentを取得
 */
function getMetaContent(doc, name) {
  const el = doc.querySelector(`meta[name="${name}"]`) || 
             doc.querySelector(`meta[name="${name.toLowerCase()}"]`);
  return el ? el.getAttribute('content') || '' : '';
}

/**
 * ヘルパー関数: meta[property]のcontentを取得
 */
function getMetaProperty(doc, property) {
  const el = doc.querySelector(`meta[property="${property}"]`);
  return el ? el.getAttribute('content') || '' : '';
}

/**
 * ヘルパー関数: meta[name]のcontentを取得（Twitter用）
 */
function getMetaName(doc, name) {
  const el = doc.querySelector(`meta[name="${name}"]`) ||
             doc.querySelector(`meta[property="${name}"]`);
  return el ? el.getAttribute('content') || '' : '';
}

/**
 * ヘルパー関数: charsetを取得
 */
function getCharset(doc) {
  const el = doc.querySelector('meta[charset]');
  if (el) return el.getAttribute('charset');
  
  const contentType = doc.querySelector('meta[http-equiv="Content-Type"]');
  if (contentType) {
    const match = contentType.getAttribute('content')?.match(/charset=([^;]+)/i);
    return match ? match[1] : '';
  }
  return '';
}

/**
 * ヘルパー関数: canonicalを取得
 */
function getCanonical(doc) {
  const el = doc.querySelector('link[rel="canonical"]');
  return el ? el.getAttribute('href') || '' : '';
}

/**
 * プレビューを更新
 */
function updatePreviews() {
  // Google検索結果
  elements.googleFavicon.src = metaData.favicon;
  elements.googleUrl.textContent = metaData.domain;
  elements.googleTitle.textContent = metaData.title || metaData.ogTitle || 'タイトルなし';
  elements.googleDescription.textContent = metaData.description || metaData.ogDescription || 'ディスクリプションなし';
  
  // Facebook/OGP
  const ogImageUrl = metaData.ogImage;
  if (ogImageUrl) {
    elements.ogImage.src = ogImageUrl;
    elements.ogImage.style.display = 'block';
    elements.ogImagePlaceholder.classList.add('hidden');
    elements.ogImage.onerror = () => {
      elements.ogImage.style.display = 'none';
      elements.ogImagePlaceholder.classList.remove('hidden');
    };
  } else {
    elements.ogImage.style.display = 'none';
    elements.ogImagePlaceholder.classList.remove('hidden');
  }
  elements.ogSiteName.textContent = metaData.ogSiteName || metaData.domain;
  elements.ogTitle.textContent = metaData.ogTitle || metaData.title || 'タイトルなし';
  elements.ogDescription.textContent = metaData.ogDescription || metaData.description || '';
  
  // Twitter(X)
  const twitterImageUrl = metaData.twitterImage || metaData.ogImage;
  const twitterCardType = metaData.twitterCard || 'summary';
  
  // カードタイプに応じてレイアウトを変更
  elements.twitterCard.className = 'twitter-card ' + (twitterCardType === 'summary' ? 'summary' : '');
  
  if (twitterImageUrl) {
    elements.twitterImage.src = twitterImageUrl;
    elements.twitterImage.style.display = 'block';
    elements.twitterImagePlaceholder.classList.add('hidden');
    elements.twitterImage.onerror = () => {
      elements.twitterImage.style.display = 'none';
      elements.twitterImagePlaceholder.classList.remove('hidden');
    };
  } else {
    elements.twitterImage.style.display = 'none';
    elements.twitterImagePlaceholder.classList.remove('hidden');
  }
  elements.twitterTitle.textContent = metaData.twitterTitle || metaData.ogTitle || metaData.title || 'タイトルなし';
  elements.twitterDescription.textContent = metaData.twitterDescription || metaData.ogDescription || metaData.description || '';
  elements.twitterDomain.textContent = metaData.domain;
}

/**
 * メタタグ詳細を更新
 */
function updateMetaTagDetails() {
  // 基本メタタグ
  const basicTags = [
    { name: 'title', value: metaData.title, limit: CHAR_LIMITS.title },
    { name: 'description', value: metaData.description, limit: CHAR_LIMITS.description },
    { name: 'viewport', value: metaData.viewport },
    { name: 'charset', value: metaData.charset },
    { name: 'canonical', value: metaData.canonical },
    { name: 'robots', value: metaData.robots },
    { name: 'author', value: metaData.author },
    { name: 'keywords', value: metaData.keywords }
  ];
  elements.basicMetaTags.innerHTML = basicTags.map(tag => createTagItem(tag)).join('');
  
  // OGPタグ
  const ogTags = [
    { name: 'og:title', value: metaData.ogTitle, limit: CHAR_LIMITS.ogTitle },
    { name: 'og:description', value: metaData.ogDescription, limit: CHAR_LIMITS.ogDescription },
    { name: 'og:image', value: metaData.ogImage },
    { name: 'og:url', value: metaData.ogUrl },
    { name: 'og:type', value: metaData.ogType },
    { name: 'og:site_name', value: metaData.ogSiteName },
    { name: 'og:locale', value: metaData.ogLocale },
    { name: 'og:image:width', value: metaData.ogImageWidth },
    { name: 'og:image:height', value: metaData.ogImageHeight },
    { name: 'og:image:alt', value: metaData.ogImageAlt }
  ];
  elements.ogMetaTags.innerHTML = ogTags.map(tag => createTagItem(tag)).join('');
  
  // Twitterカードタグ
  const twitterTags = [
    { name: 'twitter:card', value: metaData.twitterCard },
    { name: 'twitter:site', value: metaData.twitterSite },
    { name: 'twitter:creator', value: metaData.twitterCreator },
    { name: 'twitter:title', value: metaData.twitterTitle, limit: CHAR_LIMITS.twitterTitle },
    { name: 'twitter:description', value: metaData.twitterDescription, limit: CHAR_LIMITS.twitterDescription },
    { name: 'twitter:image', value: metaData.twitterImage },
    { name: 'twitter:image:alt', value: metaData.twitterImageAlt }
  ];
  elements.twitterMetaTags.innerHTML = twitterTags.map(tag => createTagItem(tag)).join('');
}

/**
 * タグアイテムのHTMLを生成
 */
function createTagItem(tag) {
  const hasValue = tag.value && tag.value.trim() !== '';
  const charCount = hasValue ? tag.value.length : 0;
  let status = 'ok';
  let statusText = '✓ 設定済み';
  let charCountClass = '';
  let charCountText = '';
  
  if (!hasValue) {
    status = 'missing';
    statusText = '未設定';
  } else if (tag.limit) {
    if (charCount < tag.limit.min) {
      status = 'warning';
      statusText = `⚠ 短すぎます（推奨: ${tag.limit.min}文字以上）`;
    } else if (charCount > tag.limit.max) {
      status = 'error';
      statusText = `✗ 長すぎます（推奨: ${tag.limit.max}文字以下）`;
      charCountClass = 'over-limit';
    }
    charCountText = `${charCount} / ${tag.limit.min}-${tag.limit.max}文字`;
  }
  
  const displayValue = hasValue ? escapeHtml(tag.value) : '（未設定）';
  const valueClass = hasValue ? '' : 'missing-value';
  
  return `
    <div class="tag-item status-${status}">
      <div class="tag-header">
        <span class="tag-name">${escapeHtml(tag.name)}</span>
        <span class="tag-status ${status}">${statusText}</span>
      </div>
      <div class="tag-content">
        <div class="tag-value ${valueClass}">${displayValue}</div>
        ${tag.limit && hasValue ? `
          <div class="tag-info">
            <span class="char-count ${charCountClass}">${charCountText}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * 改善提案を更新
 */
function updateSuggestions() {
  const suggestions = [];
  
  // 必須タグのチェック
  REQUIRED_TAGS.forEach(tag => {
    const value = metaData[tag.key];
    if (!value || value.trim() === '') {
      suggestions.push({
        priority: tag.priority,
        title: `${tag.name} が設定されていません`,
        description: getSuggestionDescription(tag.key),
        code: getSuggestionCode(tag.key)
      });
    }
  });
  
  // 文字数チェック
  Object.entries(CHAR_LIMITS).forEach(([key, limit]) => {
    const value = metaData[key];
    if (value) {
      if (value.length < limit.min) {
        suggestions.push({
          priority: 'medium',
          title: `${limit.name} が短すぎます`,
          description: `現在 ${value.length} 文字です。${limit.min}〜${limit.max}文字が推奨されます。短すぎると検索結果やSNSでの表示が不十分になる可能性があります。`,
          code: null
        });
      } else if (value.length > limit.max) {
        suggestions.push({
          priority: 'medium',
          title: `${limit.name} が長すぎます`,
          description: `現在 ${value.length} 文字です。${limit.max}文字を超えると、検索結果やSNSで途中で切れて表示される可能性があります。`,
          code: null
        });
      }
    }
  });
  
  // OG画像サイズの提案
  if (metaData.ogImage && (!metaData.ogImageWidth || !metaData.ogImageHeight)) {
    suggestions.push({
      priority: 'low',
      title: 'OG画像のサイズ指定がありません',
      description: 'og:image:width と og:image:height を指定すると、SNSでの表示が最適化されます。推奨サイズ: 1200×630ピクセル',
      code: `<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">`
    });
  }
  
  // og:image:altの提案
  if (metaData.ogImage && !metaData.ogImageAlt) {
    suggestions.push({
      priority: 'low',
      title: 'OG画像の代替テキストがありません',
      description: 'og:image:alt を設定すると、アクセシビリティが向上します。',
      code: `<meta property="og:image:alt" content="画像の説明をここに記述">`
    });
  }
  
  // Twitter画像の代替テキスト
  if ((metaData.twitterImage || metaData.ogImage) && !metaData.twitterImageAlt) {
    suggestions.push({
      priority: 'low',
      title: 'Twitter画像の代替テキストがありません',
      description: 'twitter:image:alt を設定すると、アクセシビリティが向上します。',
      code: `<meta name="twitter:image:alt" content="画像の説明をここに記述">`
    });
  }
  
  // canonicalの確認
  if (!metaData.canonical) {
    suggestions.push({
      priority: 'medium',
      title: 'canonical URLが設定されていません',
      description: '重複コンテンツの問題を防ぐため、canonical URLの設定を推奨します。',
      code: `<link rel="canonical" href="${metaData.url}">`
    });
  }
  
  // 結果を表示
  if (suggestions.length === 0) {
    elements.suggestionsList.innerHTML = `
      <div class="no-suggestions">
        <div class="no-suggestions-icon">🎉</div>
        <p>すべてのメタタグが適切に設定されています！</p>
      </div>
    `;
  } else {
    // 優先度でソート
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    
    elements.suggestionsList.innerHTML = suggestions.map(suggestion => `
      <div class="suggestion-item priority-${suggestion.priority}">
        <div class="suggestion-icon">${getPriorityIcon(suggestion.priority)}</div>
        <div class="suggestion-content">
          <h4 class="suggestion-title">${escapeHtml(suggestion.title)}</h4>
          <p class="suggestion-description">${escapeHtml(suggestion.description)}</p>
          ${suggestion.code ? `<pre class="suggestion-code">${escapeHtml(suggestion.code)}</pre>` : ''}
        </div>
      </div>
    `).join('');
  }
}

/**
 * 提案の説明を取得
 */
function getSuggestionDescription(key) {
  const descriptions = {
    title: 'ページタイトルは検索結果やブラウザタブに表示される重要な要素です。30〜60文字が推奨されます。',
    description: 'メタディスクリプションは検索結果に表示され、クリック率に大きく影響します。120〜160文字が推奨されます。',
    viewport: 'viewport meta タグはモバイル対応に必須です。レスポンシブデザインには必ず設定してください。',
    ogTitle: 'OGタイトルはFacebookなどのSNSでシェアされた際に表示されます。',
    ogDescription: 'OGディスクリプションはSNSでシェアされた際の説明文として表示されます。',
    ogImage: 'OG画像はSNSでシェアされた際のサムネイルとして表示されます。1200×630ピクセルが推奨されます。',
    ogUrl: 'OG URLはシェアされたコンテンツの正規URLを指定します。',
    ogType: 'OGタイプはコンテンツの種類（website, article など）を指定します。',
    ogSiteName: 'OGサイト名はサイトのブランド名として表示されます。',
    twitterCard: 'Twitter Cardタイプは必須です。summary または summary_large_image を推奨します。',
    twitterTitle: 'Twitterでシェアされた際のタイトルです。未設定の場合はog:titleが使用されます。',
    twitterDescription: 'Twitterでシェアされた際の説明文です。未設定の場合はog:descriptionが使用されます。',
    twitterImage: 'Twitterでシェアされた際のサムネイル画像です。未設定の場合はog:imageが使用されます。'
  };
  return descriptions[key] || 'このメタタグの設定を推奨します。';
}

/**
 * 提案のコードサンプルを取得
 */
function getSuggestionCode(key) {
  const codes = {
    title: '<title>ページタイトル - サイト名</title>',
    description: '<meta name="description" content="ページの説明文をここに記述します。120〜160文字程度が推奨されます。">',
    viewport: '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    ogTitle: '<meta property="og:title" content="OGタイトル">',
    ogDescription: '<meta property="og:description" content="OGディスクリプション">',
    ogImage: '<meta property="og:image" content="https://example.com/image.jpg">',
    ogUrl: `<meta property="og:url" content="${metaData.url || 'https://example.com/'}">`,
    ogType: '<meta property="og:type" content="website">',
    ogSiteName: '<meta property="og:site_name" content="サイト名">',
    twitterCard: '<meta name="twitter:card" content="summary_large_image">',
    twitterTitle: '<meta name="twitter:title" content="Twitterタイトル">',
    twitterDescription: '<meta name="twitter:description" content="Twitterディスクリプション">',
    twitterImage: '<meta name="twitter:image" content="https://example.com/twitter-image.jpg">'
  };
  return codes[key] || '';
}

/**
 * 優先度アイコンを取得
 */
function getPriorityIcon(priority) {
  const icons = {
    high: '🔴',
    medium: '🟡',
    low: '🔵'
  };
  return icons[priority] || '⚪';
}

/**
 * サマリーを更新
 */
function updateSummary() {
  let passed = 0;
  let warnings = 0;
  let missing = 0;
  
  // 必須タグのチェック
  REQUIRED_TAGS.forEach(tag => {
    const value = metaData[tag.key];
    if (!value || value.trim() === '') {
      missing++;
    } else {
      passed++;
    }
  });
  
  // 文字数チェック
  Object.entries(CHAR_LIMITS).forEach(([key, limit]) => {
    const value = metaData[key];
    if (value) {
      if (value.length < limit.min || value.length > limit.max) {
        warnings++;
      }
    }
  });
  
  // スコア計算（100点満点）
  const totalTags = REQUIRED_TAGS.length;
  const baseScore = Math.round((passed / totalTags) * 100);
  const warningPenalty = Math.min(warnings * 5, 20); // 警告1つにつき-5点、最大-20点
  const score = Math.max(0, baseScore - warningPenalty);
  
  // 表示を更新
  elements.totalScore.textContent = score + '点';
  elements.totalScore.className = 'card-value ' + getScoreClass(score);
  elements.warningsCount.textContent = warnings;
  elements.missingCount.textContent = missing;
  elements.passedCount.textContent = passed;
}

/**
 * スコアに応じたクラスを取得
 */
function getScoreClass(score) {
  if (score >= 90) return 'score-excellent';
  if (score >= 70) return 'score-good';
  if (score >= 50) return 'score-fair';
  return 'score-poor';
}

/**
 * タブ切り替え
 */
function handleTabChange(clickedBtn) {
  const tabName = clickedBtn.dataset.tab;
  
  // タブボタンの状態を更新
  elements.tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  // パネルの表示を切り替え
  elements.previewPanels.forEach(panel => {
    panel.classList.toggle('active', panel.id === tabName + 'Preview');
  });
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * UIの表示/非表示を制御
 */
function showLoading() {
  elements.loadingState.classList.remove('hidden');
  elements.analyzeBtn.disabled = true;
}

function hideLoading() {
  elements.loadingState.classList.add('hidden');
  elements.analyzeBtn.disabled = false;
}

function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorState.classList.remove('hidden');
}

function hideError() {
  elements.errorState.classList.add('hidden');
}

function showResults() {
  elements.resultsSection.classList.remove('hidden');
}

function hideResults() {
  elements.resultsSection.classList.add('hidden');
}

// 初期化を実行
document.addEventListener('DOMContentLoaded', init);

