import { NextRequest } from 'next/server';
import { BankingService } from '@/lib/services/banking-service';
import { validateAuth, errorResponse, successResponse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  if (!validateAuth(request)) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '5', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const transactions = await BankingService.getTransactions(accountId, limit + offset);
    const paginated = transactions.slice(offset, offset + limit);

    return successResponse({
      transactions: paginated,
      pagination: {
        total: transactions.length, // Note: In a real DB this would be a count() query
        limit,
        offset,
        hasMore: offset + limit < transactions.length
      }
    });
  } catch (error) {
    return errorResponse('Failed to fetch transactions');
  }
}