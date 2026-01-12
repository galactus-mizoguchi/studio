# プロジェクト概要

このワークスペースは、Web開発の実験・学習用プロジェクトです。

## ディレクトリ構造

```
public/
├── README.md                 # プロジェクト概要（このファイル）
├── .cursorrules              # Cursor AI用のコーディングルール
├── .editorconfig             # エディタ設定
├── .gitignore                # Git除外設定
├── docs/                     # ドキュメントフォルダ
│   └── CODING_STANDARDS.md   # コーディング規約
├── index.php                 # ルートファイル
└── [プロジェクト名]/         # 各プロジェクトのディレクトリ
    └── index.html            # プロジェクトのエントリーポイント
```

## 基本的なルール

### ディレクトリ命名規則
- プロジェクトごとに独立したディレクトリを作成
- ディレクトリ名は小文字、ハイフン区切り（例: `lp-sample`, `admin-panel`）
- 各プロジェクトは自己完結型（必要なファイルをすべて含む）

### ファイル命名規則
- HTMLファイル: `index.html` または `[ページ名].html`（小文字、ハイフン区切り）
- CSSファイル: `style.css` または `[コンポーネント名].css`
- JavaScriptファイル: `script.js` または `[機能名].js`
- PHPファイル: `[機能名].php`（小文字、ハイフン区切り）

### ファイル構造
- **CSS、JavaScript、画像、フォントなどのアセットファイルは必ず`assets`フォルダ内に配置する**
- プロジェクト構造の例:
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

### コーディング規約
詳細は [CODING_STANDARDS.md](./docs/CODING_STANDARDS.md) を参照してください。

主なポイント:
- インデント: スペース2つ（タブ）
- 文字コード: UTF-8
- 改行コード: LF（Unix形式）
- コメント: 日本語可
- 命名規則: キャメルケース（JavaScript）、ケバブケース（HTML/CSS）

### Cursor AI設定
`.cursorrules` ファイルにコーディング規約を定義しています。Cursor AIがコードを生成・修正する際に自動的にこのルールに従います。

## プロジェクト作成時の手順

1. プロジェクト用のディレクトリを作成
2. `index.html` または適切なエントリーポイントを作成
3. `assets`フォルダを作成し、その中に`css/`、`js/`、`img/`などのサブフォルダを作成
4. 必要に応じてCSS/JavaScriptファイルを`assets`フォルダ内に配置
5. HTMLファイルから`assets/`を基準にパスを指定（例: `assets/css/style.css`）
6. ブラウザで動作確認

## 注意事項

- 既存のHTML構造やCSSクラスは可能な限り保持する
- モバイルファーストのデザインを推奨
- セマンティックなHTMLを使用する


