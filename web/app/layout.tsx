import "./globals.css";

export const metadata = {
  title: "ClearTerms AI ? Real-Time Legal Risk Translator",
  description:
    "ClearTerms AI helps you understand Terms of Service and Privacy Policies in real time with evidence-first risk insights."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f7f3ee] text-[#101114] antialiased">
        {children}
      </body>
    </html>
  );
}
