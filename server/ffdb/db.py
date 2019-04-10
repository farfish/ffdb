from contextlib import contextmanager
from psycopg2 import IntegrityError
from psycopg2.extras import RealDictCursor, Json
from psycopg2.pool import ThreadedConnectionPool

from werkzeug.exceptions import NotFound


def list_documents(c, template_name):
    c.execute('''
        SELECT document_name, MAX(version) latest
        FROM document
        WHERE template_name = %s
        GROUP BY document_name
    ''', (template_name, ))
    return c.fetchall()


def store_document(c, template_name, document_name, content):
    version = 1
    while True:
        try:
            c.execute('''
                INSERT INTO document
                (template_name, document_name, version, content)
                VALUES (%s, %s, %s, %s)
            ''', (
                template_name,
                document_name,
                version,
                Json(content),
            ))
            c.connection.commit()
            break
        except IntegrityError as e:
            if 'unique constraint "document_pkey"' in str(e):
                version += 1
                c.connection.rollback()
                continue
            raise

    return dict(
        template_name=template_name,
        document_name=document_name,
        version=version,
        content=content,
    )


def get_document(c, template_name, document_name):
    """Fetch a single document"""
    c.execute('''
        SELECT version, content
        FROM document
        WHERE template_name = %s
        AND document_name = %s
        ORDER BY version DESC
    ''', (template_name, document_name))
    x = c.fetchone()
    if x is None:
        raise NotFound("%s/%s" % (template_name, document_name))

    return dict(
        template_name=template_name,
        document_name=document_name,
        version=x['version'],
        content=x['content'],
    )


class PoolWrapper:
    """Exists to provide an acquire method for easy usage.

        pool = PoolWrapper(...)
        with pool.acquire() as conneciton:
            connection.execute(...)
    """

    def __init__(self, max_pool_size: int, *, dsn):
        self._pool = ThreadedConnectionPool(
            1, max_pool_size, dsn=dsn, cursor_factory=RealDictCursor,
        )

    @contextmanager
    def acquire(self):
        try:
            connection = self._pool.getconn()
            yield connection
        finally:
            self._pool.putconn(connection)


def create_pool(dsn):
    # Autocommit off
    return PoolWrapper(20, dsn=dsn)
