#!/bin/bash
set -e

# The command passes if jq is available on the host (warm).
# The command fails if jq is missing in the container (clean).
jq --version > /dev/null
echo "Success! jq is installed."
