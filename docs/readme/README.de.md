<div align="center">

[English](../../README.md) · [Türkçe](README.tr.md) · **Deutsch** · [Español](README.es.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Português](README.pt.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [简体中文](README.zh.md) · [Русский](README.ru.md)

<img src="../../assets/icon.png" width="96" alt="" />

# Vibe Usage

**Alle AI-Coding-Abos, für die du zahlst, in einem Menüleistenfenster.**

Sieh, wie viel Kontingent Claude Code, Codex, Cursor und Antigravity noch haben, starte das Tool, das noch Luft hat,
und übergib eine halb fertige Aufgabe an ein anderes Tool, ohne sie neu zu erklären.

Windows-Infobereich · macOS-Menüleiste · 13 Sprachen · keine Passwörter, keine gespeicherten Tokens

**[Für Windows und macOS herunterladen](https://github.com/mustafacagri/vibe-usage/releases/latest)** · Terminal: [`npm install -g vibe-usage-cli`](https://www.npmjs.com/package/vibe-usage-cli)

<img src="../media/demo.gif" width="400" alt="Vibe Usage im Überblick: Wechsel zwischen Konten, alle Konten nebeneinander, die kompakte Ansicht, Smart-Start und Übergabe" />

<sub>[In voller Auflösung ansehen (MP4)](../media/demo.mp4)</sub>

</div>

> Diese Übersetzung kann hinter der englischen README zurückliegen; maßgeblich ist die [englische Fassung](../../README.md).

## Warum

Wer mit mehreren AI-Tools programmiert, stößt immer wieder an dieselbe Wand: Das 5-Stunden-Limit ist mitten in der
Aufgabe aufgebraucht, du öffnest ein anderes Tool und erklärst alles von vorn. Jeder Anbieter zeigt seine Nutzung an
einer anderen Stelle, manche gar nicht.

Vibe Usage liest die Sitzungen, die auf deinem Rechner bereits angemeldet sind, und zeigt alle Limits nebeneinander:
wie viel übrig ist und wann es zurückgesetzt wird. Wird ein Tool knapp, startet es das nächste mit verifiziertem
Kontingent in deinem Projektordner und schreibt eine Zusammenfassung der aktuellen Sitzung, damit das neue Tool dort
weitermacht, wo das alte aufgehört hat.

## Funktionen

<table>
<tr>
<td width="50%" valign="top">

### Kontingente auf einen Blick

Jedes Limit jedes Kontos: 5-Stunden- und Wochenfenster, modellbezogene Kontingente, Ausgabenbudgets. Countdowns zeigen,
wann jedes zurückgesetzt wird. Schlägt eine Aktualisierung fehl, bleibt der letzte Messwert sichtbar und ist klar als
veraltet markiert. Unbekannte Werte werden nie als volles Kontingent angezeigt. Fahren Sie über das Tray-Symbol, um zu
sehen, was jedem Tool noch bleibt; auf Wunsch benachrichtigt die App, wenn ein Limit knapp oder wieder verfügbar wird.
Die App kann bei der Anmeldung starten.

</td>
<td width="50%" valign="top">

<img src="../media/main.png" width="100%" alt="Kontingentkarten für Claude, Codex, Cursor und Antigravity, die Konten jedes Tools nebeneinander" />

<img src="../media/compact.png" width="100%" alt="Die kompakte Ansicht: eine Zeile pro Konto" />

</td>
</tr>
<tr>
<td valign="top">

### Smart-Start

Wählt das erste Tool in deiner Prioritätsreihenfolge, dessen Kontingent **verifiziert** noch Luft hat, und öffnet es in
einem neuen Terminal im gewählten Projektordner. Lässt sich kein Tool verifizieren, sagt es das, statt zu raten.

</td>
<td valign="top">

<img src="../media/smart-launch.png" width="100%" alt="Smart-Start empfiehlt Codex, weil Claudes 5-Stunden-Limit fast aufgebraucht ist" />

</td>
</tr>
<tr>
<td valign="top">

### Übergabe

Wähle eine Sitzung aus Claude Code, Codex, Cursor Agent oder Antigravity. Vibe Usage fasst sie im Projektordner als
`VIBE_HANDOVER.md` zusammen: Ziel, letzte Gesprächsrunden, berührte Dateien und Git-Status. Dann startet es das Zieltool
mit der Anweisung, diese Zusammenfassung zu lesen. Es werden nur Sitzungen aufgeführt, die im gewählten Ordner gestartet
wurden.

</td>
<td valign="top">

<img src="../media/handover.png" width="100%" alt="Übergabedialog, der eine Claude-Sitzung an Codex übergibt" />

</td>
</tr>
<tr>
<td valign="top">

### Mehrere Konten

Claude und Codex speichern eine Anmeldung pro Profilordner. **Konto hinzufügen** legt einen neuen Ordner an und öffnet
dort die Anmeldung des Tools; selbst angelegte `~/.claude-*`- und `~/.codex-*`-Ordner werden automatisch gefunden. Jedes
Konto wird mit der E-Mail-Adresse seiner Anmeldung angezeigt, und auch jedes angemeldete Antigravity-Konto wird getrennt
verfolgt. Wähle das Hauptkonto, starte Claude Code mit einem bestimmten Konto und lege die Ausweichreihenfolge sowie das
bevorzugte Modell pro Tool fest.
Eine Anmeldung, die nicht innerhalb von zehn Minuten abgeschlossen ist, entfernt das Konto wieder; das nächste Konto verwendet seinen Ordner.

</td>
<td valign="top">

<img src="../media/settings.png" width="100%" alt="Einstellungen: verbundene Konten, je zwei für Claude und Codex" />

</td>
</tr>
</table>

## Unterstützte Tools

| Tool        | Woher das Kontingent kommt                                              | Sitzungen für die Übergabe                    | Start                                 |
| ----------- | ----------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------- |
| Claude Code | OAuth-Nutzungsendpunkt des Profils (unter macOS aus dem Schlüsselbund)  | `~/.claude/projects`                          | `claude` CLI mit dem gewählten Profil |
| Codex       | Ratenlimit-Methoden des App-Servers der installierten CLI               | `~/.codex/sessions`                           | `codex` CLI                           |
| Cursor      | Nutzungsübersicht der angemeldeten Sitzung                              | Cursor-Agent-CLI-Chats (`~/.cursor/chats`)    | `cursor-agent`, sonst die App         |
| Antigravity | Lokaler Dienst der laufenden App (Prozess- und Port-Besitz geprüft)     | `~/.gemini/antigravity-ide`                   | Antigravity-App                       |

Modelllisten stammen aus den eigenen Daten jedes Tools: Claude-Code-Aliasse und die von dir genutzten Modelle, der
Codex-Modellcache und `cursor-agent --list-models` (24 Stunden zwischengespeichert).

## Datenschutz und Sicherheit

- **Nur lesend.** Es nutzt die vorhandenen Sitzungen. Es fragt nie nach einem Passwort, speichert nie ein
  Token, meldet dich nie ab und greift nie in laufende Arbeit ein.
- **Abgelaufene Anmeldung.** Wenn Arbeit von selbst zwischen Konten wechseln darf, erneuert Claude Code selbst eine abgelaufene Anmeldung: mit einer minimalen Haiku-Anfrage (ein Wort, keine Tools, nichts gespeichert), höchstens alle 30 Minuten pro Konto. Die App liest oder nutzt das Refresh-Token nie.
- **Zwei Endpunkte.** Kontingentanfragen gehen nur an die Nutzungsendpunkte von Anthropic und Cursor, mit aktiver
  TLS-Prüfung. Codex und Antigravity werden lokal gelesen.
- **Nichts Geheimes auf der Festplatte.** Einstellungen liegen in `%APPDATA%\Vibe Usage\settings.json` (Windows) oder
  `~/Library/Application Support/Vibe Usage/settings.json` (macOS). Kontingente werden nur im Speicher gehalten.
- **Abgeschottete App.** Das Fenster läuft in einer Sandbox mit strikter CSP, kann nicht navigieren oder andere Fenster
  öffnen und antwortet nur seiner eigenen Seite. Electron-Fuses deaktivieren `runAsNode`, `NODE_OPTIONS` und den
  Inspector und erzwingen die ASAR-Integrität.

## Installation

### Windows

Lade `Vibe-Usage-<version>-win-setup.exe` aus dem [neuesten Release](https://github.com/mustafacagri/vibe-usage/releases/latest) herunter und starte es: Es installiert nur für deinen Benutzer, ohne Administratorrechte. Oder nimm die portable `Vibe-Usage-<version>-win-x64.zip` (oder `-arm64`), entpacke sie und starte `Vibe Usage.exe`. Die App sitzt im Infobereich und verlinkt eine neue Version, sobald es eine gibt.

Die App ist nicht codesigniert, daher meldet Windows SmartScreen beim ersten Start eventuell **Der Computer wurde durch Windows geschützt**. Klicke auf **Weitere Informationen** und dann auf **Trotzdem ausführen**.

### macOS

Lade `Vibe-Usage-<version>-mac-arm64.dmg` (Apple Silicon; Intel: `-mac-x64.dmg`) aus dem [neuesten Release](https://github.com/mustafacagri/vibe-usage/releases/latest) herunter, öffne es und ziehe **Vibe Usage** in den Ordner „Programme“. Die App ist noch nicht mit einer Apple Developer ID signiert, daher blockiert Gatekeeper den ersten Start: Öffne **Systemeinstellungen › Datenschutz & Sicherheit** und klicke auf **Dennoch öffnen**, oder führe aus:

```sh
xattr -dr com.apple.quarantine "/Applications/Vibe Usage.app"
```

Um diesen Schritt zu sparen, baust du sie selbst. Du brauchst nur Node.js 24:

```sh
git clone https://github.com/mustafacagri/vibe-usage.git && cd vibe-usage
npm ci
npm run build:mac
cp -R "release/mac-arm64/Vibe Usage.app" /Applications/
```

Auf einem Intel-Mac heißt der Ordner `release/mac`. Eine selbst gebaute App wird nicht unter Quarantäne gestellt und öffnet sich direkt. Eine neue Version verlinkt die App; sie wird genauso installiert.

## Kommandozeile

Dieselben Daten gibt es im Terminal, unter Windows und macOS, mit oder ohne Desktop-App. Die CLI braucht Node.js 24 oder neuer und liest dieselben angemeldeten Sitzungen wie die App; sind beide installiert, teilen sie Einstellungen und Sprache.

```sh
npm install -g vibe-usage-cli
vibe-usage status
```

<img src="../media/cli.png" width="640" alt="vibe-usage status im Terminal: alle Fenster von zwei Claude-, zwei Codex-, einem Cursor- und zwei Antigravity-Konten" />

```sh
vibe-usage status [--json]   # das Kontingent aller Konten einmal; --json für Skripte
vibe-usage watch             # dasselbe, aktualisiert bis Strg+C
vibe-usage run <claude|codex|cursor> [--account ID] [--cwd PATH] [--model MODEL] [--dry-run]
vibe-usage handover [--from TOOL] [--to TOOL] [--session ID] [--cwd PATH]
vibe-usage help
```

Ohne Installation ausprobieren: `npx vibe-usage-cli status`.

`run` startet das Tool in diesem Terminal mit einem Konto mit verifiziertem Kontingent; andernfalls nenne eines mit `--account` (die IDs stehen in `status --json`). `--dry-run` gibt Konto und Befehl aus, ohne etwas zu starten. `handover` schreibt `VIBE_HANDOVER.md` für die neueste Sitzung des Ordners (oder `--session`) und öffnet damit das Zieltool.

## Entwicklung

Befehle, Projektstruktur und Umgebungsvariablen findest du im
[Abschnitt „Development“ der englischen README](../../README.md#development).

## Einschränkungen

- Der macOS-Build ist nicht notarisiert (siehe [macOS](#macos)).
- Das Modell einer Antigravity-Sitzung stammt aus einem undokumentierten lokalen Eintrag; ist es nicht lesbar, bleibt
  das Modell leer.
- Chats aus der Cursor IDE (Composer) können nicht übergeben werden; nur Sitzungen der Cursor Agent CLI werden gelesen.

## Lizenz

[MIT](../../LICENSE)
