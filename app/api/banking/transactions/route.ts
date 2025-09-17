// app/api/banking/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { mockTransactions } from '@/lib/mock-data';

export async function GET(request: NextRequest) {
  try {
    // Check for auth header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || authHeader !== 'Bearer demo-token') {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please authenticate first' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');
    const limit = parseInt(searchParams.get('limit') || '5', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Filter transactions if accountId provided
    let transactions = mockTransactions;
    if (accountId) {
      transactions = transactions.filter(txn => txn.accountId === accountId);
    }

    // Apply pagination
    const paginatedTransactions = transactions.slice(offset, offset + limit);

    // Return transactions
    return NextResponse.json({
      success: true,
      data: {
        transactions: paginatedTransactions,
        pagination: {
          total: transactions.length,
          limit: limit,
          offset: offset,
          hasMore: offset + limit < transactions.length
        }
      }
    });

  } catch (error) {
    console.error('Error in /api/banking/transactions:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}