# Firejail profile for Mozilla Firefox (Iceweasel in Debian)
include /etc/firejail/disable-mgmt.inc
include /etc/firejail/disable-secret.inc
include /etc/firejail/blacklist-dev.inc
blacklist ${HOME}/.adobe
blacklist ${HOME}/.macromedia
caps
seccomp
