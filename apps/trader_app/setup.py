from setuptools import setup, find_packages

setup(
    name="trader_app",
    version="1.0.0",
    description="Trader Business System — Custom ERPNext Application",
    author="Traders",
    author_email="dev@traders.local",
    packages=find_packages(),
    zip_safe=False,
    include_package_data=True,
    install_requires=[],
)
