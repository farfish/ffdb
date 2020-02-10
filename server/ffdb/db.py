from contextlib import contextmanager
from psycopg2.extras import RealDictCursor, Json
from psycopg2.pool import ThreadedConnectionPool

from werkzeug.exceptions import NotFound

from ffdb.template import template_model_inputs


def with_cursor(fn):
    """Turn connection argument into cursor, manage transaction"""
    def _with_cursor(conn, *args, **kwargs):
        try:
            with conn.cursor() as c:
                out = fn(c, *args, **kwargs)
                conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
        return out
    return _with_cursor


@with_cursor
def list_documents(c, template_name):
    c.execute('''
        SELECT document_name, MAX(version) latest
        FROM document
        WHERE template_name = %s
        GROUP BY document_name
    ''', (template_name, ))
    return c.fetchall()


@with_cursor
def store_document(c, template_name, document_name, author, content):
    model_inputs = template_model_inputs(template_name, content)
    model_errors = {}
    model_logs = {}
    input_hashes = {}
    for model_name, inp in model_inputs.items():
        model_logs[model_name] = inp['log']
        if 'error' in inp:
            # Store error for later
            model_errors[model_name] = inp['error']
        elif 'digest' in inp and 'rdata' in inp:
            # Write individual inputs to DB
            c.execute('''
                INSERT INTO model_output (model_name, input_hash, input_rdata, output_path)
                     VALUES (%s, %s, %s, NULL)
                ON CONFLICT DO NOTHING
            ''', (model_name, inp['digest'], inp['rdata']))
            # Strip data for storing digest later
            input_hashes[model_name] = inp['digest']
        else:
            raise ValueError("Malformed model_input %s: %s" % (model_name, inp))

    # Repeatedly try to insert, if another row beats us to the version then
    # we'll block until it's done, then fail, after which can try again.
    x = None
    while x is None:
        c.execute('''
            INSERT INTO document
            (template_name, document_name, author, content, input_hashes)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT(template_name, document_name, version) DO NOTHING
            RETURNING version
        ''', (
            template_name,
            document_name,
            author,
            Json(content),
            Json(input_hashes),
        ))
        x = c.fetchone()

    return dict(
        template_name=template_name,
        document_name=document_name,
        version=x['version'],
        author=author,
        content=content,
        model_errors=model_errors,
        model_logs=model_logs,
    )


@with_cursor
def get_document(c, template_name, document_name):
    """Fetch a single document"""
    c.execute('''
        SELECT version, author, content
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
        author=x['author'],
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
