// app/api/banking/accounts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { mockAccounts, mockUser } from '@/lib/mock-data';

export async function GET(request: NextRequest) {
  try {
    // Check for auth header (mock authentication)
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || authHeader !== 'Bearer demo-token') {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please authenticate first' },
        { status: 401 }
      );
    }

    // Return mock accounts
    return NextResponse.json({
      success: true,
      data: {
        user: {
          name: mockUser.name,
          email: mockUser.email
        },
        accounts: mockAccounts.map(account => ({
          type: account.type,
          balance: account.balance,
          accountNumber: account.accountNumber
        }))
      }
    });
  } catch (error) {
    console.error('Error in /api/banking/accounts:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}