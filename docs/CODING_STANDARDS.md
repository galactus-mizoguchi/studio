# コーディング規約

このドキュメントは、このワークスペースでのコーディング規約を定義します。

## 目次

1. [全般的なルール](#全般的なルール)
2. [HTML](#html)
3. [CSS](#css)
4. [JavaScript](#javascript)
5. [PHP](#php)
6. [ファイル構造](#ファイル構造)

---

## 全般的なルール

### 文字コード・改行
- **文字コード**: UTF-8（BOMなし）
- **改行コード**: LF（Unix形式）
- **インデント**: スペース2つ

### コメント
- 日本語でのコメントを推奨
- 複雑な処理には必ずコメントを記述
- TODOコメントは `// TODO: 説明` の形式

### 命名規則
- **HTML/CSS**: ケバブケース（`my-class-name`）
- **JavaScript**: キャメルケース（`myFunctionName`）
- **PHP**: ケバブケースまたはスネークケース（`my_function_name`）
- **ファイル名**: 小文字、ハイフン区切り（`my-file-name.html`）

---

## HTML

### 基本構造
```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ページタイトル</title>
</head>
<body>
    <!-- コンテンツ -->
</body>
</html>
```

### ルール
- セマンティックなHTML5タグを使用（`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`など）
- インデントは4スペース
- 属性値はダブルクォートを使用
- 自己完結型タグはスラッシュを付けない（`<br>`, `<img>`, `<input>`など）
- `id`と`class`は意味のある名前を付ける
- アクセシビリティを考慮（`alt`属性、`aria-label`など）

### 例
```html
<header class="site-header">
    <nav class="main-nav" aria-label="メインナビゲーション">
        <ul class="nav-list">
            <li><a href="#home" class="nav-link">ホーム</a></li>
        </ul>
    </nav>
</header>
```

---

## CSS

### 基本構造
```css
/* セクションコメント */
.selector {
    property: value;
    property: value;
}
```

### ルール
- クラス名はケバブケース（`my-class-name`）
- プロパティは1行に1つ
- プロパティの順序: レイアウト → スタイル → その他
- モバイルファーストでメディアクエリを記述
- カスタムプロパティ（CSS変数）を活用
- コメントは日本語可

### プロパティの順序例
```css
.element {
    /* レイアウト */
    position: relative;
    display: flex;
    width: 100%;
    height: auto;
    margin: 0;
    padding: 16px;
    
    /* スタイル */
    background-color: #fff;
    color: #333;
    border: 1px solid #ccc;
    border-radius: 4px;
    
    /* その他 */
    transition: all 0.3s ease;
    cursor: pointer;
}
```

### メディアクエリ
```css
/* モバイルファースト */
.element {
    width: 100%;
}

@media (min-width: 768px) {
    .element {
        width: 50%;
    }
}

@media (min-width: 1200px) {
    .element {
        width: 33.333%;
    }
}
```

---

## JavaScript

### 基本構造
```javascript
// 関数定義
function myFunction() {
    // 処理
}

// またはアロー関数
const myFunction = () => {
    // 処理
};
```

### ルール
- 変数・関数名はキャメルケース（`myVariableName`）
- 定数は大文字スネークケース（`MY_CONSTANT`）
- `const`を優先、再代入が必要な場合のみ`let`を使用
- `var`は使用しない
- セミコロンは付ける
- 厳密等価演算子（`===`, `!==`）を使用
- テンプレートリテラルを活用

### 例
```javascript
// DOM要素の取得
const menuToggle = document.getElementById('menuToggle');
const menuItems = document.querySelectorAll('.menu-item');

// イベントリスナー
menuToggle.addEventListener('click', () => {
    menuItems.forEach(item => {
        item.classList.toggle('active');
    });
});

// 関数定義
function handleMenuClick(event) {
    event.preventDefault();
    // 処理
}
```

### コメント
```javascript
// 単一行コメント

/**
 * 複数行コメント
 * 関数の説明
 * @param {string} param1 - パラメータの説明
 * @returns {void}
 */
function myFunction(param1) {
    // 処理
}
```

---

## PHP

### 基本構造
```php
<?php
// 処理
?>
```

### ルール
- 開始タグは`<?php`を使用（短縮タグ`<?`は使用しない）
- ファイル末尾の終了タグ`?>`は省略（推奨）
- 関数名・変数名はスネークケース（`my_function_name`）
- クラス名はパスカルケース（`MyClassName`）
- 文字列はシングルクォートを優先（変数展開が必要な場合のみダブルクォート）

### 例
```php
<?php
function get_user_data($user_id) {
    $data = [
        'id' => $user_id,
        'name' => 'ユーザー名',
    ];
    
    return $data;
}

class UserController {
    public function index() {
        // 処理
    }
}
```

---

## ファイル構造

### 小規模プロジェクト（1ファイル）
```
project-name/
└── index.html  (HTML + CSS + JavaScript すべて含む)
```

### 中規模プロジェクト（ファイル分離）
```
project-name/
├── index.html
└── assets/
    ├── css/
    │   └── style.css
    ├── js/
    │   └── script.js
    └── img/
        └── logo.png
```

### 大規模プロジェクト（コンポーネント分離）
```
project-name/
├── index.html
└── assets/
    ├── css/
    │   ├── base.css
    │   ├── components/
    │   │   ├── header.css
    │   │   └── footer.css
    │   └── utilities.css
    ├── js/
    │   ├── main.js
    │   └── modules/
    │       ├── menu.js
    │       └── form.js
    ├── img/
    │   └── logo.png
    └── fonts/
        └── custom-font.woff2
```

### ファイル構造のルール
- **CSS、JavaScript、画像、フォントなどのアセットファイルは必ず`assets`フォルダ内に配置する**
- `assets`フォルダ内は種類別にサブフォルダで整理（`css/`, `js/`, `img/`, `fonts/`など）
- HTMLファイルからは`assets/`を基準にパスを指定（例: `<link rel="stylesheet" href="assets/css/style.css">`）
- 小規模プロジェクトで1ファイルにすべて含む場合は、このルールは適用しない

---

## ベストプラクティス

### パフォーマンス
- 画像は適切な形式・サイズで最適化
- CSS/JavaScriptは必要最小限に
- 外部リソースの読み込みは慎重に

### セキュリティ
- ユーザー入力は必ずサニタイズ・バリデーション
- SQLインジェクション対策（プリペアドステートメント）
- XSS対策（エスケープ処理）

### アクセシビリティ
- 適切な見出し構造（h1 → h2 → h3）
- キーボード操作に対応
- コントラスト比を確保
- ARIA属性を適切に使用

### 保守性
- DRY原則（Don't Repeat Yourself）
- 意味のある変数名・関数名
- 適切なコメント
- 既存のHTML構造・CSSクラスは可能な限り保持

---

## チェックリスト

コードをコミットする前に以下を確認:

- [ ] インデントが統一されている（スペース4つ）
- [ ] 命名規則に従っている
- [ ] コメントが適切に記述されている
- [ ] ブラウザで動作確認済み
- [ ] モバイル・デスクトップ両方で確認済み
- [ ] コンソールエラーがない
- [ ] アクセシビリティを考慮している

