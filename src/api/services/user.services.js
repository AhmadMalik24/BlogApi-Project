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

export { UpdateUserDetails, GetUserDetails };
