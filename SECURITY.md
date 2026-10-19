# Security policy

Vibe Usage reads the sessions of AI tools that are signed in on your machine, so a flaw in it can expose credentials.
Reports are taken seriously and handled privately.

## Reporting a vulnerability

Please **do not open a public issue**. Report it privately through
[GitHub's vulnerability reporting](https://github.com/mustafacagri/vibe-usage/security/advisories/new) instead.

Include what you can of:

- the version and the operating system,
- what an attacker can do and what they need for it (local access, a crafted file, a malicious page),
- steps or a proof of concept to reproduce it.

You will get an answer in the advisory. Once a fix is released, the advisory is published with credit to you, unless
you prefer otherwise.

## Supported versions

Only the latest release receives security fixes.

## What is in scope

Among others:

- a token, cookie or other credential leaving the machine, reaching a log, the settings file or a handover brief;
- requests going to any host other than the allow-listed quota endpoints, or without TLS verification;
- the window running remote content, navigating away, or reaching privileged IPC from anything but its own page;
- a crafted session, transcript or settings file leading to code execution or to a command line the user did not
  choose;
- another local user's process being trusted as Antigravity's language server.

Issues in the AI tools themselves (Claude Code, Codex, Cursor, Antigravity) should go to their vendors.
