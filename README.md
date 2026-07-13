# School of Chaos Classic — 16GB RAM Crash Fix

![Platform](https://img.shields.io/badge/platform-Android-3DDC84?logo=android&logoColor=white)
![Root Required](https://img.shields.io/badge/root-required-critical?logo=android&logoColor=white)
![Status](https://img.shields.io/badge/status-fix%20confirmed-success)
![License](https://img.shields.io/badge/license-MIT-blue)
![VirusTotal](https://img.shields.io/badge/VirusTotal-0%2F65%20detections-success?logo=virustotal&logoColor=white)

A root-only Android module that fixes a native crash-on-launch affecting
**School of Chaos Classic** on modern high-RAM devices, along with the full
investigation that tracked down why it happens.

> ⚠️ **This requires root.** The fix is a system-level module that runs before
> the game starts. It will **not** work on a stock, non-rooted phone. See
> [Requirements](#requirements) below.

> [!IMPORTANT]
> This has only been tested on **KernelSU on a Pixel 9 Pro XL** (root + method).
> It should work on other Zygisk-compatible setups, but if it doesn't work for
> your device or root method, please [open an issue](https://github.com/contactjayclatty/XJAYs-Soc-Classic-Fix/issues/new)
> or reach out — see [Contact](docs/contact.html).

> [!NOTE]
> **Join the Discord for updates:** https://discord.gg/gkYmXkn57Z
> If the developers haven't fixed this upstream, I'll be working on a
> non-root version — announcements will go there first.

---

## Table of contents

- [About the game](#about-the-game)
- [The issue](#the-issue)
- [How it happens](#how-it-happens)
- [Why it happens](#why-it-happens)
- [The fix](#the-fix)
- [Requirements](#requirements)
- [Installation](#installation)
- [Tested on](#tested-on)
- [Security](#security)
- [Building from source](#building-from-source)
- [Repo layout](#repo-layout)
- [Disclaimer](#disclaimer)

---

## About the game

**School of Chaos Classic** (`com.vnlentertainment.socclassic`) is a Unity-built,
open-world school-life sim/RPG by VNL Entertainment — players walk around a
schoolyard, complete quests, buy and sell items at the Market Place, and level
up their character. It's built on an older Unity engine release (2017.4 LTS),
which is directly relevant to the bug below.

## The issue

On phones with **16GB or more of RAM** (Pixel 8 Pro, Pixel 9 Pro / Pro XL, and
a growing number of current-generation flagships), the game crashes shortly
after launch — it gets past the splash screen and into the loading scene, then
silently dies back to the home screen. No error dialog, no ANR, nothing in
`AndroidRuntime` — it just disappears.

The crash is **intermittent**: it doesn't happen on every single launch, which
made it easy to dismiss as a fluke before the actual trigger was identified
(see [Why it happens](#why-it-happens)).

## How it happens

Watching `logcat` across repeated launches shows the same pattern every time
it crashes:

```
Unity   : Using memoryadresses from more that 16GB of memory
ActivityManager: Process com.vnlentertainment.socclassic (pid ####) has died: fg TOP
Zygote  : Process #### exited due to signal 11 (Segmentation fault)
```

That's a **native segfault** (SIGSEGV), not a Java exception — there's no
`FATAL EXCEPTION` anywhere in the log. It happens right as the game loads its
first asset bundle (`LoaderScene` / `bundleVer`), a few seconds into the
loading sequence.

## Why it happens

Pulling the installed APK and inspecting `libunity.so` confirms the game is
built on **Unity 2017.4.34f1** — released in 2018, years before Unity properly
supported large 64-bit address spaces on Android.

The crash string above sits directly next to Unity's own native memory
allocator's diagnostic strings inside `libunity.so`:

```
Could not allocate memory: System out of memory!
Trying to allocate: %zuB with %zu alignment. MemoryLabel: %s
Allocation happend at: Line:%d in %s
[ %s ] used: %zuB | peak: %zuB | reserved: %zuB
Using memoryadresses from more that 16GB of memory
```

That 2017-era allocator packs its allocation bookkeeping assuming addresses
stay under roughly **16GB (2³⁴)**. On a phone with 16GB of physical RAM, Android's
ASLR (address space layout randomization) can place the app's heap **above**
that threshold. When it does, the allocator's packed pointer representation
overflows, corrupting memory — and the app segfaults almost immediately after
logging that warning.

Because ASLR re-randomizes the heap location on every launch, this explains
the intermittent behavior perfectly: sometimes the heap lands below the
threshold (game runs fine), sometimes it doesn't (instant crash).

This was **proven**, not just theorized — see [The fix](#the-fix) below.

## The fix

This repo ships a **Zygisk module** that hooks into the game's process
*before it starts* (via the `preAppSpecialize` callback, which runs with
elevated privilege prior to the app being sandboxed) and calls:

```c
personality(ADDR_NO_RANDOMIZE);
```

...scoped to `com.vnlentertainment.socclassic` only. This disables address
randomization for that process alone, keeping its heap addresses low and
stable, which avoids the overflow entirely. **No other app on the device is
affected.**

### Confirmed with testing

| Condition | Launches | Crashes |
|---|---|---|
| ASLR enabled (no fix) | Repeated launches | Crashed reliably |
| ASLR disabled (fix active) | 10 consecutive launches | **0 crashes** |

This is a device-side workaround, not a patch to the game itself — a real,
permanent fix requires the developers to update their Unity engine version
(later Unity releases rewrote this allocator to handle 64-bit address spaces
correctly). The full writeup addressed to the developers, including the
supporting evidence, is in
[`reports/SoC_Classic_crash_report.txt`](reports/SoC_Classic_crash_report.txt).

## Requirements

- **Root access is mandatory.** This is not an APK patch or a mod — it's a
  system-level module that runs inside the Android OS itself.
- A **Zygisk-compatible** root solution, such as:
  - Magisk with Zygisk enabled, or
  - KernelSU / KernelSU-Next + a Zygisk implementation (Zygisk Next, ReZygisk, etc.)
- Without one of the above, this module **cannot be installed and will not
  do anything.**

## Installation

1. Download `socfix_module.zip` from the
   [latest release](../../releases/latest), or use `dist/socfix_module.zip`
   in this repo.
2. Install it as a module:
   - Via your root manager app's "install module from storage" option, **or**
   - From a root shell:
     ```
     ksud module install socfix_module.zip
     ```
3. **Reboot your device.** Zygisk modules only take effect after a reboot,
   since they hook into the `zygote` process at boot time.
4. Launch the game as normal.

## Tested on

| | |
|---|---|
| **Device** | Google Pixel 9 Pro XL |
| **RAM** | 16GB |
| **Android version** | 17 (build `CP31.260618.005`) |
| **Root** | KernelSU-Next + Zygisk implementation (classic Zygisk module ABI) |
| **Game version** | 1.822 (build `cea6b550-3db9-4510-864b-a1c2a0089fa7`) |
| **Result** | 10/10 successful launches with the fix active |

It should work on any Zygisk-capable rooted device with 16GB+ RAM hitting the
same crash, since the fix targets the app's process directly rather than
anything device-specific — but it has only been verified on the configuration
above.

## Security

Every release is scanned with [VirusTotal](https://www.virustotal.com/) (60+
antivirus engines) before publishing.

| Release | Result | Report |
|---|---|---|
| v0.3 | **0 / 65 engines flagged it** | [View full report](https://www.virustotal.com/gui/file/c9e4a9565146b3b6fd3c0bba517b3bdc00cf3b1133bf0141e286d037de2968e6) |

- SHA256: `c9e4a9565146b3b6fd3c0bba517b3bdc00cf3b1133bf0141e286d037de2968e6`

The module's full source is in this repo (`module/jni/socfix.cpp`, ~50 lines)
— it does exactly one thing: check the running process's package name, and if
it matches the game, call `personality(ADDR_NO_RANDOMIZE)`. No network access,
no data collection. You don't have to take a scan's word for it — read it
yourself, or build from source and compare the hash.

## Building from source

Requires the Android NDK (built and tested with **NDK r27**).

```sh
cd module/jni
ndk-build
```

This produces `module/jni/libs/arm64-v8a/libsocfix.so`. Copy it to
`module/package/zygisk/arm64-v8a.so`, then zip the contents of
`module/package/` (i.e. `module.prop` and the `zygisk/` folder) to produce an
installable module.

## Repo layout

```
module/jni/       Module source (socfix.cpp, Android.mk, Application.mk, zygisk.hpp, libcxx submodule)
module/package/   Installable module contents (module.prop + zygisk/arm64-v8a.so)
dist/             Packaged, ready-to-install module.zip
reports/          Crash investigation write-up addressed to the game's developers
screenshots/      Before/after proof of the fix working in-game
```

## Disclaimer

**I am not affiliated with, endorsed by, or acting on behalf of VNL
Entertainment in any way.** This is an independent, unofficial fix, put
together by a player, not a developer of the game.

This project exists **solely to fix the crash-on-launch issue** described
above. It is not a mod, a cheat, a cracking tool, or a way to unlock/change
anything about the game itself — it changes nothing about the app's behavior
other than working around the one crash. It was produced by reverse-engineering
publicly observable crash behavior (`logcat` output and strings in the app's
own native libraries), and it does not modify, redistribute, or crack the
game's APK or assets — it only changes an OS-level setting (ASLR) for that
app's process, on the end user's own rooted device.

Provided as-is, with no warranty. If VNL Entertainment fixes this upstream
(see [Requirements](#requirements) and the linked crash report), this project
becomes unnecessary and I'd encourage using the official, patched version
instead.
