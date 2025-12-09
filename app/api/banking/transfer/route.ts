import { NextRequest } from 'next/server';
import { BankingService } from '@/lib/services/banking-service';
import { validateAuth, errorResponse, successResponse } from '@/lib/api-utils';

interface TransferRequest {
  fromAccount: 'checking' | 'savings';
  toAccount: 'checking' | 'savings';
  amount: number;
}

export async function POST(request: NextRequest) {
  if (!validateAuth(request)) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const body: TransferRequest = await request.json();
    
    // Basic Validation
    if (!body.fromAccount || !body.toAccount || !body.amount) {
      return errorResponse('Missing required fields', 400);
    }
    if (body.fromAccount === body.toAccount) {
      return errorResponse('Cannot transfer to same account', 400);
    }

    // Use Service Layer
    const result = await BankingService.processTransfer(
      body.fromAccount, 
      body.toAccount, 
      body.amount
    );
    
    if (!result.success) {
      return errorResponse(result.error || 'Transfer failed', 400);
    }

    return successResponse({
      ...result.data,
      message: 'Transfer successful'
    });

  } catch (_error) {
    console.error('Transfer API Error:', _error);
    return errorResponse('Internal Server Error');
  }
}