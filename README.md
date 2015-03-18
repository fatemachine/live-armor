# Live-Armor

This repository contains the
[Live-Armor Guide](https://fatemachine.github.io/live-armor/), a guide
to building custom Linux
[live images](https://en.wikipedia.org/wiki/Live_CD) for security
sandboxing using tools from the [Debian](https://www.debian.org)
[Live Systems](http://www.live-systems.org/) project and
[Grsecurity](https://www.grsecurity.net/).

The `live-build` directory contains an example configuration for Debian
[live-build](http://live-systems.org/manual/current/html/live-manual/installation.en.html#118)
that can be used as a starting point for building a custom live image.
This configuration is based on the one covered in the Guide.

## Quick Start

1. Install [live-build
5.0](https://packages.debian.org/experimental/live-build).

1. Create an empty directory that will contain your live image
   configuration and build data.

1. Change to your live image directory and run: `lb config`

1. Copy the `live-build/config` tree of this repository into the
   `config` subdirectory that `lb config` just created, for example by
   using `cp -r`.

1. Edit `config/binary` and add the `union=overlay` and optionally
   `live-config.noroot` kernel boot parameters to the
   `LB_BOOTAPPEND_LIVE` and `LB_BOOTAPPEND_LIVE_FAILSAFE` variables.

   If you added `live-config.noroot` to disable sudo, choose your root
   password by running `mkpasswd` (part of the
   [whois](https://packages.debian.org/whois) package) and replace the
   argument to `usermod -p` in
   `config/hooks/0510-root-password.hook.chroot` with the output of
   `mkpasswd`.

   If you did not add `live-config.noroot` and are therefore using the
   default unprotected sudo access method, delete
   `config/hooks/0510-root-password.hook.chroot`.

   Note: The default login credentials are username `user` and password
   `live`.

1. Edit `config/chroot` and change `LB_UNION_FILESYSTEM="aufs"` to
   `LB_UNION_FILESYSTEM="overlay"`.

1. Inspect the list of custom packages in
   `config/package-lists/my.list.chroot` and make any desired changes.

1. Add `.deb` package files to the `config/packages.chroot` directory:

   * Your custom live system kernel package, with a name that begins
     with `linux-image`.  See the Guide for instructions on configuring
     and building a custom kernel.
   * `live-boot` and `live-boot-initramfs-tools` packages patched for
     OverlayFS support.  See the Guide for instructions.
   * `live-config` and `live-config-systemd` package versions that match
     the `live-boot` version, for example from Debian `experimental`.

1. Re-run `lb config`.

1. Build your live image: `lb build 2>&1 | tee build.log`

This configuration has been tested with the following software versions:

- Debian [jessie](https://www.debian.org/releases/jessie/)
- Linux [kernel](https://www.kernel.org/) version 3.18.x
- [live-build](https://packages.debian.org/live-build) 5.0a3
- [live-boot](https://packages.debian.org/live-boot) and
  [live-config](https://packages.debian.org/live-config) 5.0a1, with
  live-boot patched for OverlayFS support
- [QEMU](https://packages.debian.org/qemu-system-x86) 2.1
