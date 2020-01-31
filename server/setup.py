from setuptools import setup, find_packages

requires = [
    'Flask',
    'uWSGI',
    'psycopg2',
    'rpy2',
]

tests_require = [
    'pytest',
    'pytest-cov',
    'testing.postgresql',
]

setup(
  name="ffdb",
  description='FFDB web API',
  author='Jamie Lentin',
  author_email='jamie.lentin@shuttlethread.com',
  url='https://github.com/farfish/ffdb',
  packages=find_packages(),
  install_requires=requires,
  extras_require=dict(
    testing=tests_require,
  ),
  entry_points={
        'console_scripts': [
        ],
    },
)
