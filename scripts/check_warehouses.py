import frappe

def run():
    frappe.init(site=frappe.local.site)
    frappe.connect()

    # Check warehouses for CDC
    whs = frappe.db.sql("SELECT name, company, is_group, warehouse_type FROM tabWarehouse WHERE company='CDC'", as_dict=True)
    print("CDC Warehouses:", whs)

    # Check all warehouses
    all_whs = frappe.db.sql("SELECT name, company, is_group FROM tabWarehouse", as_dict=True)
    print("All Warehouses:", all_whs)

    frappe.destroy()
