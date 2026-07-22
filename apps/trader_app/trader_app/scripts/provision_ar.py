#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Provision / activate Customer AR & Document Prints pack for a company.

Usage (bench console or ``bench execute``):

  bench --site <site> execute trader_app.scripts.provision_ar.run \\
    --kwargs "{'company': 'Electrence', 'template': 'electrence', 'activate': 1}"

Or from console::

  from trader_app.scripts.provision_ar import run
  run(company="Your Company", template="electrence", activate=1)

``template`` is a pack name (electrence / minimal), not a hardcoded tenant branch.
``activate=0`` creates an inert profile without flipping the company flag.
"""

from __future__ import unicode_literals


def run(company=None, template="electrence", activate=1):
    from trader_app.api.migration_toolkit import provision_ar_pack
    from trader_app.setup.custom_fields import ensure_custom_fields

    ensure_custom_fields()
    return provision_ar_pack(
        company=company,
        template=template,
        activate=activate,
    )
