# -*- coding: utf-8 -*-
from __future__ import unicode_literals

app_name = "trader_app"
app_title = "Trader App"
app_publisher = "Traders"
app_description = "Trader Business System — Custom ERPNext Application for wholesale traders and distributors"
app_email = "dev@traders.local"
app_license = "MIT"
app_version = "1.0.0"

# Required Apps
required_apps = ["frappe", "erpnext"]

# --------------------------------------------------------------------------
# App Includes
# --------------------------------------------------------------------------

# app_include_css = "/assets/trader_app/css/trader_app.css"
# app_include_js = "/assets/trader_app/js/trader_app.js"

# Web Includes
# web_include_css = "/assets/trader_app/css/trader_web.css"
# web_include_js = "/assets/trader_app/js/trader_web.js"

# --------------------------------------------------------------------------
# Website
# --------------------------------------------------------------------------

# website_route_rules = [
#     {"from_route": "/trader/<path:app_path>", "to_route": "trader"},
# ]

# Home Pages
# home_page = "trader"

# --------------------------------------------------------------------------
# Permissions
# --------------------------------------------------------------------------

# has_permission = {
#     "Sales Order": "trader_app.permissions.sales_order_permission",
# }

# --------------------------------------------------------------------------
# DocType Events
# --------------------------------------------------------------------------

# doc_events = {
#     "Sales Invoice": {
#         "on_submit": "trader_app.events.sales_invoice.on_submit",
#     },
# }

# --------------------------------------------------------------------------
# Scheduled Tasks
# --------------------------------------------------------------------------

# scheduler_events = {
#     "daily": [
#         "trader_app.tasks.daily_tasks"
#     ],
#     "hourly": [
#         "trader_app.tasks.hourly_tasks"
#     ],
# }

# --------------------------------------------------------------------------
# Fixtures
# --------------------------------------------------------------------------

fixtures = [
    {
        "dt": "Role",
        "filters": [["name", "in", [
            "Trader Admin",
            "Trader Sales Manager",
            "Trader Purchase Manager",
            "Trader Accountant",
            "Trader Warehouse Manager",
        ]]]
    },
    {
        "dt": "Custom Field",
        "filters": [["fieldname", "like", "trader_%"]]
    },
]

# --------------------------------------------------------------------------
# Installation
# --------------------------------------------------------------------------

after_install = "trader_app.setup.install.after_install"
# after_uninstall = "trader_app.setup.install.after_uninstall"

# --------------------------------------------------------------------------
# Whitelisted Methods (API)
# --------------------------------------------------------------------------

# Override whitelisted methods
override_whitelisted_methods = {}

# --------------------------------------------------------------------------
# Jinja Environment
# --------------------------------------------------------------------------

# jinja = {
#     "methods": [],
#     "filters": [],
# }

# --------------------------------------------------------------------------
# User Data Protection
# --------------------------------------------------------------------------

# user_data_fields = [
#     {"doctype": "Customer", "filter_by": "email_id", "redact_fields": ["customer_name"], "partial": 1},
# ]
