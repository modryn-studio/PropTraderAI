-- Seed prop_firms table with supported prop trading firms
-- Run this after schema.sql and the unique constraint migration

INSERT INTO prop_firms (
  name, 
  slug,
  website_url, 
  account_sizes,
  daily_loss_limit_percent,
  max_drawdown_percent,
  profit_target_percent,
  profit_split,
  trading_days_required
) VALUES
  ('Apex Trader Funding', 'apex-trader-funding', 'https://apextraderfunding.com', '[25000, 50000, 100000, 150000, 250000]', 2.0, 4.0, 8.0, 90.0, 0),
  ('Topstep', 'topstep', 'https://www.topstep.com', '[50000, 100000, 150000]', 2.0, 3.0, 6.0, 80.0, 5),
  ('MyFundedFutures', 'myfundedfutures', 'https://myfundedfutures.com', '[25000, 50000, 100000, 150000]', 2.0, 4.0, 8.0, 80.0, 0),
  ('TradeDay', 'tradeday', 'https://tradeday.com', '[25000, 50000, 100000, 150000]', 2.0, 3.0, 6.0, 90.0, 10),
  ('Bulenox', 'bulenox', 'https://bulenox.com', '[25000, 50000, 100000, 150000]', 2.0, 4.0, 8.0, 80.0, 5),
  ('Earn2Trade', 'earn2trade', 'https://earn2trade.com', '[25000, 50000, 100000, 150000, 200000]', 2.0, 4.0, 10.0, 80.0, 15),
  ('BluSky Trading', 'blusky-trading', 'https://blusky.pro', '[25000, 50000, 100000, 150000]', 2.0, 4.0, 8.0, 80.0, 0),
  ('Take Profit Trader', 'take-profit-trader', 'https://takeprofittrader.com', '[25000, 50000, 100000, 150000, 250000]', 2.0, 4.0, 8.0, 80.0, 5),
  ('Elite Trader Funding', 'elite-trader-funding', 'https://elitetraderfunding.com', '[50000, 100000, 150000, 250000]', 2.0, 5.0, 10.0, 80.0, 7),
  ('Alpha Futures', 'alpha-futures', 'https://alphafutures.com', '[25000, 50000, 100000, 150000]', 2.0, 4.0, 8.0, 80.0, 5),
  ('Lucid Trading', 'lucid-trading', 'https://lucidtrading.io', '[25000, 50000, 100000, 150000]', 2.0, 4.0, 8.0, 90.0, 0)
ON CONFLICT (name) DO NOTHING;
