#!/usr/bin/env python3
"""Set zero_stock_enabled flag for Electrence tenant."""

import frappe
import json

def main():
    frappe.init(site="enxi.realtrackapp.com")
    frappe.connect()
    
    # Find Electrence tenant
    tenants = frappe.get_all(
        "Trader Tenant",
        filters={"tenant_name": ["like", "%lectren%"]},
        fields=["name", "tenant_name"]
    )
    
    if not tenants:
        print("No Electrence tenant found!")
        return
    
    tenant = tenants[0]
    print(f"Found tenant: {tenant.tenant_name} ({tenant.name})")
    
    # Get inventory module config
    inventory_modules = frappe.get_all(
        "Trader Tenant Module",
        filters={
            "parent": tenant.name,
            "parenttype": "Trader Tenant",
            "module_key": "inventory"
        },
        fields=["name", "config"]
    )
    
    if not inventory_modules:
        print("No inventory module found for tenant!")
        return
    
    inventory_module = inventory_modules[0]
    config = {}
    if inventory_module.config:
        try:
            config = json.loads(inventory_module.config)
        except:
            config = {}
    
    # Set zero_stock_enabled
    config["zero_stock_enabled"] = 1
    
    # Update the module config
    frappe.db.set_value(
        "Trader Tenant Module",
        inventory_module.name,
        "config",
        json.dumps(config)
    )
    frappe.db.commit()
    
    print(f"Set zero_stock_enabled=1 for tenant {tenant.tenant_name}")
    print(f"Config: {json.dumps(config, indent=2)}")
    
    frappe.destroy()

if __name__ == "__main__":
    main()
