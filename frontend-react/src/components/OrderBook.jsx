export default function OrderBook() {
  const buyOrders = [
    { price: "118,420", amount: "0.35" },
    { price: "118,410", amount: "0.82" },
    { price: "118,400", amount: "1.12" },
    { price: "118,390", amount: "0.57" },
    { price: "118,380", amount: "2.40" },
  ];

  const sellOrders = [
    { price: "118,430", amount: "0.42" },
    { price: "118,440", amount: "1.10" },
    { price: "118,450", amount: "0.63" },
    { price: "118,460", amount: "0.84" },
    { price: "118,470", amount: "1.95" },
  ];

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-6">

      <h2 className="mb-6 text-xl font-bold">
        Order Book
      </h2>

      <div className="grid grid-cols-2 gap-8">

        <div>

          <h3 className="mb-3 font-semibold text-green-400">
            Buy Orders
          </h3>

          {buyOrders.map((o, i) => (
            <div
              key={i}
              className="mb-2 flex justify-between text-sm"
            >
              <span className="text-green-400">
                {o.price}
              </span>

              <span className="text-zinc-300">
                {o.amount}
              </span>
            </div>
          ))}

        </div>

        <div>

          <h3 className="mb-3 font-semibold text-red-400">
            Sell Orders
          </h3>

          {sellOrders.map((o, i) => (
            <div
              key={i}
              className="mb-2 flex justify-between text-sm"
            >
              <span className="text-red-400">
                {o.price}
              </span>

              <span className="text-zinc-300">
                {o.amount}
              </span>
            </div>
          ))}

        </div>

      </div>

    </div>
  );
}