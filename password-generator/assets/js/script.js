document.addEventListener('DOMContentLoaded', () => {
  // 要素の取得
  const lengthSlider = document.getElementById('length-slider');
  const lengthValue = document.getElementById('length-value');
  const includeUppercase = document.getElementById('include-uppercase');
  const includeLowercase = document.getElementById('include-lowercase');
  const includeNumbers = document.getElementById('include-numbers');
  const includeSymbols = document.getElementById('include-symbols');
  const generateBtn = document.getElementById('generate-btn');
  const resultsSection = document.getElementById('results-section');
  const passwordsGrid = document.getElementById('passwords-grid');

  // 文字セット
  const CHARSETS = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    symbols: '!@#$%^&*()_+~`|}{[]:;?><,./-='
  };

  // スライダーの値を更新
  lengthSlider.addEventListener('input', (e) => {
    lengthValue.textContent = e.target.value;
  });

  // パスワード生成イベント
  generateBtn.addEventListener('click', () => {
    const length = parseInt(lengthSlider.value);
    const hasUpper = includeUppercase.checked;
    const hasLower = includeLowercase.checked;
    const hasNumber = includeNumbers.checked;
    const hasSymbol = includeSymbols.checked;

    if (!hasUpper && !hasLower && !hasNumber && !hasSymbol) {
      alert('少なくとも1つの文字タイプを選択してください。');
      return;
    }

    const passwords = [];
    for (let i = 0; i < 9; i++) {
      passwords.push(generatePassword(length, hasUpper, hasLower, hasNumber, hasSymbol));
    }

    displayPasswords(passwords);
  });

  // パスワード生成ロジック
  function generatePassword(length, upper, lower, number, symbol) {
    let generatedPassword = '';
    const typesCount = upper + lower + number + symbol;
    const typesArr = [
      { upper },
      { lower },
      { number },
      { symbol }
    ].filter(item => Object.values(item)[0]);

    // 選択に基づいた有効な文字セットを作成
    let validCharset = '';
    if (upper) validCharset += CHARSETS.uppercase;
    if (lower) validCharset += CHARSETS.lowercase;
    if (number) validCharset += CHARSETS.numbers;
    if (symbol) validCharset += CHARSETS.symbols;

    // 単純なランダム生成
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * validCharset.length);
      generatedPassword += validCharset[randomIndex];
    }

    return generatedPassword;
  }

  // 生成結果の表示
  function displayPasswords(passwords) {
    passwordsGrid.innerHTML = '';
    resultsSection.classList.remove('hidden');

    passwords.forEach(password => {
      const card = document.createElement('div');
      card.className = 'password-card';
      card.innerHTML = `
        <span class="password-text">${password}</span>
        <span class="copy-icon">📋</span>
        <div class="copied-toast">コピーしました！</div>
      `;

      card.addEventListener('click', () => {
        copyToClipboard(password, card);
      });

      passwordsGrid.appendChild(card);
    });

    // 結果までスクロール
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // クリップボードへのコピー
  async function copyToClipboard(text, cardElement) {
    try {
      await navigator.clipboard.writeText(text);
      cardElement.classList.add('copied');
      setTimeout(() => {
        cardElement.classList.remove('copied');
      }, 1500);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  }
});
