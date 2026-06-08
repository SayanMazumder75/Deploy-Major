import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";

const login = async (email, password) => {
    try {
        const response = await axiosInstance.post(API_PATHS.AUTH.LOGIN, {
            email,
            password,
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "An unknown error occurred" };
    }
};

const register = async (username, email, password) => {
    try {
        const response = await axiosInstance.post(API_PATHS.AUTH.REGISTER, {
            username,
            email,
            password,
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "An unknown error occurred" };
    }
};

const getProfile = async () => {
    try {
        const response = await axiosInstance.get(API_PATHS.AUTH.GET_PROFILE);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "An unknown error occurred" };
    }
};

const updateProfile = async (userData) => {
    try {
        const response = await axiosInstance.put(
            API_PATHS.AUTH.UPDATE_PROFILE,
            userData
        );
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "An unknown error occurred" };
    }
};

const changePassword = async (passwords) => {
    try {
        const response = await axiosInstance.post(
            API_PATHS.AUTH.CHANGE_PASSWORD,
            passwords
        );
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "An unknown error occurred" };
    }
};

const updateEmail = async (email) => {
    try {
        const response = await axiosInstance.put(
            API_PATHS.AUTH.UPDATE_PROFILE,
            { email }
        );
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "An unknown error occurred" };
    }
};

const uploadAvatar = async (base64Image) => {
    try {
        const response = await axiosInstance.put(
            API_PATHS.AUTH.UPDATE_PROFILE,
            {
                profileImage: base64Image,
            }
        );
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "An unknown error occurred" };
    }
};

const sendEmailOTP = async (newEmail) => {
    try {
        const response = await axiosInstance.post(
            API_PATHS.AUTH.SEND_EMAIL_OTP,
            { newEmail }
        );
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "An unknown error occurred" };
    }
};

const verifyEmailOTP = async (otp) => {
    try {
        const response = await axiosInstance.post(
            API_PATHS.AUTH.VERIFY_EMAIL_OTP,
            { otp }
        );
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "An unknown error occurred" };
    }
};

const authService = {
    login,
    register,
    getProfile,
    updateProfile,
    changePassword,
    updateEmail,
    uploadAvatar,
    sendEmailOTP,
    verifyEmailOTP,
};

export default authService;