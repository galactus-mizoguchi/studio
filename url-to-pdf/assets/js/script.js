/**
 * URL to PDF - script.js
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('convertForm');
  const urlInput = document.getElementById('urlInput');
  const convertBtn = document.getElementById('convertBtn');
  const loadingState = document.getElementById('loadingState');
  const errorState = document.getElementById('errorState');
  const errorMessage = document.getElementById('errorMessage');
  const retryBtn = document.getElementById('retryBtn');
  const previewContainer = document.getElementById('previewContainer');

  // 設定項目
  const formatSelect = document.getElementById('format');
  const orientationSelect = document.getElementById('orientation');
  const marginSelect = document.getElementById('margin');

  // プロキシURL (sitemap-generator と同じものを使用)
  const PROXY_URLS = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest='
  ];

  /**
   * プロキシ経由でHTMLを取得
   */
  async function fetchWithProxy(url) {
    let lastError = null;
    
    for (const proxy of PROXY_URLS) {
      try {
        const proxyUrl = proxy + encodeURIComponent(url);
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        if (html && html.trim().length > 0) {
          return html;
        }
        throw new Error('空のコンテンツが返されました');
      } catch (error) {
        lastError = error;
        console.warn(`Proxy failed: ${proxy}`, error);
        continue;
      }
    }
    throw new Error(lastError?.message || 'すべてのプロキシで取得に失敗しました');
  }

  /**
   * HTMLのクリーニングとベースURLの設定
   */
  function processHtml(html, baseUrl) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // baseタグの追加/更新 (相対パスの解決用)
    let baseTag = doc.querySelector('base');
    if (!baseTag) {
      baseTag = doc.createElement('base');
      doc.head.insertBefore(baseTag, doc.head.firstChild);
    }
    baseTag.href = baseUrl;

    // スクリプトの削除 (実行によるエラー防止)
    doc.querySelectorAll('script').forEach(s => s.remove());
    
    // インラインスタイルの調整 (オプション)
    // 背景色が設定されていない場合に白にするなど
    if (!doc.body.style.backgroundColor) {
      doc.body.style.backgroundColor = '#ffffff';
    }

    return doc.documentElement.outerHTML;
  }

  /**
   * PDFの生成とダウンロード
   */
  async function generatePdf(element, filename, options) {
    const opt = {
      margin: options.margin,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true,
        logging: false
      },
      jsPDF: { 
        unit: 'mm', 
        format: options.format, 
        orientation: options.orientation 
      }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('PDF Generation Error:', error);
      throw new Error('PDFの生成中にエラーが発生しました。対象サイトの構造により失敗する場合があります。');
    }
  }

  /**
   * フォーム送信イベント
   */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const url = urlInput.value.trim();
    if (!url) return;

    // 状態リセット
    loadingState.classList.remove('hidden');
    errorState.classList.add('hidden');
    convertBtn.disabled = true;
    previewContainer.innerHTML = '';

    try {
      // 1. HTML取得
      const rawHtml = await fetchWithProxy(url);
      
      // 2. HTML加工
      const processedHtml = processHtml(rawHtml, url);
      
      // 3. プレビューコンテナに注入 (非表示)
      previewContainer.innerHTML = processedHtml;

      // 画像などのリソース読み込みを待つための待機
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 4. PDF生成
      const options = {
        format: formatSelect.value,
        orientation: orientationSelect.value,
        margin: parseInt(marginSelect.value)
      };
      
      const domain = new URL(url).hostname;
      const filename = `webpage_${domain}_${new Date().getTime()}.pdf`;

      await generatePdf(previewContainer, filename, options);

    } catch (error) {
      console.error('Conversion error:', error);
      errorState.classList.remove('hidden');
      errorMessage.textContent = error.message || '変換に失敗しました。URLが正しいか確認し、もう一度お試しください。';
    } finally {
      loadingState.classList.add('hidden');
      convertBtn.disabled = false;
    }
  });

  /**
   * 再試行ボタン
   */
  retryBtn.addEventListener('click', () => {
    form.dispatchEvent(new Event('submit'));
  });
});
