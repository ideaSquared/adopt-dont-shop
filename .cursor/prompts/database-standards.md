# Database Requirements (PostgreSQL 15+ with Sequelize 7+)

- ✅ Use **Sequelize ORM (v7+)** with full TypeScript typing (`sequelize-typescript` or raw Sequelize with manual typings)
- ✅ Prefer **explicit model definitions** with strict TypeScript types
- ✅ Leverage PostgreSQL features including:
  - JSONB columns for flexible structured data
  - Generated columns (`GENERATED ALWAYS AS (...) STORED`)
  - `STRICT` mode via Sequelize model validations and database constraints
  - Foreign key constraints to enforce relational integrity
  - `CHECK` constraints for domain rules
  - `UNIQUE` constraints for natural keys (e.g., emails)
  - `NOT NULL` constraints for required fields
  - Indexed columns for performance on filtering/sorting
- ✅ Use Sequelize migrations (`sequelize-cli` or custom scripts via Umzug) in production. IF in development make the edits directly to the schema and update the seeders.
- ✅ Use **transactional writes** for any multi-step create/update/delete operations:

  ```ts
  await sequelize.transaction(async t => {
    await User.create(data, { transaction: t });
    await Profile.create(profileData, { transaction: t });
  });
  ```

- ✅ Always define associations explicitly with `onDelete` and `onUpdate` rules (`CASCADE`, `SET NULL`, etc.)
- ✅ Prefer UUIDs (`DataTypes.UUID`) over incremental IDs for distributed safety
- ✅ Use timestamps (`createdAt`, `updatedAt`) consistently and automatically
- ✅ Enable and test **foreign key constraints** (ensure `REFERENCES` and `ON DELETE`/`ON UPDATE` are honored)
- ✅ Validate schema with runtime checks using Zod or class-validator alongside Sequelize's validation layer
- ✅ Run integration tests using in-memory PostgreSQL (e.g., via [pg-mem](https://github.com/oguimbal/pg-mem)) or a Dockerized local Postgres instance
