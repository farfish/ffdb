import os
import os.path
import subprocess

import psycopg2
from psycopg2.extras import RealDictCursor
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
        self.conn = psycopg2.connect(**self.postgresql.dsn())

    def cursor(self):
        return self.conn.cursor(cursor_factory=RealDictCursor)

    def tearDown(self):
        self.conn.close()
        self.postgresql.stop()

        super(RequiresPostgresql, self).tearDown()
