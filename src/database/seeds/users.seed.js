import User from '../models/User.model.js';

const defaultUsers = [
  {
    username: 'user1',
    email: 'user1@example.com',
    password: 'password123',
    firstName: 'Ahmad',
    lastName: 'Malik',
    bio: 'Software developer and technology writer.',
    role: 'author',
    isActive: true,
  },

  {
    username: 'user2',
    email: 'user2@example.com',
    password: 'password123',
    firstName: 'Sara',
    lastName: 'Khan',
    bio: 'Travel and lifestyle writer.',
    role: 'author',
    isActive: true,
  },

  {
    username: 'user3',
    email: 'user3@example.com',
    password: 'password123',
    firstName: 'Ali',
    lastName: 'Ahmed',
    bio: 'Blog platform administrator.',
    role: 'admin',
    isActive: true
  }
];

const seedUsers = async () => {
  let inserted = 0;
  let skipped = 0;

  for (const userData of defaultUsers) {
    const existingUser = await User.findOne({
      $or: [
        { username: userData.username },
        { email: userData.email }
      ]
    });

    if (existingUser) {
      skipped += 1;
      continue;
    }

    await User.create(userData);
    inserted += 1;
  }

  return { inserted, skipped };
};

export default seedUsers;