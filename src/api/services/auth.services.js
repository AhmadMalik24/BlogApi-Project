import { User } from "../../database/models/index.js";



const CreateUser = async (UserData) => {
    const { username, email, password, firstName, lastName,role } = UserData;
    const user = new User({
        username,
        email,
        password,
        firstName,
        lastName,
        bio: '',
        role
    });
    await user.save();
    return user;
};

const GetUserByEmail = async (email) => {
    const user = await User.findOne({ email }).select('+password');
    return user;
};

export { CreateUser, GetUserByEmail };