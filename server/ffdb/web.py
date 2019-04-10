import os
import urllib.error
import urllib.parse
import urllib.request

from flask import Flask, request, jsonify, current_app, g, abort

import ffdb.db as db

app = Flask(__name__)


@app.before_first_request
def create_db():
    if not os.environ.get('DB_DSN', None):
        os.environ['DB_DSN'] = 'host=127.0.0.1 dbname=ffdb_db user=ffdb_user password=ffdb_pass'
    app.pool = db.create_pool(os.environ['DB_DSN'])


@app.before_request
def before_request():
    g.username = None

    if not os.environ.get('APP_LOGIN_CHECK_BASE', None):
        # Nothing to check, assume an anonymous user is okay
        g.username = 'anonymous'
        return

    # Find WP cookie, and attempt to fetch document
    check_url = os.environ['APP_LOGIN_CHECK_BASE'] + ('ffdb.txt' if request.method == 'GET' else 'ffdb-edit.txt')
    for k in request.cookies.keys():
        if k.startswith('wordpress_logged_in_'):
            try:
                resp = urllib.request.urlopen(urllib.request.Request(check_url, headers={
                    'cookie': "=".join([k, request.cookies[k]]),
                }))

                if resp.status == 200:
                    wp_cookie = urllib.parse.unquote(request.cookies[k]).split('|')
                    g.username = wp_cookie[0]
                    return
            except urllib.error.HTTPError:
                # Check failed. Ignore this cookie, see if there are any others before giving up
                pass

    # Failed, return 401, let client redirect to login page
    return abort(401)


@app.after_request
def username_header(response):
    response.headers['X-FFDB-UserName'] = g.username
    return response


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
            return jsonify(db.store_document(cursor, template_name, document_name, g.username, request.json))


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


@app.errorhandler(401)
def handle_401(error):
    response = jsonify(dict(
        error="NotAuthorized",
        message="You are not logged in",
        redirect=os.environ.get('APP_LOGIN_URL', None),
    ))
    response.status_code = 401
    return response


@app.errorhandler(500)
def handle_500(error):
    response = jsonify(format_error(error))
    response.status_code = 500
    return response
