# Platform Databases

prokube deployments can include PostgreSQL-based database services for platform components and, depending on the installation, user workloads. Treat database availability and access as deployment-specific unless your administrator has explicitly enabled a self-service database workflow.

::: info Upstream documentation
Use the upstream documentation for database and operator reference:

- [PostgreSQL documentation](https://www.postgresql.org/docs/)
- [Crunchy Data Postgres Operator documentation](https://access.crunchydata.com/documentation/postgres-operator/latest/)
- [TimescaleDB documentation](https://docs.timescale.com/)
:::

## PostgreSQL

PostgreSQL is the default relational database used by several platform components. In prokube deployments that expose database services to users, PostgreSQL instances are usually managed by an operator rather than by manually running database pods.

Before using PostgreSQL for a workload, confirm with your administrator:

- whether user-managed PostgreSQL instances are available;
- which namespace or workspace owns the database;
- how credentials are created and rotated;
- what backup, restore, and retention policy applies;
- whether network policies or egress profiles restrict database access.

Do not store database passwords in notebooks, pipeline source code, container images, or shared object-storage buckets. Use Kubernetes Secrets or a platform-provided credential flow.

## TimescaleDB

Some deployments can provide TimescaleDB for time-series workloads. TimescaleDB availability, version, sizing, and backup policy are deployment-specific. Use it only after the administrator confirms that it is part of the supported platform profile.

## Performance

Default PostgreSQL settings are not always appropriate for every workload. Query performance depends on schema design, indexes, connection count, memory, storage latency, and database sizing.

If queries are unexpectedly slow:

- inspect query plans with `EXPLAIN` or `EXPLAIN ANALYZE`;
- verify indexes for common filters and joins;
- check connection pooling and long-running transactions;
- confirm the instance has sufficient CPU, memory, and storage throughput;
- ask the database administrator before changing operator-managed database parameters.

For a starting point, see Crunchy Data's [PostgreSQL performance tuning guidance](https://www.crunchydata.com/blog/optimize-postgresql-server-performance).

## Related Pages

- [Workspaces](workspaces.md)
- [Kubernetes Resources](kubernetes.md)
- [Object Storage](object_storage.md)
