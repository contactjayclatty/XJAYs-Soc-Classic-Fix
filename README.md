# School of Chaos Classic — Crash on Launch (Multi-Device Investigation)

![Platform](https://img.shields.io/badge/platform-Android-3DDC84?logo=android&logoColor=white)
![Status](https://img.shields.io/badge/status-unfixed%20upstream-critical)
![Module](https://img.shields.io/badge/module-v0.3%20experimental-orange)
![Confirmed devices](https://img.shields.io/badge/confirmed%20on-3%2B%20device%20families-informational)
![License](https://img.shields.io/badge/license-MIT-blue)

This repo documents a native crash-on-launch bug in **School of Chaos Classic**
(`com.vnlentertainment.socclassic`), the investigation that found its exact
cause, and evidence that it's affecting multiple, unrelated Android device
manufacturers — not just one phone or RAM tier as first suspected.

**Upstream is still unfixed.** An **experimental** root-only Zygisk module
(**[v0.3](https://github.com/contactjayclatty/XJAYs-Soc-Classic-Fix/releases/tag/v0.3)**)
is published for people who want a device-side workaround. It is **not** a
guaranteed fix — see [Status](#status) and the project site
([Download](https://contactjayclatty.github.io/XJAYs-Soc-Classic-Fix/download.html)).

---

## Table of contents

- [About the game](#about-the-game)
- [The issue](#the-issue)
- [How it happens](#how-it-happens)
- [Why it happens](#why-it-happens)
- [Confirmed across multiple devices](#confirmed-across-multiple-devices)
- [Status](#status)
- [Experimental module (v0.3)](#experimental-module-v03)
- [How you can help](#how-you-can-help)
- [Repo layout](#repo-layout)
- [Disclaimer](#disclaimer)

---

## About the game

**School of Chaos Classic** (`com.vnlentertainment.socclassic`) is a Unity-built,
open-world school-life sim/RPG by VNL Entertainment — players walk around a
schoolyard, complete quests, buy and sell items at the Market Place, and level
up their character. It's built on **Unity 2017.4.34f1**, a 2018-era engine
release, and ships **64-bit only** (no `armeabi-v7a` build at all) — both
details turn out to be directly relevant to the bug below.

## The issue

The game crashes shortly after launch — it gets past the splash screen and
into the loading scene, then dies silently back to the home screen. No error
dialog, no ANR, nothing in `AndroidRuntime` in most cases — it just
disappears. It was first noticed on a Pixel 9 Pro XL (16GB RAM) and initially
assumed to be specific to high-RAM Pixel devices.

**It is not.** As of this writing, the identical crash signature has been
confirmed on hardware from at least three unrelated manufacturers — see
[Confirmed across multiple devices](#confirmed-across-multiple-devices).

The crash is also **intermittent** on any single device — it doesn't happen
on every launch, which is a direct consequence of the root cause (see below),
not a sign of a flaky install.

## How it happens

Every crash shows the same pattern in `logcat`, regardless of device:

```
Unity   : Using memoryadresses from more that 16GB of memory
```
*(the typo is in the game's own log output)*

...immediately followed by a native crash. On some devices this surfaces as:

```
ActivityManager: Process com.vnlentertainment.socclassic (pid ####) has died: fg TOP
Zygote  : Process #### exited due to signal 11 (Segmentation fault)
```

On others it's caught and re-raised as a Java-level error with a real fault
address, e.g.:

```
E/CRASH: signal 11 (SIGSEGV), code 1 (SEGV_MAPERR), fault addr 0000000000119b8c
E/AndroidRuntime: FATAL EXCEPTION: main
E/AndroidRuntime: java.lang.Error: signal 11 (SIGSEGV), code 1 (SEGV_MAPERR), fault addr 0000000000119b8c
```

Either way it's a **native segfault**, not a normal Java exception. The fault
addresses observed across multiple crash logs are all small, garbage-looking
values in a narrow range (roughly `0x119000`–`0x12A000`) — consistent with a
legitimate large address having its high bits truncated off by a pointer-
packing bug, then dereferenced. It happens right as the game loads its first
asset bundle, a few seconds into the loading sequence.

## Why it happens

Pulling the installed APK and inspecting `libunity.so` confirms Unity
**2017.4.34f1** — years before Unity properly supported large 64-bit address
spaces on Android. The crash string sits directly next to Unity's own native
memory allocator's diagnostic strings inside the binary:

```
Could not allocate memory: System out of memory!
Trying to allocate: %zuB with %zu alignment. MemoryLabel: %s
Allocation happend at: Line:%d in %s
[ %s ] used: %zuB | peak: %zuB | reserved: %zuB
Using memoryadresses from more that 16GB of memory
```

That 2017-era allocator packs its allocation bookkeeping assuming addresses
stay under roughly **16GB (2³⁴)** of address space. On a 64-bit process,
Android's ASLR (address space layout randomization) decides where to place
the app's heap on every launch. When it happens to land **above** that
threshold, the allocator's packed pointer representation overflows,
corrupting memory — and the app segfaults almost immediately after logging
that warning.

**Updated understanding:** this was initially framed as a "16GB+ RAM phones"
issue, since it first showed up reliably on a 16GB Pixel. Having now seen the
identical crash on devices from other manufacturers where the RAM tier isn't
confirmed to be 16GB, the more accurate framing is that this is tied to
**Android's ASLR address-space entropy in general** — which has trended
upward across Android versions — rather than a strict RAM cutoff. More RAM
likely still correlates with higher risk (if Unity sizes any internal
reservations relative to detected system memory, larger reservations are more
likely to land in less-crowded, higher address regions), but it isn't the
whole story. Newer/higher-entropy Android builds appear to be the broader
common factor.

## Confirmed across multiple devices

| # | Manufacturer / evidence | Root cause match | Notes |
|---|---|---|---|
| 1 | Google (Pixel 9 Pro XL, 16GB RAM) | ✅ Exact signature + confirmed via live ASLR-disable test | Where this was first identified and diagnosed in depth |
| 2 | Transsion (Tecno/Infinix/itel-family device) | ✅ Exact signature, 7 crashes across one log capture | Not rooted, no workaround applied — raw bug reproducing |
| 3 | Xiaomi (MIUI) | ✅ Exact signature, 3 crashes across one log capture | Not rooted, no workaround applied — raw bug reproducing |

All three show the identical `Using memoryadresses from more that 16GB of
memory` line immediately preceding a native segfault. None of the non-Pixel
reports had root or any workaround installed, confirming this is the raw,
unmodified bug — not something specific to one OEM's Android build or one
person's device configuration.

## Status

| Item | State |
|---|---|
| Upstream fix (VNL / Unity update) | **None yet** |
| Root cause | Identified |
| Reported to VNL | Yes — see [`reports/SoC_Classic_crash_report.txt`](reports/SoC_Classic_crash_report.txt) |
| Experimental module | **[v0.3](https://github.com/contactjayclatty/XJAYs-Soc-Classic-Fix/releases/tag/v0.3) live** |

**The only real fix has to come from VNL Entertainment** — specifically,
updating the game's Unity engine version. Later Unity releases rewrote this
allocator to handle 64-bit address spaces correctly, which is exactly why
this bug class doesn't exist in modern Unity builds.

Until that happens, a community device-side workaround is available (next
section). It does not replace an upstream engine fix.

## Experimental module (v0.3)

A **root-only Zygisk module** disables ASLR for just this game's process
(`com.vnlentertainment.socclassic`), via `personality(ADDR_NO_RANDOMIZE)` in
Zygisk `preAppSpecialize` — on the theory that keeping the heap address low
and stable avoids the overflow above.

| | |
|---|---|
| Release | **[v0.3](https://github.com/contactjayclatty/XJAYs-Soc-Classic-Fix/releases/tag/v0.3)** (2026-07-13) |
| Package | `socfix_module.zip` · id `socfix_vnl` · versionCode `3` |
| ABI | arm64-v8a |
| Requirements | Root + Zygisk (KernelSU, or Magisk with Zygisk enabled) |
| Site | [Download page](https://contactjayclatty.github.io/XJAYs-Soc-Classic-Fix/download.html) |
| Source | [`archive/module/`](archive/module/) |

**Not a guaranteed fix.** It showed promising results in testing, but in one
run the mitigation was confirmed active and the game **still crashed**.
Primarily tested on KernelSU + Pixel 9 Pro XL; other OEMs where the crash is
confirmed were never tested with this module. Install at your own risk.

### Install (short)

1. Download [`socfix_module.zip`](https://github.com/contactjayclatty/XJAYs-Soc-Classic-Fix/releases/download/v0.3/socfix_module.zip)
2. Root manager → Modules → Install from storage → pick the zip
3. Reboot, launch the game
4. Optional: logcat filter `SocFix` should show ASLR disabled for the package

### Module history

| Version | Date | Notes |
|---|---|---|
| **v0.3** (current) | 2026-07-13 | Reverted experimental meminfo spoof (SELinux walls in zygote). ASLR-only again. Pinned libcxx for NDK r27. VT 0/65. |
| v0.2 | 2026-07-13 | Intermediate public release; superseded after the meminfo experiment was pulled. |
| v0.1 | 2026-07-13 | Initial Zygisk module — ASLR off for the game process only. |

## How you can help

The more device diversity we can document, the stronger the case for VNL
Entertainment to prioritize a real fix. If you're hitting this crash:

- Grab a `logcat` capture around the crash (filtered to
  `com.vnlentertainment.socclassic` is fine) and share it via
  [an issue](../../issues/new) or the [Discord](https://discord.gg/gkYmXkn57Z)
- Include your device model/manufacturer and RAM if you know it — and whether
  you tried the module
- No root or technical setup required just to report — the log alone is useful

## Repo layout

```
reports/    Crash investigation write-up addressed to the game's developers
archive/    Module source + historical notes (build/experiment yourself)
docs/       Project website (GitHub Pages) — status, download, FAQ
releases/   Published zips via GitHub Releases (v0.3 current)
logs/       Raw supporting logcat captures (gitignored, kept locally)
```

## Disclaimer

**I am not affiliated with, endorsed by, or acting on behalf of VNL
Entertainment in any way.** This is an independent, unofficial investigation
put together by a player, not a developer of the game. It exists solely to
document and help get fixed a crash-on-launch issue — it is not a mod, a
cheat, a cracking tool, or a way to unlock/change anything about the game.
No APK is modified, redistributed, or cracked as part of this project. The
experimental Zygisk module only changes an OS-level process flag (ASLR) for
that one package name.

If VNL Entertainment fixes this upstream, this project's job is done — that's
the actual goal here, not maintaining a workaround indefinitely.
