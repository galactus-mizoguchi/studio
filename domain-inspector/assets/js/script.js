/**
 * DNS Checker - DNSレコード確認ツール
 * ドメイン名を入力してDNSレコードとWHOIS情報を確認
 */

// DNS API エンドポイント（Cloudflare DNS over HTTPS）
const DNS_API = 'https://cloudflare-dns.com/dns-query';

// RDAP API エンドポイント（WHOIS情報取得用）
// supported: false = CORSに対応していないためブラウザから取得不可
const RDAP_SERVERS = {
  'com': { url: 'https://rdap.verisign.com/com/v1/domain/', supported: true },
  'net': { url: 'https://rdap.verisign.com/net/v1/domain/', supported: true },
  'org': { url: 'https://rdap.publicinterestregistry.org/rdap/domain/', supported: true },
  'default': { url: 'https://rdap.org/domain/', supported: true }
};

// WHOIS非対応のTLD一覧（CORS制限により取得不可）
const UNSUPPORTED_TLDS = ['jp', 'io', 'cn', 'kr', 'ru', 'uk', 'de', 'fr', 'au'];

// 確認可能なレコードタイプ
const RECORD_TYPES = [
  { type: 'A', name: 'Aレコード', icon: '🔗', description: 'IPv4アドレス' },
  { type: 'AAAA', name: 'AAAAレコード', icon: '🔗', description: 'IPv6アドレス' },
  { type: 'CNAME', name: 'CNAMEレコード', icon: '🔀', description: '別名' },
  { type: 'MX', name: 'MXレコード', icon: '📧', description: 'メールサーバー' },
  { type: 'TXT', name: 'TXTレコード', icon: '📝', description: 'テキスト情報' },
  { type: 'NS', name: 'NSレコード', icon: '🌐', description: 'ネームサーバー' },
  { type: 'SOA', name: 'SOAレコード', icon: '⚙️', description: '権威情報' },
  { type: 'SRV', name: 'SRVレコード', icon: '🎯', description: 'サービス' },
  { type: 'CAA', name: 'CAAレコード', icon: '🔒', description: '証明書認証' }
];

// DOM要素の参照
const elements = {
  form: document.getElementById('checkForm'),
  domainInput: document.getElementById('domainInput'),
  checkBtn: document.getElementById('checkBtn'),
  loadingState: document.getElementById('loadingState'),
  errorState: document.getElementById('errorState'),
  errorMessage: document.getElementById('errorMessage'),
  retryBtn: document.getElementById('retryBtn'),
  resultsSection: document.getElementById('resultsSection'),
  domainName: document.getElementById('domainName'),
  foundCount: document.getElementById('foundCount'),
  responseTime: document.getElementById('responseTime'),
  recordsList: document.getElementById('recordsList'),
  // WHOIS関連
  whoisSection: document.getElementById('whoisSection'),
  whoisLoading: document.getElementById('whoisLoading'),
  whoisError: document.getElementById('whoisError'),
  whoisErrorMessage: document.getElementById('whoisErrorMessage'),
  whoisContent: document.getElementById('whoisContent')
};

// 状態管理
let currentDomain = '';
let dnsResults = {};

/**
 * 初期化
 */
function init() {
  // フォーム送信イベント
  elements.form.addEventListener('submit', handleSubmit);
  
  // 再試行ボタン
  elements.retryBtn.addEventListener('click', () => {
    hideError();
    if (currentDomain) {
      handleCheck(currentDomain);
    }
  });
}

/**
 * フォーム送信ハンドラ
 */
async function handleSubmit(e) {
  e.preventDefault();
  const domain = elements.domainInput.value.trim();
  
  if (!isValidDomain(domain)) {
    showError('有効なドメイン名を入力してください（例: example.com）');
    return;
  }
  
  currentDomain = domain;
  await handleCheck(domain);
}

/**
 * ドメイン名の検証
 */
function isValidDomain(domain) {
  // 簡単なドメイン名検証
  const domainRegex = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
  return domainRegex.test(domain) && domain.length <= 253;
}

