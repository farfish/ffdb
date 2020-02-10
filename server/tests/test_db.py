import unittest

from psycopg2.extras import Json

import ffdb.db as db
from tests.requires_postgresql import RequiresPostgresql


def ut_template_table(**fields):
    out = dict(
        _headings=dict(
            fields=list(fields.keys()),
            # 0..x for length of first field
            values=list(range(len(fields[list(fields.keys())[0]]))),
        )
    )
    for k, v in fields.items():
        out[k] = v
    return out


class TestDB(RequiresPostgresql, unittest.TestCase):
    def test_with_cursor(self):
        """
        Cursor/transaction management
        """
        pool = db.create_pool(self.dsn_string())

        # No documents of our type yet
        with pool.acquire() as conn:
            self.assertEqual(db.list_documents(conn, 'ut_test_with_cursor'), [])

        # Failures don't commit
        @db.with_cursor
        def insert_then_fail(c):
            c.execute('''
                INSERT INTO document
                (template_name, document_name, content)
                VALUES (%s, %s, %s)
            ''', (
                "ut_test_with_cursor",
                "ut_doc",
                Json(dict(a=1)),
            ))
            raise ValueError("Whoops")
        with self.assertRaisesRegex(ValueError, 'Whoops'):
            with pool.acquire() as conn:
                insert_then_fail(conn)
        with pool.acquire() as conn:
            self.assertEqual(db.list_documents(conn, 'ut_test_with_cursor'), [])

    def test_documents(self):
        """
        We can store, retrieve and list documents
        """
        pool = db.create_pool(self.dsn_string())

        # Nothing there yet
        with pool.acquire() as conn:
            self.assertEqual(db.list_documents(conn, 'tmpl0'), [])
        with pool.acquire() as conn:
            self.assertEqual(db.list_documents(conn, 'tmpl1'), [])

        # Store something, there is
        with pool.acquire() as conn:
            self.assertEqual(db.store_document(conn, 'tmpl0', 'doc0', "anon", dict(cows=['daisy'])), dict(
                template_name='tmpl0',
                document_name='doc0',
                version=1,
                author="anon",
                content=dict(cows=['daisy']),
                model_errors={},
                model_logs={},
            ))
        with pool.acquire() as conn:
            self.assertEqual(db.list_documents(conn, 'tmpl0'), [dict(document_name='doc0', latest=1)])
        with pool.acquire() as conn:
            self.assertEqual(db.list_documents(conn, 'tmpl1'), [])

        # Get it again
        with pool.acquire() as conn:
            self.assertEqual(db.get_document(conn, 'tmpl0', 'doc0'), dict(
                template_name='tmpl0',
                document_name='doc0',
                version=1,
                author="anon",
                content=dict(cows=['daisy']),
            ))

        # Can store new versions
        with pool.acquire() as conn:
            self.assertEqual(db.store_document(conn, 'tmpl0', 'doc0', "anom", dict(cows=['daisy', 'freda'])), dict(
                template_name='tmpl0',
                document_name='doc0',
                version=2,
                author="anom",
                content=dict(cows=['daisy', 'freda']),
                model_errors={},
                model_logs={},
            ))
        with pool.acquire() as conn:
            self.assertEqual(db.list_documents(conn, 'tmpl0'), [dict(document_name='doc0', latest=2)])
        with pool.acquire() as conn:
            self.assertEqual(db.list_documents(conn, 'tmpl1'), [])

        # Get it again
        with pool.acquire() as conn:
            self.assertEqual(db.get_document(conn, 'tmpl0', 'doc0'), dict(
                template_name='tmpl0',
                document_name='doc0',
                version=2,
                author="anom",
                content=dict(cows=['daisy', 'freda']),
            ))

        # ...or new documents
        with pool.acquire() as conn:
            self.assertEqual(db.store_document(conn, 'tmpl0', 'doc1', "agon", dict(pigs=['george'])), dict(
                template_name='tmpl0',
                document_name='doc1',
                version=1,
                author="agon",
                content=dict(pigs=['george']),
                model_errors={},
                model_logs={},
            ))
        with pool.acquire() as conn:
            self.assertEqual(db.list_documents(conn, 'tmpl0'), [
                dict(document_name='doc0', latest=2),
                dict(document_name='doc1', latest=1),
            ])
        with pool.acquire() as conn:
            self.assertEqual(db.list_documents(conn, 'tmpl1'), [])

        # ... with different templates
        with pool.acquire() as conn:
            self.assertEqual(db.store_document(conn, 'tmpl1', 'doc0', "amon", dict(pigs=['emily'])), dict(
                template_name='tmpl1',
                document_name='doc0',
                version=1,
                author="amon",
                content=dict(pigs=['emily']),
                model_errors={},
                model_logs={},
            ))
        with pool.acquire() as conn:
            self.assertEqual(db.list_documents(conn, 'tmpl0'), [
                dict(document_name='doc0', latest=2),
                dict(document_name='doc1', latest=1),
            ])
        with pool.acquire() as conn:
            self.assertEqual(db.list_documents(conn, 'tmpl1'), [
                dict(document_name='doc0', latest=1),
            ])

    def test_model_inputs(self):
        """
        Model input data gets written back to DB
        """
        pool = db.create_pool(self.dsn_string())

        with pool.acquire() as conn:
            out = db.store_document(conn, 'ut_example', 'doc0', "anon", dict(
                a=ut_template_table(a=[1]),
                b=ut_template_table(err=["Oh noes"]),
            ))
            self.assertEqual(out['model_errors'], dict(
                model_b='[1] "B went wrong!Oh noes"\n',
            ))
            self.assertEqual(out['model_logs'], dict(
                model_a='',
                model_b='',
            ))

        with pool.acquire() as conn:
            out = db.store_document(conn, 'ut_example', 'doc0', "anon", dict(
                a=ut_template_table(a=[1]),
                b=ut_template_table(print=["Hello"]),
            ))
            self.assertEqual(out['model_errors'], dict(
            ))
            self.assertEqual(out['model_logs'], dict(
                model_a='',
                model_b='B has\nSome lines\nHello\n',
            ))
