import Background from "../components/layout/Background";

export default function AuthLayout({ children }) {
  return (
    <>
      <Background />

      <div className="min-h-screen flex items-center justify-center px-6">
        {children}
      </div>
    </>
  );
}