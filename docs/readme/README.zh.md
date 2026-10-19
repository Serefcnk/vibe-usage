<div align="center">

[English](../../README.md) · [Türkçe](README.tr.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Português](README.pt.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · **简体中文** · [Русский](README.ru.md)

<img src="../../assets/icon.png" width="96" alt="" />

# Vibe Usage

**你付费的所有 AI 编程订阅，尽在一个菜单栏窗口中。**

查看 Claude Code、Codex、Cursor 和 Antigravity 还剩多少额度，启动仍有余量的工具，并把做到一半的任务交给另一个工具，无需重新解释。

Windows 托盘 · macOS 菜单栏 · 13 种语言 · 无需密码，不保存令牌

**[下载 Windows 和 macOS 版](https://github.com/mustafacagri/vibe-usage/releases/latest)** · 终端: [`npm install -g vibe-usage-cli`](https://www.npmjs.com/package/vibe-usage-cli)

<img src="../media/demo.gif" width="400" alt="Vibe Usage 演示：切换账户、所有账户并排显示、紧凑视图、智能启动和移交任务" />

<sub>[观看全分辨率视频 (MP4)](../media/demo.mp4)</sub>

</div>

> 本译文可能落后于英文 README，请以[英文版](../../README.md)为准。

## 为什么需要它

如果你同时使用多个 AI 工具编程，总会一次次撞上同一堵墙：5 小时额度在任务进行到一半时用完，你打开另一个工具，又得从头解释任务。每家服务商显示用量的位置都不一样，有的干脆不显示。

Vibe Usage 读取你电脑上已经登录的会话，把所有额度并排展示：还剩多少、何时重置。当某个工具额度不足时，它会在你的项目文件夹中启动下一个额度已验证的工具，并写下当前会话的摘要，让新工具从旧工具停下的地方继续。

## 功能

<table>
<tr>
<td width="50%" valign="top">

### 额度一目了然

每个账户的每项额度：5 小时和每周窗口、按模型划分的额度、消费额度。倒计时显示每项额度何时重置。如果刷新失败，上一次的读数仍会显示，并明确标记为过期数据。未知数值绝不会显示为满额。将鼠标悬停在托盘图标上即可查看每个工具的剩余额度；还可以选择在额度不足或重新可用时收到通知。应用可以在登录时自动打开。

</td>
<td width="50%" valign="top">

<img src="../media/main.png" width="100%" alt="Claude、Codex、Cursor 和 Antigravity 的额度卡片，各工具的账户并排显示" />

<img src="../media/compact.png" width="100%" alt="紧凑视图：每个账户一行" />

</td>
</tr>
<tr>
<td valign="top">

### 智能启动

按你的优先顺序，选出第一个额度余量**已验证**的工具，并在你选择的项目文件夹中以新终端打开它。如果没有任何工具能够验证，它会如实告知，而不是猜测。

</td>
<td valign="top">

<img src="../media/smart-launch.png" width="100%" alt="由于 Claude 的 5 小时额度即将用尽，智能启动推荐了 Codex" />

</td>
</tr>
<tr>
<td valign="top">

### 移交任务

从 Claude Code、Codex、Cursor Agent 或 Antigravity 中选择一个会话。Vibe Usage 会在项目文件夹中把它总结为 `VIBE_HANDOVER.md`：目标、最近的对话、改动过的文件以及 git 状态。随后它启动目标工具，并提示其阅读这份摘要。列表中只显示在所选文件夹中启动的会话。

</td>
<td valign="top">

<img src="../media/handover.png" width="100%" alt="将 Claude 会话移交给 Codex 的对话框" />

</td>
</tr>
<tr>
<td valign="top">

### 多账户

Claude 和 Codex 每个配置文件文件夹保存一个登录。**添加账户** 会新建一个文件夹并在其中打开该工具的登录；你自己创建的 `~/.claude-*` 和 `~/.codex-*` 文件夹也会被自动发现。每个账户都以其登录邮箱显示，每个已登录的 Antigravity 账户也会分别跟踪。你可以选择主账户、用指定账户启动 Claude Code，并为每个工具设置备用顺序和首选模型。十分钟内未完成登录，该账户会被再次移除，下一个账户会复用它的文件夹。

</td>
<td valign="top">

<img src="../media/settings.png" width="100%" alt="设置：已连接的账户，Claude 和 Codex 各两个" />

</td>
</tr>
</table>

## 支持的工具

| 工具        | 额度来源                                         | 可移交的会话                            | 启动方式                         |
| ----------- | ------------------------------------------------ | --------------------------------------- | -------------------------------- |
| Claude Code | 配置文件的 OAuth 用量接口（macOS 上使用钥匙串）  | `~/.claude/projects`                    | 用所选配置文件运行 `claude` CLI  |
| Codex       | 已安装 CLI 的 app-server 速率限制方法            | `~/.codex/sessions`                     | `codex` CLI                      |
| Cursor      | 已登录会话的用量摘要                             | Cursor Agent CLI 对话（`~/.cursor/chats`） | `cursor-agent`，否则使用应用  |
| Antigravity | 正在运行的应用的本地服务（验证进程和端口归属）   | `~/.gemini/antigravity-ide`             | Antigravity 应用                 |

模型列表来自各工具自身的数据：Claude Code 的别名和你用过的模型、Codex 的模型缓存，以及 `cursor-agent --list-models`（缓存 24 小时）。

## 隐私与安全

- **只读。** 它使用已有的会话。从不索要密码，从不保存令牌，从不让你退出登录，也从不触碰进行中的工作。
- **登录过期。** 当工作可以自动在账号之间转移时，过期的 Claude Code 登录由 Claude Code 自己续期：一次最小的 Haiku 请求（一个词、不使用工具、不保存任何内容），每个账号最多每 30 分钟一次。应用从不读取或使用刷新令牌。
- **只有两个接口。** 额度请求只发往 Anthropic 和 Cursor 的用量接口，并开启 TLS 验证。Codex 和 Antigravity 在本地读取。
- **磁盘上没有机密。** 设置保存在 `%APPDATA%\Vibe Usage\settings.json`（Windows）或 `~/Library/Application Support/Vibe Usage/settings.json`（macOS）。额度只保存在内存中。
- **加固的应用。** 窗口在严格 CSP 的沙盒中运行，无法跳转或打开其他窗口，只响应自己的页面。Electron fuse 禁用了 `runAsNode`、`NODE_OPTIONS` 和检查器，并强制校验 ASAR 完整性。

## 安装

### Windows

从[最新版本](https://github.com/mustafacagri/vibe-usage/releases/latest)下载 `Vibe-Usage-<版本>-win-setup.exe` 并运行：只为当前用户安装，无需管理员权限。也可以下载便携版 `Vibe-Usage-<版本>-win-x64.zip`（或 `-arm64`），解压后运行 `Vibe Usage.exe`。应用常驻在系统托盘中，有新版本时会给出链接。

由于应用未经代码签名，首次启动时 Windows SmartScreen 可能会显示“**Windows 已保护你的电脑**”。点击**更多信息**，然后点击**仍要运行**。

### macOS

从[最新版本](https://github.com/mustafacagri/vibe-usage/releases/latest)下载 `Vibe-Usage-<版本>-mac-arm64.dmg`（Apple 芯片），打开后把 **Vibe Usage** 拖到"应用程序"。应用尚未使用 Apple Developer ID 签名，因此 Gatekeeper 会阻止首次启动：打开 **系统设置 › 隐私与安全性** 并点按 **仍要打开**，或运行：

```sh
xattr -dr com.apple.quarantine "/Applications/Vibe Usage.app"
```

在 Intel Mac 上，或想跳过这一步，可以自己构建。只需要 Node.js 24：

```sh
git clone https://github.com/mustafacagri/vibe-usage.git && cd vibe-usage
npm ci
npm run build:mac
cp -R "release/mac-arm64/Vibe Usage.app" /Applications/
```

在 Intel Mac 上文件夹是 `release/mac`。自己构建的应用不会被隔离，可以直接打开。有新版本时应用会给出链接，用同样的方式安装。

## 命令行

同样的数据也可以在终端中查看，支持 Windows 和 macOS，无论是否安装桌面应用。需要 Node.js 24 或更高版本，读取的是与应用相同的已登录会话；两者都安装时共享设置和语言。

```sh
npm install -g vibe-usage-cli
vibe-usage status
```

<img src="../media/cli.png" width="640" alt="终端中的 vibe-usage status：两个 Claude、两个 Codex、一个 Cursor 和两个 Antigravity 账户的所有窗口" />

```sh
vibe-usage status [--json]   # 显示一次所有账户的额度；脚本可用 --json
vibe-usage watch             # 同上，持续刷新直到 Ctrl+C
vibe-usage run <claude|codex|cursor> [--account ID] [--cwd PATH] [--model MODEL] [--dry-run]
vibe-usage handover [--from TOOL] [--to TOOL] [--session ID] [--cwd PATH]
vibe-usage help
```

不安装也可以试用：`npx vibe-usage-cli status`。

`run` 会用额度已验证的账户在当前终端启动工具；否则请用 `--account` 指定一个（ID 见 `status --json`）。`--dry-run` 只打印账户和命令，不启动任何程序。`handover` 为文件夹中最新的会话（或 `--session`）写入 `VIBE_HANDOVER.md`，并用它打开目标工具。

## 开发

命令、项目结构和环境变量请参阅[英文 README 的 “Development” 部分](../../README.md#development)。

## 限制

- macOS 版本未经公证（参见 [macOS](#macos)）。
- Antigravity 会话的模型来自未公开的本地记录；如果无法读取，模型留空。
- 无法移交 Cursor IDE（Composer）对话；只读取 Cursor Agent CLI 会话。

## 许可证

[MIT](../../LICENSE)
