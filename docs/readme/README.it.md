<div align="center">

[English](../../README.md) · [Türkçe](README.tr.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · **Italiano** · [Português](README.pt.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [简体中文](README.zh.md) · [Русский](README.ru.md)

<img src="../../assets/icon.png" width="96" alt="" />

# Vibe Usage

**Tutti gli abbonamenti di programmazione con IA che paghi, in un'unica finestra della barra dei menu.**

Guarda quanta quota resta a Claude Code, Codex, Cursor e Antigravity, avvia lo strumento che ha ancora margine e passa un
lavoro a metà da uno strumento all'altro senza doverlo rispiegare.

Area di notifica di Windows · barra dei menu di macOS · 13 lingue · nessuna password, nessun token salvato

<img src="../media/demo.gif" width="400" alt="Panoramica di Vibe Usage: cambio di account, tutti gli account affiancati, la vista compatta, Avvio Intelligente e Trasferisci" />

<sub>[Guarda a piena risoluzione (MP4)](../media/demo.mp4)</sub>

</div>

> Questa traduzione può essere indietro rispetto al README in inglese; fa fede la [versione inglese](../../README.md).

## Perché

Se programmi con più strumenti di IA, sbatti sempre contro lo stesso muro: il limite di 5 ore finisce a metà lavoro,
apri un altro strumento e ricominci a spiegare tutto da capo. Ogni fornitore mostra l'utilizzo in un posto diverso, e
alcuni non lo mostrano affatto.

Vibe Usage legge le sessioni già attive sul tuo computer e mostra tutti i limiti fianco a fianco: quanto resta e quando
si azzera. Quando uno strumento sta per esaurirsi, avvia il successivo con quota verificata nella cartella del progetto
e scrive un riepilogo della sessione corrente, così il nuovo strumento riprende da dove si era fermato il precedente.

## Funzionalità

<table>
<tr>
<td width="50%" valign="top">

### Quote a colpo d'occhio

Ogni limite di ogni account: finestre di 5 ore e settimanali, quote per modello, budget di spesa. I conti alla rovescia
indicano quando ciascuno si azzera. Se un aggiornamento fallisce, l'ultima lettura resta visibile ed è chiaramente
segnata come non aggiornata. I valori sconosciuti non vengono mai mostrati come quota piena. Passa sopra l’icona nella
barra per vedere quanto resta a ogni strumento; se vuoi, ricevi una notifica quando un limite sta per esaurirsi o torna
disponibile. L’app può aprirsi all’accesso.

</td>
<td width="50%" valign="top">

<img src="../media/main.png" width="100%" alt="Schede delle quote di Claude, Codex, Cursor e Antigravity, con gli account di ogni strumento affiancati" />

<img src="../media/compact.png" width="100%" alt="La vista compatta: una riga per account" />

</td>
</tr>
<tr>
<td valign="top">

### Avvio Intelligente

Sceglie il primo strumento nel tuo ordine di priorità con margine **verificato** sulla quota e lo apre in un nuovo
terminale nella cartella di progetto scelta. Se nessuno strumento può essere verificato, lo dice invece di tirare a
indovinare.

</td>
<td valign="top">

<img src="../media/smart-launch.png" width="100%" alt="L'Avvio Intelligente consiglia Codex perché il limite di 5 ore di Claude è quasi esaurito" />

</td>
</tr>
<tr>
<td valign="top">

### Trasferisci

Scegli una sessione di Claude Code, Codex, Cursor Agent o Antigravity. Vibe Usage la riassume in `VIBE_HANDOVER.md`
nella cartella del progetto: l'obiettivo, gli ultimi scambi, i file modificati e lo stato di git. Poi avvia lo
strumento di destinazione con l'istruzione di leggere quel riepilogo. Sono elencate solo le sessioni avviate nella
cartella scelta.

</td>
<td valign="top">

<img src="../media/handover.png" width="100%" alt="Finestra di trasferimento di una sessione Claude a Codex" />

</td>
</tr>
<tr>
<td valign="top">

### Più account

Claude e Codex conservano un accesso per cartella del profilo. **Aggiungi account** crea una nuova cartella e vi apre
l'accesso dello strumento; le cartelle `~/.claude-*` e `~/.codex-*` create da te vengono trovate automaticamente. Ogni
account è mostrato con l'e-mail con cui ha effettuato l'accesso, e anche ogni account Antigravity connesso viene seguito
separatamente. Scegli l'account principale, avvia Claude Code con un account specifico e imposta l'ordine di riserva e
il modello preferito per ogni strumento.
Un accesso non completato entro dieci minuti rimuove di nuovo l'account, e l'account successivo ne riusa la cartella.

</td>
<td valign="top">

<img src="../media/settings.png" width="100%" alt="Impostazioni: account collegati, due per Claude e due per Codex" />

</td>
</tr>
</table>

## Strumenti supportati

| Strumento   | Da dove arriva la quota                                                    | Sessioni da trasferire                         | Avvio                                    |
| ----------- | -------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------- |
| Claude Code | Endpoint di utilizzo OAuth del profilo (Portachiavi su macOS)              | `~/.claude/projects`                           | CLI `claude` con il profilo scelto       |
| Codex       | Metodi dei limiti dell'app-server della CLI installata                     | `~/.codex/sessions`                            | CLI `codex`                              |
| Cursor      | Riepilogo di utilizzo della sessione connessa                              | Chat di Cursor Agent CLI (`~/.cursor/chats`)   | `cursor-agent`, altrimenti l'app         |
| Antigravity | Servizio locale dell'app in esecuzione (processo e porta verificati)       | `~/.gemini/antigravity-ide`                    | App Antigravity                          |

Gli elenchi dei modelli vengono dai dati di ogni strumento: gli alias di Claude Code e i modelli che hai usato, la cache
dei modelli di Codex e `cursor-agent --list-models` (in cache per 24 ore).

## Privacy e sicurezza

- **Sola lettura.** Usa le sessioni già esistenti. Non chiede mai una password, non salva mai un token, non
  ti disconnette mai e non tocca mai il lavoro in corso.
- **Accesso scaduto.** Quando il lavoro può passare da solo da un account all'altro, è Claude Code stesso a rinnovare un accesso scaduto: con una richiesta minima a Haiku (una parola, nessuno strumento, niente salvato), al massimo ogni 30 minuti per account. L'app non legge né usa mai il token di aggiornamento.
- **Due endpoint.** Le richieste di quota vanno solo agli endpoint di utilizzo di Anthropic e Cursor, con la verifica
  TLS attiva. Codex e Antigravity vengono letti in locale.
- **Niente di segreto su disco.** Le impostazioni sono in `%APPDATA%\Vibe Usage\settings.json` (Windows) o
  `~/Library/Application Support/Vibe Usage/settings.json` (macOS). Le quote restano solo in memoria.
- **Un'app blindata.** La finestra gira in una sandbox con una CSP rigorosa, non può navigare né aprire altre finestre
  e risponde solo alla propria pagina. I fuse di Electron disattivano `runAsNode`, `NODE_OPTIONS` e l'inspector e
  impongono l'integrità ASAR.

## Installazione

### Windows

Scarica `Vibe-Usage-<versione>-win-x64.zip` (o `-arm64`) dalle
[Releases](https://github.com/mustafacagri/vibe-usage/releases), estrailo ed esegui `Vibe Usage.exe`. L'app vive
nell'area di notifica.

L'app non è firmata, quindi al primo avvio Windows SmartScreen può mostrare **PC protetto da Windows**. Fai clic su **Ulteriori informazioni** e poi su **Esegui comunque**.

### macOS

L'app non è ancora firmata con un Apple Developer ID, quindi compilarla da te è la strada più semplice. Ti serve solo
Node.js 24:

```sh
git clone https://github.com/mustafacagri/vibe-usage.git && cd vibe-usage
npm ci
npm run build:mac
cp -R "release/mac-arm64/Vibe Usage.app" /Applications/
```

Su un Mac Intel la cartella è `release/mac`. Un'app compilata da te non viene messa in quarantena e si apre subito. Se
invece scarichi lo `.zip` o il `.dmg`, Gatekeeper la blocca al primo avvio: fai clic destro sull'app e scegli **Apri**,
oppure esegui:

```sh
xattr -dr com.apple.quarantine "/Applications/Vibe Usage.app"
```

## Riga di comando

Gli stessi dati sono disponibili nel terminale, su Windows e macOS, con o senza l’app desktop. Serve Node.js 24 o successivo; la CLI legge le stesse sessioni connesse dell’app e, se sono installate entrambe, condividono impostazioni e lingua.

```sh
npm install -g vibe-usage
vibe-usage status
```

<img src="../media/cli.png" width="640" alt="vibe-usage status in un terminale: tutte le finestre di due account Claude, due Codex, uno Cursor e due Antigravity" />

```sh
vibe-usage status [--json]   # la quota di tutti gli account, una volta; --json per gli script
vibe-usage watch             # lo stesso, aggiornato fino a Ctrl+C
vibe-usage run <claude|codex|cursor> [--account ID] [--cwd PATH] [--model MODEL] [--dry-run]
vibe-usage handover [--from TOOL] [--to TOOL] [--session ID] [--cwd PATH]
vibe-usage help
```

Per provarlo senza installarlo, esegui `npx vibe-usage status`.

`run` avvia lo strumento in questo terminale con un account con quota verificata; altrimenti indicane uno con `--account` (gli ID sono in `status --json`). `--dry-run` mostra l’account e il comando senza avviare nulla. `handover` scrive `VIBE_HANDOVER.md` per la sessione più recente della cartella (o `--session`) e apre con esso lo strumento di destinazione.

## Sviluppo

Comandi, struttura del progetto e variabili d'ambiente sono nella
[sezione "Development" del README in inglese](../../README.md#development).

## Limitazioni

- La build per macOS non è notarizzata (vedi [macOS](#macos)).
- Il modello di una sessione Antigravity viene da un record locale non documentato; se non è leggibile, resta vuoto.
- Le chat di Cursor IDE (Composer) non possono essere trasferite; vengono lette solo le sessioni di Cursor Agent CLI.

## Licenza

[MIT](../../LICENSE)
