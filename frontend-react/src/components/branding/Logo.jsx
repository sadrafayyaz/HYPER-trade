import logo from "../../assets/images/hypertrade-logo.png";

export default function Logo() {
  return (
    <div className="flex flex-col items-center">

      <img
        src={logo}
        alt="Hyper Trade"
        className="w-36 mb-6"
      />

      <h1 className="text-4xl font-bold text-white">
        Hyper Trade
      </h1>

      <p className="text-zinc-400 mt-2">
        Trade Beyond Limits
      </p>

    </div>
  );
}