"use server";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendBudgetAlertEmail(
  categoryName: string, 
  budget: number, 
  spent: number, 
  type: "warning_80" | "warning_90" | "exceeded"
) {
  try {
    const userEmail = process.env.USER_EMAIL;
    if (!userEmail) return { success: false, error: "USER_EMAIL not configured in environment variables." };

    let subject = "";
    let statusMsg = "";
    let color = "";

    // Mathematical routing of the 3 precise thresholds
    if (type === "exceeded") {
      subject = `🚨 Budget Exceeded: ${categoryName}`;
      statusMsg = "You have exceeded your allocated budget!";
      color = "#dc2626"; // Red
    } else if (type === "warning_90") {
      subject = `⚠️ Critical Budget Warning: ${categoryName} (10% Remaining)`;
      statusMsg = "You have utilized over 90% of your budget. Less than 10% remains!";
      color = "#ea580c"; // Orange
    } else if (type === "warning_80") {
      subject = `⚠️ Budget Alert: ${categoryName} (20% Remaining)`;
      statusMsg = "You have utilized over 80% of your budget. Less than 20% remains.";
      color = "#d97706"; // Amber
    }

    const percentage = ((spent / budget) * 100).toFixed(1);

    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: ${color};">FinanceHub Budget Alert</h2>
        <p>Your category <strong>${categoryName}</strong> has triggered an automatic alert.</p>
        <ul style="background: #f4f4f5; padding: 15px 30px; border-radius: 8px;">
          <li><strong>Allocated Budget:</strong> ₹${budget}</li>
          <li><strong>Total Spent:</strong> ₹${spent}</li>
          <li><strong>Current Usage:</strong> ${percentage}%</li>
        </ul>
        <p><strong>Status:</strong> ${statusMsg}</p>
      </div>
    `;

    // "onboarding@resend.dev" is Resend's required default domain for development.
    await resend.emails.send({
      from: "FinanceHub <onboarding@resend.dev>",
      to: userEmail,
      subject,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error("Email transmission failed:", error);
    return { success: false, error: String(error) };
  }
}