import { Transaction } from 'types/Transactions';
import { Debt, CreditorMatchingRule, DebtTransactionMatch, DebtPaymentHistory } from 'types/Budget';

export interface DebtMatchResult {
    debtId: string;
    ruleId: string;
    confidence: number;
    matchedField: string;
    matchedValue: string;
    transaction: Transaction;
}

export interface MatchingConfig {
    autoConfirmThreshold: number; // Matches above this confidence are auto-confirmed
    reviewThreshold: number; // Matches above this but below auto-confirm require review
    enableFuzzyMatching: boolean;
    maxFuzzyDistance: number; // For fuzzy string comparison
}

export class DebtMatchingService {
    private static readonly DEFAULT_CONFIG: MatchingConfig = {
        autoConfirmThreshold: 90,
        reviewThreshold: 70,
        enableFuzzyMatching: true,
        maxFuzzyDistance: 3
    };

    /**
     * Find potential debt payment matches for a transaction
     */
    static findDebtMatches(
        transaction: Transaction,
        debts: Debt[],
        rules: CreditorMatchingRule[],
        config: MatchingConfig = this.DEFAULT_CONFIG
    ): DebtMatchResult[] {
        const matches: DebtMatchResult[] = [];

        // Only process outgoing transactions (payments)
        if (transaction.amount >= 0) {
            return matches;
        }

        // Filter to active debts and enabled rules
        const activeDebts = debts.filter(debt => debt.status === 'active');
        const enabledRules = rules.filter(rule => rule.enabled);

        activeDebts.forEach(debt => {
            const debtRules = enabledRules.filter(rule => rule.debtId === debt.id);
            
            debtRules.forEach(rule => {
                const matchResult = this.evaluateRule(transaction, rule, config);
                if (matchResult && matchResult.confidence >= config.reviewThreshold) {
                    matches.push({
                        debtId: debt.id,
                        ruleId: rule.id,
                        confidence: matchResult.confidence,
                        matchedField: matchResult.field,
                        matchedValue: matchResult.value,
                        transaction
                    });
                }
            });
        });

        // Sort by confidence (highest first)
        return matches.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Evaluate a single matching rule against a transaction
     */
    private static evaluateRule(
        transaction: Transaction,
        rule: CreditorMatchingRule,
        config: MatchingConfig
    ): { confidence: number; field: string; value: string } | null {
        const transactionValue = this.extractFieldValue(transaction, rule.field);
        if (!transactionValue) {
            return null;
        }

        let confidence = 0;

        switch (rule.type) {
            case 'exact':
                confidence = this.exactMatch(transactionValue, rule.value);
                break;
            case 'fuzzy':
                if (config.enableFuzzyMatching) {
                    confidence = this.fuzzyMatch(transactionValue, rule.value, config.maxFuzzyDistance);
                }
                break;
            case 'pattern':
                if (rule.pattern) {
                    confidence = this.patternMatch(transactionValue, rule.pattern);
                }
                break;
            case 'account':
                confidence = this.accountMatch(transaction, rule.value);
                break;
        }

        // Apply rule's confidence threshold
        if (confidence < rule.confidenceThreshold) {
            return null;
        }

        return {
            confidence: Math.min(confidence, 100),
            field: rule.field,
            value: transactionValue
        };
    }

    /**
     * Extract field value from transaction based on field type
     */
    private static extractFieldValue(transaction: Transaction, field: string): string | null {
        switch (field) {
            case 'merchant_name':
                return transaction.merchant?.name || null;
            case 'counterparty_name':
                return transaction.counterparty?.name || transaction.counterparty?.preferred_name || null;
            case 'description':
                return transaction.description || null;
            case 'account_number':
                return transaction.counterparty?.account_number || null;
            default:
                return null;
        }
    }

    /**
     * Exact string matching with case insensitivity
     */
    private static exactMatch(transactionValue: string, ruleValue: string): number {
        const normalizedTransaction = transactionValue.toLowerCase().trim();
        const normalizedRule = ruleValue.toLowerCase().trim();
        
        if (normalizedTransaction === normalizedRule) {
            return 100;
        }
        
        // Check if rule value is contained within transaction value
        if (normalizedTransaction.includes(normalizedRule)) {
            return 85;
        }
        
        // Check if transaction value is contained within rule value
        if (normalizedRule.includes(normalizedTransaction)) {
            return 85;
        }
        
        return 0;
    }

    /**
     * Fuzzy string matching using Levenshtein distance
     */
    private static fuzzyMatch(transactionValue: string, ruleValue: string, maxDistance: number): number {
        const normalizedTransaction = transactionValue.toLowerCase().trim();
        const normalizedRule = ruleValue.toLowerCase().trim();
        
        const distance = this.levenshteinDistance(normalizedTransaction, normalizedRule);
        
        if (distance === 0) {
            return 100;
        }
        
        if (distance <= maxDistance) {
            const maxLength = Math.max(normalizedTransaction.length, normalizedRule.length);
            const similarity = 1 - (distance / maxLength);
            return Math.round(similarity * 100);
        }
        
        return 0;
    }

    /**
     * Pattern matching using regular expressions
     */
    private static patternMatch(transactionValue: string, pattern: string): number {
        try {
            const regex = new RegExp(pattern, 'i'); // Case insensitive
            const matches = transactionValue.match(regex);
            
            if (matches) {
                // Higher confidence for more specific matches
                const matchLength = matches[0].length;
                const totalLength = transactionValue.length;
                const coverage = matchLength / totalLength;
                
                return Math.round(70 + (coverage * 30)); // 70-100 range
            }
        } catch (error) {
            console.warn('Invalid regex pattern:', pattern, error);
        }
        
        return 0;
    }

    /**
     * Account number matching
     */
    private static accountMatch(transaction: Transaction, ruleAccountNumber: string): number {
        const transactionAccount = transaction.counterparty?.account_number;
        if (!transactionAccount) {
            return 0;
        }
        
        // Exact match
        if (transactionAccount === ruleAccountNumber) {
            return 100;
        }
        
        // Last 4 digits match (common for credit cards)
        if (ruleAccountNumber.length >= 4 && transactionAccount.length >= 4) {
            const ruleLast4 = ruleAccountNumber.slice(-4);
            const transactionLast4 = transactionAccount.slice(-4);
            
            if (ruleLast4 === transactionLast4) {
                return 80;
            }
        }
        
        return 0;
    }

    /**
     * Calculate Levenshtein distance between two strings
     */
    private static levenshteinDistance(str1: string, str2: string): number {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    /**
     * Create default matching rules for a debt based on creditor name
     */
    static createDefaultMatchingRules(debt: Debt): CreditorMatchingRule[] {
        const rules: CreditorMatchingRule[] = [];
        const creditorName = debt.creditor.trim();
        
        if (!creditorName) {
            return rules;
        }

        // Exact merchant name match
        rules.push({
            id: crypto.randomUUID(),
            debtId: debt.id,
            type: 'exact',
            field: 'merchant_name',
            value: creditorName,
            confidenceThreshold: 85,
            enabled: true,
            created: new Date().toISOString(),
            updated: new Date().toISOString()
        });

        // Exact counterparty name match
        rules.push({
            id: crypto.randomUUID(),
            debtId: debt.id,
            type: 'exact',
            field: 'counterparty_name',
            value: creditorName,
            confidenceThreshold: 85,
            enabled: true,
            created: new Date().toISOString(),
            updated: new Date().toISOString()
        });

        // Fuzzy description match
        rules.push({
            id: crypto.randomUUID(),
            debtId: debt.id,
            type: 'fuzzy',
            field: 'description',
            value: creditorName,
            confidenceThreshold: 75,
            enabled: true,
            created: new Date().toISOString(),
            updated: new Date().toISOString()
        });

        // Common credit card patterns
        if (this.isLikelyCreditCard(creditorName)) {
            const cardPatterns = this.getCreditCardPatterns(creditorName);
            cardPatterns.forEach(pattern => {
                rules.push({
                    id: crypto.randomUUID(),
                    debtId: debt.id,
                    type: 'pattern',
                    field: 'description',
                    value: pattern,
                    pattern: pattern,
                    confidenceThreshold: 80,
                    enabled: true,
                    created: new Date().toISOString(),
                    updated: new Date().toISOString()
                });
            });
        }

        return rules;
    }

    /**
     * Check if creditor name suggests it's a credit card
     */
    private static isLikelyCreditCard(creditorName: string): boolean {
        const cardKeywords = [
            'credit card', 'card', 'visa', 'mastercard', 'amex', 'american express',
            'barclaycard', 'lloyds bank card', 'hsbc card', 'santander card',
            'natwest card', 'halifax card', 'tesco bank card', 'm&s bank card'
        ];
        
        const lowerName = creditorName.toLowerCase();
        return cardKeywords.some(keyword => lowerName.includes(keyword));
    }

    /**
     * Get credit card specific patterns
     */
    private static getCreditCardPatterns(creditorName: string): string[] {
        const patterns: string[] = [];
        const lowerName = creditorName.toLowerCase();
        
        // Extract bank name for pattern matching
        const bankNames = [
            'barclays', 'lloyds', 'hsbc', 'santander', 'natwest', 'halifax', 
            'tesco', 'm&s', 'marks spencer', 'john lewis', 'argos'
        ];
        
        bankNames.forEach(bank => {
            if (lowerName.includes(bank)) {
                patterns.push(`${bank}.*payment|payment.*${bank}`);
                patterns.push(`${bank}.*card|card.*${bank}`);
            }
        });
        
        // Generic credit card payment patterns
        patterns.push('card.*payment|payment.*card');
        patterns.push('credit.*payment|payment.*credit');
        patterns.push('direct.*debit|dd');
        
        return patterns;
    }

    /**
     * Process a transaction and automatically match/update debts
     */
    static async processTransactionForDebtMatching(
        transaction: Transaction,
        debts: Debt[],
        rules: CreditorMatchingRule[],
        config: MatchingConfig = this.DEFAULT_CONFIG
    ): Promise<{
        matches: DebtTransactionMatch[];
        autoConfirmed: DebtTransactionMatch[];
        requiresReview: DebtTransactionMatch[];
    }> {
        const potentialMatches = this.findDebtMatches(transaction, debts, rules, config);
        
        const matches: DebtTransactionMatch[] = [];
        const autoConfirmed: DebtTransactionMatch[] = [];
        const requiresReview: DebtTransactionMatch[] = [];
        
        potentialMatches.forEach(match => {
            const transactionMatch: DebtTransactionMatch = {
                id: crypto.randomUUID(),
                transactionId: transaction.id,
                debtId: match.debtId,
                ruleId: match.ruleId,
                matchConfidence: match.confidence,
                matchStatus: match.confidence >= config.autoConfirmThreshold ? 'confirmed' : 'pending',
                matchType: match.confidence >= config.autoConfirmThreshold ? 'automatic' : 'automatic',
                matchedField: match.matchedField,
                matchedValue: match.matchedValue,
                created: new Date().toISOString(),
                updated: new Date().toISOString()
            };
            
            matches.push(transactionMatch);
            
            if (match.confidence >= config.autoConfirmThreshold) {
                autoConfirmed.push(transactionMatch);
            } else {
                requiresReview.push(transactionMatch);
            }
        });
        
        return {
            matches,
            autoConfirmed,
            requiresReview
        };
    }

    /**
     * Calculate debt balance after payment
     */
    static calculateNewDebtBalance(
        debt: Debt,
        paymentAmount: number,
        interestRate?: number
    ): {
        newBalance: number;
        principalPaid: number;
        interestPaid: number;
    } {
        const absolutePayment = Math.abs(paymentAmount);
        
        if (!interestRate || interestRate === 0) {
            // Simple case: all payment goes to principal
            return {
                newBalance: Math.max(0, debt.currentBalance - absolutePayment),
                principalPaid: Math.min(absolutePayment, debt.currentBalance),
                interestPaid: 0
            };
        }
        
        // Calculate monthly interest if annual rate provided
        const monthlyRate = interestRate / 100 / 12;
        const interestCharge = debt.currentBalance * monthlyRate;
        
        let interestPaid = 0;
        let principalPaid = 0;
        
        if (absolutePayment <= interestCharge) {
            // Payment only covers interest
            interestPaid = absolutePayment;
            principalPaid = 0;
        } else {
            // Payment covers interest plus principal
            interestPaid = interestCharge;
            principalPaid = absolutePayment - interestCharge;
        }
        
        const newBalance = Math.max(0, debt.currentBalance - principalPaid);
        
        return {
            newBalance,
            principalPaid,
            interestPaid
        };
    }

    /**
     * Create payment history entry from confirmed match
     */
    static createPaymentHistoryEntry(
        match: DebtTransactionMatch,
        debt: Debt,
        transaction: Transaction
    ): DebtPaymentHistory {
        const paymentAmount = Math.abs(transaction.amount);
        const { newBalance, principalPaid, interestPaid } = this.calculateNewDebtBalance(
            debt,
            paymentAmount,
            debt.interestRate
        );
        
        // Determine payment type
        let paymentType: 'regular' | 'extra' | 'minimum' | 'final' = 'regular';
        
        if (newBalance === 0) {
            paymentType = 'final';
        } else if (debt.minimumPayment && paymentAmount > debt.minimumPayment * 1.1) {
            paymentType = 'extra';
        } else if (debt.minimumPayment && paymentAmount <= debt.minimumPayment * 1.1) {
            paymentType = 'minimum';
        }
        
        return {
            id: crypto.randomUUID(),
            debtId: debt.id,
            transactionId: transaction.id,
            amount: paymentAmount,
            paymentDate: transaction.created,
            principalAmount: principalPaid,
            interestAmount: interestPaid,
            balanceAfter: newBalance,
            paymentType,
            isAutomatic: match.matchType === 'automatic',
            created: new Date().toISOString()
        };
    }

    /**
     * Validate matching rule configuration
     */
    static validateMatchingRule(rule: Partial<CreditorMatchingRule>): string[] {
        const errors: string[] = [];
        
        if (!rule.debtId) {
            errors.push('Debt ID is required');
        }
        
        if (!rule.type || !['exact', 'pattern', 'fuzzy', 'account'].includes(rule.type)) {
            errors.push('Valid rule type is required (exact, pattern, fuzzy, account)');
        }
        
        if (!rule.field || !['merchant_name', 'counterparty_name', 'description', 'account_number'].includes(rule.field)) {
            errors.push('Valid field is required (merchant_name, counterparty_name, description, account_number)');
        }
        
        if (!rule.value || rule.value.trim().length === 0) {
            errors.push('Rule value is required');
        }
        
        if (rule.type === 'pattern' && (!rule.pattern || rule.pattern.trim().length === 0)) {
            errors.push('Pattern is required for pattern-type rules');
        }
        
        if (rule.confidenceThreshold !== undefined && (rule.confidenceThreshold < 0 || rule.confidenceThreshold > 100)) {
            errors.push('Confidence threshold must be between 0 and 100');
        }
        
        // Test regex pattern if provided
        if (rule.type === 'pattern' && rule.pattern) {
            try {
                new RegExp(rule.pattern, 'i');
            } catch {
                errors.push('Invalid regex pattern');
            }
        }
        
        return errors;
    }
}