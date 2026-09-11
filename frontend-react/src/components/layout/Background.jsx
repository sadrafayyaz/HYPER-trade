export default function Background() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#050816]">

      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-600 opacity-20 blur-[140px]" />

      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-violet-700 opacity-20 blur-[140px]" />

      <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full bg-cyan-500 opacity-10 blur-[120px] -translate-x-1/2 -translate-y-1/2" />

    </div>
  );
}