-- Seed prop_firms table with supported prop trading firms
-- Run this after schema.sql and migrations

INSERT INTO prop_firms (name, website_url) VALUES
  ('Apex Trader Funding', 'https://apextraderfunding.com'),
  ('Topstep', 'https://www.topstep.com'),
  ('MyFundedFutures', 'https://myfundedfutures.com'),
  ('TradeDay', 'https://tradeday.com'),
  ('Bulenox', 'https://bulenox.com'),
  ('Earn2Trade', 'https://earn2trade.com'),
  ('BluSky Trading', 'https://blusky.pro'),
  ('Take Profit Trader', 'https://takeprofittrader.com'),
  ('Elite Trader Funding', 'https://elitetraderfunding.com'),
  ('Alpha Futures', 'https://alphafutures.com'),
  ('Lucid Trading', 'https://lucidtrading.io')
ON CONFLICT (name) DO NOTHING;
