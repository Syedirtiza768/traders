#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Provision / activate Commercial Opportunity pack for a company.

Usage (bench console or ``bench execute``):

  bench --site <site> execute trader_app.scripts.provision_opportunity.run \\
    --kwargs "{'company': 'Electrance', 'template': 'electrance', 'activate': 1}"

Or from console::

  from trader_app.scripts.provision_opportunity import run
  run(company="Your Company", template="electrance", activate=1)

``template`` is a pack name (electrance / minimal), not a hardcoded tenant branch.
``activate=0`` creates an inert profile without flipping the company flag.
"""

from __future__ import unicode_literals


def run(company=None, template="electrance", activate=1):
    from trader_app.api.migration_toolkit import provision_opportunity_pack
    from trader_app.setup.custom_fields import ensure_custom_fields

    ensure_custom_fields()
    return provision_opportunity_pack(
        company=company,
        template=template,
        activate=activate,
    )
