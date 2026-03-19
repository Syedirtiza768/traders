import py_compile, sys

try:
    py_compile.compile('/home/frappe/frappe-bench/apps/trader_app/trader_app/api/sales.py', doraise=True)
    print("SYNTAX OK")
except py_compile.PyCompileError as e:
    print("SYNTAX ERROR:", e)

# Try importing and see exact error
try:
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "sales_test",
        "/home/frappe/frappe-bench/apps/trader_app/trader_app/api/sales.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    fn = getattr(mod, 'get_sales_invoice_detail', None)
    print("Function found:", fn)
    print("Whitelisted attr:", getattr(fn, 'whitelisted', 'NOT SET'))
except Exception as e:
    print("IMPORT ERROR:", e)
    import traceback
    traceback.print_exc()
