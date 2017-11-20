from flask import Flask, request, Response, jsonify, g

from .db import DB

def db():
    if not getattr(g, '_db', None):
        g._db = DB()
    return g._db

app = Flask(__name__)

@app.teardown_appcontext
def close_db(exception):
    if getattr(g, 'clicdb', None):
        g.clicdb.close()


@app.route('/api/doc/<template_id>', methods=['GET'])
def list_documents(template_id):
    return jsonify(documents=list(db().list_documents(template_id)))

@app.route('/api/doc/<template_id>/<document_id>', methods=['GET'])
def get_document(template_id, document_id):
    return jsonify(db().get_document(template_id, document_id))

@app.route('/api/doc/<template_id>/<document_id>', methods=['PUT'])
def store_document(template_id, document_id):
    return jsonify(db().store_document(template_id, document_id, request.json))

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
    import traceback
    response = jsonify(format_error(error))
    response.status_code = 500
    return response
