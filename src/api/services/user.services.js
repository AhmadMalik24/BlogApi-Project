import { User } from "../../database/models/index.js";


const UpdateUserDetails = async (userId, updateData) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    // Update only the fields that are provided in updateData
    Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined) {
            user[key] = updateData[key];
        }
    });

    await user.save();
    return user;
};

const GetUserDetails = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }
    return user;
};

const SaveStripeOnboardingProfile = async (userId, profile) => {
    const [month, day, year] = profile.dateOfBirth.split('/').map(Number);
    const dateOfBirth = new Date(Date.UTC(year, month - 1, day));
    if (Number.isNaN(dateOfBirth.getTime()) || dateOfBirth.getUTCMonth() !== month - 1 || dateOfBirth.getUTCDate() !== day) {
        throw new Error('dateOfBirth must be a real date in MM/DD/YYYY format');
    }

    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    user.stripeOnboardingProfile = {
        ...profile,
        email: profile.email.toLowerCase(),
        homeAddress: { ...profile.homeAddress, country: 'AU' },
        dateOfBirth
    };
    await user.save();
    return user.stripeOnboardingProfile;
};

export { UpdateUserDetails, GetUserDetails, SaveStripeOnboardingProfile };
