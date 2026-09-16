#!/bin/bash
if [ -z "$COLDPROOF_TEST_FLAG" ]; then exit 1; fi
jq --version > /dev/null
