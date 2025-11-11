const fs = require('fs');

const filePath = 'src/__tests__/services/pet.service.test.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Fix getPetById section
content = content.replace(
  /expect\(mockAuditLog\)\.toHaveBeenCalledWith\(\{\s+action: 'VIEW',\s+entity: 'Pet',\s+entityId: 'pet1',/g,
  "expect(mockAuditLog).toHaveBeenCalledWith({\n        action: 'VIEW',\n        entity: 'Pet',\n        entityId: petId,"
);

content = content.replace(/await PetService\.getPetById\('pet1'\)/g, "await PetService.getPetById(petId)");

// Fix updatePet section
content = content.replace(
  /describe\('updatePet', \(\) => \{\s+let testPet: Pet;/,
  "describe('updatePet', () => {\n    let testPet: Pet;\n    let petId: string;"
);

content = content.replace(
  /beforeEach\(async \(\) => \{\s+testPet = await Pet\.create\(\{\s+pet_id: 'pet1',/m,
  "beforeEach(async () => {\n      petId = uniqueId('update-pet');\n      testPet = await Pet.create({\n        pet_id: petId,"
);

content = content.replace(/await PetService\.updatePet\('pet1',/g, "await PetService.updatePet(petId,");
content = content.replace(/entityId: 'pet1',/g, "entityId: petId,");

// Fix updatePetStatus section
content = content.replace(
  /describe\('updatePetStatus', \(\) => \{\s+let testPet: Pet;/,
  "describe('updatePetStatus', () => {\n    let testPet: Pet;\n    let petId: string;"
);

// Add petId initialization in updatePetStatus beforeEach if it exists
const updatePetStatusMatch = content.match(/describe\('updatePetStatus'[\s\S]*?beforeEach\(async \(\) => \{[\s\S]*?pet_id: 'pet1',/);
if (updatePetStatusMatch) {
  content = content.replace(
    /describe\('updatePetStatus'[\s\S]*?beforeEach\(async \(\) => \{/,
    match => match.replace(/beforeEach\(async \(\) => \{/, "beforeEach(async () => {\n      petId = uniqueId('updateStatus-pet');")
  ).replace(/pet_id: 'pet1',/, "pet_id: petId,");
}

content = content.replace(/await PetService\.updatePetStatus\('pet1',/g, "await PetService.updatePetStatus(petId,");

// Fix deletePet section
content = content.replace(
  /describe\('deletePet', \(\) => \{\s+let testPet: Pet;/,
  "describe('deletePet', () => {\n    let testPet: Pet;\n    let petId: string;"
);

// Fix addPetImages section
content = content.replace(
  /describe\('addPetImages', \(\) => \{\s+let testPet: Pet;/,
  "describe('addPetImages', () => {\n    let testPet: Pet;\n    let petId: string;"
);

fs.writeFileSync(filePath, content);
console.log('Fixed remaining IDs');
