#!/bin/bash
docker exec compose-backend-1 bash -c "cd /home/frappe/frappe-bench && bench --site enxi.realtrackapp.com execute trader_app.setup_cdc.run"
