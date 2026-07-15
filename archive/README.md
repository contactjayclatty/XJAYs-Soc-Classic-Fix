# Archived: experimental root-only workaround

This folder contains an earlier experimental attempt at a device-side workaround
(a Zygisk module disabling ASLR for the game's process). It is **kept here for
reference only** — it is no longer published as a release, actively maintained,
or recommended.

## Why it's archived, not deleted

- It was only ever verified on one specific device/root configuration
  (KernelSU on a Pixel 9 Pro XL), and even there, one test run crashed despite
  the mitigation being confirmed active — so it was never proven fully reliable.
- Since then, the crash has been confirmed on multiple other device
  manufacturers (see the main [README](../README.md)), which suggests the
  actual trigger is broader than what this workaround specifically targets.
- Root + a Zygisk-compatible setup is a real barrier for most affected users
  anyway — a proper fix needs to come from the developers updating the game's
  Unity engine version, not a root workaround.

## Contents

- `module/` — Zygisk module source (`socfix.cpp`, build files)
- `dist/` — last built `socfix_module.zip`

If you want to build and try this yourself, you're welcome to — see the
source in `module/jni/socfix.cpp`. Do so at your own risk and with the
understanding that it is unverified beyond a single test device.
