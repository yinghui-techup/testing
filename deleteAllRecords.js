const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAllRecords() {
    try {
        await prisma.jobApplication.deleteMany({});
        console.log('All records deleted successfully.');
    } catch (error) {
        console.error('Error deleting records:', error);
    } finally {
        await prisma.$disconnect();
    }
}

deleteAllRecords();
