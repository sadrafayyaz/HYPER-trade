export default function RecentTrades() {

  const trades = [

    {
      pair: "BTC/USDT",
      type: "BUY",
      amount: "0.025",
      price: "118,420"
    },

    {
      pair: "ETH/USDT",
      type: "SELL",
      amount: "1.20",
      price: "4,120"
    },

    {
      pair: "SOL/USDT",
      type: "BUY",
      amount: "15",
      price: "212"
    },

    {
      pair: "BTC/USDT",
      type: "SELL",
      amount: "0.10",
      price: "118,600"
    }

  ];

  return (

    <div className="rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-6">

      <h2 className="mb-6 text-xl font-bold">

        Recent Trades

      </h2>

      <table className="w-full">

        <thead>

          <tr className="border-b border-zinc-800 text-zinc-400">

            <th className="pb-3 text-left">
              Pair
            </th>

            <th className="pb-3 text-left">
              Type
            </th>

            <th className="pb-3 text-left">
              Amount
            </th>

            <th className="pb-3 text-left">
              Price
            </th>

          </tr>

        </thead>

        <tbody>

          {trades.map((trade,index)=>(

            <tr
              key={index}
              className="border-b border-zinc-900"
            >

              <td className="py-4">

                {trade.pair}

              </td>

              <td
                className={`py-4 font-semibold ${
                  trade.type === "BUY"
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >

                {trade.type}

              </td>

              <td className="py-4">

                {trade.amount}

              </td>

              <td className="py-4">

                ${trade.price}

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  );

}