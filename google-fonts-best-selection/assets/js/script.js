// コピー機能
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

// GSAP ScrollTrigger アニメーション
gsap.registerPlugin(ScrollTrigger);

// ページ読み込み完了後にアニメーションを設定
document.addEventListener('DOMContentLoaded', function() {
  // フォントカードのフェードインアニメーション
  gsap.utils.toArray('.font-card').forEach((card, index) => {
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
});

