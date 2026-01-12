/**
 * ResponsiveChecker - レスポンシブデザインチェッカー
 * URL入力から複数デバイスサイズでプレビュー表示
 */

// デバイスサイズの定義
const DEVICE_SIZES = {
  'iphone-se': { width: 375, height: 667, name: 'iPhone SE' },
  'iphone-12': { width: 390, height: 844, name: 'iPhone 12/13' },
  'iphone-14-pro': { width: 393, height: 852, name: 'iPhone 14 Pro' },
  'ipad': { width: 768, height: 1024, name: 'iPad' },
  'ipad-pro': { width: 1024, height: 1366, name: 'iPad Pro' },
  'desktop': { width: 1920, height: 1080, name: 'デスクトップ' },
  'custom': { width: 1200, height: 800, name: 'カスタム' }
};

// DOM要素の参照
const elements = {
  form: document.getElementById('previewForm'),
  urlInput: document.getElementById('urlInput'),
  previewBtn: document.getElementById('previewBtn'),
  loadingState: document.getElementById('loadingState'),
  errorState: document.getElementById('errorState'),
  errorMessage: document.getElementById('errorMessage'),
  retryBtn: document.getElementById('retryBtn'),
  resultsSection: document.getElementById('resultsSection'),
  deviceTabs: document.querySelectorAll('.device-tab'),
  customSizePanel: document.getElementById('customSizePanel'),
  customWidth: document.getElementById('customWidth'),
  customHeight: document.getElementById('customHeight'),
  applyCustomSize: document.getElementById('applyCustomSize'),
  deviceFrame: document.getElementById('deviceFrame'),
  previewFrame: document.getElementById('previewFrame'),
  currentUrl: document.getElementById('currentUrl'),
  currentSize: document.getElementById('currentSize'),
  screenshotBtn: document.getElementById('screenshotBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  comparisonGrid: document.getElementById('comparisonGrid')
};

// 現在の状態
let currentUrl = '';
let currentDevice = 'iphone-12';
let comparisonDevices = [];

/**
 * 初期化
 */
function init() {
  // フォーム送信イベント
  elements.form.addEventListener('submit', handleSubmit);
  
  // 再試行ボタン
  elements.retryBtn.addEventListener('click', () => {
    hideError();
    if (currentUrl) {
      loadPreview(currentUrl);
    }
  });
  
  // デバイスタブ切り替え
  elements.deviceTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      if (e.ctrlKey || e.metaKey) {
        // Ctrl/Cmd + クリックで比較に追加
        handleAddToComparison(tab);
      } else {
        handleDeviceChange(tab);
      }
    });
    
    // 右クリックで比較に追加
    tab.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      handleAddToComparison(tab);
    });
  });
  
  // カスタムサイズ適用
  elements.applyCustomSize.addEventListener('click', handleApplyCustomSize);
  
  // スクリーンショット
  elements.screenshotBtn.addEventListener('click', handleScreenshot);
  
  // 再読み込み
  elements.refreshBtn.addEventListener('click', () => {
    if (currentUrl) {
      loadPreview(currentUrl);
    }
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
  
  currentUrl = url;
  await loadPreview(url);
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
 * プレビューを読み込む
 */
async function loadPreview(url) {
  showLoading();
  hideError();
  hideResults();
  
  try {
    // URLを正規化（プロトコルがない場合は追加）
    let normalizedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      normalizedUrl = 'https://' + url;
    }
    
    // iframeにURLを設定
    elements.previewFrame.src = normalizedUrl;
    
    // iframeの読み込み完了を待つ
    elements.previewFrame.onload = () => {
      hideLoading();
      showResults();
      updatePreviewInfo(normalizedUrl);
      updateDeviceFrame();
    };
    
    // エラーハンドリング
    elements.previewFrame.onerror = () => {
      throw new Error('ページの読み込みに失敗しました。URLが正しいか、サイトがアクセス可能か確認してください。また、一部のサイトはセキュリティ設定によりiframeでの表示が制限されている場合があります。');
    };
    
    // タイムアウト処理（10秒）
    setTimeout(() => {
      if (elements.loadingState && !elements.loadingState.classList.contains('hidden')) {
        hideLoading();
        showError('ページの読み込みがタイムアウトしました。サイトがアクセス可能か確認してください。');
      }
    }, 10000);
    
  } catch (error) {
    console.error('プレビューエラー:', error);
    hideLoading();
    showError(error.message || 'URLの読み込みに失敗しました。');
  }
}

/**
 * デバイス変更ハンドラ
 */
function handleDeviceChange(clickedTab) {
  const deviceId = clickedTab.dataset.device;
  
  // タブの状態を更新
  elements.deviceTabs.forEach(tab => {
    tab.classList.toggle('active', tab === clickedTab);
  });
  
  // カスタムサイズパネルの表示/非表示
  if (deviceId === 'custom') {
    elements.customSizePanel.classList.remove('hidden');
  } else {
    elements.customSizePanel.classList.add('hidden');
  }
  
  currentDevice = deviceId;
  updateDeviceFrame();
  updatePreviewInfo(currentUrl);
}

/**
 * カスタムサイズ適用ハンドラ
 */
function handleApplyCustomSize() {
  const width = parseInt(elements.customWidth.value);
  const height = parseInt(elements.customHeight.value);
  
  if (isNaN(width) || isNaN(height) || width < 320 || height < 480) {
    showError('幅は320px以上、高さは480px以上を指定してください。');
    return;
  }
  
  DEVICE_SIZES.custom.width = width;
  DEVICE_SIZES.custom.height = height;
  updateDeviceFrame();
  updatePreviewInfo(currentUrl);
}

/**
 * デバイスフレームを更新
 */
function updateDeviceFrame() {
  const device = DEVICE_SIZES[currentDevice];
  if (!device) return;
  
  const deviceScreen = elements.deviceFrame.querySelector('.device-screen');
  if (!deviceScreen) return;
  
  // モバイルデバイスの場合は縦長、デスクトップの場合は横長
  const isMobile = device.width < 768;
  const isTablet = device.width >= 768 && device.width < 1024;
  const isDesktop = device.width >= 1024;
  
  // フレームサイズを計算（最大幅を制限）
  const containerWidth = elements.deviceFrame.offsetWidth || window.innerWidth - 200;
  const maxWidth = Math.min(containerWidth, window.innerWidth - 100);
  const scale = Math.min(1, maxWidth / device.width);
  const displayWidth = device.width * scale;
  const displayHeight = device.height * scale;
  
  deviceScreen.style.width = `${displayWidth}px`;
  deviceScreen.style.height = `${displayHeight}px`;
  
  // iframeのサイズを設定（実際のデバイスサイズ）
  elements.previewFrame.style.width = `${device.width}px`;
  elements.previewFrame.style.height = `${device.height}px`;
  elements.previewFrame.style.transform = `scale(${scale})`;
  elements.previewFrame.style.transformOrigin = 'top left';
  
  // デバイスフレームのクラスを更新
  deviceScreen.className = 'device-screen';
  if (isDesktop) {
    deviceScreen.classList.add('desktop');
  } else if (isTablet) {
    deviceScreen.classList.add('tablet');
  } else {
    deviceScreen.classList.add('mobile');
  }
}

/**
 * プレビュー情報を更新
 */
function updatePreviewInfo(url) {
  const device = DEVICE_SIZES[currentDevice];
  if (device) {
    elements.currentUrl.textContent = url || '';
    elements.currentSize.textContent = `${device.width} × ${device.height}px`;
  }
}

/**
 * スクリーンショットを撮影
 */
async function handleScreenshot() {
  if (!currentUrl) {
    showError('プレビューを表示してからスクリーンショットを撮影してください。');
    return;
  }
  
  try {
    const deviceScreen = elements.deviceFrame.querySelector('.device-screen');
    if (!deviceScreen) return;
    
    // html2canvasを使用してスクリーンショットを撮影
    const canvas = await html2canvas(deviceScreen, {
      backgroundColor: '#000',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false
    });
    
    // ダウンロード
    const device = DEVICE_SIZES[currentDevice];
    const filename = `screenshot-${device.name}-${Date.now()}.png`;
    downloadCanvas(canvas, filename);
    
  } catch (error) {
    console.error('スクリーンショットエラー:', error);
    showError('スクリーンショットの撮影に失敗しました。');
  }
}

/**
 * Canvasをダウンロード
 */
function downloadCanvas(canvas, filename) {
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

/**
 * 比較に追加するハンドラ
 */
function handleAddToComparison(tab) {
  if (!currentUrl) {
    showError('まずURLを入力してプレビューを表示してください。');
    return;
  }
  
  const deviceId = tab.dataset.device;
  addComparisonDevice(deviceId);
  
  // 視覚的フィードバック
  tab.style.transform = 'scale(0.95)';
  setTimeout(() => {
    tab.style.transform = '';
  }, 200);
}

/**
 * 比較用のプレビューを追加
 */
function addComparisonDevice(deviceId) {
  if (comparisonDevices.includes(deviceId)) {
    // 既に追加されている場合は削除
    const existingItem = elements.comparisonGrid.querySelector(`[data-device="${deviceId}"]`);
    if (existingItem) {
      removeComparisonDevice(deviceId, existingItem);
    }
    return;
  }
  
  const device = DEVICE_SIZES[deviceId];
  if (!device) return;
  
  comparisonDevices.push(deviceId);
  
  // 比較アイテムを作成
  const comparisonItem = document.createElement('div');
  comparisonItem.className = 'comparison-item';
  comparisonItem.dataset.device = deviceId;
  
  comparisonItem.innerHTML = `
    <div class="comparison-header">
      <span class="comparison-device-name">${device.name}</span>
      <span class="comparison-device-size">${device.width} × ${device.height}px</span>
    </div>
    <div class="comparison-frame ${device.width >= 1024 ? 'desktop' : device.width >= 768 ? 'tablet' : ''}">
      <iframe class="comparison-iframe" src="${currentUrl}" frameborder="0"></iframe>
    </div>
  `;
  
  // 削除ボタンを追加
  const removeBtn = document.createElement('button');
  removeBtn.className = 'action-btn';
  removeBtn.style.marginTop = 'var(--spacing-sm)';
  removeBtn.style.width = '100%';
  removeBtn.innerHTML = '<span class="btn-icon">🗑️</span><span class="btn-text">削除</span>';
  removeBtn.addEventListener('click', () => {
    removeComparisonDevice(deviceId, comparisonItem);
  });
  
  comparisonItem.appendChild(removeBtn);
  elements.comparisonGrid.appendChild(comparisonItem);
  
  // 比較セクションにスクロール
  comparisonItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * 比較用のプレビューを削除
 */
function removeComparisonDevice(deviceId, element) {
  comparisonDevices = comparisonDevices.filter(id => id !== deviceId);
  element.remove();
}

/**
 * UIの表示/非表示を制御
 */
function showLoading() {
  elements.loadingState.classList.remove('hidden');
  elements.previewBtn.disabled = true;
}

function hideLoading() {
  elements.loadingState.classList.add('hidden');
  elements.previewBtn.disabled = false;
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

// ウィンドウリサイズ時にフレームサイズを再計算
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (currentUrl) {
      updateDeviceFrame();
    }
  }, 250);
});

// 初期化を実行
document.addEventListener('DOMContentLoaded', init);

