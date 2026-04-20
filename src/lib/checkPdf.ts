import { jsPDF } from "jspdf";
import type { Check } from "./storage";
import { amountToWordsEs, formatCheckCurrency } from "./checks";

export function downloadCheckPDF(check: Check): void {
  const doc = new jsPDF({
    unit: "mm",
    format: [210, 99],
    orientation: "landscape",
  });

  const margin = 10;
  const width = 210;
  const height = 99;
  const amountText = check.amount_text?.trim() || amountToWordsEs(check.amount);
  const formattedAmount = formatCheckCurrency(check.amount);

  doc.setFillColor(249, 250, 251);
  doc.roundedRect(margin, margin, width - margin * 2, height - margin * 2, 4, 4, "FD");
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin + 2, margin + 2, width - margin * 2 - 4, height - margin * 2 - 4, 3, 3);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(check.bank?.trim() || "Cheque", margin + 8, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  if (check.account?.trim()) {
    doc.text(`Cuenta: ${check.account}`, margin + 8, 28);
  }
  if (check.city?.trim()) {
    doc.text(check.city, width - 62, 18);
  }
  doc.text(`Fecha: ${check.date}`, width - 62, 24);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Cheque No. ${check.check_number}`, width - 62, 32);

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(margin + 8, 40, width - 56, 40);
  doc.line(margin + 8, 54, width - 8, 54);
  doc.line(margin + 8, 68, width - 8, 68);
  doc.line(width - 52, 40, width - 8, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("Paguese a", margin + 8, 37);
  doc.text("Valor", width - 46, 37);
  doc.text("La suma de", margin + 8, 51);
  doc.text("Concepto", margin + 8, 65);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(check.beneficiary, margin + 24, 37);
  doc.text(`$ ${formattedAmount}`, width - 10, 37, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const splitAmountText = doc.splitTextToSize(amountText, width - 24);
  doc.text(splitAmountText, margin + 8, 46);

  if (check.concept?.trim()) {
    const splitConcept = doc.splitTextToSize(check.concept, width - 24);
    doc.text(splitConcept, margin + 8, 60);
  } else {
    doc.setTextColor(148, 163, 184);
    doc.text("Sin concepto registrado", margin + 8, 60);
  }

  doc.setTextColor(15, 23, 42);
  doc.line(width - 76, 82, width - 16, 82);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(check.signature?.trim() || "Firma autorizada", width - 46, 87, {
    align: "center",
  });

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text("Generado desde el modulo de cheques", margin + 8, 87);

  doc.save(`Cheque-${check.check_number}.pdf`);
}
