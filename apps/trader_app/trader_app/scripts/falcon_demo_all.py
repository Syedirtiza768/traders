# -*- coding: utf-8 -*-
"""Falcon demo - run the business in order on a bootstrapped site. DEMO ONLY. Fictional data.

    bench --site traders-demo.localhost execute trader_app.scripts.falcon_demo_all.run_all

Requires falcon_demo.bootstrap and falcon_demo_masters.masters to have run once. Clears this company's
transactions first (masters stay), so the run is repeatable.
"""

from __future__ import unicode_literals

import json

import frappe

from trader_app.scripts import falcon_demo_fulfil as F
from trader_app.scripts import falcon_demo_run as R
from trader_app.scripts import falcon_demo_team as T


def run_all():
    out = {}
    out["reset"] = R.reset_business()
    phase1, state = R.phase1_founder()
    fulfil, state = F.fulfil_project_a(state)
    founder_b, state = T.founder_project_b_and_collection(state)
    team, state = T.team_phase2(state)
    from trader_app.scripts import falcon_demo_exceptions as X

    exc, state = X.exceptions(state)
    from trader_app.scripts import falcon_demo_tax as TX

    tax, state = TX.wht_final_collection(state)
    closure, state = TX.close_project_a(state)
    # A back-dated receipt, challan or cancellation settles its valuation queue in the request that submits it
    # (stock_settlement, G-VAL-01). Nothing is run by hand here: the count is the check, and reconciliation reads the result.
    frappe.db.commit()
    out["valuation_queue_left"] = frappe.db.count("Repost Item Valuation", {"status": ["in", ["Queued", "In Progress"]]})
    out["steps"] = {"phase1": phase1, "fulfil": fulfil, "founder_b": founder_b, "team": team, "exceptions": exc,
                    "tax": tax, "closure": closure}
    out["state"] = state
    return json.loads(json.dumps(out, default=str))
