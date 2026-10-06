# Private PDFs in the existing MariaDB: feasibility only

This is a design assessment, not an implemented storage backend or migration. No PDF was installed or copied into Git/public/dist. The existing runtime uses the verified dedicated Hostinger localhost:3306 MariaDB/MySQL connection; no new service, database credential or paid subscription is proposed. Owner approval is required before implementation/setup of this alternative.

Consumer-local approved files were reverified:

| Course | Bytes | SHA-256 | 512 KiB chunks |
| --- | ---: | --- | ---: |
| Meta v5, 54 pages | 2,710,796 | 213035507992b62cd373a920a583dab76df300ca68db75d64c65868e480925b5 | 6 |
| Practical AI, 42 pages | 6,854,862 | e2a3116af5428c4893401d9fbb7b0293370563f89e2f329c2ce7485cc1a2f1e5 | 14 |

Together: 9,565,658 bytes (about 9.12 MiB), plus database/index/version/backup overhead. Both meet the existing 8 MiB upload limit. A monolithic BLOB requires max_allowed_packet above the larger file plus protocol overhead. MariaDB documents a default 16 MiB server limit, but the actual hosted value is unknown and must be read, not assumed or changed. [MariaDB packet limit](https://mariadb.com/docs/server/server-management/variables-and-modes/server-system-variables#max_allowed_packet), [BLOB reference](https://mariadb.com/docs/server/reference/data-types/string-data-types/longblob).

Recommended bounded representation: a private edition metadata table and a private binary chunk table, with chunks no larger than 512 KiB. The chunk size must be checked against the actual packet limit with adequate protocol headroom. Send binary prepared values, not base64 or hex SQL. Do not SELECT/CONCAT the whole asset in one database packet; read ordered bounded chunks and reassemble in capped Node memory (largest approved asset about 6.54 MiB per read). Limit simultaneous upload/download verification and account for the existing five-connection pool. Verify per-chunk hashes, exact count, byte total, PDF header and the catalog's whole-file SHA-256 before making an edition active. Use an atomic transaction/version switch; failure cannot expose a partial edition. Temporary orphan chunks need explicit cleanup/retention handling.

Access: extend the existing authenticated admin/origin/CSRF/size/type/hash-checked upload; require the owner for initialization. Keep payment/refund/expiry/download-capability checks on every public download. No public asset route, catalog BLOB, browser database credential, Git PDF or unauthenticated storage endpoint. Startup remains read-only. Add only explicitly owned tables/markers and include them in the dedicated inventory guard without weakening foreign-table rejection. The database and its backups contain paid content and need existing private access controls; at-rest encryption must not be claimed without hosting evidence.

Persistence: database rows are independent of versioned web build folders and would survive app-only Git deployments while the existing database is retained. The host's actual database quota, packet size, privileges and backup schedule/retention/restore procedure must be checked. A redeploy alone does not prove backup recovery. Private database backups/exports must include metadata and all chunks consistently, be access restricted and have verified restore/hash checks. Keeping an additional approved edition temporarily increases storage requirements. [Hostinger deployment structure](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/) confirms build/public output can be overwritten; this design avoids dependence on those directories.

Activation remains contingent on actual storage/restore verification, SMTP delivery and the reviewed Nomod contract. This option does not authorize delayed fulfilment, enable payments, or change existing database identity/credentials.
