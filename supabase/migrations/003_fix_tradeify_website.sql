-- Fix Tradeify website_url (was NULL after column drops)

UPDATE prop_firms 
SET website_url = 'https://tradeify.co'
WHERE name = 'Tradeify' AND website_url IS NULL;
