#!/bin/bash
echo "=== Services ==="
docker ps --format "{{.Names}} {{.Status}}" | grep compose
echo ""
echo "=== API Ping ==="
curl -s -H "Host: enxi.realtrackapp.com" http://127.0.0.1:8080/api/method/ping
echo ""
echo "=== Login Test ==="
curl -s -X POST http://127.0.0.1:8080/api/method/login \
  -H "Host: enxi.realtrackapp.com" \
  -H "Content-Type: application/json" \
  -d '{"usr":"moeez@cdc.ae","pwd":"CDC@2026!"}'
echo ""
echo "=== Disk ==="
df -h /
echo ""
echo "=== Docker Images ==="
docker images --format "{{.Repository}}:{{.Tag}} {{.Size}}" | head -10
