# Seeding Quick Reference

## One-Liners

```bash
# Default seed
npm run seed

# Development preset
npm run seed:dev

# Testing preset (minimal data)
npm run seed:test

# Large dataset
npm run seed:large

# Custom configuration
ts-node backend/seeds/index.ts --owners 10 --vets 5 --pets 3 --records 4 --appointments 3 --medications 2
```

## Setup

```bash
# 1. Ensure database is running
# 2. Run migrations
npm run migrate

# 3. Seed data
npm run seed:dev

# 4. Verify
npm test -- backend/seeds/__tests__/seedData.test.ts
```

## Configuration Flags

| Flag | Default | Example |
|------|---------|---------|
| `--owners` | 5 | `--owners 10` |
| `--vets` | 3 | `--vets 5` |
| `--pets` | 2 | `--pets 3` |
| `--records` | 3 | `--records 5` |
| `--appointments` | 2 | `--appointments 4` |
| `--medications` | 1 | `--medications 2` |

## Presets

| Preset | Command | Records |
|--------|---------|---------|
| Default | `npm run seed` | ~70 |
| Dev | `npm run seed:dev` | ~70 |
| Test | `npm run seed:test` | ~8 |
| Large | `npm run seed:large` | ~670 |

## Data Generated

```
Users:        5 owners + 3 vets = 8 total
Pets:         5 owners × 2 pets = 10 total
Records:      10 pets × 3 records = 30 total
Appointments: 10 pets × 2 appointments = 20 total
Medications:  10 pets × 1 medication = 10 total
```

## Verify Data

```bash
# Check database
psql petchain -c "SELECT COUNT(*) FROM users;"

# Run tests
npm test -- backend/seeds/__tests__/seedData.test.ts

# Query via API
curl http://localhost:3000/api/health
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No DATABASE_URL | `export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/petchain"` |
| Migrations not applied | `npm run migrate` |
| Duplicate email | Clear data: `npm run seed:dev` |
| Connection refused | Start PostgreSQL: `brew services start postgresql` |

## Files

| File | Purpose |
|------|---------|
| `seedData.ts` | Core seeding logic |
| `index.ts` | CLI entry point |
| `README.md` | Detailed documentation |
| `__tests__/seedData.test.ts` | Test suite |

## Programmatic Usage

```typescript
import { seed } from './backend/seeds/seedData';

await seed({
  numOwners: 10,
  numVets: 5,
  petsPerOwner: 3,
  recordsPerPet: 4,
  appointmentsPerPet: 3,
  medicationsPerPet: 2,
});
```

## Performance

- seed:test: 1-2 seconds
- seed:dev: 2-5 seconds
- seed:large: 10-20 seconds

## Data Types

- **Users**: Owners (role: owner), Vets (role: vet)
- **Pets**: Dogs, cats, rabbits, birds
- **Records**: Checkup, vaccination, surgery, treatment, other
- **Appointments**: Routine, vaccination, dental, follow-up
- **Medications**: Common pet medications with dosage/frequency

## Next Steps

1. Run `npm run seed:dev`
2. Start server: `npm run dev`
3. Test endpoints with seeded data
4. Develop features with realistic data

## Documentation

- Full guide: `SEEDING_GUIDE.md`
- Details: `README.md`
- Implementation: `SEEDING_IMPLEMENTATION.md`
