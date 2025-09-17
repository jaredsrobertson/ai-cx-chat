// app/api/banking/transfer/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { processTransfer } from '@/lib/mock-data';

interface TransferRequest {
  fromAccount: 'checking' | 'savings';
  toAccount: 'checking' | 'savings';
  amount: number;
}

export async function POST(request: NextRequest) {
  try {
    // Check for auth header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || authHeader !== `Bearer ${process.env.MOCK_API_TOKEN}`) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please authenticate first' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: TransferRequest = await request.json();
    
    // Validate required fields
    if (!body.fromAccount || !body.toAccount || !body.amount) {
      return NextResponse.json(
        { 
          error: 'Bad Request', 
          message: 'Missing required fields: fromAccount, toAccount, amount' 
        },
        { status: 400 }
      );
    }

    // Validate account types
    if (!['checking', 'savings'].includes(body.fromAccount) || 
        !['checking', 'savings'].includes(body.toAccount)) {
      return NextResponse.json(
        { 
          error: 'Bad Request', 
          message: 'Invalid account type. Must be "checking" or "savings"' 
        },
        { status: 400 }
      );
    }

    // Validate same account transfer
    if (body.fromAccount === body.toAccount) {
      return NextResponse.json(
        { 
          error: 'Bad Request', 
          message: 'Cannot transfer to the same account' 
        },
        { status: 400 }
      );
    }

    // Process the transfer
    const result = processTransfer(body.fromAccount, body.toAccount, body.amount);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Transfer Failed', message: result.error },
        { status: 400 }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      data: result.data,
      message: `Successfully transferred $${body.amount} from ${body.fromAccount} to ${body.toAccount}`
    });

  } catch (error) {
    console.error('Error in /api/banking/transfer:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to process transfer' },
      { status: 500 }
    );
  }
}