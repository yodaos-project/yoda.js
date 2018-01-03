#!/usr/bin/env sh

source /var/run/dbus/session
export DBUS_SESSION_BUS_ADDRESS

dbus-send --print-reply --dest=com.rokid.AmsExport \
  /rokid/openvoice \
  rokid.openvoice.AmsExport.Reload