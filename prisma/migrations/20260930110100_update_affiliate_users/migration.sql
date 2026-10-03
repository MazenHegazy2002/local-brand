-- Update all users who have an active affiliate profile to have AFFILIATE role
UPDATE "User"
SET "role" = 'AFFILIATE'
WHERE "id" IN (
    SELECT "userId" FROM "Affiliate" WHERE "status" = 'ACTIVE'
);
