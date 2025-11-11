#!/bin/bash

# Script to fix pet ID conflicts in pet.service.test.ts
# This script adds unique prefixes to pet IDs in each describe block

FILE="src/__tests__/services/pet.service.test.ts"

# Backup
cp "$FILE" "$FILE.backup2"

# Fix searchPets block pet IDs (lines ~77-222)
sed -i "/describe('searchPets'/,/^  });$/s/pet_id: 'pet1'/pet_id: uniqueId('search-pet1')/g" "$FILE"
sed -i "/describe('searchPets'/,/^  });$/s/pet_id: 'pet2'/pet_id: uniqueId('search-pet2')/g" "$FILE"
sed -i "/describe('searchPets'/,/^  });$/s/pet_id: \`pet\${i}\`/pet_id: uniqueId(\`search-pet\${i}\`)/g" "$FILE"
sed -i "/describe('searchPets'/,/^  });$/s/where: { pet_id: 'pet1' }/where: { pet_id: pet1Id }/g" "$FILE"
sed -i "/describe('searchPets'/,/^  });$/s/where: { pet_id: 'pet2' }/where: { pet_id: pet2Id }/g" "$FILE"

echo "Pet service test IDs fixed"
