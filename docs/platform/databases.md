# Platform Databases

Databases provide structured storage for platform components, workspace workloads, and external services. prokube deployments commonly include PostgreSQL and MariaDB and can be extended with a variety of databases. User-facing database availability, ownership, and access are deployment-specific.

Labs can also connect to external databases. The connection examples on this page use PostgreSQL, MariaDB/MySQL, and Microsoft SQL Server.

::: info Upstream documentation
Use the upstream documentation for database and operator reference:

- [PostgreSQL documentation](https://www.postgresql.org/docs/)
- [Crunchy Data Postgres Operator documentation](https://access.crunchydata.com/documentation/postgres-operator/latest/)
- [MariaDB Operator documentation](https://github.com/mariadb-operator/mariadb-operator/blob/main/docs/README.md)
- [TimescaleDB documentation](https://docs.timescale.com/)
:::

## Database Services

| Database | Platform role | Typical use |
|---|---|---|
| PostgreSQL | Native, operator-managed | General relational workloads |
| MariaDB | Native, operator-managed | Relational workloads |
| TimescaleDB<sup class="pk-docs-footnote-marker">*</sup> | PostgreSQL time-series extension | Time-series workloads |
| MySQL / Microsoft SQL Server | External | Relational workloads |

<sup class="pk-docs-footnote-marker">*</sup>Availability, version, sizing, and backup policy depend on the deployment.

## Before You Connect

If you need a database for your workload, ask your administrator which service is available and how to access it.

For a platform-managed database, confirm:

- which workspace or namespace owns the database;
- the hostname, port, database name, and user to use;
- how credentials are created, stored, and rotated;
- what backup, restore, and retention policy applies;
- whether network policies or egress profiles restrict access.

Operator-managed databases should be treated as platform resources. Do not manually replace database pods or change operator-managed parameters unless you administer the deployment and understand the recovery procedure.

For an external database, obtain the connection details from its administrator and ensure that the database accepts connections from the platform network. prokube does not manage the external database's users, schema, backups, or retention policy.

## Access Databases from Labs

The public [`prokube/examples`](https://github.com/prokube/examples) repository contains database access examples for Python notebooks and RStudio. Managed Labs normally clone this repository into `~/examples`. If it is missing, clone it into your Lab home directory:

```bash
git clone https://github.com/prokube/examples.git ~/examples
```

See the `storage/database-access` examples directory for the complete set of database examples, or [browse it on GitHub](https://github.com/prokube/examples/tree/main/storage/database-access).

::: details GitHub example paths
- PostgreSQL: [Python notebook](https://github.com/prokube/examples/blob/main/storage/database-access/python/postgresql.ipynb) or [R script](https://github.com/prokube/examples/blob/main/storage/database-access/r/postgresql.R)
- MariaDB/MySQL: [Python notebook](https://github.com/prokube/examples/blob/main/storage/database-access/python/mariadb.ipynb) or [R script](https://github.com/prokube/examples/blob/main/storage/database-access/r/mariadb.R)
- Microsoft SQL Server: [Python notebook](https://github.com/prokube/examples/blob/main/storage/database-access/python/sqlserver.ipynb) or [R script](https://github.com/prokube/examples/blob/main/storage/database-access/r/sqlserver.R)
:::

The examples use the Iris dataset, create a table named `iris_example`, write the data, read a few rows back, and close the connection. Edit the connection values at the top of the example and enter the password when prompted:

- `host`
- `port`
- `database`
- `user`

### PostgreSQL from Python

The PostgreSQL notebook uses SQLAlchemy and pandas to write the Iris dataset to a table and read it back:

```python
import getpass

import pandas as pd
from sklearn.datasets import load_iris
from sqlalchemy import URL, create_engine

# Set these values for your PostgreSQL database.
host = "<server-domain>"
port = 5432
database = "<database>"
user = "<user>"

iris = load_iris(as_frame=True).frame
engine = create_engine(
    URL.create(
        "postgresql+psycopg2",
        username=user,
        password=getpass.getpass("Database password: "),
        host=host,
        port=port,
        database=database,
    )
)

iris.to_sql("iris_example", engine, if_exists="replace", index=False)
pd.read_sql("SELECT * FROM iris_example LIMIT 5", engine)
```

The MariaDB/MySQL and SQL Server notebooks use the same workflow with their respective drivers and connection settings.

The database drivers used by the examples are:

- PostgreSQL: `psycopg2`, `pyodbc` with `PostgreSQL Unicode`;
- MariaDB/MySQL: `pyodbc` with `MariaDB Unicode`;
- Microsoft SQL Server: `pyodbc` with `FreeTDS`.

The R scripts use `DBI` and `odbc` with the same ODBC drivers. The prokube-maintained notebook and RStudio images provide the packages and drivers used by these examples.

### Example Connection Values

The examples use these standard port values:

| Database | Port |
|---|---:|
| PostgreSQL | `5432` |
| MariaDB/MySQL | `3306` |
| Microsoft SQL Server | `1433` |

Use the port configured by the database administrator rather than assuming the example value. For staging Microsoft SQL Server hosts, use the following command from a Lab terminal to list SQL Server Browser-advertised instances and connection details when the port is not known:

```bash
tsql -L -H <server-domain>
```

If the staging host does not advertise its instances, ask the database administrator for the port. Port `1433` is common for a default instance, but named instances and deployments using dynamic ports may differ.

## Security and Access Control

::: warning Database access is scope- and permission-dependent
Platform-managed database access depends on workspace and namespace permissions, network and egress policy, and database grants. External database access also depends on the external administrator's users, grants, and network allowlists.

Do not assume that access to a Lab or workspace grants access to every database in the cluster or network.
:::

Availability, encryption, backups, and retention depend on the deployment or the external database administrator. Confirm the applicable policy before storing data that cannot be recreated.

::: info Follow these rules:
- scope platform-managed database credentials to the required database and workload;
- never store plaintext database passwords in notebooks, pipeline source code, container images, shared file-storage buckets, or files in mounted folders;
- use a password prompt, Kubernetes Secret, or a platform-provided credential flow;
- use separate credentials for shared workloads instead of personal credentials;
- follow the database administrator's TLS and certificate requirements.
:::

## Performance

Query performance depends on schema design, indexes, connection count, memory, storage latency, and database sizing. Default PostgreSQL settings are not always appropriate for every workload.

If queries are unexpectedly slow:

- inspect query plans with `EXPLAIN` or `EXPLAIN ANALYZE`;
- verify indexes for common filters and joins;
- check connection pooling and long-running transactions;
- confirm the instance has sufficient CPU, memory, and storage throughput;
- ask the database administrator before changing operator-managed database parameters.

For a starting point, see Crunchy Data's [PostgreSQL performance tuning guidance](https://www.crunchydata.com/blog/optimize-postgresql-server-performance).

## FAQ

### Which database should I use?

Use PostgreSQL for general relational workloads and TimescaleDB for time-series workloads when those services are available in the deployment. Use MariaDB when it is available as a platform-managed service, or MariaDB/MySQL when connecting to an external database. Use Microsoft SQL Server for an external database when your Lab can reach it.

### Who manages backups?

The deployment administrator defines backup and restore policy for platform-managed databases. External database administrators own the backup and retention policy for their databases. Confirm the policy before storing data that cannot be recreated.

### Where are the connection examples?

Managed Labs normally include the `prokube/examples` repository under `~/examples`. The database examples are under `storage/database-access` and include Python notebooks and R scripts for all supported connection examples.

## Troubleshooting

| Symptom | Check |
|---|---|
| Connection refused or timed out | Verify the hostname and port, confirm the database is running, and check namespace, network, and egress policy. |
| Authentication fails | Confirm the database name, user, password, authentication method, and whether the user is allowed to connect from the Lab network. |
| Driver or module is missing | Use a prokube-maintained notebook or RStudio image, or install the required package in the Lab environment. |
| SQL Server connection fails | Confirm the server port and FreeTDS configuration. For staging hosts, run `tsql -L -H <server-domain>` to list advertised instances; ask the database administrator for the port if the host does not respond. |
| Queries are slow | Inspect the query plan, indexes, connection pool, transaction duration, and database resource limits. |
| Database or schema is not available | Confirm that the database exists, the user has the required grants, and the platform or external administrator has provided the correct connection scope. |

## Related Pages

- [Workspaces](workspaces.md)
- [Kubernetes Resources](kubernetes.md)
- [File Storage](file_storage.md)
- [Using Labs](../labs/index.md)
- [Backup and Restore](../admin/backup_restore.md)
