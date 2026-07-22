# -*- coding: utf-8 -*-
"""Electrence quotation defaults (terms) and sample seed helpers."""

from __future__ import unicode_literals

ELECTRENCE_QUOTATION_TERMS = """In case of multiple options amounts of first option is considered
Quoted Prices are Valid for 5 working days
Payment: 50% Advance with Purchase Order and 50% after 30 Days
Our prices are based on USD, If there is a depreciation in PKR greater than 3%, the difference will be charged from customer.
Partial Deliveries and Partial Invoicing Applicable.
All Products supplied are BRAND NEW which are warranted against defects in design, workmanship, and materials.
The following conditions will VOID the warranty: • Misuse or mishandling of component. • Modification or repair of the component. • Fault/ Wrong installation of component.
No returns will be accepted after 5 days from delivery date.
The Company reserves the right to invoke the force majeure clause
This is system generated document and does not require a signature"""


SAMPLE_ITEMS = [
    {
        "item_code": "OFC-12C-SM-GYXTW",
        "item_name": "CABLE FIBER OPTIC (OFC) 12 Core Single Mode",
        "description": (
            "CABLE FIBER OPTIC (OFC). SINGLE MODE\n"
            "12 Core Single Mode Optical Fiber Cable\n"
            "Type: GYXTW Fiber: ITU-T G.652D\n"
            "Armour: Corrugated Steel Tape\n"
            "Outdoor / Direct burial or duct installation\n"
            "Drum length: 1000meter\n"
            "Make: Corning (Data Sheet Attached)\n"
            "Delivery: Ex- Stock (Subject to Prior Sale)"
        ),
        "standard_rate": 450,
    },
    {
        "item_code": "BELDEN-9842NH",
        "item_name": "Cable EIA RS-485 Belden 9842NH",
        "description": (
            "Cable EIA RS-485 Cable, 24 AWG stranded (7x32) tinned copper conductors, "
            "polyethylene insulation, 2 twisted pairs, overall Beldfoil (100% coverage) + "
            "tinned copper braid shield (90% coverage), 24 AWG stranded tinned copper drain wire, "
            "LSZH jacket\n"
            "Part: 9842NH (1000 Meter Packing)\n"
            "Make: Belden (Data Sheet Attached)\n"
            "Delivery: Ex- Stock (Subject to Prior Sale)"
        ),
        "standard_rate": 1650,
    },
    {
        "item_code": "DRAKA-RS485-24AWG",
        "item_name": "Cable RS-485 Draka 24AWG",
        "description": (
            "Cable For multi-dropped, medium-speed, serial data communication in electrically "
            "noisy industrial environments. Application includes industrial networks using "
            "RS-485 / RS-422 / RS-232 transceivers, RS-422 systems for Process Automation "
            "(chemicals, brewing, paper mills), factory automation (autos, metal fabrication), "
            "HVAC, security, motor control and motion control.\n"
            "Stranded Tinned Copper, 24AWG, Diameter 7 x 0.20mm\n"
            "Make: Draka (Data sheet Attached)\n"
            "Delivery: Ex- Stock (Subject to Prior Sale)"
        ),
        "standard_rate": 450,
    },
]


def get_default_quotation_terms(company=None):
    """Return seeded Electrence-style terms (editable on the quotation)."""
    return ELECTRENCE_QUOTATION_TERMS
