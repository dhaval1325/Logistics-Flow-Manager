import { useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export default function GcnPreview() {
  const [landscape, setLandscape] = useState(false);

  return (
    <div className="gcn-preview-page space-y-4">
      <style>{`
        .gcn-preview-page {
          --gcn-border: #111111;
          --gcn-muted: #f1f1f1;
          --gcn-light: #fafafa;
          color: #111111;
        }
        .gcn-controls {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 6px 0 12px;
        }
        .gcn-sheet {
          background: #ffffff;
          border: 1px solid var(--gcn-border);
          padding: 10px;
          font-family: Arial, sans-serif;
          font-size: 12px;
          line-height: 1.3;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
        }
        .gcn-portrait { width: 820px; }
        .gcn-landscape { width: 1120px; }
        .gcn-table {
          width: 100%;
          border-collapse: collapse;
        }
        .gcn-table th, .gcn-table td {
          border: 1px solid var(--gcn-border);
          padding: 4px 6px;
          vertical-align: top;
        }
        .gcn-title {
          background: var(--gcn-muted);
          text-align: center;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .gcn-subtitle {
          background: var(--gcn-muted);
          font-weight: 700;
          text-align: center;
        }
        .gcn-label {
          font-weight: 700;
          white-space: nowrap;
          width: 140px;
        }
        .gcn-muted {
          color: #5b5b5b;
        }
        .gcn-header-cell {
          text-align: center;
          padding: 8px;
        }
        .gcn-logo {
          font-weight: 800;
          font-size: 20px;
          color: #1f4aa8;
        }
        .gcn-qr {
          height: 90px;
          width: 90px;
          border: 2px solid #111;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          letter-spacing: 1px;
        }
        .gcn-footer {
          margin-top: 20px;
          font-weight: 600;
        }
        @media print {
          body { background: #ffffff; }
          .gcn-controls { display: none; }
          .gcn-sheet { box-shadow: none; border-color: #000; }
        }
      `}</style>

      <div className="gcn-controls">
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Landscape View</span>
          <Switch checked={landscape} onCheckedChange={(value) => setLandscape(value)} />
        </div>
      </div>

      <div className="flex justify-center">
        <div className={cn("gcn-sheet", landscape ? "gcn-landscape" : "gcn-portrait")}>
          <table className="gcn-table">
            <tbody>
              <tr>
                <td className="gcn-header-cell" style={{ width: "25%" }}>
                  <div className="gcn-logo">WebXpress</div>
                </td>
                <td className="gcn-header-cell" style={{ width: "50%" }}>
                  <div style={{ fontSize: "16px", fontWeight: 700 }}>Globe Charters</div>
                  <div className="gcn-muted">
                    NAVKAR CHAMBERS, ANDHERI - KURLA ROAD, MAROL, ANDHERI EAST,
                  </div>
                  <div className="gcn-muted">MUMBAI, MH 400059</div>
                  <div style={{ marginTop: "6px", fontSize: "11px" }}>
                    <span style={{ fontWeight: 700 }}>GSTN</span> 07AMUE5678F2Z1&nbsp;&nbsp;
                    <span style={{ fontWeight: 700 }}>CIN</span> &nbsp;&nbsp;
                    <span style={{ fontWeight: 700 }}>PAN</span>
                  </div>
                </td>
                <td className="gcn-header-cell" style={{ width: "25%" }}>
                  <div className="gcn-qr">QR</div>
                </td>
              </tr>
            </tbody>
          </table>

          <table className="gcn-table" style={{ marginTop: "8px" }}>
            <thead>
              <tr>
                <th className="gcn-title" colSpan={4}>GCN</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="gcn-label">GCN No</td>
                <td>Computerized</td>
                <td className="gcn-label">Billing Party</td>
                <td>:</td>
              </tr>
              <tr>
                <td className="gcn-label">GCN Date</td>
                <td>20 Feb 26</td>
                <td className="gcn-label">Payment Mode</td>
                <td>:</td>
              </tr>
              <tr>
                <td className="gcn-label">From City</td>
                <td>DELHI</td>
                <td className="gcn-label">To City</td>
                <td>:</td>
              </tr>
              <tr>
                <td className="gcn-label">Transport Mode</td>
                <td>Road</td>
                <td className="gcn-label">Delivery Type</td>
                <td>:</td>
              </tr>
              <tr>
                <td className="gcn-label">Origin</td>
                <td>DELB</td>
                <td className="gcn-label">Destination</td>
                <td>:</td>
              </tr>
            </tbody>
          </table>

          <table className="gcn-table" style={{ marginTop: "8px" }}>
            <thead>
              <tr>
                <th className="gcn-subtitle" colSpan={2}>Consignor Details</th>
                <th className="gcn-subtitle" colSpan={2}>Consignee Details</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="gcn-label">Name</td>
                <td></td>
                <td className="gcn-label">Name</td>
                <td></td>
              </tr>
              <tr>
                <td className="gcn-label">Address</td>
                <td></td>
                <td className="gcn-label">Address</td>
                <td></td>
              </tr>
              <tr>
                <td className="gcn-label">GST No</td>
                <td></td>
                <td className="gcn-label">GST No</td>
                <td></td>
              </tr>
              <tr>
                <td className="gcn-label">Contact</td>
                <td></td>
                <td className="gcn-label">Contact</td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <table className="gcn-table" style={{ marginTop: "8px" }}>
            <thead>
              <tr>
                <th>Eway Bill No</th>
                <th>Validity Date</th>
                <th>Invoice No</th>
                <th>Invoice Date</th>
                <th>Invoice Amount</th>
                <th>Dimension (L x B x H)</th>
                <th>Vol Wt</th>
                <th>No of Pkts</th>
                <th>Actual Weight (kg)</th>
                <th>Charged Weight (kg)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={10} className="gcn-muted" style={{ textAlign: "center" }}>
                  TOTAL
                </td>
              </tr>
            </tbody>
          </table>

          <table className="gcn-table" style={{ marginTop: "8px" }}>
            <thead>
              <tr>
                <th>Material Name</th>
                <th>Packaging Type</th>
                <th>Private Marka</th>
                <th>Risk Type</th>
                <th>Transport Mode</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6}>&nbsp;</td>
              </tr>
            </tbody>
          </table>

          <table className="gcn-table" style={{ marginTop: "8px" }}>
            <tbody>
              <tr>
                <th className="gcn-subtitle" style={{ width: "70%" }}>Freight Details</th>
                <th className="gcn-subtitle" style={{ width: "30%" }}>Proof of Delivery</th>
              </tr>
              <tr>
                <td>
                  <table className="gcn-table" style={{ border: "none" }}>
                    <tbody>
                      <tr>
                        <td className="gcn-label" style={{ border: "none" }}>Charge Name</td>
                        <td style={{ border: "none" }}>Amount</td>
                      </tr>
                      <tr>
                        <td style={{ border: "none" }}>Freight Charge</td>
                        <td style={{ border: "none" }}></td>
                      </tr>
                      <tr>
                        <td style={{ border: "none" }}>Net Amount</td>
                        <td style={{ border: "none" }}></td>
                      </tr>
                    </tbody>
                  </table>
                </td>
                <td style={{ textAlign: "center", verticalAlign: "bottom" }}>
                  Received By &amp; Company Seal
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: "10px" }}>
            Consignment Acknowledged by Consignee: Received the Shipment as Per Consignment Note
          </div>

          <div className="gcn-footer">Consignor Signature Stamp &amp; Date</div>
        </div>
      </div>
    </div>
  );
}
