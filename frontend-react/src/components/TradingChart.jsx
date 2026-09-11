import { useEffect, useRef } from "react";

export default function TradingChart() {

  const container = useRef(null);

  useEffect(() => {

    container.current.innerHTML = "";

    const script = document.createElement("script");

    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

    script.type = "text/javascript";

    script.async = true;

    script.innerHTML = JSON.stringify({

      autosize: true,

      symbol: "BINANCE:BTCUSDT",

      interval: "15",

      timezone: "Etc/UTC",

      theme: "dark",

      style: "1",

      locale: "en",

      allow_symbol_change: true,

      hide_top_toolbar: false,

      hide_legend: false,

      save_image: false,

      calendar: false,

      support_host: "https://www.tradingview.com"

    });

    container.current.appendChild(script);

  }, []);

  return (

    <div
      className="tradingview-widget-container h-[550px] w-full"
      ref={container}
    />

  );

}