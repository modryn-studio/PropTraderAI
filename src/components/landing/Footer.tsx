import { footerData } from "@/data/mock";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-top">
          <div className="footer-brand">
            <h3 className="footer-logo">{footerData.brand}</h3>
            <p className="footer-tagline">{footerData.tagline}</p>
          </div>

          <div className="footer-links-group">
            <div className="footer-links">
              <h4 className="footer-links-title">Connect</h4>
              {footerData.links.map((link, index) => (
                <a key={index} href={link.href} className="footer-link">
                  {link.label}
                </a>
              ))}
            </div>

            <div className="footer-links">
              <h4 className="footer-links-title">Legal</h4>
              {footerData.legal.map((link, index) => (
                <a key={index} href={link.href} className="footer-link">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <Separator className="footer-separator" />

        <div className="footer-bottom">
          <p className="footer-copyright">{footerData.copyright}</p>
          <p className="footer-disclaimer">{footerData.riskDisclaimer}</p>
        </div>
      </div>
    </footer>
  );
}
