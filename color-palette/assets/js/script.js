// カラーコードをコピーする機能
function copyColor(element, color) {
  navigator.clipboard.writeText(color).then(() => {
    element.classList.add('copied');
    
    setTimeout(() => {
      element.classList.remove('copied');
    }, 1500);
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

// コードブロックをコピーする機能
function copyCode(button) {
  const codeBlock = button.parentElement;
  const code = codeBlock.querySelector('code');
  const text = code.textContent;
  
  navigator.clipboard.writeText(text).then(() => {
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    button.classList.add('copied');
    
    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove('copied');
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy:', err);
    button.textContent = 'Failed';
    setTimeout(() => {
      button.textContent = 'Copy';
    }, 2000);
  });
}

// カラースウォッチにクリックイベントを設定
document.addEventListener('DOMContentLoaded', function() {
  // カラースウォッチのクリックイベント
  document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', function() {
      const color = this.getAttribute('data-color');
      copyColor(this, color);
    });
  });

  // カラーチップのクリックイベント
  document.querySelectorAll('.color-chip').forEach(chip => {
    chip.addEventListener('click', function() {
      const color = this.getAttribute('data-color');
      copyColor(this, color);
    });
  });

  // GSAP ScrollTrigger アニメーション
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    // パレットカードのフェードインアニメーション
    gsap.utils.toArray('.palette-card').forEach((card, index) => {
      gsap.from(card, {
        opacity: 0,
        y: 50,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: card,
          start: 'top bottom-=100',
          end: 'top center',
          toggleActions: 'play none none none',
        }
      });
    });

    // カテゴリタイトルのフェードインアニメーション
    gsap.utils.toArray('.category-title').forEach((title) => {
      gsap.from(title, {
        opacity: 0,
        y: 30,
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: title,
          start: 'top bottom-=50',
          toggleActions: 'play none none none',
        }
      });
    });

    // ヘッダーのフェードインアニメーション
    gsap.from('.header', {
      opacity: 0,
      y: -30,
      duration: 1,
      ease: 'power2.out',
    });

    // ナビゲーションのフェードインアニメーション
    gsap.from('.nav-links', {
      opacity: 0,
      y: -20,
      duration: 0.8,
      delay: 0.3,
      ease: 'power2.out',
    });
  }
});
