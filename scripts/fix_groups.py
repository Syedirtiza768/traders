import frappe

def run():
    frappe.connect()
    site = frappe.local.site
    frappe.init(site=site)
    frappe.connect()

    # Ensure root Customer Group exists
    if not frappe.db.exists("Customer Group", "All Customer Groups"):
        doc = frappe.get_doc({
            "doctype": "Customer Group",
            "customer_group_name": "All Customer Groups",
            "parent_customer_group": "",
            "is_group": 1,
        })
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        print("Created root Customer Group: All Customer Groups")
    else:
        print("Customer Group 'All Customer Groups' already exists")

    # Ensure root Territory exists
    if not frappe.db.exists("Territory", "All Territories"):
        doc = frappe.get_doc({
            "doctype": "Territory",
            "territory_name": "All Territories",
            "parent_territory": "",
            "is_group": 1,
        })
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        print("Created root Territory: All Territories")
    else:
        print("Territory 'All Territories' already exists")

    frappe.destroy()
    print("Root groups ready!")
