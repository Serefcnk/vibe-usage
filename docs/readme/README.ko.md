<div align="center">

[English](../../README.md) · [Türkçe](README.tr.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Português](README.pt.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [日本語](README.ja.md) · **한국어** · [简体中文](README.zh.md) · [Русский](README.ru.md)

<img src="../../assets/icon.png" width="96" alt="" />

# Vibe Usage

**구독 중인 모든 AI 코딩 서비스를 메뉴 막대 창 하나에서.**

Claude Code, Codex, Cursor, Antigravity의 남은 할당량을 확인하고, 아직 여유가 있는 도구를 실행하고, 진행 중인 작업을 다시 설명할 필요 없이 다른 도구로 넘기세요.

Windows 트레이 · macOS 메뉴 막대 · 13개 언어 · 비밀번호 없음, 토큰 저장 안 함

**[Windows·macOS용 다운로드](https://github.com/mustafacagri/vibe-usage/releases/latest)** · 터미널: [`npm install -g vibe-usage-cli`](https://www.npmjs.com/package/vibe-usage-cli)

<img src="../media/demo.gif" width="400" alt="Vibe Usage 둘러보기: 계정 전환, 모든 계정 나란히 보기, 간단히 보기, 스마트 실행, 작업 인계" />

<sub>[원본 해상도로 보기 (MP4)](../media/demo.mp4)</sub>

</div>

> 이 번역은 영어 README보다 늦게 갱신될 수 있습니다. 기준은 [영어 버전](../../README.md)입니다.

## 왜 필요한가요

여러 AI 도구로 코딩하다 보면 같은 벽에 계속 부딪힙니다. 작업 도중 5시간 한도가 바닥나고, 다른 도구를 열어 작업을 처음부터 다시 설명해야 합니다. 서비스마다 사용량을 보여 주는 곳이 다르고, 아예 보여 주지 않는 곳도 있습니다.

Vibe Usage는 컴퓨터에 이미 로그인된 세션을 읽어 모든 한도를 나란히 보여 줍니다. 얼마나 남았는지, 언제 초기화되는지 알 수 있습니다. 한 도구의 할당량이 부족해지면 할당량이 확인된 다음 도구를 프로젝트 폴더에서 실행하고, 현재 세션의 요약을 작성해 새 도구가 이전 도구가 멈춘 곳에서 이어서 작업하도록 합니다.

## 기능

<table>
<tr>
<td width="50%" valign="top">

### 할당량을 한눈에

모든 계정의 모든 한도: 5시간·주간 구간, 모델별 할당량, 지출 한도. 카운트다운으로 각 한도가 언제 초기화되는지 보여 줍니다. 새로 고침에 실패해도 마지막 측정값이 그대로 표시되며 오래된 데이터임이 분명히 표시됩니다. 알 수 없는 값을 가득 찬 할당량으로 보여 주는 일은 없습니다. 트레이 아이콘에 마우스를 올리면 각 도구의 남은 한도가 보입니다. 원하면 한도가 부족해지거나 다시 사용할 수 있게 될 때 알림을 받을 수 있습니다. 로그인 시 앱을 열 수도 있습니다.

</td>
<td width="50%" valign="top">

<img src="../media/main.png" width="100%" alt="Claude, Codex, Cursor, Antigravity의 할당량 카드 (도구별 계정을 나란히 표시)" />

<img src="../media/compact.png" width="100%" alt="간단히 보기: 계정마다 한 줄" />

</td>
</tr>
<tr>
<td valign="top">

### 스마트 실행

우선순위에서 할당량에 여유가 있음이 **확인된** 첫 번째 도구를 골라, 선택한 프로젝트 폴더에서 새 터미널로 엽니다. 확인할 수 있는 도구가 없으면 추측하지 않고 그 사실을 알려 줍니다.

</td>
<td valign="top">

<img src="../media/smart-launch.png" width="100%" alt="Claude의 5시간 한도가 거의 소진되어 Codex를 추천하는 스마트 실행" />

</td>
</tr>
<tr>
<td valign="top">

### 작업 인계

Claude Code, Codex, Cursor Agent, Antigravity의 세션을 하나 고르세요. Vibe Usage가 이를 프로젝트 폴더의 `VIBE_HANDOVER.md`로 요약합니다: 목표, 최근 대화, 수정한 파일, git 상태. 그런 다음 이 요약을 읽으라는 지시와 함께 대상 도구를 실행합니다. 선택한 폴더에서 시작된 세션만 목록에 표시됩니다.

</td>
<td valign="top">

<img src="../media/handover.png" width="100%" alt="Claude 세션을 Codex로 인계하는 대화 상자" />

</td>
</tr>
<tr>
<td valign="top">

### 여러 계정

Claude와 Codex는 프로필 폴더마다 하나의 로그인을 보관합니다. **계정 추가**는 새 폴더를 만들고 그곳에서 도구의 로그인을 엽니다. 직접 만든 `~/.claude-*`와 `~/.codex-*` 폴더도 자동으로 찾습니다. 각 계정은 로그인한 이메일로 표시되며, 로그인된 모든 Antigravity 계정도 따로 추적합니다. 기본 계정을 고르고, 특정 계정으로 Claude Code를 실행하고, 도구별 대체 순서와 선호 모델을 설정할 수 있습니다. 10분 안에 로그인이 끝나지 않으면 계정은 다시 제거되고, 다음 계정이 그 폴더를 사용합니다.

</td>
<td valign="top">

<img src="../media/settings.png" width="100%" alt="설정: 연결된 계정, Claude와 Codex에 각각 두 개" />

</td>
</tr>
</table>

## 지원 도구

| 도구        | 할당량을 읽는 곳                                          | 인계할 세션                                   | 실행                               |
| ----------- | --------------------------------------------------------- | --------------------------------------------- | ---------------------------------- |
| Claude Code | 프로필의 OAuth 사용량 엔드포인트 (macOS에서는 키체인)      | `~/.claude/projects`                          | 선택한 프로필로 `claude` CLI       |
| Codex       | 설치된 CLI app-server의 사용량 한도 메서드                 | `~/.codex/sessions`                           | `codex` CLI                        |
| Cursor      | 로그인된 세션의 사용량 요약                                | Cursor Agent CLI 채팅 (`~/.cursor/chats`)     | `cursor-agent`, 없으면 앱          |
| Antigravity | 실행 중인 앱의 로컬 서비스 (프로세스와 포트 소유자 확인)   | `~/.gemini/antigravity-ide`                   | Antigravity 앱                     |

모델 목록은 각 도구의 자체 데이터에서 가져옵니다: Claude Code 별칭과 사용한 모델, Codex 모델 캐시, `cursor-agent --list-models`(24시간 캐시).

## 개인정보 보호와 안전

- **읽기 전용.** 이미 있는 세션을 사용합니다. 비밀번호를 묻지 않고, 토큰을 저장하지 않으며, 로그아웃시키지 않고, 진행 중인 작업을 건드리지 않습니다.
- **만료된 로그인.** 작업이 계정 사이를 자동으로 옮겨 갈 수 있을 때, 만료된 Claude Code 로그인은 Claude Code가 직접 갱신합니다. 최소한의 Haiku 요청(한 단어, 도구 없음, 저장 없음)으로, 계정마다 최대 30분에 한 번입니다. 앱은 리프레시 토큰을 읽거나 사용하지 않습니다.
- **엔드포인트 두 곳.** 할당량 요청은 Anthropic과 Cursor의 사용량 엔드포인트로만 보내며 TLS 검증이 켜져 있습니다. Codex와 Antigravity는 로컬에서 읽습니다.
- **디스크에 비밀 정보 없음.** 설정은 `%APPDATA%\Vibe Usage\settings.json`(Windows) 또는 `~/Library/Application Support/Vibe Usage/settings.json`(macOS)에 저장됩니다. 할당량은 메모리에만 보관합니다.
- **잠긴 앱.** 창은 엄격한 CSP가 적용된 샌드박스에서 실행되며, 다른 페이지로 이동하거나 새 창을 열 수 없고, 자기 페이지에만 응답합니다. Electron fuse로 `runAsNode`, `NODE_OPTIONS`, 인스펙터를 끄고 ASAR 무결성 검증을 강제합니다.

## 설치

### Windows

[최신 릴리스](https://github.com/mustafacagri/vibe-usage/releases/latest)에서 `Vibe-Usage-<버전>-win-setup.exe`를 내려받아 실행하세요. 현재 사용자에게만 설치되며 관리자 권한이 필요 없습니다. 포터블 `Vibe-Usage-<버전>-win-x64.zip`(또는 `-arm64`)의 압축을 풀고 `Vibe Usage.exe`를 실행해도 됩니다. 설치한 앱은 스스로 최신 상태를 유지합니다. 새 버전은 백그라운드에서 내려받아지고 **다시 시작하여 업데이트**로 설치됩니다. 포터블 사본은 새 버전 링크를 보여 줍니다. 앱은 시스템 트레이에 상주합니다.

앱이 코드 서명되지 않았기 때문에 처음 실행할 때 Windows SmartScreen이 **Windows의 PC 보호**를 표시할 수 있습니다. **추가 정보**를 클릭한 뒤 **실행**을 누르세요.

### macOS

[최신 릴리스](https://github.com/mustafacagri/vibe-usage/releases/latest)에서 `Vibe-Usage-<버전>-mac-arm64.dmg`(Apple 실리콘, Intel은 `-mac-x64.dmg`)를 내려받아 열고 **Vibe Usage**를 응용 프로그램 폴더로 끌어 놓으세요. 앱이 아직 Apple Developer ID로 서명되지 않아 Gatekeeper가 첫 실행을 막습니다. **시스템 설정 › 개인정보 보호 및 보안**에서 **그래도 열기**를 클릭하거나 다음을 실행하세요:

```sh
xattr -dr com.apple.quarantine "/Applications/Vibe Usage.app"
```

이 단계를 건너뛰려면 직접 빌드하세요. Node.js 24만 있으면 됩니다:

```sh
git clone https://github.com/mustafacagri/vibe-usage.git && cd vibe-usage
npm ci
npm run build:mac
cp -R "release/mac-arm64/Vibe Usage.app" /Applications/
```

Intel Mac에서는 폴더 이름이 `release/mac`입니다. 직접 빌드한 앱은 격리되지 않아 바로 열립니다. macOS는 서명된 앱만 스스로를 교체하도록 허용하므로 새 버전도 같은 방법으로 설치합니다. 앱의 **다운로드** 버튼이 내 Mac에 맞는 디스크 이미지를 내려받습니다.

## 명령줄

같은 데이터를 터미널에서도 볼 수 있습니다. Windows와 macOS에서 데스크톱 앱 없이도 동작합니다. Node.js 24 이상이 필요하며 앱과 같은 로그인된 세션을 읽습니다. 둘 다 설치되어 있으면 설정과 언어를 공유합니다.

```sh
npm install -g vibe-usage-cli
vibe-usage status
```

<img src="../media/cli.png" width="640" alt="터미널의 vibe-usage status: Claude 계정 2개, Codex 2개, Cursor 1개, Antigravity 2개의 모든 창" />

```sh
vibe-usage status [--json]   # 모든 계정의 할당량을 한 번 표시, 스크립트용 --json
vibe-usage watch             # 같은 내용을 Ctrl+C까지 계속 새로 고침
vibe-usage run <claude|codex|cursor> [--account ID] [--cwd PATH] [--model MODEL] [--dry-run]
vibe-usage handover [--from TOOL] [--to TOOL] [--session ID] [--cwd PATH]
vibe-usage help
```

설치하지 않고 써 보려면 `npx vibe-usage-cli status`를 실행하세요.

`run`은 할당량이 확인된 계정으로 이 터미널에서 도구를 시작합니다. 그렇지 않으면 `--account`로 계정을 지정하세요 (ID는 `status --json`에 있습니다). `--dry-run`은 아무것도 시작하지 않고 계정과 명령을 출력합니다. `handover`는 폴더의 최신 세션(또는 `--session`)에 대한 `VIBE_HANDOVER.md`를 쓰고 그것으로 대상 도구를 엽니다.

## 개발

명령어, 프로젝트 구조, 환경 변수는 [영어 README의 "Development" 섹션](../../README.md#development)을 참고하세요.

## 제한 사항

- macOS 빌드는 공증(notarization)되지 않았습니다([macOS](#macos) 참고).
- Antigravity 세션의 모델은 문서화되지 않은 로컬 기록에서 읽습니다. 읽을 수 없으면 비워 둡니다.
- Cursor IDE(Composer) 채팅은 인계할 수 없으며, Cursor Agent CLI 세션만 읽습니다.

## 라이선스

[MIT](../../LICENSE)
