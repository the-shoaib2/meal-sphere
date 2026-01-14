const { PrismaClient } = require('@prisma/client');

console.log('Testing PrismaClient with datasources option (Library Engine)...');

const config = {
    datasources: {
        db: {
            url: 'mongodb://localhost:27017/test_override'
        }
    }
};

try {
    console.log('Attempting config:', JSON.stringify(config));
    const prisma = new PrismaClient(config);
    console.log('SUCCESS: Instantiated with datasources option!');

    // Optional: verify it has the config
    // console.log(prisma); 
} catch (e) {
    console.log('FAILED instantiation:');
    console.log(e.message);
}
