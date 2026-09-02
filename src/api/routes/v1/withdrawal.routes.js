import express from 'express';
import { protect } from '../../middleware/auth.js';
import {
    addBankAccount,
    createOnboardingLink,
    getBankAccounts,
    verifyBankAccount,
    deleteBankAccount,
    requestWithdrawal,
    getWithdrawalHistory,
    getWithdrawalDetails
} from '../../controllers/withdrawal.controller.js';
import validate from '../../middleware/validation.js';
import {
    bankAccountValidationSchema,
    verifyBankAccountValidationSchema,
    withdrawalValidationSchema
} from '../../validations/withdrawal.validation.js';

const withdrawalRouter = express.Router();

withdrawalRouter.use(protect);

// ============================================
// BANK ACCOUNT ROUTES
// ============================================

/**
 * @swagger
 * /withdrawal/bank-accounts:
 *   post:
 *     summary: Add a new bank account for withdrawals
 *     tags: [Withdrawals]
 *     description: Add a bank account to the user's Stripe Connect account. Complete Stripe onboarding before withdrawing.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [accountHolderName, accountNumber, routingNumber, accountType]
 *             properties:
 *               accountHolderName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: John Doe
 *               accountNumber:
 *                 type: string
 *                 pattern: '^\d{8,20}$'
 *                 example: "000123456789"
 *               routingNumber:
 *                 type: string
 *                 pattern: '^\d{9}$'
 *                 example: "110000000"
 *               accountType:
 *                 type: string
 *                 enum: [checking, savings]
 *                 example: checking
 *               bankName:
 *                 type: string
 *                 example: Chase Bank
 *     responses:
 *       201:
 *         description: Bank account added successfully
 *       400:
 *         description: Validation error or account already exists
 *       401:
 *         description: Authentication required
 */
withdrawalRouter.post(
    '/bank-accounts',
    validate(bankAccountValidationSchema, 'body'),
    addBankAccount
);

/**
 * @swagger
 * /withdrawal/bank-accounts:
 *   get:
 *     summary: Get all bank accounts for current user
 *     tags: [Withdrawals]
 *     responses:
 *       200:
 *         description: Bank accounts retrieved successfully
 *       401:
 *         description: Authentication required
 */
withdrawalRouter.get('/bank-accounts', getBankAccounts);

/**
 * @swagger
 * /withdrawal/bank-accounts/onboarding:
 *   post:
 *     summary: Create Stripe Connect onboarding link for withdrawals
 *     tags: [Withdrawals]
 *     responses:
 *       200:
 *         description: Onboarding link returned successfully
 *       401:
 *         description: Authentication required
 */
withdrawalRouter.post('/bank-accounts/onboarding', createOnboardingLink);

/**
 * @swagger
 * /withdrawal/bank-accounts/{bankAccountId}:
 *   delete:
 *     summary: Delete a bank account
 *     tags: [Withdrawals]
 *     parameters:
 *       - in: path
 *         name: bankAccountId
 *         required: true
 *         schema:
 *           type: string
 *         description: Bank account ID to delete
 *     responses:
 *       200:
 *         description: Bank account deleted successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Bank account not found
 */
withdrawalRouter.delete('/bank-accounts/:bankAccountId', deleteBankAccount);

/**
 * @swagger
 * /withdrawal/bank-accounts/verify:
 *   post:
 *     summary: Synchronize bank-account verification from Stripe
 *     tags: [Withdrawals]
 *     description: Confirms that the external account is accepted by Stripe Connect after onboarding.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bankAccountId]
 *             properties:
 *               bankAccountId:
 *                 type: string
 *                 example: 607f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Bank account verified successfully
 *       400:
 *         description: Verification failed or invalid amounts
 *       401:
 *         description: Authentication required
 */
withdrawalRouter.post(
    '/bank-accounts/verify',
    validate(verifyBankAccountValidationSchema, 'body'),
    verifyBankAccount
);

// ============================================
// WITHDRAWAL ROUTES
// ============================================

/**
 * @swagger
 * /withdrawal/withdraw:
 *   post:
 *     summary: Request a withdrawal from wallet to bank account
 *     tags: [Withdrawals]
 *     description: Request withdrawal to verified bank account. Money transferred in 1-2 business days.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, bankAccountId]
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 0.53
 *                 maximum: 99999
 *                 example: 50.00
 *               bankAccountId:
 *                 type: string
 *                 example: 607f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Withdrawal requested successfully
 *       400:
 *         description: Insufficient balance or invalid amount
 *       401:
 *         description: Authentication required
 */
withdrawalRouter.post(
    '/withdraw',
    validate(withdrawalValidationSchema, 'body'),
    requestWithdrawal
);

/**
 * @swagger
 * /withdrawal/history:
 *   get:
 *     summary: Get withdrawal history for current user
 *     tags: [Withdrawals]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of withdrawals to retrieve
 *     responses:
 *       200:
 *         description: Withdrawal history retrieved successfully
 *       401:
 *         description: Authentication required
 */
withdrawalRouter.get('/history', getWithdrawalHistory);

/**
 * @swagger
 * /withdrawal/{withdrawalId}:
 *   get:
 *     summary: Get withdrawal details
 *     tags: [Withdrawals]
 *     parameters:
 *       - in: path
 *         name: withdrawalId
 *         required: true
 *         schema:
 *           type: string
 *         description: Withdrawal ID
 *     responses:
 *       200:
 *         description: Withdrawal details retrieved successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Withdrawal not found
 */
withdrawalRouter.get('/:withdrawalId', getWithdrawalDetails);

export default withdrawalRouter;
