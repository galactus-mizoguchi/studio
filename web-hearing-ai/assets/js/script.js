/**
 * Web制作ヒアリングAI
 * フォーム処理、OpenAI API呼び出し、結果表示
 */

// ページ判定
const currentPage = window.location.pathname.split('/').pop() || 'index.html';

// ヒアリングフォームページ
if (currentPage === 'hearing.html' || currentPage.endsWith('hearing.html')) {
  initHearingForm();
}

// 結果表示ページ
if (currentPage === 'result.html' || currentPage.endsWith('result.html')) {
  initResultPage();
}

/**
 * ヒアリングフォームの初期化
 */
function initHearingForm() {
  const form = document.getElementById('hearingForm');
  const steps = document.querySelectorAll('.form-step');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const loadingState = document.getElementById('loadingState');
  
  let currentStep = 1;
  const totalSteps = steps.length;
  
  // ステップ表示の更新
  function updateStep() {
    steps.forEach((step, index) => {
      if (index + 1 === currentStep) {
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    });
    
    // プログレスバーの更新
    const progress = (currentStep / totalSteps) * 100;
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `質問 ${currentStep} / ${totalSteps}`;
    
    // ボタンの表示制御
    prevBtn.style.display = currentStep === 1 ? 'none' : 'inline-flex';
    nextBtn.style.display = currentStep === totalSteps ? 'none' : 'inline-flex';
    submitBtn.style.display = currentStep === totalSteps ? 'inline-flex' : 'none';
  }
  
  // バリデーション
  function validateStep(step) {
    const stepElement = steps[step - 1];
    const inputs = stepElement.querySelectorAll('input[required], textarea[required], select[required]');
    let isValid = true;
    
    inputs.forEach((input) => {
      const errorElement = document.getElementById(`error-${input.name || input.id}`);
      
      if (input.type === 'checkbox' || input.type === 'radio') {
        const group = stepElement.querySelectorAll(`input[name="${input.name}"]`);
        const checked = Array.from(group).some((inp) => inp.checked);
        
        if (!checked && input.hasAttribute('required')) {
          isValid = false;
          if (errorElement) {
            errorElement.textContent = '選択してください';
          }
        } else {
          if (errorElement) {
            errorElement.textContent = '';
          }
        }
      } else {
        if (!input.value.trim() && input.hasAttribute('required')) {
          isValid = false;
          if (errorElement) {
            errorElement.textContent = '入力してください';
          }
        } else {
          if (errorElement) {
            errorElement.textContent = '';
          }
        }
      }
    });
    
    // チェックボックスの個数制限（強み）
    if (step === 5) {
      const strengthCheckboxes = stepElement.querySelectorAll('input[name="strength"]:checked');
      if (strengthCheckboxes.length > 3) {
        isValid = false;
        const errorElement = document.getElementById('error-strength');
        if (errorElement) {
          errorElement.textContent = '最大3つまで選択できます';
        }
        // 最後にチェックしたものを外す
        strengthCheckboxes[strengthCheckboxes.length - 1].checked = false;
      }
    }
    
    return isValid;
  }
  
  // 次へボタン
  nextBtn.addEventListener('click', () => {
    if (validateStep(currentStep)) {
      currentStep++;
      updateStep();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  
  // 戻るボタン
  prevBtn.addEventListener('click', () => {
    currentStep--;
    updateStep();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  
  // フォーム送信
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!validateStep(currentStep)) {
      return;
    }
    
    // フォームデータの収集
    const formData = new FormData(form);
    const data = {
      industry: formData.get('industry'),
      target: formData.get('target'),
      purpose: formData.getAll('purpose'),
      competitor: formData.get('competitor') || '',
      strength: formData.getAll('strength'),
      pageCount: formData.get('pageCount'),
      tone: formData.get('tone')
    };
    
    // ローディング表示
    form.style.display = 'none';
    loadingState.classList.remove('hidden');
    
    try {
      // OpenAI API呼び出し
      const result = await callOpenAI(data);
      
      // 結果をlocalStorageに保存
      localStorage.setItem('hearingResult', JSON.stringify(result));
      
      // 結果ページにリダイレクト
      window.location.href = 'result.html';
    } catch (error) {
      console.error('Error:', error);
      loadingState.classList.add('hidden');
      form.style.display = 'block';
      alert('エラーが発生しました: ' + error.message);
    }
  });
  
  // 初期表示
  updateStep();
}

/**
 * OpenAI API呼び出し
 */
async function callOpenAI(data) {
  // APIキーの取得（環境変数または設定から）
  const apiKey = getAPIKey();
  
  if (!apiKey) {
    throw new Error('OpenAI APIキーが設定されていません。設定を確認してください。');
  }
  
  // プロンプトの構築
  const systemPrompt = `あなたは日本のWeb制作会社のディレクターです。
中小企業向けコーポレートサイトを前提に、要件定義として使えるアウトプットを作成してください。

出力は必ずJSON形式で、以下の構造に従ってください：
{
  "siteConcept": "サイトのコンセプト（200文字程度）",
  "target": "ターゲットの詳細（150文字程度）",
  "pageStructure": [
    {
      "page": "ページ名",
      "purpose": "ページの目的",
      "sections": ["セクション1", "セクション2", "セクション3"]
    }
  ],
  "copyTone": "トーン・雰囲気の詳細（100文字程度）",
  "notes": "備考・注意事項（200文字程度）"
}`;
  
  const userPrompt = `以下のヒアリング結果から、Webサイトの要件定義書を作成してください。

【業種・サービス内容】
${data.industry}

【主なターゲット】
${data.target}

【サイトの目的】
${data.purpose.join('、')}

【競合サイトURL】
${data.competitor || 'なし'}

【伝えたい強み】
${data.strength.join('、')}

【希望ページ数】
${data.pageCount}

【トーン・雰囲気】
${data.tone}

上記の情報を基に、実案件で使える要件定義書を作成してください。
ページ構成は、希望ページ数に応じて適切なページを提案してください。
各ページには目的と主要なセクションを記載してください。`;
  
  // OpenAI API呼び出し
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'API呼び出しに失敗しました');
  }
  
  const result = await response.json();
  const content = result.choices[0].message.content;
  
  // JSONパース
  try {
    return JSON.parse(content);
  } catch (e) {
    throw new Error('AIの応答を解析できませんでした');
  }
}

/**
 * APIキーの取得
 * 実際の実装では、環境変数や設定ファイルから取得
 */
function getAPIKey() {
  // 方法1: localStorageから取得（開発用）
  const storedKey = localStorage.getItem('openai_api_key');
  if (storedKey) {
    return storedKey;
  }
  
  // 方法2: プロンプトで入力（本番環境では非推奨）
  const apiKey = prompt('OpenAI APIキーを入力してください:');
  if (apiKey) {
    localStorage.setItem('openai_api_key', apiKey);
    return apiKey;
  }
  
  return null;
}

/**
 * 結果ページの初期化
 */
function initResultPage() {
  const resultContent = document.getElementById('resultContent');
  const errorState = document.getElementById('errorState');
  const errorMessage = document.getElementById('errorMessage');
  const copyBtn = document.getElementById('copyBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  
  // localStorageから結果を取得
  const resultData = localStorage.getItem('hearingResult');
  
  if (!resultData) {
    resultContent.style.display = 'none';
    errorState.classList.remove('hidden');
    errorMessage.textContent = '結果データが見つかりません。ヒアリングからやり直してください。';
    return;
  }
  
  try {
    const result = JSON.parse(resultData);
    displayResult(result);
  } catch (e) {
    resultContent.style.display = 'none';
    errorState.classList.remove('hidden');
    errorMessage.textContent = '結果データの解析に失敗しました。';
    return;
  }
  
  // コピーボタン
  copyBtn.addEventListener('click', () => {
    const text = formatResultForCopy(result);
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.textContent = '✓ コピーしました';
      setTimeout(() => {
        copyBtn.innerHTML = '<span class="btn-icon">📋</span><span class="btn-text">コピー</span>';
      }, 2000);
    });
  });
  
  // PDFダウンロードボタン（将来実装）
  downloadBtn.addEventListener('click', () => {
    alert('PDFダウンロード機能は今後実装予定です。');
  });
}

