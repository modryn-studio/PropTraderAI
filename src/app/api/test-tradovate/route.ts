import { NextResponse } from 'next/server';
import { TradovateClient } from '@/lib/execution/tradovate';

export async function GET() {
  try {
    console.log('[Test Tradovate] Starting authentication test...');
    
    // Check environment variables
    const missingVars: string[] = [];
    if (!process.env.TRADOVATE_CLIENT_ID) missingVars.push('TRADOVATE_CLIENT_ID');
    if (!process.env.TRADOVATE_CLIENT_SECRET) missingVars.push('TRADOVATE_CLIENT_SECRET');
    if (!process.env.TRADOVATE_USERNAME) missingVars.push('TRADOVATE_USERNAME');
    if (!process.env.TRADOVATE_PASSWORD) missingVars.push('TRADOVATE_PASSWORD');
    
    if (missingVars.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables',
        missing: missingVars,
        note: 'Add your Tradovate demo account username and password to .env.local',
      }, { status: 500 });
    }

    console.log('[Test Tradovate] Environment variables found');
    console.log('[Test Tradovate] Client ID:', process.env.TRADOVATE_CLIENT_ID);
    console.log('[Test Tradovate] Username:', process.env.TRADOVATE_USERNAME);
    console.log('[Test Tradovate] Using demo API:', process.env.TRADOVATE_API_URL);

    // Authenticate with Tradovate using username/password + OAuth credentials
    const credentials = await TradovateClient.authenticate(
      process.env.TRADOVATE_USERNAME,
      process.env.TRADOVATE_PASSWORD,
      process.env.TRADOVATE_APP_ID || 'PropTraderAI',
      process.env.TRADOVATE_CLIENT_ID,
      process.env.TRADOVATE_CLIENT_SECRET,
      true // isDemo
    );
    
    console.log('[Test Tradovate] Authentication successful!');
    console.log('[Test Tradovate] Full credentials object:', JSON.stringify(credentials, null, 2));
    console.log('[Test Tradovate] Account ID:', credentials.accountId);
    console.log('[Test Tradovate] User ID:', credentials.userId);

    return NextResponse.json({
      success: true,
      message: 'Tradovate authentication successful!',
      apiUrl: process.env.TRADOVATE_API_URL || 'https://demo.tradovateapi.com/v1',
      clientId: process.env.TRADOVATE_CLIENT_ID,
      credentials: credentials, // Return full object to see structure
      accountId: credentials.accountId,
      userId: credentials.userId,
      accessToken: credentials.accessToken ? credentials.accessToken.substring(0, 20) + '...' : 'N/A',
    });

  } catch (error) {
    console.error('[Test Tradovate] Authentication error:', error);
    
    // Extract more detailed error info
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorName = error instanceof Error ? error.name : 'Error';
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      errorType: errorName,
      details: error,
      note: 'Check console logs for full error details',
    }, { status: 500 });
  }
}
