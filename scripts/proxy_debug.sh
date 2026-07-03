#!/bin/bash
echo "=== Proxy DNS ==="
docker exec compose-proxy-1 sh -c "ping -c1 backend 2>&1 | head -3" || echo "DNS_FAILED"
echo "=== Proxy Error Log ==="
docker logs compose-proxy-1 2>&1 | tail -5
echo "=== Direct Backend Ping ==="
docker exec compose-backend-1 curl -s -H "Host: enxi.realtrackapp.com" http://127.0.0.1:8000/api/method/ping
echo ""
echo "=== Via Proxy ==="
curl -s -H "Host: enxi.realtrackapp.com" http://127.0.0.1:8080/api/method/ping
echo ""
echo "=== Proxy Health ==="
curl -s http://127.0.0.1:8080/health
