import { api } from "./shared/routes";

const data = {
  docketNumber: "DKT-1001",
  senderName: "Acme",
  senderAddress: "123 Road",
  receiverName: "Beta",
  receiverAddress: "456 Street",
  totalWeight: "10",
  totalPackages: 1,
  items: [{ description: "Box", weight: "10", quantity: 1, packageType: "box" }],
};

try {
  api.dockets.create.input.parse(data);
  console.log("ok");
} catch (e: any) {
  console.log(JSON.stringify(e.issues, null, 2));
}
