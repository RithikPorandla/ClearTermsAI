import "./globals.css";

export const metadata = {
  title: "ClearTerms AI — Know What You're Agreeing To",
  description:
    "ClearTerms AI scans Terms of Service and Privacy Policies in real time. Get a risk score, evidence quotes, and plain-English explanations before you click Accept."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#fafafa] text-[#0a0a0a] antialiased">
        {children}
      </body>
    </html>
  );
}
