/**
 * RFP生成ツール
 * フォーム処理、RFP生成、PDF生成
 */

// ページ判定
const currentPage = window.location.pathname.split('/').pop() || 'index.html';

// フォームページ
if (currentPage === 'form.html' || currentPage.endsWith('form.html')) {
  initRfpForm();
}

// 結果表示ページ
if (currentPage === 'result.html' || currentPage.endsWith('result.html')) {
  initResultPage();
}

/**
 * RFPフォームの初期化
 */
function initRfpForm() {
  const form = document.getElementById('rfpForm');
  const steps = document.querySelectorAll('.form-step');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  
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
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (!validateStep(currentStep)) {
      return;
    }
    
    // フォームデータの収集
    const formData = new FormData(form);
    const data = {
      projectName: formData.get('projectName'),
      projectOverview: formData.get('projectOverview'),
      industry: formData.get('industry'),
      target: formData.get('target'),
      purpose: formData.getAll('purpose'),
      features: formData.getAll('features'),
      pageCount: formData.get('pageCount'),
      designTone: formData.get('designTone'),
      budget: formData.get('budget'),
      schedule: formData.get('schedule'),
      referenceSites: formData.get('referenceSites') || '',
      otherRequests: formData.get('otherRequests') || ''
    };
    
    // 結果をlocalStorageに保存
    localStorage.setItem('rfpData', JSON.stringify(data));
    
    // 結果ページにリダイレクト
    window.location.href = 'result.html';
  });
  
  // 初期表示
  updateStep();
}

/**
 * 結果ページの初期化
 */
function initResultPage() {
  const resultContent = document.getElementById('resultContent');
  const errorState = document.getElementById('errorState');
  const errorMessage = document.getElementById('errorMessage');
  const downloadPdfBtn = document.getElementById('downloadPdfBtn');
  const copyBtn = document.getElementById('copyBtn');
  
  // localStorageから結果を取得
  const rfpDataStr = localStorage.getItem('rfpData');
  
  if (!rfpDataStr) {
    resultContent.style.display = 'none';
    errorState.classList.remove('hidden');
    errorMessage.textContent = 'データが見つかりません。フォームからやり直してください。';
    return;
  }
  
  try {
    const rfpData = JSON.parse(rfpDataStr);
    displayRfp(rfpData);
    
    // PDFダウンロードボタン
    downloadPdfBtn.addEventListener('click', () => {
      downloadPdf();
    });
    
    // コピーボタン
    copyBtn.addEventListener('click', () => {
      copyRfpText(rfpData);
    });
  } catch (e) {
    resultContent.style.display = 'none';
    errorState.classList.remove('hidden');
    errorMessage.textContent = 'データの解析に失敗しました。';
    return;
  }
}

/**
 * RFPの表示
 */
function displayRfp(data) {
  // 日付の設定
  const now = new Date();
  const dateStr = now.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  document.getElementById('rfpDate').textContent = dateStr;
  document.getElementById('generatedDate').textContent = now.toLocaleString('ja-JP');
  
  // 各項目の表示
  document.getElementById('projectName').textContent = data.projectName || '未入力';
  document.getElementById('projectOverview').textContent = data.projectOverview || '未入力';
  document.getElementById('industry').textContent = data.industry || '未入力';
  document.getElementById('target').textContent = data.target || '未入力';
  document.getElementById('purpose').textContent = data.purpose.length > 0 ? data.purpose.join('、') : '未入力';
  document.getElementById('features').textContent = data.features.length > 0 ? data.features.join('、') : '未入力';
  document.getElementById('pageCount').textContent = data.pageCount || '未入力';
  document.getElementById('designTone').textContent = data.designTone || '未入力';
  document.getElementById('budget').textContent = data.budget || '未入力';
  document.getElementById('schedule').textContent = data.schedule || '未入力';
  document.getElementById('referenceSites').textContent = data.referenceSites || 'なし';
  document.getElementById('otherRequests').textContent = data.otherRequests || 'なし';
}

/**
 * PDFダウンロード
 */
function downloadPdf() {
  const element = document.getElementById('rfpDocument');
  const opt = {
    margin: [20, 20, 20, 20],
    filename: '提案依頼書_RFP.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  
  // html2pdf.jsを使用してPDF生成
  html2pdf().set(opt).from(element).save();
}

/**
 * RFPテキストをコピー
 */
function copyRfpText(data) {
  let text = '=== 提案依頼書（RFP） ===\n\n';
  
  text += '【プロジェクト名】\n';
  text += (data.projectName || '未入力') + '\n\n';
  
  text += '【プロジェクト概要】\n';
  text += (data.projectOverview || '未入力') + '\n\n';
  
  text += '【業種・サービス内容】\n';
  text += (data.industry || '未入力') + '\n\n';
  
  text += '【主なターゲット】\n';
  text += (data.target || '未入力') + '\n\n';
  
  text += '【サイトの目的】\n';
  text += (data.purpose.length > 0 ? data.purpose.join('、') : '未入力') + '\n\n';
  
  text += '【希望する機能】\n';
  text += (data.features.length > 0 ? data.features.join('、') : '未入力') + '\n\n';
  
  text += '【希望ページ数】\n';
  text += (data.pageCount || '未入力') + '\n\n';
  
  text += '【デザインの方向性】\n';
  text += (data.designTone || '未入力') + '\n\n';
  
  text += '【概算予算】\n';
  text += (data.budget || '未入力') + '\n\n';
  
  text += '【希望納期】\n';
  text += (data.schedule || '未入力') + '\n\n';
  
  text += '【参考サイト】\n';
  text += (data.referenceSites || 'なし') + '\n\n';
  
  text += '【その他要望】\n';
  text += (data.otherRequests || 'なし') + '\n\n';
  
  text += '---\n';
  text += '生成日時: ' + new Date().toLocaleString('ja-JP') + '\n';
  
  navigator.clipboard.writeText(text).then(() => {
    copyBtn.innerHTML = '<span class="btn-icon">✓</span><span class="btn-text">コピーしました</span>';
    setTimeout(() => {
      copyBtn.innerHTML = '<span class="btn-icon">📋</span><span class="btn-text">テキストをコピー</span>';
    }, 2000);
  }).catch((err) => {
    console.error('コピーに失敗しました:', err);
    alert('コピーに失敗しました。手動でコピーしてください。');
  });
}
