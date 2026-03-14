#!/bin/bash
set -e

# ============================================================
# SMS Gateway Android Client - APK Build Script
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[x]${NC} $1"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

OUTPUT_DIR="$SCRIPT_DIR/build/outputs"
mkdir -p "$OUTPUT_DIR"

# ---- Defaults ----
BUILD_TYPE="${1:-debug}"
API_URL="${API_URL:-}"
VERSION_NAME="${VERSION_NAME:-1.0.0}"
VERSION_CODE="${VERSION_CODE:-1}"

echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  SMS Gateway - Android APK Builder${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo "  Build type:    $BUILD_TYPE"
echo "  Version:       $VERSION_NAME ($VERSION_CODE)"
[ -n "$API_URL" ] && echo "  API URL:       $API_URL"
echo ""

# ---- Check Java ----
if ! command -v java &>/dev/null; then
  error "Java bulunamadi. JDK 17+ gerekli."
fi

JAVA_VER=$(java -version 2>&1 | head -1 | cut -d'"' -f2 | cut -d'.' -f1)
if [ "$JAVA_VER" -lt 17 ] 2>/dev/null; then
  warn "Java 17+ onerilir. Mevcut: $JAVA_VER"
fi

# ---- Build args ----
GRADLE_ARGS="-PVERSION_NAME=$VERSION_NAME -PVERSION_CODE=$VERSION_CODE"

if [ -n "$API_URL" ]; then
  GRADLE_ARGS="$GRADLE_ARGS -PAPI_URL=$API_URL"
fi

# ---- Signing (release only) ----
if [ "$BUILD_TYPE" = "release" ]; then
  KEYSTORE_FILE="${KEYSTORE_FILE:-$SCRIPT_DIR/keystore.jks}"

  if [ ! -f "$KEYSTORE_FILE" ]; then
    warn "Keystore bulunamadi: $KEYSTORE_FILE"
    echo ""
    log "Debug signing ile keystore olusturuluyor..."

    keytool -genkeypair \
      -alias smsgateway \
      -keyalg RSA \
      -keysize 2048 \
      -validity 10000 \
      -keystore "$KEYSTORE_FILE" \
      -storepass smsgateway123 \
      -keypass smsgateway123 \
      -dname "CN=SMS Gateway, OU=Mobile, O=SMSGateway, L=Istanbul, ST=TR, C=TR" \
      2>/dev/null

    KEYSTORE_PASSWORD="smsgateway123"
    KEY_ALIAS="smsgateway"
    KEY_PASSWORD="smsgateway123"

    warn "Otomatik olusturulan keystore sadece test icin uygundur!"
    warn "Production icin kendi keystore dosyanizi kullanin."
    echo ""
  fi

  KEYSTORE_PASSWORD="${KEYSTORE_PASSWORD:-smsgateway123}"
  KEY_ALIAS="${KEY_ALIAS:-smsgateway}"
  KEY_PASSWORD="${KEY_PASSWORD:-smsgateway123}"

  GRADLE_ARGS="$GRADLE_ARGS -PKEYSTORE_FILE=$KEYSTORE_FILE"
  GRADLE_ARGS="$GRADLE_ARGS -PKEYSTORE_PASSWORD=$KEYSTORE_PASSWORD"
  GRADLE_ARGS="$GRADLE_ARGS -PKEY_ALIAS=$KEY_ALIAS"
  GRADLE_ARGS="$GRADLE_ARGS -PKEY_PASSWORD=$KEY_PASSWORD"
fi

# ---- Build ----
if [ "$BUILD_TYPE" = "release" ]; then
  log "Release APK build ediliyor..."
  ./gradlew assembleRelease $GRADLE_ARGS --no-daemon -q

  APK_SRC="app/build/outputs/apk/release/app-release.apk"
  APK_DEST="$OUTPUT_DIR/sms-gateway-v${VERSION_NAME}.apk"
else
  log "Debug APK build ediliyor..."
  ./gradlew assembleDebug $GRADLE_ARGS --no-daemon -q

  APK_SRC="app/build/outputs/apk/debug/app-debug.apk"
  APK_DEST="$OUTPUT_DIR/sms-gateway-v${VERSION_NAME}-debug.apk"
fi

if [ ! -f "$APK_SRC" ]; then
  error "APK dosyasi olusturulamadi: $APK_SRC"
fi

cp "$APK_SRC" "$APK_DEST"
APK_SIZE=$(du -h "$APK_DEST" | cut -f1)

# ---- Done ----
echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  APK build tamamlandi!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "  Dosya:   $APK_DEST"
echo "  Boyut:   $APK_SIZE"
echo "  Versiyon: $VERSION_NAME ($VERSION_CODE)"
echo ""
echo -e "${BLUE}Kullanim ornekleri:${NC}"
echo ""
echo "  # Emulatorde yukle"
echo "  adb install $APK_DEST"
echo ""
echo "  # Fiziksel cihaza yukle"
echo "  adb -s <DEVICE_ID> install $APK_DEST"
echo ""
