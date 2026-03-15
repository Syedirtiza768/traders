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
