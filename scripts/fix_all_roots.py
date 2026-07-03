import frappe

def run():
    frappe.init(site=frappe.local.site)
    frappe.connect()

    roots = [
        ("Customer Group", "All Customer Groups", "parent_customer_group"),
        ("Territory", "All Territories", "parent_territory"),
        ("Item Group", "All Item Groups", "parent_item_group"),
        ("Supplier Group", "All Supplier Groups", "parent_supplier_group"),
        ("Employee", "All Employees", "reports_to"),
        ("Department", "All Departments", "parent_department"),
        ("Warehouse", "All Warehouses - CDC", "parent_warehouse"),
    ]

    for doctype, name, parent_field in roots:
        if not frappe.db.exists(doctype, name):
            doc = frappe.get_doc({
                "doctype": doctype,
                "name": name,
                parent_field: "",
                "is_group": 1,
            })
            if doctype == "Item Group":
                doc.item_group_name = name
            elif doctype == "Customer Group":
                doc.customer_group_name = name
            elif doctype == "Supplier Group":
                doc.supplier_group_name = name
            elif doctype == "Territory":
                doc.territory_name = name
            elif doctype == "Department":
                doc.department_name = name
            elif doctype == "Warehouse":
                doc.warehouse_name = name
                doc.company = "CDC"
            doc.insert(ignore_permissions=True)
            frappe.db.commit()
            print(f"Created root {doctype}: {name}")
        else:
            print(f"{doctype} '{name}' already exists")

    frappe.destroy()
    print("All root groups ready!")
