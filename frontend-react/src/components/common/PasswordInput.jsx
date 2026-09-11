import { useState } from "react";

export default function PasswordInput({
  label,
  value,
  onChange,
}) {
  const [show, setShow] = useState(false);

  return (
    <div>

      <label className="block mb-2 text-sm text-zinc-300">
        {label}
      </label>

      <div className="relative">

        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          className="
          w-full
          rounded-xl
          border
          border-zinc-700
          bg-zinc-900/60
          px-4
          py-3
          pr-16
          text-white
          outline-none
          focus:border-blue-500
          "
        />

        <button
          type="button"
          onClick={() => setShow(!show)}
          className="
          absolute
          right-4
          top-1/2
          -translate-y-1/2
          text-zinc-400
          "
        >
          {show ? "Hide" : "Show"}
        </button>

      </div>

    </div>
  );
}