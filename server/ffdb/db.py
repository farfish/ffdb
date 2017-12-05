import json
import os.path
import sqlite3
from werkzeug.exceptions import NotFound


RDB_VERSION = 1
DEFAULT_RDB_FILE = os.path.join(
    os.path.dirname(__file__),
    '..',  # /server/
    '..',  # /
    'ffdb.sqlite.%d' % RDB_VERSION,
)


class DB():
    def __init__(self, rdb_file=DEFAULT_RDB_FILE):
        self.rdb = sqlite3.connect(rdb_file)
        self.rdb.isolation_level = None
        self.rdb.execute('PRAGMA mmap_size = %d;' % (1024**3))
        self.rdb.execute("PRAGMA foreign_keys = ON;")
        self.rdb.execute("PRAGMA page_size = 4096;")

    def close(self):
        self.rdb.close()

    def list_documents(self, template_id):
        return self.rdb.execute('''
            SELECT document_id, MAX(version)
            FROM document
            WHERE template_id = ?
            GROUP BY document_id
        ''', (template_id, ))

    def store_document(self, template_id, document_id, content):
        version = 1
        content_string = json.dumps(content)
        while True:
            try:
                c = self.rdb.cursor()
                # TODO: sqlite3's transaction handling is completely broken, use apsw instead
                try:
                    c.execute("ROLLBACK")
                except:
                    pass
                c.execute("BEGIN")
                c.execute('''
                    INSERT INTO document
                    (template_id, document_id, version, content)
                    VALUES (?, ?, ?, ?)
                ''', (
                    template_id,
                    document_id,
                    version,
                    content_string,
                ))
                c.execute("COMMIT")
                break
            except sqlite3.IntegrityError as e:
                if str(e).startswith('UNIQUE constraint'):
                    version += 1
                    continue
                raise

        return dict(
            template_id=template_id,
            document_id=document_id,
            version=version,
            content=json.loads(content_string),
        )

    def get_document(self, template_id, document_id):
        """Fetch a single document"""
        x = self.rdb.execute('''
            SELECT version, content
            FROM document
            WHERE template_id = ?
            AND document_id = ?
            ORDER BY version DESC
        ''', (template_id, document_id)).fetchone()
        if x is None:
            raise NotFound("%s/%s" % (template_id, document_id))
        version, content_string = x

        return dict(
            template_id=template_id,
            document_id=document_id,
            version=version,
            content=json.loads(content_string),
        )

    def update_rdb(self):
        """Make sure we have an up-to-date DB"""
        self.update_from_0()  # TODO: Detect version, do upgrade

    def update_from_0(self):
        """Create schema from scratch"""
        self.rdb.execute('''CREATE TABLE schema (
            version INT DEFAULT 1,
            PRIMARY KEY (version)
        )''')
        self.rdb.execute('''INSERT INTO schema VALUES(1)''')
        self.rdb.execute('''CREATE TABLE document (
            template_id TEXT,
            document_id TEXT,
            version INT DEFAULT 1,
            content BLOB NOT NULL,
            PRIMARY KEY (template_id, document_id, version)
        )''')


def update_rdb():
    db = DB()
    db.update_rdb()
