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

Install the following prerequisites::

    sudo apt install \
        python3-venv python3-dev \
        postgresql

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

Finally install:

    sudo ./install.sh

References
----------

.. [js-xlsx] https://github.com/SheetJS/js-xlsx
.. [handsontable] https://handsontable.com/

Acknowledgements
----------------

This project has received funding from the European Union’s Horizon 2020
research and innovation programme under grant agreement no. 727891.
