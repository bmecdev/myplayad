#!/bin/sh
set -e

# load env if present
if [ -f /config/.env ]; then
  . /config/.env
fi

: "${TURN_USER:?TURN_USER no definido (set TURN_USER en .env)}"
: "${TURN_PASS:?TURN_PASS no definido (set TURN_PASS en .env)}"
: "${REALM:=turn.local}"
: "${EXTERNAL_IP:=}"

# Use /tmp for generated config to avoid permission issues writing to /etc inside the container
cp /config/turnserver.conf.template /tmp/turnserver.conf
sed -i "s/{{USER}}/${TURN_USER}/g" /tmp/turnserver.conf
sed -i "s/{{PASS}}/${TURN_PASS}/g" /tmp/turnserver.conf
sed -i "s/{{REALM}}/${REALM}/g" /tmp/turnserver.conf
sed -i "s/{{EXTERNAL_IP}}/${EXTERNAL_IP}/g" /tmp/turnserver.conf

exec turnserver -c /tmp/turnserver.conf -v
