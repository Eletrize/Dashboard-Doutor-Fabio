# Supabase SQL Organization

This folder centralizes all Supabase SQL scripts used by the dashboard.

## Structure

- `migrations/`: core schema and policy scripts
- `scripts/`: one-off operational scripts (user setup, patches, targeted updates)

## Files

### migrations

- `SUPABASE_ACCESS_CONTROL.sql`: creates and seeds access control tables
- `SUPABASE_SCENES.sql`: creates scenes table and related policies/indexes

### scripts

- `SUPABASE_CREATE_USER_FABIO5SNEW.sql`: creates/updates Fabio profile and access rows
- `SUPABASE_ENABLE_SCENES_FABIO5SNEW.sql`: enables scene creation permissions for Fabio
- `SUPABASE_UPDATE_ROKU_VARANDA_ID.sql`: updates Roku Varanda device ID to `12675`

## Usage

Run migration scripts first, then run scripts in `scripts/` only when needed.
