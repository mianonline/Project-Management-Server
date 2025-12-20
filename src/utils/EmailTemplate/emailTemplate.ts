export const inviteTeamEmailTemplate = (
  inviterName: string,
  teamName: string,
  role: string,
  inviteLink: string,
  personalMessage?: string
) => `
  <div style="background-color:#0b0b0b; padding:40px 20px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td align="center" valign="middle">
          <table role="presentation" width="600px" cellspacing="0" cellpadding="0" border="0"
            style="background-color:#111111; border-radius:12px; box-shadow:0 0 20px rgba(255,193,7,0.15); overflow:hidden;">

            <!-- Header -->
            <tr>
              <td align="center" style="background:#000000; padding:25px;">
          
                <div style="margin:0; font-size:26px; letter-spacing:2px; color:#fff;">
                  <img src="https://i.ibb.co/CpDDzZ5D/logo.png" alt="Logo"  width="100"/>
                </div>
                <p style="margin:6px 0 0; font-size:13px; color:#9ca3af;">
                  Secure • Collaborate • Build
                </p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:30px; text-align:center;">
                <h2 style="color:#facc15; margin-bottom:15px;">
                  Team Invitation
                </h2>

                <p style="font-size:16px; color:#e5e7eb; line-height:1.6;">
                  <strong style="color:#ffffff;">${inviterName}</strong> has invited you to join
                  <strong style="color:#facc15;"> ${teamName}</strong>
                  as a <strong style="color:#ffffff;">${role}</strong>.
                </p>

                ${personalMessage
    ? `
                      <div style="background:#1f2933; border-left:4px solid #facc15; padding:16px; border-radius:6px; margin:25px 0; text-align:left;">
                        <p style="margin:0; font-size:14px; color:#d1d5db;">
                          <strong style="color:#facc15;">Personal message:</strong><br/>
                          ${personalMessage}
                        </p>
                      </div>
                    `
    : ""
  }

                <p style="font-size:14px; color:#9ca3af;">
                  Join us to collaborate securely, manage tasks, and build powerful solutions together.
                </p>

                <!-- Buttons -->
                <div style="margin:35px 0; display:flex; gap:15px; justify-content:center; flex-wrap:wrap;">
                  <a href="${inviteLink}/accept"
                    style="
                      background-color:#facc15;
                      color:#000000;
                      padding:14px 34px;
                      text-decoration:none;
                      border-radius:30px;
                      font-size:15px;
                      font-weight:600;
                      display:inline-block;
                      box-shadow:0 0 12px rgba(250,204,21,0.6);
                    ">
                    Accept Invitation
                  </a>
                  <a href="${inviteLink}/decline"
                    style="
                      background-color:#1f2933;
                      color:#e5e7eb;
                      padding:14px 34px;
                      text-decoration:none;
                      border-radius:30px;
                      font-size:15px;
                      font-weight:600;
                      display:inline-block;
                      border:2px solid #6b7280;
                    ">
                    Decline
                  </a>
                </div>

                <p style="font-size:13px; color:#6b7280;">
                  If you weren’t expecting this invitation, you can safely ignore this email.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#000000; padding:18px; text-align:center;">
                <p style="margin:0; font-size:13px; color:#6b7280;">
                  © ${new Date().getFullYear()} DEFCON. All rights reserved.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </div>
`;

export const addedToTeamEmailTemplate = (
  adderName: string,
  teamName: string,
  dashboardLink: string
) => `
  <div style="background-color:#0b0b0b; padding:40px 20px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td align="center" valign="middle">
          <table role="presentation" width="600px" cellspacing="0" cellpadding="0" border="0"
            style="background-color:#111111; border-radius:12px; box-shadow:0 0 20px rgba(255,193,7,0.15); overflow:hidden;">

            <!-- Header -->
            <tr>
              <td align="center" style="background:#000000; padding:25px;">
                <div style="margin:0; font-size:26px; letter-spacing:2px; color:#fff;">
                  <img src="https://i.ibb.co/CpDDzZ5D/logo.png" alt="Logo" width="100"/>
                </div>
                <p style="margin:6px 0 0; font-size:13px; color:#9ca3af;">
                  Secure • Collaborate • Build
                </p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:30px; text-align:center;">
                <h2 style="color:#facc15; margin-bottom:15px;">
                  New Team Access
                </h2>

                <p style="font-size:16px; color:#e5e7eb; line-height:1.6;">
                  Hi there! <strong style="color:#ffffff;">${adderName}</strong> has added you to a new team:
                  <strong style="color:#facc15;"> ${teamName}</strong>.
                </p>

                <p style="font-size:14px; color:#9ca3af; margin-top:20px;">
                  You can now collaborate with your teammates, manage tasks, and track progress on the dashboard.
                </p>

                <!-- Button -->
                <div style="margin:35px 0;">
                  <a href="${dashboardLink}"
                    style="
                      background-color:#facc15;
                      color:#000000;
                      padding:14px 34px;
                      text-decoration:none;
                      border-radius:30px;
                      font-size:15px;
                      font-weight:600;
                      display:inline-block;
                      box-shadow:0 0 12px rgba(250,204,21,0.6);
                    ">
                    Go to Dashboard
                  </a>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#000000; padding:18px; text-align:center;">
                <p style="margin:0; font-size:13px; color:#6b7280;">
                  © ${new Date().getFullYear()} DEFCON. All rights reserved.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </div>
`;
