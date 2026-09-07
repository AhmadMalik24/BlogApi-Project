import catchAsync from '../../utils/catchAsync.js';
import {
    AddBankAccount,
    CreateConnectOnboardingLink,
    GetBankAccounts,
    DeleteBankAccount,
    RequestWithdrawal,
    GetWithdrawalHistory,
    GetWithdrawalDetails
} from '../services/withdrawal.services.js';

// ============================================
// BANK ACCOUNT CONTROLLERS
// ============================================

const addBankAccount = catchAsync(async (req, res) => {
    // 1. Extract the new secure token instead of raw account details
    const { bankTokenId } = req.body;

    if (!req.user || !req.user.id) {
        const error = new Error('Authentication required');
        error.statusCode = 401;
        throw error;
    }

    // 2. Pass the token to the service
    const result = await AddBankAccount(req.user.id, {
        bankTokenId
    });

    res.status(201).json({
        success: true,
        message: result.message,
        data: result,
        timestamp: new Date().toISOString()
    });
});

const createOnboardingLink = catchAsync(async (req, res) => {
    if (!req.user || !req.user.id) {
        const error = new Error('Authentication required');
        error.statusCode = 401;
        throw error;
    }

    const result = await CreateConnectOnboardingLink(req.user.id);

    res.status(200).json({
        success: true,
        message: result.message,
        data: result,
        timestamp: new Date().toISOString()
    });
});

const getBankAccounts = catchAsync(async (req, res) => {
    if (!req.user || !req.user.id) {
        const error = new Error('Authentication required');
        error.statusCode = 401;
        throw error;
    }

    const bankAccounts = await GetBankAccounts(req.user.id);

    res.status(200).json({
        success: true,
        message: `Found ${bankAccounts.length} bank account(s)`,
        data: bankAccounts,
        timestamp: new Date().toISOString()
    });
});


const deleteBankAccount = catchAsync(async (req, res) => {
    const { bankAccountId } = req.params;

    if (!req.user || !req.user.id) {
        const error = new Error('Authentication required');
        error.statusCode = 401;
        throw error;
    }

    const result = await DeleteBankAccount(req.user.id, bankAccountId);

    res.status(200).json({
        success: result.success,
        message: result.message,
        timestamp: new Date().toISOString()
    });
});

// ============================================
// WITHDRAWAL CONTROLLERS
// ============================================

const requestWithdrawal = catchAsync(async (req, res) => {
    const { amount, bankAccountId } = req.body;

    if (!req.user || !req.user.id) {
        const error = new Error('Authentication required');
        error.statusCode = 401;
        throw error;
    }

    const result = await RequestWithdrawal(req.user.id, amount, bankAccountId, req.get('Idempotency-Key'));

    res.status(200).json({
        success: result.success,
        message: result.message,
        data: result,
        timestamp: new Date().toISOString()
    });
});

const getWithdrawalHistory = catchAsync(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;

    if (!req.user || !req.user.id) {
        const error = new Error('Authentication required');
        error.statusCode = 401;
        throw error;
    }

    const withdrawals = await GetWithdrawalHistory(req.user.id, limit);

    res.status(200).json({
        success: true,
        message: `Retrieved ${withdrawals.length} withdrawal(s)`,
        data: withdrawals,
        timestamp: new Date().toISOString()
    });
});

const getWithdrawalDetails = catchAsync(async (req, res) => {
    const { withdrawalId } = req.params;

    if (!req.user || !req.user.id) {
        const error = new Error('Authentication required');
        error.statusCode = 401;
        throw error;
    }

    const withdrawal = await GetWithdrawalDetails(req.user.id, withdrawalId);

    res.status(200).json({
        success: true,
        message: 'Withdrawal details retrieved',
        data: withdrawal,
        timestamp: new Date().toISOString()
    });
});

export {
    addBankAccount,
    createOnboardingLink,
    getBankAccounts,
    deleteBankAccount,
    requestWithdrawal,
    getWithdrawalHistory,
    getWithdrawalDetails
};
