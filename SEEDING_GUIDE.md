# PetChain Database Seeding Guide

Complete guide for setting up and using the PetChain test data seeding system.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Setup](#setup)
3. [Running Seeds](#running-seeds)
4. [Configuration](#configuration)
5. [Verification](#verification)
6. [Troubleshooting](#troubleshooting)
7. [Development Workflow](#development-workflow)

## Quick Start

```bash
# 1. Ensure database is running
# (PostgreSQL on localhost:5432 or set DATABASE_URL)

# 2. Run migrations
npm run migrate

# 3. Seed with default data
npm run seed:dev

# 4. Verify data was created
npm test -- backend/seeds/__tests__/seedData.test.ts
```

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Environment Configuration

Create or update `.env` file:

```bash
# Database connection
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/petchain

# Optional: Override defaults
NODE_ENV=development
APP_ENV=development
```

### Database Initialization

```bash
# 1. Create database (if not exists)
createdb petchain

# 2. Run all migrations
npm run migrate

# 3. Verify schema
psql petchain -c "\dt"
```

## Running Seeds

### Using npm Scripts

```bash
# Default configuration (5 owners, 3 vets, 2 pets each, etc.)
npm run seed

# Development preset (same as default)
npm run seed:dev

# Testing preset (minimal data)
npm run seed:test

# Large dataset (20 owners, 10 vets, 3 pets each, etc.)
npm run seed:large
```

### Using ts-node Directly

```bash
# Default configuration
ts-node backend/seeds/index.ts

# Custom configuration
ts-node backend/seeds/index.ts --owners 10 --vets 5 --pets 3 --records 4 --appointments 3 --medications 2
```

### Programmatic Usage

```typescript
import { seed } from './backend/seeds/seedData';

// In your setup file or test
await seed({
  numOwners: 10,
  numVets: 5,
  petsPerOwner: 3,
  recordsPerPet: 4,
  appointmentsPerPet: 3,
  medicationsPerPet: 2,
});
```

## Configuration

### Available Options

| Option | CLI Flag | Default | Range | Description |
|--------|----------|---------|-------|-------------|
| Owners | `--owners` | 5 | 1-100 | Pet owner users |
| Vets | `--vets` | 3 | 1-50 | Veterinarian users |
| Pets per Owner | `--pets` | 2 | 1-10 | Pets per owner |
| Records per Pet | `--records` | 3 | 1-20 | Medical records per pet |
| Appointments per Pet | `--appointments` | 2 | 1-10 | Appointments per pet |
| Medications per Pet | `--medications` | 1 | 1-5 | Medications per pet |

### Preset Configurations

#### Development (Default)
```bash
npm run seed:dev
# Creates: 5 owners, 3 vets, 10 pets, 30 records, 20 appointments, 10 medications
```

#### Testing
```bash
npm run seed:test
# Creates: 2 owners, 1 vet, 2 pets, 2 records, 2 appointments, 2 medications
```

#### Large Dataset
```bash
npm run seed:large
# Creates: 20 owners, 10 vets, 60 pets, 300 records, 180 appointments, 120 medications
```

#### Custom
```bash
ts-node backend/seeds/index.ts --owners 15 --vets 8 --pets 4 --records 6 --appointments 4 --medications 3
```

## Verification

### Check Data in Database

```bash
# Connect to database
psql petchain

# Count records
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM pets;
SELECT COUNT(*) FROM medical_records;
SELECT COUNT(*) FROM appointments;
SELECT COUNT(*) FROM medications;

# View sample data
SELECT id, email, name, role FROM users LIMIT 5;
SELECT id, name, species, breed FROM pets LIMIT 5;
```

### Run Test Suite

```bash
# Run all seed tests
npm test -- backend/seeds/__tests__/seedData.test.ts

# Run with verbose output
npm test -- backend/seeds/__tests__/seedData.test.ts --verbose

# Run with coverage
npm test -- --coverage backend/seeds/__tests__/seedData.test.ts
```

### Test API Endpoints

```bash
# Start the backend server
npm run dev

# In another terminal, test endpoints
curl http://localhost:3000/api/health

# Get all users (requires auth)
curl -H "Authorization: Bearer mock-{user-id}" http://localhost:3000/api/users

# Get pets for an owner
curl -H "Authorization: Bearer mock-{owner-id}" http://localhost:3000/api/pets?ownerId={owner-id}
```

## Troubleshooting

### Issue: "No DATABASE_URL provided"

**Solution:**
```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/petchain"
npm run seed
```

### Issue: "Migrations not applied"

**Solution:**
```bash
npm run migrate
npm run seed
```

### Issue: "Duplicate email error"

**Cause:** Running seed multiple times creates duplicate emails.

**Solution:**
```bash
# Clear all data
psql petchain -c "
  DELETE FROM medications;
  DELETE FROM appointments;
  DELETE FROM medical_records;
  DELETE FROM pets;
  DELETE FROM users;
"

# Re-seed
npm run seed
```

### Issue: "Foreign key constraint violation"

**Cause:** Schema not properly initialized.

**Solution:**
```bash
# Drop and recreate database
dropdb petchain
createdb petchain
npm run migrate
npm run seed
```

### Issue: "Connection refused"

**Cause:** PostgreSQL not running.

**Solution:**
```bash
# Start PostgreSQL (macOS with Homebrew)
brew services start postgresql

# Or with Docker
docker run -d \
  --name petchain-db \
  -e POSTGRES_DB=petchain \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:15
```

### Issue: "Timeout waiting for database"

**Cause:** Database connection pool exhausted.

**Solution:**
```bash
# Increase pool size in config
export DB_POOL_SIZE=50

# Or reduce concurrent operations
npm run seed:test
```

## Development Workflow

### Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/DogStark/PetChain-MobileApp.git
cd PetChain-MobileApp

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env with your database URL

# 4. Initialize database
npm run migrate

# 5. Seed with test data
npm run seed:dev

# 6. Start backend server
npm run dev

# 7. In another terminal, start mobile app
npm start
```

### Testing Workflow

```bash
# 1. Seed minimal test data
npm run seed:test

# 2. Run tests
npm test

# 3. Run specific test file
npm test -- backend/seeds/__tests__/seedData.test.ts

# 4. Run with coverage
npm test -- --coverage
```

### API Development Workflow

```bash
# 1. Seed development data
npm run seed:dev

# 2. Start server
npm run dev

# 3. Test endpoints with curl or Postman
curl http://localhost:3000/api/health

# 4. Make changes to code
# (Server auto-reloads)

# 5. Re-seed if needed
npm run seed:dev
```

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: petchain
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm install
      - run: npm run migrate
      - run: npm run seed:test
      - run: npm test
```

## Performance Considerations

### Seed Execution Time

| Configuration | Records | Time |
|---------------|---------|------|
| seed:test | ~8 | 1-2s |
| seed:dev | ~70 | 2-5s |
| seed:large | ~670 | 10-20s |

### Optimization Tips

1. **Batch Operations**: Seed uses individual inserts; consider batch inserts for large datasets
2. **Connection Pooling**: Adjust `DB_POOL_SIZE` for concurrent operations
3. **Indexes**: Ensure all indexes are created before seeding
4. **Cleanup**: Clear old data before re-seeding to avoid constraint violations

### Memory Usage

- Default seed: ~50MB
- Large seed: ~200MB
- Monitor with: `node --max-old-space-size=4096 backend/seeds/index.ts`

## Data Relationships

The seeding system maintains proper referential integrity:

```
Users (owners + vets)
  ├── Pets (owned by users)
  │   ├── Medical Records (vet_id references users)
  │   ├── Appointments (vet_id references users)
  │   └── Medications
  └── Audit Logs (actor_id references users)
```

## Acceptance Criteria Verification

✅ **Seed runs correctly**
```bash
npm run seed:dev
# Output shows successful creation of all data types
```

✅ **Data is usable**
```bash
npm test -- backend/seeds/__tests__/seedData.test.ts
# All tests pass, verifying data integrity and relationships
```

✅ **Flexible configuration**
```bash
# Default works
npm run seed

# Custom works
ts-node backend/seeds/index.ts --owners 20 --vets 10

# Programmatic works
import { seed } from './backend/seeds/seedData';
await seed({ numOwners: 10 });
```

## Next Steps

1. **Explore Data**: Query the database to understand the schema
2. **Test APIs**: Use the seeded data to test API endpoints
3. **Develop Features**: Build features with realistic test data
4. **Extend Seeding**: Add more data types as needed
5. **Automate**: Integrate seeding into CI/CD pipeline

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review [backend/seeds/README.md](backend/seeds/README.md)
3. Check test file: [backend/seeds/__tests__/seedData.test.ts](backend/seeds/__tests__/seedData.test.ts)
4. Open an issue on GitHub

## References

- [Database Schema](ARCHITECTURE.md#data-model-relationships)
- [API Documentation](backend/server/routes/)
- [Migration System](backend/src/db/migrate.ts)
- [Models](backend/models/)
