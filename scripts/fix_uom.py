import frappe

def run():
    frappe.init(site=frappe.local.site)
    frappe.connect()

    # Create standard UOMs that ERPNext should have seeded
    uoms = ["Nos", "Box", "Unit", "Set", "Pair", "Kg", "Gram", "Meter",
            "Litre", "Piece", "Packet", "Carton", "Ton", "Dozen", "Hour", "Day"]
    for uom in uoms:
        if not frappe.db.exists("UOM", uom):
            frappe.get_doc({"doctype": "UOM", "uom_name": uom}).insert(ignore_permissions=True)
            print(f"Created UOM: {uom}")
    
    frappe.db.commit()
    frappe.destroy()
    print("UOMs ready!")
