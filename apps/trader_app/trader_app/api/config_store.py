# -*- coding: utf-8 -*-
"""Trader App — durable, cache-backed config store.

The source of truth for company-scoped configuration packs is the
**Trader Config Pack** DocType. A Redis cache fronts it for read performance,
but — unlike the previous cache-only approach — config now survives a cache
flush or restart because the DocType is the authority.

Usage:

    from trader_app.api import config_store

    cfg = config_store.read_config(company, "gst", default=DEFAULTS)
    config_store.write_config(company, "gst", cfg, label="GST Settings")

Design rule: this is generic infrastructure. It never branches on company or
tenant — callers pass a ``pack_key`` and get back plain data.
"""

from __future__ import unicode_literals

import json

import frappe

_CACHE_NS = "trader_config_pack"
_DOCTYPE = "Trader Config Pack"


def _cache_key(company, pack_key):
    return "{0}::{1}::{2}".format(_CACHE_NS, company, pack_key)


def _decode(value):
    if isinstance(value, bytes):
        value = value.decode("utf-8")
    if isinstance(value, str):
        try:
            return json.loads(value)
        except (TypeError, ValueError):
            return None
    return value


def read_config(company, pack_key, default=None):
    """Return the config payload for (company, pack_key).

    Falls back to ``default`` (deep-copied) when no pack exists. Reads from the
    Redis cache first, then the durable DocType, and back-fills the cache.
    """
    fallback = json.loads(json.dumps(default)) if default else {}
    if not company or not pack_key:
        return fallback

    ck = _cache_key(company, pack_key)
    cached = frappe.cache().get_value(ck)
    if cached is not None:
        decoded = _decode(cached)
        if decoded is not None:
            return decoded

    name = frappe.db.get_value(
        _DOCTYPE, {"company": company, "pack_key": pack_key}, "name"
    )
    if name:
        raw = frappe.db.get_value(_DOCTYPE, name, "payload")
        data = _decode(raw)
        if data is None:
            data = {}
    else:
        data = fallback

    frappe.cache().set_value(ck, json.dumps(data))
    return data


def write_config(company, pack_key, payload, label=None):
    """Persist ``payload`` for (company, pack_key) durably and refresh the cache.

    Creates the Trader Config Pack on first write, otherwise updates it and
    bumps ``pack_version``. Returns the config-pack record name.
    """
    if not company or not pack_key:
        frappe.throw("company and pack_key are required to write a config pack.")

    payload = payload or {}
    name = frappe.db.get_value(
        _DOCTYPE, {"company": company, "pack_key": pack_key}, "name"
    )

    if name:
        doc = frappe.get_doc(_DOCTYPE, name)
        doc.payload = payload
        if label:
            doc.label = label
        doc.pack_version = (doc.pack_version or 0) + 1
        doc.save(ignore_permissions=True)
    else:
        doc = frappe.get_doc(
            {
                "doctype": _DOCTYPE,
                "company": company,
                "pack_key": pack_key,
                "label": label or pack_key,
                "payload": payload,
                "pack_version": 1,
                "is_active": 1,
            }
        )
        doc.insert(ignore_permissions=True)

    # on_update() already invalidates; set the fresh value so the next read is warm.
    frappe.cache().set_value(_cache_key(company, pack_key), json.dumps(payload))
    return doc.name


def invalidate(company, pack_key):
    """Drop the cached copy so the next read re-hydrates from the DocType."""
    if company and pack_key:
        frappe.cache().delete_value(_cache_key(company, pack_key))
