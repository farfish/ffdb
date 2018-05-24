Farfish FFDB content ingest
^^^^^^^^^^^^^^^^^^^^^^^^^^^

This project provides a templated upload form for documents made up of any
number of table objects. Documents are stored as JSONB within a Postgresql
database, which can then be used to construct views on the data.

All old versions of documents are saved, and can be easily restored.

There is a flexible schema to define each table within the document, and a
table can have either a fixed list of columns / rows or a flexble number
provided by the user. `handsontable`_ is used to provide the table component.

Documents can also be exported / imported from excel spreadsheets using
`js-xlsx`_, where each table will be on a separate sheet in the document. The
import is intelligent enough to notice row / column reorderings and reassign
data.

Prerequisites
-------------

Install the following server prerequisites::

    sudo apt install \
        nginx \
        python3-venv python3-dev \
        postgresql

Install nodejs and yarn to complile the front-end::

    # See https://yarnpkg.com/lang/en/docs/install/
    curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
    echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
    sudo apt install nodejs yarn

Installation
------------

First run make to configure::

    make

Then create a ``.local-conf`` for your site configuration, see the top of
``install.sh`` for available options, and then create. For example::

    cat <<EOF > .local-conf
    SERVICE_MODE=production
    SERVER_NAME=ffdb.*
    EOF

Finally run install to create a systemd service and nginx configuration:

    sudo ./install.sh

References
----------

.. [js-xlsx] https://github.com/SheetJS/js-xlsx
.. [handsontable] https://handsontable.com/

Acknowledgements
----------------

This project has received funding from the European Union’s Horizon 2020
research and innovation programme under grant agreement no. 727891.
