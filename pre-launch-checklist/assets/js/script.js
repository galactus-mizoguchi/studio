// チェックリスト管理
const STORAGE_KEY = 'galactus-prelaunch-checklist';

// 状態を読み込む
function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : {};
}

// 状態を保存する
function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// 進捗を更新する
function updateProgress() {
  const checkboxes = document.querySelectorAll('.checkbox');
  const total = checkboxes.length;
  const checked = document.querySelectorAll('.checkbox:checked').length;
  const percentage = total > 0 ? Math.round((checked / total) * 100) : 0;

  // プログレスバーを更新
  const progressFill = document.querySelector('.progress-fill');
  const progressCount = document.querySelector('.progress-count');
  
  if (progressFill) {
    progressFill.style.width = `${percentage}%`;
    if (percentage === 100) {
      progressFill.classList.add('complete');
    } else {
      progressFill.classList.remove('complete');
    }
  }
  
  if (progressCount) {
    progressCount.textContent = `${checked} / ${total} (${percentage}%)`;
  }

  // カテゴリ別の進捗を更新
  document.querySelectorAll('.category-section').forEach(section => {
    const sectionCheckboxes = section.querySelectorAll('.checkbox');
    const sectionTotal = sectionCheckboxes.length;
    const sectionChecked = section.querySelectorAll('.checkbox:checked').length;
    const progressEl = section.querySelector('.category-progress');
    if (progressEl) {
      progressEl.textContent = `${sectionChecked}/${sectionTotal}`;
    }
  });

  // 完了メッセージの表示
  const completeMessage = document.querySelector('.complete-message');
  if (completeMessage) {
    if (percentage === 100) {
      completeMessage.classList.add('show');
    } else {
      completeMessage.classList.remove('show');
    }
  }
}

// チェックボックスの状態を復元
function restoreState() {
  const state = loadState();
  document.querySelectorAll('.checkbox').forEach(checkbox => {
    if (state[checkbox.id]) {
      checkbox.checked = true;
      checkbox.closest('.checklist-item').classList.add('checked');
    }
  });
  updateProgress();
}

// チェックボックスのイベント設定
function setupCheckboxes() {
  document.querySelectorAll('.checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      const state = loadState();
      state[this.id] = this.checked;
      saveState(state);
      
      const item = this.closest('.checklist-item');
      if (this.checked) {
        item.classList.add('checked');
      } else {
        item.classList.remove('checked');
      }
      
      updateProgress();
    });
  });

  // チェックリストアイテムのクリックでチェックボックスをトグル
  document.querySelectorAll('.checklist-item').forEach(item => {
    item.addEventListener('click', function(e) {
      // チェックボックス自体をクリックした場合は何もしない
      if (e.target.classList.contains('checkbox') || e.target.classList.contains('checkbox-custom')) {
        return;
      }
      const checkbox = this.querySelector('.checkbox');
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event('change'));
    });
  });
}

// 全てチェック
function checkAll() {
  const state = loadState();
  document.querySelectorAll('.checkbox').forEach(checkbox => {
    checkbox.checked = true;
    state[checkbox.id] = true;
    checkbox.closest('.checklist-item').classList.add('checked');
  });
  saveState(state);
  updateProgress();
}

// 全てリセット
function resetAll() {
  if (confirm('チェック状態をすべてリセットしますか？')) {
    localStorage.removeItem(STORAGE_KEY);
    document.querySelectorAll('.checkbox').forEach(checkbox => {
      checkbox.checked = false;
      checkbox.closest('.checklist-item').classList.remove('checked');
    });
    updateProgress();
  }
}

// 初期化
document.addEventListener('DOMContentLoaded', function() {
  setupCheckboxes();
  restoreState();

  // GSAP アニメーション
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    gsap.utils.toArray('.category-section').forEach((section) => {
      gsap.from(section, {
        opacity: 0,
        y: 30,
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: section,
          start: 'top bottom-=100',
          toggleActions: 'play none none none',
        }
      });
    });

    gsap.from('.header', {
      opacity: 0,
      y: -30,
      duration: 1,
      ease: 'power2.out',
    });

    gsap.from('.progress-section', {
      opacity: 0,
      y: -20,
      duration: 0.8,
      delay: 0.3,
      ease: 'power2.out',
    });
  }
});
