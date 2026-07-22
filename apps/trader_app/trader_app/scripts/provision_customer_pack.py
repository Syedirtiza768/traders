#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Provision / activate Customer master pack for a company.

Usage::

  bench --site <site> execute trader_app.scripts.provision_customer_pack.run \\
    --kwargs "{'company': 'Electrence', 'template': 'electrence', 'activate': 1}"
"""

from __future__ import unicode_literals


def run(company=None, template="electrence", activate=1):
    from trader_app.api.migration_toolkit import provision_customer_pack
    from trader_app.setup.custom_fields import ensure_custom_fields

    ensure_custom_fields()
    return provision_customer_pack(
        company=company,
        template=template,
        activate=activate,
    )
