#!/usr/bin/env bash
set -e

printf "$2  $1" | md5sum -c
