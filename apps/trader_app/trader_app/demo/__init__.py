# -*- coding: utf-8 -*-
"""Trader App — Demo module.

Entry point for demo data installation.
Usage:
    bench --site <site> execute trader_app.demo.install_demo
    bench --site <site> execute trader_app.demo.uninstall_demo
"""

from __future__ import unicode_literals


def install_demo():
    """Install complete demo data for the trader system."""
    from trader_app.demo.installer.main import DemoInstaller

    installer = DemoInstaller()
    installer.install()


def uninstall_demo():
    """Remove all demo data."""
    from trader_app.demo.installer.main import DemoInstaller

    installer = DemoInstaller()
    installer.uninstall()


def enrich_reports():
    """Run ONLY the enrichment generator on an existing demo dataset.

    Usage:
        bench --site <site> execute trader_app.demo.enrich_reports
    """
    from trader_app.demo.seed_engine.config import DEMO_CONFIG
    from trader_app.demo.generators.enrichment import EnrichmentGenerator

    gen = EnrichmentGenerator(DEMO_CONFIG)
    gen.run()
    gen.run_validation()