/**
 * DNS確認処理
 */
async function handleCheck(domain) {
  showLoading();
  hideError();
  hideResults();
  
  const startTime = Date.now();
  
  try {
    dnsResults = {};
    
    // 全レコードタイプを並列で確認
    const promises = RECORD_TYPES.map(record => 
      queryDNS(domain, record.type).catch(error => {
        console.warn(`${record.type}レコードの取得に失敗:`, error);
        return { type: record.type, records: [], error: error.message };
      })
    );
    
    const results = await Promise.all(promises);
    
    results.forEach(result => {
      dnsResults[result.type] = result;
    });
    
    const responseTime = Date.now() - startTime;
    
    updateSummary(domain, responseTime);
    updateRecords();
    showResults();
    
    // WHOIS情報も取得（非同期で実行）
    fetchWhoisInfo(domain);
  } catch (error) {
    console.error('DNS確認エラー:', error);
    showError(error.message || 'DNSレコードの確認に失敗しました。ドメイン名が正しいか確認してください。');
  } finally {
    hideLoading();
  }
}

/**
 * DNSクエリを実行
 */
async function queryDNS(domain, type) {
  try {
    const url = `${DNS_API}?name=${encodeURIComponent(domain)}&type=${type}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/dns-json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.Status !== 0) {
      // DNSエラー（レコードが見つからないなど）
      return {
        type,
        records: [],
        error: getDNSStatusMessage(data.Status)
      };
    }
    
    return {
      type,
      records: data.Answer || [],
      error: null
    };
  } catch (error) {
    throw new Error(`DNSクエリエラー: ${error.message}`);
  }
}

/**
 * DNSステータスコードからメッセージを取得
 */
function getDNSStatusMessage(status) {
  const messages = {
    0: '成功',
    1: 'フォーマットエラー',
    2: 'サーバーエラー',
    3: '名前エラー（NXDOMAIN）',
    4: '未実装',
    5: '拒否'
  };
  return messages[status] || `不明なエラー (${status})`;
}

/**
 * サマリーを更新
 */
function updateSummary(domain, responseTime) {
  elements.domainName.textContent = domain;
  
  let foundCount = 0;
  Object.values(dnsResults).forEach(result => {
    if (result.records && result.records.length > 0) {
      foundCount += result.records.length;
    }
  });
  
  elements.foundCount.textContent = foundCount + '件';
  elements.responseTime.textContent = responseTime + 'ms';
}

/**
 * レコード詳細を更新
 */
function updateRecords() {
  if (Object.keys(dnsResults).length === 0) {
    elements.recordsList.innerHTML = `
      <div class="no-records">
        <div class="no-records-icon">📭</div>
        <p>レコードが見つかりませんでした</p>
      </div>
    `;
    return;
  }
  
  // レコードがあるタイプのみ表示
  elements.recordsList.innerHTML = RECORD_TYPES.map(recordInfo => {
    const result = dnsResults[recordInfo.type];
    
    if (!result) {
      return '';
    }
    
    const hasRecords = result.records && result.records.length > 0;
    
    // レコードがない場合はスキップ
    if (!hasRecords) {
      return '';
    }
    
    const recordCount = result.records.length;
    const recordsHtml = result.records.map(record => {
      return createRecordItem(record, recordInfo.type);
    }).join('');
    
    return `
      <div class="record-group">
        <div class="record-group-header" onclick="toggleRecordGroup(this)">
          <div class="record-group-title">
            <span class="record-type-badge">${recordInfo.type}</span>
            <span>${recordInfo.name}</span>
          </div>
          <span class="record-count">${recordCount}件</span>
        </div>
        <div class="record-group-content expanded">
          ${recordsHtml}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * レコードアイテムのHTMLを生成
 */
function createRecordItem(record, type) {
  const name = record.name || '';
  const ttl = record.TTL || 0;
  let value = '';
  
  // レコードタイプに応じて値をフォーマット
  switch (type) {
    case 'A':
    case 'AAAA':
      value = record.data || '';
      break;
    case 'CNAME':
      value = record.data || '';
      break;
    case 'MX':
      // MXレコードは優先度とホスト名
      const mxParts = (record.data || '').split(' ');
      const priority = mxParts[0] || '';
      const host = mxParts.slice(1).join(' ') || '';
      return `
        <div class="record-item">
          <div class="record-item-header">
            <span class="record-name">${escapeHtml(name)}</span>
            <span class="record-ttl">TTL: ${ttl}</span>
          </div>
          <div class="record-value priority">
            <span class="record-priority">${priority}</span>
            <span>${escapeHtml(host)}</span>
          </div>
        </div>
      `;
    case 'TXT':
      value = record.data || '';
      // TXTレコードの引用符を除去
      value = value.replace(/^"|"$/g, '');
      break;
    case 'NS':
      value = record.data || '';
      break;
    case 'SOA':
      // SOAレコードは複数の値
      value = record.data || '';
      break;
    case 'SRV':
      // SRVレコードは優先度、重み、ポート、ターゲット
      value = record.data || '';
      break;
    case 'CAA':
      // CAAレコードはフラグ、タグ、値
      value = record.data || '';
      break;
    default:
      value = record.data || '';
  }
  
  return `
    <div class="record-item">
      <div class="record-item-header">
        <span class="record-name">${escapeHtml(name)}</span>
        <span class="record-ttl">TTL: ${ttl}</span>
      </div>
      <div class="record-value">${escapeHtml(value)}</div>
    </div>
  `;
}

/**
 * レコードグループの展開/折りたたみ
 */
function toggleRecordGroup(header) {
  const content = header.nextElementSibling;
  content.classList.toggle('expanded');
}

// グローバルスコープに公開
window.toggleRecordGroup = toggleRecordGroup;

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
  elements.checkBtn.disabled = true;
}

function hideLoading() {
  elements.loadingState.classList.add('hidden');
  elements.checkBtn.disabled = false;
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

/**
 * ドメインからTLDを取得
 */
function getTLD(domain) {
  const parts = domain.toLowerCase().split('.');
  const lastPart = parts[parts.length - 1];
  return lastPart;
}

/**
 * TLDがWHOIS取得に対応しているかチェック
 */
function isWhoisSupported(domain) {
  const tld = getTLD(domain);
  return !UNSUPPORTED_TLDS.includes(tld);
}

/**
 * TLDに対応するRDAPサーバーURLを取得
 */
function getRdapUrl(domain) {
  const tld = getTLD(domain);
  const config = RDAP_SERVERS[tld] || RDAP_SERVERS['default'];
  return config.url;
}

/**
 * WHOIS情報を取得
 */
async function fetchWhoisInfo(domain) {
  // ローディング表示
  elements.whoisLoading.classList.remove('hidden');
  elements.whoisError.classList.add('hidden');
  elements.whoisContent.innerHTML = '';
  
  // TLDがサポートされているかチェック
  const tld = getTLD(domain);
  if (!isWhoisSupported(domain)) {
    elements.whoisLoading.classList.add('hidden');
    showWhoisUnsupported(tld);
    return;
  }
  
  // RDAPサーバーURLを取得
  const rdapUrl = getRdapUrl(domain);
  
  try {
    const response = await fetch(`${rdapUrl}${domain}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/rdap+json, application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('ドメインのWHOIS情報が見つかりませんでした');
      }
      throw new Error(`WHOIS情報の取得に失敗しました (${response.status})`);
    }
    
    const data = await response.json();
    
    // RDAPエラーレスポンスのチェック
    if (data.errorCode) {
      throw new Error(data.title || 'WHOIS情報が見つかりませんでした');
    }
    
    renderWhoisInfo(data);
  } catch (error) {
    console.error('WHOIS取得エラー:', error);
    elements.whoisErrorMessage.textContent = error.message || 'WHOIS情報の取得に失敗しました';
    elements.whoisError.classList.remove('hidden');
  } finally {
    elements.whoisLoading.classList.add('hidden');
  }
}

/**
 * WHOIS非対応メッセージを表示
 */
function showWhoisUnsupported(tld) {
  elements.whoisContent.innerHTML = `
    <div class="whois-unsupported">
      <div class="unsupported-icon">🚫</div>
      <p class="unsupported-message">
        <strong>.${tld}</strong> ドメインのWHOIS情報は取得できません
      </p>
      <p class="unsupported-note">
        このTLDのレジストリはブラウザからの直接アクセスに対応していないため、WHOIS情報を表示できません。<br>
        対応TLD: .com, .net, .org など
      </p>
    </div>
  `;
}

/**
 * WHOIS情報を表示（RDAP形式）
 */
function renderWhoisInfo(data) {
  const cards = [];
  
  // ドメイン基本情報
  const domainCard = createWhoisCard('🌐', 'ドメイン情報', [
    { label: 'ドメイン名', value: data.ldhName || data.handle || '-', highlight: true },
    { label: 'ステータス', value: formatDomainStatus(data.status), isStatus: true }
  ]);
  cards.push(domainCard);
  
  // 日付情報（RDAPのevents形式）
  const events = data.events || [];
  const registrationDate = findEvent(events, 'registration');
  const expirationDate = findEvent(events, 'expiration');
  const lastChangedDate = findEvent(events, 'last changed') || findEvent(events, 'last update of RDAP database');
  
  if (registrationDate || expirationDate || lastChangedDate) {
    const dateCard = createWhoisCard('📅', '登録情報', [
      { label: '登録日', value: formatDate(registrationDate), isDate: true },
      { label: '有効期限', value: formatDate(expirationDate), isDate: true },
      { label: '最終更新日', value: formatDate(lastChangedDate), isDate: true }
    ]);
    cards.push(dateCard);
  }
  
  // ネームサーバー情報
  const nameservers = data.nameservers || [];
  if (nameservers.length > 0) {
    const nsValues = nameservers.map(ns => ns.ldhName || ns.objectClassName).filter(Boolean);
    if (nsValues.length > 0) {
      const nsCard = createWhoisCard('🖥️', 'ネームサーバー', 
        nsValues.map((ns, i) => ({ label: `NS ${i + 1}`, value: ns }))
      );
      cards.push(nsCard);
    }
  }
  
  // エンティティから情報を抽出
  const entities = data.entities || [];
  
  // レジストラ情報
  const registrar = findEntity(entities, 'registrar');
  if (registrar) {
    const registrarCard = createWhoisCard('🏢', 'レジストラ', [
      { label: '名称', value: getEntityName(registrar) || '-' }
    ]);
    cards.push(registrarCard);
  }
  
  // 登録者情報
  const registrant = findEntity(entities, 'registrant');
  if (registrant) {
    const registrantCard = createWhoisCard('👤', '登録者', [
      { label: '名前', value: getEntityName(registrant) || '-' },
      { label: '組織', value: getEntityOrg(registrant) || '-' }
    ]);
    cards.push(registrantCard);
  }
  
  // カードがない場合
  if (cards.length <= 1) {
    // ドメイン情報のみの場合、生データも表示
    elements.whoisContent.innerHTML = cards.join('');
    return;
  }
  
  elements.whoisContent.innerHTML = cards.join('');
}

/**
 * RDAPイベントから日付を検索
 */
function findEvent(events, action) {
  const event = events.find(e => e.eventAction === action);
  return event ? event.eventDate : null;
}

/**
 * エンティティを役割で検索
 */
function findEntity(entities, role) {
  return entities.find(e => e.roles && e.roles.includes(role));
}

/**
 * エンティティから名前を取得
 */
function getEntityName(entity) {
  if (!entity) return null;
  
  // vcardArrayから取得を試みる
  if (entity.vcardArray && entity.vcardArray[1]) {
    const vcard = entity.vcardArray[1];
    const fn = vcard.find(v => v[0] === 'fn');
    if (fn && fn[3]) return fn[3];
  }
  
  return entity.handle || null;
}

/**
 * エンティティから組織名を取得
 */
function getEntityOrg(entity) {
  if (!entity || !entity.vcardArray || !entity.vcardArray[1]) return null;
  
  const vcard = entity.vcardArray[1];
  const org = vcard.find(v => v[0] === 'org');
  return org && org[3] ? org[3] : null;
}

/**
 * WHOISカードを作成
 */
function createWhoisCard(icon, title, items) {
  const itemsHtml = items.map(item => {
    let valueClass = 'whois-value';
    let valueContent = escapeHtml(item.value);
    
    if (item.highlight) {
      valueClass += ' highlight';
    }
    if (item.isDate) {
      valueClass += ' date';
    }
    if (item.isStatus) {
      valueContent = item.value; // ステータスは既にHTMLフォーマット済み
    }
    
    return `
      <div class="whois-item">
        <span class="whois-label">${escapeHtml(item.label)}</span>
        <span class="${valueClass}">${valueContent}</span>
      </div>
    `;
  }).join('');
  
  return `
    <div class="whois-card">
      <h3 class="whois-card-title">
        <span class="icon">${icon}</span>
        ${escapeHtml(title)}
      </h3>
      ${itemsHtml}
    </div>
  `;
}

/**
 * ドメインステータスをフォーマット
 */
function formatDomainStatus(status) {
  if (!status || status.length === 0) {
    return '<span class="status-badge default">不明</span>';
  }
  
  return status.map(s => {
    // ステータス文字列からURLを除去
    const statusText = s.replace(/https?:\/\/[^\s]+/g, '').trim();
    let badgeClass = 'default';
    
    if (statusText.includes('active') || statusText.includes('ok')) {
      badgeClass = 'active';
    } else if (statusText.includes('inactive') || statusText.includes('hold')) {
      badgeClass = 'inactive';
    }
    
    return `<span class="status-badge ${badgeClass}">${escapeHtml(statusText)}</span>`;
  }).join('');
}

/**
 * イベントから日付を検索
 */
function findEvent(events, action) {
  const event = events.find(e => e.eventAction === action);
  return event ? event.eventDate : null;
}

/**
 * 日付をフォーマット
 */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

/**
 * エンティティを役割で検索
 */
function findEntity(entities, role) {
  return entities.find(e => e.roles && e.roles.includes(role));
}

/**
 * エンティティから名前を取得
 */
function getEntityName(entity) {
  if (!entity) return null;
  
  // vcardArrayから取得を試みる
  if (entity.vcardArray && entity.vcardArray[1]) {
    const vcard = entity.vcardArray[1];
    const fn = vcard.find(v => v[0] === 'fn');
    if (fn && fn[3]) return fn[3];
  }
  
  // 直接のプロパティから取得
  return entity.handle || entity.publicIds?.[0]?.identifier || null;
}

/**
 * エンティティから組織名を取得
 */
function getEntityOrg(entity) {
  if (!entity || !entity.vcardArray || !entity.vcardArray[1]) return null;
  
  const vcard = entity.vcardArray[1];
  const org = vcard.find(v => v[0] === 'org');
  return org && org[3] ? org[3] : null;
}

/**
 * エンティティからURLを取得
 */
function getEntityUrl(entity) {
  if (!entity) return null;
  
  // linksから取得
  if (entity.links && entity.links.length > 0) {
    const selfLink = entity.links.find(l => l.rel === 'self');
    return selfLink ? selfLink.href : entity.links[0].href;
  }
  
  // vcardArrayから取得
  if (entity.vcardArray && entity.vcardArray[1]) {
    const vcard = entity.vcardArray[1];
    const url = vcard.find(v => v[0] === 'url');
    return url && url[3] ? url[3] : null;
  }
  
  return null;
}

// 初期化を実行
document.addEventListener('DOMContentLoaded', init);
