// Quick test - add this to your banking webhook temporarily for debugging

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { queryResult, session } = req.body;
    
    // 🚨 SIMPLE TEST: Log everything we receive
    console.log('=== WEBHOOK DEBUG START ===');
    console.log('1. Intent:', queryResult?.intent?.displayName);
    console.log('2. Query Text:', queryResult?.queryText);
    console.log('3. Has queryParams:', !!queryResult?.queryParams);
    console.log('4. queryParams structure:', JSON.stringify(queryResult?.queryParams, null, 2));
    
    if (queryResult?.queryParams?.payload) {
      console.log('5. Payload exists:', JSON.stringify(queryResult.queryParams.payload, null, 2));
      
      if (queryResult.queryParams.payload.fields) {
        console.log('6. Payload fields:', Object.keys(queryResult.queryParams.payload.fields));
        
        if (queryResult.queryParams.payload.fields.token) {
          console.log('7. Token field exists:', queryResult.queryParams.payload.fields.token);
          
          if (queryResult.queryParams.payload.fields.token.stringValue) {
            const token = queryResult.queryParams.payload.fields.token.stringValue;
            console.log('8. Token found! Length:', token.length, 'Preview:', token.substring(0, 50) + '...');
            
            // Try to verify the token
            try {
              const jwt = (await import('jsonwebtoken')).default;
              const user = jwt.verify(token, process.env.JWT_SECRET);
              console.log('9. JWT verified successfully! User:', user.userId, user.name);
              
              // SUCCESS! Return balance data
              return res.status(200).json({
                fulfillmentText: `SUCCESS! Found user ${user.name} with accounts.`,
                fulfillmentMessages: [{
                  text: { text: [`SUCCESS! Found user ${user.name} with checking balance $${user.accounts?.checking?.balance || 'unknown'}`] }
                }]
              });
              
            } catch (jwtError) {
              console.log('9. JWT verification failed:', jwtError.message);
            }
          } else {
            console.log('8. Token field exists but no stringValue');
          }
        } else {
          console.log('7. No token field in payload fields');
        }
      } else {
        console.log('6. Payload exists but no fields');
      }
    } else {
      console.log('5. No payload in queryParams');
    }
    
    console.log('=== WEBHOOK DEBUG END ===');
    
    // Default response
    return res.status(200).json({
      fulfillmentText: "Token test - check Vercel logs for details"
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ 
      fulfillmentText: "Error in token test" 
    });
  }
}