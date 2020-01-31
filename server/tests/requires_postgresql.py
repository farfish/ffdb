import os
import os.path
import subprocess

import testing.postgresql


def runSqlScript(postgresql, script):
    return subprocess.run((
        'psql', '-b',
        '-f', script,
        '-h', 'localhost',
        '-p', str(postgresql.settings['port']),
        '-U', 'postgres', '-w',
        'test',
    ), check=True, stdout=subprocess.PIPE)


def initDatabase(postgresql):
    dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'schema')
    for s in sorted(os.listdir(dir)):
        if not s.endswith('.sql'):
            continue
        runSqlScript(postgresql, os.path.join(dir, s))


Postgresql = testing.postgresql.PostgresqlFactory(cache_initialized_db=True)


class RequiresPostgresql():
    def setUp(self):
        super(RequiresPostgresql, self).setUp()

        self.postgresql = testing.postgresql.Postgresql()
        initDatabase(self.postgresql)

    def dsn_string(self):
        """Generate psycopg compatible dsn string to connect with"""
        return " ".join(
            "%s=%s" % ('dbname' if k == 'database' else k, v)
            for k, v in self.postgresql.dsn().items()
        )

    def tearDown(self):
        self.postgresql.stop()

        super(RequiresPostgresql, self).tearDown()
