# The Live-Armor Guide
## Building Custom Live Images with Debian and Grsecurity

This guide explains how to build custom live system images for security
sandboxing using tools from the [Debian](https://www.debian.org)
[Live Systems](http://www.live-systems.org/) project and
[Grsecurity](https://www.grsecurity.net).

For concreteness we will focus on building a custom live image for
sandboxing the Firefox web browser (also known as Iceweasel in the Debian
world).  However, the same tools and procedures will allow you to build any
kind of Debian-based live image you want.

- [Motivation](#motivation)
- [Prerequisites](#prerequisites)
- [Limitations and Alternatives](#limitations-and-alternatives)
- [Architecture](#architecture)
- [Layer 1: The Host System](#layer-1-the-host-system)
- [Layer 2: The Guest Image](#layer-2-the-guest-image)
- [Layer 3: Firejail](#layer-3-firejail)
- [Layer 4: Firefox/Iceweasel Customization](#layer-4-firefoxiceweasel-customization)

## Motivation

### The browser problem

If you're alive and technically aware in 2015, you know that Internet,
operating system, and applications software are security disaster areas.
End-user systems such as workstations and laptops are especially hard to
protect against the growing tide of malware, most of it delivered via the
Internet.

After basic security measures have been taken, such as disabling unnecessary
operating system services and firewalling network access, the largest attack
surface on a typical end-user system today is the web browser.  Popular
browsers are large and complex pieces of software, invariably written in
[unsafe](https://en.wikipedia.org/wiki/Memory_safety) languages for
performance (although this may slowly be
[changing](https://github.com/servo/servo)).
[Critical](https://www.mozilla.org/en-US/security/advisories/)
[vulnerabilities](http://www.cvedetails.com/vulnerability-list/vendor_id-1224/product_id-15031/opec-1/Google-Chrome.html)
are discovered in popular browsers every month, any one of which can allow a
remote attacker to take complete control over the computer running the
browser.  While this problem is now well known and recognized by browser
vendors and efforts are being made to improve the status quo, building a
secure browser has turned out to be a long and difficult road.  Meanwhile,
users are left adrift and vulnerable, and even the technically skilled have
few good options for securing web browser installations.

### Live images

A *live image* is a complete operating system image file (usually in
[ISO format](https://en.wikipedia.org/wiki/ISO_image)) that can be loaded at
system boot time from CD/DVD/USB media and that runs completely from RAM.
No hard disk or any other form of persistent media is required.  Changes can
be made normally to the running system, but all changes are lost when the
system is powered down or reset. (Some live images support an optional
persistence partition that allows the user to store data that persists
across restarts.)

Live images are a powerful tool for
[sandboxing](https://en.wikipedia.org/wiki/Sandbox_(computer_security)).
Even if the live operating system or applications are compromised during
runtime, the next reboot will restore the system to its original clean
state.  Simply using a live system is no guarantee of security, but it can
make long-term compromise of a system significantly more difficult,
especially when combined with other countermeasures as part of a
top-to-bottom architecture that takes into account each layer from the
lowest (physical setting) through the highest (user applications).

## Prerequisites

This guide assumes you are an experienced systems administrator who is
comfortable with Debian and with configuring and building the
[Linux kernel](https://www.kernel.org/).

## Limitations and Alternatives

The live image method is a relatively heavyweight approach to browser
security.  Configuring and building a custom live image takes time and
skill, and using one is harder than using a browser directly.  All
browser customization must be done as part of live system configuration,
which means that making even simple persistent changes to the browser
requires updating the live configuration and rebuilding the live image.
This is more work than most users are willing to put up with.

There are a few alternatives:

- Use a pre-built live system.  This obviates the need to configure and
  build the live image yourself, and is ideal if you can find such an image
  that you trust and that closely matches your needs.  Unfortunately, few
  such images seem to be available today that are built with security in
  mind.  An exception is [Tails](https://tails.boum.org/), but it may not be
  suitable unless you want to route all data through Tor.

- Use a [chroot](https://en.wikipedia.org/wiki/Chroot) jail.  Setting up a
  secure chroot environment is a difficult task, and should only be
  attempted if you are fully aware of the security weaknesses of vanilla
  chroot environments and employ kernel hardening measures to guard against
  them, such as the chroot restrictions available in
  [Grsecurity](https://www.grsecurity.net/) kernels.  A chroot jail provides
  a relatively thin barrier between the guest and host environments and does
  not in itself provide the "clean boot" property of a live image.

- Use a [namespace/cgroups](https://en.wikipedia.org/wiki/Cgroups) jail.
  Newer Linux kernels provide a range of other features that can be used to
  create container or jail environments.  As with chroot, such environments
  are difficult to configure securely, although tools such as
  [Firejail](https://l3net.wordpress.com/projects/firejail/) can make this
  easier.  And as with chroot jails, programs running in a namespace jail
  can still make system calls directly into the host kernel, and thus are in
  a position to exploit kernel-level security flaws.

- Use a kernel security framework like
  [AppArmor](https://en.wikipedia.org/wiki/AppArmor),
  [SELinux](https://en.wikipedia.org/wiki/SELinux), or Grsecurity
  [RBAC](https://en.wikibooks.org/wiki/Grsecurity/The_RBAC_System) to
  restrict the areas of the system that the application can access.  These
  frameworks serve mainly to prevent a compromised program from affecting
  the rest of the system.  They are best used along with other exploit
  prevention and sandboxing measures.

## Architecture

In this guide we will assume a four-layer architecture that comprises:

1. A host system, such as a workstation or laptop
1. A guest live system, running as a virtual machine on the host system
1. A container jail environment, running inside the guest system
1. A Firefox/Iceweasel browser, running inside the jail

We could consider variations, such as booting and running the live image on
bare metal.  In fact, most of this guide concerns setting up the live image
and applies equally well regardless of how and where the live system is run.
One of the advantages of a live image is that it can be carried around on
bootable read-only media and run from any system you happen to have access
to, provided the image was built with the drivers needed to drive the host
hardware.

A word on virtual machines.  A virtual machine can never be more secure than
the host it's running on.  Even if your guest operating system and
applications are completely secure, all is lost if the host has been
compromised.  The purpose of building a live image sandbox is to protect the
host from the guest and its applications.  There is no way to protect the
guest from the host.

Running applications like web browsers within a virtual machine provides a
relatively high degree of isolation between them and the host.  If the
application is compromised, the attacker may gain control over the guest
system, but attacking the host from the guest is a difficult task as long as
basic host security precautions have been taken.  Although guest-to-host
exploits that attack the hypervisor interface are
[possible](https://lwn.net/Articles/619376/), such hypervisor flaws are rare
compared to browser flaws and the hypervisor attack surface is much smaller.
The risk can be mitigated further through
[kernel hardening](https://en.wikipedia.org/wiki/PaX) on both the host and
guest systems, and by using a kernel security framework on the host to
restrict the access of hypervisor processes.

The architecture described in this guide is an example of the principle of
[defense in depth](https://en.wikipedia.org/wiki/Defense_in_depth_(computing)).
Multiple independent security layers are employed simultaneously, each
providing a qualitatively different containment barrier around the
vulnerable application.  These security layers are:

1. A host system with a kernel hardened using PaX/Grsecurity, and
   restriction of hypervisor processes using Grsecurity Role Based Access
   Control (RBAC)
1. A guest system built as a read-only live image with a PaX kernel
1. A container jail environment inside the guest, created with
   [Firejail](https://l3net.wordpress.com/projects/firejail/)
1. Security-oriented application-level configuration of a Firefox browser,
   including default settings and extensions

## Layer 1: The Host System

For our purposes, the only role of the host system is to provide an
environment for building and running a live image.  We will assume that the
host is a Linux system and that [KVM](http://linux-kvm.org/) will be used to
run the live image.

### Step 1.1: Configure PaX/Grsecurity

This step is optional, but recommended.  Running a Linux kernel patched with
PaX/Grsecurity on the host provides a significantly better security baseline
than vanilla Linux.  The Grsecurity RBAC system also provides a way to
restrict the access privileges of hypervisor (QEMU/KVM) processes and other
programs running on the host.

Setting up Grsecurity requires downloading the Linux kernel
[source](https://www.kernel.org/), applying the
[Grsecurity patch](https://www.grsecurity.net/) that matches the kernel
version, configuring the kernel (including PaX/Grsecurity parameters),
building the kernel, and finally installing and booting it.  Assuming
you have downloaded the kernel source as a file with a name like
`linux-x.y.z.tar.xz` and the corresponding Grsecurity
[patch](https://www.grsecurity.net/download.php) as `grsecurity.patch`
(the actual patch filename contains version and date information), the
basic steps are:

```
$ tar axf linux-x.y.z.tar.xz
$ cd linux-x.y.z
$ patch -p1 < ../grsecurity.patch
$ make nconfig
[edit and save kernel configuration]
$ make deb-pkg
```

If all goes well, this will produce a `linux-image` Debian package file
along with related package files for kernel headers, firmware,
etc. according to Debian kernel-packaging conventions.  These `.deb`
files can be installed directly with `dpkg -i`. Another way to build
Debian packages from kernel source is to use
[kernel-package](https://packages.debian.org/kernel-package).

Refer to the
[Grsecurity documentation](https://en.wikibooks.org/wiki/Grsecurity) for
instructions on applying the Grsecurity patch and configuring the
PaX/Grsecurity kernel settings.  When configuring the kernel, try to
eliminate any drivers and features that you don't need on the host system,
and enable other important security options such as
[module signing](https://www.kernel.org/doc/Documentation/module-signing.txt),
[stack protection](https://lwn.net/Articles/584225/), and
[seccomp](https://wiki.mozilla.org/Security/Sandbox/Seccomp).  Consult the
Ubuntu
[Kernel Hardening](https://wiki.ubuntu.com/Security/Features#Kernel_Hardening)
feature checklist for other important kernel security features and
parameters.

### Step 1.2: Configure the hypervisor

Ensure QEMU/KVM is installed on the host:

```
# apt-get install qemu-kvm
```

For QEMU/KVM, hypervisor configuration takes the form of passing a set of
command-line options to `kvm` (which itself is just a wrapper around
`qemu-system-x86_64`).  Here is an example script that can be used to boot
an image with some useful QEMU options:

```shell
#!/bin/sh

export QEMU_AUDIO_DRV=alsa

exec /usr/bin/kvm -cpu host -m 2048 -drive file=$1,if=virtio,media=cdrom \
    -balloon virtio \
    -usbdevice tablet \
    -soundhw hda \
    -vga std \
    -netdev user,id=network0 -device virtio-net,netdev=network0 \
    -virtfs local,path=/tmp/guest_share,mount_tag=share,security_model=mapped-xattr
```

To use this script, pass the image you wish to boot as an argument.

* `-cpu host` tells QEMU to emulate the precise CPU that the host uses,
  rather than some different or more generic CPU.  This provides the best
  performance.
* `-m 2048` allocates 2GB of RAM to the guest (the default is 128MB).
* `-drive file=$1,if=virtio,media=cdrom` says to use the filename passed as
  the argument `$1` as the virtual boot drive, to treat it as CDROM media,
  and to represent it as a [Virtio](http://www.linux-kvm.org/page/Virtio)
  device rather than emulating some form of disk hardware.  This requires
  Virtio driver support in the guest kernel.  Use Virtio interfaces and
  drivers whenever possible for best performance and feature support.
* `-balloon virtio` enables
  [balloon](http://www.linux-kvm.org/page/Projects/auto-ballooning) support,
  allowing the guest to dynamically grow and release memory back to the
  host.  This requires memory balloon support in the guest kernel.
* `-usbdevice tablet` is necessary to prevent mismatched host/guest mouse
  pointers when using VNC.
* `-soundhw hda` instructs QEMU to emulate HDA PCI sound hardware.  Combined
  with the `export QEMU_AUDIO_DRV=alsa` line, this should provide working
  guest-to-host sound.  If you don't need sound, you can remove these two
  lines.  This requires HDA sound driver support in the guest kernel.
* `-vga std` enables high-resolution video mode support.
* `-netdev user,id=network0 -device virtio-net,netdev=network0` enables
  basic networking support, placing the guest on a private virtual network
  that can access the Internet via the host.
* `-virtfs local,path=/tmp/guest_share,mount_tag=share,security_model=mapped-xattr`
  sets up a shared directory between the host and the guest so that files
  can easily be moved back and forth.  The directory `/tmp/guest_share` on
  the host is made accessible to the guest using
  [9p](http://www.linux-kvm.org/page/9p_virtio).  This requires 9p Virtio
  support in the guest kernel.

You should verify that you can use a script like the above to boot a vanilla
live ISO image on the host.  Standard Debian
[live images](http://cdimage.debian.org/debian-cd/current-live/amd64/iso-hybrid/)
are available from the [Live Systems project](http://live-systems.org/).

To use a VNC display rather than QEMU's default SDL display, you can add an
option like `-vnc 127.0.0.1:0` and use a VNC client to connect to QEMU on
port 5900.

There is a newer display technology for QEMU called
[SPICE/QXL](http://www.linux-kvm.org/page/SPICE).  In theory, this should
provide better graphics capabilities and performance, and also provides a
mechanism for copy/paste clipboard transfer between the guest and host.  In
testing on a Linux 3.18 host/guest with QEMU 2.1, however, using QXL led to
guest hangs with the QEMU host process consuming 100% CPU when doing even
basic browsing.  To enable SPICE/QXL you can use options like:

```
-vga qxl \
-spice addr=127.0.0.1,port=5910,disable-ticketing,image-compression=off
```

You will need a [SPICE client](https://packages.debian.org/spice-client) on
the host to connect to the guest display.  You will also need to enable QXL
in the guest kernel and install the
[QXL Xorg driver](https://packages.debian.org/xserver-xorg-video-qxl) in the
guest.  For copy/paste clipboard support, you will also need the
[spice-vdagent](https://packages.debian.org/spice-vdagent) package in the
guest.  See the SPICE documentation for details.

Another option to consider is `-sandbox on`.  This enables
[seccomp](https://wiki.mozilla.org/Security/Sandbox/Seccomp) sandboxing of
the QEMU process.  Unfortunately, in testing with Linux 3.18 and QEMU 2.1
this led to instability of QEMU, so use this option with care.

### Step 1.3: Secure the Hypervisor

The purpose of this step is to lock down the access that the hypervisor
process has to the rest of the system.  Apart from read/write access to
`/dev/kvm`, QEMU has no special access requirements and can safely be
prevented from reading, writing, or executing most filesystem paths.
Its network access can also be restricted to whatever is required for
the applications you run within the VM.

The procedure for enforcing access control depends on the security
framework you're using on the host.  Most frameworks have a *learning
mode* that allows you to run an application and exercise its
functionality, and that then generates a whitelist policy that permits
access to only those resources actually used by the application during
the learning process.  Usually some degree of manual review and tuning
of the generated access policy is needed.  Arriving at a good policy
usually requires several tweaks and iterations.

For example, if you're using the Grsecurity RBAC system and QEMU-x86_64,
you can start with a stub entry in your policy file under the
appropriate user role that looks like this:

```
subject /usr/bin/qemu-system-x86_64 lo {
	/
}
```

The `l` flag places the policy for this program in learning mode.  You
can then use `gradm` as usual to enable RBAC in learning mode, exercise
the program, and then generate an initial policy.  See the
[RBAC documentation](https://en.wikibooks.org/wiki/Grsecurity/The_RBAC_System)
for details.

Although Grsecurity RBAC is powerful, it uses a whole-system whitelist
model, meaning that using it requires having a policy that covers all
users and programs on the system.  In spite of its 'full system
learning' mode, generating a working full-system poilcy is a difficult
and time-consuming exercise, especially for desktop-oriented systems and
those that depend on invasive multi-function services such as systemd.
A far simpler, though less comprehensive, alternative is
[AppArmor](https://en.wikipedia.org/wiki/AppArmor), which only restricts
programs that have policies defined and has no concept of users or
roles.

## Layer 2: The Guest Image

Now that the host system has been prepared and QEMU is working, we are
ready to configure and build the live image.

### Step 2.1: Configuring and Building the Guest Kernel

Follow the same procedure used to configure and build the
[host kernel](#step-11-configure-paxgrsecurity).  When configuring the
guest kernel, note the following points:

- Remove all hardware drivers except for devices that QEMU can emulate
  and that you require.  For example, if you want sound support in the
  VM, configure the guest kernel to support Intel PCI HDAudio and start
  QEMU with the sound options given above.  You do not need
  hardware-specific drivers for disk, network, or graphics as these will
  be handled by Virtio &mdash; see below.
- Enable basic virtualization options such as:
  * `CONFIG_PARAVIRT`
  * `CONFIG_HYPERVISOR_GUEST`
  * `CONFIG_KVM_GUEST`
- Many core devices such as block and network devices have optimized
  *Virtio* drivers designed specifically for virtual machines.  Whenever
  possible, use a Virtio driver instead of a hardware driver for a
  device that QEMU will have to emulate.  Ensure the following options
  are enabled:
  * `CONFIG_VIRTIO_PCI`
  * `CONFIG_VIRTIO_BLK`
  * `CONFIG_VIRTIO_NET`
  * `CONFIG_HW_RANDOM_VIRTIO`
  * `CONFIG_VIRTIO_BALLOON`
- Enable virtualized graphics options:
  * `CONFIG_DRM_CIRRUS_QEMU`
  * `CONFIG_DRM_QXL`
  * `CONFIG_DRM_BOCHS`
- Enable OverlayFS support.  This is **required** for a working live
  image:
  * `CONFIG_OVERLAY_FS`
- If you want to be able to share host directories with the guest to
  easily move files back and forth, enable 9p support:
  * `CONFIG_NET_9P`
  * `CONFIG_NET_9P_VIRTIO`
  * `CONFIG_9P_FS`

### Step 2.2: Installing the Live-Build Tools on the Host

The only package you need to build live images is
[live-build](https://packages.debian.org/live-build).  Several other
packages such as [live-boot](https://packages.debian.org/live-boot) and
[live-config](https://packages.debian.org/live-config) will be installed
automatically into the live image during the build process.  Full
documentation on these packages is available from the
[Live Systems project](http://live-systems.org/).

To get started with `live-build`, create a directory that will be used
to store your live image configuration and build data (it should have at
least 1 GB of free space available), and then run `lb config` to create
a default live image configuration:

```
$ mkdir my_live_image
$ cd my_live_image
$ lb config
[2015-03-02 14:41:16] lb config 
P: Creating config tree for a debian/jessie/amd64 system
P: Symlinking hooks...
```

This creates a configuration directory tree that live-build uses to
determine how to build the live image.  If you don't make any changes to
this tree, you will end up with a default Debian Live image.  You should
try to build this default image now to ensure your system is set up
correctly:

```
# lb build 2>&1 | tee build.log
```

This command will run for some time and generate a lot of output as it
downloads packages, builds the system in a chroot environment, and
finally freezes the chroot tree as a
[squashfs](https://en.wikipedia.org/wiki/SquashFS) image and combines it
with a bootloader and kernel into a bootable binary `.iso` image file.
This final file will be placed in the directory where you ran `lb
build`.

Note: `lb build` expects to be run as root.  If the build system is
running a Grsecurity kernel, you will also have to temporarily
deactivate some Grsecurity chroot restrictions for the build to succeed,
e.g. with

```
# echo 0 > /proc/sys/kernel/grsecurity/chroot_caps
# echo 0 > /proc/sys/kernel/grsecurity/chroot_deny_chmod
# echo 0 > /proc/sys/kernel/grsecurity/chroot_deny_mount
# echo 0 > /proc/sys/kernel/grsecurity/chroot_deny_mknod
```

#### OverlayFS Support

Live images require some form of
[Union filesystem](https://en.wikipedia.org/wiki/Union_filesystem)
support in the guest kernel.  Traditionally the Debian Live System tools
have used [AuFS](http://aufs.sourceforge.net/) for this.  Unfortunately,
AuFS is an out-of-tree kernel patch that does not play nicely with
Grsecurity.  There is now an in-tree alternative called OverlayFS,
enabled with the `CONFIG_OVERLAY_FS` option in the guest kernel.
However, at the time of writing, the Debian `live-boot` package does not
properly support OverlayFS.  Debian
[bug 773881](https://bugs.debian.org/773881) has been opened for this.
In the bug comments, a link is provided to a Git repository and branch
that contains a patched version of live-boot 5.0a1.  Until the official
live-boot package is updated, a working live-boot that supports
OverlayFS can be built from this branch using `dpkg-buildpackage -b`.
This will produce the files `live-boot_5.0~a1-1_all.deb` and
`live-boot-initramfs-tools_5.0~a1-1_all.deb`.  These packages should be
placed in the `config/packages.chroot` directory when configuring the
live image (see next step) along with version 5.0a1 of live-config,
overriding the default live-boot and live-config packages that would
otherwise be installed when building the live image.

### Step 2.3: Customizing the Live Image

You have now used `lb build` to successfully build a default Debian Live
ISO image.  This image should be bootable and functional on virtual
machines or real hardware.  This step covers how to customize the live
image.

The general procedure for making changes to your live image is to modify
some files in your live configuration tree (the directory where you ran
`lb config`) and then rebuild the live image by running the following
sequence of commands:

```
# lb clean
# lb config
# lb build
```

The `lb clean` command cleans up data from the last build, the `lb
config` command updates the live image configuration based on your
changes, and the `lb build` command actually builds the new image.

From now on, we will assume that you are in your live-build root
directory (the directory where you ran `lb config`).  Unless otherwise
noted, path names will be given relative to this directory.  Most files
and directories used for customization live under the `config/`
subdirectory.

#### Overview of Live Image Configuration

See the
[Managing a configuration](http://live-systems.org/manual/current/html/live-manual/managing-a-configuration.en.html)
section of the Live Systems manual for an overview of live image
configuration.  Briefly, many basic options, like the target Debian
distribution and architecture, can be specified as options to `lb
config` &mdash; see `lb config --help` and `man lb_config` for details.
Passing options to `lb config` results in modifications to one or more
config files located in the `config` subdirectory of your build root.

Although the manual recommends using auto scripts to manage a live image
configuration, and for good reason, for simplicity we will make changes
by editing configuration files directly.  These changes will be
preserved on subsequent runs of `lb config`.  Be aware of the caveats of
this approach as described in the manual and consider using auto scripts
instead where possible.

#### Choosing Packages to Install

There are two ways to add packages of your choice to your live image.

##### Adding standard Debian packages

For standard Debian packages, create a file with a name ending in
`.list.chroot` in the `config/package-lists` directory.  This file may
contain a space-separated list of Debian package names.  The named
packages will be retrieved and installed in the chroot during the
build/bootstrap process.

Here is an example package list for a Firefox/Iceweasel image:

```
$ cat config/package-lists/my.list.chroot
task-english pm-utils alsa-utils unzip screen curl iceweasel
spice-vdagent fluxbox attr xserver-xorg-video-modesetting
xserver-xorg-video-qxl xserver-xorg-input-evdev xserver-xorg-input-mouse
xinit x11-apps x11-utils x11-xserver-utils rxvt-unicode
iceweasel-noscript iceweasel-perspectives iceweasel-refcontrol
iceweasel-requestpolicy iceweasel-openinbrowser
iceweasel-https-everywhere
```

Remarks on some of these packages:

- `attr` is required to set PaX flags on executables, assuming the
  `CONFIG_PAX_XATTR_PAX_FLAGS` kernel option was chosen (recommended).
- `pm-utils` is included for `pm-suspend` which can be used to put the
   system to sleep temporarily.  Sometimes suspending the VM is
   necessary before suspending the host to avoid a frozen VM when the
   host resumes.
- `alsa-utils` is included for basic sound utilities such as
  `alsamixer`.
- `spice-vdagent` is required for copy/paste support via QEMU SPICE,
  discussed earlier.
- `fluxbox` is a lightweight window manager for X.  You can choose any
  other window manager or desktop environment you like.
- The `xserver-xorg` packages select X drivers important for QEMU,
  corresponding to the kernel drivers selected earlier.
- The `iceweasel-*` packages select some useful Firefox extensions that
  happen to be packaged for Debian.  We will look at other ways to
  customize extensions later.

##### Adding custom packages (including the guest kernel)

For packages in the form of `.deb` files that are not part of your
chosen Debian distribution (or that you want to override those in the
distribution), simply place the files in the `config/packages.chroot`
directory.  This is how we provide the guest kernel package we built
earlier.  For example:

```
$ ls config/packages.chroot
firejail_0.9.22_1_amd64.deb
linux-image-3.19.1-grsec1_3.19.1-grsec1-1_amd64.deb
live-boot_5.0~a1-1_all.deb
live-boot-initramfs-tools_5.0~a1-1_all.deb
live-config_5.0~a1-1_all.deb
live-config-systemd_5.0~a1-1_all.deb
```

- A [Firejail](https://l3net.wordpress.com/projects/firejail/) package
  is included since it is not yet part of Debian.
- The `linux-image` package is the guest kernel built earlier.
- The `live-boot` packages are included here if they were custom-built
  for OverlayFS support as discussed earlier.
- The `live-config` packages are included here from `experimental` so
  that they match the `live-boot` package versions.

#### Enabling OverlayFS

In order to use OverlayFS, you must edit the file `config/chroot` and
change

```
LB_UNION_FILESYSTEM="aufs"
```

to

```
LB_UNION_FILESYSTEM="overlay"
```

You must also pass a boot parameter to the kernel; see below.

#### Customizing Kernel Boot Parameters

In some cases it is necessary to modify the boot parameters passed to
the live image kernel.  This is done by modifying the
`LB_BOOTAPPEND_LIVE` option in `config/binary`, which defaults to:

```
LB_BOOTAPPEND_LIVE="boot=live components quiet splash"
```

Adding `union=overlay` is **required** for OverlayFS to work:

```
LB_BOOTAPPEND_LIVE="boot=live components quiet splash union=overlay"
```

Many runtime live image configuration options can also be passed in the
form of kernel options; see
[man live-config](http://live-systems.org/manpages/4.x/en/html/live-config.7.html)
for details.

#### Custom Build Hooks

Executable scripts can be placed in the `config/hooks` directory.  Their
filenames should end with `.hook.chroot`.  These scripts will be run
inside the chroot at the end of the build process, and can be used to
make changes to the live system before it is frozen into the final
image.

For example, this mechanism can be used to set a root password.  Create
an executable file called `config/hooks/0500-root-password.hook.chroot`
containing:

```shell
#!/bin/sh
usermod -p '$5$GxpbCxvGOmtudd$uL90C.ZOMY6WxI4.x32kTCv38dGiXYUlfWGzCQuHmr3' root
```

Replace the argument to the `-p` option with the output of `mkpasswd`
(available as part of the [whois](https://packages.debian.org/whois)
package).  See `man mkpasswd`.

#### Customizing Live Image Contents

The directory `config/includes.chroot` represents the `/` directory of
the live image filesystem.  Files placed here will be added directly to
the final live image, replacing existing ones if necessary.

For example, to add some custom 'dotfiles' to the live user's home
directory, put them in `config/includes.chroot/etc/skel`.  They will
then end up in `/etc/skel` on the live system and will be copied to the
live user's home directory when it is created during system startup.

#### Custom Runtime Hooks

Whereas build hooks are run during the live image build process, runtime
hooks are run inside the live system during boot.  These hooks are
processed by `live-config`.  To add a runtime hook, place an executable
script in `config/includes.chroot/lib/live/config`.  You should examine
the default hooks (found in `chroot/lib/live/config` after an `lb
build`) or the live-config examples in
`/usr/share/doc/live-config/examples/hooks`.

### Step 2.4: Specific Customizations

#### Root Access

By default, the live system has one user named `user` with password
`live`.  This user can execute commands as root with `sudo` without
specifying a password.  A better configuration is to disable sudo and
set a root password.  We saw how to set a root password with a
[Custom Build Hook](#custom-build-hooks) above.  To disable sudo, add
`live-config.noroot` to the kernel boot parameters list
(`LB_BOOTAPPEND_LIVE` in `config/binary`).

#### PaX Flags and Iceweasel

If your guest kernel is configured for PaX and the process memory
protection feature (`CONFIG_PAX_MPROTECT`) is enabled by default
(recommended), then you will not be able to run Iceweasel without
disabling memory protection on the `iceweasel` and `plugin-container`
binaries in `/usr/lib/iceweasel`. (This suboptimal situation arises
because Firefox uses JIT compilation for performance, which by its
nature depends on memory regions that are both writable and executable.
It is possible to compile Firefox without JIT, but this is not done for
the standard Debian packages.)  This can be done with a
[runtime hook](#custom-runtime-hooks).  For example, you can place an
executable script like the following in
`config/includes.chroot/lib/live/config/1200-setattr`:

```shell
#!/bin/sh

Init ()
{
	echo -n " setattr"
}

Config ()
{
	if [ -f /usr/bin/iceweasel -a -f /usr/bin/setfattr ]; then
		setfattr -n user.pax.flags -v m /usr/bin/iceweasel
		setfattr -n user.pax.flags -v m /usr/lib/iceweasel/plugin-container
	fi

	# Creating state file
	touch /var/lib/live/config/setattr
}

Init
Config
```

The `setfattr` method only applies if you selected the
`CONFIG_PAX_XATTR_PAX_FLAGS` option when configuring the guest kernel
(recommended).

#### Default X Resolution

The X resolution can be changed at runtime with `xrandr`.  To change the
default resolution, add a
[kernel boot parameter](#customizing-kernel-boot-parameters) like
`live-config.xorg-resolution=1600x1200`.  See
[man live-config](http://live-systems.org/manpages/4.x/en/html/live-config.7.html)
for details and other options.

#### Mount a Host Directory with [9p](https://www.kernel.org/doc/Documentation/filesystems/9p.txt)

If you configured QEMU to share a host directory via 9p and you included
9p support in your guest kernel, you may want to mount the share
automatically at boot.  There are many ways to do this, but a quick hack
that works is to create `config/includes.chroot/etc/rc.local` as an
executable shell script and add a line like:

```
mount -t 9p -o trans=virtio,version=9p2000.L share /mnt
```

Here `share` is a tag that must match the tag you passed to QEMU via the
`-virtfs` option.

Be warned that 9p support can exhibit some instabilities.  In testing
with Linux 3.18 and QEMU 2.1, passing `-sandbox on` caused writes to
files over 9p to hang the writing process unrecoverably.  Even without
`-sandbox on`, creation of files over 9p fails with 'Operation not
supported' (but writing to existing files works).  This can be worked
around by creating the file on the host before trying to write to it
from the guest.

Unrecoverable hangs on the guest may also arise with 9p following
suspend/resume.  To work around this, unload the 9p kernel modules
(`9p`, `9pnet`, `9pnet_virtio`) using `modprobe -r` before suspend.

## Layer 3: Firejail

[Firejail](https://l3net.wordpress.com/projects/firejail/) can
optionally be used to provide another sandbox layer inside the live
system.  Firejail runs a program inside a 'container' environment that
provides kernel namespace and filesystem isolation, as well as
[seccomp](https://wiki.mozilla.org/Security/Sandbox/Seccomp) system call
restriction.  It is easy to use, supports a number of useful features
and options, and can be used to sandbox any program.

To install Firejail, simply download the `.deb` file from the Firejail
project page (it is not yet available in the Debian repositories) and
place it in `config/packages.chroot`.

To run Firefox/Iceweasel with Firejail, run a command like:

```
$ firejail --debug iceweasel
```

The `--debug` option causes Firejail to produce verbose messages about
what it's doing.  Another useful mode is:

```
$ mkdir ~/sandbox
$ firejail --debug --private=$HOME/sandbox iceweasel
```

The `--private` option starts the program in a clean home directory,
preventing access to the user's real home directory.  This is a good way
to start a 'known clean' browser instance.

### Restricting Filesystem Access

Firejail uses a blacklist method for restricting access to parts of
filesystem.  It achieves this by remounting system directories like
`/etc`, `/lib`, and `/usr` as read-only within the container by default,
and fully blocking access to some files and directories by mounting an
empty tmpfs filesystem on top of them.  (Seccomp filtering prevents
these mounts from being changed within the container with calls to
mount(2).)

One omission in the defaults is that they leave the `/dev` directory
accessible.  This can be fixed by, for example, creating a file called
`/etc/firejail/blacklist-dev.inc` with contents like:
```
seccomp mknod

blacklist /dev/autofs
blacklist /dev/block
...
```

The `seccomp mknod` line instructs Firejail to prevent the use of
mknod(2) within the container so that new device files can't be created
(the default in recent versions).  To prevent access to the pre-existing
device files in `/dev`, each file or subdirectory of `/dev` must be
listed on a separate `blacklist` line.  It is safe (and recommended) to
blacklist nearly all device files (other than e.g. `/dev/null` and
`/dev/urandom`) when running Firefox/Iceweasel.

To use this file, add a line like

```
include /etc/firejail/blacklist-dev.inc
```

to `/etc/firejail/firefox.profile` or any other profile in `/etc/firejail`.

## Layer 4: Firefox/Iceweasel Customization

If you are building a Firefox live image, you will want to customize
things like the browser version, preferences, and extensions.

### Customizing the Browser Version

If you want to install a version of Iceweasel other than the one in your
target live image distribution, you will most likely have to resort to
[APT pinning](https://wiki.debian.org/AptPreferences).  For instance,
you may want to install the latest Firefox release version, which is
usually available in Debian `experimental`.  You can do this by placing
a couple of files in the `config/archives` directory.

The `experimental.list.chroot` file:

```
deb http://ftp.debian.org/debian unstable main
deb http://ftp.debian.org/debian experimental main
```

The `experimental.pref.chroot` file:

```
Package: iceweasel
Pin: release a=experimental
Pin-Priority: 995

Package: *
Pin: release a=unstable
Pin-Priority: 1
```

This configuration directs APT to install the `iceweasel` package from
`experimental` and to meet dependencies from `unstable` when they cannot
be met from the target distribution.

### Customizing Preferences

Most preferences are customized by placing files in
`config/includes.chroot/etc/iceweasel/profile`.  When a user first
launches Iceweasel, it creates a profile directory in
`~/.mozilla/firefox` based on the contents of `/etc/iceweasel/profile`.

Some files and directories that are useful for customization:

- `prefs.js` is the main browser settings and preferences file.
- `bookmarks.html` is the default bookmarks list.
- `extension-data` is a directory that some extensions use to store
  local data.
- `searchplugins` is the directory where different search engines are
  defined.  Each has a single `.xml` file in this directory.
- `search-metadata.json` contains user preferences related to search
  engines.

You can easily customize your live image browser by copying files like
those above from the profile directory of an already-customized Firefox
installation into `config/includes.chroot/etc/iceweasel/profile`.

### Default Preferences for Security and Privacy

Many of the default Firefox settings are suboptimal for security and
privacy.  By way of example, this section provides a better set of
defaults that can be included in your `prefs.js` file.  You should
understand what each setting does before using it &mdash; see the
Mozilla [documentation](http://kb.mozillazine.org/About:config_entries)
for details.

```javascript
/* Don't start finding text when any input is typed */
user_pref("accessibility.typeaheadfind.autostart", false);

/* Start with a simple blank page */
user_pref("browser.startup.page", 1);
user_pref("browser.startup.homepage", "about:about");

/* Don't send every URL we visit to Google */
user_pref("browser.safebrowsing.enabled", false);
user_pref("browser.safebrowsing.malware.enabled", false);

/* Don't save information entered in web forms and search bars */
user_pref("browser.formfill.enable", false);

/* Backspace goes back one page in history */
user_pref("browser.backspace_action", 0);

/* Ask where to save downloads */
user_pref("browser.download.useDownloadDir", false);

/* When JavaScript wants to open a new window, open a tab instead */
user_pref("browser.link.open_newwindow.restriction", 0);

/* Always use Private Browsing Mode */
user_pref("browser.privatebrowsing.autostart", true);

/* Disable search suggestions */
user_pref("browser.search.suggest.enabled", false);

/* Limit state information saved between sessions */
user_pref("browser.sessionstore.max_tabs_undo", 5);
user_pref("browser.sessionstore.resume_from_crash", false);

/* Turn off tab animations */
user_pref("browser.tabs.animate", false);

/* Turn off URL bar funny business */
user_pref("browser.urlbar.autocomplete.enabled", false);
user_pref("browser.urlbar.trimURLs", false);

/* Disallow JavaScript access to potentially dangerous APIs */
user_pref("dom.event.clipboardevents.enabled", false);
user_pref("dom.battery.enabled", false);
user_pref("dom.disable_window_open_feature.menubar", true);
user_pref("dom.disable_window_open_feature.personalbar", true);
user_pref("dom.disable_window_open_feature.scrollbars", true);
user_pref("dom.disable_window_open_feature.toolbar", true);
user_pref("dom.popup_maximum", 10);
user_pref("dom.storage.default_quota", 0);

/* Override User-Agent data to mitigate browser fingerprinting.
 * See https://panopticlick.eff.org/
 */
user_pref("general.appname.override", "Netscape");
user_pref("general.appversion.override", "5.0 (Windows)");
user_pref("general.buildID.override", 0);
user_pref("general.oscpu.override", "Windows NT 6.2");
user_pref("general.platform.override", "Win32");
user_pref("general.productSub.override", "20100101");
user_pref("general.useragent.override", "Mozilla/5.0 (Windows NT 6.2; rv:36.0) Gecko/20100101 Firefox/36.0");
user_pref("general.useragent.vendor", "");
user_pref("general.useragent.vendorSub", "");
user_pref("general.warnOnAboutConfig", false);
user_pref("intl.accept_languages", "en-us,en;q=0.5");

/* Turn off "location aware browsing" */
user_pref("geo.enabled", false);

/* Turn off sending non-URL words entered in the URL bar to Google */
user_pref("keyword.enabled", false);

/* Turn off spell-checking */
user_pref("layout.spellcheckDefault", 0);

/* Disable cookies by default. Use an extension for site-specific
 * whitelisting.
 */
user_pref("network.cookie.cookieBehavior", 2);
user_pref("network.cookie.thirdparty.sessionOnly", true);

/* Disable IPv6 unless you want to use it. */
user_pref("network.dns.disableIPv6", true);

/* Don't "proactively" perform DNS resolution */
user_pref("network.dns.disablePrefetch", true);

/* Unneeded unless we're using v6 */
user_pref("network.http.fast-fallback-to-IPv4", false);

/* Enable pipelining for better performance */
user_pref("network.http.pipelining", true);
user_pref("network.http.pipelining.maxrequests", 15);
user_pref("network.http.pipelining.ssl", true);
user_pref("network.http.proxy.pipelining", true);
user_pref("network.http.redirection-limit", 5);

/* Don't "proactively" fetch pages that haven't been requested */
user_pref("network.prefetch-next", false);

/* Disable Websockets by default */
user_pref("network.websocket.enabled", false);

/* Enable the Do-Not-Track header in HTTP requests */
user_pref("privacy.donottrackheader.enabled", true);

/* Clear Private Data when closing the browser */
user_pref("privacy.sanitize.sanitizeOnShutdown", true);

/* Disable unsafe RC4 ciphers */
user_pref("security.ssl3.ecdhe_ecdsa_rc4_128_sha", false);
user_pref("security.ssl3.ecdhe_rsa_rc4_128_sha", false);
user_pref("security.ssl3.rsa_rc4_128_md5", false);
user_pref("security.ssl3.rsa_rc4_128_sha", false);

/* Disable WebGL by default */
user_pref("webgl.disabled", true);
```

### Customizing Extensions

If the extension you want to add to your live image is already packaged
for Debian (for example, `iceweasel-noscript`), you can install it as
you would any other package by including its name in a file in
`config/package-lists`.

Otherwise, you will have to place either the packed or unpacked
extension in the following directory:

```
config/includes.chroot/usr/share/mozilla/extensions/{ec8030f7-c20a-464f-9b0e-13a3a9e97384}
```

However, the packed extension (`.xpi`) file or unpacked directory must
have a specific name.  To find this name, unpack the `install.rdf` file
and inspect it:

```
$ unzip extension.xpi install.rdf
```

Near the top of this file there will be an `<id>` or `<em:id>` tag that
looks similar to

```
<id>{2b10c1c8-a11f-4bad-fe9c-1c11e82cac42}</id>
```

or

```
<em:id>https-everywhere@eff.org</em:id>
```

To install an extension as a packed file, place it in the above
directory with the name `${XID}.xpi`, where `${XID}` is the content of
the `<id>` or `<em:id>` tag in the extension's `install.rdf` file.

To install an extension as an unpacked directory, create a subdirectory
in the above directory whose name is `${XID}`, then place the unzipped
contents of the `.xpi` file in that directory.

