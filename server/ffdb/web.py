import os

from flask import Flask, request, jsonify, current_app

import ffdb.db as db

app = Flask(__name__)


@app.before_first_request
def create_db():
    if not os.environ.get('DB_DSN', None):
        os.environ['DB_DSN'] = 'host=127.0.0.1 dbname=ffdb_db user=ffdb_user password=ffdb_pass'
    app.pool = db.create_pool(os.environ['DB_DSN'])


@app.route('/api/doc/<template_name>', methods=['GET'])
def list_documents(template_name):
    with current_app.pool.acquire() as connection:
        with connection.cursor() as cursor:
            return jsonify(documents=db.list_documents(cursor, template_name))


@app.route('/api/doc/<template_name>/<document_name>', methods=['GET'])
def get_document(template_name, document_name):
    with current_app.pool.acquire() as connection:
        with connection.cursor() as cursor:
            return jsonify(db.get_document(cursor, template_name, document_name))


@app.route('/api/doc/<template_name>/<document_name>', methods=['PUT'])
def store_document(template_name, document_name):
    with current_app.pool.acquire() as connection:
        with connection.cursor() as cursor:
            return jsonify(db.store_document(cursor, template_name, document_name, request.json))


# ==== Error handlers =====================================
def format_error(e):
    import traceback

    level = getattr(e, 'level', 'error')
    return dict(
        error=e.__class__.__name__,
        level=level,
        message=getattr(e, 'message', str(e)),
        stack=traceback.format_exc() if getattr(e, 'print_stack', True) else None,
    )


@app.errorhandler(404)
def handle_404(error):
    response = jsonify(dict(
        error="NotFound",
        message="This endpoint does not exist",
    ))
    response.status_code = 404
    return response


@app.errorhandler(500)
def handle_500(error):
    response = jsonify(format_error(error))
    response.status_code = 500
    return response
