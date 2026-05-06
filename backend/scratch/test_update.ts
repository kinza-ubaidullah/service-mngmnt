import { prisma } from '../src/utils/prisma.js';

async function main() {
  const userId = 1; // Assuming Admin is 1
  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { 
        name: 'Super Admin Updated',
        location_name: 'Test Location',
        lat: 31.2054,
        lng: 73.9435,
        specialization: 'Everything',
        address: 'Secret Base',
        profile_picture: ''
      }
    });
    console.log('Update Success:', updatedUser.name);
  } catch (error) {
    console.error('Update Failed:', error);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
