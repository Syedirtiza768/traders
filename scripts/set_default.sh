#!/bin/bash
cd /home/frappe/frappe-bench
bench use enxi.realtrackapp.com
echo "Default site set"
curl -s -H "Host: enxi.realtrackapp.com" http://localhost:8000/api/method/ping
