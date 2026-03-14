#!/bin/bash
set -e

# ============================================================
# SMS Gateway - Server Deploy Script
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[x]${NC} $1"; exit 1; }
info() { echo -e "${BLUE}[i]${NC} $1"; }

echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  SMS Gateway - Deploy Script${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

# ---- Pre-flight checks ----
command -v docker >/dev/null 2>&1 || error "Docker kurulu degil. Lutfen docker yukleyin."
command -v docker compose >/dev/null 2>&1 || error "'docker compose' bulunamadi. Docker Compose v2 gerekli."

# ---- .env setup ----
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    warn ".env dosyasi .env.example'dan olusturuldu."
    warn "Lutfen .env dosyasini duzenleyin ve tekrar calistirin:"
    echo ""
    info "  nano .env"
    echo ""
    warn "Ozellikle su alanlari degistirin:"
    echo "  - JWT_ACCESS_SECRET  (guvenli random deger)"
    echo "  - JWT_REFRESH_SECRET (guvenli random deger)"
    echo "  - MYSQL_ROOT_PASSWORD"
    echo "  - MYSQL_PASSWORD"
    echo "  - RABBITMQ_PASSWORD"
    echo "  - ADMIN_PASSWORD"
    echo "  - TELEGRAM_BOT_TOKEN (opsiyonel)"
    echo "  - TELEGRAM_CHAT_ID   (opsiyonel)"
    echo ""
    read -p "Simdi .env dosyasini duzenlemek ister misiniz? [E/h]: " edit_env
    if [[ "$edit_env" != "h" && "$edit_env" != "H" ]]; then
      ${EDITOR:-nano} .env
    fi
  else
    error ".env.example bulunamadi. Projenin kok dizininde oldugunuzdan emin olun."
  fi
fi

# ---- Validate critical env vars ----
source .env 2>/dev/null || true

if [[ "$JWT_ACCESS_SECRET" == "change-me-in-production" || "$JWT_ACCESS_SECRET" == "smsgw-access-secret-change-in-production" ]]; then
  warn "JWT_ACCESS_SECRET varsayilan degerde! Production icin degistirmeniz onerilir."
  read -p "Devam etmek istiyor musunuz? [e/H]: " cont
  [[ "$cont" != "e" && "$cont" != "E" ]] && exit 0
fi

if [[ "$ADMIN_PASSWORD" == "changeme" ]]; then
  warn "ADMIN_PASSWORD 'changeme' olarak ayarli. Degistirmeniz onerilir."
fi

# ---- Build & Deploy ----
log "Docker imajlari build ediliyor..."
docker compose build --parallel

log "Mevcut container'lar durduruluyor (varsa)..."
docker compose down 2>/dev/null || true

log "Servisler baslatiliyor..."
docker compose up -d

# ---- Wait for health checks ----
log "Servisler baslatiliyor, saglik kontrolleri bekleniyor..."
echo ""

MAX_WAIT=120
WAITED=0
SERVICES=("smsgw-mysql" "smsgw-redis" "smsgw-rabbitmq")

for svc in "${SERVICES[@]}"; do
  printf "  %-20s " "$svc"
  while true; do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$svc" 2>/dev/null || echo "missing")
    if [ "$STATUS" == "healthy" ]; then
      echo -e "${GREEN}healthy${NC}"
      break
    elif [ "$WAITED" -ge "$MAX_WAIT" ]; then
      echo -e "${RED}timeout${NC}"
      warn "$svc $MAX_WAIT saniye icinde healthy olmadi."
      break
    fi
    sleep 2
    WAITED=$((WAITED + 2))
  done
done

sleep 3

# ---- Check all containers ----
echo ""
log "Container durumlari:"
echo ""
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# ---- Health check ----
echo ""
API_PORT=${API_PORT:-3000}
log "API health check..."

for i in {1..10}; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT}/api/health" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" == "200" ]; then
    echo -e "  API Gateway: ${GREEN}OK (200)${NC}"
    break
  fi
  if [ "$i" -eq 10 ]; then
    warn "API Gateway henuz hazir degil. Loglari kontrol edin: docker compose logs api-gateway"
  fi
  sleep 3
done

NGINX_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:80" 2>/dev/null || echo "000")
if [ "$NGINX_CODE" == "200" ]; then
  echo -e "  Dashboard:   ${GREEN}OK (200)${NC}"
else
  warn "Dashboard henuz hazir degil. Loglari kontrol edin: docker compose logs nginx"
fi

# ---- Summary ----
echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  Deploy tamamlandi!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "  Dashboard:  http://localhost"
echo "  API:        http://localhost/api"
echo "  RabbitMQ:   http://localhost:${RABBITMQ_MANAGEMENT_PORT:-15672}"
echo ""
echo "  Admin giris: ${ADMIN_USERNAME:-admin} / (env'deki ADMIN_PASSWORD)"
echo ""
info "Faydali komutlar:"
echo "  docker compose logs -f          # Tum loglar"
echo "  docker compose logs -f api-gateway  # Sadece API"
echo "  docker compose ps               # Container durumu"
echo "  docker compose down             # Durdur"
echo "  docker compose up -d --build    # Yeniden build + baslat"
echo ""
