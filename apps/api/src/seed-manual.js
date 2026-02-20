
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://AtlasDerslik:2002%2E2002Atlas@atlasderslik.6ziq4aa.mongodb.net/atlas-derslik?retryWrites=true&w=majority&appName=AtlasDerslik';

const users = [
    {
        email: 'admin@atlas.com',
        password: 'Password123!',
        firstName: 'Atlas',
        lastName: 'Admin',
        role: 'ADMIN' // Check your UserRole enum, assuming ADMIN
    },
    {
        email: 'teacher@atlas.com',
        password: 'Password123!',
        firstName: 'Atlas',
        lastName: 'Ogretmen',
        role: 'TEACHER'
    },
    {
        email: 'student@atlas.com',
        password: 'Password123!',
        firstName: 'Atlas',
        lastName: 'Ogrenci',
        role: 'STUDENT',
        grade: 8
    }
];

// Simple Schema definition to avoid importing the whole NestJS context
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    role: { type: String, required: true },
    grade: { type: Number },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        for (const u of users) {
            const salt = await bcrypt.genSalt();
            const hash = await bcrypt.hash(u.password, salt);

            await User.findOneAndUpdate(
                { email: u.email },
                {
                    email: u.email,
                    passwordHash: hash,
                    firstName: u.firstName,
                    lastName: u.lastName,
                    role: u.role,
                    grade: u.grade
                },
                { upsert: true, new: true }
            );
            console.log(`Seeded user: ${u.email}`);
        }

        console.log('Seeding complete.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seed();
