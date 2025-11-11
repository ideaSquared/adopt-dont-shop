#!/bin/bash

FILE="src/__tests__/services/pet.service.test.ts"

# Backup
cp "$FILE" "$FILE.before-bulk-fix"

# Fix updatePet describe block
perl -i -pe '
if (/describe\(.updatePet., \(\) => \{/) {
  $in_update = 1;
  s/let testPet: Pet;/let testPet: Pet;\n    let petId: string;/;
}
if ($in_update && /beforeEach\(async \(\) => \{/) {
  $_ .= "      petId = uniqueId('\''update-pet'\'');\n";
}
if ($in_update && /pet_id: .pet1.,/) {
  s/pet_id: .pet1.,/pet_id: petId,/;
}
if ($in_update && /PetService\.updatePet\(.pet1.,/) {
  s/PetService\.updatePet\(.pet1.,/PetService.updatePet(petId,/g;
}
if ($in_update && /entityId: .pet1.,/) {
  s/entityId: .pet1.,/entityId: petId,/g;
}
if ($in_update && /^\s+\}\);$/ && /describe/) {
  $in_update = 0;
}
' "$FILE"

# Fix updatePetStatus describe block
perl -i -0777 -pe '
s/(describe\(.updatePetStatus., \(\) => \{\s+let testPet: Pet;)/\1\n    let petId: string;/;
s/(describe\(.updatePetStatus.[\s\S]*?beforeEach\(async \(\) => \{)/\1\n      petId = uniqueId('\''updateStatus-pet'\'');/;
s/(describe\(.updatePetStatus.[\s\S]{0,1000}?pet_id: ).pet1.,/\1petId,/;
s/(describe\(.updatePetStatus.[\s\S]{0,2000}?PetService\.updatePetStatus\().pet1.,/\1petId,/g;
s/(describe\(.updatePetStatus.[\s\S]{0,2000}?entityId: ).pet1.,/\1petId,/g;
' "$FILE"

# Fix deletePet describe block
perl -i -0777 -pe '
s/(describe\(.deletePet., \(\) => \{\s+let testPet: Pet;)/\1\n    let petId: string;/;
s/(describe\(.deletePet.[\s\S]*?beforeEach\(async \(\) => \{)/\1\n      petId = uniqueId('\''delete-pet'\'');/;
s/(describe\(.deletePet.[\s\S]{0,1000}?pet_id: ).pet1.,/\1petId,/;
s/(describe\(.deletePet.[\s\S]{0,2000}?PetService\.deletePet\().pet1.,/\1petId,/g;
s/(describe\(.deletePet.[\s\S]{0,2000}?entityId: ).pet1.,/\1petId,/g;
s/(describe\(.deletePet.[\s\S]{0,2000}?Pet\.findByPk\().pet1.\)/\1petId)/g;
' "$FILE"

# Fix addPetImages describe block
perl -i -0777 -pe '
s/(describe\(.addPetImages., \(\) => \{\s+let testPet: Pet;)/\1\n    let petId: string;/;
s/(describe\(.addPetImages.[\s\S]*?beforeEach\(async \(\) => \{)/\1\n      petId = uniqueId('\''addImages-pet'\'');/;
s/(describe\(.addPetImages.[\s\S]{0,1000}?pet_id: ).pet1.,/\1petId,/;
s/(describe\(.addPetImages.[\s\S]{0,2000}?PetService\.addPetImages\().pet1.,/\1petId,/g;
' "$FILE"

# Fix getPetsByRescue
perl -i -0777 -pe '
s/(describe\(.getPetsByRescue.[\s\S]*?beforeEach\(async \(\) => \{\s+await Pet\.create\(\{\s+pet_id: ).pet1.,/\1uniqueId('\''byRescue-pet1'\''),/;
s/(describe\(.getPetsByRescue.[\s\S]{0,500}?await Pet\.create\(\{\s+pet_id: ).pet2.,/\1uniqueId('\''byRescue-pet2'\''),/;
' "$FILE"

# Fix getFeaturedPets
perl -i -0777 -pe '
s/(describe\(.getFeaturedPets.[\s\S]*?await Pet\.create\(\{\s+pet_id: ).pet1.,/\1uniqueId('\''featured-pet1'\''),/;
s/(describe\(.getFeaturedPets.[\s\S]{0,800}?await Pet\.create\(\{\s+pet_id: ).pet2.,/\1uniqueId('\''featured-pet2'\''),/;
' "$FILE"

# Fix getPetStatistics
perl -i -0777 -pe '
s/(describe\(.getPetStatistics.[\s\S]*?Pet\.bulkCreate\(\[\s+\{\s+pet_id: ).pet1.,/\1uniqueId('\''stats-pet1'\''),/;
s/(describe\(.getPetStatistics.[\s\S]{0,1000}?\{\s+pet_id: ).pet2.,/\1uniqueId('\''stats-pet2'\''),/;
s/(describe\(.getPetStatistics.[\s\S]{0,1500}?\{\s+pet_id: ).pet3.,/\1uniqueId('\''stats-pet3'\''),/;
' "$FILE"

# Fix bulkUpdatePets
perl -i -0777 -pe '
s/(describe\(.bulkUpdatePets., \(\) => \{\s+let pet1: Pet;\s+let pet2: Pet;)/\1\n    let pet1Id: string;\n    let pet2Id: string;/;
s/(describe\(.bulkUpdatePets.[\s\S]*?beforeEach\(async \(\) => \{)/\1\n      pet1Id = uniqueId('\''bulk-pet1'\'');\n      pet2Id = uniqueId('\''bulk-pet2'\'');/;
s/(describe\(.bulkUpdatePets.[\s\S]{0,1000}?pet1 = await Pet\.create\(\{\s+pet_id: ).pet1.,/\1pet1Id,/;
s/(describe\(.bulkUpdatePets.[\s\S]{0,1500}?pet2 = await Pet\.create\(\{\s+pet_id: ).pet2.,/\1pet2Id,/;
s/(describe\(.bulkUpdatePets.[\s\S]{0,2500}?petIds: \[).pet1., .pet2.\]/\1pet1Id, pet2Id]/g;
s/(describe\(.bulkUpdatePets.[\s\S]{0,2500}?petIds: \[).pet1., .nonexistent.\]/\1pet1Id, '\''nonexistent'\'']/g;
s/(describe\(.bulkUpdatePets.[\s\S]{0,2500}?petIds: \[).pet1.\]/\1pet1Id]/g;
' "$FILE"

# Fix getPetActivity
perl -i -0777 -pe '
s/(describe\(.getPetActivity., \(\) => \{\s+let testPet: Pet;)/\1\n    let petId: string;/;
s/(describe\(.getPetActivity.[\s\S]*?beforeEach\(async \(\) => \{[\s\S]*?testPet = await Pet\.create\(\{)/\1\n        petId = uniqueId('\''activity-pet'\'');/;
s/(describe\(.getPetActivity.[\s\S]{0,1500}?testPet = await Pet\.create\(\{\s+pet_id: ).pet1.,/\1petId,/;
s/(describe\(.getPetActivity.[\s\S]{0,2000}?PetService\.getPetActivity\().pet1.\)/\1petId)/g;
s/(describe\(.getPetActivity.[\s\S]{0,2000}?petId: ).pet1.,/\1petId,/g;
' "$FILE"

# Fix getRecentPets
perl -i -0777 -pe '
s/(describe\(.getRecentPets.[\s\S]*?Pet\.bulkCreate\(\[\s+\{\s+pet_id: ).pet1.,/\1uniqueId('\''recent-pet1'\''),/;
s/(describe\(.getRecentPets.[\s\S]{0,1000}?\{\s+pet_id: ).pet2.,/\1uniqueId('\''recent-pet2'\''),/;
' "$FILE"

# Fix getPetBreedsByType
perl -i -0777 -pe '
s/(describe\(.getPetBreedsByType.[\s\S]*?Pet\.bulkCreate\(\[\s+\{\s+pet_id: ).pet1.,/\1uniqueId('\''breeds-pet1'\''),/;
s/(describe\(.getPetBreedsByType.[\s\S]{0,800}?\{\s+pet_id: ).pet2.,/\1uniqueId('\''breeds-pet2'\''),/;
s/(describe\(.getPetBreedsByType.[\s\S]{0,1200}?\{\s+pet_id: ).pet3.,/\1uniqueId('\''breeds-pet3'\''),/;
s/(describe\(.getPetBreedsByType.[\s\S]{0,2000}?await Pet\.bulkCreate\(\[\s+\{\s+pet_id: ).pet4.,/\1uniqueId('\''breeds-pet4'\''),/;
s/(describe\(.getPetBreedsByType.[\s\S]{0,2500}?\{\s+pet_id: ).pet5.,/\1uniqueId('\''breeds-pet5'\''),/;
s/(describe\(.getPetBreedsByType.[\s\S]{0,3000}?\{\s+pet_id: ).pet6.,/\1uniqueId('\''breeds-pet6'\''),/;
' "$FILE"

# Fix getSimilarPets
perl -i -0777 -pe '
s/(describe\(.getSimilarPets., \(\) => \{\s+let referencePet: Pet;)/\1\n    let refPetId: string;/;
s/(describe\(.getSimilarPets.[\s\S]*?beforeEach\(async \(\) => \{)/\1\n      refPetId = uniqueId('\''similar-ref'\'');/;
s/(describe\(.getSimilarPets.[\s\S]{0,1000}?referencePet = await Pet\.create\(\{\s+pet_id: ).ref-pet-1.,/\1refPetId,/;
s/(describe\(.getSimilarPets.[\s\S]{0,2500}?Pet\.bulkCreate\(\[\s+\{\s+pet_id: ).similar-1.,/\1uniqueId('\''similar-1'\''),/;
s/(describe\(.getSimilarPets.[\s\S]{0,3000}?\{\s+pet_id: ).similar-2.,/\1uniqueId('\''similar-2'\''),/;
s/(describe\(.getSimilarPets.[\s\S]{0,4000}?PetService\.getSimilarPets\().ref-pet-1.\)/\1refPetId)/g;
s/(describe\(.getSimilarPets.[\s\S]{0,5000}?pet\.pet_id !== ).ref-pet-1.\)/\1refPetId)/g;
s/(describe\(.getSimilarPets.[\s\S]{0,5500}?Pet\.findByPk = vi\.fn\(\)\.mockResolvedValue\(referencePet\);[\s\S]*?PetService\.getSimilarPets\().ref-pet-1.\)/\1refPetId)/;
' "$FILE"

# Fix reportPet
perl -i -0777 -pe '
s/(describe\(.reportPet., \(\) => \{\s+let testPet: Pet;)/\1\n    let petId: string;/;
s/(describe\(.reportPet.[\s\S]*?beforeEach\(async \(\) => \{)/\1\n      petId = uniqueId('\''report-pet'\'');/;
s/(describe\(.reportPet.[\s\S]{0,1000}?testPet = await Pet\.create\(\{\s+pet_id: ).pet-123.,/\1petId,/;
s/(describe\(.reportPet.[\s\S]{0,3000}?reportedEntityId: ).pet-123.,/\1petId,/g;
s/(describe\(.reportPet.[\s\S]{0,3000}?PetService\.reportPet\().pet-123.,/\1petId,/g;
' "$FILE"

# Remove Report mock usage and fix tests
perl -i -0777 -pe '
s/const \{ default: Report \} = await vi\.importMock\(.\.\.\/\.\.\/models\/Report.\);[\s\S]*?\(Report\.create as vi\.Mock\)\.mockResolvedValue\(mockReport\);/\/\/ Report model is now used directly (no mock)/g;
s/const \{ default: Report \} = await vi\.importMock\(.\.\.\/\.\.\/models\/Report.\);[\s\S]*?\(Report\.create as vi\.Mock\)\.mockRejectedValue/\/\/ Report model is now used directly (no mock)\n      const originalCreate = Report.create;\n      Report.create = vi.fn().mockRejectedValue/g;
' "$FILE"

echo "All pet IDs fixed!"
