[Project in progress!]

ML-driven finance dashboard for smarter spending and saving.

Features -
Allow users to track their transactions, get advice on their spending and budgeting, as well as see how different decisions would affect one's finances.

The Curent Plan -

1. CSV Upload (12+ months for strong analysis)
2. Dashboard -> Clustering
3. Advisory (Rule-based)
4. Forecast of the next 3-6 months (Prophet)
5. What-if simulation (Monte-Carlo)
6. LSTM model to compare with Prophet (Version 2.0)

Problems to be tackled -

1. CSV files to be formatted by the user themselves
   PDF -> data extracted
   CSV -> direct
2. If new CSV files added, either -
   i. Replace all analytics with new one
   ii. Seperate as 'January', 'February', and merge

- Income derived from the transaction data itself.
- Training done on the user's data themselves rather than external data

Pages (Currently) -

1. Home Page
2. Upload File Page
3. Dashboard Page
4. Advisory Page
5. Forecast Page
6. What-if Simulation Page
7. Profile/Insights Page

Storage -
Initially make for one CSV per session + single user
Then, multiple users + CSV -> prisma + postgresql

Required data from CSV/PDF -

1. date
2. description
3. amount
4. type
