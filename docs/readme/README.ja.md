<div align="center">

[English](../../README.md) · [Türkçe](README.tr.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Português](README.pt.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · **日本語** · [한국어](README.ko.md) · [简体中文](README.zh.md) · [Русский](README.ru.md)

<img src="../../assets/icon.png" width="96" alt="" />

# Vibe Usage

**契約しているすべての AI コーディングサブスクリプションを、ひとつのメニューバーウィンドウで。**

Claude Code、Codex、Cursor、Antigravity の残りクォータを確認し、まだ余裕のあるツールを起動して、作業途中のタスクを説明し直すことなく別のツールへ引き継げます。

Windows タスクトレイ · macOS メニューバー · 13 言語 · パスワード不要、トークンは保存しません

<img src="../media/demo.gif" width="400" alt="Vibe Usage の操作デモ: アカウントの切り替え、全アカウントの並列表示、コンパクト表示、スマート起動、引き継ぎ" />

<sub>[フル解像度で見る (MP4)](../media/demo.mp4)</sub>

</div>

> この翻訳は英語版 README より古い場合があります。[英語版](../../README.md)が正となります。

## なぜ必要か

複数の AI ツールでコーディングしていると、同じ壁に何度もぶつかります。作業の途中で 5 時間の上限に達し、別のツールを開いて、タスクを最初から説明し直すことになります。使用量の表示場所はサービスごとにばらばらで、表示されないものもあります。

Vibe Usage は、お使いのマシンですでにサインインしているセッションを読み取り、すべての上限を並べて表示します。残りがどれだけあり、いつリセットされるかがわかります。あるツールが残り少なくなると、クォータが確認できた次のツールをプロジェクトフォルダーで起動し、現在のセッションの要約を書き出します。新しいツールは前のツールが止まったところから作業を続けられます。

## 機能

<table>
<tr>
<td width="50%" valign="top">

### クォータをひと目で

すべてのアカウントのすべての上限: 5 時間枠と週間枠、モデル別の枠、利用額の枠。カウントダウンで各枠のリセットまでの時間がわかります。更新に失敗しても最後の計測値は表示されたままで、古いデータであることがはっきり示されます。不明な値が満タンのクォータとして表示されることはありません。トレイアイコンにポインターを合わせると各ツールの残りが表示されます。希望すれば、上限が少なくなったときや再び使えるようになったときに通知します。ログイン時に起動することもできます。

</td>
<td width="50%" valign="top">

<img src="../media/main.png" width="100%" alt="Claude、Codex、Cursor、Antigravity のクォータカード（各ツールのアカウントを並べて表示）" />

<img src="../media/compact.png" width="100%" alt="コンパクト表示: アカウントごとに 1 行" />

</td>
</tr>
<tr>
<td valign="top">

### スマート起動

優先順位の中で、クォータに余裕があることが**確認できた**最初のツールを選び、指定したプロジェクトフォルダーで新しいターミナルを開いて起動します。どのツールも確認できない場合は、推測せずにそう伝えます。

</td>
<td valign="top">

<img src="../media/smart-launch.png" width="100%" alt="Claude の 5 時間枠がほぼ尽きているため Codex を勧めるスマート起動" />

</td>
</tr>
<tr>
<td valign="top">

### 引き継ぎ

Claude Code、Codex、Cursor Agent、Antigravity のセッションを選びます。Vibe Usage はそれをプロジェクトフォルダーの `VIBE_HANDOVER.md` に要約します: 目的、直近のやり取り、触れたファイル、git の状態。そのうえで、その要約を読むよう指示して引き継ぎ先のツールを起動します。一覧には、選んだフォルダーで開始されたセッションだけが表示されます。

</td>
<td valign="top">

<img src="../media/handover.png" width="100%" alt="Claude のセッションを Codex に引き継ぐダイアログ" />

</td>
</tr>
<tr>
<td valign="top">

### 複数アカウント

Claude と Codex はプロファイルフォルダーごとに 1 つのサインインを保持します。**アカウントを追加** は新しいフォルダーを作成し、そこでツールのサインインを開きます。自分で作成した `~/.claude-*` と `~/.codex-*` のフォルダーも自動で見つかります。各アカウントはサインインしているメールアドレスで表示され、サインイン済みの各 Antigravity アカウントも個別に追跡します。メインアカウントの選択、特定のアカウントでの Claude Code の起動、ツールごとの代替順序と優先モデルの設定ができます。10 分以内にサインインが終わらなければアカウントは再び外され、次のアカウントがそのフォルダーを使います。

</td>
<td valign="top">

<img src="../media/settings.png" width="100%" alt="設定: 接続済みアカウント（Claude と Codex に 2 つずつ）" />

</td>
</tr>
</table>

## 対応ツール

| ツール      | クォータの取得元                                              | 引き継ぎ用のセッション                     | 起動                                 |
| ----------- | ------------------------------------------------------------- | ------------------------------------------ | ------------------------------------ |
| Claude Code | プロファイルの OAuth 使用量エンドポイント (macOS ではキーチェーン) | `~/.claude/projects`                    | 選んだプロファイルで `claude` CLI    |
| Codex       | インストール済み CLI の app-server のレート制限メソッド       | `~/.codex/sessions`                        | `codex` CLI                          |
| Cursor      | サインイン中のセッションの使用量サマリー                      | Cursor Agent CLI のチャット (`~/.cursor/chats`) | `cursor-agent`、なければアプリ  |
| Antigravity | 起動中アプリのローカルサービス (プロセスとポートの所有者を検証) | `~/.gemini/antigravity-ide`              | Antigravity アプリ                   |

モデルの一覧は各ツール自身のデータから取得します: Claude Code のエイリアスと使用したモデル、Codex のモデルキャッシュ、`cursor-agent --list-models` (24 時間キャッシュ)。

## プライバシーと安全性

- **読み取り専用。** 既存のセッションを使います。パスワードを求めることも、トークンを保存することも、サインアウトさせることも、進行中の作業に手を出すこともありません。
- **期限切れのサインイン。** 作業がアカウント間で自動的に移る設定のとき、期限切れの Claude Code サインインは Claude Code 自身が更新します。最小限の Haiku リクエスト（1 語、ツールなし、何も保存しない）で、アカウントごとに最大 30 分に 1 回です。アプリがリフレッシュトークンを読んだり使ったりすることはありません。
- **通信先は 2 つだけ。** クォータの問い合わせは Anthropic と Cursor の使用量エンドポイントにのみ送られ、TLS 検証は有効です。Codex と Antigravity はローカルで読み取ります。
- **ディスクに秘密情報を残しません。** 設定は `%APPDATA%\Vibe Usage\settings.json` (Windows) または `~/Library/Application Support/Vibe Usage/settings.json` (macOS) に保存されます。クォータはメモリ上にのみ保持されます。
- **堅牢なアプリ。** ウィンドウは厳格な CSP のもとサンドボックスで動作し、ページ遷移や別ウィンドウを開くことはできず、自分自身のページにのみ応答します。Electron の fuse で `runAsNode`、`NODE_OPTIONS`、インスペクターを無効化し、ASAR の整合性検証を有効にしています。

## インストール

### Windows

[Releases](https://github.com/mustafacagri/vibe-usage/releases) から `Vibe-Usage-<バージョン>-win-x64.zip` (または `-arm64`) をダウンロードして展開し、`Vibe Usage.exe` を実行します。アプリはタスクトレイに常駐します。

アプリはコード署名されていないため、初回起動時に Windows SmartScreen が「**Windows によって PC が保護されました**」と表示することがあります。**詳細情報**をクリックし、**実行**を選んでください。

### macOS

アプリはまだ Apple Developer ID で署名されていないため、自分でビルドするのがいちばん確実です。必要なのは Node.js 24 だけです:

```sh
git clone https://github.com/mustafacagri/vibe-usage.git && cd vibe-usage
npm ci
npm run build:mac
cp -R "release/mac-arm64/Vibe Usage.app" /Applications/
```

Intel Mac ではフォルダー名が `release/mac` になります。自分でビルドしたアプリは隔離属性が付かないため、そのまま開けます。`.zip` や `.dmg` をダウンロードした場合は、初回起動時に Gatekeeper にブロックされます。アプリを右クリックして**開く**を選ぶか、次のコマンドを実行してください:

```sh
xattr -dr com.apple.quarantine "/Applications/Vibe Usage.app"
```

## コマンドライン

同じデータをターミナルでも確認できます。CLI はデスクトップアプリと設定・言語を共有します。

```sh
npm run cli -- status [--json]
npm run watch
npm run cli -- run <claude|codex|cursor> [--account ID] [--cwd PATH] [--model MODEL] [--dry-run]
npm run cli -- handover [--from TOOL] [--to TOOL] [--session ID] [--cwd PATH]
```

`run` はクォータが確認できたアカウントだけを使います。そうでない場合は `--account` でアカウントを指定してください。`--dry-run` は何も起動せずに、使われるアカウントとコマンドを表示します。

## 開発

コマンド、プロジェクト構成、環境変数については[英語版 README の「Development」](../../README.md#development)を参照してください。

## 制限事項

- macOS 版は公証 (notarization) されていません ([macOS](#macos) を参照)。
- Antigravity のセッションのモデルは非公開のローカル記録から読み取ります。読み取れない場合、モデルは空欄になります。
- Cursor IDE (Composer) のチャットは引き継げません。読み取るのは Cursor Agent CLI のセッションだけです。

## ライセンス

[MIT](../../LICENSE)
