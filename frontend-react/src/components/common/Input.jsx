export default function Input({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
}) {
  return (
    <div>
      <label className="block mb-2 text-sm text-zinc-300">
        {label}
      </label>

      <input
        type={type}
        placeholder={placeholder}
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
        text-white
        outline-none
        focus:border-blue-500
        "
      />
    </div>
  );
}