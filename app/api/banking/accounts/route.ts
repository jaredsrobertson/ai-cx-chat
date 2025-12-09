import { NextRequest } from 'next/server';
import { BankingService } from '@/lib/services/banking-service';
import { validateAuth, errorResponse, successResponse } from '@/lib/api-utils';
import { mockUser } from '@/lib/mock-data';

export async function GET(request: NextRequest) {
  if (!validateAuth(request)) {
    return errorResponse('Unauthorized: Please authenticate first', 401);
  }

  try {
    const accounts = await BankingService.getAccounts();
    
    return successResponse({
      user: {
        name: mockUser.name,
        email: mockUser.email
      },
      accounts: accounts.map(account => ({
        type: account.type,
        balance: account.balance,
        accountNumber: account.accountNumber
      }))
    });
  } catch (error) {
    console.error('API Error:', error);
    return errorResponse('Internal Server Error');
  }
}