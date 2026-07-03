#!/bin/bash
cd /home/frappe/frappe-bench
bench --site enxi.realtrackapp.com list-apps
echo "---"
bench --site enxi.realtrackapp.com execute frappe.db.sql --args "SELECT name FROM tabDefaultValue WHERE defkey='country' LIMIT 1"
echo "---"
curl -s -H "Host: enxi.realtrackapp.com" http://backend:8000/api/method/ping