/**
 * 結果の表示
 */
function displayResult(result) {
  // サイトコンセプト
  const siteConceptEl = document.getElementById('siteConcept');
  if (siteConceptEl) {
    siteConceptEl.textContent = result.siteConcept || 'データなし';
  }
  
  // ターゲット
  const targetEl = document.getElementById('target');
  if (targetEl) {
    targetEl.textContent = result.target || 'データなし';
  }
  
  // ページ構成
  const pageStructureEl = document.getElementById('pageStructure');
  if (pageStructureEl && result.pageStructure) {
    if (result.pageStructure.length === 0) {
      pageStructureEl.innerHTML = '<p>データなし</p>';
    } else {
      pageStructureEl.innerHTML = result.pageStructure.map((page) => `
        <div class="page-item">
          <div class="page-name">${escapeHtml(page.page)}</div>
          <div class="page-purpose">${escapeHtml(page.purpose)}</div>
          ${page.sections && page.sections.length > 0 ? `
            <div class="sections-list">
              ${page.sections.map((section) => `
                <div class="section-item">${escapeHtml(section)}</div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `).join('');
    }
  }
  
  // トーン
  const copyToneEl = document.getElementById('copyTone');
  if (copyToneEl) {
    copyToneEl.textContent = result.copyTone || 'データなし';
  }
  
  // 備考
  const notesEl = document.getElementById('notes');
  if (notesEl) {
    notesEl.textContent = result.notes || 'データなし';
  }
}

/**
 * コピー用テキストのフォーマット
 */
function formatResultForCopy(result) {
  let text = '=== Webサイト要件定義書 ===\n\n';
  
  text += '【サイトコンセプト】\n';
  text += (result.siteConcept || 'データなし') + '\n\n';
  
  text += '【ターゲット】\n';
  text += (result.target || 'データなし') + '\n\n';
  
  text += '【ページ構成】\n';
  if (result.pageStructure && result.pageStructure.length > 0) {
    result.pageStructure.forEach((page) => {
      text += `\n■ ${page.page}\n`;
      text += `目的: ${page.purpose}\n`;
      if (page.sections && page.sections.length > 0) {
        text += 'セクション:\n';
        page.sections.forEach((section) => {
          text += `  - ${section}\n`;
        });
      }
    });
  } else {
    text += 'データなし\n';
  }
  
  text += '\n【トーン・雰囲気】\n';
  text += (result.copyTone || 'データなし') + '\n\n';
  
  text += '【備考・注意事項】\n';
  text += (result.notes || 'データなし') + '\n';
  
  return text;
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

