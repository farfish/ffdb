from setuptools import setup

setup(
  name="ffdb",
  packages=['ffdb'],
  entry_points={
        'console_scripts': [
            'update_rdb=ffdb.db:update_rdb',
        ],
    },
)
