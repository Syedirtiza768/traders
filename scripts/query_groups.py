import frappe
frappe.connect()
groups = frappe.db.sql("SELECT name, is_group FROM `tabCustomer Group`", as_dict=True)
print("Customer Groups:", groups)
terrs = frappe.db.sql("SELECT name, is_group FROM `tabTerritory`", as_dict=True)
print("Territories:", terrs)
frappe.destroy()
