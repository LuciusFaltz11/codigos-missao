import "./page.css";

export default function WixFormLayout({ children }: { children: React.ReactNode }) {
  return <div className="wix-embed-root">{children}</div>;
}
