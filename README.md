# School of Chaos Classic — Crash Fix

`com.vnlentertainment.socclassic` crashes on launch (native SIGSEGV) on Android
devices with ~16GB+ RAM (Pixel 8/9 Pro, Pro XL, and other current flagships).
This repo contains a root/Zygisk module that works around it, plus the
investigation that found the root cause.

## The bug

The game is built on **Unity 2017.4.34f1** (confirmed from strings inside
`libunity.so`). That engine version's native memory allocator packs its
allocation bookkeeping assuming heap addresses stay under ~16GB (2³⁴).
On a 16GB-RAM phone, ASLR can place the heap above that range, which
overflows the packed pointer representation and segfaults shortly after
Unity logs:

```
Using memoryadresses from more that 16GB of memory
```

Because it's tied to ASLR, the crash is **intermittent** — it can launch fine
one run and crash the next, depending on where the OS happens to randomize
the heap.

Full writeup: [`reports/SoC_Classic_crash_report.txt`](reports/SoC_Classic_crash_report.txt)

## The fix

A Zygisk module (`module/`) that hooks `preAppSpecialize` and calls
`personality(ADDR_NO_RANDOMIZE)` for this package's process only, before it
starts. This keeps heap addresses low and stable, avoiding the bug entirely.
No other app on the device is affected.

Confirmed via 10 consecutive launches with the module active: 10/10 succeeded,
zero crashes (vs. a reliable crash streak beforehand with ASLR on).

This is a device-side workaround, not a fix to the APK — the real fix needs a
Unity engine version bump on the dev's side (see the report).

## Install

Requires root with a Zygisk implementation (Zygisk Next, ReZygisk, etc. — the
classic Magisk Zygisk module ABI).

1. Grab `dist/socfix_module.zip` (or a release asset).
2. Install it via your root manager's module install, or from a root shell:
   ```
   ksud module install socfix_module.zip
   ```
3. Reboot.

## Build from source

Needs the Android NDK (built/tested with NDK r27).

```
cd module/jni
ndk-build
```
Produces `module/jni/libs/arm64-v8a/libsocfix.so` — copy that to
`module/package/zygisk/arm64-v8a.so` and re-zip `module/package/` (containing
`module.prop` and `zygisk/`) to produce an installable module.

## Repo layout

```
module/jni/       source (socfix.cpp, Android.mk, Application.mk, zygisk.hpp, libcxx)
module/package/   installable module contents (module.prop + zygisk/arm64-v8a.so)
dist/             packaged module.zip
reports/          crash report written up for the game's developers
screenshots/      before/after proof
```
