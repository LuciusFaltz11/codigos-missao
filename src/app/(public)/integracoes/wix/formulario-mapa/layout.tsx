import "./page.css";

export default function WixFormLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`html,body{margin:0!important;height:auto!important;min-height:0!important;overflow:auto!important;background:transparent!important}`}</style>
      <div className="wix-embed-root">{children}</div>
    </>
  );
}
