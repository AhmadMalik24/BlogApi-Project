import connectDB from "../database/connection/mongodb.js";

import seedCategories from "../database/seeds/category.seed.js";
import seedUsers from "../database/seeds/users.seed.js";
import seedPosts from "../database/seeds/posts.seed.js";

const runSeed = async () => {
  try {
    await connectDB();

    const categories = await seedCategories();
    console.log(
      `Categories → Inserted: ${categories.inserted}, Skipped: ${categories.skipped}`
    );

    const users = await seedUsers();
    console.log(
      `Users → Inserted: ${users.inserted}, Skipped: ${users.skipped}`
    );

    const posts = await seedPosts();
    console.log(
      `Posts → Inserted: ${posts.inserted}, Skipped: ${posts.skipped}`
    );

    console.log("Seeding completed successfully.");

    process.exit(0);
  } catch (error) {
    console.error("Error during seeding:", error);
    process.exit(1);
  }
};

runSeed();