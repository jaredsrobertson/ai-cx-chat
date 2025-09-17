// app/api-test/page.tsx
'use client';

import { useState } from 'react';

interface ApiResponse {
  status: number | string;
  data: unknown;
}

export default function APITestPage() {
  const [results, setResults] = useState<Record<string, ApiResponse>>({});
  const [loading, setLoading] = useState<string>('');

  const testEndpoint = async (endpoint: string, method: string = 'GET', body?: unknown) => {
    setLoading(endpoint);
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo-token'
        }
      };
      
      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(endpoint, options);
      const data = await response.json();
      
      setResults(prev => ({
        ...prev,
        [endpoint]: {
          status: response.status,
          data: data
        }
      }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [endpoint]: {
          status: 'error',
          data: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
    }
    setLoading('');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Banking API Test Page</h1>
      
      <div className="space-y-4">
        {/* Test Accounts API */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold">GET /api/banking/accounts</h2>
            <button
              onClick={() => testEndpoint('/api/banking/accounts')}
              disabled={loading === '/api/banking/accounts'}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading === '/api/banking/accounts' ? 'Testing...' : 'Test'}
            </button>
          </div>
          {results['/api/banking/accounts'] && (
            <pre className="bg-gray-100 p-2 rounded overflow-x-auto text-sm">
              {JSON.stringify(results['/api/banking/accounts'], null, 2)}
            </pre>
          )}
        </div>

        {/* Test Transactions API */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold">GET /api/banking/transactions</h2>
            <button
              onClick={() => testEndpoint('/api/banking/transactions?limit=5')}
              disabled={loading === '/api/banking/transactions?limit=5'}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading === '/api/banking/transactions?limit=5' ? 'Testing...' : 'Test'}
            </button>
          </div>
          {results['/api/banking/transactions?limit=5'] && (
            <pre className="bg-gray-100 p-2 rounded overflow-x-auto text-sm">
              {JSON.stringify(results['/api/banking/transactions?limit=5'], null, 2)}
            </pre>
          )}
        </div>

        {/* Test Transfer API */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold">POST /api/banking/transfer</h2>
            <button
              onClick={() => testEndpoint('/api/banking/transfer', 'POST', {
                fromAccount: 'checking',
                toAccount: 'savings',
                amount: 100
              })}
              disabled={loading === '/api/banking/transfer'}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading === '/api/banking/transfer' ? 'Testing...' : 'Test'}
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Test payload: {`{ fromAccount: "checking", toAccount: "savings", amount: 100 }`}
          </p>
          {results['/api/banking/transfer'] && (
            <pre className="bg-gray-100 p-2 rounded overflow-x-auto text-sm">
              {JSON.stringify(results['/api/banking/transfer'], null, 2)}
            </pre>
          )}
        </div>

        {/* Test Unauthorized Request */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold">Test Unauthorized (No Token)</h2>
            <button
              onClick={async () => {
                setLoading('unauthorized');
                try {
                  const response = await fetch('/api/banking/accounts');
                  const data = await response.json();
                  setResults(prev => ({
                    ...prev,
                    unauthorized: {
                      status: response.status,
                      data: data
                    }
                  }));
                } catch (error) {
                  setResults(prev => ({
                    ...prev,
                    unauthorized: {
                      status: 'error',
                      data: error instanceof Error ? error.message : 'Unknown error'
                    }
                  }));
                }
                setLoading('');
              }}
              disabled={loading === 'unauthorized'}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            >
              {loading === 'unauthorized' ? 'Testing...' : 'Test'}
            </button>
          </div>
          {results.unauthorized && (
            <pre className="bg-gray-100 p-2 rounded overflow-x-auto text-sm">
              {JSON.stringify(results.unauthorized, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}