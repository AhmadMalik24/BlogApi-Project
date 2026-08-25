import catchAsync from "../../utils/catchAsync.js";

import {UpdateUserDetails,GetUserDetails} from "../services/user.services.js";
const getUserDetails = catchAsync(async (req, res) => {
    //const user = req.;// Assuming the user is attached to the request object after authentication
    console.log("User ID:", req.user.id); // Log the user ID to verify it's being passed correctly
    const userDetails = await GetUserDetails(req.user.id);
    res.status(200).json({ message: 'User details fetched successfully', userDetails });
});

const updateUserDetails = catchAsync(async (req, res) => {
    console.log("User ID:", req.user.id); // Log the user ID to verify it's being passed correctly
    const user = req.user.id; // Assuming the user is attached to the request object after authentication
    const updateData = req.body; // The data to update, sent in the request body
    const updatedUser = await UpdateUserDetails(req.user.id, updateData);
    res.status(200).json({ message: 'User details updated successfully', user: updatedUser });
});

export { getUserDetails, updateUserDetails };
