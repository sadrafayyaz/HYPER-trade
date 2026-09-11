export default function Button({
  children,
  loading,
  ...props
}) {
  return (
    <button
      {...props}
      className="
      w-full
      rounded-xl
      bg-gradient-to-r
      from-blue-600
      to-violet-600
      py-3
      font-semibold
      text-white
      transition
      hover:opacity-90
      "
    >
      {loading ? "Loading..." : children}
    </button>
  );
}