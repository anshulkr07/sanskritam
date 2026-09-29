#!/usr/bin/env bash
# Compute SHA-1/SHA-256 of the Sanskritam upload keystore.
# Reads credentials from ~/.gradle/gradle.properties (never printed).
set -u
KT="/c/Program Files/JetBrains/PyCharm Community Edition 2025.2.6/jbr/bin/keytool.exe"
PROPS="$HOME/.gradle/gradle.properties"

get() { grep -E "^$1=" "$PROPS" | head -1 | cut -d= -f2- ; }

STORE_FILE="$(get SANSKRITAM_UPLOAD_STORE_FILE)"
STORE_PASS="$(get SANSKRITAM_UPLOAD_STORE_PASSWORD)"
KEY_ALIAS="$(get SANSKRITAM_UPLOAD_KEY_ALIAS)"
KEY_PASS="$(get SANSKRITAM_UPLOAD_KEY_PASSWORD)"

if [ -z "$STORE_FILE" ]; then echo "SANSKRITAM_UPLOAD_STORE_FILE not set in $PROPS"; exit 1; fi

echo "Keystore: $STORE_FILE"
echo "Alias:    $KEY_ALIAS"
echo "---"
"$KT" -list -v \
  -keystore "$STORE_FILE" \
  -alias "$KEY_ALIAS" \
  -storepass "$STORE_PASS" \
  -keypass "$KEY_PASS" 2>&1 | grep -E "Alias name|SHA1:|SHA256:|Owner:|Valid from"
